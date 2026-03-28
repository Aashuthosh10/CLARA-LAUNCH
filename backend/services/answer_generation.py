"""
CLARA answer generation: intent detection, context selection, two-phase overview generation,
structured prompt building, and Digital Book page building with TTS for overview.
"""

import json
import logging
import re
from pathlib import Path
from typing import Any, Callable, List

# Digital Book: 5 content sections (Closing Assurance excluded). Same order as prompt.
DIGITAL_BOOK_SECTION_TITLES = [
    "About the Institution",
    "Academic Programs",
    "Quality & Infrastructure",
    "Achievements & Recognition",
    "Placement & Career Support",
]
DIGITAL_BOOK_COVER_TITLE = "Cover"
DIGITAL_BOOK_COVER_TEXT = "Institution Overview"

from backend.config.settings import RAG_MAX_TOKENS, RAG_TOP_K
from backend.core.rag import get_relevant_context
from backend.clients.provider_clients import get_groq_client

logger = logging.getLogger(__name__)

_LOCALES_DIR = Path(__file__).resolve().parent.parent / "data" / "locales"
_locale_data_cache: dict[str, dict[str, Any]] = {}

# Same order as frontend DEPARTMENT_JSON_KEY_ORDER (kiosk HOD / summary cards).
DEPARTMENT_JSON_KEY_ORDER: tuple[str, ...] = (
    "cse",
    "ise",
    "cse_aiml",
    "cse_ds",
    "cse_cysec",
    "cse_bs",
    "ece",
    "civil",
    "mechanical",
    "mba",
    "basic_sciences",
)

# Maps detect_department_name() canonical labels to locale JSON department keys.
_CANONICAL_DEPARTMENT_TO_JSON_KEY: dict[str, str] = {
    "CSE": "cse",
    "ISE": "ise",
    "CSE (AI & ML)": "cse_aiml",
    "CSE (Data Science)": "cse_ds",
    "CSE (Cyber Security)": "cse_cysec",
    "CSE (Business Systems)": "cse_bs",
    "ECE": "ece",
    "Civil": "civil",
    "Mechanical": "mechanical",
    "MBA": "mba",
    "Basic Sciences": "basic_sciences",
}


def locale_file_id_for_lang_key(lang_key: str | None) -> str:
    """Which locale JSON file to load: hi.json for Hindi session, else en.json."""
    return "hi" if (lang_key or "").strip().lower() == "hi" else "en"


def load_locale_data_for_lang_key(lang_key: str | None) -> dict[str, Any]:
    """Load parsed en.json or hi.json (cached)."""
    locale = locale_file_id_for_lang_key(lang_key)
    if locale in _locale_data_cache:
        return _locale_data_cache[locale]
    path = _LOCALES_DIR / f"{locale}.json"
    if not path.is_file():
        if locale != "en":
            path = _LOCALES_DIR / "en.json"
        if not path.is_file():
            logger.warning("Narrator: locale file missing under %s", _LOCALES_DIR)
            _locale_data_cache[locale] = {}
            return {}
    try:
        raw = path.read_text(encoding="utf-8")
        data = json.loads(raw)
        if not isinstance(data, dict):
            _locale_data_cache[locale] = {}
            return {}
        _locale_data_cache[locale] = data
        return data
    except Exception as exc:
        logger.warning("Narrator: could not load %s: %s", path, exc)
        _locale_data_cache[locale] = {}
        return {}


def department_label_to_json_key(label: str | None) -> str:
    if not label or not isinstance(label, str):
        return "cse"
    stripped = label.strip()
    if stripped in _CANONICAL_DEPARTMENT_TO_JSON_KEY:
        return _CANONICAL_DEPARTMENT_TO_JSON_KEY[stripped]
    low = stripped.lower()
    for canon, jkey in _CANONICAL_DEPARTMENT_TO_JSON_KEY.items():
        if canon.lower() == low:
            return jkey
    return "cse"


def _wants_all_departments_narration(user_text: str) -> bool:
    n = _normalize_text(user_text)
    if not n:
        return False
    return any(
        p in n
        for p in (
            "all department",
            "all departments",
            "every department",
            "each department",
            "list department",
            "list departments",
            "all branches",
            "every branch",
        )
    )


def _hod_slice_for_narrator(dept: Any) -> dict[str, Any]:
    if not isinstance(dept, dict):
        return {}
    out: dict[str, Any] = {}
    for k in ("name", "hod", "intake", "duration", "overview_and_focus"):
        if k in dept and dept[k] is not None:
            v = dept[k]
            if k == "faculty_list" or isinstance(v, (list, dict)):
                continue
            out[k] = v
    fl = dept.get("faculty_list")
    if isinstance(fl, list) and fl:
        out["faculty_highlights"] = fl[:8]
    return out


def build_target_card_payload(
    intent: str,
    *,
    lang_key: str | None,
    detected_department_label: str | None,
    user_text: str,
) -> dict[str, Any] | None:
    """
    Build the exact locale JSON slice the kiosk UI uses for this card intent.
    Returns None if intent is not a narrator intent.
    """
    if not is_narrator_intent(intent):
        return None
    data = load_locale_data_for_lang_key(lang_key)
    if not data:
        return {
            "presentation_type": intent.lower(),
            "locale": locale_file_id_for_lang_key(lang_key),
            "note": "Campus knowledge file unavailable; keep reply very brief and suggest Admission Block.",
        }

    locale_id = locale_file_id_for_lang_key(lang_key)
    deps = data.get("departments")
    if not isinstance(deps, dict):
        deps = {}

    if intent == INTENT_COLLEGE_OVERVIEW:
        return {
            "presentation_type": "college_overview",
            "locale": locale_id,
            "institution_overview": data.get("institution_overview"),
            "leadership": data.get("leadership"),
        }

    if intent == INTENT_DEPARTMENT_OVERVIEW:
        if _wants_all_departments_narration(user_text):
            ordered: dict[str, Any] = {}
            for k in DEPARTMENT_JSON_KEY_ORDER:
                if k in deps and isinstance(deps[k], dict):
                    ordered[k] = _hod_slice_for_narrator(deps[k])
            return {
                "presentation_type": "all_departments_overview",
                "locale": locale_id,
                "departments": ordered,
            }
        jkey = department_label_to_json_key(detected_department_label)
        dept = deps.get(jkey)
        return {
            "presentation_type": "single_department_overview",
            "locale": locale_id,
            "department_key": jkey,
            "department": _hod_slice_for_narrator(dept) if isinstance(dept, dict) else {},
        }

    if intent == INTENT_ADMISSIONS:
        return {
            "presentation_type": "admissions_and_fees",
            "locale": locale_id,
            "admissions_and_fees": data.get("admissions_and_fees"),
        }

    if intent == INTENT_PLACEMENTS:
        return {
            "presentation_type": "placements_and_training",
            "locale": locale_id,
            "placements_and_training": data.get("placements_and_training"),
        }

    if intent == INTENT_HOD_PROFILE:
        hod_rows: dict[str, Any] = {}
        for k in DEPARTMENT_JSON_KEY_ORDER:
            d = deps.get(k)
            if isinstance(d, dict):
                hod_rows[k] = {
                    "name": d.get("name"),
                    "hod": d.get("hod"),
                    "intake": d.get("intake"),
                }
        return {
            "presentation_type": "hod_overview",
            "locale": locale_id,
            "hod_by_department": hod_rows,
        }

    if intent == INTENT_TRUSTEES_PROFILE:
        return {
            "presentation_type": "leadership_trustees",
            "locale": locale_id,
            "leadership": data.get("leadership"),
        }

    if intent == INTENT_HOD_TRUSTEES_PROFILE:
        hod_rows_b: dict[str, Any] = {}
        for k in DEPARTMENT_JSON_KEY_ORDER:
            d = deps.get(k)
            if isinstance(d, dict):
                hod_rows_b[k] = {
                    "name": d.get("name"),
                    "hod": d.get("hod"),
                    "intake": d.get("intake"),
                }
        return {
            "presentation_type": "hod_and_trustees",
            "locale": locale_id,
            "hod_by_department": hod_rows_b,
            "leadership": data.get("leadership"),
        }

    return None


