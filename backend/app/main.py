"""CLARA backend - FastAPI app with WebSocket support and latency optimizations."""

from __future__ import annotations

import asyncio
import base64
import hashlib
import json
import logging
import math
import os
import re
import struct
import sys
import time
import uuid
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

# Ensure project root is on path when run as a script.
_PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))

from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware

from backend.clients.provider_clients import (
    close_clients,
    get_groq_client,
    sarvam_stt_from_wav,
    sarvam_tts_to_base64,
    warmup_clients,
)
from backend.app.error_events import build_error_payload, error_hint
from backend.app.audio_utils import (
    audio_bytes_len,
    estimate_wav_duration_ms,
    normalize_tts_pronunciation,
    split_first_sentence,
)
from backend.app.session_state import (
    append_session_history,
    assistant_last_reply_used_guest_name,
    history_for_llm,
)
from backend.app.telemetry import debug_payload, log_turn_metrics, text_preview
from backend.app.ws_schemas import parse_inbound_ws_message
from backend.config.settings import (
    AUDIO_RECORD_MODE,
    AUDIO_UPDATE_TIMEOUT_S,
    TTS_CHUNK_FIRST_TIMEOUT_S,
    TTS_CHUNK_MAX_CHARS,
    TTS_CHUNK_MAX_CHARS_COMPARISON,
    TTS_CHUNK_MAX_CHARS_NARRATOR,
    TTS_CHUNK_TIMEOUT_S,
    AUTO_LANGUAGE_DETECT_CONFIDENCE_THRESHOLD,
    AUTO_LANGUAGE_DETECT_ENABLED,
    ENABLE_ACK_EARCON,
    ENABLE_EARLY_PARTIAL_TEXT,
    ENABLE_LLM_STREAMING,
    ENABLE_ONCE_ONLY_TTS_SEGMENTS,
    ENABLE_FIRST_SENTENCE_TTS,
    ENABLE_TTS_PIPELINING,
    GROQ_API_KEY,
    HOST,
    LANGUAGE_NAME_TO_CODE_KEY,
    LLM_MAX_TOKENS,
    LLM_MAX_TOKENS_DEPARTMENT_COMPARISON,
    LLM_STREAM_PARTIAL_DEBOUNCE_MS,
    LLM_STREAM_TIMEOUT_S,
    LLM_TEMPERATURE,
    LOW_LATENCY_VOICE_MODE,
    MULTILINGUAL_PREPROCESSOR_TIMEOUT_S,
    PORT,
    PRODUCTION_STRICT_READY,
    FRONTEND_URL,
    FIRST_SENTENCE_TTS_MAX_CHARS,
    FULL_TTS_FALLBACK_TIMEOUT,
    RAG_CONTEXT_TIMEOUT_S,
    RAG_MIN_DOCUMENTS,
    RAG_MODEL,
    RAG_TOP_K,
    REQUIRE_WS_AUTH_IN_PRODUCTION,
    SARVAM_API_KEY,
    STT_TIMEOUT_S,
    TARGET_LANGUAGE_CODES,
    TTS_TIMEOUT_S,
    WS_ALLOWED_ORIGINS,
    WS_AUTH_REQUIRED,
)
from backend.core.audio_pipeline import get_input_device_info, record_audio, validate_audio_devices
from backend.core.language_detection import detect_language
from backend.core.rag import get_relevant_context, get_rag_document_count, warmup_rag
from backend.services.greetings import (
    get_greeting,
    get_language_required_nudge_english,
    get_name_prompt,
    get_ready_prompt,
    guest_name_reply_is_skip,
    normalize_guest_name,
    get_wakeup_language_gate_display_text,
    get_wakeup_language_gate_tts_text,
    greeting_font_family_css,
)
from backend.services.faq_answers import get_faq_answer_for_question
from backend.services.tts_chunking import split_tts_chunks
from backend.services.session_language import resolve_session_language, set_session_language, should_run_auto_detect
from backend.services.answer_generation import (
    INTENT_ADMISSIONS,
    INTENT_BUS_ROUTES,
    INTENT_COLLEGE_OVERVIEW,
    INTENT_COURSE_MENU,
    INTENT_DEPARTMENT_COMPARISON,
    INTENT_DEPARTMENT_FEES,
    INTENT_DOCUMENTS,
    INTENT_DEPARTMENT_OVERVIEW,
    INTENT_HOD_PROFILE,
    INTENT_HOD_TRUSTEES_PROFILE,
    INTENT_NORMAL_QUERY,
    INTENT_OFF_TOPIC,
    INTENT_PLACEMENTS,
    INTENT_PRINCIPAL_PROFILE,
    INTENT_TRUSTEES_PROFILE,
    INTENT_VICE_PRINCIPAL_PROFILE,
    build_narrator_system_prompt,
    build_system_prompt,
    build_target_card_payload,
    department_label_to_json_key,
    extract_comparison_department_canonical_labels,
    extract_features,
    get_bus_routes_spoken_prompt,
    get_course_menu_options,
    get_course_menu_spoken_prompt,
    get_off_topic_reply,
    get_profile_direct_reply,
    get_unavailable_reply,
    is_narrator_intent,
    locale_file_id_for_lang_key,
    maybe_override_intent_with_executive_profile,
    multilingual_rag_reply_directive,
    normalize_and_classify_query,
    rag_language_enforcement_directive,
    resolve_intent_from_features,
    text_has_department_comparison_cue,
    translate_reply_to_session_language_async,
)
from backend.services.department_comparison_registry import (
    build_comparison_context_for_llm,
    default_comparison_ids,
    department_order_keys,
    validate_department_ids,
)
from backend.security.ws_auth import (
    log_ws_auth_configuration_warnings,
    validate_websocket_handshake,
)
from backend.utils.cache import TTLRUCache
from backend.utils.timing import TurnTiming
from backend.services.campus_room_match import get_campus_map_json, match_campus_transcript
from backend.services.campus_route_engine import compute_campus_route
from backend.utils.voice_logger import (
    log_voice_capture_end,
    log_voice_capture_start,
    log_voice_stt,
    log_voice_tts,
    log_voice_turn_end,
)

logger = logging.getLogger(__name__)


def _agent_debug_ndjson(
    hypothesis_id: str,
    location: str,
    message: str,
    data: dict[str, Any],
    *,
    run_id: str = "pre",
) -> None:
    # region agent log
    line = json.dumps(
        {
            "sessionId": "ba7e8c",
            "runId": run_id,
            "hypothesisId": hypothesis_id,
            "location": location,
            "message": message,
            "data": data,
            "timestamp": int(time.time() * 1000),
        },
        ensure_ascii=False,
    )
    for path in (
        _PROJECT_ROOT / "debug-ba7e8c.log",
        Path.cwd() / "debug-ba7e8c.log",
        _PROJECT_ROOT.parent / "debug-ba7e8c.log",
    ):
        try:
            with path.open("a", encoding="utf-8") as _f:
                _f.write(line + "\n")
            return
        except Exception:
            continue
    # endregion


_SVIT_LOCALES_DIR = _PROJECT_ROOT / "backend" / "data" / "locales"
_svit_json_context_cache: dict[str, str] = {}
# Reliability-first mode is retained as an override, but low-latency mode uses
# guarded first-sentence/audio-update payloads so visible answers are not held by TTS.
FORCE_FINAL_TTS_ONLY = not LOW_LATENCY_VOICE_MODE
RAG_WARMUP_TIMEOUT_S = 5.0
RAG_DOC_COUNT_TIMEOUT_S = 3.0
AUDIO_DEVICE_VALIDATE_TIMEOUT_S = 3.0

_LOCATION_QUERY_TERMS = (
    "where is",
    "location",
    "address",
    "campus location",
    "located",
    "kaha",
    "elli",
    "enga",
    "ekkada",
    "evide",
)

_COURSE_QUERY_TERMS = (
    "course",
    "courses",
    "program",
    "programs",
    "branch",
    "branches",
    "department",
    "departments",
)


def _log_turn_metrics(*args: Any, **kwargs: Any) -> None:
    """Compatibility shim for legacy tests that patch this symbol."""
    log_turn_metrics(*args, **kwargs)


def _is_location_query(text: str | None) -> bool:
    q = (text or "").strip().lower()
    if not q:
        return False
    return any(term in q for term in _LOCATION_QUERY_TERMS)


def _looks_clear_english(text: str) -> bool:
    q = (text or "").strip()
    if not q:
        return False
    ascii_letters = sum(1 for ch in q if ch.isascii() and ch.isalpha())
    non_ascii_letters = sum(1 for ch in q if (not ch.isascii()) and ch.isalpha())
    return ascii_letters >= 3 and non_ascii_letters == 0


def _fees_card_direct_reply(language_key: str, department: str | None) -> str:
    dept = (department or "").strip()
    if not dept:
        return "Please specify the department to view fee structure."
    mapping = {
        "kn": f"{dept} ವಿಭಾಗದ ಶುಲ್ಕ ವಿವರಗಳನ್ನು ತೆರುತ್ತಿದ್ದೇನೆ.",
        "hi": f"{dept} विभाग की फीस जानकारी दिखा रही हूँ।",
        "ta": f"{dept} துறைக்கான கட்டண விவரத்தை காட்டுகிறேன்.",
        "te": f"{dept} విభాగానికి ఫీజు వివరాలు చూపిస్తున్నాను.",
        "ml": f"{dept} വിഭാഗത്തിനായുള്ള ഫീസ് വിവരങ്ങൾ കാണിച്ചുതരാം.",
    }
    return mapping.get(language_key, f"Showing fee structure for {dept}.")


def _documents_card_direct_reply(language_key: str) -> str:
    docs_en = [
        "10th Marks Card",
        "12th / II PUC Marks Card",
        "CET / COMEDK Rank Card + Allotment Letter",
        "Transfer Certificate (TC)",
        "Conduct / Character Certificate",
        "Caste / Income Certificate (if applicable)",
        "Aadhaar Card Copy",
        "Passport Size Photos (6–10)",
        "Migration Certificate (for other board students)",
        "VTU Eligibility Certificate (if required)",
    ]
    spoken_lists: dict[str, list[str]] = {
        "kn": [
            "10ನೇ ತರಗತಿ ಮಾರ್ಕ್ಸ್ ಕಾರ್ಡ್",
            "12ನೇ ಅಥವಾ ದ್ವಿತೀಯ ಪಿಯುಸಿ ಮಾರ್ಕ್ಸ್ ಕಾರ್ಡ್",
            "ಸಿಇಟಿ ಅಥವಾ ಕೋಮೆಡ್ಕೆ ರ್ಯಾಂಕ್ ಕಾರ್ಡ್ ಮತ್ತು ಅಲಾಟ್ಮೆಂಟ್ ಲೆಟರ್",
            "ಟ್ರಾನ್ಸ್‌ಫರ್ ಸರ್ಟಿಫಿಕೆಟ್",
            "ಕಂಡಕ್ಟ್ ಅಥವಾ ಕ್ಯಾರಕ್ಟರ್ ಸರ್ಟಿಫಿಕೆಟ್",
            "ಜಾತಿ ಅಥವಾ ಆದಾಯ ಪ್ರಮಾಣಪತ್ರ ಅಗತ್ಯವಿದ್ದರೆ",
            "ಆಧಾರ್ ಕಾರ್ಡ್ ಪ್ರತಿಯೊಂದು",
            "ಪಾಸ್ಪೋರ್ಟ್ ಸೈಸ್ ಫೋಟೋಗಳು ಆರುರಿಂದ ಹತ್ತು",
            "ಇತರೆ ಬೋರ್ಡ್ ವಿದ್ಯಾರ್ಥಿಗಳಿಗೆ ಮೈಗ್ರೇಶನ್ ಪ್ರಮಾಣಪತ್ರ",
            "ಅಗತ್ಯವಿದ್ದರೆ ವಿ ಟಿ ಯು ಅರ್ಹತಾ ಪ್ರಮಾಣಪತ್ರ",
        ],
        "hi": [
            "दसवीं की मार्क्स कार्ड",
            "बारहवीं या द्वितीय पीयूसी मार्क्स कार्ड",
            "सीईटी या कॉमेडके रैंक कार्ड और अलॉटमेंट लेटर",
            "ट्रांसफर सर्टिफिकेट",
            "कंडक्ट या कैरेक्टर सर्टिफिकेट",
            "आवश्यक होने पर जाति या आय प्रमाणपत्र",
            "आधार कार्ड की प्रति",
            "पासपोर्ट साइज फोटो छह से दस",
            "अन्य बोर्ड छात्रों के लिए माइग्रेशन सर्टिफिकेट",
            "आवश्यक होने पर वीटीयू एलिजिबिलिटी सर्टिफिकेट",
        ],
        "ta": [
            "10ஆம் வகுப்பு மதிப்பெண் அட்டை",
            "12ஆம் அல்லது இரண்டாம் PUC மதிப்பெண் அட்டை",
            "CET அல்லது COMEDK தரவரிசை அட்டை மற்றும் ஒதுக்கீட்டு கடிதம்",
            "மாற்றுச் சான்றிதழ்",
            "நடத்தை அல்லது குணச் சான்றிதழ்",
            "தேவையெனில் சாதி அல்லது வருமானச் சான்றிதழ்",
            "ஆதார் அட்டை நகல்",
            "பாஸ்போர்ட் அளவு புகைப்படங்கள் ஆறு முதல் பத்து",
            "பிற வாரிய மாணவர்களுக்கு மைக்ரேஷன் சான்றிதழ்",
            "தேவையெனில் VTU தகுதி சான்றிதழ்",
        ],
        "te": [
            "10వ తరగతి మార్క్స్ కార్డు",
            "12వ లేదా II PUC మార్క్స్ కార్డు",
            "CET లేదా COMEDK ర్యాంక్ కార్డు మరియు అలాట్‌మెంట్ లెటర్",
            "ట్రాన్స్‌ఫర్ సర్టిఫికేట్",
            "కండక్ట్ లేదా క్యారెక్టర్ సర్టిఫికేట్",
            "అవసరమైతే కులం లేదా ఆదాయం సర్టిఫికేట్",
            "ఆధార్ కార్డు కాపీ",
            "పాస్‌పోర్ట్ సైజ్ ఫోటోలు ఆరు నుండి పది",
            "ఇతర బోర్డు విద్యార్థులకు మైగ్రేషన్ సర్టిఫికేట్",
            "అవసరమైతే VTU ఎలిజిబిలిటీ సర్టిఫికేట్",
        ],
        "ml": [
            "10ാം ക്ലാസ് മാർക്ക് കാർഡ്",
            "12ാം അല്ലെങ്കിൽ II PUC മാർക്ക് കാർഡ്",
            "CET അല്ലെങ്കിൽ COMEDK റാങ്ക് കാർഡ് കൂടാതെ അലോട്ട്മെന്റ് ലെറ്റർ",
            "ട്രാൻസ്ഫർ സർട്ടിഫിക്കറ്റ്",
            "കണ്ടക്റ്റ് അല്ലെങ്കിൽ കാരക്ടർ സർട്ടിഫിക്കറ്റ്",
            "ആവശ്യമായാൽ ജാതി അല്ലെങ്കിൽ വരുമാന സർട്ടിഫിക്കറ്റ്",
            "ആധാർ കാർഡ് പകർപ്പ്",
            "പാസ്‌പോർട്ട് സൈസ് ഫോട്ടോകൾ ആറ് മുതൽ പത്ത് വരെ",
            "മറ്റ് ബോർഡ് വിദ്യാർത്ഥികൾക്ക് മൈഗ്രേഷൻ സർട്ടിഫിക്കറ്റ്",
            "ആവശ്യമായാൽ VTU യോഗ്യത സർട്ടിഫിക്കറ്റ്",
        ],
    }
    items = spoken_lists.get(language_key, docs_en)
    return "Required documents are: " + "; ".join(items) + "."


