"""ContentUnitResolver — deterministic contextual unit resolution (M5.0)."""

from __future__ import annotations

from backend.services.content.content_unit import ContentUnit
from backend.services.content.content_unit_registry import (
    ContentUnitDescriptor,
    get_unit_descriptor,
)
from backend.services.content.diagnostics import content_event
from backend.services.content.resolver import ContentResolver
from backend.services.content.types import (
    SURFACE_DEPARTMENT_OVERVIEW,
    CanonicalContent,
    ContentSection,
    ResolveRequest,
)
from backend.services.content.validators import compute_unit_hash, validate_content_unit
from backend.services.narration_plan import dept_labels, _effective_lang
from backend.services.answer_generation import locale_file_id_for_lang_key

_SOURCE_VERSION = "m5.0"


def resolve_unit(
    *,
    unit_id: str,
    language: str,
    language_code: str,
    entity: str | None = None,
) -> ContentUnit | None:
    """Resolve one ContentUnit by globally unique unit_id."""
    descriptor = get_unit_descriptor(unit_id)
    if descriptor is None:
        content_event("CONTENT_UNIT_FAILED", unit_id=unit_id, reason="unknown_unit_id")
        return None

    content_event(
        "CONTENT_UNIT_REQUESTED",
        unit_id=unit_id,
        context=descriptor.context,
        context_id=descriptor.context_id,
        language_code=language_code,
    )

    unit: ContentUnit | None
    if descriptor.adapter_key == "department":
        unit = _resolve_department_unit(descriptor, language=language, language_code=language_code)
    elif descriptor.adapter_key == "fees":
        unit = _resolve_fees_overview(descriptor, language=language, language_code=language_code)
    elif descriptor.adapter_key == "documents":
        unit = _resolve_documents_unit(descriptor, language=language, language_code=language_code)
    else:
        content_event("CONTENT_UNIT_FAILED", unit_id=unit_id, reason="unsupported_adapter")
        return None

    if unit is None:
        content_event("CONTENT_UNIT_FAILED", unit_id=unit_id, reason="resolution_failed")
        return None

    validation = validate_content_unit(unit)
    if not validation.ok:
        content_event(
            "CONTENT_UNIT_FAILED",
            unit_id=unit_id,
            reason="validation_failed",
            failures=validation.failures,
        )
        return None

    content_event(
        "CONTENT_UNIT_RESOLVED",
        unit_id=unit_id,
        section_id=unit.section_id,
        context=unit.context,
        context_id=unit.context_id,
        content_hash=unit.content_hash,
        language_code=language_code,
    )
    return unit


def _resolve_department_unit(
    descriptor: ContentUnitDescriptor,
    *,
    language: str,
    language_code: str,
) -> ContentUnit | None:
    dept_key = descriptor.entity_id
    content = ContentResolver().resolve(
        ResolveRequest(
            surface=SURFACE_DEPARTMENT_OVERVIEW,
            department=dept_key,
            language=language,
            language_code=language_code,
        )
    )
    if content is None or content.metadata.get("mode") == "all":
        return None
    return _unit_from_department_content(descriptor, content)


def _unit_from_department_content(
    descriptor: ContentUnitDescriptor,
    content: CanonicalContent,
) -> ContentUnit | None:
    by_id = {s.id: s for s in content.sections}
    sec = by_id.get(descriptor.section_id)
    if sec is None:
        return None

    locale_id = locale_file_id_for_lang_key(content.language_code)
    lk = _effective_lang(locale_id)
    labels = dept_labels(lk)

    if descriptor.section_id == "intro":
        title = (content.title or sec.title or "").strip() or labels["department"]
    else:
        label_key = {
            "hod_voice": "hodAndVision",
            "achievements": "achievements",
            "placement": "placements",
            "fees": "fees",
        }.get(descriptor.section_id)
        title = labels[label_key] if label_key else sec.title

    body = (sec.body or "").strip() or labels["notAvail"]
    summary = body[:200] if body else title

    unit_hash = compute_unit_hash(
        unit_id=descriptor.unit_id,
        context=descriptor.context,
        context_id=descriptor.context_id,
        section_id=descriptor.section_id,
        body=body,
        language_code=content.language_code,
        canonical_source=descriptor.canonical_source,
    )

    return ContentUnit(
        unit_id=descriptor.unit_id,
        surface=descriptor.surface,
        content_type=descriptor.content_type,
        entity_type=descriptor.entity_type,
        entity_id=descriptor.entity_id,
        context=descriptor.context,
        context_id=descriptor.context_id,
        section_id=descriptor.section_id,
        title=title,
        summary=summary,
        body=body,
        language=content.language,
        language_code=content.language_code,
        canonical_source=descriptor.canonical_source,
        source_version=_SOURCE_VERSION,
        content_hash=unit_hash,
        metadata={"department": descriptor.entity_id},
        keywords=(descriptor.entity_id, descriptor.unit_suffix),
        presentation_capabilities=("dept_slide",),
    )


