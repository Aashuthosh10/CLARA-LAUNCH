"""Intent confidence wrapper around existing feature-based intent resolution."""

from __future__ import annotations

from typing import Any

from backend.services.answer_generation import (
    INTENT_ADMISSIONS,
    INTENT_BUS_ROUTES,
    INTENT_COLLEGE_OVERVIEW,
    INTENT_COURSE_MENU,
    INTENT_DEPARTMENT_COMPARISON,
    INTENT_DEPARTMENT_FEES,
    INTENT_DEPARTMENT_OVERVIEW,
    INTENT_DOCUMENTS,
    INTENT_HOD_PROFILE,
    INTENT_HOD_TRUSTEES_PROFILE,
    INTENT_NORMAL_QUERY,
    INTENT_OFF_TOPIC,
    INTENT_PLACEMENTS,
    INTENT_PRINCIPAL_PROFILE,
    INTENT_TRUSTEES_PROFILE,
    INTENT_VICE_PRINCIPAL_PROFILE,
    extract_features,
    resolve_intent_from_features,
)
from backend.services.conversation.types import IntentResult

_CARD_INTENTS: frozenset[str] = frozenset(
    {
        INTENT_COLLEGE_OVERVIEW,
        INTENT_DEPARTMENT_OVERVIEW,
        INTENT_ADMISSIONS,
        INTENT_PLACEMENTS,
        INTENT_HOD_PROFILE,
        INTENT_TRUSTEES_PROFILE,
        INTENT_HOD_TRUSTEES_PROFILE,
        INTENT_DEPARTMENT_FEES,
        INTENT_DOCUMENTS,
        INTENT_BUS_ROUTES,
        INTENT_DEPARTMENT_COMPARISON,
        INTENT_PRINCIPAL_PROFILE,
        INTENT_VICE_PRINCIPAL_PROFILE,
        INTENT_COURSE_MENU,
    }
)


def score_intent_from_features(
    text: str,
    *,
    department_hint: str | None = None,
    faq_matched: bool = False,
    local_intent: dict[str, Any] | None = None,
) -> IntentResult:
    if local_intent and isinstance(local_intent, dict):
        # Frontend card/menu clicks are authoritative.
        trigger = str(local_intent.get("trigger") or local_intent.get("intent") or "").strip()
        if trigger:
            return IntentResult(
                intent=trigger.upper() if trigger.isupper() else INTENT_NORMAL_QUERY,
                confidence=0.95,
                matched_source="localIntent",
            )
        # Even without a clear trigger string, presence of localIntent means passthrough.
        return IntentResult(
            intent=INTENT_NORMAL_QUERY,
            confidence=0.90,
            matched_source="localIntent",
        )

    if faq_matched:
        return IntentResult(
            intent=INTENT_NORMAL_QUERY,
            confidence=0.92,
            matched_source="faq",
        )

    features = extract_features(text or "", department_hint=department_hint)
    intent = resolve_intent_from_features(features)

    if intent in _CARD_INTENTS:
        confidence = 0.88
        if features.has_department and intent in (
            INTENT_DEPARTMENT_OVERVIEW,
            INTENT_DEPARTMENT_FEES,
            INTENT_HOD_PROFILE,
        ):
            confidence = 0.93
        if features.is_comparison_query:
            confidence = 0.90
        return IntentResult(intent=intent, confidence=confidence, matched_source="features")

    if intent == INTENT_OFF_TOPIC:
        return IntentResult(intent=intent, confidence=0.70, matched_source="features")

    # NORMAL_QUERY. M5.4: utterance length is not evidence. A three-word institutional
    # question ("Campus life?") is exactly as routable as a fifteen-word one, and routing
    # is owned by ResponseDecision, so this score is observability only.
    return IntentResult(intent=intent, confidence=0.60, matched_source="features")


def is_card_intent(intent: str | None) -> bool:
    return bool(intent) and intent in _CARD_INTENTS
