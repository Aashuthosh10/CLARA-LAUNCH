"""SAMPLE campus-unit copy for six locales. Not official institutional facts."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from backend.services.content.campus_units import (
    CAMPUS_UNIT_IDS,
    CANTEEN_UNIT_IDS,
    EVENT_UNIT_IDS,
    HOSTEL_UNIT_IDS,
    SAMPLE_STATUS,
)

LOCALES_DIR = Path(__file__).resolve().parents[2] / "data" / "locales"
LANGS = ("en", "kn", "hi", "ta", "te", "ml")

_ENTITY_LABEL: dict[str, dict[str, str]] = {
    "en": {
        "hostel.girls": "Girls hostel",
        "hostel.boys": "Boys hostel",
        "canteen": "Canteen",
        "events.sanchalana": "Sanchalana",
        "events.techvidya": "TechVidya",
        "events.sirikannada_utsava": "SiriKannada Utsava",
        "events.freshers_fest": "Freshers fest (sample)",
        "events.sports_meet": "Sports meet (sample)",
        "events.project_expo": "Project expo (sample)",
        "events.alumni_meet": "Alumni meet (sample)",
    },
    "kn": {
        "hostel.girls": "ಹುಡುಗಿಯರ ಹಾಸ್ಟೆಲ್",
        "hostel.boys": "ಹುಡುಗರ ಹಾಸ್ಟೆಲ್",
        "canteen": "ಕ್ಯಾಂಟೀನ್",
        "events.sanchalana": "ಸಂಚಲನ",
        "events.techvidya": "ಟೆಕ್ ವಿದ್ಯಾ",
        "events.sirikannada_utsava": "ಸಿರಿಕನ್ನಡ ಉತ್ಸವ",
        "events.freshers_fest": "ಫ್ರೆಷರ್ಸ್ ಫೆಸ್ಟ್ (ಮಾದರಿ)",
        "events.sports_meet": "ಕ್ರೀಡಾ ಕೂಟ (ಮಾದರಿ)",
        "events.project_expo": "ಪ್ರಾಜೆಕ್ಟ್ ಎಕ್ಸ್‌ಪೋ (ಮಾದರಿ)",
        "events.alumni_meet": "ಹಳೆಯ ವಿದ್ಯಾರ್ಥಿ ಸಮಾವೇಶ (ಮಾದರಿ)",
    },
    "hi": {
        "hostel.girls": "लड़कियों का हॉस्टल",
        "hostel.boys": "लड़कों का हॉस्टल",
        "canteen": "कैंटीन",
        "events.sanchalana": "संचलना",
        "events.techvidya": "टेक विद्या",
        "events.sirikannada_utsava": "सिरीकन्नड़ उत्सव",
        "events.freshers_fest": "फ्रेशर्स फेस्ट (नमूना)",
        "events.sports_meet": "खेल मेला (नमूना)",
        "events.project_expo": "प्रोजेक्ट एक्सपो (नमूना)",
        "events.alumni_meet": "पूर्व छात्र मिलन (नमूना)",
    },
    "ta": {
        "hostel.girls": "பெண்கள் விடுதி",
        "hostel.boys": "ஆண்கள் விடுதி",
        "canteen": "கேண்டீன்",
        "events.sanchalana": "சஞ்சலனா",
        "events.techvidya": "டெக் வித்யா",
        "events.sirikannada_utsava": "சிரிகன்னட உத்சவம்",
        "events.freshers_fest": "ஃப்ரெஷர்ஸ் விழா (மாதிரி)",
        "events.sports_meet": "விளையாட்டு சந்திப்பு (மாதிரி)",
        "events.project_expo": "பிராஜெக்ட் எக்ஸ்போ (மாதிரி)",
        "events.alumni_meet": "முன்னாள் மாணவர் சந்திப்பு (மாதிரி)",
    },
    "te": {
        "hostel.girls": "బాలికల హాస్టల్",
        "hostel.boys": "బాలుర హాస్టల్",
        "canteen": "కాంటీన్",
        "events.sanchalana": "సంచలన",
        "events.techvidya": "టెక్ విద్యా",
        "events.sirikannada_utsava": "సిరికన్నడ ఉత్సవం",
        "events.freshers_fest": "ఫ్రెషర్స్ ఫెస్ట్ (నమూనా)",
        "events.sports_meet": "క్రీడా కూటం (నమూనా)",
        "events.project_expo": "ప్రాజెక్ట్ ఎక్స్‌పో (నమూనా)",
        "events.alumni_meet": "పూర్వ విద్యార్థి సమావేశం (నమూనా)",
    },
    "ml": {
        "hostel.girls": "പെൺകുട്ടികളുടെ ഹോസ്റ്റൽ",
        "hostel.boys": "ആൺകുട്ടികളുടെ ഹോസ്റ്റൽ",
        "canteen": "കാന്റീൻ",
        "events.sanchalana": "സഞ്ചലന",
        "events.techvidya": "ടെക് വിദ്യ",
        "events.sirikannada_utsava": "സിരികന്നഡ ഉത്സവം",
        "events.freshers_fest": "ഫ്രെഷേഴ്സ് ഫെസ്റ്റ് (സാമ്പിൾ)",
        "events.sports_meet": "കായിക മീറ്റ് (സാമ്പിൾ)",
        "events.project_expo": "പ്രോജക്ട് എക്സ്പോ (സാമ്പിൾ)",
        "events.alumni_meet": "പൂർവ വിദ്യാർഥി സമാഗമം (സാമ്പിൾ)",
    },
}

_TOPIC_LABEL: dict[str, dict[str, str]] = {
    "en": {
        "overview": "overview",
        "rooms": "rooms",
        "timings": "entry and exit timings",
        "food": "food",
        "safety": "safety",
        "activities": "activities",
        "fees": "fees",
        "food_quality": "food quality",
        "hygiene": "hygiene",
        "variety": "variety",
        "pricing": "pricing",
    },
    "kn": {
        "overview": "ಅವಲೋಕನ",
        "rooms": "ಕೊಠಡಿಗಳು",
        "timings": "ಪ್ರವೇಶ ಮತ್ತು ನಿರ್ಗಮನ ಸಮಯ",
        "food": "ಆಹಾರ",
        "safety": "ಭದ್ರತೆ",
        "activities": "ಚಟುವಟಿಕೆಗಳು",
        "fees": "ಶುಲ್ಕ",
        "food_quality": "ಆಹಾರದ ಗುಣಮಟ್ಟ",
        "hygiene": "ನೈರ್ಮಲ್ಯ",
        "variety": "ವೈವಿಧ್ಯ",
        "pricing": "ಬೆಲೆ",
    },
    "hi": {
        "overview": "अवलोकन",
        "rooms": "कमरे",
        "timings": "प्रवेश और निकासी समय",
        "food": "खाना",
        "safety": "सुरक्षा",
        "activities": "गतिविधियाँ",
        "fees": "शुल्क",
        "food_quality": "खाना गुणवत्ता",
        "hygiene": "स्वच्छता",
        "variety": "विविधता",
        "pricing": "कीमत",
    },
    "ta": {
        "overview": "கண்ணோட்டம்",
        "rooms": "அறைகள்",
        "timings": "நுழைவு மற்றும் வெளியேறும் நேரம்",
        "food": "உணவு",
        "safety": "பாதுகாப்பு",
        "activities": "செயல்பாடுகள்",
        "fees": "கட்டணம்",
        "food_quality": "உணவுத் தரம்",
        "hygiene": "சுகாதாரம்",
        "variety": "வகைகள்",
        "pricing": "விலை",
    },
    "te": {
        "overview": "అవలోకనం",
        "rooms": "గదులు",
        "timings": "ప్రవేశ మరియు నిష్క్రమణ సమయాలు",
        "food": "ఆహారం",
        "safety": "భద్రత",
        "activities": "కార్యకలాపాలు",
        "fees": "ఫీజు",
        "food_quality": "ఆహార నాణ్యత",
        "hygiene": "పరిశుభ్రత",
        "variety": "వైవిధ్యం",
        "pricing": "ధర",
    },
    "ml": {
        "overview": "അവലോകനം",
        "rooms": "മുറികൾ",
        "timings": "പ്രവേശനവും പുറത്തുപോകൽ സമയവും",
        "food": "ഭക്ഷണം",
        "safety": "സുരക്ഷ",
        "activities": "പ്രവർത്തനങ്ങൾ",
        "fees": "ഫീസ്",
        "food_quality": "ഭക്ഷണ നിലവാരം",
        "hygiene": "ശുചിത്വം",
        "variety": "വൈവിധ്യം",
        "pricing": "വില",
    },
}

_NOTICE: dict[str, str] = {
    "en": "SAMPLE_REPLACE_WITH_OFFICIAL. Official details are not confirmed yet.",
    "kn": "SAMPLE_REPLACE_WITH_OFFICIAL. ಅಧಿಕೃತ ವಿವರಗಳು ಇನ್ನೂ ದೃಢಪಟ್ಟಿಲ್ಲ.",
    "hi": "SAMPLE_REPLACE_WITH_OFFICIAL. आधिकारिक विवरण अभी पुष्ट नहीं हैं।",
    "ta": "SAMPLE_REPLACE_WITH_OFFICIAL. அதிகாரப்பூர்வ விவரங்கள் இன்னும் உறுதிப்படுத்தப்படவில்லை.",
    "te": "SAMPLE_REPLACE_WITH_OFFICIAL. అధికారిక వివరాలు ఇంకా నిర్ధారించబడలేదు.",
    "ml": "SAMPLE_REPLACE_WITH_OFFICIAL. ഔദ്യോഗിക വിവരങ്ങൾ ഇതുവരെ സ്ഥിരീകരിച്ചിട്ടില്ല.",
}

_FOCUS: dict[str, dict[str, str]] = {
    "en": {
        "overview": "general facilities and daily life",
        "rooms": "room type, occupancy, and furnishings",
        "timings": "entry, exit, and in-campus hours",
        "food": "mess food quality, freshness, and hygiene",
        "safety": "secure entry, supervision, and anti-ragging policy",
        "activities": "hostel activities and student life",
        "fees": "hostel fee range and what is included",
        "food_quality": "taste, freshness, and preparation quality",
        "hygiene": "kitchen cleanliness and serving hygiene",
        "variety": "menu range and dietary options",
        "pricing": "affordability of typical meals",
        "event": "purpose, audience, and sample highlights",
    },
    "kn": {
        "overview": "ಸಾಮಾನ್ಯ ಸೌಲಭ್ಯಗಳು ಮತ್ತು ದೈನಂದಿನ ಜೀವನ",
        "rooms": "ಕೊಠಡಿ ಪ್ರಕಾರ, ವಾಸಿಗಳ ಸಂಖ್ಯೆ ಮತ್ತು ಸಾಮಗ್ರಿ",
        "timings": "ಪ್ರವೇಶ, ನಿರ್ಗಮನ ಮತ್ತು ಆವರಣದ ಸಮಯ",
        "food": "ಮೆಸ್ ಆಹಾರದ ಗುಣಮಟ್ಟ, ತಾಜಾತನ ಮತ್ತು ನೈರ್ಮಲ್ಯ",
        "safety": "ಸುರಕ್ಷಿತ ಪ್ರವೇಶ, ಮೇಲ್ವಿಚಾರಣೆ ಮತ್ತು ರ್ಯಾಗಿಂಗ್ ನಿಷೇಧ",
        "activities": "ಹಾಸ್ಟೆಲ್ ಚಟುವಟಿಕೆಗಳು ಮತ್ತು ವಿದ್ಯಾರ್ಥಿ ಜೀವನ",
        "fees": "ಹಾಸ್ಟೆಲ್ ಶುಲ್ಕ ಮತ್ತು ಒಳಗೊಂಡಿರುವ ವಿವರ",
        "food_quality": "ರುಚಿ, ತಾಜಾತನ ಮತ್ತು ತಯಾರಿಕೆ ಗುಣಮಟ್ಟ",
        "hygiene": "ಅಡುಗೆಮನೆ ಸ್ವಚ್ಛತೆ ಮತ್ತು ಬಡಿಸುವ ನೈರ್ಮಲ್ಯ",
        "variety": "ಮೆನು ವ್ಯಾಪ್ತಿ ಮತ್ತು ಆಹಾರ ಆಯ್ಕೆಗಳು",
        "pricing": "ಸಾಮಾನ್ಯ ಊಟದ ಕೈಗೆಟುಕುವಿಕೆ",
        "event": "ಉದ್ದೇಶ, ಪ್ರೇಕ್ಷಕರು ಮತ್ತು ಮಾದರಿ ವಿಶೇಷತೆಗಳು",
    },
    "hi": {
        "overview": "सामान्य सुविधाएँ और दैनिक जीवन",
        "rooms": "कमरे का प्रकार, रहने वाले और साज-सज्जा",
        "timings": "प्रवेश, निकासी और परिसर समय",
        "food": "मेस खाने की गुणवत्ता, ताजगी और स्वच्छता",
        "safety": "सुरक्षित प्रवेश, निगरानी और रैगिंग-रोधी नीति",
        "activities": "हॉस्टल गतिविधियाँ और छात्र जीवन",
        "fees": "हॉस्टल शुल्क और क्या शामिल है",
        "food_quality": "स्वाद, ताजगी और तैयारी की गुणवत्ता",
        "hygiene": "रसोई की सफाई और परोसने की स्वच्छता",
        "variety": "मेनू विविधता और आहार विकल्प",
        "pricing": "सामान्य भोजन की सस्ती कीमत",
        "event": "उद्देश्य, दर्शक और नमूना मुख्य बिंदु",
    },
    "ta": {
        "overview": "பொது வசதிகள் மற்றும் அன்றாட வாழ்க்கை",
        "rooms": "அறை வகை, தங்கும் எண்ணிக்கை மற்றும் அமைப்பு",
        "timings": "நுழைவு, வெளியேற்றம் மற்றும் வளாக நேரம்",
        "food": "மெஸ் உணவுத் தரம், புத்துணர்ச்சி மற்றும் சுகாதாரம்",
        "safety": "பாதுகாப்பான நுழைவு, மேற்பார்வை மற்றும் ரேகிங் தடை",
        "activities": "விடுதி செயல்பாடுகள் மற்றும் மாணவர் வாழ்க்கை",
        "fees": "விடுதிக் கட்டணம் மற்றும் சேர்க்கப்பட்டவை",
        "food_quality": "சுவை, புத்துணர்ச்சி மற்றும் தயாரிப்புத் தரம்",
        "hygiene": "சமையலறை சுத்தம் மற்றும் பரிமாறல் சுகாதாரம்",
        "variety": "மெனு வகைகள் மற்றும் உணவுத் தேர்வுகள்",
        "pricing": "பொதுவான உணவின் கட்டுப்படியாகும் விலை",
        "event": "நோக்கம், பார்வையாளர்கள் மற்றும் மாதிரி சிறப்பம்சங்கள்",
    },
    "te": {
        "overview": "సాధారణ సౌకర్యాలు మరియు రోజువారీ జీవితం",
        "rooms": "గది రకం, నివాసులు మరియు సామగ్రి",
        "timings": "ప్రవేశం, నిష్క్రమణ మరియు క్యాంపస్ సమయాలు",
        "food": "మెస్ ఆహార నాణ్యత, తాజాదనం మరియు పరిశుభ్రత",
        "safety": "సురక్షిత ప్రవేశం, పర్యవేక్షణ మరియు ర్యాగింగ్ నిషేధం",
        "activities": "హాస్టల్ కార్యకలాపాలు మరియు విద్యార్థి జీవితం",
        "fees": "హాస్టల్ ఫీజు మరియు ఏమి ఉంటుంది",
        "food_quality": "రుచి, తాజాదనం మరియు తయారీ నాణ్యత",
        "hygiene": "వంటగది పరిశుభ్రత మరియు వడ్డన పరిశుభ్రత",
        "variety": "మెనూ వైవిధ్యం మరియు ఆహార ఎంపికలు",
        "pricing": "సాధారణ భోజనం యొక్క సరసమైన ధర",
        "event": "ఉద్దేశ్యం, ప్రేక్షకులు మరియు నమూనా ప్రత్యేకతలు",
    },
    "ml": {
        "overview": "പൊതു സൗകര്യങ്ങളും ദൈനംദിന ജീവിതവും",
        "rooms": "മുറി തരം, താമസക്കാരുടെ എണ്ണം, സാധനങ്ങൾ",
        "timings": "പ്രവേശനം, പുറത്തുകടത്തൽ, കാമ്പസ് സമയം",
        "food": "മെസ് ഭക്ഷണ നിലവാരം, പുതുമ, ശുചിത്വം",
        "safety": "സുരക്ഷിത പ്രവേശനം, മേൽനോട്ടം, റാഗിങ് നിരോധനം",
        "activities": "ഹോസ്റ്റൽ പ്രവർത്തനങ്ങളും വിദ്യാർഥി ജീവിതവും",
        "fees": "ഹോസ്റ്റൽ ഫീസും ഉൾപ്പെടുന്ന കാര്യങ്ങളും",
        "food_quality": "രുചി, പുതുമ, തയ്യാറാക്കൽ നിലവാരം",
        "hygiene": "അടുക്കള ശുചിത്വവും വിളമ്പൽ ശുചിത്വവും",
        "variety": "മെനു വൈവിധ്യവും ഭക്ഷണ ഓപ്ഷനുകളും",
        "pricing": "സാധാരണ ഭക്ഷണത്തിന്റെ താങ്ങാവുന്ന വില",
        "event": "ലക്ഷ്യം, പ്രേക്ഷകർ, സാമ്പിൾ ഹൈലൈറ്റുകൾ",
    },
}

_TTS_LEAD: dict[str, str] = {
    "en": "{label} currently has only sample information about {focus}. Official details are not confirmed yet.",
    "kn": "{label} ಬಗ್ಗೆ ಇದು ಮಾದರಿ ಮಾಹಿತಿ: {focus}. ಅಧಿಕೃತ ವಿವರಗಳು ಇನ್ನೂ ದೃಢಪಟ್ಟಿಲ್ಲ.",
    "hi": "{label} के बारे में अभी केवल नमूना जानकारी है: {focus}। आधिकारिक विवरण अभी पुष्ट नहीं हैं।",
    "ta": "{label} குறித்து இப்போது மாதிரி தகவல் மட்டுமே உள்ளது: {focus}. அதிகாரப்பூர்வ விவரம் இன்னும் உறுதிப்படவில்லை.",
    "te": "{label} గురించి ప్రస్తుతం నమూనా సమాచారం మాత్రమే ఉంది: {focus}. అధికారిక వివరాలు ఇంకా నిర్ధారణ కాలేదు.",
    "ml": "{label} സംബന്ധിച്ച് ഇപ്പോൾ സാമ്പിൾ വിവരം മാത്രമേയുള്ളൂ: {focus}. ഔദ്യോഗിക വിവരങ്ങൾ ഇതുവരെ സ്ഥിരീകരിച്ചിട്ടില്ല.",
}


def _split_unit(unit_id: str) -> tuple[str, str]:
    if unit_id in EVENT_UNIT_IDS:
        return unit_id, "event"
    if unit_id in CANTEEN_UNIT_IDS:
        return "canteen", unit_id.split(".", 1)[1]
    if unit_id in HOSTEL_UNIT_IDS:
        entity, topic = unit_id.rsplit(".", 1)
        return entity, topic
    return unit_id, "overview"


def build_campus_unit_record(unit_id: str, lang: str) -> dict[str, Any]:
    entity, topic = _split_unit(unit_id)
    labels = _ENTITY_LABEL[lang]
    topics = _TOPIC_LABEL[lang]
    entity_label = labels.get(entity, entity)
    topic_label = topics.get(topic, topic)
    if topic == "event":
        title = entity_label
        focus = _FOCUS[lang]["event"]
        label = entity_label
    else:
        title = f"{entity_label} — {topic_label}"
        focus = _FOCUS[lang].get(topic, _FOCUS[lang]["overview"])
        label = title
    notice = _NOTICE[lang]
    body = f"{notice} {focus}."
    tts = _TTS_LEAD[lang].format(label=label, focus=focus)
    points = [
        f"{focus} — {SAMPLE_STATUS}",
        notice,
    ]
    return {
        "content_status": SAMPLE_STATUS,
        "title": title,
        "body": body,
        "tts_summary": tts,
        "points": points,
    }


def build_campus_units_block(lang: str) -> dict[str, Any]:
    return {uid: build_campus_unit_record(uid, lang) for uid in CAMPUS_UNIT_IDS}


def write_campus_units_into_locales() -> dict[str, int]:
    counts: dict[str, int] = {}
    for lang in LANGS:
        path = LOCALES_DIR / f"{lang}.json"
        data = json.loads(path.read_text(encoding="utf-8"))
        data["campus_units"] = build_campus_units_block(lang)
        path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        counts[lang] = len(data["campus_units"])
    return counts