def _resolve_fees_overview(
    descriptor: ContentUnitDescriptor,
    *,
    language: str,
    language_code: str,
) -> ContentUnit | None:
    from backend.services.content.types import SURFACE_DEPARTMENT_FEES

    content = ContentResolver().resolve(
        ResolveRequest(
            surface=SURFACE_DEPARTMENT_FEES,
            language=language,
            language_code=language_code,
        )
    )
    if content is None:
        return None
    body = "\n".join(f"{s.title}: {s.body}" for s in content.sections).strip()
    return _unit_from_aggregate_content(descriptor, content, body=body, title=content.title)


def _resolve_documents_unit(
    descriptor: ContentUnitDescriptor,
    *,
    language: str,
    language_code: str,
) -> ContentUnit | None:
    from backend.services.content.types import SURFACE_DOCUMENTS

    content = ContentResolver().resolve(
        ResolveRequest(
            surface=SURFACE_DOCUMENTS,
            language=language,
            language_code=language_code,
        )
    )
    if content is None:
        return None
    body = "\n".join(f"{i + 1}. {s.body}" for i, s in enumerate(content.sections)).strip()
    title = content.title
    return _unit_from_aggregate_content(descriptor, content, body=body, title=title)


def _unit_from_aggregate_content(
    descriptor: ContentUnitDescriptor,
    content: CanonicalContent,
    *,
    body: str,
    title: str,
) -> ContentUnit:
    unit_hash = compute_unit_hash(
        unit_id=descriptor.unit_id,
        context=descriptor.context,
        context_id=descriptor.context_id,
        section_id=descriptor.section_id,
        body=body,
        language_code=content.language_code,
        canonical_source=descriptor.canonical_source,
    )
    return ContentUnit(
        unit_id=descriptor.unit_id,
        surface=descriptor.surface,
        content_type=descriptor.content_type,
        entity_type=descriptor.entity_type,
        entity_id=descriptor.entity_id,
        context=descriptor.context,
        context_id=descriptor.context_id,
        section_id=descriptor.section_id,
        title=title,
        summary=(content.summary or title)[:200],
        body=body,
        language=content.language,
        language_code=content.language_code,
        canonical_source=descriptor.canonical_source,
        source_version=_SOURCE_VERSION,
        content_hash=unit_hash,
        metadata=dict(content.metadata or {}),
        keywords=tuple(content.keywords or ()),
        presentation_capabilities=(),
    )


def build_unit_from_section(
    *,
    descriptor: ContentUnitDescriptor,
    content: CanonicalContent,
    section: ContentSection,
    lang_key: str,
) -> ContentUnit:
    """Build a ContentUnit from an already-resolved department CanonicalContent section."""
    locale_id = locale_file_id_for_lang_key(lang_key)
    lk = _effective_lang(locale_id)
    labels = dept_labels(lk)

    if descriptor.section_id == "intro":
        title = (content.title or section.title or "").strip() or labels["department"]
    else:
        label_key = {
            "hod_voice": "hodAndVision",
            "achievements": "achievements",
            "placement": "placements",
            "fees": "fees",
        }.get(descriptor.section_id)
        title = labels[label_key] if label_key else section.title

    body = (section.body or "").strip() or labels["notAvail"]
    summary = body[:200] if body else title
    unit_hash = compute_unit_hash(
        unit_id=descriptor.unit_id,
        context=descriptor.context,
        context_id=descriptor.context_id,
        section_id=descriptor.section_id,
        body=body,
        language_code=content.language_code,
        canonical_source=descriptor.canonical_source,
    )
    return ContentUnit(
        unit_id=descriptor.unit_id,
        surface=descriptor.surface,
        content_type=descriptor.content_type,
        entity_type=descriptor.entity_type,
        entity_id=descriptor.entity_id,
        context=descriptor.context,
        context_id=descriptor.context_id,
        section_id=descriptor.section_id,
        title=title,
        summary=summary,
        body=body,
        language=content.language,
        language_code=content.language_code,
        canonical_source=descriptor.canonical_source,
        source_version=_SOURCE_VERSION,
        content_hash=unit_hash,
        metadata={"department": descriptor.entity_id},
        keywords=(descriptor.entity_id, descriptor.unit_suffix),
        presentation_capabilities=("dept_slide",),
    )
