#!/usr/bin/env python3
"""
Merge CSV files from backend/data/comparison_sources/ into a single
frontend/src/data/departmentComparison.json registry.

CSV conventions:
- Required column: department_id (matches DepartmentJsonKey: cse, cse_aiml, ...)
- Attribute columns: snake_case ids, optionally suffixed with _en, _kn, _hi, _ta, _te, _ml
  e.g. main_focus_en, main_focus_kn OR main_focus (treated as English only)
- Multiple CSVs: later files override empty cells; richer non-empty wins if same key

Run from CLARA-LAUNCH: python -m backend.tools.build_department_comparison_registry
"""
from __future__ import annotations

import csv
import json
import re
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
SOURCES = ROOT / "backend" / "data" / "comparison_sources"
FRONTEND_OUT = ROOT / "frontend" / "src" / "data" / "departmentComparison.json"
BACKEND_OUT = ROOT / "backend" / "data" / "department_comparison.json"

LANG_SUFFIXES = ("_en", "_kn", "_hi", "_ta", "_te", "_ml")


def _snake(s: str) -> str:
    s = re.sub(r"[^\w\s]", "", str(s or ""), flags=re.UNICODE)
    s = re.sub(r"\s+", "_", s.strip().lower())
    s = re.sub(r"_+", "_", s).strip("_")
    return s or "unknown"


def _prefer_text(old: str | None, new: str | None) -> str | None:
    o = (old or "").strip()
    n = (new or "").strip()
    if not n:
        return old
    if not o:
        return n
    return n if len(n) > len(o) else old


def parse_header_to_attr_lang(h: str) -> tuple[str, str]:
    """
    'main_focus_en' -> ('main_focus', 'en')
    'main_focus' -> ('main_focus', 'en')
    """
    h = _snake(h.replace(".", "_"))
    if not h:
        return "unknown", "en"
    for suf in LANG_SUFFIXES:
        if h.endswith(suf):
            return h[: -len(suf)], suf[1:]
    return h, "en"


def load_csv_paths() -> list[Path]:
    if not SOURCES.is_dir():
        return []
    return sorted(SOURCES.glob("*.csv"))