def build_narrator_system_prompt(language_name: str, target_card_data_json: str) -> str:
    """
    Strict narrator instructions: conversational script aligned with on-screen card data.
    target_card_data_json should be pretty-printed JSON the model can read but must not recite verbatim.
    """
    return (
        f"You are CLARA, an AI tour guide for Sai Vidya Institute of Technology (SVIT). "
        f"Reply only in {language_name}.\n\n"
        "The visitor is looking at an on-screen visual presentation. "
        "The slides are built from the following structured campus data (TARGET_CARD_DATA). "
        "This is the ONLY source of facts you may use for this turn.\n\n"
        "TARGET_CARD_DATA (JSON):\n"
        f"{target_card_data_json}\n\n"
        "Rules:\n"
        "- Your job is to NARRATE this information naturally, like a human guide—not like a Q&A bot reading a database.\n"
        "- Do NOT read raw JSON keys, field names, snake_case, or bracketed citation tags aloud.\n"
        "- Do NOT say things like 'HOD colon' or list labels; weave facts into full sentences.\n"
        "- Example style: instead of 'HOD: Dr. Smith. Intake: 120', say the department is led by Dr. Smith and takes about a hundred twenty students each year.\n"
        "- Follow the flow of the data: introduce the topic, highlight one or two key numbers or facts, mention people or focus areas where it helps.\n"
        "- Keep the script to 3 or 4 short sentences maximum so the audio paces well with a short multi-slide presentation.\n"
        "- Plain text only. No markdown, no bullet points, no numbered lists.\n"
        "- If TARGET_CARD_DATA is empty or missing detail, give one short sentence and suggest visiting the Admission Block or the relevant office.\n"
    )


MULTI_ENTITY_RULE = (
    "If the user asks multiple distinct questions or about multiple distinct entities in a single sentence "
    "(for example, two different departments), you MUST provide a complete answer for ALL of them "
    "based strictly on the provided context."
)
CONCISE_VOICE_RULE = (
    "You are CLARA, a sweet, helpful, and highly direct AI assistant for SVIT. "
    "CRITICAL: Your responses MUST be extremely concise, punchy, and conversational. Maximum 2 to 3 short sentences. "
    "Do NOT output long lists, bullet points, or markdown formatting. "
    "If the user asks for fees or specific details, extract ONLY the exact number/fact from the context and deliver it immediately. "
    "Tone: Warm, direct, and highly impactful."
)


def rag_language_enforcement_directive(language_name: str) -> str:
    """Strict single-language reply when using RAG context (voice/chat, non-card narrator)."""
    return (
        f"CRITICAL: You MUST answer the user's query entirely in {language_name}. "
        f"Use the provided context, which is already translated into {language_name}, to form your answer. "
        "Do not mix languages unless citing a specific technical English term like 'CSE' or 'KCET'."
    )


def multilingual_rag_reply_directive(language_name: str) -> str:
    """When retrieval used English chunks but the session speaks another language."""
    return (
        f"Answer this query naturally in conversational {language_name}. "
        "The college reference below is in English; use it only for verified facts and respond entirely "
        f"in {language_name}. Do not mix languages except for standard abbreviations like CSE or KCET."
    )


INTENT_COLLEGE_OVERVIEW = "COLLEGE_OVERVIEW"
INTENT_COURSE_MENU = "COURSE_MENU"
INTENT_DEPARTMENT_OVERVIEW = "DEPARTMENT_OVERVIEW"
INTENT_ADMISSIONS = "ADMISSIONS"
INTENT_PLACEMENTS = "PLACEMENTS"
INTENT_HOD_PROFILE = "HOD_PROFILE"
INTENT_TRUSTEES_PROFILE = "TRUSTEES_PROFILE"
INTENT_HOD_TRUSTEES_PROFILE = "HOD_TRUSTEES_PROFILE"
INTENT_NORMAL_QUERY = "NORMAL_QUERY"

NARRATOR_INTENTS: frozenset[str] = frozenset(
    {
        INTENT_COLLEGE_OVERVIEW,
        INTENT_DEPARTMENT_OVERVIEW,
        INTENT_ADMISSIONS,
        INTENT_PLACEMENTS,
        INTENT_HOD_PROFILE,
        INTENT_TRUSTEES_PROFILE,
        INTENT_HOD_TRUSTEES_PROFILE,
    }
)


def is_narrator_intent(intent: str) -> bool:
    """True when the voice turn should use presentation narrator mode (locale JSON only, no RAG)."""
    return intent in NARRATOR_INTENTS


COURSE_MENU_OPTIONS = [
    "CSE",
    "ISE",
    "CSE (AI & ML)",
    "CSE (Data Science)",
    "CSE (Cyber Security)",
    "CSE (Business Systems)",
    "ECE",
    "Civil",
    "Mechanical",
    "MBA",
    "Basic Sciences",
]

COURSE_MENU_SPOKEN_PROMPT_BY_LANGUAGE: dict[str, str] = {
    "English": "Here are the departments available at our college. Please select one.",
    "Kannada": "ನಮ್ಮ ಕಾಲೇಜಿನಲ್ಲಿ ಲಭ್ಯವಿರುವ ವಿಭಾಗಗಳು ಇಲ್ಲಿವೆ. ದಯವಿಟ್ಟು ಒಂದನ್ನು ಆಯ್ಕೆಮಾಡಿ.",
    "Hindi": "हमारे कॉलेज में उपलब्ध विभाग यहां हैं। कृपया एक चुनें।",
    "Tamil": "எங்கள் கல்லூரியில் உள்ள துறைகள் இங்கே உள்ளன. தயவுசெய்து ஒன்றைத் தேர்வு செய்யுங்கள்.",
    "Telugu": "మా కాలేజీలో అందుబాటులో ఉన్న విభాగాలు ఇవి. దయచేసి ఒకదాన్ని ఎంచుకోండి.",
    "Malayalam": "ഞങ്ങളുടെ കോളേജിലെ ലഭ്യമായ വിഭാഗങ്ങൾ ഇതാ. ദയവായി ഒന്ന് തിരഞ്ഞെടുക്കൂ.",
}

