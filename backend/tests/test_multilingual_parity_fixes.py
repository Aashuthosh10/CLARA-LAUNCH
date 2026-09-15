"""Regression: multilingual fees / admission / department clarification parity."""

from __future__ import annotations

import unittest

from backend.services.content.content_unit_resolver import resolve_unit
from backend.services.content.department_explanation_units import (
    STAGE_LEAD,
    STAGE_LEARN,
    STAGE_WHAT_IS,
    explanation_body,
    stage_heading,
)
from backend.services.content.semantic_request_parser import parse_semantic_request
from backend.services.conversation.response_decision import (
    is_ambiguous_admissions_request,
    is_ambiguous_department_information_request,
    resolve_response_decision,
)
from backend.services.session_language import set_session_language
from backend.services.orchestration.conversation_orchestrator import ConversationOrchestrator


class MultilingualParityFixesTest(unittest.IsolatedAsyncioTestCase):
    def _decide(self, text: str, lang: str):
        req = parse_semantic_request(raw_text=text, language_code_key=lang)
        return resolve_response_decision(
            text=text,
            semantic_request=req,
            ci_intent=None,
            has_department_entity=bool(req and req.entities),
            faq_matched=False,
        ), req

    def test_fees_with_department_routes_card_all_langs(self) -> None:
        cases = [
            ("en", "What are the CSE fees?"),
            ("kn", "CSE ಶುಲ್ಕ ಎಷ್ಟು?"),
            ("en", "CSE fees eshtu?"),
            ("hi", "CSE फीस कितनी है?"),
            ("en", "Fees kitni hai?"),
            ("ta", "CSE கட்டணம் எவ்வளவு?"),
            ("en", "Fees evvalavu?"),
            ("te", "CSE ఫీజు ఎంత?"),
            ("en", "Fees entha?"),
            ("ml", "CSE ഫീസ് എത്രയാണ്?"),
            ("en", "Fees ethra aanu?"),
        ]
        for lang, text in cases:
            dec, req = self._decide(text, lang)
            if "CSE" in text or "cse" in text.lower() or "ಕಂಪ" in text:
                self.assertEqual(dec.mode.name, "CARD", msg=text)
                self.assertTrue(req and ("cse", "fees") in req.unit_items, msg=text)
            else:
                # Bare fees without department → clarify department
                self.assertEqual(dec.mode.name, "CLARIFY", msg=text)
                self.assertEqual(dec.clarification_target, "department", msg=text)

    def test_admission_ambiguous_clarify_six_langs_and_romanized(self) -> None:
        cases = [
            ("en", "Tell me about admission."),
            ("kn", "ಅಡ್ಮಿಷನ್ ಬಗ್ಗೆ ಹೇಳಿ"),
            ("en", "Admission bagge heli"),
            ("en", "pravesh bagge heli"),
            ("hi", "एडमिशन के बारे में बताओ"),
            ("en", "Admission ke bare mein batao"),
            ("ta", "சேர்க்கை பற்றி சொல்லுங்கள்"),
            ("en", "Admission pathi sollunga"),
            ("te", "అడ్మిషన్ గురించి చెప్పండి"),
            ("en", "Admission gurinchi cheppandi"),
            ("ml", "അഡ്മിഷനെക്കുറിച്ച് പറയൂ"),
            ("en", "Admission kurichu parayu"),
        ]
        for lang, text in cases:
            dec, req = self._decide(text, lang)
            self.assertEqual(dec.mode.name, "CLARIFY", msg=text)
            self.assertEqual(dec.clarification_target, "admissions_info", msg=text)
            self.assertTrue(is_ambiguous_admissions_request(text, req), msg=text)

    def test_generic_tell_verbs_do_not_count_as_admission_slot(self) -> None:
        text = "Admission ke bare mein batao"
        req = parse_semantic_request(raw_text=text, language_code_key="en")
        self.assertTrue(is_ambiguous_admissions_request(text, req))

    def test_kannada_department_tell_me_about_clarifies(self) -> None:
        en_text = "Tell me about CSE."
        kn_text = "CSE ಬಗ್ಗೆ ಹೇಳಿ"
        en_dec, en_req = self._decide(en_text, "en")
        kn_dec, kn_req = self._decide(kn_text, "kn")
        self.assertEqual(en_dec.mode.name, "CLARIFY")
        self.assertEqual(en_dec.clarification_target, "department_information")
        self.assertTrue(is_ambiguous_department_information_request(en_text, en_req))
        self.assertEqual(kn_dec.mode.name, "CLARIFY", msg="Kannada must match English clarify")
        self.assertEqual(kn_dec.clarification_target, "department_information")
        self.assertTrue(is_ambiguous_department_information_request(kn_text, kn_req))
        self.assertEqual(getattr(kn_req, "requested_scope", None), "full_department")

    def test_department_explanation_localized_bodies(self) -> None:
        for lang in ("en", "kn", "hi", "ta", "te", "ml"):
            for stage in (STAGE_WHAT_IS, STAGE_LEARN, STAGE_LEAD):
                body = explanation_body("cse", stage, lang)
                self.assertTrue(body.strip(), msg=f"{lang}.{stage}")
                heading = stage_heading(stage, lang)
                self.assertTrue(heading.strip(), msg=f"heading {lang}.{stage}")
            unit = resolve_unit(
                unit_id="department_explanation.cse.what_is",
                language="English" if lang == "en" else lang,
                language_code=lang,
            )
            self.assertIsNotNone(unit)
            assert unit is not None
            self.assertIn("what_is", unit.unit_id)
            if lang == "kn":
                self.assertIn("ಕಂಪ್ಯೂಟರ್", unit.body)
            if lang == "hi":
                self.assertIn("कंप्यूटर", unit.body)

    async def test_orchestrator_kannada_fees_and_admission_pending(self) -> None:
        orch = ConversationOrchestrator()
        s: dict = {}
        set_session_language(s, "kn", is_auto=False)
        fees = await orch.run("CSE ಶುಲ್ಕ ಎಷ್ಟು?", s, defer_narration=True)
        self.assertEqual(fees.resolution.response_mode, "CARD")
        self.assertEqual(fees.resolution.show_card, "department_fees")

        s2: dict = {}
        set_session_language(s2, "kn", is_auto=False)
        adm = await orch.run("ಅಡ್ಮಿಷನ್ ಬಗ್ಗೆ ಹೇಳಿ", s2, defer_narration=True)
        self.assertEqual(adm.resolution.response_mode, "CLARIFY")
        self.assertEqual(adm.resolution.clarification_target, "admissions_info")
        self.assertIsNotNone(s2.get("pending_clarification"))

        s3: dict = {}
        set_session_language(s3, "ml", is_auto=False)
        ml = await orch.run("അഡ്മിഷനെക്കുറിച്ച് പറയൂ", s3, defer_narration=True)
        self.assertEqual(ml.resolution.response_mode, "CLARIFY")
        self.assertEqual(ml.resolution.clarification_target, "admissions_info")


if __name__ == "__main__":
    unittest.main()
