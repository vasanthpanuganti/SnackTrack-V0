from contextlib import asynccontextmanager
from typing import AsyncGenerator

import psycopg
from psycopg.rows import dict_row
from pgvector.psycopg import register_vector_async

from .config import settings

_pool: psycopg.AsyncConnectionPool | None = None


async def init_db() -> None:
    global _pool
    _pool = psycopg.AsyncConnectionPool(
        settings.DATABASE_URL,
        min_size=2,
        max_size=10,
        kwargs={"row_factory": dict_row},
    )
    await _pool.open()

    # Register pgvector type with a test connection
    async with _pool.connection() as conn:
        await register_vector_async(conn)


async def close_db() -> None:
    global _pool
    if _pool:
        await _pool.close()
        _pool = None


@asynccontextmanager
async def get_db() -> AsyncGenerator[psycopg.AsyncConnection, None]:
    if not _pool:
        raise RuntimeError("Database pool not initialized")
    async with _pool.connection() as conn:
        await register_vector_async(conn)
        yield conn
