"""Audio/text helper utilities for turn TTS flow."""

from __future__ import annotations

import base64
import re


def split_first_sentence(text: str) -> tuple[str, str]:
    cleaned = (text or "").strip()
    if not cleaned:
        return "", ""
    match = re.search(r"[.!?](?:\s|$)", cleaned)
    if not match:
        return cleaned, ""
    end = match.end()
    return cleaned[:end].strip(), cleaned[end:].strip()


def estimate_wav_duration_ms(audio_b64: str) -> float | None:
    try:
        data = base64.b64decode(audio_b64)
        if len(data) < 44 or data[:4] != b"RIFF":
            return None
        sample_rate = int.from_bytes(data[24:28], "little", signed=False)
        channels = int.from_bytes(data[22:24], "little", signed=False)
        bits_per_sample = int.from_bytes(data[34:36], "little", signed=False)
        data_size = int.from_bytes(data[40:44], "little", signed=False)
        if sample_rate <= 0 or channels <= 0 or bits_per_sample <= 0:
            return None
        bytes_per_sample = bits_per_sample / 8.0
        duration_s = data_size / (sample_rate * channels * bytes_per_sample)
        return max(0.0, duration_s * 1000.0)
    except Exception:
        return None


def audio_bytes_len(audio_b64: str | None) -> int:
    if not audio_b64:
        return 0
    try:
        return len(base64.b64decode(audio_b64))
    except Exception:
        return 0


def normalize_tts_pronunciation(text: str) -> str:
    # Normalize known brand-name pronunciation for TTS voices.
    return re.sub(r"\bCLARA\b", "Clara", text or "", flags=re.IGNORECASE)
