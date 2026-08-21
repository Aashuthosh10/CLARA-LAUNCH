"""Intent-aware narration for selected ContentUnits.

The planner produces spoken sentences. M5.8 TTS only speaks that text.
Card UI keeps title/body; narration must not dump UI labels.
"""

from __future__ import annotations

from backend.services.answer_generation import (
    load_locale_data_for_lang_key,
    locale_file_id_for_lang_key,
)
from backend.services.content.content_unit import ContentUnit
from backend.services.content.leadership_units import (
    TOPIC_PRINCIPAL,
    TOPIC_TRUSTEES,
    TOPIC_VICE_PRINCIPAL,
)
from backend.services.narration_plan import (
    _DEPT_DISPLAY,
    _clip_caption,
    _effective_lang,
    _init_executive_profiles,
)
from backend.services import narration_plan as _narration_plan_mod

_SUPPORTED = ("en", "hi", "kn", "ta", "te", "ml")


def _lk(lang_key: str) -> str:
    locale_id = locale_file_id_for_lang_key(lang_key)
    lk = _effective_lang(locale_id)
    return lk if lk in _SUPPORTED else "en"


def _dept_label(dept_key: str, lang_key: str) -> str:
    lk = _lk(lang_key)
    names = _DEPT_DISPLAY.get(lk) or _DEPT_DISPLAY["en"]
    return names.get(dept_key, dept_key)


def _hod_name(unit: ContentUnit) -> str:
    meta = unit.metadata or {}
    name = str(meta.get("hod_name") or "").strip()
    if name:
        return name
    return ""


def _fact_sentence(body: str) -> str:
    text = (body or "").strip()
    if not text:
        return ""
    return _clip_caption(text, 280)


def narrate_unit(unit: ContentUnit, lang_key: str, guest_name: str | None = None) -> str:
    """One concise spoken sentence (or short paragraph) for a resolved unit."""
    lk = _lk(lang_key)
    campus_spoken = _campus_unit_spoken(unit, lk)
    if campus_spoken:
        return _with_sparse_guest_name(campus_spoken, guest_name, unit)
    suffix = (unit.unit_id.split(".", 1) + [""])[1]
    dept = (unit.entity_id or "").strip()
    dept_label = _dept_label(dept, lk) if dept and unit.entity_type == "department" else ""

    if suffix == "hod":
        name = _hod_name(unit)
        if name and dept_label:
            return {
                "en": f"The Head of the {dept_label} department is {name}.",
                "kn": f"{dept_label} ವಿಭಾಗದ ಮುಖ್ಯಸ್ಥರು {name} ಅವರು.",
                "hi": f"{dept_label} विभाग के प्रमुख {name} हैं।",
                "ta": f"{dept_label} துறையின் தலைவர் {name}.",
                "te": f"{dept_label} విభాగం అధిపతి {name}.",
                "ml": f"{dept_label} വിഭാഗത്തിന്റെ മേധാവി {name} ആണ്.",
            }.get(lk, f"The Head of the {dept_label} department is {name}.")
        return _fact_sentence(unit.body)

    if suffix == "overview":
        body = _fact_sentence(unit.body)
        return _with_sparse_guest_name(body, guest_name, unit) if body else body

    if suffix == "fees":
        body = _fact_sentence(unit.body)
        if dept_label:
            lead = {
                "en": f"{dept_label} fees.",
                "kn": f"{dept_label} ಶುಲ್ಕ.",
                "hi": f"{dept_label} शुल्क.",
                "ta": f"{dept_label} கட்டணம்.",
                "te": f"{dept_label} ఫీజు.",
                "ml": f"{dept_label} ഫീസ്.",
            }.get(lk, f"{dept_label} fees.")
            return f"{lead} {body}".strip() if body else lead
        return body

    if suffix == "placements":
        body = _fact_sentence(unit.body)
        if dept_label:
            lead = {
                "en": f"{dept_label} placements.",
                "kn": f"{dept_label} ಉದ್ಯೋಗಾವಕಾಶಗಳು.",
                "hi": f"{dept_label} प्लेसमेंट.",
                "ta": f"{dept_label} வேலைவாய்ப்பு.",
                "te": f"{dept_label} ప్లేస్‌మెంట్‌లు.",
                "ml": f"{dept_label} പ്ലേസ്‌മെന്റുകൾ.",
            }.get(lk, f"{dept_label} placements.")
            return f"{lead} {body}".strip() if body else lead
        return body

    if suffix == "achievements":
        body = _fact_sentence(unit.body)
        if dept_label:
            lead = {
                "en": f"{dept_label} achievements.",
                "kn": f"{dept_label} ಸಾಧನೆಗಳು.",
                "hi": f"{dept_label} उपलब्धियां.",
                "ta": f"{dept_label} சாதனைகள்.",
                "te": f"{dept_label} సాధనలు.",
                "ml": f"{dept_label} നേട്ടങ്ങൾ.",
            }.get(lk, f"{dept_label} achievements.")
            return f"{lead} {body}".strip() if body else lead
        return body

    if suffix == TOPIC_PRINCIPAL:
        _init_executive_profiles()
        pack = _narration_plan_mod.EXEC_PRINCIPAL or {}
        p = pack.get(lk) or pack.get("en") or {}
        name = str(p.get("name") or "").strip()
        if name:
            return {
                "en": f"The Principal of Sai Vidya Institute of Technology is {name}.",
                "kn": f"ಸಾಯಿ ವಿದ್ಯಾ ಇನ್‌ಸ್ಟಿಟ್ಯೂಟ್ ಆಫ್ ಟೆಕ್ನಾಲಜಿಯ ಪ್ರಾಂಶುಪಾಲರು {name} ಅವರು.",
                "hi": f"साई विद्या इंस्टिट्यूट ऑफ टेक्नोलॉजी के प्राचार्य {name} हैं।",
                "ta": f"Sai Vidya Institute of Technology முதல்வர் {name}.",
                "te": f"Sai Vidya Institute of Technology ప్రిన్సిపాల్ {name}.",
                "ml": f"Sai Vidya Institute of Technology പ്രിൻസിപ്പൽ {name} ആണ്.",
            }.get(lk, f"The Principal of Sai Vidya Institute of Technology is {name}.")
        return _fact_sentence(unit.body)

    if suffix == TOPIC_VICE_PRINCIPAL:
        _init_executive_profiles()
        pack = _narration_plan_mod.EXEC_VICE or {}
        p = pack.get(lk) or pack.get("en") or {}
        name = str(p.get("name") or "").strip()
        if name:
            return {
                "en": f"The Vice Principal and Dean Academics is {name}.",
                "kn": f"ಉಪ ಪ್ರಾಂಶುಪಾಲರು ಹಾಗೂ ಶೈಕ್ಷಣಿಕ ಡೀನ್ {name} ಅವರು.",
                "hi": f"उप प्राचार्य और शैक्षणिक डीन {name} हैं।",
                "ta": f"துணை முதல்வர் மற்றும் கல்வி டீன் {name}.",
                "te": f"ఉప ప్రిన్సిపాల్ మరియు డీన్ ఎకడెమిక్స్ {name}.",
                "ml": f"ഉപ പ്രിൻസിപ്പലും അക്കാദമിക് ഡീനും {name} ആണ്.",
            }.get(lk, f"The Vice Principal and Dean Academics is {name}.")
        return _fact_sentence(unit.body)

    if suffix == TOPIC_TRUSTEES:
        spoken = _trustee_opening_spoken(lk)
        if spoken:
            return spoken
        return _fact_sentence(unit.body)
    return _fact_sentence(unit.body)


