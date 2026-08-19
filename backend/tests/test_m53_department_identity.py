"""M5.3 — exclusive longest-span department identity (no substring cse inside cse_ds)."""

from __future__ import annotations

import unittest

from backend.services.content.department_identity import match_department_keys_exclusive
from backend.services.content.department_resolver import resolve_department_key
from backend.services.content.semantic_request_parser import parse_semantic_request
from backend.services.content.unit_selector import select_content_units


class TestExclusiveDepartmentIdentity(unittest.TestCase):
    def test_cse_data_science_is_only_cse_ds(self) -> None:
        self.assertEqual(match_department_keys_exclusive("CSE Data Science"), ("cse_ds",))
        self.assertEqual(
            match_department_keys_exclusive("Who is the HOD of CSE Data Science?"),
            ("cse_ds",),
        )

    def test_cse_aiml_is_only_cse_aiml(self) -> None:
        self.assertEqual(match_department_keys_exclusive("CSE AIML fees"), ("cse_aiml",))

    def test_plain_cse_still_cse(self) -> None:
        self.assertEqual(match_department_keys_exclusive("CSE fees"), ("cse",))
        self.assertEqual(match_department_keys_exclusive("Tell me about CSE"), ("cse",))

    def test_cse_does_not_match_inside_cse_ds_key(self) -> None:
        self.assertEqual(match_department_keys_exclusive("cse_ds"), ("cse_ds",))
        self.assertEqual(match_department_keys_exclusive("cse_aiml"), ("cse_aiml",))

    def test_resolver_does_not_use_user_text_blob(self) -> None:
        res = resolve_department_key(
            department="CSE",
            language="en",
            user_text="Who is the HOD of CSE Data Science?",
        )
        self.assertEqual(res.json_key, "cse")

    def test_parser_hod_ds_entities(self) -> None:
        req = parse_semantic_request(
            raw_text="Who is the HOD of CSE Data Science?",
            language_code_key="en",
        )
        self.assertIsNotNone(req)
        assert req is not None
        self.assertEqual(req.entities, ("cse_ds",))
        plan = select_content_units(req)
        assert plan is not None
        self.assertEqual(plan.units, ("cse_ds.hod",))

    def test_computer_science_and_engineering_label(self) -> None:
        res = resolve_department_key(department="Computer Science & Engineering", language="en")
        self.assertEqual(res.json_key, "cse")

    def test_canonical_json_keys_are_identity(self) -> None:
        for key in ("cse", "cse_ds", "cse_aiml", "ece"):
            res = resolve_department_key(department=key, language="en", user_text="")
            self.assertEqual(res.json_key, key, msg=key)

    def test_cse_ds_does_not_collapse_to_cse(self) -> None:
        res = resolve_department_key(department="cse_ds", language="en", user_text="")
        self.assertEqual(res.json_key, "cse_ds")
        res_blob = resolve_department_key(
            department="cse_ds",
            language="en",
            user_text="Who is the HOD of CSE Data Science?",
        )
        self.assertEqual(res_blob.json_key, "cse_ds")

    def test_cse_aiml_does_not_collapse_to_cse(self) -> None:
        res = resolve_department_key(department="cse_aiml", language="en", user_text="")
        self.assertEqual(res.json_key, "cse_aiml")

    def test_near_match_unresolved(self) -> None:
        res = resolve_department_key(department="CSS", language="en", user_text="")
        self.assertIsNone(res.json_key)

    def test_three_hod_entities_preserve_order(self) -> None:
        req = parse_semantic_request(
            raw_text="Who are the HODs of AIML, Data Science and CSE?",
            language_code_key="en",
        )
        self.assertIsNotNone(req)
        assert req is not None
        self.assertEqual(req.entities, ("cse_aiml", "cse_ds", "cse"))
        plan = select_content_units(req)
        assert plan is not None
        self.assertEqual(plan.units, ("cse_aiml.hod", "cse_ds.hod", "cse.hod"))
