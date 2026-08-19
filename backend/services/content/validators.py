"""CanonicalContent validators — diagnostics only."""

from __future__ import annotations

import hashlib
import json
from typing import Any, Sequence

from backend.services.content.types import CanonicalContent, ContentSection, ValidationResult


def compute_content_hash(
    *,
    title: str,
    subtitle: str,
    summary: str,
    sections: Sequence[ContentSection | dict[str, Any]],
    language_code: str,
    surface: str,
    canonical_source: str,
) -> str:
    sec_payload = []
    for s in sections:
        if isinstance(s, ContentSection):
            sec_payload.append({"id": s.id, "title": s.title, "body": s.body})
        else:
            sec_payload.append(
                {
                    "id": str(s.get("id") or ""),
                    "title": str(s.get("title") or ""),
                    "body": str(s.get("body") or ""),
                }
            )
    payload = {
        "title": title or "",
        "subtitle": subtitle or "",
        "summary": summary or "",
        "sections": sec_payload,
        "language_code": language_code or "",
        "surface": surface or "",
        "canonical_source": canonical_source or "",
    }
    raw = json.dumps(payload, sort_keys=True, ensure_ascii=True)
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:32]


def validate_canonical_content(content: CanonicalContent | None) -> ValidationResult:
    failures: list[str] = []
    if content is None:
        return ValidationResult(ok=False, failures=["content_is_none"])

    if not (content.content_id or "").strip():
        failures.append("missing_content_id")
    if not (content.surface or "").strip():
        failures.append("missing_surface")
    if not (content.title or "").strip():
        failures.append("missing_title")
    if not (content.summary or "").strip():
        failures.append("missing_summary")
    if not (content.language_code or "").strip():
        failures.append("missing_language_code")
    if not (content.canonical_source or "").strip():
        failures.append("missing_canonical_source")
    if not (content.hash or "").strip():
        failures.append("missing_hash")

    seen_ids: set[str] = set()
    for i, sec in enumerate(content.sections or ()):
        sid = (sec.id or "").strip()
        if not sid:
            failures.append(f"section_{i}_missing_id")
            continue
        if sid in seen_ids:
            failures.append(f"duplicate_section_id:{sid}")
        seen_ids.add(sid)

    expected = compute_content_hash(
        title=content.title,
        subtitle=content.subtitle,
        summary=content.summary,
        sections=content.sections,
        language_code=content.language_code,
        surface=content.surface,
        canonical_source=content.canonical_source,
    )
    if content.hash and content.hash != expected:
        failures.append("hash_mismatch")

    return ValidationResult(ok=not failures, failures=failures)


def compute_unit_hash(
    *,
    unit_id: str,
    context: str,
    context_id: str,
    section_id: str,
    body: str,
    language_code: str,
    canonical_source: str,
) -> str:
    payload = {
        "unit_id": unit_id or "",
        "context": context or "",
        "context_id": context_id or "",
        "section_id": section_id or "",
        "body": body or "",
        "language_code": language_code or "",
        "canonical_source": canonical_source or "",
    }
    raw = json.dumps(payload, sort_keys=True, ensure_ascii=True)
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:32]


def validate_content_unit(unit: Any | None) -> ValidationResult:
    from backend.services.content.content_unit import ContentUnit

    failures: list[str] = []
    if unit is None:
        return ValidationResult(ok=False, failures=["unit_is_none"])
    if not isinstance(unit, ContentUnit):
        return ValidationResult(ok=False, failures=["not_content_unit"])

    if not (unit.unit_id or "").strip():
        failures.append("missing_unit_id")
    if not (unit.context or "").strip():
        failures.append("missing_context")
    if not (unit.section_id or "").strip():
        failures.append("missing_section_id")
    if not (unit.body or "").strip() and unit.context == "department":
        failures.append("missing_body")
    if not (unit.language_code or "").strip():
        failures.append("missing_language_code")
    if not (unit.canonical_source or "").strip():
        failures.append("missing_canonical_source")
    if not (unit.content_hash or "").strip():
        failures.append("missing_content_hash")

    expected = compute_unit_hash(
        unit_id=unit.unit_id,
        context=unit.context,
        context_id=unit.context_id,
        section_id=unit.section_id,
        body=unit.body,
        language_code=unit.language_code,
        canonical_source=unit.canonical_source,
    )
    if unit.content_hash and unit.content_hash != expected:
        failures.append("hash_mismatch")

    return ValidationResult(ok=not failures, failures=failures)
