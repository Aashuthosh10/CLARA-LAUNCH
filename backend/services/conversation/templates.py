"""Multilingual receptionist templates for Conversation Intelligence short-circuits."""

from __future__ import annotations

from backend.services.answer_generation import SUPPORTED_LANGUAGES
from backend.services.ui_localization import ui_text

_NO_SPEECH_RETRY: dict[str, str] = {
    "English": (
        "I'm sorry, I didn't quite catch that. Could you please repeat your question?"
    ),
    "Kannada": ui_text("kn", "error.no_speech"),
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
    "Kannada": ui_text("kn", "availability.unknown"),
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
    "Kannada": ui_text("kn", "clarification.general"),
    "Hindi": "कृपया बताइए कि आपको किस बारे में मदद चाहिए?",
    "Tamil": "நீங்கள் எந்த விஷயத்தில் உதவி வேண்டும் என்று சற்று கூறுவீர்களா?",
    "Telugu": "మీకు దేనిలో సహాయం కావాలో కొంచెం చెప్పగలరా?",
    "Malayalam": "നിങ്ങൾക്ക് ഏതു കാര്യത്തിൽ സഹായം വേണമെന്ന് കുറച്ചുകൂടി പറയാമോ?",
}

# Clarification that names the missing slot, instead of the generic "tell me more".
_CLARIFY_DEPARTMENT: dict[str, str] = {
    "English": "Which department would you like to know about?",
    "Kannada": ui_text("kn", "clarification.department"),
    "Hindi": "आप किस विभाग के बारे में जानना चाहेंगे?",
    "Tamil": "நீங்கள் எந்தத் துறையைப் பற்றி அறிய விரும்புகிறீர்கள்?",
    "Telugu": "మీరు ఏ విభాగం గురించి తెలుసుకోవాలనుకుంటున్నారు?",
    "Malayalam": "നിങ്ങൾക്ക് ഏത് ഡിപ്പാർട്ട്മെന്റിനെക്കുറിച്ചാണ് അറിയേണ്ടത്?",
}

_CLARIFY_HOSTEL: dict[str, str] = {
    "English": "Sure. Are you asking about the boys' hostel or the girls' hostel?",
    "Kannada": ui_text("kn", "clarification.hostel"),
    "Hindi": ui_text("hi", "clarification.hostel"),
    "Tamil": "நிச்சயமாக. ஆண்கள் விடுதியைப் பற்றியா, அல்லது பெண்கள் விடுதியைப் பற்றியா கேட்கிறீர்கள்?",
    "Telugu": ui_text("te", "clarification.hostel"),
    "Malayalam": ui_text("ml", "clarification.hostel"),
}

_NCC_ENROLLMENT: dict[str, str] = {
    "English": (
        "Students can contact the NCC Caretaker or Associate NCC Officer "
        "through the campus administration office, or check the bulletin board "
        "under the Sports & NCC Department."
    ),
    "Kannada": ui_text("kn", "ncc.enrollment"),
    "Hindi": ui_text("hi", "ncc.enrollment"),
    "Tamil": (
        "மாணவர்கள் வளாக நிர்வாக அலுவலகம் மூலம் NCC கேரேட்டகர் அல்லது Associate NCC Officer (ANO) "
        "ஐ அணுகலாம், அல்லது Sports & NCC Department அறிவிப்புப் பலகையைப் பார்க்கலாம்."
    ),
    "Telugu": ui_text("te", "ncc.enrollment"),
    "Malayalam": ui_text("ml", "ncc.enrollment"),
}

_CLARIFY_DEPARTMENT_INFORMATION: dict[str, str] = {
    "English": (
        "Would you like a general overview of {department}, "
        "or a simple explanation of what students learn in {department}?"
    ),
    "Kannada": (
        "ನೀವು {department} ನ ಸಾಮಾನ್ಯ ಅವಲೋಕನ ಬಯಸುತ್ತೀರಾ, "
        "ಅಥವಾ {department} ನಲ್ಲಿ ವಿದ್ಯಾರ್ಥಿಗಳು ಏನು ಕಲಿಯುತ್ತಾರೆ ಎಂಬ ಸರಳ ವಿವರಣೆ ಬೇಕೇ?"
    ),
    "Hindi": (
        "क्या आप {department} का सामान्य अवलोकन चाहते हैं, "
        "या {department} में विद्यार्थी क्या सीखते हैं इसकी सरल व्याख्या चाहते हैं?"
    ),
    "Tamil": (
        "நீங்கள் {department} இன் பொது கண்ணோட்டத்தை விரும்புகிறீர்களா, "
        "அல்லது {department} இல் மாணவர்கள் என்ன படிக்கிறார்கள் என்ற எளிய விளக்கம் வேண்டுமா?"
    ),
    "Telugu": (
        "మీకు {department} యొక్క సాధారణ అవలోకనం కావాలా, "
        "లేదా {department} లో విద్యార్థులు ఏమి నేర్చుకుంటారో అనే సరళమైన వివరణ కావాలా?"
    ),
    "Malayalam": (
        "നിങ്ങൾക്ക് {department} ന്റെ പൊതുവായ അവലോകനം വേണോ, "
        "അതോ {department} ൽ വിദ്യാർഥികൾ എന്ത് പഠിക്കുന്നു എന്ന ലളിതമായ വിശദീകരണം വേണോ?"
    ),
}

