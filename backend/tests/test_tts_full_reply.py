import base64
import io
import unittest
import wave
from unittest.mock import AsyncMock, patch

from backend import main


class _FakeWebSocket:
    def __init__(self) -> None:
        self.events: list[dict] = []

    async def send_json(self, payload: dict) -> None:
        self.events.append(payload)


class TestTtsFullReply(unittest.IsolatedAsyncioTestCase):
    @staticmethod
    def _silent_wav_base64(duration_s: float = 2.2, sample_rate: int = 16000) -> str:
        frames = int(duration_s * sample_rate)
        pcm = b"\x00\x00" * frames
        buf = io.BytesIO()
        with wave.open(buf, "wb") as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(sample_rate)
            wf.writeframes(pcm)
        return base64.b64encode(buf.getvalue()).decode("utf-8")

    async def test_full_reply_is_used_for_tts_not_first_sentence_fragment(self) -> None:
        session = {"messages": []}
        ws = _FakeWebSocket()
        timing = main.TurnTiming()
        full_reply = (
            "Our library is open from 8 AM to 8 PM on weekdays. "
            "On Saturdays it is open from 9 AM to 5 PM."
        )
        first_sentence = "Our library is open from 8 AM to 8 PM on weekdays."
        tts_calls: list[dict] = []
        fake_audio = self._silent_wav_base64(duration_s=2.2)

        async def _fake_tts(text: str, language_code: str, **kwargs):
            tts_calls.append({"text": text, "language_code": language_code, **kwargs})
            return fake_audio, False

        with patch.object(main, "maybe_auto_detect_session_language", new=AsyncMock(return_value=None)), patch.object(
            main, "get_relevant_context", new=lambda _text, _k: ""
        ), patch.object(
            main, "_stream_groq_reply", new=AsyncMock(return_value=(full_reply, first_sentence))
        ), patch.object(
            main, "tts_to_base64_cached", new=AsyncMock(side_effect=_fake_tts)
        ), patch.object(
            main, "_log_turn_metrics", new=lambda *args, **kwargs: None
        ):
            await main.process_user_text_and_reply(session, "What are library timings?", ws, timing, stt_meta=None)

        self.assertEqual(len(tts_calls), 1, "TTS should be called exactly once per reply")
        self.assertEqual(tts_calls[0]["text"], full_reply)
        self.assertEqual(tts_calls[0].get("utterance_kind"), "assistant_full_reply")

        payloads = [e.get("payload", {}) for e in ws.events if isinstance(e, dict)]
        self.assertFalse(
            any(p.get("type") == "assistant_first_sentence_audio" for p in payloads),
            "First-sentence audio payload must not be emitted",
        )
        final_payload = payloads[-1]
        self.assertEqual(final_payload.get("audioBase64"), fake_audio)
        self.assertEqual(final_payload.get("messages", [])[-1].get("text"), full_reply)
        play_ms = timing.summary_ms().get("play_ms")
        self.assertIsNotNone(play_ms)
        self.assertGreater(float(play_ms or 0.0), 2000.0)


if __name__ == "__main__":
    unittest.main()
