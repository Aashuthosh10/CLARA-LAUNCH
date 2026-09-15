"""About Me conversational navigation — resolve section/item from user text.

Not a second semantic engine: a focused cue matcher used by policy_router,
mirroring restricted_requests / ncc enrollment short-circuits.
"""

from __future__ import annotations

from dataclasses import dataclass

from backend.services.content.semantic_topics import cue_in_hay
from backend.services.content.unicode_text import casefold_keep_scripts

# Canonical navigation targets (frontend About Me cards).
SECTION_OVERVIEW = "overview"
SECTION_CAPABILITIES = "capabilities"
SECTION_CREATORS = "creators"
SECTION_GUIDE = "guide"

# Live capability ids from Card02CapabilitiesMindMap.
CAPABILITY_IDS = frozenset(
    {"understand", "know", "speak", "schedule", "connect", "communicate"}
)

# Active creator ids from CREATORS_FIVE (c3 / Chinmayi intentionally absent).
CREATOR_IDS = frozenset({"c1", "c2", "c4", "c5"})


@dataclass(frozen=True)
class AboutMeNavigation:
    section: str
    item_id: str | None = None
    bridge_key: str = "overview"


def _hay(text: str) -> str:
    return casefold_keep_scripts((text or "").strip())


def _has_self_anchor(hay: str) -> bool:
    """Require CLARA-self reference so campus queries are not stolen."""
    anchors = (
        "yourself",
        "you are",
        "who are you",
        "what are you",
        "who r you",
        "about you",
        "about yourself",
        "your creator",
        "your creators",
        "your guide",
        "your mentor",
        "your feature",
        "your capability",
        "your capabilities",
        "you do",
        "can you do",
        "made you",
        "built you",
        "created you",
        "create you",
        "developed you",
        "behind you",
        "how do you",
        "how can you",
        "what do you do",
        "your",
        "clara",
        "cl ara",
        "क्लारा",
        "ಕ್ಲಾರಾ",
        "க்ளாரா",
        "క్లారా",
        "ക്ലാര",
        # Romanized / regional self asks
        "nivu yaaru",
        "neenu yaaru",
        "ninna bagge",
        "nimmanna",
        "ninna creators",
        "nimma creators",
        "ninna guide",
        "nimma guide",
        "nivu en en",
        "aap kaun",
        "apne baare",
        "aapko kisne",
        "aapke creators",
        "aapke guide",
        "aap kya kya",
        "neenga yaaru",
        "unga pathi",
        "ungalai yaar",
        "unga creators",
        "unga guide",
        "neenga enna",
        "meeru evaru",
        "mee gurinchi",
        "mimmalni evaru",
        "mee creators",
        "mee guide",
        "meeru em",
        "ningal aaranu",
        "ningale kurichu",
        "ningale aaranu",
        "ningalude creators",
        "ningalude guide",
        "ningalkku enthellam",
        "tum kaun",
        "tumhe kisne",
        "aapse",
        # Prompt-required romanized / code-switched creator+guide asks
        "creators yaaru",
        "creators kaun",
        "creators evaru",
        "creators aaranu",
        "guide yaaru",
        "guide kaun",
        "oda creators",
        "yude creators",
        "ke creators",
    )
    return any(cue_in_hay(hay, a) for a in anchors)


def _match_creator(hay: str) -> str | None:
    creators: tuple[tuple[str, tuple[str, ...]], ...] = (
        (
            "c1",
            (
                "aashuthosh",
                "aashutosh",
                "ashuthosh",
                "a n aashuthosh",
                "आशुतोष",
                "ಆಶುತೋಷ್",
            ),
        ),
        (
            "c2",
            (
                "adithya",
                "aditya",
                "adithya n c",
                "aditya n c",
                "ಆದಿತ್ಯ",
                "आदित्य",
            ),
        ),
        (
            "c4",
            (
                "dhanush",
                "dhanush s babu",
                "dhanush babu",
                "ಧನುಷ್",
                "धनुष",
            ),
        ),
        (
            "c5",
            (
                "naveen kumar",
                "m naveen kumar",
                "naveenkumar",
                "naveen",
                "ನವೀನ್",
                "नवीन",
            ),
        ),
    )
    for cid, cues in creators:
        if any(cue_in_hay(hay, c) for c in cues):
            return cid
    return None


