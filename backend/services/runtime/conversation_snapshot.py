"""Immutable per-turn conversation snapshot (Milestone 3.6)."""

from __future__ import annotations

from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from backend.services.orchestration.types import ConversationResolution

_SESSION_LAST = "_last_conversation_snapshot"
_SESSION_RING = "_conversation_snapshots"
_RING_MAX = 20


@dataclass(frozen=True)
class ConversationSnapshot:
    turn_id: str
    authority: str
    language: str
    language_code: str
    presentation_id: str | None
    presentation_hash: str | None
    response_source: str
    intent: str | None
    semantic_topic: str | None
    started_at: str
    ended_at: str
    duration_ms: float | None

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def build_conversation_snapshot(
    *,
    turn_id: str,
    resolution: ConversationResolution | None,
    response_source: str,
    duration_ms: float | None = None,
    started_at: str | None = None,
    presentation_id: str | None = None,
    presentation_hash: str | None = None,
) -> ConversationSnapshot:
    now = datetime.now(timezone.utc).isoformat()
    auth = ""
    language = "English"
    code = "en"
    intent = None
    topic = None
    pid = presentation_id
    phash = presentation_hash
    if resolution is not None:
        auth = resolution.response_authority or ""
        language = resolution.language or language
        code = resolution.language_code_key or code
        intent = resolution.intent
        topic = resolution.semantic_topic
        bundle = resolution.presentation_bundle
        if bundle is not None:
            pid = pid or bundle.presentation_id
            phash = phash or bundle.contract_hash
    return ConversationSnapshot(
        turn_id=str(turn_id),
        authority=auth,
        language=language,
        language_code=code,
        presentation_id=pid,
        presentation_hash=phash,
        response_source=response_source,
        intent=intent,
        semantic_topic=topic,
        started_at=started_at or now,
        ended_at=now,
        duration_ms=duration_ms,
    )


def store_conversation_snapshot(session: dict[str, Any], snapshot: ConversationSnapshot) -> None:
    session[_SESSION_LAST] = snapshot
    ring = session.get(_SESSION_RING)
    if not isinstance(ring, list):
        ring = []
    ring = list(ring) + [snapshot]
    session[_SESSION_RING] = ring[-_RING_MAX:]


def get_last_conversation_snapshot(session: dict[str, Any]) -> ConversationSnapshot | None:
    snap = session.get(_SESSION_LAST)
    return snap if isinstance(snap, ConversationSnapshot) else None
