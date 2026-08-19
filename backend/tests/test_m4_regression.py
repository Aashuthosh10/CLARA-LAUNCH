"""M4.1 + M4.3 regression aggregate (M5.0 parity gate)."""

from __future__ import annotations

import unittest

from backend.services.answer_generation import INTENT_DEPARTMENT_OVERVIEW
from backend.services.content.resolver import ContentResolver
from backend.services.content.surface_narration_mapper import (
    extract_department_units,
    map_canonical_content_to_segments,
    map_content_units_to_segments,
)
from backend.services.content.types import SURFACE_DEPARTMENT_OVERVIEW, ResolveRequest
from backend.services.narration_plan import finalize_segment_list
from backend.services.orchestration.narration_resolver import resolve_narration
from backend.services.orchestration.presentation_bundle import (
    build_presentation_bundle,
    compute_contract_hash,
)
from backend.services.orchestration.types import ConversationResolution, PresentationMode
from backend.services.presentation.presentation_timeline import (
    DEPT_CANONICAL_SECTION_IDS,
    build_presentation_timeline,
)
from backend.services.presentation.timeline_contract import validate_presentation_timeline


def _dept_resolution(*, code: str = "en") -> ConversationResolution:
    return ConversationResolution(
        language="English",
        language_code_key=code,
        tts_code="en-IN",
        intent=INTENT_DEPARTMENT_OVERVIEW,
        show_card=SURFACE_DEPARTMENT_OVERVIEW,
        card_surface=SURFACE_DEPARTMENT_OVERVIEW,
        should_generate_presentation=True,
        presentation_mode=PresentationMode.CARD_PRESENTATION.value,
        department_label="CSE",
    )


class TestM4Regression(unittest.TestCase):
    def test_unit_path_matches_canonical_mapper(self) -> None:
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
        direct = map_canonical_content_to_segments(content, lang_key="en")
        units = extract_department_units(content, lang_key="en")
        via_units = map_content_units_to_segments(units, lang_key="en")
        self.assertEqual(len(direct), 5)
        self.assertEqual(len(via_units), 5)
        self.assertEqual([s.display_text for s in direct], [s.display_text for s in via_units])
        self.assertEqual([s.section_id for s in direct], list(DEPT_CANONICAL_SECTION_IDS))

    def test_narration_resolver_m4_parity(self) -> None:
        res = _dept_resolution()
        segs = resolve_narration(
            resolution=res,
            entities={"department": "CSE"},
            user_text="Tell me about CSE",
        )
        self.assertIsNotNone(segs)
        assert segs is not None
        finalize_segment_list("m4-reg", segs)
        self.assertEqual(len(segs), 5)
        self.assertEqual([s.section_id for s in segs], list(DEPT_CANONICAL_SECTION_IDS))

        bundle = build_presentation_bundle(resolution=res, segments=segs, turn_id="m4-reg")
        timeline = build_presentation_timeline(bundle, turn_id="m4-reg")
        contract = validate_presentation_timeline(timeline, bundle=bundle)
        self.assertTrue(contract.ok, msg=contract.failures)
        self.assertEqual(len(timeline.entries), 5)

    def test_contract_hash_stable(self) -> None:
        res = _dept_resolution()
        segs = resolve_narration(
            resolution=res,
            entities={"department": "CSE"},
            user_text="Tell me about CSE",
        )
        self.assertIsNotNone(segs)
        assert segs is not None
        finalize_segment_list("h1", segs)
        captions = [s.display_text for s in segs]
        spoken = [s.tts_text for s in segs]
        h1 = compute_contract_hash(
            language_code="en",
            card_surface=SURFACE_DEPARTMENT_OVERVIEW,
            display_captions=captions,
            spoken_summaries=spoken,
        )
        h2 = compute_contract_hash(
            language_code="en",
            card_surface=SURFACE_DEPARTMENT_OVERVIEW,
            display_captions=captions,
            spoken_summaries=spoken,
        )
        self.assertEqual(h1, h2)


if __name__ == "__main__":
    unittest.main()
