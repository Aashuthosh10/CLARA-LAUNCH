"""M5.3 — unit-backed TTS emits N clip slots; failed index stays on the wire; no backup."""

from __future__ import annotations

import asyncio
import unittest
from unittest.mock import AsyncMock, patch

from backend.app import main


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
        "awaiting_guest_name": False,
    }


def _unwrap(events: list[dict]) -> list[dict]:
    return [e["payload"] for e in events if isinstance(e.get("payload"), dict)]


def _streaming(payloads: list[dict]) -> list[dict]:
    return [
        p
        for p in payloads
        if p.get("type") == "assistant_audio_update" and p.get("tts_streaming") is True
    ]


async def _no_auto_language(*_a, **_k) -> None:
    return None


async def _empty_rag(*_a, **_k):
    return "", "none"


WAV = "UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA="
THREE_HOD = "Who are the HODs of AIML, Data Science and CSE?"


class TestM53TtsClipSlots(unittest.IsolatedAsyncioTestCase):
    async def _run(self, fake_tts) -> tuple[list[dict], list[dict]]:
        session = _session()
        ws = _FakeWebSocket()
        timing = main.TurnTiming()
        tts_calls: list[dict] = []

        async def _wrapped(text: str, language_code: str, **kwargs):
            tts_calls.append({"text": text, "language_code": language_code, **kwargs})
            return await fake_tts(text, language_code, **kwargs)

        with patch.object(main, "LOW_LATENCY_VOICE_MODE", True), patch.object(
            main, "ENABLE_ACK_EARCON", False
        ), patch.object(main, "ENABLE_EARLY_PARTIAL_TEXT", False), patch.object(
            main, "ENABLE_FIRST_SENTENCE_TTS", False
        ), patch.object(main, "FORCE_FINAL_TTS_ONLY", False), patch.object(
            main, "maybe_auto_detect_session_language", new=AsyncMock(side_effect=_no_auto_language)
        ), patch.object(main, "get_relevant_context", new=AsyncMock(side_effect=_empty_rag)), patch.object(
            main, "_load_svit_json_context", new=lambda _k: ""
        ), patch.object(main, "tts_to_base64_cached", new=AsyncMock(side_effect=_wrapped)), patch.object(
            main, "_log_turn_metrics", new=lambda *a, **k: None
        ):
            await main.process_user_text_and_reply(session, THREE_HOD, ws, timing)
        return _unwrap(ws.events), tts_calls

    async def test_failed_middle_clip_still_emits_three_indexed_frames(self) -> None:
        async def _fake_tts(text: str, language_code: str, **kwargs):
            kind = str(kwargs.get("utterance_kind") or "")
            if kind.endswith("_chunk_2"):
                return None, False
            if kind == "assistant_full_reply_backup":
                return WAV, False
            return WAV, False

        payloads, tts_calls = await self._run(_fake_tts)
        streaming = _streaming(payloads)
        self.assertGreaterEqual(len(streaming), 3, msg="expected one streaming frame per segment")
        by_index = {p.get("tts_chunk_index"): p for p in streaming}
        self.assertIn(0, by_index)
        self.assertIn(1, by_index)
        self.assertIn(2, by_index)
        self.assertTrue(by_index[2].get("audioUnavailable"))
        self.assertNotIn("audioBase64", by_index[2])
        self.assertFalse(by_index[0].get("audioUnavailable"))
        kinds = [c.get("utterance_kind") for c in tts_calls]
        self.assertNotIn("assistant_full_reply_backup", kinds)
        chunk_calls = [c for c in tts_calls if str(c.get("utterance_kind") or "").endswith("_chunk_0") or str(c.get("utterance_kind") or "").endswith("_chunk_1") or str(c.get("utterance_kind") or "").endswith("_chunk_2")]
        self.assertTrue(chunk_calls)
        for call in chunk_calls:
            self.assertIs(call.get("allow_english_fallback"), False)

    async def test_timeout_on_clip_still_emits_slot(self) -> None:
        async def _fake_tts(text: str, language_code: str, **kwargs):
            kind = str(kwargs.get("utterance_kind") or "")
            if kind.endswith("_chunk_1"):
                raise asyncio.TimeoutError()
            return WAV, False

        payloads, tts_calls = await self._run(_fake_tts)
        streaming = _streaming(payloads)
        by_index = {p.get("tts_chunk_index"): p for p in streaming}
        self.assertIn(0, by_index)
        self.assertIn(1, by_index)
        self.assertIn(2, by_index)
        self.assertTrue(by_index[1].get("audioUnavailable"))
        self.assertNotIn("assistant_full_reply_backup", [c.get("utterance_kind") for c in tts_calls])

    async def test_unit_backed_success_does_not_call_full_reply_backup(self) -> None:
        async def _fake_tts(text: str, language_code: str, **kwargs):
            return WAV, False

        _payloads, tts_calls = await self._run(_fake_tts)
        kinds = [c.get("utterance_kind") for c in tts_calls]
        self.assertNotIn("assistant_full_reply_backup", kinds)


class TestTtsEnglishFallbackGate(unittest.IsolatedAsyncioTestCase):
    async def test_allow_english_fallback_false_skips_en_in(self) -> None:
        langs: list[str] = []

        async def _sarvam(_text: str, language_code: str):
            langs.append(language_code)
            return None

        with patch.object(main, "sarvam_tts_to_base64", new=AsyncMock(side_effect=_sarvam)), patch.object(
            main, "TTS_CACHE"
        ) as cache:
            cache.get.return_value = None
            audio, hit = await main.tts_to_base64_cached(
                "unique-fallback-gate-text",
                "kn-IN",
                allow_english_fallback=False,
            )
        self.assertIsNone(audio)
        self.assertFalse(hit)
        self.assertEqual(langs, ["kn-IN"])


if __name__ == "__main__":
    unittest.main()
