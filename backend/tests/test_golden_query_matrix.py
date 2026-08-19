import unittest

from backend.services.answer_generation import (
    INTENT_ADMISSIONS,
    INTENT_COURSE_MENU,
    INTENT_DEPARTMENT_FEES,
    INTENT_DEPARTMENT_OVERVIEW,
    INTENT_DOCUMENTS,
    INTENT_HOD_PROFILE,
    INTENT_NORMAL_QUERY,
    INTENT_PLACEMENTS,
    INTENT_PRINCIPAL_PROFILE,
    card_trigger_hints,
    extract_features,
    get_off_topic_reply,
    maybe_override_intent_with_executive_profile,
    resolve_intent_from_features,
)


class GoldenQueryMatrixTests(unittest.TestCase):
    CASES = [
        ("fees structure", INTENT_ADMISSIONS, None, "admissions"),
        ("cse fees eshtu", INTENT_DEPARTMENT_FEES, "CSE", "department_fees"),
        ("admission ke liye documents chahiye", INTENT_DOCUMENTS, None, "documents"),
        ("ece hod yaaru", INTENT_HOD_PROFILE, "ECE", "hod"),
        ("mechanical", INTENT_DEPARTMENT_OVERVIEW, "Mechanical", "department_overview"),
        ("placement details", INTENT_PLACEMENTS, None, "placements"),
        ("what are the courses", INTENT_COURSE_MENU, None, "course_menu"),
        ("college location", INTENT_NORMAL_QUERY, None, None),
        ("who is the principal", INTENT_PRINCIPAL_PROFILE, None, "principal_profile"),
    ]

    def test_common_receptionist_intents_route_to_expected_cards(self) -> None:
        for text, expected_intent, expected_dept, expected_card in self.CASES:
            with self.subTest(text=text):
                features = extract_features(text)
                intent = maybe_override_intent_with_executive_profile(
                    resolve_intent_from_features(features),
                    text,
                )
                hints = card_trigger_hints(intent, {"department": features.department_name})

                self.assertEqual(intent, expected_intent)
                self.assertEqual(features.department_name, expected_dept)
                self.assertEqual(hints["showCard"], expected_card)

    def test_multilingual_and_transliterated_queries_are_classified(self) -> None:
        cases = [
            ("college admission ge yaav documents beku", INTENT_DOCUMENTS),
            ("ds fees evlo", INTENT_DEPARTMENT_FEES),
            ("courses en ide", INTENT_COURSE_MENU),
            ("ai ml fee entha", INTENT_DEPARTMENT_FEES),
        ]
        for text, expected_intent in cases:
            with self.subTest(text=text):
                features = extract_features(text)
                self.assertEqual(resolve_intent_from_features(features), expected_intent)

    def test_off_topic_reply_is_deterministic_scope_guard(self) -> None:
        reply = get_off_topic_reply("English")
        self.assertTrue(reply.strip())
        self.assertIn("svit", reply.lower())

    def test_off_topic_reply_is_distinct_from_unavailable_reply(self) -> None:
        # M5.4: "I can't help with that" must never be spoken for an institutional
        # question that simply has no fact behind it.
        from backend.services.answer_generation import get_unavailable_reply

        for language in ("English", "Kannada", "Hindi", "Tamil", "Telugu", "Malayalam"):
            with self.subTest(language=language):
                self.assertNotEqual(
                    get_off_topic_reply(language),
                    get_unavailable_reply(language),
                )


if __name__ == "__main__":
    unittest.main()
