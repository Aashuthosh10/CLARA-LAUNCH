"""M5.10 Phase 2C — independently selectable hostel, canteen, and event units."""

from __future__ import annotations

import unittest

from backend.services.content.campus_units import (
    CAMPUS_UNIT_IDS,
    HOSTEL_UNIT_IDS,
    SAMPLE_STATUS,
    hostel_deck_unit_ids,
)
from backend.services.content.content_unit_registry import all_unit_descriptors, get_unit_descriptor
from backend.services.content.content_unit_resolver import resolve_unit
from backend.services.content.surface_narration_mapper import map_content_units_to_segments
from backend.services.content.unit_selector import resolve_units_for_plan, select_content_units
from backend.services.content.semantic_request_parser import parse_semantic_request
from backend.services.conversation.response_decision import ResponseMode
from backend.tests.test_m59_universal_units import decide, plan_units

LANGS = ("en", "kn", "hi", "ta", "te", "ml")
GIRLS_DECK = hostel_deck_unit_ids("girls")
BOYS_DECK = hostel_deck_unit_ids("boys")


class TestPhase2CRegistry(unittest.TestCase):
    def test_every_new_unit_is_registered(self) -> None:
        ids = {d.unit_id for d in all_unit_descriptors()}
        for uid in CAMPUS_UNIT_IDS:
            with self.subTest(uid=uid):
                self.assertIn(uid, ids)
                self.assertIsNotNone(get_unit_descriptor(uid))
        self.assertEqual(
            set(HOSTEL_UNIT_IDS),
            {
                "hostel.boys.overview",
                "hostel.girls.overview",
                "hostel.facilities",
                "hostel.mess",
                "hostel.safety",
            },
        )
        self.assertNotIn("hostel.girls.rooms", ids)
        self.assertNotIn("hostel.girls.food", ids)
        self.assertNotIn("hostel.girls", ids)
        self.assertNotIn("canteen", ids)
        self.assertNotIn("events", ids)

    def test_existing_department_and_leadership_untouched(self) -> None:
        ids = {d.unit_id for d in all_unit_descriptors()}
        self.assertIn("cse_ds.hod", ids)
        self.assertIn("leadership.principal", ids)
        self.assertIn("leadership.trustees", ids)


class TestPhase2CSelector(unittest.TestCase):
    def test_girls_rooms_maps_to_overview_only(self) -> None:
        self.assertEqual(plan_units("Tell me about the girls hostel rooms"), ("hostel.girls.overview",))
        self.assertIs(decide("Tell me about the girls hostel rooms"), ResponseMode.CARD)

    def test_girls_overview_expands_to_deck(self) -> None:
        self.assertEqual(plan_units("Tell me about the girls hostel"), GIRLS_DECK)
        self.assertEqual(plan_units("Tell me about the boys hostel"), BOYS_DECK)

    def test_girls_food_and_timings_collapse_to_mess(self) -> None:
        self.assertEqual(
            plan_units("How is the food in the girls hostel and what are the timings?"),
            ("hostel.mess",),
        )

    def test_girls_food_and_canteen_hygiene(self) -> None:
        self.assertEqual(
            plan_units("How is the food in the girls hostel and canteen hygiene?"),
            ("hostel.mess", "canteen.hygiene"),
        )

    def test_canteen_and_event(self) -> None:
        self.assertEqual(
            plan_units("Tell me about the canteen and TechVidya"),
            ("canteen.overview", "events.techvidya"),
        )

    def test_three_unrelated_units(self) -> None:
        self.assertEqual(
            plan_units("Tell me about girls hostel safety, canteen hygiene and TechVidya"),
            ("hostel.safety", "canteen.hygiene", "events.techvidya"),
        )

    def test_mixed_campus_units(self) -> None:
        self.assertEqual(
            plan_units(
                "Tell me about girls hostel rooms, canteen hygiene, Sanchalana and TechVidya"
            ),
            (
                "hostel.girls.overview",
                "canteen.hygiene",
                "events.sanchalana",
                "events.techvidya",
            ),
        )

    def test_events_independent(self) -> None:
        self.assertEqual(
            plan_units("Tell me about Sanchalana and TechVidya"),
            ("events.sanchalana", "events.techvidya"),
        )

    def test_latin_event_name_with_indic_case_ending(self) -> None:
        self.assertEqual(
            plan_units("TechVidyaയെ കുറിച്ച് പറയൂ", "ml"),
            ("events.techvidya",),
        )

    def test_no_hidden_cap(self) -> None:
        units = plan_units(
            "Tell me about girls hostel safety, canteen hygiene, "
            "Sanchalana, TechVidya and CSE overview"
        )
        self.assertIsNotNone(units)
        assert units is not None
        self.assertEqual(len(units), 5)
        self.assertEqual(
            units,
            (
                "hostel.safety",
                "canteen.hygiene",
                "events.sanchalana",
                "events.techvidya",
                "cse.overview",
            ),
        )

    def test_bare_hostel_does_not_guess_gender(self) -> None:
        self.assertIsNone(plan_units("Tell me about the hostel rooms"))
        self.assertIs(decide("Tell me about the hostel"), ResponseMode.CLARIFY)
        self.assertIs(decide("Tell me about the hostel rooms"), ResponseMode.CLARIFY)

    def test_warden_with_gender_is_overview(self) -> None:
        self.assertEqual(
            plan_units("Who is the warden of the girls hostel?"),
            ("hostel.girls.overview",),
        )

    def test_department_hod_still_works(self) -> None:
        self.assertEqual(
            plan_units("Who is the HOD of CSE Data Science?"),
            ("cse_ds.hod",),
        )


