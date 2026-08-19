"""Six-language non-card ANSWER matrix.

CLARA is one receptionist intelligence, not English plus five translated modes.
These tests prove routing, answer-language ownership, retrieval-query construction,
and length budget without calling Groq or Sarvam.
"""

from __future__ import annotations

import json
import unittest
from pathlib import Path

from backend.config.settings import TARGET_LANGUAGE_CODES
from backend.core.rag import build_retrieval_query
from backend.services.answer_generation import (
    build_receptionist_answer_system_prompt,
    get_off_topic_reply,
    get_unavailable_reply,
    locale_file_id_for_lang_key,
)
from backend.services.content.semantic_anaphora import has_anaphora
from backend.services.content.semantic_request_parser import parse_semantic_request
from backend.services.conversation.answer_language import resolve_answer_language, tts_code_for_lang_key
from backend.services.conversation.answer_length import govern_answer_length, measure_answer
from backend.services.conversation.response_decision import (
    DomainRelevance,
    ResponseMode,
    detect_domain_relevance,
    resolve_response_decision,
)


LANGS = ("en", "kn", "hi", "ta", "te", "ml")
FORMS = ("A", "B", "C", "D", "E", "F")

# Natural human phrasing — not a machine-translated English list.
# A native script / B romanized / C English code-switch / D informal
# E short / F conversational. English B is informal Latin (no romanization).
MATRIX: dict[str, dict[str, dict[str, str]]] = {
    "faculty": {
        "en": {
            "A": "How are the teachers?",
            "B": "teachers any good here?",
            "C": "How good is the faculty at SVIT?",
            "D": "are teachers supportive or what?",
            "E": "faculty?",
            "F": "I wanted to ask, how is the teaching quality?",
        },
        "kn": {
            "A": "ಅಧ್ಯಾಪಕರು ಹೇಗಿದ್ದಾರೆ?",
            "B": "teachers hegiddare?",
            "C": "Datascience teachers hegiddare?",
            "D": "teachers chennagidara guru?",
            "E": "ಟೀಚರ್ಸ್?",
            "F": "campus nalli teaching eegide anta kelbeku?",
        },
        "hi": {
            "A": "शिक्षक कैसे हैं?",
            "B": "teachers kaise hain?",
            "C": "Data Science ke teachers kaisa padhate hain?",
            "D": "faculty theek hai kya?",
            "E": "टीचर?",
            "F": "bhai yahan teachers ki padhai kaisi hai?",
        },
        "ta": {
            "A": "ஆசிரியர்கள் எப்படி இருக்காங்க?",
            "B": "teachers eppadi irukanga?",
            "C": "CSE teachers nalla irukanga-la?",
            "D": "faculty nalla irukka?",
            "E": "ஆசிரியர்?",
            "F": "inga teaching quality eppadi irukku?",
        },
        "te": {
            "A": "ఉపాధ్యాయులు ఎలా ఉన్నారు?",
            "B": "teachers ela unnaru?",
            "C": "AIML teachers bagunnara?",
            "D": "faculty bagunda?",
            "E": "టీచర్?",
            "F": "ikkada teaching ela untundi?",
        },
        "ml": {
            "A": "അധ്യാപകർ എങ്ങനെയുണ്ട്?",
            "B": "teachers engane und?",
            "C": "CSE teachers nallathano?",
            "D": "faculty nallatha?",
            "E": "ടീച്ചർ?",
            "F": "ivide teaching quality engane aanu?",
        },
    },
    "campus_life": {
        "en": {
            "A": "How is campus life?",
            "B": "campus life good or not?",
            "C": "What do students usually do outside class?",
            "D": "is campus life fun?",
            "E": "campus?",
            "F": "what's student life like here?",
        },
        "kn": {
            "A": "ಕ್ಯಾಂಪಸ್ ಜೀವನ ಹೇಗಿದೆ?",
            "B": "campus life hegide?",
            "C": "class horage students enu madtare?",
            "D": "campus chennagide-na?",
            "E": "ಕ್ಯಾಂಪಸ್?",
            "F": "vidyarthigalu campus nalli hegiddare?",
        },
        "hi": {
            "A": "कैंपस लाइफ कैसी है?",
            "B": "campus life kaisi hai?",
            "C": "class ke bahar students kya karte hain?",
            "D": "campus maza aata hai kya?",
            "E": "कैंपस?",
            "F": "yahan student life kaisi rehti hai?",
        },
        "ta": {
            "A": "வளாக வாழ்க்கை எப்படி இருக்கு?",
            "B": "campus life eppadi irukku?",
            "C": "class ku appuram students enna panranga?",
            "D": "campus nalla irukka?",
            "E": "வளாகம்?",
            "F": "inga student life eppadi irukku?",
        },
        "te": {
            "A": "క్యాంపస్ లైఫ్ ఎలా ఉంది?",
            "B": "campus life ela undi?",
            "C": "class tarvata students em chestaru?",
            "D": "campus bagunda?",
            "E": "క్యాంపస్?",
            "F": "ikkada student life ela untundi?",
        },
        "ml": {
            "A": "ക്യാമ്പസ് ജീവിതം എങ്ങനെയാണ്?",
            "B": "campus life engane aanu?",
            "C": "class kazhinj students enthu cheyyunnu?",
            "D": "campus nallatha?",
            "E": "ക്യാമ്പസ്?",
            "F": "ivide student life engane aanu?",
        },
    },
    "facilities": {
        "en": {
            "A": "Is there a library?",
            "B": "library irtha?",
            "C": "Do students have access to labs?",
            "D": "wifi sariya ideya?",
            "E": "labs?",
            "F": "what sports facilities are available?",
        },
        "kn": {
            "A": "ಗ್ರಂಥಾಲಯ ಇದೆಯೇ?",
            "B": "library ideya?",
            "C": "students ge lab access ideya?",
            "D": "wifi sariya ideya campus nalli?",
            "E": "ಲ್ಯಾಬ್?",
            "F": "ಕ್ರೀಡೆ ಸೌಲಭ್ಯಗಳು ಏನಿವೆ?",
        },
        "hi": {
            "A": "पुस्तकालय है क्या?",
            "B": "library hai kya?",
            "C": "students ko lab milta hai?",
            "D": "wifi theek chaltaa hai?",
            "E": "लैब?",
            "F": "खेल की सुविधा क्या है?",
        },
        "ta": {
            "A": "நூலகம் இருக்கா?",
            "B": "library irukka?",
            "C": "students ku lab irukka?",
            "D": "wifi nalla irukka?",
            "E": "லேப்?",
            "F": "விளையாட்டு வசதி என்ன?",
        },
        "te": {
            "A": "గ్రంథాలయం ఉందా?",
            "B": "library unda?",
            "C": "students ki lab unda?",
            "D": "wifi bagunda?",
            "E": "ల్యాబ్?",
            "F": "క్రీడ సౌకర్యాలు ఏమి ఉన్నాయి?",
        },
        "ml": {
            "A": "ലൈബ്രറി ഉണ്ടോ?",
            "B": "library undo?",
            "C": "studentsinu lab undo?",
            "D": "wifi nallatha?",
            "E": "ലാബ്?",
            "F": "കായിക സൗകര്യം എന്തൊക്കെ ഉണ്ട്?",
        },
    },
    "student_experience": {
        "en": {
            "A": "Are there hackathons?",
            "B": "hackathons nange?",
            "C": "Are students encouraged to participate in clubs?",
            "D": "tech events jaasti ideya?",
            "E": "clubs?",
            "F": "do students get practical exposure?",
        },
        "kn": {
            "A": "ಹ್ಯಾಕಥಾನ್‌ಗಳಿವೆಯೇ?",
            "B": "hackathon ideya?",
            "C": "students clubs nalli participate madtara?",
            "D": "tech events jaasti ideya?",
            "E": "ಕ್ಲಬ್?",
            "F": "practical exposure sikkutta?",
        },
        "hi": {
            "A": "हैकथॉन होते हैं क्या?",
            "B": "hackathon hota hai kya?",
            "C": "students clubs me participate karte hain?",
            "D": "tech events hote hain na?",
            "E": "क्लब?",
            "F": "practical exposure milta hai kya?",
        },
        "ta": {
            "A": "ஹேக்கத்தான் இருக்கா?",
            "B": "hackathon irukka?",
            "C": "students clubs la participate panranga-la?",
            "D": "tech events jaasthi irukka?",
            "E": "சங்கம்?",
            "F": "practical exposure kidaikkuma?",
        },
        "te": {
            "A": "హ్యాకథాన్ ఉందా?",
            "B": "hackathon unda?",
            "C": "students clubs lo participate chestara?",
            "D": "tech events ekkuva unnaya?",
            "E": "క్లబ్?",
            "F": "practical exposure vastunda?",
        },
        "ml": {
            "A": "ഹാക്കത്തോൺ ഉണ്ടോ?",
            "B": "hackathon undo?",
            "C": "students clubsil participate cheyyunno?",
            "D": "tech events kooduthal undo?",
            "E": "ക്ലബ്?",
            "F": "practical exposure kittumo?",
        },
    },
    "internships": {
        "en": {
            "A": "Do students get internships?",
            "B": "internships kittuma?",
            "C": "Does the college help with internships?",
            "D": "industry intern milta hai kya?",
            "E": "internships?",
            "F": "are industry opportunities available?",
        },
        "kn": {
            "A": "ವಿದ್ಯಾರ್ಥಿಗಳಿಗೆ ಇಂಟರ್ನ್ ಸಿಗುತ್ತದೆಯೇ?",
            "B": "internship sikkutta?",
            "C": "college internship help madutta?",
            "D": "industry intern ideya?",
            "E": "ಇಂಟರ್ನ್?",
            "F": "industry opportunities sikkutta?",
        },
        "hi": {
            "A": "छात्रों को इंटर्नशिप मिलती है?",
            "B": "internship milti hai kya?",
            "C": "college internship me help karta hai?",
            "D": "industry intern mil jata hai?",
            "E": "इंटर्न?",
            "F": "industry opportunities hain kya?",
        },
        "ta": {
            "A": "மாணவர்களுக்கு இன்டர்ன்ஷிப் கிடைக்குமா?",
            "B": "internship kidaikkuma?",
            "C": "college internship help pannuma?",
            "D": "industry intern kidaikkuma?",
            "E": "இன்டர்ன்?",
            "F": "industry opportunities irukka?",
        },
        "te": {
            "A": "విద్యార్థులకు ఇంటర్న్ వస్తుందా?",
            "B": "internship vastunda?",
            "C": "college internship help chestunda?",
            "D": "industry intern untunda?",
            "E": "ఇంటర్న్?",
            "F": "industry opportunities unnaya?",
        },
        "ml": {
            "A": "വിദ്യാർത്ഥികൾക്ക് ഇന്റേൺഷിപ്പ് കിട്ടുമോ?",
            "B": "internship kittumo?",
            "C": "college internship help cheyyumo?",
            "D": "industry intern kittumo?",
            "E": "ഇന്റേൺ?",
            "F": "industry opportunities undo?",
        },
    },
    "placements": {
        "en": {
            "A": "How are placements?",
            "B": "placements kaisa hai?",
            "C": "Do students get placement support?",
            "D": "placement scene kaisa hai?",
            "E": "placements?",
            "F": "what is the placement environment like?",
        },
        "kn": {
            "A": "ಪ್ಲೇಸ್ಮೆಂಟ್ ಹೇಗಿದೆ?",
            "B": "placements hegide?",
            "C": "students ge placement support ideya?",
            "D": "placement scene hegide?",
            "E": "ಪ್ಲೇಸ್ಮೆಂಟ್?",
            "F": "placement environment hegide illi?",
        },
        "hi": {
            "A": "प्लेसमेंट कैसे हैं?",
            "B": "placements kaise hain?",
            "C": "students ko placement support milta hai?",
            "D": "placement scene kaisa hai?",
            "E": "प्लेसमेंट?",
            "F": "yahan placement environment kaisa hai?",
        },
        "ta": {
            "A": "பிளேஸ்மென்ட் எப்படி இருக்கு?",
            "B": "placements eppadi irukku?",
            "C": "students ku placement support irukka?",
            "D": "placement scene eppadi?",
            "E": "பிளேஸ்மென்ட்?",
            "F": "inga placement environment eppadi irukku?",
        },
        "te": {
            "A": "ప్లేస్‌మెంట్ ఎలా ఉంది?",
            "B": "placements ela unnai?",
            "C": "students ki placement support unda?",
            "D": "placement scene ela undi?",
            "E": "ప్లేస్‌మెంట్?",
            "F": "ikkada placement environment ela undi?",
        },
        "ml": {
            "A": "പ്ലേസ്‌മെന്റ് എങ്ങനെയാണ്?",
            "B": "placements engane aanu?",
            "C": "studentsinu placement support undo?",
            "D": "placement scene engane?",
            "E": "പ്ലേസ്‌മെന്റ്?",
            "F": "ivide placement environment engane aanu?",
        },
    },
    "academics": {
        "en": {
            "A": "How is the academic environment?",
            "B": "studies kaisa hai?",
            "C": "Is practical learning emphasized?",
            "D": "curriculum tight-a?",
            "E": "projects?",
            "F": "are students given projects?",
        },
        "kn": {
            "A": "ಪಠ್ಯಕ್ರಮ ಹೇಗಿದೆ?",
            "B": "curriculum hegide?",
            "C": "practical learning jaasti ideya?",
            "D": "padhai chennagide-na?",
            "E": "ಪ್ರಾಜೆಕ್ಟ್?",
            "F": "students ge projects kodtara?",
        },
        "hi": {
            "A": "पाठ्यक्रम कैसा है?",
            "B": "curriculum kaisa hai?",
            "C": "practical learning pe zor hai kya?",
            "D": "padhai tight hai kya?",
            "E": "प्रोजेक्ट?",
            "F": "students ko projects milte hain?",
        },
        "ta": {
            "A": "பாடத்திட்டம் எப்படி இருக்கு?",
            "B": "curriculum eppadi irukku?",
            "C": "practical learning jaasthi irukka?",
            "D": "padippu nalla irukka?",
            "E": "ப்ராஜெக்ட்?",
            "F": "students ku projects kudukkiranga-la?",
        },
        "te": {
            "A": "పాఠ్యాంశం ఎలా ఉంది?",
            "B": "curriculum ela undi?",
            "C": "practical learning ekkuva unda?",
            "D": "chaduvu bagunda?",
            "E": "ప్రాజెక్ట్?",
            "F": "students ki projects istara?",
        },
        "ml": {
            "A": "പാഠ്യപദ്ധതി എങ്ങനെയാണ്?",
            "B": "curriculum engane aanu?",
            "C": "practical learning kooduthal undo?",
            "D": "padippu nallatha?",
            "E": "പ്രോജക്റ്റ്?",
            "F": "studentsinu projects tharunno?",
        },
    },
    "college_environment": {
        "en": {
            "A": "What is the college environment like?",
            "B": "atmosphere kaisa hai?",
            "C": "Is the campus student friendly?",
            "D": "vibe kaisa hai college ka?",
            "E": "atmosphere?",
            "F": "how is the overall atmosphere?",
        },
        "kn": {
            "A": "ಕಾಲೇಜು ವಾತಾವರಣ ಹೇಗಿದೆ?",
            "B": "college vatavarana hegide?",
            "C": "campus student friendly-a?",
            "D": "vibe hegide illi?",
            "E": "ವಾತಾವರಣ?",
            "F": "overall atmosphere hegide?",
        },
        "hi": {
            "A": "कॉलेज का वातावरण कैसा है?",
            "B": "college vatavaran kaisa hai?",
            "C": "campus student friendly hai kya?",
            "D": "vibe kaisi hai yahan?",
            "E": "वातावरण?",
            "F": "overall atmosphere kaisa hai?",
        },
        "ta": {
            "A": "கல்லூரி சூழல் எப்படி இருக்கு?",
            "B": "college soozhal eppadi irukku?",
            "C": "campus student friendly-a?",
            "D": "vibe eppadi irukku?",
            "E": "சூழல்?",
            "F": "overall atmosphere eppadi?",
        },
        "te": {
            "A": "కాలేజీ వాతావరణం ఎలా ఉంది?",
            "B": "college vatavaranam ela undi?",
            "C": "campus student friendly-na?",
            "D": "vibe ela undi?",
            "E": "వాతావరణం?",
            "F": "overall atmosphere ela undi?",
        },
        "ml": {
            "A": "കോളേജ് അന്തരീക്ഷം എങ്ങനെയാണ്?",
            "B": "college atmosphere engane aanu?",
            "C": "campus student friendly ano?",
            "D": "vibe engane aanu?",
            "E": "അന്തരീക്ഷം?",
            "F": "overall atmosphere engane?",
        },
    },
    "general_institutional": {
        "en": {
            "A": "Tell me something about the college.",
            "B": "college bagge heli?",
            "C": "What is special about SVIT?",
            "D": "why do students choose this college?",
            "E": "SVIT?",
            "F": "what is the college known for?",
        },
        "kn": {
            "A": "ಈ ಕಾಲೇಜು ಬಗ್ಗೆ ಏನಾದರೂ ಹೇಳಿ.",
            "B": "college bagge heli?",
            "C": "SVIT special enu?",
            "D": "yaake students ivattu choose madtare?",
            "E": "ಸ್ವಿಟ್?",
            "F": "ee college ge enu hesaru?",
        },
        "hi": {
            "A": "कॉलेज के बारे में कुछ बताइए।",
            "B": "college ke baare mein batao?",
            "C": "SVIT special kya hai?",
            "D": "students yahan kyun aate hain?",
            "E": "SVIT?",
            "F": "yeh college kis liye jaana jaata hai?",
        },
        "ta": {
            "A": "இந்த கல்லூரி பத்தி ஏதாவது சொல்லுங்க.",
            "B": "college pathi sollunga?",
            "C": "SVIT special enna?",
            "D": "students inga yen choose panranga?",
            "E": "SVIT?",
            "F": "inda college ku enna per?",
        },
        "te": {
            "A": "ఈ కాలేజీ గురించి ఏదైనా చెప్పండి.",
            "B": "college gurinchi cheppu?",
            "C": "SVIT special enti?",
            "D": "students ikkada enduku vastaru?",
            "E": "SVIT?",
            "F": "ee college ki enti peru?",
        },
        "ml": {
            "A": "ഈ കോളേജിനെക്കുറിച്ച് എന്തെങ്കിലും പറയൂ.",
            "B": "college kurichu parayu?",
            "C": "SVIT vishesham enthu?",
            "D": "students ivide enthinu choose cheyyunnu?",
            "E": "SVIT?",
            "F": "ee college enthinu ariyappedunnu?",
        },
    },
}

