"""Time-aware greeting text + wake opening copy for CLARA.

Edit order:
  1) WAKE_OPENING_GREETING_ENGLISH — first thing users hear/read (before language pick).
  2) _GREETINGS_BY_PERIOD — full greeting after they choose a language.
"""

from __future__ import annotations

from datetime import datetime
from zoneinfo import ZoneInfo

from backend.config.settings import KIOSK_TIMEZONE

SUPPORTED_LANGUAGES: tuple[str, ...] = ("English", "Kannada", "Hindi", "Tamil", "Telugu", "Malayalam")

# ---------------------------------------------------------------------------
# Wake / first paint (English only, before language is chosen)
# ---------------------------------------------------------------------------
WAKE_OPENING_GREETING_ENGLISH: dict[str, str] = {
    "morning": "Good morning. I am CLARA. How can I help you today?",
    "afternoon": "Good afternoon. I am CLARA. How can I help you today?",
    "evening": "Good evening. I am CLARA. How can I help you today?",
}

LANGUAGE_GATE_NUDGE_ENGLISH: str = (
    "Please choose the language that feels most comfortable."
)

# Optional CSS stack for the first greeting bubble (sent on WS payload as greetingFontFamily).
GREETING_FONT_STACK: str = '"Bodoni Moda", "Libre Bodoni", Didot, "Playfair Display", serif'


def _time_period(now: datetime | None = None) -> str:
    if now is not None:
        ts = now
    else:
        try:
            ts = datetime.now(ZoneInfo(KIOSK_TIMEZONE))
        except Exception:
            ts = datetime.now()
    # Treat late night/early hours as evening for kiosk tone (users reported 1 AM should not be "morning").
    if 5 <= ts.hour < 12:
        return "morning"
    if 12 <= ts.hour < 17:
        return "afternoon"
    return "evening"


def get_short_opening_greeting_english(now: datetime | None = None) -> str:
    """First-line intro only (no “How may I help you today?”)."""
    period = _time_period(now)
    return WAKE_OPENING_GREETING_ENGLISH.get(
        period,
        WAKE_OPENING_GREETING_ENGLISH["evening"],
    )


def get_wakeup_opening_display_text(now: datetime | None = None) -> str:
    return get_short_opening_greeting_english(now)


def get_wakeup_opening_tts_text(now: datetime | None = None) -> str:
    return get_wakeup_opening_display_text(now)


def get_wakeup_language_gate_display_text(now: datetime | None = None) -> str:
    """Opening greeting shown before the picker fades in."""
    return get_wakeup_opening_display_text(now)


def get_wakeup_language_gate_tts_text(now: datetime | None = None) -> str:
    """Wake TTS that exactly matches the displayed wake greeting."""
    return get_wakeup_language_gate_display_text(now)


def get_language_required_nudge_english() -> str:
    return LANGUAGE_GATE_NUDGE_ENGLISH.strip()


def greeting_font_family_css(language: str | None) -> str | None:
    _ = language
    return GREETING_FONT_STACK


# ---------------------------------------------------------------------------
# After user picks a language — readiness prompt (not a second greeting)
# ---------------------------------------------------------------------------
_READY_PROMPTS_BY_LANGUAGE: dict[str, str] = {
    "English": "Wonderful. I am ready to help you with care. What would you like to explore today?",
    "Kannada": "ಅದ್ಭುತ. ನಿಮಗೆ ಆತ್ಮೀಯವಾಗಿ ಸಹಾಯ ಮಾಡಲು ನಾನು ಸಿದ್ಧವಾಗಿದ್ದೇನೆ. ಇಂದು ನೀವು ಏನನ್ನು ತಿಳಿದುಕೊಳ್ಳಲು ಬಯಸುತ್ತೀರಿ?",
    "Hindi": "बहुत अच्छा। मैं पूरे ध्यान से आपकी मदद के लिए तैयार हूँ। आज आप क्या जानना चाहेंगे?",
    "Tamil": "மிக நன்று. உங்களுக்கு அக்கறையுடன் உதவ நான் தயார். இன்று நீங்கள் என்ன தெரிந்துகொள்ள விரும்புகிறீர்கள்?",
    "Telugu": "చాలా మంచిది. మీకు శ్రద్ధగా సహాయం చేయడానికి నేను సిద్ధంగా ఉన్నాను. ఈరోజు మీరు ఏమి తెలుసుకోవాలనుకుంటున్నారు?",
    "Malayalam": "വളരെ നന്നായി. നിങ്ങളെ ശ്രദ്ധയോടെ സഹായിക്കാൻ ഞാൻ തയ്യാറാണ്. ഇന്ന് നിങ്ങൾ എന്താണ് അറിയാൻ ആഗ്രഹിക്കുന്നത്?",
}


