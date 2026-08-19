"""M5.0 — PresentationPlan fixture and composition invariant tests."""

from __future__ import annotations

import unittest

from backend.services.presentation.presentation_plan_builder import (
    build_plan_from_fixture,
    build_full_department_plan,
    full_department_unit_ids,
)


class TestPresentationPlanFixtures(unittest.TestCase):
    def _plan_units(self, query: str) -> list[str]:
        plan = build_plan_from_fixture(
            query,
            turn_id="t-fix",
            language="English",
            language_code="en",
        )
        self.assertIsNotNone(plan, msg=f"No plan for: {query!r}")
        assert plan is not None
        return list(plan.units)

    def test_tell_me_about_cse_full_deck(self) -> None:
        units = self._plan_units("Tell me about CSE")
        self.assertEqual(
            units,
            [
                "cse.overview",
                "cse.hod",
                "cse.achievements",
                "cse.placements",
                "cse.fees",
            ],
        )

    def test_cse_fees_single_unit(self) -> None:
        units = self._plan_units("CSE fees")
        self.assertEqual(units, ["cse.fees"])

    def test_cse_fees_no_expansion(self) -> None:
        units = self._plan_units("Tell me CSE fees")
        self.assertEqual(units, ["cse.fees"])
        self.assertNotEqual(len(units), 5)

    def test_hod_of_cse_single_unit(self) -> None:
        units = self._plan_units("Who is the HOD of CSE?")
        self.assertEqual(units, ["cse.hod"])

    def test_multi_hod_cse_and_aiml(self) -> None:
        units = self._plan_units("Who are the HODs of CSE and AIML?")
        self.assertEqual(units, ["cse.hod", "cse_aiml.hod"])

    def test_show_me_fees_global(self) -> None:
        units = self._plan_units("show me fees")
        self.assertEqual(units, ["fees.overview"])

    def test_all_departments_fees(self) -> None:
        units = self._plan_units("Show me fees for all departments")
        self.assertEqual(units, ["fees.overview"])

    def test_admission_documents_required(self) -> None:
        units = self._plan_units("what documents are required for admission")
        self.assertEqual(units, ["admission.documents_required"])

    def test_fees_overview_not_cse_fees(self) -> None:
        global_units = self._plan_units("show me fees")
        dept_units = self._plan_units("CSE fees")
        self.assertEqual(global_units, ["fees.overview"])
        self.assertEqual(dept_units, ["cse.fees"])
        self.assertNotEqual(global_units, dept_units)

    def test_documents_contexts_differ(self) -> None:
        adm = self._plan_units("what documents are required for admission")
        self.assertEqual(adm, ["admission.documents_required"])
        self.assertNotIn("documents.overview", adm)

    def test_full_department_plan_matches_registry(self) -> None:
        plan = build_full_department_plan(
            dept_key="cse",
            turn_id="t-full",
            language="English",
            language_code="en",
        )
        self.assertEqual(list(plan.units), list(full_department_unit_ids("cse")))
        self.assertEqual(len(plan.units), 5)


if __name__ == "__main__":
    unittest.main()
