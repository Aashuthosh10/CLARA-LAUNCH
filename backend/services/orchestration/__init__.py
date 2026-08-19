"""Unified Conversation Orchestration (Milestone 3 / 3.5 / 3.6) — integration layer."""

from backend.services.orchestration.conversation_orchestrator import (
    ConversationOrchestrator,
    should_short_circuit,
)
from backend.services.orchestration.emit_gate import (
    assert_can_emit,
    require_live_turn,
    safe_deterministic_fallback_resolution,
    seal_out_of_band_deterministic,
)
from backend.services.orchestration.final_validation import TurnIntegrityResult, validate_turn_integrity
from backend.services.orchestration.outbound_builder import (
    OutboundResponse,
    build_answer_outbound,
    build_card_outbound,
    build_faq_outbound,
    build_template_outbound,
)
from backend.services.orchestration.presentation_bundle import PresentationBundle, build_presentation_bundle
from backend.services.orchestration.response_authority import (
    ResponseAuthority,
    assert_authority_allows,
    seal_authority,
)
from backend.services.orchestration.result import OrchestratorResult
from backend.services.orchestration.types import ConversationResolution, PresentationMode
from backend.services.orchestration.validators import (
    ConversationContractResult,
    validate_conversation_resolution,
)

__all__ = [
    "ConversationContractResult",
    "ConversationOrchestrator",
    "ConversationResolution",
    "OrchestratorResult",
    "OutboundResponse",
    "PresentationBundle",
    "PresentationMode",
    "ResponseAuthority",
    "TurnIntegrityResult",
    "assert_authority_allows",
    "assert_can_emit",
    "build_answer_outbound",
    "build_card_outbound",
    "build_faq_outbound",
    "build_presentation_bundle",
    "build_template_outbound",
    "require_live_turn",
    "safe_deterministic_fallback_resolution",
    "seal_authority",
    "seal_out_of_band_deterministic",
    "should_short_circuit",
    "validate_conversation_resolution",
    "validate_turn_integrity",
]
