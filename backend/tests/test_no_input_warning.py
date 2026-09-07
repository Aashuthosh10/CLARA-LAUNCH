"""Localized no-input warning templates (zero LLM)."""

from backend.services.greetings import SUPPORTED_LANGUAGES, get_no_input_warning


def test_no_input_warning_all_languages_first_and_second():
    for lang in SUPPORTED_LANGUAGES:
        first = get_no_input_warning(lang, 1)
        second = get_no_input_warning(lang, 2)
        assert first and first.strip()
        assert second and second.strip()
        assert first != second
        # No robotic system phrasing
        lowered = (first + " " + second).lower()
        assert "no speech detected" not in lowered
        assert "timeout" not in lowered
        assert "error:" not in lowered


def test_second_warning_mentions_orb_or_tap_instruction():
    en = get_no_input_warning("English", 2).lower()
    assert "orb" in en
    assert "tap" in en or "speak" in en


def test_unknown_language_falls_back_to_english():
    assert get_no_input_warning("French", 1) == get_no_input_warning("English", 1)
