"""TEMPORARY Stage A debug — native-script fees topic miss. Not production."""
from __future__ import annotations

import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from backend.services.answer_generation import extract_features, normalize_user_input
from backend.services.content.semantic_request_parser import parse_semantic_request

for t in ("CSE ಶುಲ್ಕ", "CSE फीस", "CSE fees yestu?"):
    n = normalize_user_input(t)
    f = extract_features(n)
    req = parse_semantic_request(raw_text=t, language_code_key="kn" if "ಶು" in t else "hi" if "फी" in t else "en")
    print(repr(t))
    print("  norm", repr(n))
    print("  fee", f.is_fee_query, "hod", f.is_hod_query, "dept", f.department_name)
    print("  req", None if req is None else (req.topic, list(req.entities), req.requested_scope))
