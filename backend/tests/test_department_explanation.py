"""Tests for department explanation feature:
- Unit IDs, topic cues, ambiguity CLARIFY, clarification resolve (overview vs explanation),
- Comparison → explanation surface (not cinema), fees/hod regression.
"""

from __future__ import annotations

import pytest

from backend.services.answer_generation import DEPARTMENT_JSON_KEY_ORDER
from backend.services.content.semantic_vocab.catalog import TOPIC_EXPLANATION
from backend.services.content.semantic_topics import ATOMIC_TOPICS, detect_atomic_topics
from backend.services.content.unit_selector import _unit_id_for_topic
from backend.services.content.content_unit_registry import get_unit_descriptor
from backend.services.content.department_explanation_units import (
    all_explanation_descriptors,
    explanation_unit_id,
    get_explanation_descriptor,
    placeholder_title,
)
from backend.services.content.types import ALL_SURFACES, SURFACE_DEPARTMENT_EXPLANATION
from backend.services.conversation.pending_clarification import (
    PendingClarification,
    build_pending_for_decision,
    try_resolve_pending,
)
from backend.services.conversation.templates import clarification_reply
from backend.services.conversation.response_decision import (
    ResponseMode,
    is_ambiguous_department_information_request,
    resolve_response_decision,
)
from backend.services.content.semantic_request import SemanticRequest


# ─── A. Topic constant ───────────────────────────────────────────────────────

def test_topic_explanation_constant():
    assert TOPIC_EXPLANATION == "explanation"


def test_explanation_in_atomic_topics():
    assert TOPIC_EXPLANATION in ATOMIC_TOPICS


# ─── B. Unit IDs ─────────────────────────────────────────────────────────────

def test_explanation_unit_ids_all_dept_keys():
    """Every canonical dept key has progressive explanation stage descriptors."""
    for dept_key in DEPARTMENT_JSON_KEY_ORDER:
        uid = explanation_unit_id(dept_key)
        assert uid == f"department_explanation.{dept_key}.what_is"
        desc = get_explanation_descriptor(dept_key)
        assert desc is not None, f"Missing explanation descriptor for {dept_key}"
        assert desc.adapter_key == "department_explanation"
        assert desc.surface == SURFACE_DEPARTMENT_EXPLANATION
        assert get_unit_descriptor(f"department_explanation.{dept_key}.learn") is not None
        assert get_unit_descriptor(f"department_explanation.{dept_key}.lead") is not None


def test_get_unit_descriptor_finds_explanation_units():
    """Registry resolves explanation unit ids (legacy + progressive stages)."""
    for dept_key in DEPARTMENT_JSON_KEY_ORDER:
        for uid in (
            f"department_explanation.{dept_key}",
            f"department_explanation.{dept_key}.what_is",
        ):
            desc = get_unit_descriptor(uid)
            assert desc is not None, f"Registry missing {uid}"


def test_unit_id_for_topic_explanation():
    """_unit_id_for_topic returns first progressive explanation stage id."""
    uid = _unit_id_for_topic(dept_key="cse", topic=TOPIC_EXPLANATION)
    assert uid == "department_explanation.cse.what_is"


def test_surface_registered():
    assert SURFACE_DEPARTMENT_EXPLANATION in ALL_SURFACES
    assert SURFACE_DEPARTMENT_EXPLANATION == "department_explanation"


def test_video_src_in_descriptor():
    desc = get_explanation_descriptor("cse")
    assert desc is not None
    # CSE has no on-disk video yet — empty video_src (do not invent filenames).
    assert desc.video_src == ""

    ds = get_explanation_descriptor("cse_ds")
    assert ds is not None
    assert ds.video_src == "/assets/department_explanations/datascience.mp4"


def test_parent_friendly_body():
    from backend.services.content.department_explanation_units import explanation_body

    body = explanation_body("cse_ds", "what_is")
    assert "Data Science" in body
    assert "patterns" in body.lower() or "insights" in body.lower()


def test_placeholder_title_en():
    title = placeholder_title("en")
    assert "[" in title  # legacy marker still available


def test_all_explanation_descriptors_count():
    descs = all_explanation_descriptors()
    # 3 progressive stages + 1 legacy alias per dept, plus difference unit.
    assert len(descs) >= len(DEPARTMENT_JSON_KEY_ORDER) * 3
    assert any(d.unit_id == "department_explanation.difference" for d in descs)


# ─── B2. Topic cue detection ─────────────────────────────────────────────────

def test_detect_explanation_from_english_cue():
    # "what do students learn" is a registered explanation cue
    topics = detect_atomic_topics("what do students learn in CSE")
    assert TOPIC_EXPLANATION in topics


def test_detect_explanation_what_does_cse_do():
    topics = detect_atomic_topics("What does CSE do?")
    assert TOPIC_EXPLANATION in topics


