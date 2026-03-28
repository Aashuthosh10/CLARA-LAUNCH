"""
PostgreSQL pgvector access for RAG.

Similarity search always filters by `metadata->>'language'` when a locale key is provided
so Hindi sessions do not retrieve English rows (and vice versa). Implemented in
`backend.clients.database.get_similar_contents`.
"""

from backend.clients.database import get_similar_contents

__all__ = ["get_similar_contents"]
