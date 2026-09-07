"""Short spoken thinking-bridge sentences from existing semantic understanding.

Deterministic. No second LLM. No parallel semantic engine.
Consumes SemanticRequest from parse_semantic_request (same pipeline as CARD/ANSWER).
"""

from __future__ import annotations

from typing import Any

from backend.services.content.department_resolver import _canonical_label_for_key
from backend.services.content.semantic_request import SemanticRequest
from backend.services.content.semantic_request_parser import parse_semantic_request

_FALLBACK = {
    "en": "Let me bring that together for you.",
    "kn": "ನಾನು ಅದನ್ನು ನಿಮಗಾಗಿ ಒಟ್ಟುಗೂಡಿಸುತ್ತೇನೆ.",
    "hi": "मैं वह आपके लिए एक साथ लाती हूँ।",
    "ta": "அதை உங்களுக்காக ஒன்றாகத் தொகுக்கிறேன்.",
    "te": "దాన్ని మీ కోసం సమీకరిస్తాను.",
    "ml": "അത് നിങ്ങൾക്കായി ഒരുമിച്ച് ശേഖരിക്കാം.",
}

# Action-aware bridges — must match the next spoken act (never lie).
_CLARIFY_BRIDGE = {
    "en": "Let me make sure I understand what you're looking for.",
    "kn": "ನೀವು ಏನು ಹುಡುಕುತ್ತಿದ್ದೀರಿ ಎಂದು ಖಚಿತಪಡಿಸಿಕೊಳ್ಳುತ್ತೇನೆ.",
    "hi": "मैं सुनिश्चित कर लेती हूँ कि आप क्या जानना चाहते हैं।",
    "ta": "நீங்கள் எதை தேடுகிறீர்கள் என்பதை உறுதி செய்கிறேன்.",
    "te": "మీరు ఏమి కోరుకుంటున్నారో నిర్ధారించుకుంటాను.",
    "ml": "നിങ്ങൾ എന്താണ് അന്വേഷിക്കുന്നതെന്ന് ഉറപ്പാക്കാം.",
}

_CLARIFY_ADMISSIONS_BRIDGE = {
    "en": "Let me make sure I understand which admission details you need.",
    "kn": "ನಿಮಗೆ ಯಾವ ಪ್ರವೇಶ ವಿವರಗಳು ಬೇಕು ಎಂದು ಖಚಿತಪಡಿಸಿಕೊಳ್ಳುತ್ತೇನೆ.",
    "hi": "मैं सुनिश्चित कर लेती हूँ कि आपको प्रवेश की कौन-सी जानकारी चाहिए।",
    "ta": "எந்த சேர்க்கை விவரங்கள் வேண்டும் என்பதை உறுதி செய்கிறேன்.",
    "te": "మీకు ఏ ప్రవేశ వివరాలు కావాలో నిర్ధారించుకుంటాను.",
    "ml": "നിങ്ങൾക്ക് ഏത് അഡ്മിഷൻ വിവരങ്ങളാണ് വേണ്ടതെന്ന് ഉറപ്പാക്കാം.",
}

_CLARIFY_DEPARTMENT_BRIDGE = {
    "en": "Let me make sure I get the right details for you.",
    "kn": "ಸರಿಯಾದ ವಿವರಗಳನ್ನು ಪಡೆಯುವುದನ್ನು ಖಚಿತಪಡಿಸಿಕೊಳ್ಳುತ್ತೇನೆ.",
    "hi": "मैं सही जानकारी लेने के लिए थोड़ा स्पष्ट कर लेती हूँ।",
    "ta": "சரியான விவரங்களை பெற உறுதி செய்கிறேன்.",
    "te": "సరైన వివరాలు తెలుసుకునేలా నిర్ధారించుకుంటాను.",
    "ml": "ശരിയായ വിവരങ്ങൾ ലഭിക്കാൻ ഉറപ്പാക്കാം.",
}

