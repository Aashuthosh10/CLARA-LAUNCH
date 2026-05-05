"""Unit tests for deterministic narration segments."""

import unittest

from backend.services.answer_generation import (
    INTENT_COLLEGE_OVERVIEW,
    INTENT_DEPARTMENT_FEES,
    INTENT_DEPARTMENT_OVERVIEW,
    INTENT_DOCUMENTS,
    INTENT_HOD_PROFILE,
    build_target_card_payload,
)
from backend.services.narration_plan import (
    NarrationSegment,
    build_pre_llm_narration_plan,
    chunk_plan_with_card_index,
    finalize_segment_list,
    post_llm_chunk_plan,
)


class TestNarrationPlanBuilders(unittest.TestCase):
    def test_finalize_segment_ids_and_flags(self) -> None:
        segs = [
            NarrationSegment(display_text="One"),
            NarrationSegment(display_text="Two"),
        ]
        finalize_segment_list("turn-xyz", segs)
        self.assertIn(":seg:0", segs[0].segment_id)
        self.assertFalse(segs[0].is_final_segment)
        self.assertTrue(segs[1].is_final_segment)
        pd = segs[0].public_dict()
        self.assertIn("segmentId", pd)
        self.assertIn("ttsText", pd)

    def test_post_llm_chunk_non_empty_for_multi_sentence(self) -> None:
        segs = post_llm_chunk_plan("Short first. Short second phrase here.")
        self.assertGreaterEqual(len(segs), 1)
        joined = "\n".join(s.display_text for s in segs)
        self.assertIn("Short first", joined)

    def test_documents_segments_exist_en(self) -> None:
        segs = build_pre_llm_narration_plan(
            INTENT_DOCUMENTS,
            "en",
            user_text="docs",
            detected_department_label=None,
            menu_department_json_key=None,
        )
        self.assertIsNotNone(segs)
        assert segs is not None
        self.assertGreater(len(segs), 0)

    def test_college_overview_deck_en(self) -> None:
        segs = build_pre_llm_narration_plan(
            INTENT_COLLEGE_OVERVIEW,
            "en",
            user_text="college",
            detected_department_label=None,
            menu_department_json_key=None,
        )
        self.assertIsNotNone(segs)
        assert segs is not None
        self.assertGreater(len(segs), 0)

    def test_department_overview_unresolved_dept_falls_back_to_all(self) -> None:
        segs = build_pre_llm_narration_plan(
            INTENT_DEPARTMENT_OVERVIEW,
            "en",
            user_text="show me departments",
            detected_department_label=None,
            menu_department_json_key=None,
        )
        self.assertIsNotNone(segs)
        assert segs is not None
        self.assertGreaterEqual(len(segs), 1)
        for seg in segs:
            self.assertIsNotNone(seg.card_index)
            self.assertGreaterEqual(int(seg.card_index or 0), 0)

    def test_hod_no_department_prompt_segment(self) -> None:
        segs = build_pre_llm_narration_plan(
            INTENT_HOD_PROFILE,
            "en",
            user_text="who is hod",
            detected_department_label=None,
            menu_department_json_key=None,
        )
        self.assertIsNotNone(segs)
        assert segs is not None
        self.assertEqual(len(segs), 1)
        self.assertEqual(segs[0].card_id, "hod_pick")

    def test_fees_no_department_segment(self) -> None:
        segs = build_pre_llm_narration_plan(
            INTENT_DEPARTMENT_FEES,
            "en",
            user_text="fee structure",
            detected_department_label=None,
            menu_department_json_key=None,
        )
        self.assertIsNotNone(segs)
        assert segs is not None
        self.assertEqual(len(segs), 1)
        self.assertEqual(segs[0].card_id, "fees")

    def test_chunk_plan_with_card_index_orders_indices(self) -> None:
        segs = chunk_plan_with_card_index("Line one.\n\nLine two.\n\nLine three.", card_id="assistant_fallback")
        self.assertGreaterEqual(len(segs), 1)
        finalize_segment_list("t-chunk", segs)
        for i, s in enumerate(segs):
            self.assertEqual(s.card_index, i)

    def test_build_target_card_payload_overview_no_label_is_all_departments(self) -> None:
        payload = build_target_card_payload(
            INTENT_DEPARTMENT_OVERVIEW,
            lang_key="en",
            detected_department_label=None,
            user_text="departments at svit",
        )
        self.assertIsNotNone(payload)
        assert payload is not None
        self.assertEqual(payload.get("presentation_type"), "all_departments_overview")


if __name__ == "__main__":
    unittest.main()
