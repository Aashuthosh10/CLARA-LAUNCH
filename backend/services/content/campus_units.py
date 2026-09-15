"""Hostel, canteen, NCC, and event ContentUnits (M5.10+).

Hostel canonical units (official):
  hostel.boys.overview, hostel.girls.overview,
  hostel.facilities, hostel.mess, hostel.safety

NCC canonical units (official):
  ncc.overview, ncc.leadership, ncc.training, ncc.benefits

Flagship fest units (official):
  events.sanchalana, events.techvidya, events.sangama,
  events.vignotsava, events.project_expo
"""

from __future__ import annotations

from dataclasses import dataclass

from backend.services.content.placement_units import (
    PLACEMENT_ENTITY,
    PLACEMENT_UNIT_IDS,
    unit_id_for_placement_item,
)
from backend.services.content.semantic_composition import SemanticItem
from backend.services.content.unicode_text import casefold_keep_scripts, latin_token_boundaries_ok

SAMPLE_STATUS = "SAMPLE_REPLACE_WITH_OFFICIAL"

HOSTEL_GIRLS = "hostel.girls"
HOSTEL_BOYS = "hostel.boys"
HOSTEL_SHARED_ENTITY = "hostel"
CANTEEN_ENTITY = "canteen"
NCC_ENTITY = "ncc"
EVENTS_PREFIX = "events."

# Gendered overview topic + shared topics (never duplicated per gender).
HOSTEL_GENDERED_TOPICS: tuple[str, ...] = ("overview", "warden", "rooms")
HOSTEL_SHARED_TOPICS: tuple[str, ...] = ("facilities", "mess", "safety")
HOSTEL_TOPICS: tuple[str, ...] = HOSTEL_GENDERED_TOPICS + HOSTEL_SHARED_TOPICS

HOSTEL_SHARED_UNIT_IDS: tuple[str, ...] = (
    "hostel.facilities",
    "hostel.mess",
    "hostel.safety",
)
HOSTEL_OVERVIEW_UNIT_IDS: tuple[str, ...] = (
    "hostel.boys.overview",
    "hostel.girls.overview",
)
HOSTEL_UNIT_IDS: tuple[str, ...] = HOSTEL_OVERVIEW_UNIT_IDS + HOSTEL_SHARED_UNIT_IDS

HOSTEL_DECK_SUFFIXES: tuple[str, ...] = ("overview", "facilities", "mess", "safety")

CANTEEN_TOPICS: tuple[str, ...] = (
    "overview",
    "food_quality",
    "hygiene",
    "variety",
    "pricing",
    "timings",
    "safety",
)
NCC_TOPICS: tuple[str, ...] = ("overview", "leadership", "training", "benefits", "enrollment")
NCC_CARD_TOPICS: tuple[str, ...] = ("overview", "leadership", "training", "benefits")
NCC_UNIT_IDS: tuple[str, ...] = tuple(f"ncc.{topic}" for topic in NCC_CARD_TOPICS)
NCC_DECK_UNIT_IDS: tuple[str, ...] = (
    "ncc.overview",
    "ncc.leadership",
    "ncc.training",
    "ncc.benefits",
)

EVENTS_ENTITY = "events"
EVENT_IDS: tuple[str, ...] = (
    "sanchalana",
    "techvidya",
    "sangama",
    "vignotsava",
    "project_expo",
)
EVENT_UNIT_IDS: tuple[str, ...] = tuple(f"events.{eid}" for eid in EVENT_IDS)
FEST_DECK_UNIT_IDS: tuple[str, ...] = EVENT_UNIT_IDS
CANTEEN_UNIT_IDS: tuple[str, ...] = tuple(f"canteen.{topic}" for topic in CANTEEN_TOPICS)
CAMPUS_UNIT_IDS: tuple[str, ...] = (
    HOSTEL_UNIT_IDS
    + CANTEEN_UNIT_IDS
    + NCC_UNIT_IDS
    + EVENT_UNIT_IDS
    + PLACEMENT_UNIT_IDS
)

HOSTEL_ENTITIES = frozenset({HOSTEL_GIRLS, HOSTEL_BOYS})
CAMPUS_ENTITIES = (
    HOSTEL_ENTITIES
    | {CANTEEN_ENTITY, NCC_ENTITY, EVENTS_ENTITY, PLACEMENT_ENTITY}
    | frozenset(EVENT_UNIT_IDS)
)


def is_campus_entity(entity: str) -> bool:
    return (entity or "").strip().lower() in CAMPUS_ENTITIES


def is_campus_unit_id(unit_id: str) -> bool:
    return (unit_id or "").strip().lower() in set(CAMPUS_UNIT_IDS)


def is_hostel_shared_unit_id(unit_id: str) -> bool:
    return (unit_id or "").strip().lower() in set(HOSTEL_SHARED_UNIT_IDS)


def is_hostel_overview_unit_id(unit_id: str) -> bool:
    return (unit_id or "").strip().lower() in set(HOSTEL_OVERVIEW_UNIT_IDS)


def is_ncc_unit_id(unit_id: str) -> bool:
    return (unit_id or "").strip().lower() in set(NCC_UNIT_IDS)


def is_ncc_overview_unit_id(unit_id: str) -> bool:
    return (unit_id or "").strip().lower() == "ncc.overview"


def ncc_deck_unit_ids() -> tuple[str, ...]:
    """Fixed overview → leadership → training → benefits."""
    return NCC_DECK_UNIT_IDS


