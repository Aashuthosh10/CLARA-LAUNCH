"""Milestone 4.2 — SurfaceSelector + SurfaceRegistry tests."""

from __future__ import annotations

import unittest

from backend.services.answer_generation import (
    INTENT_DEPARTMENT_COMPARISON,
    INTENT_DEPARTMENT_FEES,
    INTENT_DEPARTMENT_OVERVIEW,
    INTENT_DOCUMENTS,
    INTENT_HOD_PROFILE,
    INTENT_PLACEMENTS,
    INTENT_PRINCIPAL_PROFILE,
    INTENT_TRUSTEES_PROFILE,
    card_trigger_hints,
)
from backend.services.content.surface_registry import all_surfaces, get_surface
from backend.services.content.surface_selector import select_surface
from backend.services.content.types import (
    SURFACE_COMPARISON,
    SURFACE_DEPARTMENT_FEES,
    SURFACE_DEPARTMENT_OVERVIEW,
    SURFACE_DOCUMENTS,
    SURFACE_FAQ,
    SURFACE_HOD,
    SURFACE_PLACEMENTS,
    SURFACE_PRINCIPAL,
    SURFACE_TRUSTEES,
)
from backend.services.conversation.types import PolicyAction, PolicyDecision
from backend.services.orchestration.presentation_resolver import resolve_presentation
from backend.services.orchestration.types import ConversationResolution, PresentationMode


class TestSurfaceRegistry(unittest.TestCase):
    def test_all_surfaces_have_capability_contract(self) -> None:
        for desc in all_surfaces():
            self.assertFalse(desc.supports_summary_generation, msg=desc.surface)
            self.assertIsNotNone(desc.content_owner)
            self.assertIn(desc.narration_owner, ("canonical", "legacy"))
            self.assertIsInstance(desc.supports_interrupt, bool)
            self.assertIsInstance(desc.supports_language_translation, bool)
            self.assertIsInstance(desc.supports_scene_navigation, bool)

    def test_faq_no_card(self) -> None:
        faq = get_surface(SURFACE_FAQ)
        self.assertIsNotNone(faq)
        assert faq is not None
        self.assertFalse(faq.supports_card)
        self.assertIsNone(faq.card_surface)

    def test_department_canonical_narration(self) -> None:
        d = get_surface(SURFACE_DEPARTMENT_OVERVIEW)
        self.assertIsNotNone(d)
        assert d is not None
        self.assertEqual(d.narration_owner, "canonical")
        self.assertTrue(d.supports_card)
        self.assertTrue(d.supports_menu)


class TestSurfaceSelector(unittest.TestCase):
    def test_department_voice(self) -> None:
        sel = select_surface(
            intent=INTENT_DEPARTMENT_OVERVIEW,
            entities={"department": "CSE"},
        )
        self.assertEqual(sel.surface, SURFACE_DEPARTMENT_OVERVIEW)
        self.assertEqual(sel.owner, SURFACE_DEPARTMENT_OVERVIEW)
        self.assertTrue(sel.supports_card)
        self.assertEqual(sel.card_surface, SURFACE_DEPARTMENT_OVERVIEW)

    def test_menu_department_click(self) -> None:
        sel = select_surface(
            local_intent={"type": "department_click", "departmentLabel": "CSE"},
            entities={"department": "CSE"},
        )
        self.assertEqual(sel.surface, SURFACE_DEPARTMENT_OVERVIEW)
        self.assertEqual(sel.source, "localIntent")

    def test_faq_matched(self) -> None:
        sel = select_surface(intent=INTENT_DEPARTMENT_OVERVIEW, faq_matched=True)
        self.assertEqual(sel.surface, SURFACE_FAQ)
        self.assertEqual(sel.owner, SURFACE_FAQ)
        self.assertFalse(sel.supports_card)

    def test_fees_documents_principal_placements_comparison(self) -> None:
        cases = [
            (INTENT_DEPARTMENT_FEES, SURFACE_DEPARTMENT_FEES),
            (INTENT_DOCUMENTS, SURFACE_DOCUMENTS),
            (INTENT_PRINCIPAL_PROFILE, SURFACE_PRINCIPAL),
            (INTENT_PLACEMENTS, SURFACE_PLACEMENTS),
            (INTENT_DEPARTMENT_COMPARISON, SURFACE_COMPARISON),
            (INTENT_TRUSTEES_PROFILE, SURFACE_TRUSTEES),
            (INTENT_HOD_PROFILE, SURFACE_HOD),
        ]
        for intent, surface in cases:
            sel = select_surface(intent=intent, entities={"department": "CSE"})
            self.assertEqual(sel.surface, surface, msg=intent)
            self.assertEqual(sel.owner, surface, msg=intent)

    def test_unknown(self) -> None:
        sel = select_surface(intent="NORMAL_QUERY", entities={})
        self.assertIsNone(sel.surface)
        self.assertIsNone(sel.owner)
        self.assertEqual(sel.reason, "unknown")

    def test_precedence_local_intent_beats_faq(self) -> None:
        sel = select_surface(
            local_intent={"type": "department_click", "departmentLabel": "CSE"},
            entities={"department": "CSE"},
            faq_matched=True,
            intent=INTENT_DEPARTMENT_OVERVIEW,
        )
        self.assertEqual(sel.surface, SURFACE_DEPARTMENT_OVERVIEW)

    def test_precedence_faq_beats_department_intent(self) -> None:
        sel = select_surface(
            intent=INTENT_DEPARTMENT_OVERVIEW,
            entities={"department": "CSE"},
            faq_matched=True,
        )
        self.assertEqual(sel.surface, SURFACE_FAQ)

    def test_requested_card_beats_intent(self) -> None:
        sel = select_surface(
            intent=INTENT_DOCUMENTS,
            local_intent={"trigger": "principal_profile"},
        )
        self.assertEqual(sel.surface, SURFACE_PRINCIPAL)
        self.assertEqual(sel.source, "requested_card")

    def test_exactly_one_surface(self) -> None:
        sel = select_surface(intent=INTENT_DEPARTMENT_FEES, entities={"department": "CSE"})
        self.assertIsInstance(sel.surface, str)
        self.assertNotIn(",", sel.surface or "")

    def test_card_trigger_hints_delegates(self) -> None:
        hints = card_trigger_hints(INTENT_TRUSTEES_PROFILE, {})
        self.assertEqual(hints["showCard"], SURFACE_TRUSTEES)

    def test_presentation_resolver_consumes_trustees_not_college(self) -> None:
        res = ConversationResolution()
        decision = PolicyDecision(
            action=PolicyAction.CARD_PRESENTATION,
            answer_source="intent",
            length_kind="presentation",
        )
        resolve_presentation(
            decision=decision,
            resolution=res,
            intent=INTENT_TRUSTEES_PROFILE,
            semantic_topic=None,
            entities={},
        )
        self.assertEqual(res.show_card, SURFACE_TRUSTEES)
        self.assertEqual(res.presentation_mode, PresentationMode.CARD_PRESENTATION.value)

    def test_faq_presentation_no_show_card(self) -> None:
        res = ConversationResolution()
        decision = PolicyDecision(
            action=PolicyAction.DIRECT_RESPONSE,
            answer_source="faq",
            length_kind="short",
        )
        resolve_presentation(
            decision=decision,
            resolution=res,
            intent="NORMAL_QUERY",
            semantic_topic=None,
            entities={},
            faq_matched=True,
        )
        self.assertEqual(res.presentation_mode, PresentationMode.DIRECT_FAQ.value)
        self.assertIsNone(res.show_card)


if __name__ == "__main__":
    unittest.main()