def _location_direct_reply(language_key: str) -> str:
    mapping = {
        "en": "SVIT is located in Rajanukunte, Via Yalahanka, Bengaluru, Karnataka 560 064.",
        "hi": "SVIT का स्थान Rajanukunte, Via Yalahanka, Bengaluru, Karnataka 560 064 है।",
        "kn": "SVIT Rajanukunte, Via Yalahanka, Bengaluru, Karnataka 560 064ರಲ್ಲಿ ಇದೆ.",
        "ta": "SVIT Rajanukunte, Via Yalahanka, Bengaluru, Karnataka 560 064-ல் அமைந்துள்ளது.",
        "te": "SVIT Rajanukunte, Via Yalahanka, Bengaluru, Karnataka 560 064లో ఉంది.",
        "ml": "SVIT Rajanukunte, Via Yalahanka, Bengaluru, Karnataka 560 064-ൽ സ്ഥിതിചെയ്യുന്നു.",
    }
    return mapping.get(language_key, mapping["en"])


def _card_direct_reply(intent: str, language_key: str, department: str | None = None) -> str | None:
    dept = (department or "").strip()
    if intent == INTENT_ADMISSIONS:
        return {
            "hi": "Admission ki jankari screen par dikha rahi hoon.",
            "kn": "ಪ್ರವೇಶ ಮಾಹಿತಿ ಪರದೆಯ ಮೇಲೆ ತೋರಿಸುತ್ತಿದ್ದೇನೆ.",
        }.get(language_key, "Showing admissions information on screen.")
    if intent == INTENT_PLACEMENTS:
        return {
            "hi": "Placement ki jankari screen par dikha rahi hoon.",
            "kn": "ಪ್ಲೇಸ್ಮೆಂಟ್ ಮಾಹಿತಿ ಪರದೆಯ ಮೇಲೆ ತೋರಿಸುತ್ತಿದ್ದೇನೆ.",
        }.get(language_key, "Showing placement information on screen.")
    if intent == INTENT_DEPARTMENT_OVERVIEW:
        return f"Showing {dept or 'department'} information on screen."
    if intent == INTENT_HOD_PROFILE and dept:
        return f"Showing the HOD information for {dept}."
    if intent in {INTENT_COLLEGE_OVERVIEW, INTENT_TRUSTEES_PROFILE, INTENT_HOD_TRUSTEES_PROFILE}:
        return "Showing the requested college information on screen."
    if intent == INTENT_PRINCIPAL_PROFILE:
        return {
            "hi": "Principal profile screen par dikha raha hoon.",
            "kn": "ಪ್ರಾಂಶುಪಾಲರ ಪ್ರೊಫೈಲ್ ಪರದೆಯ ಮೇಲೆ ತೋರಿಸುತ್ತಿದ್ದೇನೆ.",
        }.get(language_key, "Showing the Principal profile on screen.")
    if intent == INTENT_VICE_PRINCIPAL_PROFILE:
        return {
            "hi": "Vice principal profile screen par dikha raha hoon.",
            "kn": "ಉಪ ಪ್ರಾಂಶುಪಾಲರ ಪ್ರೊಫೈಲ್ ಪರದೆಯ ಮೇಲೆ ತೋರಿಸುತ್ತಿದ್ದೇನೆ.",
        }.get(language_key, "Showing the Vice Principal profile on screen.")
    return None


LLM_REPLY_CACHE = TTLRUCache[str, str](max_size=256, ttl_seconds=600.0)
TTS_CACHE = TTLRUCache[str, str](max_size=256, ttl_seconds=1200.0)
_singleflight_lock_guard = asyncio.Lock()
_singleflight_locks: dict[str, asyncio.Lock] = {}
_ACK_EARCON_B64: str | None = None


async def _singleflight_lock_for(key: str) -> asyncio.Lock:
    async with _singleflight_lock_guard:
        lock = _singleflight_locks.get(key)
        if lock is None:
            lock = asyncio.Lock()
            _singleflight_locks[key] = lock
        return lock


def _normalized_cache_text(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "").strip()).lower()


def _load_svit_json_context(language_code_key: str | None) -> str:
    """
    Load SVIT college facts from backend/data/locales/<locale>.json only (via locale_file_id_for_lang_key).
    Returns minified JSON for prompt injection. Empty string if file missing/invalid.
    """
    locale = locale_file_id_for_lang_key(language_code_key)
    if locale in _svit_json_context_cache:
        return _svit_json_context_cache[locale]
    try:
        path = _SVIT_LOCALES_DIR / f"{locale}.json"
        if not path.is_file():
            logger.warning("JSON context locale missing: %s", path)
            _svit_json_context_cache[locale] = ""
            return ""
        raw = path.read_text(encoding="utf-8")
        data = json.loads(raw)
        minified = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
        _svit_json_context_cache[locale] = minified
        return minified
    except Exception as exc:
        logger.warning("Could not load JSON context: %s", exc)
        _svit_json_context_cache[locale] = ""
        return ""


def _get_ack_earcon_base64() -> str:
    """Generate and cache a short WAV earcon (160ms)."""
    global _ACK_EARCON_B64
    if _ACK_EARCON_B64:
        return _ACK_EARCON_B64
    sample_rate = 16000
    duration_ms = 160
    n_samples = int(sample_rate * duration_ms / 1000.0)
    freq = 880.0
    amp = 0.18
    pcm = bytearray()
    for i in range(n_samples):
        env = min(1.0, i / 200.0, (n_samples - i) / 200.0)
        s = int(32767.0 * amp * env * math.sin(2.0 * math.pi * freq * (i / sample_rate)))
        pcm.extend(struct.pack("<h", s))
    n_frames = len(pcm) // 2
    wav = bytearray()
    wav.extend(b"RIFF")
    wav.extend(struct.pack("<I", 36 + n_frames * 2))
    wav.extend(b"WAVEfmt ")
    wav.extend(struct.pack("<IHHIIHH", 16, 1, 1, sample_rate, sample_rate * 2, 2, 16))
    wav.extend(b"data")
    wav.extend(struct.pack("<I", n_frames * 2))
    wav.extend(pcm)
    _ACK_EARCON_B64 = base64.b64encode(bytes(wav)).decode("ascii")
    return _ACK_EARCON_B64


def _strip_llm_json_fence(text: str) -> str:
    s = (text or "").strip()
    if s.startswith("```"):
        s = re.sub(r"^```(?:json)?\s*", "", s, flags=re.IGNORECASE)
        s = re.sub(r"\s*```\s*$", "", s)
    return s.strip()


def _infer_comparison_focus(merged_text: str) -> str:
    m = (merged_text or "").lower()
    if any(x in m for x in ("child", "kid", "ಮಗು", "बच्च", "குழந்த", "పిల్ల", "കുട്ടി")):
        return "child"
    if "easier" in m or "easy branch" in m or "harder" in m or "difficult" in m:
        return "ease"
    if "future" in m or "scope" in m or "growth" in m:
        return "future"
    if any(x in m for x in ("placement", "package", "salary", "job", "company")):
        return "placements"
    return "generic"


async def _llm_resolve_department_comparison_spec(
    text: str,
    language_name: str,
    seed_ids: list[str],
) -> dict[str, Any]:
    try:
        client = await get_groq_client()
        if not client:
            return {}
        valid = department_order_keys()
        if not valid:
            return {}
        seed_s = ",".join(seed_ids) if seed_ids else "(none)"
        system_prompt = (
            "You assist an SVIT campus kiosk. Valid department_ids (JSON keys only): "
            f"{json.dumps(valid)}.\n"
            "Return ONLY one JSON object (no markdown fences) with keys:\n"
            "- comparison: boolean — true if user wants to compare branches/courses, contrast options, "
            "or a recommendation between programs; false if they only want an unprompted list of all branches.\n"
            "- department_ids: array of 2-3 distinct strings, each must be in valid list above\n"
            "- recommend_focus: null or one of: placements, future, child, ease, generic\n"
            "- highlight_id: null or one string from department_ids to visually favor when data supports it\n"
            "Prefer keeping mentioned programs from the seeds when they are valid. "
            "If only one program is named but the user asks which is better, add related programs from the valid list."
        )
        user_prompt = f"Session language: {language_name}\nRegex seed ids: {seed_s}\nUser query: {text.strip()}"
        completion = await client.chat.completions.create(
            model=RAG_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.0,
            top_p=0.25,
            max_tokens=180,
        )
        raw = _strip_llm_json_fence((completion.choices[0].message.content or "").strip())
        out = json.loads(raw)
        return out if isinstance(out, dict) else {}
    except Exception:
        logger.exception("department comparison spec LLM failed")
        return {}


async def _llm_detect_broad_course_intent(text: str, language_name: str) -> bool:
    """
    LLM classifier for broad course/department-list questions across mixed languages.
    Returns True only when the query asks for a broad list/menu of courses or departments.
    """
    try:
        client = await get_groq_client()
        if not client:
            return False
        system_prompt = (
            "You classify user intent for a college kiosk.\n"
            "Return ONLY one token: BROAD_COURSE_MENU or OTHER.\n"
            "BROAD_COURSE_MENU means user is asking broad options/list of courses, branches, departments, programs.\n"
            "Examples: 'What courses are available?', 'list departments', 'courses kya hain', "
            "'departments batao', 'branches in college', and equivalent mixed-language queries.\n"
            "If the user asks about one specific department, return OTHER."
        )
        user_prompt = f"Language context: {language_name}\nQuery: {text.strip()}"
        completion = await client.chat.completions.create(
            model=RAG_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.0,
            top_p=0.3,
            max_tokens=6,
        )
        result = (completion.choices[0].message.content or "").strip().upper()
        return result.startswith("BROAD_COURSE_MENU")
    except Exception:
        return False


async def tts_to_base64_cached(
    text: str,
    language_code: str,
    *,
    turn_id: str | None = None,
    utterance_kind: str = "reply",
    timeout_s: float | None = None,
) -> tuple[str | None, bool]:
    tts_text = normalize_tts_pronunciation(text)
    key = f"{utterance_kind}|{language_code}|{_normalized_cache_text(tts_text)}"
    logger.info(
        "TTS_REQUEST turn_id=%s kind=%s text_len=%d preview=%r",
        turn_id or "-",
        utterance_kind,
        len(tts_text or ""),
        text_preview(tts_text),
    )
    cached = TTS_CACHE.get(key)
    if cached:
        logger.info(
            "TTS_RESULT turn_id=%s kind=%s source=cache audio_bytes=%d wav_duration_s=%.3f",
            turn_id or "-",
            utterance_kind,
            audio_bytes_len(cached),
            ((estimate_wav_duration_ms(cached) or 0.0) / 1000.0),
        )
        return cached, True

    key_lock = await _singleflight_lock_for(key)
    async with key_lock:
        cached = TTS_CACHE.get(key)
        if cached:
            logger.info(
                "TTS_RESULT turn_id=%s kind=%s source=cache_after_wait audio_bytes=%d wav_duration_s=%.3f",
                turn_id or "-",
                utterance_kind,
                audio_bytes_len(cached),
                ((estimate_wav_duration_ms(cached) or 0.0) / 1000.0),
            )
            return cached, True

        provider_timeout_s = timeout_s or TTS_TIMEOUT_S
        logger.info("TTS_HTTP_START turn_id=%s kind=%s", turn_id or "-", utterance_kind)
        try:
            audio = await asyncio.wait_for(sarvam_tts_to_base64(tts_text, language_code), timeout=provider_timeout_s)
        except asyncio.TimeoutError:
            logger.warning(
                "TTS primary language timed out turn_id=%s kind=%s lang=%s timeout_s=%.2f",
                turn_id or "-",
                utterance_kind,
                language_code,
                provider_timeout_s,
            )
            audio = None
        except Exception as exc:
            logger.exception(
                "TTS primary language failed turn_id=%s kind=%s lang=%s err=%s",
                turn_id or "-",
                utterance_kind,
                language_code,
                exc,
            )
            audio = None
        if not audio and language_code != "en-IN":
            logger.warning(
                "TTS primary language failed turn_id=%s kind=%s lang=%s; retrying en-IN",
                turn_id or "-",
                utterance_kind,
                language_code,
            )
            try:
                audio = await asyncio.wait_for(sarvam_tts_to_base64(tts_text, "en-IN"), timeout=provider_timeout_s)
            except asyncio.TimeoutError:
                logger.warning(
                    "TTS fallback language timed out turn_id=%s kind=%s timeout_s=%.2f",
                    turn_id or "-",
                    utterance_kind,
                    provider_timeout_s,
                )
                audio = None
            except Exception as exc:
                logger.exception(
                    "TTS fallback language failed turn_id=%s kind=%s lang=en-IN err=%s",
                    turn_id or "-",
                    utterance_kind,
                    exc,
                )
                audio = None
        logger.info("TTS_HTTP_END turn_id=%s kind=%s", turn_id or "-", utterance_kind)
        if audio:
            TTS_CACHE.set(key, audio)
        logger.info(
            "TTS_RESULT turn_id=%s kind=%s source=network audio_bytes=%d wav_duration_s=%.3f",
            turn_id or "-",
            utterance_kind,
            audio_bytes_len(audio),
            ((estimate_wav_duration_ms(audio or "") or 0.0) / 1000.0),
        )
        return audio, False


