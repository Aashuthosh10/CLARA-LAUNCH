"""Read-only M5.3 mixed-input forensic probe. Does not change production behavior."""
from __future__ import annotations

import asyncio
import hashlib
import inspect
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import websockets  # noqa: E402

from backend.services.answer_generation import (  # noqa: E402
    extract_features,
    extract_comparison_department_canonical_labels,
    normalize_query_to_english,
    normalize_user_input,
    resolve_intent_from_features,
)
from backend.services.content.department_identity import (  # noqa: E402
    match_department_keys_exclusive,
    normalize_for_department_match,
)
from backend.services.content.semantic_request_parser import parse_semantic_request  # noqa: E402
from backend.services.content.semantic_topics import (  # noqa: E402
    detect_atomic_topics,
    is_full_department_scope,
)
from backend.services.content.semantic_vocab.catalog import all_entries  # noqa: E402
from backend.services.content.unit_selector import resolve_units_for_plan, select_content_units  # noqa: E402
from backend.services.orchestration.narration_resolver import resolve_narration  # noqa: E402
from backend.services.orchestration.presentation_resolver import (  # noqa: E402
    _maybe_override_to_department_overview_surface,
)
from backend.services.orchestration.types import ConversationResolution, PresentationMode  # noqa: E402
from backend.services.content.types import SURFACE_DEPARTMENT_OVERVIEW  # noqa: E402
from backend.services.answer_generation import INTENT_HOD_PROFILE, INTENT_DEPARTMENT_OVERVIEW  # noqa: E402
from backend.services.content import semantic_request_parser as srp  # noqa: E402
from backend.services.orchestration.conversation_orchestrator import ConversationOrchestrator  # noqa: E402
from backend.services.session_language import set_session_language  # noqa: E402

OUT = ROOT / "docs" / "_m53_regional_mixed_probe_out.json"
Q = "datascience mathe aiml du hod yaaru ?"
WS_URL = "ws://127.0.0.1:6969/ws/clara"
ORIGIN = "http://localhost:5176"


def _ascii(s: object, n: int = 160) -> str:
    t = "" if s is None else str(s)
    t = t.replace("\n", " ").replace("\r", " ")
    return t.encode("ascii", "backslashreplace").decode("ascii")[:n]


def _req_dump(req) -> dict | None:
    if req is None:
        return None
    return {
        "topic": req.topic,
        "entities": list(req.entities),
        "requested_scope": req.requested_scope,
        "confidence": req.confidence,
        "source": req.source,
        "language_code": req.language_code,
        "diagnostics": req.diagnostics,
    }


def in_process_trace(raw: str, lang: str) -> dict:
    nq = normalize_query_to_english(raw)
    nu = normalize_user_input(raw)
    nd = normalize_for_department_match(raw)
    ents = list(match_department_keys_exclusive(raw))
    atom_raw = sorted(detect_atomic_topics(raw))
    atom_norm = sorted(detect_atomic_topics(nu))
    atom_both = sorted(detect_atomic_topics(raw, nu))
    full = is_full_department_scope(raw, nu)
    req = parse_semantic_request(raw_text=raw, language_code_key=lang)
    plan = select_content_units(req) if req else None
    units = list(resolve_units_for_plan(plan)) if plan else []
    feats = extract_features(raw)
    intent = resolve_intent_from_features(feats)
    res = ConversationResolution(
        language="Kannada" if lang == "kn" else "English",
        language_code_key=lang,
        tts_code="kn-IN" if lang == "kn" else "en-IN",
        intent=INTENT_HOD_PROFILE,
        show_card=None,
        card_surface=None,
        should_generate_presentation=True,
        presentation_mode=PresentationMode.CARD_PRESENTATION.value,
        department_label=feats.department_name,
    )
    _maybe_override_to_department_overview_surface(
        resolution=res,
        intent=INTENT_HOD_PROFILE,
        user_text=raw,
        entities={"department": feats.department_name},
    )
    segs = resolve_narration(
        resolution=res,
        entities={"department": feats.department_name},
        user_text=raw,
    )
    segs_info = []
    for s in segs or []:
        segs_info.append(
            {
                "unit_id": getattr(s, "unit_id", None),
                "section_id": getattr(s, "section_id", None),
                "card_index": getattr(s, "card_index", None),
                "tts0": _ascii(getattr(s, "tts_text", ""), 90),
                "disp0": _ascii(getattr(s, "display_text", ""), 90),
                "body0": None,
            }
        )
    unit_info = []
    for u in units:
        unit_info.append(
            {
                "unit_id": u.unit_id,
                "section_id": u.section_id,
                "title": _ascii(u.title, 60),
                "body0": _ascii(u.body, 90),
            }
        )
    res2 = ConversationResolution(
        language=res.language,
        language_code_key=lang,
        tts_code=res.tts_code,
        intent=INTENT_DEPARTMENT_OVERVIEW,
        show_card="department_overview",
        card_surface=SURFACE_DEPARTMENT_OVERVIEW,
        should_generate_presentation=True,
        presentation_mode=PresentationMode.CARD_PRESENTATION.value,
        department_label=feats.department_name,
    )
    segs2 = resolve_narration(
        resolution=res2,
        entities={"department": feats.department_name},
        user_text=raw,
    )
    return {
        "raw": raw,
        "lang": lang,
        "normalize_query_to_english": nq,
        "normalize_user_input": nu,
        "normalize_for_department_match": nd,
        "entities": ents,
        "atomic_raw": atom_raw,
        "atomic_normalized": atom_norm,
        "atomic_both": atom_both,
        "is_full_department_scope": full,
        "semantic_request": _req_dump(req),
        "plan_units": None if not plan else list(plan.units),
        "plan_policy": None if not plan else str(plan.presentation_policy),
        "content_units": unit_info,
        "features": {
            "department_name": feats.department_name,
            "is_hod_query": feats.is_hod_query,
            "is_overview_query": feats.is_overview_query,
            "is_comparison_query": feats.is_comparison_query,
            "comparison_department_names": list(feats.comparison_department_names or []),
            "has_department": feats.has_department,
        },
        "ci_intent": intent,
        "cmp_labels": extract_comparison_department_canonical_labels(raw),
        "override_surface": res.card_surface,
        "override_show": res.show_card,
        "narration_hod_intent_units": [x["unit_id"] for x in segs_info],
        "narration_hod_intent_segs": segs_info,
        "narration_overview_surface_preset_units": [
            getattr(s, "unit_id", None) for s in (segs2 or [])
        ],
    }


