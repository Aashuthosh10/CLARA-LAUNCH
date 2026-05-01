import asyncio
import unittest
from unittest.mock import AsyncMock, patch

from backend.app import main


class _FakeWebSocket:
    def __init__(self) -> None:
        self.events: list[dict] = []

    async def send_json(self, payload: dict) -> None:
        self.events.append(payload)


async def _no_auto_language(*_args, **_kwargs) -> None:
    return None


class LowLatencyResponseTests(unittest.IsolatedAsyncioTestCase):
    async def test_visible_answer_is_sent_before_tts_audio_update(self) -> None:
        session = {"messages": [], "language_code_key": "en", "language_name": "English", "language_code": "en-IN"}
        ws = _FakeWebSocket()
        timing = main.TurnTiming()
        fake_audio = "UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA="

        with patch.object(main, "LOW_LATENCY_VOICE_MODE", True), patch.object(
            main, "ENABLE_ACK_EARCON", False
        ), patch.object(main, "ENABLE_EARLY_PARTIAL_TEXT", False), patch.object(
            main, "maybe_auto_detect_session_language", new=AsyncMock(side_effect=_no_auto_language)
        ), patch.object(main, "tts_to_base64_cached", new=AsyncMock(return_value=(fake_audio, False))):
            await main.process_user_text_and_reply(session, "admission documents", ws, timing)

        payloads = [event["payload"] for event in ws.events]
        visible = next(payload for payload in payloads if payload.get("audioPending") is True)
        audio_update = next(payload for payload in payloads if payload.get("type") == "assistant_audio_update")

        self.assertFalse(visible["isProcessing"])
        self.assertTrue(visible["audioPending"])
        self.assertNotIn("audioBase64", visible)
        self.assertEqual(audio_update["turn_id"], visible["turn_id"])
        self.assertEqual(audio_update["audioBase64"], fake_audio)
        self.assertFalse(audio_update["audioPending"])
        self.assertIsNotNone(visible["debug"]["timings_ms"].get("visible_answer_ms"))

    async def test_tts_timeout_keeps_visible_answer_and_releases_audio_pending(self) -> None:
        session = {"messages": [], "language_code_key": "en", "language_name": "English", "language_code": "en-IN"}
        ws = _FakeWebSocket()
        timing = main.TurnTiming()

        async def _slow_tts(*_args, **_kwargs):
            await asyncio.sleep(1.0)
            return "never-used", False

        with patch.object(main, "LOW_LATENCY_VOICE_MODE", True), patch.object(
            main, "AUDIO_UPDATE_TIMEOUT_S", 0.01
        ), patch.object(main, "ENABLE_ACK_EARCON", False), patch.object(
            main, "ENABLE_EARLY_PARTIAL_TEXT", False
        ), patch.object(
            main, "maybe_auto_detect_session_language", new=AsyncMock(side_effect=_no_auto_language)
        ), patch.object(main, "tts_to_base64_cached", new=AsyncMock(side_effect=_slow_tts)):
            await main.process_user_text_and_reply(session, "admission documents", ws, timing)

        payloads = [event["payload"] for event in ws.events]
        visible = next(payload for payload in payloads if payload.get("audioPending") is True)
        audio_update = payloads[-1]

        self.assertTrue(visible["messages"][-1]["text"])
        self.assertEqual(audio_update.get("type"), "assistant_audio_update")
        self.assertFalse(audio_update["isSpeaking"])
        self.assertFalse(audio_update["audioPending"])
        self.assertTrue(audio_update["audioUnavailable"])


if __name__ == "__main__":
    unittest.main()
