#!/usr/bin/env python3
"""
Merge CSV files from backend/data/comparison_sources/ into a single
frontend/src/data/departmentComparison.json registry.

Default content (schema v2): three insight sections only, multilingual copy from
backend/data/comparison_insight_defaults.json.

CSV conventions:
- Required column: department_id (matches DepartmentJsonKey: cse, cse_aiml, ...)
- Attribute columns: snake_case ids matching CANONICAL_ROWS, optionally suffixed
  with _en, _kn, _hi, _ta, _te, _ml
  e.g. student_learning_4y_en, future_job_opportunities_kn

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
INSIGHT_DEFAULTS_PATH = ROOT / "backend" / "data" / "comparison_insight_defaults.json"

LANG_SUFFIXES = ("_en", "_kn", "_hi", "_ta", "_te", "_ml")

CANONICAL_ROWS = (
    "student_learning_4y",
    "future_job_opportunities",
    "future_scope_5_10y",
)
LANG_ORDER = ("en", "kn", "hi", "ta", "te", "ml")


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


def merge_from_csv(paths: list[Path]) -> tuple[dict[str, dict[str, dict[str, str]]], list[str]]:
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
                    if attr == "unknown" or attr not in CANONICAL_ROWS:
                        continue
                    row_attrs.add(attr)
                    val = str(cell).strip() if cell is not None else ""
                    if not val:
                        continue
                    dattr = dept_cells[dept_id].setdefault(attr, {})
                    cur = dattr.get(lang)
                    dattr[lang] = _prefer_text(cur, val) or val

    row_attrs_filtered = sorted(row_attrs & set(CANONICAL_ROWS))
    row_order = [r for r in CANONICAL_ROWS if r in row_attrs_filtered] if row_attrs_filtered else list(CANONICAL_ROWS)

    for did in list(dept_cells.keys()):
        nd: dict[str, dict[str, str]] = {}
        for rk in CANONICAL_ROWS:
            if rk in dept_cells[did]:
                nd[rk] = dept_cells[did][rk]
        dept_cells[did] = nd

    return dept_cells, row_order


def load_insight_defaults() -> tuple[dict[str, dict[str, str]], dict[str, dict[str, dict[str, str]]]]:
    raw = json.loads(INSIGHT_DEFAULTS_PATH.read_text(encoding="utf-8"))
    row_labels = raw.get("row_labels") if isinstance(raw, dict) else None
    dept_defaults = raw.get("departments") if isinstance(raw, dict) else None
    if not isinstance(row_labels, dict):
        raise ValueError(f"comparison_insight_defaults.json missing row_labels: {INSIGHT_DEFAULTS_PATH}")
    if not isinstance(dept_defaults, dict):
        raise ValueError(f"comparison_insight_defaults.json missing departments: {INSIGHT_DEFAULTS_PATH}")
    # normalize keys
    fixed_labels: dict[str, dict[str, str]] = {}
    for rk in CANONICAL_ROWS:
        rl = row_labels.get(rk)
        if isinstance(rl, dict):
            fixed_labels[rk] = {lng: str(rl.get(lng, "") or "") for lng in LANG_ORDER}
    return fixed_labels, dept_defaults  # type: ignore[return-value]


def merge_dept_cells_with_defaults(
    csv_blk: dict[str, dict[str, str]],
    default_blk: dict[str, Any],
) -> dict[str, dict[str, str]]:
    merged: dict[str, dict[str, str]] = {}
    for rk in CANONICAL_ROWS:
        base_row = default_blk.get(rk) if isinstance(default_blk.get(rk), dict) else {}
        csv_row_raw = csv_blk.get(rk, {})
        csv_row = csv_row_raw if isinstance(csv_row_raw, dict) else {}
        merged[rk] = {}
        base_dict = base_row if isinstance(base_row, dict) else {}
        for lng in LANG_ORDER:
            c = str(csv_row.get(lng, "") or "").strip()
            b = str(base_dict.get(lng, "") or "").strip()
            merged[rk][lng] = c or b or "—"
    return merged


DISPLAY_NAMES_EN: dict[str, str] = {
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


def default_stub_registry() -> dict[str, Any]:
    row_labels_full, dept_defaults = load_insight_defaults()
    row_order = list(CANONICAL_ROWS)
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
        name_en = DISPLAY_NAMES_EN.get(did, did.replace("_", " ").title())
        cells = merge_dept_cells_with_defaults({}, dept_defaults.get(did, {}))
        departments[did] = {
            "display_names": {lng: name_en for lng in LANG_ORDER},
            "cells": cells,
        }
    return {
        "schema_version": 2,
        "row_order": row_order,
        "row_labels": row_labels_full,
        "department_order": dept_order,
        "departments": departments,
    }


def build_registry(dept_cells: dict[str, dict[str, dict[str, str]]], row_order: list[str]) -> dict[str, Any]:
    row_labels_full, dept_defaults = load_insight_defaults()
    canonical_order = [r for r in CANONICAL_ROWS if r in row_order]
    if len(canonical_order) != len(CANONICAL_ROWS):
        canonical_order = list(CANONICAL_ROWS)
    departments: dict[str, Any] = {}
    base_order = [
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

    def add_dept(did: str) -> None:
        if did in departments:
            return
        name_en = DISPLAY_NAMES_EN.get(did, did.replace("_", " ").title())
        csv_blk = dept_cells.get(did, {})
        default_blk_raw = dept_defaults.get(did, {})
        cells = merge_dept_cells_with_defaults(
            csv_blk,
            default_blk_raw if isinstance(default_blk_raw, dict) else {},
        )
        departments[did] = {
            "display_names": {lng: name_en for lng in LANG_ORDER},
            "cells": cells,
        }

    for did in base_order:
        add_dept(did)
    for did in sorted(set(dept_cells.keys()) - set(base_order)):
        add_dept(did)

    merged_order = [d for d in base_order if d in departments]
    merged_order.extend(sorted(set(departments.keys()) - set(merged_order)))

    return {
        "schema_version": 2,
        "row_order": canonical_order,
        "row_labels": row_labels_full,
        "department_order": merged_order,
        "departments": departments,
    }


def main() -> int:
    paths = load_csv_paths()
    if not paths:
        print("No CSV files in", SOURCES, "- writing insight-default registry (schema v2).", file=sys.stderr)
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
        row_order = list(CANONICAL_ROWS)
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