def vocab_hits(raw: str) -> list[dict]:
    low = raw.casefold()
    hits = []
    for e in all_entries():
        v = (e.variant or "").casefold()
        if v and v in low:
            hits.append(
                {
                    "canonical": e.canonical,
                    "variant": e.variant,
                    "category": e.category,
                    "reason": e.reason,
                }
            )
    return hits


def matrix_row(raw: str, lang: str = "kn") -> dict:
    req = parse_semantic_request(raw_text=raw, language_code_key=lang)
    plan = select_content_units(req) if req else None
    f = extract_features(raw)
    return {
        "q": raw,
        "norm": normalize_user_input(raw),
        "ents": list(match_department_keys_exclusive(raw)),
        "atom": sorted(detect_atomic_topics(raw, normalize_user_input(raw))),
        "full_scope": is_full_department_scope(raw, normalize_user_input(raw)),
        "req": _req_dump(req),
        "units": None if not plan else list(plan.units),
        "ci_dept": f.department_name,
        "ci_hod": f.is_hod_query,
        "ci_intent": resolve_intent_from_features(f),
    }


def payload(msg):
    inner = msg.get("payload")
    return inner if isinstance(inner, dict) else msg


def units_from(p):
    plan = p.get("narration_plan")
    if not isinstance(plan, dict):
        return []
    out = []
    for s in plan.get("segments") or []:
        if isinstance(s, dict) and isinstance(s.get("unitId"), str) and s["unitId"].strip():
            out.append(s["unitId"].strip())
    return out


def segs_from(p):
    plan = p.get("narration_plan")
    if not isinstance(plan, dict):
        return []
    return [s for s in (plan.get("segments") or []) if isinstance(s, dict)]


async def drain(ws, seconds):
    end = asyncio.get_event_loop().time() + seconds
    while asyncio.get_event_loop().time() < end:
        remaining = end - asyncio.get_event_loop().time()
        try:
            await asyncio.wait_for(ws.recv(), timeout=min(remaining, 4.0))
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
    await drain(ws, 10)
    await ws.send(json.dumps({"action": "user_message", "text": "Guest"}))
    await drain(ws, 10)
    return ws


async def turn(ws, text, timeout=50):
    await ws.send(json.dumps({"action": "user_message", "text": text}))
    end = asyncio.get_event_loop().time() + timeout
    best = None
    show = None
    intent = None
    spoken = None
    tts_streaming = None
    while asyncio.get_event_loop().time() < end:
        remaining = end - asyncio.get_event_loop().time()
        try:
            raw = await asyncio.wait_for(ws.recv(), timeout=min(remaining, 8.0))
        except TimeoutError:
            break
        p = payload(json.loads(raw))
        ids = units_from(p)
        if ids:
            best = p
        if p.get("showCard"):
            show = p.get("showCard")
        if p.get("intent"):
            intent = p.get("intent")
        if isinstance(p.get("spokenText"), str) and p.get("spokenText"):
            spoken = p.get("spokenText")
        if p.get("tts_streaming") is True:
            tts_streaming = True
        if ids and p.get("tts_streaming") is True:
            return p, show, intent, spoken, tts_streaming
    return best, show, intent, spoken, tts_streaming


