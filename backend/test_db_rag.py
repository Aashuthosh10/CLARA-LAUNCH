"""
Test script: PostgreSQL pool, document count, and vector search (RAG).
Run from repo root: python -m backend.test_db_rag
Or from backend/: python test_db_rag.py
Uses .env from project root (same as main app).
"""
import logging
import sys
from pathlib import Path

# Ensure backend is on path when run as script
if __name__ == "__main__":
    _backend = Path(__file__).resolve().parent
    _root = _backend.parent
    if str(_root) not in sys.path:
        sys.path.insert(0, str(_root))
    if str(_backend) not in sys.path:
        sys.path.insert(0, str(_backend))

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s %(message)s")
logger = logging.getLogger(__name__)


def main():
    from config import POSTGRES_HOST, POSTGRES_PORT, POSTGRES_USER, POSTGRES_DB
    from db import log_db_status, is_db_available, get_document_count, get_similar_contents

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

    # Vector search: use a zero vector so we don't need sentence-transformers; may return [] if table empty
    dummy_embedding = [0.0] * 768
    results = get_similar_contents(dummy_embedding, top_k=2)
    print(f"OK: get_similar_contents returned {len(results)} chunk(s)")

    print("--- All checks passed ---")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as e:
        logger.exception("Test failed: %s", e)
        print("FAIL:", e)
        sys.exit(1)
