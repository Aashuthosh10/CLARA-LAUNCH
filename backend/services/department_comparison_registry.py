"""Load normalized department comparison JSON (built from CSV or stub) for LLM context."""

from __future__ import annotations

import json
import logging
from functools import lru_cache
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

_REGISTRY_PATH = Path(__file__).resolve().parent.parent / "data" / "department_comparison.json"


@lru_cache(maxsize=1)
def load_comparison_registry() -> dict[str, Any]:
    if not _REGISTRY_PATH.is_file():
        logger.warning("department_comparison.json missing at %s", _REGISTRY_PATH)
        return {}
    try:
        data = json.loads(_REGISTRY_PATH.read_text(encoding="utf-8"))
        return data if isinstance(data, dict) else {}
    except Exception as exc:
        logger.warning("Could not load comparison registry: %s", exc)
        return {}


def department_order_keys() -> list[str]:
    reg = load_comparison_registry()
    order = reg.get("department_order")
    if isinstance(order, list):
        return [str(x) for x in order if isinstance(x, str)]
    deps = reg.get("departments")
    if isinstance(deps, dict):
        return list(deps.keys())
    return []


def default_comparison_ids(max_n: int = 3) -> list[str]:
    keys = department_order_keys()
    return keys[:max_n] if keys else []


def validate_department_ids(ids: list[str]) -> list[str]:
    reg = load_comparison_registry()
    deps = reg.get("departments")
    if not isinstance(deps, dict):
        return []
    out: list[str] = []
    seen: set[str] = set()
    for raw in ids:
        k = str(raw or "").strip()
        if not k or k not in deps or k in seen:
            continue
        seen.add(k)
        out.append(k)
        if len(out) >= 3:
            break
    return out


def build_comparison_context_for_llm(department_ids: list[str], *, lang_key: str | None = None) -> str:
    """Compact English-oriented facts for the LLM (cells.en preferred)."""
    reg = load_comparison_registry()
    deps = reg.get("departments")
    row_order = reg.get("row_order")
    if not isinstance(deps, dict) or not department_ids:
        return ""
    rows = row_order if isinstance(row_order, list) else []
    lines: list[str] = []
    lk = (lang_key or "en").strip().lower()
    if lk not in ("en", "kn", "hi", "ta", "te", "ml"):
        lk = "en"

    for did in department_ids:
        block = deps.get(did)
        if not isinstance(block, dict):
            continue
        title = did
        dn = block.get("display_names")
        if isinstance(dn, dict):
            tv = dn.get(lk) or dn.get("en")
            if isinstance(tv, str) and tv.strip():
                title = tv.strip()
        lines.append(f"=== {title} ({did}) ===")
        cells = block.get("cells")
        if not isinstance(cells, dict):
            continue
        for rk in rows:
            rkey = str(rk)
            cell = cells.get(rkey)
            if not isinstance(cell, dict):
                continue
            val = cell.get(lk) or cell.get("en") or ""
            if not isinstance(val, str) or not val.strip():
                continue
            lines.append(f"- {rkey}: {val.strip()}")
        lines.append("")
    return "\n".join(lines).strip()
