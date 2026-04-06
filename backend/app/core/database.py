"""
PrüfPilot - Database Connection & Session Management

Supabase Transaction Pooler (pgbouncer, Port 6543) unterstützt keine
Prepared Statements. Wir wechseln automatisch auf Session Mode (Port 5432)
der damit kompatibel ist.
"""
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool
from app.core.config import settings


_db_url = settings.DATABASE_URL

if _db_url.startswith("postgresql"):
    # Supabase Transaction Pooler (Port 6543) → Session Pooler (Port 5432)
    # Session Mode unterstützt Prepared Statements, Transaction Mode nicht.
    _db_url = _db_url.replace(":6543/", ":5432/")

    # Zusätzlich: prepared_statement_cache_size=0 als Fallback
    if "prepared_statement_cache_size" not in _db_url:
        _sep = "&" if "?" in _db_url else "?"
        _db_url = f"{_db_url}{_sep}prepared_statement_cache_size=0"

_engine_kwargs: dict = {"echo": settings.DEBUG}

if _db_url.startswith("sqlite"):
    pass
elif _db_url.startswith("postgresql"):
    _engine_kwargs.update(
        poolclass=NullPool,
        pool_pre_ping=True,
        connect_args={"statement_cache_size": 0},
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
