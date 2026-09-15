"""M5.6 runtime phase: qualitative campus questions stay ANSWER.

College placement overview requests are CARD (placement deck) — excluded here.
Does not change ResponseDecision ownership. Does not add vocabulary.
"""

from __future__ import annotations

import unittest

from backend.services.content.semantic_request_parser import parse_semantic_request
from backend.services.conversation.response_decision import ResponseMode, resolve_response_decision


MATRIX = (
    ("en", "How good are the teachers here?"),
    ("en", "How is campus life?"),
    ("en", "Are there good labs?"),
    ("en", "Do students get internship opportunities?"),
    ("en", "What is special about this college?"),
    ("kn", "teachers hegiddare?"),
    ("kn", "campus life hegide?"),
    ("hi", "teachers kaise hain?"),
    ("ta", "campus life eppadi irukku?"),
    ("te", "teachers ela unnaru?"),
    ("ml", "campus engane aanu?"),
)

# Bare college placements now route to the 4-unit placement ContentUnit deck.
PLACEMENT_CARD_MATRIX = (
    ("en", "How are placements?"),
    ("en", "Tell me about placements."),
)


def decide(raw: str, lang: str) -> ResponseMode:
    request = parse_semantic_request(raw_text=raw, language_code_key=lang)
    decision = resolve_response_decision(
        text=raw,
        semantic_request=request,
        ci_intent=None,
        has_department_entity=bool(request and request.entities),
    )
    return decision.mode


class TestM56AnswerMatrixRouting(unittest.TestCase):
    def test_required_runtime_queries_are_answer(self) -> None:
        failures: list[str] = []
        for lang, text in MATRIX:
            mode = decide(text, lang)
            if mode is not ResponseMode.ANSWER:
                failures.append(f"{lang}: {text!r} -> {mode.value}")
        self.assertEqual(failures, [])

    def test_college_placements_route_to_card_deck(self) -> None:
        for lang, text in PLACEMENT_CARD_MATRIX:
            with self.subTest(text=text):
                self.assertIs(decide(text, lang), ResponseMode.CARD)
