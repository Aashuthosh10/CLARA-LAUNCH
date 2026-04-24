import unittest

from backend.app.ws_schemas import parse_inbound_ws_message


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


if __name__ == "__main__":
    unittest.main()
