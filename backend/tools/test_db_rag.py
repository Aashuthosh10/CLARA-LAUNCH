"""
Test script: PostgreSQL pool, document count, and vector search (RAG).
Run from repo root: python -m backend.tools.test_db_rag
Or from backend/: python tools/test_db_rag.py
Uses .env from project root (same as main app).
"""
import logging
import sys
from pathlib import Path

# Ensure project root is on path when run as a script.
if __name__ == "__main__":
    _root = Path(__file__).resolve().parents[2]
    if str(_root) not in sys.path:
        sys.path.insert(0, str(_root))

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s %(message)s")
logger = logging.getLogger(__name__)


def main():
    from backend.clients.database import (
        get_document_count,
        get_similar_contents,
        is_db_available,
        log_db_status,
    )
    from backend.config.settings import POSTGRES_DB, POSTGRES_HOST, POSTGRES_PORT, POSTGRES_USER

    print("--- DB/RAG test ---")
    print(f"Config: host={POSTGRES_HOST} port={POSTGRES_PORT} user={POSTGRES_USER} db={POSTGRES_DB}")
    print("(password is loaded from .env; not printed)")

    log_db_status()

    if not is_db_available():
        print("FAIL: PostgreSQL not available (pool init failed)")
        return 1

    print("OK: Pool created, DB available.")

    n = get_document_count()
    print(f"OK: Document count = {n}")
    if n <= 0:
        print("FAIL: college_knowledge is empty. Run: python -m backend.tools.ingest_college_knowledge_pg")
        return 1

    # Vector search: use a zero vector so we don't need sentence-transformers; may return [] if table empty
    dummy_embedding = [0.0] * 768
    results = get_similar_contents(dummy_embedding, top_k=2)
    print(f"OK: get_similar_contents returned {len(results)} chunk(s)")
    if not results:
        print("FAIL: vector search returned no chunks.")
        return 1

    print("--- All checks passed ---")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as e:
        logger.exception("Test failed: %s", e)
        print("FAIL:", e)
        sys.exit(1)
