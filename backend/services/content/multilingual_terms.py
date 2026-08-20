"""Controlled vocabulary for M5.1 semantic topics (small deterministic set)."""

from __future__ import annotations


# Topic families supported by M5.1 unit selector.
TOPIC_OVERVIEW = "overview"
TOPIC_HOD = "hod"
TOPIC_FEES = "fees"
TOPIC_ACHIEVEMENTS = "achievements"
TOPIC_PLACEMENTS = "placements"
TOPIC_PRINCIPAL = "principal"
TOPIC_VICE_PRINCIPAL = "vice_principal"
TOPIC_TRUSTEES = "trustees"


# Achievements cues: answer_generation.extract_features does not expose a dedicated
# boolean feature for achievements/rankings, so we add a small deterministic set.
ACHIEVEMENT_CUES = (
    # English (and common “rankings” phrasing)
    "achievement",
    "achievements",
    "rank",
    "ranking",
    "rankings",
    "ranks",
    # Outcomes phrasing
    "success",
    "outcome",
    "outcomes",
)


# Overview full-department cues (language-independent heuristic).
# We intentionally avoid generic tokens like "overview" / "about" because
# those appear in both “CSE overview” (single) and “Tell me about CSE” (full).
OVERVIEW_FULL_DEPARTMENT_CUES = (
    # English
    "tell",
    "tell me",
    "tell me about",
    "explain",
    "describe",
    "detail",
    "details",
    "say",
    "speak",
    # Kannada (from existing normalize_user_input patterns / overview cues)
    "bagge",
    "helu",
    "heli",
    "elu",
    "eli",
    # Hindi / Hinglish
    "baare",
    "batao",
    "bataye",
    # Tamil
    "pattri",
    "pathi",
    "pati",
    "patthi",
    "patti",
    "tilisi",
    # Telugu
    "gurunchi",
    "gurinchi",
    "kurichu",
    "kurich",
    # Malayalam / common transliterations
    "parayoo",
    "paray",
)


def contains_any_cue(normalized_text: str, cues: tuple[str, ...]) -> bool:
    n = (normalized_text or "").lower()
    return any(cue and cue in n for cue in cues)


def is_full_department_overview_request(*, normalized_text: str) -> bool:
    from backend.services.content.semantic_topics import is_full_department_scope

    return is_full_department_scope(normalized_text)