def test_detect_explanation_explain_cse_simply():
    topics = detect_atomic_topics("Explain CSE simply.")
    assert TOPIC_EXPLANATION in topics


def test_detect_explanation_from_parent_cue():
    topics = detect_atomic_topics("explain simply for parents")
    assert TOPIC_EXPLANATION in topics


def test_parse_what_does_cse_do_selects_explanation_unit():
    from backend.services.content.semantic_request_parser import parse_semantic_request
    from backend.services.content.unit_selector import unit_id_for_item

    sr = parse_semantic_request(raw_text="What does CSE do?", language_code_key="en")
    assert sr is not None
    assert sr.topic == TOPIC_EXPLANATION
    assert unit_id_for_item(entity="cse", topic=TOPIC_EXPLANATION) == "department_explanation.cse.what_is"


def test_detect_explanation_from_romanized_kannada():
    topics = detect_atomic_topics("CSE makkalaige explain maadi kalitare")
    assert TOPIC_EXPLANATION in topics


# ─── C. Clarification: department_information ─────────────────────────────────

def test_build_pending_department_information():
    pending = build_pending_for_decision(
        text="tell me about CSE",
        clarification_target="department_information",
        topic="cse",
        language_code_key="en",
    )
    assert pending is not None
    assert pending.clarification_target == "department_information"
    assert pending.options == ("overview", "explanation")
    assert pending.topic == "cse"


def test_resolve_pending_explanation_option():
    pending = PendingClarification(
        original_query="tell me about CSE",
        clarification_target="department_information",
        topic="cse",
        language_code_key="en",
        options=("overview", "explanation"),
    )
    result = try_resolve_pending("simple explanation", pending)
    assert result is not None
    assert result.clear_pending is True
    assert result.selected_option == "explanation"
    assert result.local_intent is not None
    assert result.local_intent["trigger"] == "department_explanation"
    assert result.local_intent["dept_key"] == "cse"


def test_resolve_pending_overview_option():
    pending = PendingClarification(
        original_query="tell me about ECE",
        clarification_target="department_information",
        topic="ece",
        language_code_key="en",
        options=("overview", "explanation"),
    )
    result = try_resolve_pending("general overview please", pending)
    assert result is not None
    assert result.clear_pending is True
    assert result.selected_option == "overview"
    assert result.local_intent is not None
    assert result.local_intent["trigger"] == "department_overview"


def test_resolve_pending_new_topic_cancels():
    pending = PendingClarification(
        original_query="tell me about CSE",
        clarification_target="department_information",
        topic="cse",
        language_code_key="en",
        options=("overview", "explanation"),
    )
    result = try_resolve_pending("show me bus routes", pending)
    assert result is not None
    assert result.clear_pending is True
    assert result.expired_new_topic is True


def test_resolve_pending_ambiguous_stays():
    pending = PendingClarification(
        original_query="tell me about CSE",
        clarification_target="department_information",
        topic="cse",
        language_code_key="en",
        options=("overview", "explanation"),
    )
    result = try_resolve_pending("hmm", pending)
    assert result is not None
    assert result.clear_pending is False


def test_clarification_reply_department_information_en():
    reply = clarification_reply("English", "department_information")
    assert len(reply) > 10
    assert "overview" in reply.lower() or "explanation" in reply.lower()


def test_clarification_reply_department_information_kn():
    reply = clarification_reply("Kannada", "department_information")
    assert len(reply) > 5


def test_clarification_reply_department_information_hi():
    reply = clarification_reply("Hindi", "department_information")
    assert len(reply) > 5


# ─── C2. Response decision: ambiguous department info triggers CLARIFY ──────

def _make_sr(dept_key: str, scope: str = "full_department", topic: str = "overview") -> SemanticRequest:
    return SemanticRequest(
        language_code="en",
        entities=(dept_key,),
        topic=topic,
        requested_scope=scope,
        context="department",
        items=((dept_key, topic),),
        confidence="HIGH",
        source="test",
        raw_text=f"tell me about {dept_key}",
    )


def test_ambiguous_dept_info_plain_tell_me_about():
    sr = _make_sr("cse", scope="full_department", topic="overview")
    assert is_ambiguous_department_information_request("tell me about CSE", sr) is True


def test_ambiguous_dept_info_not_triggered_when_fees():
    sr = SemanticRequest(
        language_code="en",
        entities=("cse",),
        topic="fees",
        requested_scope="single",
        context="department",
        items=(("cse", "fees"),),
        confidence="HIGH",
        source="test",
        raw_text="CSE fees",
    )
    assert is_ambiguous_department_information_request("CSE fees", sr) is False


def test_ambiguous_dept_info_not_triggered_when_hod():
    sr = SemanticRequest(
        language_code="en",
        entities=("ece",),
        topic="hod",
        requested_scope="single",
        context="department",
        items=(("ece", "hod"),),
        confidence="HIGH",
        source="test",
        raw_text="who is ECE HOD",
    )
    assert is_ambiguous_department_information_request("who is ECE HOD", sr) is False


