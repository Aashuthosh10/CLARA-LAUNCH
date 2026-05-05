"""Bus / transport route intent detection."""

import unittest

from backend.services.answer_generation import (
    INTENT_BUS_ROUTES,
    INTENT_DEPARTMENT_COMPARISON,
    extract_features,
    resolve_intent_from_features,
    text_has_bus_routes_cue,
)


class BusRoutesIntentTests(unittest.TestCase):
    def test_english_substrings(self) -> None:
        self.assertTrue(text_has_bus_routes_cue("What are the bus routes?"))
        self.assertTrue(text_has_bus_routes_cue("Is there college bus transport facility?"))
        self.assertTrue(text_has_bus_routes_cue("route availability for pickups"))
        self.assertTrue(text_has_bus_routes_cue("pickup points to SVIT"))
        self.assertTrue(text_has_bus_routes_cue("how can my child travel to college"))
        self.assertTrue(text_has_bus_routes_cue("is there a bus for Hebbal?"))
        self.assertTrue(text_has_bus_routes_cue("Do you have transport from Nagarbavi?"))

    def test_regional_scripts(self) -> None:
        self.assertTrue(text_has_bus_routes_cue("बस रूट कब हैं"))
        self.assertTrue(text_has_bus_routes_cue("ಕಾಲೇಜು ಬಸ್ ಟೈಮಿಂಗ್"))
        self.assertTrue(text_has_bus_routes_cue("பேருந்து வழிகள் எது"))
        self.assertTrue(text_has_bus_routes_cue("బస్ రూట్లు ఉన్నాయా"))
        self.assertTrue(text_has_bus_routes_cue("ബസ് റൂട്ടുകൾ"))

    def test_negative_bare_route(self) -> None:
        self.assertFalse(text_has_bus_routes_cue("shortest route to the lab"))

    def test_resolve_prioritizes_over_comparison_without_bus_cue(self) -> None:
        f = extract_features("compare AIML versus data science", department_hint=None)
        self.assertEqual(resolve_intent_from_features(f), INTENT_DEPARTMENT_COMPARISON)

    def test_resolve_bus_before_department_when_stop_like(self) -> None:
        f = extract_features("college bus routes from majestic", department_hint=None)
        self.assertTrue(f.is_bus_routes_query)
        self.assertEqual(resolve_intent_from_features(f), INTENT_BUS_ROUTES)


if __name__ == "__main__":
    unittest.main()
