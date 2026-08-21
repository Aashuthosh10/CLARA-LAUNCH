"""M5.10 Phase 2B: localized role_holders as source data for cards and narration."""

from __future__ import annotations

import json
import unittest
from pathlib import Path

from backend.services.answer_generation import load_locale_data_for_lang_key
from backend.services.content.adapters import adapt_trustees
from backend.services.content.content_unit_resolver import resolve_unit
from backend.services.content.types import ResolveRequest
from backend.services.content.unit_narration import narrate_unit

LOCALES = Path(__file__).resolve().parents[1] / "data" / "locales"
LANGS = ("en", "kn", "hi", "ta", "te", "ml")


class TestPhase2BRoleHolders(unittest.TestCase):
    def test_all_locales_have_seven_trustees(self) -> None:
        for lang in LANGS:
            data = json.loads((LOCALES / f"{lang}.json").read_text(encoding="utf-8"))
            trustees = data["role_holders"]["trustees"]
            self.assertEqual(len(trustees), 7, lang)
            self.assertEqual([row["id"] for row in trustees], [
                "holla",
                "padma_reddy",
                "srinivas_raju",
                "shanmukha",
                "manohar",
                "jayasimha",
                "narayan",
            ])

    def test_kannada_trustee_copy_is_not_english_ui_bio(self) -> None:
        kn = load_locale_data_for_lang_key("kn")
        holla = kn["role_holders"]["trustees"][0]
        self.assertIn("ಹೊಳ್ಳ", holla["display_name"])
        self.assertEqual(holla["tts_summary"], holla["description"])
        self.assertNotIn("Rajyothsava", holla["description"])
        self.assertEqual(holla["name"], "Prof. M. R. Holla")

    def test_regional_hod_names_stay_official_and_bios_are_not_copied(self) -> None:
        kn = load_locale_data_for_lang_key("kn")
        cse = kn["role_holders"]["hod_by_department"]["cse"]
        self.assertEqual(cse["hod_name"], "Dr. Shashikumar D R")
        self.assertNotIn("hod_bio", cse)
        self.assertEqual(cse["hod_bio_source"], "departments.cse.hod_voice")
        self.assertIn("ಕಂಪ್ಯೂಟರ್", cse["department_name"])

    def test_missing_hods_are_reported_not_invented(self) -> None:
        kn = load_locale_data_for_lang_key("kn")
        gaps = kn["role_holders"]["localization_gaps"]
        self.assertIn("hod_by_department.cse_bs.no_official_record", gaps)
        self.assertIn("hod_by_department.cse_cysec.no_official_record", gaps)
        self.assertNotIn("cse_bs", kn["role_holders"]["hod_by_department"])

    def test_adapter_and_narration_use_same_locale_trustee_text(self) -> None:
        content = adapt_trustees(
            ResolveRequest(surface="trustees", language="Kannada", language_code="kn")
        )
        self.assertIsNotNone(content)
        assert content is not None
        kn = load_locale_data_for_lang_key("kn")
        first = kn["role_holders"]["trustees"][0]
        self.assertEqual(content.sections[0].title, first["display_name"])
        self.assertIn(first["description"], content.sections[0].body)
        self.assertEqual(content.canonical_source, "backend/data/locales/*.json#role_holders.trustees")

        unit = resolve_unit(unit_id="leadership.trustees", language="Kannada", language_code="kn")
        self.assertIsNotNone(unit)
        assert unit is not None
        spoken = narrate_unit(unit, "kn")
        self.assertEqual(spoken, first["tts_summary"])

    def test_english_card_keeps_existing_trustee_roster(self) -> None:
        en = load_locale_data_for_lang_key("en")
        self.assertIn("Rajyothsava", en["role_holders"]["trustees"][0]["description"])
        self.assertEqual(en["role_holders"]["trustees"][-1]["id"], "narayan")


if __name__ == "__main__":
    unittest.main()
