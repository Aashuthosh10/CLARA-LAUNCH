"""Read-only M5.4 receptionist intelligence probe. Does not change production."""
from __future__ import annotations

import asyncio
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import websockets  # noqa: E402

from backend.services.answer_generation import (  # noqa: E402
    extract_features,
    normalize_user_input,
    resolve_intent_from_features,
)
from backend.services.content.semantic_request_parser import parse_semantic_request  # noqa: E402
from backend.services.content.unit_selector import select_content_units  # noqa: E402
from backend.services.conversation.pipeline import run_conversation_intelligence  # noqa: E402
from backend.services.conversation.semantic_normalize import normalize_semantic_topic  # noqa: E402
from backend.services.faq_answers import get_faq_answer_for_question  # noqa: E402
from backend.services.orchestration.conversation_orchestrator import ConversationOrchestrator  # noqa: E402
from backend.services.session_language import set_session_language  # noqa: E402

OUT = ROOT / "docs" / "_m54_receptionist_probe_out.json"
WS_URL = "ws://127.0.0.1:6969/ws/clara"
ORIGIN = "http://localhost:5176"

QUERIES = [
    "Who is the HOD of CSE Data Science?",
    "CSE fees",
    "CSE bagge heli",
    "datascience mathe aiml du hod yaaru?",
    "How good are the teachers here?",
    "Tell me about campus life.",
    "Compare this college with another college.",
    "What about them?",
    "hello",
    "what is the capital of France?",
    "fuck you",
    "Are the professors experienced?",
    "How is campus life?",
    "Do students get opportunities?",
    "Are there good labs?",
    "How are placements?",
    "Is this college good for engineering?",
    "Can students participate in hackathons?",
    "Who is the HOD?",
    "Tell me about CSE and fees.",
    "Fees?",
    "Tell me about another college.",
    "Compare your college with Harvard.",
    "Tell me a joke.",
    "CSE fees yestu?",
    "CSE ಶುಲ್ಕ",
    "CSE फीस",
]


def _ascii(s, n=160):
    t = "" if s is None else str(s)
    return t.replace("\n", " ").encode("ascii", "backslashreplace").decode("ascii")[:n]


def dump_req(req):
    if not req:
        return None
    return {
        "topic": req.topic,
        "entities": list(req.entities),
        "scope": req.requested_scope,
        "confidence": req.confidence,
    }


async def orch(raw: str, lang_key: str) -> dict:
    session = {}
    set_session_language(session, lang_key, is_auto=False)
    intel = await run_conversation_intelligence(
        raw,
        language_name=session.get("language_name"),
        groq_client=None,
        groq_model=None,
        turn_id="m54",
    )
    orch = ConversationOrchestrator()
    result = await orch.run(
        raw,
        session,
        groq_client=None,
        model=None,
        defer_narration=False,
        turn_id="m54",
    )
    res = result.resolution
    req = parse_semantic_request(raw_text=raw, language_code_key=lang_key)
    plan = select_content_units(req) if req else None
    feats = extract_features(raw)
    segs = result.narration_segments or []
    return {
        "input": raw,
        "lang": lang_key,
        "normalized": normalize_user_input(raw),
        "transcript_conf": intel.assessment.confidence,
        "filler": intel.assessment.contains_only_filler,
        "noise": intel.assessment.likely_noise,
        "semantic_topic": intel.semantic_topic,
        "ci_intent": None if not intel.intent_result else intel.intent_result.intent,
        "ci_intent_conf": None if not intel.intent_result else intel.intent_result.confidence,
        "ci_source": None if not intel.intent_result else intel.intent_result.matched_source,
        "policy": intel.decision.action.value,
        "policy_source": intel.decision.answer_source,
        "unknown_fallback": intel.decision.unknown_fallback,
        "passthrough": intel.decision.passthrough,
        "short_circuit_reply": _ascii(intel.decision.reply_text, 120),
        "faq": bool(get_faq_answer_for_question(raw, session.get("language_name") or "English")),
        "features_intent": resolve_intent_from_features(feats),
        "features_dept": feats.department_name,
        "features_hod": feats.is_hod_query,
        "orch_intent": res.intent,
        "orch_mode": res.presentation_mode,
        "orch_show": res.show_card,
        "orch_surface": res.card_surface,
        "orch_authority": res.response_authority,
        "should_rag": res.should_call_rag,
        "should_groq": res.should_call_groq,
        "should_pres": res.should_generate_presentation,
        "semantic_request": dump_req(req),
        "units": None if not plan else list(plan.units),
        "narration_units": [getattr(s, "unit_id", None) for s in segs],
        "dept_label": res.department_label,
        "entities": dict(res.canonical_entities or {}),
    }


