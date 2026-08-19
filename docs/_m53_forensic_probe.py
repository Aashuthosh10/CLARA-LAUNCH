"""TEMPORARY Stage A forensic probe. Does not change production semantic behavior.

Run from repo root:
  python docs/_m53_forensic_probe.py

Remove or exclude from production architecture after Stage A.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from backend.services.answer_generation import normalize_user_input  # noqa: E402
from backend.config.settings import TARGET_LANGUAGE_CODES  # noqa: E402
from backend.services.content.semantic_request_parser import parse_semantic_request  # noqa: E402
from backend.services.content.unit_selector import (  # noqa: E402
    resolve_units_for_plan,
    select_content_units,
)

FULL_CSE = ["cse.overview", "cse.hod", "cse.achievements", "cse.placements", "cse.fees"]
FULL_DS = ["cse_ds.overview", "cse_ds.hod", "cse_ds.achievements", "cse_ds.placements", "cse_ds.fees"]
FULL_AIML = [
    "cse_aiml.overview",
    "cse_aiml.hod",
    "cse_aiml.achievements",
    "cse_aiml.placements",
    "cse_aiml.fees",
]


def _conf_band(req) -> str:
    if req is None:
        return "NONE"
    c = float(getattr(req, "confidence", 0) or 0)
    if c >= 0.85:
        return "HIGH"
    if c >= 0.75:
        return "MEDIUM"
    if c > 0:
        return "LOW"
    return "NONE"


def _first_fail(exp: dict, act: dict) -> str | None:
    if act["actual_language"] != exp["language"]:
        return "language"
    if act["actual_entities"] != list(exp["expected_entities"]):
        return "entity_resolution"
    if act["actual_topic"] != exp["expected_topic"]:
        return "topic_detection"
    if act["actual_scope"] != exp["expected_scope"]:
        return "scope_detection"
    if act["actual_semantic_request"] is None:
        return "SemanticRequest"
    if act["actual_unit_ids"] != list(exp["expected_unit_ids"]):
        return "UnitSelector"
    if act["actual_content_language"] not in (exp["language"], "mixed", "unknown"):
        if act["actual_content_language"] == "en" and exp["language"] != "en":
            return "localization"
    return None


def _script_guess(text: str) -> str:
    if not text:
        return "unknown"
    if any("\u0c80" <= ch <= "\u0cff" for ch in text):
        return "kn"
    if any("\u0900" <= ch <= "\u097f" for ch in text):
        return "hi"
    if any("\u0b80" <= ch <= "\u0bff" for ch in text):
        return "ta"
    if any("\u0c00" <= ch <= "\u0c7f" for ch in text):
        return "te"
    if any("\u0d00" <= ch <= "\u0d7f" for ch in text):
        return "ml"
    return "en"


CASES: list[dict] = []


def add(case_id: str, *, language: str, inp: str, topic, entities, scope, unit_ids, category: str):
    CASES.append(
        {
            "id": case_id,
            "category": category,
            "language": language,
            "input": inp,
            "expected_topic": topic,
            "expected_entities": entities,
            "expected_scope": scope,
            "expected_unit_ids": unit_ids,
        }
    )


# --- Parity: CSE Data Science HOD ---
add("parity_hod_ds_en", language="en", inp="Who is the HOD of CSE Data Science?", topic="hod", entities=["cse_ds"], scope="single", unit_ids=["cse_ds.hod"], category="parity_hod_ds")
add("parity_hod_ds_kn", language="kn", inp="CSE Data Science HOD yaaru?", topic="hod", entities=["cse_ds"], scope="single", unit_ids=["cse_ds.hod"], category="parity_hod_ds")
add("parity_hod_ds_hi", language="hi", inp="CSE Data Science ka HOD kaun hai?", topic="hod", entities=["cse_ds"], scope="single", unit_ids=["cse_ds.hod"], category="parity_hod_ds")
add("parity_hod_ds_ta", language="ta", inp="CSE Data Science HOD yaar?", topic="hod", entities=["cse_ds"], scope="single", unit_ids=["cse_ds.hod"], category="parity_hod_ds")
add("parity_hod_ds_te", language="te", inp="CSE Data Science HOD evaru?", topic="hod", entities=["cse_ds"], scope="single", unit_ids=["cse_ds.hod"], category="parity_hod_ds")
add("parity_hod_ds_ml", language="ml", inp="CSE Data Science HOD aaranu?", topic="hod", entities=["cse_ds"], scope="single", unit_ids=["cse_ds.hod"], category="parity_hod_ds")

# --- Parity: CSE AIML fees ---
add("parity_fees_aiml_en", language="en", inp="CSE AIML fees", topic="fees", entities=["cse_aiml"], scope="single", unit_ids=["cse_aiml.fees"], category="parity_fees_aiml")
add("parity_fees_aiml_kn", language="kn", inp="CSE AIML fees yestu?", topic="fees", entities=["cse_aiml"], scope="single", unit_ids=["cse_aiml.fees"], category="parity_fees_aiml")
add("parity_fees_aiml_hi", language="hi", inp="CSE AIML fees kitna hai?", topic="fees", entities=["cse_aiml"], scope="single", unit_ids=["cse_aiml.fees"], category="parity_fees_aiml")
add("parity_fees_aiml_ta", language="ta", inp="CSE AIML fees evlo?", topic="fees", entities=["cse_aiml"], scope="single", unit_ids=["cse_aiml.fees"], category="parity_fees_aiml")
add("parity_fees_aiml_te", language="te", inp="CSE AIML fees entha?", topic="fees", entities=["cse_aiml"], scope="single", unit_ids=["cse_aiml.fees"], category="parity_fees_aiml")
add("parity_fees_aiml_ml", language="ml", inp="CSE AIML fees ethra?", topic="fees", entities=["cse_aiml"], scope="single", unit_ids=["cse_aiml.fees"], category="parity_fees_aiml")

# --- Parity: full CSE overview ---
add("parity_ov_cse_en", language="en", inp="Tell me about CSE", topic="overview", entities=["cse"], scope="full_department", unit_ids=FULL_CSE, category="parity_overview_cse")
add("parity_ov_cse_kn", language="kn", inp="CSE bagge heli", topic="overview", entities=["cse"], scope="full_department", unit_ids=FULL_CSE, category="parity_overview_cse")
add("parity_ov_cse_hi", language="hi", inp="CSE ke baare mein batao", topic="overview", entities=["cse"], scope="full_department", unit_ids=FULL_CSE, category="parity_overview_cse")
add("parity_ov_cse_ta", language="ta", inp="CSE pattri tilisi", topic="overview", entities=["cse"], scope="full_department", unit_ids=FULL_CSE, category="parity_overview_cse")
add("parity_ov_cse_te", language="te", inp="CSE gurunchi kurichu cheppu", topic="overview", entities=["cse"], scope="full_department", unit_ids=FULL_CSE, category="parity_overview_cse")
add("parity_ov_cse_ml", language="ml", inp="CSE parayoo", topic="overview", entities=["cse"], scope="full_department", unit_ids=FULL_CSE, category="parity_overview_cse")

# --- Parity: multi-HOD ---
add("parity_mh_en", language="en", inp="Who is the HOD of AIML and Data Science?", topic="hod", entities=["cse_aiml", "cse_ds"], scope="single", unit_ids=["cse_aiml.hod", "cse_ds.hod"], category="parity_multi_hod")
add("parity_mh_kn", language="kn", inp="CSE mattu AIML HOD yaaru?", topic="hod", entities=["cse", "cse_aiml"], scope="single", unit_ids=["cse.hod", "cse_aiml.hod"], category="parity_multi_hod_cse_aiml")
add("parity_mh_aimlds_kn", language="kn", inp="AIML mattu Data Science HOD yaaru?", topic="hod", entities=["cse_aiml", "cse_ds"], scope="single", unit_ids=["cse_aiml.hod", "cse_ds.hod"], category="parity_multi_hod")
add("parity_mh_hi", language="hi", inp="AIML aur Data Science ke HOD kaun hain?", topic="hod", entities=["cse_aiml", "cse_ds"], scope="single", unit_ids=["cse_aiml.hod", "cse_ds.hod"], category="parity_multi_hod")
add("parity_mh_ta", language="ta", inp="AIML and Data Science HOD yaar?", topic="hod", entities=["cse_aiml", "cse_ds"], scope="single", unit_ids=["cse_aiml.hod", "cse_ds.hod"], category="parity_multi_hod")
add("parity_mh_te", language="te", inp="AIML and Data Science HOD evaru?", topic="hod", entities=["cse_aiml", "cse_ds"], scope="single", unit_ids=["cse_aiml.hod", "cse_ds.hod"], category="parity_multi_hod")
add("parity_mh_ml", language="ml", inp="AIML and Data Science HOD aaranu?", topic="hod", entities=["cse_aiml", "cse_ds"], scope="single", unit_ids=["cse_aiml.hod", "cse_ds.hod"], category="parity_multi_hod")

# --- Categories per language (kn/hi/en focus + one each ta/te/ml) ---
add("en_lit_fees", language="en", inp="CSE fees", topic="fees", entities=["cse"], scope="single", unit_ids=["cse.fees"], category="literal")
add("en_nat_hod", language="en", inp="Who is the HOD of CSE?", topic="hod", entities=["cse"], scope="single", unit_ids=["cse.hod"], category="natural")
add("en_col_fees", language="en", inp="CSE fees yestu?", topic="fees", entities=["cse"], scope="single", unit_ids=["cse.fees"], category="code_switch")
add("en_short_hod", language="en", inp="CSE HOD", topic="hod", entities=["cse"], scope="single", unit_ids=["cse.hod"], category="short")
add("en_long_ov", language="en", inp="Please tell me about the Computer Science and Engineering department in detail", topic="overview", entities=["cse"], scope="full_department", unit_ids=FULL_CSE, category="long")
add("en_wo_hod", language="en", inp="HOD of CSE Data Science who", topic="hod", entities=["cse_ds"], scope="single", unit_ids=["cse_ds.hod"], category="word_order")
add("en_place", language="en", inp="CSE placements", topic="placements", entities=["cse"], scope="single", unit_ids=["cse.placements"], category="literal")
add("en_ach", language="en", inp="CSE achievements", topic="achievements", entities=["cse"], scope="single", unit_ids=["cse.achievements"], category="literal")
add("en_ov_single", language="en", inp="CSE overview", topic="overview", entities=["cse"], scope="single", unit_ids=["cse.overview"], category="literal")
add("en_ds_ov", language="en", inp="Tell me about CSE Data Science", topic="overview", entities=["cse_ds"], scope="full_department", unit_ids=FULL_DS, category="natural")
add("en_ece_fees", language="en", inp="ECE fees", topic="fees", entities=["ece"], scope="single", unit_ids=["ece.fees"], category="literal")

add("kn_lit_fees", language="kn", inp="CSE ಶುಲ್ಕ", topic="fees", entities=["cse"], scope="single", unit_ids=["cse.fees"], category="literal")
add("kn_rom_fees", language="kn", inp="CSE fees yestu?", topic="fees", entities=["cse"], scope="single", unit_ids=["cse.fees"], category="romanized")
add("kn_col_hod", language="kn", inp="CSE HOD yaaru?", topic="hod", entities=["cse"], scope="single", unit_ids=["cse.hod"], category="colloquial")
add("kn_cs_ov", language="kn", inp="CSE bagge heli", topic="overview", entities=["cse"], scope="full_department", unit_ids=FULL_CSE, category="code_switch")
add("kn_place", language="kn", inp="CSE placements", topic="placements", entities=["cse"], scope="single", unit_ids=["cse.placements"], category="short")
add("kn_ach", language="kn", inp="CSE achievements", topic="achievements", entities=["cse"], scope="single", unit_ids=["cse.achievements"], category="short")
add("kn_ds_hod", language="kn", inp="Data Science HOD yaaru?", topic="hod", entities=["cse_ds"], scope="single", unit_ids=["cse_ds.hod"], category="natural")
add("kn_aiml_fees", language="kn", inp="AIML fees eshtu", topic="fees", entities=["cse_aiml"], scope="single", unit_ids=["cse_aiml.fees"], category="romanized")

add("hi_rom_fees", language="hi", inp="CSE fees kitna", topic="fees", entities=["cse"], scope="single", unit_ids=["cse.fees"], category="romanized")
add("hi_nat_hod", language="hi", inp="CSE ka HOD kaun hai", topic="hod", entities=["cse"], scope="single", unit_ids=["cse.hod"], category="natural")
add("hi_cs_ov", language="hi", inp="CSE ke baare mein batao", topic="overview", entities=["cse"], scope="full_department", unit_ids=FULL_CSE, category="code_switch")
add("hi_place", language="hi", inp="CSE placements", topic="placements", entities=["cse"], scope="single", unit_ids=["cse.placements"], category="short")
add("hi_ach", language="hi", inp="CSE ki achievements", topic="achievements", entities=["cse"], scope="single", unit_ids=["cse.achievements"], category="code_switch")
add("hi_script_fees", language="hi", inp="CSE फीस", topic="fees", entities=["cse"], scope="single", unit_ids=["cse.fees"], category="literal")

add("ta_rom_fees", language="ta", inp="CSE fees evlo", topic="fees", entities=["cse"], scope="single", unit_ids=["cse.fees"], category="romanized")
add("ta_hod", language="ta", inp="CSE HOD yaar", topic="hod", entities=["cse"], scope="single", unit_ids=["cse.hod"], category="colloquial")
add("ta_ov", language="ta", inp="CSE pattri tilisi", topic="overview", entities=["cse"], scope="full_department", unit_ids=FULL_CSE, category="natural")
add("ta_place", language="ta", inp="CSE placements", topic="placements", entities=["cse"], scope="single", unit_ids=["cse.placements"], category="short")
add("ta_ach", language="ta", inp="CSE achievements", topic="achievements", entities=["cse"], scope="single", unit_ids=["cse.achievements"], category="short")

add("te_rom_fees", language="te", inp="CSE fees entha", topic="fees", entities=["cse"], scope="single", unit_ids=["cse.fees"], category="romanized")
add("te_hod", language="te", inp="CSE HOD evaru", topic="hod", entities=["cse"], scope="single", unit_ids=["cse.hod"], category="colloquial")
add("te_ov", language="te", inp="CSE gurunchi cheppu", topic="overview", entities=["cse"], scope="full_department", unit_ids=FULL_CSE, category="natural")
add("te_place", language="te", inp="CSE placements", topic="placements", entities=["cse"], scope="single", unit_ids=["cse.placements"], category="short")
add("te_ach", language="te", inp="CSE achievements", topic="achievements", entities=["cse"], scope="single", unit_ids=["cse.achievements"], category="short")

add("ml_rom_fees", language="ml", inp="CSE fees ethra", topic="fees", entities=["cse"], scope="single", unit_ids=["cse.fees"], category="romanized")
add("ml_hod", language="ml", inp="CSE HOD aaranu", topic="hod", entities=["cse"], scope="single", unit_ids=["cse.hod"], category="colloquial")
add("ml_ov", language="ml", inp="CSE parayoo", topic="overview", entities=["cse"], scope="full_department", unit_ids=FULL_CSE, category="natural")
add("ml_place", language="ml", inp="CSE placements", topic="placements", entities=["cse"], scope="single", unit_ids=["cse.placements"], category="short")
add("ml_ach", language="ml", inp="CSE achievements", topic="achievements", entities=["cse"], scope="single", unit_ids=["cse.achievements"], category="short")

# --- Ambiguous / fail-closed ---
add("neg_fees_and_hod", language="en", inp="CSE fees and HOD", topic=None, entities=[], scope=None, unit_ids=[], category="ambiguous")
add("neg_place_and_fees", language="en", inp="CSE placements and fees", topic=None, entities=[], scope=None, unit_ids=[], category="ambiguous")
add("neg_hod_and_aiml_fees", language="en", inp="CSE HOD and AIML fees", topic=None, entities=[], scope=None, unit_ids=[], category="ambiguous")
add("neg_something", language="en", inp="tell me something about CSE", topic="overview", entities=["cse"], scope="full_department", unit_ids=FULL_CSE, category="ambiguous")
add("neg_which_dept", language="en", inp="which department?", topic=None, entities=[], scope=None, unit_ids=[], category="unsupported")
add("neg_fees_only", language="en", inp="fees", topic=None, entities=[], scope=None, unit_ids=[], category="unsupported")
add("neg_who", language="en", inp="who?", topic=None, entities=[], scope=None, unit_ids=[], category="unsupported")
add("neg_unknown_dept", language="en", inp="Quantum Basket Weaving HOD", topic=None, entities=[], scope=None, unit_ids=[], category="unsupported")
add("neg_nearmatch", language="en", inp="CSS fees", topic=None, entities=[], scope=None, unit_ids=[], category="unsupported")
add("kn_amb_fees_hod", language="kn", inp="CSE fees mattu HOD yaaru", topic=None, entities=[], scope=None, unit_ids=[], category="ambiguous")


def run_case(exp: dict) -> dict:
    lang = exp["language"]
    text = exp["input"]
    normalized = normalize_user_input(text)
    req = parse_semantic_request(raw_text=text, language_code_key=lang)
    unit_ids: list[str] = []
    content_lang = "unknown"
    bodies = []
    if req is not None:
        plan = select_content_units(req)
        if plan is not None:
            unit_ids = list(plan.units)
            try:
                units = resolve_units_for_plan(plan)
                bodies = [(u.body or u.title or "") for u in units]
                scripts = {_script_guess(b) for b in bodies if b}
                if len(scripts) == 1:
                    content_lang = next(iter(scripts))
                elif scripts:
                    content_lang = "mixed"
            except Exception as exc:  # noqa: BLE001
                content_lang = f"error:{type(exc).__name__}"
    act = {
        "id": exp["id"],
        "category": exp["category"],
        "input": text,
        "language": lang,
        "expected_topic": exp["expected_topic"],
        "expected_entities": exp["expected_entities"],
        "expected_scope": exp["expected_scope"],
        "expected_unit_ids": exp["expected_unit_ids"],
        "actual_language": lang,
        "actual_normalized_text": normalized,
        "actual_topic": None if req is None else req.topic,
        "actual_entities": [] if req is None else list(req.entities),
        "actual_scope": None if req is None else req.requested_scope,
        "actual_confidence_float": None if req is None else req.confidence,
        "actual_confidence_band": _conf_band(req),
        "actual_semantic_request": None
        if req is None
        else {
            "topic": req.topic,
            "entities": list(req.entities),
            "requested_scope": req.requested_scope,
            "confidence": req.confidence,
            "language_code": req.language_code,
        },
        "actual_unit_ids": unit_ids,
        "actual_content_language": content_lang,
        "actual_tts_code": TARGET_LANGUAGE_CODES.get(lang, lang),
        "actual_presentation": unit_ids,
    }
    none_ok = exp["expected_topic"] is None and not exp["expected_unit_ids"]
    if none_ok:
        fail = None if req is None else "SemanticRequest"
        if req is not None:
            fail = _first_fail(exp, act) or "fail_closed_expected_none"
    else:
        fail = _first_fail(exp, act)
    act["pass"] = fail is None
    act["first_failed_stage"] = fail
    return act


def main() -> None:
    rows = [run_case(c) for c in CASES]
    passed = sum(1 for r in rows if r["pass"])
    failed = [r for r in rows if not r["pass"]]
    out = {
        "probe": "TEMPORARY Stage A forensic probe — not production",
        "total": len(rows),
        "passed": passed,
        "failed": len(failed),
        "rows": rows,
    }
    dest = ROOT / "docs" / "_m53_forensic_traces.json"
    dest.write_text(json.dumps(out, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"wrote {dest} total={len(rows)} passed={passed} failed={len(failed)}")
    by_stage: dict[str, int] = {}
    for r in failed:
        st = r["first_failed_stage"] or "unknown"
        by_stage[st] = by_stage.get(st, 0) + 1
    print("failures_by_stage", json.dumps(by_stage, indent=2))


if __name__ == "__main__":
    main()
