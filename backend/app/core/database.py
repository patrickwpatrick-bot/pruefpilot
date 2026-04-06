"""
PrüfPilot - Database Connection & Session Management

WICHTIG: Supabase Transaction Pooler (pgbouncer, Port 6543) unterstützt
keine Prepared Statements. statement_cache_size=0 ist zwingend nötig.
"""
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool
from app.core.config import settings


# URL mit prepared_statement_cache_size=0 (für SQLAlchemy asyncpg dialect)
_db_url = settings.DATABASE_URL
_engine_kwargs: dict = {"echo": settings.DEBUG}

if _db_url.startswith("sqlite"):
    pass
elif _db_url.startswith("postgresql"):
    # SQLAlchemy asyncpg: prepared_statement_cache_size als URL-Parameter
    if "prepared_statement_cache_size" not in _db_url:
        _sep = "&" if "?" in _db_url else "?"
        _db_url = f"{_db_url}{_sep}prepared_statement_cache_size=0"

    _engine_kwargs.update(
        poolclass=NullPool,           # Immer NullPool — Supabase Pooler handelt das
        pool_pre_ping=True,
        connect_args={
            "statement_cache_size": 0,  # asyncpg: keine client-seitigen Prepared Stmts
        },
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
