"""DEV-gated conversation intelligence logging."""

from __future__ import annotations

import logging
from typing import Any

from backend.config.settings import CONVERSATION_INTEL_DEBUG
from backend.services.conversation.types import ConversationIntelligenceResult

logger = logging.getLogger("clara.conversation_intel")


def log_conversation_intelligence(
    result: ConversationIntelligenceResult,
    *,
    turn_id: str | None = None,
    language: str | None = None,
) -> None:
    if not CONVERSATION_INTEL_DEBUG:
        return
    a = result.assessment
    d = result.decision
    ir = result.intent_result
    payload: dict[str, Any] = {
        "turn_id": turn_id,
        "language": language,
        "transcript_confidence": round(a.confidence, 3),
        "normalized_text": a.normalized_text[:120],
        "too_short": a.too_short,
        "likely_noise": a.likely_noise,
        "filler": a.contains_only_filler,
        "semantic_topic": result.semantic_topic,
        "intent": ir.intent if ir else None,
        "intent_confidence": round(ir.confidence, 3) if ir else None,
        "matched_source": ir.matched_source if ir else None,
        "policy": d.action.value,
        "answer_source": d.answer_source,
        "unknown_fallback": d.unknown_fallback,
        "passthrough": d.passthrough,
    }
    logger.info("CONV_INTEL %s", payload)
