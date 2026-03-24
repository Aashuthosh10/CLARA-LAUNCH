#!/usr/bin/env python3
"""
Voice pipeline smoke test: record 4s → STT → LLM → TTS → playback.
Runs independently of UI/WebSocket. Validates capture, STT, LLM, TTS, and playback.
"""

from __future__ import annotations

import asyncio
import base64
import io
import sys
import time
from pathlib import Path

# Ensure project root is importable.
_PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))

import numpy as np
import sounddevice as sd

from backend.config.settings import (
    AUDIO_INPUT_DEVICE_INDEX,
    AUDIO_INPUT_DEVICE_NAME,
    AUDIO_OUTPUT_DEVICE_INDEX,
    AUDIO_OUTPUT_DEVICE_NAME,
    AUDIO_SAMPLE_RATE,
    AUDIO_CHANNELS,
    AUDIO_FIXED_RECORD_SECONDS,
)
from backend.core.audio_pipeline import _build_wav_from_mono_bytes, _compute_rms, _resolve_input_device


def _resolve_output_device() -> int:
    """Resolve output device for playback."""
    devices = sd.query_devices()
    default_out = sd.default.device[1]
    if default_out is None:
        default_out = 0

    if AUDIO_OUTPUT_DEVICE_INDEX is not None:
        if 0 <= AUDIO_OUTPUT_DEVICE_INDEX < len(devices) and devices[AUDIO_OUTPUT_DEVICE_INDEX].get("max_output_channels", 0) > 0:
            return AUDIO_OUTPUT_DEVICE_INDEX
        print(f"WARN: AUDIO_OUTPUT_DEVICE_INDEX={AUDIO_OUTPUT_DEVICE_INDEX} invalid; using default {default_out}")

    if AUDIO_OUTPUT_DEVICE_NAME:
        name_lower = AUDIO_OUTPUT_DEVICE_NAME.lower()
        for i, dev in enumerate(devices):
            if dev.get("max_output_channels", 0) > 0 and name_lower in (dev.get("name") or "").lower():
                return i
        print(f"WARN: No output device containing '{AUDIO_OUTPUT_DEVICE_NAME}'; using default {default_out}")

    return default_out


def record_fixed(duration_s: float = 4.0) -> tuple[bytes | None, float, float]:
    """Record fixed duration. Returns (wav_bytes, rms, duration_ms)."""
    device_id = _resolve_input_device()
    devices = sd.query_devices()
    dev = devices[device_id] if device_id < len(devices) else {}
    channels = min(dev.get("max_input_channels", 1), max(1, AUDIO_CHANNELS))
    channels = max(1, channels)

    duration_s = max(0.5, min(30.0, duration_s or AUDIO_FIXED_RECORD_SECONDS))
    samples_total = int(AUDIO_SAMPLE_RATE * duration_s) * channels

    print(f"Recording {duration_s}s at {AUDIO_SAMPLE_RATE} Hz, device {device_id} ({dev.get('name', '?')})...")
    start = time.perf_counter()
    rec = sd.rec(samples_total, samplerate=AUDIO_SAMPLE_RATE, channels=channels, dtype="int16", device=device_id)
    sd.wait()
    elapsed_ms = (time.perf_counter() - start) * 1000

    if channels > 1:
        mono_arr = rec.mean(axis=1).astype(np.int16)
    else:
        mono_arr = rec.squeeze()
    mono_bytes = mono_arr.tobytes()
    rms = _compute_rms(mono_bytes)
    wav = _build_wav_from_mono_bytes(mono_bytes)
    return wav, rms, elapsed_ms