class TestPhase2CLanguages(unittest.TestCase):
    CASES = (
        ("Tell me about the girls hostel rooms", "en", ("hostel.girls.overview",)),
        ("ಹುಡುಗಿಯರ ಹಾಸ್ಟೆಲ್ ಕೊಠಡಿ", "kn", ("hostel.girls.overview",)),
        ("लड़कियों के हॉस्टल के कमरे कैसे हैं?", "hi", ("hostel.girls.overview",)),
        ("பெண்கள் விடுதி அறைகள் எப்படி இருக்கின்றன?", "ta", ("hostel.girls.overview",)),
        ("బాలికల హాస్టల్ గదులు", "te", ("hostel.girls.overview",)),
        ("പെൺകുട്ടികളുടെ ഹോസ്റ്റൽ മുറികൾ", "ml", ("hostel.girls.overview",)),
        ("Girls hostel rooms hegive?", "en", ("hostel.girls.overview",)),
    )

    def test_regional_queries_same_unit_ids(self) -> None:
        for raw, lang, expected in self.CASES:
            with self.subTest(lang=lang, raw=raw):
                self.assertEqual(plan_units(raw, lang), expected)


class TestPhase2CLocalizationAndNarration(unittest.TestCase):
    def test_hostel_units_are_official(self) -> None:
        for lang in LANGS:
            for uid in HOSTEL_UNIT_IDS:
                with self.subTest(lang=lang, uid=uid):
                    unit = resolve_unit(unit_id=uid, language=lang, language_code=lang)
                    self.assertIsNotNone(unit)
                    assert unit is not None
                    self.assertEqual(unit.language_code, lang)
                    self.assertNotIn(SAMPLE_STATUS, unit.body)
                    self.assertTrue(unit.title)
                    self.assertTrue((unit.metadata or {}).get("tts_summary"))
                    self.assertNotIn(
                        SAMPLE_STATUS,
                        str((unit.metadata or {}).get("tts_summary") or ""),
                    )

    def test_canteen_and_event_samples_are_blocked_from_production_copy(self) -> None:
        from backend.services.content.campus_units import HOSTEL_UNIT_IDS, NCC_UNIT_IDS

        sample_ids = [
            uid
            for uid in CAMPUS_UNIT_IDS
            if uid not in HOSTEL_UNIT_IDS and uid not in NCC_UNIT_IDS
        ]
        for lang in LANGS:
            for uid in sample_ids:
                with self.subTest(lang=lang, uid=uid):
                    unit = resolve_unit(unit_id=uid, language=lang, language_code=lang)
                    self.assertIsNotNone(unit)
                    assert unit is not None
                    self.assertEqual(unit.language_code, lang)
                    self.assertNotIn(SAMPLE_STATUS, unit.body)
                    if lang == "kn":
                        self.assertIn("ಅಧಿಕೃತವಾಗಿ ದೃಢೀಕರಿಸಲಾಗಿಲ್ಲ", unit.body)
                    elif lang == "hi":
                        self.assertIn("आधिकारिक पुष्टि", unit.body)
                    self.assertTrue((unit.metadata or {}).get("tts_summary"))
                    self.assertNotIn(
                        SAMPLE_STATUS,
                        str((unit.metadata or {}).get("tts_summary") or ""),
                    )

    def test_safe_narration_preserves_the_selected_unit_identity(self) -> None:
        overview = resolve_unit(unit_id="hostel.girls.overview", language="en", language_code="en")
        mess = resolve_unit(unit_id="hostel.mess", language="en", language_code="en")
        assert overview is not None and mess is not None
        overview_seg = map_content_units_to_segments((overview,), lang_key="en")[0]
        mess_seg = map_content_units_to_segments((mess,), lang_key="en")[0]
        self.assertEqual(overview_seg.unit_id, "hostel.girls.overview")
        self.assertEqual(mess_seg.unit_id, "hostel.mess")
        self.assertNotIn(SAMPLE_STATUS, overview_seg.tts_text or "")
        self.assertNotIn(SAMPLE_STATUS, mess_seg.tts_text or "")
        self.assertNotIn("Showing", overview_seg.tts_text or "")

    def test_no_silent_fallback_to_another_unit(self) -> None:
        kn = resolve_unit(unit_id="hostel.girls.overview", language="kn", language_code="kn")
        en = resolve_unit(unit_id="hostel.girls.overview", language="en", language_code="en")
        assert kn is not None and en is not None
        self.assertNotEqual(kn.body, en.body)
        boys = resolve_unit(unit_id="hostel.boys.overview", language="en", language_code="en")
        girls = resolve_unit(unit_id="hostel.girls.overview", language="en", language_code="en")
        assert boys is not None and girls is not None
        self.assertNotEqual(boys.title, girls.title)

    def test_switching_n_units_keeps_unit_identity(self) -> None:
        req = parse_semantic_request(
            raw_text="Tell me about girls hostel safety, canteen hygiene and TechVidya",
            language_code_key="kn",
        )
        self.assertIsNotNone(req)
        plan = select_content_units(req)
        self.assertIsNotNone(plan)
        assert plan is not None
        self.assertEqual(
            tuple(plan.units),
            ("hostel.safety", "canteen.hygiene", "events.techvidya"),
        )
        self.assertEqual(plan.language_code, "kn")
        units = resolve_units_for_plan(plan)
        self.assertEqual(len(units), 3)
        self.assertEqual([u.unit_id for u in units], list(plan.units))
        self.assertTrue(all(u.language_code == "kn" for u in units))
        segs = map_content_units_to_segments(units, lang_key="kn")
        self.assertEqual([s.unit_id for s in segs], list(plan.units))
        # Shared hostel.safety is official; canteen/event still narrate status copy.
        self.assertTrue(all(SAMPLE_STATUS not in (s.tts_text or "") for s in segs))
        hostel_seg = next(s for s in segs if s.unit_id == "hostel.safety")
        canteen_seg = next(s for s in segs if s.unit_id == "canteen.hygiene")
        self.assertNotIn("ಅಧಿಕೃತವಾಗಿ ದೃಢೀಕರಿಸಲಾಗಿಲ್ಲ", hostel_seg.tts_text or "")
        self.assertIn("ಅಧಿಕೃತವಾಗಿ ದೃಢೀಕರಿಸಲಾಗಿಲ್ಲ", canteen_seg.tts_text or "")


class TestPhase2CDecision(unittest.TestCase):
    def test_canteen_is_a_card(self) -> None:
        self.assertEqual(plan_units("How is the canteen?"), ("canteen.overview",))
        self.assertIs(decide("How is the canteen?"), ResponseMode.CARD)

    def test_campus_without_canteen_is_still_answer(self) -> None:
        self.assertIsNone(plan_units("Tell me about the campus."))
        self.assertIs(decide("Tell me about the campus."), ResponseMode.ANSWER)


if __name__ == "__main__":
    unittest.main()
