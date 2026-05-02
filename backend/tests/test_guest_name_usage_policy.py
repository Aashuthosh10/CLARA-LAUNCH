"""Tests for guest name token detection and system-prompt policy clause."""

from __future__ import annotations

import unittest

from backend.app.main import _append_guest_name_system_clause
from backend.app.session_state import assistant_last_reply_used_guest_name, text_contains_guest_name_token


class TextContainsGuestNameTokenTest(unittest.TestCase):
    def test_single_word_whole_match(self) -> None:
        self.assertTrue(text_contains_guest_name_token("Hello Alex, welcome.", "Alex"))
        self.assertFalse(text_contains_guest_name_token("Hello Alexa, welcome.", "Alex"))

    def test_substring_not_whole_word(self) -> None:
        self.assertFalse(text_contains_guest_name_token("We are planning admissions.", "Ann"))

    def test_multi_word_phrase(self) -> None:
        self.assertTrue(text_contains_guest_name_token("Nice to meet you, Mary Jane.", "Mary Jane"))
        self.assertFalse(text_contains_guest_name_token("Mary had a little lamb.", "Mary Jane"))

    def test_short_name_returns_false(self) -> None:
        self.assertFalse(text_contains_guest_name_token("Hi Jo.", "Jo"))
        self.assertFalse(text_contains_guest_name_token("Hi Jo.", ""))

    def test_non_ascii_single_token_uses_casefold(self) -> None:
        self.assertTrue(text_contains_guest_name_token("ನಮಸ್ಕಾರ ಪ್ರಿಯಾ", "ಪ್ರಿಯಾ"))


class AssistantLastReplyUsedGuestNameTest(unittest.TestCase):
    def test_last_assistant_checked_not_user(self) -> None:
        session = {
            "history": [
                {"role": "user", "text": "Hi"},
                {"role": "assistant", "text": "Hello Priya."},
            ]
        }
        self.assertTrue(assistant_last_reply_used_guest_name(session, "Priya"))

    def test_skips_to_latest_assistant(self) -> None:
        session = {
            "history": [
                {"role": "user", "text": "fees?"},
                {"role": "assistant", "text": "The fee is fifty thousand."},
                {"role": "user", "text": "thanks"},
                {"role": "assistant", "text": "Any time, Sam."},
            ]
        }
        self.assertTrue(assistant_last_reply_used_guest_name(session, "Sam"))
        self.assertFalse(assistant_last_reply_used_guest_name(session, "Priya"))

    def test_no_assistant_returns_false(self) -> None:
        session = {"history": [{"role": "user", "text": "hello"}]}
        self.assertFalse(assistant_last_reply_used_guest_name(session, "Alex"))


class AppendGuestNameSystemClauseTest(unittest.TestCase):
    def test_no_guest_name_unchanged(self) -> None:
        sp = "You are CLARA."
        self.assertEqual(_append_guest_name_system_clause(sp, {}), sp)
        self.assertEqual(_append_guest_name_system_clause(sp, {"guest_name": ""}), sp)

    def test_policy_phrases_present(self) -> None:
        out = _append_guest_name_system_clause("BASE", {"guest_name": "Jamie"})
        self.assertIn("BASE", out)
        self.assertIn("Jamie", out)
        self.assertIn("Default: omit their name", out)
        self.assertIn("genuinely substantial", out)
        self.assertIn("Stay grounded strictly", out)

    def test_suppression_when_last_reply_used_name(self) -> None:
        session = {
            "guest_name": "Alex",
            "history": [
                {"role": "user", "text": "Hi"},
                {"role": "assistant", "text": "Hello Alex, how can I help?"},
            ],
        }
        out = _append_guest_name_system_clause("BASE", session)
        self.assertIn("Your previous reply already used their name", out)


if __name__ == "__main__":
    unittest.main()
