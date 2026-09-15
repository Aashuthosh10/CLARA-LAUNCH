"""Deterministic acceptance coverage for authority-aware conversational routing."""

from __future__ import annotations

import asyncio

import pytest

from backend.app.session_state import (
    append_session_history,
    clear_session_conversation_memory,
    history_for_llm,
)
from backend.services.answer_generation import build_general_answer_system_prompt
from backend.services.conversation.context_resolver import resolve_contextual_query
from backend.services.conversation.response_decision import (
    ResponseMode,
    resolve_response_decision,
)
from backend.services.content.semantic_request_parser import parse_semantic_request
from backend.services.orchestration.conversation_orchestrator import ConversationOrchestrator


def _decision(text: str):
    request = parse_semantic_request(raw_text=text, language_code_key="en")
    return resolve_response_decision(
        text=text,
        semantic_request=request,
        ci_intent=None,
        has_department_entity=bool(request and request.entities),
    )


def _active_session() -> dict:
    return {
        "last_semantic_entities": ["cse_ds"],
        "last_person_unit_id": "cse_ds.hod",
        "active_svit_context": {
            "entities": ["cse_ds"],
            "topics": ["hod"],
            "person_unit_id": "cse_ds.hod",
        },
    }


def test_direct_official_svit_query_remains_card_authoritative() -> None:
    decision = _decision("Who is the CSE Data Science HOD?")
    assert decision.mode is ResponseMode.CARD
    assert decision.authority_domain == "official_svit"
    assert ("cse_ds", "hod") in decision.items


def test_department_definition_wording_uses_college_general_explanation() -> None:
    decision = _decision("What is ECE?")
    assert decision.mode is ResponseMode.ANSWER
    assert decision.authority_domain == "general"


@pytest.mark.parametrize(
    ("surface", "expected"),
    [
        ("What about fees?", "fees"),
        ("Tell me more about him.", "hod"),
        ("And placements?", "placements"),
        ("How long is it?", "duration"),
        ("What documents?", "documents"),
    ],
)
def test_contextual_followups_resolve_active_svit_entity(surface: str, expected: str) -> None:
    resolved = resolve_contextual_query(surface, _active_session())
    assert resolved.is_follow_up
    assert resolved.authority_domain == "official_svit"
    assert "CSE Data Science" in resolved.resolved_query
    assert expected in resolved.topics


def test_exactly_three_completed_turns_and_eviction() -> None:
    session: dict = {}
    for number in range(1, 5):
        append_session_history(session, "user", f"user {number}")
        append_session_history(session, "assistant", f"assistant {number}")
    assert session["turn_history"] == [
        {"user": "user 2", "assistant": "assistant 2"},
        {"user": "user 3", "assistant": "assistant 3"},
        {"user": "user 4", "assistant": "assistant 4"},
    ]
    assert len(history_for_llm(session)) == 6


def test_incomplete_turn_is_not_memory() -> None:
    session: dict = {}
    append_session_history(session, "user", "pending")
    assert session.get("turn_history", []) == []
    assert history_for_llm(session) == []


def test_new_session_reset_and_session_isolation() -> None:
    user_a: dict = {"guest_name": "Asha"}
    user_b: dict = {}
    append_session_history(user_a, "user", "Tell me about Data Science")
    append_session_history(user_a, "assistant", "Official answer")
    assert not user_b.get("guest_name")
    assert history_for_llm(user_b) == []
    user_a.update(
        {
            "last_semantic_entities": ["cse_ds"],
            "last_person_unit_id": "cse_ds.hod",
            "active_svit_context": {"entities": ["cse_ds"]},
        }
    )
    clear_session_conversation_memory(user_a)
    user_a["guest_name"] = None
    assert history_for_llm(user_a) == []
    assert not resolve_contextual_query("What about fees?", user_a).is_follow_up
    assert "last_semantic_entities" not in user_a
    assert "last_person_unit_id" not in user_a


def test_name_persists_as_session_metadata_not_retrieval_context() -> None:
    session = _active_session()
    session["guest_name"] = "Rahul"
    resolved = resolve_contextual_query("What about fees?", session)
    assert session["guest_name"] == "Rahul"
    assert "Rahul" not in resolved.resolved_query