_FALLBACK_BRIDGE = {
    "en": "Let me point you to the right place for that.",
    "kn": "ಅದಕ್ಕೆ ಸರಿಯಾದ ಸ್ಥಳಕ್ಕೆ ನಿಮ್ಮನ್ನು ಮಾರ್ಗದರ್ಶನ ಮಾಡುತ್ತೇನೆ.",
    "hi": "मैं आपको इसके लिए सही जगह बताती हूँ।",
    "ta": "அதற்கு சரியான இடத்திற்கு வழிகாட்டுகிறேன்.",
    "te": "దానికి సరైన చోటుకు మిమ్మల్ని నిర్దేశిస్తాను.",
    "ml": "അതിന് ശരിയായ സ്ഥലത്തേക്ക് നിങ്ങളെ നയിക്കാം.",
}

# Human-readable topic phrases (not category templates that invent wrong roles).
_TOPIC_NOUN: dict[str, dict[str, str]] = {
    "principal": {
        "en": "the principal",
        "kn": "ಪ್ರಿನ್ಸಿಪಾಲ್",
        "hi": "प्रिंसिपल",
        "ta": "முதல்வர்",
        "te": "ప్రిన్సిపాల్",
        "ml": "പ്രിൻസിപ്പൽ",
    },
    "vice_principal": {
        "en": "the vice principal",
        "kn": "ಉಪಪ್ರಾಂಶುಪಾಲರು",
        "hi": "उप प्रिंसिपल",
        "ta": "துணை முதல்வர்",
        "te": "వైస్ ప్రిన్సిపాల్",
        "ml": "വൈസ് പ്രിൻസിപ്പൽ",
    },
    "trustees": {
        "en": "the trustees",
        "kn": "ಟ್ರಸ್ಟಿಗಳು",
        "hi": "ट्रस्टी",
        "ta": "அறங்காவலர்கள்",
        "te": "ట్రస్టీలు",
        "ml": "ട്രസ്റ്റികൾ",
    },
    "hod": {
        "en": "the HOD",
        "kn": "ವಿಭಾಗ ಮುಖ್ಯಸ್ಥರು",
        "hi": "विभाग प्रमुख",
        "ta": "துறைத் தலைவர்",
        "te": "విభాగ అధిపతి",
        "ml": "വിഭാഗ മേധാവി",
    },
    "fees": {
        "en": "the fee details",
        "kn": "ಶುಲ್ಕದ ವಿವರಗಳು",
        "hi": "फीस विवरण",
        "ta": "கட்டண விவரங்கள்",
        "te": "ఫీజు వివరాలు",
        "ml": "ഫീസ് വിവരങ്ങൾ",
    },
    "placements": {
        "en": "the placement details",
        "kn": "ಪ್ಲೇಸ್‌ಮೆಂಟ್ ವಿವರಗಳು",
        "hi": "प्लेसमेंट विवरण",
        "ta": "வேலைவாய்ப்பு விவரங்கள்",
        "te": "ప్లేస్‌మెంట్ వివరాలు",
        "ml": "പ്ലേസ്‌മെന്റ് വിവരങ്ങൾ",
    },
    "achievements": {
        "en": "the achievements",
        "kn": "ಸಾಧನೆಗಳು",
        "hi": "उपलब्धियां",
        "ta": "சாதனைகள்",
        "te": "విజయాలు",
        "ml": "നേട്ടങ്ങൾ",
    },
    "overview": {
        "en": "the department overview",
        "kn": "ವಿಭಾಗದ ಅವಲೋಕನ",
        "hi": "विभाग का परिचय",
        "ta": "துறை மேலோட்டம்",
        "te": "విభాగ అవలోకనం",
        "ml": "വിഭാഗ അവലോകനം",
    },
    "faculty": {
        "en": "the faculty details",
        "kn": "ಅಧ್ಯಾಪಕರ ವಿವರಗಳು",
        "hi": "संकाय विवरण",
        "ta": "ஆசிரியர் விவரங்கள்",
        "te": "అధ్యాపక వివరాలు",
        "ml": "അധ്യാപക വിവരങ്ങൾ",
    },
    "location": {
        "en": "the location details",
        "kn": "ಸ್ಥಳದ ವಿವರಗಳು",
        "hi": "स्थान विवरण",
        "ta": "இட விவரங்கள்",
        "te": "స్థాన వివరాలు",
        "ml": "സ്ഥല വിവരങ്ങൾ",
    },
}

