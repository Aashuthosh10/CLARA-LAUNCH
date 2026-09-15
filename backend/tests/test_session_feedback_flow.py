"""Session closing + feedback lifecycle tests."""

from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import AsyncMock, patch

from backend.services.conversation.closing_reply import (
    classify_closing_reply,
    classify_direct_thanks_utterance,
    classify_feedback_utterance,
    infer_feedback_rating,
)
from backend.services.feedback_store import append_feedback_record
from backend.services.greetings import (
    get_feedback_request,
    get_thanks_closing_confirmation,
)


class DirectThanksTests(unittest.TestCase):
    def test_pure_thanks_asks_confirmation(self) -> None:
        self.assertEqual(classify_direct_thanks_utterance("Thank you for the help."), "CLOSE_CONFIRM")
        self.assertEqual(classify_direct_thanks_utterance("Thanks, that's all."), "CLOSE_CONFIRM")
        self.assertEqual(classify_direct_thanks_utterance("Thanks that is all"), "CLOSE_CONFIRM")
        self.assertEqual(classify_direct_thanks_utterance("that is all"), "CLOSE_CONFIRM")
        self.assertEqual(classify_direct_thanks_utterance("No more questions"), "CLOSE_CONFIRM")
        self.assertEqual(classify_direct_thanks_utterance("I am done"), "CLOSE_CONFIRM")
        self.assertEqual(classify_direct_thanks_utterance("I'm finished"), "CLOSE_CONFIRM")
        self.assertEqual(classify_direct_thanks_utterance("That will be all"), "CLOSE_CONFIRM")
        self.assertEqual(classify_direct_thanks_utterance("That is all, thank you."), "CLOSE_CONFIRM")

    def test_thanks_with_new_question_continues(self) -> None:
        self.assertEqual(
            classify_direct_thanks_utterance("Thanks. What about placements?"),
            "CONTINUE",
        )
        self.assertEqual(
            classify_direct_thanks_utterance("Thank you. Can you also tell me about hostel facilities?"),
            "CONTINUE",
        )


class FeedbackClassifyTests(unittest.TestCase):
    def test_valid_and_vague(self) -> None:
        self.assertEqual(classify_feedback_utterance("Very good, I really liked it."), "VALID")
        self.assertEqual(classify_feedback_utterance("It was confusing."), "VALID")
        self.assertEqual(classify_feedback_utterance("Okay."), "VAGUE")
        self.assertEqual(infer_feedback_rating("chennagittu"), "positive")


class FeedbackStoreTests(unittest.TestCase):
    def test_append_jsonl_survives(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "clara_feedback.jsonl"
            append_feedback_record(
                feedback="Very good",
                language="English",
                session_id="sess-1",
                rating="positive",
                path=path,
            )
            append_feedback_record(
                feedback="It was confusing",
                language="English",
                session_id="sess-2",
                rating="negative",
                path=path,
            )
            lines = path.read_text(encoding="utf-8").strip().splitlines()
            self.assertEqual(len(lines), 2)
            first = json.loads(lines[0])
            self.assertEqual(first["feedback"], "Very good")
            self.assertEqual(first["session_id"], "sess-1")
            self.assertIn("timestamp", first)


class ClosingStillWorks(unittest.TestCase):
    def test_no_thanks_close(self) -> None:
        self.assertEqual(classify_closing_reply("No thanks"), "CLOSE")
        self.assertEqual(classify_closing_reply("Actually tell me about hostels"), "CONTINUE")

    def test_prompts_localized(self) -> None:
        from backend.services.greetings import get_feedback_acknowledgement

        self.assertIn("welcome", get_thanks_closing_confirmation("English").lower())
        request = get_feedback_request("English").lower()
        self.assertIn("before you go", request)
        self.assertIn("feedback", request)
        self.assertIn("conversation", request)
        ack = get_feedback_acknowledgement("English").lower()
        self.assertIn("precious time", ack)
        self.assertIn("feedback", ack)
        self.assertTrue(get_feedback_request("Kannada"))


class ClosingGateFeedbackIntegration(unittest.IsolatedAsyncioTestCase):
    async def test_close_moves_to_feedback_not_farewell(self) -> None:
        from backend.app import main as main_mod

        session: dict = {
            "language_name": "English",
            "language_code_key": "en",
            "awaiting_closing_reply": True,
            "messages": [],
            "session_id": "test-session",
        }
        websocket = AsyncMock()
        timing = main_mod.TurnTiming(turn_id="t-close")
        with patch.object(main_mod, "_emit_direct_conversation_reply", new_callable=AsyncMock) as emit:
            handled = await main_mod._handle_closing_reply_gate(
                session, "No thanks", websocket, timing, 0
            )
            self.assertTrue(handled)
            self.assertTrue(session.get("awaiting_feedback"))
            self.assertFalse(session.get("awaiting_closing_reply"))
            emit.assert_awaited()
            kwargs = emit.await_args.kwargs
            self.assertEqual(kwargs.get("utterance_kind"), "session_feedback_request")

    async def test_second_closing_prompt_moves_to_feedback(self) -> None:
        from backend.app import main as main_mod

        session: dict = {
            "language_name": "English",
            "language_code_key": "en",
            "closing_prompt_issued": True,
            "awaiting_closing_reply": True,
            "messages": [],
            "session_id": "test-session-2",
        }
        websocket = AsyncMock()
        timing = main_mod.TurnTiming(turn_id="t-close-2")
        with patch.object(main_mod, "_emit_direct_conversation_reply", new_callable=AsyncMock) as emit:
            await main_mod._handle_session_closing_prompt(session, websocket, timing, 0)
            self.assertTrue(session.get("awaiting_feedback"))
            self.assertFalse(session.get("awaiting_closing_reply"))
            kwargs = emit.await_args.kwargs
            self.assertEqual(kwargs.get("utterance_kind"), "session_feedback_request")

    async def test_feedback_persists_then_ends(self) -> None:
        from backend.app import main as main_mod

        session: dict = {
            "language_name": "English",
            "language_code_key": "en",
            "awaiting_feedback": True,
            "messages": [],
            "session_id": "test-fb",
        }
        websocket = AsyncMock()
        timing = main_mod.TurnTiming(turn_id="t-fb")
        with (
            patch.object(main_mod, "_emit_direct_conversation_reply", new_callable=AsyncMock) as emit,
            patch("backend.services.feedback_store.append_feedback_record") as store,
        ):
            handled = await main_mod._handle_feedback_gate(
                session, "Very good, the system was helpful.", websocket, timing, 0
            )
            self.assertTrue(handled)
            store.assert_called_once()
            kwargs = emit.await_args.kwargs
            self.assertEqual(kwargs.get("utterance_kind"), "session_feedback_ack")
            self.assertTrue((kwargs.get("payload_extra") or {}).get("session_should_end"))


class DirectThanksPolicyIntegration(unittest.IsolatedAsyncioTestCase):
    async def test_i_am_done_is_closing_not_name(self) -> None:
        from backend.services.conversation.pipeline import run_conversation_intelligence

        result = await run_conversation_intelligence(
            "I am done",
            language_name="English",
            language_code_key="en",
            groq_client=None,
        )
        self.assertEqual(result.decision.answer_source, "policy_thanks_closing")
        self.assertTrue(result.decision.session_updates.get("awaiting_closing_reply"))


if __name__ == "__main__":
    unittest.main()