# Short kiosk labels for department_information clarify prompts.
_DEPT_CLARIFY_LABELS: dict[str, str] = {
    "cse": "CSE",
    "ise": "ISE",
    "cse_aiml": "CSE AIML",
    "cse_ds": "CSE Data Science",
    "cse_cysec": "CSE Cyber Security",
    "cse_bs": "CSE Business Systems",
    "ece": "ECE",
    "civil": "Civil",
    "mechanical": "Mechanical",
    "mba": "MBA",
    "basic_sciences": "Basic Sciences",
}

_CLARIFY_ADMISSIONS_INFO: dict[str, str] = {
    "English": (
        "Would you like the admission steps, eligibility details, or the documents required?"
    ),
    "Kannada": (
        "ನಿಮಗೆ ಪ್ರವೇಶದ ಹಂತಗಳು, ಅರ್ಹತೆ ವಿವರಗಳು ಅಥವಾ ಅಗತ್ಯ ದಾಖಲೆಗಳ ಬಗ್ಗೆ ತಿಳಿಯಬೇಕೇ?"
    ),
    "Hindi": (
        "क्या आप प्रवेश की प्रक्रिया, पात्रता विवरण, या आवश्यक दस्तावेज़ जानना चाहेंगे?"
    ),
    "Tamil": (
        "சேர்க்கை படிகள், தகுதி விவரங்கள் அல்லது தேவையான ஆவணங்கள் — எதை அறிய விரும்புகிறீர்கள்?"
    ),
    "Telugu": (
        "మీకు ప్రవేశ దశలు, అర్హత వివరాలు లేదా అవసరమైన పత్రాలు తెలుసుకోవాలనుకుంటున్నారా?"
    ),
    "Malayalam": (
        "അഡ്മിഷൻ ഘട്ടങ്ങൾ, യോഗ്യത വിവരങ്ങൾ, അതോ ആവശ്യമായ രേഖകൾ — ഏതാണ് അറിയേണ്ടത്?"
    ),
}

# Clear intent, cannot fulfill at the kiosk — not "tell me more".
_RESTRICTED_PERSONAL_CONTACT: dict[str, str] = {
    "English": (
        "I'm sorry, I can't provide personal contact numbers here. "
        "Please meet the admission block and they'll guide you with the appropriate contact details."
    ),
    "Kannada": (
        "ಕ್ಷಮಿಸಿ, ನಾನು ಇಲ್ಲಿ ವೈಯಕ್ತಿಕ ಸಂಪರ್ಕ ಸಂಖ್ಯೆಗಳನ್ನು ನೀಡಲಾಗುವುದಿಲ್ಲ. "
        "ದಯವಿಟ್ಟು ಅಡ್ಮಿಷನ್ ಬ್ಲಾಕ್‌ಗೆ ಭೇಟಿ ನೀಡಿ, ಅವರು ಸೂಕ್ತ ಸಂಪರ್ಕ ವಿವರಗಳೊಂದಿಗೆ ಮಾರ್ಗದರ್ಶನ ನೀಡುತ್ತಾರೆ."
    ),
    "Hindi": (
        "माफ़ कीजिए, मैं यहाँ व्यक्तिगत संपर्क नंबर नहीं दे सकती। "
        "कृपया एडमिशन ब्लॉक में मिलें, वे सही संपर्क विवरण बताएंगे।"
    ),
    "Tamil": (
        "மன்னிக்கவும், இங்கே தனிப்பட்ட தொடர்பு எண்களை என்னால் வழங்க முடியாது. "
        "சேர்க்கை பிரிவை அணுகுங்கள்; அவர்கள் சரியான தொடர்பு விவரங்களை வழிகாட்டுவார்கள்."
    ),
    "Telugu": (
        "క్షమించండి, ఇక్కడ వ్యక్తిగత సంప్రదింపు నంబర్లు ఇవ్వలేను. "
        "దయచేసి అడ్మిషన్ బ్లాక్‌ను కలవండి; వారు సరైన సంప్రదింపు వివరాలు చెబుతారు."
    ),
    "Malayalam": (
        "ക്ഷമിക്കണം, ഇവിടെ വ്യക്തിഗത കോൺടാക്ട് നമ്പറുകൾ നൽകാൻ കഴിയില്ല. "
        "അഡ്മിഷൻ ബ്ലോക്കിൽ പോയി കാണുക; അവർ ശരിയായ ബന്ധപ്പെടാനുള്ള വിവരങ്ങൾ നൽകും."
    ),
}

