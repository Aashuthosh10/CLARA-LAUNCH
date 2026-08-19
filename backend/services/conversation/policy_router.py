"""Conversation policy router — decide whether to answer before Groq/RAG."""

from __future__ import annotations

from typing import Any

from backend.services.answer_generation import INTENT_NORMAL_QUERY, get_off_topic_reply
from backend.services.conversation.templates import (
    clarification_reply,
    greeting_reply,
    name_ack_reply,
    no_speech_retry_reply,
    small_talk_reply,
)
from backend.services.conversation.transcript_validator import needs_speech_retry
from backend.services.conversation.types import (
    ExtractedEntities,
    IntentResult,
    PolicyAction,
    PolicyDecision,
    TranscriptAssessment,
)

_GREETING_RE_WORDS = frozenset({"hello", "hi", "hey", "namaste", "namaskar", "good morning", "good afternoon", "good evening"})
_SMALL_TALK_HINTS = frozenset({"how are you", "how's it going", "whats up", "what's up", "thank you", "thanks", "bye", "goodbye"})


def route_policy(
    *,
    assessment: TranscriptAssessment,
    entities: ExtractedEntities,
    semantic_topic: str | None,
    intent_result: IntentResult | None,
    language: str | None,
    local_intent: dict[str, Any] | None = None,
    faq_matched: bool = False,
    response_decision: Any | None = None,
) -> PolicyDecision:
    # Frontend card/menu clicks always continue.
    if local_intent and isinstance(local_intent, dict) and local_intent:
        return PolicyDecision(
            action=PolicyAction.CARD_PRESENTATION,
            passthrough=True,
            answer_source="localIntent",
            intent_hint=intent_result.intent if intent_result else None,
            length_kind="presentation",
        )

    if needs_speech_retry(assessment):
        return PolicyDecision(
            action=PolicyAction.NO_SPEECH_RETRY,
            reply_text=no_speech_retry_reply(language),
            answer_source="policy_retry",
            passthrough=False,
            length_kind="clarification",
        )

    # Mid-conversation name introduction (not onboarding awaiting_guest_name path).
    if entities.name_introduction and entities.person_name:
        return PolicyDecision(
            action=PolicyAction.ENTITY_UPDATE,
            reply_text=name_ack_reply(language, entities.person_name),
            answer_source="entity_update",
            passthrough=False,
            length_kind="clarification",
            session_updates={"guest_name": entities.person_name},
        )

    text = (assessment.normalized_text or "").lower().strip()

    if text in _GREETING_RE_WORDS or text in {"good morning", "good afternoon", "good evening"}:
        return PolicyDecision(
            action=PolicyAction.GREETING,
            reply_text=greeting_reply(language),
            answer_source="policy_greeting",
            passthrough=False,
            length_kind="clarification",
        )

    if any(h in text for h in _SMALL_TALK_HINTS):
        return PolicyDecision(
            action=PolicyAction.SMALL_TALK,
            reply_text=small_talk_reply(language),
            answer_source="policy_small_talk",
            passthrough=False,
            length_kind="clarification",
        )

    # FOOD / ENVIRONMENT are card-unsupported, not unanswerable. "How is the canteen?"
    # is an institutional question; SurfaceSelector already refuses to card it, so the
    # mode is left to the response decision below.

    if faq_matched:
        return PolicyDecision(
            action=PolicyAction.DIRECT_RESPONSE,
            passthrough=True,
            answer_source="faq",
            intent_hint=INTENT_NORMAL_QUERY,
            length_kind="normal",
        )

    # AUTHORITATIVE: project the single response decision onto a policy action.
    # This router no longer decides card-vs-answer-vs-unknown on its own, and it
    # never scores an utterance by token count.
    if response_decision is not None:
        return _project_response_decision(
            response_decision=response_decision,
            intent_result=intent_result,
            language=language,
        )

    return PolicyDecision(
        action=PolicyAction.ANSWER,
        passthrough=True,
        answer_source=intent_result.matched_source if intent_result else "none",
        intent_hint=intent_result.intent if intent_result else None,
        length_kind="normal",
    )


def _project_response_decision(
    *,
    response_decision: Any,
    intent_result: IntentResult | None,
    language: str | None,
) -> PolicyDecision:
    mode = getattr(response_decision, "mode", None)
    mode_value = getattr(mode, "value", mode)
    intent_hint = intent_result.intent if intent_result else None

    if mode_value == "CARD":
        return PolicyDecision(
            action=PolicyAction.CARD_PRESENTATION,
            passthrough=True,
            answer_source="response_decision",
            intent_hint=intent_hint,
            length_kind="presentation",
        )

    if mode_value == "ANSWER":
        return PolicyDecision(
            action=PolicyAction.ANSWER,
            passthrough=True,
            answer_source="response_decision",
            intent_hint=intent_hint or INTENT_NORMAL_QUERY,
            length_kind="normal",
        )

    if mode_value == "CLARIFY":
        return PolicyDecision(
            action=PolicyAction.ASK_CLARIFICATION,
            reply_text=clarification_reply(
                language,
                getattr(response_decision, "clarification_target", None),
            ),
            answer_source="policy_clarification",
            passthrough=False,
            length_kind="clarification",
        )

    # FALLBACK — genuinely out of scope. Distinct copy from "answer unavailable".
    return PolicyDecision(
        action=PolicyAction.UNKNOWN,
        reply_text=get_off_topic_reply(language),
        answer_source="policy_off_topic",
        unknown_fallback=True,
        passthrough=False,
        length_kind="unknown",
    )
