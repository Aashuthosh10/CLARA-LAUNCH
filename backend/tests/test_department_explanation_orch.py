"""Orchestrator-path tests for department clarification + comparison→explanation."""

from __future__ import annotations

import asyncio

from backend.services.conversation.pending_clarification import (
    PendingClarification,
    try_resolve_pending,
)
from backend.services.conversation.templates import clarification_reply
from backend.services.content.semantic_request_parser import parse_semantic_request
from backend.services.orchestration import ConversationOrchestrator, should_short_circuit


def _fresh_session() -> dict:
    return {
        "language_name": "English",
        "language_code_key": "en",
        "tts_code": "en-IN",
    }


def _run(text: str, session: dict, turn_id: str = "t"):
    return asyncio.run(
        ConversationOrchestrator().run(
            text, session, turn_id=turn_id, defer_narration=True
        )
    )


def _attach(orch: ConversationOrchestrator, result, text: str, session: dict, turn_id: str):
    res = result.resolution
    if res.should_generate_presentation and not res.authority_sealed:
        return orch.attach_narration(
            res, session, text, turn_id=turn_id, entities=res.canonical_entities
        )
    if res.presentation_bundle is not None:
        return list(res.presentation_bundle.segments)
    return None


def test_orch_tell_me_about_cse_clarifies_with_dept_name():
    session = _fresh_session()
    result = _run("Tell me about CSE.", session, "t1")
    res = result.resolution
    assert res.response_mode == "CLARIFY"
    assert res.clarification_target == "department_information"
    assert should_short_circuit(result) is True
    assert res.short_circuit_reply
    assert "CSE" in (res.short_circuit_reply or "")
    assert "overview" in (res.short_circuit_reply or "").lower()
    pending = session.get("pending_clarification")
    assert isinstance(pending, dict)
    assert pending.get("clarification_target") == "department_information"
    assert pending.get("options") == ["overview", "explanation"]
    assert pending.get("topic") == "cse"


def test_orch_pending_restatement_does_not_open_overview():
    session = _fresh_session()
    _run("Tell me about CSE.", session, "t1")
    assert session.get("pending_clarification")

    result = _run("Tell me about CSE.", session, "t2")
    res = result.resolution
    assert res.show_card != "department_overview"
    assert res.response_mode == "CLARIFY"
    assert res.clarification_target == "department_information"
    assert session.get("pending_clarification") is not None


def test_orch_pending_general_overview_opens_overview_card():
    orch = ConversationOrchestrator()
    session = _fresh_session()
    asyncio.run(orch.run("Tell me about CSE.", session, turn_id="t1", defer_narration=True))

    result = asyncio.run(
        orch.run("General overview.", session, turn_id="t2", defer_narration=True)
    )
    res = result.resolution
    assert res.response_mode == "CARD"
    assert res.show_card == "department_overview"
    segs = _attach(orch, result, "General overview.", session, "t2")
    assert segs
    unit_ids = [getattr(s, "unit_id", None) for s in segs]
    assert any(uid and str(uid).startswith("cse.") for uid in unit_ids)


def test_orch_pending_explain_simply_opens_explanation_card():
    orch = ConversationOrchestrator()
    session = _fresh_session()
    asyncio.run(orch.run("Tell me about CSE.", session, turn_id="t1", defer_narration=True))

    result = asyncio.run(
        orch.run("Explain it simply.", session, turn_id="t2", defer_narration=True)
    )
    res = result.resolution
    assert res.response_mode == "CARD"
    assert res.show_card == "department_explanation"
    segs = _attach(orch, result, "Explain it simply.", session, "t2")
    assert segs
    unit_ids = [getattr(s, "unit_id", None) for s in segs]
    assert "department_explanation.cse" in unit_ids
    assert "department_explanation" not in unit_ids


def test_orch_difference_cse_ece_explanation_units():
    orch = ConversationOrchestrator()
    session = _fresh_session()
    text = "What is the difference between CSE and ECE?"
    result = asyncio.run(orch.run(text, session, turn_id="cmp", defer_narration=True))
    res = result.resolution
    assert res.response_mode == "CARD"
    assert res.show_card == "department_explanation"
    sr = getattr(res, "semantic_request", None) or getattr(result.intel, "semantic_request", None)
    assert sr is not None
    assert ("cse", "explanation") in sr.unit_items
    assert ("ece", "explanation") in sr.unit_items

    segs = _attach(orch, result, text, session, "cmp")
    assert segs
    unit_ids = [getattr(s, "unit_id", None) for s in segs]
    assert "department_explanation.cse" in unit_ids
    assert "department_explanation.ece" in unit_ids
    assert "department_explanation" not in unit_ids


def test_orch_compare_cse_ece_same_units():
    orch = ConversationOrchestrator()
    session = _fresh_session()
    text = "Compare CSE and ECE."
    result = asyncio.run(orch.run(text, session, turn_id="cmp2", defer_narration=True))
    res = result.resolution
    assert res.show_card == "department_explanation"
    segs = _attach(orch, result, text, session, "cmp2")
    unit_ids = [getattr(s, "unit_id", None) for s in (segs or [])]
    assert "department_explanation.cse" in unit_ids
    assert "department_explanation.ece" in unit_ids


def test_parse_difference_yields_explanation_items():
    sr = parse_semantic_request(
        raw_text="What is the difference between CSE and ECE?",
        language_code_key="en",
    )
    assert sr is not None
    assert sr.unit_items == (("cse", "explanation"), ("ece", "explanation"))


def test_parse_tell_me_about_two_depts_still_fail_closed():
    """Non-contrast multi-dept must remain fail-closed (no global weaken)."""
    sr = parse_semantic_request(
        raw_text="Tell me about CSE and ECE",
        language_code_key="en",
    )
    assert sr is None


def test_pending_restatement_keeps_pending():
    pending = PendingClarification(
        original_query="Tell me about CSE.",
        clarification_target="department_information",
        topic="cse",
        language_code_key="en",
        options=("overview", "explanation"),
    )
    for text in (
        "Tell me about CSE.",
        "Can you tell me about CSE?",
        "Give me information about CSE.",
    ):
        r = try_resolve_pending(text, pending)
        assert r is not None
        assert r.clear_pending is False
        assert r.local_intent is None


def test_pending_explicit_answers_resolve():
    pending = PendingClarification(
        original_query="Tell me about CSE.",
        clarification_target="department_information",
        topic="cse",
        language_code_key="en",
        options=("overview", "explanation"),
    )
    r1 = try_resolve_pending("General overview.", pending)
    assert r1 is not None and r1.selected_option == "overview"
    assert r1.rewritten_text
    r2 = try_resolve_pending("Explain it simply.", pending)
    assert r2 is not None and r2.selected_option == "explanation"
    assert r2.rewritten_text


def test_clarification_reply_includes_cse():
    reply = clarification_reply("English", "department_information", department="cse")
    assert "CSE" in reply
    assert "overview" in reply.lower()
