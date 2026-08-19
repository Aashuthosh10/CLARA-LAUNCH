"""Live WS HOD identity for all six languages. No mocks. No production changes."""
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
    ("hi", "Hindi", "CSE Data Science ka HOD kaun hai?", ["cse_ds.hod"]),
    ("hi", "Hindi", "AIML aur Data Science ke HOD kaun hain?", ["cse_aiml.hod", "cse_ds.hod"]),
    ("hi", "Hindi", "AIML, Data Science aur CSE ke HOD kaun hain?", ["cse_aiml.hod", "cse_ds.hod", "cse.hod"]),
    ("ta", "Tamil", "CSE Data Science HOD yaar?", ["cse_ds.hod"]),
    ("ta", "Tamil", "AIML and Data Science HOD yaar?", ["cse_aiml.hod", "cse_ds.hod"]),
    ("ta", "Tamil", "AIML, Data Science and CSE HOD yaar?", ["cse_aiml.hod", "cse_ds.hod", "cse.hod"]),
    ("te", "Telugu", "CSE Data Science HOD evaru?", ["cse_ds.hod"]),
    ("te", "Telugu", "AIML and Data Science HOD evaru?", ["cse_aiml.hod", "cse_ds.hod"]),
    ("te", "Telugu", "AIML, Data Science and CSE HOD evaru?", ["cse_aiml.hod", "cse_ds.hod", "cse.hod"]),
    ("ml", "Malayalam", "CSE Data Science HOD aaranu?", ["cse_ds.hod"]),
    ("ml", "Malayalam", "AIML and Data Science HOD aaranu?", ["cse_aiml.hod", "cse_ds.hod"]),
    ("ml", "Malayalam", "AIML, Data Science and CSE HOD aaranu?", ["cse_aiml.hod", "cse_ds.hod", "cse.hod"]),
)

SCRIPTS = {
    "kn": ("\u0c80", "\u0cff"),
    "hi": ("\u0900", "\u097f"),
    "ta": ("\u0b80", "\u0bff"),
    "te": ("\u0c00", "\u0c7f"),
    "ml": ("\u0d00", "\u0d7f"),
}


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


def _segs(p: dict) -> list[dict]:
    plan = p.get("narration_plan")
    if not isinstance(plan, dict):
        return []
    return [s for s in (plan.get("segments") or []) if isinstance(s, dict)]


async def _drain(ws, seconds: float) -> None:
    end = asyncio.get_event_loop().time() + seconds
    while asyncio.get_event_loop().time() < end:
        remaining = end - asyncio.get_event_loop().time()
        try:
            await asyncio.wait_for(ws.recv(), timeout=min(remaining, 4.0))
        except TimeoutError:
            return


async def _turn(ws, text: str, expected_n: int) -> tuple[dict | None, dict]:
    await ws.send(json.dumps({"action": "user_message", "text": text}))
    end = asyncio.get_event_loop().time() + TURN_TIMEOUT_S
    plan_payload = None
    chunk_indices: list[int] = []
    unavailable: list[int] = []
    saw_backup = False
    while asyncio.get_event_loop().time() < end:
        remaining = end - asyncio.get_event_loop().time()
        try:
            raw = await asyncio.wait_for(ws.recv(), timeout=min(remaining, 10.0))
        except TimeoutError:
            break
        p = _payload(json.loads(raw))
        if _units(p) and plan_payload is None:
            plan_payload = p
        if p.get("utterance_kind") == "assistant_full_reply_backup":
            saw_backup = True
        if p.get("tts_streaming") is True and isinstance(p.get("tts_chunk_index"), int):
            idx = int(p["tts_chunk_index"])
            if idx not in chunk_indices:
                chunk_indices.append(idx)
            if p.get("audioUnavailable") is True:
                unavailable.append(idx)
            if plan_payload is None and _units(p):
                plan_payload = p
        if plan_payload and len(chunk_indices) >= expected_n:
            return plan_payload, {
                "chunk_indices": sorted(chunk_indices),
                "unavailable": unavailable,
                "backup": saw_backup,
            }
    return plan_payload, {
        "chunk_indices": sorted(chunk_indices),
        "unavailable": unavailable,
        "backup": saw_backup,
    }


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


def _script_ok(lang: str, text: str) -> bool:
    if lang == "en":
        return any(ch.isascii() and ch.isalpha() for ch in text)
    lo, hi = SCRIPTS[lang]
    return any(lo <= ch <= hi for ch in text)


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
            payload, clip_meta = await _turn(ws, text, len(expected))
            ids = _units(payload) if payload else []
            segs = _segs(payload) if payload else []
            bodies = [str(s.get("ttsText") or "") for s in segs]
            titles_leaked = any(
                str(s.get("displayText") or "").split("\n", 1)[0] in (s.get("ttsText") or "")
                and str(s.get("displayText") or "").split("\n", 1)[0].strip()
                and str(s.get("ttsText") or "").strip() != str(s.get("displayText") or "").strip()
                and str(s.get("displayText") or "").split("\n", 1)[0][:20] in str(s.get("ttsText") or "")[:40]
                for s in segs
            )
            script_ok = all(_script_ok(lang_key, b) for b in bodies) if bodies else False
            title_not_in_tts = True
            for s in segs:
                display = str(s.get("displayText") or "")
                tts = str(s.get("ttsText") or "")
                title = display.split("\n", 1)[0].strip()
                body = display.split("\n", 1)[1].strip() if "\n" in display else ""
                if title and body and tts.strip() == f"{title}\n{body}".strip():
                    title_not_in_tts = False
            chunks_ok = clip_meta.get("chunk_indices") == list(range(len(expected)))
            no_backup = clip_meta.get("backup") is False
            ok = (
                ids == expected
                and bool(bodies)
                and all(b.strip() for b in bodies)
                and script_ok
                and title_not_in_tts
                and chunks_ok
                and no_backup
            )
            if not ok:
                failed += 1
            print(
                json.dumps(
                    {
                        "status": "PASS" if ok else "FAIL",
                        "lang": lang_key,
                        "expected": expected,
                        "actual": ids,
                        "n_clips": len(bodies),
                        "chunk_indices": clip_meta.get("chunk_indices"),
                        "audio_unavailable": clip_meta.get("unavailable"),
                        "backup": clip_meta.get("backup"),
                        "script_ok": script_ok,
                        "tts_is_body_only": title_not_in_tts,
                        "tts_lens": [len(b) for b in bodies],
                        "tts0_prefix": (bodies[0][:48] if bodies else ""),
                    },
                    ensure_ascii=False,
                ),
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
