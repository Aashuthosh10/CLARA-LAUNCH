"""Match natural-language campus queries to rooms using SVIT floor-plan JSON."""

from __future__ import annotations

import json
import logging
import re
import unicodedata
from functools import lru_cache
from pathlib import Path
from typing import Any

from backend.services.content.semantic_vocab.catalog import entries_for
from backend.services.content.unicode_text import (
    casefold_keep_scripts,
    latin_token_boundaries_ok,
)

logger = logging.getLogger(__name__)

_PROJECT_ROOT = Path(__file__).resolve().parents[2]
_DEFAULT_MAP_PATH = _PROJECT_ROOT / "backend" / "data" / "svit-campus-map.json"

# Supplemental aliases keyed by room code — keep map JSON as geometry SSOT.
_EXTRA_ALIASES: dict[str, tuple[str, ...]] = {
    "B-004": (
        "principal office",
        "principal's office",
        "principal chamber",
        "principal cabin",
        "principal room",
        "principals room",
        "principal's room",
        "principal's chamber",
        "principal's cabin",
        "office of the principal",
        "principle office",
        "principle cabin",
        "principle chamber",
        "principle room",
    ),
    "B-011": (
        "admissions",
        "admission office",
        "admission room",
        "admissions office",
    ),
    "C-003": (
        "library",
        "central library",
        "college library",
        "lic",
    ),
    "C-007": (
        "main seminar hall",
        "seminar hall",
        "swamy vivekananda seminar hall",
    ),
    "B-210": (
        "mechanical lab",
        "mech lab",
        "mechanical laboratory",
        "civil and mechanical cad lab",
        "cad lab",
        "mechanical cad lab",
    ),
    "B-211": (
        "mechanical hod",
        "mechanical hod room",
        "mech hod",
        "mechanical engineering hod",
    ),
    "B-201": (
        "data science hod",
        "data science hod room",
        "ds hod",
        "cse ds hod",
        "cse data science hod",
    ),
    "B-202": (
        "aiml hod",
        "aiml hod room",
        "ai ml hod",
        "cse aiml hod",
    ),
    "B-101": (
        "cse hod",
        "cse hod room",
        "computer science hod",
    ),
    "C-101": (
        "cse lab",
        "computer lab",
        "cs lab",
        "dept of cse lab",
        "computer science lab",
    ),
    "C-102": (
        "cse lab",
        "computer lab",
        "cs lab",
        "dept of cse lab",
        "computer science lab",
    ),
    "C-103": (
        "cse lab",
        "computer lab",
        "cs lab",
        "dept of cse lab",
        "computer science lab",
    ),
    "C-104": (
        "cse lab",
        "computer lab",
        "cs lab",
        "dept of cse lab",
        "computer science lab",
    ),
    "B-217": (
        "data science lab",
        "ds lab",
        "cse ds lab",
        "cse data science lab",
    ),
    "B-218": (
        "aiml lab",
        "ai ml lab",
        "cse aiml lab",
    ),
}

_MIN_SCORE = 32.0
_GENERIC_NAME_PARTS = frozenset(
    {
        "chamber",
        "room",
        "office",
        "hall",
        "lab",
        "labs",
        "center",
        "centre",
        "block",
        "dept",
        "department",
        "staff",
        "faculty",
        "washroom",
        "toilet",
        "restroom",
        "bathroom",
        "corridor",
        "lobby",
        "stairs",
        "stair",
        "lift",
        "elevator",
    }
)

# json_key → English tokens that appear in map names / aliases after regional rewrite.
_DEPT_KEY_TO_ENGLISH: dict[str, str] = {
    "cse": "cse computer science",
    "ise": "ise information science",
    "cse_aiml": "aiml ai ml cse aiml",
    "cse_ds": "data science cse ds cse data science",
    "cse_cysec": "cyber security cse cysec",
    "cse_bs": "business systems cse bs",
    "ece": "ece electronics",
    "civil": "civil",
    "mechanical": "mechanical mech",
    "mba": "mba",
    "basic_sciences": "basic sciences mathematics maths",
    "mathematics": "mathematics maths",
    "electronics": "ece electronics",
    "data_science": "data science cse ds",
    "aiml": "aiml ai ml",
    "mech": "mechanical mech",
}


