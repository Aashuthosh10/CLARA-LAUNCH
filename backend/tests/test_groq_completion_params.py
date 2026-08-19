"""Groq GPT-OSS completion parameter helpers."""

from __future__ import annotations

import unittest

from backend.clients.provider_clients import groq_completion_kwargs


class TestGroqCompletionKwargs(unittest.TestCase):
    def test_oss_uses_max_completion_tokens(self) -> None:
        params = groq_completion_kwargs("openai/gpt-oss-20b", 100, temperature=0.1)
        self.assertIn("max_completion_tokens", params)
        self.assertGreaterEqual(params["max_completion_tokens"], 512)
        self.assertEqual(params["reasoning_effort"], "low")
        self.assertNotIn("max_tokens", params)

    def test_legacy_uses_max_tokens(self) -> None:
        params = groq_completion_kwargs("llama-3.1-8b-instant", 100, temperature=0.1)
        self.assertEqual(params["max_tokens"], 100)
        self.assertNotIn("max_completion_tokens", params)


if __name__ == "__main__":
    unittest.main()