_ENTITY_FALLBACK: dict[str, dict[str, str]] = {
    "college": {
        "en": "the college",
        "kn": "ಕಾಲೇಜು",
        "hi": "कॉलेज",
        "ta": "கல்லூரி",
        "te": "కళాశాల",
        "ml": "കോളേജ്",
    },
    "canteen": {
        "en": "the canteen",
        "kn": "ಕ್ಯಾಂಟೀನ್",
        "hi": "कैंटीन",
        "ta": "கேண்டீன்",
        "te": "కాంటీన్",
        "ml": "കാൻറ്റീൻ",
    },
}

# Frame: {subject} is the composed noun phrase; {name_tail} is ", Name" or "".
_ABOUT_FRAME = {
    "en": "Let me bring together the details about {subject} for you{name_tail}.",
    "kn": "{subject} ಬಗ್ಗೆ ವಿವರಗಳನ್ನು ನಿಮಗಾಗಿ ತರುತ್ತೇನೆ{name_tail}.",
    "hi": "{subject} का विवरण आपके लिए लाती हूँ{name_tail}।",
    "ta": "{subject} குறித்த விவரங்களை உங்களுக்காகத் தொகுக்கிறேன்{name_tail}.",
    "te": "{subject} వివరాలను మీ కోసం సమీకరిస్తాను{name_tail}.",
    "ml": "{subject} വിവരങ്ങൾ നിങ്ങൾക്കായി ഒരുമിച്ച് ശേഖരിക്കാം{name_tail}.",
}

_FOR_FRAME = {
    "en": "Let me bring together {subject} for you{name_tail}.",
    "kn": "{subject} ನಿಮಗಾಗಿ ತರುತ್ತೇನೆ{name_tail}.",
    "hi": "{subject} आपके लिए लाती हूँ{name_tail}।",
    "ta": "{subject} உங்களுக்காகத் தொகுக்கிறேன்{name_tail}.",
    "te": "{subject} మీ కోసం సమీకరిస్తాను{name_tail}.",
    "ml": "{subject} നിങ്ങൾക്കായി ഒരുമിച്ച് ശേഖരിക്കാം{name_tail}.",
}

_OF_JOIN = {
    "en": "{topic} of {entity}",
    "kn": "{entity}ನ {topic}",
    "hi": "{entity} के {topic}",
    "ta": "{entity} {topic}",
    "te": "{entity} {topic}",
    "ml": "{entity} {topic}",
}

_FOR_JOIN = {
    "en": "{topic} for {entity}",
    "kn": "{entity}ಗಾಗಿ {topic}",
    "hi": "{entity} के लिए {topic}",
    "ta": "{entity}க்கான {topic}",
    "te": "{entity} కోసం {topic}",
    "ml": "{entity}യുടെ {topic}",
}

_AND = {
    "en": " and ",
    "kn": " ಮತ್ತು ",
    "hi": " और ",
    "ta": " மற்றும் ",
    "te": " మరియు ",
    "ml": " ഒപ്പം ",
}

_WARM_TOPICS = frozenset({"principal", "overview", "placements", "achievements"})


def _lang(lang_key: str) -> str:
    key = (lang_key or "en").strip().lower()[:2]
    return key if key in _FALLBACK else "en"


def _name_tail(lang: str, guest_name: str | None, *, allow: bool) -> str:
    name = (guest_name or "").strip()
    if not allow or not name:
        return ""
    if lang == "hi":
        return f", {name}"
    return f", {name}"


