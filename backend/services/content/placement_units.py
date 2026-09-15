"""College-wide Placement ContentUnits (4-card deck).

Canonical units:
  placement.introduction → placement.head → placement.companies → placement.analytics
"""

from __future__ import annotations

from dataclasses import dataclass

from backend.services.content.semantic_composition import SemanticItem
from backend.services.content.unicode_text import casefold_keep_scripts, latin_token_boundaries_ok

PLACEMENT_ENTITY = "placement"

PLACEMENT_TOPICS: tuple[str, ...] = (
    "introduction",
    "head",
    "companies",
    "analytics",
)

PLACEMENT_UNIT_IDS: tuple[str, ...] = tuple(f"placement.{t}" for t in PLACEMENT_TOPICS)

PLACEMENT_DECK_UNIT_IDS: tuple[str, ...] = (
    "placement.introduction",
    "placement.head",
    "placement.companies",
    "placement.analytics",
)

# Legacy global id — selector expands this to the deck.
LEGACY_COLLEGE_PLACEMENTS_UNIT = "college.placements"


def is_placement_unit_id(unit_id: str) -> bool:
    return (unit_id or "").strip().lower() in set(PLACEMENT_UNIT_IDS)


def is_placement_introduction_unit_id(unit_id: str) -> bool:
    uid = (unit_id or "").strip().lower()
    return uid in {"placement.introduction", LEGACY_COLLEGE_PLACEMENTS_UNIT}


def placement_deck_unit_ids() -> tuple[str, ...]:
    return PLACEMENT_DECK_UNIT_IDS


def is_placement_entity(entity: str) -> bool:
    return (entity or "").strip().lower() == PLACEMENT_ENTITY


@dataclass(frozen=True)
class PlacementSpan:
    topic: str
    start: int
    end: int


_HEAD_CUES: tuple[str, ...] = (
    "head of placement",
    "placement head",
    "placement officer",
    "training and placement officer",
    "tpo",
    "prof. anand kumar",
    "prof anand kumar",
    "anand kumar v",
    "anand kumar",
    "प्लेसमेंट प्रमुख",
    "प्लेसमेंट हेड",
    "ಪ್ಲೇಸ್‌ಮೆಂಟ್ ಹೆಡ್",
    "பிளேஸ்மென்ட் தலைவர்",
    "ప్లేస్‌మెంట్ హెడ్",
    "പ്ലേസ്‌മെന്റ് ഹെഡ്",
)

_COMPANY_CUES: tuple[str, ...] = (
    "companies visiting campus",
    "companies that visit",
    "companies visit our campus",
    "placement companies",
    "campus recruiters",
    "recruiting companies",
    "which companies visit",
    "show me placement companies",
    "companies visiting",
    "कंपनी जो कैम्पस आती",
    "कैंपस आने वाली कंपनी",
    "ಕಂಪನಿಗಳು",
    "நிறுவனங்கள்",
    "కంపెనీలు",
    "കമ്പനികൾ",
)

_ANALYTICS_CUES: tuple[str, ...] = (
    "placement analytics",
    "placement statistics",
    "placement stats",
    "year-wise statistics",
    "year wise statistics",
    "placement percentage",
    "show me placement analytics",
    "show me placement statistics",
    "प्लेसमेंट आंकड़े",
    "प्लेसमेंट स्टैटिस्टिक्स",
    "ಪ್ಲೇಸ್‌ಮೆಂಟ್ ಅಂಕಿಅಂಶ",
    "பிளேஸ்மென்ட் புள்ளிவிவரம்",
    "ప్లేస్‌మెంట్ గణాంకాలు",
    "പ്ലേസ്‌മെന്റ് സ്ഥിതിവിവരം",
)

_INTRO_CUES: tuple[str, ...] = (
    "placement and career development",
    "placement department",
    "placement cell",
    "placement office",
    "placement training",
    "campus placements",
    "placement opportunities",
    "tell me about placements",
    "tell me about the placement",
    "tell me about placement",
    "what does the placement department do",
    "placements",
    "placement",
    "प्लेसमेंट",
    "नियुक्ति सहायता",
    "ಪ್ಲೇಸ್‌ಮೆಂಟ್",
    "ಪ್ಲೇಸ್ಮೆಂಟ್",
    "ಉದ್ಯೋಗಾವಕಾಶ",
    "பிளேஸ்மென்ட்",
    "வேலைவாய்ப்பு",
    "ప్లేస్‌మెంట్",
    "ప్లేస్మెంట్",
    "പ്ലേസ്‌മെന്റ്",
    "പ്ലേസ്മെന്റ്",
)


def _find_cue(hay: str, cue: str) -> tuple[int, int] | None:
    folded = casefold_keep_scripts(cue)
    if not folded:
        return None
    start = hay.find(folded)
    if start < 0:
        return None
    if folded.isascii() and not latin_token_boundaries_ok(hay, start, start + len(folded)):
        return None
    return start, start + len(folded)


def detect_placement_spans(raw_text: str) -> tuple[PlacementSpan, ...]:
    hay = casefold_keep_scripts(raw_text or "")
    if not hay:
        return ()

    for cue in sorted(_HEAD_CUES, key=len, reverse=True):
        hit = _find_cue(hay, cue)
        if hit:
            return (PlacementSpan("head", hit[0], hit[1]),)

    for cue in sorted(_COMPANY_CUES, key=len, reverse=True):
        hit = _find_cue(hay, cue)
        if hit:
            return (PlacementSpan("companies", hit[0], hit[1]),)

    for cue in sorted(_ANALYTICS_CUES, key=len, reverse=True):
        hit = _find_cue(hay, cue)
        if hit:
            return (PlacementSpan("analytics", hit[0], hit[1]),)

    for cue in sorted(_INTRO_CUES, key=len, reverse=True):
        hit = _find_cue(hay, cue)
        if hit:
            return (PlacementSpan("introduction", hit[0], hit[1]),)

    return ()


def placement_items_from_text(raw_text: str) -> tuple[SemanticItem, ...]:
    return tuple(
        SemanticItem(entity=PLACEMENT_ENTITY, topic=span.topic)
        for span in detect_placement_spans(raw_text)
    )


def unit_id_for_placement_item(entity: str, topic: str) -> str | None:
    if not is_placement_entity(entity):
        return None
    top = (topic or "").strip().lower()
    if top in {"", "overview", "placements", "placement"}:
        top = "introduction"
    if top not in PLACEMENT_TOPICS:
        return None
    return f"placement.{top}"
