"""One-shot live typed WS check for M5.3 CSE Data Science HOD identity."""
from __future__ import annotations

import asyncio
import json
import sys

import websockets

WS_URL = "ws://127.0.0.1:6969/ws/clara"
ORIGIN = "http://localhost:5176"


def _payload(msg: dict) -> dict:
    inner = msg.get("payload")
    return inner if isinstance(inner, dict) else msg


def _units(p: dict) -> list[str]:
    plan = p.get("narration_plan")
    if not isinstance(plan, dict):
        return []
    return [
        s["unitId"].strip()
        for s in (plan.get("segments") or [])
        if isinstance(s, dict) and isinstance(s.get("unitId"), str) and s["unitId"].strip()
    ]


async def _drain(ws, seconds: float) -> None:
    end = asyncio.get_event_loop().time() + seconds
    while asyncio.get_event_loop().time() < end:
        remaining = end - asyncio.get_event_loop().time()
        try:
            await asyncio.wait_for(ws.recv(), timeout=min(remaining, 5.0))
        except TimeoutError:
            return


async def main() -> int:
    async with websockets.connect(
        WS_URL, additional_headers={"Origin": ORIGIN}, max_size=20 * 1024 * 1024, open_timeout=10
    ) as ws:
        try:
            await asyncio.wait_for(ws.recv(), timeout=5)
        except TimeoutError:
            pass
        await ws.send(json.dumps({"action": "language_selected", "language": "English"}))
        await _drain(ws, 12)
        await ws.send(json.dumps({"action": "user_message", "text": "Guest"}))
        await _drain(ws, 12)
        await ws.send(json.dumps({"action": "user_message", "text": "Who is the HOD of CSE Data Science?"}))
        end = asyncio.get_event_loop().time() + 40
        while asyncio.get_event_loop().time() < end:
            remaining = end - asyncio.get_event_loop().time()
            try:
                raw = await asyncio.wait_for(ws.recv(), timeout=min(remaining, 10.0))
            except TimeoutError:
                break
            p = _payload(json.loads(raw))
            ids = _units(p)
            if ids:
                print("LIVE_WS_UNIT_IDS", ids, flush=True)
                ok = ids == ["cse_ds.hod"]
                print("LIVE_WS_OK" if ok else "LIVE_WS_MISMATCH", flush=True)
                return 0 if ok else 2
        print("LIVE_WS_NO_PLAN", flush=True)
        return 3


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