_RESTRICTED_PAYMENT: dict[str, str] = {
    "English": (
        "For payment assistance, please meet the admission block "
        "and they'll guide you through the process."
    ),
    "Kannada": (
        "ಪಾವತಿ ಸಹಾಯಕ್ಕಾಗಿ ದಯವಿಟ್ಟು ಅಡ್ಮಿಷನ್ ಬ್ಲಾಕ್‌ಗೆ ಭೇಟಿ ನೀಡಿ, "
        "ಅವರು ಪ್ರಕ್ರಿಯೆಯ ಮೂಲಕ ಮಾರ್ಗದರ್ಶನ ನೀಡುತ್ತಾರೆ."
    ),
    "Hindi": (
        "भुगतान सहायता के लिए कृपया एडमिशन ब्लॉक में मिलें, "
        "वे पूरी प्रक्रिया में आपकी मदद करेंगे।"
    ),
    "Tamil": (
        "கட்டண உதவிக்கு சேர்க்கை பிரிவை அணுகுங்கள்; "
        "அவர்கள் செயல்முறையில் வழிகாட்டுவார்கள்."
    ),
    "Telugu": (
        "చెల్లింపు సహాయం కోసం దయచేసి అడ్మిషన్ బ్లాక్‌ను కలవండి; "
        "వారు ప్రక్రియలో మార్గనిర్దేశం చేస్తారు."
    ),
    "Malayalam": (
        "പേയ്‌മെന്റ് സഹായത്തിന് അഡ്മിഷൻ ബ്ലോക്കിൽ പോയി കാണുക; "
        "അവർ നടപടിക്രമത്തിൽ നിങ്ങളെ സഹായിക്കും."
    ),
}

_NAME_ACK: dict[str, str] = {
    "English": "Nice to meet you, {name}.",
    "Kannada": ui_text("kn", "welcome.named_narration"),
    "Hindi": "आपसे मिलकर अच्छा लगा, {name}.",
    "Tamil": "உங்களை சந்தித்ததில் மகிழ்ச்சி, {name}.",
    "Telugu": "మిమ్మల్ని కలవడం సంతోషం, {name}.",
    "Malayalam": "നിങ്ങളെ കണ്ടതിൽ സന്തോഷം, {name}.",
}

_GREETING: dict[str, str] = {
    "English": "Hello. How may I help you today?",
    "Kannada": ui_text("kn", "welcome.general_narration"),
    "Hindi": "नमस्ते। आज मैं आपकी कैसे मदद कर सकती हूँ?",
    "Tamil": "வணக்கம். இன்று நான் எப்படி உதவ முடியும்?",
    "Telugu": "నమస్కారం. ఈరోజు నేను మీకు ఎలా సహాయపడగలను?",
    "Malayalam": "നമസ്കാരം. ഇന്ന് ഞാൻ എങ്ങനെ സഹായിക്കാം?",
}

_SMALL_TALK: dict[str, str] = {
    "English": "I'm here to help with campus questions. What would you like to know?",
    "Kannada": ui_text("kn", "clarification.small_talk"),
    "Hindi": "मैं कैंपस से जुड़े प्रश्नों में मदद के लिए यहाँ हूँ। आप क्या जानना चाहेंगे?",
    "Tamil": "நான் வளாகக் கேள்விகளுக்கு உதவ இங்கே இருக்கிறேன். நீங்கள் என்ன தெரிந்துகொள்ள விரும்புகிறீர்கள்?",
    "Telugu": "నేను క్యాంపస్ ప్రశ్నలకు సహాయం చేయడానికి ఇక్కడ ఉన్నాను. మీరు ఏమి తెలుసుకోవాలనుకుంటున్నారు?",
    "Malayalam": "ക്യാമ്പസ് ചോദ്യങ്ങൾക്ക് സഹായിക്കാൻ ഞാൻ ഇവിടെയുണ്ട്. നിങ്ങൾക്ക് എന്താണ് അറിയേണ്ടത്?",
}

