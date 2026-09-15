"""Structured vocabulary entry — one semantic purpose per row, not a giant dictionary."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

VocabCategory = Literal[
    "TOPIC",
    "SCOPE",
    "QUESTION",
    "DEPARTMENT",
    "ROMANIZED",
    "CODE-SWITCH",
    "UNSUPPORTED",
    "NAVIGATION_INTENT",
    "CAMPUS_DESTINATION",
    "CAMPUS_TERM",
    "CAMPUS_FLOOR",
]

SUPPORTED_LANG = Literal["*", "en", "kn", "hi", "ta", "te", "ml"]


@dataclass(frozen=True)
class VocabEntry:
    canonical: str
    language: str
    variant: str
    category: VocabCategory
    reason: str
    ambiguity_risk: str = "none"
