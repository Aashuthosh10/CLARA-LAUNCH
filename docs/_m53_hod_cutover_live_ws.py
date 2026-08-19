"""Live typed WS verification for M5.3 HOD identity + localization.

Requires the real backend on :6969. No mocks.
Run from repo root:
  python docs/_m53_hod_cutover_live_ws.py
"""
from __future__ import annotations

import asyncio
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import websockets

WS_URL = "ws://127.0.0.1:6969/ws/clara"
ORIGIN = "http://localhost:5176"
TURN_TIMEOUT_S = 50.0

CASES = (
    ("en", "English", "Who is the HOD of CSE Data Science?", ["cse_ds.hod"]),
    ("en", "English", "Who is the HOD of AIML and Data Science?", ["cse_aiml.hod", "cse_ds.hod"]),
    ("en", "English", "Who are the HODs of AIML, Data Science and CSE?", ["cse_aiml.hod", "cse_ds.hod", "cse.hod"]),
    ("kn", "Kannada", "CSE Data Science HOD yaaru?", ["cse_ds.hod"]),
    ("kn", "Kannada", "AIML mattu Data Science HOD yaaru?", ["cse_aiml.hod", "cse_ds.hod"]),
    ("kn", "Kannada", "AIML, Data Science mattu CSE HOD yaaru?", ["cse_aiml.hod", "cse_ds.hod", "cse.hod"]),
)


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


def _first_seg(p: dict) -> dict:
    plan = p.get("narration_plan")
    if not isinstance(plan, dict):
        return {}
    segs = plan.get("segments") or []
    return segs[0] if segs and isinstance(segs[0], dict) else {}


async def _drain(ws, seconds: float) -> None:
    end = asyncio.get_event_loop().time() + seconds
    while asyncio.get_event_loop().time() < end:
        remaining = end - asyncio.get_event_loop().time()
        try:
            await asyncio.wait_for(ws.recv(), timeout=min(remaining, 4.0))
        except TimeoutError:
            return


async def _turn(ws, text: str) -> dict | None:
    await ws.send(json.dumps({"action": "user_message", "text": text}))
    end = asyncio.get_event_loop().time() + TURN_TIMEOUT_S
    while asyncio.get_event_loop().time() < end:
        remaining = end - asyncio.get_event_loop().time()
        try:
            raw = await asyncio.wait_for(ws.recv(), timeout=min(remaining, 10.0))
        except TimeoutError:
            break
        p = _payload(json.loads(raw))
        ids = _units(p)
        if ids:
            return p
    return None


async def _session(lang_name: str):
    ws = await websockets.connect(
        WS_URL,
        additional_headers={"Origin": ORIGIN},
        max_size=20 * 1024 * 1024,
        open_timeout=10,
    )
    try:
        await asyncio.wait_for(ws.recv(), timeout=5)
    except TimeoutError:
        pass
    await ws.send(json.dumps({"action": "language_selected", "language": lang_name}))
    await _drain(ws, 14)
    await ws.send(json.dumps({"action": "user_message", "text": "Guest"}))
    await _drain(ws, 14)
    return ws


async def main() -> int:
    failed = 0
    current_lang = None
    ws = None
    try:
        for lang_key, lang_name, text, expected in CASES:
            if current_lang != lang_name:
                if ws is not None:
                    await ws.close()
                ws = await _session(lang_name)
                current_lang = lang_name
            assert ws is not None
            payload = await _turn(ws, text)
            ids = _units(payload) if payload else []
            first = _first_seg(payload) if payload else {}
            tts = str(first.get("ttsText") or "")
            kn_ok = True
            if lang_key == "kn" and tts:
                kn_ok = any("\u0c80" <= ch <= "\u0cff" for ch in tts)
            ok = ids == expected and bool(tts.strip()) and kn_ok
            status = "PASS" if ok else "FAIL"
            if not ok:
                failed += 1
            print(
                f"{status} lang={lang_key} expected={expected} actual={ids} "
                f"first_unit={first.get('unitId')} tts_len={len(tts)} kn_script={kn_ok}",
                flush=True,
            )
            await _drain(ws, 2)
    finally:
        if ws is not None:
            await ws.close()

    print("LIVE_WS_ALL_OK" if failed == 0 else f"LIVE_WS_FAILURES={failed}", flush=True)
    return 0 if failed == 0 else 2


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
