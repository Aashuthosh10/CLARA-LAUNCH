#!/usr/bin/env python3
"""Latency benchmark for CLARA text turns (no mic).

Runs N short turns and reports p50/p95 for key stages from backend debug timings.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import os
import statistics
import sys
from pathlib import Path
from typing import Any

# Ensure project root is importable.
_PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))


def _pct(values: list[float], p: float) -> float:
    if not values:
        return 0.0
    values = sorted(values)
    k = int(round((p / 100.0) * (len(values) - 1)))
    return float(values[k])


class _DummyWebSocket:
    async def send_json(self, payload: Any) -> None:
        return None


async def _run_turn(text: str, process_user_text_and_reply: Any, TurnTiming: Any) -> dict[str, float | None]:
    timing = TurnTiming()
    timing.mark("transcript_ready")
    session: dict[str, Any] = {
        "language": "English",
        "language_code": "en-IN",
        "language_name": "English",
        "language_code_key": "en",
        "is_language_auto": False,
        "language_detection": None,
        "messages": [],
        "cached_greeting_audio": None,
        "cached_greeting_message": None,
    }
    ws = _DummyWebSocket()
    await process_user_text_and_reply(session, text, ws, timing, stt_meta=None)
    return timing.summary_ms()


def _collect(results: list[dict[str, float | None]], key: str) -> list[float]:
    return [float(t.get(key) or 0.0) for t in results if t.get(key) is not None]


def _stage_row(results: list[dict[str, float | None]], key: str) -> tuple[float, float, float]:
    vals = _collect(results, key)
    if not vals:
        return 0.0, 0.0, 0.0
    return _pct(vals, 50), _pct(vals, 95), statistics.mean(vals)


async def _run(args: argparse.Namespace) -> dict[str, Any]:
    from backend.app.main import TurnTiming, process_user_text_and_reply
    from backend.clients.provider_clients import warmup_clients
    from backend.core.rag import warmup_rag

    await asyncio.gather(asyncio.to_thread(warmup_rag), warmup_clients(), return_exceptions=True)

    texts = [
        "What is the admission process?",
        "What is the fee structure?",
        "What documents are required for admission?",
        "Who is the ECE HOD?",
        "Tell me about placements.",
        "Where is the college located?",
        "What courses are available?",
    ]
    corpus = (texts * ((args.turns + len(texts) - 1) // len(texts)))[: args.turns]
    results: list[dict[str, float | None]] = []

    print(
        f"Running {len(corpus)} turns | streaming={os.getenv('ENABLE_LLM_STREAMING','')} "
        f"pipelining={os.getenv('ENABLE_TTS_PIPELINING','')} first_sentence_tts={os.getenv('ENABLE_FIRST_SENTENCE_TTS','')}"
    )
    for idx, text in enumerate(corpus, 1):
        timings = await _run_turn(text, process_user_text_and_reply, TurnTiming)
        results.append(timings)
        print(
            f"Turn {idx:02d} ttft={timings.get('ttft_ms'):.0f}ms "
            f"visible={timings.get('visible_answer_ms'):.0f}ms "
            f"audio_ready={timings.get('audio_first_ready_ms'):.0f}ms "
            f"ttfs={timings.get('ttfs_ms'):.0f}ms total={timings.get('total_ms'):.0f}ms"
        )

    stages = [
        ("Visible answer", "visible_answer_ms"),
        ("Audio first ready", "audio_first_ready_ms"),
        ("RAG", "rag_ms"),
        ("LLM", "llm_ms"),
        ("TTS(first)", "tts_first_ms"),
        ("TTS(full)", "tts_ms"),
        ("TTFT", "ttft_ms"),
        ("TTFS", "ttfs_ms"),
        ("TOTAL", "total_ms"),
    ]
    summary: dict[str, dict[str, float]] = {}
    print("\n| Stage | p50 ms | p95 ms | mean ms |")
    print("|---|---:|---:|---:|")
    for label, key in stages:
        p50, p95, mean = _stage_row(results, key)
        summary[key] = {"p50": p50, "p95": p95, "mean": mean}
        print(f"| {label} | {p50:.0f} | {p95:.0f} | {mean:.1f} |")

    payload = {
        "label": args.label,
        "turns": len(corpus),
        "env": {
            "ENABLE_LLM_STREAMING": os.getenv("ENABLE_LLM_STREAMING"),
            "ENABLE_TTS_PIPELINING": os.getenv("ENABLE_TTS_PIPELINING"),
            "ENABLE_FIRST_SENTENCE_TTS": os.getenv("ENABLE_FIRST_SENTENCE_TTS"),
            "ENABLE_ACK_EARCON": os.getenv("ENABLE_ACK_EARCON"),
            "ENABLE_EARLY_PARTIAL_TEXT": os.getenv("ENABLE_EARLY_PARTIAL_TEXT"),
            "LOW_LATENCY_VOICE_MODE": os.getenv("LOW_LATENCY_VOICE_MODE"),
            "AUDIO_UPDATE_TIMEOUT_S": os.getenv("AUDIO_UPDATE_TIMEOUT_S"),
            "RAG_CONTEXT_TIMEOUT_S": os.getenv("RAG_CONTEXT_TIMEOUT_S"),
            "LLM_MAX_TOKENS": os.getenv("LLM_MAX_TOKENS"),
        },
        "summary": summary,
    }
    return payload


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--turns", type=int, default=20)
    parser.add_argument("--label", default="run")
    parser.add_argument("--output", default="")
    parser.add_argument("--streaming", choices=("true", "false"), default="true")
    parser.add_argument("--pipelining", choices=("true", "false"), default="true")
    parser.add_argument("--first-sentence-tts", choices=("true", "false"), default="true")
    parser.add_argument("--ack-earcon", choices=("true", "false"), default="true")
    parser.add_argument("--early-partial", choices=("true", "false"), default="true")
    args = parser.parse_args()

    # Must be set before importing backend.main/config.
    os.environ["ENABLE_LLM_STREAMING"] = args.streaming
    os.environ["ENABLE_TTS_PIPELINING"] = args.pipelining
    os.environ["ENABLE_FIRST_SENTENCE_TTS"] = args.first_sentence_tts
    os.environ["ENABLE_ACK_EARCON"] = args.ack_earcon
    os.environ["ENABLE_EARLY_PARTIAL_TEXT"] = args.early_partial
    os.environ.setdefault("LOW_LATENCY_VOICE_MODE", "true")

    result = asyncio.run(_run(args))
    if args.output:
        out_path = Path(args.output)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(json.dumps(result, indent=2), encoding="utf-8")
        print(f"\nWrote benchmark summary: {out_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