def _entity_label(entity: str, lang: str) -> str:
    ent = (entity or "").strip().lower()
    if not ent or ent in {"leadership", "unknown.entity"}:
        return ""
    if ent in _ENTITY_FALLBACK:
        return _ENTITY_FALLBACK[ent].get(lang) or _ENTITY_FALLBACK[ent]["en"]
    if ent.startswith("hostel."):
        return {
            "en": "the hostel",
            "kn": "ಹಾಸ್ಟೆಲ್",
            "hi": "हॉस्टल",
            "ta": "விடுதி",
            "te": "హాస్టల్",
            "ml": "ഹോസ്റ്റൽ",
        }.get(lang, "the hostel")
    if ent.startswith("events."):
        slug = ent.split(".", 1)[-1].replace("_", " ").strip()
        return slug.title() if slug else "the event"
    label = _canonical_label_for_key(ent)
    if label:
        return label
    return ent.replace("_", " ").upper() if len(ent) <= 5 else ent.replace("_", " ").title()


def _topic_noun(topic: str, lang: str) -> str:
    t = (topic or "").strip().lower()
    table = _TOPIC_NOUN.get(t)
    if not table:
        # Unknown topic: speak the topic token itself rather than inventing a role.
        return t.replace("_", " ") if t else ""
    return table.get(lang) or table["en"]


def _subject_for_item(entity: str, topic: str, lang: str) -> str:
    topic_l = (topic or "").strip().lower()
    ent_l = (entity or "").strip().lower()
    topic_phrase = _topic_noun(topic_l, lang)
    ent_phrase = _entity_label(ent_l, lang)

    if not topic_phrase and not ent_phrase:
        return ""
    if not ent_phrase or ent_l in {"leadership", "college"} and topic_l in {
        "principal",
        "vice_principal",
        "trustees",
        "placements",
        "achievements",
        "location",
    }:
        # Leadership / college-global topics: do not invent a department.
        if topic_l in {"placements", "fees", "achievements"} and ent_l == "college":
            return topic_phrase
        return topic_phrase or ent_phrase

    if topic_l == "hod":
        return (_OF_JOIN.get(lang) or _OF_JOIN["en"]).format(topic=topic_phrase, entity=ent_phrase)
    if topic_l in {"fees", "placements", "achievements", "overview", "faculty"}:
        return (_FOR_JOIN.get(lang) or _FOR_JOIN["en"]).format(topic=topic_phrase, entity=ent_phrase)
    if ent_phrase and topic_phrase:
        return (_OF_JOIN.get(lang) or _OF_JOIN["en"]).format(topic=topic_phrase, entity=ent_phrase)
    return topic_phrase or ent_phrase


def _frame_for_topic(topic: str) -> dict[str, str]:
    t = (topic or "").strip().lower()
    if t in {"fees", "placements", "achievements", "overview", "faculty"}:
        return _FOR_FRAME
    return _ABOUT_FRAME


def _ci_entities_from_session(session: dict[str, Any] | None) -> dict[str, Any] | None:
    if not isinstance(session, dict):
        return None
    out: dict[str, Any] = {}
    raw = session.get("last_semantic_entities")
    if isinstance(raw, (list, tuple)):
        keys = [str(k).strip() for k in raw if str(k).strip()]
        if keys:
            out["department_keys"] = keys
    person = str(session.get("last_person_unit_id") or "").strip()
    if person:
        out["last_person_unit_id"] = person
    dept = session.get("conversation_entities")
    if isinstance(dept, dict) and dept.get("department"):
        out["department"] = dept.get("department")
    return out or None


def build_thinking_semantic_request(
    raw_text: str,
    lang_key: str,
    session: dict[str, Any] | None = None,
) -> SemanticRequest | None:
    """Reuse the production semantic parser (fast, no LLM)."""
    lang = _lang(lang_key)
    return parse_semantic_request(
        raw_text=raw_text or "",
        language_code_key=lang,
        ci_entities=_ci_entities_from_session(session),
    )


