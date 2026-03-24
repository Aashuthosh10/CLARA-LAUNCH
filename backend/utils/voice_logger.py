"""Voice pipeline instrumentation: JSON single-line logs with turn_id, timing, device, VAD, TTS."""

from __future__ import annotations

import json
import logging
import time
from typing import Any

logger = logging.getLogger(__name__)


def _ms_now() -> float:
    return time.perf_counter() * 1000.0


def log_voice(
    turn_id: str,
    stage: str,
    *,
    data: dict[str, Any] | None = None,
) -> None:
    """Emit a JSON single-line log entry for voice pipeline instrumentation."""
    payload: dict[str, Any] = {
        "type": "voice",
        "turn_id": turn_id,
        "stage": stage,
        "ts_ms": _ms_now(),
    }
    if data:
        payload["data"] = data
    logger.info(json.dumps(payload, ensure_ascii=False, separators=(",", ":")))


def log_voice_capture_start(
    turn_id: str,
    device_index: int,
    device_name: str,
    sample_rate: int,
    channels: int,
    dtype: str,
    mode: str,
    frame_ms: int | None = None,
) -> None:
    log_voice(
        turn_id,
        "capture_start",
        data={
            "device_index": device_index,
            "device_name": device_name,
            "sample_rate": sample_rate,
            "channels": channels,
            "dtype": dtype,
            "mode": mode,
            "vad_frame_ms": frame_ms,
        },
    )


def log_voice_capture_end(
    turn_id: str,
    duration_ms: float,
    wav_bytes: int,
    rms: float | None = None,
    peak: float | None = None,
    error_code: str | None = None,
) -> None:
    data: dict[str, Any] = {
        "duration_ms": round(duration_ms, 2),
        "wav_bytes": wav_bytes,
    }
    if rms is not None:
        data["rms"] = round(rms, 6)
    if peak is not None:
        data["peak"] = round(peak, 6)
    if error_code:
        data["error_code"] = error_code
    log_voice(turn_id, "capture_end", data=data)


def log_voice_stt(
    turn_id: str,
    latency_ms: float,
    transcript_len: int,
    preview: str,
) -> None:
    log_voice(
        turn_id,
        "stt",
        data={
            "latency_ms": round(latency_ms, 2),
            "transcript_len": transcript_len,
            "preview": preview[:80] if preview else "",
        },
    )


def log_voice_llm(
    turn_id: str,
    latency_ms: float,
    reply_len: int,
) -> None:
    log_voice(
        turn_id,
        "llm",
        data={
            "latency_ms": round(latency_ms, 2),
            "reply_len": reply_len,
        },
    )


def log_voice_tts(
    turn_id: str,
    latency_ms: float,
    text_len: int,
    text_preview: str,
    audio_bytes: int,
    decoded_duration_ms: float | None = None,
) -> None:
    data: dict[str, Any] = {
        "latency_ms": round(latency_ms, 2),
        "text_len": text_len,
        "text_preview": text_preview[:80] if text_preview else "",
        "audio_bytes": audio_bytes,
    }
    if decoded_duration_ms is not None:
        data["decoded_duration_ms"] = round(decoded_duration_ms, 2)
    log_voice(turn_id, "tts", data=data)


def log_voice_turn_end(
    turn_id: str,
    timings_ms: dict[str, float | None],
    success: bool,
    error_code: str | None = None,
) -> None:
    data: dict[str, Any] = {
        "success": success,
        "timings_ms": {k: round(v, 2) if v is not None else None for k, v in timings_ms.items()},
    }
    if error_code:
        data["error_code"] = error_code
    log_voice(turn_id, "turn_end", data=data)