def payload(msg):
    inner = msg.get("payload")
    return inner if isinstance(inner, dict) else msg


def units_from(p):
    plan = p.get("narration_plan")
    if not isinstance(plan, dict):
        return []
    return [
        s["unitId"].strip()
        for s in (plan.get("segments") or [])
        if isinstance(s, dict) and isinstance(s.get("unitId"), str) and s["unitId"].strip()
    ]


async def drain(ws, seconds):
    end = asyncio.get_event_loop().time() + seconds
    while asyncio.get_event_loop().time() < end:
        remaining = end - asyncio.get_event_loop().time()
        try:
            await asyncio.wait_for(ws.recv(), timeout=min(remaining, 3.0))
        except TimeoutError:
            return


async def session(lang_name):
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
    await drain(ws, 8)
    await ws.send(json.dumps({"action": "user_message", "text": "Guest"}))
    await drain(ws, 8)
    return ws


async def turn(ws, text, timeout=40):
    await ws.send(json.dumps({"action": "user_message", "text": text}))
    end = asyncio.get_event_loop().time() + timeout
    best = {
        "unitIds": [],
        "showCard": None,
        "intent": None,
        "spoken0": None,
        "mode": None,
        "tts_code_hint": None,
        "has_narration": False,
    }
    while asyncio.get_event_loop().time() < end:
        remaining = end - asyncio.get_event_loop().time()
        try:
            raw = await asyncio.wait_for(ws.recv(), timeout=min(remaining, 6.0))
        except TimeoutError:
            break
        p = payload(json.loads(raw))
        ids = units_from(p)
        if ids:
            best["unitIds"] = ids
            best["has_narration"] = True
            best["mode"] = (p.get("narration_plan") or {}).get("mode")
        if p.get("showCard"):
            best["showCard"] = p.get("showCard")
        if p.get("intent"):
            best["intent"] = p.get("intent")
        if isinstance(p.get("spokenText"), str) and p.get("spokenText"):
            best["spoken0"] = _ascii(p.get("spokenText"), 140)
        if ids and (p.get("tts_streaming") is True or p.get("audioBase64")):
            return best
        if best["spoken0"] and not ids and p.get("isProcessing") is False:
            # non-card reply likely complete
            if p.get("showCard") is None and p.get("intent"):
                pass
    return best


LIVE = [
    ("English", "Who is the HOD of CSE Data Science?"),
    ("English", "How good are the teachers here?"),
    ("English", "what is the capital of France?"),
    ("Kannada", "CSE fees yestu?"),
    ("Kannada", "How is campus life?"),
    ("Kannada", "datascience mathe aiml du hod yaaru?"),
    ("English", "Who are the HODs of AIML and Data Science?"),
]


async def live_all():
    out = []
    for lang, q in LIVE:
        ws = await session(lang)
        try:
            rec = await turn(ws, q)
            rec["lang"] = lang
            rec["q"] = q
            out.append(rec)
        finally:
            await ws.close()
    # follow-up in one English session
    ws = await session("English")
    try:
        a = await turn(ws, "Tell me about Data Science.")
        b = await turn(ws, "Who is its HOD?")
        c = await turn(ws, "What about AIML?")
        d = await turn(ws, "Who heads that one?")
        out.append(
            {
                "followup": [
                    {"q": "Tell me about Data Science.", **a},
                    {"q": "Who is its HOD?", **b},
                    {"q": "What about AIML?", **c},
                    {"q": "Who heads that one?", **d},
                ]
            }
        )
    finally:
        await ws.close()
    return out


async def main_async():
    rows = []
    for q in QUERIES:
        lang = "kn" if any(ord(c) > 127 for c in q) or "yaaru" in q.lower() or "bagge" in q.lower() or "yestu" in q.lower() else "en"
        if q.startswith("CSE ಶುಲ್ಕ"):
            lang = "kn"
        if q.startswith("CSE फीस"):
            lang = "hi"
        rows.append(await orch(q, lang))
    live = await live_all()
    payload_out = {"in_process": rows, "live_ws": live}
    OUT.write_text(json.dumps(payload_out, ensure_ascii=True, indent=2), encoding="utf-8")
    print("WROTE", OUT)
    for r in rows:
        print(
            r["input"][:50],
            "|",
            r["policy"],
            r["ci_intent"],
            r["ci_intent_conf"],
            "| units",
            r["units"],
            "| show",
            r["orch_show"],
            "| rag",
            r["should_rag"],
            flush=True,
        )


if __name__ == "__main__":
    asyncio.run(main_async())
