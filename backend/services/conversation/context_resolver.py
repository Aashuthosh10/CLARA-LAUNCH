"""Session-local resolution of short follow-ups against active SVIT context."""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any


_ENTITY_LABELS = {
    "cse": "CSE",
    "ise": "ISE",
    "cse_aiml": "CSE AI and Machine Learning",
    "cse_ds": "CSE Data Science",
    "cse_cysec": "CSE Cyber Security",
    "cse_bs": "CSE Business Systems",
    "ece": "ECE",
    "civil": "Civil Engineering",
    "mechanical": "Mechanical Engineering",
    "mba": "MBA",
    "basic_sciences": "Basic Sciences",
}

_FOLLOW_UP_CUES = (
    "what about", "and ", "tell me more", "more about", "how much", "how long",
    "who is he", "who is she", "about him", "about her", "faculty also",
    "what documents", "what is the fee", "what are the fees",
    "is it difficult", "how difficult", "what kind of jobs", "which jobs", "career options",
    "matte", "adara bagge", "avara bagge", "ಮತ್ತೆ", "ಅದರ ಬಗ್ಗೆ", "ಅವರ ಬಗ್ಗೆ",
    "और", "उसके बारे", "उनके बारे", "फीस", "दस्तावेज",
    "மேலும்", "அதைப் பற்றி", "அவரைப் பற்றி", "கட்டணம்",
    "మరియు", "దాని గురించి", "ఆయన గురించి", "ఫీజు",
    "കൂടാതെ", "അതിനെക്കുറിച്ച്", "അദ്ദേഹത്തെക്കുറിച്ച്", "ഫീസ്",
)

_TOPIC_CUES = {
    "difficulty": ("difficult", "difficulty", "hard to study"),
    "careers": ("jobs", "career options", "roles can i get"),
    "fees": ("fee", "fees", "how much", "ಫೀಸ್", "शुल्क", "फीस", "கட்டணம்", "ఫీజు", "ഫീസ്"),
    "placements": ("placement", "placements", "ಉದ್ಯೋಗ", "प्लेसमेंट", "வேலைவாய்ப்பு", "ప్లేస్‌మెంట్", "പ്ലേസ്മെന്റ്"),
    "documents": ("document", "documents", "ದಾಖಲೆ", "दस्तावेज", "ஆவண", "పత్ర", "രേഖ"),
    "duration": ("how long", "duration", "years", "ಎಷ್ಟು ವರ್ಷ", "कितने साल", "எத்தனை ஆண்டு", "ఎన్ని సంవత్సర", "എത്ര വർഷ"),
    "faculty": ("faculty", "teacher", "teachers", "ಬೋಧಕ", "शिक्षक", "ஆசிரிய", "అధ్యాప", "അധ്യാപ"),
    "hod": ("hod", "him", "her", "he", "she", "ಅವರು", "उनके", "அவர்", "ఆయన", "അദ്ദേഹ"),
}


@dataclass(frozen=True)
class ContextResolution:
    resolved_query: str
    entities: tuple[str, ...] = ()
    topics: tuple[str, ...] = ()
    is_follow_up: bool = False
    include_history: bool = False
    authority_domain: str = "unknown"


def _topics(text: str) -> tuple[str, ...]:
    folded = text.casefold()
    return tuple(topic for topic, cues in _TOPIC_CUES.items() if any(cue.casefold() in folded for cue in cues))


def resolve_contextual_query(text: str, session: dict[str, Any]) -> ContextResolution:
    raw = (text or "").strip()
    active = session.get("active_svit_context")
    if not isinstance(active, dict):
        active = {}
    entities = tuple(str(v) for v in (active.get("entities") or session.get("last_semantic_entities") or ()) if str(v))
    person_unit = str(active.get("person_unit_id") or session.get("last_person_unit_id") or "").strip()
    topics = _topics(raw)
    folded = raw.casefold()
    cue = any(token.casefold() in folded for token in _FOLLOW_UP_CUES)
    history_reference = bool(
        re.search(
            r"\b(explain|repeat|say)\s+(that|it)|\b(why|what do you mean|simpler|more simply)\b",
            raw,
            flags=re.IGNORECASE,
        )
    )
    short_reference = len(re.findall(r"\w+", raw, flags=re.UNICODE)) <= 5 and bool(topics)
    is_follow_up = bool((entities or person_unit or active.get("topics")) and (cue or short_reference))
    if not is_follow_up:
        has_completed_history = bool(session.get("turn_history"))
        return ContextResolution(
            raw,
            topics=topics,
            include_history=bool(history_reference and has_completed_history),
        )

    labels = [_ENTITY_LABELS.get(entity, entity.replace("_", " ")) for entity in entities]
    referent = ", ".join(labels)
    if person_unit and any(topic == "hod" for topic in topics):
        referent = f"the HOD of {referent}" if referent else person_unit.replace(".", " ")
    resolved = raw
    if referent:
        resolved = f"{raw} (regarding {referent} at SVIT)"
    elif active.get("topics"):
        resolved = f"{raw} (regarding SVIT {' '.join(active['topics'])})"
    return ContextResolution(
        resolved_query=resolved,
        entities=entities,
        topics=topics or tuple(active.get("topics") or ()),
        is_follow_up=True,
        # The resolved query already carries the authoritative referent. Avoid
        # dumping unrelated intervening turns into the model prompt.
        include_history=False,
        authority_domain="official_svit",
    )


def update_active_svit_context(session: dict[str, Any], response_decision: Any) -> None:
    """Update only from authoritative SVIT turns; general answers cannot overwrite it."""
    domain = getattr(getattr(response_decision, "domain_relevance", None), "value", None)
    if domain != "institution":
        return
    entities = tuple(getattr(response_decision, "entities", ()) or ())
    items = tuple(getattr(response_decision, "items", ()) or ())
    topics = tuple(dict.fromkeys(topic for _, topic in items if topic))
    previous = session.get("active_svit_context")
    previous = previous if isinstance(previous, dict) else {}
    session["active_svit_context"] = {
        "entities": list(entities or previous.get("entities") or ()),
        "topics": list(topics or previous.get("topics") or ()),
        "person_unit_id": session.get("last_person_unit_id") or previous.get("person_unit_id"),
    }
