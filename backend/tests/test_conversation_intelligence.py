"""Unit tests for Conversation Intelligence Layer (Milestone 1)."""

from __future__ import annotations

import asyncio
import unittest

from backend.services.answer_generation import INTENT_DEPARTMENT_OVERVIEW, INTENT_PLACEMENTS
from backend.services.conversation.answer_length import govern_answer_length, measure_answer
from backend.services.conversation.entity_extractor import extract_entities_rules
from backend.services.conversation.intent_confidence import score_intent_from_features
from backend.services.conversation.pipeline import is_short_circuit, run_conversation_intelligence
from backend.services.conversation.semantic_normalize import normalize_semantic_topic
from backend.services.conversation.transcript_validator import assess_transcript, needs_speech_retry
from backend.services.conversation.types import PolicyAction


class TranscriptValidatorTests(unittest.TestCase):
    def test_empty_and_noise(self):
        for raw in ("", "uh", "hmm", "mmm", "aa", "**BACKGROUND_NOISE**"):
            a = assess_transcript(raw)
            self.assertTrue(needs_speech_retry(a), msg=raw)

    def test_greetings_are_speech_not_noise(self):
        # M5.4: a greeting is a real utterance and must reach the greeting policy,
        # never the "I didn't catch that" retry.
        for raw in ("hello", "hello...", "hi", "hey", "Namaste", "good morning"):
            a = assess_transcript(raw)
            self.assertFalse(needs_speech_retry(a), msg=raw)

    def test_real_question_ok(self):
        a = assess_transcript("Tell me about CSE department")
        self.assertFalse(needs_speech_retry(a))
        self.assertGreaterEqual(a.confidence, 0.45)


class EntityExtractorTests(unittest.TestCase):
    def test_name_introduction_stores_bare_name(self):
        e = extract_entities_rules("My name is Naveen")
        self.assertEqual(e.person_name, "Naveen")
        self.assertTrue(e.name_introduction)

    def test_location_canonical(self):
        e = extract_entities_rules("I am from Bangalore")
        self.assertEqual(e.location, "Bangalore")

    def test_department(self):
        e = extract_entities_rules("Tell me about CSE")
        self.assertIsNotNone(e.department)


class SemanticNormalizeTests(unittest.TestCase):
    def test_food_topics(self):
        for q in ("canteen food", "food quality", "mess menu", "cafeteria"):
            self.assertEqual(normalize_semantic_topic(q), "FOOD")

    def test_environment(self):
        self.assertEqual(normalize_semantic_topic("college environment"), "ENVIRONMENT")
        self.assertEqual(normalize_semantic_topic("campus atmosphere"), "ENVIRONMENT")

    def test_placements(self):
        self.assertEqual(normalize_semantic_topic("placement jobs"), "PLACEMENTS")


class IntentConfidenceTests(unittest.TestCase):
    def test_cse_overview_high_confidence(self):
        r = score_intent_from_features("Tell me about CSE")
        self.assertEqual(r.intent, INTENT_DEPARTMENT_OVERVIEW)
        self.assertGreaterEqual(r.confidence, 0.85)

    def test_local_intent_high(self):
        r = score_intent_from_features("x", local_intent={"type": "department_click", "departmentLabel": "CSE"})
        self.assertGreaterEqual(r.confidence, 0.90)
        self.assertEqual(r.matched_source, "localIntent")


class AnswerLengthTests(unittest.TestCase):
    def test_normal_truncates(self):
        words = " ".join([f"word{i}" for i in range(200)])
        out = govern_answer_length(words, "normal")
        self.assertLessEqual(measure_answer(out)["words"], 120)

    def test_presentation_unchanged(self):
        long_text = " ".join([f"word{i}" for i in range(200)])
        self.assertEqual(govern_answer_length(long_text, "presentation"), long_text)


class PipelineIntegrationTests(unittest.TestCase):
    def _run(self, text: str, **kwargs):
        return asyncio.run(
            run_conversation_intelligence(text, language_name="English", **kwargs)
        )

    def test_name_entity_update(self):
        result = self._run("My name is Naveen")
        self.assertTrue(is_short_circuit(result))
        self.assertEqual(result.decision.action, PolicyAction.ENTITY_UPDATE)
        self.assertEqual(result.decision.session_updates.get("guest_name"), "Naveen")
        self.assertIn("Naveen", result.decision.reply_text or "")

    def test_noise_retry(self):
        result = self._run("uh")
        self.assertTrue(is_short_circuit(result))
        self.assertEqual(result.decision.action, PolicyAction.NO_SPEECH_RETRY)

    def test_canteen_is_answered_not_unknown(self):
        result = self._run("How is the canteen food quality?")
        self.assertFalse(is_short_circuit(result))
        self.assertEqual(result.decision.action, PolicyAction.ANSWER)
        self.assertFalse(result.decision.unknown_fallback)

    def test_environment_is_answered_not_unknown(self):
        result = self._run("Tell me about the college environment")
        self.assertFalse(is_short_circuit(result))
        self.assertEqual(result.decision.action, PolicyAction.ANSWER)

    def test_department_passthrough(self):
        result = self._run("Tell me about CSE")
        self.assertFalse(is_short_circuit(result))
        self.assertEqual(result.decision.action, PolicyAction.CARD_PRESENTATION)
        self.assertTrue(result.decision.passthrough)
        self.assertEqual(result.intent_result.intent, INTENT_DEPARTMENT_OVERVIEW)

    def test_local_intent_passthrough_even_if_noise(self):
        result = self._run(
            "uh",
            local_intent={"type": "department_click", "departmentLabel": "CSE"},
        )
        self.assertFalse(is_short_circuit(result))
        self.assertTrue(result.decision.passthrough)


if __name__ == "__main__":
    unittest.main()
