"""Match natural-language campus queries to rooms using SVIT floor-plan JSON."""

from __future__ import annotations

import json
import logging
import re
from functools import lru_cache
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

_PROJECT_ROOT = Path(__file__).resolve().parents[2]
_DEFAULT_MAP_PATH = _PROJECT_ROOT / "backend" / "data" / "svit-campus-map.json"

_QUERY_STRIP = (
    "where is ",
    "where's ",
    "wheres ",
    "how do i get to ",
    "how to get to ",
    "how to reach ",
    "directions to ",
    "direction to ",
    "take me to ",
    "i want to go to ",
    "i need to go to ",
    "show me ",
    "locate ",
    "find ",
    "navigate to ",
    "path to ",
)

_MIN_SCORE = 32.0


def _normalize(text: str) -> str:
    s = text.lower().strip()
    s = re.sub(r"[^\w\s/-]", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


def _strip_question_framing(norm: str) -> str:
    t = norm
    changed = True
    while changed:
        changed = False
        for prefix in _QUERY_STRIP:
            if t.startswith(prefix):
                t = t[len(prefix) :].strip()
                changed = True
                break
    return t


def _tokens(norm: str) -> set[str]:
    return {w for w in norm.split() if len(w) > 1}


@lru_cache(maxsize=1)
def _load_map_raw() -> dict[str, Any]:
    path = _DEFAULT_MAP_PATH
    if not path.is_file():
        logger.error("Campus map JSON missing at %s", path)
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        logger.exception("Failed to read campus map JSON")
        return {}


def _iter_rooms(data: dict[str, Any]) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for floor in data.get("floors") or []:
        floor_id = str(floor.get("floor_id") or "")
        floor_name = str(floor.get("floor_name") or "")
        for block in floor.get("blocks") or []:
            block_id = str(block.get("block_id") or "")
            block_code = str(block.get("block_code") or "").strip().upper()[:1] or "?"
            for room in block.get("rooms") or []:
                if not isinstance(room, dict):
                    continue
                rid = str(room.get("id") or "")
                code = str(room.get("code") or "").strip()
                if not code:
                    continue
                out.append(
                    {
                        **room,
                        "_floor_id": floor_id,
                        "_floor_name": floor_name,
                        "_block_id": block_id,
                        "_block_code": block_code,
                        "_room_id": rid or code,
                    }
                )
    return out


def _score_room(norm: str, toks: set[str], room: dict[str, Any]) -> float:
    score = 0.0
    code = str(room.get("code") or "").strip().upper()
    name = str(room.get("name") or "").strip()
    name_l = name.lower()
    type_ = str(room.get("type") or "").strip().lower()
    dept = str(room.get("department") or "").strip().lower()

    # Room code exact / fuzzy in transcript
    m = re.match(r"^([A-Z]+)-([\w.-]+)$", code)
    if m:
        block, rest = m.group(1), m.group(2)
        compact = norm.replace(" ", "")
        if code.lower() in compact or f"{block.lower()}-{rest}".lower() in norm:
            score += 120
        if rest.isdigit():
            num = rest.lstrip("0") or "0"
            for variant in (
                f"{block.lower()}-{rest}",
                f"{block.lower()}-{num}",
                f"{block.lower()}{num}",
                f"{block.lower()} {num}",
            ):
                if variant.replace(" ", "") in compact:
                    score += 95
                    break

    # Name substring (ignore very short names)
    if len(name_l) >= 4 and name_l in norm:
        score += 100
    elif len(name_l) >= 6:
        for part in re.split(r"[\s/&,]+", name_l):
            if len(part) >= 5 and part in norm:
                score += 72

    # Aliases
    for alias in room.get("aliases") or []:
        if not isinstance(alias, str):
            continue
        a = alias.strip().lower()
        if len(a) < 3:
            continue
        if a in norm:
            score += 88
        else:
            common = toks & _tokens(a)
            score += len(common) * 14

    # Type / department weak signals
    if type_ and len(type_) > 5 and type_ in norm:
        score += 18
    if dept and len(dept) > 3 and dept in norm:
        score += 12

    return score


def _public_room_payload(room: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": room.get("_room_id") or room.get("id"),
        "code": room.get("code"),
        "name": room.get("name"),
        "floor_id": room.get("_floor_id"),
        "floor_name": room.get("_floor_name"),
        "block_code": room.get("_block_code"),
        "block_id": room.get("_block_id"),
        "category": room.get("category"),
        "type": room.get("type"),
        "department": room.get("department"),
    }


def match_campus_transcript(transcript: str) -> dict[str, Any]:
    """
    Return {"matched": bool, "score": float, "room": dict | null}.
    """
    raw = (transcript or "").strip()
    if not raw:
        return {"matched": False, "score": 0.0, "room": None}

    data = _load_map_raw()
    if not data.get("floors"):
        return {"matched": False, "score": 0.0, "room": None, "error": "map_unavailable"}

    norm = _normalize(raw)
    norm = _strip_question_framing(norm)
    toks = _tokens(norm)
    if not norm:
        return {"matched": False, "score": 0.0, "room": None}

    rooms = _iter_rooms(data)
    best: dict[str, Any] | None = None
    best_score = 0.0

    for room in rooms:
        s = _score_room(norm, toks, room)
        if s > best_score:
            best_score = s
            best = room

    if best is None or best_score < _MIN_SCORE:
        return {"matched": False, "score": best_score, "room": None}

    return {"matched": True, "score": best_score, "room": _public_room_payload(best)}


def get_campus_map_json() -> dict[str, Any]:
    return _load_map_raw()