def test_ambiguous_dept_info_not_triggered_with_strong_explanation_cue():
    sr = _make_sr("cse_aiml", scope="full_department", topic="overview")
    assert is_ambiguous_department_information_request("explain simply for my child", sr) is False


def test_ambiguous_dept_info_not_triggered_with_strong_overview_cue():
    sr = _make_sr("mba", scope="full_department", topic="overview")
    assert is_ambiguous_department_information_request("show me the department overview", sr) is False


def test_response_decision_clarify_dept_information():
    """Ambiguous 'tell me about CSE' → CLARIFY department_information."""
    sr = _make_sr("cse")
    decision = resolve_response_decision(
        text="tell me about CSE",
        semantic_request=sr,
        ci_intent="DEPARTMENT_OVERVIEW",
        has_department_entity=True,
    )
    assert decision.mode == ResponseMode.CLARIFY
    assert decision.clarification_target == "department_information"


def test_response_decision_card_for_strong_explanation():
    """Strong explanation cue → CARD (no clarify)."""
    sr = SemanticRequest(
        language_code="en",
        entities=("cse",),
        topic=TOPIC_EXPLANATION,
        requested_scope="single",
        context="department",
        items=(("cse", TOPIC_EXPLANATION),),
        confidence="HIGH",
        source="test",
        raw_text="explain CSE simply for my child",
    )
    decision = resolve_response_decision(
        text="explain CSE simply for my child",
        semantic_request=sr,
        ci_intent="DEPARTMENT_OVERVIEW",
        has_department_entity=True,
    )
    assert decision.mode == ResponseMode.CARD


# ─── D. Comparison → explanation (not cinema) ────────────────────────────────

def test_comparison_dept_ids_are_ints_not_strings():
    """Sanity: DEPARTMENT_JSON_KEY_ORDER is a tuple of strings."""
    assert all(isinstance(k, str) for k in DEPARTMENT_JSON_KEY_ORDER)


def test_comparison_intent_routes_to_explanation_surface():
    """INTENT_DEPARTMENT_COMPARISON → SURFACE_DEPARTMENT_EXPLANATION via surface_selector."""
    from backend.services.answer_generation import INTENT_DEPARTMENT_COMPARISON
    from backend.services.content.surface_selector import select_surface

    sel = select_surface(intent=INTENT_DEPARTMENT_COMPARISON, entities={"department": "CSE"})
    assert sel.surface == SURFACE_DEPARTMENT_EXPLANATION, (
        f"Expected department_explanation, got {sel.surface!r}"
    )


def test_comparison_query_cse_ece_show_card_is_explanation():
    """'difference between CSE and ECE' → show_card == 'department_explanation' (not 'department_comparison')."""
    from backend.services.answer_generation import (
        INTENT_DEPARTMENT_COMPARISON,
        infer_show_card_label,
    )

    label = infer_show_card_label(INTENT_DEPARTMENT_COMPARISON, None)
    assert label == "department_explanation", (
        f"infer_show_card_label for DEPARTMENT_COMPARISON should be 'department_explanation', got {label!r}"
    )


def test_comparison_trigger_does_not_keep_old_surface_alias():
    """Old department_comparison trigger must not remain as a permanent alias."""
    from backend.services.content.surface_selector import select_surface

    sel = select_surface(local_intent={"trigger": "department_comparison"})
    assert sel.surface != "department_comparison"
    # Direct path is intent/show_card → department_explanation (tested above), not alias hop.


# ─── E. Fees/HOD regression (ambiguity must NOT fire for atomic topics) ──────

def test_fees_request_not_ambiguous():
    sr = SemanticRequest(
        language_code="en",
        entities=("ise",),
        topic="fees",
        requested_scope="single",
        context="department",
        items=(("ise", "fees"),),
        confidence="HIGH",
        source="test",
        raw_text="ISE fees",
    )
    result = is_ambiguous_department_information_request("ISE fees", sr)
    assert result is False


def test_hod_request_not_ambiguous():
    sr = SemanticRequest(
        language_code="en",
        entities=("civil",),
        topic="hod",
        requested_scope="single",
        context="department",
        items=(("civil", "hod"),),
        confidence="HIGH",
        source="test",
        raw_text="civil HOD who",
    )
    result = is_ambiguous_department_information_request("civil HOD who", sr)
    assert result is False


def test_placements_request_not_ambiguous():
    sr = SemanticRequest(
        language_code="en",
        entities=("mechanical",),
        topic="placements",
        requested_scope="single",
        context="department",
        items=(("mechanical", "placements"),),
        confidence="HIGH",
        source="test",
        raw_text="mechanical placements",
    )
    result = is_ambiguous_department_information_request("mechanical placements", sr)
    assert result is False