def fest_deck_unit_ids() -> tuple[str, ...]:
    """Fixed flagship fest deck order."""
    return FEST_DECK_UNIT_IDS


def is_fest_deck_entity(entity: str) -> bool:
    return (entity or "").strip().lower() in {EVENTS_ENTITY, "fest", "fests", "festivals"}


def hostel_gender_from_entity(entity: str) -> str | None:
    ent = (entity or "").strip().lower()
    if ent == HOSTEL_BOYS:
        return "boys"
    if ent == HOSTEL_GIRLS:
        return "girls"
    return None


def hostel_deck_unit_ids(gender: str) -> tuple[str, ...]:
    """Fixed boys/girls overview → shared facilities → mess → safety."""
    g = (gender or "").strip().lower()
    if g not in {"boys", "girls"}:
        return ()
    overview = f"hostel.{g}.overview"
    return (overview,) + HOSTEL_SHARED_UNIT_IDS


def unit_id_for_campus_item(entity: str, topic: str) -> str | None:
    ent = (entity or "").strip().lower()
    top = (topic or "").strip().lower() or "overview"
    if ent in HOSTEL_ENTITIES:
        # Alias legacy / follow-up topics onto the five canonical hostel IDs.
        if top in {"food", "dining", "menu", "timings"}:
            top = "mess"
        if top in {"amenities"}:
            top = "facilities"
        if top in {"warden", "rooms"}:
            top = "overview"
        if top in HOSTEL_SHARED_TOPICS:
            uid = f"hostel.{top}"
            return uid if uid in HOSTEL_SHARED_UNIT_IDS else None
        if top != "overview":
            return None
        return f"{ent}.overview"
    if ent == CANTEEN_ENTITY:
        if top == "food":
            top = "food_quality"
        if top == "fees":
            top = "pricing"
        if top == "mess":
            top = "food_quality"
        if top not in CANTEEN_TOPICS:
            return None
        return f"canteen.{top}"
    if ent == NCC_ENTITY:
        if top in {"activities", "activity", "camp", "camps", "drill", "parade"}:
            top = "training"
        if top in {
            "certificate",
            "certificates",
            "b certificate",
            "c certificate",
            "why join",
            "ssb",
        }:
            top = "benefits"
        if top in {
            "ano",
            "caretaker",
            "officer",
            "ncc officer",
            "leadership",
            "gowtham",
        }:
            top = "leadership"
        if top in {"join", "enrol", "enroll", "enrolment", "enrollment", "contact"}:
            top = "enrollment"
        if top == "enrollment":
            return None  # answered via template guidance — no invented contact card
        if top not in NCC_CARD_TOPICS:
            return None
        return f"ncc.{top}"
    if ent == PLACEMENT_ENTITY:
        return unit_id_for_placement_item(ent, top)
    if is_fest_deck_entity(ent):
        # Placeholder first card; unit_selector expands to the fixed fest deck.
        return FEST_DECK_UNIT_IDS[0]
    if ent in EVENT_UNIT_IDS or ent.startswith(EVENTS_PREFIX):
        if ent in EVENT_UNIT_IDS:
            return ent
    return None


