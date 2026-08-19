"""ContentResolver — resolve ownership only; never generate/translate/summarize."""

from __future__ import annotations

from backend.services.answer_generation import (
    INTENT_ADMISSIONS,
    INTENT_BUS_ROUTES,
    INTENT_COLLEGE_OVERVIEW,
    INTENT_COURSE_MENU,
    INTENT_DEPARTMENT_COMPARISON,
    INTENT_DEPARTMENT_FEES,
    INTENT_DEPARTMENT_OVERVIEW,
    INTENT_DOCUMENTS,
    INTENT_HOD_PROFILE,
    INTENT_PLACEMENTS,
    INTENT_PRINCIPAL_PROFILE,
    INTENT_TRUSTEES_PROFILE,
    INTENT_VICE_PRINCIPAL_PROFILE,
)
from backend.services.content.adapters import get_adapter
from backend.services.content.cache import cache_get, cache_put, make_cache_key
from backend.services.content.diagnostics import content_event
from backend.services.content.registry import get_owner
from backend.services.content.types import (
    SURFACE_ADMISSIONS,
    SURFACE_BUS,
    SURFACE_COLLEGE,
    SURFACE_COMPARISON,
    SURFACE_COURSE_MENU,
    SURFACE_DEPARTMENT_FEES,
    SURFACE_DEPARTMENT_OVERVIEW,
    SURFACE_DOCUMENTS,
    SURFACE_FAQ,
    SURFACE_HOD,
    SURFACE_PLACEMENTS,
    SURFACE_PRINCIPAL,
    SURFACE_TRUSTEES,
    SURFACE_VICE_PRINCIPAL,
    CanonicalContent,
    ResolveRequest,
)
from backend.services.content.validators import validate_canonical_content

_INTENT_TO_SURFACE: dict[str, str] = {
    INTENT_DEPARTMENT_OVERVIEW: SURFACE_DEPARTMENT_OVERVIEW,
    INTENT_DEPARTMENT_FEES: SURFACE_DEPARTMENT_FEES,
    INTENT_DOCUMENTS: SURFACE_DOCUMENTS,
    INTENT_PRINCIPAL_PROFILE: SURFACE_PRINCIPAL,
    INTENT_VICE_PRINCIPAL_PROFILE: SURFACE_VICE_PRINCIPAL,
    INTENT_HOD_PROFILE: SURFACE_HOD,
    INTENT_PLACEMENTS: SURFACE_PLACEMENTS,
    INTENT_ADMISSIONS: SURFACE_ADMISSIONS,
    INTENT_TRUSTEES_PROFILE: SURFACE_TRUSTEES,
    INTENT_COLLEGE_OVERVIEW: SURFACE_COLLEGE,
    INTENT_DEPARTMENT_COMPARISON: SURFACE_COMPARISON,
    INTENT_BUS_ROUTES: SURFACE_BUS,
    INTENT_COURSE_MENU: SURFACE_COURSE_MENU,
}


def resolve_surface(req: ResolveRequest) -> str | None:
    for candidate in (req.surface, req.requested_card):
        if candidate and str(candidate).strip():
            return str(candidate).strip()
    if req.faq_question and str(req.faq_question).strip():
        return SURFACE_FAQ
    intent = (req.intent or "").strip()
    if intent in _INTENT_TO_SURFACE:
        return _INTENT_TO_SURFACE[intent]
    return None


class ContentResolver:
    """Single ownership resolver for canonical content (foundation; not wired to production)."""

    def resolve(self, req: ResolveRequest | None = None, **kwargs: object) -> CanonicalContent | None:
        if req is None:
            req = ResolveRequest(
                intent=kwargs.get("intent"),  # type: ignore[arg-type]
                department=kwargs.get("department"),  # type: ignore[arg-type]
                language=str(kwargs.get("language") or "English"),
                language_code=str(kwargs.get("language_code") or "en"),
                surface=kwargs.get("surface"),  # type: ignore[arg-type]
                semantic_topic=kwargs.get("semantic_topic"),  # type: ignore[arg-type]
                requested_card=kwargs.get("requested_card"),  # type: ignore[arg-type]
                faq_question=kwargs.get("faq_question"),  # type: ignore[arg-type]
                comparison_department_ids=tuple(kwargs.get("comparison_department_ids") or ()),  # type: ignore[arg-type]
            )

        content_event(
            "CONTENT_RESOLVE_STARTED",
            intent=req.intent,
            surface=req.surface,
            department=req.department,
            language_code=req.language_code,
        )

        surface = resolve_surface(req)
        if not surface:
            content_event("CONTENT_RESOLVE_STARTED", result="no_surface")
            return None

        owner = get_owner(surface)
        if owner is None:
            content_event("CONTENT_OWNER_SELECTED", surface=surface, owner=None)
            return None

        content_event(
            "CONTENT_OWNER_SELECTED",
            surface=surface,
            owner_id=owner.owner_id,
            adapter_key=owner.adapter_key,
            canonical_source=owner.canonical_source,
        )

        cache_key = make_cache_key(
            surface=surface,
            language_code=req.language_code,
            department=req.department,
            faq_question=req.faq_question,
            extra=",".join(req.comparison_department_ids),
        )
        cached = cache_get(cache_key)
        if cached is not None:
            content_event("CONTENT_RETURNED", content_id=cached.content_id, cache_hit=True)
            return cached

        adapter = get_adapter(owner.adapter_key)
        if adapter is None:
            content_event("CONTENT_ADAPTER_USED", adapter_key=owner.adapter_key, ok=False)
            return None

        content_event("CONTENT_ADAPTER_USED", adapter_key=owner.adapter_key, ok=True)
        # Ensure surface is set on a request copy for adapters that ignore it
        effective = ResolveRequest(
            intent=req.intent,
            department=req.department,
            language=req.language,
            language_code=req.language_code,
            surface=surface,
            semantic_topic=req.semantic_topic,
            requested_card=req.requested_card,
            faq_question=req.faq_question,
            comparison_department_ids=req.comparison_department_ids,
        )
        try:
            content = adapter(effective)
        except Exception as exc:  # noqa: BLE001
            content_event("CONTENT_ADAPTER_USED", adapter_key=owner.adapter_key, error=str(exc)[:200])
            return None

        if content is None:
            content_event("CONTENT_READY", ok=False, surface=surface)
            return None

        content_event(
            "CONTENT_READY",
            content_id=content.content_id,
            surface=content.surface,
            hash=content.hash,
        )

        validation = validate_canonical_content(content)
        content_event(
            "CONTENT_VALIDATED",
            ok=validation.ok,
            failures=validation.failures[:5] if validation.failures else None,
        )
        if not validation.ok:
            return None

        cache_put(cache_key, content)
        content_event("CONTENT_RETURNED", content_id=content.content_id, cache_hit=False)
        return content


def resolve(**kwargs: object) -> CanonicalContent | None:
    """Module-level convenience wrapper."""
    return ContentResolver().resolve(**kwargs)
