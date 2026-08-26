from __future__ import annotations

import json
from pathlib import Path

import pytest

from backend.services.answer_generation import generated_reply_is_safe_for_language
from backend.services.content.content_unit_resolver import resolve_unit
from backend.services.content.unit_narration import narrate_unit
from backend.services.greetings import get_name_prompt, get_ready_prompt, normalize_guest_name
from backend.services.ui_localization import ui_text
from backend.services.answer_generation import load_locale_data_for_lang_key
from backend.services.narration_plan import _admissions_slides


ROOT = Path(__file__).resolve().parents[2]
SAMPLE_STATUS = "SAMPLE_REPLACE_WITH_OFFICIAL"
BLOCKED_KN = (
    "ಈ ಮಾಹಿತಿಯನ್ನು ಇನ್ನೂ ಅಧಿಕೃತವಾಗಿ ದೃಢೀಕರಿಸಲಾಗಿಲ್ಲ.\n"
    "ಹೆಚ್ಚಿನ ಮಾಹಿತಿಗಾಗಿ ಸಂಬಂಧಿತ ವಿಭಾಗವನ್ನು ಸಂಪರ್ಕಿಸಿ."
)


def test_exact_kannada_fixed_ui_goldens() -> None:
    expected = {
        "welcome.general_display": "ಸ್ವಾಗತ.\nಇಂದು ನಿಮಗೆ ಯಾವ ಮಾಹಿತಿ ಬೇಕು?",
        "welcome.general_narration": "ಸ್ವಾಗತ. ಇಂದು ನಿಮಗೆ ಯಾವ ಮಾಹಿತಿ ಬೇಕು?",
        "language.select": "ಭಾಷೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ.",
        "status.listening": "ಆಲಿಸುತ್ತಿದ್ದೇನೆ…",
        "status.processing": "ನಿಮ್ಮ ವಿನಂತಿಯನ್ನು ಪರಿಶೀಲಿಸುತ್ತಿದ್ದೇನೆ…",
        "clarification.department": "ನೀವು ಯಾವ ವಿಭಾಗದ ಬಗ್ಗೆ ತಿಳಿಯಲು ಬಯಸುತ್ತೀರಿ?",
        "error.retry": "ದಯವಿಟ್ಟು ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.",
        "session.timeout": "ಈ ಅಧಿವೇಶನದ ಸಮಯ ಮೀರಿದೆ.",
        "session.thank_you": "ಧನ್ಯವಾದಗಳು.",
        "session.ending": "ಈ ಅಧಿವೇಶನ ಮುಕ್ತಾಯಗೊಳ್ಳುತ್ತಿದೆ.",
        "availability.official_fact_blocked": BLOCKED_KN,
    }
    assert {key: ui_text("kn", key) for key in expected} == expected


@pytest.mark.parametrize("name", ["ಆಶಾ", "Asha", "Dr. ಆಶಾ Rao", "CSE ವಿದ್ಯಾರ್ಥಿ"])
def test_named_welcome_preserves_name_and_kannada_grammar(name: str) -> None:
    assert get_ready_prompt("Kannada", name) == (
        f"{name}, ಸ್ವಾಗತ. ಇಂದು ನಿಮಗೆ ಯಾವ ಮಾಹಿತಿ ಬೇಕು?"
    )


def test_missing_and_long_names_do_not_break_a_grapheme() -> None:
    assert get_ready_prompt("Kannada") == "ಸ್ವಾಗತ. ಇಂದು ನಿಮಗೆ ಯಾವ ಮಾಹಿತಿ ಬೇಕು?"
    assert get_name_prompt("Kannada") == "ದಯವಿಟ್ಟು ನಿಮ್ಮ ಹೆಸರನ್ನು ತಿಳಿಸಿ."
    assert normalize_guest_name("ಆ" * 80) is None
    long_words = "ಆಶಾ " * 20
    normalized = normalize_guest_name(long_words)
    assert normalized
    assert len(normalized) <= 48
    assert not normalized.endswith("್")


def test_kannada_placeholder_is_internal_only_and_never_narrated() -> None:
    unit = resolve_unit(
        unit_id="hostel.girls.rooms",
        language="Kannada",
        language_code="kn",
    )
    assert unit is not None
    assert unit.metadata["content_status"] == SAMPLE_STATUS
    spoken = narrate_unit(unit, "kn")
    assert spoken == BLOCKED_KN.replace("\n", " ")
    assert SAMPLE_STATUS not in spoken
    assert "ಮಾದರಿ" not in unit.title


@pytest.mark.parametrize(
    "unsafe",
    [
        "Here is the answer.",
        '{"answer": "ಪಠ್ಯ"}',
        "SAMPLE_REPLACE_WITH_OFFICIAL",
        "ಮಾಹಿತಿ [source: 12]",
        "```json\n[]\n```",
    ],
)
def test_generated_kannada_rejects_language_and_metadata_leaks(unsafe: str) -> None:
    assert not generated_reply_is_safe_for_language(unsafe, "kn")


def test_generated_kannada_accepts_concise_kannada_with_protected_acronyms() -> None:
    assert generated_reply_is_safe_for_language(
        "SVIT ನಲ್ಲಿ CSE ವಿಭಾಗದ ಮಾಹಿತಿ ಲಭ್ಯವಿದೆ.", "kn"
    )


def test_conflicting_fee_structures_are_blocked_from_kannada_narration() -> None:
    slides = _admissions_slides(load_locale_data_for_lang_key("kn"), "kn")
    fee_slides = [(title, body) for title, body in slides if "ಶುಲ್ಕ" in title]
    assert len(fee_slides) >= 2
    for _, body in fee_slides:
        assert "ಅಧಿಕೃತವಾಗಿ ದೃಢೀಕರಿಸಲಾಗಿಲ್ಲ" in body
        assert "{'" not in body
        assert "₹" not in body


def test_authoritative_ui_contract_is_parseable_and_complete() -> None:
    data = json.loads((ROOT / "backend/data/locales/ui.json").read_text(encoding="utf-8"))
    assert set(data) == {"en", "kn"}
    assert set(data["en"]) == set(data["kn"])
    assert data["kn"]["welcome"]["general_narration"] == get_ready_prompt("Kannada")
    assert ui_text("kn", "documents.items.aadhaar") == "ಆಧಾರ್ ಕಾರ್ಡ್ ಪ್ರತಿ"
    assert ui_text("kn", "comparison.heading") == "ಕಾರ್ಯಕ್ರಮಗಳ ಹೋಲಿಕೆ"
    assert "backend/data/locales/ui.json" in (
        ROOT / "frontend/src/localization/uiCopy.ts"
    ).read_text(encoding="utf-8").replace("@college-locales", "backend/data/locales")


def test_orphan_frontend_locale_is_not_imported_by_production_code() -> None:
    source_root = ROOT / "frontend/src"
    for path in source_root.rglob("*.ts*"):
        if "__tests__" in path.parts:
            continue
        text = path.read_text(encoding="utf-8")
        assert "src/data/locales/kn.json" not in text
        assert "./data/locales/kn.json" not in text
        assert "../data/locales/kn.json" not in text
