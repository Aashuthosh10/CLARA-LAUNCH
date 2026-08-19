"""Answer language is not semantic language.

Semantic understanding asks what the user means.
This module asks which language CLARA should speak back — and therefore which
TTS code to use — for a non-card ANSWER turn.

Session language remains the kiosk choice for CARD localization and for
romanized / Latin input (script cannot identify Kannada vs Hindi romanization).
Native Indic script on this turn wins for ANSWER + TTS without rewriting session.
"""

from __future__ import annotations

from typing import Any

from backend.config.settings import TARGET_LANGUAGE_CODES
from backend.core.language_detection import LANGUAGE_KEY_TO_NAME, detect_script_language
from backend.services.session_language import resolve_session_language


def resolve_answer_language(text: str, session: dict[str, Any]) -> tuple[str, str, str]:
    """Return (lang_key, language_name, tts_code) for this ANSWER turn."""
    script = detect_script_language(text or "")
    if (
        script is not None
        and script.method == "script_heuristic"
        and script.lang_key in LANGUAGE_KEY_TO_NAME
        and script.lang_key != "en"
    ):
        key = script.lang_key
        return key, LANGUAGE_KEY_TO_NAME[key], TARGET_LANGUAGE_CODES[key]
    return resolve_session_language(session)


def tts_code_for_lang_key(lang_key: str) -> str:
    return TARGET_LANGUAGE_CODES.get(lang_key, TARGET_LANGUAGE_CODES["en"])
