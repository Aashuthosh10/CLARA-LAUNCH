"""Hostel clarification, sticky gender follow-ups, and romanized gender answers."""

from __future__ import annotations

import unittest

from backend.services.content.campus_units import (
    detect_hostel_gender_answer,
    hostel_deck_unit_ids,
    hostel_followup_items_from_sticky,
)
from backend.services.content.semantic_request_parser import parse_semantic_request
from backend.services.content.unit_selector import select_content_units
from backend.services.conversation.pending_clarification import (
    PendingClarification,
    build_pending_for_decision,
    try_resolve_pending,
)
from backend.services.conversation.response_decision import ResponseMode
from backend.services.conversation.templates import clarification_reply
from backend.tests.test_m59_universal_units import decide, plan_units


class TestHostelPendingClarification(unittest.TestCase):
    def test_bare_hostel_clarifies(self) -> None:
        self.assertIs(decide("Tell me about the hostel"), ResponseMode.CLARIFY)
        pending = build_pending_for_decision(
            text="Tell me about the hostel",
            clarification_target="hostel",
            topic=None,
            language_code_key="en",
        )
        self.assertIsNotNone(pending)
        assert pending is not None
        self.assertEqual(pending.clarification_target, "hostel")
        self.assertEqual(pending.options, ("boys", "girls"))

    def test_boys_and_girls_answers_resolve(self) -> None:
        pending = PendingClarification(
            original_query="Tell me about the hostel",
            clarification_target="hostel",
            options=("boys", "girls"),
            language_code_key="en",
        )
        for answer, gender in (
            ("boys", "boys"),
            ("girls", "girls"),
            ("ಹುಡುಗರು", "boys"),
            ("பெண்கள்", "girls"),
        ):
            with self.subTest(answer=answer):
                res = try_resolve_pending(answer, pending)
                self.assertIsNotNone(res)
                assert res is not None
                self.assertTrue(res.clear_pending)
                self.assertEqual(res.selected_option, gender)
                assert res.local_intent is not None
                self.assertEqual(res.local_intent.get("hostel_gender"), gender)
                self.assertIn(gender, (res.rewritten_text or "").lower())

    def test_romanized_gender_detection(self) -> None:
        samples = (
            ("boys", "boys"),
            ("gents", "boys"),
            ("girls", "girls"),
            ("ladies", "girls"),
            ("hudugaru", "boys"),
            ("hudugiyaru", "girls"),
            ("ladkiyon", "girls"),
            ("ladkon", "boys"),
        )
        for raw, expected in samples:
            with self.subTest(raw=raw):
                self.assertEqual(detect_hostel_gender_answer(raw), expected)

    def test_topic_switch_cancels_pending(self) -> None:
        pending = PendingClarification(
            original_query="hostel",
            clarification_target="hostel",
            options=("boys", "girls"),
            language_code_key="en",
        )
        res = try_resolve_pending("Tell me about the college buses", pending)
        self.assertIsNotNone(res)
        assert res is not None
        self.assertTrue(res.clear_pending)
        self.assertTrue(res.expired_new_topic)
        self.assertIsNone(res.local_intent)

    def test_clarify_copy_boys_first(self) -> None:
        en = clarification_reply("English", "hostel")
        self.assertIn("boys", en.lower())
        self.assertIn("girls", en.lower())
        self.assertLess(en.lower().index("boys"), en.lower().index("girls"))


class TestHostelStickyGender(unittest.TestCase):
    def test_sticky_mess_followup(self) -> None:
        items = hostel_followup_items_from_sticky(
            "what about the mess?",
            last_hostel_gender="boys",
        )
        self.assertEqual(len(items), 1)
        self.assertEqual(items[0].entity, "hostel.boys")
        self.assertEqual(items[0].topic, "mess")

        req = parse_semantic_request(
            raw_text="what about the mess?",
            language_code_key="en",
            ci_entities={"last_hostel_gender": "boys"},
        )
        self.assertIsNotNone(req)
        plan = select_content_units(req)
        self.assertIsNotNone(plan)
        assert plan is not None
        self.assertEqual(tuple(plan.units), ("hostel.mess",))

    def test_sticky_warden_followup(self) -> None:
        req = parse_semantic_request(
            raw_text="who is the warden?",
            language_code_key="en",
            ci_entities={"last_hostel_gender": "girls"},
        )
        self.assertIsNotNone(req)
        plan = select_content_units(req)
        self.assertIsNotNone(plan)
        assert plan is not None
        self.assertEqual(tuple(plan.units), ("hostel.girls.overview",))

    def test_warden_without_gender_clarifies(self) -> None:
        self.assertIsNone(plan_units("Who is the hostel warden?"))
        self.assertIs(decide("Who is the hostel warden?"), ResponseMode.CLARIFY)

    def test_deck_order(self) -> None:
        self.assertEqual(
            hostel_deck_unit_ids("boys"),
            (
                "hostel.boys.overview",
                "hostel.facilities",
                "hostel.mess",
                "hostel.safety",
            ),
        )


if __name__ == "__main__":
    unittest.main()
