"""Emit gate — require sealed authority before any assistant answer emit (M3.6)."""

from __future__ import annotations

from typing import Any

from backend.services.orchestration.response_authority import (
    ResponseAuthority,
    assert_authority_allows,
    seal_authority,
)
from backend.services.orchestration.types import ConversationResolution, PresentationMode
from backend.services.runtime.turn_finalizer import is_turn_finalized
from backend.services.session_language import resolve_session_language


_FALLBACK_REPLY = "I'm having a little trouble right now. Please try again in a moment."


def require_live_turn(
    session: dict[str, Any],
    turn_id: str | None,
    resolution: ConversationResolution | None,
) -> bool:
    """True when resolution exists, authority sealed, and turn not finalized."""
    if resolution is None:
        return False
    if not resolution.authority_sealed or not resolution.response_authority:
        return False
    if is_turn_finalized(session, turn_id):
        return False
    return True


def assert_can_emit(*, resolution: ConversationResolution | None, action: str) -> bool:
    if resolution is None or not resolution.authority_sealed:
        return False
    return assert_authority_allows(authority=resolution.response_authority, action=action)


def safe_deterministic_fallback_resolution(
    session: dict[str, Any],
    *,
    reply_text: str | None = None,
    reason: str = "orchestrator_failure",
) -> ConversationResolution:
    """
    Seal DETERMINISTIC fallback when orchestration fails.
    Never continue ungated legacy pipeline.
    """
    code_key, language, tts_code = resolve_session_language(session)
    resolution = ConversationResolution(
        language=language,
        language_code_key=code_key,
        tts_code=tts_code,
        presentation_mode=PresentationMode.DIRECT.value,
        response_type="deterministic_fallback",
        answer_source=reason,
        short_circuit_reply=(reply_text or _FALLBACK_REPLY).strip(),
        length_kind="clarification",
        should_call_groq=False,
        should_call_rag=False,
        should_generate_presentation=False,
        degraded=True,
        degrade_reason=reason,
    )
    seal_authority(resolution, authority=ResponseAuthority.DETERMINISTIC, force=True)
    session["_conversation_resolution"] = resolution
    return resolution


def seal_out_of_band_deterministic(
    session: dict[str, Any],
    *,
    reply_text: str,
    answer_source: str = "out_of_band",
) -> ConversationResolution:
    """Guest/wake/language prompts: DETERMINISTIC without running full CI."""
    code_key, language, tts_code = resolve_session_language(session)
    resolution = ConversationResolution(
        language=language,
        language_code_key=code_key,
        tts_code=tts_code,
        presentation_mode=PresentationMode.DIRECT.value,
        response_type="direct",
        answer_source=answer_source,
        short_circuit_reply=(reply_text or "").strip(),
        length_kind="clarification",
        should_call_groq=False,
        should_call_rag=False,
        should_generate_presentation=False,
    )
    seal_authority(resolution, authority=ResponseAuthority.DETERMINISTIC, force=True)
    session["_conversation_resolution"] = resolution
    return resolution
