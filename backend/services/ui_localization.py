"""Shared fixed UI localization contract for backend and frontend consumers."""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any


_UI_LOCALE_PATH = Path(__file__).resolve().parents[1] / "data" / "locales" / "ui.json"
_LANGUAGE_NAME_TO_KEY = {
    "English": "en",
    "Kannada": "kn",
}


@lru_cache(maxsize=1)
def load_ui_locales() -> dict[str, Any]:
    return json.loads(_UI_LOCALE_PATH.read_text(encoding="utf-8"))


def ui_language_key(language: str | None) -> str:
    value = str(language or "").strip()
    if value in {"en", "kn"}:
        return value
    return _LANGUAGE_NAME_TO_KEY.get(value, "en")


def ui_text(language: str | None, path: str, **variables: object) -> str:
    """Return an exact fixed UI string, falling back to English only for unknown languages."""
    locale = load_ui_locales()
    lang_key = ui_language_key(language)
    current: object = locale.get(lang_key, locale["en"])
    try:
        for part in path.split("."):
            current = current[part]  # type: ignore[index]
    except (KeyError, TypeError):
        current = locale["en"]
        for part in path.split("."):
            current = current[part]
    if not isinstance(current, str):
        raise TypeError(f"UI localization path is not text: {path}")
    text = current
    for name, value in variables.items():
        text = text.replace("{" + name + "}", str(value))
    return text