_SOCIAL_RESPONSES: dict[str, dict[str, str]] = {
    "status": {
        "English": "I'm doing well, thank you. How can I help you at SVIT?",
        "Kannada": "ನಾನು ಚೆನ್ನಾಗಿದ್ದೇನೆ, ಧನ್ಯವಾದಗಳು. SVIT ನಲ್ಲಿ ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಲಿ?",
        "Hindi": "मैं ठीक हूँ, धन्यवाद। SVIT में मैं आपकी कैसे मदद कर सकती हूँ?",
        "Telugu": "నేను బాగున్నాను, ధన్యవాదాలు. SVITలో మీకు ఎలా సహాయం చేయగలను?",
        "Tamil": "நான் நலமாக இருக்கிறேன், நன்றி. SVIT-ல் உங்களுக்கு எப்படி உதவலாம்?",
        "Malayalam": "എനിക്ക് സുഖമാണ്, നന്ദി. SVIT-ൽ നിങ്ങളെ എങ്ങനെ സഹായിക്കാം?",
    },
    "thanks": {
        "English": "You're welcome.",
        "Kannada": "ಪರವಾಗಿಲ್ಲ.",
        "Hindi": "आपका स्वागत है।",
        "Telugu": "మీకు స్వాగతం.",
        "Tamil": "வரவேற்கிறேன்.",
        "Malayalam": "സ്വാഗതം.",
    },
    "goodbye": {
        "English": "Goodbye. Have a great day.",
        "Kannada": "ವಿದಾಯ. ನಿಮ್ಮ ದಿನ ಶುಭವಾಗಲಿ.",
        "Hindi": "अलविदा। आपका दिन शुभ हो।",
        "Telugu": "వీడ్కోలు. మీ రోజు శుభంగా ఉండాలి.",
        "Tamil": "விடைபெறுகிறேன். உங்கள் நாள் இனிதாக அமையட்டும்.",
        "Malayalam": "വിട. നിങ്ങളുടെ ദിവസം നല്ലതാകട്ടെ.",
    },
    "identity": {
        "English": "I'm CLARA, the AI receptionist for SVIT. How can I help you?",
        "Kannada": "ನಾನು CLARA, SVIT ನ AI ಸ್ವಾಗತಕಾರ್ತಿ. ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಲಿ?",
        "Hindi": "मैं CLARA हूँ, SVIT की AI रिसेप्शनिस्ट। मैं आपकी कैसे मदद कर सकती हूँ?",
        "Telugu": "నేను CLARA, SVIT AI రిసెప్షనిస్ట్‌ని. మీకు ఎలా సహాయం చేయగలను?",
        "Tamil": "நான் CLARA, SVIT-ன் AI வரவேற்பாளர். உங்களுக்கு எப்படி உதவலாம்?",
        "Malayalam": "ഞാൻ CLARA, SVIT-ന്റെ AI റിസപ്ഷനിസ്റ്റാണ്. നിങ്ങളെ എങ്ങനെ സഹായിക്കാം?",
    },
    "acknowledgement": {
        "English": "Sure. What else can I help you with?",
        "Kannada": "ಸರಿ. ಇನ್ನೇನು ಸಹಾಯ ಬೇಕು?",
        "Hindi": "ठीक है। मैं और किस तरह मदद कर सकती हूँ?",
        "Telugu": "సరే. ఇంకేమైనా సహాయం కావాలా?",
        "Tamil": "சரி. வேறு என்ன உதவி வேண்டும்?",
        "Malayalam": "ശരി. മറ്റെന്തെങ്കിലും സഹായം വേണോ?",
    },
}


def _pick(mapping: dict[str, str], language: str | None) -> str:
    lang = language if language in SUPPORTED_LANGUAGES else "English"
    return mapping.get(lang, mapping["English"])


def no_speech_retry_reply(language: str | None) -> str:
    return _pick(_NO_SPEECH_RETRY, language)


def unknown_reply(language: str | None) -> str:
    return _pick(_UNKNOWN, language)


def clarification_reply(
    language: str | None,
    target: str | None = None,
    *,
    department: str | None = None,
) -> str:
    """Clarification text. `target` names the slot CLARA still needs."""
    slot = (target or "").strip().lower()
    if slot == "department":
        return _pick(_CLARIFY_DEPARTMENT, language)
    if slot == "hostel":
        return _pick(_CLARIFY_HOSTEL, language)
    if slot == "admissions_info":
        return _pick(_CLARIFY_ADMISSIONS_INFO, language)
    if slot == "department_information":
        tmpl = _pick(_CLARIFY_DEPARTMENT_INFORMATION, language)
        key = (department or "").strip().lower()
        label = _DEPT_CLARIFY_LABELS.get(key) or (
            key.replace("_", " ").upper() if key else "the department"
        )
        try:
            return tmpl.format(department=label)
        except (KeyError, ValueError):
            return tmpl
    return _pick(_CLARIFICATION, language)


