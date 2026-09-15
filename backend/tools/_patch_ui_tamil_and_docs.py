"""One-shot: add documents chrome keys + Tamil ui.json block. Not a runtime module."""

from __future__ import annotations

import json
from copy import deepcopy
from pathlib import Path

ui_path = Path(__file__).resolve().parents[1] / "data" / "locales" / "ui.json"
ui = json.loads(ui_path.read_text(encoding="utf-8"))

doc_chrome = {
    "en": {"label": "Documents", "checklist": "Admissions checklist"},
    "hi": {"label": "दस्तावेज़", "checklist": "प्रवेश जाँच सूची"},
    "kn": {"label": "ದಾಖಲೆಗಳು", "checklist": "ಪ್ರವೇಶ ಪರಿಶೀಲನಾ ಪಟ್ಟಿ"},
    "te": {"label": "పత్రాలు", "checklist": "ప్రవేశ తనిఖీ జాబితా"},
    "ml": {"label": "രേഖകൾ", "checklist": "അഡ്മിഷൻ ചെക്ക്‌ലിസ്റ്റ്"},
}
for code, vals in doc_chrome.items():
    docs = ui[code].setdefault("documents", {})
    docs["label"] = vals["label"]
    docs["checklist"] = vals["checklist"]

en = ui["en"]
ta = deepcopy(en)