async def live_ws(query: str) -> dict:
    out = {}
    for lang in ("Kannada", "English"):
        ws = await session(lang)
        try:
            p, show, intent, spoken, streaming = await turn(ws, query)
            s = segs_from(p) if p else []
            out[lang] = {
                "unitIds": units_from(p) if p else [],
                "mode": None if not p else (p.get("narration_plan") or {}).get("mode"),
                "showCard": show,
                "intent": intent,
                "spoken0": _ascii(spoken, 120),
                "tts_streaming": streaming,
                "n_segs": len(s),
                "segs": [
                    {
                        "unitId": x.get("unitId"),
                        "sectionId": x.get("sectionId"),
                        "cardIndex": x.get("cardIndex"),
                        "tts0": _ascii(x.get("ttsText"), 90),
                        "disp0": _ascii(x.get("displayText"), 90),
                    }
                    for x in s
                ],
            }
        finally:
            await ws.close()
    return out


async def orch_in_process(raw: str, lang_key: str) -> dict:
    session = {}
    set_session_language(session, lang_key, is_auto=False)
    orch = ConversationOrchestrator()
    result = await orch.run(
        raw,
        session,
        local_intent=None,
        turn_id="forensic-mixed",
        groq_client=None,
        model=None,
        defer_narration=False,
    )
    res = result.resolution
    segs = result.narration_segments or []
    bundle = res.presentation_bundle
    plan = None
    if bundle is not None:
        plan = bundle.narration_plan_payload("forensic-mixed")
    return {
        "intent": res.intent,
        "show_card": res.show_card,
        "card_surface": res.card_surface,
        "should_generate_presentation": res.should_generate_presentation,
        "authority": res.response_authority,
        "dept_label": res.department_label,
        "entities": dict(res.canonical_entities or {}),
        "narration_unit_ids": [getattr(s, "unit_id", None) for s in segs],
        "bundle_unit_ids": [
            s.get("unitId")
            for s in ((plan or {}).get("segments") or [])
            if isinstance(s, dict)
        ],
        "bundle_show": None if not bundle else bundle.card_surface,
    }


def main() -> int:
    parser_path = Path(inspect.getfile(srp))
    sha = hashlib.sha256(parser_path.read_bytes()).hexdigest()
    cases = [
        Q,
        "CSE mattu AIML HOD yaaru?",
        "AIML mattu Data Science HOD yaaru?",
        "CSE bagge heli",
        "CSE fees yestu?",
        "CSE ಶುಲ್ಕ ಎಷ್ಟು?",
        "CSE HOD yaaru?",
        "CSE HOD yaaru anta heli",
        "datascience mattu aiml du hod yaaru ?",
        "Who is the HOD of AIML and Data Science?",
        "Who is the HOD of CSE Data Science?",
        "Who are the HODs of AIML, Data Science and CSE?",
        "Who are the HODs of AIML, Data Science, CSE and ECE?",
        "AIML, Data Science mattu CSE HOD yaaru?",
        "CSE Data Science ka HOD kaun hai?",
        "AIML aur Data Science ke HOD kaun hain?",
        "AIML, Data Science aur CSE ke HOD kaun hain?",
        "CSE Data Science HOD yaar?",
        "AIML and Data Science HOD yaar?",
        "AIML, Data Science and CSE HOD yaar?",
        "CSE Data Science HOD evaru?",
        "AIML and Data Science HOD evaru?",
        "AIML, Data Science and CSE HOD evaru?",
        "CSE Data Science HOD aaranu?",
        "AIML and Data Science HOD aaranu?",
        "AIML, Data Science and CSE HOD aaranu?",
        "ಡೇಟಾ ಸೈನ್ಸ್ ಹಾಗೂ AIML HOD ಯಾರು?",
        "डेटा साइंस और AIML HOD कौन है?",
    ]
    payload_out = {
        "runtime": {
            "parser_file": str(parser_path),
            "parser_sha256": sha,
            "parser_sha256_16": sha[:16],
        },
        "golden": {
            "raw": Q,
            "topic": "hod",
            "entities": ["cse_ds", "cse_aiml"],
            "scope": "multi",
            "unitIds": ["cse_ds.hod", "cse_aiml.hod"],
            "ambiguity": {
                "mathe": "not in vocab; likely misspelling of Kannada mattu=and; not treated as Math dept",
                "du": "token_map strips to empty; likely Kannada particle / of",
            },
        },
        "vocab_hits_exact_query": vocab_hits(Q),
        "in_process_kn": in_process_trace(Q, "kn"),
        "in_process_en": in_process_trace(Q, "en"),
        "matrix": [matrix_row(c) for c in cases],
    }
    payload_out["orch_kn"] = asyncio.run(orch_in_process(Q, "kn"))
    payload_out["orch_en"] = asyncio.run(orch_in_process(Q, "en"))
    payload_out["live_ws"] = asyncio.run(live_ws(Q))
    OUT.write_text(json.dumps(payload_out, ensure_ascii=True, indent=2), encoding="utf-8")
    print("WROTE", str(OUT), flush=True)
    print("INPROC_UNITS", payload_out["in_process_kn"]["plan_units"], flush=True)
    print("ORCH_UNITS", payload_out["orch_kn"]["narration_unit_ids"], flush=True)
    print("LIVE_KN", payload_out["live_ws"].get("Kannada", {}).get("unitIds"), flush=True)
    print("LIVE_EN", payload_out["live_ws"].get("English", {}).get("unitIds"), flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
