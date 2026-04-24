import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient
from starlette.websockets import WebSocketDisconnect

from backend.app.main import app
from backend.security import ws_auth


class TestWebSocketIntegration(unittest.TestCase):
    def test_rejects_unauthorized_handshake(self) -> None:
        with patch.object(ws_auth, "WS_ALLOWED_ORIGINS", ["http://localhost:5173"]), patch.object(
            ws_auth, "WS_AUTH_REQUIRED", True
        ), patch.object(ws_auth, "WS_AUTH_TOKEN", "test-token"), patch.object(
            ws_auth, "WS_TOKEN_SIGNING_SECRET", ""
        ):
            client = TestClient(app)
            with self.assertRaises(WebSocketDisconnect):
                with client.websocket_connect("/ws/clara", headers={"origin": "http://localhost:5173"}):
                    pass

    def test_accepts_authorized_handshake_and_sends_initial_state(self) -> None:
        with patch.object(ws_auth, "WS_ALLOWED_ORIGINS", ["http://localhost:5173"]), patch.object(
            ws_auth, "WS_AUTH_REQUIRED", True
        ), patch.object(ws_auth, "WS_AUTH_TOKEN", "test-token"), patch.object(
            ws_auth, "WS_TOKEN_SIGNING_SECRET", ""
        ):
            client = TestClient(app)
            with client.websocket_connect(
                "/ws/clara?token=test-token",
                headers={"origin": "http://localhost:5173"},
            ) as websocket:
                msg = websocket.receive_json()
                self.assertEqual(msg.get("state"), 0)

    def test_invalid_message_payload_returns_safe_error(self) -> None:
        with patch.object(ws_auth, "WS_ALLOWED_ORIGINS", ["http://localhost:5173"]), patch.object(
            ws_auth, "WS_AUTH_REQUIRED", True
        ), patch.object(ws_auth, "WS_AUTH_TOKEN", "test-token"), patch.object(
            ws_auth, "WS_TOKEN_SIGNING_SECRET", ""
        ):
            client = TestClient(app)
            with client.websocket_connect(
                "/ws/clara?token=test-token",
                headers={"origin": "http://localhost:5173"},
            ) as websocket:
                websocket.receive_json()  # initial state=0
                websocket.send_text("not-json")
                msg = websocket.receive_json()
                self.assertEqual(msg.get("state"), 5)
                payload = msg.get("payload", {})
                self.assertEqual(payload.get("errorCode"), "INVALID_MESSAGE")
                self.assertEqual(payload.get("message"), "Invalid request payload.")


if __name__ == "__main__":
    unittest.main()