def ncc_enrollment_reply(language: str | None) -> str:
    """Supplied enrollment/contact guidance only — no invented names or phones."""
    return _pick(_NCC_ENROLLMENT, language)


def restricted_fallback_reply(language: str | None, evidence: str | None = None) -> str:
    """Human-receptionist fallback for clear but unsupported/restricted asks."""
    kind = (evidence or "").strip().lower()
    if kind == "restricted_payment":
        return _pick(_RESTRICTED_PAYMENT, language)
    return _pick(_RESTRICTED_PERSONAL_CONTACT, language)


def name_ack_reply(language: str | None, name: str) -> str:
    tmpl = _pick(_NAME_ACK, language)
    return tmpl.format(name=name)


def greeting_reply(language: str | None) -> str:
    return _pick(_GREETING, language)


def small_talk_reply(language: str | None, kind: str | None = None) -> str:
    if kind and kind in _SOCIAL_RESPONSES:
        return _pick(_SOCIAL_RESPONSES[kind], language)
    return _pick(_SMALL_TALK, language)


# Spoken About Me lines mirror the frontend About Me page copy (ClaraHero /
# mind-map / creators / guide). Visual content still lives on the frontend.
_ABOUT_ME_BRIDGES: dict[str, dict[str, str]] = {
    "overview": {
        "English": (
            "CLARA is an intelligent AI receptionist at the campus entrance to assist "
            "visitors, guests, and students. I give instant answers about college "
            "programs, facilities, and departments, help you navigate campus, and "
            "connect you with faculty and staff online in real time."
        ),
        "Kannada": (
            "CLARA ಕ್ಯಾಂಪಸ್ ಪ್ರವೇಶದ್ವಾರದಲ್ಲಿರುವ ಬುದ್ಧಿವಂತ AI ರಿಸೆಪ್ಷನಿಸ್ಟ್. "
            "ನಾನು ಕಾಲೇಜು ಕಾರ್ಯಕ್ರಮ, ಸೌಲಭ್ಯ ಮತ್ತು ವಿಭಾಗಗಳ ಬಗ್ಗೆ ತ್ವರಿತ ಉತ್ತರ ನೀಡಿ, "
            "ಕ್ಯಾಂಪಸ್ ನ್ಯಾವಿಗೇಟ್ ಮಾಡಲು ಸಹಾಯ ಮಾಡಿ, ಫ್ಯಾಕಲ್ಟಿ ಮತ್ತು ಸಿಬ್ಬಂದಿಯೊಂದಿಗೆ "
            "ನೈಜ ಸಮಯದಲ್ಲಿ ಸಂಪರ್ಕಿಸುತ್ತೇನೆ."
        ),
        "Hindi": (
            "CLARA कैंपस प्रवेश पर एक बुद्धिमान AI रिसेप्शनिस्ट है जो आगंतुकों, "
            "अतिथियों और छात्रों की मदद करती है। मैं कॉलेज कार्यक्रमों, सुविधाओं "
            "और विभागों के बारे में तुरंत जवाब देती हूँ, कैंपस नेविगेट करने में "
            "मदद करती हूँ, और फैकल्टी व स्टाफ से रियल टाइम में जोड़ती हूँ।"
        ),
        "Tamil": (
            "CLARA வளாக நுழைவாயிலில் உள்ள அறிவுசார் AI வரவேற்பாளர். "
            "கல்லூரி திட்டங்கள், வசதிகள் மற்றும் துறைகள் பற்றி உடனடி பதில் அளித்து, "
            "வளாக வழிகாட்டலில் உதவி, ஆசிரியர்கள் மற்றும் பணியாளர்களுடன் "
            "நேரலையில் இணைக்கிறேன்."
        ),
        "Telugu": (
            "CLARA క్యాంపస్ ప్రవేశం వద్ద ఉన్న తెలివైన AI రిసెప్షనిస్ట్. "
            "కాలేజీ ప్రోగ్రామ్‌లు, సౌకర్యాలు, విభాగాల గురించి తక్షణ సమాధానాలు ఇచ్చి, "
            "క్యాంపస్ నావిగేట్ చేయడంలో సహాయపడి, ఫ్యాకల్టీ మరియు స్టాఫ్‌తో "
            "రియల్ టైమ్‌లో కలుపుతాను."
        ),
        "Malayalam": (
            "CLARA ക്യാമ്പസ് പ്രവേശന കവാടത്തിലെ ബുദ്ധിമാനായ AI റിസപ്ഷനിസ്റ്റാണ്. "
            "കോളേജ് പ്രോഗ്രാമുകൾ, സൗകര്യങ്ങൾ, വകുപ്പുകൾ എന്നിവയെക്കുറിച്ച് "
            "ഉടൻ ഉത്തരം നൽകി, ക്യാമ്പസ് നാവിഗേറ്റ് ചെയ്യാൻ സഹായിച്ച്, "
            "ഫാക്കൽറ്റിയെയും സ്റ്റാഫിനെയും റിയൽ ടൈമിൽ ബന്ധിപ്പിക്കുന്നു."
        ),
    },
    "capabilities": {
        "English": (
            "I can understand your questions, use campus knowledge, speak with you, "
            "help with scheduling, connect you to the right people, and support "
            "live communication."
        ),
        "Kannada": (
            "ನಾನು ನಿಮ್ಮ ಪ್ರಶ್ನೆಗಳನ್ನು ಅರ್ಥಮಾಡಿಕೊಳ್ಳಬಲ್ಲೆ, ಕ್ಯಾಂಪಸ್ ಜ್ಞಾನ ಬಳಸಬಲ್ಲೆ, "
            "ಮಾತನಾಡಬಲ್ಲೆ, ವೇಳಾಪಟ್ಟಿ ಸಹಾಯ ಮಾಡಬಲ್ಲೆ, ಸರಿಯಾದ ವ್ಯಕ್ತಿಗಳಿಗೆ "
            "ಸಂಪರ್ಕಿಸಬಲ್ಲೆ ಮತ್ತು ಲೈವ್ ಸಂವಹನ ಬೆಂಬಲಿಸಬಲ್ಲೆ."
        ),
        "Hindi": (
            "मैं आपके सवाल समझ सकती हूँ, कैंपस ज्ञान उपयोग कर सकती हूँ, आपसे बात "
            "कर सकती हूँ, शेड्यूलिंग में मदद कर सकती हूँ, सही लोगों से जोड़ सकती हूँ, "
            "और लाइव संचार का समर्थन कर सकती हूँ।"
        ),
        "Tamil": (
            "நான் உங்கள் கேள்விகளைப் புரிந்துகொண்டு, வளாக அறிவைப் பயன்படுத்தி, "
            "பேசி, நேர அட்டவணைக்கு உதவி, சரியானவர்களுடன் இணைத்து, "
            "நேரலை தொடர்பையும் ஆதரிக்கிறேன்."
        ),
        "Telugu": (
            "నేను మీ ప్రశ్నలు అర్థం చేసుకొని, క్యాంపస్ జ్ఞానం ఉపయోగించి, "
            "మాట్లాడి, షెడ్యూలింగ్‌లో సహాయపడి, సరైన వ్యక్తులతో కలిపి, "
            "లైవ్ కమ్యూనికేషన్‌ను సపోర్ట్ చేస్తాను."
        ),
        "Malayalam": (
            "ഞാൻ നിങ്ങളുടെ ചോദ്യങ്ങൾ മനസിലാക്കുകയും, ക്യാമ്പസ് അറിവ് "
            "ഉപയോഗിക്കുകയും, സംസാരിക്കുകയും, ഷെഡ്യൂളിങ്ങിൽ സഹായിക്കുകയും, "
            "ശരിയായ ആളുകളുമായി ബന്ധിപ്പിക്കുകയും, ലൈവ് ആശയവിനിമയം "
            "പിന്തുണയ്ക്കുകയും ചെയ്യും."
        ),
    },
    "capability_item": {
        "English": "Let me show you how that works.",
        "Kannada": "ಅದು ಹೇಗೆ ಕೆಲಸ ಮಾಡುತ್ತದೆ ಎಂದು ತೋರಿಸುತ್ತೇನೆ.",
        "Hindi": "मैं आपको दिखाती हूँ कि यह कैसे काम करता है।",
        "Tamil": "அது எப்படி வேலை செய்கிறது என்பதை காட்டுகிறேன்.",
        "Telugu": "అది ఎలా పని చేస్తుందో చూపిస్తాను.",
        "Malayalam": "അത് എങ്ങനെ പ്രവർത്തിക്കുന്നുവെന്ന് കാണിച്ചുതരാം.",
    },
    "creators": {
        "English": (
            "Meet the honorable creators of me. "
            "Mister A N Aashuthosh, who is the AI Systems and NLP Engineer. "
            "Mister Adithya N C, who is the Full-Stack and Systems Interface. "
            "Mister Dhanush S Babu, who is the Real-Time Infrastructure and Voice. "
            "And Mister M Naveen Kumar, who is the Lead Architect and Core AI Engineer."
        ),
        "Kannada": (
            "ನನ್ನ ಗೌರವಾನ್ವಿತ ಸೃಷ್ಟಿಕರ್ತರನ್ನು ಭೇಟಿಯಾಗಿ. "
            "ಶ್ರೀ A N ಆಶುತೋಷ್, AI Systems and NLP Engineer. "
            "ಶ್ರೀ ಆದಿತ್ಯ N C, Full-Stack and Systems Interface. "
            "ಶ್ರೀ ಧನುಷ್ S ಬಾಬು, Real-Time Infrastructure and Voice. "
            "ಮತ್ತು ಶ್ರೀ M ನವೀನ್ ಕುಮಾರ್, Lead Architect and Core AI Engineer."
        ),
        "Hindi": (
            "मेरे सम्मानित निर्माताओं से मिलिए। "
            "श्री A N आशुतोष, जो AI Systems and NLP Engineer हैं। "
            "श्री आदित्य N C, जो Full-Stack and Systems Interface हैं। "
            "श्री धनुष S बाबू, जो Real-Time Infrastructure and Voice हैं। "
            "और श्री M नवीन कुमार, जो Lead Architect and Core AI Engineer हैं।"
        ),
        "Tamil": (
            "என்னை உருவாக்கிய மதிப்பிற்குரியவர்களை சந்தியுங்கள். "
            "திரு A N ஆசுதோஷ், AI Systems and NLP Engineer. "
            "திரு ஆதித்யா N C, Full-Stack and Systems Interface. "
            "திரு தனுஷ் S பாபு, Real-Time Infrastructure and Voice. "
            "மற்றும் திரு M நவீன் குமார், Lead Architect and Core AI Engineer."
        ),
        "Telugu": (
            "నన్ను సృష్టించిన గౌరవనీయులను కలవండి. "
            "శ్రీ A N ఆశుతోష్, AI Systems and NLP Engineer. "
            "శ్రీ ఆదిత్య N C, Full-Stack and Systems Interface. "
            "శ్రీ ధనుష్ S బాబు, Real-Time Infrastructure and Voice. "
            "మరియు శ్రీ M నవీన్ కుమార్, Lead Architect and Core AI Engineer."
        ),
        "Malayalam": (
            "എന്നെ സൃഷ്ടിച്ച ബഹുമാനപ്പെട്ടവരെ കാണൂ. "
            "ശ്രീ A N ആശുതോഷ്, AI Systems and NLP Engineer. "
            "ശ്രീ ആദിത്യ N C, Full-Stack and Systems Interface. "
            "ശ്രീ ധനുഷ് S ബാബു, Real-Time Infrastructure and Voice. "
            "ഒപ്പം ശ്രീ M നവീൻ കുമാർ, Lead Architect and Core AI Engineer."
        ),
    },
    "creator_item": {
        "English": "Let me introduce you to one of the people behind me.",
        "Kannada": "ನನ್ನ ಹಿಂದಿರುವವರಲ್ಲಿ ಒಬ್ಬರನ್ನು ಪರಿಚಯಿಸುತ್ತೇನೆ.",
        "Hindi": "मुझे अपने पीछे के लोगों में से एक का परिचय देने दीजिए।",
        "Tamil": "எனக்குப் பின்னால் உள்ளவர்களில் ஒருவரை அறிமுகப்படுத்துகிறேன்.",
        "Telugu": "నా వెనుక ఉన్నవారిలో ఒకరిని పరిచయం చేస్తాను.",
        "Malayalam": "എന്റെ പിന്നിലുള്ളവരിൽ ഒരാളെ പരിചയപ്പെടുത്തട്ടെ.",
    },
    "guide": {
        "English": "Let me introduce you to my project guide.",
        "Kannada": "ನನ್ನ ಪ್ರಾಜೆಕ್ಟ್ ಮಾರ್ಗದರ್ಶಕರನ್ನು ಪರಿಚಯಿಸುತ್ತೇನೆ.",
        "Hindi": "मुझे अपनी प्रोजेक्ट गाइड से आपका परिचय देने दीजिए।",
        "Tamil": "என் திட்ட வழிகாட்டியை அறிமுகப்படுத்துகிறேன்.",
        "Telugu": "నా ప్రాజెక్ట్ గైడ్‌ను పరిచయం చేస్తాను.",
        "Malayalam": "എന്റെ പ്രോജക്ട് ഗൈഡിനെ പരിചയപ്പെടുത്തട്ടെ.",
    },
}

