"""Time-aware greeting text per language for CLARA."""

from __future__ import annotations

from datetime import datetime
from zoneinfo import ZoneInfo

from backend.config.settings import KIOSK_TIMEZONE

SUPPORTED_LANGUAGES: tuple[str, ...] = ("English", "Kannada", "Hindi", "Tamil", "Telugu", "Malayalam")
_GREETINGS_BY_PERIOD = {
    "morning": {
        "English": "Good morning. I am CLARA, your campus assistant. How may I help you today?",
        "Kannada": "ಶುಭೋದಯ. ನಾನು ಕ್ಲಾರಾ, ನಿಮ್ಮ ಕ್ಯಾಂಪಸ್ ಸಹಾಯಕಿ. ಇಂದು ನಾನು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಬಹುದು?",
        "Hindi": "सुप्रभात। मैं CLARA हूँ, आपकी कैंपस सहायक। आज मैं आपकी कैसे मदद कर सकती हूँ?",
        "Tamil": "காலை வணக்கம். நான் கிளாரா, உங்கள் வளாக உதவியாளர். இன்று நான் உங்களுக்கு எப்படி உதவ முடியும்?",
        "Telugu": "శుభోదయం. నేను CLARA, మీ క్యాంపస్ సహాయకురాలు. ఈరోజు నేను మీకు ఎలా సహాయం చేయగలను?",
        "Malayalam": "സുപ്രഭാതം. ഞാൻ CLARA, നിങ്ങളുടെ ക്യാമ്പസ് സഹായി. ഇന്ന് ഞാൻ നിങ്ങളെ എങ്ങനെ സഹായിക്കാം?",
    },
    "afternoon": {
        "English": "Good afternoon. I am CLARA, your campus assistant. How may I help you today?",
        "Kannada": "ಶುಭ ಮಧ್ಯಾಹ್ನ. ನಾನು ಕ್ಲಾರಾ, ನಿಮ್ಮ ಕ್ಯಾಂಪಸ್ ಸಹಾಯಕಿ. ಇಂದು ನಾನು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಬಹುದು?",
        "Hindi": "शुभ दोपहर। मैं CLARA हूँ, आपकी कैंपस सहायक। आज मैं आपकी कैसे मदद कर सकती हूँ?",
        "Tamil": "மதிய வணக்கம். நான் கிளாரா, உங்கள் வளாக உதவியாளர். இன்று நான் உங்களுக்கு எப்படி உதவ முடியும்?",
        "Telugu": "శుభ మధ్యాహ్నం. నేను CLARA, మీ క్యాంపస్ సహాయకురాలు. ఈరోజు నేను మీకు ఎలా సహాయం చేయగలను?",
        "Malayalam": "ശുഭ ഉച്ചയ്ക്ക് ശേഷം. ഞാൻ CLARA, നിങ്ങളുടെ ക്യാമ്പസ് സഹായി. ഇന്ന് ഞാൻ നിങ്ങളെ എങ്ങനെ സഹായിക്കാം?",
    },
    "evening": {
        "English": "Good evening. I am CLARA, your campus assistant. How may I help you today?",
        "Kannada": "ಶುಭ ಸಂಜೆ. ನಾನು ಕ್ಲಾರಾ, ನಿಮ್ಮ ಕ್ಯಾಂಪಸ್ ಸಹಾಯಕಿ. ಇಂದು ನಾನು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಬಹುದು?",
        "Hindi": "शुभ संध्या। मैं CLARA हूँ, आपकी कैंपस सहायक। आज मैं आपकी कैसे मदद कर सकती हूँ?",
        "Tamil": "மாலை வணக்கம். நான் கிளாரா, உங்கள் வளாக உதவியாளர். இன்று நான் உங்களுக்கு எப்படி உதவ முடியும்?",
        "Telugu": "శుభ సాయంత్రం. నేను CLARA, మీ క్యాంపస్ సహాయకురాలు. ఈరోజు నేను మీకు ఎలా సహాయం చేయగలను?",
        "Malayalam": "ശുഭ സായാഹ്നം. ഞാൻ CLARA, നിങ്ങളുടെ ക്യാമ്പസ് സഹായി. ഇന്ന് ഞാൻ നിങ്ങളെ എങ്ങനെ സഹായിക്കാം?",
    },
}


def _validate_language_parity() -> None:
    for period, mapping in _GREETINGS_BY_PERIOD.items():
        missing = [lang for lang in SUPPORTED_LANGUAGES if lang not in mapping]
        if missing:
            raise RuntimeError(f"Missing greeting translations for {period}: {', '.join(missing)}")


def _time_period(now: datetime | None = None) -> str:
    if now is not None:
        ts = now
    else:
        try:
            ts = datetime.now(ZoneInfo(KIOSK_TIMEZONE))
        except Exception:
            ts = datetime.now()
    if ts.hour < 12:
        return "morning"
    if ts.hour < 17:
        return "afternoon"
    return "evening"


def get_greeting(language: str | None, now: datetime | None = None) -> str:
    period = _time_period(now)
    lang = language if language in _GREETINGS_BY_PERIOD[period] else "English"
    return _GREETINGS_BY_PERIOD[period].get(lang, _GREETINGS_BY_PERIOD[period]["English"])


# Backward-compatible default snapshot (evening English).
GREETINGS = {lang: _GREETINGS_BY_PERIOD["evening"][lang] for lang in _GREETINGS_BY_PERIOD["evening"]}

_validate_language_parity()