def _with_sparse_guest_name(spoken: str, guest_name: str | None, unit: ContentUnit) -> str:
    """Insert the guest name once, mid-narration. Never a greeting prefix. Never on the card."""
    name = (guest_name or "").strip()
    text = (spoken or "").strip()
    if not text or len(name) < 3:
        return text
    if name.casefold() in text.casefold():
        return text
    # Short factual leadership/HOD lines stay name-free.
    if (unit.entity_type or "") in {"leadership"} or (unit.unit_id or "").endswith(".hod"):
        return text
    if ". " in text:
        first, rest = text.split(". ", 1)
        rest_lead = rest[:1]
        rest_tail = rest[1:] if len(rest) > 1 else ""
        if rest_lead.isascii() and rest_lead.isalpha():
            rest = rest_lead.lower() + rest_tail
        return f"{first}. {name}, {rest}"
    if text.endswith("."):
        return f"{text[:-1]}, {name}."
    return f"{text}, {name}."


def _campus_unit_spoken(unit: ContentUnit, lang_key: str) -> str:
    """Speak the same locale tts_summary shown on the campus unit card."""
    if (unit.entity_type or "") not in {"hostel", "canteen", "event"}:
        return ""
    spoken = str((unit.metadata or {}).get("tts_summary") or "").strip()
    if spoken:
        return _clip_caption(spoken, 280)
    data = load_locale_data_for_lang_key(lang_key)
    block = data.get("campus_units") if isinstance(data, dict) else None
    row = block.get(unit.unit_id) if isinstance(block, dict) else None
    if isinstance(row, dict):
        text = str(row.get("tts_summary") or "").strip()
        if text:
            return _clip_caption(text, 280)
    return ""


def _trustee_opening_spoken(lang_key: str) -> str:
    """Speak the first trustee card's locale text so TTS matches the visible card."""
    data = load_locale_data_for_lang_key(lang_key)
    holders = data.get("role_holders") if isinstance(data, dict) else None
    trustees = holders.get("trustees") if isinstance(holders, dict) else None
    if not isinstance(trustees, list):
        return ""
    for item in trustees:
        if not isinstance(item, dict):
            continue
        spoken = str(item.get("tts_summary") or item.get("description") or "").strip()
        if spoken:
            return spoken
    return ""


def _trustee_names(lang_key: str) -> list[str]:
    """Display names from the active locale's trustee records. No English silent fallback."""
    data = load_locale_data_for_lang_key(lang_key)
    holders = data.get("role_holders") if isinstance(data, dict) else None
    trustees = holders.get("trustees") if isinstance(holders, dict) else None
    names: list[str] = []
    if not isinstance(trustees, list):
        return names
    for item in trustees:
        if not isinstance(item, dict):
            continue
        name = str(item.get("display_name") or item.get("name") or "").strip()
        if name:
            names.append(name)
    return names
