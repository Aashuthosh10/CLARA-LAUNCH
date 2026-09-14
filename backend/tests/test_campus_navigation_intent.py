"""Campus navigation intent, destination resolution, and presentation authority."""

from __future__ import annotations

import asyncio
import unittest
from collections import Counter
from pathlib import Path

from backend.services.answer_generation import (
    INTENT_CAMPUS_NAVIGATION,
    INTENT_HOD_PROFILE,
    INTENT_NORMAL_QUERY,
    extract_features,
    resolve_intent_from_features,
    load_locale_data_for_lang_key,
)
from backend.services.campus_navigation_intent import (
    campus_navigation_spoken_prompt,
    resolve_campus_navigation,
    text_has_campus_navigation_cue,
)
from backend.services.campus_room_match import get_campus_rooms, match_campus_transcript
from backend.services.conversation.pipeline import run_conversation_intelligence
from backend.services.conversation.response_decision import ResponseMode
from backend.services.content.types import SURFACE_CAMPUS_NAVIGATION
from backend.services.content.unicode_text import casefold_keep_scripts
from backend.services.orchestration.conversation_orchestrator import ConversationOrchestrator


class CampusNavigationCueTests(unittest.TestCase):
    def test_english_cues(self) -> None:
        self.assertTrue(text_has_campus_navigation_cue("where is the library"))
        self.assertTrue(text_has_campus_navigation_cue("take me to principal office"))
        self.assertTrue(text_has_campus_navigation_cue("navigate to CSE lab"))
        self.assertTrue(text_has_campus_navigation_cue("how do I reach admissions"))
        self.assertTrue(text_has_campus_navigation_cue("which floor is the seminar hall"))
        self.assertTrue(text_has_campus_navigation_cue("guide me to the HOD room"))
        self.assertTrue(text_has_campus_navigation_cue("I need to go to the library"))

    def test_kannada_and_mixed(self) -> None:
        self.assertTrue(text_has_campus_navigation_cue("library ಎಲ್ಲಿ ಇದೆ"))
        self.assertTrue(text_has_campus_navigation_cue("principal office ಎಲ್ಲಿದೆ"))
        self.assertTrue(text_has_campus_navigation_cue("mechanical lab ಎಲ್ಲಿ"))

    def test_hindi_and_mixed(self) -> None:
        self.assertTrue(text_has_campus_navigation_cue("library kaha hai"))
        self.assertTrue(text_has_campus_navigation_cue("principal office कहाँ है"))
        self.assertTrue(text_has_campus_navigation_cue("mechanical lab कहाँ है"))

    def test_telugu_tamil_malayalam(self) -> None:
        self.assertTrue(text_has_campus_navigation_cue("library ఎక్కడ ఉంది"))
        self.assertTrue(text_has_campus_navigation_cue("principal office எங்கே"))
        self.assertTrue(text_has_campus_navigation_cue("CSE lab എവിടെയാണ്"))

    def test_non_navigation(self) -> None:
        self.assertFalse(text_has_campus_navigation_cue("who is CSE HOD"))
        self.assertFalse(text_has_campus_navigation_cue("tell me about data science"))
        self.assertFalse(text_has_campus_navigation_cue("what are the fees"))
        self.assertFalse(text_has_campus_navigation_cue("डेटा साइंस विभाग दिखाओ"))
        self.assertFalse(text_has_campus_navigation_cue("CSE HOD dikhao"))

    def test_bare_show_requires_a_strong_place_target(self) -> None:
        for text in (
            "principal office torisu",
            "library dikhao",
            "admission office chupinchu",
            "principal office kaattunga",
            "library kanikku",
        ):
            with self.subTest(text=text):
                self.assertTrue(text_has_campus_navigation_cue(text))

    def test_reach_and_show_variants_in_every_language(self) -> None:
        variants = (
            "guide me to the library",
            "library ಗೆ ಹೇಗೆ ಹೋಗಬೇಕು",
            "library कैसे जाना है",
            "library ఎలా వెళ్లాలి",
            "library எப்படி போவது",
            "library എങ്ങനെ പോകാം",
            "library hege hogbeku",
            "library kaise jana hai",
            "library ela vellali",
            "library eppadi povathu",
            "library engane pokam",
        )
        for text in variants:
            with self.subTest(text=text):
                self.assertTrue(text_has_campus_navigation_cue(text))


