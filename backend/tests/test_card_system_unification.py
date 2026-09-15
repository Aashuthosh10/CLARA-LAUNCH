"""Unit tests for progressive department explanation + About Me card units."""

from __future__ import annotations

from backend.services.content.department_explanation_units import (
    build_parent_friendly_difference,
    explanation_body,
    explanation_stage_unit_ids,
    get_explanation_descriptor,
    video_src_for_dept,
)
from backend.services.content.about_me_units import build_about_me_narration_segments
from backend.services.content.surface_narration_mapper import map_content_units_to_segments
from backend.services.content.content_unit_resolver import resolve_unit
from backend.services.content.unit_selector import select_content_units
from backend.services.content.semantic_request import SemanticRequest


def test_only_existing_videos_are_mapped():
    assert video_src_for_dept("cse_ds") == "/assets/department_explanations/datascience.mp4"
    assert video_src_for_dept("cse_cysec") == "/assets/department_explanations/cyber_security.mp4"
    assert video_src_for_dept("ece") == "/assets/department_explanations/ece.mp4"
    assert video_src_for_dept("cse_bs") == "/assets/department_explanations/business_studies.mp4"
    assert video_src_for_dept("cse") == ""
    assert video_src_for_dept("cse_aiml") == ""


def test_progressive_stage_unit_ids():
    assert explanation_stage_unit_ids("cse_ds") == (
        "department_explanation.cse_ds.what_is",
        "department_explanation.cse_ds.learn",
        "department_explanation.cse_ds.lead",
    )


def test_parent_friendly_ds_aiml_difference():
    text = build_parent_friendly_difference("cse_ds", "cse_aiml")
    assert "Data Science" in text
    assert "Machine Learning" in text or "AI" in text
    assert "Simply put" in text


def test_resolve_explanation_stage_has_body_and_optional_video():
    unit = resolve_unit(
        unit_id="department_explanation.cse_ds.what_is",
        language="English",
        language_code="en",
    )
    assert unit is not None
    assert "Official explanation pending" not in (unit.body or "")
    assert "Data Science" in (unit.body or "") or "What is it" in (unit.body or "")
    assert unit.metadata.get("video_src") == "/assets/department_explanations/datascience.mp4"
    assert unit.metadata.get("stage") == "what_is"


def test_selector_expands_explanation_to_three_stages_plus_difference():
    sr = SemanticRequest(
        language_code="en",
        entities=("cse_ds", "cse_aiml"),
        topic="explanation",
        requested_scope="single",
        context="department",
        items=(("cse_ds", "explanation"), ("cse_aiml", "explanation")),
        confidence="MEDIUM",
        source="test",
        raw_text="Explain Data Science and AI ML",
    )
    plan = select_content_units(sr, surface="department_explanation")
    assert plan is not None
    units = list(plan.units)
    assert "department_explanation.cse_ds.what_is" in units
    assert "department_explanation.cse_ds.learn" in units
    assert "department_explanation.cse_ds.lead" in units
    assert "department_explanation.cse_aiml.what_is" in units
    assert "department_explanation.difference" in units
    assert "department_explanation" not in units


def test_multi_explanation_segments_include_stages():
    ds = resolve_unit(
        unit_id="department_explanation.cse_ds.what_is", language="English", language_code="en"
    )
    learn = resolve_unit(
        unit_id="department_explanation.cse_ds.learn", language="English", language_code="en"
    )
    lead = resolve_unit(
        unit_id="department_explanation.cse_ds.lead", language="English", language_code="en"
    )
    assert ds and learn and lead
    segs = map_content_units_to_segments((ds, learn, lead), lang_key="en")
    assert [s.unit_id for s in segs] == [
        "department_explanation.cse_ds.what_is",
        "department_explanation.cse_ds.learn",
        "department_explanation.cse_ds.lead",
    ]


def test_creator_units_stable_ids():
    segs = build_about_me_narration_segments(section="creators")
    assert [s.unit_id for s in segs] == [
        "about_me.creator.aashuthosh",
        "about_me.creator.adithya_nc",
        "about_me.creator.dhanush_sridhar_babu",
        "about_me.creator.naveen_kumar",
    ]
    assert explanation_body("cse_ds", "what_is")
    assert get_explanation_descriptor("cse_ds") is not None
