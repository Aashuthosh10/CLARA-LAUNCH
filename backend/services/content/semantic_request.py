"""SemanticRequest — language-independent semantic intent for ContentUnit selection (M5.1/M5.3)."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Literal

SemanticConfidence = Literal["HIGH", "MEDIUM", "LOW", "NONE"]


@dataclass(frozen=True)
class SemanticRequest:
    """
    Immutable semantic request used only for deterministic unit selection.

    Must not:
    - mutate CI intent values
    - choose presentation surface
    - call RAG / LLM
    """

    language_code: str
    topic: str
    entities: tuple[str, ...]  # department json keys, e.g. ("cse", "cse_aiml")
    context: str  # e.g. "department"
    requested_scope: str  # "single" | "full_department"
    confidence: SemanticConfidence
    source: str
    raw_text: str

    # Ordered (entity, topic) pairs in user order. This is the composition contract:
    # N pairs → N independently addressable units. Empty means "derive from
    # topic × entities", which keeps pre-M5.4 constructions valid.
    items: tuple[tuple[str, str], ...] = ()

    diagnostics: dict[str, Any] | None = None

    @property
    def unit_items(self) -> tuple[tuple[str, str], ...]:
        """Canonical ordered (entity, topic) pairs for unit selection."""
        if self.items:
            return self.items
        return tuple((entity, self.topic) for entity in self.entities)

    @property
    def is_mixed_composition(self) -> bool:
        """True when the request addresses more than one topic."""
        return len({topic for _, topic in self.unit_items}) > 1