def _match_capability(hay: str) -> str | None:
    caps: tuple[tuple[str, tuple[str, ...]], ...] = (
        (
            "understand",
            (
                "understand",
                "understanding",
                "intent",
                "how do you understand",
                "samajh",
                "arthamaad",
                "arthamad",
            ),
        ),
        (
            "know",
            (
                "your knowledge",
                "institutional knowledge",
                "how do you know",
                "knowledge base",
                "rag",
                "grounded information",
            ),
        ),
        (
            "speak",
            (
                "how do you speak",
                "your speech",
                "voice interaction",
                "speech recognition",
                "tts",
                "speak with",
            ),
        ),
        (
            "schedule",
            (
                "scheduling",
                "your scheduling",
                "appointment",
                "appointments",
                "calendar",
                "office hours booking",
                "schedule capability",
            ),
        ),
        (
            "connect",
            (
                "how do you connect",
                "your connect",
                "connect people",
                "reach staff",
                "staff dispatch",
            ),
        ),
        (
            "communicate",
            (
                "communicate",
                "communication",
                "video call",
                "video communication",
                "webrtc",
                "live video",
            ),
        ),
    )
    for cid, cues in caps:
        if any(cue_in_hay(hay, c) for c in cues):
            return cid
    return None


def _is_guide(hay: str) -> bool:
    cues = (
        "your guide",
        "project guide",
        "your mentor",
        "academic mentor",
        "who guided",
        "who is your guide",
        "who is your mentor",
        "tell me about your guide",
        "nagashree",
        "dr nagashree",
        "dr. nagashree",
        "ನಾಗಶ್ರೀ",
        "नागश्री",
        "ninna guide",
        "nimma guide",
        "aapke guide",
        "unga guide",
        "mee guide",
        "ningalude guide",
        "guide yaaru",
        "guide kaun",
        "guide evaru",
        "guide aaranu",
        "academic guidance",
    )
    return any(cue_in_hay(hay, c) for c in cues)


def _is_creators_generic(hay: str) -> bool:
    cues = (
        "who created you",
        "who made you",
        "who built you",
        "who developed you",
        "who engineered you",
        "your creators",
        "who are your creators",
        "who is behind you",
        "who is behind clara",
        "who built clara",
        "who made clara",
        "who created clara",
        "who developed clara",
        "who worked on clara",
        "people behind",
        "honorable creators",
        "ninna creators",
        "nimma creators",
        "nimmanna yaradru create",
        "create madidara",
        "aapko kisne banaya",
        "aapke creators",
        "kisne banaya",
        "ungalai yaar create",
        "unga creators",
        "mimmalni evaru create",
        "mee creators",
        "ningale aaranu create",
        "ningalude creators",
        "create cheythathu",
        "create pannanga",
        "create chesaru",
        # Romanized / code-switched creator asks (with or without CLARA token)
        "creators yaaru",
        "creators kaun",
        "creators evaru",
        "creators aaranu",
        "oda creators",
        "yude creators",
        "ke creators",
        "clara creators",
        "clara ke creators",
        "clara oda creators",
        "clara yude creators",
    )
    return any(cue_in_hay(hay, c) for c in cues)


def _is_capabilities_generic(hay: str) -> bool:
    cues = (
        "what can you do",
        "what are your capabilities",
        "what are your features",
        "show me your capabilities",
        "your features",
        "your capabilities",
        "how can you help",
        "what can clara do",
        "clara capabilities",
        "nivu en en madbahudu",
        "nivu enu madbahudu",
        "aap kya kya kar sakte",
        "aap kya kar sakte",
        "neenga enna panna mudiyum",
        "meeru em cheyyagalaru",
        "ningalkku enthellam",
        "features do you have",
        "clara capabilities",
        "clara features",
        "clara en en capabilities",
        "clara ke kya features",
        "clara oda capabilities",
        "clara ki em features",
        "clara-yude capabilities",
    )
    return any(cue_in_hay(hay, c) for c in cues)


