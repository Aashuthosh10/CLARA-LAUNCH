"""Anaphora cues — the only reason a previous turn's entity may enter this turn.

Carrying conversation entities forward unconditionally makes the last department
sticky, so "Who is the HOD?" would silently card the previously discussed
department instead of clarifying. A prior entity is therefore admitted only when
the current utterance actually refers back to something ("its HOD", "ಅದರ ಶುಲ್ಕ").
"""

from __future__ import annotations

from backend.services.content.unicode_text import strip_punctuation_keep_graphemes

# Referring expressions per supported language. Latin cues are matched as whole
# words; native-script cues are matched as substrings because those scripts
# agglutinate the referent ("ಅದರ" + noun).
_LATIN_ANAPHORA: frozenset[str] = frozenset(
    {
        "it",
        "its",
        "it's",
        "they",
        "their",
        "them",
        "there",
        "that",
        "this",
        "these",
        "those",
        "same",
        "adara",
        "adhara",
        "uska",
        "uske",
        "uski",
        "usme",
        "adhan",
        "athan",
        "dani",
        "athinte",
    }
)

_SCRIPT_ANAPHORA: tuple[str, ...] = (
    # Kannada
    "ಅದರ",
    "ಅದೇ",
    "ಅದು",
    # Hindi
    "उसका",
    "उसकी",
    "उसके",
    "उसी",
    "वही",
    # Tamil
    "அதன்",
    "அதே",
    "அது",
    # Telugu
    "దాని",
    "అదే",
    "అది",
    # Malayalam
    "അതിന്റെ",
    "അതേ",
    "അത്",
)


def has_anaphora(raw_text: str) -> bool:
    """True when the utterance refers back to a previously established entity."""
    text = (raw_text or "").strip()
    if not text:
        return False

    if any(cue in text for cue in _SCRIPT_ANAPHORA):
        return True

    folded = strip_punctuation_keep_graphemes(text.lower())
    return any(token in _LATIN_ANAPHORA for token in folded.split())
