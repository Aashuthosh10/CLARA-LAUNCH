"""Phase 1 regression baseline for regional department card parsing.

Classification:
- ``TestExistingPassingBehaviour`` records the working English contract.
- ``TestNewlyCapturedRegionalRegression`` asserts the desired regional contract and
  is intentionally red until production vocabulary/normalization is repaired.
- ``TestParserBoundaries`` identifies the first failing deterministic layer.
- ``TestCurrentCollisionBehaviour`` documents current language-global matching.

Production implementation must not be changed to make this file pass during Phase 1.
Deferred features (not tested as cards): faculty, department contact/location,
voice navigation, cross-turn queue append, and Marathi.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Final

import pytest

from backend.services.answer_generation import (
    DEPARTMENT_JSON_KEY_ORDER,
    extract_features,
    load_locale_data_for_lang_key,
    normalize_user_input,
    resolve_intent_from_features,
)
from backend.services.content.department_identity import match_department_keys_exclusive
from backend.services.content.semantic_composition import detect_topic_spans
from backend.services.content.semantic_request_parser import parse_semantic_request
from backend.services.content.unit_selector import select_content_units
from backend.services.conversation.entity_extractor import extract_entities_rules
from backend.services.conversation.response_decision import (
    ResponseDecision,
    ResponseMode,
    resolve_response_decision,
)


REGIONAL_LANGUAGES: Final[tuple[str, ...]] = ("kn", "hi", "ta", "te", "ml")
ALL_LANGUAGES: Final[tuple[str, ...]] = ("en",) + REGIONAL_LANGUAGES
REGISTERED_TOPICS: Final[tuple[str, ...]] = (
    "overview",
    "hod",
    "achievements",
    "placements",
    "fees",
)

# Terms come from semantic_vocab/catalog.py or the corresponding locale's HOD title.
# The missing non-Kannada HOD entries are deliberate regression evidence.
NATIVE_TOPIC: Final[dict[str, dict[str, str]]] = {
    "kn": {
        "overview": "ಅವಲೋಕನ",
        "hod": "ವಿಭಾಗದ ಮುಖ್ಯಸ್ಥರು",
        "achievements": "ಸಾಧನೆ",
        "placements": "ಪ್ಲೇಸ್‌ಮೆಂಟ್",
        "fees": "ಶುಲ್ಕ",
    },
    "hi": {
        "overview": "अवलोकन",
        "hod": "विभागाध्यक्ष",
        "achievements": "उपलब्धि",
        "placements": "प्लेसमेंट",
        "fees": "फीस",
    },
    "ta": {
        "overview": "கண்ணோட்டம்",
        "hod": "துறைத் தலைவர்",
        "achievements": "சாதனை",
        "placements": "பிளேஸ்மென்ட்",
        "fees": "கட்டணம்",
    },
    "te": {
        "overview": "అవలోకనం",
        "hod": "విభాగం అధిపతి",
        "achievements": "సాధన",
        "placements": "ప్లేస్‌మెంట్",
        "fees": "ఫీజు",
    },
    "ml": {
        "overview": "അവലോകനം",
        "hod": "വിഭാഗത്തിന്റെ മേധാവി",
        "achievements": "നേട്ടം",
        "placements": "പ്ലേസ്‌മെന്റ്",
        "fees": "ഫീസ്",
    },
}

UNKNOWN_DEPARTMENT: Final[dict[str, str]] = {
    "kn": "ಕ್ವಾಂಟಮ್ ವಿಭಾಗ",
    "hi": "क्वांटम विभाग",
    "ta": "குவாண்டம் துறை",
    "te": "క్వాంటం విభాగం",
    "ml": "ക്വാണ്ടം വിഭാഗം",
}


@dataclass(frozen=True)
class NativeDepartmentCase:
    language: str
    department_key: str
    localized_name: str


def _native_department_cases() -> tuple[NativeDepartmentCase, ...]:
    cases: list[NativeDepartmentCase] = []
    for language in REGIONAL_LANGUAGES:
        locale = load_locale_data_for_lang_key(language)
        departments = locale.get("departments") if isinstance(locale, dict) else None
        assert isinstance(departments, dict), language
        for department_key in DEPARTMENT_JSON_KEY_ORDER:
            department = departments.get(department_key)
            assert isinstance(department, dict), (language, department_key)
            localized_name = department.get("name")
            assert isinstance(localized_name, str) and localized_name.strip(), (
                language,
                department_key,
            )
            cases.append(
                NativeDepartmentCase(language, department_key, localized_name.strip())
            )
    return tuple(cases)


NATIVE_DEPARTMENTS: Final[tuple[NativeDepartmentCase, ...]] = _native_department_cases()


def _request(text: str, language: str):
    return parse_semantic_request(raw_text=text, language_code_key=language)


def _units(text: str, language: str) -> tuple[str, ...] | None:
    request = _request(text, language)
    if request is None:
        return None
    plan = select_content_units(request)
    return None if plan is None else tuple(plan.units)


def _decision(text: str, language: str) -> ResponseDecision:
    request = _request(text, language)
    normalized = normalize_user_input(text)
    intent = resolve_intent_from_features(extract_features(normalized))
    legacy_entities = extract_entities_rules(text)
    return resolve_response_decision(
        text=text,
        semantic_request=request,
        ci_intent=intent,
        has_department_entity=bool(
            legacy_entities.department or (request is not None and request.entities)
        ),
    )


def _assert_card_contract(text: str, language: str, expected: tuple[str, ...]) -> None:
    units = _units(text, language)
    assert units == expected
    assert len(units) == len(set(units)), "duplicate canonical units must be removed"
    decision = _decision(text, language)
    assert decision.mode is ResponseMode.CARD
    assert decision.clarification_reason != "missing_department"


class TestExistingPassingBehaviour:
    """Existing passing behaviour: the English canonical baseline."""

    @pytest.mark.parametrize("topic", REGISTERED_TOPICS)
    def test_cse_single_registered_topic(self, topic: str) -> None:
        _assert_card_contract(f"CSE {topic}", "en", (f"cse.{topic}",))

    @pytest.mark.parametrize(
        ("text", "expected"),
        (
            ("CSE HOD and fees", ("cse.hod", "cse.fees")),
            ("CSE overview and placements", ("cse.overview", "cse.placements")),
            (
                "CSE achievements and fees and HOD",
                ("cse.achievements", "cse.fees", "cse.hod"),
            ),
            (
                "CSE placements and overview and fees",
                ("cse.placements", "cse.overview", "cse.fees"),
            ),
        ),
    )
    def test_multi_card_order(self, text: str, expected: tuple[str, ...]) -> None:
        _assert_card_contract(text, "en", expected)

    def test_duplicate_topic_is_deduplicated(self) -> None:
        _assert_card_contract("CSE fees and fees", "en", ("cse.fees",))

    def test_missing_department_clarifies(self) -> None:
        decision = _decision("Who is the HOD?", "en")
        assert _units("Who is the HOD?", "en") is None
        assert decision.mode is ResponseMode.CLARIFY
        assert decision.clarification_reason == "missing_department"

    def test_explicitly_unsupported_topic_does_not_create_units(self) -> None:
        assert _units("CSE bus routes", "en") is None

    def test_unknown_non_atomic_topic_documents_current_overview_default(self) -> None:
        assert _units("CSE quantum curriculum", "en") == ("cse.overview",)


class TestNewlyCapturedRegionalRegression:
    """Desired regional parity. Failures here are the Phase 1 regression baseline."""

    @pytest.mark.parametrize(
        "case",
        NATIVE_DEPARTMENTS,
        ids=lambda c: f"{c.language}-{c.department_key}",
    )
    @pytest.mark.parametrize("topic", REGISTERED_TOPICS)
    def test_every_native_department_and_topic(
        self,
        case: NativeDepartmentCase,
        topic: str,
    ) -> None:
        text = f"{case.localized_name} {NATIVE_TOPIC[case.language][topic]}"
        _assert_card_contract(
            text,
            case.language,
            (f"{case.department_key}.{topic}",),
        )

    @pytest.mark.parametrize("language", REGIONAL_LANGUAGES)
    @pytest.mark.parametrize(
        ("topics", "expected_topics"),
        (
            (("hod", "fees"), ("hod", "fees")),
            (("overview", "placements"), ("overview", "placements")),
            (
                ("achievements", "fees", "hod"),
                ("achievements", "fees", "hod"),
            ),
        ),
    )
    def test_native_multicard_order(
        self,
        language: str,
        topics: tuple[str, ...],
        expected_topics: tuple[str, ...],
    ) -> None:
        cse = next(
            c for c in NATIVE_DEPARTMENTS if c.language == language and c.department_key == "cse"
        )
        text = " ".join(
            (cse.localized_name,) + tuple(NATIVE_TOPIC[language][topic] for topic in topics)
        )
        _assert_card_contract(
            text,
            language,
            tuple(f"cse.{topic}" for topic in expected_topics),
        )

    @pytest.mark.parametrize("language", REGIONAL_LANGUAGES)
    def test_native_department_with_english_hod(self, language: str) -> None:
        cse = next(
            c for c in NATIVE_DEPARTMENTS if c.language == language and c.department_key == "cse"
        )
        _assert_card_contract(f"{cse.localized_name} HOD", language, ("cse.hod",))

    @pytest.mark.parametrize("language", REGIONAL_LANGUAGES)
    def test_english_acronym_with_regional_topic(self, language: str) -> None:
        _assert_card_contract(
            f"CSE {NATIVE_TOPIC[language]['fees']}",
            language,
            ("cse.fees",),
        )

    @pytest.mark.parametrize("language", REGIONAL_LANGUAGES)
    def test_mixed_english_and_regional_request(self, language: str) -> None:
        _assert_card_contract(
            f"show CSE {NATIVE_TOPIC[language]['placements']}",
            language,
            ("cse.placements",),
        )

    @pytest.mark.parametrize("language", REGIONAL_LANGUAGES)
    def test_native_missing_department(self, language: str) -> None:
        text = NATIVE_TOPIC[language]["hod"]
        assert _units(text, language) is None
        decision = _decision(text, language)
        assert decision.mode is ResponseMode.CLARIFY
        assert decision.clarification_reason == "missing_department"

    @pytest.mark.parametrize("language", REGIONAL_LANGUAGES)
    def test_unknown_native_department_does_not_card(self, language: str) -> None:
        text = f"{UNKNOWN_DEPARTMENT[language]} {NATIVE_TOPIC[language]['fees']}"
        assert _units(text, language) is None
        assert _decision(text, language).mode is not ResponseMode.CARD


class TestParserBoundaries:
    """Direct boundary assertions locate each regional failure precisely."""

    @pytest.mark.parametrize(
        "case",
        NATIVE_DEPARTMENTS,
        ids=lambda c: f"{c.language}-{c.department_key}",
    )
    def test_department_identity_resolution(self, case: NativeDepartmentCase) -> None:
        assert match_department_keys_exclusive(case.localized_name) == (
            case.department_key,
        )

    @pytest.mark.parametrize("language", REGIONAL_LANGUAGES)
    @pytest.mark.parametrize("topic", REGISTERED_TOPICS)
    def test_native_semantic_topic_resolution(self, language: str, topic: str) -> None:
        assert tuple(
            span.topic for span in detect_topic_spans(NATIVE_TOPIC[language][topic])
        ) == (topic,)

    @pytest.mark.parametrize("language", REGIONAL_LANGUAGES)
    def test_semantic_request_parser_boundary(self, language: str) -> None:
        cse = next(
            c for c in NATIVE_DEPARTMENTS if c.language == language and c.department_key == "cse"
        )
        request = _request(
            f"{cse.localized_name} {NATIVE_TOPIC[language]['fees']}",
            language,
        )
        assert request is not None
        assert request.unit_items == (("cse", "fees"),)

    @pytest.mark.parametrize("language", REGIONAL_LANGUAGES)
    def test_unit_selection_boundary(self, language: str) -> None:
        cse = next(
            c for c in NATIVE_DEPARTMENTS if c.language == language and c.department_key == "cse"
        )
        assert _units(
            f"{cse.localized_name} {NATIVE_TOPIC[language]['fees']}",
            language,
        ) == ("cse.fees",)

    @pytest.mark.parametrize("language", REGIONAL_LANGUAGES)
    def test_response_decision_boundary_has_no_false_missing_department(
        self,
        language: str,
    ) -> None:
        cse = next(
            c for c in NATIVE_DEPARTMENTS if c.language == language and c.department_key == "cse"
        )
        decision = _decision(f"{cse.localized_name} HOD", language)
        assert decision.mode is ResponseMode.CARD
        assert decision.clarification_reason != "missing_department"


class TestCurrentCollisionBehaviour:
    """Existing behaviour: aliases are global; selected language does not filter them."""

    @pytest.mark.parametrize("selected_language", ALL_LANGUAGES)
    def test_hindi_alias_matches_under_every_selected_language(
        self,
        selected_language: str,
    ) -> None:
        assert _units("सीएसई फीस", selected_language) == ("cse.fees",)

    @pytest.mark.parametrize("selected_language", ALL_LANGUAGES)
    def test_english_acronym_matches_inside_regional_sentence(
        self,
        selected_language: str,
    ) -> None:
        assert _units("ದಯವಿಟ್ಟು CSE ಶುಲ್ಕ", selected_language) == ("cse.fees",)

    def test_longest_match_precedence(self) -> None:
        assert match_department_keys_exclusive("CSE Data Science fees") == ("cse_ds",)
        assert _units("CSE Data Science fees", "en") == ("cse_ds.fees",)

    @pytest.mark.parametrize("text", ("civilization", "mechanically", "showcase"))
    def test_short_alias_not_embedded_in_unrelated_word(self, text: str) -> None:
        assert match_department_keys_exclusive(text) == ()

    def test_native_script_alias_currently_has_substring_false_positive(self) -> None:
        # Current non-Latin matching is substring-based. Phase 2 should decide whether
        # grapheme/script boundaries must reject this surrounding-word collision.
        assert match_department_keys_exclusive("ಅಸಿಎಸ್ಇಯ") == ("cse",)


class TestUnsupportedDeferredFeatures:
    """Classification-only guard: Phase 1 must not register deferred card units."""

    @pytest.mark.parametrize("suffix", ("faculty", "contact", "location"))
    def test_deferred_department_units_are_not_assumed(self, suffix: str) -> None:
        assert f"cse.{suffix}" not in {
            f"cse.{topic}" for topic in REGISTERED_TOPICS
        }