async def maybe_auto_detect_session_language(
    session: dict[str, Any],
    text: str,
    websocket: WebSocket,
    timing: TurnTiming,
    stt_meta: dict[str, Any] | None = None,
) -> None:
    if not AUTO_LANGUAGE_DETECT_ENABLED or not should_run_auto_detect(session):
        return

    turn_marker = int(session.get("session_generation", 0))

    detection = detect_language(
        text=text,
        stt_meta=stt_meta,
        threshold=AUTO_LANGUAGE_DETECT_CONFIDENCE_THRESHOLD,
    )
    is_fallback = detection.method == "threshold_fallback"

    set_session_language(
        session,
        detection.lang_key,
        is_auto=True,
        confidence=detection.confidence,
        method=detection.method,
        sample=text,
    )

    if is_fallback:
        logger.info(
            "Auto language detect fallback -> English (method=%s confidence=%.2f sample=%r)",
            detection.method,
            detection.confidence,
            text[:80],
        )
    else:
        logger.info(
            "Auto language detected: %s (%s, confidence=%.2f)",
            session.get("language_name"),
            detection.method,
            detection.confidence,
        )

    _, lang_name, lang_code = resolve_session_language(session)
    greeting_text = get_greeting(lang_name)
    greeting_audio_b64, _ = await tts_to_base64_cached(
        greeting_text,
        lang_code,
        turn_id=timing.turn_id,
        utterance_kind="auto_detect_greeting",
    )

    if session.get("messages"):
        first = session["messages"][0]
        if isinstance(first, dict) and first.get("id") == "greeting":
            first["text"] = greeting_text

    event_payload: dict[str, Any] = {
        "type": "language_auto_detected",
        "language": lang_name,
        "language_code_key": session.get("language_code_key"),
        "confidence": detection.confidence,
        "method": detection.method,
        "is_language_auto": True,
        "greetingText": greeting_text,
    }
    _greeting_ff = greeting_font_family_css(lang_name)
    if _greeting_ff:
        event_payload["greetingFontFamily"] = _greeting_ff
    if greeting_audio_b64:
        event_payload["greetingAudioBase64"] = greeting_audio_b64

    event_payload.update(debug_payload(timing))
    if _turn_stale(session, turn_marker):
        logger.info("Stale auto-detect turn dropped (session_generation advanced)")
        return
    await _ws_send_json(websocket, 5, session, event_payload)


async def _stream_groq_reply(
    *,
    session: dict[str, Any],
    user_text: str,
    system_prompt: str,
    websocket: WebSocket,
    timing: TurnTiming,
    on_first_sentence: Any | None = None,
    turn_gen_marker: int,
    max_tokens: int | None = None,
) -> tuple[str, str]:
    client = await get_groq_client()
    if not client:
        return "", ""

    messages = [{"role": "system", "content": system_prompt}]
    messages.extend(history_for_llm(session))
    messages.append({"role": "user", "content": user_text})

    timing.mark("llm_start")
    stream = await client.chat.completions.create(
        model=RAG_MODEL,
        messages=messages,
        stream=True,
        max_tokens=max_tokens if max_tokens is not None else LLM_MAX_TOKENS,
        temperature=LLM_TEMPERATURE,
    )

    chunks: list[str] = []
    first_sentence = ""
    last_partial_sent = 0.0

    async for chunk in stream:
        if _turn_stale(session, turn_gen_marker):
            logger.info("Stale LLM stream aborted (session_generation advanced)")
            return "", ""

        delta = ""
        try:
            delta = (chunk.choices[0].delta.content or "")
        except Exception:
            delta = ""

        if not delta:
            continue

        if not timing.has("llm_first_token"):
            timing.mark("llm_first_token")
            timing.set_if_missing("first_feedback")

        chunks.append(delta)
        partial_text = "".join(chunks).strip()

        now_ms = asyncio.get_running_loop().time() * 1000.0
        if now_ms - last_partial_sent >= LLM_STREAM_PARTIAL_DEBOUNCE_MS:
            payload = {
                "type": "assistant_partial",
                "text": partial_text,
                "isProcessing": True,
            }
            payload.update(debug_payload(timing))
            await _ws_send_json(websocket, 5, session, payload)
            last_partial_sent = now_ms

        if not first_sentence:
            s1, _ = split_first_sentence(partial_text)
            if s1 and s1.endswith((".", "!", "?")):
                first_sentence = s1
                if not timing.has("llm_first_sentence"):
                    timing.mark("llm_first_sentence")
                if on_first_sentence is not None:
                    try:
                        on_first_sentence(first_sentence)
                    except Exception:
                        pass

    timing.mark("llm_end")
    return "".join(chunks).strip(), first_sentence


async def _complete_groq_reply(
    *,
    session: dict[str, Any],
    user_text: str,
    system_prompt: str,
    timing: TurnTiming,
    max_tokens: int | None = None,
) -> tuple[str, str]:
    client = await get_groq_client()
    if not client:
        return "", ""
    messages = [{"role": "system", "content": system_prompt}]
    messages.extend(history_for_llm(session))
    messages.append({"role": "user", "content": user_text})
    timing.mark("llm_start")
    completion = await client.chat.completions.create(
        model=RAG_MODEL,
        messages=messages,
        stream=False,
        max_tokens=max_tokens if max_tokens is not None else LLM_MAX_TOKENS,
        temperature=LLM_TEMPERATURE,
    )
    timing.mark("llm_first_token")
    timing.set_if_missing("first_feedback")
    out = (completion.choices[0].message.content or "").strip()
    s1, _ = split_first_sentence(out)
    if s1 and s1.endswith((".", "!", "?")) and not timing.has("llm_first_sentence"):
        timing.mark("llm_first_sentence")
    timing.mark("llm_end")
    return out, s1


def _append_guest_name_system_clause(system_prompt: str, session: dict[str, Any]) -> str:
    name = (session.get("guest_name") or "").strip()
    if not name:
        return system_prompt
    safe = name.replace('"', "'").strip()
    policy_lines = (
        f'The visitor introduced themselves as "{safe}". '
        "Use this only for light rapport. "
        "Default: omit their name—especially in short, single-fact, or yes-or-no answers. "
        "You may use their name at most once in a reply only when the answer is genuinely substantial "
        "(for example: weaving together several facts, answering multiple parts, reassurance, "
        "or closing a longer explanation or narrator-style segment). "
        "Use their name only a few times in the whole chat; do not cluster it only at the beginning—"
        "many turns in a row without the name is correct. "
        "Do not force the name into openings; clarity and accurate facts come first. "
        "Stay grounded strictly in verified SVIT or provided context facts."
    )
    if assistant_last_reply_used_guest_name(session, safe):
        policy_lines += (
            " Your previous reply already used their name; keep this reply without their name "
            "unless the user's latest message clearly calls for personal acknowledgment."
        )
    return f"{system_prompt}\n\n{policy_lines}"


async def _complete_guest_name_turn(
    session: dict[str, Any],
    text: str,
    websocket: WebSocket,
    timing: TurnTiming,
    turn_gen_marker: int,
) -> None:
    """Handle the first user turn after language pick: capture name + send ready_prompt."""
    try:
        processing_payload: dict[str, Any] = {"isProcessing": True, "turn_id": timing.turn_id}
        processing_payload.update(debug_payload(timing))
        await _ws_send_json(websocket, 5, session, processing_payload)
    except Exception as exc:
        logger.warning("Could not send isProcessing for guest name: %s", exc)
        return

    if _turn_stale(session, turn_gen_marker):
        logger.info("Stale guest name turn dropped")
        return

    _, lang_name, lang_code = resolve_session_language(session)
    language_display = session.get("language_name") or lang_name

    session["awaiting_guest_name"] = False
    if guest_name_reply_is_skip(text):
        session["guest_name"] = None
    else:
        session["guest_name"] = normalize_guest_name(text)

    reply_text = get_ready_prompt(language_display, session.get("guest_name"))

    append_session_history(session, "user", text, max_turns=3)
    append_session_history(session, "assistant", reply_text, max_turns=3)

    user_msg = {"id": f"user-{uuid.uuid4().hex}", "role": "user", "text": text.strip()}
    ready_msg = {"id": "ready_prompt", "role": "clara", "text": reply_text}
    session["messages"] = [user_msg, ready_msg]

    tts_cache_hit = False
    timing.mark("tts_start")
    audio_b64 = None
    try:
        audio_b64, tts_cache_hit = await tts_to_base64_cached(
            reply_text,
            lang_code,
            turn_id=timing.turn_id,
            utterance_kind="guest_name_ready_prompt",
        )
    except Exception as exc:
        logger.exception("Guest name ready prompt TTS failed: %s", exc)
    timing.mark("tts_end")

    timing.mark("turn_end")
    utterance_kind = "guest_name_ready_prompt"
    payload: dict[str, Any] = {
        "messages": session["messages"],
        "isProcessing": False,
        "isSpeaking": bool(audio_b64),
        "audioPending": False,
        "turn_id": "ready_after_language_pick",
        "assistantText": reply_text,
        "spokenText": reply_text.strip(),
        "utterance_kind": utterance_kind,
        "segment_index": 0,
        "is_final_segment": True,
        "direct_reply": True,
        "rag_used": False,
        "llm_used": False,
        "tts_cache_hit": tts_cache_hit,
        "llm_cache_hit": False,
    }
    if audio_b64:
        payload["audioBase64"] = audio_b64
        payload["audioUnavailable"] = False
        if not timing.has("play_start"):
            timing.mark("play_start")
            est = estimate_wav_duration_ms(audio_b64)
            if est is not None and not timing.has("play_end"):
                timing.marks["play_end"] = timing.marks["play_start"] + est
    else:
        payload["audioUnavailable"] = True

    payload.update(debug_payload(timing))
    try:
        if not _turn_stale(session, turn_gen_marker):
            await _ws_send_json(websocket, 5, session, payload)
            log_voice_turn_end(timing.turn_id, timing.summary_ms(), success=True)
            log_turn_metrics(
                timing,
                llm_cache_hit=False,
                tts_cache_hit=tts_cache_hit,
                language=language_display or "English",
            )
    except Exception as exc:
        logger.warning("Guest name outbound failed: %s", exc)