def conversational_action_for_turn(
    *,
    response_mode: str | None = None,
    policy_action: str | None = None,
) -> str:
    """
    Map sealed turn decision → thinking action.

    answer | clarify | fallback | repeat
    """
    policy = (policy_action or "").strip().upper()
    mode = (response_mode or "").strip().upper()
    if policy in {"NO_SPEECH_RETRY"} or mode == "RETRY":
        return "repeat"
    if mode == "CLARIFY" or policy == "ASK_CLARIFICATION":
        return "clarify"
    if mode == "FALLBACK" or policy == "UNKNOWN":
        return "fallback"
    return "answer"


def compose_thinking_bridge_from_semantic(
    semantic: SemanticRequest | None,
    lang_key: str,
    guest_name: str | None = None,
    *,
    conversational_action: str = "answer",
    clarification_target: str | None = None,
) -> str | None:
    """
    Render a short natural bridge.

    Returns None when thinking should be skipped (repeat / empty).
    """
    lang = _lang(lang_key)
    action = (conversational_action or "answer").strip().lower()

    if action == "repeat":
        return None

    if action == "clarify":
        target = (clarification_target or "").strip().lower()
        if target == "admissions_info":
            return _CLARIFY_ADMISSIONS_BRIDGE.get(lang) or _CLARIFY_ADMISSIONS_BRIDGE["en"]
        if target == "department":
            return _CLARIFY_DEPARTMENT_BRIDGE.get(lang) or _CLARIFY_DEPARTMENT_BRIDGE["en"]
        return _CLARIFY_BRIDGE.get(lang) or _CLARIFY_BRIDGE["en"]

    if action == "fallback":
        return _FALLBACK_BRIDGE.get(lang) or _FALLBACK_BRIDGE["en"]

    # ANSWER / CARD — contextual gather bridge from semantic items.
    if semantic is None or not semantic.unit_items:
        return _FALLBACK[lang]

    subjects: list[str] = []
    for entity, topic in semantic.unit_items[:2]:
        subject = _subject_for_item(entity, topic, lang)
        if subject and subject not in subjects:
            subjects.append(subject)
    if not subjects:
        return _FALLBACK[lang]

    primary_topic = (semantic.unit_items[0][1] or semantic.topic or "").strip().lower()
    allow_name = primary_topic in _WARM_TOPICS or primary_topic in {"", "overview"}
    name_tail = _name_tail(lang, guest_name, allow=allow_name and primary_topic != "fees")

    joiner = _AND.get(lang) or _AND["en"]
    subject = joiner.join(subjects)
    frames = _frame_for_topic(primary_topic)
    template = frames.get(lang) or frames["en"]
    sentence = template.format(subject=subject, name_tail=name_tail).strip()
    if len(sentence.split()) > 18 and len(subjects) > 1:
        sentence = template.format(subject=subjects[0], name_tail=name_tail).strip()
    return sentence


def compose_thinking_bridge(
    raw_text: str,
    lang_key: str,
    guest_name: str | None = None,
    *,
    semantic_request: SemanticRequest | None = None,
    session: dict[str, Any] | None = None,
    conversational_action: str = "answer",
    clarification_target: str | None = None,
) -> str | None:
    """
    Compose thinking bridge from existing semantic understanding + turn action.
    """
    lang = _lang(lang_key)
    action = (conversational_action or "answer").strip().lower()
    if action == "repeat":
        return None
    if action in {"clarify", "fallback"}:
        return compose_thinking_bridge_from_semantic(
            None,
            lang,
            guest_name,
            conversational_action=action,
            clarification_target=clarification_target,
        )
    semantic = semantic_request
    if semantic is None and (raw_text or "").strip():
        semantic = build_thinking_semantic_request(raw_text, lang, session)
    return compose_thinking_bridge_from_semantic(
        semantic,
        lang,
        guest_name,
        conversational_action="answer",
        clarification_target=clarification_target,
    )


# Back-compat for older tests that imported infer_thinking_topic.
def infer_thinking_topic(raw: str) -> str:
    """Deprecated: prefer SemanticRequest.topic. Kept for call-site compatibility."""
    req = parse_semantic_request(raw_text=raw or "", language_code_key="en")
    if req and req.topic:
        return str(req.topic)
    return "general"
