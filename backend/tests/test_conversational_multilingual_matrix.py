"""Multilingual conversational memory + name lifecycle + decision matrix."""

from __future__ import annotations

import unittest
from unittest.mock import AsyncMock, patch

from backend.app.main import _complete_guest_name_turn, process_user_text_and_reply
from backend.app.session_state import append_session_history
from backend.services.conversation.department_history import department_keys_from_history
from backend.services.content.semantic_request_parser import parse_semantic_request
from backend.services.conversation.pending_clarification import try_resolve_pending, PendingClarification
from backend.services.conversation.restricted_requests import restricted_evidence
from backend.services.conversation.thinking_bridge import (
    compose_thinking_bridge,
    conversational_action_for_turn,
)
from backend.services.conversation.templates import clarification_reply, restricted_fallback_reply
from backend.services.greetings import (
    is_plausible_guest_name_utterance,
    looks_like_campus_query,
    normalize_guest_name,
)
from backend.services.orchestration.conversation_orchestrator import ConversationOrchestrator
from backend.services.session_language import set_session_language
from backend.utils.timing import TurnTiming

LANGS = ("en", "kn", "hi", "ta", "te", "ml", "rom_kn")
LANG_NAME = {
    "en": "English",
    "kn": "Kannada",
    "hi": "Hindi",
    "ta": "Tamil",
    "te": "Telugu",
    "ml": "Malayalam",
    "rom_kn": "Kannada",
}
CODE = {k: ("kn" if k == "rom_kn" else k) for k in LANGS}

NAMES = {
    "en": "Rahul",
    "kn": "ರಾಹುಲ್",
    "hi": "राहुल",
    "ta": "ராகுல்",
    "te": "రాహుల్",
    "ml": "രാഹുൽ",
    "rom_kn": "Rahul",
}

Q = {
    "ds": {
        "en": "Tell me about Data Science.",
        "kn": "ಡೇಟಾ ಸೈನ್ಸ್ ಬಗ್ಗೆ ಹೇಳಿ.",
        "hi": "डेटा साइंस के बारे में बताओ।",
        "ta": "டேட்டா சயின்ஸ் பற்றி சொல்லுங்கள்.",
        "te": "డేటా సైన్స్ గురించి చెప్పండి.",
        "ml": "ഡാറ്റ സയൻസി വിവരങ്ങൾ പറയൂ.",
        "rom_kn": "Data Science bagge heli.",
    },
    "placements": {
        "en": "What about placements?",
        "kn": "ಪ್ಲೇಸ್‌ಮೆಂಟ್ ಬಗ್ಗೆ?",
        "hi": "प्लेसमेंट के बारे में?",
        "ta": "பிளேஸ்மென்ட் பற்றி?",
        "te": "ప్లేస్‌మెంట్ గురించి?",
        "ml": "പ്ലേസ്മെന്റ് എന്താണ്?",
        "rom_kn": "placements bagge?",
    },
    "fee": {
        "en": "What is the fee?",
        "kn": "ಶುಲ್ಕ ಎಷ್ಟು?",
        "hi": "फीस कितनी है?",
        "ta": "கட்டணம் என்ன?",
        "te": "ఫీజు ఎంత?",
        "ml": "ഫീസ് എത്രയാണ്?",
        "rom_kn": "fee eshtu?",
    },
    "principal": {
        "en": "Who is the principal?",
        "kn": "ಪ್ರಿನ್ಸಿಪಾಲ್ ಯಾರು?",
        "hi": "प्रिंसिपल कौन हैं?",
        "ta": "முதல்வர் யார்?",
        "te": "ప్రిన్సిపాల్ ఎవరు?",
        "ml": "പ്രിൻസിപ്പൽ ആരാണ്?",
        "rom_kn": "principal yaaru?",
    },
    "him": {
        "en": "Tell me more about him.",
        "kn": "ಅವರ ಬಗ್ಗೆ ಇನ್ನಷ್ಟು ಹೇಳಿ.",
        "hi": "उनके बारे में और बताओ।",
        "ta": "அவரைப் பற்றி மேலும் சொல்லுங்கள்.",
        "te": "ఆయన గురించి మరిన్ని చెప్పండి.",
        "ml": "അദ്ദേഹത്തെക്കുറിച്ച് കൂടുതൽ പറയൂ.",
        "rom_kn": "avara bagge innu heli.",
    },
    "admissions": {
        "en": "I want to do admissions.",
        "kn": "ನಾನು ಪ್ರವೇಶ ಪಡೆಯಲು ಬಯಸುತ್ತೇನೆ.",
        "hi": "मुझे एडमिशन करना है।",
        "ta": "எனக்கு சேர்க்கை செய்ய வேண்டும்.",
        "te": "నాకు అడ్మిషన్ చేయాలి.",
        "ml": "എനിക്ക് അഡ്മിഷൻ ചെയ്യണം.",
        "rom_kn": "nanu admission madbeku.",
    },
    "documents": {
        "en": "The documents.",
        "kn": "ದಾಖಲೆಗಳು.",
        "hi": "दस्तावेज।",
        "ta": "ஆவணங்கள்.",
        "te": "పత్రాలు.",
        "ml": "രേഖകൾ.",
        "rom_kn": "documents beku.",
    },
    "mobile": {
        "en": "Give me the principal's mobile number.",
        "kn": "ಪ್ರಿನ್ಸಿಪಾಲ್ ಮೊಬೈಲ್ ನಂಬರ್ ಕೊಡಿ.",
        "hi": "प्रिंसिपल का मोबाइल नंबर दीजिए।",
        "ta": "முதல்வர் மொபைல் எண் கொடுங்கள்.",
        "te": "ప్రిన్సిపాల్ మొబైల్ నంబర్ ఇవ్వండి.",
        "ml": "പ്രിൻസിപ്പലിന്റെ മൊബൈൽ നമ്പർ തരൂ.",
        "rom_kn": "principal mobile number kodi.",
    },
    "payment": {
        "en": "Where is the payment scanner?",
        "kn": "ಪಾವತಿ ಸ್ಕ್ಯಾನರ್ ಎಲ್ಲಿದೆ?",
        "hi": "पेमेंट स्कैनर कहाँ है?",
        "ta": "பேமெண்ட் ஸ்கேனர் எங்கே?",
        "te": "పేమెంట్ స్కానర్ ఎక్కడ?",
        "ml": "പേയ്മെന്റ് സ്കാനർ എവിടെ?",
        "rom_kn": "payment scanner elli ide?",
    },
    "buses": {
        "en": "Actually, tell me about buses.",
        "kn": "ನಿಜಕ್ಕೂ ಬಸ್‌ಗಳ ಬಗ್ಗೆ ಹೇಳಿ.",
        "hi": "असल में बस के बारे में बताओ।",
        "ta": "உண்மையில் பேருந்துகளைப் பற்றி சொல்லுங்கள்.",
        "te": "నిజంగా బస్సుల గురించి చెప్పండి.",
        "ml": "യഥാർത്ഥത്തിൽ ബസുകളെക്കുറിച്ച് പറയൂ.",
        "rom_kn": "actually bus bagge heli.",
    },
}


