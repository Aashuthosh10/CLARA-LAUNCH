"""M5.3 — Unicode-safe normalization keeps Indic grapheme clusters."""

from __future__ import annotations

import unittest

from backend.services.answer_generation import normalize_user_input, normalize_query_to_english
from backend.services.content.unicode_text import strip_punctuation_keep_graphemes


class TestUnicodeSafeNormalization(unittest.TestCase):
    def test_kannada_fees_word_survives(self) -> None:
        raw = "CSE ಶುಲ್ಕ"
        self.assertIn("ಶುಲ್ಕ", strip_punctuation_keep_graphemes(raw))
        self.assertIn("ಶುಲ್ಕ", normalize_query_to_english(raw))
        self.assertIn("ಶುಲ್ಕ", normalize_user_input(raw))
        self.assertNotIn("ಶ ಲ ಕ", normalize_user_input(raw))

    def test_hindi_fees_word_survives(self) -> None:
        raw = "CSE फीस"
        self.assertIn("फीस", normalize_user_input(raw))
        self.assertNotIn("फ स", normalize_user_input(raw))

    def test_tamil_fees_word_survives(self) -> None:
        raw = "CSE கட்டணம்"
        self.assertIn("கட்டணம்", normalize_user_input(raw))

    def test_telugu_fees_word_survives(self) -> None:
        raw = "CSE ఫీజు"
        self.assertIn("ఫీజు", normalize_user_input(raw))

    def test_malayalam_fees_word_survives(self) -> None:
        raw = "CSE ഫീസ്"
        self.assertIn("ഫീസ്", normalize_user_input(raw))

    def test_latin_romanized_still_normalizes(self) -> None:
        n = normalize_user_input("CSE fees yestu?")
        self.assertIn("cse", n)
        self.assertIn("fees", n)
        self.assertTrue("yestu" in n or "how much" in n)
