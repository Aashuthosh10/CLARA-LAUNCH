"""RAG retrieval: PostgreSQL + pgvector and local embeddings for college knowledge."""

import logging
import threading
from typing import List

from config import RAG_MAX_TOKENS, RAG_TOP_K

from db import get_document_count, get_similar_contents, is_db_available

logger = logging.getLogger(__name__)

_embedding_model = None
_embedding_lock = threading.Lock()

EMBEDDING_MODEL_NAME = "BAAI/bge-base-en"
EMBEDDING_DIM = 768


def _get_embedding_model():
    """Lazy-load the sentence-transformers model once. Thread-safe."""
    global _embedding_model
    with _embedding_lock:
        if _embedding_model is None:
            from sentence_transformers import SentenceTransformer
            _embedding_model = SentenceTransformer(EMBEDDING_MODEL_NAME)
        return _embedding_model


def generate_embedding(text: str) -> List[float]:
    """
    Generate 768-dim embedding for text using local BAAI/bge-base-en.
    Fully local; no network. Thread-safe. Raises on failure.
    """
    if not text or not text.strip():
        raise ValueError("empty text")
    model = _get_embedding_model()
    with _embedding_lock:
        vec = model.encode(text.strip(), normalize_embeddings=True)
    return vec.tolist()


def get_rag_document_count() -> int:
    """Return number of documents in RAG store. Returns 0 on any error."""
    return get_document_count()


def get_relevant_context(
    query: str,
    top_k: int = RAG_TOP_K,
    max_tokens: int = RAG_MAX_TOKENS,
) -> str:
    """
    Retrieve top-k most relevant chunks from PostgreSQL for the query.
    Returns concatenated chunk text, trimmed to max_tokens. Empty string on error or empty table.
    """
    if not (query or query.strip()):
        return ""
    query = query.strip()
    if not is_db_available():
        logger.warning("RAG: DB unavailable, returning empty context")
        return ""
    try:
        query_embedding = generate_embedding(query)
        contents = get_similar_contents(query_embedding, top_k)
        if not contents:
            logger.warning("RAG: context empty (no documents for query)")
            return ""
        combined = "\n\n".join(contents)
        out = _trim_to_tokens(combined, max_tokens)
        if out:
            logger.info("RAG: context_size=%d chars", len(out))
        return out
    except Exception as e:
        logger.warning("RAG retrieval failed: %s", e, exc_info=True)
        return ""


def _trim_to_tokens(text: str, max_tokens: int) -> str:
    """Trim text to at most max_tokens using tiktoken (cl100k_base)."""
    if max_tokens <= 0 or not text:
        return text
    try:
        import tiktoken
        enc = tiktoken.get_encoding("cl100k_base")
        tokens = enc.encode(text)
        if len(tokens) <= max_tokens:
            return text
        trimmed = enc.decode(tokens[:max_tokens])
        return trimmed
    except Exception as e:
        logger.debug("tiktoken trim failed, returning full text: %s", e)
        return text
