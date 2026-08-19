"""Tests for turn finalization (Milestone 3.5)."""

from __future__ import annotations

import unittest

from backend.services.runtime.context import freeze_localization, get_runtime_context
from backend.services.runtime.localization import is_language_frozen
from backend.services.runtime.turn_finalizer import (
    finalize_turn,
    is_turn_finalized,
    reject_if_finalized,
    reject_late_callback,
)


class TurnFinalizationTests(unittest.TestCase):
    def _session(self) -> dict:
        return {
            "language_code_key": "en",
            "language_name": "English",
            "language": "English",
            "session_generation": 1,
        }

    def test_finalize_releases_localization(self):
        session = self._session()
        freeze_localization(session)
        self.assertTrue(is_language_frozen(session))
        ok = finalize_turn(
            session,
            turn_id="turn-1",
            authority="GROQ",
            language="English",
        )
        self.assertTrue(ok)
        self.assertTrue(is_turn_finalized(session, "turn-1"))
        self.assertFalse(is_language_frozen(session))
        ctx = get_runtime_context(session)
        self.assertEqual(ctx.finalized_turn_id, "turn-1")
        self.assertIsNone(ctx.active_presentation_id)
        self.assertEqual(ctx.runtime_state, "idle")

    def test_finalize_idempotent(self):
        session = self._session()
        self.assertTrue(finalize_turn(session, turn_id="turn-2", authority="FAQ"))
        self.assertTrue(finalize_turn(session, turn_id="turn-2", authority="FAQ"))
        self.assertTrue(is_turn_finalized(session, "turn-2"))

    def test_late_callback_rejected(self):
        session = self._session()
        finalize_turn(session, turn_id="turn-3", authority="CARD_PRESENTATION", presentation_id="p1")
        self.assertTrue(reject_if_finalized(session, "turn-3", reason="late_tts"))
        self.assertTrue(reject_if_finalized(session, "turn-3", reason="late_groq"))
        self.assertTrue(reject_if_finalized(session, "turn-3", reason="duplicate_narration"))
        self.assertTrue(reject_if_finalized(session, "turn-3", reason="duplicate_audio"))
        self.assertTrue(reject_if_finalized(session, "turn-3", reason="duplicate_captions"))
        # Different turn not finalized
        self.assertFalse(reject_if_finalized(session, "turn-other", reason="late_tts"))

    def test_reject_late_callback_ownership(self):
        session = self._session()
        freeze_localization(session)
        ctx = get_runtime_context(session)
        ctx.turn_id = "turn-4"
        ctx.generation = 2
        ctx.active_presentation_id = "pres-a"
        # Not finalized yet — matching tokens pass
        self.assertFalse(
            reject_late_callback(
                session,
                turn_id="turn-4",
                reason="tts",
                presentation_id="pres-a",
                generation=2,
            )
        )
        finalize_turn(session, turn_id="turn-4", presentation_id="pres-a")
        self.assertTrue(
            reject_late_callback(
                session,
                turn_id="turn-4",
                reason="late_narration",
                presentation_id="pres-a",
                generation=2,
            )
        )


if __name__ == "__main__":
    unittest.main()