def _normalize(text: str) -> str:
    """Casefold and strip punctuation while preserving letters and combining marks.

    Indic scripts rely on Mn/Mc marks (matras, virama, anusvara). Treating them as
    punctuation would shatter loanwords like Hindi रूम and floors like दूसरी मंजिल.
    """
    s = casefold_keep_scripts(text or "")
    kept: list[str] = []
    for ch in s:
        if ch.isalnum() or ch.isspace() or ch in "/-":
            kept.append(ch)
            continue
        cat = unicodedata.category(ch)
        if cat in {"Mn", "Mc", "Me"}:
            kept.append(ch)
            continue
        kept.append(" ")
    s = "".join(kept)
    s = re.sub(r"\s+", " ", s).strip()
    return s


def _replace_semantic_variants(norm: str, category: str) -> str:
    """Replace purpose-tagged multilingual spans with one canonical token."""
    result = norm
    rows = sorted(
        (
            (_normalize(entry.variant), _normalize(entry.canonical))
            for entry in entries_for(category=category)
        ),
        key=lambda row: len(row[0]),
        reverse=True,
    )
    for variant, canonical in rows:
        if not variant or not canonical:
            continue
        start = 0
        while True:
            idx = result.find(variant, start)
            if idx < 0:
                break
            end = idx + len(variant)
            if all(ord(ch) < 128 for ch in variant) and not latin_token_boundaries_ok(result, idx, end):
                start = idx + 1
                continue
            result = f"{result[:idx]} {canonical} {result[end:]}"
            result = re.sub(r"\s+", " ", result).strip()
            start = idx + len(canonical)
    return result


def _rewrite_departments_to_english(norm: str) -> str:
    """Replace regional department spans with map-searchable English tokens.

    Only rewrites aliases that still contain non-Latin letters. Pure Latin
    tokens (cse, aiml, mechanical, data science) already match map English
    names; expanding them would destroy exact-name equality.
    """
    if not norm:
        return norm
    from backend.services.content.department_identity import department_alias_table

    hay = norm
    occupied = [False] * len(hay)
    replacements: list[tuple[int, int, str]] = []
    for alias, jkey in department_alias_table():
        variant = _normalize(alias)
        if not variant:
            continue
        if all(ord(ch) < 128 for ch in variant):
            continue
        english = _DEPT_KEY_TO_ENGLISH.get(str(jkey).strip().lower())
        if not english:
            english = str(jkey).replace("_", " ").strip()
        if not english:
            continue
        start = 0
        while True:
            idx = hay.find(variant, start)
            if idx < 0:
                break
            end = idx + len(variant)
            if end > len(occupied) or any(occupied[idx:end]):
                start = idx + 1
                continue
            for i in range(idx, end):
                occupied[i] = True
            replacements.append((idx, end, english))
            start = end
    if not replacements:
        return norm
    replacements.sort(key=lambda row: row[0], reverse=True)
    result = hay
    for idx, end, english in replacements:
        result = f"{result[:idx]} {english} {result[end:]}"
    return re.sub(r"\s+", " ", result).strip()


def normalize_campus_destination_text(text: str) -> str:
    """Language-aware normalization before canonical map matching."""
    # Regional dept scripts → English tokens before casefold/punctuation strip.
    from backend.services.answer_generation import _inject_regional_department_tokens

    injected = _inject_regional_department_tokens(text or "")
    norm = _normalize(injected)
    norm = _rewrite_departments_to_english(norm)
    norm = _replace_semantic_variants(norm, "CAMPUS_DESTINATION")
    norm = _replace_semantic_variants(norm, "CAMPUS_TERM")
    norm = _replace_semantic_variants(norm, "CAMPUS_FLOOR")
    return norm


def _strip_question_framing(norm: str) -> str:
    t = norm
    # The same purpose-tagged navigation vocabulary is used by intent detection.
    # Removing it here keeps destination scoring independent from input language.
    for entry in sorted(entries_for(category="NAVIGATION_INTENT"), key=lambda e: len(e.variant), reverse=True):
        cue = _normalize(entry.variant)
        if not cue:
            continue
        t = re.sub(rf"(?<!\w){re.escape(cue)}(?!\w)", " ", t, flags=re.UNICODE)
        t = re.sub(r"\s+", " ", t).strip()
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


