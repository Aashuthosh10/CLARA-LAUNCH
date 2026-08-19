"""Multilingual receptionist templates for Conversation Intelligence short-circuits."""

from __future__ import annotations

from backend.services.answer_generation import SUPPORTED_LANGUAGES

_NO_SPEECH_RETRY: dict[str, str] = {
    "English": (
        "I'm sorry, I didn't quite catch that. Could you please repeat your question?"
    ),
    "Kannada": "ಕ್ಷಮಿಸಿ, ನನಗೆ ಸರಿಯಾಗಿ ಕೇಳಿಸಲಿಲ್ಲ. ದಯವಿಟ್ಟು ನಿಮ್ಮ ಪ್ರಶ್ನೆಯನ್ನು ಮತ್ತೆ ಹೇಳಿ.",
    "Hindi": "क्षमा कीजिए, मुझे ठीक से सुनाई नहीं दिया। कृपया अपना प्रश्न दोबारा कहें।",
    "Tamil": "மன்னிக்கவும், எனக்கு சரியாக கேட்கவில்லை. தயவுசெய்து உங்கள் கேள்வியை மீண்டும் சொல்லுங்கள்.",
    "Telugu": "క్షమించండి, నాకు సరిగా వినిపించలేదు. దయచేసి మీ ప్రశ్నను మళ్లీ చెప్పండి.",
    "Malayalam": "ക്ഷമിക്കണം, എനിക്ക് ശരിയായി കേൾക്കാൻ കഴിഞ്ഞില്ല. ദയവായി നിങ്ങളുടെ ചോദ്യം വീണ്ടും പറയുക.",
}

_UNKNOWN: dict[str, str] = {
    "English": (
        "I don't currently have reliable information about that. "
        "However, I can help you with admissions, departments, placements, "
        "fees, facilities, and campus information."
    ),
    "Kannada": (
        "ಆ ವಿಷಯದ ಬಗ್ಗೆ ನನ್ನ ಬಳಿ ವಿಶ್ವಾಸಾರ್ಹ ಮಾಹಿತಿ ಇಲ್ಲ. "
        "ಆದರೆ ಪ್ರವೇಶ, ವಿಭಾಗಗಳು, ಪ್ಲೇಸ್‌ಮೆಂಟ್, ಶುಲ್ಕ, ಸೌಲಭ್ಯಗಳು ಮತ್ತು ಕ್ಯಾಂಪಸ್ ಮಾಹಿತಿಯಲ್ಲಿ ನಾನು ಸಹಾಯ ಮಾಡಬಲ್ಲೆ."
    ),
    "Hindi": (
        "उसके बारे में मेरे पास अभी विश्वसनीय जानकारी नहीं है। "
        "फिर भी मैं प्रवेश, विभागों, प्लेसमेंट, फीस, सुविधाओं और कैंपस जानकारी में मदद कर सकती हूँ।"
    ),
    "Tamil": (
        "அதைப் பற்றி என்னிடம் நம்பகமான தகவல் இப்போது இல்லை. "
        "இருப்பினும் சேர்க்கை, துறைகள், பிளேஸ்மென்ட், கட்டணம், வசதிகள் மற்றும் வளாகத் தகவலில் உதவ முடியும்."
    ),
    "Telugu": (
        "దాని గురించి నా వద్ద ప్రస్తుతం నమ్మదగిన సమాచారం లేదు. "
        "అయినప్పటికీ ప్రవేశాలు, విభాగాలు, ప్లేస్‌మెంట్, ఫీజులు, సౌకర్యాలు మరియు క్యాంపస్ సమాచారంలో సహాయపడగలను."
    ),
    "Malayalam": (
        "അതിനെക്കുറിച്ച് വിശ്വസനീയമായ വിവരങ്ങൾ ഇപ്പോൾ എനിക്കില്ല. "
        "എന്നിരുന്നാലും അഡ്മിഷൻ, ഡിപ്പാർട്ട്മെന്റുകൾ, പ്ലേസ്മെന്റ്, ഫീസ്, സൗകര്യങ്ങൾ, ക്യാമ്പസ് വിവരങ്ങൾ എന്നിവയിൽ സഹായിക്കാം."
    ),
}

_CLARIFICATION: dict[str, str] = {
    "English": "Could you please tell me a bit more about what you need help with?",
    "Kannada": "ನೀವು ಯಾವ ವಿಷಯದಲ್ಲಿ ಸಹಾಯ ಬೇಕು ಎಂದು ಸ್ವಲ್ಪ ಹೆಚ್ಚು ಹೇಳುತ್ತೀರಾ?",
    "Hindi": "कृपया बताइए कि आपको किस बारे में मदद चाहिए?",
    "Tamil": "நீங்கள் எந்த விஷயத்தில் உதவி வேண்டும் என்று சற்று கூறுவீர்களா?",
    "Telugu": "మీకు దేనిలో సహాయం కావాలో కొంచెం చెప్పగలరా?",
    "Malayalam": "നിങ്ങൾക്ക് ഏതു കാര്യത്തിൽ സഹായം വേണമെന്ന് കുറച്ചുകൂടി പറയാമോ?",
}

