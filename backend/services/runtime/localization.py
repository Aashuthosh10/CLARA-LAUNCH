"""Localization freeze / verify — validates only; freeze flags live on additive runtime context."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from backend.services.runtime.context import get_runtime_context
from backend.services.session_language import resolve_session_language


@dataclass
class LocalizationVerifyResult:
    ok: bool
    reason: str = ""
    conversation_lang: str = ""
    caption_lang: str = ""
    tts_lang: str = ""
    display_lang: str = ""


def verify_localization_consistency(
    session: dict[str, Any],
    *,
    plan_lang_key: str | None,
    tts_lang_code: str | None = None,
) -> LocalizationVerifyResult:
    """
    Require conversation language == caption/plan language == TTS language == display language.
    Does not mutate session language.
    """
    code_key, lang_name, tts_code = resolve_session_language(session)
    ctx = get_runtime_context(session)
    if ctx.localization.frozen:
        code_key = ctx.localization.code_key
        lang_name = ctx.localization.language_name
        tts_code = ctx.localization.tts_code

    plan_key = (plan_lang_key or code_key or "en").strip().lower()
    session_key = (code_key or "en").strip().lower()
    tts_actual = (tts_lang_code or tts_code or "").strip()
    tts_expected = (tts_code or "").strip()

    if plan_key != session_key:
        return LocalizationVerifyResult(
            ok=False,
            reason="plan_lang_mismatch",
            conversation_lang=session_key,
            caption_lang=plan_key,
            tts_lang=tts_actual,
            display_lang=lang_name,
        )
    if tts_lang_code is not None and tts_actual != tts_expected:
        return LocalizationVerifyResult(
            ok=False,
            reason="tts_lang_mismatch",
            conversation_lang=session_key,
            caption_lang=plan_key,
            tts_lang=tts_actual,
            display_lang=lang_name,
        )
    return LocalizationVerifyResult(
        ok=True,
        conversation_lang=session_key,
        caption_lang=plan_key,
        tts_lang=tts_expected,
        display_lang=lang_name,
    )


def is_language_frozen(session: dict[str, Any]) -> bool:
    return bool(get_runtime_context(session).localization.frozen)