class CampusFullRegistryCoverageTests(unittest.TestCase):
    """Generated matrix: every canonical room, not a curated smoke subset."""

    LANGUAGE_CUES = {
        "en": "where is",
        "kn": "ಎಲ್ಲಿದೆ",
        "hi": "कहाँ है",
        "te": "ఎక్కడ ఉంది",
        "ta": "எங்கே",
        "ml": "എവിടെയാണ്",
    }
    FLOOR_LABELS = {
        "en": {"GF": "ground floor", "FF": "first floor", "SF": "second floor"},
        "kn": {"GF": "ನೆಲ ಮಹಡಿ", "FF": "ಮೊದಲ ಮಹಡಿ", "SF": "ಎರಡನೇ ಮಹಡಿ"},
        "hi": {"GF": "भूतल", "FF": "पहली मंजिल", "SF": "दूसरी मंजिल"},
        "te": {"GF": "గ్రౌండ్ ఫ్లోర్", "FF": "మొదటి అంతస్తు", "SF": "రెండవ అంతస్తు"},
        "ta": {"GF": "தரைத்தளம்", "FF": "முதல் தளம்", "SF": "இரண்டாம் தளம்"},
        "ml": {"GF": "താഴത്തെ നില", "FF": "ഒന്നാം നില", "SF": "രണ്ടാം നില"},
    }

    def test_registry_has_unique_canonical_ids(self) -> None:
        rooms = get_campus_rooms()
        self.assertEqual(len(rooms), 150)
        self.assertEqual(len({room["id"] for room in rooms}), len(rooms))

    def test_backend_and_browser_use_identical_deployment_mirror(self) -> None:
        root = Path(__file__).resolve().parents[2]
        backend_map = root / "backend" / "data" / "svit-campus-map.json"
        browser_map = root / "frontend" / "public" / "data" / "svit-campus-map.json"
        self.assertEqual(backend_map.read_bytes(), browser_map.read_bytes())

    def test_every_registered_name_is_reachable_in_all_six_language_frames(self) -> None:
        rooms = get_campus_rooms()
        name_counts = Counter(casefold_keep_scripts(str(room["name"])) for room in rooms)
        generic_parts = {
            "chamber",
            "room",
            "office",
            "hall",
            "lab",
            "labs",
            "center",
            "centre",
            "block",
            "dept",
            "department",
            "staff",
            "faculty",
            "washroom",
            "toilet",
            "restroom",
            "bathroom",
        }
        checked = 0
        for language, cue in self.LANGUAGE_CUES.items():
            for room in rooms:
                nav = resolve_campus_navigation(f'{room["name"]} {cue}')
                exact = nav.status == "resolved" and (nav.room or {}).get("id") == room["id"]
                duplicate_name = name_counts[casefold_keep_scripts(str(room["name"]))] > 1
                legitimate_ambiguity = duplicate_name and nav.status == "ambiguous" and nav.room is None
                name_toks = {
                    p
                    for p in casefold_keep_scripts(str(room["name"])).replace("-", " ").split()
                    if p
                }
                generic_only_name = bool(name_toks) and name_toks <= generic_parts
                generic_clarify = (
                    generic_only_name
                    and nav.status == "ambiguous"
                    and nav.room is None
                    and any(str(c.get("id")) == room["id"] for c in nav.candidates)
                )
                with self.subTest(language=language, destination=room["id"]):
                    self.assertTrue(exact or legitimate_ambiguity or generic_clarify)
                checked += 1
        self.assertEqual(checked, 150 * 6)

    def test_room_code_plus_localized_floor_selects_exact_pointer_target(self) -> None:
        rooms = get_campus_rooms()
        checked = 0
        for language, cue in self.LANGUAGE_CUES.items():
            for room in rooms:
                floor = self.FLOOR_LABELS[language][room["floor_id"]]
                nav = resolve_campus_navigation(f'{room["code"]} {floor} {cue}')
                with self.subTest(language=language, destination=room["id"]):
                    self.assertEqual(nav.status, "resolved")
                    self.assertEqual((nav.room or {}).get("id"), room["id"])
                    self.assertEqual((nav.room or {}).get("floor_id"), room["floor_id"])
                checked += 1
        self.assertEqual(checked, 150 * 6)

    def test_native_department_names_resolve_hod_rooms_in_every_locale(self) -> None:
        expected = {
            "cse": "B-101",
            "cse_ds": "B-201",
            "cse_aiml": "B-202",
            "ise": "B-102",
            "ece": "A-108",
            "civil": "B-212",
            "mechanical": "B-211",
            "basic_sciences": "A-HOD-MATH",
        }
        for language, cue in self.LANGUAGE_CUES.items():
            departments = load_locale_data_for_lang_key(language).get("departments") or {}
            for key, code in expected.items():
                label = (departments.get(key) or {}).get("name") or key
                nav = resolve_campus_navigation(f"{label} HOD {cue}")
                with self.subTest(language=language, department=key):
                    self.assertEqual(nav.status, "resolved")
                    self.assertEqual((nav.room or {}).get("code"), code)

    def test_native_destination_aliases_converge_on_canonical_rooms(self) -> None:
        cases = {
            "ಗ್ರಂಥಾಲಯ ಎಲ್ಲಿದೆ": "C-003",
            "पुस्तकालय कहाँ है": "C-003",
            "గ్రంథాలయం ఎక్కడ ఉంది": "C-003",
            "நூலகம் எங்கே": "C-003",
            "ലൈബ്രറി എവിടെയാണ്": "C-003",
            "ಪ್ರಾಂಶುಪಾಲರ ಕಚೇರಿ ಎಲ್ಲಿದೆ": "B-004",
            "प्राचार्य कार्यालय कहाँ है": "B-004",
            "ప్రిన్సిపాల్ కార్యాలయం ఎక్కడ ఉంది": "B-004",
            "முதல்வர் அலுவலகம் எங்கே": "B-004",
            "പ്രിൻസിപ്പൽ ഓഫീസ് എവിടെയാണ്": "B-004",
        }
        for text, code in cases.items():
            with self.subTest(text=text):
                nav = resolve_campus_navigation(text)
                self.assertEqual(nav.status, "resolved")
                self.assertEqual((nav.room or {}).get("code"), code)

    def test_every_room_code_resolves_in_english_and_kannada(self) -> None:
        """Every map room is reachable by code; multi-floor same-code stays ambiguous."""
        rooms = get_campus_rooms()
        code_floor_counts = Counter(
            (str(room["code"]).upper(), str(room["floor_id"]).upper()) for room in rooms
        )
        code_counts = Counter(str(room["code"]).upper() for room in rooms)
        checked = 0
        for room in rooms:
            code = str(room["code"]).upper()
            for query in (f"where is {code}", f"{code} ಎಲ್ಲಿದೆ"):
                nav = resolve_campus_navigation(query)
                with self.subTest(query=query, room_id=room["id"]):
                    if code_counts[code] == 1:
                        self.assertEqual(nav.status, "resolved")
                        self.assertEqual((nav.room or {}).get("code"), code)
                    else:
                        # Stair/lift codes repeat per floor — clarify rather than pick randomly.
                        self.assertIn(nav.status, {"resolved", "ambiguous"})
                        if nav.status == "resolved":
                            self.assertEqual((nav.room or {}).get("code"), code)
                        else:
                            self.assertTrue(
                                all(str(c.get("code") or "").upper() == code for c in nav.candidates)
                            )
                checked += 1
        self.assertEqual(checked, len(rooms) * 2)
        self.assertGreater(sum(1 for c, n in code_counts.items() if n > 1), 0)
        self.assertTrue(all(n == 1 for n in code_floor_counts.values()))

    def test_full_loanword_principal_cabin_kannada(self) -> None:
        nav = resolve_campus_navigation("ಪ್ರಿನ್ಸಿಪಲ್ ಕ್ಯಾಬಿನ್ ಎಲ್ಲಿದೆ")
        self.assertEqual(nav.status, "resolved")
        self.assertEqual((nav.room or {}).get("code"), "B-004")

    def test_sampled_rooms_multilingual_loanword_frames(self) -> None:
        samples = (
            ("B-004", "principal cabin", "ಪ್ರಿನ್ಸಿಪಲ್ ಕ್ಯಾಬಿನ್"),
            ("C-003", "library", "ಲೈಬ್ರರಿ"),
            ("C-007", "seminar hall", "ಸೆಮಿನಾರ್ ಹಾಲ್"),
            ("B-011", "admission office", "ಪ್ರವೇಶ ಆಫೀಸ್"),
            ("B-210", "mechanical lab", "ಮೆಕ್ಯಾನಿಕಲ್ ಲ್ಯಾಬ್"),
        )
        cues = {
            "en": "where is",
            "kn": "ಎಲ್ಲಿದೆ",
            "hi": "कहाँ है",
            "te": "ఎక్కడ ఉంది",
            "ta": "எங்கே",
            "ml": "എവിടെയാണ്",
        }
        for code, en_label, kn_loan in samples:
            for lang, cue in cues.items():
                text = f"{kn_loan} {cue}" if lang == "kn" else f"{en_label} {cue}"
                with self.subTest(code=code, lang=lang, text=text):
                    nav = resolve_campus_navigation(text)
                    self.assertEqual(nav.status, "resolved", msg=text)
                    self.assertEqual((nav.room or {}).get("code"), code)