# Longer cues first. Gendered hostel phrases beat bare "hostel".
_GIRLS_CUES: tuple[str, ...] = (
    "girls hostel",
    "girl's hostel",
    "girls' hostel",
    "girl hostel",
    "ladies hostel",
    "women's hostel",
    "womens hostel",
    "woman hostel",
    "girls hostal",
    "girls wala",
    "girls one",
    "ಹುಡುಗಿಯರ ಹಾಸ್ಟೆಲ್",
    "ಹುಡುಗಿಯರ ವಸತಿ",
    "ಮಹಿಳಾ ಹಾಸ್ಟೆಲ್",
    "ಗರ್ಲ್ಸ್ ಹಾಸ್ಟೆಲ್",
    "लड़कियों के हॉस्टल",
    "लड़कियों का हॉस्टल",
    "महिला हॉस्टल",
    "गर्ल्स हॉस्टल",
    "பெண்கள் விடுதி",
    "பெண்கள் ஹாஸ்டல்",
    "బాలికల హాస్టల్",
    "ఆడపిల్లల హాస్టల్",
    "గర్ల్స్ హాస్టల్",
    "പെൺകുട്ടികളുടെ ഹോസ്റ്റൽ",
    "ഗേൾസ് ഹോസ്റ്റൽ",
)
_BOYS_CUES: tuple[str, ...] = (
    "boys hostel",
    "boy's hostel",
    "boys' hostel",
    "boy hostel",
    "male hostel",
    "mens hostel",
    "men's hostel",
    "gents hostel",
    "boys hostal",
    "boys wala",
    "boys one",
    "ಹುಡುಗರ ಹಾಸ್ಟೆಲ್",
    "ಹುಡುಗರ ವಸತಿ",
    "ಬಾಯ್ಸ್ ಹಾಸ್ಟೆಲ್",
    "लड़कों के हॉस्टल",
    "लड़कों का हॉस्टल",
    "बॉयज हॉस्टल",
    "ஆண்கள் விடுதி",
    "ஆண்கள் ஹாஸ்டல்",
    "బాలుర హాస్టల్",
    "బాయ్స్ హాస్టల్",
    "ആൺകുട്ടികളുടെ ഹോസ്റ്റൽ",
    "ബോയ്സ് ഹോസ്റ്റൽ",
)
_CANTEEN_CUES: tuple[str, ...] = (
    "college canteen",
    "canteen",
    "cafeteria",
    "ಕ್ಯಾಂಟೀನ್",
    "ಕ್ಯಾಂಟಿನ್",
    "कैंटीन",
    "केन्टीन",
    "கேண்டீன்",
    "కాంటీన్",
    "കാന്റീൻ",
)
_NCC_CUES: tuple[str, ...] = (
    "national cadet corps",
    "ncc wing",
    "ncc unit",
    "ncc at svit",
    "b certificate",
    "c certificate",
    "ncc certificate",
    "ncc officer",
    "ncc caretaker",
    "gowtham b",
    "gowtham",
    "ncc",
    "cadets",
    "cadet",
    "ಎನ್ ಸಿ ಸಿ",
    "ಎನ್‌ಸಿ‌ಸಿ",
    "ಎನ್ಸಿಸಿ",
    "एन सी सी",
    "एनसीसी",
    "என் சி சி",
    "என்சிசி",
    "ఎన్ సి సి",
    "ఎన్సిసి",
    "എൻ സി സി",
    "എൻസിസി",
)
_EVENT_CUES: tuple[tuple[str, str], ...] = (
    ("events.sanchalana", "sanchalana"),
    ("events.sanchalana", "sanchaalana"),
    ("events.sanchalana", "sanchalan"),
    ("events.sanchalana", "ಸಂಚಲನ"),
    ("events.sanchalana", "संचलना"),
    ("events.sanchalana", "संचलन"),
    ("events.sanchalana", "சஞ்சலனா"),
    ("events.sanchalana", "సంచలన"),
    ("events.sanchalana", "സഞ്ചലന"),
    ("events.techvidya", "techvidya"),
    ("events.techvidya", "techvidyaയെ"),
    ("events.techvidya", "tech vidya"),
    ("events.techvidya", "tech-vidya"),
    ("events.techvidya", "techvidhya"),
    ("events.techvidya", "ಟೆಕ್ ವಿದ್ಯಾ"),
    ("events.techvidya", "ಟೆಕ್‌ವಿದ್ಯಾ"),
    ("events.techvidya", "टेक विद्या"),
    ("events.techvidya", "டெக் வித்யா"),
    ("events.techvidya", "టెక్ విద్యా"),
    ("events.techvidya", "ടെക് വിദ്യ"),
    ("events.sangama", "sangama"),
    ("events.sangama", "ಸಂಗಮ"),
    ("events.sangama", "संगम"),
    ("events.sangama", "சங்கம"),
    ("events.sangama", "సంగమ"),
    ("events.sangama", "സംഗമ"),
    ("events.vignotsava", "vignotsava"),
    ("events.vignotsava", "vignotsav"),
    ("events.vignotsava", "vignothsav"),
    ("events.vignotsava", "onam fest"),
    ("events.vignotsava", "onam festival"),
    ("events.vignotsava", "onam celebration"),
    ("events.vignotsava", "ವಿಘ್ನೋತ್ಸವ"),
    ("events.vignotsava", "विघ्नोत्सव"),
    ("events.vignotsava", "விக்னோத்ஸவ"),
    ("events.vignotsava", "విఘ్నోత్సవ"),
    ("events.vignotsava", "വിഘ്നോത്സവ"),
    ("events.project_expo", "project expo"),
    ("events.project_expo", "project exhibition"),
    ("events.project_expo", "projects expo"),
    ("events.project_expo", "ಪ್ರಾಜೆಕ್ಟ್ ಎಕ್ಸ್‌ಪೋ"),
    ("events.project_expo", "ಪ್ರಾಜೆಕ್ಟ್ ಎಕ್ಸ್ಪೋ"),
    ("events.project_expo", "प्रोजेक्ट एक्सपो"),
    ("events.project_expo", "பிராஜெக்ட் எக்ஸ்போ"),
    ("events.project_expo", "ప్రాజెక్ట్ ఎక్స్‌పో"),
    ("events.project_expo", "ప్రాజెక్ట్ ఎక్స్పో"),
    ("events.project_expo", "പ്രോജക്ട് എക്സ്പോ"),
)

