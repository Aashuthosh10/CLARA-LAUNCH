"""Topic / scope / unsupported cue detection from structured vocab (not first-keyword-wins)."""

from __future__ import annotations

import re

from backend.services.content.semantic_vocab.catalog import (
    SCOPE_FULL,
    TOPIC_ACHIEVEMENTS,
    TOPIC_CONTACT,
    TOPIC_EXPLANATION,
    TOPIC_FACULTY,
    TOPIC_FEES,
    TOPIC_HOD,
    TOPIC_PLACEMENTS,
    UNSUPPORTED_BUS,
    UNSUPPORTED_DOCUMENTS,
    all_entries,
)
from backend.services.content.unicode_text import casefold_keep_scripts

ATOMIC_TOPICS = frozenset(
    {
        TOPIC_HOD,
        TOPIC_FEES,
        TOPIC_PLACEMENTS,
        TOPIC_ACHIEVEMENTS,
        TOPIC_FACULTY,
        TOPIC_CONTACT,
        TOPIC_EXPLANATION,
    }
)


def _latinish(s: str) -> bool:
    return all(ord(ch) < 128 for ch in s)


def cue_in_hay(hay: str, cue: str) -> bool:
    if not hay or not cue:
        return False
    n = casefold_keep_scripts(cue) if any(ord(c) > 127 for c in cue) else cue.casefold()
    if not n:
        return False
    if not _latinish(n):
        return n in hay
    return re.search(rf"(?<![a-z0-9_]){re.escape(n)}(?![a-z0-9_])", hay) is not None


def _hays(*texts: str) -> tuple[str, ...]:
    out: list[str] = []
    seen: set[str] = set()
    for t in texts:
        h = casefold_keep_scripts(t)
        if h and h not in seen:
            seen.add(h)
            out.append(h)
    return tuple(out)


def detect_atomic_topics(*texts: str) -> frozenset[str]:
    hays = _hays(*texts)
    found: set[str] = set()
    for e in all_entries():
        if e.canonical not in ATOMIC_TOPICS:
            continue
        if e.category not in {"TOPIC", "QUESTION", "ROMANIZED", "CODE-SWITCH"}:
            continue
        if any(cue_in_hay(h, e.variant) for h in hays):
            found.add(e.canonical)
    # Non-contiguous "explain … simply" (e.g. "Explain CSE simply").
    if TOPIC_EXPLANATION not in found:
        for h in hays:
            if cue_in_hay(h, "explain") and cue_in_hay(h, "simply"):
                found.add(TOPIC_EXPLANATION)
                break
    # Explicit "explain <department>" / "what is <department>" without soft full-overview.
    # Guarded: only when no competing atomic topic (fees/hod/etc.) already matched.
    if TOPIC_EXPLANATION not in found and not (
        found & {TOPIC_HOD, TOPIC_FEES, TOPIC_PLACEMENTS, TOPIC_ACHIEVEMENTS, TOPIC_FACULTY, TOPIC_CONTACT}
    ):
        for h in hays:
            if cue_in_hay(h, "explain") or cue_in_hay(h, "what is") or cue_in_hay(h, "what does"):
                # Avoid "what is the fee / hod / placement …"
                if any(
                    cue_in_hay(h, bad)
                    for bad in (
                        "fee",
                        "fees",
                        "hod",
                        "head of",
                        "placement",
                        "placements",
                        "faculty",
                        "admission",
                        "admissions",
                        "document",
                        "documents",
                    )
                ):
                    continue
                # Multi-dept contrast keeps the dedicated contrast parser path
                # ("what is the difference between A and B").
                if any(
                    cue_in_hay(h, cue)
                    for cue in ("difference", "compare", "comparison", "versus", "vs")
                ):
                    continue
                found.add(TOPIC_EXPLANATION)
                break
    return frozenset(found)


def detect_unsupported(*texts: str) -> frozenset[str]:
    hays = _hays(*texts)
    found: set[str] = set()
    for e in all_entries():
        if e.category != "UNSUPPORTED":
            continue
        if any(cue_in_hay(h, e.variant) for h in hays):
            found.add(e.canonical)
    return frozenset(found)


def is_full_department_scope(*texts: str) -> bool:
    hays = _hays(*texts)
    for e in all_entries():
        if e.canonical != SCOPE_FULL:
            continue
        if e.category not in {"SCOPE", "CODE-SWITCH"}:
            continue
        if any(cue_in_hay(h, e.variant) for h in hays):
            return True
    return False