class CampusDestinationResolutionTests(unittest.TestCase):
    def test_library_ground_floor(self) -> None:
        nav = resolve_campus_navigation("where is the library")
        self.assertEqual(nav.status, "resolved")
        assert nav.room is not None
        self.assertEqual(nav.room["code"], "C-003")
        self.assertEqual(nav.room["floor_id"], "GF")

    def test_mechanical_lab_second_floor(self) -> None:
        nav = resolve_campus_navigation("where is mechanical lab")
        self.assertEqual(nav.status, "resolved")
        assert nav.room is not None
        self.assertEqual(nav.room["code"], "B-210")
        self.assertEqual(nav.room["floor_id"], "SF")

    def test_principal_office_ground_floor(self) -> None:
        nav = resolve_campus_navigation("principal office कहाँ है")
        self.assertEqual(nav.status, "resolved")
        assert nav.room is not None
        self.assertEqual(nav.room["code"], "B-004")
        self.assertEqual(nav.room["floor_id"], "GF")

    def test_mixed_kannada_library(self) -> None:
        nav = resolve_campus_navigation("library ಎಲ್ಲಿ ಇದೆ")
        self.assertEqual(nav.status, "resolved")
        assert nav.room is not None
        self.assertEqual(nav.room["code"], "C-003")

    def test_cse_lab_ambiguous(self) -> None:
        nav = resolve_campus_navigation("where is CSE lab")
        self.assertEqual(nav.status, "ambiguous")
        self.assertGreaterEqual(len(nav.candidates), 2)

    def test_unknown_destination(self) -> None:
        nav = resolve_campus_navigation("where is the unicorn fountain")
        self.assertEqual(nav.status, "unknown")

    def test_college_address_not_navigation(self) -> None:
        for text in (
            "where is the college",
            "ಕಾಲೇಜು ಎಲ್ಲಿದೆ",
            "कॉलेज कहाँ स्थित है",
            "కాలేజీ ఎక్కడ ఉంది",
            "கல்லூரி எங்கே",
            "കോളേജ് എവിടെയാണ്",
        ):
            with self.subTest(text=text):
                nav = resolve_campus_navigation(text)
                self.assertEqual(nav.status, "not_navigation")

    def test_explicit_mechanical_overrides_cse_context(self) -> None:
        nav = resolve_campus_navigation(
            "where is mechanical lab",
            context_department_keys=("cse",),
        )
        self.assertEqual(nav.status, "resolved")
        assert nav.room is not None
        self.assertEqual(nav.room["code"], "B-210")

    def test_contextual_hod_room_followup(self) -> None:
        nav = resolve_campus_navigation(
            "where is the HOD room",
            context_department_keys=("cse_ds",),
        )
        self.assertEqual(nav.status, "resolved")
        assert nav.room is not None
        self.assertEqual(nav.room["code"], "B-201")

    def test_match_first_floor_destination(self) -> None:
        hit = match_campus_transcript("CSE HOD room")
        self.assertTrue(hit["matched"])
        self.assertEqual(hit["room"]["code"], "B-101")
        self.assertEqual(hit["room"]["floor_id"], "FF")

    def test_mixed_language_combinations(self) -> None:
        cases = {
            "principal cabin ellide": "B-004",
            "data science hod kaha hai": "B-201",
            "library ఎక్కడ": "C-003",
            "admission office எங்கே": "B-011",
            "seminar hall എവിടെയാണ്": "C-007",
        }
        for text, code in cases.items():
            with self.subTest(text=text):
                nav = resolve_campus_navigation(text)
                self.assertEqual(nav.status, "resolved")
                self.assertEqual((nav.room or {}).get("code"), code)

    def test_transliterated_and_bounded_stt_variants(self) -> None:
        cases = {
            "principle office where is": "B-004",
            "data-science h.o.d ellide": "B-201",
            "library ekkada undi": "C-003",
            "library enga irukku": "C-003",
            "library evideyaanu": "C-003",
        }
        for text, code in cases.items():
            with self.subTest(text=text):
                nav = resolve_campus_navigation(text)
                self.assertEqual(nav.status, "resolved")
                self.assertEqual((nav.room or {}).get("code"), code)

    def test_bare_generic_places_are_ambiguous(self) -> None:
        for text in (
            "lab ellide",
            "HOD room kaha hai",
            "where is faculty room",
            "where is washroom",
        ):
            with self.subTest(text=text):
                nav = resolve_campus_navigation(text)
                self.assertEqual(nav.status, "ambiguous")
                self.assertIsNone(nav.room)
                self.assertGreaterEqual(len(nav.candidates), 2)

    def test_regional_department_tokens_reach_map_scorer(self) -> None:
        """Dept rewrite lands in scorer English tokens (not only HOD shortcut)."""
        from backend.services.campus_room_match import normalize_campus_destination_text

        norm = normalize_campus_destination_text("ಮೆಕ್ಯಾನಿಕಲ್ ಲ್ಯಾಬ್ ಎಲ್ಲಿದೆ")
        self.assertIn("mechanical", norm)
        self.assertIn("lab", norm)
        nav = resolve_campus_navigation("ಮೆಕ್ಯಾನಿಕಲ್ ಲ್ಯಾಬ್ ಎಲ್ಲಿದೆ")
        self.assertEqual(nav.status, "resolved")
        self.assertEqual((nav.room or {}).get("code"), "B-210")

    def test_native_latest_department_overrides_stale_context(self) -> None:
        nav = resolve_campus_navigation(
            "ಮೆಕ್ಯಾನಿಕಲ್ HOD ಎಲ್ಲಿದೆ",
            context_department_keys=("cse_ds",),
        )
        self.assertEqual(nav.status, "resolved")
        self.assertEqual((nav.room or {}).get("code"), "B-211")