_FEST_DECK_CUES: tuple[str, ...] = (
    # English
    "college fests",
    "college fest",
    "college festivals",
    "college festival",
    "institutional fests",
    "institutional fest",
    "flagship events",
    "flagship fests",
    "campus fests",
    "campus fest",
    "campus events",
    "campus event",
    "college events",
    "college event",
    "fests at svit",
    "festivals at svit",
    "svit fests",
    "svit fest",
    "cultural fest",
    "cultural fests",
    "technical fest",
    "technical fests",
    "festivals",
    "festival",
    "fests",
    "fest",
    # Romanized regional
    "college utsav",
    "college utsava",
    "college utsavalu",
    "utsavgalu",
    "utsavagalu",
    "utsav",
    "utsava",
    "fest bagge",
    "fests bagge",
    "fest heli",
    "fests heli",
    "fest ke baare",
    "fests ke baare",
    "fest patri",
    "fests patri",
    "fest gurinchi",
    "fests gurinchi",
    "fest kurichu",
    "fests kurichu",
    # Kannada
    "ಕಾಲೇಜು ಉತ್ಸವಗಳು",
    "ಕಾಲೇಜು ಉತ್ಸವ",
    "ಕಾಲೇಜು ಫೆಸ್ಟ್‌ಗಳು",
    "ಕಾಲೇಜು ಫೆಸ್ಟ್",
    "ಕಾಲೇಜಿನ ಉತ್ಸವಗಳು",
    "ಕಾಲೇಜಿನ ಉತ್ಸವ",
    "ಕ್ಯಾಂಪಸ್ ಉತ್ಸವಗಳು",
    "ಕ್ಯಾಂಪಸ್ ಉತ್ಸವ",
    "ಸಾಂಸ್ಕೃತಿಕ ಉತ್ಸವಗಳು",
    "ಸಾಂಸ್ಕೃತಿಕ ಉತ್ಸವ",
    "ತಾಂತ್ರಿಕ ಉತ್ಸವಗಳು",
    "ತಾಂತ್ರಿಕ ಉತ್ಸವ",
    "ಫೆಸ್ಟ್‌ಗಳು",
    "ಫೆಸ್ಟ್‌ಗಳ ಬಗ್ಗೆ",
    "ಫೆಸ್ಟ್ ಬಗ್ಗೆ",
    "ಉತ್ಸವಗಳ ಬಗ್ಗೆ",
    "ಉತ್ಸವಗಳು",
    "ಉತ್ಸವ",
    "ಫೆಸ್ಟ್",
    # Hindi
    "कॉलेज के उत्सव",
    "कॉलेज उत्सव",
    "कॉलेज फेस्ट",
    "कॉलेज फेस्टिवल",
    "कैंपस उत्सव",
    "कैंपस फेस्ट",
    "सांस्कृतिक उत्सव",
    "तकनीकी उत्सव",
    "उत्सवों के बारे में",
    "फेस्ट के बारे में",
    "उत्सवों",
    "उत्सव",
    "फेस्टिवल",
    "फेस्ट",
    # Tamil
    "கல்லூரி விழாக்கள்",
    "கல்லூரி விழா",
    "கல்லூரி ஃபெஸ்ட்",
    "வளாக விழாக்கள்",
    "வளாக விழா",
    "கலாச்சார விழாக்கள்",
    "கலாச்சார விழா",
    "தொழில்நுட்ப விழாக்கள்",
    "தொழில்நுட்ப விழா",
    "விழாக்கள் பற்றி",
    "விழாக்கள்",
    "விழா",
    "ஃபெஸ்ட்",
    # Telugu
    "కాలేజీ ఉత్సవాలు",
    "కాలేజీ ఉత్సవం",
    "కాలేజీ ఫెస్ట్",
    "క్యాంపస్ ఉత్సవాలు",
    "క్యాంపస్ ఉత్సవం",
    "సాంస్కృతిక ఉత్సవాలు",
    "సాంస్కృతిక ఉత్సవం",
    "సాంకేతిక ఉత్సవాలు",
    "సాంకేతిక ఉత్సవం",
    "ఉత్సవాల గురించి",
    "ఉత్సవాలు",
    "ఉత్సవం",
    "ఫెస్ట్",
    # Malayalam
    "കോളേജ് ഉത്സവങ്ങൾ",
    "കോളേജ് ഉത്സവം",
    "കോളേജ് ഫെസ്റ്റ്",
    "ക്യാമ്പസ് ഉത്സവങ്ങൾ",
    "ക്യാമ്പസ് ഉത്സവം",
    "സാംസ്കാരിക ഉത്സവങ്ങൾ",
    "സാംസ്കാരിക ഉത്സവം",
    "സാങ്കേതിക ഉത്സവങ്ങൾ",
    "സാങ്കേതിക ഉത്സവം",
    "ഉത്സവങ്ങളെ കുറിച്ച്",
    "ഉത്സവങ്ങൾ",
    "ഉത്സവം",
    "ഫെസ്റ്റ്",
)

