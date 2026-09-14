"""Deterministic visual structure for successful non-card answers.

The authoritative answer is accepted as input and is never rewritten.  This module
only partitions exact substrings for kiosk presentation; specialized card surfaces
remain owned by the existing presentation resolver.
"""

from __future__ import annotations

import re
from typing import Any

ANSWER_PRESENTATION_TYPES = frozenset(
    {"INFO_CARD", "STEP_CARD", "LIST_CARD", "STATS_CARD", "CHOICE_CARD", "GENERIC_ANSWER_CARD"}
)

_LABELS: dict[str, dict[str, str]] = {
    "en": {"INFO_CARD": "Information", "STEP_CARD": "Steps", "LIST_CARD": "Key points", "STATS_CARD": "Highlights", "CHOICE_CARD": "Choose an option", "GENERIC_ANSWER_CARD": "Answer"},
    "kn": {"INFO_CARD": "ಮಾಹಿತಿ", "STEP_CARD": "ಹಂತಗಳು", "LIST_CARD": "ಮುಖ್ಯ ಅಂಶಗಳು", "STATS_CARD": "ಮುಖ್ಯಾಂಶಗಳು", "CHOICE_CARD": "ಒಂದು ಆಯ್ಕೆ ಮಾಡಿ", "GENERIC_ANSWER_CARD": "ಉತ್ತರ"},
    "hi": {"INFO_CARD": "जानकारी", "STEP_CARD": "चरण", "LIST_CARD": "मुख्य बिंदु", "STATS_CARD": "मुख्य तथ्य", "CHOICE_CARD": "एक विकल्प चुनें", "GENERIC_ANSWER_CARD": "उत्तर"},
    "te": {"INFO_CARD": "సమాచారం", "STEP_CARD": "దశలు", "LIST_CARD": "ముఖ్య అంశాలు", "STATS_CARD": "ముఖ్యాంశాలు", "CHOICE_CARD": "ఒక ఎంపికను ఎంచుకోండి", "GENERIC_ANSWER_CARD": "సమాధానం"},
    "ta": {"INFO_CARD": "தகவல்", "STEP_CARD": "படிகள்", "LIST_CARD": "முக்கிய குறிப்புகள்", "STATS_CARD": "சிறப்பம்சங்கள்", "CHOICE_CARD": "ஒரு விருப்பத்தைத் தேர்ந்தெடுக்கவும்", "GENERIC_ANSWER_CARD": "பதில்"},
    "ml": {"INFO_CARD": "വിവരം", "STEP_CARD": "ഘട്ടങ്ങൾ", "LIST_CARD": "പ്രധാന കാര്യങ്ങൾ", "STATS_CARD": "പ്രധാന വിവരങ്ങൾ", "CHOICE_CARD": "ഒരു ഓപ്ഷൻ തിരഞ്ഞെടുക്കുക", "GENERIC_ANSWER_CARD": "ഉത്തരം"},
}

_LIST_LINE = re.compile(r"^\s*(?:[-•*]|\d+[.)])\s+(.+?)\s*$")
_NUMBERED_LINE = re.compile(r"^\s*\d+[.)]\s+(.+?)\s*$")
_NUMBER_FACT = re.compile(r"(?<!\w)\d[\d,.]*(?:\s*%|\s+[A-Za-z]+)?")


def _structured_lines(text: str) -> tuple[list[str], bool]:
    points: list[str] = []
    numbered = True
    for line in text.splitlines():
        match = _LIST_LINE.match(line)
        if not match:
            continue
        value = match.group(1).strip()
        if value:
            points.append(value)
            numbered = numbered and bool(_NUMBERED_LINE.match(line))
    return points[:8], numbered and bool(points)


def _sentences(text: str) -> list[str]:
    return [part.strip() for part in re.split(r"(?<=[.!?।])\s+", text) if part.strip()]


