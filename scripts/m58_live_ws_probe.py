"""Live WebSocket TTS probe for M5.8. Talks to a freshly started backend, not an unknown old process."""

from __future__ import annotations

import argparse
import asyncio
import json
import sys
import time

import websockets

ORIGIN = "http://localhost:5176"


def _payload(msg: dict) -> dict:
    inner = msg.get("payload")
    return inner if isinstance(inner, dict) else msg


async def _drain(ws, seconds: float) -> None:
    end = time.perf_counter() + seconds
    while time.perf_counter() < end:
        remaining = end - time.perf_counter()
        try:
            await asyncio.wait_for(ws.recv(), timeout=min(remaining, 2.0))
        except TimeoutError:
            return


async def probe(url: str, language: str, question: str, timeout_s: float) -> dict:
    t0 = time.perf_counter()
    result: dict = {
        "ok": False,
        "language": language,
        "question": question,
        "first_stream_ms": None,
        "final_ms": None,
        "tts_plan_mode": None,
        "tts_metrics": None,
        "tts_chunk_indices": [],
        "has_audio": False,
        "audio_unavailable": None,
        "error": None,
    }
    async with websockets.connect(
        url,
        additional_headers={"Origin": ORIGIN},
        max_size=20 * 1024 * 1024,
        open_timeout=10,
    ) as ws:
        try:
            await asyncio.wait_for(ws.recv(), timeout=5)
        except TimeoutError:
            pass
        await ws.send(json.dumps({"action": "language_selected", "language": language}))
        await _drain(ws, 8)
        await ws.send(json.dumps({"action": "user_message", "text": "Guest"}))
        await _drain(ws, 8)
        await ws.send(json.dumps({"action": "user_message", "text": question}))
        end = time.perf_counter() + timeout_s
        while time.perf_counter() < end:
            remaining = end - time.perf_counter()
            try:
                raw = await asyncio.wait_for(ws.recv(), timeout=min(remaining, 10.0))
            except TimeoutError:
                break
            p = _payload(json.loads(raw))
            now = (time.perf_counter() - t0) * 1000.0
            if p.get("type") == "assistant_audio_update" and p.get("tts_streaming") is True:
                idx = p.get("tts_chunk_index")
                if isinstance(idx, int):
                    result["tts_chunk_indices"].append(idx)
                if result["first_stream_ms"] is None:
                    result["first_stream_ms"] = round(now, 1)
                    result["tts_plan_mode"] = p.get("tts_plan_mode")
                    result["has_audio"] = bool(p.get("audioBase64"))
            if p.get("type") == "assistant_audio_update" and p.get("tts_streaming") is False:
                result["final_ms"] = round(now, 1)
                result["tts_metrics"] = p.get("tts_metrics") or (p.get("debug") or {}).get("tts_metrics")
                result["audio_unavailable"] = p.get("audioUnavailable")
                result["has_audio"] = result["has_audio"] or bool(p.get("audioBase64") or p.get("tts_audio_queue"))
                result["ok"] = result["has_audio"] and p.get("audioUnavailable") is not True
                return result
    result["error"] = "no_final_audio_update"
    return result


async def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", default="ws://127.0.0.1:6971/ws/clara")
    parser.add_argument("--timeout", type=float, default=45.0)
    args = parser.parse_args()
    cases = [
        ("English", "How good are the teachers here?"),
        ("Kannada", "teachers hegiddare?"),
    ]
    all_ok = True
    for language, question in cases:
        result = await probe(args.url, language, question, args.timeout)
        print("M58_LIVE_WS", json.dumps(result, ensure_ascii=False), flush=True)
        all_ok = all_ok and bool(result.get("ok"))
    return 0 if all_ok else 2


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