async def process_user_text_and_reply(
    session: dict[str, Any],
    text: str,
    websocket: WebSocket,
    timing: TurnTiming,
    stt_meta: dict[str, Any] | None = None,
    local_intent: dict[str, Any] | None = None,
) -> None:
    """Shared flow: RAG context, Groq reply, TTS, send state 5 payload. Assumes text is non-empty."""
    turn_gen_marker = int(session.get("session_generation", 0))
    if session.get("awaiting_guest_name"):
        await _complete_guest_name_turn(session, text, websocket, timing, turn_gen_marker)
        return

    append_session_history(session, "user", text, max_turns=3)
    try:
        processing_payload = {"isProcessing": True, "turn_id": timing.turn_id}
        processing_payload.update(debug_payload(timing))
        await _ws_send_json(websocket, 5, session, processing_payload)
        if ENABLE_EARLY_PARTIAL_TEXT and not timing.has("first_feedback"):
            timing.mark("first_feedback")
            early_partial_payload = {
                "type": "assistant_partial",
                "text": "Got it.",
                "isProcessing": True,
                "turn_id": timing.turn_id,
            }
            early_partial_payload.update(debug_payload(timing))
            await _ws_send_json(websocket, 5, session, early_partial_payload)
        if ENABLE_ACK_EARCON:
            ack_audio_b64 = _get_ack_earcon_base64()
            if not timing.has("play_start"):
                timing.mark("play_start")
                est = estimate_wav_duration_ms(ack_audio_b64)
                if est is not None and not timing.has("play_end"):
                    timing.marks["play_end"] = timing.marks["play_start"] + est
            ack_payload = {
                "type": "assistant_ack_audio",
                "utterance_kind": "ack_earcon",
                "audioBase64": ack_audio_b64,
                "isProcessing": True,
                "turn_id": timing.turn_id,
            }
            ack_payload.update(debug_payload(timing))
            await _ws_send_json(websocket, 5, session, ack_payload)
    except Exception as exc:
        logger.warning("Could not send isProcessing: %s", exc)
        return

    if _turn_stale(session, turn_gen_marker):
        logger.info("Stale process_user_text_and_reply after initial outbound (session_generation advanced)")
        return

    await maybe_auto_detect_session_language(session, text, websocket, timing, stt_meta=stt_meta)
    lang_key, lang_name, lang_code = resolve_session_language(session)

    llm_cache_hit = False
    tts_cache_hit = False
    first_sentence_task: asyncio.Task | None = None
    first_sentence_sent = False
    reply_outbound_completed = False

    try:
        faq_direct_reply = get_faq_answer_for_question(text, lang_name)
        if faq_direct_reply:
            preprocess = None
            english_translation = ""
            department_hint = None
            query_en = text.strip()
            merged_for_features = query_en
            features = extract_features("", department_hint=None)
            intent = INTENT_NORMAL_QUERY
            detected_department = None
            logger.info("[FAQ_TRACE] matched deterministic FAQ answer before Groq/RAG")
        else:
            preprocess: dict[str, Any] | None = None
            if lang_key == "en" and _looks_clear_english(text):
                preprocess = None
            else:
                try:
                    preprocess = await asyncio.wait_for(
                        normalize_and_classify_query(text, lang_name),
                        timeout=MULTILINGUAL_PREPROCESSOR_TIMEOUT_S,
                    )
                except asyncio.TimeoutError:
                    logger.warning(
                        "Multilingual preprocessor timed out after %.2fs; falling back to raw text",
                        MULTILINGUAL_PREPROCESSOR_TIMEOUT_S,
                    )
                    preprocess = None
                except Exception as exc:
                    logger.warning("Multilingual preprocessor failed: %s", exc)
                    preprocess = None

            english_translation = str((preprocess or {}).get("english_translation") or "").strip()
            department_hint = (preprocess or {}).get("target_department")
            query_en = english_translation or text.strip()
            # Documents and other mixed-language triggers must work on raw + translated text.
            merged_for_features = f"{query_en} {text}".strip()
            features = extract_features(merged_for_features, department_hint=department_hint)
            intent = resolve_intent_from_features(features)
            detected_department = features.department_name

            # Safety fallback: if translation drops department tokens, retry extraction on raw input.
            if intent == INTENT_DEPARTMENT_FEES and not detected_department:
                raw_features = extract_features(text, department_hint=department_hint)
                if raw_features.department_name:
                    detected_department = raw_features.department_name

        if not faq_direct_reply:
            # Hard override for deterministic department clicks from department menu.
            local_intent_type = str((local_intent or {}).get("type") or "").strip().lower()
            if local_intent_type == "department_click":
                selected_department = str((local_intent or {}).get("departmentLabel") or "").strip()
                if selected_department:
                    detected_department = selected_department
                    intent = INTENT_DEPARTMENT_OVERVIEW

            # Frontend local intent is a fallback path only when backend resolves no actionable card.
            elif local_intent and intent == INTENT_NORMAL_QUERY:
                frontend_trigger = str(local_intent.get("trigger") or "").strip().lower()
                if frontend_trigger in {"department_overview", "department"}:
                    intent = INTENT_DEPARTMENT_OVERVIEW
                elif frontend_trigger in {"course_menu", "courses"}:
                    intent = INTENT_COURSE_MENU
                elif frontend_trigger in {"hod", "hod_info", "head_of_department"}:
                    intent = INTENT_HOD_PROFILE
                elif frontend_trigger == "admissions":
                    intent = INTENT_ADMISSIONS
                elif frontend_trigger == "placements":
                    intent = INTENT_PLACEMENTS
                elif frontend_trigger in {"fees", "department_fees"}:
                    intent = INTENT_DEPARTMENT_FEES
                elif frontend_trigger == "documents":
                    intent = INTENT_DOCUMENTS
                elif frontend_trigger in {"bus_routes", "bus routes", "bus"}:
                    intent = INTENT_BUS_ROUTES
                elif frontend_trigger in {"principal_profile", "principal"}:
                    intent = INTENT_PRINCIPAL_PROFILE
                elif frontend_trigger in {"vice_principal_profile", "vice_principal"}:
                    intent = INTENT_VICE_PRINCIPAL_PROFILE
                frontend_dept = local_intent.get("departmentLabel")
                if frontend_dept and not detected_department:
                    detected_department = str(frontend_dept)
            elif local_intent:
                frontend_dept = local_intent.get("departmentLabel")
                if frontend_dept and not detected_department:
                    detected_department = str(frontend_dept)
                # If local layer clearly identified fees intent, keep it card-driven.
                frontend_trigger = str(local_intent.get("trigger") or "").strip().lower()
                if frontend_trigger in {"fees", "department_fees"} and intent in {INTENT_NORMAL_QUERY, INTENT_ADMISSIONS}:
                    intent = INTENT_DEPARTMENT_FEES if detected_department else INTENT_ADMISSIONS
                elif frontend_trigger == "documents" and intent == INTENT_NORMAL_QUERY:
                    intent = INTENT_DOCUMENTS

            intent = maybe_override_intent_with_executive_profile(intent, merged_for_features)

        rag_query = query_en
        llm_user_text = query_en
        entity_map = {"department": detected_department}

        logger.info("[NLP_TRACE] RAW_INPUT=%r", text)
        logger.info("[NLP_TRACE] QUERY_EN=%r", query_en)
        logger.info("[NLP_TRACE] DETECTED_LANGUAGE=%s(%s)", lang_name, lang_key)
        logger.info("[NLP_TRACE] FEATURES=%s", features)
        logger.info("[NLP_TRACE] FINAL_INTENT=%s", intent)
        logger.info("[NLP_TRACE] FINAL_DEPARTMENT=%s", detected_department)

        # Force location/address questions through vector RAG context instead of narrator-only flow.
        # This prevents false "unavailable" replies when precise location facts are in college_knowledge.
        is_location_turn = False if faq_direct_reply else (_is_location_query(text) or _is_location_query(query_en))
        if is_location_turn and intent != INTENT_BUS_ROUTES:
            intent = INTENT_NORMAL_QUERY

        is_broad_course_menu = False
        should_check_broad_course = (
            not faq_direct_reply
            and (
            intent == INTENT_COURSE_MENU
            or (intent == INTENT_NORMAL_QUERY and any(term in merged_for_features.lower() for term in _COURSE_QUERY_TERMS))
            )
        )
        if should_check_broad_course:
            try:
                is_broad_course_menu = await asyncio.wait_for(
                    _llm_detect_broad_course_intent(rag_query, lang_name),
                    timeout=1.6,
                )
            except asyncio.TimeoutError:
                is_broad_course_menu = False
            if is_broad_course_menu:
                intent = INTENT_COURSE_MENU

        # Recover comparison when routing heuristics wrongly leave intent as NORMAL/COURSE_MENU or
        # even DEPARTMENT_OVERVIEW (first matched program). Contrast cue + ≥2 programs ⇒ table, not a single card.
        if intent in (INTENT_NORMAL_QUERY, INTENT_COURSE_MENU, INTENT_DEPARTMENT_OVERVIEW):
            comp_recover_labels = extract_comparison_department_canonical_labels(merged_for_features)
            if len(comp_recover_labels) >= 2 and (
                text_has_department_comparison_cue(merged_for_features)
                or text_has_department_comparison_cue(text)
                or text_has_department_comparison_cue(query_en)
            ):
                intent = INTENT_DEPARTMENT_COMPARISON

        comparison_dept_ids: list[str] = []
        comparison_recommend_focus = "generic"
        comparison_highlight_id: str | None = None
        if intent == INTENT_DEPARTMENT_COMPARISON:
            seeds = validate_department_ids(
                [
                    k
                    for k in (
                        department_label_to_json_key(lab) for lab in features.comparison_department_names
                    )
                    if k
                ]
            )
            comparison_dept_ids = seeds
            comparison_recommend_focus = _infer_comparison_focus(merged_for_features)
            comparison_highlight_id = comparison_dept_ids[0] if comparison_dept_ids else None
            needs_llm = len(comparison_dept_ids) < 2 or bool(
                getattr(features, "is_comparison_recommendation", False)
            )
            if needs_llm:
                try:
                    spec = await asyncio.wait_for(
                        _llm_resolve_department_comparison_spec(rag_query, lang_name, comparison_dept_ids),
                        timeout=2.0,
                    )
                except asyncio.TimeoutError:
                    spec = {}
                if isinstance(spec, dict):
                    cand = validate_department_ids(list(spec.get("department_ids") or []))
                    if len(cand) >= 2:
                        comparison_dept_ids = cand
                    rf = spec.get("recommend_focus")
                    if isinstance(rf, str) and rf.strip():
                        comparison_recommend_focus = rf.strip().lower()
                    hid = spec.get("highlight_id")
                    if isinstance(hid, str) and hid in comparison_dept_ids:
                        comparison_highlight_id = hid
            if len(comparison_dept_ids) < 2:
                comparison_dept_ids = validate_department_ids(default_comparison_ids(3))
            if comparison_highlight_id is None or comparison_highlight_id not in comparison_dept_ids:
                comparison_highlight_id = comparison_dept_ids[0] if comparison_dept_ids else None

        off_topic_direct_reply: str | None = None
        if intent == INTENT_OFF_TOPIC:
            off_topic_direct_reply = get_off_topic_reply(lang_name)
        department_required_card_intents = {
            INTENT_DEPARTMENT_OVERVIEW,
            INTENT_DEPARTMENT_FEES,
            INTENT_HOD_PROFILE,
        }
        if intent in department_required_card_intents and not detected_department:
            logger.info("Strict card routing: suppressing %s without a clear department", intent)
            if intent == INTENT_HOD_PROFILE:
                pass
            else:
                intent = INTENT_NORMAL_QUERY

        # Narrator/card intents must be spoken from TARGET_CARD_DATA, not shortcut "Showing..." text.
        precomputed_card_direct_reply = None if (faq_direct_reply or is_narrator_intent(intent)) else _card_direct_reply(intent, lang_key, detected_department)
        timing.mark("rag_start")
        narrator_payload: dict[str, Any] | None = None
        context_source = "none"
        if faq_direct_reply:
            context = ""
            context_source = "faq"
            timing.mark("rag_end")
        elif off_topic_direct_reply is not None:
            # Strict scope guard: do not answer non-college questions.
            context = ""
            timing.mark("rag_end")
        elif intent == INTENT_DOCUMENTS or intent == INTENT_BUS_ROUTES or is_location_turn:
            context = ""
            timing.mark("rag_end")
        elif intent == INTENT_DEPARTMENT_COMPARISON:
            context = build_comparison_context_for_llm(comparison_dept_ids, lang_key=lang_key)
            hint_bits: list[str] = []
            if comparison_recommend_focus and comparison_recommend_focus != "generic":
                hint_bits.append(f"recommend_focus={comparison_recommend_focus}")
            if comparison_highlight_id:
                hint_bits.append(f"highlight_id={comparison_highlight_id}")
            if hint_bits:
                context = f"{context}\n\n(Session hints: {', '.join(hint_bits)})"
            timing.mark("rag_end")
            context_source = "comparison_registry"
        elif is_narrator_intent(intent):
            # Presentation mode: only locale JSON slices that match on-screen cards (no vector RAG).
            narrator_payload = build_target_card_payload(
                intent,
                lang_key=lang_key,
                detected_department_label=detected_department,
                user_text=rag_query,
            )
            if narrator_payload is not None:
                context = ""
                timing.mark("rag_end")
                logger.info(
                    "Narrator mode: intent=%s locale=%s payload_keys=%s",
                    intent,
                    narrator_payload.get("locale") if narrator_payload else None,
                    list(narrator_payload.keys()) if narrator_payload else [],
                )
            else:
                # Narrator payload failed (e.g., department not found in locale data).
                # Fall back to text-only RAG; do not emit a card without matching data.
                logger.warning(
                    "[NLP_TRACE] Narrator payload was None for intent=%s dept=%s; falling back to RAG context",
                    intent, detected_department,
                )
                intent = INTENT_NORMAL_QUERY
                precomputed_card_direct_reply = None
                try:
                    context = await asyncio.wait_for(
                        asyncio.to_thread(get_relevant_context, rag_query, min(RAG_TOP_K, 4), lang_key="en"),
                        timeout=RAG_CONTEXT_TIMEOUT_S,
                    )
                except asyncio.TimeoutError:
                    context = ""
                finally:
                    timing.mark("rag_end")
                if context.strip():
                    context_source = "rag"
                else:
                    json_context = _load_svit_json_context(lang_key)
                    if json_context:
                        context = json_context
                        context_source = "json_fallback"
        else:
            # Normal query: English-indexed RAG chunks.
            try:
                context = await asyncio.wait_for(
                    asyncio.to_thread(get_relevant_context, rag_query, min(RAG_TOP_K, 4), lang_key="en"),
                    timeout=RAG_CONTEXT_TIMEOUT_S,
                )
            except asyncio.TimeoutError:
                logger.warning("RAG context timed out after %.2fs; continuing without context", RAG_CONTEXT_TIMEOUT_S)
                context = ""
            finally:
                timing.mark("rag_end")
            if context.strip():
                context_source = "rag"
                logger.info("RAG context: ok (%d chars)", len(context))
            else:
                logger.warning("RAG context: empty")
                json_context = _load_svit_json_context(lang_key)
                if json_context:
                    context = json_context
                    context_source = "json_fallback"
                    logger.info("RAG fallback: using JSON master context (%d chars)", len(context))

        # Intent-driven prompt control
        unavailable_reply = get_unavailable_reply(lang_name)
        off_topic_reply = get_off_topic_reply(lang_name)
        if narrator_payload is not None:
            card_json = json.dumps(narrator_payload, ensure_ascii=False, indent=2)
            system_prompt = _append_guest_name_system_clause(
                build_narrator_system_prompt(lang_name, card_json),
                session,
            )
        elif intent == INTENT_DEPARTMENT_COMPARISON:
            system_prompt = build_system_prompt(INTENT_DEPARTMENT_COMPARISON, lang_name, context)
        else:
            system_prompt = (
                f"You are CLARA, a warm and professional campus receptionist for SVIT. "
                f"Reply only in {lang_name}. "
                "You are CLARA, a sweet, helpful, and highly direct AI assistant for SVIT. "
                "CRITICAL: Your responses MUST be extremely concise, punchy, and conversational. Maximum 2 to 3 short sentences. "
                "Do NOT output long lists, bullet points, or markdown formatting. "
                "If the user asks for fees or specific details, extract ONLY the exact number/fact from context and deliver it immediately. "
                "If the user asks multiple distinct questions or about multiple distinct entities in a single sentence, "
                "you MUST provide a complete answer for ALL of them based strictly on the provided context. "
                "Tone: Warm, direct, and highly impactful. "
                f"If information is unavailable, say exactly: {unavailable_reply}. "
                f"If the question is not related to SVIT/college topics, say exactly: {off_topic_reply}"
            )
            system_prompt = _append_guest_name_system_clause(system_prompt, session)

        if context.strip() and narrator_payload is None and intent != INTENT_DEPARTMENT_COMPARISON:
            if lang_key != "en" and context_source == "rag":
                directive = multilingual_rag_reply_directive(lang_name)
            else:
                directive = rag_language_enforcement_directive(lang_name)
            system_prompt += (
                f" {directive} "
                "Use only the college information below when relevant. "
                f"Do not invent facts.\n\nCollege information:\n{context}"
            )

        if narrator_payload is not None:
            context_sig = hashlib.sha256(
                json.dumps(narrator_payload, sort_keys=True, ensure_ascii=True).encode("utf-8")
            ).hexdigest()[:12]
        else:
            context_sig = hashlib.sha256((context or "").encode("utf-8")).hexdigest()[:12]
        query_norm = _normalized_cache_text(rag_query)
        raw_norm = _normalized_cache_text(text)
        cache_key = f"v2-direct|{intent}|{lang_key}|{query_norm}|{context_sig}"
        cache_key_candidates = [cache_key]
        if raw_norm and raw_norm != query_norm:
            cache_key_candidates.append(f"v2-direct|{intent}|{lang_key}|{raw_norm}|{context_sig}")
        if intent != INTENT_NORMAL_QUERY:
            # Backward-compatible fallback: if intent routing changes between turns,
            # still allow retrieval of a prior normal-query cache entry for same text/context.
            cache_key_candidates.append(
                f"v2-direct|{INTENT_NORMAL_QUERY}|{lang_key}|{query_norm}|{context_sig}"
            )
            if raw_norm and raw_norm != query_norm:
                cache_key_candidates.append(
                    f"v2-direct|{INTENT_NORMAL_QUERY}|{lang_key}|{raw_norm}|{context_sig}"
                )
        direct_reply = faq_direct_reply or off_topic_direct_reply
        if is_location_turn:
            direct_reply = _location_direct_reply(lang_key)
        if intent == INTENT_HOD_PROFILE and not entity_map.get("department"):
            # Deterministic guard: never default to CSE for ambiguous HOD requests.
            direct_reply = "Please specify the department to know the HOD."
        if intent == INTENT_COURSE_MENU:
            direct_reply = get_course_menu_spoken_prompt(lang_name)
        elif intent == INTENT_BUS_ROUTES:
            direct_reply = get_bus_routes_spoken_prompt(lang_name)
        elif intent == INTENT_DOCUMENTS:
            direct_reply = _documents_card_direct_reply(lang_key)
        elif intent == INTENT_DEPARTMENT_FEES:
            direct_reply = _fees_card_direct_reply(lang_key, detected_department)
        else:
            direct_reply = direct_reply or precomputed_card_direct_reply
        if direct_reply is None and not is_narrator_intent(intent):
            direct_reply = direct_reply or get_profile_direct_reply(intent, lang_name)
        reply_text = direct_reply
        if reply_text is None:
            for candidate_key in cache_key_candidates:
                cached = LLM_REPLY_CACHE.get(candidate_key)
                if cached:
                    reply_text = cached
                    break
        first_sentence = ""
        llm_max_out_tokens = (
            LLM_MAX_TOKENS_DEPARTMENT_COMPARISON
            if intent == INTENT_DEPARTMENT_COMPARISON
            else LLM_MAX_TOKENS
        )

        async def _emit_first_sentence_audio(sentence: str) -> None:
            nonlocal first_sentence_sent
            if not sentence or first_sentence_sent:
                return
            timing.mark("tts_first_start")
            first_audio_b64, _ = await tts_to_base64_cached(
                sentence,
                lang_code,
                turn_id=timing.turn_id,
                utterance_kind="assistant_first_sentence",
            )
            timing.mark("tts_first_end")
            if not first_audio_b64:
                return
            first_sentence_sent = True
            if not timing.has("play_start"):
                timing.mark("play_start")
                est = estimate_wav_duration_ms(first_audio_b64)
                if est is not None and not timing.has("play_end"):
                    timing.marks["play_end"] = timing.marks["play_start"] + est
            first_payload = {
                "type": "assistant_first_sentence_audio",
                "text": sentence,
                "assistantText": sentence,
                "spokenText": sentence,
                "audioBase64": first_audio_b64,
                "isProcessing": True,
                "turn_id": timing.turn_id,
                "utterance_kind": "assistant_first_sentence",
                "segment_index": 0,
                "is_final_segment": False,
            }
            first_payload.update(debug_payload(timing))
            if _turn_stale(session, turn_gen_marker):
                logger.info("Stale first-sentence audio send dropped")
                return
            await _ws_send_json(websocket, 5, session, first_payload)

        def _maybe_start_first_sentence_tts(sentence: str) -> None:
            nonlocal first_sentence_task
            if LOW_LATENCY_VOICE_MODE:
                return
            if faq_direct_reply:
                return
            if FORCE_FINAL_TTS_ONLY:
                return
            if not ENABLE_TTS_PIPELINING or not ENABLE_FIRST_SENTENCE_TTS:
                return
            if len(sentence.strip()) > FIRST_SENTENCE_TTS_MAX_CHARS:
                return
            if reply_text and sentence.strip() == reply_text.strip():
                return
            if first_sentence_task is None and sentence and sentence.strip():
                first_sentence_task = asyncio.create_task(_emit_first_sentence_audio(sentence.strip()))
                first_sentence_task.add_done_callback(
                    lambda task: task.exception()
                    if not task.cancelled()
                    else None
                )

        if direct_reply:
            timing.mark("llm_start")
            timing.mark("llm_first_token")
            timing.mark("llm_end")
            first_sentence, _ = split_first_sentence(reply_text)
            timing.set_if_missing("first_feedback")
            _maybe_start_first_sentence_tts(first_sentence)
        elif reply_text:
            llm_cache_hit = True
            timing.mark("llm_start")
            timing.mark("llm_first_token")
            timing.mark("llm_end")
            first_sentence, _ = split_first_sentence(reply_text)
            timing.set_if_missing("first_feedback")
            _maybe_start_first_sentence_tts(first_sentence)
        else:
            try:
                if ENABLE_LLM_STREAMING:
                    reply_text, first_sentence = await asyncio.wait_for(
                        _stream_groq_reply(
                            session=session,
                            user_text=llm_user_text,
                            system_prompt=system_prompt,
                            websocket=websocket,
                            timing=timing,
                            on_first_sentence=_maybe_start_first_sentence_tts,
                            turn_gen_marker=turn_gen_marker,
                            max_tokens=llm_max_out_tokens,
                        ),
                        timeout=LLM_STREAM_TIMEOUT_S,
                    )
                else:
                    reply_text, first_sentence = await asyncio.wait_for(
                        _complete_groq_reply(
                            session=session,
                            user_text=llm_user_text,
                            system_prompt=system_prompt,
                            timing=timing,
                            max_tokens=llm_max_out_tokens,
                        ),
                        timeout=LLM_STREAM_TIMEOUT_S,
                    )
            except asyncio.TimeoutError:
                logger.warning("Groq stream timed out after %.2fs", LLM_STREAM_TIMEOUT_S)
                timing.mark("llm_end")
                reply_text = ""
                first_sentence = ""
            except Exception as exc:
                logger.exception("Groq streaming failed: %s", exc)
                reply_text = ""
                first_sentence = ""

        # Normal RAG replies may be translated after English generation.
        # Narrator replies are generated directly in the selected language from locale card JSON.
        if reply_text and not direct_reply and narrator_payload is None and lang_name != "English":
            try:
                client = await get_groq_client()
                reply_text = await translate_reply_to_session_language_async(
                    reply_en=reply_text,
                    lang_name=lang_name,
                    client=client,
                    model=RAG_MODEL,
                )
            except Exception:
                logger.exception("Reply translation failed; using English output")

        if not reply_text:
            if is_narrator_intent(intent):
                if lang_key == "kn":
                    reply_text = "ಮಾಹಿತಿಯನ್ನು ಪರದೆಯ ಮೇಲೆ ಪ್ರದರ್ಶಿಸಲಾಗುತ್ತಿದೆ."
                elif lang_key == "hi":
                    reply_text = "जानकारी स्क्रीन पर प्रदर्शित हो रही है।"
                elif lang_key == "te":
                    reply_text = "సమాచారం స్క్రీన్‌పై ప్రదర్శించబడుతుంది."
                elif lang_key == "ta":
                    reply_text = "தகவல் திரையில் காண்பிக்கப்படுகிறது."
                elif lang_key == "ml":
                    reply_text = "കൂടുതൽ വിവരങ്ങൾ സ്ക്രീനിൽ കാണാം."
                else:
                    reply_text = "Here is the information you requested."
            else:
                reply_text = unavailable_reply

        if not llm_cache_hit:
            LLM_REPLY_CACHE.set(cache_key, reply_text)
        append_session_history(session, "assistant", reply_text, max_turns=3)

        if first_sentence and first_sentence != reply_text:
            logger.info(
                "TURN_TTS_SPLIT turn_id=%s first_sentence_len=%d full_reply_len=%d first_preview=%r full_preview=%r",
                timing.turn_id,
                len(first_sentence),
                len(reply_text),
                text_preview(first_sentence),
                text_preview(reply_text),
            )

        if (
            ENABLE_FIRST_SENTENCE_TTS
            and (not LOW_LATENCY_VOICE_MODE)
            and (not FORCE_FINAL_TTS_ONLY)
            and (not ENABLE_TTS_PIPELINING)
            and first_sentence
            and first_sentence != reply_text
        ):
            await _emit_first_sentence_audio(first_sentence)

        user_msg = {"id": f"user-{uuid.uuid4().hex}", "role": "user", "text": text}
        assistant_msg = {"id": f"clara-{uuid.uuid4().hex}", "role": "clara", "text": reply_text}
        if (not faq_direct_reply) and intent in (
            INTENT_COURSE_MENU,
            INTENT_BUS_ROUTES,
            INTENT_DOCUMENTS,
            INTENT_DEPARTMENT_OVERVIEW,
            INTENT_DEPARTMENT_FEES,
            INTENT_ADMISSIONS,
            INTENT_PLACEMENTS,
        ):
            assistant_msg["isHidden"] = True
        
        # Mark card-driven intents so frontend opens the proper cards.
        show_card = None
        department_id = None
        course_menu_options = None
        if faq_direct_reply:
            show_card = None
        elif intent == INTENT_COLLEGE_OVERVIEW:
            show_card = "college"
        elif intent == INTENT_ADMISSIONS:
            # Regional/mixed fee queries without resolved department still open the fees card
            # (all-departments table), instead of falling back to plain text admissions mode.
            if getattr(features, "is_fee_query", False) and entity_map.get("department"):
                show_card = "department_fees"
                department_id = entity_map.get("department")
            else:
                show_card = "admissions"
        elif intent == INTENT_PLACEMENTS:
            show_card = "placements"
        elif intent == INTENT_DEPARTMENT_OVERVIEW:
            if entity_map.get("department"):
                show_card = "department_overview"
                department_id = entity_map.get("department")
        elif intent == INTENT_DEPARTMENT_FEES:
            if entity_map.get("department"):
                show_card = "department_fees"
                department_id = entity_map.get("department")
        elif intent == INTENT_HOD_PROFILE:
            if entity_map.get("department"):
                show_card = "hod"
                department_id = entity_map.get("department")
            else:
                show_card = None
                department_id = None
        elif intent == INTENT_TRUSTEES_PROFILE:
            show_card = "college"
        elif intent == INTENT_HOD_TRUSTEES_PROFILE:
            if entity_map.get("department"):
                show_card = "hod"
                department_id = entity_map.get("department")
            else:
                show_card = "college"
        elif intent == INTENT_COURSE_MENU:
            show_card = "course_menu"
            course_menu_options = get_course_menu_options()
            reply_text = get_course_menu_spoken_prompt(lang_name)
            assistant_msg["text"] = reply_text
            assistant_msg["isHidden"] = True
        elif intent == INTENT_DOCUMENTS:
            show_card = "documents"
            assistant_msg["text"] = _documents_card_direct_reply(lang_key)
            assistant_msg["isHidden"] = True
        elif intent == INTENT_BUS_ROUTES:
            show_card = "bus_routes"
            reply_text = get_bus_routes_spoken_prompt(lang_name)
            assistant_msg["text"] = reply_text
            assistant_msg["isHidden"] = True
        elif intent == INTENT_PRINCIPAL_PROFILE:
            show_card = "principal_profile"
        elif intent == INTENT_VICE_PRINCIPAL_PROFILE:
            show_card = "vice_principal_profile"
        elif intent == INTENT_DEPARTMENT_COMPARISON:
            show_card = "department_comparison"

        if show_card is not None:
            assistant_msg["isCardData"] = True
            assistant_msg["isHidden"] = True

        logger.info(
            "[CARD_TRIGGER_FINAL] raw=%r query_en=%r entities=%s intent=%s showCard=%s departmentId=%r",
            text,
            query_en,
            entity_map,
            intent,
            show_card,
            department_id,
        )
            
        session["messages"] = session.get("messages", []) + [user_msg, assistant_msg]

        defer_card_until_tts_ready = LOW_LATENCY_VOICE_MODE and show_card is not None
        visible_payload: dict[str, Any] = {
            "messages": session["messages"],
            "isProcessing": False,
            "isSpeaking": LOW_LATENCY_VOICE_MODE and bool(reply_text.strip()),
            "audioPending": LOW_LATENCY_VOICE_MODE and bool(reply_text.strip()),
            "audioUnavailable": False,
            "turn_id": timing.turn_id,
            "assistantText": assistant_msg.get("text", ""),
            "spokenText": reply_text.strip(),
            "utterance_kind": "assistant_visible_answer",
            "segment_index": 0,
            "is_final_segment": False,
            "showCard": None if defer_card_until_tts_ready else show_card,
            "intent": intent,
            "direct_reply": direct_reply is not None,
            "rag_used": context_source == "rag",
            "llm_used": direct_reply is None and not llm_cache_hit,
            "tts_cache_hit": False,
            "llm_cache_hit": llm_cache_hit,
        }
        if department_id and not defer_card_until_tts_ready:
            visible_payload["departmentId"] = department_id
        if course_menu_options and not defer_card_until_tts_ready:
            visible_payload["options"] = course_menu_options
        if LOW_LATENCY_VOICE_MODE:
            timing.mark("visible_answer")
            timing.mark("turn_end")
            visible_payload.update(debug_payload(timing))
            if _turn_stale(session, turn_gen_marker):
                logger.info("Stale visible process_user_text payload dropped (session_generation advanced)")
                return
            await _ws_send_json(websocket, 5, session, visible_payload)

        async def _await_first_sentence_task() -> None:
            if first_sentence_task is None:
                return
            try:
                await first_sentence_task
            except Exception:
                logger.exception("First-sentence TTS task failed")

        if (not LOW_LATENCY_VOICE_MODE) and first_sentence_task is not None:
            await _await_first_sentence_task()

        tts_text = reply_text
        utterance_kind = "assistant_full_reply"
        segment_index = 0
        is_final_segment = True
        if first_sentence_sent and first_sentence and first_sentence.strip() == reply_text.strip():
            # Early first-sentence audio already covered the full reply; skip duplicate final TTS.
            tts_text = ""
            utterance_kind = "assistant_first_sentence_only"
            segment_index = 1
        elif (
            ENABLE_ONCE_ONLY_TTS_SEGMENTS
            and (first_sentence_sent or (LOW_LATENCY_VOICE_MODE and first_sentence_task is not None))
            and first_sentence
            and first_sentence != reply_text
        ):
            _, remainder_text = split_first_sentence(reply_text)
            remainder_text = remainder_text.strip()
            if remainder_text:
                tts_text = remainder_text
                utterance_kind = "assistant_remaining_reply"
                segment_index = 1
            else:
                tts_text = ""
                utterance_kind = "assistant_remaining_reply"
                segment_index = 1

        timing.mark("tts_start")
        full_audio_b64 = None
        final_backup_audio_b64 = None
        tts_cache_hit = False
        tts_timed_out = False
        tts_budget_s = TTS_TIMEOUT_S + 2.0
        if faq_direct_reply:
            # FAQ answers are deterministic and can be longer than the normal short voice reply.
            # Do not use the low-latency audio-update budget here; the UI waits on thinking
            # until this audio is ready so visible text and TTS stay matched.
            tts_budget_s = max(TTS_TIMEOUT_S + 12.0, 18.0)
        elif intent == INTENT_DEPARTMENT_COMPARISON:
            # Full multi-section comparison narration + chunked TTS needs a larger end-to-end budget.
            tts_budget_s = max(TTS_TIMEOUT_S + 42.0, 72.0)
        elif LOW_LATENCY_VOICE_MODE:
            elapsed_before_tts_s = (timing.since_start("tts_start") or 0.0) / 1000.0
            tts_budget_s = max(0.5, AUDIO_UPDATE_TIMEOUT_S - elapsed_before_tts_s)

        spoken_for_payload = (tts_text or reply_text).strip()

        def _merge_assistant_audio_payload(
            *,
            audio_b64: str | None,
            is_speaking: bool,
            audio_pending: bool,
            audio_unavailable: bool,
            utterance_kind_val: str,
            segment_index_val: int,
            is_final_segment_val: bool,
            tts_cache_hit_val: bool,
            tts_streaming: bool | None,
            tts_chunk_index: int | None,
        ) -> dict[str, Any]:
            merged: dict[str, Any] = {
                "messages": session["messages"],
                "isProcessing": False,
                "isSpeaking": is_speaking,
                "audioPending": audio_pending,
                "turn_id": timing.turn_id,
                "assistantText": assistant_msg.get("text", ""),
                "spokenText": spoken_for_payload,
                "utterance_kind": utterance_kind_val,
                "segment_index": segment_index_val,
                "is_final_segment": is_final_segment_val,
                "showCard": show_card,
                "intent": intent,
                "direct_reply": direct_reply is not None,
                "rag_used": context_source == "rag",
                "llm_used": direct_reply is None and not llm_cache_hit,
                "tts_cache_hit": tts_cache_hit_val,
                "llm_cache_hit": llm_cache_hit,
                "audioUnavailable": audio_unavailable,
            }
            if LOW_LATENCY_VOICE_MODE:
                merged["type"] = "assistant_audio_update"
            if department_id:
                merged["departmentId"] = department_id
            if intent == INTENT_DEPARTMENT_COMPARISON and comparison_dept_ids:
                merged["comparisonDepartments"] = list(comparison_dept_ids)
                merged["comparisonRecommendFocus"] = comparison_recommend_focus
                if comparison_highlight_id:
                    merged["comparisonHighlightId"] = comparison_highlight_id
            if course_menu_options:
                merged["options"] = course_menu_options
            if audio_b64:
                merged["audioBase64"] = audio_b64
            if tts_streaming is not None:
                merged["tts_streaming"] = tts_streaming
            if tts_chunk_index is not None:
                merged["tts_chunk_index"] = tts_chunk_index
            if tts_streaming is True and tts_chunk_index == 0:
                total_chars = len(tts_text.strip())
                merged["tts_total_chars"] = total_chars
                merged["tts_total_duration_estimate_ms"] = max(2500, int(total_chars * 55))
            merged.update(debug_payload(timing))
            return merged

        had_streaming_interim = False
        successful_chunk_chars = 0
        failed_chunk_indices: list[int] = []
        if tts_text and tts_text.strip() and LOW_LATENCY_VOICE_MODE:
            chunk_source_text = tts_text.strip()
            if show_card == "department_overview":
                max_chars = TTS_CHUNK_MAX_CHARS_NARRATOR
            elif show_card == "department_comparison":
                max_chars = TTS_CHUNK_MAX_CHARS_COMPARISON
            else:
                max_chars = TTS_CHUNK_MAX_CHARS
            chunks = split_tts_chunks(chunk_source_text, max_chars=max_chars)
            if not chunks:
                chunks = [chunk_source_text]
            faq_chunk_t0 = max(TTS_CHUNK_FIRST_TIMEOUT_S, 8.0)
            faq_chunk_tr = max(TTS_CHUNK_TIMEOUT_S, 8.0)
            comparison_chunk_t0 = max(TTS_CHUNK_FIRST_TIMEOUT_S, 12.0)
            comparison_chunk_tr = max(TTS_CHUNK_TIMEOUT_S, 12.0)
            # Card narrations (department overview, fees, HOD, etc.) often chain many chunks;
            # use generous per-chunk budgets so later chunks are not dropped while the UI still
            # shows audioPending from the initial visible payload.
            card_narration_chunk_t0 = max(TTS_CHUNK_FIRST_TIMEOUT_S, 12.0)
            card_narration_chunk_tr = max(TTS_CHUNK_TIMEOUT_S, 12.0)
            streamed_any = False
            for i, chunk in enumerate(chunks):
                if faq_direct_reply:
                    timeout_i = faq_chunk_t0 if i == 0 else faq_chunk_tr
                elif intent == INTENT_DEPARTMENT_COMPARISON:
                    timeout_i = comparison_chunk_t0 if i == 0 else comparison_chunk_tr
                elif show_card is not None:
                    timeout_i = card_narration_chunk_t0 if i == 0 else card_narration_chunk_tr
                else:
                    timeout_i = TTS_CHUNK_FIRST_TIMEOUT_S if i == 0 else TTS_CHUNK_TIMEOUT_S
                chunk_kind = f"{utterance_kind}_chunk_{i}"
                audio_b64: str | None = None
                hit = False
                attempts = 0
                for attempt in range(1, 4):
                    attempts = attempt
                    try:
                        audio_b64, hit = await asyncio.wait_for(
                            tts_to_base64_cached(
                                chunk,
                                lang_code,
                                turn_id=timing.turn_id,
                                utterance_kind=chunk_kind,
                                timeout_s=timeout_i,
                            ),
                            timeout=timeout_i + 0.25,
                        )
                    except asyncio.TimeoutError:
                        logger.warning(
                            "TTS_CHUNK_ATTEMPT_TIMEOUT turn_id=%s chunk_index=%d attempts=%d timeout_s=%.2f",
                            timing.turn_id,
                            i,
                            attempt,
                            timeout_i,
                        )
                        audio_b64, hit = None, False
                    if audio_b64:
                        break
                    logger.warning(
                        "TTS_CHUNK_ATTEMPT_EMPTY turn_id=%s chunk_index=%d attempts=%d timeout_s=%.2f",
                        timing.turn_id,
                        i,
                        attempt,
                        timeout_i,
                    )
                if not audio_b64:
                    failed_chunk_indices.append(i)
                    logger.warning(
                        "TTS_CHUNK_FAILED turn_id=%s chunk_index=%d total_chunks=%d attempts=%d timeout_s=%.2f",
                        timing.turn_id,
                        i,
                        len(chunks),
                        attempts,
                        timeout_i,
                    )
                    continue
                successful_chunk_chars += len(chunk)
                streamed_any = True
                tts_cache_hit = tts_cache_hit or hit
                full_audio_b64 = audio_b64
                logger.info(
                    "TTS_CHUNK_SUCCESS turn_id=%s chunk_index=%d total_chunks=%d attempts=%d chars=%d",
                    timing.turn_id,
                    i,
                    len(chunks),
                    attempts,
                    len(chunk),
                )
                if not timing.has("play_start"):
                    timing.mark("play_start")
                    est = estimate_wav_duration_ms(audio_b64)
                    if est is not None:
                        timing.marks["play_end"] = timing.marks["play_start"] + est
                interim = _merge_assistant_audio_payload(
                    audio_b64=audio_b64,
                    is_speaking=True,
                    audio_pending=False,
                    audio_unavailable=False,
                    utterance_kind_val=chunk_kind,
                    segment_index_val=segment_index,
                    is_final_segment_val=False,
                    tts_cache_hit_val=tts_cache_hit,
                    tts_streaming=True,
                    tts_chunk_index=i,
                )
                if _turn_stale(session, turn_gen_marker):
                    logger.info("Stale streaming TTS chunk dropped (session_generation advanced)")
                    return
                await _ws_send_json(websocket, 5, session, interim)
                had_streaming_interim = True

            logger.info(
                "TTS_STREAM_COMPLETENESS turn_id=%s spoken_chars=%d total_chars=%d failed_chunk_indices=%s streamed_any=%s",
                timing.turn_id,
                successful_chunk_chars,
                len(chunk_source_text),
                failed_chunk_indices,
                streamed_any,
            )
            needs_full_backup = (
                successful_chunk_chars < len(chunk_source_text)
                or bool(failed_chunk_indices)
                or not streamed_any
            )
            logger.info(
                "TTS_FULL_BACKUP_START turn_id=%s needs_full_backup=%s",
                timing.turn_id,
                needs_full_backup,
            )
            retry_kind = "assistant_full_reply_backup"
            try:
                retry_audio, retry_hit = await asyncio.wait_for(
                    tts_to_base64_cached(
                        chunk_source_text,
                        lang_code,
                        turn_id=timing.turn_id,
                        utterance_kind=retry_kind,
                        timeout_s=FULL_TTS_FALLBACK_TIMEOUT,
                    ),
                    timeout=FULL_TTS_FALLBACK_TIMEOUT + 0.5,
                )
            except asyncio.TimeoutError:
                logger.warning(
                    "TTS_FULL_BACKUP_TIMEOUT turn_id=%s timeout_s=%.2f",
                    timing.turn_id,
                    FULL_TTS_FALLBACK_TIMEOUT,
                )
                retry_audio, retry_hit = None, False
            if retry_audio:
                tts_cache_hit = tts_cache_hit or retry_hit
                full_audio_b64 = retry_audio
                final_backup_audio_b64 = retry_audio
                utterance_kind = retry_kind
                if not timing.has("play_start"):
                    timing.mark("play_start")
                    est = estimate_wav_duration_ms(retry_audio)
                    if est is not None:
                        timing.marks["play_end"] = timing.marks["play_start"] + est
                logger.info(
                    "TTS_FULL_BACKUP_SUCCESS turn_id=%s needs_full_backup=%s streamed_any=%s failed_chunk_indices=%s",
                    timing.turn_id,
                    needs_full_backup,
                    streamed_any,
                    failed_chunk_indices,
                )
            else:
                logger.warning(
                    "TTS_FULL_BACKUP_EMPTY turn_id=%s needs_full_backup=%s streamed_any=%s failed_chunk_indices=%s",
                    timing.turn_id,
                    needs_full_backup,
                    streamed_any,
                    failed_chunk_indices,
                )

            if not full_audio_b64 and reply_text.strip():
                logger.warning(
                    "TTS_NO_AUDIBLE_FALLBACK turn_id=%s failed_chunk_indices=%s",
                    timing.turn_id,
                    failed_chunk_indices,
                )
        elif tts_text:
            try:
                full_audio_b64, tts_cache_hit = await asyncio.wait_for(
                    tts_to_base64_cached(
                        tts_text,
                        lang_code,
                        turn_id=timing.turn_id,
                        utterance_kind=utterance_kind,
                        timeout_s=tts_budget_s if faq_direct_reply else None,
                    ),
                    timeout=tts_budget_s,
                )
            except asyncio.TimeoutError:
                logger.warning(
                    "Assistant TTS update timed out after %.2fs turn_id=%s kind=%s",
                    tts_budget_s,
                    timing.turn_id,
                    utterance_kind,
                )
                tts_timed_out = True
        # Safety fallback: if segmented/final TTS returned nothing, retry once with full reply text.
        if not LOW_LATENCY_VOICE_MODE and not full_audio_b64 and reply_text.strip():
            fallback_audio_b64, fallback_cache_hit = await tts_to_base64_cached(
                    reply_text,
                    lang_code,
                    turn_id=timing.turn_id,
                    utterance_kind="assistant_full_reply_fallback",
                )
            if fallback_audio_b64:
                    full_audio_b64 = fallback_audio_b64
                    tts_cache_hit = tts_cache_hit or fallback_cache_hit
                    utterance_kind = "assistant_full_reply_fallback"
                    segment_index = 0
                    is_final_segment = True
                    tts_text = reply_text
        timing.mark("tts_end")
        if tts_timed_out and LOW_LATENCY_VOICE_MODE and not faq_direct_reply:
            timing.marks["tts_end"] = timing.started_ms + (AUDIO_UPDATE_TIMEOUT_S * 1000.0)
        if full_audio_b64 and not timing.has("play_start"):
            timing.mark("play_start")
            est = estimate_wav_duration_ms(full_audio_b64)
            if est is not None:
                timing.marks["play_end"] = timing.marks["play_start"] + est

        tts_ms = timing.duration("tts_start", "tts_end") or 0.0
        log_voice_tts(
            timing.turn_id,
            tts_ms,
            len(tts_text),
            text_preview(tts_text),
            audio_bytes_len(full_audio_b64) if full_audio_b64 else 0,
            decoded_duration_ms=estimate_wav_duration_ms(full_audio_b64) if full_audio_b64 else None,
        )

        timing.mark("turn_end")

        audible_audio_ready = bool(full_audio_b64) or had_streaming_interim
        final_wire_audio = final_backup_audio_b64 or (None if had_streaming_interim else full_audio_b64)
        payload = _merge_assistant_audio_payload(
            audio_b64=final_wire_audio,
            is_speaking=audible_audio_ready,
            audio_pending=False,
            audio_unavailable=not audible_audio_ready,
            utterance_kind_val=utterance_kind,
            segment_index_val=segment_index,
            is_final_segment_val=is_final_segment,
            tts_cache_hit_val=tts_cache_hit,
            tts_streaming=False,
            tts_chunk_index=None,
        )
        if _turn_stale(session, turn_gen_marker):
            logger.info("Stale final/audio process_user_text payload dropped (session_generation advanced)")
            return
        await _ws_send_json(websocket, 5, session, payload)
        reply_outbound_completed = True

        log_voice_turn_end(timing.turn_id, timing.summary_ms(), success=True)

        log_turn_metrics(
            timing,
            llm_cache_hit=llm_cache_hit,
            tts_cache_hit=tts_cache_hit,
            language=session.get("language_name") or "English",
        )
    except asyncio.CancelledError:
        timing.mark("turn_end")
        logger.info("process_user_text_and_reply cancelled turn_id=%s", timing.turn_id)
        # If we already sent visible_answer with audioPending=True but never reached the final
        # assistant_audio_update, clear the gate so the kiosk cannot stay in "thinking" forever.
        if LOW_LATENCY_VOICE_MODE and (not reply_outbound_completed) and (
            not _turn_stale(session, turn_gen_marker)
        ):
            try:
                cleanup: dict[str, Any] = {
                    "messages": session.get("messages", []),
                    "isProcessing": False,
                    "isSpeaking": False,
                    "audioPending": False,
                    "audioUnavailable": True,
                    "turn_id": timing.turn_id,
                    "type": "assistant_audio_update",
                    "tts_streaming": False,
                    "utterance_kind": "assistant_turn_cancelled_cleanup",
                    "segment_index": 0,
                    "is_final_segment": True,
                }
                cleanup.update(debug_payload(timing))
                await _ws_send_json(websocket, 5, session, cleanup)
            except Exception:
                logger.debug("cancel cleanup send failed turn_id=%s", timing.turn_id, exc_info=True)
        raise
    except Exception as exc:
        logger.exception("process_user_text_and_reply failed: %s", exc)
        timing.mark("turn_end")
        try:
            err_payload = build_error_payload(
                "PROCESS_FAILED",
                "Something went wrong. Please try again.",
                timing.turn_id,
                recoverable=True,
            )
            err_payload.update(debug_payload(timing))
            await _ws_send_json(websocket, 5, session, err_payload)
        except Exception:
            pass
        log_turn_metrics(timing, error="process_failed")
        log_voice_turn_end(timing.turn_id, timing.summary_ms(), success=False, error_code="PROCESS_FAILED")


