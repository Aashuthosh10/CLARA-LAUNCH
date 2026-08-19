"""M5.3 card+TTS forensic probe. Read-only. Not production."""
from __future__ import annotations

import asyncio
import inspect
import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
os.environ.setdefault("PYTHONIOENCODING", "utf-8")

from backend.services.content.department_identity import match_department_keys_exclusive
from backend.services.content.department_resolver import resolve_department_key
from backend.services.content.semantic_request_parser import (
    parse_semantic_request,
    normalize_user_input,
)
from backend.services.content.unit_selector import select_content_units, resolve_units_for_plan
from backend.services.content.surface_narration_mapper import map_content_units_to_segments
from backend.services.content import department_resolver as dr
from backend.services.content.semantic_request_parser import parse_semantic_request as psr

import websockets

WS_URL = "ws://127.0.0.1:6969/ws/clara"
ORIGIN = "http://localhost:5176"

CASES = [
    ("EN_DS_HOD", "en", "English", "Who is the HOD of CSE Data Science?"),
    ("EN_MULTI_HOD", "en", "English", "Who is the HOD of AIML and Data Science?"),
    ("KN_MULTI_HOD", "kn", "Kannada", "AIML mattu Data Science HOD yaaru?"),
    ("KN_DS_HOD", "kn", "Kannada", "CSE Data Science HOD yaaru?"),
    ("KN_FEES", "kn", "Kannada", "CSE ಶುಲ್ಕ ಎಷ್ಟು?"),
]


def _script(s: str) -> str:
    if not s:
        return "empty"
    if any("\u0c80" <= ch <= "\u0cff" for ch in s):
        return "kannada"
    if any(ord(ch) > 127 for ch in s):
        return "non_ascii"
    return "latin"