# Canonical campus topics. Hostel shared topics + canteen topics.
_TOPIC_CUES: tuple[tuple[str, str], ...] = (
    ("facilities", "hostel facilities"),
    ("facilities", "facilities"),
    ("facilities", "amenities"),
    ("facilities", "wifi"),
    ("facilities", "wi-fi"),
    ("facilities", "ಸೌಲಭ್ಯ"),
    ("facilities", "सुविधा"),
    ("facilities", "வசதி"),
    ("facilities", "సౌకర్య"),
    ("facilities", "സൗകര്യ"),
    ("mess", "hostel mess"),
    ("mess", "mess timings"),
    ("mess", "mess food"),
    ("mess", "dining"),
    ("mess", "mess"),
    ("mess", "ಮೆಸ್"),
    ("mess", "मेस"),
    ("mess", "மெஸ்"),
    ("mess", "మెస్"),
    ("mess", "മെസ്"),
    ("food", "hostel food"),
    ("food", "food"),
    ("food", "ಆಹಾರ"),
    ("food", "खाना"),
    ("food", "உணவு"),
    ("food", "ఆహారం"),
    ("food", "ഭക്ഷണം"),
    ("rooms", "how many rooms"),
    ("rooms", "hostel rooms"),
    ("rooms", "rooms"),
    ("rooms", "room"),
    ("rooms", "ಕೊಠಡಿ"),
    ("rooms", "कमरे"),
    ("rooms", "அறைகள்"),
    ("rooms", "గదులు"),
    ("rooms", "മുറികൾ"),
    ("warden", "who is the warden"),
    ("warden", "hostel warden"),
    ("warden", "warden"),
    ("warden", "ವಾರ್ಡನ್"),
    ("warden", "वार्डन"),
    ("warden", "வார்டன்"),
    ("warden", "వార్డెన్"),
    ("warden", "വാർഡൻ"),
    ("warden", "yaaru"),
    ("warden", "yaar"),
    ("warden", "kaun"),
    ("warden", "aara"),
    ("safety", "anti-ragging"),
    ("safety", "anti ragging"),
    ("safety", "hostel safety"),
    ("safety", "safety"),
    ("safety", "security"),
    ("safety", "ಭದ್ರತೆ"),
    ("safety", "सुरक्षा"),
    ("safety", "பாதுகாப்பு"),
    ("safety", "భద్రత"),
    ("safety", "సురക്ഷ"),
    ("training", "ncc training"),
    ("training", "training camps"),
    ("training", "what training"),
    ("training", "training"),
    ("training", "activities"),
    ("training", "activity"),
    ("training", "drill"),
    ("training", "parade"),
    ("training", "camps"),
    ("training", "camp"),
    ("training", "ತರಬೇತಿ"),
    ("training", "ಚಟುವಟಿಕೆ"),
    ("training", "प्रशिक्षण"),
    ("training", "गतिविधि"),
    ("training", "பயிற்சி"),
    ("training", "செயல்பாடு"),
    ("training", "శిక్షణ"),
    ("training", "కార్యకలాప"),
    ("training", "പരിശീലനം"),
    ("training", "പ്രവർത്തന"),
    ("leadership", "ncc leadership"),
    ("leadership", "ncc officer"),
    ("leadership", "caretaker officer"),
    ("leadership", "ncc caretaker"),
    ("leadership", "associate ncc officer"),
    ("leadership", "gowtham b"),
    ("leadership", "gowtham"),
    ("leadership", "ano"),
    ("benefits", "ncc benefits"),
    ("benefits", "why join ncc"),
    ("benefits", "why should i join"),
    ("benefits", "b certificate"),
    ("benefits", "c certificate"),
    ("benefits", "certificates"),
    ("benefits", "certificate"),
    ("benefits", "benefits"),
    ("benefits", "ssb"),
    ("benefits", "ಪ್ರಯೋಜನ"),
    ("benefits", "ಪ್ರಮಾಣಪತ್ರ"),
    ("benefits", "लाभ"),
    ("benefits", "प्रमाणपत्र"),
    ("benefits", "நன்மை"),
    ("benefits", "சான்றிதழ்"),
    ("benefits", "ప్రయోజన"),
    ("benefits", "సర్టిఫికేట్"),
    ("benefits", "ഗുണങ്ങൾ"),
    ("benefits", "സർട്ടിഫിക്കറ്റ്"),
    ("enrollment", "how do i join ncc"),
    ("enrollment", "how to join ncc"),
    ("enrollment", "join ncc"),
    ("enrollment", "ncc enrollment"),
    ("enrollment", "ncc enrolment"),
    ("enrollment", "selection drive"),
    ("enrollment", "selection drives"),
    ("enrollment", "who should i contact for ncc"),
    ("enrollment", "ncc contact"),
    ("enrollment", "how do i join"),
    ("enrollment", "how to join"),
    ("enrollment", "enrollment"),
    ("enrollment", "enrolment"),
    ("enrollment", "enroll"),
    ("enrollment", "enrol"),
    ("enrollment", "ಸೇರುವುದು"),
    ("enrollment", "ದಾಖಲಾತಿ"),
    ("enrollment", "शामिल"),
    ("enrollment", "नामांकन"),
    ("enrollment", "சேர்வது"),
    ("enrollment", "சேர"),
    ("enrollment", "చేరడం"),
    ("enrollment", "నమోదు"),
    ("enrollment", "ചേരുക"),
    ("enrollment", "എൻറോൾ"),
    ("food_quality", "food quality"),
    ("hygiene", "hygiene"),
    ("hygiene", "cleanliness"),
    ("hygiene", "clean"),
    ("hygiene", "ನೈರ್ಮಲ್ಯ"),
    ("hygiene", "ಸ್ವಚ್ಛತೆ"),
    ("hygiene", "स्वच्छता"),
    ("hygiene", "சுகாதாரம்"),
    ("hygiene", "పరిశుభ్రత"),
    ("hygiene", "ശുചിത്വം"),
    ("variety", "variety"),
    ("variety", "menu"),
    ("variety", "ವೈವಿಧ್ಯ"),
    ("variety", "विविधता"),
    ("variety", "வகை"),
    ("variety", "వైవిధ్యం"),
    ("variety", "വൈവിധ്യം"),
    ("pricing", "pricing"),
    ("pricing", "affordable"),
    ("pricing", "price"),
    ("pricing", "ಬೆಲೆ"),
    ("pricing", "कीमत"),
    ("pricing", "விலை"),
    ("pricing", "ధర"),
    ("pricing", "വില"),
    ("timings", "entry and exit"),
    ("timings", "timings"),
    ("timings", "timing"),
    ("timings", "ಸಮಯ"),
    ("timings", "समय"),
    ("timings", "நேரம்"),
    ("timings", "సమయం"),
    ("timings", "സമയം"),
)


@dataclass(frozen=True)
class CampusSpan:
    entity: str
    start: int
    end: int
    family: str


