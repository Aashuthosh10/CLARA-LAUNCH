from __future__ import annotations

import unittest

from backend.services.content.multilingual_terms import TOPIC_OVERVIEW
from backend.services.content.semantic_request_parser import parse_semantic_request
from backend.services.content.unit_selector import resolve_units_for_plan, select_content_units


class TestMultilingualUnitSelection(unittest.TestCase):
    def test_language_independent_unit_ids_for_overview_full(self) -> None:
        # “Tell me about CSE” in several languages should select identical unit_ids/section_ids.
        cases: tuple[tuple[str, str], ...] = (
            ("Tell me about CSE", "en"),
            ("CSE bagge helu", "kn"),
            ("CSE ke baare mein batao", "hi"),
            ("CSE pattri tilisi", "ta"),
            ("CSE gurunchi kurichu cheppu", "te"),
            ("CSE parayoo", "ml"),
        )

        expected_units = (
            "cse.overview",
            "cse.hod",
            "cse.achievements",
            "cse.placements",
            "cse.fees",
        )
        expected_section_ids = ("intro", "hod_voice", "achievements", "placement", "fees")

        for raw_text, lang_code_key in cases:
            req = parse_semantic_request(raw_text=raw_text, language_code_key=lang_code_key)
            self.assertIsNotNone(req, msg=f"semantic request missing for {lang_code_key}")
            assert req is not None
            self.assertEqual(req.topic, TOPIC_OVERVIEW)

            plan = select_content_units(req, surface="department_overview")
            self.assertIsNotNone(plan, msg=f"plan missing for {lang_code_key}")
            assert plan is not None
            self.assertEqual(plan.units, expected_units)

            units = resolve_units_for_plan(plan)
            self.assertEqual([u.section_id for u in units], list(expected_section_ids))