SUPPORTED_LANGUAGES = ("English", "Kannada", "Hindi", "Tamil", "Telugu", "Malayalam")
UNAVAILABLE_REPLY_BY_LANGUAGE: dict[str, str] = {
    "English": "Happy to help. For the most accurate details, please meet our Admission Block team for complete guidance.",
    "Kannada": "ಸಹಾಯ ಮಾಡಲು ಸಂತೋಷ. ಅತ್ಯಂತ ನಿಖರ ಮಾಹಿತಿಗಾಗಿ ದಯವಿಟ್ಟು ಅಡ್ಮಿಷನ್ ಬ್ಲಾಕ್ ತಂಡವನ್ನು ಭೇಟಿ ಮಾಡಿ.",
    "Hindi": "मदद करके खुशी होगी। सबसे सटीक जानकारी के लिए कृपया एडमिशन ब्लॉक टीम से मिलें।",
    "Tamil": "உதவுவதில் மகிழ்ச்சி. மிகத் துல்லியமான தகவல்களுக்கு தயவுசெய்து அட்மிஷன் ப்ளாக் குழுவைச் சந்திக்கவும்.",
    "Telugu": "సహాయం చేయడం ఆనందంగా ఉంది. అత్యంత ఖచ్చితమైన వివరాల కోసం దయచేసి అడ్మిషన్ బ్లాక్ టీంను కలవండి.",
    "Malayalam": "സഹായിക്കാൻ സന്തോഷം. ഏറ്റവും കൃത്യമായ വിവരങ്ങൾക്ക് ദയവായി അഡ്മിഷൻ ബ്ലോക്ക് ടീമിനെ സമീപിക്കുക.",
}
OFF_TOPIC_REPLY_BY_LANGUAGE: dict[str, str] = {
    "English": (
        "I can help with SVIT-related queries only, such as admissions, fees, departments, placements, and campus details. "
        "For further guidance, please meet our Admission Block team."
    ),
    "Kannada": (
        "ನಾನು SVIT ಸಂಬಂಧಿತ ಪ್ರಶ್ನೆಗಳಿಗೆ ಮಾತ್ರ ಸಹಾಯ ಮಾಡುತ್ತೇನೆ (ಅಡ್ಮಿಷನ್, ಶುಲ್ಕ, ವಿಭಾಗಗಳು, ಪ್ಲೇಸ್‌ಮೆಂಟ್, ಕ್ಯಾಂಪಸ್). "
        "ಹೆಚ್ಚಿನ ಮಾರ್ಗದರ್ಶನಕ್ಕಾಗಿ ದಯವಿಟ್ಟು ಅಡ್ಮಿಷನ್ ಬ್ಲಾಕ್ ತಂಡವನ್ನು ಭೇಟಿ ಮಾಡಿ."
    ),
    "Hindi": (
        "मैं केवल SVIT से संबंधित प्रश्नों में मदद कर सकती हूँ (एडमिशन, फीस, विभाग, प्लेसमेंट, कैंपस)। "
        "अधिक मार्गदर्शन के लिए कृपया एडमिशन ब्लॉक टीम से मिलें।"
    ),
    "Tamil": (
        "நான் SVIT தொடர்பான கேள்விகளுக்கே உதவ முடியும் (அட்மிஷன், கட்டணம், துறைகள், ப்ளேஸ்மென்ட், வளாகம்). "
        "மேலும் வழிகாட்டலுக்கு தயவுசெய்து அட்மிஷன் ப்ளாக் குழுவைச் சந்திக்கவும்."
    ),
    "Telugu": (
        "నేను SVIT‌కు సంబంధించిన ప్రశ్నలకు మాత్రమే సహాయం చేయగలను (అడ్మిషన్, ఫీజులు, విభాగాలు, ప్లేస్‌మెంట్స్, క్యాంపస్). "
        "మరింత మార్గదర్శకత్వం కోసం దయచేసి అడ్మిషన్ బ్లాక్ టీంను కలవండి."
    ),
    "Malayalam": (
        "ഞാൻ SVIT സംബന്ധമായ ചോദ്യങ്ങൾക്കാണ് സഹായിക്കുക (അഡ്മിഷൻ, ഫീസ്, വിഭാഗങ്ങൾ, പ്ലേസ്മെന്റ്, ക്യാമ്പസ്). "
        "കൂടുതൽ മാർഗനിർദേശത്തിന് ദയവായി അഡ്മിഷൻ ബ്ലോക്ക് ടീമിനെ സമീപിക്കുക."
    ),
}


def _assert_language_parity(mapping: dict[str, Any], mapping_name: str) -> None:
    missing = [lang for lang in SUPPORTED_LANGUAGES if lang not in mapping]
    if missing:
        raise RuntimeError(f"{mapping_name} missing translations: {', '.join(missing)}")


_assert_language_parity(COURSE_MENU_SPOKEN_PROMPT_BY_LANGUAGE, "COURSE_MENU_SPOKEN_PROMPT_BY_LANGUAGE")
_assert_language_parity(UNAVAILABLE_REPLY_BY_LANGUAGE, "UNAVAILABLE_REPLY_BY_LANGUAGE")
_assert_language_parity(OFF_TOPIC_REPLY_BY_LANGUAGE, "OFF_TOPIC_REPLY_BY_LANGUAGE")

COLLEGE_RELATED_NORMAL_QUERY_KEYWORDS = [
    "admission",
    "admissions",
    "apply",
    "application",
    "eligibility",
    "cutoff",
    "cut-off",
    "fee",
    "fees",
    "hostel",
    "placement",
    "placements",
    "department",
    "departments",
    "course",
    "courses",
    "faculty",
    "syllabus",
    "exam",
    "semester",
    "campus",
    "college",
    "institute",
    "svit",
]

OVERVIEW_CONTEXT_MAX_TOKENS = 1000
OVERVIEW_TOP_K = 10
MODEL_CONTEXT_LIMIT = 128_000
MAX_INPUT_TOKEN_FRACTION = 0.7
GROQ_TEMPERATURE = 0.1
GROQ_TOP_P = 0.3
GROQ_MAX_TOKENS = 400

# Fixed query to retrieve overview-oriented chunks (establishment, affiliation, NAAC, programs, etc.)
OVERVIEW_QUERY = (
    "college overview establishment year affiliation VTU AICTE NAAC NBA location campus "
    "programs CSE AI ML data science ECE MBA achievements rankings infrastructure placement"
)

# Overview intent: English and regional phrases (college overview, brief about college, about SVIT, etc.)
OVERVIEW_KEYWORDS_EN = [
    "college overview",
    "brief about the college",
    "about svit",
    "college information",
    "overview of the college",
    "tell me about the college",
    "tell me about this college",
    "about this college",
    "institute overview",
    "about the college",
    "college brief",
    "overview of college",
    "information about college",
    "about the institute",
    "college details",
    "details about college",
    "tell me about svit college",
    "about your college",
    "college profile",
    "college summary",
    "college intro",
    "overview about college",
]
COLLEGE_ENTITY_KEYWORDS = [
    "college",
    "clg",
    "colg",
    "institute",
    "institution",
    "university",
    "campus",
    "svit",
    "sai vidya",
]

