"""Smoke tests that narration payloads include ordered segment metadata."""

import unittest
from unittest.mock import AsyncMock, patch

from backend.app import main
from backend.services.answer_generation import INTENT_COLLEGE_OVERVIEW
from backend.services.narration_plan import (
    NarrationSegment,
    chunk_plan_with_card_index,
    finalize_segment_list,
    post_llm_chunk_plan,
)


class TestNarrationSegmentOrdering(unittest.TestCase):
    def test_chunk_order_stable(self) -> None:
        segs = post_llm_chunk_plan("First. Second. Third.")
        self.assertGreaterEqual(len(segs), 1)
        finalize_segment_list("tid", segs)
        texts = [s.display_text.strip() for s in segs]
        self.assertEqual(len(texts), len(segs))
        merged = "\n".join(texts).lower()
        self.assertTrue("first" in merged or "third" in merged)

    def test_public_dict_compatible_with_frontend(self) -> None:
        s = NarrationSegment(display_text="Hello", card_index=2, card_id="placement")
        finalize_segment_list("t99", [s])
        pub = s.public_dict()
        self.assertEqual(pub.get("displayText"), "Hello")
        self.assertEqual(pub.get("cardIndex"), 2)

    def test_chunk_plan_indices_match_enumeration(self) -> None:
        segs = chunk_plan_with_card_index("A.\n\nB.", card_id="x")
        self.assertGreaterEqual(len(segs), 1)
        for i, s in enumerate(segs):
            self.assertEqual(s.card_index, i)


class _FakeNarrationWs:
    def __init__(self) -> None:
        self.events: list[dict] = []

    async def send_json(self, envelope: dict) -> None:
        pl = envelope.get("payload") if isinstance(envelope, dict) else None
        self.events.append(pl if isinstance(pl, dict) else envelope)


class _Feat:
    department_name = None
    is_fee_query = False


class TestNarrationPlanWsOrdering(unittest.IsolatedAsyncioTestCase):
    async def test_narration_plan_then_segment_audio_in_order(self) -> None:
        session = {
            "messages": [],
            "language_name": "English",
            "language_key": "en",
            "session_generation": 0,
        }
        ws = _FakeNarrationWs()
        timing = main.TurnTiming()
        pre_segs = [
            NarrationSegment(
                display_text="Slide A",
                card_index=0,
                card_id="college",
            ),
            NarrationSegment(
                display_text="Slide B",
                card_index=1,
                card_id="college",
            ),
        ]

        async def _fake_tts(text: str, language_code: str, **kwargs) -> tuple[str, bool]:
            return "UklGRiQAAABXQVZFZm10", False

        with patch.object(main, "get_faq_answer_for_question", return_value=None), patch.object(
            main, "LOW_LATENCY_VOICE_MODE", False
        ), patch.object(main, "ENABLE_NARRATION_PLAN", True), patch.object(
            main, "ENABLE_ACK_EARCON", False
        ), patch.object(
            main, "build_pre_llm_narration_plan", return_value=pre_segs
        ), patch.object(
            main, "maybe_auto_detect_session_language", new=AsyncMock(return_value=None)
        ), patch.object(
            main, "_stream_groq_reply", new=AsyncMock(return_value=("ignored", None))
        ), patch.object(
            main, "tts_to_base64_cached", new=AsyncMock(side_effect=_fake_tts)
        ), patch.object(
            main, "_log_turn_metrics", new=lambda *a, **k: None
        ), patch.object(
            main, "extract_features", return_value=_Feat(),
        ), patch.object(
            main, "resolve_intent_from_features", return_value=INTENT_COLLEGE_OVERVIEW
        ), patch.object(main, "_turn_stale", return_value=False):
            await main.process_user_text_and_reply(session, "college overview", ws, timing, stt_meta=None)

        types = [p.get("type") for p in ws.events if isinstance(p, dict)]
        self.assertIn("narration_plan", types)
        seg_ix = [i for i, t in enumerate(types) if t == "segment_audio"]
        plan_ix = types.index("narration_plan")
        self.assertTrue(seg_ix, "expected segment_audio frames")
        self.assertTrue(all(i > plan_ix for i in seg_ix))
        seg_payloads = [p for p in ws.events if p.get("type") == "segment_audio"]
        self.assertEqual(seg_payloads[0].get("cardIndex"), 0)
        self.assertEqual(seg_payloads[-1].get("cardIndex"), 1)


if __name__ == "__main__":
    unittest.main()
