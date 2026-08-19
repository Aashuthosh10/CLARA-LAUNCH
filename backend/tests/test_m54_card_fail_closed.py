"""
M5.4 fail-closed routing at the orchestrator boundary.

A CARD turn without a unit plan must not emit a card surface, and no CI intent
may open a card that the response decision did not authorise.
"""

from __future__ import annotations

import asyncio
import unittest

from backend.services.content.types import (
    SURFACE_COMPARISON,
    SURFACE_DEPARTMENT_OVERVIEW,
)
from backend.services.orchestration import ConversationOrchestrator, PresentationMode


def run_turn(text: str, language: str = "English", code_key: str = "en"):
    async def _run():
        session = {"language_code_key": code_key, "language_name": language}
        result = await ConversationOrchestrator().run(text, session, defer_narration=True)
        return result.resolution

    return asyncio.run(_run())


class TestCardsFailClosed(unittest.TestCase):
    def test_composed_request_emits_the_unit_backed_surface(self) -> None:
        res = run_turn("Data Science overview and AIML HOD")
        self.assertEqual(res.show_card, SURFACE_DEPARTMENT_OVERVIEW)
        self.assertTrue(res.should_generate_presentation)

    def test_unbindable_multi_entity_emits_no_card(self) -> None:
        res = run_turn("tell me about CSE and AIML")
        self.assertIsNone(res.show_card)
        self.assertFalse(res.should_generate_presentation)

    def test_missing_department_clarifies_without_a_card(self) -> None:
        res = run_turn("Who is the HOD?")
        self.assertIsNone(res.show_card)
        self.assertEqual(res.presentation_mode, PresentationMode.UNKNOWN.value)
        self.assertEqual(res.response_type, "clarification")
        self.assertTrue(res.short_circuit_reply)

    def test_unlisted_department_emits_no_card(self) -> None:
        res = run_turn("Quantum Basket Weaving HOD")
        self.assertIsNone(res.show_card)


class TestNoCompetingCardAuthority(unittest.TestCase):
    def test_placements_question_is_not_a_department_comparison(self) -> None:
        res = run_turn("How are placements?")
        self.assertNotEqual(res.show_card, SURFACE_COMPARISON)

    def test_off_domain_question_is_not_a_course_menu(self) -> None:
        res = run_turn("What is the capital of France?")
        self.assertIsNone(res.show_card)
        self.assertEqual(res.presentation_mode, PresentationMode.UNKNOWN.value)
        self.assertFalse(res.should_call_rag)
        self.assertTrue(res.short_circuit_reply)

    def test_institutional_question_answers_instead_of_carding(self) -> None:
        res = run_turn("How good are the teachers here?")
        self.assertIsNone(res.show_card)
        self.assertEqual(res.presentation_mode, PresentationMode.NORMAL_REPLY.value)
        self.assertTrue(res.should_call_rag)

    def test_greeting_is_a_greeting_not_a_speech_retry(self) -> None:
        res = run_turn("hello")
        self.assertEqual(res.presentation_mode, PresentationMode.DIRECT.value)
        self.assertNotEqual(res.presentation_mode, PresentationMode.RETRY.value)


class TestFallbackIsNotAnUnavailableAnswer(unittest.TestCase):
    def test_off_domain_reply_differs_from_unavailable_reply(self) -> None:
        from backend.services.answer_generation import (
            OFF_TOPIC_REPLY_BY_LANGUAGE,
            UNAVAILABLE_REPLY_BY_LANGUAGE,
        )

        for language in OFF_TOPIC_REPLY_BY_LANGUAGE:
            with self.subTest(language=language):
                self.assertNotEqual(
                    OFF_TOPIC_REPLY_BY_LANGUAGE[language],
                    UNAVAILABLE_REPLY_BY_LANGUAGE.get(language),
                )


if __name__ == "__main__":
    unittest.main()
