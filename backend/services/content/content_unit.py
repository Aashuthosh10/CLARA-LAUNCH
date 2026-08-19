"""ContentUnit — independently addressable presentation/content unit in a semantic context (M5.0)."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(frozen=True)
class ContentUnit:
    """Immutable content unit. No presentation or narration logic."""

    unit_id: str
    surface: str
    content_type: str
    entity_type: str
    entity_id: str
    context: str
    context_id: str
    section_id: str
    title: str
    summary: str
    body: str
    language: str
    language_code: str
    canonical_source: str
    source_version: str
    content_hash: str
    metadata: dict[str, Any] = field(default_factory=dict)
    keywords: tuple[str, ...] = ()
    presentation_capabilities: tuple[str, ...] = ()
