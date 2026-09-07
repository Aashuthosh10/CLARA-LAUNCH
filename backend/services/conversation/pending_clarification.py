"""Pending clarification state — binds a follow-up answer to the original ask."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from backend.services.content.semantic_topics import cue_in_hay
from backend.services.content.unicode_text import casefold_keep_scripts

# Script-safe cues (Indic substring / Latin word-safe via cue_in_hay).
_DOCUMENTS_CUES: tuple[str, ...] = (
    "documents",
    "document",
    "docs",
    "doc",
    "papers",
    "certificates",
    "ದಾಖಲೆ",
    "ದಾಖಲೆಗಳು",
    "दस्तावेज",
    "दस्तावेज़",
    "ஆவண",
    "ஆவணங்கள்",
    "పత్ర",
    "పత్రాలు",
    "డాక్యుమెంట్",
    "രേഖ",
    "രേഖകൾ",
)
_ELIGIBILITY_CUES: tuple[str, ...] = (
    "eligibility",
    "eligible",
    "criteria",
    "cutoff",
    "cut-off",
    "cut off",
    "ಅರ್ಹತೆ",
    "पात्रता",
    "தகுதி",
    "అర్హత",
    "യോഗ്യത",
)
_STEPS_CUES: tuple[str, ...] = (
    "steps",
    "step",
    "process",
    "procedure",
    "how to apply",
    "application process",
    "ಪ್ರಕ್ರಿಯೆ",
    "ಹಂತ",
    "प्रक्रिया",
    "செயல்முறை",
    "படிகள்",
    "ప్రక్రియ",
    "దశలు",
    "പ്രക്രിയ",
    "ഘട്ടങ്ങൾ",
)
_FEES_CUES: tuple[str, ...] = (
    "fee",
    "fees",
    "tuition",
    "ಶುಲ್ಕ",
    "फीस",
    "கட்டணம்",
    "ఫీజు",
    "ഫീസ്",
)
_DATES_CUES: tuple[str, ...] = (
    "dates",
    "date",
    "deadline",
    "last date",
    "schedule",
    "timeline",
)
_OFFICE_CUES: tuple[str, ...] = (
    "office",
    "admission block",
    "where to go",
    "counter",
    "ಆಫೀಸ್",
    "ಬ್ಲಾಕ್",
    "ऑफिस",
    "अலுवலக",
    "அலுவலக",
    "ఆఫీస్",
    "ഓഫീസ്",
)
_NEW_TOPIC_CUES: tuple[str, ...] = (
    "bus",
    "buses",
    "transport",
    "principal",
    "hod",
    "placement",
    "placements",
    "hostel",
    "canteen",
    "trustee",
    "actually",
    "instead",
    "ಬಸ್",
    "ಪ್ರಿನ್ಸಿಪಾಲ್",
    "ಪ್ಲೇಸ್",
    "प्रिंसिपल",
    "बस",
    "பேருந்து",
    "முதல்வர்",
    "బస్సు",
    "ప్రిన్సిపాల్",
    "ബസ്",
    "പ്രിൻസിപ്പൽ",
)
_DEPARTMENT_ANSWER_CUES: tuple[str, ...] = (
    "cse",
    "ece",
    "mech",
    "civil",
    "aiml",
    "data science",
    "mba",
    "department",
    "dept",
)


def _hay(text: str) -> str:
    return casefold_keep_scripts(text or "")


def _has_any(hay: str, cues: tuple[str, ...]) -> bool:
    return any(cue_in_hay(hay, cue) for cue in cues)


@dataclass(frozen=True)
class PendingClarification:
    original_query: str
    clarification_target: str
    topic: str | None = None
    language_code_key: str = "en"
    options: tuple[str, ...] = ()

    def as_dict(self) -> dict[str, Any]:
        return {
            "original_query": self.original_query,
            "clarification_target": self.clarification_target,
            "topic": self.topic,
            "language_code_key": self.language_code_key,
            "options": list(self.options),
        }

    @classmethod
    def from_session(cls, session: dict[str, Any] | None) -> PendingClarification | None:
        if not isinstance(session, dict):
            return None
        raw = session.get("pending_clarification")
        if not isinstance(raw, dict):
            return None
        original = str(raw.get("original_query") or "").strip()
        target = str(raw.get("clarification_target") or "").strip()
        if not original or not target:
            return None
        opts = raw.get("options") or ()
        if isinstance(opts, (list, tuple)):
            options = tuple(str(o) for o in opts if str(o).strip())
        else:
            options = ()
        return cls(
            original_query=original,
            clarification_target=target,
            topic=(str(raw.get("topic")).strip() if raw.get("topic") else None),
            language_code_key=str(raw.get("language_code_key") or "en"),
            options=options,
        )


@dataclass(frozen=True)
class PendingResolution:
    """Result of interpreting the user's reply against a pending clarification."""

    clear_pending: bool
    rewritten_text: str | None = None
    local_intent: dict[str, Any] | None = None
    expired_new_topic: bool = False
    selected_option: str | None = None