def in_process(raw: str, lang: str) -> dict:
    exclusive = list(match_department_keys_exclusive(raw))
    re_resolved = []
    for key in exclusive:
        r = resolve_department_key(department=str(key), language=lang, user_text="")
        re_resolved.append({"in": key, "out": r.json_key, "source": r.source, "conf": r.confidence})
    req = parse_semantic_request(raw_text=raw, language_code_key=lang)
    plan = select_content_units(req) if req else None
    units = resolve_units_for_plan(plan) if plan else ()
    segs = map_content_units_to_segments(units, lang_key=lang) if units else []
    return {
        "input": raw,
        "language": lang,
        "normalized": normalize_user_input(raw),
        "exclusive_match": exclusive,
        "re_resolved": re_resolved,
        "semantic_request": None
        if req is None
        else {
            "source": req.source,
            "topic": req.topic,
            "entities": list(req.entities),
            "scope": req.requested_scope,
            "confidence": req.confidence,
            "language_code": req.language_code,
        },
        "presentation_plan_unitIds": None if plan is None else list(plan.units),
        "content_units": [
            {
                "unit_id": u.unit_id,
                "title": u.title,
                "title_script": _script(u.title),
                "body": u.body,
                "body_script": _script(u.body),
                "language": u.language,
                "language_code": u.language_code,
            }
            for u in units
        ],
        "narration_segments": [
            {
                "unitId": s.unit_id,
                "displayText": s.display_text,
                "display_script": _script(s.display_text),
                "ttsText": s.tts_text,
                "tts_script": _script(s.tts_text),
                "cardIndex": s.card_index,
            }
            for s in segs
        ],
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


async def _drain(ws, seconds: float, *, until_units: bool = False) -> list[dict]:
    out: list[dict] = []
    loop = asyncio.get_event_loop()
    end = loop.time() + seconds
    while loop.time() < end:
        remaining = end - loop.time()
        try:
            raw = await asyncio.wait_for(ws.recv(), timeout=min(remaining, 2.0))
        except TimeoutError:
            if until_units:
                continue
            return out
        try:
            p = _payload(json.loads(raw))
        except Exception:
            continue
        out.append(p)
        if until_units and _units(p):
            extra = loop.time() + 8
            while loop.time() < extra:
                try:
                    raw = await asyncio.wait_for(ws.recv(), timeout=2.0)
                    out.append(_payload(json.loads(raw)))
                except TimeoutError:
                    break
                except Exception:
                    break
            return out
    return out


def _summarize_ws(payloads: list[dict], query: str) -> dict:
    best = None
    for p in payloads:
        ids = _units(p)
        if ids:
            best = p
    loc = None
    tts_code = None
    lang_name = None
    if best:
        loc = (best.get("runtime") or {}).get("localization") if isinstance(best.get("runtime"), dict) else None
        if not loc and isinstance(best.get("localization"), dict):
            loc = best.get("localization")
        tts_code = None
        if isinstance(loc, dict):
            tts_code = loc.get("ttsCode") or loc.get("tts_code")
        lang_name = best.get("currentLanguage") or (best.get("runtime") or {}).get("currentLanguage")
    segs = []
    if best and isinstance(best.get("narration_plan"), dict):
        for s in best["narration_plan"].get("segments") or []:
            if not isinstance(s, dict):
                continue
            segs.append(
                {
                    "unitId": s.get("unitId"),
                    "displayText": s.get("displayText"),
                    "display_script": _script(str(s.get("displayText") or "")),
                    "ttsText": s.get("ttsText"),
                    "tts_script": _script(str(s.get("ttsText") or "")),
                    "cardIndex": s.get("cardIndex"),
                    "sectionId": s.get("sectionId"),
                }
            )
    audio_seen = any(isinstance(p.get("audioBase64"), str) and p.get("audioBase64") for p in payloads)
    tts_chunks = 0
    show_card = None
    intent = None
    spoken = None
    assistant = None
    for p in payloads:
        chunks = p.get("tts_audio_chunks") or p.get("ttsAudioChunks")
        if isinstance(chunks, list):
            tts_chunks += len(chunks)
        if isinstance(p.get("audioBase64"), str) and p.get("audioBase64"):
            tts_chunks += 1
        if p.get("showCard") is not None:
            show_card = p.get("showCard")
        if p.get("intent") is not None:
            intent = p.get("intent")
        if isinstance(p.get("spokenText"), str) and p.get("spokenText"):
            spoken = p.get("spokenText")
        if isinstance(p.get("assistantText"), str) and p.get("assistantText"):
            assistant = p.get("assistantText")
    return {
        "query": query,
        "ws_unitIds": _units(best) if best else [],
        "tts_code": tts_code,
        "language_name": lang_name,
        "localization": loc,
        "segments": segs,
        "showCard": show_card,
        "intent": intent,
        "spokenText": spoken,
        "spoken_script": _script(str(spoken or "")),
        "assistantText": (assistant or "")[:400],
        "audio_seen": audio_seen,
        "tts_chunk_count": tts_chunks,
        "payload_keys": sorted({k for p in payloads for k in p.keys()}),
    }


async def live_session(language_name: str, queries: list[str]) -> dict:
    async with websockets.connect(
        WS_URL, additional_headers={"Origin": ORIGIN}, max_size=20 * 1024 * 1024, open_timeout=10
    ) as ws:
        await _drain(ws, 3)
        await ws.send(json.dumps({"action": "language_selected", "language": language_name}))
        await _drain(ws, 12)
        await ws.send(json.dumps({"action": "user_message", "text": "Guest"}))
        await _drain(ws, 12)
        results = []
        for q in queries:
            await ws.send(json.dumps({"action": "user_message", "text": q}))
            payloads = await _drain(ws, 45, until_units=True)
            results.append(_summarize_ws(payloads, q))
        return {"language": language_name, "results": results}


def fingerprint() -> dict:
    src = inspect.getsource(psr)
    return {
        "parser_source": "m5.3_semantic_request_parser" if "m5.3_semantic_request_parser" in src else "UNKNOWN",
        "loose_in_resolver": "_loose_resolve_department_json_key" in inspect.getsource(dr),
        "pid_note": "in-process import of current disk; live WS below confirms serving process",
    }


def main() -> int:
    out = {
        "fingerprint": fingerprint(),
        "in_process": {cid: in_process(raw, lang) for cid, lang, _name, raw in CASES},
    }
    print(json.dumps({"fingerprint": out["fingerprint"]}, ensure_ascii=True, indent=2), flush=True)
    for cid, rec in out["in_process"].items():
        print(
            json.dumps(
                {
                    "case": cid,
                    "exclusive": rec["exclusive_match"],
                    "entities": None if rec["semantic_request"] is None else rec["semantic_request"]["entities"],
                    "unitIds": rec["presentation_plan_unitIds"],
                    "body_scripts": [u["body_script"] for u in rec["content_units"]],
                },
                ensure_ascii=True,
            ),
            flush=True,
        )

    async def _run():
        en = await live_session(
            "English",
            [
                "Who is the HOD of CSE Data Science?",
                "Who is the HOD of AIML and Data Science?",
            ],
        )
        kn = await live_session(
            "Kannada",
            [
                "AIML mattu Data Science HOD yaaru?",
                "CSE Data Science HOD yaaru?",
                "CSE ಶುಲ್ಕ ಎಷ್ಟು?",
            ],
        )
        return {"english_ws": en, "kannada_ws": kn}

    out["live_ws"] = asyncio.run(_run())
    dest = ROOT / "docs" / "_m53_card_tts_forensic_traces.json"
    dest.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    print("WROTE", dest, flush=True)
    for block_name in ("english_ws", "kannada_ws"):
        block = out["live_ws"][block_name]
        for r in block["results"]:
            print(
                json.dumps(
                    {
                        "lang": block["language"],
                        "query": r["query"],
                        "ws_unitIds": r["ws_unitIds"],
                        "tts_code": r["tts_code"],
                        "seg_scripts": [
                            {"unitId": s["unitId"], "display": s["display_script"], "tts": s["tts_script"]}
                            for s in r["segments"]
                        ],
                        "showCard": r.get("showCard"),
                        "intent": r.get("intent"),
                        "spoken_script": r.get("spoken_script"),
                        "audio_seen": r["audio_seen"],
                    },
                    ensure_ascii=True,
                ),
                flush=True,
            )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