OVERVIEW_CUE_KEYWORDS = [
    "overview",
    "about",
    "information",
    "info",
    "details",
    "detail",
    "brief",
    "summary",
    "profile",
    "introduction",
    "history",
    "background",
    "tell",
    "explain",
    "describe",
    "say",
    "speak",
    "bagge",
    "baare",
    "pattri",
    "pathi",
    "pati",
    "patthi",
    "patti",
    "gurunchi",
    "gurinchi",
    "kurichu",
    "kurich",
    "helu",
    "heli",
    "elu",
    "eli",
    "tilisi",
    "batao",
    "bataye",
    "batayiye",
    "bolo",
    "sollu",
    "sollunga",
    "cholu",
    "chollu",
    "solu",
    "cholunga",
    "sol",
    "solunga",
    "vivara",
    "vivaralu",
    "maahiti",
    "samacharam",
    "cheppu",
    "cheppandi",
    "chepandi",
    "parayu",
    "parayoo",
    "vivaram",
]

COURSE_MENU_KEYWORDS_EN = [
    "what courses are available",
    "what courses do you have",
    "which course is available",
    "which courses are available",
    "which courses",
    "courses available",
    "courses in college",
    "show branches",
    "show courses",
    "list programs",
    "list courses",
    "list of courses",
    "what departments does the college have",
    "what departments are there",
    "what departments",
    "programs available",
    "courses offered",
    "branches available",
]

FEE_QUERY_KEYWORDS = [
    "fee",
    "fees",
    "fee structure",
    "tuition",
    "cost",
    "price",
    "how much",
    "amount",
    "management quota",
    "estu",
    "yestu",
    "eshtu",
    "kitna",
    "evvalavu",
    "entha",
    "ethra",
    "bele",
    "rate",
    "duddu",
    "paise",
    "kaasu",
    "dabbu",
    "karchu",
]

DEPARTMENT_SYNONYMS: dict[str, list[str]] = {
    "CSE (AI & ML)": [
        "cse ai",
        "cse ai ml",
        "cse (ai & ml)",
        "ai ml",
        "aiml",
        "ai&ml",
        "artificial intelligence",
        "machine learning",
    ],
    "CSE (Data Science)": ["cse ds", "cse data science", "cse (data science)", "data science", "datascience"],
    "CSE (Cyber Security)": [
        "cse cyber",
        "cse (cyber security)",
        "cyber security",
        "cybersecurity",
    ],
    "CSE (Business Systems)": [
        "cse business",
        "cse (business systems)",
        "business systems",
        "cs business",
    ],
    "CSE": ["cse", "computer science", "computer science engineering"],
    "ISE": ["ise", "information science", "information science engineering"],
    "ECE": ["ece", "electronics", "electronics and communication", "electronics & communication", "electronics communication"],
    "Civil": ["civil", "civil engineering"],
    "Mechanical": ["mechanical", "mechanical engineering", "mech"],
    "MBA": ["mba", "management", "business administration"],
    "Basic Sciences": ["basic sciences", "basic science", "science departments", "science department"],
    "Mathematics": ["mathematics", "maths", "math"],
    "Physics": ["physics"],
    "Chemistry": ["chemistry"],
}

HOD_PROFILE_KEYWORDS = [
    "hod",
    "hods",
    "hos",
    "h o d",
    "h.o.d",
    "hod name",
    "name of hod",
    "who is hod",
    "who is the hod",
    "hod of",
    "department head",
    "dept head",
    "head of",
    "head of department",
    "heads of department",
    "heads of the department",
]

TRUSTEES_PROFILE_KEYWORDS = [
    "trustee",
    "trustees",
    "trusty",
    "trusties",
    "trustee name",
    "trustees name",
    "who are trustees",
    "who is trustee",
    "founder",
    "founders",
    "founder names",
    "management",
    "board",
    "chairman",
    "president",
    "board of trustees",
    "founder trustee",
    "founder trustees",
]

BOTH_PROFILE_KEYWORDS = [
    "both",
    "all of them",
    "two of them",
    "together",
    "ibbaru",
    "eradu",
    "dono",
    "iruvarum",
    "iddaru",
    "rendu",
    "randum",
]

PROFILE_GENERIC_KEYWORDS = [
    "profile",
    "profiles",
    "details",
    "information",
    "bagge",
    "baare",
    "pattri",
    "gurunchi",
    "kurichu",
    "vivara",
    "maahiti",
]

_HOD_NAME = "Dr. Shashikumar D R"
_TRUSTEE_NAMES = [
    "Prof. M. R. Holla",
    "Dr. Y. Jayasimha",
    "Prof. R C Shanmukhaswamy",
    "Dr. A. M. Padma Reddy",
]

PROFILE_REPLY_TEMPLATES: dict[str, dict[str, str]] = {
    "English": {
        "hod": "Sure. HOD name: {hod}.",
        "trustees": "Sure. Trustee names: {trustees}.",
        "both": "Sure. HOD: {hod}. Trustees: {trustees}.",
    },
    "Kannada": {
        "hod": "ಖಂಡಿತ. HOD ಹೆಸರು: {hod}.",
        "trustees": "ಖಂಡಿತ. ಟ್ರಸ್ಟಿಗಳ ಹೆಸರುಗಳು: {trustees}.",
        "both": "ಖಂಡಿತ. HOD: {hod}. ಟ್ರಸ್ಟಿಗಳು: {trustees}.",
    },
    "Hindi": {
        "hod": "ज़रूर। HOD का नाम: {hod}।",
        "trustees": "ज़रूर। ट्रस्टी के नाम: {trustees}।",
        "both": "ज़रूर। HOD: {hod}। ट्रस्टी: {trustees}।",
    },
    "Tamil": {
        "hod": "நிச்சயம். HOD பெயர்: {hod}.",
        "trustees": "நிச்சயம். அறங்காவலர் பெயர்கள்: {trustees}.",
        "both": "நிச்சயம். HOD: {hod}. அறங்காவலர்கள்: {trustees}.",
    },
    "Telugu": {
        "hod": "తప్పకుండా. HOD పేరు: {hod}.",
        "trustees": "తప్పకుండా. ట్రస్టీల పేర్లు: {trustees}.",
        "both": "తప్పకుండా. HOD: {hod}. ట్రస్టీలు: {trustees}.",
    },
    "Malayalam": {
        "hod": "തീർച്ചയായും. HOD പേര്: {hod}.",
        "trustees": "തീർച്ചയായും. ട്രസ്റ്റിമാരുടെ പേരുകൾ: {trustees}.",
        "both": "തീർച്ചയായും. HOD: {hod}. ട്രസ്റ്റിമാർ: {trustees}.",
    },
}


def _contains_phrase(normalized: str, phrase: str) -> bool:
    if not normalized or not phrase:
        return False
    p = phrase.strip().lower()
    if not p:
        return False
    # For non-ASCII phrases, substring matching is more reliable than \b boundaries.
    if not all(ord(ch) < 128 for ch in p):
        return p in normalized
    # Word-boundary matching avoids false positives like "hoodies" -> "hod".
    return bool(re.search(rf"\b{re.escape(p)}\b", normalized))