def _aliases_for_room(room: dict[str, Any]) -> list[str]:
    code = str(room.get("code") or "").strip().upper()
    aliases: list[str] = []
    for alias in room.get("aliases") or []:
        if isinstance(alias, str) and alias.strip():
            aliases.append(alias.strip())
    for alias in _EXTRA_ALIASES.get(code, ()):
        aliases.append(alias)
    return list(dict.fromkeys(alias.casefold().strip() for alias in aliases if alias.strip()))


def _synthetic_phrases_for_room(room: dict[str, Any]) -> list[str]:
    """Auto-built English phrases from name/type so every room is searchable."""
    name_l = _normalize(str(room.get("name") or ""))
    type_ = str(room.get("type") or "").strip().lower()
    category = str(room.get("category") or "").strip().lower()
    dept = _normalize(str(room.get("department") or ""))
    phrases: list[str] = []
    if name_l:
        phrases.append(name_l)
    if type_ and type_ not in {"", "null", "none"}:
        phrases.append(type_)
    if category and category not in {"", "null", "none"} and category != type_:
        phrases.append(category)
    if dept:
        phrases.append(dept)
        if type_:
            phrases.append(f"{dept} {type_}")
    # Distinctive name tokens composed with type (mechanical + lab, cse + hod, …).
    sig = sorted(_significant_name_tokens(name_l))
    if sig and type_ and type_ not in _GENERIC_NAME_PARTS:
        phrases.append(" ".join(sig + [type_]))
    elif sig:
        phrases.append(" ".join(sig))
    if "hod" in name_l or type_ == "hod":
        phrases.append("hod room")
        if sig:
            phrases.append(f"{' '.join(sig)} hod")
            phrases.append(f"{' '.join(sig)} hod room")
    if type_ == "lab" or "lab" in name_l:
        phrases.append("lab")
        if sig:
            phrases.append(f"{' '.join(sig)} lab")
    return list(dict.fromkeys(p for p in (_normalize(p) for p in phrases) if p))


@lru_cache(maxsize=1)
def _room_search_index() -> tuple[dict[str, Any], ...]:
    """Cached per-room search blobs derived from the map SSOT."""
    indexed: list[dict[str, Any]] = []
    for room in _iter_rooms(_load_map_raw()):
        name_l = _normalize(str(room.get("name") or ""))
        synthetics = _synthetic_phrases_for_room(room)
        alias_norms = tuple(_normalize(a) for a in _aliases_for_room(room) if _normalize(a))
        indexed.append(
            {
                "room": room,
                "name_l": name_l,
                "name_sig": frozenset(_significant_name_tokens(name_l)),
                "type": str(room.get("type") or "").strip().lower(),
                "dept": _normalize(str(room.get("department") or "")),
                "aliases": alias_norms,
                "synthetics": tuple(synthetics),
            }
        )
    return tuple(indexed)


def _code_match_variants(code: str) -> tuple[str, ...]:
    """Searchable forms of a room code (hyphenated, compact, spaced)."""
    code_u = str(code or "").strip().upper()
    if not code_u:
        return ()
    m = re.match(r"^([A-Z]+)-([\w.-]+)$", code_u)
    if not m:
        return (code_u.lower(), code_u.replace("-", "").lower())
    block, rest = m.group(1), m.group(2)
    variants = {
        code_u.lower(),
        f"{block.lower()}-{rest.lower()}",
        f"{block.lower()}{rest.lower()}",
        f"{block.lower()} {rest.lower()}",
    }
    if rest.isdigit():
        num = rest.lstrip("0") or "0"
        # Keep zero-padded and stripped forms as full tokens only — never
        # substring-match shortened numbers inside longer codes (A-10 vs A-108).
        variants.update(
            {
                f"{block.lower()}-{num}",
                f"{block.lower()}{num}",
                f"{block.lower()} {num}",
                f"{block.lower()}-{rest}",
                f"{block.lower()}{rest}",
            }
        )
    return tuple(variants)


