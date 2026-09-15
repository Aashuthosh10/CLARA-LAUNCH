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
    "that is all",
    "that's it",
    "thats it",
    "that is it",
    "that's everything",
    "thats everything",
    "that is everything",
    "that's enough",
    "thats enough",
    "that is enough",
    "nothing else",
    "nothing more",
    "no more questions",
    "no more question",
    "i'm good",
    "im good",
    "i am good",
    "i'm done",
    "im done",
    "i am done",
    "i'm finished",
    "im finished",
    "i am finished",
    "all done",
    "that will be all",
    "that'll be all",
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

# Pure acknowledgement / closing thank-you (no new campus request).
_THANKS_ONLY_CUES: tuple[str, ...] = (
    "thank you",
    "thanks",
    "thank you for the help",
    "thanks for the help",
    "thank you so much",
    "thanks so much",
    "thanks a lot",
    "thank you that's all",
    "thanks that's all",
    "thank you thats all",
    "thanks thats all",
    "thank you that is all",
    "thanks that is all",
    "thanks thats it",
    "thank you thats it",
    "thank you that is it",
    "thanks that is it",
    "that's all i needed",
    "thats all i needed",
    "that is all i needed",
    "that's everything",
    "thats everything",
    "that is everything",
    "dhanyavad",
    "dhanyavada",
    "shukriya",
    "धन्यवाद",
    "शुक्रिया",
    "ಧನ್ಯವಾದ",
    "நன்றி",
    "ధన్యవాదాలు",
    "നന്ദി",
)

# Ending phrases without an explicit "thanks" prefix (direct closure).
_DIRECT_END_CUES: tuple[str, ...] = (
    "that's all",
    "thats all",
    "that is all",
    "that's it",
    "thats it",
    "that is it",
    "that's everything",
    "thats everything",
    "that is everything",
    "that's enough",
    "thats enough",
    "that is enough",
    "nothing else",
    "nothing more",
    "no more questions",
    "no more question",
    "i'm done",
    "im done",
    "i am done",
    "i'm finished",
    "im finished",
    "i am finished",
    "all done",
    "that will be all",
    "that'll be all",
    "goodbye",
    "good bye",
    "bye",
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


def strip_leading_thanks(text: str) -> str | None:
    """If utterance starts with thanks, return residual after the cue (may be empty)."""
    hay = _normalize(text)
    if not hay:
        return None
    for cue in sorted(_THANKS_ONLY_CUES, key=len, reverse=True):
        c = _normalize(cue)
        if not c:
            continue
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


def strip_trailing_thanks(text: str) -> str | None:
    """If utterance ends with thanks, return residual before the cue (may be empty)."""
    hay = _normalize(text)
    if not hay:
        return None
    for cue in sorted(_THANKS_ONLY_CUES, key=len, reverse=True):
        c = _normalize(cue)
        if not c:
            continue
        if hay == c:
            return ""
        if hay.endswith(" " + c):
            return hay[: -(len(c) + 1)].strip()
    return None


def classify_direct_thanks_utterance(text: str) -> str:
    """
    Active-conversation thank-you classifier (before closing prompt).

    CLOSE_CONFIRM — pure thanks / ending → ask anything-else confirmation.
    CONTINUE — thanks plus a substantive residual request → normal pipeline.
    NONE — not a thank-you closing signal.
    """
    hay = _normalize(text)
    if not hay:
        return "NONE"

    residual = strip_leading_thanks(text)
    if residual is None:
        # "That is all, thank you" — ending cue with trailing thanks.
        trailing = strip_trailing_thanks(text)
        if trailing is not None:
            if not trailing:
                return "CLOSE_CONFIRM"
            if any(_normalize(c) == _normalize(trailing) for c in _DIRECT_END_CUES):
                return "CLOSE_CONFIRM"
            if classify_closing_reply(trailing) == "CLOSE":
                return "CLOSE_CONFIRM"
        # Exact match against ending cues that do not require "thanks".
        if any(_normalize(c) == hay for c in _DIRECT_END_CUES):
            return "CLOSE_CONFIRM"
        return "NONE"

    if not residual:
        return "CLOSE_CONFIRM"

    # Residual after thanks: "thanks, what about hostels?" → continue.
    if classify_closing_reply(residual) == "CLOSE":
        return "CLOSE_CONFIRM"
    if any(_normalize(c) == _normalize(residual) for c in _DIRECT_END_CUES):
        return "CLOSE_CONFIRM"
    if len(residual.split()) >= 2 or len(residual) >= 8:
        return "CONTINUE"
    # Short residual like "bye" after thanks → still closing.
    if classify_closing_reply(residual) == "CLOSE":
        return "CLOSE_CONFIRM"
    return "CONTINUE"


_POSITIVE_FEEDBACK: tuple[str, ...] = (
    "good",
    "very good",
    "excellent",
    "great",
    "awesome",
    "amazing",
    "helpful",
    "it was helpful",
    "it was fast",
    "fast",
    "nice",
    "perfect",
    "loved it",
    "i liked it",
    "chennagittu",
    "tum bahut helpful the",
    "romba nalla irundhudhu",
    "chaala baagundi",
    "nalla aayirunnu",
    "bahut accha",
    "accha",
    "ಚೆನ್ನಾಗಿತ್ತು",
    "अच्छा",
    "बहुत अच्छा",
    "நல்லா இருந்தது",
    "బాగుంది",
    "നല്ലത്",
)

_NEGATIVE_FEEDBACK: tuple[str, ...] = (
    "bad",
    "poor",
    "could be better",
    "confusing",
    "it was confusing",
    "it was slow",
    "slow",
    "not helpful",
    "useless",
    "terrible",
    "worst",
    "ಕೆಟ್ಟದು",
    "खराब",
    "மோசம்",
    "చెడ్డది",
    "മോശം",
)

_VAGUE_FEEDBACK: tuple[str, ...] = (
    "ok",
    "okay",
    "fine",
    "alright",
    "hmm",
    "yes",
    "yeah",
    "sure",
    "idk",
    "i don't know",
    "dont know",
    "nothing",
    "ಸರಿ",
    "ठीक",
    "சரி",
    "సరే",
    "ശരി",
)


def classify_feedback_utterance(text: str) -> str:
    """Return VALID | VAGUE | EMPTY."""
    hay = _normalize(text)
    if not hay:
        return "EMPTY"
    if hay in {_normalize(c) for c in _VAGUE_FEEDBACK}:
        return "VAGUE"
    # Any non-empty free-form after first vague ask is accepted as VALID.
    if len(hay) >= 2:
        # Still treat ultra-short acknowledgements as vague.
        if hay in {"k", "kk", "m", "hm", "uh"}:
            return "VAGUE"
        return "VALID"
    return "VAGUE"


def infer_feedback_rating(text: str) -> str | None:
    hay = _normalize(text)
    if not hay:
        return None
    for cue in _POSITIVE_FEEDBACK:
        if _normalize(cue) in hay:
            return "positive"
    for cue in _NEGATIVE_FEEDBACK:
        if _normalize(cue) in hay:
            return "negative"
    return "neutral"
