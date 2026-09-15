"""UnitSelector — deterministic selection of ContentUnit IDs from SemanticRequest (M5.1)."""

from __future__ import annotations

import hashlib
import json
import uuid
from typing import Sequence

from backend.services.content.content_unit_registry import (
    get_unit_descriptor,
    list_department_unit_descriptors,
)
from backend.services.content.content_unit_resolver import resolve_unit
from backend.services.content.content_unit import ContentUnit
from backend.services.content.campus_units import (
    fest_deck_unit_ids,
    hostel_deck_unit_ids,
    hostel_gender_from_entity,
    is_campus_entity,
    is_fest_deck_entity,
    is_hostel_overview_unit_id,
    is_ncc_overview_unit_id,
    ncc_deck_unit_ids,
    unit_id_for_campus_item,
)
from backend.services.content.placement_units import (
    is_placement_introduction_unit_id,
    placement_deck_unit_ids,
)
from backend.services.content.leadership_units import (
    LEADERSHIP_ENTITY,
    is_leadership_topic,
    unit_id_for_leadership_topic,
)
from backend.services.content.global_units import is_global_entity, unit_id_for_global_item
from backend.services.content.multilingual_terms import (
    TOPIC_ACHIEVEMENTS,
    TOPIC_EXPLANATION,
    TOPIC_FEES,
    TOPIC_HOD,
    TOPIC_OVERVIEW,
    TOPIC_PLACEMENTS,
)
from backend.services.content.semantic_request import SemanticRequest
from backend.services.presentation.presentation_plan import PresentationPlan
from backend.services.presentation.presentation_policy import PresentationPolicy


_PLANNER_VERSION = "m5.10-partial-unit-preserving-selector"


def _compute_plan_hash(*, units: Sequence[str], surface: str) -> str:
    payload = {"units": list(units), "surface": surface, "planner_version": _PLANNER_VERSION}
    raw = json.dumps(payload, sort_keys=True, ensure_ascii=True)
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:32]


def _unit_id_for_topic(*, dept_key: str, topic: str) -> str | None:
    # Explanation expands to progressive stage units in select_content_units.
    # Return the first stage id as the primary selectable identity.
    if topic == TOPIC_EXPLANATION:
        return f"department_explanation.{dept_key}.what_is"
    suffix_map = {
        TOPIC_OVERVIEW: "overview",
        TOPIC_HOD: "hod",
        TOPIC_FEES: "fees",
        TOPIC_ACHIEVEMENTS: "achievements",
        TOPIC_PLACEMENTS: "placements",
        "faculty": "faculty",
    }
    suffix = suffix_map.get(topic)
    if not suffix:
        return None
    return f"{dept_key}.{suffix}"


def _unit_id_for_item(*, entity: str, topic: str) -> str | None:
    """Map one (entity, topic) pair to a registered unit id. No pairwise special cases."""
    if is_global_entity(entity):
        uid = unit_id_for_global_item(entity, topic)
        return uid if uid and get_unit_descriptor(uid) is not None else None
    if is_campus_entity(entity) or (entity or "").startswith("events.") or (entity or "").startswith("hostel."):
        uid = unit_id_for_campus_item(entity, topic)
        if uid and get_unit_descriptor(uid) is not None:
            return uid
        return None
    if is_leadership_topic(topic) or (entity or "").strip().lower() == LEADERSHIP_ENTITY:
        uid = unit_id_for_leadership_topic(topic)
        if uid and get_unit_descriptor(uid) is not None:
            return uid
        return None
    uid = _unit_id_for_topic(dept_key=entity, topic=topic)
    if uid and get_unit_descriptor(uid) is not None:
        return uid
    return None


def unit_id_for_item(*, entity: str, topic: str) -> str | None:
    """Public map of one (entity, topic) pair to a registered unit id."""
    return _unit_id_for_item(entity=entity, topic=topic)


def semantic_fallback_reason(semantic_request: SemanticRequest | None) -> str | None:
    """Explain why deterministic card selection cannot complete.

    Parsing and registration are deliberately separate: a known concept such as
    ``faculty`` must not become ``overview`` merely because this deployment has no
    faculty ContentUnit/data.
    """
    if semantic_request is None:
        return "UNKNOWN_INTENT"
    if semantic_request.confidence not in {"HIGH", "MEDIUM"}:
        return "LOW_CONFIDENCE"
    if not semantic_request.unit_items:
        return "MISSING_CARD_TYPE"
    if not semantic_request.entities and semantic_request.context == "department":
        return "MISSING_DEPARTMENT"
    if any(
        _unit_id_for_item(entity=entity, topic=topic) is None
        for entity, topic in semantic_request.unit_items
    ):
        return "CARD_NOT_REGISTERED"
    return None


