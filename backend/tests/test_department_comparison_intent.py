"""Unit tests for multilingual department comparison routing."""

import unittest

from backend.services.answer_generation import (
    INTENT_DEPARTMENT_COMPARISON,
    INTENT_DEPARTMENT_OVERVIEW,
    INTENT_DOCUMENTS,
    INTENT_HOD_PROFILE,
    extract_comparison_department_canonical_labels,
    extract_features,
    is_documents_query,
    resolve_intent_from_features,
    text_has_department_comparison_cue,
)


class DepartmentComparisonIntentTests(unittest.TestCase):
    def test_comparison_two_depts_wins_over_single_overview(self):
        f = extract_features("compare AIML and data science", department_hint=None)
        self.assertTrue(f.is_comparison_query)
        self.assertGreaterEqual(len(f.comparison_department_names), 2)
        self.assertEqual(resolve_intent_from_features(f), INTENT_DEPARTMENT_COMPARISON)

    def test_hod_beats_comparison(self):
        f = extract_features("who is hod of cse and compare with ise hod", department_hint=None)
        self.assertTrue(f.is_hod_query)
        self.assertEqual(resolve_intent_from_features(f), INTENT_HOD_PROFILE)

    def test_documents_beats_comparison(self):
        text = "Admission documents compare list for cse"
        self.assertTrue(is_documents_query(text))
        f = extract_features(text, department_hint=None)
        self.assertEqual(resolve_intent_from_features(f), INTENT_DOCUMENTS)

    def test_placement_contrast_is_comparison(self):
        f = extract_features(
            "which has better placements aiml vs data science",
            department_hint=None,
        )
        self.assertEqual(resolve_intent_from_features(f), INTENT_DEPARTMENT_COMPARISON)

    def test_recommend_child_triggers_comparison(self):
        f = extract_features(
            "which course is best for my child future",
            department_hint=None,
        )
        self.assertTrue(f.is_comparison_recommendation)
        self.assertEqual(resolve_intent_from_features(f), INTENT_DEPARTMENT_COMPARISON)

    def test_extract_comparison_ordered_unique(self):
        labels = extract_comparison_department_canonical_labels("difference between ise and ece placements")
        self.assertIn("ISE", labels)
        self.assertIn("ECE", labels)
        self.assertEqual(len(labels), len(set(labels)))

    def test_single_department_fact_is_overview_not_comparison(self):
        f = extract_features("tell me about ise at svit briefly", department_hint=None)
        self.assertFalse(f.is_comparison_query)
        self.assertEqual(resolve_intent_from_features(f), INTENT_DEPARTMENT_OVERVIEW)

    def test_typo_difference_still_comparison(self):
        f = extract_features(
            "give me the differnce between data science and cse",
            department_hint=None,
        )
        self.assertEqual(resolve_intent_from_features(f), INTENT_DEPARTMENT_COMPARISON)

    def test_comparison_cue_helper_recognizes_typos(self):
        self.assertTrue(text_has_department_comparison_cue("differnce between data science & cse"))


if __name__ == "__main__":
    unittest.main()