FOLLOW_UPS: dict[str, tuple[str, str]] = {
    "en": ("How are the teachers?", "Are they supportive?"),
    "kn": ("ಅಧ್ಯಾಪಕರು ಹೇಗಿದ್ದಾರೆ?", "ಅವರು supportive ಆ?"),
    "hi": ("शिक्षक कैसे हैं?", "वे supportive हैं क्या?"),
    "ta": ("ஆசிரியர்கள் எப்படி?", "அவங்க supportive-a?"),
    "te": ("ఉపాధ్యాయులు ఎలా ఉన్నారు?", "vaallu supportive-na?"),
    "ml": ("അധ്യാപകർ എങ്ങനെയുണ്ട്?", "avar supportive ano?"),
}

CODE_SWITCH: dict[str, str] = {
    "en": "How good are the Data Science teachers?",
    "kn": "Datascience teachers hegiddare?",
    "hi": "Data Science ke teachers kaisa padhate hain?",
    "ta": "Data Science teachers eppadi irukanga?",
    "te": "Data Science teachers ela unnaru?",
    "ml": "Data Science teachers engane und?",
}

ANAPHORA: dict[str, str] = {
    "en": "What about their fees?",
    "kn": "ಅದರ ಶುಲ್ಕ ಎಷ್ಟು?",
    "hi": "उसकी फीस कितनी है?",
    "ta": "அதன் கட்டணம் என்ன?",
    "te": "దాని ఫీజు ఎంత?",
    "ml": "അതിന്റെ ഫീസ് എത്ര?",
}