def test_name_prompt_is_natural_not_mechanical() -> None:
    prompt = build_general_answer_system_prompt("English")
    assert "Rahul" not in prompt
    assert "official SVIT" in prompt


@pytest.mark.parametrize(
    "text",
    [
        "Where is the payment scanner?",
        "Give me someone's personal mobile number.",
        "Will SVIT definitely refund my fee?",
        "Can you approve my admission?",
    ],
)
def test_controlled_requests_never_reach_general_groq(text: str) -> None:
    decision = _decision(text)
    assert decision.mode is ResponseMode.FALLBACK
    assert decision.authority_domain == "controlled_redirect"


@pytest.mark.parametrize(
    "text",
    [
        "ಪೇಮೆಂಟ್ ಸ್ಕ್ಯಾನರ್ ಎಲ್ಲಿದೆ?",
        "पेमेंट स्कैनर कहाँ है?",
        "பேமெண்ட் ஸ்கேனர் எங்கே?",
        "పేమెంట్ స్కానర్ ఎక్కడ?",
        "പേയ്മെന്റ് സ്കാനർ എവിടെ?",
    ],
)
def test_multilingual_payment_controls(text: str) -> None:
    decision = _decision(text)
    assert decision.mode is ResponseMode.FALLBACK
    assert decision.authority_domain == "controlled_redirect"


@pytest.mark.parametrize(
    "text",
    [
        "What is machine learning?",
        "Explain recursion.",
        "Give me study tips.",
        "How should I prepare for placements?",
        "What skills should a CSE student learn?",
        "What is CGPA?",
    ],
)
def test_general_and_college_adjacent_questions_use_general_authority(text: str) -> None:
    decision = _decision(text)
    assert decision.mode is ResponseMode.ANSWER
    assert decision.authority_domain == "general"


def test_svit_placement_question_remains_official() -> None:
    decision = _decision("How are placements at SVIT?")
    # College placements surface as the official placement ContentUnit deck.
    assert decision.mode is ResponseMode.CARD
    assert decision.authority_domain == "official_svit"


def test_general_turn_disables_rag_but_keeps_groq() -> None:
    result = asyncio.run(
        ConversationOrchestrator().run(
            "What is machine learning?",
            {"language_code_key": "en", "language_name": "English"},
            groq_client=None,
            model=None,
            defer_narration=True,
        )
    )
    assert result.resolution.authority_domain == "general"
    assert not result.resolution.should_call_rag
    assert result.resolution.should_call_groq


def test_official_turn_enables_grounded_rag_and_groq() -> None:
    result = asyncio.run(
        ConversationOrchestrator().run(
            "What is special about this college?",
            {"language_code_key": "en", "language_name": "English"},
            groq_client=None,
            model=None,
            defer_narration=True,
        )
    )
    assert result.resolution.authority_domain == "official_svit"
    assert result.resolution.should_call_rag
    assert result.resolution.should_call_groq


@pytest.mark.parametrize(
    "surface",
    [
        "What about fees?",
        "ಮತ್ತೆ ಫೀಸ್?",
        "और फीस?",
        "மேலும் கட்டணம்?",
        "మరియు ఫీజు?",
        "കൂടാതെ ഫീസ്?",
        "fees hegide?",
    ],
)
def test_mixed_and_all_six_language_followups(surface: str) -> None:
    resolved = resolve_contextual_query(surface, _active_session())
    assert resolved.is_follow_up
    assert "CSE Data Science" in resolved.resolved_query


@pytest.mark.parametrize("language", ["English", "Kannada", "Hindi", "Telugu", "Tamil", "Malayalam"])
def test_general_prompt_respects_selected_language(language: str) -> None:
    prompt = build_general_answer_system_prompt(language)
    assert f"Reply in {language}" in prompt
    assert "Never invent SVIT-specific details" in prompt


def test_general_turn_does_not_replace_active_institutional_context() -> None:
    session = _active_session()
    general = resolve_contextual_query("What is machine learning?", session)
    assert not general.is_follow_up
    later = resolve_contextual_query("Faculty also.", session)
    assert later.is_follow_up
    assert "CSE Data Science" in later.resolved_query


