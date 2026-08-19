"""Department key resolver — one normalization path for voice and menu."""

from __future__ import annotations

from dataclasses import dataclass

from backend.services.answer_generation import (
    DEPARTMENT_JSON_KEY_ORDER,
    _CANONICAL_DEPARTMENT_TO_JSON_KEY,
    department_label_to_json_key,
    load_locale_data_for_lang_key,
    locale_file_id_for_lang_key,
)
from backend.services.content.diagnostics import content_event
from backend.services.narration_plan import _loose_resolve_department_json_key


def _exact_department_json_key(raw_label: str, deps: dict) -> str | None:
    """Return a canonical json key only when the input already *is* that key.

    Never substring-matches. ``cse_ds`` stays ``cse_ds``; it is not ``cse``.
    """
    candidate = raw_label.strip().lower().replace(" ", "_")
    if not candidate:
        return None
    rec = deps.get(candidate)
    if isinstance(rec, dict):
        return candidate
    if candidate in DEPARTMENT_JSON_KEY_ORDER:
        return candidate
    return None


@dataclass(frozen=True)
class DepartmentResolution:
    json_key: str | None
    display_name: str | None
    canonical_label: str | None
    language: str
    source: str
    confidence: float


def _lang_key(language: str | None) -> str:
    return locale_file_id_for_lang_key(language)


def _canonical_label_for_key(jkey: str) -> str | None:
    for label, key in _CANONICAL_DEPARTMENT_TO_JSON_KEY.items():
        if key == jkey:
            return label
    return None


def resolve_department_key(
    *,
    department: str | None = None,
    menu_department: str | None = None,
    department_hint: str | None = None,
    language: str | None = "en",
    user_text: str = "",
) -> DepartmentResolution:
    """
    Normalize any department label to exactly one locale json_key.
    Never returns a display acronym (e.g. \"CSE\") as json_key — always \"cse\".
    """
    lang = _lang_key(language)
    data = load_locale_data_for_lang_key(lang)
    deps = data.get("departments") if isinstance(data.get("departments"), dict) else {}

    source = "unresolved"
    raw_label: str | None = None
    if menu_department and str(menu_department).strip():
        raw_label = str(menu_department).strip()
        source = "menu"
    elif department and str(department).strip():
        raw_label = str(department).strip()
        source = "voice"
    elif department_hint and str(department_hint).strip():
        raw_label = str(department_hint).strip()
        source = "hint"

    jkey: str | None = None
    confidence = 0.0

    if raw_label:
        # Canonical IDs must never enter substring/loose identity.
        exact = _exact_department_json_key(raw_label, deps)
        if exact:
            jkey = exact
            confidence = 0.99
        else:
            jkey = department_label_to_json_key(raw_label)
            if jkey:
                confidence = 0.95
            else:
                # LEGACY FALLBACK: human labels only (menu/voice). Not unit IR.
                jkey = _loose_resolve_department_json_key(
                    user_text or raw_label, raw_label, deps
                )
                if jkey:
                    confidence = 0.8

        if jkey and (jkey not in deps or not isinstance(deps.get(jkey), dict)):
            jkey = None
            confidence = 0.0
            source = "unresolved"

    if not jkey:
        content_event(
            "DEPARTMENT_KEY_RESOLVED",
            json_key=None,
            language=lang,
            source="unresolved",
            label=raw_label,
        )
        return DepartmentResolution(
            json_key=None,
            display_name=None,
            canonical_label=raw_label,
            language=lang,
            source="unresolved",
            confidence=0.0,
        )

    rec = deps.get(jkey)
    display_name = None
    if isinstance(rec, dict):
        display_name = str(rec.get("name") or "").strip() or None
    canonical_label = _canonical_label_for_key(jkey) or display_name or raw_label

    content_event(
        "DEPARTMENT_KEY_RESOLVED",
        json_key=jkey,
        language=lang,
        source=source,
        confidence=confidence,
    )
    return DepartmentResolution(
        json_key=jkey,
        display_name=display_name,
        canonical_label=canonical_label,
        language=lang,
        source=source,
        confidence=confidence,
    )


def known_department_keys(language: str | None = "en") -> frozenset[str]:
    lang = _lang_key(language)
    data = load_locale_data_for_lang_key(lang)
    deps = data.get("departments")
    if not isinstance(deps, dict):
        return frozenset(DEPARTMENT_JSON_KEY_ORDER)
    return frozenset(k for k, v in deps.items() if isinstance(v, dict))