class CampusNavigationIntentLadderTests(unittest.TestCase):
    def test_executive_override_does_not_steal_navigation(self) -> None:
        from backend.services.answer_generation import maybe_override_intent_with_executive_profile

        for text in (
            "where is principal cabin",
            "principal cabin ಎಲ್ಲಿದೆ",
            "principal chamber kaha hai",
            "principal room ellide",
        ):
            with self.subTest(text=text):
                f = extract_features(text)
                intent = resolve_intent_from_features(f)
                self.assertEqual(intent, INTENT_CAMPUS_NAVIGATION)
                self.assertEqual(
                    maybe_override_intent_with_executive_profile(intent, text),
                    INTENT_CAMPUS_NAVIGATION,
                )

    def test_principal_room_synonym_resolves(self) -> None:
        for text in (
            "where is principal room",
            "principal room ಎಲ್ಲಿದೆ",
            "principal room kaha hai",
            "principal room ఎక్కడ ఉంది",
            "principal room எங்கே",
            "principal room എവിടെയാണ്",
        ):
            with self.subTest(text=text):
                nav = resolve_campus_navigation(text)
                self.assertEqual(nav.status, "resolved")
                self.assertEqual((nav.room or {}).get("code"), "B-004")

    def test_regional_native_and_romanized_matrix(self) -> None:
        cases = {
            # Kannada
            "principal cabin ಎಲ್ಲಿದೆ": "B-004",
            "principal cabin ellide": "B-004",
            "data science HOD ಎಲ್ಲಿದೆ": "B-201",
            "CSE lab hege hogbeku": None,  # ambiguous multi-lab OK
            # Hindi
            "principal chamber कहाँ है": "B-004",
            "principal chamber kaha hai": "B-004",
            "data science HOD कहाँ है": "B-201",
            # Telugu
            "principal room ఎక్కడ ఉంది": "B-004",
            "principal room ekkada undi": "B-004",
            "data science HOD ఎక్కడ": "B-201",
            # Tamil
            "principal cabin எங்கே": "B-004",
            "principal cabin enge": "B-004",
            "data science HOD எங்கே": "B-201",
            # Malayalam
            "principal room എവിടെയാണ്": "B-004",
            "principal room evide": "B-004",
            "data science HOD എവിടെയാണ്": "B-201",
        }
        for text, code in cases.items():
            with self.subTest(text=text):
                nav = resolve_campus_navigation(text)
                if code is None:
                    self.assertIn(nav.status, {"resolved", "ambiguous"})
                    continue
                self.assertEqual(nav.status, "resolved", msg=text)
                self.assertEqual((nav.room or {}).get("code"), code)

    def test_negative_profile_not_navigation(self) -> None:
        for text in (
            "Who is principal?",
            "Who is Data Science HOD?",
            "Tell me about CSE lab",
            "What is library?",
            "Explain Data Science department",
            "Principal name",
        ):
            with self.subTest(text=text):
                nav = resolve_campus_navigation(text)
                self.assertEqual(nav.status, "not_navigation")

    def test_resolve_intent_navigation(self) -> None:
        f = extract_features("where is the library")
        self.assertTrue(f.is_campus_navigation_query)
        self.assertEqual(resolve_intent_from_features(f), INTENT_CAMPUS_NAVIGATION)

    def test_hod_profile_not_navigation(self) -> None:
        f = extract_features("who is CSE HOD")
        self.assertFalse(f.is_campus_navigation_query)
        self.assertEqual(resolve_intent_from_features(f), INTENT_HOD_PROFILE)

    def test_normal_question_not_navigation(self) -> None:
        f = extract_features("what is the weather today")
        self.assertFalse(f.is_campus_navigation_query)
        self.assertEqual(resolve_intent_from_features(f), INTENT_NORMAL_QUERY)


