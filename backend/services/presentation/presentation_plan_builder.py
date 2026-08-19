"""PresentationPlanBuilder — sole owner of PresentationPlan construction (M5.0)."""

from __future__ import annotations

import hashlib
import json
import re
import uuid
from typing import Sequence

from backend.services.content.content_unit import ContentUnit
from backend.services.content.content_unit_registry import (
    list_department_unit_descriptors,
    section_ids_for_department,
)
from backend.services.content.content_unit_resolver import resolve_unit
from backend.services.content.diagnostics import content_event
from backend.services.presentation.diagnostics import presentation_event
from backend.services.presentation.presentation_plan import PresentationPlan
from backend.services.presentation.presentation_policy import PresentationPolicy

PLANNER_VERSION = "m5.0-fixture"

# Deterministic keyword fixtures — no NLP in M5.0.
_FIXTURE_RULES: tuple[tuple[tuple[str, ...], tuple[str, ...]], ...] = (
    (("tell me about cse", "about cse department", "cse department overview"), (
        "cse.overview",
        "cse.hod",
        "cse.achievements",
        "cse.placements",
        "cse.fees",
    )),
    (("cse fees", "tell me cse fees"), ("cse.fees",)),
    (("who is the hod of cse", "hod of cse"), ("cse.hod",)),
    (("who are the hods of cse and aiml", "hod of cse and aiml", "hods of cse and aiml"), (
        "cse.hod",
        "cse_aiml.hod",
    )),
    (("show me fees for all departments", "fees for all departments"), ("fees.overview",)),
    (("show me fees",), ("fees.overview",)),
    (
        ("what documents are required for admission", "documents required for admission"),
        ("admission.documents_required",),
    ),
)


def _normalize_query(query: str) -> str:
    return re.sub(r"\s+", " ", (query or "").strip().lower())


def compute_plan_hash(
    *,
    unit_ids: Sequence[str],
    language_code: str,
    surface: str,
    planner_version: str = PLANNER_VERSION,
) -> str:
    payload = {
        "units": list(unit_ids),
        "language_code": language_code,
        "surface": surface,
        "planner_version": planner_version,
    }
    raw = json.dumps(payload, sort_keys=True, ensure_ascii=True)
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:32]


def build_full_department_plan(
    *,
    dept_key: str,
    turn_id: str,
    language: str,
    language_code: str,
    surface: str = "department_overview",
) -> PresentationPlan:
    descriptors = list_department_unit_descriptors(dept_key)
    unit_ids = tuple(d.unit_id for d in descriptors)
    order = tuple(range(len(unit_ids)))
    plan_hash = compute_plan_hash(
        unit_ids=unit_ids,
        language_code=language_code,
        surface=surface,
    )
    plan = PresentationPlan(
        presentation_id=str(uuid.uuid4()),
        turn_id=turn_id,
        surface=surface,
        units=unit_ids,
        order=order,
        language=language,
        language_code=language_code,
        presentation_policy=PresentationPolicy.MULTI_UNIT,
        planner_version=PLANNER_VERSION,
        plan_hash=plan_hash,
    )
    presentation_event(
        "PRESENTATION_PLAN_CREATED",
        turn_id=turn_id,
        presentation_id=plan.presentation_id,
        unit_ids=list(unit_ids),
        planner_version=PLANNER_VERSION,
        plan_hash=plan_hash,
    )
    return plan


def build_plan_from_fixture(
    query: str,
    *,
    turn_id: str,
    language: str,
    language_code: str,
    surface: str = "",
) -> PresentationPlan | None:
    normalized = _normalize_query(query)
    unit_ids: tuple[str, ...] | None = None
    for patterns, ids in _FIXTURE_RULES:
        if any(p in normalized for p in patterns):
            unit_ids = ids
            break

    if unit_ids is None:
        presentation_event(
            "PRESENTATION_PLAN_REJECTED",
            turn_id=turn_id,
            query=query,
            reason="no_fixture_match",
        )
        return None

    inferred_surface = surface or _infer_surface(unit_ids)
    order = tuple(range(len(unit_ids)))
    plan_hash = compute_plan_hash(
        unit_ids=unit_ids,
        language_code=language_code,
        surface=inferred_surface,
    )
    plan = PresentationPlan(
        presentation_id=str(uuid.uuid4()),
        turn_id=turn_id,
        surface=inferred_surface,
        units=unit_ids,
        order=order,
        language=language,
        language_code=language_code,
        presentation_policy=_policy_for_units(unit_ids),
        planner_version=PLANNER_VERSION,
        plan_hash=plan_hash,
    )
    presentation_event(
        "PRESENTATION_PLAN_CREATED",
        turn_id=turn_id,
        presentation_id=plan.presentation_id,
        unit_ids=list(unit_ids),
        planner_version=PLANNER_VERSION,
        plan_hash=plan_hash,
        query=query,
    )
    return plan


def _infer_surface(unit_ids: Sequence[str]) -> str:
    if not unit_ids:
        return ""
    first = unit_ids[0]
    if first == "fees.overview":
        return "department_fees"
    if first in ("documents.overview", "admission.documents_required"):
        return "documents"
    if "." in first:
        return "department_overview"
    return ""


def _policy_for_units(unit_ids: Sequence[str]) -> PresentationPolicy:
    if len(unit_ids) == 1:
        return PresentationPolicy.SINGLE_UNIT
    return PresentationPolicy.MULTI_UNIT


def resolve_plan_units(plan: PresentationPlan) -> tuple[ContentUnit, ...]:
    ordered = [plan.units[i] for i in plan.order]
    resolved: list[ContentUnit] = []
    for unit_id in ordered:
        unit = resolve_unit(
            unit_id=unit_id,
            language=plan.language,
            language_code=plan.language_code,
        )
        if unit is None:
            content_event(
                "CONTENT_UNIT_FAILED",
                unit_id=unit_id,
                reason="plan_resolution_failed",
                turn_id=plan.turn_id,
            )
            continue
        resolved.append(unit)
    return tuple(resolved)


def full_department_unit_ids(dept_key: str) -> tuple[str, ...]:
    return tuple(d.unit_id for d in list_department_unit_descriptors(dept_key))


def department_section_ids() -> tuple[str, ...]:
    return section_ids_for_department()
