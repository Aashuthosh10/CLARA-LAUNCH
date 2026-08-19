"""Orchestrator turn result."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from backend.services.orchestration.types import ConversationResolution


@dataclass
class OrchestratorResult:
    resolution: ConversationResolution
    narration_segments: list[Any] | None = None
    session_updates: dict[str, Any] = field(default_factory=dict)
    intel: Any | None = None  # ConversationIntelligenceResult for diagnostics
