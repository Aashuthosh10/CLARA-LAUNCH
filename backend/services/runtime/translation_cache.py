"""Translation cache keyed by (language, content hash). Single cache owner for translations."""

from __future__ import annotations

import hashlib

from backend.config.settings import TRANSLATION_CACHE_MAX, TRANSLATION_CACHE_TTL_S
from backend.services.runtime.diagnostics import log_runtime_event
from backend.utils.cache import TTLRUCache

_TRANSLATION_CACHE: TTLRUCache[str, str] = TTLRUCache[str, str](
    max_size=max(32, int(TRANSLATION_CACHE_MAX)),
    ttl_seconds=float(TRANSLATION_CACHE_TTL_S),
)


def _cache_key(language: str, content: str) -> str:
    digest = hashlib.sha256((content or "").encode("utf-8")).hexdigest()
    return f"{language}|{digest}"


def get_cached_translation(language: str, content: str) -> str | None:
    if not content or not language:
        return None
    hit = _TRANSLATION_CACHE.get(_cache_key(language, content))
    if hit:
        log_runtime_event("TRANSLATION_CACHE_HIT", language=language)
    return hit


def put_cached_translation(language: str, content: str, translated: str) -> None:
    if not content or not language or not translated:
        return
    _TRANSLATION_CACHE.set(_cache_key(language, content), translated)