# ---------------------------------------------------------------------------
# Time-aware greeting translations retained for non-language-gate flows
# ---------------------------------------------------------------------------
_GREETINGS_BY_PERIOD: dict[str, dict[str, str]] = {
    "morning": {
        "English": "Good morning. I am CLARA. How may I help you today?",
        "Kannada": "ಶುಭೋದಯ. ನಾನು ಕ್ಲಾರಾ, ನಿಮ್ಮ ಕ್ಯಾಂಪಸ್ ಸಹಾಯಕಿ. ಇಂದು ನಾನು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಬಹುದು?",
        "Hindi": "सुप्रभात। मैं CLARA हूँ, आपकी कैंपस सहायक। आज मैं आपकी कैसे मदद कर सकती हूँ?",
        "Tamil": "காலை வணக்கம். நான் கிளாரா, உங்கள் வளாக உதவியாளர். இன்று நான் உங்களுக்கு எப்படி உதவ முடியும்?",
        "Telugu": "శుభోదయం. నేను CLARA, మీ క్యాంపస్ సహాయకురాలు. ఈరోజు నేను మీకు ఎలా సహాయం చేయగలను?",
        "Malayalam": "സുപ്രഭാതം. ഞാൻ CLARA, നിങ്ങളുടെ ക്യാമ്പസ് സഹായി. ഇന്ന് ഞാൻ നിങ്ങളെ എങ്ങനെ സഹായിക്കാം?",
    },
    "afternoon": {
        "English": "Good afternoon. I am CLARA. How may I help you today?",
        "Kannada": "ಶುಭ ಮಧ್ಯಾಹ್ನ. ನಾನು ಕ್ಲಾರಾ, ನಿಮ್ಮ ಕ್ಯಾಂಪಸ್ ಸಹಾಯಕಿ. ಇಂದು ನಾನು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಬಹುದು?",
        "Hindi": "शुभ दोपहर। मैं CLARA हूँ, आपकी कैंपस सहायक। आज मैं आपकी कैसे मदद कर सकती हूँ?",
        "Tamil": "மதிய வணக்கம். நான் கிளாரா, உங்கள் வளாக உதவியாளர். இன்று நான் உங்களுக்கு எப்படி உதவ முடியும்?",
        "Telugu": "శుభ మధ్యాహ్నం. నేను CLARA, మీ క్యాంపస్ సహాయకురాలు. ఈరోజు నేను మీకు ఎలా సహాయం చేయగలను?",
        "Malayalam": "ശുഭ ഉച്ചയ്ക്ക് ശേഷം. ഞാൻ CLARA, നിങ്ങളുടെ ക്യാമ്പസ് സഹായി. ഇന്ന് ഞാൻ നിങ്ങളെ എങ്ങനെ സഹായിക്കാം?",
    },
    "evening": {
        "English": "Good evening. I am CLARA. How may I help you today?",
        "Kannada": "ಶುಭ ಸಂಜೆ. ನಾನು ಕ್ಲಾರಾ, ನಿಮ್ಮ ಕ್ಯಾಂಪಸ್ ಸಹಾಯಕಿ. ಇಂದು ನಾನು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಬಹುದು?",
        "Hindi": "शुभ संध्या। मैं CLARA हूँ, आपकी कैंपस सहायक। आज मैं आपकी कैसे मदद कर सकती हूँ?",
        "Tamil": "மாலை வணக்கம். நான் கிளாரா, உங்கள் வளாக உதவியாளர். இன்று நான் உங்களுக்கு எப்படி உதவ முடியும்?",
        "Telugu": "శుభ సాయంత్రం. నేను CLARA, మీ క్యాంపస్ సహాయకురాలు. ఈరోజు నేను మీకు ఎలా సహాయం చేయగలను?",
        "Malayalam": "ശുഭ സായാഹ്നം. ഞാൻ CLARA, നിങ്ങളുടെ ക്യാമ്പസ് സഹായി. ഇന്ന് ഞാൻ നിങ്ങളെ എങ്ങനെ സഹായിക്കാം?",
    },
}


def _validate_language_parity() -> None:
    missing_prompts = [lang for lang in SUPPORTED_LANGUAGES if lang not in _READY_PROMPTS_BY_LANGUAGE]
    if missing_prompts:
        raise RuntimeError(f"Missing ready prompt translations: {', '.join(missing_prompts)}")
    for period, mapping in _GREETINGS_BY_PERIOD.items():
        missing = [lang for lang in SUPPORTED_LANGUAGES if lang not in mapping]
        if missing:
            raise RuntimeError(f"Missing greeting translations for {period}: {', '.join(missing)}")
    for period in _GREETINGS_BY_PERIOD:
        if period not in WAKE_OPENING_GREETING_ENGLISH:
            raise RuntimeError(f"Missing wake opening for period: {period}")


def get_greeting(language: str | None, now: datetime | None = None) -> str:
    period = _time_period(now)
    lang = language if language in _GREETINGS_BY_PERIOD[period] else "English"
    return _GREETINGS_BY_PERIOD[period].get(lang, _GREETINGS_BY_PERIOD[period]["English"])


def get_ready_prompt(language: str | None) -> str:
    lang = language if language in _READY_PROMPTS_BY_LANGUAGE else "English"
    return _READY_PROMPTS_BY_LANGUAGE.get(lang, _READY_PROMPTS_BY_LANGUAGE["English"])


# Backward-compatible default snapshot (evening English).
GREETINGS = {lang: _GREETINGS_BY_PERIOD["evening"][lang] for lang in _GREETINGS_BY_PERIOD["evening"]}

_validate_language_parity()
