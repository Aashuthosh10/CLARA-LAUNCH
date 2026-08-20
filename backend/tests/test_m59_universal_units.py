"""M5.9 — universal unit selection, six-language narration, no hidden N-cap."""

from __future__ import annotations

import unittest

from backend.services.content.content_unit_registry import all_unit_descriptors, get_unit_descriptor
from backend.services.content.content_unit_resolver import resolve_unit
from backend.services.content.leadership_units import (
    UNIT_PRINCIPAL,
    UNIT_TRUSTEES,
    UNIT_VICE_PRINCIPAL,
)
from backend.services.content.semantic_request_parser import parse_semantic_request
from backend.services.content.surface_narration_mapper import map_content_units_to_segments
from backend.services.content.unit_selector import resolve_units_for_plan, select_content_units
from backend.services.conversation.response_decision import ResponseMode, resolve_response_decision


LANGS = ("en", "kn", "hi", "ta", "te", "ml")


def plan_units(raw: str, lang: str = "en", ci_entities: dict | None = None):
    request = parse_semantic_request(raw_text=raw, language_code_key=lang, ci_entities=ci_entities)
    if request is None:
        return None
    plan = select_content_units(request)
    return None if plan is None else tuple(plan.units)


def decide(raw: str, lang: str = "en"):
    request = parse_semantic_request(raw_text=raw, language_code_key=lang)
    return resolve_response_decision(
        text=raw,
        semantic_request=request,
        ci_intent=None,
        has_department_entity=bool(request and request.entities),
        faq_matched=False,
        local_intent=None,
        validated_proposal=None,
    ).mode


class TestM59Registry(unittest.TestCase):
    def test_existing_department_and_leadership_ids(self) -> None:
        ids = {d.unit_id for d in all_unit_descriptors()}
        self.assertIn("cse_ds.hod", ids)
        self.assertIn("cse_ds.overview", ids)
        self.assertIn("cse_ds.fees", ids)
        self.assertIn("cse_ds.placements", ids)
        self.assertIn("cse_ds.achievements", ids)
        self.assertIn(UNIT_PRINCIPAL, ids)
        self.assertIn(UNIT_VICE_PRINCIPAL, ids)
        self.assertIn(UNIT_TRUSTEES, ids)
        self.assertNotIn("campus_environment", ids)
        self.assertNotIn("canteen", ids)
        self.assertIsNotNone(get_unit_descriptor(UNIT_PRINCIPAL))

    def test_ids_are_unique(self) -> None:
        ids = [d.unit_id for d in all_unit_descriptors()]
        self.assertEqual(len(ids), len(set(ids)))


class TestM59SingleUnit(unittest.TestCase):
    def test_principal(self) -> None:
        self.assertEqual(plan_units("Who is the principal?"), (UNIT_PRINCIPAL,))
        self.assertIs(decide("Who is the principal?"), ResponseMode.CARD)

    def test_trustees(self) -> None:
        self.assertEqual(plan_units("Tell me about the trustees."), (UNIT_TRUSTEES,))

    def test_dean_maps_to_vice_principal(self) -> None:
        self.assertEqual(plan_units("Who is the dean?"), (UNIT_VICE_PRINCIPAL,))

    def test_hod(self) -> None:
        self.assertEqual(
            plan_units("Who is the HOD of CSE Data Science?"),
            ("cse_ds.hod",),
        )

    def test_department_overview_single(self) -> None:
        self.assertEqual(plan_units("CSE overview"), ("cse.overview",))

    def test_fees(self) -> None:
        self.assertEqual(plan_units("CSE Data Science fees"), ("cse_ds.fees",))


class TestM59MultiUnit(unittest.TestCase):
    def test_principal_and_trustees(self) -> None:
        self.assertEqual(
            plan_units("Tell me about the principal and trustees."),
            (UNIT_PRINCIPAL, UNIT_TRUSTEES),
        )

    def test_hod_and_overview(self) -> None:
        self.assertEqual(
            plan_units("Show me the HOD and overview of CSE Data Science."),
            ("cse_ds.hod", "cse_ds.overview"),
        )

    def test_two_department_overviews(self) -> None:
        self.assertEqual(
            plan_units("Show me CSE Data Science and CSE AIML."),
            ("cse_ds.overview", "cse_aiml.overview"),
        )

    def test_fees_and_placements(self) -> None:
        self.assertEqual(
            plan_units("Show me CSE Data Science fees and placements."),
            ("cse_ds.fees", "cse_ds.placements"),
        )

    def test_no_hidden_cap(self) -> None:
        units = plan_units("CSE HOD, AIML HOD, Data Science HOD and ECE HOD")
        self.assertEqual(units, ("cse.hod", "cse_aiml.hod", "cse_ds.hod", "ece.hod"))

    def test_tell_me_about_two_departments_still_fail_closed(self) -> None:
        self.assertIsNone(plan_units("tell me about CSE and AIML"))