def _cancel_active_reply_task(session: dict[str, Any]) -> None:
    """Cancel the background assistant reply task, if any (orb interrupt / new user turn)."""
    t = session.pop("active_reply_task", None)
    if isinstance(t, asyncio.Task) and not t.done():
        t.cancel()


def _schedule_process_user_text_reply(
    session: dict[str, Any],
    text: str,
    websocket: WebSocket,
    timing: TurnTiming,
    *,
    stt_meta: dict[str, Any] | None = None,
    local_intent: dict[str, Any] | None = None,
) -> None:
    """Run process_user_text_and_reply in a cancellable task so cancel_turn / a new message can preempt."""
    prev = session.get("active_reply_task")
    if isinstance(prev, asyncio.Task) and not prev.done():
        prev.cancel()

    session["session_generation"] = int(session.get("session_generation", 0)) + 1

    async def _runner() -> None:
        try:
            await process_user_text_and_reply(
                session,
                text,
                websocket,
                timing,
                stt_meta=stt_meta,
                local_intent=local_intent,
            )
        except asyncio.CancelledError:
            logger.info("Assistant reply task cancelled turn_id=%s", timing.turn_id)
            raise
        except Exception:
            logger.exception("Assistant reply task crashed turn_id=%s", timing.turn_id)

    new_task = asyncio.create_task(_runner())
    session["active_reply_task"] = new_task

    def _on_done(finished: asyncio.Task) -> None:
        if session.get("active_reply_task") is finished:
            session.pop("active_reply_task", None)

    new_task.add_done_callback(_on_done)