def merge_from_csv(paths: list[Path]) -> dict:
    dept_cells: dict[str, dict[str, dict[str, str]]] = {}
    row_attrs: set[str] = set()

    for path in paths:
        with path.open(newline="", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            if not reader.fieldnames:
                continue
            for row in reader:
                raw_id = row.get("department_id") or row.get("Department") or row.get("department")
                if raw_id is None:
                    continue
                dept_id = _snake(str(raw_id)).replace("-", "_")
                if dept_id == "unknown":
                    continue
                if dept_id not in dept_cells:
                    dept_cells[dept_id] = {}
                for hdr, cell in row.items():
                    if hdr is None:
                        continue
                    hl = hdr.strip().lower()
                    if hl in ("department_id", "department"):
                        continue
                    attr, lang = parse_header_to_attr_lang(hdr)
                    if attr == "unknown":
                        continue
                    row_attrs.add(attr)
                    val = str(cell).strip() if cell is not None else ""
                    if not val:
                        continue
                    dattr = dept_cells[dept_id].setdefault(attr, {})
                    cur = dattr.get(lang)
                    dattr[lang] = _prefer_text(cur, val) or val

    row_order = sorted(row_attrs)
    return dept_cells, row_order


DEFAULT_ROW_LABELS_EN: dict[str, str] = {
    "main_focus": "Main focus",
    "core_subjects": "Core subjects",
    "coding_intensity": "Coding intensity",
    "ai_exposure": "AI exposure",
    "security_exposure": "Security exposure",
    "math_level": "Math level",
    "career_paths": "Career paths",
    "placement_domains": "Placement domains",
    "higher_studies": "Higher studies",
    "industry_demand": "Industry demand",
    "real_world_applications": "Real-world applications",
    "future_scope": "Future scope",
    "best_suited_personality": "Best suited personality",
    "innovation_scope": "Innovation scope",
    "startup_opportunities": "Startup opportunities",
    "average_student_preference": "Average student preference",
    "recommended_for": "Recommended for",
}


def default_row_labels_multilingual(row_order: list[str]) -> dict[str, dict[str, str]]:
    """Stub: English labels duplicated; replace with translations in JSON edit or CSV."""
    out: dict[str, dict[str, str]] = {}
    langs = ("en", "kn", "hi", "ta", "te", "ml")
    for rid in row_order:
        lab = DEFAULT_ROW_LABELS_EN.get(rid, rid.replace("_", " ").title())
        out[rid] = {lng: lab for lng in langs}
    return out


DISPLAY_NAMES = {
    "cse": "Computer Science & Engineering",
    "ise": "Information Science & Engineering",
    "cse_aiml": "CSE (AI & ML)",
    "cse_ds": "CSE (Data Science)",
    "cse_cysec": "CSE (Cyber Security)",
    "cse_bs": "CSE (Business Systems)",
    "ece": "Electronics & Communication",
    "civil": "Civil Engineering",
    "mechanical": "Mechanical Engineering",
    "mba": "MBA / Business Studies",
    "basic_sciences": "Basic Sciences",
}


def _lang_map(text: str) -> dict[str, str]:
    langs = ("en", "kn", "hi", "ta", "te", "ml")
    return {lng: text for lng in langs}


def default_stub_registry() -> dict[str, Any]:
    """Rich demo data until CSV ingests replace via merge."""
    row_order = list(DEFAULT_ROW_LABELS_EN.keys())

    def dept_stub(
        did: str,
        **kwargs: str,
    ) -> tuple[str, dict[str, Any]]:
        cells: dict[str, dict[str, str]] = {}
        for k in row_order:
            v = kwargs.get(k, "—")
            cells[k] = _lang_map(v)
        return (
            did,
            {
                "display_names": _lang_map(DISPLAY_NAMES.get(did, did)),
                "cells": cells,
            },
        )

    pairs = [
        dept_stub(
            "cse",
            main_focus="Core computer science, algorithms, software engineering, systems.",
            core_subjects="DSA, OS, DBMS, CN, Software Engineering.",
            coding_intensity="Very high — daily programming and projects.",
            ai_exposure="Moderate; elective AI/ML tracks available.",
            security_exposure="Moderate via electives and secure coding practices.",
            math_level="Strong discrete math, linear algebra basics.",
            career_paths="SDE, backend, full-stack, systems, cloud.",
            placement_domains="Product companies, IT services, startups.",
            higher_studies="M.Tech, MS in CS, GATE.",
            industry_demand="Consistently high across sectors.",
            real_world_applications="Web, mobile, enterprise software, cloud infra.",
            future_scope="Broad; digital transformation sustains demand.",
            best_suited_personality="Problem-solvers who enjoy building software.",
            innovation_scope="High — hackathons, OSS, product ideas.",
            startup_opportunities="Strong for tech-first startups.",
            average_student_preference="Often first choice for coding-oriented students.",
            recommended_for="Students who want a classic CS engineering depth.",
        ),
        dept_stub(
            "cse_aiml",
            main_focus="Machine learning, deep learning, intelligent systems.",
            core_subjects="ML, DL, NLP, CV, statistics, Python ecosystems.",
            coding_intensity="High — model training, pipelines, deployment.",
            ai_exposure="Very high — core of the programme.",
            security_exposure="ML security, privacy-aware AI (varies by curriculum).",
            math_level="High — statistics, optimization, linear algebra.",
            career_paths="AI engineer, MLOps, data/ML scientist, research engineer.",
            placement_domains="AI labs, product AI teams, analytics-heavy roles.",
            higher_studies="MS/PhD in AI, specialized PG diplomas.",
            industry_demand="Rapidly growing in AI adoption.",
            real_world_applications="Assistants, recommendation, vision, automation.",
            future_scope="Strong long-term with responsible AI demand.",
            best_suited_personality="Curious, math-comfortable builders of intelligent systems.",
            innovation_scope="Very high — papers, products, competitions.",
            startup_opportunities="High in AI tooling and vertical AI.",
            average_student_preference="Popular with students targeting AI careers.",
            recommended_for="Students passionate about AI beyond generic programming.",
        ),
        dept_stub(
            "cse_ds",
            main_focus="Data engineering, analytics, statistical decision-making.",
            core_subjects="Statistics, Big Data, SQL, visualization, ML basics.",
            coding_intensity="High — SQL, Python/R, ETL, notebooks.",
            ai_exposure="Moderate–high through applied ML.",
            security_exposure="Data governance and privacy basics.",
            math_level="High — statistics & probability core.",
            career_paths="Data analyst, data engineer, BI, analytics consultant.",
            placement_domains="Analytics units, fintech, consulting, e-commerce.",
            higher_studies="MS Analytics, applied statistics, MBA analytics.",
            industry_demand="High for data-driven organisations.",
            real_world_applications="Dashboards, forecasting, experimentation.",
            future_scope="Broad as data volumes and compliance grow.",
            best_suited_personality="Detail-oriented thinkers who like evidence-based answers.",
            innovation_scope="Medium–high — storytelling with data products.",
            startup_opportunities="Medium — vertical analytics products.",
            average_student_preference="Chosen by analytics-minded students.",
            recommended_for="Students who prefer insights and modeling over low-level systems.",
        ),
        dept_stub(
            "cse_cysec",
            main_focus="Network security, cryptography, secure systems, ethical hacking basics.",
            core_subjects="Security protocols, OS hardening, ethical hacking, crypto.",
            coding_intensity="High — scripting and secure development.",
            ai_exposure="Growing — security for AI/ML pipelines.",
            security_exposure="Very high — specialization focus.",
            math_level="Moderate–high — crypto math.",
            career_paths="SOC analyst, security engineer, GRC roles, pen-testing (with certs).",
            placement_domains="Cybersecurity firms, banking, cloud security teams.",
            higher_studies="M.Tech cybersecurity, CEH/GIAC-style certifications.",
            industry_demand="Strong and rising with threat landscape.",
            real_world_applications="Zero-trust, IAM, appsec, cloud security.",
            future_scope="Structural demand for defenders.",
            best_suited_personality="Patient, ethical, puzzle-solvers under pressure.",
            innovation_scope="Medium–high — novel defenses and tools.",
            startup_opportunities="Medium — security SaaS and consulting.",
            average_student_preference="Niche but committed cohort.",
            recommended_for="Students drawn to defense, risk, and resilience.",
        ),
        dept_stub(
            "ise",
            main_focus="Information systems, full-stack, data structures with applications focus.",
            core_subjects="DSA, Web, DBMS, software engineering, IoT interfaces.",
            coding_intensity="High — application-centric development.",
            ai_exposure="Moderate via electives.",
            security_exposure="App security and secure SDLC exposure.",
            math_level="Moderate–strong.",
            career_paths="Software engineer, consultant, business-tech roles.",
            placement_domains="Similar to CSE with blended product focus.",
            higher_studies="MS in CS/IS, MCA paths.",
            industry_demand="Healthy across IT services and product.",
            real_world_applications="Enterprise apps, integration, information systems.",
            future_scope="Broad with digital services growth.",
            best_suited_personality="Collaborative builders who bridge users and tech.",
            innovation_scope="Medium–high.",
            startup_opportunities="Moderate–strong.",
            average_student_preference="Balanced choice versus pure CSE branding.",
            recommended_for="Students wanting CS strength with IS flavor.",
        ),
        dept_stub(
            "ece",
            main_focus="Electronics, embedded, communications, signal processing.",
            core_subjects="Analog/digital, communication theory, microcontrollers, VLSI intro.",
            coding_intensity="Moderate–high — RTL, embedded C, MATLAB/Python.",
            ai_exposure="Via edge AI and DSP overlap.",
            security_exposure="Hardware trust, secure embedded (elective).",
            math_level="High — signals, transforms, EM basics.",
            career_paths="Embedded, VLSI design, telecom hardware, IoT.",
            placement_domains="Semiconductor, telecom, automotive electronics.",
            higher_studies="M.Tech ECE/ES, MS abroad specializations.",
            industry_demand="Cyclical but strong in core electronics hiring.",
            real_world_applications="5G infra, consumer electronics, robotics.",
            future_scope="Solid with chips, EV, and connectivity.",
            best_suited_personality="Hands-on tinkerers liking hardware+math.",
            innovation_scope="High in R&D-heavy paths.",
            startup_opportunities="Hardware/IoT startups.",
            average_student_preference="Students preferring circuits over pure software.",
            recommended_for="Hardware-curious engineers.",
        ),
        dept_stub(
            "cse_bs",
            main_focus="Computing with business process, ERP, analytics for management.",
            core_subjects="DBMS, ERP concepts, business analytics, software engineering.",
            coding_intensity="Moderate — business applications and integration.",
            ai_exposure="Analytics/AI for business use-cases.",
            security_exposure="Enterprise security awareness.",
            math_level="Moderate — business statistics.",
            career_paths="Business analyst, techno-functional, IT consulting.",
            placement_domains="Consulting, BPM, enterprise IT.",
            higher_studies="MBA, MS IS.",
            industry_demand="Steady for enterprise digital roles.",
            real_world_applications="CRM, ERP workflows, operations dashboards.",
            future_scope="Strong as enterprises digitize processes.",
            best_suited_personality="Communication + technology blend.",
            innovation_scope="Medium — process innovation.",
            startup_opportunities="SaaS ops and vertical solutions.",
            average_student_preference="Students interested in tech in business context.",
            recommended_for="Tech-minded students targeting business-facing roles.",
        ),
        dept_stub(
            "mba",
            main_focus="Management, marketing, finance, HR, strategy.",
            core_subjects="Marketing, Financial Mgmt, Ops, HR, Strategy, Analytics.",
            coding_intensity="Low–moderate — spreadsheets, optional analytics tools.",
            ai_exposure="AI in business decisions (course dependent).",
            security_exposure="Information risk at management level.",
            math_level="Moderate — quantitative methods, not engineering math core.",
            career_paths="Marketing, finance, HR, consulting, general management.",
            placement_domains="Corporate, banks, startups in non-tech functions.",
            higher_studies="PhD management, executive programs.",
            industry_demand="Broad across economy.",
            real_world_applications="P&L ownership, go-to-market, people leadership.",
            future_scope="Depends on specialization; leadership always relevant.",
            best_suited_personality="Communicators, organizers, decision-makers.",
            innovation_scope="Medium — new ventures and intrapreneurship.",
            startup_opportunities="Founders and operators.",
            average_student_preference="Non-engineering or pivot students.",
            recommended_for="Leadership and management career goals.",
        ),
        dept_stub(
            "civil",
            main_focus="Infrastructure, structures, construction, environment basics.",
            core_subjects="Strength of materials, surveying, structures, environmental.",
            coding_intensity="Low–moderate — tools like AutoCAD, simulations.",
            ai_exposure="Growing in smart infrastructure (elective).",
            security_exposure="Low direct focus.",
            math_level="Moderate–high — mechanics-focused.",
            career_paths="Construction, design consultancies, PSUs, project management.",
            placement_domains="EPC, real estate, infra, government projects.",
            higher_studies="M.Tech structures, environmental.",
            industry_demand="Steady in infra cycles.",
            real_world_applications="Bridges, highways, buildings, water systems.",
            future_scope="Urbanization and sustainability projects.",
            best_suited_personality="Field-ready planners with patience for projects.",
            innovation_scope="Medium — materials and green tech.",
            startup_opportunities="Construction tech, consulting.",
            average_student_preference="Students preferring physical-world impact.",
            recommended_for="Infrastructure and built-environment interest.",
        ),
        dept_stub(
            "mechanical",
            main_focus="Thermal, design, manufacturing, automation.",
            core_subjects="Thermodynamics, design, manufacturing processes, FM.",
            coding_intensity="Moderate — CAD/CAE, automation scripts.",
            ai_exposure="Industry 4.0, predictive maintenance (electives).",
            security_exposure="Low direct.",
            math_level="High — mechanics, fluids math.",
            career_paths="Automotive, aerospace, manufacturing, energy.",
            placement_domains="Automotive suppliers, heavy industry, R&D.",
            higher_studies="M.Tech design/thermal/robotics.",
            industry_demand="Core manufacturing demand with automation shift.",
            real_world_applications="Vehicles, turbines, robotics arms, plants.",
            future_scope="Strong with EV and advanced manufacturing.",
            best_suited_personality="Hands-on designers and makers.",
            innovation_scope="High in product development.",
            startup_opportunities="Hardware, EV components, industrial tools.",
            average_student_preference="Classic engineering preference.",
            recommended_for="Mechanical systems and machines interest.",
        ),
        dept_stub(
            "basic_sciences",
            main_focus="Fundamental math, physics, chemistry support for engineering.",
            core_subjects="Calculus, physics, chemistry labs, foundations.",
            coding_intensity="Low — scientific computing optional.",
            ai_exposure="Minimal at UG service level.",
            security_exposure="N/A",
            math_level="Very high in foundation courses.",
            career_paths="Teaching, research prep, cross-bridge to PG specializations.",
            placement_domains="Fewer direct; supports core engineering strength.",
            higher_studies="MSc, integrated PhD paths.",
            industry_demand="Indirect — strengthens tech programs.",
            real_world_applications="Underpins all STEM programs.",
            future_scope="Stable as academic backbone.",
            best_suited_personality="Theory-comfortable explorers.",
            innovation_scope="Research-oriented.",
            startup_opportunities="Edtech, content, labs.",
            average_student_preference="Foundation-year exposure primarily.",
            recommended_for="Students strengthening fundamentals before specialization.",
        ),
    ]

    departments = dict(pairs)
    row_labels: dict[str, dict[str, str]] = {}
    for rid in row_order:
        lab = DEFAULT_ROW_LABELS_EN.get(rid, rid.replace("_", " ").title())
        row_labels[rid] = _lang_map(lab)

    return {
        "schema_version": 1,
        "row_order": row_order,
        "row_labels": row_labels,
        "department_order": [p[0] for p in pairs],
        "departments": departments,
    }


def build_registry(dept_cells: dict[str, dict[str, dict[str, str]]], row_order: list[str]) -> dict[str, Any]:
    langs = ("en", "kn", "hi", "ta", "te", "ml")
    row_labels = default_row_labels_multilingual(row_order)
    departments: dict[str, Any] = {}
    dept_order = [
        "cse",
        "ise",
        "cse_aiml",
        "cse_ds",
        "cse_cysec",
        "cse_bs",
        "ece",
        "civil",
        "mechanical",
        "mba",
        "basic_sciences",
    ]
    for did in dept_order:
        if did not in dept_cells:
            continue
        name_en = DISPLAY_NAMES.get(did, did)
        departments[did] = {
            "display_names": {lng: name_en for lng in langs},
            "cells": dept_cells[did],
        }

    # Include any extra dept ids from CSV not in dept_order (append sorted)
    extra = sorted(set(dept_cells) - set(departments))
    for did in extra:
        name_en = DISPLAY_NAMES.get(did, did.replace("_", " ").title())
        departments[did] = {
            "display_names": {lng: name_en for lng in langs},
            "cells": dept_cells[did],
        }

    merged_order = [d for d in dept_order if d in departments] + extra

    return {
        "schema_version": 1,
        "row_order": row_order,
        "row_labels": row_labels,
        "department_order": merged_order,
        "departments": departments,
    }


def main() -> int:
    paths = load_csv_paths()
    if not paths:
        print("No CSV files in", SOURCES, "- writing built-in demo registry.", file=sys.stderr)
        reg = default_stub_registry()
        FRONTEND_OUT.parent.mkdir(parents=True, exist_ok=True)
        FRONTEND_OUT.write_text(json.dumps(reg, ensure_ascii=False, indent=2), encoding="utf-8")
        BACKEND_OUT.parent.mkdir(parents=True, exist_ok=True)
        BACKEND_OUT.write_text(json.dumps(reg, ensure_ascii=False, indent=2), encoding="utf-8")
        print("Wrote", FRONTEND_OUT)
        print("Wrote", BACKEND_OUT)
        return 0

    dept_cells, row_order = merge_from_csv(paths)
    if not row_order:
        row_order = list(DEFAULT_ROW_LABELS_EN.keys())

    reg = build_registry(dept_cells, row_order)
    FRONTEND_OUT.parent.mkdir(parents=True, exist_ok=True)
    FRONTEND_OUT.write_text(json.dumps(reg, ensure_ascii=False, indent=2), encoding="utf-8")
    BACKEND_OUT.parent.mkdir(parents=True, exist_ok=True)
    BACKEND_OUT.write_text(json.dumps(reg, ensure_ascii=False, indent=2), encoding="utf-8")
    print("Wrote", FRONTEND_OUT)
    print("Wrote", BACKEND_OUT)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
