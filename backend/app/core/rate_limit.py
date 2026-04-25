"""
Rate-Limiting via Postgres (Supabase).

SEC-Fix 2026-04-11 (M1 Block 15 — Memory-Leak):
Der bisherige In-Memory-Rate-Limiter in `main.py` hatte zwei Probleme:
1. **Memory-Leak auf Long-Running Servern:** `_rate_limit_store` wuchs
   unbounded — jeder neue IP+Token-Key blieb im Prozess bis der
   1000er-Cleanup-Counter triggerte.
2. **Kaputt auf Vercel Serverless:** Jeder Cold-Start hat einen eigenen
   Prozess-State, d.h. ein Angreifer konnte pro Function-Instance den
   vollen Burst hinschieben.

Lösung: Counter-Bucket in Postgres. Eine Zeile pro Key in
`rate_limit_buckets`, atomar hochgezählt mit `ON CONFLICT DO UPDATE`.
Ein Cleanup-Call löscht abgelaufene Zeilen periodisch (jede ~100
Requests).

Performance: 1 Indexed UPSERT pro Request. Das ist akzeptabel für die
M1-Baseline; wenn PP wächst, kann das später in Redis wandern.

Das Modul ist **backend-agnostisch**: für SQLite (Tests) wird
automatisch auf eine In-Process-Variante ohne UPSERT zurückgefallen,
damit die Test-Suite nicht die komplette Postgres-Syntax braucht.
"""
from __future__ import annotations

import logging
import time
from typing import Optional

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import AsyncSessionLocal
from app.core.config import settings

logger = logging.getLogger(__name__)

# Schutz-Schalter: nach wie vielen Requests räumen wir abgelaufene Buckets weg
_CLEANUP_EVERY = 100
_cleanup_counter = 0

_IS_SQLITE = settings.DATABASE_URL.startswith("sqlite")


async def _check_postgres(
    db: AsyncSession, key: str, limit: int, window_seconds: int
) -> bool:
    """Postgres-Pfad: atomarer UPSERT mit Fenster-Logik.

    Returns True wenn Request erlaubt, False wenn Limit überschritten.
    """
    now = int(time.time())
    window_start = now - window_seconds

    # Erst Zähler hochziehen oder anlegen. Wir speichern Timestamps als
    # bigint (Unix-Seconds), das ist portabler als TIMESTAMPTZ für diese
    # hot-path Query und erlaubt einfache Fenster-Arithmetik.
    upsert_sql = text(
        """
        INSERT INTO rate_limit_buckets (bucket_key, hit_count, window_start_ts)
        VALUES (:key, 1, :now)
        ON CONFLICT (bucket_key) DO UPDATE
        SET
            hit_count = CASE
                WHEN rate_limit_buckets.window_start_ts < :window_start THEN 1
                ELSE rate_limit_buckets.hit_count + 1
            END,
            window_start_ts = CASE
                WHEN rate_limit_buckets.window_start_ts < :window_start THEN :now
                ELSE rate_limit_buckets.window_start_ts
            END
        RETURNING hit_count
        """
    )
    result = await db.execute(
        upsert_sql,
        {"key": key, "now": now, "window_start": window_start},
    )
    hit_count: Optional[int] = result.scalar_one_or_none()
    await db.commit()

    if hit_count is None:
        # Sicherheitshalber pass-through — wir wollen den Request nicht
        # wegen eines DB-Hiccups grundlos blocken.
        return True
    return hit_count <= limit


# ── SQLite-Fallback (nur Tests) ──────────────────────────────────────────────
_sqlite_store: dict[str, tuple[int, int]] = {}  # key -> (hit_count, window_start)


async def _check_sqlite(
    db: AsyncSession, key: str, limit: int, window_seconds: int
) -> bool:
    now = int(time.time())
    window_start = now - window_seconds
    count, start = _sqlite_store.get(key, (0, now))
    if start < window_start:
        count, start = 0, now
    count += 1
    _sqlite_store[key] = (count, start)
    return count <= limit


async def check_rate_limit(
    key: str, limit: int, window_seconds: int
) -> bool:
    """Prüft + zählt einen Request. Gibt True zurück wenn erlaubt.

    Wird aus der Middleware aufgerufen und managt seine eigene Session —
    wir können die `get_db`-Dependency in ASGI-Middleware nicht verwenden.
    """
    global _cleanup_counter

    try:
        async with AsyncSessionLocal() as db:
            if _IS_SQLITE:
                allowed = await _check_sqlite(db, key, limit, window_seconds)
            else:
                allowed = await _check_postgres(db, key, limit, window_seconds)

            # Periodischer Cleanup — nur Postgres, SQLite hält den Store im RAM
            _cleanup_counter += 1
            if not _IS_SQLITE and _cleanup_counter % _CLEANUP_EVERY == 0:
                try:
                    await db.execute(
                        text(
                            "DELETE FROM rate_limit_buckets "
                            "WHERE window_start_ts < :cutoff"
                        ),
                        {"cutoff": int(time.time()) - window_seconds * 2},
                    )
                    await db.commit()
                except Exception as e:  # pragma: no cover
                    logger.warning("Rate-Limit-Cleanup fehlgeschlagen: %s", e)

            return allowed
    except Exception as e:
        # Fail-open: Rate-Limit-DB darf den ganzen Service nicht killen.
        logger.error("Rate-Limit-Check fehlgeschlagen, lasse Request durch: %s", e)
        return True