@asynccontextmanager
async def lifespan(app: object):
    """Startup: log RAG document count, validate audio devices, warm clients. Shutdown: close clients."""
    try:
        await asyncio.wait_for(
            asyncio.to_thread(warmup_rag),
            timeout=RAG_WARMUP_TIMEOUT_S,
        )
    except asyncio.TimeoutError:
        logger.warning("RAG warmup timed out after %.1fs; continuing without warmup", RAG_WARMUP_TIMEOUT_S)
    except Exception as exc:
        logger.warning("RAG warmup exception: %s", exc)

    try:
        n = await asyncio.wait_for(
            asyncio.to_thread(get_rag_document_count),
            timeout=RAG_DOC_COUNT_TIMEOUT_S,
        )
        if n == 0:
            logger.warning("RAG: college_knowledge table is empty. Run: python -m backend.tools.ingest_college_knowledge_pg")
        else:
            logger.info("RAG: college_knowledge has %s documents.", n)
    except asyncio.TimeoutError:
        logger.warning("RAG doc-count check timed out after %.1fs", RAG_DOC_COUNT_TIMEOUT_S)
    except Exception as exc:
        logger.warning("RAG: could not check database: %s", exc)

    try:
        audio_ok, audio_msg = await asyncio.wait_for(
            asyncio.to_thread(validate_audio_devices),
            timeout=AUDIO_DEVICE_VALIDATE_TIMEOUT_S,
        )
        if not audio_ok:
            logger.warning("AUDIO: %s Set AUDIO_INPUT_DEVICE_INDEX or AUDIO_INPUT_DEVICE_NAME in .env", audio_msg)
        else:
            logger.info("AUDIO: %s", audio_msg)
    except asyncio.TimeoutError:
        logger.warning("AUDIO validation timed out after %.1fs; continuing", AUDIO_DEVICE_VALIDATE_TIMEOUT_S)

    log_ws_auth_configuration_warnings()
    asyncio.create_task(warmup_clients())
    yield
    await close_clients()


