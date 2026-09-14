"""Deterministic campus-navigation intent + destination resolution.

Authority: room identity / floor / map target come from svit-campus-map.json
via campus_room_match — never from the LLM.
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass
from typing import Any

from backend.services.campus_room_match import (
    get_campus_room_by_code,
    get_campus_rooms,
    match_campus_transcript,
    match_campus_transcript_ranked,
    normalize_campus_destination_text,
    _strip_question_framing,
)
from backend.services.content.department_identity import match_department_keys_exclusive
from backend.services.content.semantic_vocab.catalog import entries_for
from backend.services.content.unicode_text import casefold_keep_scripts
from backend.services.content.unicode_text import latin_token_boundaries_ok

logger = logging.getLogger(__name__)

# College / SVIT address questions stay on the existing location FAQ / unit path.
_COLLEGE_ADDRESS_CUES: tuple[str, ...] = (
    "where is the college",
    "where is svit",
    "where is sai vidya",
    "college location",
    "college address",
    "campus location",
    "campus address",
    "svit location",
    "svit address",
    "located in",
    "ಕಾಲೇಜು ಎಲ್ಲಿದೆ",
    "ಎಸ್‌ವಿಐಟಿ ಎಲ್ಲಿದೆ",
    "कॉलेज कहाँ स्थित",
    "कॉलेज कहां स्थित",
    "कॉलेज का पता",
    "కాలేజీ ఎక్కడ",
    "கல்லூரி எங்கே",
    "எஸ்விஐடி எங்கே",
    "കോളേജ് എവിടെയാണ്",
)

# Canonical department key → preferred HOD room code on the map.
_DEPT_HOD_ROOM: dict[str, str] = {
    "cse": "B-101",
    "ise": "B-102",
    "ece": "A-108",
    "electronics": "A-108",
    "cse_ds": "B-201",
    "data_science": "B-201",
    "cse (data science)": "B-201",
    "cse_aiml": "B-202",
    "aiml": "B-202",
    "cse (ai & ml)": "B-202",
    "mechanical": "B-211",
    "mech": "B-211",
    "civil": "B-212",
    "mathematics": "A-HOD-MATH",
    "maths": "A-HOD-MATH",
    "basic_sciences": "A-HOD-MATH",
}

_DEPT_LABEL_TO_KEY: dict[str, str] = {
    "cse": "cse",
    "computer science": "cse",
    "ise": "ise",
    "information science": "ise",
    "ece": "ece",
    "electronics": "ece",
    "mechanical": "mechanical",
    "mech": "mechanical",
    "civil": "civil",
    "data science": "cse_ds",
    "datascience": "cse_ds",
    "cse data science": "cse_ds",
    "cse ds": "cse_ds",
    "aiml": "cse_aiml",
    "ai ml": "cse_aiml",
    "ai & ml": "cse_aiml",
    "cse aiml": "cse_aiml",
    "mathematics": "mathematics",
    "maths": "mathematics",
    "basic sciences": "mathematics",
    "basic_sciences": "mathematics",
}

# Generic lab references intentionally remain ambiguous when a department has
# multiple mapped labs. A room name/code in the same utterance still wins through
# the canonical map scorer.
_DEPT_LAB_ROOMS: dict[str, tuple[str, ...]] = {
    "cse": ("C-101", "C-102", "C-103", "C-104"),
    "ise": ("C-001", "C-002", "C-206"),
    "ece": ("A-109", "A-110", "A-111", "A-112", "A-113", "A-114"),
    "cse_ds": ("B-217", "C-202"),
    "cse_aiml": ("B-110", "B-218", "C-201", "C-203"),
    "mechanical": ("B-210",),
    "civil": ("B-210",),
}

_AMBIGUOUS_GAP = 18.0
_MIN_RESOLVED = 40.0

_LOCALIZED_FLOORS: dict[str, dict[str, str]] = {
    "English": {"GF": "Ground Floor", "FF": "First Floor", "SF": "Second Floor"},
    "Kannada": {"GF": "ನೆಲ ಮಹಡಿ", "FF": "ಮೊದಲ ಮಹಡಿ", "SF": "ಎರಡನೇ ಮಹಡಿ"},
    "Hindi": {"GF": "भूतल", "FF": "पहली मंजिल", "SF": "दूसरी मंजिल"},
    "Telugu": {"GF": "గ్రౌండ్ ఫ్లోర్", "FF": "మొదటి అంతస్తు", "SF": "రెండవ అంతస్తు"},
    "Tamil": {"GF": "தரைத்தளம்", "FF": "முதல் தளம்", "SF": "இரண்டாம் தளம்"},
    "Malayalam": {"GF": "താഴത്തെ നില", "FF": "ഒന്നാം നില", "SF": "രണ്ടാം നില"},
}


@dataclass(frozen=True)
class CampusNavigationResolution:
    """Result of deterministic campus navigation understanding."""

    status: str  # not_navigation | resolved | ambiguous | unknown
    room: dict[str, Any] | None = None
    candidates: tuple[dict[str, Any], ...] = ()
    evidence: str = "none"
    score: float = 0.0

    @property
    def is_navigation(self) -> bool:
        return self.status in {"resolved", "ambiguous", "unknown"}


def is_college_address_query(text: str | None) -> bool:
    folded = casefold_keep_scripts(text or "")
    if not folded.strip():
        return False
    return any(cue in folded for cue in _COLLEGE_ADDRESS_CUES)


def text_has_campus_navigation_cue(text: str | None) -> bool:
    """True when the utterance asks for on-campus directions / location of a place."""
    if not text or not isinstance(text, str):
        return False
    folded = casefold_keep_scripts(text)
    if not folded.strip():
        return False
    if is_college_address_query(folded):
        # Pure college-address questions are not room navigation.
        # Exception: also naming a room ("where is the college library") still navigates.
        roomish = match_campus_transcript(text)
        if not roomish.get("matched"):
            return False
    # Shared purpose-tagged vocabulary: short Latin transliterations must obey
    # token boundaries so e.g. ``elli`` cannot match inside an unrelated word.
    for entry in entries_for(category="NAVIGATION_INTENT"):
        cue = casefold_keep_scripts(entry.variant)
        if not cue:
            continue
        start = 0
        while True:
            idx = folded.find(cue, start)
            if idx < 0:
                break
            end = idx + len(cue)
            if any(ord(ch) > 127 for ch in cue) or latin_token_boundaries_ok(folded, idx, end):
                # A bare multilingual "show" verb is shared with cards and
                # department overviews. Treat it as navigation only when the
                # utterance also contains a strong canonical campus-place match.
                if entry.reason.endswith("_show"):
                    hit = match_campus_transcript(text)
                    room = hit.get("room") if isinstance(hit, dict) else None
                    if not hit.get("matched") or float(hit.get("score") or 0.0) < 200.0:
                        start = idx + 1
                        continue
                    if str((room or {}).get("category") or "").casefold() == "hod":
                        target = normalize_campus_destination_text(text)
                        if not any(token in target.split() for token in ("room", "office", "cabin", "chamber")):
                            start = idx + 1
                            continue
                return True
            start = idx + 1
    return False


def _has_semantic_variant(text: str, *, category: str, canonical: str | None = None) -> bool:
    folded = casefold_keep_scripts(text)
    for entry in entries_for(category=category, canonical=canonical):
        cue = casefold_keep_scripts(entry.variant)
        if not cue:
            continue
        idx = folded.find(cue)
        while idx >= 0:
            end = idx + len(cue)
            if any(ord(ch) > 127 for ch in cue) or latin_token_boundaries_ok(folded, idx, end):
                return True
            idx = folded.find(cue, idx + 1)
    return False


def _rooms_for_codes(codes: tuple[str, ...]) -> tuple[dict[str, Any], ...]:
    rooms: list[dict[str, Any]] = []
    for code in codes:
        room = get_campus_room_by_code(code)
        if room is not None:
            rooms.append(room)
    return tuple(rooms)


_GENERIC_PLACE_TOKENS = frozenset(
    {
        "faculty",
        "staff",
        "washroom",
        "toilet",
        "restroom",
        "bathroom",
        "lab",
        "laboratory",
        "classroom",
        "class",
        "room",
        "office",
        "hall",
        "chamber",
        "cabin",
        "hod",
    }
)
_GENERIC_STOPWORDS = frozenset({"the", "a", "an", "of", "and", "to", "for", "in", "on", "at"})


def _generic_place_ambiguity(canonical_text: str) -> CampusNavigationResolution | None:
    """If the destination is only generic place words, return multi-room ambiguity."""
    toks = {t for t in re.split(r"\s+", (canonical_text or "").strip().lower()) if t}
    if not toks:
        return None
    # Room codes are never generic-only.
    if any(re.match(r"^[a-z]+-\w+$", t) or re.match(r"^[a-z]\d{2,}$", t) for t in toks):
        return None
    content = toks - _GENERIC_STOPWORDS
    if not content or not content <= _GENERIC_PLACE_TOKENS:
        return None

    # Prefer the most specific generic cue for filtering room names.
    priority = (
        "washroom",
        "toilet",
        "restroom",
        "bathroom",
        "faculty",
        "staff",
        "hod",
        "lab",
        "laboratory",
        "classroom",
        "office",
        "hall",
        "chamber",
        "cabin",
        "room",
    )
    needle = next((p for p in priority if p in content), None)
    if not needle:
        return None
    aliases = {
        "laboratory": "lab",
        "toilet": "washroom",
        "restroom": "washroom",
        "bathroom": "washroom",
        "classroom": "class",
    }
    needle = aliases.get(needle, needle)
    matches: list[dict[str, Any]] = []
    dest = re.sub(r"\s+", " ", (canonical_text or "").strip().lower())
    for room in get_campus_rooms():
        name = str(room.get("name") or "").casefold()
        type_ = str(room.get("type") or "").casefold()
        if needle in name or needle in type_ or (needle == "lab" and "laboratory" in name):
            matches.append(dict(room))
    # Prefer the exact generic label (e.g. room named \"Faculty Room\") first.
    matches.sort(
        key=lambda room: 0
        if re.sub(r"\s+", " ", str(room.get("name") or "").strip().lower()) == dest
        else 1
    )
    if len(matches) >= 2:
        logger.info(
            "NAVIGATION_INTENT status=ambiguous evidence=generic_place needle=%s count=%s",
            needle,
            len(matches),
        )
        return CampusNavigationResolution(
            status="ambiguous",
            room=None,
            candidates=tuple(matches[:8]),
            evidence="generic_place_ambiguous",
            score=50.0,
        )
    if len(matches) == 1:
        return CampusNavigationResolution(
            status="resolved",
            room=matches[0],
            candidates=(matches[0],),
            evidence="generic_place_unique",
            score=50.0,
        )
    return CampusNavigationResolution(status="unknown", evidence="generic_place_no_match")


def _normalize_dept_key(raw: str | None) -> str | None:
    if not raw:
        return None
    s = casefold_keep_scripts(str(raw)).strip().replace("-", "_").replace(" ", "_")
    compact = s.replace("_", " ").strip()
    if s in _DEPT_HOD_ROOM:
        return s
    if compact in _DEPT_LABEL_TO_KEY:
        return _DEPT_LABEL_TO_KEY[compact]
    for label, key in _DEPT_LABEL_TO_KEY.items():
        if label in compact:
            return key
    return s if s in _DEPT_HOD_ROOM else None


def _hod_room_from_context(
    text: str,
    context_department_keys: tuple[str, ...] | None,
) -> dict[str, Any] | None:
    has_hod = _has_semantic_variant(text, category="TOPIC", canonical="hod") or _has_semantic_variant(
        text, category="CAMPUS_TERM", canonical="hod"
    )
    if not has_hod:
        return None
    # An explicit latest department is resolved before context in the caller.
    if match_department_keys_exclusive(text):
        return None
    keys = tuple(context_department_keys or ())
    if len(keys) != 1:
        return None
    dept = _normalize_dept_key(keys[0])
    if not dept:
        return None
    code = _DEPT_HOD_ROOM.get(dept)
    if not code:
        return None
    return get_campus_room_by_code(code)


def resolve_campus_navigation(
    text: str | None,
    *,
    context_department_keys: tuple[str, ...] | None = None,
) -> CampusNavigationResolution:
    """
    Resolve campus navigation for one utterance.

    Priority:
      1. Explicit destination tokens in the latest utterance (via map match)
      2. Contextual HOD-room follow-up when utterance is bare HOD-room + session dept
      3. Ambiguity / unknown when nav cue present but destination not unique / missing
    """
    raw = (text or "").strip()
    if not raw:
        return CampusNavigationResolution(status="not_navigation", evidence="empty")

    if not text_has_campus_navigation_cue(raw):
        return CampusNavigationResolution(status="not_navigation", evidence="no_nav_cue")

    if is_college_address_query(raw):
        # Only divert to room nav when a concrete campus room also matches strongly.
        hit = match_campus_transcript(raw)
        if not hit.get("matched") or float(hit.get("score") or 0) < 100:
            return CampusNavigationResolution(status="not_navigation", evidence="college_address")

    explicit_departments = match_department_keys_exclusive(raw)
    has_hod = _has_semantic_variant(raw, category="TOPIC", canonical="hod") or _has_semantic_variant(
        raw, category="CAMPUS_TERM", canonical="hod"
    )
    if len(explicit_departments) == 1 and has_hod:
        dept = _normalize_dept_key(explicit_departments[0])
        room = get_campus_room_by_code(_DEPT_HOD_ROOM.get(dept or "", ""))
        if room is not None:
            return CampusNavigationResolution(
                status="resolved",
                room=room,
                candidates=(room,),
                evidence="explicit_department_hod_room",
                score=240.0,
            )

    # Contextual HOD room before ranked search when utterance does not name a lab/place.
    contextual = _hod_room_from_context(raw, context_department_keys)
    if contextual is not None:
        logger.info(
            "NAVIGATION_INTENT status=resolved evidence=contextual_hod room=%s",
            contextual.get("code"),
        )
        return CampusNavigationResolution(
            status="resolved",
            room=contextual,
            candidates=(contextual,),
            evidence="contextual_hod_room",
            score=200.0,
        )

    ranked = match_campus_transcript_ranked(raw)

    canonical_text = normalize_campus_destination_text(raw)
    has_lab = bool(re.search(r"(?<!\w)lab(?!\w)", canonical_text))
    top_score_for_specificity = float(ranked[0].get("score") or 0.0) if ranked else 0.0
    if len(explicit_departments) == 1 and has_lab and top_score_for_specificity < 300.0:
        codes = _DEPT_LAB_ROOMS.get(explicit_departments[0], ())
        rooms = _rooms_for_codes(codes)
        if len(rooms) == 1:
            return CampusNavigationResolution(
                status="resolved",
                room=rooms[0],
                candidates=rooms,
                evidence="explicit_department_lab",
                score=220.0,
            )
        if len(rooms) > 1:
            return CampusNavigationResolution(
                status="ambiguous",
                candidates=rooms,
                evidence="department_has_multiple_labs",
                score=220.0,
            )

    # Bare generic place types without a department/code must not pick one room.
    destination_only = _strip_question_framing(canonical_text)
    generic_ambiguous = _generic_place_ambiguity(destination_only)
    if generic_ambiguous is not None:
        return generic_ambiguous

    if not ranked:
        logger.info("NAVIGATION_INTENT status=unknown evidence=no_room_match")
        return CampusNavigationResolution(status="unknown", evidence="no_room_match")

    top = ranked[0]
    top_score = float(top.get("score") or 0.0)
    top_room = top.get("matched_room")
    if top_score < _MIN_RESOLVED or not top_room:
        logger.info("NAVIGATION_INTENT status=unknown evidence=low_score score=%s", top_score)
        return CampusNavigationResolution(
            status="unknown",
            evidence="low_score",
            score=top_score,
        )

    # Ambiguity: second candidate close in score with a different room code.
    if len(ranked) >= 2:
        second = ranked[1]
        second_score = float(second.get("score") or 0.0)
        second_room = second.get("matched_room") or {}
        top_identity = (
            str(top_room.get("code") or ""),
            str(top_room.get("floor_id") or ""),
        )
        second_identity = (
            str(second_room.get("code") or ""),
            str(second_room.get("floor_id") or ""),
        )
        if (
            second_score >= _MIN_RESOLVED
            and (top_score - second_score) < _AMBIGUOUS_GAP
            and second_identity != top_identity
        ):
            cands = tuple(
                r["matched_room"]
                for r in ranked[:4]
                if r.get("matched_room") and float(r.get("score") or 0) >= _MIN_RESOLVED
            )
            # Identical display names that are truly alternate instances (e.g. CSE Lab ×4)
            names = {str(c.get("name") or "").strip().lower() for c in cands}
            if len(cands) > 1 and (len(names) == 1 or (top_score - second_score) < _AMBIGUOUS_GAP):
                logger.info(
                    "NAVIGATION_INTENT status=ambiguous evidence=close_scores top=%s second=%s",
                    top_room.get("code"),
                    second_room.get("code"),
                )
                return CampusNavigationResolution(
                    status="ambiguous",
                    room=None,
                    candidates=cands,
                    evidence="close_scores",
                    score=top_score,
                )

    logger.info(
        "DESTINATION_RESOLVED code=%s floor=%s score=%s",
        top_room.get("code"),
        top_room.get("floor_id"),
        top_score,
    )
    return CampusNavigationResolution(
        status="resolved",
        room=top_room,
        candidates=(top_room,),
        evidence="map_match",
        score=top_score,
    )


def campus_navigation_spoken_prompt(
    language_name: str | None,
    room: dict[str, Any] | None,
    *,
    status: str = "resolved",
    candidates: tuple[dict[str, Any], ...] = (),
) -> str:
    """Session-language spoken line for navigation / clarification / unknown."""
    lang = (language_name or "English").strip() or "English"
    name = ""
    floor = ""
    if room:
        name = str(room.get("name") or room.get("code") or "").strip()
        floor_id = str(room.get("floor_id") or "").strip().upper()
        floor = _LOCALIZED_FLOORS.get(lang, _LOCALIZED_FLOORS["English"]).get(
            floor_id,
            str(room.get("floor_name") or room.get("floor_id") or "").strip(),
        )

    if status == "ambiguous":
        labels = []
        for c in candidates[:4]:
            label = str(c.get("name") or c.get("code") or "").strip()
            if label and label not in labels:
                labels.append(label)
        joined = ", ".join(labels) if labels else "one of the campus rooms"
        prompts = {
            "English": f"Which place do you mean — {joined}?",
            "Kannada": f"ಯಾವ ಸ್ಥಳ ಬೇಕು — {joined}?",
            "Hindi": f"आप किस जगह की बात कर रहे हैं — {joined}?",
            "Tamil": f"எந்த இடம் வேண்டும் — {joined}?",
            "Telugu": f"ఏ స్థలం కావాలి — {joined}?",
            "Malayalam": f"ഏത് സ്ഥലമാണ് വേണ്ടത് — {joined}?",
        }
        return prompts.get(lang, prompts["English"])

    if status == "unknown" or not name:
        prompts = {
            "English": "I could not find that place on the campus map. Please try a room name or room code.",
            "Kannada": "ಆ ಸ್ಥಳವನ್ನು ಕ್ಯಾಂಪಸ್ ನಕ್ಷೆಯಲ್ಲಿ ಹುಡುಕಲಾಗಲಿಲ್ಲ. ದಯವಿಟ್ಟು ಕೊಠಡಿ ಹೆಸರು ಅಥವಾ ಕೋಡ್ ಹೇಳಿ.",
            "Hindi": "वह स्थान कैंपस नक्शे पर नहीं मिला। कृपया कमरे का नाम या कोड बताएं।",
            "Tamil": "அந்த இடம் வளாக வரைபடத்தில் இல்லை. அறை பெயர் அல்லது குறியீட்டைச் சொல்லுங்கள்.",
            "Telugu": "ఆ స్థలం క్యాంపస్ మ్యాప్‌లో కనబడలేదు. గది పేరు లేదా కోడ్ చెప్పండి.",
            "Malayalam": "ആ സ്ഥലം കാമ്പസ് മാപ്പിൽ കണ്ടെത്താനായില്ല. മുറിയുടെ പേരോ കോഡോ പറയൂ.",
        }
        return prompts.get(lang, prompts["English"])

    prompts = {
        "English": f"Showing directions to {name}" + (f" on the {floor}." if floor else "."),
        "Kannada": f"{name}ಗೆ ದಾರಿ ತೋರಿಸುತ್ತಿದ್ದೇನೆ" + (f" — {floor}." if floor else "."),
        "Hindi": f"{name} का रास्ता दिखा रही हूँ" + (f" — {floor}." if floor else "."),
        "Tamil": f"{name} நோக்கி வழிகாட்டுகிறேன்" + (f" — {floor}." if floor else "."),
        "Telugu": f"{name}కి దారి చూపిస్తున్నాను" + (f" — {floor}." if floor else "."),
        "Malayalam": f"{name} ലേക്കുള്ള വഴി കാണിക്കുന്നു" + (f" — {floor}." if floor else "."),
    }
    return prompts.get(lang, prompts["English"])
