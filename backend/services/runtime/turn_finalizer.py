"""Turn finalizer — terminal state for a conversation turn (Milestone 3.5 / 3.6)."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from backend.services.runtime.context import get_runtime_context, release_localization, sync_runtime_from_session
from backend.services.runtime.conversation_snapshot import (
    ConversationSnapshot,
    build_conversation_snapshot,
    store_conversation_snapshot,
)
from backend.services.runtime.diagnostics import log_runtime_event
from backend.services.runtime.ownership import validate_callback_token
from backend.services.orchestration.types import ConversationResolution

_SESSION_KEY = "_turn_finalized"


def is_turn_finalized(session: dict[str, Any], turn_id: str | None) -> bool:
    if not turn_id:
        return False
    meta = session.get(_SESSION_KEY)
    if not isinstance(meta, dict):
        ctx = get_runtime_context(session)
        return bool(getattr(ctx, "finalized_turn_id", None) == turn_id)
    return str(meta.get("turn_id") or "") == str(turn_id)


def reject_if_finalized(session: dict[str, Any], turn_id: str | None, *, reason: str) -> bool:
    """
    Return True if the caller must reject (turn already finalized).
    Logs a gated diagnostics event.
    """
    if not is_turn_finalized(session, turn_id):
        return False
    log_runtime_event(
        "TURN_LATE_REJECT",
        turn_id=turn_id,
        reason=reason,
    )
    return True


def reject_late_callback(
    session: dict[str, Any],
    *,
    turn_id: str | None,
    reason: str,
    presentation_id: str | None = None,
    generation: int | None = None,
) -> bool:
    """
    Reject late narration / TTS / Groq / queue callbacks after finalize or ownership mismatch.
    Returns True if rejected.
    """
    if reject_if_finalized(session, turn_id, reason=reason):
        return True
    ctx = get_runtime_context(session)
    expected_gen = int(ctx.generation) if ctx.generation is not None else None
    actual_gen = generation if generation is not None else expected_gen
    ok = validate_callback_token(
        expected_generation=expected_gen,
        actual_generation=actual_gen,
        expected_turn_id=ctx.turn_id,
        actual_turn_id=turn_id,
        expected_presentation_id=ctx.active_presentation_id,
        actual_presentation_id=presentation_id if presentation_id is not None else ctx.active_presentation_id,
    )
    if not ok:
        log_runtime_event("TURN_LATE_REJECT", turn_id=turn_id, reason=f"ownership:{reason}")
        return True
    return False


def finalize_turn(
    session: dict[str, Any],
    *,
    turn_id: str | None,
    authority: str | None = None,
    presentation_id: str | None = None,
    bundle_hash: str | None = None,
    language: str | None = None,
    duration_ms: float | None = None,
    response_source: str = "unknown",
    resolution: ConversationResolution | None = None,
    snapshot: ConversationSnapshot | None = None,
) -> bool:
    """
    Enter TURN_FINALIZED: release localization/presentation session ownership once.
    Stores immutable ConversationSnapshot. Idempotent for the same turn_id.
    """
    if not turn_id:
        return False

    if is_turn_finalized(session, turn_id):
        log_runtime_event(
            "TURN_FINALIZED",
            turn_id=turn_id,
            authority=authority,
            presentationId=presentation_id,
            bundleHash=bundle_hash,
            language=language,
            duration=duration_ms,
            idempotent=True,
        )
        return True

    release_localization(session)

    ctx = get_runtime_context(session)
    ctx.finalized_turn_id = str(turn_id)
    ctx.active_presentation_id = None
    ctx.active_scene = None
    ctx.runtime_state = "idle"

    sync_runtime_from_session(session, turn_id=turn_id, runtime_state="idle")

    res = resolution if resolution is not None else session.get("_conversation_resolution")
    if not isinstance(res, ConversationResolution):
        res = None
    snap = snapshot or build_conversation_snapshot(
        turn_id=str(turn_id),
        resolution=res,
        response_source=response_source,
        duration_ms=duration_ms,
        presentation_id=presentation_id,
        presentation_hash=bundle_hash,
    )
    store_conversation_snapshot(session, snap)

    session[_SESSION_KEY] = {
        "turn_id": str(turn_id),
        "authority": authority or snap.authority,
        "presentation_id": presentation_id or snap.presentation_id,
        "bundle_hash": bundle_hash or snap.presentation_hash,
        "at": datetime.now(timezone.utc).isoformat(),
    }

    log_runtime_event(
        "TURN_FINALIZED",
        turn_id=turn_id,
        authority=authority or snap.authority,
        presentationId=presentation_id or snap.presentation_id,
        bundleHash=bundle_hash or snap.presentation_hash,
        language=language or snap.language,
        duration=duration_ms,
        response_source=snap.response_source,
    )
    return True