class _FakeWS:
    async def send_json(self, payload):  # noqa: ANN001
        return None


def _fresh_awaiting(code: str) -> dict:
    import asyncio

    s: dict = {
        "session_generation": 0,
        "wire_seq": 0,
        "ws_send_lock": asyncio.Lock(),
        "messages": [],
        "history": [],
        "guest_name": None,
        "awaiting_guest_name": True,
        "guest_name_collected": False,
    }
    set_session_language(s, code, is_auto=False)
    return s


class TestGuestNameValidation(unittest.TestCase):
    def test_questions_are_not_names(self) -> None:
        for q in (
            "Tell me about Data Science.",
            "What is the fee?",
            "Who is the principal?",
            "What about placements?",
            "ಡೇಟಾ ಸೈನ್ಸ್ ಬಗ್ಗೆ ಹೇಳಿ.",
        ):
            self.assertTrue(looks_like_campus_query(q), q)
            self.assertIsNone(normalize_guest_name(q), q)
            self.assertFalse(is_plausible_guest_name_utterance(q), q)

    def test_real_names_ok(self) -> None:
        for name in NAMES.values():
            self.assertTrue(is_plausible_guest_name_utterance(name), name)
            self.assertEqual(normalize_guest_name(name), name)


class TestGuestNameRace(unittest.IsolatedAsyncioTestCase):
    async def test_stale_name_turn_does_not_capture_next_question(self) -> None:
        s = _fresh_awaiting("en")
        s["session_generation"] = 1
        with patch("backend.app.main.tts_to_base64_cached", new_callable=AsyncMock) as tts:
            tts.return_value = (None, False)
            with patch("backend.app.main._ws_send_json", new_callable=AsyncMock):
                await _complete_guest_name_turn(
                    s, "Rahul", _FakeWS(), TurnTiming(), turn_gen_marker=0
                )
                self.assertTrue(s.get("awaiting_guest_name"))
                s["session_generation"] = 2
                await process_user_text_and_reply(
                    s, "Tell me about Data Science.", _FakeWS(), TurnTiming()
                )
        self.assertNotEqual(s.get("guest_name"), "Tell me about Data Science")
        self.assertIsNone(normalize_guest_name("Tell me about Data Science."))
        self.assertIsNone(s.get("guest_name"))
        self.assertFalse(s.get("awaiting_guest_name"))
        self.assertTrue(s.get("guest_name_collected"))

    async def test_name_then_questions_persist(self) -> None:
        for key in LANGS:
            s = _fresh_awaiting(CODE[key])
            with patch("backend.app.main.tts_to_base64_cached", new_callable=AsyncMock) as tts:
                tts.return_value = (None, False)
                with patch("backend.app.main._ws_send_json", new_callable=AsyncMock):
                    s["session_generation"] = 1
                    await process_user_text_and_reply(s, NAMES[key], _FakeWS(), TurnTiming())
                    self.assertEqual(s.get("guest_name"), NAMES[key], key)
                    self.assertFalse(s.get("awaiting_guest_name"), key)

                    async def fake_run(self, text, session, **kwargs):  # noqa: ANN001
                        from backend.services.conversation.types import PolicyAction, PolicyDecision
                        from backend.services.orchestration.response_authority import ResponseAuthority
                        from backend.services.orchestration.result import OrchestratorResult
                        from backend.services.orchestration.types import (
                            ConversationResolution,
                            PresentationMode,
                        )

                        class FakeIntel:
                            decision = PolicyDecision(
                                action=PolicyAction.ASK_CLARIFICATION,
                                reply_text="clar",
                                passthrough=False,
                            )
                            assessment = type(
                                "A",
                                (),
                                {"likely_noise": False, "confidence": 1.0, "normalized_text": text},
                            )()
                            entities = type(
                                "E",
                                (),
                                {"as_session_dict": lambda self: {}, "person_name": None},
                            )()
                            intent_result = None
                            response_decision = None
                            semantic_request = None

                        res = ConversationResolution()
                        res.response_mode = "CLARIFY"
                        res.short_circuit_reply = "clar"
                        res.presentation_mode = PresentationMode.DIRECT.value
                        res.response_authority = ResponseAuthority.DETERMINISTIC.value
                        return OrchestratorResult(
                            resolution=res, intel=FakeIntel(), session_updates={}
                        )

                    with patch.object(ConversationOrchestrator, "run", fake_run):
                        s["session_generation"] = 2
                        await process_user_text_and_reply(
                            s, Q["ds"][key], _FakeWS(), TurnTiming()
                        )
                        s["session_generation"] = 3
                        await process_user_text_and_reply(
                            s, Q["placements"][key], _FakeWS(), TurnTiming()
                        )
            self.assertEqual(s.get("guest_name"), NAMES[key], key)
            self.assertFalse(s.get("awaiting_guest_name"), key)