# English spoken lines aligned to frontend About Me mind-map / creator cards.
_ABOUT_ME_CAPABILITY_SPOKEN: dict[str, str] = {
    "understand": (
        "My understanding capability follows natural-language questions and "
        "conversational intent, with multi-turn memory and adaptive tone for "
        "campus inquiries."
    ),
    "know": (
        "My knowledge capability uses institution-specific information so answers "
        "stay grounded in verified campus sources."
    ),
    "speak": (
        "My speaking capability supports speech recognition and voice responses "
        "for hands-free conversation."
    ),
    "schedule": (
        "My scheduling capability helps with appointment-related interactions "
        "and visit coordination."
    ),
    "connect": (
        "My connect capability helps you reach the appropriate staff or "
        "institutional contact."
    ),
    "communicate": (
        "My communication capability supports real-time and video communication "
        "when you need live assistance."
    ),
}

_ABOUT_ME_CREATOR_SPOKEN: dict[str, str] = {
    "c1": (
        "Meet A N Aashuthosh, AI Systems and NLP Engineer. He researched and built "
        "the semantic understanding engine for natural student-institution conversations."
    ),
    "c2": (
        "Meet Adithya N C, Full-Stack and Systems Interface. He crafted the kiosk "
        "and web client interface architecture."
    ),
    "c4": (
        "Meet Dhanush S Babu, Real-Time Infrastructure and Voice. He architected "
        "the streaming WebSocket and WebRTC layer."
    ),
    "c5": (
        "Meet M Naveen Kumar, Lead Architect and Core AI Engineer. He led the "
        "system design and end-to-end integration."
    ),
}

