"""Additive conversation runtime context on the WS session dict (sync only)."""

from __future__ import annotations

from typing import Any

from backend.services.runtime.types import ConversationRuntimeContext, LocalizationSnapshot
from backend.services.session_language import resolve_session_language

_SESSION_KEY = "runtime_context"


def get_runtime_context(session: dict[str, Any]) -> ConversationRuntimeContext:
    ctx = session.get(_SESSION_KEY)
    if isinstance(ctx, ConversationRuntimeContext):
        return ctx
    ctx = ConversationRuntimeContext()
    session[_SESSION_KEY] = ctx
    return ctx


def sync_runtime_from_session(session: dict[str, Any], **patches: Any) -> ConversationRuntimeContext:
    """Adapter: synchronize snapshot from existing session owners. Does not own language/intent."""
    ctx = get_runtime_context(session)
    code_key, lang_name, tts_code = resolve_session_language(session)
    ctx.generation = int(session.get("session_generation", 0) or 0)
    ctx.guest_name = session.get("guest_name")
    if not ctx.localization.frozen:
        ctx.current_language = lang_name
        ctx.localization.code_key = code_key
        ctx.localization.language_name = lang_name
        ctx.localization.tts_code = tts_code
    if ctx.session_id is None:
        ctx.session_id = str(session.get("session_id") or id(session))
    if ctx.conversation_id is None:
        ctx.conversation_id = ctx.session_id
    for key, val in patches.items():
        if hasattr(ctx, key) and val is not None:
            setattr(ctx, key, val)
    return ctx


def freeze_localization(session: dict[str, Any]) -> LocalizationSnapshot:
    ctx = sync_runtime_from_session(session)
    code_key, lang_name, tts_code = resolve_session_language(session)
    ctx.localization = LocalizationSnapshot(
        code_key=code_key,
        language_name=lang_name,
        tts_code=tts_code,
        frozen=True,
    )
    ctx.current_language = lang_name
    return ctx.localization


def release_localization(session: dict[str, Any]) -> None:
    ctx = get_runtime_context(session)
    ctx.localization.frozen = False
    code_key, lang_name, tts_code = resolve_session_language(session)
    ctx.localization.code_key = code_key
    ctx.localization.language_name = lang_name
    ctx.localization.tts_code = tts_code
    ctx.current_language = lang_name
    ctx.active_presentation_id = None
    ctx.active_scene = None
    ctx.runtime_state = "idle"
