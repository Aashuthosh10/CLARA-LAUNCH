"""Fest ContentUnits — official flagship deck, named events, locale content."""

from __future__ import annotations

import json
import unittest
from pathlib import Path

from backend.services.content.campus_units import (
    EVENT_UNIT_IDS,
    FEST_DECK_UNIT_IDS,
    fest_deck_unit_ids,
)
from backend.services.content.content_unit_registry import all_unit_descriptors, get_unit_descriptor
from backend.services.content.content_unit_resolver import resolve_unit
from backend.services.conversation.response_decision import ResponseMode
from backend.tests.test_m59_universal_units import decide, plan_units

LANGS = ("en", "kn", "hi", "ta", "te", "ml")
FEST_DECK = fest_deck_unit_ids()
LOCALES_DIR = Path(__file__).resolve().parents[1] / "data" / "locales"
OLD_SAMPLE_EVENTS = {
    "events.sirikannada_utsava",
    "events.freshers_fest",
    "events.sports_meet",
    "events.alumni_meet",
}


class TestFestRegistry(unittest.TestCase):
    def test_five_official_events_registered(self) -> None:
        ids = {d.unit_id for d in all_unit_descriptors()}
        self.assertEqual(
            set(EVENT_UNIT_IDS),
            {
                "events.sanchalana",
                "events.techvidya",
                "events.sangama",
                "events.vignotsava",
                "events.project_expo",
            },
        )
        self.assertEqual(FEST_DECK, EVENT_UNIT_IDS)
        for uid in EVENT_UNIT_IDS:
            self.assertIn(uid, ids)
            self.assertIsNotNone(get_unit_descriptor(uid))
        for uid in OLD_SAMPLE_EVENTS:
            self.assertNotIn(uid, ids)


class TestFestSelector(unittest.TestCase):
    def test_generic_fests_expands_to_deck(self) -> None:
        self.assertEqual(plan_units("Tell me about the college fests"), FEST_DECK)
        self.assertEqual(plan_units("What are the campus events?"), FEST_DECK)
        self.assertEqual(plan_units("Tell me about fests"), FEST_DECK)
        self.assertIs(decide("Tell me about the college fests"), ResponseMode.CARD)

    def test_regional_generic_fests_expand_to_deck(self) -> None:
        cases = (
            ("kn", "ಉತ್ಸವಗಳು"),
            ("kn", "ಕಾಲೇಜು ಉತ್ಸವ"),
            ("kn", "ಕಾಲೇಜು ಫೆಸ್ಟ್"),
            ("kn", "ಫೆಸ್ಟ್ ಬಗ್ಗೆ ಹೇಳಿ"),
            ("hi", "उत्सव"),
            ("hi", "कॉलेज फेस्ट"),
            ("hi", "कॉलेज के उत्सव"),
            ("ta", "விழாக்கள்"),
            ("ta", "கல்லூரி விழா"),
            ("te", "కాలేజీ ఉత్సవాలు"),
            ("te", "ఉత్సవాలు"),
            ("ml", "ഉത്സവങ്ങൾ"),
            ("ml", "കോളേജ് ഉത്സവം"),
            ("kn", "college fest bagge heli"),
            ("hi", "fests ke baare mein batao"),
            ("ta", "fest patri sollu"),
            ("te", "fests gurinchi cheppu"),
            ("ml", "fest kurichu parayamo"),
        )
        for lang, raw in cases:
            with self.subTest(lang=lang, raw=raw):
                self.assertEqual(plan_units(raw, lang), FEST_DECK)
                self.assertIs(decide(raw, lang), ResponseMode.CARD)

    def test_named_fest_is_single_card(self) -> None:
        cases = (
            ("Tell me about Sanchalana", ("events.sanchalana",)),
            ("What is Techvidya?", ("events.techvidya",)),
            ("Tell me about Sangama", ("events.sangama",)),
            ("Tell me about Vignotsava", ("events.vignotsava",)),
            ("Tell me about Project Expo", ("events.project_expo",)),
            ("Onam festival on campus", ("events.vignotsava",)),
        )
        for raw, expected in cases:
            with self.subTest(raw=raw):
                self.assertEqual(plan_units(raw), expected)

    def test_regional_named_fests(self) -> None:
        cases = (
            ("kn", "ಸಂಚಲನ", ("events.sanchalana",)),
            ("hi", "संचलना", ("events.sanchalana",)),
            ("ta", "சஞ்சலனா", ("events.sanchalana",)),
            ("te", "సంచలన", ("events.sanchalana",)),
            ("ml", "സഞ്ചലന", ("events.sanchalana",)),
            ("kn", "ಟೆಕ್‌ವಿದ್ಯಾ", ("events.techvidya",)),
            ("hi", "टेक विद्या", ("events.techvidya",)),
            ("kn", "ಸಂಗಮ", ("events.sangama",)),
            ("kn", "ವಿಘ್ನೋತ್ಸವ", ("events.vignotsava",)),
            ("hi", "प्रोजेक्ट एक्सपो", ("events.project_expo",)),
            ("kn", "Sanchalana bagge heli", ("events.sanchalana",)),
            ("te", "TechVidya gurinchi cheppu", ("events.techvidya",)),
        )
        for lang, raw, expected in cases:
            with self.subTest(lang=lang, raw=raw):
                self.assertEqual(plan_units(raw, lang), expected)
                self.assertIs(decide(raw, lang), ResponseMode.CARD)

    def test_named_plus_generic_keeps_named_only(self) -> None:
        self.assertEqual(
            plan_units("Tell me about Sanchalana and the college fests"),
            ("events.sanchalana",),
        )

    def test_two_named_fests(self) -> None:
        self.assertEqual(
            plan_units("Tell me about Sanchalana and TechVidya"),
            ("events.sanchalana", "events.techvidya"),
        )


class TestFestLocaleContent(unittest.TestCase):
    def test_official_rows_in_all_langs(self) -> None:
        for lang in LANGS:
            path = LOCALES_DIR / f"{lang}.json"
            data = json.loads(path.read_text(encoding="utf-8"))
            campus = data["campus_units"]
            for uid in OLD_SAMPLE_EVENTS:
                self.assertNotIn(uid, campus)
            for uid in FEST_DECK_UNIT_IDS:
                with self.subTest(lang=lang, uid=uid):
                    row = campus[uid]
                    self.assertNotEqual(row.get("content_status"), "SAMPLE_REPLACE_WITH_OFFICIAL")
                    self.assertTrue(str(row.get("title") or "").strip())
                    points = row.get("points") or []
                    self.assertEqual(len(points), 3)
                    self.assertTrue(str(row.get("tts_summary") or "").strip())
                    # Brief cards: 3 points; body may be empty (spoken via tts_summary).
                    brief = str(row.get("body") or "").strip() or "\n".join(str(p) for p in points)
                    self.assertTrue(brief)

    def test_resolve_unit_official(self) -> None:
        for uid in FEST_DECK_UNIT_IDS:
            unit = resolve_unit(unit_id=uid, language="en", language_code="en")
            self.assertIsNotNone(unit)
            assert unit is not None
            meta = unit.metadata or {}
            self.assertNotEqual(meta.get("content_status"), "SAMPLE_REPLACE_WITH_OFFICIAL")
            self.assertTrue(str(meta.get("tts_summary") or unit.body or "").strip())


if __name__ == "__main__":
    unittest.main()