def _matches_any_phrase(normalized: str, phrases: list[str]) -> bool:
    return any(_contains_phrase(normalized, p) for p in phrases)


def _detect_profile_intent(normalized: str) -> str | None:
    if not normalized:
        return None
    # Fee queries should not be re-routed to profile cards.
    if any(_contains_phrase(normalized, k) for k in FEE_QUERY_KEYWORDS):
        return None
    has_hod = _matches_any_phrase(normalized, HOD_PROFILE_KEYWORDS)
    has_trustees = _matches_any_phrase(normalized, TRUSTEES_PROFILE_KEYWORDS)
    # Common STT/typing slip: "trusted" instead of "trustees".
    if not has_trustees and _contains_phrase(normalized, "trusted"):
        if has_hod or _contains_phrase(normalized, "profile") or _contains_phrase(normalized, "profiles"):
            has_trustees = True

    if (
        (not has_hod and not has_trustees)
        and _matches_any_phrase(normalized, BOTH_PROFILE_KEYWORDS)
        and _matches_any_phrase(normalized, PROFILE_GENERIC_KEYWORDS)
    ):
        return INTENT_HOD_TRUSTEES_PROFILE

    if has_hod and has_trustees:
        return INTENT_HOD_TRUSTEES_PROFILE
    if has_hod:
        return INTENT_HOD_PROFILE
    if has_trustees:
        return INTENT_TRUSTEES_PROFILE
    return None


def get_unavailable_reply(language: str | None) -> str:
    if not language:
        return UNAVAILABLE_REPLY_BY_LANGUAGE["English"]
    return UNAVAILABLE_REPLY_BY_LANGUAGE.get(language, UNAVAILABLE_REPLY_BY_LANGUAGE["English"])


def get_off_topic_reply(language: str | None) -> str:
    if not language:
        return OFF_TOPIC_REPLY_BY_LANGUAGE["English"]
    return OFF_TOPIC_REPLY_BY_LANGUAGE.get(language, OFF_TOPIC_REPLY_BY_LANGUAGE["English"])


def get_profile_direct_reply(intent: str, language: str | None = None) -> str | None:
    lang = language if language in SUPPORTED_LANGUAGES else "English"
    templates = PROFILE_REPLY_TEMPLATES.get(lang, PROFILE_REPLY_TEMPLATES["English"])
    trustees_joined = ", ".join(_TRUSTEE_NAMES)
    if intent == INTENT_HOD_PROFILE:
        return templates["hod"].format(hod=_HOD_NAME, trustees=trustees_joined)
    if intent == INTENT_TRUSTEES_PROFILE:
        return templates["trustees"].format(hod=_HOD_NAME, trustees=trustees_joined)
    if intent == INTENT_HOD_TRUSTEES_PROFILE:
        return templates["both"].format(hod=_HOD_NAME, trustees=trustees_joined)
    return None


def is_college_related_query(text: str | None) -> bool:
    normalized = _normalize_text(text)
    if not normalized:
        return False
    intent = detect_intent(normalized)
    if intent != INTENT_NORMAL_QUERY:
        return True
    if _matches_any_phrase(normalized, COLLEGE_ENTITY_KEYWORDS):
        return True
    return _matches_any_phrase(normalized, COLLEGE_RELATED_NORMAL_QUERY_KEYWORDS)


def get_course_menu_options() -> list[str]:
    return list(COURSE_MENU_OPTIONS)


def get_course_menu_spoken_prompt(language: str | None) -> str:
    if not language:
        return COURSE_MENU_SPOKEN_PROMPT_BY_LANGUAGE["English"]
    return COURSE_MENU_SPOKEN_PROMPT_BY_LANGUAGE.get(language, COURSE_MENU_SPOKEN_PROMPT_BY_LANGUAGE["English"])


def detect_department_name(text: str | None) -> str | None:
    normalized = _normalize_text(text)
    return _detect_department(normalized)


def _detect_department(normalized: str) -> str | None:
    if not normalized:
        return None
    for dept, keys in DEPARTMENT_SYNONYMS.items():
        for k in keys:
            if k in normalized:
                return dept
    return None


def _is_course_menu_query(normalized: str) -> bool:
    if not normalized:
        return False

    # 1) Check exact known phrases
    if any(k in normalized for k in COURSE_MENU_KEYWORDS_EN):
        return True

    # 2) Course entity + list/show cue (Latin script; non-English sessions use LLM preprocessor)
    course_entities = [
        "course",
        "courses",
        "branch",
        "branches",
        "department",
        "departments",
        "program",
        "programs",
        "stream",
        "streams",
    ]
    list_cues = [
        "available",
        "offer",
        "list",
        "show",
        "what",
        "which",
        "how many",
        "yava",
        "yaava",
        "kaun",
        "kya",
        "enna",
        "emi",
        "emiti",
        "eth",
        "ethokke",
        "kodi",
        "heli",
        "batao",
        "sollu",
        "cheppu",
        "parayu",
    ]

    has_course = any(c in normalized for c in course_entities)
    has_list_cue = any(l in normalized for l in list_cues)

    if has_course and has_list_cue:
        return True

    return False


def _is_fee_query(normalized: str) -> bool:
    if not normalized:
        return False
    return any(_contains_phrase(normalized, k) for k in FEE_QUERY_KEYWORDS)


def _is_admissions_query(normalized: str) -> bool:
    if not normalized:
        return False
    if _is_fee_query(normalized):
        return True
    admission_phrases = [
        "admission",
        "admissions",
        "admit",
        "apply",
        "application",
        "eligibility",
        "entrance",
        "entrance exam",
        "kcet",
        "comedk",
        "kea",
        "counseling",
        "counselling",
        "quota",
        "scholarship",
        "scholarships",
        "fee structure",
        "how to join",
        "how to get admission",
    ]
    return any(_contains_phrase(normalized, p) for p in admission_phrases)


def _is_placements_query(normalized: str) -> bool:
    if not normalized:
        return False
    placement_phrases = [
        "placement",
        "placements",
        "campus drive",
        "campus placement",
        "recruiter",
        "recruitment",
        "job",
        "jobs",
        "hiring",
        "package",
        "salary",
        "ctc",
        "internship",
        "internships",
        "training program",
        "mock interview",
        "career",
        "placed",
        "companies visit",
        "tnp",
        "training and placement",
    ]
    return any(_contains_phrase(normalized, p) for p in placement_phrases)


def _is_college_overview_query(normalized: str) -> bool:
    if not normalized:
        return False

    if _matches_any_phrase(normalized, OVERVIEW_KEYWORDS_EN):
        return True

    has_college_entity = _matches_any_phrase(normalized, COLLEGE_ENTITY_KEYWORDS)
    has_overview_cue = _matches_any_phrase(normalized, OVERVIEW_CUE_KEYWORDS)
    return has_college_entity and has_overview_cue


def _normalize_text(text: str | None) -> str:
    """Lowercase, strip, collapse spaces. Safe for None."""
    if text is None or not isinstance(text, str):
        return ""
    return re.sub(r"\s+", " ", text.strip().lower())