def _code_mentioned(norm: str, code: str) -> bool:
    """True when the transcript mentions this room code as a whole token/span."""
    compact_keep_hyphen = norm.replace(" ", "")
    compact_flat = compact_keep_hyphen.replace("-", "")

    def _bounded(haystack: str, needle: str) -> bool:
        if not needle:
            return False
        if needle == haystack:
            return True
        return bool(re.search(rf"(?<![a-z0-9]){re.escape(needle)}(?![a-z0-9])", haystack))

    for variant in _code_match_variants(code):
        v = variant.strip()
        if not v:
            continue
        if " " in v:
            if _bounded(norm, v):
                return True
            continue
        if "-" in v:
            # Avoid a-10 matching inside a-108.
            if _bounded(compact_keep_hyphen, v) or _bounded(norm, v):
                return True
            continue
        if _bounded(compact_flat, v) or _bounded(norm.replace(" ", ""), v):
            return True
    return False


def _significant_name_tokens(name_l: str) -> set[str]:
    return {
        part
        for part in re.split(r"[\s/&,.-]+", name_l)
        if len(part) >= 3 and part not in _GENERIC_NAME_PARTS
    }


def _score_indexed_room(norm: str, toks: set[str], entry: dict[str, Any]) -> float:
    room = entry["room"]
    score = 0.0
    code = str(room.get("code") or "").strip().upper()
    name_l = str(entry.get("name_l") or "")
    type_ = str(entry.get("type") or "")
    dept = str(entry.get("dept") or "")
    name_sig: frozenset[str] = entry.get("name_sig") or frozenset()
    wants_lab = "lab" in toks or "laboratory" in toks
    requested_floors = toks & {"gf", "ff", "sf"}
    room_floor = str(room.get("_floor_id") or "").strip().lower()

    if requested_floors:
        score += 180 if room_floor in requested_floors else -180

    if _code_mentioned(norm, code):
        score += 120

    if len(name_l) >= 4 and name_l == norm:
        name_parts = {p for p in re.split(r"[\s/&,.-]+", name_l) if p}
        # Exact match on a fully generic label ("faculty room", "washroom") must
        # not dominate siblings — keep them competing for ambiguity.
        if name_parts and name_parts <= _GENERIC_NAME_PARTS:
            score += 80
        else:
            score += 600
    elif len(name_l) >= 4 and name_l in norm:
        name_parts = {p for p in re.split(r"[\s/&,.-]+", name_l) if p}
        if name_parts and name_parts <= _GENERIC_NAME_PARTS:
            score += 40
        else:
            score += 150
    else:
        if name_sig and name_sig <= toks:
            score += 96
        elif name_sig:
            overlap = name_sig & toks
            if overlap:
                score += min(84.0, 28.0 * len(overlap))
        if len(name_l) >= 6:
            for part in re.split(r"[\s/&,]+", name_l):
                if len(part) >= 5 and part in norm and part not in _GENERIC_NAME_PARTS:
                    score += 72

    for alias in entry.get("aliases") or ():
        a = str(alias)
        if len(a) < 3:
            continue
        a_parts = {x for x in re.split(r"[\s/&,.-]+", a) if x}
        generic_alias = bool(a_parts) and a_parts <= _GENERIC_NAME_PARTS
        if a == norm:
            score += 60 if generic_alias else 240
        elif a in norm:
            score += 30 if generic_alias else 115
        else:
            alias_toks = _tokens(a)
            if alias_toks and alias_toks <= toks:
                score += 40 if generic_alias else 105
            else:
                score += len(toks & alias_toks) * (6 if generic_alias else 14)

    # Auto-index synthetics (name/type/dept compositions for every room).
    for phrase in entry.get("synthetics") or ():
        p = str(phrase)
        if len(p) < 3:
            continue
        p_parts = {x for x in re.split(r"[\s/&,.-]+", p) if x}
        generic_phrase = bool(p_parts) and p_parts <= _GENERIC_NAME_PARTS
        if p == norm:
            score += 40 if generic_phrase else 200
        elif p in norm and len(p) >= 6:
            score += 20 if generic_phrase else 90
        else:
            p_toks = _tokens(p)
            if p_toks and p_toks <= toks and len(p_toks) >= 2 and not generic_phrase:
                score += 88

    if type_ and len(type_) > 2 and type_ in toks:
        score += 22
    if type_ and len(type_) > 5 and type_ in norm:
        score += 18
    if dept and len(dept) > 3 and (dept in norm or dept in toks):
        score += 18

    if wants_lab:
        if type_ == "lab" or "lab" in name_l:
            score += 40
        if type_ in {"faculty", "staff"} or "faculty" in name_l or "staff" in name_l:
            score -= 50

    # Generic-only queries (faculty room / washroom / bare lab) must not win
    # on weak type overlap alone — require a distinctive token or code/name hit.
    distinctive = (name_sig & toks) or any(
        len(a) >= 5 and a in norm for a in (entry.get("aliases") or ())
    ) or _code_mentioned(norm, code) or (len(name_l) >= 4 and name_l in norm)
    if not distinctive and score < 100:
        only_generic = toks <= (_GENERIC_NAME_PARTS | {"the", "a", "an", "of", "and"})
        if only_generic or (toks & _GENERIC_NAME_PARTS and not name_sig & toks):
            if score < 90:
                return 0.0

    return score


