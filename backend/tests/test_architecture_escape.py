"""Architecture escape tests — permanent regression suite (Milestone 3.6)."""

from __future__ import annotations

import ast
import unittest
from pathlib import Path

from backend.services.orchestration.architecture_linter import run_architecture_lint
from backend.services.orchestration.emit_gate import (
    assert_can_emit,
    require_live_turn,
    safe_deterministic_fallback_resolution,
    seal_out_of_band_deterministic,
)
from backend.services.orchestration.outbound_builder import build_template_outbound
from backend.services.orchestration.response_authority import ResponseAuthority, seal_authority
from backend.services.orchestration.types import ConversationResolution, PresentationMode
from backend.services.runtime.conversation_snapshot import get_last_conversation_snapshot
from backend.services.runtime.turn_finalizer import finalize_turn, is_turn_finalized, reject_if_finalized


_BACKEND = Path(__file__).resolve().parents[1]
_MAIN = _BACKEND / "app" / "main.py"


class StaticEscapeTests(unittest.TestCase):
    def test_main_has_no_narration_builder(self):
        src = _MAIN.read_text(encoding="utf-8")
        self.assertNotIn("build_pre_llm_narration_plan", src)

    def test_main_uses_deterministic_fallback_not_legacy_null(self):
        src = _MAIN.read_text(encoding="utf-8")
        self.assertIn("safe_deterministic_fallback_resolution", src)
        self.assertNotIn("continuing with legacy pipeline", src)

    def test_architecture_linter_clean(self):
        result = run_architecture_lint()
        self.assertTrue(result.ok, msg=result.violations)
        self.assertEqual(result.metrics["legacy_narration_paths_in_main"], 0)
        self.assertEqual(result.metrics["outbound_response_builders"], 1)
        self.assertEqual(result.metrics["response_authority_selectors"], 1)
        self.assertEqual(result.metrics["presentation_bundle_builders"], 1)
        self.assertEqual(result.metrics["narration_builders_production"], 1)
        self.assertEqual(result.metrics["runtime_finalizers"], 1)
        self.assertEqual(result.metrics["content_unit_registry_owners"], 1)
        self.assertEqual(result.metrics["content_unit_resolver_owners"], 1)
        self.assertEqual(result.metrics["presentation_plan_builders"], 1)
        self.assertEqual(result.metrics["presentation_policy_owners"], 1)
        self.assertEqual(result.metrics["architecture_violations"], 0)


class AuthorityGateTests(unittest.TestCase):
    def test_groq_blocked_when_faq(self):
        session = {"language_code_key": "en", "language_name": "English"}
        res = ConversationResolution(
            language="English",
            language_code_key="en",
            tts_code="en-IN",
            presentation_mode=PresentationMode.DIRECT_FAQ.value,
        )
        seal_authority(res, authority=ResponseAuthority.FAQ)
        self.assertTrue(require_live_turn(session, "t1", res))
        self.assertTrue(assert_can_emit(resolution=res, action="emit_faq"))
        self.assertFalse(assert_can_emit(resolution=res, action="emit_groq"))
        self.assertFalse(assert_can_emit(resolution=res, action="emit_card"))

    def test_card_requires_bundle_for_emit_path(self):
        session = {"language_code_key": "en", "language_name": "English"}
        res = ConversationResolution(
            language="English",
            language_code_key="en",
            tts_code="en-IN",
            presentation_mode=PresentationMode.CARD_PRESENTATION.value,
            should_generate_presentation=True,
        )
        # Without bundle, select may still pick CARD provisionally; seal with GROQ degrade path
        seal_authority(res, authority=ResponseAuthority.GROQ, force=True)
        self.assertFalse(assert_can_emit(resolution=res, action="emit_card"))

    def test_orchestrator_failure_fallback_seals_deterministic(self):
        session = {"language_code_key": "en", "language_name": "English"}
        res = safe_deterministic_fallback_resolution(session, reason="test_fail")
        self.assertTrue(res.authority_sealed)
        self.assertEqual(res.response_authority, ResponseAuthority.DETERMINISTIC.value)
        self.assertTrue(assert_can_emit(resolution=res, action="emit_template"))
        self.assertFalse(assert_can_emit(resolution=res, action="emit_groq"))


class SnapshotFinalizeTests(unittest.TestCase):
    def test_finalize_stores_snapshot(self):
        session = {"language_code_key": "en", "language_name": "English"}
        res = seal_out_of_band_deterministic(session, reply_text="Hello", answer_source="test")
        outbound = build_template_outbound(text="Hello", resolution=res)
        self.assertEqual(outbound.assistant_text, "Hello")
        ok = finalize_turn(
            session,
            turn_id="turn-snap",
            response_source="template",
            resolution=res,
        )
        self.assertTrue(ok)
        self.assertTrue(is_turn_finalized(session, "turn-snap"))
        snap = get_last_conversation_snapshot(session)
        self.assertIsNotNone(snap)
        assert snap is not None
        self.assertEqual(snap.authority, ResponseAuthority.DETERMINISTIC.value)
        self.assertEqual(snap.response_source, "template")
        self.assertTrue(reject_if_finalized(session, "turn-snap", reason="late"))


if __name__ == "__main__":
    unittest.main()
