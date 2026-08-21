"""Scoped person-unit follow-up. Does not invent biographies or duplicate cards."""

from __future__ import annotations

from backend.services.content.content_unit_registry import get_unit_descriptor
from backend.services.content.leadership_units import LEADERSHIP_ENTITY, LEADERSHIP_UNIT_IDS
from backend.services.content.semantic_composition import SemanticItem


def is_person_unit_id(unit_id: str) -> bool:
    uid = (unit_id or "").strip().lower()
    if not uid:
        return False
    return uid.endswith(".hod") or uid in LEADERSHIP_UNIT_IDS


def last_person_unit_from_ids(unit_ids: tuple[str, ...] | list[str] | None) -> str | None:
    people = [str(u).strip() for u in (unit_ids or ()) if is_person_unit_id(str(u))]
    if len(people) != 1:
        return None
    return people[0]


def semantic_item_for_person_unit(unit_id: str) -> SemanticItem | None:
    uid = (unit_id or "").strip()
    if not is_person_unit_id(uid):
        return None
    desc = get_unit_descriptor(uid)
    if desc is None:
        return None
    if desc.entity_type == "department":
        return SemanticItem(entity=desc.entity_id, topic="hod")
    return SemanticItem(entity=LEADERSHIP_ENTITY, topic=desc.unit_suffix)
