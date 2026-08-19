"""ContentSelection contract — future semantic planner hook (M5.0)."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(frozen=True)
class ContentUnitCandidate:
    unit_id: str
    surface: str
    context: str
    context_id: str
    score: float = 1.0
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class ContentSelection:
    candidates: tuple[ContentUnitCandidate, ...]
    selected_units: tuple[str, ...]
    reason: str
    language: str
    query: str
    selection_version: str = "m5.0"