@dataclass(frozen=True)
class CampusTopicSpan:
    topic: str
    start: int
    end: int


def _boundaries_ok(hay: str, start: int, end: int) -> bool:
    return latin_token_boundaries_ok(hay, start, end)


def _consume(hay: str, occupied: list[bool], cues: tuple[str, ...], entity: str, family: str) -> list[CampusSpan]:
    spans: list[CampusSpan] = []
    variants = sorted((casefold_keep_scripts(c) for c in cues if c), key=len, reverse=True)
    for variant in variants:
        if not variant:
            continue
        probe = 0
        while True:
            idx = hay.find(variant, probe)
            if idx < 0:
                break
            end = idx + len(variant)
            if end <= len(occupied) and not any(occupied[idx:end]) and _boundaries_ok(hay, idx, end):
                for i in range(idx, end):
                    occupied[i] = True
                spans.append(CampusSpan(entity=entity, start=idx, end=end, family=family))
                probe = end
            else:
                probe = idx + 1
    return spans


def detect_campus_entity_spans(raw_text: str) -> tuple[CampusSpan, ...]:
    if not raw_text or not isinstance(raw_text, str):
        return ()
    hay = casefold_keep_scripts(raw_text)
    if not hay:
        return ()
    occupied = [False] * len(hay)
    spans: list[CampusSpan] = []
    for unit_id, cue in sorted(_EVENT_CUES, key=lambda p: len(p[1]), reverse=True):
        spans.extend(_consume(hay, occupied, (cue,), unit_id, "event"))
    spans.extend(_consume(hay, occupied, _FEST_DECK_CUES, EVENTS_ENTITY, "fest_deck"))
    spans.extend(_consume(hay, occupied, _GIRLS_CUES, HOSTEL_GIRLS, "hostel"))
    spans.extend(_consume(hay, occupied, _BOYS_CUES, HOSTEL_BOYS, "hostel"))
    spans.extend(_consume(hay, occupied, _CANTEEN_CUES, CANTEEN_ENTITY, "canteen"))
    spans.extend(_consume(hay, occupied, _NCC_CUES, NCC_ENTITY, "ncc"))
    spans.sort(key=lambda s: s.start)
    seen: set[str] = set()
    out: list[CampusSpan] = []
    for span in spans:
        if span.entity in seen:
            continue
        seen.add(span.entity)
        out.append(span)
    return tuple(out)


def detect_campus_topic_spans(raw_text: str) -> tuple[CampusTopicSpan, ...]:
    if not raw_text or not isinstance(raw_text, str):
        return ()
    hay = casefold_keep_scripts(raw_text)
    if not hay:
        return ()
    occupied = [False] * len(hay)
    spans: list[CampusTopicSpan] = []
    variants = sorted(_TOPIC_CUES, key=lambda p: len(p[1]), reverse=True)
    for canonical, cue in variants:
        folded = casefold_keep_scripts(cue)
        if not folded:
            continue
        probe = 0
        while True:
            idx = hay.find(folded, probe)
            if idx < 0:
                break
            end = idx + len(folded)
            if end <= len(occupied) and not any(occupied[idx:end]) and _boundaries_ok(hay, idx, end):
                for i in range(idx, end):
                    occupied[i] = True
                spans.append(CampusTopicSpan(topic=canonical, start=idx, end=end))
                probe = end
            else:
                probe = idx + 1
    spans.sort(key=lambda s: s.start)
    return tuple(spans)


def _distance(a_start: int, a_end: int, b_start: int, b_end: int) -> int:
    if a_end <= b_start:
        return b_start - a_end
    if b_end <= a_start:
        return a_start - b_end
    return 0


def _normalize_topic_for_family(topic: str, family: str) -> str:
    if family == "canteen":
        if topic == "food":
            return "food_quality"
        if topic == "fees":
            return "pricing"
        if topic == "mess":
            return "food_quality"
        if topic in {"facilities", "warden", "rooms"}:
            return "overview"
    if family == "hostel":
        if topic in {"food", "dining", "menu", "timings"}:
            return "mess"
        if topic == "amenities":
            return "facilities"
    if family == "ncc":
        if topic in {"activities", "activity", "camp", "camps", "drill", "parade"}:
            return "training"
        if topic in {
            "certificate",
            "certificates",
            "b certificate",
            "c certificate",
            "why join",
            "ssb",
        }:
            return "benefits"
        if topic in {
            "ano",
            "caretaker",
            "officer",
            "ncc officer",
            "leadership",
            "gowtham",
        }:
            return "leadership"
        if topic in {"join", "enrol", "enroll", "enrolment", "enrollment", "contact"}:
            return "enrollment"
    return topic


def _topic_allowed(topic: str, family: str) -> bool:
    if family == "hostel":
        return topic in HOSTEL_TOPICS
    if family == "canteen":
        return topic in CANTEEN_TOPICS
    if family == "ncc":
        return topic in NCC_TOPICS
    return False


