"""Milestone 4.3 — PresentationTimeline + section_id playback authority."""

from __future__ import annotations

import unittest

from backend.services.answer_generation import INTENT_DEPARTMENT_OVERVIEW
from backend.services.content.types import SURFACE_DEPARTMENT_OVERVIEW
from backend.services.narration_plan import NarrationSegment, finalize_segment_list
from backend.services.content.surface_narration_mapper import map_canonical_content_to_segments
from backend.services.content.resolver import ContentResolver
from backend.services.content.types import ResolveRequest
from backend.services.orchestration.presentation_bundle import build_presentation_bundle
from backend.services.orchestration.types import ConversationResolution, PresentationMode
from backend.services.presentation.presentation_timeline import (
    DEPT_CANONICAL_SECTION_IDS,
    build_presentation_timeline,
)
from backend.services.presentation.timeline_contract import validate_presentation_timeline


def _dept_resolution() -> ConversationResolution:
    return ConversationResolution(
        language="English",
        language_code_key="en",
        tts_code="en-IN",
        intent=INTENT_DEPARTMENT_OVERVIEW,
        show_card=SURFACE_DEPARTMENT_OVERVIEW,
        card_surface=SURFACE_DEPARTMENT_OVERVIEW,
        should_generate_presentation=True,
        presentation_mode=PresentationMode.CARD_PRESENTATION.value,
        department_label="CSE",
    )


class TestSectionIdOnSegments(unittest.TestCase):
    def test_mapper_emits_five_canonical_section_ids(self) -> None:
        content = ContentResolver().resolve(
            ResolveRequest(
                surface=SURFACE_DEPARTMENT_OVERVIEW,
                department="cse",
                language="English",
                language_code="en",
            )
        )
        self.assertIsNotNone(content)
        assert content is not None
        segs = map_canonical_content_to_segments(content, lang_key="en")
        self.assertEqual(len(segs), 5)
        self.assertEqual([s.section_id for s in segs], list(DEPT_CANONICAL_SECTION_IDS))

    def test_public_dict_includes_section_id(self) -> None:
        seg = NarrationSegment(
            display_text="Intro\nBody",
            card_index=0,
            card_id="dept_slide",
            section_id="intro",
        )
        finalize_segment_list("t1", [seg])
        pub = seg.public_dict()
        self.assertEqual(pub["sectionId"], "intro")
        self.assertTrue(pub["segmentId"].startswith("t1:seg:"))

    def test_finalize_fills_missing_section_id(self) -> None:
        seg = NarrationSegment(display_text="Hello", card_index=0, card_id="fees")
        finalize_segment_list("t2", [seg])
        self.assertEqual(seg.section_id, "fees")


