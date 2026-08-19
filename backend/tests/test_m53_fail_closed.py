"""M5.3 fail-closed + confidence: no guessed unitIds, no five-card expansion."""

from __future__ import annotations

import unittest

from backend.services.answer_generation import INTENT_HOD_PROFILE
from backend.services.content.semantic_request import SemanticRequest
from backend.services.content.semantic_request_parser import parse_semantic_request
from backend.services.content.types import SURFACE_DEPARTMENT_OVERVIEW
from backend.services.content.unit_selector import select_content_units
from backend.services.orchestration.narration_resolver import resolve_narration
from backend.services.orchestration.types import ConversationResolution, PresentationMode


def _plan_units(raw: str, lang: str = "en") -> tuple[str, ...] | None:  # noqa: D401
    req = parse_semantic_request(raw_text=raw, language_code_key=lang)
    if req is None:
        return None
    plan = select_content_units(req)
    return None if plan is None else tuple(plan.units)


class TestExplicitComposition(unittest.TestCase):
    """M5.4: explicitly paired topics compose; only unbindable requests fail closed."""

    def test_fees_and_hod_same_department(self) -> None:
        self.assertEqual(_plan_units("CSE fees and HOD"), ("cse.fees", "cse.hod"))

    def test_placements_and_fees(self) -> None:
        self.assertEqual(_plan_units("CSE placements and fees"), ("cse.placements", "cse.fees"))

    def test_hod_and_aiml_fees_bind_to_their_own_department(self) -> None:
        self.assertEqual(_plan_units("CSE HOD and AIML fees"), ("cse.hod", "cse_aiml.fees"))

    def test_kannada_fees_and_hod(self) -> None:
        self.assertEqual(
            _plan_units("CSE fees mattu HOD yaaru", "kn"),
            ("cse.fees", "cse.hod"),
        )

    def test_mixed_families_across_departments(self) -> None:
        self.assertEqual(
            _plan_units("Data Science overview, AIML HOD and CSE fees"),
            ("cse_ds.overview", "cse_aiml.hod", "cse.fees"),
        )

    def test_unpaired_multi_entity_without_topic_clarifies(self) -> None:
        # Two decks, two overviews or a comparison are all plausible — never guess.
        self.assertIsNone(
            parse_semantic_request(raw_text="tell me about CSE and AIML", language_code_key="en")
        )


class TestFailClosed(unittest.TestCase):
    def test_unknown_and_near_match(self) -> None:
        self.assertIsNone(parse_semantic_request(raw_text="which department?", language_code_key="en"))
        self.assertIsNone(parse_semantic_request(raw_text="fees", language_code_key="en"))
        self.assertIsNone(parse_semantic_request(raw_text="who?", language_code_key="en"))
        self.assertIsNone(
            parse_semantic_request(raw_text="Quantum Basket Weaving HOD", language_code_key="en")
        )
        self.assertIsNone(parse_semantic_request(raw_text="CSS fees", language_code_key="en"))

    def test_tell_me_something_about_cse_is_full_overview(self) -> None:
        req = parse_semantic_request(raw_text="tell me something about CSE", language_code_key="en")
        self.assertIsNotNone(req)
        assert req is not None
        self.assertEqual(req.topic, "overview")
        self.assertEqual(req.requested_scope, "full_department")
        self.assertEqual(_plan_units("tell me something about CSE"), (
            "cse.overview",
            "cse.hod",
            "cse.achievements",
            "cse.placements",
            "cse.fees",
        ))

    def _card_resolution(self) -> ConversationResolution:
        return ConversationResolution(
            language="English",
            language_code_key="en",
            tts_code="en-IN",
            intent=INTENT_HOD_PROFILE,
            show_card=SURFACE_DEPARTMENT_OVERVIEW,
            card_surface=SURFACE_DEPARTMENT_OVERVIEW,
            should_generate_presentation=True,
            presentation_mode=PresentationMode.CARD_PRESENTATION.value,
            department_label="CSE",
        )

    def test_narration_resolver_emits_exactly_the_composed_units(self) -> None:
        segs = resolve_narration(
            resolution=self._card_resolution(),
            entities={"department": "CSE"},
            user_text="CSE fees and HOD",
        )
        self.assertIsNotNone(segs)
        assert segs is not None
        self.assertEqual([s.unit_id for s in segs], ["cse.fees", "cse.hod"])

    def test_narration_resolver_never_invents_a_deck_when_unresolved(self) -> None:
        segs = resolve_narration(
            resolution=self._card_resolution(),
            entities={"department": "CSE"},
            user_text="tell me about CSE and AIML",
        )
        self.assertIsNone(segs)


class TestConfidenceContract(unittest.TestCase):
    def test_high_on_unambiguous_single(self) -> None:
        req = parse_semantic_request(raw_text="CSE fees", language_code_key="en")
        self.assertIsNotNone(req)
        assert req is not None
        self.assertEqual(req.confidence, "HIGH")

    def test_medium_on_multi_hod(self) -> None:
        req = parse_semantic_request(
            raw_text="Who is the HOD of AIML and Data Science?",
            language_code_key="en",
        )
        self.assertIsNotNone(req)
        assert req is not None
        self.assertEqual(req.confidence, "MEDIUM")
        self.assertEqual(req.entities, ("cse_aiml", "cse_ds"))

    def test_low_none_never_selects_units(self) -> None:
        low = SemanticRequest(
            language_code="en",
            topic="fees",
            entities=("cse",),
            context="department",
            requested_scope="single",
            confidence="LOW",
            source="test",
            raw_text="guess",
        )
        none = SemanticRequest(
            language_code="en",
            topic="fees",
            entities=("cse",),
            context="department",
            requested_scope="single",
            confidence="NONE",
            source="test",
            raw_text="guess",
        )
        self.assertIsNone(select_content_units(low))
        self.assertIsNone(select_content_units(none))
