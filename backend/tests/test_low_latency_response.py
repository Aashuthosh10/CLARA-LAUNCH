import asyncio
import unittest
from unittest.mock import AsyncMock, patch

from backend.app import main


class _FakeWebSocket:
    def __init__(self) -> None:
        self.events: list[dict] = []

    async def send_json(self, payload: dict) -> None:
        self.events.append(payload)


class _SlowFakeWebSocket:
    def __init__(self) -> None:
        self.events: list[dict] = []
        self.active_sends = 0
        self.max_active_sends = 0

    async def send_json(self, payload: dict) -> None:
        self.active_sends += 1
        self.max_active_sends = max(self.max_active_sends, self.active_sends)
        await asyncio.sleep(0)
        self.events.append(payload)
        self.active_sends -= 1


async def _no_auto_language(*_args, **_kwargs) -> None:
    return None


def _streaming_audio_payloads(payloads: list[dict]) -> list[dict]:
    return [
        payload
        for payload in payloads
        if payload.get("type") == "assistant_audio_update" and payload.get("tts_streaming") is True
    ]


def _first_streaming_audio_payload(payloads: list[dict]) -> dict | None:
    streams = _streaming_audio_payloads(payloads)
    return streams[0] if streams else None


def _first_sentence_audio_payloads(payloads: list[dict]) -> list[dict]:
    return [payload for payload in payloads if payload.get("type") == "assistant_first_sentence_audio"]


def _low_latency_test_session() -> dict:
    return {
        "messages": [],
        "language_code_key": "en",
        "language_name": "English",
        "language_code": "en-IN",
        "session_generation": 0,
        "wire_seq": 0,
        "ws_send_lock": asyncio.Lock(),
    }


def _unwrap_payloads(events: list[dict]) -> list[dict]:
    return [event["payload"] for event in events]


def _final_assistant_audio_payload(payloads: list[dict]) -> dict:
    finals = [
        p
        for p in payloads
        if p.get("type") == "assistant_audio_update" and p.get("tts_streaming") is False
    ]
    if not finals:
        raise AssertionError("expected a final assistant_audio_update with tts_streaming=False")
    return finals[-1]