class TestPresentationTimeline(unittest.TestCase):
    def _bundle_from_dept(self):
        content = ContentResolver().resolve(
            ResolveRequest(
                surface=SURFACE_DEPARTMENT_OVERVIEW,
                department="cse",
                language="English",
                language_code="en",
            )
        )
        assert content is not None
        segs = map_canonical_content_to_segments(content, lang_key="en")
        finalize_segment_list("turn-tl", segs)
        res = _dept_resolution()
        res.canonical_surface = SURFACE_DEPARTMENT_OVERVIEW
        res.canonical_content_id = content.content_id
        res.content_hash = content.hash
        bundle = build_presentation_bundle(resolution=res, segments=segs, turn_id="turn-tl")
        return bundle, segs

    def test_five_entries_carry_section_ids(self) -> None:
        bundle, _ = self._bundle_from_dept()
        timeline = build_presentation_timeline(bundle, turn_id="turn-tl")
        self.assertEqual(len(timeline.entries), 5)
        self.assertEqual(
            [e.section_id for e in timeline.entries],
            list(DEPT_CANONICAL_SECTION_IDS),
        )
        self.assertEqual([e.index for e in timeline.entries], [0, 1, 2, 3, 4])
        contract = validate_presentation_timeline(timeline, bundle=bundle)
        self.assertTrue(contract.ok, contract.failures)

    def test_contract_fails_without_section_id(self) -> None:
        segs = [
            NarrationSegment(display_text="A", card_index=0, card_id="x", section_id="intro"),
            NarrationSegment(display_text="B", card_index=1, card_id="x", section_id="hod_voice"),
        ]
        # Force empty section after finalize by clearing in public dict path
        finalize_segment_list("t", segs)
        res = _dept_resolution()
        bundle = build_presentation_bundle(resolution=res, segments=segs, turn_id="t")
        # Mutate public segments to strip sectionId
        stripped = []
        for s in bundle.segments:
            d = dict(s)
            d.pop("sectionId", None)
            stripped.append(d)
        from dataclasses import replace

        bad_bundle = replace(bundle, segments=tuple(stripped))
        timeline = build_presentation_timeline(bad_bundle, turn_id="t")
        # Builder falls back to seg_i — unique section ids still pass uniqueness.
        # Explicitly clear section ids on entries by rebuilding with empty.
        # Validate missing by constructing a timeline that would fail:
        from backend.services.presentation.presentation_timeline import (
            PresentationTimeline,
            TimelineEntry,
        )

        bad = PresentationTimeline(
            presentation_id="p",
            turn_id="t",
            card_surface=SURFACE_DEPARTMENT_OVERVIEW,
            entries=(
                TimelineEntry(
                    segment_id="a",
                    section_id="",
                    unit_id=None,
                    scene_id="a",
                    card_index=0,
                    caption="A",
                    spoken_summary="A",
                    estimated_duration_ms=2500,
                    index=0,
                ),
            ),
            contract_hash="x",
        )
        result = validate_presentation_timeline(bad)
        self.assertFalse(result.ok)
        self.assertTrue(any("missing_section_id" in f for f in result.failures))

    def test_duplicate_section_id_fails(self) -> None:
        from backend.services.presentation.presentation_timeline import (
            PresentationTimeline,
            TimelineEntry,
        )

        bad = PresentationTimeline(
            presentation_id="p",
            turn_id="t",
            card_surface="fees",
            entries=(
                TimelineEntry(
                    segment_id="a",
                    section_id="fees",
                    unit_id=None,
                    scene_id="a",
                    card_index=0,
                    caption="A",
                    spoken_summary="A",
                    estimated_duration_ms=2500,
                    index=0,
                ),
                TimelineEntry(
                    segment_id="b",
                    section_id="fees",
                    unit_id=None,
                    scene_id="b",
                    card_index=1,
                    caption="B",
                    spoken_summary="B",
                    estimated_duration_ms=2500,
                    index=1,
                ),
            ),
            contract_hash="x",
        )
        result = validate_presentation_timeline(bad)
        self.assertFalse(result.ok)
        self.assertIn("duplicate_section_id", result.failures)

    def test_duplicate_section_id_allowed_when_unit_ids_differ(self) -> None:
        from backend.services.presentation.presentation_timeline import (
            PresentationTimeline,
            TimelineEntry,
        )

        good = PresentationTimeline(
            presentation_id="p",
            turn_id="t",
            card_surface="fees",
            entries=(
                TimelineEntry(
                    segment_id="a",
                    section_id="fees",
                    unit_id="cse.fees",
                    scene_id="a",
                    card_index=0,
                    caption="A",
                    spoken_summary="A",
                    estimated_duration_ms=2500,
                    index=0,
                ),
                TimelineEntry(
                    segment_id="b",
                    section_id="fees",
                    unit_id="ise.fees",
                    scene_id="b",
                    card_index=1,
                    caption="B",
                    spoken_summary="B",
                    estimated_duration_ms=2500,
                    index=1,
                ),
            ),
            contract_hash="x",
        )
        result = validate_presentation_timeline(good)
        self.assertTrue(result.ok, msg=result.failures)

    def test_duplicate_unit_id_fails_even_if_section_id_differs(self) -> None:
        from backend.services.presentation.presentation_timeline import (
            PresentationTimeline,
            TimelineEntry,
        )

        bad = PresentationTimeline(
            presentation_id="p",
            turn_id="t",
            card_surface="fees",
            entries=(
                TimelineEntry(
                    segment_id="a",
                    section_id="fees",
                    unit_id="cse.fees",
                    scene_id="a",
                    card_index=0,
                    caption="A",
                    spoken_summary="A",
                    estimated_duration_ms=2500,
                    index=0,
                ),
                TimelineEntry(
                    segment_id="b",
                    section_id="intro",
                    unit_id="cse.fees",
                    scene_id="b",
                    card_index=1,
                    caption="B",
                    spoken_summary="B",
                    estimated_duration_ms=2500,
                    index=1,
                ),
            ),
            contract_hash="x",
        )
        result = validate_presentation_timeline(bad)
        self.assertFalse(result.ok)
        self.assertIn("duplicate_unit_id", result.failures)

    def test_bundle_parity(self) -> None:
        bundle, _ = self._bundle_from_dept()
        timeline = build_presentation_timeline(bundle, turn_id="turn-tl")
        self.assertEqual(len(timeline.entries), len(bundle.segments))
        for i, entry in enumerate(timeline.entries):
            self.assertEqual(entry.caption, bundle.display_captions[i])
            self.assertEqual(entry.spoken_summary, bundle.spoken_summaries[i])


if __name__ == "__main__":
    unittest.main()