app = FastAPI(title="CLARA Backend", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=WS_ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root() -> dict[str, str]:
    return {"status": "ok", "service": "CLARA"}


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "healthy"}


@app.get("/ready")
def ready() -> dict[str, Any]:
    """Dependency readiness for production monitors. Does not expose secrets."""
    origins = [str(origin).strip() for origin in WS_ALLOWED_ORIGINS if str(origin).strip()]
    wildcard_origins = [origin for origin in origins if origin in {"*", "null"} or origin.endswith("://*")]
    checks: dict[str, Any] = {
        "groq_configured": bool(GROQ_API_KEY),
        "sarvam_configured": bool(SARVAM_API_KEY),
        "production_strict_ready": PRODUCTION_STRICT_READY,
        "rag_documents": 0,
        "rag_min_documents": RAG_MIN_DOCUMENTS,
        "rag_ready": False,
        "ws_auth_required": bool(WS_AUTH_REQUIRED),
        "ws_allowed_origins_count": len(origins),
        "ws_allowed_origins_locked": bool(origins) and not wildcard_origins,
    }
    try:
        doc_count = get_rag_document_count()
        checks["rag_documents"] = doc_count
        checks["rag_ready"] = doc_count >= (RAG_MIN_DOCUMENTS if PRODUCTION_STRICT_READY else 1)
    except Exception as exc:
        checks["rag_error"] = type(exc).__name__

    required_checks = [
        bool(checks["groq_configured"]),
        bool(checks["sarvam_configured"]),
        bool(checks["rag_ready"]),
    ]
    if PRODUCTION_STRICT_READY:
        if REQUIRE_WS_AUTH_IN_PRODUCTION:
            required_checks.append(bool(checks["ws_auth_required"]))
        required_checks.append(bool(checks["ws_allowed_origins_locked"]))

    ready_ok = all(required_checks)
    return {
        "status": "ready" if ready_ok else "degraded",
        "service": "CLARA",
        "checks": checks,
    }


@app.get("/api/campus/map")
def campus_map_get() -> dict[str, Any]:
    """Public campus floorplan + room geometry (same JSON the kiosk loads)."""
    return get_campus_map_json()


@app.post("/api/campus/match")
def campus_match_post(payload: dict[str, Any]) -> dict[str, Any]:
    """Match a spoken phrase to a room row from `svit-campus-map.json`."""
    transcript = str(payload.get("transcript") or "").strip()
    return match_campus_transcript(transcript)


@app.post("/api/campus/route")
def campus_route_post(payload: dict[str, Any]) -> dict[str, Any]:
    """Deterministic graph route (Dijkstra) when nodes/edges exist in the map JSON."""
    return compute_campus_route(payload)


VALID_LANGUAGES = frozenset(LANGUAGE_NAME_TO_CODE_KEY.keys())


def _attach_session_gen(session: dict[str, Any], payload: dict[str, Any] | None) -> dict[str, Any]:
    """Every outbound websocket payload carries session_gen for kiosk stale-merge prevention."""
    # Monotonic per-connection ordering: delayed duplicate resets can share session_gen with a
    # later wake; clients must discard inbound messages with wire_seq not strictly increasing.
    session["wire_seq"] = int(session.get("wire_seq", 0)) + 1
    wseq = session["wire_seq"]
    g = int(session.get("session_generation", 0))
    if payload is None:
        return {"session_gen": g, "wire_seq": wseq}
    merged = dict(payload)
    merged["session_gen"] = g
    merged["wire_seq"] = wseq
    return merged


_WS_SEND_LOCK_ACQUIRE_TIMEOUT_S = 0.25


async def _ws_send_json(
    websocket: WebSocket,
    state_out: int,
    session: dict[str, Any],
    payload: dict[str, Any] | None,
) -> None:
    """Serialize websocket sends per session, but never block longer than 250ms.

    Concurrent senders (background reply task vs WS receive loop) try to acquire
    the per-session lock briefly. If contention exceeds the timeout we fall
    through and send anyway so a slow socket can never permanently stall the
    final audioPending=False frame or chunked TTS interim frames.
    """
    send_lock = session.get("ws_send_lock")
    if not isinstance(send_lock, asyncio.Lock):
        send_lock = asyncio.Lock()
        session["ws_send_lock"] = send_lock

    acquired = False
    try:
        await asyncio.wait_for(
            send_lock.acquire(), timeout=_WS_SEND_LOCK_ACQUIRE_TIMEOUT_S
        )
        acquired = True
    except asyncio.TimeoutError:
        logger.warning(
            "ws_send_lock contention >%.2fs; sending without lock state=%s",
            _WS_SEND_LOCK_ACQUIRE_TIMEOUT_S,
            state_out,
        )
        # region agent log
        _agent_debug_ndjson(
            "C",
            "main.py:_ws_send_json",
            "ws_send_lock_contention",
            {"state_out": state_out},
        )
        # endregion

    try:
        await websocket.send_json(
            {"state": state_out, "payload": _attach_session_gen(session, payload)}
        )
    finally:
        if acquired:
            send_lock.release()


def _turn_stale(session: dict[str, Any], turn_marker: int) -> bool:
    """True if reset_session / home / cancel_turn / new user message advanced session_generation."""
    return int(session.get("session_generation", 0)) != int(turn_marker)


