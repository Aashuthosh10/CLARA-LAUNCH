import asyncio
import unittest
from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

from backend.app import main
from backend.security import ws_auth


def _minimal_wav() -> bytes:
    return (
        b"RIFF$\x00\x00\x00WAVEfmt "
        b"\x10\x00\x00\x00\x01\x00\x01\x00\x80>\x00\x00\x00}\x00\x00\x02\x00\x10\x00"
        b"data\x00\x00\x00\x00"
    )


class _FakeWebSocket:
    def __init__(self) -> None:
        self.events: list[dict] = []

    async def send_json(self, payload: dict) -> None:
        self.events.append(payload)


async def _no_auto_language(*_args, **_kwargs) -> None:
    return None


class ProviderFailurePathTests(unittest.IsolatedAsyncioTestCase):
    def _connect_client(self) -> TestClient:
        return TestClient(main.app)

    def test_stt_timeout_returns_recoverable_error(self) -> None:
        with patch.object(ws_auth, "WS_ALLOWED_ORIGINS", ["http://localhost:5176"]), patch.object(
            ws_auth, "WS_AUTH_REQUIRED", False
        ), patch.object(main, "record_audio", return_value=(_minimal_wav(), None, {"duration_ms": 100.0})), patch.object(
            main, "sarvam_stt_from_wav", new=AsyncMock(side_effect=asyncio.TimeoutError)
        ):
            client = self._connect_client()
            with client.websocket_connect("/ws/clara", headers={"origin": "http://localhost:5176"}) as websocket:
                websocket.receive_json()
                websocket.send_json({"action": "mic_start"})
                seen_error = None
                for _ in range(4):
                    msg = websocket.receive_json()
                    payload = msg.get("payload", {})
                    if payload.get("errorCode"):
                        seen_error = payload
                        break

        self.assertIsNotNone(seen_error)
        self.assertEqual(seen_error.get("errorCode"), "STT_FAILED")
        self.assertTrue(seen_error.get("recoverable"))

    def test_stt_empty_transcript_returns_retry_prompt(self) -> None:
        with patch.object(ws_auth, "WS_ALLOWED_ORIGINS", ["http://localhost:5176"]), patch.object(
            ws_auth, "WS_AUTH_REQUIRED", False
        ), patch.object(main, "record_audio", return_value=(_minimal_wav(), None, {"duration_ms": 100.0})), patch.object(
            main, "sarvam_stt_from_wav", new=AsyncMock(return_value=("", {}))
        ):
            client = self._connect_client()
            with client.websocket_connect("/ws/clara", headers={"origin": "http://localhost:5176"}) as websocket:
                websocket.receive_json()
                websocket.send_json({"action": "mic_start"})
                seen_error = None
                for _ in range(4):
                    msg = websocket.receive_json()
                    payload = msg.get("payload", {})
                    if payload.get("errorCode"):
                        seen_error = payload
                        break

        self.assertIsNotNone(seen_error)
        self.assertEqual(seen_error.get("errorCode"), "STT_EMPTY")
        self.assertIn("try again", seen_error.get("message", "").lower())

    async def test_tts_timeout_still_returns_text_response(self) -> None:
        session = {"messages": [], "language_code_key": "en", "language_name": "English", "language_code": "en-IN"}
        ws = _FakeWebSocket()
        timing = main.TurnTiming()

        with patch.object(main, "ENABLE_ACK_EARCON", False), patch.object(
            main, "maybe_auto_detect_session_language", new=AsyncMock(side_effect=_no_auto_language)
        ), patch.object(main, "normalize_and_classify_query", new=AsyncMock(return_value={})), patch.object(
            main, "_llm_detect_broad_course_intent", new=AsyncMock(return_value=False)
        ), patch.object(main, "get_relevant_context", return_value="Library timing context"), patch.object(
            main, "_stream_groq_reply", new=AsyncMock(return_value=("The library is open today.", "The library is open today."))
        ), patch.object(main, "tts_to_base64_cached", new=AsyncMock(return_value=(None, False))):
            await main.process_user_text_and_reply(session, "What are library timings?", ws, timing)

        final_payload = ws.events[-1]["payload"]
        self.assertFalse(final_payload["isProcessing"])
        self.assertFalse(final_payload["isSpeaking"])
        self.assertTrue(final_payload["audioUnavailable"])
        self.assertEqual(final_payload["messages"][-1]["text"], "The library is open today.")

    async def test_groq_timeout_returns_graceful_fallback(self) -> None:
        session = {"messages": [], "language_code_key": "en", "language_name": "English", "language_code": "en-IN"}
        ws = _FakeWebSocket()
        timing = main.TurnTiming()

        with patch.object(main, "ENABLE_ACK_EARCON", False), patch.object(
            main, "maybe_auto_detect_session_language", new=AsyncMock(side_effect=_no_auto_language)
        ), patch.object(main, "normalize_and_classify_query", new=AsyncMock(return_value={})), patch.object(
            main, "_llm_detect_broad_course_intent", new=AsyncMock(return_value=False)
        ), patch.object(main, "get_relevant_context", return_value="Some SVIT context"), patch.object(
            main, "_stream_groq_reply", new=AsyncMock(side_effect=asyncio.TimeoutError)
        ), patch.object(main, "tts_to_base64_cached", new=AsyncMock(return_value=(None, False))):
            await main.process_user_text_and_reply(session, "Tell me about library timings", ws, timing)

        final_payload = ws.events[-1]["payload"]
        self.assertFalse(final_payload["isProcessing"])
        self.assertEqual(final_payload["messages"][-1]["text"], main.get_unavailable_reply("English"))

    async def test_rag_empty_falls_back_without_crashing(self) -> None:
        session = {"messages": [], "language_code_key": "en", "language_name": "English", "language_code": "en-IN"}
        ws = _FakeWebSocket()
        timing = main.TurnTiming()

        with patch.object(main, "ENABLE_ACK_EARCON", False), patch.object(
            main, "maybe_auto_detect_session_language", new=AsyncMock(side_effect=_no_auto_language)
        ), patch.object(main, "normalize_and_classify_query", new=AsyncMock(return_value={})), patch.object(
            main, "_llm_detect_broad_course_intent", new=AsyncMock(return_value=False)
        ), patch.object(main, "get_relevant_context", return_value=""), patch.object(
            main, "_load_svit_json_context", return_value='{"library":"open"}'
        ), patch.object(main, "_stream_groq_reply", new=AsyncMock(return_value=("Fallback context answer.", "Fallback context answer."))), patch.object(
            main, "tts_to_base64_cached", new=AsyncMock(return_value=(None, False))
        ):
            await main.process_user_text_and_reply(session, "Tell me about library", ws, timing)

        final_payload = ws.events[-1]["payload"]
        self.assertFalse(final_payload["isProcessing"])
        self.assertEqual(final_payload["messages"][-1]["text"], "Fallback context answer.")


if __name__ == "__main__":
    unittest.main()
