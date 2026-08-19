"""Transcript quality assessment before intent / RAG / Groq."""

from __future__ import annotations

import re

from backend.services.conversation.types import TranscriptAssessment

_FILLERS = frozenset(
    {
        "uh",
        "um",
        "umm",
        "uhm",
        "er",
        "ah",
        "hmm",
        "hm",
        "mm",
        "mmm",
        "mhm",
        "huh",
        "eh",
        "oh",
        "a",
        "aa",
        "aaa",
        "...",
        "…",
        "yo",
        "ok",
        "okay",
        "ya",
        "yea",
        "yeah",
        "yep",
        "no",
        "nah",
        "background_noise",
        "**background_noise**",
    }
)

# A recognised greeting is a real utterance, not a filler. Without this, short
# greetings score as noise and never reach the greeting policy branch.
GREETING_WORDS = frozenset(
    {
        "hello",
        "hi",
        "hey",
        "namaste",
        "namaskar",
        "namaskara",
        "vanakkam",
        "namaskaram",
        "good morning",
        "good afternoon",
        "good evening",
    }
)

_PARTIAL_TRAILING = re.compile(r"[a-z]{1,3}[-–—]\s*$", re.I)
_ONLY_NON_WORD = re.compile(r"^[\W_]+$", re.UNICODE)
_SYLLABLE_LIKE = re.compile(r"^[a-z]{1,3}$", re.I)


def assess_transcript(raw: str | None) -> TranscriptAssessment:
    text = " ".join(str(raw or "").strip().split())
    lowered = text.lower().strip()

    if not lowered or "background_noise" in lowered.replace("*", ""):
        return TranscriptAssessment(
            confidence=0.0,
            too_short=True,
            likely_noise=True,
            likely_partial=False,
            contains_only_filler=True,
            normalized_text="",
        )

    # Strip trailing ellipsis for filler checks but keep normalized form clean.
    core = lowered.rstrip(".…").strip()
    tokens = [t for t in re.split(r"\s+", core) if t]
    alpha_chars = sum(1 for c in core if c.isalpha())

    if core.rstrip("!?,") in GREETING_WORDS:
        return TranscriptAssessment(
            confidence=0.6,
            too_short=False,
            likely_noise=False,
            likely_partial=False,
            contains_only_filler=False,
            normalized_text=core.rstrip("!?,"),
        )

    too_short = len(core) < 2 or alpha_chars < 2
    only_filler = bool(tokens) and all(
        t.rstrip(".…,!?") in _FILLERS or _ONLY_NON_WORD.match(t) for t in tokens
    )
    single_syllable = len(tokens) == 1 and bool(_SYLLABLE_LIKE.match(tokens[0].rstrip(".…,!?")))
    likely_partial = bool(_PARTIAL_TRAILING.search(text)) or (
        len(tokens) == 1 and len(tokens[0]) <= 3 and tokens[0].rstrip(".…,!?") not in _FILLERS
    )
    likely_noise = only_filler or (too_short and single_syllable) or (
        alpha_chars <= 3 and len(tokens) <= 1
    )

    if only_filler or too_short or (likely_noise and len(tokens) <= 2):
        confidence = 0.05 if only_filler or too_short else 0.2
    elif likely_partial and len(tokens) <= 2:
        confidence = 0.35
    else:
        # Scale gently with usable length; cap at 0.95 (intent layer may raise further).
        confidence = min(0.95, 0.45 + min(len(tokens), 12) * 0.04)

    normalized = " ".join(tokens)
    return TranscriptAssessment(
        confidence=confidence,
        too_short=too_short,
        likely_noise=likely_noise,
        likely_partial=likely_partial,
        contains_only_filler=only_filler,
        normalized_text=normalized,
    )


def needs_speech_retry(assessment: TranscriptAssessment) -> bool:
    if assessment.confidence < 0.35:
        return True
    if assessment.contains_only_filler or assessment.likely_noise:
        return True
    if assessment.too_short and not assessment.normalized_text:
        return True
    return False
