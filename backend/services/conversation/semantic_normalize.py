"""Lightweight synonym → semantic topic map (no LLM)."""

from __future__ import annotations

import re

# Topics that must never be answered by nearest-department hallucination.
UNSUPPORTED_TOPICS: frozenset[str] = frozenset({"FOOD", "ENVIRONMENT"})

_TOPIC_PATTERNS: list[tuple[str, re.Pattern[str]]] = [
    (
        "FOOD",
        re.compile(
            r"\b(canteen|cafeteria|mess|food|lunch|dinner|breakfast|hostel\s*food|"
            r"food\s*quality|tiffin|snack)\b",
            re.I,
        ),
    ),
    (
        "ENVIRONMENT",
        re.compile(
            r"\b(environment|campus\s*atmosphere|college\s*environment|atmosphere|"
            r"ambiance|ambience|green\s*campus|campus\s*life\s*vibe)\b",
            re.I,
        ),
    ),
    (
        "PLACEMENTS",
        re.compile(
            r"\b(placement|placements|job|jobs|recruit|recruiter|career\s*cell|"
            r"training\s*and\s*placement|t&p)\b",
            re.I,
        ),
    ),
    (
        "FEES",
        re.compile(r"\b(fee|fees|tuition|kattanam|fee\s*structure)\b", re.I),
    ),
    (
        "ADMISSIONS",
        re.compile(r"\b(admission|admissions|apply|application|enrol+ment|kcet|comedk)\b", re.I),
    ),
    (
        "BUS",
        re.compile(r"\b(bus|buses|shuttle|transport|route\s*\d+)\b", re.I),
    ),
    (
        "DOCUMENTS",
        re.compile(r"\b(document|documents|certificate|tc|transfer\s*certificate|id\s*card)\b", re.I),
    ),
    (
        "LOCATION",
        re.compile(
            r"\b(where\s+is|location|address|how\s+to\s+reach|directions?|campus\s+map|"
            r"college\s+location|situated)\b",
            re.I,
        ),
    ),
]


def normalize_semantic_topic(text: str | None) -> str | None:
    """Return a canonical topic label or None if no map hit."""
    s = (text or "").strip()
    if not s:
        return None
    for topic, pattern in _TOPIC_PATTERNS:
        if pattern.search(s):
            return topic
    return None
