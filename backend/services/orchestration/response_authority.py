"""ResponseAuthority — exactly one owner per assistant response (Milestone 3.5)."""

from __future__ import annotations

from enum import Enum

from backend.services.orchestration.types import ConversationResolution, PresentationMode


class ResponseAuthority(str, Enum):
    DETERMINISTIC = "DETERMINISTIC"  # greeting / name / small-talk templates
    FAQ = "FAQ"
    GROQ = "GROQ"
    CARD_PRESENTATION = "CARD_PRESENTATION"
    UNKNOWN_TEMPLATE = "UNKNOWN_TEMPLATE"
    RETRY_TEMPLATE = "RETRY_TEMPLATE"


class AuthoritySealedError(RuntimeError):
    """Raised when attempting to change authority or related emit path after seal."""


# Actions that downstream code may attempt; each maps to allowed authorities.
_ACTION_ALLOWED: dict[str, frozenset[ResponseAuthority]] = {
    "emit_groq": frozenset({ResponseAuthority.GROQ}),
    "emit_faq": frozenset({ResponseAuthority.FAQ}),
    "emit_card": frozenset({ResponseAuthority.CARD_PRESENTATION}),
    "emit_template": frozenset(
        {
            ResponseAuthority.DETERMINISTIC,
            ResponseAuthority.UNKNOWN_TEMPLATE,
            ResponseAuthority.RETRY_TEMPLATE,
        }
    ),
    "emit_rag": frozenset({ResponseAuthority.GROQ}),
}


def select_response_authority(resolution: ConversationResolution) -> ResponseAuthority:
    """Map presentation mode / degrade state to exactly one authority (pre-seal)."""
    mode = resolution.presentation_mode

    if mode == PresentationMode.RETRY.value:
        return ResponseAuthority.RETRY_TEMPLATE
    if mode == PresentationMode.UNKNOWN.value:
        return ResponseAuthority.UNKNOWN_TEMPLATE
    if mode == PresentationMode.DIRECT.value:
        return ResponseAuthority.DETERMINISTIC
    if mode == PresentationMode.DIRECT_FAQ.value:
        return ResponseAuthority.FAQ
    if mode == PresentationMode.CARD_PRESENTATION.value:
        if resolution.presentation_bundle is not None:
            return ResponseAuthority.CARD_PRESENTATION
        # Card intended but no bundle yet (deferred attach) — provisional card.
        if resolution.should_generate_presentation and not resolution.degraded:
            return ResponseAuthority.CARD_PRESENTATION
        return ResponseAuthority.GROQ
    # NORMAL_REPLY / FULL_TEXT / degraded card
    return ResponseAuthority.GROQ


def assert_authority_allows(*, authority: ResponseAuthority | str | None, action: str) -> bool:
    """Return True if the sealed authority may perform ``action``."""
    if authority is None:
        return False
    auth = ResponseAuthority(authority) if isinstance(authority, str) else authority
    allowed = _ACTION_ALLOWED.get(action)
    if allowed is None:
        return False
    return auth in allowed


def seal_authority(
    resolution: ConversationResolution,
    *,
    authority: ResponseAuthority | None = None,
    force: bool = False,
) -> ResponseAuthority:
    """
    Select (if needed) and seal response_authority. Immutable after seal unless force=False
    and already sealed with same value (idempotent).
    """
    if resolution.authority_sealed and not force:
        existing = resolution.response_authority
        if existing:
            return ResponseAuthority(existing)
        raise AuthoritySealedError("authority already sealed without value")

    chosen = authority or select_response_authority(resolution)
    resolution.response_authority = chosen.value
    resolution.authority_sealed = True

    # Align flags to authority so downstream gates are consistent.
    _align_flags_to_authority(resolution, chosen)
    return chosen


def _align_flags_to_authority(resolution: ConversationResolution, auth: ResponseAuthority) -> None:
    if auth == ResponseAuthority.RETRY_TEMPLATE:
        resolution.should_call_groq = False
        resolution.should_call_rag = False
        resolution.should_generate_presentation = False
    elif auth == ResponseAuthority.UNKNOWN_TEMPLATE:
        resolution.should_call_groq = False
        resolution.should_call_rag = False
        resolution.should_generate_presentation = False
    elif auth == ResponseAuthority.DETERMINISTIC:
        resolution.should_call_groq = False
        resolution.should_call_rag = False
        resolution.should_generate_presentation = False
    elif auth == ResponseAuthority.FAQ:
        resolution.should_call_groq = False
        resolution.should_call_rag = False
        resolution.should_generate_presentation = False
    elif auth == ResponseAuthority.CARD_PRESENTATION:
        resolution.should_call_rag = False
        resolution.should_generate_presentation = True
        # Groq may still run for narrator fallback text before TTS from plan; emit_groq blocked.
        resolution.should_call_groq = False
    elif auth == ResponseAuthority.GROQ:
        resolution.should_generate_presentation = False
        resolution.presentation_bundle = None
        resolution.should_call_groq = True
        # RAG remains as previously set for NORMAL_REPLY; degraded FULL_TEXT may keep rag.


def ensure_not_sealed_for_mutation(resolution: ConversationResolution, field: str = "resolution") -> None:
    if resolution.authority_sealed:
        raise AuthoritySealedError(f"cannot mutate {field} after authority seal")
