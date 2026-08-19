"""M5.3 — ContentUnit HOD body follows session language, not English fallback."""

from __future__ import annotations

import unittest

from backend.services.content.semantic_request_parser import parse_semantic_request
from backend.services.content.unit_selector import resolve_units_for_plan, select_content_units


class TestM53HodLocalization(unittest.TestCase):
    def test_english_ds_hod_body_is_english(self) -> None:
        req = parse_semantic_request(
            raw_text="Who is the HOD of CSE Data Science?",
            language_code_key="en",
        )
        self.assertIsNotNone(req)
        assert req is not None
        plan = select_content_units(req)
        assert plan is not None
        self.assertEqual(plan.units, ("cse_ds.hod",))
        units = resolve_units_for_plan(plan)
        self.assertEqual(len(units), 1)
        self.assertEqual(units[0].unit_id, "cse_ds.hod")
        self.assertEqual(units[0].language_code, "en")
        self.assertIn("Nagashree", units[0].body)

    def test_kannada_ds_hod_body_is_not_english_fallback(self) -> None:
        en = parse_semantic_request(
            raw_text="Who is the HOD of CSE Data Science?",
            language_code_key="en",
        )
        kn = parse_semantic_request(
            raw_text="CSE Data Science HOD yaaru?",
            language_code_key="kn",
        )
        assert en is not None and kn is not None
        en_units = resolve_units_for_plan(select_content_units(en))  # type: ignore[arg-type]
        kn_units = resolve_units_for_plan(select_content_units(kn))  # type: ignore[arg-type]
        self.assertEqual(en_units[0].unit_id, kn_units[0].unit_id)
        self.assertEqual(kn_units[0].language_code, "kn")
        self.assertNotEqual(kn_units[0].body.strip(), en_units[0].body.strip())
        self.assertTrue(any("\u0c80" <= ch <= "\u0cff" for ch in kn_units[0].body))

    def test_three_hod_units_keep_distinct_ids_same_section(self) -> None:
        req = parse_semantic_request(
            raw_text="Who are the HODs of AIML, Data Science and CSE?",
            language_code_key="en",
        )
        assert req is not None
        plan = select_content_units(req)
        assert plan is not None
        units = resolve_units_for_plan(plan)
        self.assertEqual(
            [u.unit_id for u in units],
            ["cse_aiml.hod", "cse_ds.hod", "cse.hod"],
        )
        self.assertEqual({u.section_id for u in units}, {"hod_voice"})
        self.assertEqual(len({u.entity_id for u in units}), 3)
