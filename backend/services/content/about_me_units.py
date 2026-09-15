"""About Me conversational ContentUnits — creators, guide, overview, capabilities.

About Me frontend remains the content SOURCE. Conversational presentation uses
these stable units through the normal card / narration pipeline (not open_about_me).
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from backend.services.narration_plan import NarrationSegment

SURFACE_ABOUT_ME = "about_me"

# Stable unit IDs (canonical).
UNIT_OVERVIEW = "about_me.overview"
UNIT_GUIDE = "about_me.guide"
CREATOR_UNITS: tuple[tuple[str, str], ...] = (
    ("c1", "about_me.creator.aashuthosh"),
    ("c2", "about_me.creator.adithya_nc"),
    ("c4", "about_me.creator.dhanush_sridhar_babu"),
    ("c5", "about_me.creator.naveen_kumar"),
)
CREATOR_ID_TO_UNIT: dict[str, str] = {cid: uid for cid, uid in CREATOR_UNITS}
CAPABILITY_IDS: tuple[str, ...] = (
    "understand",
    "know",
    "speak",
    "schedule",
    "connect",
    "communicate",
)


@dataclass(frozen=True)
class AboutMeUnitCopy:
    unit_id: str
    card_id: str
    title: str
    summary: str
    tts_text: str


_CREATORS: dict[str, AboutMeUnitCopy] = {
    "about_me.creator.aashuthosh": AboutMeUnitCopy(
        unit_id="about_me.creator.aashuthosh",
        card_id="creator_profile",
        title="A. N. Aashuthosh",
        summary=(
            "AI Backend Systems Engineer. Researched and built the semantic understanding "
            "engine, designing intent classification pipelines, LLM integrations, and "
            "contextual disambiguation models."
        ),
        tts_text=(
            "Meet A. N. Aashuthosh, AI Backend Systems Engineer. He researched and built "
            "CLARA's semantic understanding engine, designing intent classification "
            "pipelines, LLM integrations, and contextual disambiguation models for natural "
            "student-institution conversations."
        ),
    ),
    "about_me.creator.adithya_nc": AboutMeUnitCopy(
        unit_id="about_me.creator.adithya_nc",
        card_id="creator_profile",
        title="Adithya N C",
        summary=(
            "System and UI/UX Engineer. Designed CLARA's visual interface and engineered "
            "robust system interactions for front-desk environments."
        ),
        tts_text=(
            "Meet Adithya N C, System and UI/UX Engineer. He designed CLARA's sleek, "
            "intuitive visual interface and engineered robust system interactions, bridging "
            "complex backend data with a seamless front-desk experience."
        ),
    ),
    "about_me.creator.dhanush_sridhar_babu": AboutMeUnitCopy(
        unit_id="about_me.creator.dhanush_sridhar_babu",
        card_id="creator_profile",
        title="Dhanush Sridhar Babu",
        summary=(
            "Spatial Design and Data Architect. Foundational research, database aggregation, "
            "physical kiosk design, systems integration and interactive navigation."
        ),
        tts_text=(
            "Meet Dhanush Sridhar Babu, Spatial Design and Data Architect. He spearheaded "
            "foundational research and database aggregation, designed the external physical "
            "kiosk, led systems integration, and engineered the interactive navigation system."
        ),
    ),
    "about_me.creator.naveen_kumar": AboutMeUnitCopy(
        unit_id="about_me.creator.naveen_kumar",
        card_id="creator_profile",
        title="M. Naveen Kumar",
        summary=(
            "System Design and Frontend Architect. Core structural design, responsive "
            "frontend components and optimized rendering across kiosk hardware."
        ),
        tts_text=(
            "Meet M. Naveen Kumar, System Design and Frontend Architect. He architected "
            "CLARA's interface structure and developed responsive frontend components with "
            "highly optimized rendering across the kiosk hardware."
        ),
    ),
}

_GUIDE = AboutMeUnitCopy(
    unit_id=UNIT_GUIDE,
    card_id="guide_profile",
    title="Dr. Nagashree N",
    summary=(
        "Project Guide / Academic Mentor, Department of Computer Science and Engineering "
        "(Data Science). Provided foundational academic guidance and rigorous architectural "
        "review for CLARA."
    ),
    tts_text=(
        "Let me introduce my project guide, Dr. Nagashree N, from the Department of "
        "Computer Science and Engineering, Data Science. She provided foundational academic "
        "guidance and rigorous architectural review for CLARA. Her institutional insight "
        "was pivotal in transforming this conceptual intelligence platform into a fully "
        "realized campus assistant."
    ),
)

_OVERVIEW = AboutMeUnitCopy(
    unit_id=UNIT_OVERVIEW,
    card_id="clara_intro",
    title="What is CLARA?",
    summary=(
        "CLARA is an AI-powered campus assistant designed to help students, "
        "parents and visitors find and understand campus information through "
        "natural conversation."
    ),
    tts_text=(
        "CLARA is an AI-powered campus assistant designed to help students, "
        "parents and visitors find and understand campus information through "
        "natural conversation. I can help users explore supported campus "
        "information such as departments, admissions, facilities and other "
        "campus services through conversational interaction and multiple "
        "supported languages."
    ),
)

_CAPABILITIES: dict[str, AboutMeUnitCopy] = {
    "understand": AboutMeUnitCopy(
        unit_id="about_me.capability.understand",
        card_id="clara_capability",
        title="Understand",
        summary="I follow natural-language questions and conversational intent with multi-turn memory.",
        tts_text=(
            "I can understand your questions and conversational intent, with multi-turn "
            "memory and an adaptive tone for campus inquiries."
        ),
    ),
    "know": AboutMeUnitCopy(
        unit_id="about_me.capability.know",
        card_id="clara_capability",
        title="Know",
        summary="I retrieve verified campus knowledge for departments, facilities, and policies.",
        tts_text=(
            "I use campus knowledge to answer questions about departments, facilities, "
            "and institutional information from verified sources."
        ),
    ),
    "speak": AboutMeUnitCopy(
        unit_id="about_me.capability.speak",
        card_id="clara_capability",
        title="Speak",
        summary="I converse in multiple supported languages with spoken replies.",
        tts_text=(
            "I can speak with you in the supported campus languages and narrate answers "
            "clearly through the existing voice system."
        ),
    ),
    "schedule": AboutMeUnitCopy(
        unit_id="about_me.capability.schedule",
        card_id="clara_capability",
        title="Schedule",
        summary="I help with scheduling and time-related campus guidance where supported.",
        tts_text=(
            "I can help with scheduling-related questions and guide you toward the right "
            "campus timing information when it is available."
        ),
    ),
    "connect": AboutMeUnitCopy(
        unit_id="about_me.capability.connect",
        card_id="clara_capability",
        title="Connect",
        summary="I help connect visitors to the right department, faculty, or campus path.",
        tts_text=(
            "I can help connect you to the right people, departments, and campus directions "
            "so you reach what you need faster."
        ),
    ),
    "communicate": AboutMeUnitCopy(
        unit_id="about_me.capability.communicate",
        card_id="clara_capability",
        title="Communicate",
        summary="I support clear live communication for front-desk campus assistance.",
        tts_text=(
            "I support live communication so visitors and students can get clear campus "
            "assistance in a conversational way."
        ),
    ),
}


def _seg(copy: AboutMeUnitCopy, index: int) -> NarrationSegment:
    return NarrationSegment(
        display_text=f"{copy.title}\n{copy.summary}",
        tts_text=copy.tts_text,
        card_index=index,
        card_id=copy.card_id,
        section_id=copy.unit_id,
        unit_id=copy.unit_id,
        canonical_card_id=copy.card_id,
    )


def build_about_me_narration_segments(
    *,
    section: str,
    item_id: str | None = None,
) -> list[NarrationSegment]:
    """Build independently addressable narration segments for conversational About Me."""
    sec = (section or "overview").strip().lower()
    item = (item_id or "").strip() or None

    if sec == "creators":
        if item and item in CREATOR_ID_TO_UNIT:
            uid = CREATOR_ID_TO_UNIT[item]
            return [_seg(_CREATORS[uid], 0)]
        return [_seg(_CREATORS[uid], i) for i, (_cid, uid) in enumerate(CREATOR_UNITS)]

    if sec == "guide":
        return [_seg(_GUIDE, 0)]

    if sec == "capabilities":
        if item and item in _CAPABILITIES:
            return [_seg(_CAPABILITIES[item], 0)]
        return [_seg(_CAPABILITIES[cid], i) for i, cid in enumerate(CAPABILITY_IDS)]

    # overview / default
    return [_seg(_OVERVIEW, 0)]


def about_me_nav_from_session(session: dict[str, Any] | None) -> tuple[str, str | None]:
    raw = (session or {}).get("last_about_me")
    if not isinstance(raw, dict):
        return "overview", None
    section = str(raw.get("section") or "overview").strip() or "overview"
    item = str(raw.get("itemId") or "").strip() or None
    return section, item
