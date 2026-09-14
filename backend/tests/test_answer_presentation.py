import asyncio

import pytest

from backend.services.orchestration.answer_presentation import (
    build_answer_presentation,
    enrich_successful_answer_message,
    validate_answer_presentation,
)
from backend.services.orchestration import ConversationOrchestrator
from backend.services.orchestration.types import ConversationResolution


def test_generic_fallback_preserves_authoritative_text() -> None:
    text = "The office is beside the main reception."
    model = build_answer_presentation(text)
    assert model is not None
    assert model["type"] == "GENERIC_ANSWER_CARD"
    assert model["summary"] == text
    assert validate_answer_presentation(model, text)


def test_numbered_and_bulleted_answers_map_by_structure() -> None:
    steps = "1. Collect the form\n2. Submit the documents\n3. Keep the receipt"
    items = "- Library\n- Laboratories\n- Sports facilities"
    assert build_answer_presentation(steps)["type"] == "STEP_CARD"
    assert build_answer_presentation(items)["type"] == "LIST_CARD"


def test_choice_uses_explicit_options_and_same_source_text() -> None:
    text = "Which details would you like?"
    model = build_answer_presentation(
        text,
        response_type="clarification",
        explicit_choices=["Eligibility", "Documents"],
    )
    assert model is not None
    assert model["type"] == "CHOICE_CARD"
    assert model["choices"] == ["Eligibility", "Documents"]
    assert validate_answer_presentation(model, text)


def test_clarification_list_becomes_source_bound_choices() -> None:
    text = "Please choose:\n- Eligibility\n- Documents"
    model = build_answer_presentation(text, response_type="clarification")
    assert model is not None
    assert model["type"] == "CHOICE_CARD"
    assert model["choices"] == ["Eligibility", "Documents"]
    assert validate_answer_presentation(model, text)


def test_long_information_uses_exact_sentences_as_readable_points() -> None:
    text = "The library has reference books. It also provides digital resources. A reading area is available."
    model = build_answer_presentation(text)
    assert model is not None
    assert model["type"] == "INFO_CARD"
    assert model["points"] == [
        "The library has reference books.",
        "It also provides digital resources.",
        "A reading area is available.",
    ]
    assert validate_answer_presentation(model, text)


def test_grounded_numeric_answer_maps_to_stats_without_new_facts() -> None:
    text = "The intake is 120 students. The reported placement rate is 85%."
    model = build_answer_presentation(text)
    assert model is not None
    assert model["type"] == "STATS_CARD"
    assert model["highlights"] == ["The intake is 120 students.", "The reported placement rate is 85%."]
    assert validate_answer_presentation(model, text)


def test_validation_rejects_invented_display_fact() -> None:
    text = "The library is open today."
    model = build_answer_presentation(text)
    assert model is not None
    model["points"] = ["It closes at 8 PM."]
    assert not validate_answer_presentation(model, text)


def test_all_supported_language_labels_are_non_english() -> None:
    for code in ("kn", "hi", "te", "ta", "ml"):
        model = build_answer_presentation("ಒಂದು ಉತ್ತರ." if code == "kn" else "उत्तर।", language_code=code)
        assert model is not None
        assert model["title"] != "Answer"


def test_successful_clarification_is_visual_by_default() -> None:
    text = "Would you like courses, facilities, or placements?"
    message = {"role": "clara", "text": text}
    resolution = ConversationResolution(
        response_mode="CLARIFY",
        response_type="clarification",
        choice_options=["Courses", "Facilities", "Placements"],
    )
    model = enrich_successful_answer_message(
        message,
        resolution=resolution,
        authoritative_text=text,
        language_code="en",
    )
    assert model is not None
    assert model["type"] == "CHOICE_CARD"
    assert message["visualResponseEligible"] is True
    assert message["answerPresentation"] == model


def test_special_and_status_responses_are_deliberately_excluded() -> None:
    text = "Status text"
    for resolution, intentional_plain in (
        (ConversationResolution(show_card="hod", response_type="presentation"), False),
        (ConversationResolution(presentation_bundle=object(), response_type="presentation"), False),
        (ConversationResolution(campus_destination={"room": "Library"}, response_type="answer"), False),
        (ConversationResolution(response_mode="FALLBACK", response_type="unknown"), False),
        (ConversationResolution(response_type="answer"), True),
    ):
        message = {"role": "clara", "text": text}
        assert enrich_successful_answer_message(
            message,
            resolution=resolution,
            authoritative_text=text,
            language_code="en",
            intentional_plain=intentional_plain,
        ) is None
        assert "answerPresentation" not in message


@pytest.mark.parametrize(
    ("text", "response_type"),
    (
        ("The library offers reference and digital resources.", "answer"),
        ("The campus includes laboratories and sports facilities.", "faq"),
        ("The department offers undergraduate academic programs.", "answer"),
        ("Visitors can ask reception for the appropriate office.", "deterministic_receptionist"),
        ("Parents may contact the college office for official details.", "answer"),
        ("The academic calendar is published by the college.", "provider_answer"),
        ("Office timings follow the current institutional schedule.", "faq"),
        ("The retrieved context describes student support services.", "rag"),
        ("That department also provides laboratory facilities.", "contextual_followup"),
        ("Faculty members support students through mentoring.", "low_latency_answer"),
    ),
)
def test_successful_non_specialized_response_classes_are_visual_by_default(
    text: str,
    response_type: str,
) -> None:
    message = {"role": "clara", "text": text}
    model = enrich_successful_answer_message(
        message,
        resolution=ConversationResolution(response_mode="ANSWER", response_type=response_type),
        authoritative_text=text,
        language_code="en",
    )
    assert model is not None
    assert model["summary"] == text
    assert message["answerPresentation"] == model


def test_exact_admissions_clarification_is_a_choice_card_in_every_language() -> None:
    languages = {
        "en": "English",
        "kn": "Kannada",
        "hi": "Hindi",
        "te": "Telugu",
        "ta": "Tamil",
        "ml": "Malayalam",
    }

    async def _run(language_code: str, language_name: str) -> None:
        result = await ConversationOrchestrator().run(
            "Tell me about admissions",
            {
                "language_code_key": language_code,
                "language_name": language_name,
                "language": language_name,
            },
            defer_narration=True,
        )
        resolution = result.resolution
        assert resolution.response_mode == "CLARIFY"
        assert resolution.response_type == "clarification"
        assert len(resolution.choice_options) >= 2

        text = str(resolution.short_circuit_reply or "")
        message = {"role": "clara", "text": text}
        model = enrich_successful_answer_message(
            message,
            resolution=resolution,
            authoritative_text=text,
            language_code=language_code,
        )
        assert model is not None
        assert model["type"] == "CHOICE_CARD"
        assert model["summary"] == text
        assert model["choices"] == resolution.choice_options
        assert validate_answer_presentation(model, text)

    for code, name in languages.items():
        asyncio.run(_run(code, name))
