"""Telemetry/debug payload helpers for CLARA turn processing."""

from __future__ import annotations

import json
import logging
import re
from typing import Any

from backend.config.settings import PERF_DEBUG_TIMINGS
from backend.utils.timing import TurnTiming

logger = logging.getLogger(__name__)


def text_preview(text: str, limit: int = 80) -> str:
    compact = re.sub(r"\s+", " ", (text or "").strip())
    return compact[:limit]


def debug_payload(timing: TurnTiming) -> dict[str, Any]:
    tts_metrics = dict(getattr(timing, "extras", {}) or {})
    debug: dict[str, Any] = {}
    if PERF_DEBUG_TIMINGS:
        debug["timings_ms"] = timing.summary_ms()
    if tts_metrics:
        debug["tts_metrics"] = tts_metrics
    if not debug:
        return {}
    return {
        "debug": debug,
        "turn_id": timing.turn_id,
    }


def log_turn_metrics(timing: TurnTiming, **extra: Any) -> None:
    payload = timing.structured_log(**extra)
    logger.info(json.dumps(payload, ensure_ascii=False, separators=(",", ":")))