def select_content_units(
    semantic_request: SemanticRequest,
    *,
    surface: str = "department_overview",
) -> PresentationPlan | None:
    """
    Deterministically select content unit IDs required by semantic_request.

    - Never mutates CI intent values.
    - No RAG/LLM.
    - N items → N units. No hidden card cap, no hardcoded pair families.
    """
    if not semantic_request:
        return None
    if semantic_request.confidence not in {"HIGH", "MEDIUM"}:
        return None

    items = semantic_request.unit_items
    if not items:
        return None

    unit_ids: list[str] = []

    if semantic_request.requested_scope == "full_department":
        # Full-department deck stays atomic: one entity, overview only, never mixed.
        if len(items) != 1:
            return None
        dept_key, topic = items[0]
        if topic != TOPIC_OVERVIEW or is_leadership_topic(topic):
            return None
        descriptors = list_department_unit_descriptors(dept_key)
        unit_ids = [d.unit_id for d in descriptors]
    else:
        # N compatible (entity, topic) pairs → N independently addressable units,
        # in user order. No first-only, no family lock, no arbitrary cap.
        # Hostel gendered overview expands to the fixed 4-card deck once.
        # NCC overview expands to overview → leadership → training → benefits once.
        seen: set[str] = set()
        unresolved_items: list[tuple[str, str]] = []
        hostel_deck_expanded = False
        ncc_deck_expanded = False
        fest_deck_expanded = False
        placement_deck_expanded = False
        explanation_depts: list[str] = []
        for entity, topic in items:
            # Progressive department explanation: expand one topic → three stage units.
            if (topic or "").strip().lower() == TOPIC_EXPLANATION:
                from backend.services.content.department_explanation_units import (
                    explanation_stage_unit_ids,
                )

                dept_key = (entity or "").strip().lower()
                stage_ids = explanation_stage_unit_ids(dept_key)
                if not stage_ids or get_unit_descriptor(stage_ids[0]) is None:
                    unresolved_items.append((entity, topic))
                    continue
                for stage_uid in stage_ids:
                    if stage_uid in seen:
                        continue
                    if get_unit_descriptor(stage_uid) is None:
                        continue
                    seen.add(stage_uid)
                    unit_ids.append(stage_uid)
                if dept_key and dept_key not in explanation_depts:
                    explanation_depts.append(dept_key)
                continue

            # Bare "fests / college events" entity expands to the fixed fest deck once.
            if (
                not fest_deck_expanded
                and is_fest_deck_entity(entity)
                and (topic or "").strip().lower() in {"overview", "event", ""}
                and len(items) == 1
            ):
                for deck_uid in fest_deck_unit_ids():
                    if deck_uid in seen:
                        continue
                    if get_unit_descriptor(deck_uid) is None:
                        continue
                    seen.add(deck_uid)
                    unit_ids.append(deck_uid)
                fest_deck_expanded = True
                continue

            uid = _unit_id_for_item(entity=entity, topic=topic)
            if not uid:
                unresolved_items.append((entity, topic))
                continue
            if (
                not hostel_deck_expanded
                and is_hostel_overview_unit_id(uid)
                and (topic or "").strip().lower() in {"overview", "warden", "rooms", ""}
                and len(items) == 1
            ):
                gender = hostel_gender_from_entity(entity) or (
                    "boys" if uid.startswith("hostel.boys.") else "girls"
                )
                # Warden/rooms follow-ups stay on overview only (not full deck).
                if (topic or "").strip().lower() in {"warden", "rooms"}:
                    if uid not in seen:
                        seen.add(uid)
                        unit_ids.append(uid)
                    continue
                for deck_uid in hostel_deck_unit_ids(gender):
                    if deck_uid in seen:
                        continue
                    if get_unit_descriptor(deck_uid) is None:
                        continue
                    seen.add(deck_uid)
                    unit_ids.append(deck_uid)
                hostel_deck_expanded = True
                continue
            if (
                not ncc_deck_expanded
                and is_ncc_overview_unit_id(uid)
                and (topic or "").strip().lower() in {"overview", ""}
                and len(items) == 1
            ):
                for deck_uid in ncc_deck_unit_ids():
                    if deck_uid in seen:
                        continue
                    if get_unit_descriptor(deck_uid) is None:
                        continue
                    seen.add(deck_uid)
                    unit_ids.append(deck_uid)
                ncc_deck_expanded = True
                continue
            if (
                not placement_deck_expanded
                and is_placement_introduction_unit_id(uid)
                and (topic or "").strip().lower()
                in {"introduction", "overview", "placements", "placement", ""}
                and len(items) == 1
            ):
                for deck_uid in placement_deck_unit_ids():
                    if deck_uid in seen:
                        continue
                    if get_unit_descriptor(deck_uid) is None:
                        continue
                    seen.add(deck_uid)
                    unit_ids.append(deck_uid)
                placement_deck_expanded = True
                continue
            if uid in seen:
                continue
            seen.add(uid)
            unit_ids.append(uid)

        # Multi-department explanation → append parent-friendly difference unit.
        if len(explanation_depts) >= 2:
            diff_uid = "department_explanation.difference"
            if diff_uid not in seen and get_unit_descriptor(diff_uid) is not None:
                seen.add(diff_uid)
                unit_ids.append(diff_uid)

    if not unit_ids:
        return None

    order = tuple(range(len(unit_ids)))
    planner_policy = PresentationPolicy.SINGLE_UNIT if len(unit_ids) == 1 else PresentationPolicy.MULTI_UNIT
    plan_hash = _compute_plan_hash(units=unit_ids, surface=surface)
    return PresentationPlan(
        presentation_id=str(uuid.uuid4()),
        turn_id="m5.1-unit-selection",
        surface=surface,
        units=tuple(unit_ids),
        order=order,
        language=semantic_request.language_code,
        language_code=semantic_request.language_code,
        presentation_policy=planner_policy,
        planner_version=_PLANNER_VERSION,
        plan_hash=plan_hash,
        unresolved_items=tuple(unresolved_items) if semantic_request.requested_scope != "full_department" else (),
    )


def resolve_units_for_plan(plan: PresentationPlan) -> tuple[ContentUnit, ...]:
    resolved: list[ContentUnit] = []
    for unit_id in plan.units:
        u = resolve_unit(
            unit_id=unit_id,
            language=plan.language,
            language_code=plan.language_code,
        )
        if u is not None:
            resolved.append(u)
    return tuple(resolved)