def detect_intent(text: str) -> str:
    """
    Deterministic intent detection with priority:
    1) Profile queries (HOD/TRUSTEES/BOTH)
    2) ADMISSIONS (fees, admission process, entrance exams — kiosk card deck)
    3) PLACEMENTS (jobs, training, placement support — kiosk card deck)
    4) DEPARTMENT_OVERVIEW (if a specific department is detected)
    5) COURSE_MENU (generic programs/branches query)
    6) COLLEGE_OVERVIEW (about the college)
    7) NORMAL_QUERY
    """
    normalized = _normalize_text(text)
    if not normalized:
        return INTENT_NORMAL_QUERY
    profile_intent = _detect_profile_intent(normalized)
    if profile_intent:
        return profile_intent
    if _is_admissions_query(normalized):
        return INTENT_ADMISSIONS
    if _is_placements_query(normalized):
        return INTENT_PLACEMENTS
    if _detect_department(normalized):
        return INTENT_DEPARTMENT_OVERVIEW
    if _is_course_menu_query(normalized):
        return INTENT_COURSE_MENU
    if _is_college_overview_query(normalized):
        return INTENT_COLLEGE_OVERVIEW
    return INTENT_NORMAL_QUERY


def _strip_json_fence(text: str) -> str:
    s = text.strip()
    if s.startswith("```"):
        s = re.sub(r"^```(?:json)?\s*", "", s, flags=re.IGNORECASE)
        s = re.sub(r"\s*```\s*$", "", s)
    return s.strip()


def _coerce_preprocessor_intent(raw: str | None) -> str:
    if raw is None:
        return INTENT_NORMAL_QUERY
    s = str(raw).strip().upper().replace("-", "_")
    if s.startswith("INTENT_"):
        s = s[7:]
    aliases: dict[str, str] = {
        "COLLEGE_OVERVIEW": INTENT_COLLEGE_OVERVIEW,
        "COURSE_MENU": INTENT_COURSE_MENU,
        "DEPARTMENT_OVERVIEW": INTENT_DEPARTMENT_OVERVIEW,
        "ADMISSIONS": INTENT_ADMISSIONS,
        "PLACEMENTS": INTENT_PLACEMENTS,
        "HOD_PROFILE": INTENT_HOD_PROFILE,
        "TRUSTEES_PROFILE": INTENT_TRUSTEES_PROFILE,
        "HOD_TRUSTEES_PROFILE": INTENT_HOD_TRUSTEES_PROFILE,
        "NORMAL_QUERY": INTENT_NORMAL_QUERY,
    }
    return aliases.get(s, INTENT_NORMAL_QUERY)


def department_label_from_preprocessor(value: Any) -> str | None:
    if value is None:
        return None
    s = str(value).strip()
    if not s or s.lower() in ("null", "none", "n/a", "-", ""):
        return None
    for canon in DEPARTMENT_SYNONYMS:
        if canon.lower() == s.lower():
            return canon
    return _detect_department(_normalize_text(s))


async def normalize_and_classify_query(user_text: str, session_lang: str) -> dict[str, Any]:
    """
    For non-English sessions: translate mixed-language input to English and classify intent + department.
    English sessions should not call this (use detect_intent / detect_department_name instead).
    """
    from backend.config.settings import MULTILINGUAL_PREPROCESSOR_MAX_TOKENS, MULTILINGUAL_PREPROCESSOR_MODEL

    text = (user_text or "").strip()
    fallback: dict[str, Any] = {
        "english_translation": text,
        "intent": INTENT_NORMAL_QUERY,
        "target_department": None,
    }
    if not text:
        return fallback
    try:
        client = await get_groq_client()
        if not client:
            return fallback
        allowed = (
            "COLLEGE_OVERVIEW, COURSE_MENU, DEPARTMENT_OVERVIEW, ADMISSIONS, PLACEMENTS, "
            "HOD_PROFILE, TRUSTEES_PROFILE, HOD_TRUSTEES_PROFILE, NORMAL_QUERY"
        )
        system_prompt = (
            "You are a linguistic translation and classification engine for a college kiosk (SVIT). "
            f"The user's session language label is: {session_lang}. "
            "The user text may mix that language with English (code-switching).\n"
            "1) Translate the user's query into clear, concise English (one short sentence).\n"
            f"2) Classify intent as exactly one of: {allowed}.\n"
            "3) If the question targets a specific academic department or branch, set target_department to one of: "
            "CSE, ISE, CSE (AI & ML), CSE (Data Science), CSE (Cyber Security), CSE (Business Systems), "
            "ECE, Civil, Mechanical, MBA, Basic Sciences, Mathematics, Physics, Chemistry. Otherwise JSON null.\n"
            "Output ONLY one JSON object, no markdown fences, no extra keys, with exactly: "
            "english_translation (string), intent (string), target_department (string or null)."
        )
        completion = await client.chat.completions.create(
            model=MULTILINGUAL_PREPROCESSOR_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": text},
            ],
            temperature=0.0,
            top_p=0.2,
            max_tokens=MULTILINGUAL_PREPROCESSOR_MAX_TOKENS,
        )
        raw = (completion.choices[0].message.content or "").strip()
        payload = json.loads(_strip_json_fence(raw))
        if not isinstance(payload, dict):
            return fallback
        en = (payload.get("english_translation") or "").strip()
        if not en:
            en = text
        intent = _coerce_preprocessor_intent(payload.get("intent"))
        dept = department_label_from_preprocessor(payload.get("target_department"))
        return {"english_translation": en, "intent": intent, "target_department": dept}
    except Exception as e:
        logger.warning("normalize_and_classify_query failed: %s", e, exc_info=True)
        return fallback


FALLBACK_MSG = "I'm sorry, I couldn't process your request right now."
FALLBACK_CONTEXT_PREFIX = "I am having trouble processing that right now, please try again. "
FALLBACK_CONTEXT_MAX_CHARS = 600


def _fallback_reply(context: str) -> str:
    """Return safe fallback when LLM fails. Never returns None."""
    if context and context.strip():
        return FALLBACK_MSG
    return FALLBACK_MSG


def build_overview_context(lang_key: str | None = None) -> str:
    """
    Return overview-oriented RAG context, hard-capped at OVERVIEW_CONTEXT_MAX_TOKENS (1000).
    Uses fixed canonical query; rows are filtered by locale metadata when lang_key is set.
    """
    return get_relevant_context(
        OVERVIEW_QUERY,
        top_k=OVERVIEW_TOP_K,
        max_tokens=OVERVIEW_CONTEXT_MAX_TOKENS,
        lang_key=lang_key,
    )


def build_normal_context(query: str, lang_key: str | None = None) -> str:
    """Thin wrapper around get_relevant_context for normal (non-overview) queries."""
    return get_relevant_context(
        query,
        top_k=RAG_TOP_K,
        max_tokens=RAG_MAX_TOKENS,
        lang_key=lang_key,
    )


