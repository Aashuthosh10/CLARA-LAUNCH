import unittest
from unittest.mock import patch

from backend.app.ws_schemas import (
    WS_AUXILIARY_TEXT_MAX_CHARS,
    WS_MESSAGE_MAX_BYTES,
    WS_USER_TEXT_MAX_CHARS,
    parse_inbound_ws_message,
)


class TestWsSchemas(unittest.TestCase):
    def test_accepts_valid_user_message(self) -> None:
        msg, err = parse_inbound_ws_message('{"action":"user_message","text":"hello"}')
        self.assertIsNone(err)
        self.assertEqual(msg["action"], "user_message")
        self.assertEqual(msg["text"], "hello")

    def test_accepts_event_alias(self) -> None:
        msg, err = parse_inbound_ws_message('{"event":"wake"}')
        self.assertIsNone(err)
        self.assertEqual(msg["action"], "wake")

    def test_rejects_non_json_payload(self) -> None:
        msg, err = parse_inbound_ws_message("not-json")
        self.assertIsNone(msg)
        self.assertEqual(err, "invalid_json")

    def test_rejects_missing_action(self) -> None:
        msg, err = parse_inbound_ws_message('{"foo":"bar"}')
        self.assertIsNone(msg)
        self.assertEqual(err, "missing_action")

    def test_rejects_unknown_action(self) -> None:
        msg, err = parse_inbound_ws_message('{"action":"unknown_action"}')
        self.assertIsNone(msg)
        self.assertEqual(err, "invalid_action")

    def test_rejects_invalid_language_selected_payload(self) -> None:
        msg, err = parse_inbound_ws_message('{"action":"language_selected"}')
        self.assertIsNone(msg)
        self.assertEqual(err, "invalid_payload")

    def test_accepts_reset_session_and_home(self) -> None:
        for action in ("reset_session", "home"):
            msg, err = parse_inbound_ws_message(f'{{"action":"{action}"}}')
            self.assertIsNone(err)
            self.assertEqual(msg["action"], action)

    def test_accepts_language_gate_prompt(self) -> None:
        msg, err = parse_inbound_ws_message('{"action":"language_gate_prompt"}')
        self.assertIsNone(err)
        self.assertEqual(msg["action"], "language_gate_prompt")

    def test_accepts_cancel_turn(self) -> None:
        msg, err = parse_inbound_ws_message('{"action":"cancel_turn"}')
        self.assertIsNone(err)
        self.assertEqual(msg["action"], "cancel_turn")

    def test_accepts_campus_navigation_tts_with_extra_fields(self) -> None:
        msg, err = parse_inbound_ws_message(
            '{"action":"campus_navigation_tts","text":"Go straight","language":"English","turn_id":"campus-1"}'
        )
        self.assertIsNone(err)
        self.assertEqual(msg["action"], "campus_navigation_tts")
        self.assertEqual(msg["text"], "Go straight")

    def test_message_below_and_at_byte_limit_are_accepted(self) -> None:
        base = '{"action":"wake"}'
        for size in (WS_MESSAGE_MAX_BYTES - 1, WS_MESSAGE_MAX_BYTES):
            raw = base + (" " * (size - len(base)))
            msg, err = parse_inbound_ws_message(raw)
            self.assertIsNone(err)
            self.assertEqual(msg["action"], "wake")

    def test_oversized_message_is_rejected_before_json_parsing(self) -> None:
        raw = " " * (WS_MESSAGE_MAX_BYTES + 1)
        with patch("backend.app.ws_schemas.json.loads") as loads:
            msg, err = parse_inbound_ws_message(raw)
        self.assertIsNone(msg)
        self.assertEqual(err, "message_too_large")
        loads.assert_not_called()

    def test_user_text_limit_and_multilingual_text(self) -> None:
        exact = "ನ" * WS_USER_TEXT_MAX_CHARS
        msg, err = parse_inbound_ws_message(
            '{"action":"user_message","text":"' + exact + '"}'
        )
        self.assertIsNone(err)
        self.assertEqual(msg["text"], exact)

        _, err = parse_inbound_ws_message(
            '{"action":"user_message","text":"' + ("x" * (WS_USER_TEXT_MAX_CHARS + 1)) + '"}'
        )
        self.assertEqual(err, "invalid_payload")

    def test_navigation_text_and_local_intent_are_bounded(self) -> None:
        _, err = parse_inbound_ws_message(
            '{"action":"campus_navigation_tts","text":"'
            + ("x" * (WS_AUXILIARY_TEXT_MAX_CHARS + 1))
            + '"}'
        )
        self.assertEqual(err, "invalid_payload")

        _, err = parse_inbound_ws_message(
            '{"action":"user_message","text":"CSE","localIntent":{"nodes":[]}}'
        )
        self.assertEqual(err, "invalid_payload")


if __name__ == "__main__":
    unittest.main()
