"""Closing-reply classifier + greetings closing prompts."""

from __future__ import annotations

import unittest

from backend.services.conversation.closing_reply import classify_closing_reply, strip_leading_continue
from backend.services.greetings import get_closing_prompt, get_continue_listening_prompt


class ClosingReplyTests(unittest.TestCase):
    def test_close_cues(self) -> None:
        self.assertEqual(classify_closing_reply("No thanks"), "CLOSE")
        self.assertEqual(classify_closing_reply("that's all"), "CLOSE")
        self.assertEqual(classify_closing_reply("ಇಲ್ಲ"), "CLOSE")

    def test_continue_cues(self) -> None:
        self.assertEqual(classify_closing_reply("Yes"), "CONTINUE")
        self.assertEqual(classify_closing_reply("yeah"), "CONTINUE")

    def test_residual_request(self) -> None:
        self.assertEqual(strip_leading_continue("Yeah tell me about AIML"), "tell me about aiml")
        self.assertEqual(classify_closing_reply("Yeah tell me about AIML"), "CONTINUE")

    def test_closing_prompt_uses_name(self) -> None:
        en = get_closing_prompt("English", "Rahul")
        self.assertIn("Rahul", en)
        kn = get_closing_prompt("Kannada", "Rahul")
        self.assertIn("Rahul", kn)
        self.assertTrue(get_continue_listening_prompt("Hindi"))


if __name__ == "__main__":
    unittest.main()
