"""Turn-level timing helpers with JSON-safe summaries."""

from __future__ import annotations

import time
import uuid
from dataclasses import dataclass, field
from typing import Any


def _ms_now() -> float:
    return time.perf_counter() * 1000.0


@dataclass
class TurnTiming:
    turn_id: str = field(default_factory=lambda: uuid.uuid4().hex[:12])
    started_ms: float = field(default_factory=_ms_now)
    marks: dict[str, float] = field(default_factory=dict)

    def mark(self, name: str) -> None:
        self.marks[name] = _ms_now()

    def has(self, name: str) -> bool:
        return name in self.marks

    def duration(self, start: str, end: str) -> float | None:
        if start not in self.marks or end not in self.marks:
            return None
        return max(0.0, self.marks[end] - self.marks[start])

    def since_start(self, name: str) -> float | None:
        if name not in self.marks:
            return None
        return max(0.0, self.marks[name] - self.started_ms)

    def set_if_missing(self, name: str) -> None:
        if name not in self.marks:
            self.mark(name)

    def summary_ms(self) -> dict[str, float | None]:
        ttft_candidates = [
            self.since_start("first_feedback"),
            self.since_start("llm_first_token"),
            self.since_start("play_start"),
        ]
        ttft = next((x for x in ttft_candidates if x is not None), None)
        ttfs = self.since_start("play_start")
        total = self.since_start("turn_end")
        if total is None:
            total = max(0.0, _ms_now() - self.started_ms)

        return {
            # Absolute times since turn start
            "t_user_end_ms": self.since_start("transcript_ready"),
            "t_llm_start_ms": self.since_start("llm_start"),
            "t_llm_first_token_ms": self.since_start("llm_first_token"),
            "t_llm_first_sentence_ms": self.since_start("llm_first_sentence"),
            "t_llm_end_ms": self.since_start("llm_end"),
            "t_tts_start_ms": self.since_start("tts_first_start") or self.since_start("tts_start"),
            "t_tts_audio_ready_ms": self.since_start("tts_first_end") or self.since_start("tts_end"),
            "t_play_start_ms": self.since_start("play_start"),
            "t_play_end_ms": self.since_start("play_end"),

            # Stage durations
            "record_end_ms": self.since_start("record_end"),
            "transcript_ready_ms": self.since_start("transcript_ready"),
            "stt_ms": self.duration("stt_start", "stt_end"),
            "rag_ms": self.duration("rag_start", "rag_end"),
            "llm_first_token_ms": self.since_start("llm_first_token"),
            "llm_ms": self.duration("llm_start", "llm_end"),
            "tts_first_ms": self.duration("tts_first_start", "tts_first_end"),
            "tts_ms": self.duration("tts_start", "tts_end"),
            "play_ms": self.duration("play_start", "play_end"),

            # Aggregates
            "ttft_ms": ttft,
            "ttfs_ms": ttfs,
            "ttff_ms": ttft,  # backward-compatible alias
            "total_ms": total,
        }

    def structured_log(self, **extra: Any) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "type": "turn_metrics",
            "turn_id": self.turn_id,
            "timings_ms": self.summary_ms(),
        }
        payload.update(extra)
        return payload