_ABOUT_ME_GUIDE_SPOKEN: dict[str, str] = {
    "English": (
        "Let me introduce you to my project guide, Dr. Nagashree N, from the "
        "Department of Computer Science and Engineering, Data Science. She provided "
        "foundational academic guidance for CLARA."
    ),
}


def about_me_bridge_reply(
    language: str | None,
    bridge_key: str,
    *,
    item_id: str | None = None,
) -> str:
    key = (bridge_key or "overview").strip()
    item = (item_id or "").strip()
    if key == "capability_item" and item in _ABOUT_ME_CAPABILITY_SPOKEN:
        # Capability details are authored in English on the About Me card; keep
        # that as the spoken source of truth for the turn.
        if not language or language == "English":
            return _ABOUT_ME_CAPABILITY_SPOKEN[item]
    if key == "creator_item" and item in _ABOUT_ME_CREATOR_SPOKEN:
        if not language or language == "English":
            return _ABOUT_ME_CREATOR_SPOKEN[item]
    if key == "guide":
        guide = _ABOUT_ME_GUIDE_SPOKEN.get("English")
        if guide and (not language or language == "English"):
            return guide
    table = _ABOUT_ME_BRIDGES.get(key) or _ABOUT_ME_BRIDGES["overview"]
    return _pick(table, language)