NATIVE_SCRIPT: dict[str, str] = {
    "kn": "ಅಧ್ಯಾಪಕರು ಹೇಗಿದ್ದಾರೆ?",
    "hi": "शिक्षक कैसे हैं?",
    "ta": "ஆசிரியர்கள் எப்படி இருக்காங்க?",
    "te": "ఉపాధ్యాయులు ఎలా ఉన్నారు?",
    "ml": "അധ്യാപകർ എങ്ങനെയുണ്ട്?",
}


def decide(raw: str, lang: str = "en") -> ResponseMode:
    request = parse_semantic_request(raw_text=raw, language_code_key=lang)
    decision = resolve_response_decision(
        text=raw,
        semantic_request=request,
        ci_intent=None,
        has_department_entity=bool(request and request.entities),
    )
    return decision.mode


class TestNonCardMatrixAllLanguages(unittest.TestCase):
    def test_every_category_form_and_language_is_answer(self) -> None:
        failures: list[str] = []
        for category, per_lang in MATRIX.items():
            for lang in LANGS:
                for form in FORMS:
                    text = per_lang[lang][form]
                    mode = decide(text, lang)
                    if mode is not ResponseMode.ANSWER:
                        failures.append(f"{category}/{lang}/{form}: {text!r} -> {mode.value}")
        self.assertEqual(failures, [], "\n".join(failures[:40]))

    def test_native_script_is_institution_without_latin_lexicon(self) -> None:
        for lang, text in NATIVE_SCRIPT.items():
            with self.subTest(lang=lang):
                self.assertEqual(detect_domain_relevance(text), DomainRelevance.INSTITUTION)
                self.assertIs(decide(text, lang), ResponseMode.ANSWER)


