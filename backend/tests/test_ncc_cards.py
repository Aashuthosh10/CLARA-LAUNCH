"""NCC ContentUnits — deck, topics, sticky follow-ups, enrollment guidance."""

from __future__ import annotations

import unittest

from backend.services.content.campus_units import (
    NCC_UNIT_IDS,
    is_ncc_enrollment_items,
    ncc_deck_unit_ids,
    ncc_followup_items_from_sticky,
)
from backend.services.content.content_unit_registry import all_unit_descriptors, get_unit_descriptor
from backend.services.content.content_unit_resolver import resolve_unit
from backend.services.content.semantic_request_parser import parse_semantic_request
from backend.services.content.surface_narration_mapper import map_content_units_to_segments
from backend.services.content.unit_selector import select_content_units
from backend.services.conversation.policy_router import _project_response_decision
from backend.services.conversation.response_decision import ResponseMode, resolve_response_decision
from backend.services.conversation.templates import ncc_enrollment_reply
from backend.services.conversation.types import IntentResult, PolicyAction
from backend.tests.test_m59_universal_units import decide, plan_units

LANGS = ("en", "kn", "hi", "ta", "te", "ml")
NCC_DECK = ncc_deck_unit_ids()


class TestNccRegistry(unittest.TestCase):
    def test_three_units_registered(self) -> None:
        ids = {d.unit_id for d in all_unit_descriptors()}
        self.assertEqual(set(NCC_UNIT_IDS), {"ncc.overview", "ncc.training", "ncc.benefits"})
        for uid in NCC_UNIT_IDS:
            self.assertIn(uid, ids)
            self.assertIsNotNone(get_unit_descriptor(uid))


class TestNccSelector(unittest.TestCase):
    def test_overview_expands_to_deck(self) -> None:
        self.assertEqual(plan_units("Tell me about NCC."), NCC_DECK)
        self.assertEqual(plan_units("What is NCC?"), NCC_DECK)
        self.assertEqual(plan_units("Tell me about cadets."), NCC_DECK)
        self.assertIs(decide("Tell me about NCC."), ResponseMode.CARD)

    def test_training_topic(self) -> None:
        self.assertEqual(plan_units("What training does NCC provide?"), ("ncc.training",))
        self.assertEqual(plan_units("NCC activities"), ("ncc.training",))

    def test_benefits_topic(self) -> None:
        self.assertEqual(plan_units("What are the benefits of NCC?"), ("ncc.benefits",))
        self.assertEqual(plan_units("What is B certificate?"), ("ncc.benefits",))
        self.assertEqual(plan_units("NCC benefits"), ("ncc.benefits",))

    def test_romanized_regional(self) -> None:
        cases = (
            ("NCC bagge heli", "kn", NCC_DECK),
            ("NCC alli enu activities ide?", "kn", ("ncc.training",)),
            ("NCC benefits yavavu?", "kn", ("ncc.benefits",)),
            ("NCC ke baare mein batao", "hi", NCC_DECK),
            ("NCC mein kya activities hoti hain?", "hi", ("ncc.training",)),
            ("NCC ke benefits kya hain?", "hi", ("ncc.benefits",)),
            ("NCC pathi sollunga", "ta", NCC_DECK),
            ("NCC la enna activities irukku?", "ta", ("ncc.training",)),
            ("NCC oda benefits enna?", "ta", ("ncc.benefits",)),
            ("NCC gurinchi cheppandi", "te", NCC_DECK),
            ("NCC lo em activities unnayi?", "te", ("ncc.training",)),
            ("NCC valla benefits enti?", "te", ("ncc.benefits",)),
            ("NCC-ne kurichu parayamo", "ml", NCC_DECK),
            ("NCC-il enthu activities undu?", "ml", ("ncc.training",)),
            ("NCC-yude benefits enthaanu?", "ml", ("ncc.benefits",)),
        )
        for raw, lang, expected in cases:
            with self.subTest(raw=raw, lang=lang):
                self.assertEqual(plan_units(raw, lang), expected)


class TestNccEnrollment(unittest.TestCase):
    def test_enrollment_is_answer_not_invented_card(self) -> None:
        self.assertIsNone(plan_units("How do I join NCC?"))
        req = parse_semantic_request(
            raw_text="How do I join NCC?",
            language_code_key="en",
        )
        decision = resolve_response_decision(
            text="How do I join NCC?",
            semantic_request=req,
            ci_intent=None,
            has_department_entity=False,
            faq_matched=False,
        )
        self.assertIs(decision.mode, ResponseMode.ANSWER)
        self.assertEqual(decision.evidence, "ncc_enrollment_guidance")
        self.assertTrue(is_ncc_enrollment_items(decision.items))
        policy = _project_response_decision(
            response_decision=decision,
            intent_result=IntentResult(
                intent="NORMAL_QUERY",
                confidence=0.9,
                matched_source="none",
            ),
            language="English",
        )
        self.assertEqual(policy.action, PolicyAction.ANSWER)
        self.assertIn("administration office", (policy.reply_text or "").lower())
        self.assertNotRegex(policy.reply_text or "", r"\+91|\d{10}")

    def test_enrollment_copy_six_languages(self) -> None:
        for lang in ("English", "Kannada", "Hindi", "Tamil", "Telugu", "Malayalam"):
            with self.subTest(lang=lang):
                text = ncc_enrollment_reply(lang)
                self.assertTrue(text)
                self.assertIn("NCC", text)
                self.assertNotRegex(text, r"\+91")


class TestNccSticky(unittest.TestCase):
    def test_sticky_training_followup(self) -> None:
        items = ncc_followup_items_from_sticky(
            "What about the training?",
            last_ncc_active=True,
        )
        self.assertEqual(len(items), 1)
        self.assertEqual(items[0].entity, "ncc")
        self.assertEqual(items[0].topic, "training")
        req = parse_semantic_request(
            raw_text="What about the training?",
            language_code_key="en",
            ci_entities={"last_ncc_active": True},
        )
        plan = select_content_units(req)
        self.assertIsNotNone(plan)
        assert plan is not None
        self.assertEqual(tuple(plan.units), ("ncc.training",))

    def test_sticky_certificates_followup(self) -> None:
        req = parse_semantic_request(
            raw_text="What certificates can I get?",
            language_code_key="en",
            ci_entities={"last_ncc_active": True},
        )
        plan = select_content_units(req)
        self.assertIsNotNone(plan)
        assert plan is not None
        self.assertEqual(tuple(plan.units), ("ncc.benefits",))

    def test_topic_switch_to_hostel(self) -> None:
        self.assertEqual(
            plan_units("Actually, what are the boys hostel facilities?"),
            ("hostel.facilities",),
        )


class TestNccLocalization(unittest.TestCase):
    def test_official_six_languages(self) -> None:
        for lang in LANGS:
            for uid in NCC_UNIT_IDS:
                with self.subTest(lang=lang, uid=uid):
                    unit = resolve_unit(unit_id=uid, language=lang, language_code=lang)
                    self.assertIsNotNone(unit)
                    assert unit is not None
                    self.assertTrue(unit.title)
                    self.assertTrue(unit.body)
                    self.assertNotIn("SAMPLE_REPLACE_WITH_OFFICIAL", unit.body)
                    segs = map_content_units_to_segments((unit,), lang_key=lang)
                    self.assertEqual(segs[0].unit_id, uid)
                    self.assertTrue(segs[0].tts_text)


if __name__ == "__main__":
    unittest.main()