class CampusNavigationDecisionTests(unittest.IsolatedAsyncioTestCase):
    async def test_library_card_decision(self) -> None:
        ci = await run_conversation_intelligence(
            "where is the library",
            language_name="Kannada",
            language_code_key="kn",
        )
        self.assertEqual(ci.response_decision.mode, ResponseMode.CARD)
        self.assertEqual(ci.response_decision.evidence, "campus_navigation")
        dest = (ci.response_decision.diagnostics or {}).get("campus_destination") or {}
        self.assertEqual(dest.get("code"), "C-003")

    async def test_ambiguous_opens_campus_navigation(self) -> None:
        ci = await run_conversation_intelligence(
            "where is CSE lab",
            language_name="English",
            language_code_key="en",
        )
        self.assertEqual(ci.response_decision.mode, ResponseMode.CARD)
        self.assertEqual(ci.response_decision.evidence, "campus_navigation_ambiguous")
        self.assertEqual(
            (ci.response_decision.diagnostics or {}).get("campus_nav_status"),
            "ambiguous",
        )

    async def test_unknown_opens_campus_navigation_not_missing_source(self) -> None:
        ci = await run_conversation_intelligence(
            "where is the unicorn fountain",
            language_name="Hindi",
            language_code_key="hi",
        )
        self.assertEqual(ci.response_decision.mode, ResponseMode.CARD)
        self.assertEqual(ci.response_decision.evidence, "campus_destination_unknown")
        self.assertEqual(
            (ci.response_decision.diagnostics or {}).get("campus_nav_status"),
            "unknown",
        )

        orch = await ConversationOrchestrator().run(
            "ಝರ್ಗ್ಲ್ ಪ್ಲೇಸ್ ಎಲ್ಲಿದೆ",
            {"language_name": "Kannada", "language_code_key": "kn", "messages": []},
            turn_id="nav-unknown",
        )
        self.assertEqual(orch.resolution.show_card, SURFACE_CAMPUS_NAVIGATION)
        self.assertEqual(orch.resolution.campus_nav_status, "unknown")
        self.assertNotEqual(orch.resolution.show_card, "missing_source")

    async def test_card_then_navigation_then_card(self) -> None:
        orch = ConversationOrchestrator()
        session = {"language_name": "Kannada", "language_code_key": "kn", "messages": []}

        hod = await orch.run("who is Data Science HOD", session, turn_id="t1")
        self.assertEqual(hod.resolution.show_card, "hod")

        nav = await orch.run("where is mechanical lab", session, turn_id="t2")
        self.assertEqual(nav.resolution.show_card, SURFACE_CAMPUS_NAVIGATION)
        self.assertEqual((nav.resolution.campus_destination or {}).get("code"), "B-210")
        self.assertEqual((nav.resolution.campus_destination or {}).get("floor_id"), "SF")

        lib = await orch.run("library ಎಲ್ಲಿ ಇದೆ", session, turn_id="t3")
        self.assertEqual(lib.resolution.show_card, SURFACE_CAMPUS_NAVIGATION)
        self.assertEqual((lib.resolution.campus_destination or {}).get("code"), "C-003")
        self.assertEqual((lib.resolution.campus_destination or {}).get("floor_id"), "GF")

        cse = await orch.run("what is CSE HOD name", session, turn_id="t4")
        self.assertEqual(cse.resolution.show_card, "hod")
        self.assertIsNone(cse.resolution.campus_destination)

    async def test_session_language_spoken_prompt_kannada(self) -> None:
        room = {"name": "Library & Information Center", "floor_name": "Ground Floor", "code": "C-003"}
        spoken = campus_navigation_spoken_prompt("Kannada", room, status="resolved")
        self.assertIn("Library", spoken)
        self.assertTrue(any("\u0c80" <= ch <= "\u0cff" for ch in spoken))

    async def test_selected_session_language_controls_navigation_narration_for_mixed_input(self) -> None:
        cases = (
            ("English", "en", "library ellide", (0x0041, 0x007A)),
            ("Kannada", "kn", "principal office kaha hai", (0x0C80, 0x0CFF)),
            ("Hindi", "hi", "library ellide", (0x0900, 0x097F)),
            ("Telugu", "te", "principal office kaha hai", (0x0C00, 0x0C7F)),
            ("Tamil", "ta", "library ekkada undi", (0x0B80, 0x0BFF)),
            ("Malayalam", "ml", "principal cabin ellide", (0x0D00, 0x0D7F)),
        )
        for language, language_key, utterance, (lo, hi) in cases:
            with self.subTest(language=language, utterance=utterance):
                result = await ConversationOrchestrator().run(
                    utterance,
                    {"language_name": language, "language_code_key": language_key, "messages": []},
                    turn_id=f"nav-{language_key}",
                )
                self.assertEqual(result.resolution.show_card, SURFACE_CAMPUS_NAVIGATION)
                self.assertTrue(result.narration_segments)
                text = " ".join(segment.display_text for segment in (result.narration_segments or []))
                if language == "English":
                    self.assertIn("Showing directions", text)
                else:
                    self.assertTrue(any(lo <= ord(char) <= hi for char in text), text)

    async def test_every_language_localizes_resolved_ambiguous_and_unknown_prompts(self) -> None:
        room = {"name": "CSE HOD Room", "floor_name": "First Floor", "floor_id": "FF", "code": "B-101"}
        scripts = {
            "Kannada": (0x0C80, 0x0CFF),
            "Hindi": (0x0900, 0x097F),
            "Telugu": (0x0C00, 0x0C7F),
            "Tamil": (0x0B80, 0x0BFF),
            "Malayalam": (0x0D00, 0x0D7F),
        }
        for language in ("English", *scripts):
            for status in ("resolved", "ambiguous", "unknown"):
                with self.subTest(language=language, status=status):
                    spoken = campus_navigation_spoken_prompt(
                        language,
                        room if status == "resolved" else None,
                        status=status,
                        candidates=(room,),
                    )
                    self.assertTrue(spoken.strip())
                    if language != "English":
                        lo, hi = scripts[language]
                        self.assertTrue(any(lo <= ord(char) <= hi for char in spoken), spoken)


if __name__ == "__main__":
    unittest.main()
