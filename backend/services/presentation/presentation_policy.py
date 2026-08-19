"""PresentationPolicy — presentation strategy selected by SurfaceDescriptor (M5.0)."""

from __future__ import annotations

from enum import Enum


class PresentationPolicy(str, Enum):
    MULTI_SLIDE = "multi_slide"
    SINGLE_PROFILE = "single_profile"
    CHECKLIST = "checklist"
    NUMERIC_TABLE = "numeric_table"
    COMPARISON = "comparison"
    MENU = "menu"
    CAROUSEL = "carousel"
    SUMMARY = "summary"
    # M5.0 — unit-composition policies
    MULTI_UNIT = "multi_unit"
    SINGLE_UNIT = "single_unit"
    PROFILE = "profile"


# Bumped when policy→segment rules or model projection shape changes.
PRESENTATION_VERSION = "presentation:v3"


def parse_policy(value: str | PresentationPolicy | None) -> PresentationPolicy | None:
    if value is None:
        return None
    if isinstance(value, PresentationPolicy):
        return value
    raw = str(value).strip()
    if not raw:
        return None
    try:
        return PresentationPolicy(raw)
    except ValueError:
        return None
