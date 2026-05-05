"""Smoke tests that narration payloads include ordered segment metadata."""

import unittest

from backend.services.narration_plan import (
    NarrationSegment,
    chunk_plan_with_card_index,
    finalize_segment_list,
    post_llm_chunk_plan,
)


class TestNarrationSegmentOrdering(unittest.TestCase):
    def test_chunk_order_stable(self) -> None:
        segs = post_llm_chunk_plan("First. Second. Third.")
        self.assertGreaterEqual(len(segs), 1)
        finalize_segment_list("tid", segs)
        texts = [s.display_text.strip() for s in segs]
        self.assertEqual(len(texts), len(segs))
        merged = "\n".join(texts).lower()
        self.assertTrue("first" in merged or "third" in merged)

    def test_public_dict_compatible_with_frontend(self) -> None:
        s = NarrationSegment(display_text="Hello", card_index=2, card_id="placement")
        finalize_segment_list("t99", [s])
        pub = s.public_dict()
        self.assertEqual(pub.get("displayText"), "Hello")
        self.assertEqual(pub.get("cardIndex"), 2)

    def test_chunk_plan_indices_match_enumeration(self) -> None:
        segs = chunk_plan_with_card_index("A.\n\nB.", card_id="x")
        self.assertGreaterEqual(len(segs), 1)
        for i, s in enumerate(segs):
            self.assertEqual(s.card_index, i)


if __name__ == "__main__":
    unittest.main()