@pytest.mark.parametrize(
    "text",
    [
        "Tell me a 3000-word fantasy story.",
        "Tell me a very long unrelated roleplay.",
        "asdf qwer zxcv asdf qwer",
        "Book me a flight to Paris.",
    ],
)
def test_clearly_irrelevant_kiosk_requests_redirect(text: str) -> None:
    decision = _decision(text)
    assert decision.mode is ResponseMode.FALLBACK
    assert decision.evidence == "out_of_scope"


def test_unrelated_science_fact_is_redirected() -> None:
    decision = _decision("What is photosynthesis?")
    assert decision.mode is ResponseMode.FALLBACK


@pytest.mark.parametrize(
    "text",
    [
        "Can the HOD approve my attendance shortage?",
        "Can the college issue my certificate?",
        "Give me the payment QR.",
        "Give me the HOD phone number.",
    ],
)
def test_authority_sensitive_requests_are_controlled(text: str) -> None:
    decision = _decision(text)
    assert decision.mode is ResponseMode.FALLBACK
    assert decision.authority_domain == "controlled_redirect"


@pytest.mark.parametrize(
    "text",
    [
        "CSE placements kaise prepare karen?",
        "machine learning andre enu?",
        "AI ML enthaanu?",
    ],
)
def test_mixed_language_concepts_and_advice_use_general_groq(text: str) -> None:
    decision = _decision(text)
    assert decision.mode is ResponseMode.ANSWER
    assert decision.authority_domain == "general"


@pytest.mark.parametrize(
    "text",
    [
        "What is machine learning?",
        "machine learning ಅಂದರೆ ಏನು?",
        "machine learning क्या है?",
        "machine learning అంటే ఏమిటి?",
        "machine learning என்றால் என்ன?",
        "AI ML എന്താണ്?",
    ],
)
def test_general_definition_routing_in_all_six_languages(text: str) -> None:
    decision = _decision(text)
    assert decision.mode is ResponseMode.ANSWER
    assert decision.authority_domain == "general"


def test_explicit_mixed_language_svit_card_stays_authoritative() -> None:
    decision = _decision("SVIT AI ML HOD aaraanu?")
    assert decision.mode is ResponseMode.CARD
    assert decision.authority_domain == "official_svit"


@pytest.mark.parametrize(
    "surface",
    ["What about placements?", "Tell me more about him.", "What documents?"],
)
def test_resolved_svit_followups_use_rag_not_inferred_cards(surface: str) -> None:
    session = _active_session()
    contextual = resolve_contextual_query(surface, session)
    result = asyncio.run(
        ConversationOrchestrator().run(
            contextual.resolved_query,
            session,
            groq_client=None,
            model=None,
            defer_narration=True,
            contextual_follow_up=contextual.is_follow_up,
        )
    )
    assert result.resolution.response_mode == ResponseMode.ANSWER.value
    assert result.resolution.authority_domain == "official_svit"
    assert result.resolution.should_call_rag


def test_history_is_only_enabled_for_unresolved_references() -> None:
    session = _active_session()
    session["turn_history"] = [{"user": "What is recursion?", "assistant": "A definition."}]
    assert not resolve_contextual_query("What is photosynthesis?", session).include_history
    assert resolve_contextual_query("Explain that more simply.", session).include_history
    # Active SVIT references are rewritten explicitly, so unrelated history is unnecessary.
    assert not resolve_contextual_query("What about placements?", session).include_history


def test_general_prompt_only_connects_to_svit_when_useful() -> None:
    prompt = build_general_answer_system_prompt("English")
    assert "genuinely useful academic or student connection" in prompt
    assert "omit any college reference for unrelated facts" in prompt


def test_unintelligible_input_is_not_reclassified_here() -> None:
    # Transcript validation owns noise/retry; the authority router never receives
    # a fabricated general answer for an empty transcript.
    from backend.services.conversation.transcript_validator import assess_transcript, needs_speech_retry

    assert needs_speech_retry(assess_transcript("**BACKGROUND_NOISE**"))
