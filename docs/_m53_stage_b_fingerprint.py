"""Stage B fingerprint — live process vs disk. No production changes."""
from __future__ import annotations

import inspect
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from backend.services.content.semantic_request_parser import parse_semantic_request
from backend.services.content.unit_selector import select_content_units
from backend.services.content.department_resolver import resolve_department_key
from backend.services.narration_plan import _loose_resolve_department_json_key
from backend.services.content import department_resolver as dr

src = inspect.getsource(parse_semantic_request)
print("PARSER_SOURCE", "m5.3_semantic_request_parser" if "m5.3_semantic_request_parser" in src else "UNKNOWN")
print("LOOSE_IN_RESOLVER", "_loose_resolve_department_json_key" in inspect.getsource(dr))
req = parse_semantic_request(raw_text="Who is the HOD of CSE Data Science?", language_code_key="en")
print("IR_SOURCE", None if req is None else req.source)
print("IR_ENTITIES", None if req is None else list(req.entities))
print("IR_CONFIDENCE", None if req is None else req.confidence)
plan = select_content_units(req) if req else None
print("UNITS", None if plan is None else list(plan.units))
res = resolve_department_key(department="CSE", language="en", user_text="Who is the HOD of CSE Data Science?")
print("RESOLVER_ON_BLOB", res.json_key)
print("STAGE_B_DISK_OK", req is not None and list(req.entities) == ["cse_ds"] and req.confidence == "HIGH")
