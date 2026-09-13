"""Comparison helpers (comparison cinema retired; JSON registry removed).

validate_department_ids and build_comparison_context_for_llm are kept so
main.py callers need no immediate changes.  The old load_comparison_registry /
build_department_comparison_registry.py pipeline has been deleted.
"""

from __future__ import annotations

import logging
from typing import Any

from backend.services.answer_generation import DEPARTMENT_JSON_KEY_ORDER

logger = logging.getLogger(__name__)

_DEPT_DISPLAY_EN: dict[str, str] = {
    "cse": "CSE",
    "ise": "ISE",
    "cse_aiml": "CSE (AI & ML)",
    "cse_ds": "CSE (Data Science)",
    "cse_cysec": "CSE (Cyber Security)",
    "cse_bs": "CSE (Business Systems)",
    "ece": "ECE",
    "civil": "Civil",
    "mechanical": "Mechanical",
    "mba": "MBA",
    "basic_sciences": "Basic Sciences",
}


def department_order_keys() -> list[str]:
    """Canonical SVIT department JSON key order (legacy name kept for main.py)."""
    return list(DEPARTMENT_JSON_KEY_ORDER)


def default_comparison_ids(max_n: int = 3) -> list[str]:
    return list(DEPARTMENT_JSON_KEY_ORDER[:max_n])


def validate_department_ids(ids: list[str]) -> list[str]:
    """Return up to 3 valid SVIT department JSON keys from `ids`, preserving order."""
    valid = frozenset(DEPARTMENT_JSON_KEY_ORDER)
    seen: set[str] = set()
    out: list[str] = []
    for raw in ids:
        k = str(raw or "").strip()
        if not k or k not in valid or k in seen:
            continue
        seen.add(k)
        out.append(k)
        if len(out) >= 3:
            break
    return out


def build_comparison_context_for_llm(
    department_ids: list[str],
    *,
    lang_key: str | None = None,
) -> str:
    """Minimal parent-friendly context for LLM comparison answers.

    The old cinema JSON registry has been retired.  This builder emits only
    verified department names plus a constraint so the LLM does not invent
    curriculum or placement figures.
    """
    if not department_ids:
        return ""
    names = [_DEPT_DISPLAY_EN.get(d, d.replace("_", " ").upper()) for d in department_ids]
    return (
        "Departments requested for comparison: "
        + ", ".join(names)
        + ".\n"
        "Give a concise, accurate, parent-friendly contrast of these programs. "
        "Use only well-established facts. "
        "Do NOT invent placement statistics, salary figures, or curriculum details that are not in this context. "
        "SAMPLE_REPLACE_WITH_OFFICIAL: verify all claims against official SVIT data before production use."
    )