# Clarification that names the missing slot, instead of the generic "tell me more".
_CLARIFY_DEPARTMENT: dict[str, str] = {
    "English": "Which department would you like to know about?",
    "Kannada": "ನೀವು ಯಾವ ವಿಭಾಗದ ಬಗ್ಗೆ ತಿಳಿಯಲು ಬಯಸುತ್ತೀರಿ?",
    "Hindi": "आप किस विभाग के बारे में जानना चाहेंगे?",
    "Tamil": "நீங்கள் எந்தத் துறையைப் பற்றி அறிய விரும்புகிறீர்கள்?",
    "Telugu": "మీరు ఏ విభాగం గురించి తెలుసుకోవాలనుకుంటున్నారు?",
    "Malayalam": "നിങ്ങൾക്ക് ഏത് ഡിപ്പാർട്ട്മെന്റിനെക്കുറിച്ചാണ് അറിയേണ്ടത്?",
}

_NAME_ACK: dict[str, str] = {
    "English": "Nice to meet you, {name}.",
    "Kannada": "ನಿಮ್ಮನ್ನು ಭೇಟಿಯಾಗಿ ಸಂತೋಷ, {name}.",
    "Hindi": "आपसे मिलकर अच्छा लगा, {name}.",
    "Tamil": "உங்களை சந்தித்ததில் மகிழ்ச்சி, {name}.",
    "Telugu": "మిమ్మల్ని కలవడం సంతోషం, {name}.",
    "Malayalam": "നിങ്ങളെ കണ്ടതിൽ സന്തോഷം, {name}.",
}

_GREETING: dict[str, str] = {
    "English": "Hello. How may I help you today?",
    "Kannada": "ನಮಸ್ಕಾರ. ಇಂದು ನಾನು ಹೇಗೆ ಸಹಾಯ ಮಾಡಬಹುದು?",
    "Hindi": "नमस्ते। आज मैं आपकी कैसे मदद कर सकती हूँ?",
    "Tamil": "வணக்கம். இன்று நான் எப்படி உதவ முடியும்?",
    "Telugu": "నమస్కారం. ఈరోజు నేను మీకు ఎలా సహాయపడగలను?",
    "Malayalam": "നമസ്കാരം. ഇന്ന് ഞാൻ എങ്ങനെ സഹായിക്കാം?",
}

_SMALL_TALK: dict[str, str] = {
    "English": "I'm here to help with campus questions. What would you like to know?",
    "Kannada": "ನಾನು ಕ್ಯಾಂಪಸ್ ಪ್ರಶ್ನೆಗಳಿಗೆ ಸಹಾಯ ಮಾಡಲು ಇಲ್ಲಿದ್ದೇನೆ. ನೀವು ಏನು ತಿಳಿಯಲು ಬಯಸುತ್ತೀರಿ?",
    "Hindi": "मैं कैंपस से जुड़े प्रश्नों में मदद के लिए यहाँ हूँ। आप क्या जानना चाहेंगे?",
    "Tamil": "நான் வளாகக் கேள்விகளுக்கு உதவ இங்கே இருக்கிறேன். நீங்கள் என்ன தெரிந்துகொள்ள விரும்புகிறீர்கள்?",
    "Telugu": "నేను క్యాంపస్ ప్రశ్నలకు సహాయం చేయడానికి ఇక్కడ ఉన్నాను. మీరు ఏమి తెలుసుకోవాలనుకుంటున్నారు?",
    "Malayalam": "ക്യാമ്പസ് ചോദ്യങ്ങൾക്ക് സഹായിക്കാൻ ഞാൻ ഇവിടെയുണ്ട്. നിങ്ങൾക്ക് എന്താണ് അറിയേണ്ടത്?",
}


def _pick(mapping: dict[str, str], language: str | None) -> str:
    lang = language if language in SUPPORTED_LANGUAGES else "English"
    return mapping.get(lang, mapping["English"])


def no_speech_retry_reply(language: str | None) -> str:
    return _pick(_NO_SPEECH_RETRY, language)


def unknown_reply(language: str | None) -> str:
    return _pick(_UNKNOWN, language)


def clarification_reply(language: str | None, target: str | None = None) -> str:
    """Clarification text. `target` names the slot CLARA still needs."""
    if (target or "").strip().lower() == "department":
        return _pick(_CLARIFY_DEPARTMENT, language)
    return _pick(_CLARIFICATION, language)


def name_ack_reply(language: str | None, name: str) -> str:
    tmpl = _pick(_NAME_ACK, language)
    return tmpl.format(name=name)


def greeting_reply(language: str | None) -> str:
    return _pick(_GREETING, language)


def small_talk_reply(language: str | None) -> str:
    return _pick(_SMALL_TALK, language)


def _assert_parity() -> None:
    for name, mapping in (
        ("_NO_SPEECH_RETRY", _NO_SPEECH_RETRY),
        ("_UNKNOWN", _UNKNOWN),
        ("_CLARIFICATION", _CLARIFICATION),
        ("_CLARIFY_DEPARTMENT", _CLARIFY_DEPARTMENT),
        ("_NAME_ACK", _NAME_ACK),
        ("_GREETING", _GREETING),
        ("_SMALL_TALK", _SMALL_TALK),
    ):
        missing = [lang for lang in SUPPORTED_LANGUAGES if lang not in mapping]
        if missing:
            raise RuntimeError(f"{name} missing translations: {', '.join(missing)}")


_assert_parity()
