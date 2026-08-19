"""PresentationTimeline — derived playback authority from PresentationBundle (M4.3)."""

from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from typing import Any, Sequence

from backend.services.orchestration.presentation_bundle import PresentationBundle

# Canonical department section ids (meaning keys for scene sync).
DEPT_CANONICAL_SECTION_IDS: tuple[str, ...] = (
    "intro",
    "hod_voice",
    "achievements",
    "placement",
    "fees",
)


@dataclass(frozen=True)
class TimelineEntry:
    segment_id: str
    section_id: str
    unit_id: str | None
    scene_id: str
    card_index: int
    caption: str
    spoken_summary: str
    estimated_duration_ms: int
    index: int


@dataclass(frozen=True)
class PresentationTimeline:
    presentation_id: str
    turn_id: str | None
    card_surface: str | None
    entries: tuple[TimelineEntry, ...]
    contract_hash: str


def _seg_field(seg: dict[str, Any], *keys: str, default: Any = None) -> Any:
    for k in keys:
        if k in seg and seg[k] is not None:
            return seg[k]
    return default


def _timeline_contract_hash(entries: Sequence[TimelineEntry]) -> str:
    payload = {
        "section_ids": [e.section_id for e in entries],
        "segment_ids": [e.segment_id for e in entries],
        "captions": [e.caption for e in entries],
        "spoken": [e.spoken_summary for e in entries],
        "indices": [e.index for e in entries],
    }
    raw = json.dumps(payload, sort_keys=True, ensure_ascii=True)
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:32]


def build_presentation_timeline(
    bundle: PresentationBundle,
    *,
    turn_id: str | None = None,
    estimated_duration_ms: int = 2500,
) -> PresentationTimeline:
    """
    Pure projection of PresentationBundle → PresentationTimeline.
    No content rewriting. section_id is the meaning key for scene activation.
    """
    entries: list[TimelineEntry] = []
    for i, seg in enumerate(bundle.segments):
        if not isinstance(seg, dict):
            seg = {}
        segment_id = str(
            _seg_field(seg, "segmentId", "segment_id", default="") or f"{bundle.presentation_id}:seg:{i}"
        ).strip()
        section_id = str(_seg_field(seg, "sectionId", "section_id", default="") or "").strip()
        if not section_id:
            section_id = f"seg_{i}"
        unit_id = _seg_field(seg, "unitId", "unit_id", default=None)
        if unit_id is not None:
            unit_id = str(unit_id).strip() or None
        card_index_raw = _seg_field(seg, "cardIndex", "card_index", default=i)
        try:
            card_index = int(card_index_raw) if card_index_raw is not None else i
        except (TypeError, ValueError):
            card_index = i
        caption = ""
        spoken = ""
        if i < len(bundle.display_captions):
            caption = str(bundle.display_captions[i] or "")
        if i < len(bundle.spoken_summaries):
            spoken = str(bundle.spoken_summaries[i] or "")
        if not caption:
            caption = str(_seg_field(seg, "displayText", "display_text", default="") or "")
        if not spoken:
            spoken = str(_seg_field(seg, "ttsText", "tts_text", default="") or "") or caption

        entries.append(
            TimelineEntry(
                segment_id=segment_id,
                section_id=section_id,
                unit_id=unit_id,
                scene_id=segment_id,
                card_index=card_index,
                caption=caption,
                spoken_summary=spoken,
                estimated_duration_ms=max(400, int(estimated_duration_ms)),
                index=i,
            )
        )

    frozen = tuple(entries)
    return PresentationTimeline(
        presentation_id=bundle.presentation_id,
        turn_id=turn_id,
        card_surface=bundle.card_surface,
        entries=frozen,
        contract_hash=_timeline_contract_hash(frozen),
    )
