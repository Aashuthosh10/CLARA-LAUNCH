"""TEMPORARY Stage A live WS probe. Typed user_message only. ASR = N/A.

Does not change production semantic behavior. Drive language_selected then typed
user_message against the real backend /ws/clara and log narration_plan unitIds.

Run from repo root with backend on :6969:
  python docs/_m53_live_ws_probe.py
"""
from __future__ import annotations

import asyncio
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import importlib.util  # noqa: E402

import websockets  # noqa: E402

from backend.config.settings import TARGET_LANGUAGE_CODES  # noqa: E402
from backend.services.content.semantic_request_parser import parse_semantic_request  # noqa: E402
from backend.services.content.unit_selector import select_content_units  # noqa: E402

_spec = importlib.util.spec_from_file_location(
    "_m53_forensic_probe", ROOT / "docs" / "_m53_forensic_probe.py"
)
_mod = importlib.util.module_from_spec(_spec)
assert _spec.loader is not None
_spec.loader.exec_module(_mod)
CASES = _mod.CASES
_conf_band = _mod._conf_band

WS_URL = "ws://127.0.0.1:6969/ws/clara"
ORIGIN = "http://localhost:5176"
TURN_TIMEOUT_S = 45.0
GUEST_NAME = "Guest"

LANG_NAME = {
    "en": "English",
    "kn": "Kannada",
    "hi": "Hindi",
    "ta": "Tamil",
    "te": "Telugu",
    "ml": "Malayalam",
}

# Representative live-WS subset: every language + every required category.
# Full 75-case golden matrix is in _m53_forensic_traces.json (same parser WS uses).
LIVE_IDS = [
    "parity_hod_ds_en",
    "parity_hod_ds_kn",
    "parity_hod_ds_hi",
    "parity_hod_ds_ta",
    "parity_hod_ds_te",
    "parity_hod_ds_ml",
    "parity_fees_aiml_en",
    "parity_mh_en",
    "parity_mh_aimlds_kn",
    "en_col_fees",
    "en_place",
    "en_ach",
    "kn_lit_fees",
    "kn_rom_fees",
    "kn_col_hod",
    "kn_cs_ov",
    "hi_script_fees",
    "hi_rom_fees",
    "ta_rom_fees",
    "te_rom_fees",
    "ml_rom_fees",
    "neg_fees_and_hod",
    "neg_hod_and_aiml_fees",
    "neg_which_dept",
]


def _payload(msg: dict) -> dict:
    if not isinstance(msg, dict):
        return {}
    inner = msg.get("payload")
    return inner if isinstance(inner, dict) else msg


def _unit_ids(plan: dict | None) -> list[str]:
    if not isinstance(plan, dict):
        return []
    out: list[str] = []
    for s in plan.get("segments") or []:
        if isinstance(s, dict) and isinstance(s.get("unitId"), str) and s["unitId"].strip():
            out.append(s["unitId"].strip())
    return out


def _strip_audio(obj: dict) -> dict:
    drop = {
        "audioBase64",
        "languagePromptAudioBase64",
        "audio",
        "ttsAudio",
        "audio_queue",
        "ttsAudioQueue",
    }
    return {k: v for k, v in obj.items() if k not in drop}


async def _send(ws, action: str, **fields) -> None:
    await ws.send(json.dumps({"action": action, **fields}))


async def _recv_until(ws, predicate, timeout: float) -> list[dict]:
    frames: list[dict] = []
    deadline = asyncio.get_event_loop().time() + timeout
    while True:
        remaining = deadline - asyncio.get_event_loop().time()
        if remaining <= 0:
            break
        try:
            raw = await asyncio.wait_for(ws.recv(), timeout=min(remaining, 15.0))
        except TimeoutError:
            continue
        except websockets.exceptions.ConnectionClosed:
            break
        try:
            msg = json.loads(raw)
        except json.JSONDecodeError:
            continue
        frames.append(msg)
        if predicate(msg):
            break
    return frames


def _has_plan(msg: dict) -> bool:
    p = _payload(msg)
    plan = p.get("narration_plan")
    return isinstance(plan, dict) and bool(plan.get("segments"))


def _turn_complete(msg: dict) -> bool:
    """Stage A: stop at first narration_plan (unitIds). Do not wait for full TTS playback."""
    p = _payload(msg)
    if p.get("error") and p.get("isProcessing") is False:
        return True
    if _has_plan(msg):
        return True
    if p.get("type") == "assistant_audio_update" and p.get("tts_streaming") is False:
        return True
    if p.get("isSpeaking") is False and p.get("isProcessing") is False and p.get("messages"):
        if p.get("type") != "assistant_audio_update":
            return True
    return False


