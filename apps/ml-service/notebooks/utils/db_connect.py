"""Synchronous database connection helper for Jupyter notebooks."""

import os

import psycopg
from psycopg.rows import dict_row

try:
    from dotenv import load_dotenv

    load_dotenv()
except ImportError:
    pass


def get_connection() -> psycopg.Connection:
    """Get a synchronous database connection for notebook use.

    Checks ML_DATABASE_URL first (ML service convention),
    then DATABASE_URL (backend convention), then falls back to local default.
    """
    db_url = os.environ.get(
        "ML_DATABASE_URL",
        os.environ.get(
            "DATABASE_URL",
            "postgresql://snacktrack:snacktrack_dev@localhost:5432/snacktrack",
        ),
    )
    conn = psycopg.connect(db_url, row_factory=dict_row)
    # Register pgvector if available
    try:
        from pgvector.psycopg import register_vector

        register_vector(conn)
    except ImportError:
        pass
    return conn