def _score_room(norm: str, toks: set[str], room: dict[str, Any]) -> float:
    """Backward-compatible scorer used by tests; prefers the cached index."""
    code = str(room.get("code") or "").strip().upper()
    floor = str(room.get("_floor_id") or room.get("floor_id") or "").strip().upper()
    for entry in _room_search_index():
        er = entry["room"]
        if str(er.get("code") or "").strip().upper() != code:
            continue
        if floor and str(er.get("_floor_id") or "").strip().upper() != floor:
            continue
        return _score_indexed_room(norm, toks, entry)
    # Fallback if index miss (should not happen for map rooms).
    entry = {
        "room": room,
        "name_l": _normalize(str(room.get("name") or "")),
        "name_sig": frozenset(_significant_name_tokens(_normalize(str(room.get("name") or "")))),
        "type": str(room.get("type") or "").strip().lower(),
        "dept": _normalize(str(room.get("department") or "")),
        "aliases": tuple(_normalize(a) for a in _aliases_for_room(room)),
        "synthetics": tuple(_synthetic_phrases_for_room(room)),
    }
    return _score_indexed_room(norm, toks, entry)


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


def match_campus_transcript_ranked(transcript: str, *, limit: int = 8) -> list[dict[str, Any]]:
    """
    Rank rooms for a transcript.

    Each entry: {"score": float, "matched_room": public room dict}.
    """
    raw = (transcript or "").strip()
    if not raw:
        return []

    data = _load_map_raw()
    if not data.get("floors"):
        return []

    norm = normalize_campus_destination_text(raw)
    norm = _strip_question_framing(norm)
    toks = _tokens(norm)
    if not norm:
        return []

    scored: list[tuple[float, dict[str, Any]]] = []
    for entry in _room_search_index():
        s = _score_indexed_room(norm, toks, entry)
        if s >= _MIN_SCORE:
            scored.append((s, entry["room"]))
    scored.sort(key=lambda x: x[0], reverse=True)
    out: list[dict[str, Any]] = []
    for s, room in scored[: max(1, limit)]:
        out.append({"score": s, "matched_room": _public_room_payload(room)})
    return out


def match_campus_transcript(transcript: str) -> dict[str, Any]:
    """
    Return {"matched": bool, "score": float, "room": dict | null}.
    """
    ranked = match_campus_transcript_ranked(transcript, limit=1)
    if not ranked:
        raw = (transcript or "").strip()
        if not raw:
            return {"matched": False, "score": 0.0, "room": None}
        data = _load_map_raw()
        if not data.get("floors"):
            return {"matched": False, "score": 0.0, "room": None, "error": "map_unavailable"}
        return {"matched": False, "score": 0.0, "room": None}

    best = ranked[0]
    return {
        "matched": True,
        "score": float(best["score"]),
        "room": best["matched_room"],
    }


def get_campus_map_json() -> dict[str, Any]:
    return _load_map_raw()


def get_campus_rooms() -> tuple[dict[str, Any], ...]:
    """Public canonical room records for audits, clarification, and exact lookup."""
    return tuple(_public_room_payload(room) for room in _iter_rooms(_load_map_raw()))


def get_campus_room_by_code(code: str, *, floor_id: str | None = None) -> dict[str, Any] | None:
    wanted = str(code or "").strip().upper()
    if not wanted:
        return None
    for room in _iter_rooms(_load_map_raw()):
        if str(room.get("code") or "").strip().upper() != wanted:
            continue
        if floor_id and str(room.get("_floor_id") or "").upper() != str(floor_id).upper():
            continue
        return _public_room_payload(room)
    return None