class TestCodeSwitchAndFollowUp(unittest.TestCase):
    def test_code_switch_is_answer_not_card(self) -> None:
        for lang, text in CODE_SWITCH.items():
            with self.subTest(lang=lang, text=text):
                self.assertIs(decide(text, lang), ResponseMode.ANSWER)

    def test_faculty_follow_up_stays_answer(self) -> None:
        for lang, (first, follow) in FOLLOW_UPS.items():
            with self.subTest(lang=lang):
                self.assertIs(decide(first, lang), ResponseMode.ANSWER)
                self.assertIs(decide(follow, lang), ResponseMode.ANSWER)

    def test_anaphora_exists_in_all_six_languages(self) -> None:
        for lang, text in ANAPHORA.items():
            with self.subTest(lang=lang):
                self.assertTrue(has_anaphora(text), text)


class TestAnswerLanguageOwnership(unittest.TestCase):
    def test_native_script_overrides_english_session_for_answer(self) -> None:
        session = {"language_code_key": "en", "language_name": "English"}
        expected = {
            "kn": "Kannada",
            "hi": "Hindi",
            "ta": "Tamil",
            "te": "Telugu",
            "ml": "Malayalam",
        }
        for lang, text in NATIVE_SCRIPT.items():
            with self.subTest(lang=lang):
                key, name, tts = resolve_answer_language(text, session)
                self.assertEqual(key, lang)
                self.assertEqual(name, expected[lang])
                self.assertEqual(tts, TARGET_LANGUAGE_CODES[lang])

    def test_romanized_keeps_session_language(self) -> None:
        session = {
            "language_code_key": "kn",
            "language_name": "Kannada",
            "language_code": "kn-IN",
        }
        key, name, tts = resolve_answer_language("teachers hegiddare?", session)
        self.assertEqual(key, "kn")
        self.assertEqual(name, "Kannada")
        self.assertEqual(tts, "kn-IN")

    def test_tts_codes_exist_for_all_six(self) -> None:
        for lang in LANGS:
            code = tts_code_for_lang_key(lang)
            self.assertTrue(code.endswith("-IN"), code)


