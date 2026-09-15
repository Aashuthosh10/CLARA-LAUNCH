"""Acceptance matrix for CLARA's controlled receptionist scope."""

from __future__ import annotations

import asyncio

import pytest

from backend.services.conversation.context_resolver import resolve_contextual_query
from backend.services.conversation.pipeline import run_conversation_intelligence
from backend.services.conversation.response_decision import ResponseMode, resolve_response_decision
from backend.services.conversation.types import PolicyAction
from backend.services.content.semantic_request_parser import parse_semantic_request
from backend.services.orchestration.conversation_orchestrator import ConversationOrchestrator


def decide(text: str, language: str = "en"):
    request = parse_semantic_request(raw_text=text, language_code_key=language)
    return resolve_response_decision(
        text=text,
        semantic_request=request,
        ci_intent=None,
        has_department_entity=bool(request and request.entities),
    )


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("Who is the Data Science HOD?", ResponseMode.CARD),
        ("Data Science fees.", ResponseMode.CARD),
        ("Tell me about Data Science.", ResponseMode.CARD),
        ("How are placements at SVIT?", ResponseMode.ANSWER),
        ("Tell me about admissions.", ResponseMode.CARD),
    ],
)
def test_svit_requests_keep_card_and_rag_authority(text: str, expected: ResponseMode) -> None:
    decision = decide(text)
    assert decision.mode is expected
    assert decision.authority_domain == "official_svit"


@pytest.mark.parametrize(
    "text",
    [
        "Where should I go?",
        "Whom should I meet?",
        "Where do I submit documents?",
        "Where can I ask about fees?",
        "Who handles certificates?",
        "Where can parents wait?",
    ],
)
def test_receptionist_requests_never_fall_into_general_or_out_of_scope(text: str) -> None:
    decision = decide(text)
    assert decision.mode is ResponseMode.ANSWER
    assert decision.authority_domain == "official_svit"


@pytest.mark.parametrize(
    "text",
    [
        "What is CSE?",
        "What is AI and ML?",
        "How should I prepare for placements?",
        "How do internships work?",
        "What is CGPA?",
        "What is a credit?",
        "What is campus placement?",
        "Which course is better for software jobs?",
        "Explain recursion.",
    ],
)
def test_college_general_questions_use_bounded_groq(text: str) -> None:
    decision = decide(text)
    assert decision.mode is ResponseMode.ANSWER
    assert decision.authority_domain == "general"
    assert decision.evidence == "college_general"


@pytest.mark.parametrize(
    "text",
    [
        "Who is the most famous celebrity in India?",
        "Which movie should I watch?",
        "Who is Virat Kohli?",
        "What is the capital of France?",
        "Tell me about politics.",
        "What is happening in the stock market?",
        "Tell me a 3000-word fantasy story.",
        "Give me a cooking recipe.",
        "Plan my holiday.",
        "What is photosynthesis?",
    ],
)
def test_random_general_knowledge_redirects(text: str) -> None:
    decision = decide(text)
    assert decision.mode is ResponseMode.FALLBACK
    assert decision.domain_relevance.value == "off_domain"


@pytest.mark.parametrize(
    ("text", "expected_action", "reply_fragment", "max_words"),
    [
        ("Hi", PolicyAction.GREETING, "help", 18),
        ("How are you?", PolicyAction.SMALL_TALK, "doing well", 18),
        ("Thank you", PolicyAction.SMALL_TALK, "welcome", 24),
        ("Bye", PolicyAction.SMALL_TALK, "Goodbye", 18),
        ("What's your name?", PolicyAction.SMALL_TALK, "CLARA", 18),
    ],
)
def test_social_conversation_is_short_and_specific(
    text: str, expected_action: PolicyAction, reply_fragment: str, max_words: int
) -> None:
    result = asyncio.run(
        run_conversation_intelligence(
            text,
            language_name="English",
            language_code_key="en",
            groq_client=None,
        )
    )
    assert result.decision.action is expected_action
    assert reply_fragment.lower() in (result.decision.reply_text or "").lower()
    assert len((result.decision.reply_text or "").split()) <= max_words
    if text == "Thank you":
        assert result.decision.session_updates.get("awaiting_closing_reply") is True