TA: dict[tuple[str, ...], str] = {
    ("welcome", "general_display"): "வரவேற்பு.\nஇன்று என்ன தகவல் வேண்டும்?",
    ("welcome", "general_narration"): "வரவேற்பு. இன்று என்ன தகவல் வேண்டும்?",
    ("welcome", "named_display"): "{name}, வரவேற்பு.\nஇன்று என்ன தகவல் வேண்டும்?",
    ("welcome", "named_narration"): "{name}, வரவேற்பு. இன்று என்ன தகவல் வேண்டும்?",
    ("welcome", "name_prompt"): "தயவுசெய்து உங்கள் பெயரைச் சொல்லுங்கள்.",
    ("language", "select"): "ஒரு மொழியைத் தேர்ந்தெடுக்கவும்.",
    ("language", "required"): "தொடர ஒரு மொழியைத் தேர்ந்தெடுக்கவும்.",
    ("status", "listening"): "கேட்கிறேன்…",
    ("status", "processing"): "உங்கள் கோரிக்கையை செயலாக்குகிறேன்…",
    ("status", "thinking"): "CLARA சிந்திக்கிறது…",
    ("status", "thinking_title"): "CLARA சிந்திக்கிறது",
    ("status", "thinking_detail_1"): "உங்கள் கேள்வியைப் படித்து சரியான விவரங்களைத் திரட்டுகிறேன்...",
    ("status", "thinking_detail_2"): "பதில் துல்லியமாக இருக்க வளாகத் தகவலைச் சரிபார்க்கிறேன்...",
    ("status", "thinking_detail_3"): "உங்களுக்கான தெளிவான பதிலைத் தயாரிக்கிறேன்...",
    ("status", "thinking_detail_4"): "CLARA அறிவிலிருந்து தொடர்புடைய விவரங்களை இணைக்கிறேன்...",
    ("status", "thinking_detail_5"): "கிட்டத்தட்ட தயார்... சிறந்த பதிலைத் தயாரிக்கிறேன்...",
    ("status", "tap_to_speak"): "பேச தட்டவும்",
    ("status", "reconnecting"): "மீண்டும் இணைக்கிறது…",
    ("status", "connection_lost"): "இணைப்பு துண்டிக்கப்பட்டது.",
    ("status", "connectivity_issue"): "அமைப்பில் இணைப்புச் சிக்கல் உள்ளது.",
    ("status", "returning_to_sleep"): "உறக்கத் திரைக்குத் திரும்புகிறது.",
    ("clarification", "general"): "உங்களுக்குத் தேவையான தகவலைப் பற்றி இன்னும் கொஞ்சம் சொல்லுங்கள்.",
    ("clarification", "department"): "எந்தத் துறையைப் பற்றி தெரிந்துகொள்ள விரும்புகிறீர்கள்?",
    ("clarification", "hostel"): "நிச்சயம். ஆண்கள் விடுதியா அல்லது பெண்கள் விடுதியா?",
    ("clarification", "small_talk"): "நான் வளாகக் கேள்விகளுக்கு உதவ இங்கே இருக்கிறேன். நீங்கள் என்ன தெரிந்துகொள்ள விரும்புகிறீர்கள்?",
    ("clarification", "hod_department"): "எந்தத் துறையின் தலைவரைப் பற்றி அறிய விரும்புகிறீர்கள் என்று குறிப்பிடுங்கள்.",
    ("clarification", "fees_department"): "எந்தத் துறையின் கட்டண விவரங்களைப் பார்க்க விரும்புகிறீர்கள் என்று குறிப்பிடுங்கள்.",
    ("clarification", "hod_card"): "துறைத் தலைவர் மற்றும் பார்வையை அறிய, துறை பெயரைச் சொல்லுங்கள் அல்லது தேர்ந்தெடுக்கவும்.",
    ("clarification", "fees_card"): "கட்டண விவரங்களுக்கு ஒரு துறையைத் தேர்ந்தெடுக்கவும், அல்லது முழு கட்டண மேலோட்டத்தைப் பாருங்கள்.",
    ("error", "retry"): "மீண்டும் முயற்சிக்கவும்.",
    ("error", "no_speech"): "தெளிவாகக் கேட்கவில்லை. தயவுசெய்து உங்கள் கேள்வியை மீண்டும் சொல்லுங்கள்.",
    ("error", "microphone_denied"): "மைக்ரோஃபோன் அனுமதி மறுக்கப்பட்டது. அனுமதி அளிக்கவும் அல்லது கேள்வியை டைப் செய்யவும்.",
    ("error", "microphone_missing"): "மைக்ரோஃபோன் கிடைக்கவில்லை. தயவுசெய்து கேள்வியை டைப் செய்யவும்.",
    ("error", "microphone_blocked"): "உலாவி குரல் உள்ளீட்டைத் தடுத்தது. மைக்ரோஃபோன் அனுமதி அளிக்கவும் அல்லது டைப் செய்யவும்.",
    ("error", "microphone_start"): "மைக்ரோஃபோனைத் தொடங்க முடியவில்லை. மீண்டும் முயற்சிக்கவும் அல்லது டைப் செய்யவும்.",
    ("error", "voice_unsupported"): "இந்த உலாவியில் குரல் உள்ளீடு ஆதரிக்கப்படவில்லை. Chrome அல்லது Edge பயன்படுத்தவும், அல்லது டைப் செய்யவும்.",
    ("error", "voice_failed"): "குரல் உள்ளீடு தோல்வியடைந்தது. மீண்டும் முயற்சிக்கவும் அல்லது டைப் செய்யவும்.",
    ("error", "voice_timeout"): "குரல் அறிதல் நேரம் முடிந்தது. மீண்டும் முயற்சிக்கவும் அல்லது டைப் செய்யவும்.",
    ("error", "voice_unrecognized"): "ஆடியோவைப் புரிந்துகொள்ள முடியவில்லை. மீண்டும் முயற்சிக்கவும் அல்லது டைப் செய்யவும்.",
    ("error", "network"): "குரல் அறிதல் சேவையை அடைய முடியவில்லை. இணையத்தைச் சரிபார்த்து மீண்டும் முயற்சிக்கவும்.",
    ("error", "offline"): "கியோஸ்க் ஆஃப்லைனில் உள்ளது. இணையத்துடன் இணைத்து மீண்டும் முயற்சிக்கவும்.",
    ("error", "backend"): "சேவை தற்காலிகமாகக் கிடைக்கவில்லை. மீண்டும் முயற்சிக்கவும்.",
    ("error", "empty_response"): "பதிலைத் தயாரிக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்.",
    ("error", "invalid_request"): "கோரிக்கையைச் செயலாக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்.",
    ("error", "missing_text"): "தயவுசெய்து ஒரு கேள்வியை டைப் செய்யவும் அல்லது சொல்லுங்கள்.",
    ("error", "audio_unavailable"): "குரல் வெளியீடு தற்காலிகமாகக் கிடைக்கவில்லை. தகவல் திரையில் கிடைக்கும்.",
    ("availability", "official_fact_blocked"): (
        "இந்தத் தகவல் இன்னும் அதிகாரப்பூர்வமாக உறுதிப்படுத்தப்படவில்லை.\n"
        "மேலும் தகவலுக்கு தொடர்புடைய துறையை அணுகவும்."
    ),
    ("availability", "unknown"): (
        "அதைப் பற்றி நம்பகமான தகவல் இப்போது இல்லை. சேர்க்கை, துறைகள், பிளேஸ்மென்ட், "
        "கட்டணம், வசதிகள் மற்றும் வளாகத் தகவலில் உதவ முடியும்."
    ),
    ("availability", "missing_source"): (
        "இந்தத் தகவல் அங்கீகரிக்கப்பட்ட மூலத்தில் இல்லை.\n"
        "மேலும் தகவலுக்கு தொடர்புடைய துறையை அணுகவும்."
    ),
    ("availability", "off_topic"): (
        "அது என்னால் உதவக்கூடிய வரம்பிற்கு வெளியே. SVIT சேர்க்கை, துறைகள், கட்டணம், "
        "பிளேஸ்மென்ட், ஆசிரியர்கள் மற்றும் வளாக வசதிகள் பற்றி கேள்விகளுக்கு பதிலளிக்க முடியும்."
    ),
    ("session", "thank_you"): "நன்றி.",
    ("session", "goodbye"): "பிரியாவிடை.",
    ("session", "timeout"): "இந்த அமர்வு நேரம் முடிந்தது.",
    ("session", "ending"): "இந்த அமர்வு முடிவடைகிறது.",
    ("session", "interrupted"): "முந்தைய பதில் தடைபட்டது.",
    ("session", "back"): "பின்செல்",
    ("session", "home"): "முகப்புக்குச் செல்",
    ("session", "close"): "மூடு",
    ("session", "retry_connection"): "இணைப்பை மீண்டும் முயற்சிக்கவும்",
    ("session", "enable_face_display"): "முகக் காட்சியை இயக்கவும்",
    ("session", "closing_prompt"): "வேறு ஏதாவது உதவி வேண்டுமா?",
    ("session", "closing_prompt_named"): "வேறு ஏதாவது உதவி வேண்டுமா, {name}?",
    ("session", "continue_listening"): "நிச்சயம். நீங்கள் என்ன தெரிந்துகொள்ள விரும்புகிறீர்கள்?",
    ("cards", "department"): "துறை",
    ("cards", "faculty"): "ஆசிரியர்கள்",
    ("cards", "location"): "கல்லூரி இருப்பிடம்",
    ("cards", "hostel"): "விடுதி",
    ("cards", "canteen"): "கேன்டீன்",
    ("cards", "event"): "நிகழ்வு",
    ("cards", "hod_and_vision"): "துறைத் தலைவர் மற்றும் பார்வை",
    ("cards", "leadership_and_vision"): "தலைமை மற்றும் பார்வை",
    ("cards", "leadership_profile"): "தலைமை சுயவிவரம்",
    ("cards", "achievements"): "சாதனைகள்",
    ("cards", "placements"): "பிளேஸ்மென்ட்",
    ("cards", "placements_training"): "பிளேஸ்மென்ட் மற்றும் பயிற்சி",
    ("cards", "admissions"): "சேர்க்கை",
    ("cards", "fees"): "கட்டண விவரங்கள்",
    ("cards", "eligibility"): "தகுதி",
    ("cards", "entrance_exams"): "நுழைவுத் தேர்வுகள்",
    ("cards", "ug_fees"): "இளநிலை கட்டணத் தகவல்",
    ("cards", "pg_fees"): "MBA மற்றும் முதுநிலை கட்டணத் தகவல்",
    ("cards", "scholarships"): "உதவித்தொகை",
    ("cards", "training_objectives"): "பயிற்சி மற்றும் பிளேஸ்மென்ட் நோக்கங்கள்",
    ("cards", "training_programs"): "பயிற்சித் திட்டங்கள்",
    ("cards", "summary"): "சுருக்கம்",
    ("cards", "information_unavailable"): "தகவல் கிடைக்கவில்லை.",
    ("cards", "college_brochure"): "கல்லூரி புத்தகம்",
    ("cards", "open"): "திற",
    ("cards", "asset"): "சொத்து",
    ("cards", "menu_engineering"): "பொறியியல்",
    ("cards", "menu_select_department"): "ஒரு துறையைத் தேர்ந்தெடுக்கவும்",
    ("cards", "menu_overview"): "திட்டத்தை ஆராயுங்கள்",
    ("cards", "fee_description"): "தற்போதைய சேர்க்கைக்கான துறைவாரியான ஆண்டு கட்டணத் தகவல்.",
    ("cards", "selected_department"): "தேர்ந்தெடுத்த துறை",
    ("cards", "management_quota_fee"): "மேலாண்மை ஒதுக்கீடு கட்டணம்",
    ("cards", "other_quotas"): "மற்ற ஒதுக்கீடுகள்",
    ("cards", "admission_office_contact"): "துல்லியமான தகவலுக்கு சேர்க்கை அலுவலகத்தை தொடர்புகொள்ளவும்.",
    ("cards", "ncc"): "NCC",
    ("documents", "title"): "தேவையான ஆவணங்கள்",
    ("documents", "label"): "ஆவணங்கள்",
    ("documents", "checklist"): "சேர்க்கை சரிபார்ப்புப் பட்டியல்",
    ("documents", "items", "marks_10"): "10ஆம் வகுப்பு மதிப்பெண் அட்டை",
    ("documents", "items", "marks_12"): "12ஆம் / II PUC மதிப்பெண் அட்டை",
    ("documents", "items", "rank_allotment"): "CET / COMEDK தரவரிசை அட்டை + ஒதுக்கீட்டு கடிதம்",
    ("documents", "items", "transfer"): "மாற்றுச் சான்றிதழ் (TC)",
    ("documents", "items", "conduct"): "நடத்தை / குணச் சான்றிதழ்",
    ("documents", "items", "caste_income"): "சாதி / வருமானச் சான்றிதழ் (தேவையெனில்)",
    ("documents", "items", "aadhaar"): "ஆதார் அட்டை நகல்",
    ("documents", "items", "photos"): "பாஸ்போர்ட் அளவு புகைப்படங்கள் (6–10)",
    ("documents", "items", "migration"): "மைக்ரேஷன் சான்றிதழ் (பிற வாரிய மாணவர்களுக்கு)",
    ("documents", "items", "vtu_eligibility"): "VTU தகுதி சான்றிதழ் (தேவையெனில்)",
    ("comparison", "close"): "மூடு",
    ("comparison", "add_program"): "திட்டம் சேர்",
    ("comparison", "remove_program"): "நீக்கு",
    ("comparison", "heading"): "திட்ட ஒப்பீடு",
    ("comparison", "select_program"): "திட்டத்தைத் தேர்ந்தெடுக்கவும்",
    ("comparison", "swipe_hint"): "உள்ளடக்கங்கள் தானாக முன்னேறும் — ஒவ்வொரு திட்டத்திற்கும் ஒரு அடி, ஒத்திசைவில்.",
    ("comparison", "highlighted"): "பரிந்துரைக்கப்பட்ட கவனம்",
    ("action", "fees"): "{department} துறையின் கட்டணத் தகவலைக் காட்டுகிறேன்.",
    ("action", "documents"): "தேவையான ஆவணங்கள்: {items}.",
    ("action", "location"): "SVIT ராஜனுகுண்டே, யெலஹாங்கா வழியாக, பெங்களூரு, கர்நாடகா 560 064 இல் அமைந்துள்ளது.",
    ("action", "admissions"): "சேர்க்கைத் தகவலைத் திரையில் காட்டுகிறேன்.",
    ("action", "placements"): "பிளேஸ்மென்ட் தகவலைத் திரையில் காட்டுகிறேன்.",
    ("action", "department"): "{department} துறை பற்றிய தகவலைத் திரையில் காட்டுகிறேன்.",
    ("action", "hod"): "{department} துறையின் தலைவர் தகவலைக் காட்டுகிறேன்.",
    ("action", "college"): "கோரப்பட்ட கல்லூரித் தகவலைத் திரையில் காட்டுகிறேன்.",
    ("action", "principal"): "முதல்வர் சுயவிவரத்தைத் திரையில் காட்டுகிறேன்.",
    ("action", "vice_principal"): "துணை முதல்வர் சுயவிவரத்தைத் திரையில் காட்டுகிறேன்.",
    ("action", "course_menu"): "எங்கள் கல்லூரியில் உள்ள துறைகள் இவை. ஒன்றைத் தேர்ந்தெடுக்கவும்.",
    ("action", "bus_routes"): "எங்கள் கல்லூரி பஸ் வழித்தடங்கள் இவை. நேரங்களைப் பார்க்க ஒரு வழியைத் தேர்ந்தெடுக்கவும்.",
    ("profile", "hod"): "{hod} துறைத் தலைவர்.",
    ("profile", "trustees"): "அறங்காவலர் பெயர்கள்: {trustees}.",
    ("profile", "hod_and_trustees"): "{hod} துறைத் தலைவர். அறங்காவலர் பெயர்கள்: {trustees}.",
    ("ncc", "enrollment"): (
        "மாணவர்கள் வளாகம் நிர்வாக அலுவலகம் வழியாக NCC பராமரிப்பாளர் அல்லது Associate NCC Officer-ஐ "
        "தொடர்பு கொள்ளலாம், அல்லது Sports & NCC Department அறிவிப்புப் பலகையைப் பார்க்கலாம்."
    ),
}


def set_path(obj: dict, path: tuple[str, ...], value: str) -> None:
    cur: dict = obj
    for p in path[:-1]:
        cur = cur[p]
    cur[path[-1]] = value


for path, value in TA.items():
    set_path(ta, path, value)

ordered = {}
for key in ("en", "hi", "kn", "ta", "te", "ml"):
    ordered[key] = ta if key == "ta" else ui[key]

ui_path.write_text(json.dumps(ordered, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print("langs", list(ordered))
print("ta.label", ordered["ta"]["documents"]["label"])
print("kn.checklist", ordered["kn"]["documents"]["checklist"])
