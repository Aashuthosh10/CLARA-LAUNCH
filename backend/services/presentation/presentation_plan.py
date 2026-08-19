"""PresentationPlan — ordered selection of ContentUnits (M5.0)."""

from __future__ import annotations

from dataclasses import dataclass

from backend.services.presentation.presentation_policy import PresentationPolicy


@dataclass(frozen=True)
class PresentationPlan:
    presentation_id: str
    turn_id: str
    surface: str
    units: tuple[str, ...]
    order: tuple[int, ...]
    language: str
    language_code: str
    presentation_policy: PresentationPolicy
    planner_version: str
    plan_hash: str
