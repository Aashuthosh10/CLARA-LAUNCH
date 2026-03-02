"""PostgreSQL connection and pooling for RAG (pgvector). Used by rag.py and ingest script."""

import logging
import threading
import time
from typing import Any, List, Optional

from config import (
    POSTGRES_DB,
    POSTGRES_HOST,
    POSTGRES_PASSWORD,
    POSTGRES_PORT,
    POSTGRES_USER,
)

logger = logging.getLogger(__name__)

# Sentinel when pool init failed; backend continues without DB. Never raise on init.
_POOL_FAILED = object()
_POOL_RETRY_INTERVAL_SEC = 10.0
_last_pool_failure_time: Optional[float] = None
_pool_lock = threading.Lock()

_pool: Optional[Any] = None


def _get_pool():
    """
    Lazy pool creation. On first success returns pool. On failure: do NOT raise,
    set _pool = _POOL_FAILED, log, return None. Retry every POOL_RETRY_INTERVAL_SEC
    on subsequent calls when pool is failed.
    """
    global _pool, _last_pool_failure_time
    with _pool_lock:
        if _pool is not None and _pool is not _POOL_FAILED:
            return _pool
        if _pool is _POOL_FAILED:
            now = time.time()
            if _last_pool_failure_time is not None and (now - _last_pool_failure_time) < _POOL_RETRY_INTERVAL_SEC:
                return None
        try:
            import psycopg2.pool as pg2pool
            from pgvector.psycopg2 import register_vector

            pool = pg2pool.SimpleConnectionPool(
                minconn=1,
                maxconn=5,
                host=POSTGRES_HOST,
                port=POSTGRES_PORT,
                dbname=POSTGRES_DB,
                user=POSTGRES_USER,
                password=POSTGRES_PASSWORD or None,
            )
            conn = pool.getconn()
            try:
                register_vector(conn)
            finally:
                pool.putconn(conn)
            _pool = pool
            _last_pool_failure_time = None
            return _pool
        except Exception as e:
            logger.warning("PostgreSQL pool init failed: %s", e, exc_info=True)
            logger.warning("PostgreSQL unavailable. Running in LLM-only fallback mode.")
            _pool = _POOL_FAILED
            _last_pool_failure_time = time.time()
            return None


def is_db_available() -> bool:
    """Return True if pool is initialized and usable. Triggers lazy init/retry."""
    return _get_pool() is not None


def log_db_status() -> None:
    """
    Log DB host, port, user, db name and whether pool was created successfully.
    Call on backend startup for diagnostics.
    """
    logger.info(
        "PostgreSQL config: host=%s port=%s user=%s dbname=%s",
        POSTGRES_HOST,
        POSTGRES_PORT,
        POSTGRES_USER,
        POSTGRES_DB,
    )
    pool = _get_pool()
    if pool is not None:
        logger.info("PostgreSQL pool created successfully.")
    else:
        logger.warning("PostgreSQL unavailable. Running in LLM-only fallback mode.")


def get_connection():
    """Get a connection from the pool. Raises RuntimeError if pool unavailable."""
    pool = _get_pool()
    if pool is None:
        raise RuntimeError("PostgreSQL not available (pool init failed)")
    try:
        from pgvector.psycopg2 import register_vector
        conn = pool.getconn()
        register_vector(conn)
        return conn
    except Exception as e:
        logger.debug("DB get_connection failed: %s", e)
        raise


def put_connection(conn: Any) -> None:
    """Return a connection to the pool."""
    if _pool is not None and _pool is not _POOL_FAILED and conn is not None:
        try:
            _pool.putconn(conn)
        except Exception:
            pass


def run_query(
    query: str,
    params: Optional[tuple] = None,
    fetch: bool = True,
) -> Optional[List[tuple]]:
    """
    Run a parameterized query. Returns list of rows or None on error.
    Does not log query text or params (security).
    """
    conn = None
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute(query, params)
        if fetch:
            rows = cur.fetchall()
        else:
            conn.commit()
            rows = None
        cur.close()
        return rows
    except Exception as e:
        if conn:
            try:
                conn.rollback()
            except Exception:
                pass
        logger.warning("DB query failed: %s", e)
        return None
    finally:
        if conn:
            put_connection(conn)


def get_document_count() -> int:
    """Return count of rows in college_knowledge. Returns 0 on any error."""
    rows = run_query("SELECT COUNT(*) FROM college_knowledge", fetch=True)
    if not rows:
        return 0
    try:
        return int(rows[0][0])
    except (IndexError, TypeError, ValueError):
        return 0


def get_similar_contents(embedding: List[float], top_k: int) -> List[str]:
    """
    Return top_k content strings from college_knowledge by cosine similarity.
    Returns empty list on any error or if DB unavailable.
    """
    if not embedding or top_k <= 0:
        return []
    if not is_db_available():
        logger.warning("DB vector search skipped: PostgreSQL not available (pool init failed)")
        return []
    conn = None
    try:
        from pgvector.psycopg2 import register_vector
        from pgvector import Vector

        conn = get_connection()
        cur = conn.cursor()
        cur.execute(
            "SELECT content FROM college_knowledge ORDER BY embedding <-> %s LIMIT %s",
            (Vector(embedding), top_k),
        )
        rows = cur.fetchall()
        cur.close()
        return [r[0] for r in rows if r[0] is not None]
    except Exception as e:
        if conn:
            try:
                conn.rollback()
            except Exception:
                pass
        logger.warning("DB vector search failed: %s", e)
        return []
    finally:
        if conn:
            put_connection(conn)


def truncate_college_knowledge() -> bool:
    """Truncate college_knowledge table. Returns True on success."""
    if not is_db_available():
        return False
    conn = None
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("TRUNCATE college_knowledge")
        conn.commit()
        cur.close()
        return True
    except Exception as e:
        if conn:
            try:
                conn.rollback()
            except Exception:
                pass
        logger.warning("DB truncate failed: %s", e)
        return False
    finally:
        if conn:
            put_connection(conn)


def insert_college_chunk(doc_id: str, content: str, embedding: List[float]) -> bool:
    """Insert one row into college_knowledge. Returns True on success, False on error."""
    if not is_db_available():
        return False
    conn = None
    try:
        from pgvector.psycopg2 import register_vector
        from pgvector import Vector

        conn = get_connection()
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO college_knowledge (id, content, embedding, metadata) VALUES (%s, %s, %s, %s)",
            (doc_id, content, Vector(embedding), None),
        )
        conn.commit()
        cur.close()
        return True
    except Exception as e:
        if conn:
            try:
                conn.rollback()
            except Exception:
                pass
        logger.warning("Insert failed: %s", e)
        return False
    finally:
        if conn:
            put_connection(conn)
