"""Runtime integrity + Presentation Contract tests (Milestone 2)."""

from __future__ import annotations

import unittest

from backend.services.narration_plan import NarrationSegment, finalize_segment_list
from backend.services.runtime.ownership import validate_callback_token
from backend.services.runtime.presentation_contract import validate_presentation_contract
from backend.services.runtime.presentation_integrity import validate_before_narration_plan
from backend.services.runtime.translation_cache import get_cached_translation, put_cached_translation


class OwnershipTests(unittest.TestCase):
    def test_match(self):
        self.assertTrue(
            validate_callback_token(
                expected_generation=3,
                actual_generation=3,
                expected_turn_id="t1",
                actual_turn_id="t1",
            )
        )

    def test_mismatch(self):
        self.assertFalse(
            validate_callback_token(
                expected_generation=3,
                actual_generation=4,
            )
        )


class PresentationContractTests(unittest.TestCase):
    def test_valid_segments(self):
        segs = [
            NarrationSegment(display_text="A intro", card_index=0, card_id="dept_slide"),
            NarrationSegment(display_text="B intro", card_index=1, card_id="dept_slide"),
        ]
        finalize_segment_list("turn-1", segs)
        result = validate_presentation_contract(segs, expected_card_count=2, language_verified=True)
        self.assertTrue(result.ok, msg=result.failures)

    def test_empty_fails(self):
        result = validate_presentation_contract([], language_verified=True)
        self.assertFalse(result.ok)
        self.assertEqual(result.primary_reason, "empty_segments")

    def test_missing_caption_fails(self):
        segs = [NarrationSegment(display_text="", card_index=0, card_id="x")]
        finalize_segment_list("t", segs)
        # finalize copies display into tts via normalize — empty stays empty
        result = validate_presentation_contract(segs, language_verified=True)
        self.assertFalse(result.ok)

    def test_index_gap_fails(self):
        segs = [
            NarrationSegment(display_text="A", card_index=0, card_id="a"),
            NarrationSegment(display_text="B", card_index=2, card_id="b"),
        ]
        finalize_segment_list("t", segs)
        # finalize does not rewrite card_index if set
        result = validate_presentation_contract(segs, expected_card_count=2, language_verified=True)
        self.assertFalse(result.ok)


class IntegrityWithSessionTests(unittest.TestCase):
    def test_locale_and_contract_ok(self):
        session = {
            "session_generation": 1,
            "language_code_key": "en",
            "language_name": "English",
            "language_code": "en-IN",
        }
        segs = [
            NarrationSegment(display_text="Hello campus", card_index=0, card_id="college"),
        ]
        finalize_segment_list("turn-x", segs)
        result = validate_before_narration_plan(
            session,
            segs,
            plan_lang_key="en",
            tts_lang_code="en-IN",
            expected_card_count=1,
            turn_id="turn-x",
        )
        self.assertTrue(result.ok, msg=result.failures)

    def test_locale_mismatch_fails(self):
        session = {
            "session_generation": 1,
            "language_code_key": "kn",
            "language_name": "Kannada",
            "language_code": "kn-IN",
        }
        segs = [
            NarrationSegment(display_text="Hello", card_index=0, card_id="college"),
        ]
        finalize_segment_list("turn-y", segs)
        result = validate_before_narration_plan(
            session,
            segs,
            plan_lang_key="en",
            tts_lang_code="en-IN",
            expected_card_count=1,
            turn_id="turn-y",
        )
        self.assertFalse(result.ok)


class TranslationCacheTests(unittest.TestCase):
    def test_put_get(self):
        put_cached_translation("Kannada", "Hello world", "Namaskara")
        self.assertEqual(get_cached_translation("Kannada", "Hello world"), "Namaskara")


if __name__ == "__main__":
    unittest.main()
