"""In-process cache for ContentResolver results (optional; disabled by default for tests)."""

from __future__ import annotations

from typing import Any

from backend.services.content.types import CanonicalContent

_CACHE: dict[str, CanonicalContent] = {}
_ENABLED = False


def set_cache_enabled(enabled: bool) -> None:
    global _ENABLED
    _ENABLED = bool(enabled)


def clear_cache() -> None:
    _CACHE.clear()


def cache_get(key: str) -> CanonicalContent | None:
    if not _ENABLED:
        return None
    return _CACHE.get(key)


def cache_put(key: str, content: CanonicalContent) -> None:
    if not _ENABLED:
        return
    _CACHE[key] = content


def make_cache_key(
    *,
    surface: str,
    language_code: str,
    department: str | None = None,
    faq_question: str | None = None,
    extra: str = "",
) -> str:
    return "|".join(
        [
            surface or "",
            (language_code or "en").lower(),
            (department or "").strip().lower(),
            (faq_question or "").strip().lower()[:120],
            extra,
        ]
    )


def cache_stats() -> dict[str, Any]:
    return {"enabled": _ENABLED, "size": len(_CACHE)}