def _assert_parity() -> None:
    for name, mapping in (
        ("_NO_SPEECH_RETRY", _NO_SPEECH_RETRY),
        ("_UNKNOWN", _UNKNOWN),
        ("_CLARIFICATION", _CLARIFICATION),
        ("_CLARIFY_DEPARTMENT", _CLARIFY_DEPARTMENT),
        ("_CLARIFY_HOSTEL", _CLARIFY_HOSTEL),
        ("_NCC_ENROLLMENT", _NCC_ENROLLMENT),
        ("_CLARIFY_ADMISSIONS_INFO", _CLARIFY_ADMISSIONS_INFO),
        ("_CLARIFY_DEPARTMENT_INFORMATION", _CLARIFY_DEPARTMENT_INFORMATION),
        ("_RESTRICTED_PERSONAL_CONTACT", _RESTRICTED_PERSONAL_CONTACT),
        ("_RESTRICTED_PAYMENT", _RESTRICTED_PAYMENT),
        ("_NAME_ACK", _NAME_ACK),
        ("_GREETING", _GREETING),
        ("_SMALL_TALK", _SMALL_TALK),
    ):
        missing = [lang for lang in SUPPORTED_LANGUAGES if lang not in mapping]
        if missing:
            raise RuntimeError(f"{name} missing translations: {', '.join(missing)}")
    for key, mapping in _ABOUT_ME_BRIDGES.items():
        missing = [lang for lang in SUPPORTED_LANGUAGES if lang not in mapping]
        if missing:
            raise RuntimeError(f"_ABOUT_ME_BRIDGES[{key}] missing translations: {', '.join(missing)}")


_assert_parity()