def build_answer_presentation(
    authoritative_text: str,
    *,
    language_code: str = "en",
    response_type: str = "answer",
    explicit_choices: list[str] | tuple[str, ...] | None = None,
) -> dict[str, Any] | None:
    """Return a validated visual model containing only source text or exact choices."""
    text = str(authoritative_text or "").strip()
    if not text:
        return None

    points, numbered = _structured_lines(text)
    choices = [str(choice).strip() for choice in (explicit_choices or ()) if str(choice).strip()]
    if response_type == "clarification" and not choices:
        # A clarification may expose only options that are already literal list items.
        choices = list(points)
    if response_type == "clarification" and len(choices) >= 2:
        kind = "CHOICE_CARD"
    elif len(points) >= 2 and numbered:
        kind = "STEP_CARD"
    elif len(points) >= 2:
        kind = "LIST_CARD"
    elif len(_NUMBER_FACT.findall(text)) >= 2 and len(text) <= 420:
        kind = "STATS_CARD"
    elif len(_sentences(text)) >= 2:
        kind = "INFO_CARD"
    else:
        kind = "GENERIC_ANSWER_CARD"

    code = language_code if language_code in _LABELS else "en"
    model: dict[str, Any] = {
        "schemaVersion": 1,
        "type": kind,
        "eyebrow": "CLARA",
        "title": _LABELS[code][kind],
        "summary": text,
        "points": points,
        "highlights": [],
        "choices": choices[:6] if kind == "CHOICE_CARD" else [],
    }
    if kind == "STATS_CARD":
        model["highlights"] = _sentences(text)[:4]
    elif kind == "INFO_CARD" and not points:
        # Preserve every sentence verbatim while avoiding a kiosk-sized paragraph.
        model["points"] = _sentences(text)
    return model


def validate_answer_presentation(model: Any, authoritative_text: str) -> bool:
    """Fail closed if free-form fields contain content absent from the answer."""
    if not isinstance(model, dict) or model.get("type") not in ANSWER_PRESENTATION_TYPES:
        return False
    source = str(authoritative_text or "").strip()
    if not source or model.get("summary") != source:
        return False
    for field in ("points", "highlights"):
        values = model.get(field, [])
        if not isinstance(values, list) or any(not isinstance(value, str) or value not in source for value in values):
            return False
    choices = model.get("choices", [])
    return isinstance(choices, list) and all(isinstance(choice, str) and bool(choice.strip()) for choice in choices)


def is_successful_visual_response(
    resolution: Any,
    authoritative_text: str,
    *,
    intentional_plain: bool = False,
) -> bool:
    """Positive-default eligibility with a short explicit exclusion list."""
    if intentional_plain or not str(authoritative_text or "").strip():
        return False
    if (
        getattr(resolution, "show_card", None)
        or getattr(resolution, "card_surface", None)
        or getattr(resolution, "presentation_bundle", None)
        or getattr(resolution, "campus_destination", None)
    ):
        return False
    if str(getattr(resolution, "response_mode", "") or "") == "FALLBACK":
        return False
    if str(getattr(resolution, "response_type", "") or "") in {
        "retry",
        "unknown",
        "direct",
        "deterministic_fallback",
    }:
        return False
    return True


def enrich_successful_answer_message(
    message: dict[str, Any],
    *,
    resolution: Any,
    authoritative_text: str,
    language_code: str,
    intentional_plain: bool = False,
) -> dict[str, Any] | None:
    """Attach the universal visual contract at a common assistant-message boundary."""
    if not is_successful_visual_response(
        resolution,
        authoritative_text,
        intentional_plain=intentional_plain,
    ):
        return None

    candidate = build_answer_presentation(
        authoritative_text,
        language_code=language_code,
        response_type=str(getattr(resolution, "response_type", "answer") or "answer"),
        explicit_choices=list(getattr(resolution, "choice_options", ()) or ()),
    )
    if candidate is None or not validate_answer_presentation(candidate, authoritative_text):
        text = str(authoritative_text or "").strip()
        if not text:
            return None
        code = language_code if language_code in _LABELS else "en"
        candidate = {
            "schemaVersion": 1,
            "type": "GENERIC_ANSWER_CARD",
            "eyebrow": "CLARA",
            "title": _LABELS[code]["GENERIC_ANSWER_CARD"],
            "summary": text,
            "points": [],
            "highlights": [],
            "choices": [],
        }

    message["visualResponseEligible"] = True
    message["answerPresentation"] = candidate
    return candidate