class LowLatencyResponseTests(unittest.IsolatedAsyncioTestCase):
    async def test_visible_answer_is_sent_before_tts_audio_update(self) -> None:
        session = _low_latency_test_session()
        ws = _FakeWebSocket()
        timing = main.TurnTiming()
        fake_audio = "UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA="
        tts_calls: list[dict] = []

        async def _fake_tts(text: str, language_code: str, **kwargs):
            tts_calls.append({"text": text, "language_code": language_code, **kwargs})
            return fake_audio, False

        with patch.object(main, "LOW_LATENCY_VOICE_MODE", True), patch.object(
            main, "ENABLE_ACK_EARCON", False
        ), patch.object(main, "ENABLE_EARLY_PARTIAL_TEXT", False), patch.object(
            main, "maybe_auto_detect_session_language", new=AsyncMock(side_effect=_no_auto_language)
        ), patch.object(main, "split_tts_chunks", return_value=["first chunk", "second chunk"]), patch.object(
            main, "tts_to_base64_cached", new=AsyncMock(side_effect=_fake_tts)
        ):
            await main.process_user_text_and_reply(session, "admission documents", ws, timing)

        payloads = _unwrap_payloads(ws.events)
        visible = next(payload for payload in payloads if payload.get("audioPending") is True)
        streaming_payloads = _streaming_audio_payloads(payloads)
        first_stream = _first_streaming_audio_payload(payloads)
        final_audio = _final_assistant_audio_payload(payloads)

        self.assertFalse(visible["isProcessing"])
        self.assertTrue(visible["audioPending"])
        self.assertNotIn("audioBase64", visible)
        self.assertIsNotNone(first_stream)
        self.assertEqual(first_stream["turn_id"], visible["turn_id"])
        self.assertEqual(first_stream["audioBase64"], fake_audio)
        self.assertFalse(first_stream["audioPending"])
        self.assertGreaterEqual(first_stream["tts_total_duration_estimate_ms"], 2500)
        self.assertGreater(first_stream["tts_total_chars"], 0)
        self.assertGreaterEqual(len(streaming_payloads), 2)
        self.assertNotIn("tts_total_duration_estimate_ms", streaming_payloads[1])
        self.assertEqual(_first_sentence_audio_payloads(payloads), [])
        self.assertNotIn("assistant_first_sentence", [call.get("utterance_kind") for call in tts_calls])
        self.assertFalse(final_audio["audioPending"])
        self.assertIsNotNone(visible["debug"]["timings_ms"].get("visible_answer_ms"))

    async def test_tts_timeout_keeps_visible_answer_and_releases_audio_pending(self) -> None:
        session = _low_latency_test_session()
        ws = _FakeWebSocket()
        timing = main.TurnTiming()

        async def _slow_tts(*_args, **_kwargs):
            await asyncio.sleep(1.0)
            return None, False

        with patch.object(main, "LOW_LATENCY_VOICE_MODE", True), patch.object(
            main, "AUDIO_UPDATE_TIMEOUT_S", 0.01
        ), patch.object(main, "split_tts_chunks", return_value=["one"]), patch.object(
            main, "ENABLE_ACK_EARCON", False
        ), patch.object(main, "ENABLE_EARLY_PARTIAL_TEXT", False), patch.object(
            main, "maybe_auto_detect_session_language", new=AsyncMock(side_effect=_no_auto_language)
        ), patch.object(main, "tts_to_base64_cached", new=AsyncMock(side_effect=_slow_tts)):
            await main.process_user_text_and_reply(session, "admission documents", ws, timing)

        payloads = _unwrap_payloads(ws.events)
        visible = next(payload for payload in payloads if payload.get("audioPending") is True)
        audio_update = _final_assistant_audio_payload(payloads)

        self.assertTrue(visible["messages"][-1]["text"])
        self.assertEqual(audio_update.get("type"), "assistant_audio_update")
        self.assertFalse(audio_update["isSpeaking"])
        self.assertFalse(audio_update["audioPending"])
        self.assertTrue(audio_update["audioUnavailable"])

    async def test_ws_send_json_serializes_concurrent_sends(self) -> None:
        session = {
            "session_generation": 0,
            "wire_seq": 0,
            "ws_send_lock": asyncio.Lock(),
        }
        ws = _SlowFakeWebSocket()

        await asyncio.gather(
            main._ws_send_json(ws, 5, session, {"kind": "a"}),
            main._ws_send_json(ws, 5, session, {"kind": "b"}),
        )

        self.assertEqual(ws.max_active_sends, 1)
        self.assertEqual(len(ws.events), 2)
        self.assertEqual([event["payload"]["wire_seq"] for event in ws.events], [1, 2])

    async def test_chunk_failure_falls_back_to_single_clip_retry(self) -> None:
        session = _low_latency_test_session()
        ws = _FakeWebSocket()
        timing = main.TurnTiming()
        retry_audio = "UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA="
        tts_calls: list[dict] = []

        async def _fake_tts(text: str, language_code: str, **kwargs):
            tts_calls.append({"text": text, "language_code": language_code, **kwargs})
            kind = kwargs.get("utterance_kind", "")
            if kind == "assistant_full_reply_retry":
                return retry_audio, False
            return None, False

        with patch.object(main, "LOW_LATENCY_VOICE_MODE", True), patch.object(
            main, "ENABLE_ACK_EARCON", False
        ), patch.object(main, "ENABLE_EARLY_PARTIAL_TEXT", False), patch.object(
            main, "maybe_auto_detect_session_language", new=AsyncMock(side_effect=_no_auto_language)
        ), patch.object(
            main,
            "split_tts_chunks",
            return_value=["chunk one", "chunk two", "chunk three"],
        ), patch.object(
            main, "tts_to_base64_cached", new=AsyncMock(side_effect=_fake_tts)
        ):
            await main.process_user_text_and_reply(session, "admission documents", ws, timing)

        payloads = _unwrap_payloads(ws.events)
        streaming_payloads = _streaming_audio_payloads(payloads)
        utterance_kinds = [p.get("utterance_kind") for p in streaming_payloads]

        self.assertIn("assistant_full_reply_retry", utterance_kinds)
        retry_payload = next(
            p for p in streaming_payloads if p.get("utterance_kind") == "assistant_full_reply_retry"
        )
        self.assertEqual(retry_payload["audioBase64"], retry_audio)
        self.assertFalse(retry_payload["audioPending"])

        self.assertNotIn("assistant_tts_failsafe", utterance_kinds)
        retry_kinds_called = [
            call.get("utterance_kind") for call in tts_calls
        ]
        self.assertIn("assistant_full_reply_retry", retry_kinds_called)
        self.assertNotIn("assistant_tts_failsafe", retry_kinds_called)

    async def test_ws_send_json_falls_back_when_lock_contended(self) -> None:
        class _StallingFakeWebSocket:
            def __init__(self) -> None:
                self.events: list[dict] = []
                self.first_call = True

            async def send_json(self, payload: dict) -> None:
                if self.first_call:
                    self.first_call = False
                    await asyncio.sleep(1.0)
                self.events.append(payload)

        session = {
            "session_generation": 0,
            "wire_seq": 0,
            "ws_send_lock": asyncio.Lock(),
        }
        ws = _StallingFakeWebSocket()

        async def _send_b_after_grace() -> float:
            # Give the first sender a head-start so it owns the lock.
            await asyncio.sleep(0.05)
            t0 = asyncio.get_event_loop().time()
            await main._ws_send_json(ws, 5, session, {"kind": "b"})
            return asyncio.get_event_loop().time() - t0

        with self.assertLogs("backend.app.main", level="WARNING") as captured:
            t_start = asyncio.get_event_loop().time()
            results = await asyncio.gather(
                main._ws_send_json(ws, 5, session, {"kind": "a"}),
                _send_b_after_grace(),
            )
            t_total = asyncio.get_event_loop().time() - t_start

        b_elapsed = results[1]

        self.assertLess(
            b_elapsed,
            0.85,
            f"second sender should not wait full 1s; waited {b_elapsed:.3f}s",
        )
        self.assertGreaterEqual(t_total, 1.0)
        self.assertEqual(len(ws.events), 2)
        self.assertTrue(
            any("ws_send_lock contention" in record for record in captured.output),
            f"expected ws_send_lock contention warning, got {captured.output!r}",
        )


if __name__ == "__main__":
    unittest.main()
