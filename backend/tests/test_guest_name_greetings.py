"""Tests for guest name prompts and normalization."""

from __future__ import annotations

import unittest

from backend.services import greetings


class GuestNameHelpersTest(unittest.TestCase):
    def test_guest_name_reply_is_skip(self) -> None:
        self.assertTrue(greetings.guest_name_reply_is_skip("skip"))
        self.assertTrue(greetings.guest_name_reply_is_skip("  NO  "))
        self.assertFalse(greetings.guest_name_reply_is_skip("Alex"))

    def test_normalize_guest_name_strip_prefix(self) -> None:
        self.assertEqual(greetings.normalize_guest_name("My name is Alex"), "Alex")
        self.assertEqual(greetings.normalize_guest_name("I'm Priya "), "Priya")
        self.assertEqual(greetings.normalize_guest_name("call me Sam"), "Sam")

    def test_normalize_guest_name_skip_returns_none(self) -> None:
        self.assertIsNone(greetings.normalize_guest_name("skip"))
        self.assertIsNone(greetings.normalize_guest_name("rather not"))

    def test_normalize_guest_name_rejects_no_letters(self) -> None:
        self.assertIsNone(greetings.normalize_guest_name("12345"))

    def test_get_name_prompt_has_all_languages(self) -> None:
        for lang in greetings.SUPPORTED_LANGUAGES:
            s = greetings.get_name_prompt(lang)
            self.assertTrue(s.strip())

    def test_get_ready_prompt_backward_compat(self) -> None:
        en = greetings.get_ready_prompt("English")
        self.assertIn("Wonderful", en)
        self.assertNotIn("{name}", en)

    def test_get_ready_prompt_with_preferred_name(self) -> None:
        s = greetings.get_ready_prompt("English", "Jamie")
        self.assertIn("Jamie", s)
        self.assertNotIn("{name}", s)


if __name__ == "__main__":
    unittest.main()
