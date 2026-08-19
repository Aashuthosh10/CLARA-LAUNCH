"""LocalizationResolver — single language authority for the turn."""

from __future__ import annotations

from typing import Any

from backend.services.orchestration.types import ConversationResolution
from backend.services.runtime.context import sync_runtime_from_session
from backend.services.session_language import resolve_session_language


def resolve_localization(
    session: dict[str, Any],
    resolution: ConversationResolution,
) -> ConversationResolution:
    """
    Own conversation / presentation / caption / tts / card languages for the turn —
    all identical (code_key + display name + tts_code from resolve_session_language).
    Full freeze happens later when a presentation is attached (M2).
    """
    code_key, language, tts_code = resolve_session_language(session)
    resolution.language = language
    resolution.language_code_key = code_key
    resolution.tts_code = tts_code
    resolution.should_translate = (code_key or "en").lower() != "en"

    session["language"] = language
    session["language_name"] = language
    session["language_code_key"] = code_key
    session["language_code"] = tts_code
    sync_runtime_from_session(session)
    return resolution
