"""ContentUnitRegistry — authoritative map of independently addressable units (M5.0)."""

from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache

from backend.services.answer_generation import DEPARTMENT_JSON_KEY_ORDER
from backend.services.content.types import (
    SURFACE_ADMISSIONS,
    SURFACE_DEPARTMENT_FEES,
    SURFACE_DEPARTMENT_OVERVIEW,
    SURFACE_DOCUMENTS,
    ContentType,
)
from backend.services.narration_plan import _DEPT_SLIDE_SECTION_IDS

# section_id → unit_id suffix (topic within entity)
_SECTION_TO_UNIT_SUFFIX: dict[str, str] = {
    "intro": "overview",
    "hod_voice": "hod",
    "achievements": "achievements",
    "placement": "placements",
    "fees": "fees",
}

_DEPT_CANONICAL_SOURCE = "backend/data/locales/*.json#departments"
_FEES_CANONICAL_SOURCE = "backend/services/narration_plan.py#_FEES_AMOUNT_BY_KEY"
_DOCUMENTS_CANONICAL_SOURCE = "backend/services/narration_plan.py#DOCUMENT_ITEMS"


@dataclass(frozen=True)
class ContentUnitDescriptor:
    unit_id: str
    surface: str
    content_type: str
    entity_type: str
    entity_id: str
    context: str
    context_id: str
    section_id: str
    unit_suffix: str
    canonical_source: str
    adapter_key: str
    supported_languages: tuple[str, ...] = ("en", "hi", "kn", "ta", "te", "ml")
    presentation_role: str = ""


def _department_descriptor(dept_key: str, section_id: str) -> ContentUnitDescriptor:
    suffix = _SECTION_TO_UNIT_SUFFIX[section_id]
    return ContentUnitDescriptor(
        unit_id=f"{dept_key}.{suffix}",
        surface=SURFACE_DEPARTMENT_OVERVIEW,
        content_type=ContentType.DEPARTMENT.value,
        entity_type="department",
        entity_id=dept_key,
        context="department",
        context_id=dept_key,
        section_id=section_id,
        unit_suffix=suffix,
        canonical_source=_DEPT_CANONICAL_SOURCE,
        adapter_key="department",
        presentation_role=suffix,
    )


_CONTEXT_SCOPED_DESCRIPTORS: tuple[ContentUnitDescriptor, ...] = (
    ContentUnitDescriptor(
        unit_id="fees.overview",
        surface=SURFACE_DEPARTMENT_FEES,
        content_type=ContentType.FEES.value,
        entity_type="",
        entity_id="",
        context="global",
        context_id="fees",
        section_id="overview",
        unit_suffix="overview",
        canonical_source=_FEES_CANONICAL_SOURCE,
        adapter_key="fees",
        presentation_role="overview",
    ),
    ContentUnitDescriptor(
        unit_id="documents.overview",
        surface=SURFACE_DOCUMENTS,
        content_type=ContentType.DOCUMENTS.value,
        entity_type="",
        entity_id="",
        context="global",
        context_id="documents",
        section_id="overview",
        unit_suffix="overview",
        canonical_source=_DOCUMENTS_CANONICAL_SOURCE,
        adapter_key="documents",
        presentation_role="overview",
    ),
    ContentUnitDescriptor(
        unit_id="admission.documents_required",
        surface=SURFACE_DOCUMENTS,
        content_type=ContentType.DOCUMENTS.value,
        entity_type="",
        entity_id="",
        context="admission",
        context_id="admission",
        section_id="documents_required",
        unit_suffix="documents_required",
        canonical_source=_DOCUMENTS_CANONICAL_SOURCE,
        adapter_key="documents",
        presentation_role="checklist",
    ),
)


@lru_cache(maxsize=1)
def _all_descriptors_by_id() -> dict[str, ContentUnitDescriptor]:
    out: dict[str, ContentUnitDescriptor] = {}
    for dept_key in DEPARTMENT_JSON_KEY_ORDER:
        for section_id in _DEPT_SLIDE_SECTION_IDS:
            desc = _department_descriptor(dept_key, section_id)
            out[desc.unit_id] = desc
    for desc in _CONTEXT_SCOPED_DESCRIPTORS:
        out[desc.unit_id] = desc
    return out


def list_department_unit_descriptors(dept_key: str) -> tuple[ContentUnitDescriptor, ...]:
    key = (dept_key or "").strip().lower()
    if key not in DEPARTMENT_JSON_KEY_ORDER:
        return ()
    return tuple(_department_descriptor(key, sid) for sid in _DEPT_SLIDE_SECTION_IDS)


def list_context_scoped_descriptors(context: str) -> tuple[ContentUnitDescriptor, ...]:
    ctx = (context or "").strip().lower()
    return tuple(d for d in _CONTEXT_SCOPED_DESCRIPTORS if d.context == ctx)


def get_unit_descriptor(unit_id: str) -> ContentUnitDescriptor | None:
    uid = (unit_id or "").strip()
    if not uid:
        return None
    return _all_descriptors_by_id().get(uid)


def unit_id_for(dept_key: str, section_id: str) -> str | None:
    key = (dept_key or "").strip().lower()
    sid = (section_id or "").strip()
    suffix = _SECTION_TO_UNIT_SUFFIX.get(sid)
    if not suffix or key not in DEPARTMENT_JSON_KEY_ORDER:
        return None
    return f"{key}.{suffix}"


def all_unit_descriptors() -> tuple[ContentUnitDescriptor, ...]:
    return tuple(_all_descriptors_by_id().values())


def section_ids_for_department() -> tuple[str, ...]:
    return _DEPT_SLIDE_SECTION_IDS


def unit_suffix_for_section(section_id: str) -> str | None:
    return _SECTION_TO_UNIT_SUFFIX.get((section_id or "").strip())
