"""M5.3 structured vocabularies (TOPIC / SCOPE / QUESTION / DEPARTMENT / ROMANIZED / CODE-SWITCH)."""

from backend.services.content.semantic_vocab.catalog import (
    SCOPE_FULL,
    TOPIC_ACHIEVEMENTS,
    TOPIC_FEES,
    TOPIC_HOD,
    TOPIC_OVERVIEW,
    TOPIC_PLACEMENTS,
    UNSUPPORTED_BUS,
    UNSUPPORTED_DOCUMENTS,
    all_entries,
    entries_for,
)
from backend.services.content.semantic_vocab.types import VocabEntry

__all__ = [
    "SCOPE_FULL",
    "TOPIC_ACHIEVEMENTS",
    "TOPIC_FEES",
    "TOPIC_HOD",
    "TOPIC_OVERVIEW",
    "TOPIC_PLACEMENTS",
    "UNSUPPORTED_BUS",
    "UNSUPPORTED_DOCUMENTS",
    "VocabEntry",
    "all_entries",
    "entries_for",
]
