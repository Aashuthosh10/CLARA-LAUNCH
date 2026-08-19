"""PresentationModel — presentation projection of CanonicalContent (M5.0).

CanonicalContent owns facts. PresentationModel owns presentation structure + policy.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Mapping

from backend.services.presentation.presentation_policy import PresentationPolicy


def _freeze_meta(meta: Mapping[str, Any] | None) -> dict[str, Any]:
    return dict(meta or {})


@dataclass(frozen=True)
class PresentationSection:
    section_id: str
    title: str
    body: str
    metadata: dict  # copied at build time; treat as immutable by convention


@dataclass(frozen=True)
class PresentationModel:
    surface: str
    policy: PresentationPolicy
    presentation_version: str
    title: str
    subtitle: str
    summary: str
    sections: tuple[PresentationSection, ...]
    metadata: dict
