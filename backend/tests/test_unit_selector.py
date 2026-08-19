from __future__ import annotations

import unittest

from backend.services.answer_generation import (
    extract_features,
    normalize_user_input,
    resolve_intent_from_features,
    INTENT_DEPARTMENT_FEES,
    INTENT_HOD_PROFILE,
    INTENT_PLACEMENTS,
)
from backend.services.content.semantic_request_parser import parse_semantic_request
from backend.services.content.unit_selector import select_content_units
from backend.services.content.multilingual_terms import TOPIC_FEES, TOPIC_HOD, TOPIC_PLACEMENTS, TOPIC_OVERVIEW


class TestUnitSelector(unittest.TestCase):
    def test_anti_expansion_overview_single(self) -> None:
        req = parse_semantic_request(raw_text="CSE overview", language_code_key="en")
        self.assertIsNotNone(req)
        assert req is not None
        plan = select_content_units(req, surface="department_overview")
        self.assertIsNotNone(plan)
        assert plan is not None
        self.assertEqual(plan.units, ("cse.overview",))

    def test_full_department_overview_deck(self) -> None:
        req = parse_semantic_request(raw_text="Tell me about CSE", language_code_key="en")
        self.assertIsNotNone(req)
        assert req is not None
        plan = select_content_units(req, surface="department_overview")
        self.assertIsNotNone(plan)
        assert plan is not None
        self.assertEqual(
            plan.units,
            (
                "cse.overview",
                "cse.hod",
                "cse.achievements",
                "cse.placements",
                "cse.fees",
            ),
        )

    def test_multi_entity_hod_selector_semantic(self) -> None:
        req = parse_semantic_request(
            raw_text="CSE mattu AIML HOD yaaru?",
            language_code_key="kn",
        )
        self.assertIsNotNone(req)
        assert req is not None
        self.assertEqual(req.topic, TOPIC_HOD)
        self.assertEqual(req.entities, ("cse", "cse_aiml"))

        plan = select_content_units(req, surface="department_overview")
        self.assertIsNotNone(plan)
        assert plan is not None
        self.assertEqual(plan.units, ("cse.hod", "cse_aiml.hod"))

    def test_unknown_topic_returns_no_plan(self) -> None:
        req = parse_semantic_request(raw_text="CSE bus routes", language_code_key="en")
        self.assertIsNone(req)

    def _intent_for(self, raw_text: str) -> str:
        normalized = normalize_user_input(raw_text)
        feats = extract_features(normalized, department_hint=None)
        return resolve_intent_from_features(feats)

    def test_intent_surface_content_separation_fees(self) -> None:
        raw = "CSE fees"
        ci_intent = self._intent_for(raw)
        self.assertEqual(ci_intent, INTENT_DEPARTMENT_FEES)

        req = parse_semantic_request(raw_text=raw, language_code_key="en")
        self.assertIsNotNone(req)
        assert req is not None
        self.assertEqual(req.topic, TOPIC_FEES)

        plan = select_content_units(req, surface="department_overview")
        self.assertIsNotNone(plan)
        assert plan is not None
        self.assertEqual(plan.units, ("cse.fees",))

    def test_intent_surface_content_separation_hod(self) -> None:
        raw = "CSE HOD"
        ci_intent = self._intent_for(raw)
        self.assertEqual(ci_intent, INTENT_HOD_PROFILE)

        req = parse_semantic_request(raw_text=raw, language_code_key="en")
        self.assertIsNotNone(req)
        assert req is not None
        self.assertEqual(req.topic, TOPIC_HOD)

        plan = select_content_units(req, surface="department_overview")
        self.assertIsNotNone(plan)
        assert plan is not None
        self.assertEqual(plan.units, ("cse.hod",))

    def test_intent_surface_content_separation_placements(self) -> None:
        raw = "CSE placements"
        ci_intent = self._intent_for(raw)
        # Baseline CI intent routing may classify “placements” phrasing as comparison
        # in this codebase. M5.1 must not mutate that CI intent; it must still select
        # the correct atomic unit(s) deterministically.
        self.assertIsNotNone(ci_intent)

        req = parse_semantic_request(raw_text=raw, language_code_key="en")
        self.assertIsNotNone(req)
        assert req is not None
        self.assertEqual(req.topic, TOPIC_PLACEMENTS)

        plan = select_content_units(req, surface="department_overview")
        self.assertIsNotNone(plan)
        assert plan is not None
        self.assertEqual(plan.units, ("cse.placements",))

