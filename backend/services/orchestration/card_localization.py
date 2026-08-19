"""Ensure card segment caption/tts language matches resolution language."""

from __future__ import annotations

from typing import Any

from backend.services.orchestration.diagnostics import orch_event
from backend.services.orchestration.types import ConversationResolution
from backend.services.runtime.translation_cache import get_cached_translation, put_cached_translation


def _looks_english(text: str) -> bool:
    if not text:
        return True
    # Heuristic: mostly ASCII letters → treat as English for non-Latin targets.
    letters = [c for c in text if c.isalpha()]
    if not letters:
        return True
    ascii_letters = sum(1 for c in letters if ord(c) < 128)
    return (ascii_letters / len(letters)) > 0.85


def localize_card_segments(
    segments: list[Any],
    resolution: ConversationResolution,
    *,
    translate_fn: Any | None = None,
) -> list[Any] | None:
    """
    Prefer plan already built with language_code_key.
    If target is non-English and segments look English, optionally translate via cache.
    On failure → return None (caller degrades whole presentation; never mix languages).
    """
    if not segments:
        return None

    code_key = (resolution.language_code_key or "en").lower()
    if code_key == "en":
        return segments

    needs_work = False
    for seg in segments:
        dt = getattr(seg, "display_text", None) or (seg.get("display_text") if isinstance(seg, dict) else "") or ""
        tt = getattr(seg, "tts_text", None) or (seg.get("tts_text") if isinstance(seg, dict) else "") or ""
        if _looks_english(str(dt)) or _looks_english(str(tt)):
            needs_work = True
            break

    if not needs_work:
        return segments

    if translate_fn is None:
        # Locale pack should have provided non-English; without translator, fail closed.
        orch_event(
            "LOCALIZATION_DEGRADED",
            reason="segments_appear_english_no_translator",
            language=resolution.language,
        )
        return None

    out: list[Any] = []
    try:
        for seg in segments:
            if hasattr(seg, "display_text"):
                display = str(seg.display_text or "")
                tts = str(seg.tts_text or "")
                new_display = _translate_field(display, code_key, translate_fn)
                new_tts = _translate_field(tts, code_key, translate_fn)
                # Mutate copy-like: reuse segment object fields
                seg.display_text = new_display
                seg.tts_text = new_tts
                out.append(seg)
            elif isinstance(seg, dict):
                seg = dict(seg)
                seg["display_text"] = _translate_field(str(seg.get("display_text") or ""), code_key, translate_fn)
                seg["tts_text"] = _translate_field(str(seg.get("tts_text") or ""), code_key, translate_fn)
                out.append(seg)
            else:
                out.append(seg)
    except Exception as exc:  # noqa: BLE001
        orch_event("LOCALIZATION_FAIL", reason="translate_exception", detail=str(exc)[:200])
        return None

    orch_event("LOCALIZATION_OK", via="card_adapter", language=resolution.language)
    return out


def _translate_field(text: str, code_key: str, translate_fn: Any) -> str:
    if not text.strip():
        return text
    cached = get_cached_translation(text, code_key)
    if cached:
        return cached
    translated = translate_fn(text, code_key)
    if not translated:
        raise RuntimeError("empty_translation")
    put_cached_translation(text, code_key, translated)
    return translated