def _is_overview(hay: str) -> bool:
    cues = (
        "who are you",
        "what are you",
        "tell me about yourself",
        "introduce yourself",
        "can you introduce yourself",
        "what is clara",
        "what is cl ara",
        "tell me about clara",
        "about clara",
        "why were you created",
        "why are you here",
        "what do you do",
        "ai receptionist",
        "tell me about this ai",
        "nivu yaaru",
        "ninna bagge heli",
        "aap kaun ho",
        "apne baare mein batao",
        "neenga yaaru",
        "unga pathi sollunga",
        "meeru evaru",
        "mee gurinchi cheppandi",
        "ningal aaranu",
        "ningale kurichu",
        "clara bagge",
        "clara ke baare",
        "clara pathi",
        "clara gurinchi",
        "clara-ne kurichu",
        "clara yaaru",
        "clara kaun",
    )
    return any(cue_in_hay(hay, c) for c in cues)


def resolve_about_me_navigation(
    text: str,
    *,
    last_section: str | None = None,
    last_item_id: str | None = None,
) -> AboutMeNavigation | None:
    """Return About Me navigation when the utterance is clearly about CLARA herself."""
    hay = _hay(text)
    if not hay:
        return None

    # Campus steal guards: strong institutional entities win outside self-anchor.
    campus_blockers = (
        "principal",
        "vice principal",
        "hostel",
        "ncc",
        "bus route",
        "bus routes",
        "admission",
        "admissions",
        "trustee",
        "hod",
        "department of",
        "cse",
        "aiml",
        "ece",
        "mechanical",
        "civil",
        "canteen",
        "fees",
        "documents",
    )
    if any(cue_in_hay(hay, b) for b in campus_blockers):
        return None

    creator_id = _match_creator(hay)
    if creator_id and (_has_self_anchor(hay) or cue_in_hay(hay, "tell me about") or cue_in_hay(hay, "who is")):
        # "Tell me about Dhanush" / "Who is Naveen" during clara context.
        # Alone "who is naveen" without clara context still allowed for known creators
        # because creator names are unique to About Me.
        return AboutMeNavigation(
            section=SECTION_CREATORS,
            item_id=creator_id,
            bridge_key="creator_item",
        )

    if _is_guide(hay) and (_has_self_anchor(hay) or cue_in_hay(hay, "nagashree")):
        return AboutMeNavigation(
            section=SECTION_GUIDE,
            item_id=None,
            bridge_key="guide",
        )

    if _is_creators_generic(hay):
        return AboutMeNavigation(
            section=SECTION_CREATORS,
            item_id=None,
            bridge_key="creators",
        )

    cap_id = _match_capability(hay)
    if cap_id and _has_self_anchor(hay):
        return AboutMeNavigation(
            section=SECTION_CAPABILITIES,
            item_id=cap_id,
            bridge_key="capability_item",
        )

    if _is_capabilities_generic(hay) and _has_self_anchor(hay):
        return AboutMeNavigation(
            section=SECTION_CAPABILITIES,
            item_id=None,
            bridge_key="capabilities",
        )

    if _is_overview(hay):
        return AboutMeNavigation(
            section=SECTION_OVERVIEW,
            item_id=None,
            bridge_key="overview",
        )

    # Follow-ups: "tell me more" / "how does that work" with sticky About Me context.
    follow = (
        "tell me more",
        "how does that work",
        "what did he work",
        "what did she work",
        "more about that",
        "that one",
        "explain that",
    )
    if last_section and any(cue_in_hay(hay, f) for f in follow):
        bridge = {
            SECTION_OVERVIEW: "overview",
            SECTION_CAPABILITIES: "capability_item" if last_item_id else "capabilities",
            SECTION_CREATORS: "creator_item" if last_item_id else "creators",
            SECTION_GUIDE: "guide",
        }.get(last_section, "overview")
        return AboutMeNavigation(
            section=last_section,
            item_id=last_item_id,
            bridge_key=bridge,
        )

    return None


def about_me_ui_action(nav: AboutMeNavigation) -> dict[str, str | None]:
    return {
        "type": "open_about_me",
        "section": nav.section,
        "itemId": nav.item_id,
        # Conversational opens are always chat-originated overlays.
        "entryMode": "chat",
    }
