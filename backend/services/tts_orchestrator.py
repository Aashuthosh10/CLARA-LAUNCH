"""M5.8 response-TTS planner.

One authoritative plan for ANSWER and CARD narration. TTS does not route,
select cards, or change language — it only segments the already-decided
spoken text into the minimum necessary provider calls.

Production rules:
- Short answers → one segment → one TTS request.
- Long answers → sentence-aware ordered segments.
- Cards → N ordered clips from the narration/spoken-summary plan.
- Backup of the full reply only when primary produced zero successful clips.
"""

from __future__ import annotations

from dataclasses import dataclass
from collections.abc import Callable
from typing import Any

from backend.services.tts_chunking import split_tts_chunks

Splitter = Callable[..., list[str]]

PLAN_ANSWER_SHORT = "answer_short"
PLAN_ANSWER_LONG = "answer_long"
PLAN_CARD = "card"


@dataclass(frozen=True)
class TtsPlan:
    mode: str
    segments: list[str]
    reason: str
    source_chars: int = 0

    @property
    def clip_count(self) -> int:
        return len(self.segments)


def empty_tts_metrics(*, plan_mode: str | None = None, chunks: int = 0) -> dict[str, Any]:
    return {
        "tts_requests_per_turn": 0,
        "tts_retries_per_turn": 0,
        "tts_chunks_per_turn": chunks,
        "tts_cache_hits_per_turn": 0,
        "tts_generation_ms": None,
        "first_audio_ready_ms": None,
        "total_audio_ready_ms": None,
        "tts_plan_mode": plan_mode,
        "tts_backup_used": False,
    }


def plan_response_tts(
    *,
    source_text: str,
    card_segments: list[str] | None = None,
    short_answer_max_chars: int = 480,
    chunk_max_chars: int = 220,
    splitter: Splitter | None = None,
) -> TtsPlan:
    """Build the ordered TTS segment list for one response turn."""
    split = splitter or split_tts_chunks
    if card_segments is not None:
        segments = [s.strip() if isinstance(s, str) else "" for s in card_segments]
        return TtsPlan(
            mode=PLAN_CARD,
            segments=segments,
            reason="narration_plan",
            source_chars=sum(len(s) for s in segments),
        )

    text = (source_text or "").strip()
    if not text:
        return TtsPlan(mode=PLAN_ANSWER_SHORT, segments=[], reason="empty", source_chars=0)

    if short_answer_max_chars > 0 and len(text) <= short_answer_max_chars:
        return TtsPlan(
            mode=PLAN_ANSWER_SHORT,
            segments=[text],
            reason="short_single_request",
            source_chars=len(text),
        )

    chunks = split(text, max_chars=chunk_max_chars)
    if not chunks:
        chunks = [text]
    if len(chunks) <= 1:
        return TtsPlan(
            mode=PLAN_ANSWER_SHORT,
            segments=chunks,
            reason="fits_one_chunk",
            source_chars=len(text),
        )
    return TtsPlan(
        mode=PLAN_ANSWER_LONG,
        segments=chunks,
        reason="sentence_aware_pipeline",
        source_chars=len(text),
    )


def needs_full_reply_backup(*, used_bundle_plan: bool, successful_clip_count: int) -> bool:
    """Regenerate the whole reply only when primary TTS produced no usable audio."""
    if used_bundle_plan:
        return False
    return successful_clip_count <= 0


def tts_cache_material(
    *,
    language_code: str,
    speaker: str,
    pace: float,
    model: str,
    text: str,
) -> str:
    """Audio-affecting cache material. Language is required so kn-IN cannot hit en-IN audio."""
    normalized = " ".join((text or "").split()).lower()
    return f"{language_code}|{speaker}|{pace}|{model}|{normalized}"
