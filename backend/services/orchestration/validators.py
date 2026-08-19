"""Conversation-level contract over ConversationResolution (validate only)."""

from __future__ import annotations

from dataclasses import dataclass, field

from backend.services.orchestration.response_authority import ResponseAuthority
from backend.services.orchestration.types import ConversationResolution, PresentationMode


@dataclass
class ConversationContractResult:
    ok: bool
    failures: list[str] = field(default_factory=list)


def validate_conversation_resolution(res: ConversationResolution) -> ConversationContractResult:
    failures: list[str] = []
    mode = res.presentation_mode

    if mode == PresentationMode.RETRY.value:
        if res.should_call_rag or res.should_call_groq or res.should_generate_presentation:
            failures.append("retry_must_not_call_rag_groq_or_plan")
        if not res.short_circuit_reply:
            failures.append("retry_requires_reply")

    if mode == PresentationMode.UNKNOWN.value:
        if res.should_call_rag or res.should_generate_presentation:
            failures.append("unknown_must_not_rag_or_plan")
        if not res.short_circuit_reply and res.answer_source == "policy_unknown":
            failures.append("unknown_requires_template_reply")

    if mode in (
        PresentationMode.DIRECT.value,
        PresentationMode.DIRECT_FAQ.value,
    ):
        if res.should_call_rag:
            failures.append("direct_must_not_rag")

    if mode == PresentationMode.CARD_PRESENTATION.value:
        if not res.should_generate_presentation and not res.degraded:
            failures.append("card_mode_requires_presentation_flag")

    if not res.language or not res.language_code_key or not res.tts_code:
        failures.append("localization_incomplete")

    if res.should_generate_presentation and res.degraded and res.presentation_mode == PresentationMode.CARD_PRESENTATION.value:
        failures.append("degraded_card_still_marked_presentation")

    # Milestone 3.5 — authority consistency
    if res.authority_sealed:
        if not res.response_authority:
            failures.append("sealed_without_authority")
        else:
            try:
                auth = ResponseAuthority(res.response_authority)
            except ValueError:
                failures.append("invalid_response_authority")
            else:
                if auth == ResponseAuthority.CARD_PRESENTATION and res.presentation_bundle is None:
                    failures.append("card_authority_requires_bundle")
                if auth == ResponseAuthority.RETRY_TEMPLATE and (
                    res.should_call_rag or res.should_call_groq or res.should_generate_presentation
                ):
                    failures.append("retry_authority_flags")
                if auth == ResponseAuthority.GROQ and res.presentation_bundle is not None:
                    failures.append("groq_authority_must_not_have_bundle")
                if auth == ResponseAuthority.FAQ and res.should_call_groq:
                    failures.append("faq_authority_must_not_groq")

    return ConversationContractResult(ok=len(failures) == 0, failures=failures)
