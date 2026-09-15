"""College-wide Placement ContentUnit deck — 4 cards."""

from __future__ import annotations

import unittest

from backend.services.content.content_unit_registry import all_unit_descriptors, get_unit_descriptor
from backend.services.content.content_unit_resolver import resolve_unit
from backend.services.content.placement_units import (
    PLACEMENT_DECK_UNIT_IDS,
    PLACEMENT_UNIT_IDS,
    placement_deck_unit_ids,
)
from backend.services.content.surface_narration_mapper import map_content_units_to_segments
from backend.services.conversation.response_decision import ResponseMode
from backend.tests.test_m59_universal_units import decide, plan_units

PLACEMENT_DECK = placement_deck_unit_ids()


class TestPlacementRegistry(unittest.TestCase):
    def test_four_units_registered(self) -> None:
        ids = {d.unit_id for d in all_unit_descriptors()}
        self.assertEqual(
            set(PLACEMENT_UNIT_IDS),
            {
                "placement.introduction",
                "placement.head",
                "placement.companies",
                "placement.analytics",
            },
        )
        for uid in PLACEMENT_UNIT_IDS:
            self.assertIn(uid, ids)
            self.assertIsNotNone(get_unit_descriptor(uid))


class TestPlacementSelector(unittest.TestCase):
    def test_general_request_expands_to_deck(self) -> None:
        self.assertEqual(plan_units("Tell me about placements."), PLACEMENT_DECK)
        self.assertEqual(plan_units("Tell me about the placement department."), PLACEMENT_DECK)
        self.assertIs(decide("Tell me about placements."), ResponseMode.CARD)

    def test_head_topic(self) -> None:
        self.assertEqual(plan_units("Who is the placement head?"), ("placement.head",))
        self.assertEqual(plan_units("Tell me about Prof. Anand Kumar V"), ("placement.head",))

    def test_companies_topic(self) -> None:
        self.assertEqual(plan_units("Which companies visit our campus?"), ("placement.companies",))
        self.assertEqual(plan_units("Show me placement companies"), ("placement.companies",))

    def test_analytics_topic(self) -> None:
        self.assertEqual(plan_units("Show me placement analytics"), ("placement.analytics",))
        self.assertEqual(plan_units("Show me placement statistics"), ("placement.analytics",))

    def test_department_placements_untouched(self) -> None:
        self.assertEqual(
            plan_units("Show me CSE Data Science fees and placements."),
            ("cse_ds.fees", "cse_ds.placements"),
        )


class TestPlacementNarration(unittest.TestCase):
    def test_tts_mapping_per_card(self) -> None:
        units = []
        for uid in PLACEMENT_DECK_UNIT_IDS:
            unit = resolve_unit(unit_id=uid, language="English", language_code="en")
            self.assertIsNotNone(unit)
            units.append(unit)
        segs = map_content_units_to_segments(tuple(units), lang_key="en")
        self.assertEqual(len(segs), 4)
        self.assertEqual([s.unit_id for s in segs], list(PLACEMENT_DECK_UNIT_IDS))
        tts = [((getattr(s, "tts_text", None) or getattr(s, "display_text", None) or "")).strip() for s in segs]
        self.assertIn("career guidance", tts[0].lower())
        self.assertIn("anand kumar", tts[1].lower())
        self.assertEqual(tts[2], "These are the companies that visit our campus.")
        self.assertEqual(tts[3], "These are the analytics of the past years' placement.")


if __name__ == "__main__":
    unittest.main()
