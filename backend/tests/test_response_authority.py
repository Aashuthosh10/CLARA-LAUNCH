"""Tests for ResponseAuthority (Milestone 3.5)."""

from __future__ import annotations

import unittest

from backend.services.orchestration.presentation_bundle import PresentationBundle
from backend.services.orchestration.response_authority import (
    AuthoritySealedError,
    ResponseAuthority,
    assert_authority_allows,
    seal_authority,
    select_response_authority,
)
from backend.services.orchestration.types import ConversationResolution, PresentationMode


class SelectAuthorityTests(unittest.TestCase):
    def test_retry_unknown_direct_faq_groq(self):
        cases = [
            (PresentationMode.RETRY.value, ResponseAuthority.RETRY_TEMPLATE),
            (PresentationMode.UNKNOWN.value, ResponseAuthority.UNKNOWN_TEMPLATE),
            (PresentationMode.DIRECT.value, ResponseAuthority.DETERMINISTIC),
            (PresentationMode.DIRECT_FAQ.value, ResponseAuthority.FAQ),
            (PresentationMode.NORMAL_REPLY.value, ResponseAuthority.GROQ),
            (PresentationMode.FULL_TEXT.value, ResponseAuthority.GROQ),
        ]
        for mode, expected in cases:
            res = ConversationResolution(presentation_mode=mode)
            self.assertEqual(select_response_authority(res), expected, msg=mode)

    def test_card_with_bundle(self):
        bundle = PresentationBundle(
            presentation_id="p1",
            language="English",
            language_code="en",
            tts_language="en-IN",
            card_surface="college",
            segments=({"displayText": "a", "ttsText": "a"},),
            spoken_summaries=("a",),
            display_captions=("a",),
            contract_hash="abc",
            created_at="2026-01-01T00:00:00Z",
        )
        res = ConversationResolution(
            presentation_mode=PresentationMode.CARD_PRESENTATION.value,
            should_generate_presentation=True,
            presentation_bundle=bundle,
        )
        self.assertEqual(select_response_authority(res), ResponseAuthority.CARD_PRESENTATION)


class AssertAllowsTests(unittest.TestCase):
    def test_groq_blocked_when_not_groq(self):
        for auth in (
            ResponseAuthority.FAQ,
            ResponseAuthority.CARD_PRESENTATION,
            ResponseAuthority.RETRY_TEMPLATE,
            ResponseAuthority.UNKNOWN_TEMPLATE,
            ResponseAuthority.DETERMINISTIC,
        ):
            self.assertFalse(assert_authority_allows(authority=auth, action="emit_groq"), msg=auth.value)

    def test_faq_blocked(self):
        self.assertFalse(assert_authority_allows(authority=ResponseAuthority.GROQ, action="emit_faq"))
        self.assertTrue(assert_authority_allows(authority=ResponseAuthority.FAQ, action="emit_faq"))

    def test_card_blocked(self):
        self.assertFalse(
            assert_authority_allows(authority=ResponseAuthority.GROQ, action="emit_card")
        )
        self.assertTrue(
            assert_authority_allows(authority=ResponseAuthority.CARD_PRESENTATION, action="emit_card")
        )

    def test_retry_unknown_template(self):
        self.assertTrue(
            assert_authority_allows(authority=ResponseAuthority.RETRY_TEMPLATE, action="emit_template")
        )
        self.assertFalse(
            assert_authority_allows(authority=ResponseAuthority.RETRY_TEMPLATE, action="emit_groq")
        )
        self.assertFalse(
            assert_authority_allows(authority=ResponseAuthority.UNKNOWN_TEMPLATE, action="emit_rag")
        )


class SealTests(unittest.TestCase):
    def test_seal_immutable_value(self):
        res = ConversationResolution(presentation_mode=PresentationMode.NORMAL_REPLY.value)
        auth = seal_authority(res)
        self.assertEqual(auth, ResponseAuthority.GROQ)
        self.assertTrue(res.authority_sealed)
        self.assertEqual(res.response_authority, ResponseAuthority.GROQ.value)
        # Idempotent same seal
        again = seal_authority(res)
        self.assertEqual(again, ResponseAuthority.GROQ)

    def test_seal_aligns_retry_flags(self):
        res = ConversationResolution(
            presentation_mode=PresentationMode.RETRY.value,
            should_call_groq=True,
            should_call_rag=True,
            short_circuit_reply="Please repeat.",
        )
        seal_authority(res)
        self.assertFalse(res.should_call_groq)
        self.assertFalse(res.should_call_rag)
        self.assertFalse(res.should_generate_presentation)


if __name__ == "__main__":
    unittest.main()
