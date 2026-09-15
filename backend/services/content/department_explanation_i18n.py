"""Localized department-explanation stage bodies (same unit IDs; content only).

Loaded from backend/data/locales/department_explanations.json.
English falls back to department_explanation_units._STAGES_EN when absent.
"""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any

_LOCALES_PATH = Path(__file__).resolve().parents[2] / "data" / "locales" / "department_explanations.json"


@lru_cache(maxsize=1)
def _pack() -> dict[str, Any]:
    if not _LOCALES_PATH.is_file():
        return {}
    return json.loads(_LOCALES_PATH.read_text(encoding="utf-8"))


def stage_heading_localized(stage: str, language_code: str) -> str | None:
    headings = (_pack().get("stage_headings") or {}).get((language_code or "en").lower())
    if isinstance(headings, dict):
        value = headings.get(stage)
        return value if isinstance(value, str) and value.strip() else None
    return None


def explanation_body_localized(dept_key: str, stage: str, language_code: str) -> str | None:
    depts = _pack().get("departments") or {}
    dept = depts.get((dept_key or "").strip().lower())
    if not isinstance(dept, dict):
        return None
    lang_block = dept.get((language_code or "en").lower())
    if not isinstance(lang_block, dict):
        return None
    value = lang_block.get(stage)
    return value if isinstance(value, str) and value.strip() else None


def difference_localized(language_code: str) -> str | None:
    block = (_pack().get("difference_ds_aiml") or {}).get((language_code or "en").lower())
    return block if isinstance(block, str) and block.strip() else None
