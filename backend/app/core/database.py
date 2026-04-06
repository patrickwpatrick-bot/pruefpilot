"""
PrüfPilot - Database Connection & Session Management
Serverless-optimiert: kleinerer Pool, NullPool-Option für Vercel/Lambda
"""
import os
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool
from app.core.config import settings


# Serverless-Erkennung (Vercel setzt AWS_LAMBDA_FUNCTION_NAME oder VERCEL)
_is_serverless = bool(os.environ.get("VERCEL") or os.environ.get("AWS_LAMBDA_FUNCTION_NAME"))

_engine_kwargs: dict = {"echo": settings.DEBUG}

if settings.DATABASE_URL.startswith("sqlite"):
    # SQLite (Tests) — kein Pool nötig
    pass
else:
    # PostgreSQL — IMMER statement_cache_size=0 weil Supabase pgbouncer
    # (Transaction Mode) keine Prepared Statements unterstützt.
    # Ohne diesen Fix schlagen ALLE DB-Queries fehl.
    _engine_kwargs.update(
        pool_pre_ping=True,
        connect_args={"statement_cache_size": 0},
    )
    if _is_serverless:
        # Serverless: NullPool — Supabase Pooler handelt Connection-Pooling
        _engine_kwargs["poolclass"] = NullPool
    else:
        # Lokale Entwicklung / Docker: normaler Pool
        _engine_kwargs.update(
            pool_size=10,
            max_overflow=20,
        )

engine = create_async_engine(settings.DATABASE_URL, **_engine_kwargs)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:
    """Dependency: yields an async database session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