def test_contextual_and_stale_context_behavior() -> None:
    session = {
        "language_code_key": "en",
        "language_name": "English",
        "last_semantic_entities": ["cse_ds"],
        "active_svit_context": {"entities": ["cse_ds"], "topics": ["overview"]},
    }
    for text in ("What about placements?", "Tell me more.", "Is it difficult?", "What kind of jobs can I get?"):
        contextual = resolve_contextual_query(text, session)
        assert contextual.is_follow_up
        result = asyncio.run(
            ConversationOrchestrator().run(
                contextual.resolved_query,
                session,
                groq_client=None,
                model=None,
                defer_narration=True,
                contextual_follow_up=True,
            )
        )
        assert result.resolution.response_mode == ResponseMode.ANSWER.value
        assert result.resolution.authority_domain == "official_svit"
        assert result.resolution.should_call_rag

    unrelated = resolve_contextual_query("Who is Virat Kohli?", session)
    assert not unrelated.is_follow_up
    assert decide(unrelated.resolved_query).mode is ResponseMode.FALLBACK


@pytest.mark.parametrize(
    ("text", "language"),
    [
        ("What is AI and ML?", "en"),
        ("AI ML ಅಂದರೆ ಏನು?", "kn"),
        ("AI ML क्या है?", "hi"),
        ("AI ML అంటే ఏమిటి?", "te"),
        ("AI ML என்றால் என்ன?", "ta"),
        ("AI ML എന്താണ്?", "ml"),
    ],
)
def test_college_general_scope_across_all_six_languages(text: str, language: str) -> None:
    decision = decide(text, language)
    assert decision.mode is ResponseMode.ANSWER
    assert decision.authority_domain == "general"


@pytest.mark.parametrize(
    ("text", "language"),
    [
        ("Who is Virat Kohli?", "en"),
        ("Shah Rukh Khan ಯಾರು?", "kn"),
        ("Virat Kohli कौन है?", "hi"),
        ("Virat Kohli ఎవరు?", "te"),
        ("Shah Rukh Khan யார்?", "ta"),
        ("Virat Kohli ആരാണ്?", "ml"),
    ],
)
def test_out_of_scope_across_all_six_languages(text: str, language: str) -> None:
    assert decide(text, language).mode is ResponseMode.FALLBACK


def test_out_of_scope_short_circuits_without_rag_or_groq() -> None:
    result = asyncio.run(
        ConversationOrchestrator().run(
            "What is the capital of France?",
            {"language_code_key": "en", "language_name": "English"},
            groq_client=None,
            model=None,
            defer_narration=True,
        )
    )
    assert result.resolution.response_mode == ResponseMode.FALLBACK.value
    assert result.resolution.short_circuit_reply
    assert not result.resolution.should_call_rag
    assert not result.resolution.should_call_groq


def test_receptionist_guidance_uses_authoritative_rag() -> None:
    result = asyncio.run(
        ConversationOrchestrator().run(
            "Who handles certificates?",
            {"language_code_key": "en", "language_name": "English"},
            groq_client=None,
            model=None,
            defer_narration=True,
        )
    )
    assert result.resolution.response_mode == ResponseMode.ANSWER.value
    assert result.resolution.authority_domain == "official_svit"
    assert result.resolution.should_call_rag
    assert result.resolution.should_call_groq


def test_unknown_official_fact_stays_grounded() -> None:
    decision = decide("Does SVIT have a nuclear reactor?")
    assert decision.mode is ResponseMode.ANSWER
    assert decision.authority_domain == "official_svit"
