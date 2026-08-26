"""Session-level language state helpers for CLARA."""

from __future__ import annotations

from typing import Any

from backend.config.settings import TARGET_LANGUAGE_CODES
from backend.core.language_detection import LANGUAGE_KEY_TO_NAME, SUPPORTED_LANGUAGE_KEYS


def normalize_application_language(value: Any) -> str | None:
    """Strictly validate an inbound application language code.

    Accepts only the canonical internal codes (en/kn/hi/ta/te/ml).
    Provider locales such as ``kn-IN`` and display names such as ``Kannada``
    are application-state violations and return None (fail closed).
    """
    if not isinstance(value, str):
        return None
    candidate = value.strip().lower()
    if candidate in SUPPORTED_LANGUAGE_KEYS:
        return candidate
    return None


def set_session_language(
    session: dict[str, Any],
    language_code_key: str,
    *,
    is_auto: bool,
    confidence: float | None = None,
    method: str | None = None,
    sample: str | None = None,
) -> bool:
    """Set the authoritative session language from a canonical code key.

    Invalid values never become the active session language: the session is
    left unchanged and False is returned (fail closed, no silent en coercion).
    """
    code_key = normalize_application_language(language_code_key)
    if code_key is None:
        return False
    language_name = LANGUAGE_KEY_TO_NAME.get(code_key, "English")

    session["language_code_key"] = code_key
    session["language_name"] = language_name
    session["is_language_auto"] = bool(is_auto)

    # Backward-compatible fields used by existing code paths.
    session["language"] = language_name
    session["language_code"] = TARGET_LANGUAGE_CODES.get(code_key, TARGET_LANGUAGE_CODES["en"])

    if is_auto:
        session["language_detection"] = {
            "method": method or "unknown",
            "confidence": float(confidence or 0.0),
            "sample": (sample or "")[:200],
        }
    return True


def resolve_session_language(session: dict[str, Any]) -> tuple[str, str, str]:
    code_key = session.get("language_code_key") or "en"
    if code_key not in SUPPORTED_LANGUAGE_KEYS:
        code_key = "en"
    language_name = session.get("language_name") or LANGUAGE_KEY_TO_NAME.get(code_key, "English")
    tts_code = TARGET_LANGUAGE_CODES.get(code_key, TARGET_LANGUAGE_CODES["en"])
    return code_key, language_name, tts_code


def should_run_auto_detect(session: dict[str, Any]) -> bool:
    if session.get("is_language_auto") is False:
        return False
    return not bool(session.get("language_code_key"))
