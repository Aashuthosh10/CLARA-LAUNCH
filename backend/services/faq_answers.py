"""Deterministic FAQ answers for CLARA's backend response pipeline."""

from __future__ import annotations

import json
import re
from functools import lru_cache
from pathlib import Path
from typing import Any

_PROJECT_ROOT = Path(__file__).resolve().parents[2]
_FAQ_PATH = _PROJECT_ROOT / "backend" / "data" / "faq_answers.json"


def _normalize(value: Any) -> str:
    text = str(value or "").strip().lower()
    text = re.sub(r"""[?.!,;:"'()[\]{}]+""", "", text)
    text = re.sub(r"[_-]+", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text


@lru_cache(maxsize=1)
def _load_faq_items() -> list[dict[str, Any]]:
    try:
        payload = json.loads(_FAQ_PATH.read_text(encoding="utf-8"))
    except Exception:
        return []
    items = payload.get("items", [])
    return items if isinstance(items, list) else []


@lru_cache(maxsize=1)
def _question_index() -> dict[str, dict[str, Any]]:
    out: dict[str, dict[str, Any]] = {}
    for item in _load_faq_items():
        questions = item.get("questions")
        if not isinstance(questions, dict):
            continue
        for question in questions.values():
            key = _normalize(question)
            if key:
                out[key] = item
    return out


def get_faq_answer_for_question(question: str, language_name: str) -> str | None:
    """Return a deterministic FAQ answer for an exact stored question, else None."""
    item = _question_index().get(_normalize(question))
    if not item:
        return None
    answers = item.get("answers")
    if not isinstance(answers, dict):
        return None
    text = answers.get(language_name) or answers.get("English")
    if not isinstance(text, str):
        return None
    text = text.strip()
    return text or None