class TestRetrievalAndLength(unittest.TestCase):
    def test_retrieval_query_keeps_original_regional_text(self) -> None:
        original = "ಅಧ್ಯಾಪಕರು ಹೇಗಿದ್ದಾರೆ?"
        english = "How are the teachers?"
        q = build_retrieval_query(original, english)
        self.assertIn(original, q)
        self.assertIn(english, q)

    def test_english_only_query_is_not_duplicated(self) -> None:
        self.assertEqual(build_retrieval_query("How are the teachers?", "How are the teachers?"), "How are the teachers?")

    def test_answer_prompt_is_not_english_only(self) -> None:
        prompt = build_receptionist_answer_system_prompt(
            "Kannada",
            get_unavailable_reply("Kannada"),
            get_off_topic_reply("Kannada"),
        )
        self.assertIn("Kannada", prompt)
        self.assertIn("2 to 4", prompt)
        self.assertIn("Telugu", prompt)

    def test_indic_length_uses_sentence_budget(self) -> None:
        kn = (
            "ಶಿಕ್ಷಕರು ಅನುಭವಸ್ಥರು. ಕ್ಯಾಂಪಸ್ ವಾತಾವರಣ ಒಳ್ಳೆಯದು. "
            "ಲ್ಯಾಬ್‌ಗಳು ಲಭ್ಯವಿವೆ. ವಿದ್ಯಾರ್ಥಿ ಕ್ಲಬ್‌ಗಳು ಸಕ್ರಿಯವಾಗಿವೆ. "
            "ಇದು ಐದನೇ ವಾಕ್ಯ ಮತ್ತು ಇದು ಕತ್ತರಿಸಬೇಕು."
        )
        out = govern_answer_length(kn, "normal")
        self.assertLessEqual(measure_answer(out)["sentences"], 4)

    def test_locale_answer_keys_exist_for_all_six(self) -> None:
        root = Path(__file__).resolve().parents[1] / "data" / "locales"
        for lang in LANGS:
            locale = locale_file_id_for_lang_key(lang)
            data = json.loads((root / f"{locale}.json").read_text(encoding="utf-8"))
            self.assertIn("institution_overview", data)
            self.assertIn("placements_and_training", data)


if __name__ == "__main__":
    unittest.main()
