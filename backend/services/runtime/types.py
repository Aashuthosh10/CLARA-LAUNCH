"""Runtime integrity types (Milestone 2). Validators do not own business state."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class LocalizationSnapshot:
    code_key: str = "en"
    language_name: str = "English"
    tts_code: str = "en-IN"
    frozen: bool = False


@dataclass
class ConversationRuntimeContext:
    session_id: str | None = None
    conversation_id: str | None = None
    turn_id: str | None = None
    generation: int = 0
    guest_name: str | None = None
    current_language: str = "English"
    previous_intent: str | None = None
    current_intent: str | None = None
    active_presentation_id: str | None = None
    active_surface: str | None = None
    active_scene: int | None = None
    runtime_state: str = "idle"
    localization: LocalizationSnapshot = field(default_factory=LocalizationSnapshot)
    finalized_turn_id: str | None = None  # Milestone 3.5 — sync-only terminal marker

    def to_public_dict(self) -> dict[str, Any]:
        return {
            "sessionId": self.session_id,
            "conversationId": self.conversation_id,
            "turnId": self.turn_id,
            "generation": self.generation,
            "guestName": self.guest_name,
            "currentLanguage": self.current_language,
            "previousIntent": self.previous_intent,
            "currentIntent": self.current_intent,
            "activePresentationId": self.active_presentation_id,
            "activeSurface": self.active_surface,
            "activeScene": self.active_scene,
            "runtimeState": self.runtime_state,
            "finalizedTurnId": self.finalized_turn_id,
            "localization": {
                "codeKey": self.localization.code_key,
                "languageName": self.localization.language_name,
                "ttsCode": self.localization.tts_code,
                "frozen": self.localization.frozen,
            },
        }


@dataclass
class ContractFailure:
    reason: str
    expected: Any = None
    actual: Any = None


@dataclass
class PresentationContractResult:
    ok: bool
    failures: list[ContractFailure] = field(default_factory=list)
    counts: dict[str, int] = field(default_factory=dict)

    @property
    def primary_reason(self) -> str:
        return self.failures[0].reason if self.failures else ""
