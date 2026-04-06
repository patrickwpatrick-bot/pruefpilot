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

# DATABASE_URL vorbereiten — prepared_statement_cache_size=0 für pgbouncer
# Supabase Transaction Pooler unterstützt keine Prepared Statements.
# SQLAlchemy asyncpg liest diesen Parameter aus der URL, nicht aus connect_args.
_db_url = settings.DATABASE_URL
if _db_url.startswith("postgresql") and "prepared_statement_cache_size" not in _db_url:
    _separator = "&" if "?" in _db_url else "?"
    _db_url = f"{_db_url}{_separator}prepared_statement_cache_size=0"

_engine_kwargs: dict = {"echo": settings.DEBUG}

if _db_url.startswith("sqlite"):
    # SQLite (Tests) — kein Pool nötig
    pass
else:
    # PostgreSQL
    _engine_kwargs["pool_pre_ping"] = True
    if _is_serverless:
        # Serverless: NullPool — Supabase Pooler handelt Connection-Pooling
        _engine_kwargs["poolclass"] = NullPool
    else:
        # Lokale Entwicklung / Docker: normaler Pool
        _engine_kwargs.update(
            pool_size=10,
            max_overflow=20,
        )

engine = create_async_engine(_db_url, **_engine_kwargs)

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
