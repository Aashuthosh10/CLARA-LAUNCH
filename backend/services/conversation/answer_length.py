"""Answer length governor for non-presentation receptionist replies.

The same semantic budget applies in every language: 2–4 short sentences.
English word-count is not the canonical measure. Indic scripts are trimmed
by sentence and character, not by space-split tokens.
"""

from __future__ import annotations

import re

_LIMITS = {
    "normal": 100,  # target ~80–120 English words; clamp hard at 120 after soft target
    "unknown": 40,
    "clarification": 20,
    "presentation": None,  # unchanged
}

_HARD_CAP = {
    "normal": 120,
    "unknown": 45,
    "clarification": 25,
}

_SENTENCE_CAP = {
    "normal": 4,
    "unknown": 2,
    "clarification": 1,
}

# Approximate English 2–4 short sentences. Applied to native-script answers
# so they cannot grow longer than the English budget.
_CHAR_CAP = {
    "normal": 480,
    "unknown": 180,
    "clarification": 100,
}

_SENTENCE_SPLIT = re.compile(r"(?<=[.!?।])\s+")


def measure_answer(text: str) -> dict[str, int]:
    s = (text or "").strip()
    words = [w for w in re.split(r"\s+", s) if w]
    sentences = [p for p in _SENTENCE_SPLIT.split(s) if p.strip()]
    if s and not sentences:
        sentences = [s]
    return {
        "characters": len(s),
        "words": len(words),
        "sentences": len(sentences),
    }


def _majority_non_latin(text: str) -> bool:
    non = sum(1 for ch in text if ord(ch) > 127)
    latin = sum(1 for ch in text if "A" <= ch <= "Z" or "a" <= ch <= "z")
    return non > latin


def _sentences(text: str) -> list[str]:
    parts = [p.strip() for p in _SENTENCE_SPLIT.split(text.strip()) if p.strip()]
    return parts or ([text.strip()] if text.strip() else [])


def _cap_sentences(text: str, kind: str) -> str:
    cap = _SENTENCE_CAP.get(kind, _SENTENCE_CAP["normal"])
    parts = _sentences(text)
    if len(parts) <= cap:
        return text.strip()
    return " ".join(parts[:cap]).strip()


def govern_answer_length(text: str, kind: str = "normal") -> str:
    """
    Trim spoken receptionist answers. Never alters presentation narration
    when kind == 'presentation'. Same sentence budget in every language.
    """
    if kind == "presentation":
        return text
    limit = _LIMITS.get(kind, _LIMITS["normal"])
    hard = _HARD_CAP.get(kind, _HARD_CAP["normal"])
    if limit is None:
        return text
    s = (text or "").strip()
    if not s:
        return s
    s = _cap_sentences(s, kind)
    if _majority_non_latin(s):
        char_cap = _CHAR_CAP.get(kind, _CHAR_CAP["normal"])
        if len(s) <= char_cap:
            return s
        clipped = s[:char_cap]
        last_stop = max(clipped.rfind("."), clipped.rfind("!"), clipped.rfind("?"), clipped.rfind("।"))
        if last_stop >= int(char_cap * 0.4):
            return clipped[: last_stop + 1].strip()
        return clipped.rstrip(" ,;:") + ("।" if "।" in s else ".")
    words = s.split()
    if len(words) <= hard:
        return s
    target = limit
    clipped = " ".join(words[:target])
    hard_text = " ".join(words[:hard])
    last_stop = max(hard_text.rfind("."), hard_text.rfind("!"), hard_text.rfind("?"))
    if last_stop >= int(len(hard_text) * 0.4):
        return hard_text[: last_stop + 1].strip()
    return clipped.rstrip(",;:") + "."
