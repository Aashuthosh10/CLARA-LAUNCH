"""M5.3 six-language semantic parity + native/romanized/code-switch/colloquial."""

from __future__ import annotations

import unittest

from backend.services.content.semantic_request_parser import parse_semantic_request
from backend.services.content.unit_selector import select_content_units

FULL_CSE = (
    "cse.overview",
    "cse.hod",
    "cse.achievements",
    "cse.placements",
    "cse.fees",
)


def _ir(raw: str, lang: str):
    req = parse_semantic_request(raw_text=raw, language_code_key=lang)
    units = None
    if req is not None:
        plan = select_content_units(req)
        units = None if plan is None else tuple(plan.units)
    return req, units


class TestM53Parity(unittest.TestCase):
    def test_hod_cse_data_science_six_languages(self) -> None:
        cases = (
            ("en", "Who is the HOD of CSE Data Science?"),
            ("kn", "CSE Data Science HOD yaaru?"),
            ("hi", "CSE Data Science ka HOD kaun hai?"),
            ("ta", "CSE Data Science HOD yaar?"),
            ("te", "CSE Data Science HOD evaru?"),
            ("ml", "CSE Data Science HOD aaranu?"),
        )
        for lang, raw in cases:
            req, units = _ir(raw, lang)
            self.assertIsNotNone(req, msg=raw)
            assert req is not None
            self.assertEqual(req.topic, "hod", msg=raw)
            self.assertEqual(req.entities, ("cse_ds",), msg=raw)
            self.assertEqual(req.requested_scope, "single", msg=raw)
            self.assertEqual(units, ("cse_ds.hod",), msg=raw)

    def test_multi_hod_aiml_ds_six_languages(self) -> None:
        cases = (
            ("en", "Who is the HOD of AIML and Data Science?"),
            ("kn", "AIML mattu Data Science HOD yaaru?"),
            ("hi", "AIML aur Data Science ke HOD kaun hain?"),
            ("ta", "AIML and Data Science HOD yaar?"),
            ("te", "AIML and Data Science HOD evaru?"),
            ("ml", "AIML and Data Science HOD aaranu?"),
        )
        for lang, raw in cases:
            req, units = _ir(raw, lang)
            self.assertIsNotNone(req, msg=raw)
            assert req is not None
            self.assertEqual(req.topic, "hod", msg=raw)
            self.assertEqual(req.entities, ("cse_aiml", "cse_ds"), msg=raw)
            self.assertEqual(units, ("cse_aiml.hod", "cse_ds.hod"), msg=raw)

    def test_native_script_fees(self) -> None:
        cases = (
            ("kn", "CSE ಶುಲ್ಕ"),
            ("hi", "CSE फीस"),
            ("ta", "CSE கட்டணம்"),
            ("te", "CSE ఫీజు"),
            ("ml", "CSE ഫീസ്"),
        )
        for lang, raw in cases:
            req, units = _ir(raw, lang)
            self.assertIsNotNone(req, msg=raw)
            assert req is not None
            self.assertEqual(req.topic, "fees", msg=raw)
            self.assertEqual(req.entities, ("cse",), msg=raw)
            self.assertEqual(units, ("cse.fees",), msg=raw)

    def test_romanized_fees(self) -> None:
        cases = (
            ("en", "CSE fees yestu?"),
            ("kn", "CSE fees yestu?"),
            ("hi", "CSE fees kitna"),
            ("ta", "CSE fees evlo"),
            ("te", "CSE fees entha"),
            ("ml", "CSE fees ethra"),
        )
        for lang, raw in cases:
            req, units = _ir(raw, lang)
            self.assertIsNotNone(req, msg=raw)
            assert req is not None
            self.assertEqual(req.topic, "fees", msg=raw)
            self.assertEqual(units, ("cse.fees",), msg=raw)

    def test_code_switch_overview(self) -> None:
        cases = (
            ("en", "Tell me about CSE"),
            ("kn", "CSE bagge heli"),
            ("hi", "CSE ke baare mein batao"),
            ("ta", "CSE pattri tilisi"),
            ("te", "CSE gurunchi kurichu cheppu"),
            ("ml", "CSE parayoo"),
        )
        for lang, raw in cases:
            req, units = _ir(raw, lang)
            self.assertIsNotNone(req, msg=raw)
            assert req is not None
            self.assertEqual(req.topic, "overview", msg=raw)
            self.assertEqual(req.requested_scope, "full_department", msg=raw)
            self.assertEqual(req.entities, ("cse",), msg=raw)
            self.assertEqual(units, FULL_CSE, msg=raw)

    def test_colloquial_hod(self) -> None:
        for lang, raw in (
            ("kn", "CSE HOD yaaru?"),
            ("hi", "CSE ka HOD kaun hai"),
            ("ta", "CSE HOD yaar"),
        ):
            req, units = _ir(raw, lang)
            self.assertIsNotNone(req, msg=raw)
            assert req is not None
            self.assertEqual(req.topic, "hod", msg=raw)
            self.assertEqual(units, ("cse.hod",), msg=raw)

    def test_three_hod_aiml_ds_cse_six_languages(self) -> None:
        cases = (
            ("en", "Who are the HODs of AIML, Data Science and CSE?"),
            ("kn", "AIML, Data Science mattu CSE HOD yaaru?"),
            ("hi", "AIML, Data Science aur CSE ke HOD kaun hain?"),
            ("ta", "AIML, Data Science and CSE HOD yaar?"),
            ("te", "AIML, Data Science and CSE HOD evaru?"),
            ("ml", "AIML, Data Science and CSE HOD aaranu?"),
        )
        for lang, raw in cases:
            req, units = _ir(raw, lang)
            self.assertIsNotNone(req, msg=raw)
            assert req is not None
            self.assertEqual(req.topic, "hod", msg=raw)
            self.assertEqual(req.entities, ("cse_aiml", "cse_ds", "cse"), msg=raw)
            self.assertEqual(units, ("cse_aiml.hod", "cse_ds.hod", "cse.hod"), msg=raw)

    def test_ece_fees(self) -> None:
        req, units = _ir("ECE fees", "en")
        self.assertIsNotNone(req)
        assert req is not None
        self.assertEqual(req.entities, ("ece",))
        self.assertEqual(units, ("ece.fees",))
