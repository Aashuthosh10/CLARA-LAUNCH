"""Fail-closed PresentationTimeline validation (M4.3)."""

from __future__ import annotations

from dataclasses import dataclass, field

from backend.services.content.types import SURFACE_DEPARTMENT_OVERVIEW
from backend.services.orchestration.presentation_bundle import PresentationBundle
from backend.services.presentation.presentation_timeline import (
    DEPT_CANONICAL_SECTION_IDS,
    PresentationTimeline,
)


@dataclass
class TimelineContractResult:
    ok: bool
    failures: list[str] = field(default_factory=list)
    primary_reason: str | None = None


def validate_presentation_timeline(
    timeline: PresentationTimeline,
    *,
    bundle: PresentationBundle | None = None,
) -> TimelineContractResult:
    """Validate timeline integrity. Fail closed on any contract breach."""
    failures: list[str] = []

    if not timeline.entries:
        failures.append("empty_timeline")
    else:
        n = len(timeline.entries)
        section_ids: list[str] = []
        unit_ids: list[str | None] = []
        segment_ids: list[str] = []
        scene_ids: list[str] = []

        for i, entry in enumerate(timeline.entries):
            if entry.index != i:
                failures.append(f"index_gap:{i}:{entry.index}")
            sid = (entry.section_id or "").strip()
            if not sid:
                failures.append(f"missing_section_id:{i}")
            else:
                section_ids.append(sid)
            unit_id = (entry.unit_id or "").strip() if getattr(entry, "unit_id", None) is not None else None
            # Preserve None for legacy segments where unit_id is unavailable.
            unit_ids.append(unit_id if unit_id else None)
            seg = (entry.segment_id or "").strip()
            if not seg:
                failures.append(f"missing_segment_id:{i}")
            else:
                segment_ids.append(seg)
            sc = (entry.scene_id or "").strip()
            if not sc:
                failures.append(f"missing_scene_id:{i}")
            else:
                scene_ids.append(sc)
            if not (entry.caption or "").strip() and not (entry.spoken_summary or "").strip():
                failures.append(f"empty_caption_and_spoken:{i}")

        if len(section_ids) != len(set(section_ids)):
            # For unit-backed presentations, duplicate sectionId is allowed when
            # unitId differs. For legacy segments (unitId missing), duplicates remain invalid.
            by_section: dict[str, set[str | None]] = {}
            for e in timeline.entries:
                s = (e.section_id or "").strip()
                if not s:
                    continue
                u = (getattr(e, "unit_id", None) or "")
                u = str(u).strip() or None
                by_section.setdefault(s, set()).add(u)
            for s, us in by_section.items():
                if len(us) <= 1 and (None in us):
                    failures.append("duplicate_section_id")
                    break
                # If the section repeats with different unit ids, that's valid.
                # If the section repeats with a mix that includes None, still fail closed.
                if None in us and len(us) > 1:
                    failures.append("duplicate_section_id")
                    break

        if len(segment_ids) != len(set(segment_ids)):
            failures.append("duplicate_segment_id")

        # Unit-backed identity rule: duplicate unitId is invalid.
        normalized_unit_ids = [u for u in unit_ids if u is not None]
        if len(normalized_unit_ids) != len(set(normalized_unit_ids)):
            failures.append("duplicate_unit_id")
        if len(scene_ids) != len(set(scene_ids)):
            failures.append("duplicate_scene_id")

        surface = (timeline.card_surface or "").strip()
        if surface == SURFACE_DEPARTMENT_OVERVIEW and n == len(DEPT_CANONICAL_SECTION_IDS):
            expected = list(DEPT_CANONICAL_SECTION_IDS)
            actual = [e.section_id for e in timeline.entries]
            if actual != expected:
                failures.append(f"dept_section_mismatch:{actual}")

    if bundle is not None:
        if len(timeline.entries) != len(bundle.segments):
            failures.append(
                f"length_mismatch:timeline={len(timeline.entries)}:bundle={len(bundle.segments)}"
            )
        for i, entry in enumerate(timeline.entries):
            if i >= len(bundle.display_captions):
                break
            if (entry.caption or "") != (bundle.display_captions[i] or ""):
                failures.append(f"caption_parity:{i}")
            if i < len(bundle.spoken_summaries) and (entry.spoken_summary or "") != (
                bundle.spoken_summaries[i] or ""
            ):
                failures.append(f"spoken_parity:{i}")

    ok = not failures
    return TimelineContractResult(
        ok=ok,
        failures=failures,
        primary_reason=failures[0] if failures else None,
    )