def build_system_prompt(intent: str, language: str, context: str | None) -> str:
    """
    Build system prompt for Groq. COLLEGE_OVERVIEW: strict 6-section English-only.
    NORMAL_QUERY: existing CLARA style with reply in selected language.
    """
    ctx = (context or "").strip()
    if intent == INTENT_COLLEGE_OVERVIEW:
        prefix = (
            CONCISE_VOICE_RULE
            + " "
            + rag_language_enforcement_directive(language)
            + " "
            "Give a short college overview in 2-3 sentences using only verified context. "
            "Plain text only. No markdown. No bullets. No emojis. "
            "If information is missing, explicitly state 'Information not available.' "
            + MULTI_ENTITY_RULE
        )
        return f"{prefix}\n\nCollege information:\n{ctx}" if ctx else prefix
    if intent == INTENT_DEPARTMENT_OVERVIEW:
        prefix = (
            CONCISE_VOICE_RULE
            + "\n\n"
            + rag_language_enforcement_directive(language)
            + "\n\n"
            "Give a short department snapshot in 2-3 sentences using only verified department data.\n"
            "No markdown. No bullets.\n"
            "If missing, say 'Information not available.'\n"
            + MULTI_ENTITY_RULE
            + "\n\n"
            "Department information:\n"
        )
        return f"{prefix}{ctx}" if ctx else prefix.rstrip()
    if intent == INTENT_ADMISSIONS:
        prefix = (
            CONCISE_VOICE_RULE
            + "\n\n"
            + rag_language_enforcement_directive(language)
            + "\n\n"
            "The user is asking about admissions, fees, eligibility, or entrance exams. "
            "Reply in 2-3 very short sentences using only the context. No markdown or bullets. "
            "Direct them to the Admission Block if exact numbers are uncertain.\n"
            + MULTI_ENTITY_RULE
            + "\n\nAdmissions and fees information:\n"
        )
        return f"{prefix}{ctx}" if ctx else prefix.rstrip()
    if intent == INTENT_PLACEMENTS:
        prefix = (
            CONCISE_VOICE_RULE
            + "\n\n"
            + rag_language_enforcement_directive(language)
            + "\n\n"
            "The user is asking about placements, jobs, internships, or training. "
            "Reply in 2-3 very short sentences using only the context. No markdown or bullets.\n"
            + MULTI_ENTITY_RULE
            + "\n\nPlacements and training information:\n"
        )
        return f"{prefix}{ctx}" if ctx else prefix.rstrip()
    # NORMAL_QUERY
    unavailable_reply = get_unavailable_reply(language)
    off_topic_reply = get_off_topic_reply(language)
    if ctx:
        return (
            f"{CONCISE_VOICE_RULE} "
            f"{rag_language_enforcement_directive(language)} "
            f"Reply only in {language}. "
            f"For college-related emotional or opinion questions (for example, 'is this a good college?'), reply with a reassuring, polite tone in one or two short sentences. "
            f"Use ONLY the following college information when it is relevant to the user's question. "
            f"Do not invent or assume college-specific facts; only use what is in the College information below. "
            f"{MULTI_ENTITY_RULE} "
            f"If the answer is not in the context, reply exactly: '{unavailable_reply}' "
            f"If the question is outside SVIT/college domain, reply exactly: '{off_topic_reply}' "
            f"Default to one short sentence, maximum two short sentences only if truly needed. "
            f"Avoid fillers, backstory, and generic introductions. "
            f"For name/list questions, return just the names in one line.\n\nCollege information:\n{ctx}"
        )
    return (
        f"{CONCISE_VOICE_RULE} "
        f"{rag_language_enforcement_directive(language)} "
        f"Reply only in {language}. "
        f"For college-related emotional or opinion questions, respond politely in one or two short sentences. "
        f"{MULTI_ENTITY_RULE} "
        f"For questions about the college or campus, if details are unavailable reply exactly: '{unavailable_reply}' "
        f"For non-college topics, reply exactly: '{off_topic_reply}' "
        f"Default to one short sentence, maximum two short sentences only if needed."
    )


def _count_tokens(text: str) -> int:
    """Return token count using tiktoken cl100k_base. Returns 0 on error."""
    if not text:
        return 0
    try:
        import tiktoken
        enc = tiktoken.get_encoding("cl100k_base")
        return len(enc.encode(text))
    except Exception:
        return 0


def _trim_to_tokens(text: str, max_tokens: int) -> str:
    """Trim text to at most max_tokens. Returns text unchanged if already within limit."""
    if max_tokens <= 0 or not text:
        return text
    try:
        import tiktoken
        enc = tiktoken.get_encoding("cl100k_base")
        tokens = enc.encode(text)
        if len(tokens) <= max_tokens:
            return text
        return enc.decode(tokens[:max_tokens])
    except Exception:
        return text


def generate_structured_overview(
    system_prompt: str,
    context: str,
    groq_client: Any,
    model: str,
) -> str:
    """
    Phase 1: Generate structured college overview in English only.
    Uses low temperature (GROQ_TEMPERATURE), top_p=GROQ_TOP_P, max_tokens=400. On failure returns empty string (caller uses fallback).
    """
    if not groq_client or not model:
        return ""
    try:
        prompt_tokens = _count_tokens(system_prompt) + _count_tokens("Provide the college overview in the required structure.")
        if prompt_tokens > int(MODEL_CONTEXT_LIMIT * MAX_INPUT_TOKEN_FRACTION):
            system_prompt = _trim_to_tokens(system_prompt, int(MODEL_CONTEXT_LIMIT * MAX_INPUT_TOKEN_FRACTION) - 50)
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": "Provide the college overview in the required structure."},
        ]
        completion = groq_client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=GROQ_TEMPERATURE,
            top_p=GROQ_TOP_P,
            max_tokens=GROQ_MAX_TOKENS,
        )
        out = (completion.choices[0].message.content or "").strip()
        if out:
            logger.info("Overview generated model=%s tokens_approx=%d", model, prompt_tokens)
        return out
    except Exception as e:
        logger.error("LLM failure (structured overview): %s", e, exc_info=True)
        return ""


def generate_structured_department_overview(
    system_prompt: str,
    department_name: str,
    groq_client: Any,
    model: str,
) -> str:
    """
    Generate structured department overview in English only.
    Uses low temperature (GROQ_TEMPERATURE), top_p=GROQ_TOP_P, max_tokens=400. On failure returns empty string.
    """
    if not groq_client or not model:
        return ""
    try:
        user_msg = f"Provide the {department_name} department overview in the required structure."
        prompt_tokens = _count_tokens(system_prompt) + _count_tokens(user_msg)
        if prompt_tokens > int(MODEL_CONTEXT_LIMIT * MAX_INPUT_TOKEN_FRACTION):
            system_prompt = _trim_to_tokens(system_prompt, int(MODEL_CONTEXT_LIMIT * MAX_INPUT_TOKEN_FRACTION) - 50)
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_msg},
        ]
        completion = groq_client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=GROQ_TEMPERATURE,
            top_p=GROQ_TOP_P,
            max_tokens=GROQ_MAX_TOKENS,
        )
        out = (completion.choices[0].message.content or "").strip()
        if out:
            logger.info("Department overview generated dept=%s model=%s tokens_approx=%d", department_name, model, prompt_tokens)
        return out
    except Exception as e:
        logger.error("LLM failure (department overview): %s", e, exc_info=True)
        return ""


