"""WebSocket latency probe for CLARA.

Runs N short turns and prints p50/p95 for ttft_ms, ttfs_ms and total_ms from backend debug timings.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import statistics
from typing import Any

import websockets


def _pct(values: list[float], p: float) -> float:
    if not values:
        return 0.0
    if len(values) == 1:
        return values[0]
    k = (len(values) - 1) * p
    f = int(k)
    c = min(f + 1, len(values) - 1)
    if f == c:
        return values[f]
    return values[f] + (values[c] - values[f]) * (k - f)


async def _recv_until_turn_done(ws: websockets.WebSocketClientProtocol, timeout_s: float) -> dict[str, Any]:
    while True:
        raw = await asyncio.wait_for(ws.recv(), timeout=timeout_s)
        msg = json.loads(raw)
        payload = msg.get("payload") if isinstance(msg, dict) else None
        if not isinstance(payload, dict):
            continue
        if payload.get("error"):
            return payload
        if payload.get("isProcessing") is False:
            return payload


async def run_probe(url: str, turns: int, language: str, timeout_s: float) -> int:
    prompts = [
        "fees",
        "library timing",
        "hostel rules",
        "placement stats",
        "bus route",
        "canteen time",
    ]
    ttft_values: list[float] = []
    ttfs_values: list[float] = []
    total_values: list[float] = []
    first_turn_breakdown: dict[str, Any] | None = None

    async with websockets.connect(url, ping_interval=20, ping_timeout=20, max_size=2**23) as ws:
        await ws.recv()  # state 0
        await ws.send(json.dumps({"action": "wake"}))
        await ws.recv()  # state 5 (chat after wake)
        await ws.send(json.dumps({"action": "language_selected", "language": language}))
        await ws.recv()  # ack
        await ws.send(json.dumps({"action": "conversation_started"}))
        await ws.recv()  # greeting payload

        for i in range(turns):
            prompt = prompts[i % len(prompts)]
            await ws.send(json.dumps({"action": "user_message", "text": prompt}))
            payload = await _recv_until_turn_done(ws, timeout_s=timeout_s)
            timings = (payload.get("debug") or {}).get("timings_ms") or {}
            ttft = timings.get("ttft_ms")
            ttfs = timings.get("ttfs_ms")
            total = timings.get("total_ms")
            if isinstance(ttft, (int, float)):
                ttft_values.append(float(ttft))
            if isinstance(ttfs, (int, float)):
                ttfs_values.append(float(ttfs))
            if isinstance(total, (int, float)):
                total_values.append(float(total))
            if first_turn_breakdown is None and timings:
                first_turn_breakdown = timings
            print(
                f"turn={i+1} ttft_ms={round(float(ttft or 0),1)} ttfs_ms={round(float(ttfs or 0),1)} total_ms={round(float(total or 0),1)} "
                f"isSpeaking={payload.get('isSpeaking')}"
            )

    ttft_values.sort()
    ttfs_values.sort()
    total_values.sort()
    p50_ttft = _pct(ttft_values, 0.5)
    p95_ttft = _pct(ttft_values, 0.95)
    p50_ttfs = _pct(ttfs_values, 0.5)
    p95_ttfs = _pct(ttfs_values, 0.95)
    p50_total = _pct(total_values, 0.5)
    p95_total = _pct(total_values, 0.95)

    print("\nLatency summary")
    ttft_mean = statistics.mean(ttft_values) if ttft_values else 0.0
    ttfs_mean = statistics.mean(ttfs_values) if ttfs_values else 0.0
    total_mean = statistics.mean(total_values) if total_values else 0.0
    print(f"ttft_ms p50={p50_ttft:.1f} p95={p95_ttft:.1f} mean={ttft_mean:.1f}")
    print(f"ttfs_ms p50={p50_ttfs:.1f} p95={p95_ttfs:.1f} mean={ttfs_mean:.1f}")
    print(f"total_ms p50={p50_total:.1f} p95={p95_total:.1f} mean={total_mean:.1f}")
    if first_turn_breakdown:
        print("\nFirst-turn breakdown (ms)")
        for k, v in first_turn_breakdown.items():
            print(f"  {k}: {v}")

    return 0


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", default="ws://localhost:6969/ws/clara")
    parser.add_argument("--turns", type=int, default=20)
    parser.add_argument("--language", default="English")
    parser.add_argument("--timeout", type=float, default=20.0)
    args = parser.parse_args()
    return asyncio.run(run_probe(args.url, args.turns, args.language, args.timeout))


if __name__ == "__main__":
    raise SystemExit(main())