def play_wav_bytes(wav_bytes: bytes, device_id: int | None = None) -> float:
    """Play WAV bytes via sounddevice. Returns playback duration in ms."""
    if len(wav_bytes) < 44 or wav_bytes[:4] != b"RIFF":
        print("Invalid WAV")
        return 0.0
    sample_rate = int.from_bytes(wav_bytes[24:28], "little", signed=False)
    channels = int.from_bytes(wav_bytes[22:24], "little", signed=False)
    data_size = int.from_bytes(wav_bytes[40:44], "little", signed=False)
    bytes_per_sample = 2
    n_samples = data_size // (channels * bytes_per_sample)
    duration_s = n_samples / (sample_rate * channels)
    audio = np.frombuffer(wav_bytes[44 : 44 + data_size], dtype=np.int16)
    if channels > 1:
        audio = audio.reshape(-1, channels).mean(axis=1).astype(np.int16)
    print(f"Playing {duration_s:.2f}s at {sample_rate} Hz, device {device_id}...")
    start = time.perf_counter()
    sd.play(audio, samplerate=sample_rate, device=device_id)
    sd.wait()
    return (time.perf_counter() - start) * 1000


async def run_smoketest() -> bool:
    """Run full voice pipeline: record → STT → LLM → TTS → playback."""
    from backend.clients.provider_clients import sarvam_stt_from_wav, sarvam_tts_to_base64
    from backend.config.settings import GROQ_API_KEY, RAG_MODEL
    from groq import AsyncGroq

    turn_id = f"smoke_{int(time.time())}"
    timings: dict[str, float] = {}

    # 1. Record
    print("\n=== 1. CAPTURE ===")
    wav_bytes, rms, capture_ms = record_fixed(4.0)
    timings["capture_ms"] = capture_ms
    if not wav_bytes:
        print("FAIL: No audio captured")
        return False
    print(f"  RMS: {rms:.6f}")
    print(f"  WAV bytes: {len(wav_bytes)}")
    print(f"  Duration: {capture_ms:.0f} ms")

    # 2. STT
    print("\n=== 2. STT ===")
    t0 = time.perf_counter()
    transcript, stt_meta = await sarvam_stt_from_wav(wav_bytes)
    stt_ms = (time.perf_counter() - t0) * 1000
    timings["stt_ms"] = stt_ms
    if not (transcript or "").strip():
        print("FAIL: STT returned empty")
        return False
    print(f"  Transcript: {transcript[:80]}...")
    print(f"  Length: {len(transcript)}")
    print(f"  Latency: {stt_ms:.0f} ms")

    # 3. LLM (simple)
    print("\n=== 3. LLM ===")
    if not GROQ_API_KEY:
        print("SKIP: GROQ_API_KEY not set, using placeholder reply")
        reply_text = "This is a smoke test reply."
    else:
        t0 = time.perf_counter()
        client = AsyncGroq(api_key=GROQ_API_KEY)
        resp = await client.chat.completions.create(
            model=RAG_MODEL,
            messages=[{"role": "user", "content": transcript}],
            max_tokens=50,
            temperature=0.2,
        )
        reply_text = (resp.choices[0].message.content or "").strip() or "No reply."
        llm_ms = (time.perf_counter() - t0) * 1000
        timings["llm_ms"] = llm_ms
        print(f"  Reply: {reply_text[:80]}...")
        print(f"  Latency: {llm_ms:.0f} ms")

    # 4. TTS
    print("\n=== 4. TTS ===")
    t0 = time.perf_counter()
    audio_b64 = await sarvam_tts_to_base64(reply_text, "en-IN")
    tts_ms = (time.perf_counter() - t0) * 1000
    timings["tts_ms"] = tts_ms
    if not audio_b64:
        print("FAIL: TTS returned no audio")
        return False
    audio_bytes = base64.b64decode(audio_b64)
    print(f"  Text length: {len(reply_text)}")
    print(f"  Audio bytes: {len(audio_bytes)}")
    print(f"  Latency: {tts_ms:.0f} ms")

    # 5. Playback (in thread to avoid blocking)
    print("\n=== 5. PLAYBACK ===")
    out_device = _resolve_output_device()
    play_ms = await asyncio.to_thread(play_wav_bytes, audio_bytes, out_device)
    timings["play_ms"] = play_ms
    print(f"  Duration: {play_ms:.0f} ms")

    # Summary
    print("\n=== SUMMARY ===")
    total = sum(timings.values())
    for k, v in timings.items():
        print(f"  {k}: {v:.0f} ms")
    print(f"  TOTAL: {total:.0f} ms")
    print(f"  turn_id: {turn_id}")
    print("\nPASS")
    return True


def main() -> None:
    ok = asyncio.run(run_smoketest())
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
