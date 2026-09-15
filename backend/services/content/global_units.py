"""Language-independent global ContentUnit identities and cue spans."""

from __future__ import annotations

from dataclasses import dataclass

from backend.services.content.semantic_composition import SemanticItem
from backend.services.content.unicode_text import casefold_keep_scripts

GLOBAL_ENTITY = "college"
TOPIC_LOCATION = "location"
TOPIC_PLACEMENTS = "placements"
TOPIC_ADMISSIONS = "admissions"
UNIT_LOCATION = "college.location"
UNIT_PLACEMENTS = "college.placements"
UNIT_ADMISSIONS = "college.admissions"

_LOCATION_CUES = (
    "where is the college",
    "where is svit",
    "college location",
    "college address",
    "location",
    "कॉलेज कहाँ स्थित",
    "कॉलेज कहां स्थित",
    "कॉलेज कहाँ",
    "कॉलेज कहां",
    "कॉलेज का पता",
    "కాలేజీ ఎక్కడ",
    "കോളേജ് എവിടെയാണ്",
)

_GLOBAL_TOPIC_CUES: tuple[tuple[str, tuple[str, ...]], ...] = (
    (
        TOPIC_PLACEMENTS,
        (
            "placements",
            "placement information",
            "placement",
            "प्लेसमेंट",
            "नियुक्ति सहायता",
            "ಪ್ಲೇಸ್‌ಮೆಂಟ್",
            "ಪ್ಲೇಸ್ಮೆಂಟ್",
            "பிளேஸ்மென்ட்",
            "வேலைவாய்ப்பு",
            "ప్లేస్‌మెంట్",
            "പ്ലേസ്‌മെന്റ്",
            "പ്ലേസ്മെന്റ്",
        ),
    ),
    (
        TOPIC_ADMISSIONS,
        (
            "admission details",
            "admissions",
            "admission",
            "admit",
            # Romanized native / code-switch (controlled stems — not a second parser)
            "pravesh",
            "pravesha",
            "pravēś",
            "प्रवेश की जानकारी",
            "प्रवेश",
            "एडमिशन",
            "एड्मिशन",
            "ಪ್ರವೇಶ",
            "ಅಡ್ಮಿಷನ್",
            "ಆಡ್ಮಿಷನ್",
            "சேர்க்கை",
            "அட்மிஷன்",
            "అడ్మిషన్",
            "ప్రవేశ",
            "ప్రవేశాల",
            "ప్రవేశాల వివరాలు",
            # Malayalam: chillu-N form + agglutinated stem (അഡ്മിഷനെക്കുറിച്ച്)
            "അഡ്മിഷൻ",
            "അഡ്മിഷന",
            "പ്രവേശന",
            "പ്രവേശന വിവരങ്ങൾ",
        ),
    ),
)


@dataclass(frozen=True)
class GlobalSpan:
    topic: str
    start: int
    end: int


def is_global_entity(entity: str) -> bool:
    return (entity or "").strip().lower() == GLOBAL_ENTITY


def unit_id_for_global_item(entity: str, topic: str) -> str | None:
    if is_global_entity(entity) and (topic or "").strip().lower() == TOPIC_LOCATION:
        return UNIT_LOCATION
    if is_global_entity(entity) and (topic or "").strip().lower() == TOPIC_PLACEMENTS:
        return UNIT_PLACEMENTS
    if is_global_entity(entity) and (topic or "").strip().lower() == TOPIC_ADMISSIONS:
        return UNIT_ADMISSIONS
    return None


def detect_global_spans(raw_text: str) -> tuple[GlobalSpan, ...]:
    hay = casefold_keep_scripts(raw_text or "")
    if not hay:
        return ()
    matches: list[GlobalSpan] = []
    for cue in sorted(_LOCATION_CUES, key=len, reverse=True):
        folded = casefold_keep_scripts(cue)
        start = hay.find(folded)
        if start >= 0:
            matches.append(GlobalSpan(TOPIC_LOCATION, start, start + len(folded)))
            break
    for topic, cues in _GLOBAL_TOPIC_CUES:
        for cue in sorted(cues, key=len, reverse=True):
            folded = casefold_keep_scripts(cue)
            start = hay.find(folded)
            if start >= 0:
                matches.append(GlobalSpan(topic, start, start + len(folded)))
                break
    matches.sort(key=lambda span: span.start)
    return tuple(matches)


def global_items_from_text(raw_text: str) -> tuple[SemanticItem, ...]:
    return tuple(
        SemanticItem(entity=GLOBAL_ENTITY, topic=span.topic)
        for span in detect_global_spans(raw_text)
    )