def pair_campus_items(
    *,
    entity_spans: tuple[CampusSpan, ...],
    topic_spans: tuple[CampusTopicSpan, ...],
) -> tuple[SemanticItem, ...]:
    """Bind campus topics to campus entities. Events never take a sibling topic."""
    if not entity_spans:
        return ()

    events = tuple(s for s in entity_spans if s.family == "event")
    fest_deck = tuple(s for s in entity_spans if s.family == "fest_deck")
    bindable = tuple(s for s in entity_spans if s.family not in {"event", "fest_deck"})
    items: list[SemanticItem] = []

    if bindable:
        usable: list[CampusTopicSpan] = []
        for ts in topic_spans:
            if any(_topic_allowed(_normalize_topic_for_family(ts.topic, s.family), s.family) for s in bindable):
                usable.append(ts)
        distinct: list[str] = []
        for ts in usable:
            mapped_any = None
            for ent in bindable:
                mapped = _normalize_topic_for_family(ts.topic, ent.family)
                if _topic_allowed(mapped, ent.family):
                    mapped_any = mapped
                    break
            key = mapped_any or ts.topic
            if key not in distinct:
                distinct.append(key)

        if not distinct:
            items.extend(SemanticItem(entity=s.entity, topic="overview") for s in bindable)
        elif len(distinct) == 1:
            raw_topic = distinct[0]
            for ent in bindable:
                mapped = _normalize_topic_for_family(raw_topic, ent.family)
                if _topic_allowed(mapped, ent.family):
                    items.append(SemanticItem(entity=ent.entity, topic=mapped))
                else:
                    items.append(SemanticItem(entity=ent.entity, topic="overview"))
        elif len(bindable) == 1:
            ent = bindable[0]
            for raw_topic in distinct:
                mapped = _normalize_topic_for_family(raw_topic, ent.family)
                if _topic_allowed(mapped, ent.family):
                    items.append(SemanticItem(entity=ent.entity, topic=mapped))
        elif len(distinct) == len(bindable):
            bound = _bind_campus_proximity(bindable, tuple(usable), distinct)
            if bound:
                items.extend(bound)
            else:
                items.extend(SemanticItem(entity=s.entity, topic="overview") for s in bindable)
        else:
            claimed: set[tuple[str, str]] = set()
            for ts in usable:
                choice = None
                for ent in bindable:
                    mapped = _normalize_topic_for_family(ts.topic, ent.family)
                    if not _topic_allowed(mapped, ent.family):
                        continue
                    dist = _distance(ts.start, ts.end, ent.start, ent.end)
                    cand = (dist, ent.start, ent.entity)
                    if choice is None or cand < choice:
                        choice = cand
                if choice is None:
                    continue
                _, _, entity = choice
                family = next(s.family for s in bindable if s.entity == entity)
                mapped = _normalize_topic_for_family(ts.topic, family)
                key = (entity, mapped)
                if key in claimed:
                    continue
                claimed.add(key)
                items.append(SemanticItem(entity=entity, topic=mapped))
            for ent in bindable:
                if not any(i.entity == ent.entity for i in items):
                    items.append(SemanticItem(entity=ent.entity, topic="overview"))

    items.extend(SemanticItem(entity=s.entity, topic="overview") for s in events)
    if fest_deck and not events:
        # Bare "fests / college events" → full flagship deck once.
        items.extend(SemanticItem(entity=uid, topic="overview") for uid in FEST_DECK_UNIT_IDS)
    elif fest_deck and events:
        # Named events already captured; ignore the generic fest cue.
        pass
    start_of = {s.entity: s.start for s in entity_spans}
    for uid in FEST_DECK_UNIT_IDS:
        start_of.setdefault(uid, fest_deck[0].start if fest_deck else 0)
    items.sort(key=lambda it: start_of.get(it.entity, 0))
    out: list[SemanticItem] = []
    seen: set[tuple[str, str]] = set()
    for item in items:
        key = (item.entity, item.topic)
        if key in seen:
            continue
        seen.add(key)
        out.append(item)
    return tuple(out)


def _bind_campus_proximity(
    entities: tuple[CampusSpan, ...],
    topics: tuple[CampusTopicSpan, ...],
    distinct: list[str],
) -> tuple[SemanticItem, ...] | None:
    best: dict[tuple[str, int], int] = {}
    for topic in distinct:
        for e_index, ent in enumerate(entities):
            mapped = _normalize_topic_for_family(topic, ent.family)
            if not _topic_allowed(mapped, ent.family):
                continue
            distances = [
                _distance(ts.start, ts.end, ent.start, ent.end)
                for ts in topics
                if _normalize_topic_for_family(ts.topic, ent.family) == mapped or ts.topic == topic
            ]
            if distances:
                best[(topic, e_index)] = min(distances)
    unbound_topics = list(enumerate(distinct))
    unbound_entities = list(range(len(entities)))
    bound: list[tuple[int, int]] = []
    while unbound_topics and unbound_entities:
        choice = None
        for t_pos, (t_index, topic) in enumerate(unbound_topics):
            for e_index in unbound_entities:
                dist = best.get((topic, e_index))
                if dist is None:
                    continue
                candidate = (dist, t_index, e_index, t_pos)
                if choice is None or candidate < choice:
                    choice = candidate
        if choice is None:
            return None
        _, t_index, e_index, t_pos = choice
        bound.append((e_index, t_index))
        unbound_topics.pop(t_pos)
        unbound_entities.remove(e_index)
    bound.sort(key=lambda p: entities[p[0]].start)
    items: list[SemanticItem] = []
    for e_index, t_index in bound:
        ent = entities[e_index]
        mapped = _normalize_topic_for_family(distinct[t_index], ent.family)
        if not _topic_allowed(mapped, ent.family):
            mapped = "overview"
        items.append(SemanticItem(entity=ent.entity, topic=mapped))
    return tuple(items)