def build_pending_for_decision(
    *,
    text: str,
    clarification_target: str | None,
    topic: str | None,
    language_code_key: str,
) -> PendingClarification | None:
    target = (clarification_target or "").strip().lower()
    if not target:
        return None
    options: tuple[str, ...] = ()
    if target == "admissions_info":
        options = ("steps", "eligibility", "documents", "fees", "office")
    elif target == "department":
        options = ()
    return PendingClarification(
        original_query=(text or "").strip(),
        clarification_target=target,
        topic=topic,
        language_code_key=language_code_key or "en",
        options=options,
    )


def _admissions_slot_intent(slot: str, pending: PendingClarification) -> dict[str, Any]:
    """Language-neutral structured resolution — no English rewrite required."""
    trigger = {
        "documents": "documents",
        "fees": "fees",
        "eligibility": "admissions",
        "steps": "admissions",
        "office": "admissions",
    }.get(slot, "admissions")
    return {
        "trigger": trigger,
        "from_clarification": True,
        "clarification_slot": slot,
        "clarification_target": pending.clarification_target,
        "original_topic": pending.topic or "admissions",
        "language_code_key": pending.language_code_key,
    }


def try_resolve_pending(text: str, pending: PendingClarification | None) -> PendingResolution | None:
    """
    Bind a short clarification answer to the original request, or expire on topic switch.

    Returns None when there is no pending state (caller continues normally).
    Prefer structured local_intent over English rewritten_text.
    """
    if pending is None:
        return None
    raw = (text or "").strip()
    if not raw:
        return PendingResolution(clear_pending=False)

    hay = _hay(raw)
    target = pending.clarification_target.lower()

    admissions_slot_match = (
        _has_any(hay, _DOCUMENTS_CUES)
        or _has_any(hay, _ELIGIBILITY_CUES)
        or _has_any(hay, _STEPS_CUES)
        or _has_any(hay, _FEES_CUES)
        or _has_any(hay, _OFFICE_CUES)
        or _has_any(hay, _DATES_CUES)
    )

    # New independent topic → cancel pending; process this utterance fresh.
    if target == "admissions_info" and _has_any(hay, _NEW_TOPIC_CUES) and not admissions_slot_match:
        return PendingResolution(clear_pending=True, expired_new_topic=True)

    if target == "admissions_info":
        if _has_any(hay, _DOCUMENTS_CUES):
            return PendingResolution(
                clear_pending=True,
                local_intent=_admissions_slot_intent("documents", pending),
                selected_option="documents",
            )
        if _has_any(hay, _ELIGIBILITY_CUES):
            return PendingResolution(
                clear_pending=True,
                local_intent=_admissions_slot_intent("eligibility", pending),
                selected_option="eligibility",
            )
        if _has_any(hay, _STEPS_CUES):
            return PendingResolution(
                clear_pending=True,
                local_intent=_admissions_slot_intent("steps", pending),
                selected_option="steps",
            )
        if _has_any(hay, _FEES_CUES):
            return PendingResolution(
                clear_pending=True,
                local_intent=_admissions_slot_intent("fees", pending),
                selected_option="fees",
            )
        if _has_any(hay, _DATES_CUES) or _has_any(hay, _OFFICE_CUES):
            return PendingResolution(
                clear_pending=True,
                local_intent=_admissions_slot_intent("office", pending),
                selected_option="office",
            )
        return PendingResolution(clear_pending=False)

    if target == "department":
        if _has_any(hay, _NEW_TOPIC_CUES) and not _has_any(hay, _DEPARTMENT_ANSWER_CUES):
            return PendingResolution(clear_pending=True, expired_new_topic=True)
        return PendingResolution(clear_pending=True)

    return PendingResolution(clear_pending=True)