@app.websocket("/ws/clara")
async def websocket_clara(websocket: WebSocket):
    is_valid, reason = validate_websocket_handshake(websocket)
    if not is_valid:
        logger.warning("Rejected websocket handshake: reason=%s", reason)
        # 1008: policy violation (safe close code for auth/origin failures)
        await websocket.close(code=1008, reason=reason)
        return
    await websocket.accept()
    logger.info("WebSocket client connected")
    session: dict[str, Any] = {
        "session_generation": 0,
        "wire_seq": 0,
        "ws_send_lock": asyncio.Lock(),
        "language": None,
        "language_code": None,
        "language_name": None,
        "language_code_key": None,
        "is_language_auto": None,
        "language_detection": None,
        "messages": [],
        "history": [],
        "guest_name": None,
        "awaiting_guest_name": False,
        "cached_greeting_audio": None,
        "cached_greeting_message": None,
    }

    try:
        await _ws_send_json(websocket, 0, session, None)

        while True:
            data = await websocket.receive_text()
            msg, msg_error = parse_inbound_ws_message(data)
            if msg_error:
                invalid_turn_id = uuid.uuid4().hex[:12]
                payload = build_error_payload(
                    "INVALID_MESSAGE",
                    "Invalid request payload.",
                    invalid_turn_id,
                    recoverable=True,
                )
                await _ws_send_json(websocket, 5, session, payload)
                continue
            action = msg.get("action")
            # region agent log
            _agent_debug_ndjson(
                "WS",
                "main.py:ws_loop",
                "inbound_action",
                {"action": action},
            )
            # endregion

            if action in {"reset_session", "home"}:
                _cancel_active_reply_task(session)
                session["session_generation"] = int(session.get("session_generation", 0)) + 1
                session.update(
                    {
                        "language": None,
                        "language_code": None,
                        "language_name": None,
                        "language_code_key": None,
                        "is_language_auto": None,
                        "language_detection": None,
                        "messages": [],
                        "history": [],
                        "guest_name": None,
                        "awaiting_guest_name": False,
                        "cached_greeting_audio": None,
                        "cached_greeting_message": None,
                    }
                )
                await _ws_send_json(websocket, 0, session, None)
                continue

            if action == "cancel_turn":
                _cancel_active_reply_task(session)
                session["session_generation"] = int(session.get("session_generation", 0)) + 1
                await _ws_send_json(
                    websocket,
                    5,
                    session,
                    {
                        "isProcessing": False,
                        "audioPending": False,
                        "type": "assistant_audio_update",
                        "tts_streaming": False,
                    },
                )
                continue

            if action == "wake":
                # Client goes straight to chat; language is chosen inline after the first greeting.
                await _ws_send_json(websocket, 5, session, None)
                continue

            if action == "language_gate_prompt":
                audio_b64 = None
                try:
                    audio_b64, _ = await tts_to_base64_cached(
                        get_language_required_nudge_english(),
                        TARGET_LANGUAGE_CODES["en"],
                        utterance_kind="language_gate_prompt",
                    )
                except Exception as exc:
                    logger.exception("Language gate prompt TTS failed: %s", exc)
                payload: dict[str, Any] = {
                    "isSpeaking": bool(audio_b64),
                    "isProcessing": False,
                    "turn_id": "language_gate_prompt",
                }
                if audio_b64:
                    payload["audioBase64"] = audio_b64
                else:
                    payload["error"] = "Could not generate language prompt audio."
                await _ws_send_json(websocket, 5, session, payload)
                continue

            if action == "language_selected":
                language = msg.get("language")
                if language not in VALID_LANGUAGES:
                    await _ws_send_json(websocket, 5, session, None)
                    continue
                code_key = LANGUAGE_NAME_TO_CODE_KEY[language]
                set_session_language(session, code_key, is_auto=False)
                session["language_detection"] = None
                session["awaiting_guest_name"] = True
                session["guest_name"] = None
                name_prompt_text = get_name_prompt(language)
                name_prompt_msg = {"id": "name_prompt", "role": "clara", "text": name_prompt_text}
                audio_b64 = None
                try:
                    audio_b64, _ = await tts_to_base64_cached(
                        name_prompt_text,
                        session["language_code"],
                        utterance_kind="language_selected_name_prompt",
                    )
                except Exception as exc:
                    logger.exception("Language name prompt TTS failed: %s", exc)
                session["messages"] = [name_prompt_msg]
                session["cached_greeting_audio"] = None
                session["cached_greeting_message"] = None
                payload: dict[str, Any] = {
                    "messages": session["messages"],
                    "isSpeaking": bool(audio_b64),
                    "isProcessing": False,
                }
                if audio_b64:
                    payload["audioBase64"] = audio_b64
                    payload["turn_id"] = "name_after_language_pick"
                else:
                    payload["error"] = "Could not generate name prompt audio."
                await _ws_send_json(websocket, 5, session, payload)
                continue

            if action == "campus_navigation_tts":
                text = (msg.get("text") or "").strip()
                language = msg.get("language") or session.get("language_name") or "English"
                if language not in VALID_LANGUAGES:
                    language = "English"
                code_key = LANGUAGE_NAME_TO_CODE_KEY[language]
                lang_code = TARGET_LANGUAGE_CODES[code_key]
                turn_id = (msg.get("turn_id") or f"campus-nav-{uuid.uuid4().hex[:12]}").strip()
                audio_b64 = None
                try:
                    audio_b64, _ = await tts_to_base64_cached(
                        text,
                        lang_code,
                        turn_id=turn_id,
                        utterance_kind="campus_navigation_tts",
                    )
                except Exception as exc:
                    logger.exception("Campus navigation TTS failed: %s", exc)
                payload: dict[str, Any] = {
                    "type": "campus_navigation_tts",
                    "isSpeaking": bool(audio_b64),
                    "isProcessing": False,
                    "turn_id": turn_id,
                    "utterance_kind": "campus_navigation_tts",
                }
                if audio_b64:
                    payload["audioBase64"] = audio_b64
                else:
                    payload["error"] = "Could not generate campus navigation audio."
                await _ws_send_json(websocket, 5, session, payload)
                continue

            if action == "conversation_started":
                # First visit from sleep: no UI language yet — short English intro only (e.g. Good afternoon… assistant.).
                if session.get("language_code_key") is None:
                    opening_display = get_wakeup_language_gate_display_text()
                    opening_message = {"id": "greeting", "role": "clara", "text": opening_display}
                    en_tts = TARGET_LANGUAGE_CODES["en"]
                    audio_b64, _ = await tts_to_base64_cached(
                        get_wakeup_language_gate_tts_text(),
                        en_tts,
                        utterance_kind="conversation_started_opening",
                    )
                    language_prompt_audio_b64, _ = await tts_to_base64_cached(
                        get_language_required_nudge_english(),
                        en_tts,
                        utterance_kind="language_gate_prompt",
                    )
                    session["messages"] = [opening_message]
                    payload_open: dict[str, Any] = {
                        "messages": session["messages"],
                        "isSpeaking": bool(audio_b64),
                        "isProcessing": False,
                    }
                    if audio_b64:
                        payload_open["audioBase64"] = audio_b64
                        payload_open["turn_id"] = "greeting_opening"
                    else:
                        payload_open["error"] = "Could not generate opening audio."
                    if language_prompt_audio_b64:
                        payload_open["languagePromptAudioBase64"] = language_prompt_audio_b64
                    _gff_open = greeting_font_family_css("English")
                    if _gff_open:
                        payload_open["greetingFontFamily"] = _gff_open
                    await _ws_send_json(websocket, 5, session, payload_open)
                    continue

                _, lang_name, lang_code = resolve_session_language(session)
                greeting_text = get_greeting(lang_name)
                greeting_message = {"id": "greeting", "role": "clara", "text": greeting_text}

                audio_b64 = session.get("cached_greeting_audio")
                if audio_b64 and session.get("cached_greeting_message"):
                    payload = {
                        "messages": [session["cached_greeting_message"]],
                        "isSpeaking": True,
                        "audioBase64": audio_b64,
                        "turn_id": "greeting_selected"
                    }
                    _gff_c = greeting_font_family_css(lang_name)
                    if _gff_c:
                        payload["greetingFontFamily"] = _gff_c
                    session["cached_greeting_audio"] = None
                    session["cached_greeting_message"] = None
                    await _ws_send_json(websocket, 5, session, payload)
                else:
                    audio_b64, _ = await tts_to_base64_cached(
                        greeting_text,
                        lang_code,
                        utterance_kind="conversation_started_greeting",
                    )
                    if not session.get("messages"):
                        session["messages"] = [greeting_message]
                    payload: dict[str, Any] = {
                        "messages": session["messages"],
                        "isSpeaking": bool(audio_b64),
                    }
                    if audio_b64:
                        payload["audioBase64"] = audio_b64
                        payload["turn_id"] = "greeting_started"
                    else:
                        payload["error"] = "Voice service is temporarily unavailable. Text mode is still available."
                    _gff2 = greeting_font_family_css(lang_name)
                    if _gff2:
                        payload["greetingFontFamily"] = _gff2
                    await _ws_send_json(websocket, 5, session, payload)
                continue

            if action == "user_message":
                text = (msg.get("text") or "").strip()
                local_intent = msg.get("localIntent")
                # region agent log
                _agent_debug_ndjson(
                    "E",
                    "main.py:ws_user_message",
                    "inbound_user_message",
                    {"text_len": len(text), "has_local_intent": local_intent is not None},
                )
                # endregion
                timing = TurnTiming()
                timing.mark("transcript_ready")

                if not text:
                    timing.mark("turn_end")
                    payload = {"error": "Missing text", "isProcessing": False}
                    payload.update(debug_payload(timing))
                    await _ws_send_json(websocket, 5, session, payload)
                    log_turn_metrics(timing, error="missing_text")
                elif session.get("language_code_key") is None:
                    timing.mark("turn_end")
                    if "BACKGROUND_NOISE" in text or "**BACKGROUND_NOISE**" in text:
                        await _ws_send_json(
                            websocket,
                            5,
                            session,
                            {"isProcessing": False, "turn_id": timing.turn_id},
                        )
                        log_turn_metrics(timing, error="language_gate_noise")
                    else:
                        nudge = get_language_required_nudge_english()
                        gate_payload: dict[str, Any] = {
                            "isProcessing": False,
                            "messages": [{"id": "lang_gate", "role": "clara", "text": nudge}],
                            "turn_id": timing.turn_id,
                        }
                        gate_payload.update(debug_payload(timing))
                        await _ws_send_json(websocket, 5, session, gate_payload)
                        log_turn_metrics(timing, error="language_not_selected")
                else:
                    _schedule_process_user_text_reply(
                        session,
                        text,
                        websocket,
                        timing,
                        stt_meta=None,
                        local_intent=local_intent,
                    )
                continue

            if action in ("toggle_mic", "mic_start"):
                # region agent log
                _agent_debug_ndjson(
                    "E",
                    "main.py:ws_mic_start",
                    "inbound_mic_capture",
                    {"action": action},
                )
                # endregion
                timing = TurnTiming()
                processing_payload = {"isProcessing": True, "turn_id": timing.turn_id}
                processing_payload.update(debug_payload(timing))
                await _ws_send_json(websocket, 5, session, processing_payload)

                dev_idx, dev_name = get_input_device_info()
                log_voice_capture_start(
                    timing.turn_id,
                    dev_idx,
                    dev_name,
                    sample_rate=16000,
                    channels=1,
                    dtype="int16",
                    mode=AUDIO_RECORD_MODE,
                    frame_ms=20,
                )

                wav_bytes, capture_error_code, capture_meta = None, None, {}
                try:
                    wav_bytes, capture_error_code, capture_meta = await asyncio.to_thread(record_audio)
                    timing.mark("record_end")
                except Exception as exc:
                    logger.exception("Backend recording failed: %s", exc)
                    capture_error_code = "RECORD_ERROR"
                    capture_meta = {}

                duration_ms = capture_meta.get("duration_ms", 0.0) or timing.since_start("record_end") or 0.0
                log_voice_capture_end(
                    timing.turn_id,
                    duration_ms,
                    len(wav_bytes) if wav_bytes else 0,
                    rms=capture_meta.get("rms"),
                    peak=capture_meta.get("peak"),
                    error_code=capture_error_code,
                )

                if not wav_bytes:
                    timing.mark("turn_end")
                    code = capture_error_code or "MIC_CAPTURE_FAILED"
                    msg = error_hint(code, "No speech heard.")
                    payload = build_error_payload(code, msg, timing.turn_id)
                    payload.update(debug_payload(timing))
                    await _ws_send_json(websocket, 5, session, payload)
                    log_turn_metrics(timing, error=code)
                    log_voice_turn_end(timing.turn_id, timing.summary_ms(), success=False, error_code=code)
                    continue

                try:
                    timing.mark("stt_start")
                    transcript, stt_meta = await asyncio.wait_for(sarvam_stt_from_wav(wav_bytes), timeout=STT_TIMEOUT_S)
                    timing.mark("stt_end")
                    timing.mark("transcript_ready")
                    stt_ms = timing.duration("stt_start", "stt_end") or 0.0
                    log_voice_stt(
                        timing.turn_id,
                        stt_ms,
                        len(transcript or ""),
                        (transcript or "")[:80],
                    )
                except asyncio.TimeoutError:
                    logger.warning("Sarvam STT timed out after %.2fs", STT_TIMEOUT_S)
                    timing.mark("turn_end")
                    payload = build_error_payload(
                        "STT_FAILED",
                        "Voice recognition timed out. Please try again or type your question.",
                        timing.turn_id,
                    )
                    payload.update(debug_payload(timing))
                    await _ws_send_json(websocket, 5, session, payload)
                    log_turn_metrics(timing, error="stt_timeout")
                    log_voice_turn_end(timing.turn_id, timing.summary_ms(), success=False, error_code="STT_TIMEOUT")
                    continue
                except Exception as exc:
                    logger.exception("Sarvam STT failed: %s", exc)
                    timing.mark("turn_end")
                    payload = build_error_payload(
                        "STT_FAILED",
                        "I could not understand the audio. Please try again or type your question.",
                        timing.turn_id,
                    )
                    payload.update(debug_payload(timing))
                    await _ws_send_json(websocket, 5, session, payload)
                    log_turn_metrics(timing, error="stt_failed")
                    log_voice_turn_end(timing.turn_id, timing.summary_ms(), success=False, error_code="STT_FAILED")
                    continue

                if not (transcript or "").strip():
                    timing.mark("turn_end")
                    logger.warning("STT returned empty for %d-byte WAV", len(wav_bytes))
                    payload = build_error_payload(
                        "STT_EMPTY",
                        "I could not understand the audio. Please try again or type your question.",
                        timing.turn_id,
                    )
                    payload.update(debug_payload(timing))
                    await _ws_send_json(websocket, 5, session, payload)
                    log_turn_metrics(timing, error="stt_empty")
                    log_voice_turn_end(timing.turn_id, timing.summary_ms(), success=False, error_code="STT_EMPTY")
                    continue

                _schedule_process_user_text_reply(
                    session,
                    transcript.strip(),
                    websocket,
                    timing,
                    stt_meta=stt_meta,
                    local_intent=None,
                )
                continue

            if action in ("mic_stop", "mic_cancel"):
                await _ws_send_json(websocket, 5, session, {"isProcessing": False})
                continue

            if action == "menu_select":
                await _ws_send_json(websocket, 5, session, msg if isinstance(msg, dict) else {"data": msg})
                continue

            await _ws_send_json(websocket, 5, session, msg if isinstance(msg, dict) else {"data": msg})

    except Exception as exc:
        logger.exception("WebSocket error: %s", exc)
        try:
            await _ws_send_json(
                websocket,
                -1,
                session,
                {"error": "Voice service is temporarily unavailable. Text mode is still available."},
            )
        except Exception:
            pass
    finally:
        logger.info("WebSocket client disconnected")
        try:
            await websocket.close()
        except Exception:
            pass


if __name__ == "__main__":
    import uvicorn

    logger.info("Groq API key: %s", "loaded" if GROQ_API_KEY else "not set (check .env)")
    logger.info("WebSocket: ws://localhost:%s/ws/clara - frontend VITE_WS_URL must match this", PORT)
    uvicorn.run(app, host=HOST, port=PORT)
