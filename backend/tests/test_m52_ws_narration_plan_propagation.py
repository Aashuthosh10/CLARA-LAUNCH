"""M5.2 — WS must propagate PresentationBundle narration_plan (unitIds intact).

Regression: bundle path sets narration_segments=None; plan must still appear on
assistant_audio_update interim/final frames ChatScreen consumes.
"""

from __future__ import annotations

import asyncio
import unittest
from unittest.mock import AsyncMock, patch

from backend.app import main
from backend.services.answer_generation import INTENT_DEPARTMENT_OVERVIEW, INTENT_HOD_PROFILE
from backend.services.content.types import SURFACE_DEPARTMENT_OVERVIEW
from backend.services.orchestration.narration_resolver import resolve_narration
from backend.services.orchestration.presentation_bundle import build_presentation_bundle
from backend.services.orchestration.types import ConversationResolution, PresentationMode
from backend.services.narration_plan import finalize_segment_list


class _FakeWebSocket:
    def __init__(self) -> None:
        self.events: list[dict] = []

    async def send_json(self, payload: dict) -> None:
        self.events.append(payload)


def _session() -> dict:
    return {
        "messages": [],
        "language_code_key": "en",
        "language_name": "English",
        "language_code": "en-IN",
        "session_generation": 0,
        "wire_seq": 0,
        "ws_send_lock": asyncio.Lock(),
    }


def _unwrap(events: list[dict]) -> list[dict]:
    return [e["payload"] for e in events if isinstance(e.get("payload"), dict)]


def _unit_ids(plan: dict | None) -> list[str]:
    if not isinstance(plan, dict):
        return []
    segs = plan.get("segments") or []
    out: list[str] = []
    for s in segs:
        if isinstance(s, dict) and isinstance(s.get("unitId"), str) and s["unitId"].strip():
            out.append(s["unitId"].strip())
    return out


async def _no_auto_language(*_a, **_k) -> None:
    return None


async def _empty_rag(*_a, **_k):
    return "", "none"


class TestM52WsNarrationPlanPropagation(unittest.IsolatedAsyncioTestCase):
    async def _run_card_turn(self, user_text: str) -> list[dict]:
        session = _session()
        ws = _FakeWebSocket()
        timing = main.TurnTiming()
        fake_audio = "UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA="

        async def _fake_tts(text: str, language_code: str, **kwargs):
            return fake_audio, False

        with patch.object(main, "LOW_LATENCY_VOICE_MODE", True), patch.object(
            main, "ENABLE_ACK_EARCON", False
        ), patch.object(main, "ENABLE_EARLY_PARTIAL_TEXT", False), patch.object(
            main, "ENABLE_FIRST_SENTENCE_TTS", False
        ), patch.object(main, "FORCE_FINAL_TTS_ONLY", False), patch.object(
            main, "maybe_auto_detect_session_language", new=AsyncMock(side_effect=_no_auto_language)
        ), patch.object(main, "get_relevant_context", new=AsyncMock(side_effect=_empty_rag)), patch.object(
            main, "_load_svit_json_context", new=lambda _k: ""
        ), patch.object(main, "tts_to_base64_cached", new=AsyncMock(side_effect=_fake_tts)), patch.object(
            main, "_log_turn_metrics", new=lambda *a, **k: None
        ):
            await main.process_user_text_and_reply(session, user_text, ws, timing)
        return _unwrap(ws.events)

    def _assert_plan_on_audio_frames(self, payloads: list[dict], expected_units: list[str]) -> None:
        audio_frames = [
            p
            for p in payloads
            if p.get("type") == "assistant_audio_update"
            and (p.get("tts_streaming") is True or p.get("tts_streaming") is False)
        ]
        self.assertGreaterEqual(len(audio_frames), 1, msg="expected assistant_audio_update frames")

        # First streaming frame (or sole final) must carry the plan for ChatScreen staging.
        streaming = [p for p in audio_frames if p.get("tts_streaming") is True]
        carrier = streaming[0] if streaming else audio_frames[-1]
        plan = carrier.get("narration_plan")
        self.assertIsInstance(plan, dict)
        self.assertEqual(plan.get("mode"), "card_narration")
        self.assertEqual(_unit_ids(plan), expected_units)

        # Final frame must also retain plan (FE replaces payload each update).
        finals = [p for p in audio_frames if p.get("tts_streaming") is False]
        self.assertGreaterEqual(len(finals), 1)
        final_plan = finals[-1].get("narration_plan")
        self.assertEqual(_unit_ids(final_plan if isinstance(final_plan, dict) else None), expected_units)

    async def test_tell_me_about_cse_ws_preserves_five_unit_ids(self) -> None:
        payloads = await self._run_card_turn("Tell me about CSE")
        self._assert_plan_on_audio_frames(
            payloads,
            [
                "cse.overview",
                "cse.hod",
                "cse.achievements",
                "cse.placements",
                "cse.fees",
            ],
        )

    async def test_aiml_ds_hod_ws_preserves_two_unit_ids(self) -> None:
        payloads = await self._run_card_turn("Who is the HOD of AIML and Data Science?")
        self._assert_plan_on_audio_frames(
            payloads,
            ["cse_aiml.hod", "cse_ds.hod"],
        )

    def test_bundle_path_with_narration_segments_none_still_exposes_plan(self) -> None:
        """Unit-level: authoritative bundle plan survives when narration_segments is None."""
        res = ConversationResolution(
            language="English",
            language_code_key="en",
            tts_code="en-IN",
            intent=INTENT_DEPARTMENT_OVERVIEW,
            show_card=SURFACE_DEPARTMENT_OVERVIEW,
            card_surface=SURFACE_DEPARTMENT_OVERVIEW,
            should_generate_presentation=True,
            presentation_mode=PresentationMode.CARD_PRESENTATION.value,
            department_label="CSE",
        )
        segs = resolve_narration(
            resolution=res,
            entities={"department": "CSE"},
            user_text="Tell me about CSE",
        )
        self.assertIsNotNone(segs)
        assert segs is not None
        finalize_segment_list("ws-prop", segs)
        bundle = build_presentation_bundle(resolution=res, segments=segs, turn_id="ws-prop")
        plan = bundle.narration_plan_payload("ws-prop")
        narration_segments = None  # production bundle path
        visible_payload: dict = {"narration_plan": plan}

        # Mirror the fixed merge gate (not narration_segments).
        merged: dict = {}
        if narration_segments:
            merged["narration_plan"] = None  # would be the old broken path
        plan_out = visible_payload.get("narration_plan")
        if isinstance(plan_out, dict) and plan_out.get("mode") == "card_narration":
            merged["narration_plan"] = plan_out

        self.assertIsNone(narration_segments)
        self.assertEqual(
            _unit_ids(merged.get("narration_plan")),
            [
                "cse.overview",
                "cse.hod",
                "cse.achievements",
                "cse.placements",
                "cse.fees",
            ],
        )


if __name__ == "__main__":
    unittest.main()
