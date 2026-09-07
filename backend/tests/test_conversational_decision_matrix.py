from __future__ import annotations

import unittest

from backend.services.content.semantic_request_parser import parse_semantic_request
from backend.services.conversation.pending_clarification import (
    PendingClarification,
    try_resolve_pending,
)
from backend.services.conversation.restricted_requests import restricted_evidence
from backend.services.conversation.response_decision import resolve_response_decision
from backend.services.conversation.thinking_bridge import (
    compose_thinking_bridge,
    conversational_action_for_turn,
)
from backend.services.conversation.templates import (
    clarification_reply,
    restricted_fallback_reply,
)


class TestConversationalDecisionMatrix(unittest.IsolatedAsyncioTestCase):
    async def _ci(self, text: str, **kwargs):
        from backend.services.conversation.pipeline import run_conversation_intelligence

        return await run_conversation_intelligence(
            text,
            language_name="English",
            language_code_key="en",
            **kwargs,
        )

    async def test_principal_answer_thinking(self) -> None:
        intel = await self._ci("Who is the principal?")
        self.assertEqual(intel.response_decision.mode.value, "CARD")
        action = conversational_action_for_turn(
            response_mode="CARD",
            policy_action=intel.decision.action.value,
        )
        think = compose_thinking_bridge(
            "Who is the principal?",
            "en",
            semantic_request=intel.semantic_request,
            conversational_action=action,
        )
        self.assertIn("principal", (think or "").lower())
        self.assertNotIn("department head", (think or "").lower())

    async def test_data_science_fee_answer_thinking(self) -> None:
        intel = await self._ci("What is the fee for Data Science?")
        self.assertEqual(intel.response_decision.mode.value, "CARD")
        think = compose_thinking_bridge(
            "What is the fee for Data Science?",
            "en",
            semantic_request=intel.semantic_request,
            conversational_action="answer",
        )
        self.assertRegex((think or "").lower(), r"fee")
        self.assertRegex(think or "", r"Data Science|CSE")

    async def test_ambiguous_admissions_clarifies(self) -> None:
        intel = await self._ci("I want to do admissions.")
        self.assertEqual(intel.response_decision.mode.value, "CLARIFY")
        self.assertEqual(intel.response_decision.clarification_target, "admissions_info")
        self.assertIn("documents", (intel.decision.reply_text or "").lower())
        think = compose_thinking_bridge(
            "I want to do admissions.",
            "en",
            conversational_action="clarify",
            clarification_target="admissions_info",
        )
        self.assertIn("admission", (think or "").lower())
        self.assertNotIn("bring together the details about admissions", (think or "").lower())

    async def test_fee_without_context_clarifies(self) -> None:
        intel = await self._ci("What is the fee?")
        self.assertEqual(intel.response_decision.mode.value, "CLARIFY")
        self.assertEqual(intel.response_decision.clarification_target, "department")

    async def test_fee_with_context_answers(self) -> None:
        intel = await self._ci(
            "What is the fee?",
            last_semantic_entities=("cse_ds",),
        )
        self.assertEqual(intel.response_decision.mode.value, "CARD")
        self.assertIn(("cse_ds", "fees"), intel.semantic_request.unit_items)

    async def test_placements_with_context(self) -> None:
        intel = await self._ci(
            "What about placements?",
            last_semantic_entities=("cse_ds",),
        )
        self.assertIn(("cse_ds", "placements"), intel.semantic_request.unit_items)

    async def test_principal_mobile_is_restricted_fallback(self) -> None:
        intel = await self._ci("Give me the principal's mobile number.")
        self.assertEqual(intel.response_decision.mode.value, "FALLBACK")
        self.assertEqual(intel.response_decision.evidence, "restricted_personal_contact")
        self.assertIn("admission block", (intel.decision.reply_text or "").lower())
        self.assertNotIn("tell me", (intel.decision.reply_text or "").lower())
        think = compose_thinking_bridge(
            "Give me the principal's mobile number.",
            "en",
            conversational_action="fallback",
        )
        self.assertIn("right place", (think or "").lower())

    async def test_payment_scanner_is_restricted_fallback(self) -> None:
        intel = await self._ci("I want to make the payment, where is the scanner?")
        self.assertEqual(intel.response_decision.mode.value, "FALLBACK")
        self.assertEqual(intel.response_decision.evidence, "restricted_payment")
        self.assertIn("admission block", (intel.decision.reply_text or "").lower())

    async def test_unheard_is_repeat_no_thinking(self) -> None:
        intel = await self._ci("uh")
        self.assertEqual(intel.decision.action.value, "NO_SPEECH_RETRY")
        action = conversational_action_for_turn(
            response_mode=None,
            policy_action="NO_SPEECH_RETRY",
        )
        self.assertEqual(action, "repeat")
        self.assertIsNone(
            compose_thinking_bridge("uh", "en", conversational_action="repeat")
        )

    async def test_clarification_resolution_and_expiry(self) -> None:
        from backend.services.orchestration.conversation_orchestrator import (
            ConversationOrchestrator,
        )

        orch = ConversationOrchestrator()
        session: dict = {}
        first = await orch.run("I want to do admissions.", session, defer_narration=True)
        self.assertEqual(first.resolution.response_mode, "CLARIFY")
        self.assertIsNotNone(session.get("pending_clarification"))

        second = await orch.run("The documents.", session, defer_narration=True)
        self.assertEqual(second.resolution.response_mode, "CARD")
        self.assertEqual(second.resolution.show_card, "documents")
        self.assertIsNone(session.get("pending_clarification"))

        session2: dict = {}
        await orch.run("How can I do admissions over here?", session2, defer_narration=True)
        third = await orch.run("Actually tell me about buses.", session2, defer_narration=True)
        self.assertIsNone(session2.get("pending_clarification"))
        # Must not stay stuck on admissions clarification.
        self.assertNotEqual(
            getattr(third.resolution, "clarification_target", None),
            "admissions_info",
        )


class TestRestrictedAndTemplates(unittest.TestCase):
    def test_restricted_detectors(self) -> None:
        self.assertEqual(
            restricted_evidence("principal mobile number"),
            "restricted_personal_contact",
        )
        self.assertEqual(
            restricted_evidence("where is the scanner for payment"),
            "restricted_payment",
        )
        self.assertIsNone(restricted_evidence("Who is the principal?"))

    def test_template_language(self) -> None:
        self.assertIn("documents", clarification_reply("English", "admissions_info").lower())
        self.assertIn("admission block", restricted_fallback_reply("English", "restricted_payment").lower())
        self.assertRegex(restricted_fallback_reply("Hindi", "restricted_personal_contact"), r"[\u0900-\u097F]")


if __name__ == "__main__":
    unittest.main()