def _parse_overview_to_sections(reply_text: str) -> List[dict]:
    """Parse overview reply into 5 sections (title + text). Section 6 Closing Assurance excluded."""
    raw = (reply_text or "").strip()
    if not raw:
        return [{"title": t, "text": "Information not available."} for t in DIGITAL_BOOK_SECTION_TITLES]
    split_re = re.compile(r"\n\s*\d+[.)]\s*")
    segments = [s.strip() for s in split_re.split(raw) if s.strip()]
    # First segment may be intro; we want sections 1-5 (last 6 segments, then take first 5)
    section_texts = (segments[-6:])[:5] if len(segments) >= 5 else segments[:5]
    result = []
    for i, title in enumerate(DIGITAL_BOOK_SECTION_TITLES):
        text = (section_texts[i].strip()) if i < len(section_texts) else "Information not available."
        result.append({"title": title, "text": text or "Information not available."})
    return result


def build_overview_pages(
    reply_text: str,
    language_code: str,
    tts_callback: Callable[[str, str], str | None],
) -> dict:
    """
    Build overview pages payload: pages with title, text, and pre-generated audio (base64) for content pages.
    Cover has audio: null. Used only for COLLEGE_OVERVIEW.
    Per-section TTS failures are caught so we always return a full book (missing audio as null) for all languages.
    """
    sections = _parse_overview_to_sections(reply_text)
    pages = [
        {"title": DIGITAL_BOOK_COVER_TITLE, "text": DIGITAL_BOOK_COVER_TEXT, "audio": None},
    ]
    for sec in sections:
        audio_b64 = None
        if sec.get("text"):
            try:
                audio_b64 = tts_callback(sec["text"], language_code)
            except Exception as e:
                logger.warning("TTS for digital book section %s failed: %s", sec.get("title"), e)
        pages.append({"title": sec["title"], "text": sec["text"], "audio": audio_b64})
    return {"pages": pages}


def translate_preserving_structure(
    english_text: str,
    target_language: str,
    groq_client: Any,
    model: str,
) -> str:
    """
    Phase 2: Translate English overview into target_language, preserving structure.
    On failure logs warning and returns english_text (graceful fallback).
    """
    if not english_text or not target_language or target_language.lower() == "english":
        return english_text or ""
    if not groq_client or not model:
        return english_text
    try:
        system_content = (
            f"Translate the following text into {target_language}. "
            "Preserve structure, sentence count, and meaning exactly. Do not expand or shorten. Output only the translation."
        )
        messages = [
            {"role": "system", "content": system_content},
            {"role": "user", "content": english_text},
        ]
        completion = groq_client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=GROQ_TEMPERATURE,
            top_p=GROQ_TOP_P,
            max_tokens=GROQ_MAX_TOKENS,
        )
        out = (completion.choices[0].message.content or "").strip()
        return out if out else english_text
    except Exception as e:
        logger.warning("Translation fallback to English: %s", e)
        return english_text


def generate_reply(
    intent: str,
    text: str,
    context: str,
    language: str,
    session_messages: List[dict],
    groq_client: Any,
    model: str,
    tts_callback: Callable[[str, str], str | None] | None = None,
    language_code: str | None = None,
) -> str | dict:
    """
    Orchestrator: COLLEGE_OVERVIEW = two-phase (English then translate), optionally build overview pages with TTS.
    NORMAL_QUERY = single call. Returns plain string replies.
    """
    safe_context = (context or "").strip()
    unavailable = get_unavailable_reply(language)
    off_topic = get_off_topic_reply(language)
    if not groq_client or not model:
        return unavailable

    lang_key_for_locale = "hi" if (language or "").strip().lower() == "hindi" else "en"

    if is_narrator_intent(intent):
        dept_label = detect_department_name(text)
        npayload = build_target_card_payload(
            intent,
            lang_key=lang_key_for_locale,
            detected_department_label=dept_label,
            user_text=text,
        )
        if npayload is None:
            npayload = {}
        card_json = json.dumps(npayload, ensure_ascii=False, indent=2)
        narrator_system = build_narrator_system_prompt(language, card_json)
        try:
            messages = [{"role": "system", "content": narrator_system}]
            for m in session_messages or []:
                role = "assistant" if m.get("role") == "clara" else "user"
                messages.append({"role": role, "content": m.get("text", "") or ""})
            messages.append({"role": "user", "content": text or ""})
            completion = groq_client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=GROQ_TEMPERATURE,
                top_p=GROQ_TOP_P,
                max_tokens=GROQ_MAX_TOKENS,
            )
            out = (completion.choices[0].message.content or "").strip()
            if out:
                logger.info("Reply generated narrator intent=%s model=%s", intent, model)
            return out if out else unavailable
        except Exception as e:
            logger.error("LLM failure (narrator): %s", e, exc_info=True)
            return unavailable

    if intent == INTENT_NORMAL_QUERY and not is_college_related_query(text):
        return off_topic

    if intent == INTENT_COURSE_MENU:
        # Frontend renders the course menu; keep backend response deterministic.
        return "COURSE_MENU"

    # NORMAL_QUERY: token safety before Groq call
    try:
        system_prompt = build_system_prompt(INTENT_NORMAL_QUERY, language, safe_context)
        rest_tokens = sum(_count_tokens(m.get("text", "") or "") for m in (session_messages or [])) + _count_tokens(text or "")
        total_tokens = _count_tokens(system_prompt) + rest_tokens
        max_allowed = int(MODEL_CONTEXT_LIMIT * MAX_INPUT_TOKEN_FRACTION)
        if total_tokens > max_allowed and safe_context:
            normal_prefix = (
                f"You are CLARA, a warm and professional campus receptionist for SVIT. "
                f"{rag_language_enforcement_directive(language)} "
                f"Reply only in {language}. "
                f"For college-related emotional or opinion questions, respond politely in one or two short sentences. "
                f"Use ONLY the following college information when it is relevant to the user's question. "
                f"Do not invent or assume college-specific facts; only use what is in the College information below. "
                f"If the answer is not in the context, reply exactly: '{unavailable}' "
                f"If the question is outside SVIT/college domain, reply exactly: '{off_topic}' "
                f"Be concise and helpful.\n\nCollege information:\n"
            )
            prefix_tokens = _count_tokens(normal_prefix)
            max_context_tokens = max(0, max_allowed - prefix_tokens - rest_tokens)
            trimmed_context = _trim_to_tokens(safe_context, max_context_tokens)
            system_prompt = normal_prefix + trimmed_context
            logger.info("Context truncated to fit model limit; approx_tokens=%d", _count_tokens(trimmed_context))
        messages = [{"role": "system", "content": system_prompt}]
        for m in session_messages or []:
            role = "assistant" if m.get("role") == "clara" else "user"
            messages.append({"role": role, "content": m.get("text", "") or ""})
        messages.append({"role": "user", "content": text or ""})

        completion = groq_client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=GROQ_TEMPERATURE,
            top_p=GROQ_TOP_P,
            max_tokens=GROQ_MAX_TOKENS,
        )
        out = (completion.choices[0].message.content or "").strip()
        if out:
            logger.info("Reply generated intent=%s model=%s", intent, model)
        return out if out else unavailable
    except Exception as e:
        logger.error("LLM failure (normal query): %s", e, exc_info=True)
        return unavailable