async def _wait_turn(ws, timeout: float = TURN_TIMEOUT_S) -> tuple[list[dict], dict]:
    frames = await _recv_until(ws, _turn_complete, timeout)
    last = _payload(frames[-1]) if frames else {}
    plans = []
    for f in frames:
        p = _payload(f)
        plan = p.get("narration_plan")
        if isinstance(plan, dict):
            plans.append(plan)
    return frames, {
        "last_type": last.get("type"),
        "last_error": last.get("error"),
        "tts_streaming": last.get("tts_streaming"),
        "isSpeaking": last.get("isSpeaking"),
        "isProcessing": last.get("isProcessing"),
        "has_audio": bool(last.get("audioBase64")),
        "narration_plan_unit_ids": _unit_ids(plans[-1] if plans else None),
        "narration_plan_mode": (plans[-1] or {}).get("mode") if plans else None,
        "session_language": last.get("language") or last.get("language_name"),
        "tts_language": last.get("ttsLanguage") or last.get("language_code"),
        "last_payload_keys": sorted(_strip_audio(last).keys()),
    }


async def run() -> dict:
    by_id = {c["id"]: c for c in CASES}
    cases = [by_id[i] for i in LIVE_IDS if i in by_id]
    rows: list[dict] = []
    connected = False
    error: str | None = None

    try:
        async with websockets.connect(
            WS_URL,
            additional_headers={"Origin": ORIGIN},
            max_size=20 * 1024 * 1024,
            open_timeout=10,
        ) as ws:
            connected = True
            hello = await _recv_until(ws, lambda m: True, 5.0)

            current_lang: str | None = None
            named = False
            for exp in cases:
                lang = exp["language"]
                if lang != current_lang:
                    await _send(ws, "cancel_turn")
                    await asyncio.sleep(0.4)
                    await _send(ws, "reset_session")
                    await _recv_until(ws, lambda m: True, 6.0)
                    await _send(ws, "language_selected", language=LANG_NAME[lang])
                    await _wait_turn(ws, timeout=25.0)
                    await _send(ws, "user_message", text=GUEST_NAME)
                    await _wait_turn(ws, timeout=25.0)
                    current_lang = lang
                    named = True

                await _send(ws, "user_message", text=exp["input"])
                frames, summary = await _wait_turn(ws)
                req = parse_semantic_request(raw_text=exp["input"], language_code_key=lang)
                ws_units = summary["narration_plan_unit_ids"]
                ir_units = []
                if req is not None:
                    plan = select_content_units(req)
                    if plan is not None:
                        ir_units = list(plan.units)

                none_ok = exp["expected_topic"] is None and not exp["expected_unit_ids"]
                ws_match = (
                    (not ws_units and none_ok)
                    or ws_units == list(exp["expected_unit_ids"])
                )
                row = {
                    "id": exp["id"],
                    "input": exp["input"],
                    "language": lang,
                    "asr": "typed",
                    "expected_topic": exp["expected_topic"],
                    "expected_entities": exp["expected_entities"],
                    "expected_scope": exp["expected_scope"],
                    "expected_unit_ids": exp["expected_unit_ids"],
                    "actual_semantic_request": None
                    if req is None
                    else {
                        "topic": req.topic,
                        "entities": list(req.entities),
                        "requested_scope": req.requested_scope,
                        "confidence": req.confidence,
                        "language_code": req.language_code,
                    },
                    "actual_confidence_band": _conf_band(req),
                    "in_process_unit_ids": ir_units,
                    "ws_unit_ids": ws_units,
                    "ws_narration_mode": summary["narration_plan_mode"],
                    "ws_has_audio": summary["has_audio"],
                    "ws_error": summary["last_error"],
                    "ws_last_type": summary["last_type"],
                    "ws_tts_language": summary["tts_language"],
                    "ws_ir_unit_ids_match": ws_units == ir_units,
                    "ws_expected_match": ws_match,
                    "frame_count": len(frames),
                    "guest_name_sent": named,
                }
                rows.append(row)
                dest = ROOT / "docs" / "_m53_live_ws_traces.json"
                dest.write_text(
                    json.dumps(
                        {
                            "probe": "TEMPORARY Stage A live typed WS probe — not production",
                            "partial": True,
                            "connected": True,
                            "asr": "typed / N/A",
                            "total": len(rows),
                            "rows": rows,
                        },
                        indent=2,
                        ensure_ascii=False,
                    ),
                    encoding="utf-8",
                )
                print(
                    f"{exp['id']}: expected={exp['expected_unit_ids']} ws={ws_units} "
                    f"match={ws_match} audio={summary['has_audio']} err={summary['last_error']}",
                    flush=True,
                )
    except Exception as exc:  # noqa: BLE001
        error = f"{type(exc).__name__}: {exc}"

    out = {
        "probe": "TEMPORARY Stage A live typed WS probe — not production",
        "ws_url": WS_URL,
        "origin": ORIGIN,
        "connected": connected,
        "error": error,
        "asr": "typed / N/A",
        "total": len(rows),
        "ws_expected_match": sum(1 for r in rows if r["ws_expected_match"]),
        "ws_ir_match": sum(1 for r in rows if r["ws_ir_unit_ids_match"]),
        "tts_verified": any(r.get("ws_has_audio") for r in rows),
        "rows": rows,
    }
    dest = ROOT / "docs" / "_m53_live_ws_traces.json"
    dest.write_text(json.dumps(out, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"wrote {dest} connected={connected} error={error} rows={len(rows)}", flush=True)
    return out


if __name__ == "__main__":
    asyncio.run(run())
