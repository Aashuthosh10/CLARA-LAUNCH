"""Deterministic CLOSE / CONTINUE cues for the session closing question."""

from __future__ import annotations

import re
import unicodedata

_CLOSE_CUES: tuple[str, ...] = (
    "no",
    "no thanks",
    "no thank you",
    "that's all",
    "thats all",
    "that's it",
    "thats it",
    "nothing else",
    "i'm good",
    "im good",
    "i am good",
    "thank you",
    "thanks",
    "bye",
    "goodbye",
    "good bye",
    "all good",
    "nothing",
    "done",
    "nahi",
    "nahin",
    "bas",
    "shukriya",
    "dhanyavad",
    "alvida",
    "नहीं",
    "नही",
    "बस",
    "शुक्रिया",
    "धन्यवाद",
    "अलविदा",
    "illa",
    "beda",
    "saaku",
    "saku",
    "dhanyavada",
    "ಇಲ್ಲ",
    "ಬೇಡ",
    "ಸಾಕು",
    "ಧನ್ಯವಾದ",
    "vendam",
    "podhum",
    "nandri",
    "இல்லை",
    "வேண்டாம்",
    "போதும்",
    "நன்றி",
    "ledu",
    "vaddu",
    "chalu",
    "dhanyavadalu",
    "లేదు",
    "వద్దు",
    "చాలు",
    "ధన్యవాదాలు",
    "venda",
    "mathi",
    "nanni",
    "ഇല്ല",
    "വേണ്ട",
    "മതി",
    "നന്ദി",
)

_CONTINUE_CUES: tuple[str, ...] = (
    "yes",
    "yeah",
    "yep",
    "yup",
    "sure",
    "of course",
    "yes please",
    "please",
    "ok",
    "okay",
    "haan",
    "ha",
    "han",
    "ji",
    "haaji",
    "हो",
    "हाँ",
    "हां",
    "जी",
    "houdu",
    "ಹೌದು",
    "ಹಾ",
    "aama",
    "aam",
    "ஆமா",
    "ஆம்",
    "avunu",
    "అవును",
    "athe",
    "അതെ",
)


def _normalize(text: str) -> str:
    s = unicodedata.normalize("NFKC", (text or "").strip().lower())
    s = re.sub(r"[^\w\s']+", " ", s, flags=re.UNICODE)
    s = re.sub(r"\s+", " ", s).strip()
    return s


def strip_leading_continue(text: str) -> str | None:
    hay = _normalize(text)
    if not hay:
        return None
    for cue in sorted(_CONTINUE_CUES, key=len, reverse=True):
        c = cue.lower()
        if hay == c:
            return ""
        if hay.startswith(c + " "):
            return hay[len(c) :].strip()
    return None


def classify_closing_reply(text: str) -> str:
    """Return CLOSE | CONTINUE | AMBIGUOUS."""
    hay = _normalize(text)
    if not hay:
        return "AMBIGUOUS"

    residual = strip_leading_continue(text)
    if residual is not None and residual:
        return "CONTINUE"

    def _hit(cues: tuple[str, ...]) -> bool:
        for c in cues:
            c_norm = _normalize(c)
            if not c_norm:
                continue
            if hay == c_norm:
                return True
            if c_norm.isascii():
                if re.search(rf"(?:^|\s){re.escape(c_norm)}(?:\s|$)", hay):
                    return True
            elif c_norm in hay:
                return True
        return False

    close_hit = _hit(_CLOSE_CUES)
    continue_hit = _hit(_CONTINUE_CUES)

    if close_hit and not continue_hit:
        return "CLOSE"
    if continue_hit and not close_hit:
        return "CONTINUE"
    if close_hit and continue_hit:
        return "AMBIGUOUS"
    if len(hay.split()) >= 3 or len(hay) >= 12:
        return "CONTINUE"
    return "AMBIGUOUS"
