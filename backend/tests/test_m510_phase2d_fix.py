"""M5.10 Phase 2D-FIX — N-unit plan identity for required switching cases.

Parser/selector already owns these unit sequences. This suite locks the
identity contract the frontend presentation engine must render in order.
"""

from __future__ import annotations

import unittest
import json
from pathlib import Path
import re

from backend.tests.test_m59_universal_units import decide, plan_units
from backend.services.conversation.response_decision import ResponseMode
from backend.services.narration_plan import _FEES_AMOUNT_BY_KEY


REQUIRED = [
    ("CSE HOD and CSE fees", "en", ("cse.hod", "cse.fees")),
    (
        "girls hostel rooms and canteen hygiene and TechVidya",
        "en",
        ("hostel.girls.rooms", "canteen.hygiene", "events.techvidya"),
    ),
    ("principal and trustees", "en", ("leadership.principal", "leadership.trustees")),
    ("CSE HOD ಮತ್ತು ಶುಲ್ಕ", "kn", ("cse.hod", "cse.fees")),
    (
        "ಹುಡುಗಿಯರ ಹಾಸ್ಟೆಲ್ ಕೊಠಡಿಗಳು ಮತ್ತು ಕ್ಯಾಂಟೀನ್ ಸ್ವಚ್ಛತೆ ಮತ್ತು ಟೆಕ್‌ವಿದ್ಯಾ",
        "kn",
        ("hostel.girls.rooms", "canteen.hygiene", "events.techvidya"),
    ),
    (
        "ಉಪ ಪ್ರಾಂಶುಪಾಲರು ಮತ್ತು ಟ್ರಸ್ಟಿಗಳು",
        "kn",
        ("leadership.vice_principal", "leadership.trustees"),
    ),
    (
        "CSE Data Science HOD ಯಾರು ಮತ್ತು fees ಎಷ್ಟು?",
        "kn",
        ("cse_ds.hod", "cse_ds.fees"),
    ),
    (
        "girls hostel rooms hegide and canteen hygiene hegide?",
        "en",
        ("hostel.girls.rooms", "canteen.hygiene"),
    ),
    (
        "principal yaaru and trustees yaaru?",
        "en",
        ("leadership.principal", "leadership.trustees"),
    ),
]


class TestM510Phase2DFixSwitchingIdentity(unittest.TestCase):
    def test_required_switching_unit_sequences(self) -> None:
        for raw, lang, expected in REQUIRED:
            with self.subTest(raw=raw, lang=lang):
                self.assertEqual(plan_units(raw, lang), expected)
                self.assertIs(decide(raw, lang), ResponseMode.CARD)
                self.assertEqual(plan_units(raw, "en"), expected)
                self.assertEqual(plan_units(raw, "kn"), expected)

    def test_data_science_locale_fee_matches_canonical_fee(self) -> None:
        expected = str(_FEES_AMOUNT_BY_KEY["cse_ds"])
        locale_dir = Path(__file__).resolve().parents[1] / "data" / "locales"
        for code in ("en", "kn", "hi", "ta", "te", "ml"):
            with self.subTest(language=code):
                data = json.loads((locale_dir / f"{code}.json").read_text(encoding="utf-8"))
                fee = data["departments"]["cse_ds"]["fees"]
                self.assertIn(expected, re.sub(r"\D", "", fee))