def campus_items_from_text(raw_text: str) -> tuple[SemanticItem, ...]:
    entities = detect_campus_entity_spans(raw_text)
    if not entities:
        return ()
    topics = detect_campus_topic_spans(raw_text)
    return pair_campus_items(entity_spans=entities, topic_spans=topics)


def hostel_followup_items_from_sticky(
    raw_text: str,
    *,
    last_hostel_gender: str | None,
) -> tuple[SemanticItem, ...]:
    """Bind mess/facilities/safety/warden follow-ups to sticky boys/girls gender."""
    gender = (last_hostel_gender or "").strip().lower()
    if gender not in {"boys", "girls"}:
        return ()
    if detect_campus_entity_spans(raw_text):
        return ()
    topics = detect_campus_topic_spans(raw_text)
    hostel_topics = []
    for ts in topics:
        mapped = _normalize_topic_for_family(ts.topic, "hostel")
        if mapped in HOSTEL_TOPICS and mapped not in hostel_topics:
            hostel_topics.append(mapped)
    if not hostel_topics:
        return ()
    entity = HOSTEL_BOYS if gender == "boys" else HOSTEL_GIRLS
    return tuple(SemanticItem(entity=entity, topic=t) for t in hostel_topics)


def ncc_followup_items_from_sticky(
    raw_text: str,
    *,
    last_ncc_active: bool,
) -> tuple[SemanticItem, ...]:
    """Bind training/benefits/enrollment follow-ups while NCC context is sticky."""
    if not last_ncc_active:
        return ()
    if detect_campus_entity_spans(raw_text):
        return ()
    topics = detect_campus_topic_spans(raw_text)
    ncc_topics: list[str] = []
    for ts in topics:
        mapped = _normalize_topic_for_family(ts.topic, "ncc")
        if mapped in NCC_TOPICS and mapped not in ncc_topics:
            ncc_topics.append(mapped)
    if not ncc_topics:
        return ()
    return tuple(SemanticItem(entity=NCC_ENTITY, topic=t) for t in ncc_topics)


def is_ncc_enrollment_items(items: tuple[tuple[str, str], ...] | tuple[SemanticItem, ...]) -> bool:
    """True when the only campus ask is NCC enrollment/contact (no invented card)."""
    if not items:
        return False
    normalized: list[tuple[str, str]] = []
    for item in items:
        if isinstance(item, SemanticItem):
            normalized.append((item.entity, item.topic))
        else:
            normalized.append((str(item[0]), str(item[1])))
    if len(normalized) != 1:
        return False
    ent, top = normalized[0]
    return ent.strip().lower() == NCC_ENTITY and top.strip().lower() == "enrollment"


_BARE_HOSTEL_CUES: tuple[str, ...] = (
    "hostel",
    "hostal",
    "ಹಾಸ್ಟೆಲ್",
    "ವಸತಿ ನಿಲಯ",
    "हॉस्टल",
    "हॉस्टेल",
    "விடுதி",
    "ஹாஸ்டல்",
    "హాస్టల్",
    "ഹോസ്റ്റൽ",
)


def is_bare_hostel_request(raw_text: str) -> bool:
    """True when the user mentioned a hostel but not girls vs boys."""
    if detect_campus_entity_spans(raw_text):
        return False
    hay = casefold_keep_scripts(raw_text or "")
    if not hay:
        return False
    return any(casefold_keep_scripts(cue) in hay for cue in _BARE_HOSTEL_CUES if cue)


def detect_hostel_gender_answer(raw_text: str) -> str | None:
    """Resolve a short clarification answer to boys|girls."""
    hay = casefold_keep_scripts(raw_text or "").strip()
    if not hay:
        return None
    # Prefer longer gendered hostel phrases, then bare gender tokens.
    for cue in sorted(_GIRLS_CUES, key=len, reverse=True):
        if casefold_keep_scripts(cue) in hay:
            return "girls"
    for cue in sorted(_BOYS_CUES, key=len, reverse=True):
        if casefold_keep_scripts(cue) in hay:
            return "boys"
    tokens = set(hay.replace("'", " ").replace("-", " ").split())
    girls_tokens = {
        "girls", "girl", "ladies", "women", "woman", "female",
        "hudugiyaru", "hudugi", "garls", "girlsone", "ladki", "ladkiyan", "ladkiyon",
        "penngal", "penn", "balikala",
        "ಗರ್ಲ್ಸ್", "ಹುಡುಗಿಯರ", "ಹುಡುಗಿಯರು", "ಲಡಕಿಯರ",
        "लड़कियों", "लड़कियाँ", "गर्ल्स",
        "பெண்கள்", "బాలికల", "ഗേൾസ്", "പെൺകുട്ടികൾ",
    }
    boys_tokens = {
        "boys", "boy", "gents", "men", "man", "male",
        "hudugaru", "huduga", "boysone", "ladke", "ladkon", "ladkonka",
        "aanugal", "balura",
        "ಬಾಯ್ಸ್", "ಹುಡುಗರ", "ಹುಡುಗರು",
        "लड़कों", "लड़के", "बॉयज",
        "ஆண்கள்", "బాయ్స్", "ബോയ്സ്", "ആൺകുട്ടികൾ",
    }
    if tokens & girls_tokens and not (tokens & boys_tokens):
        return "girls"
    if tokens & boys_tokens and not (tokens & girls_tokens):
        return "boys"
    return None