class TestMultilingualMatrix(unittest.IsolatedAsyncioTestCase):
    async def test_ds_placements_fee_and_history_consumption(self) -> None:
        for key in LANGS:
            code = CODE[key]
            s: dict = {}
            set_session_language(s, code, is_auto=False)
            orch = ConversationOrchestrator()
            o1 = await orch.run(Q["ds"][key], s, defer_narration=True)
            append_session_history(s, "user", Q["ds"][key], max_turns=3)
            append_session_history(s, "assistant", "ok", max_turns=3)
            self.assertIsNotNone(o1.intel and o1.intel.semantic_request, key)
            self.assertIn(("cse_ds", "overview"), o1.intel.semantic_request.unit_items, key)

            o2 = await orch.run(Q["placements"][key], s, defer_narration=True)
            append_session_history(s, "user", Q["placements"][key], max_turns=3)
            append_session_history(s, "assistant", "ok", max_turns=3)
            self.assertIn(("cse_ds", "placements"), o2.intel.semantic_request.unit_items, key)

            o3 = await orch.run(Q["fee"][key], s, defer_narration=True)
            append_session_history(s, "user", Q["fee"][key], max_turns=3)
            append_session_history(s, "assistant", "ok", max_turns=3)
            self.assertIn(("cse_ds", "fees"), o3.intel.semantic_request.unit_items, key)

            # History consumption without sticky entities.
            s2: dict = {"history": list(s["history"])}
            set_session_language(s2, code, is_auto=False)
            s2.pop("last_semantic_entities", None)
            recovered = department_keys_from_history(s2, language_code_key=code)
            self.assertIn("cse_ds", recovered, key)
            sr = parse_semantic_request(
                raw_text=Q["fee"][key],
                language_code_key=code,
                ci_entities={"department_keys": list(recovered)},
            )
            # Fee alone may still need contextual gate; with history keys + followup cue:
            sr2 = parse_semantic_request(
                raw_text=Q["fee"][key],
                language_code_key=code,
                ci_entities={"department_keys": ["cse_ds"]},
            )
            self.assertIsNotNone(sr2, key)
            self.assertIn(("cse_ds", "fees"), sr2.unit_items, key)

    async def test_principal_him(self) -> None:
        for key in LANGS:
            s: dict = {}
            set_session_language(s, CODE[key], is_auto=False)
            orch = ConversationOrchestrator()
            await orch.run(Q["principal"][key], s, defer_narration=True)
            o2 = await orch.run(Q["him"][key], s, defer_narration=True)
            self.assertEqual(s.get("last_person_unit_id"), "leadership.principal", key)
            self.assertIsNotNone(o2.intel and o2.intel.semantic_request, key)
            self.assertIn(("leadership", "principal"), o2.intel.semantic_request.unit_items, key)

    async def test_admissions_clarify_and_documents(self) -> None:
        for key in LANGS:
            s: dict = {}
            set_session_language(s, CODE[key], is_auto=False)
            orch = ConversationOrchestrator()
            o1 = await orch.run(Q["admissions"][key], s, defer_narration=True)
            self.assertEqual(o1.resolution.response_mode, "CLARIFY", key)
            self.assertEqual(o1.resolution.clarification_target, "admissions_info", key)
            self.assertIsNotNone(s.get("pending_clarification"), key)
            reply = clarification_reply(LANG_NAME[CODE[key]], "admissions_info")
            self.assertTrue(reply.strip(), key)

            o2 = await orch.run(Q["documents"][key], s, defer_narration=True)
            self.assertEqual(o2.resolution.response_mode, "CARD", key)
            self.assertEqual(o2.resolution.show_card, "documents", key)
            self.assertIsNone(s.get("pending_clarification"), key)

            o3 = await orch.run(Q["principal"][key], s, defer_narration=True)
            self.assertNotEqual(
                getattr(o3.resolution, "clarification_target", None),
                "admissions_info",
                key,
            )

    async def test_restricted_and_payment(self) -> None:
        for key in LANGS:
            code = CODE[key]
            self.assertEqual(
                restricted_evidence(Q["mobile"][key]),
                "restricted_personal_contact",
                key,
            )
            self.assertEqual(
                restricted_evidence(Q["payment"][key]),
                "restricted_payment",
                key,
            )
            s: dict = {}
            set_session_language(s, code, is_auto=False)
            orch = ConversationOrchestrator()
            om = await orch.run(Q["mobile"][key], s, defer_narration=True)
            self.assertEqual(om.resolution.response_mode, "FALLBACK", key)
            self.assertNotEqual(om.resolution.response_mode, "CARD", key)
            fb = restricted_fallback_reply(LANG_NAME[code], "restricted_personal_contact")
            self.assertTrue(fb.strip(), key)
            think = compose_thinking_bridge(
                Q["mobile"][key],
                code,
                conversational_action="fallback",
            )
            self.assertTrue(think, key)
            op = await orch.run(Q["payment"][key], s, defer_narration=True)
            self.assertEqual(op.resolution.response_mode, "FALLBACK", key)

    async def test_topic_switch_no_ds_contamination(self) -> None:
        for key in LANGS:
            s: dict = {}
            set_session_language(s, CODE[key], is_auto=False)
            orch = ConversationOrchestrator()
            await orch.run(Q["ds"][key], s, defer_narration=True)
            o2 = await orch.run(Q["buses"][key], s, defer_narration=True)
            items = getattr(getattr(o2.intel, "semantic_request", None), "unit_items", None)
            if items:
                self.assertFalse(any(e == "cse_ds" for e, _ in items), key)

    async def test_no_speech_repeat(self) -> None:
        from backend.services.conversation.pipeline import run_conversation_intelligence

        for key in ("en", "kn", "hi", "ta", "te", "ml"):
            intel = await run_conversation_intelligence(
                "uh",
                language_name=LANG_NAME[key],
                language_code_key=key,
            )
            self.assertEqual(intel.decision.action.value, "NO_SPEECH_RETRY", key)
            action = conversational_action_for_turn(
                response_mode=None, policy_action="NO_SPEECH_RETRY"
            )
            self.assertEqual(action, "repeat", key)
            self.assertIsNone(
                compose_thinking_bridge("uh", key, conversational_action="repeat"),
                key,
            )


class TestPendingResolveNoEnglishRewrite(unittest.TestCase):
    def test_documents_uses_local_intent(self) -> None:
        pending = PendingClarification(
            original_query="ನಾನು ಪ್ರವೇಶ ಪಡೆಯಲು ಬಯಸುತ್ತೇನೆ.",
            clarification_target="admissions_info",
            language_code_key="kn",
        )
        res = try_resolve_pending("ದಾಖಲೆಗಳು.", pending)
        assert res is not None
        self.assertTrue(res.clear_pending)
        self.assertIsNone(res.rewritten_text)
        self.assertEqual(res.local_intent and res.local_intent.get("trigger"), "documents")
        self.assertEqual(res.selected_option, "documents")


if __name__ == "__main__":
    unittest.main()