class TestM59NonCards(unittest.TestCase):
    def test_campus_and_canteen_are_answers(self) -> None:
        self.assertIsNone(plan_units("Tell me about the campus and canteen."))
        self.assertIs(decide("Tell me about the campus and canteen."), ResponseMode.ANSWER)

    def test_mixed_faculty_code_switch_is_answer(self) -> None:
        self.assertIs(decide("teachers hegiddare?"), ResponseMode.ANSWER)


class TestM59Anaphora(unittest.TestCase):
    def test_follow_up_uses_previous_entity(self) -> None:
        self.assertEqual(
            plan_units("What about its HOD?", ci_entities={"department": "CSE (Data Science)"}),
            ("cse_ds.hod",),
        )

    def test_explicit_entity_overrides_previous(self) -> None:
        self.assertEqual(
            plan_units("What about AIML fees?", ci_entities={"department": "CSE (Data Science)"}),
            ("cse_aiml.fees",),
        )

    def test_no_anaphora_does_not_stick(self) -> None:
        self.assertIsNone(
            plan_units("Who is the HOD?", ci_entities={"department": "CSE (Data Science)"})
        )


class TestM59SixLanguages(unittest.TestCase):
    CASES = (
        ("Who is the HOD of CSE Data Science?", "en", ("cse_ds.hod",)),
        ("ಡೇಟಾ ಸೈನ್ಸ್ ವಿಭಾಗದ HOD ಯಾರು?", "kn", ("cse_ds.hod",)),
        ("CSE Data Science के HOD कौन हैं?", "hi", ("cse_ds.hod",)),
        ("CSE Data Science HOD யார்?", "ta", ("cse_ds.hod",)),
        ("CSE Data Science HOD ఎవరు?", "te", ("cse_ds.hod",)),
        ("CSE Data Science HOD ആരാണ്?", "ml", ("cse_ds.hod",)),
    )

    def test_hod_queries_in_six_languages(self) -> None:
        for raw, lang, expected in self.CASES:
            with self.subTest(lang=lang, raw=raw):
                self.assertEqual(plan_units(raw, lang), expected)

    def test_principal_localized_card_and_narration(self) -> None:
        for lang in LANGS:
            with self.subTest(lang=lang):
                req = parse_semantic_request(raw_text="Who is the principal?", language_code_key=lang)
                self.assertIsNotNone(req)
                plan = select_content_units(req)
                self.assertIsNotNone(plan)
                assert plan is not None
                units = resolve_units_for_plan(plan)
                self.assertEqual(len(units), 1)
                self.assertEqual(units[0].language_code, lang)
                segs = map_content_units_to_segments(units, lang_key=lang)
                self.assertEqual(len(segs), 1)
                spoken = (segs[0].tts_text or "").strip()
                self.assertTrue(spoken)
                self.assertNotIn("View details", spoken)
                if lang == "en":
                    self.assertIn("Principal", spoken)
                    self.assertIn("Manjunath", spoken)
                elif lang == "kn":
                    self.assertIn("ಪ್ರಾಂಶುಪಾಲ", spoken)

    def test_hod_narration_is_a_sentence_not_label_dump(self) -> None:
        for lang in LANGS:
            with self.subTest(lang=lang):
                unit = resolve_unit(unit_id="cse_ds.hod", language=lang, language_code=lang)
                self.assertIsNotNone(unit)
                assert unit is not None
                segs = map_content_units_to_segments((unit,), lang_key=lang)
                spoken = (segs[0].tts_text or "").strip()
                self.assertTrue(spoken)
                self.assertNotIn("View details", spoken)
                self.assertNotIn("Department Head.", spoken)
                self.assertIn("Nagashree", spoken)

    def test_code_switch_hod(self) -> None:
        self.assertEqual(plan_units("CSE Data Science HOD yaaru?", "kn"), ("cse_ds.hod",))


class TestM59ResolveLeadership(unittest.TestCase):
    def test_principal_resolves_in_kannada(self) -> None:
        unit = resolve_unit(unit_id=UNIT_PRINCIPAL, language="Kannada", language_code="kn")
        self.assertIsNotNone(unit)
        assert unit is not None
        self.assertEqual(unit.language_code, "kn")
        self.assertTrue((unit.body or "").strip())


if __name__ == "__main__":
    unittest.main()
