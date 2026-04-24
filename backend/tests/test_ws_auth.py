import base64
import hashlib
import hmac
import json
import time
import unittest
from unittest.mock import patch

from backend.security import ws_auth


class _FakeWebSocket:
    def __init__(self, headers: dict[str, str] | None = None, query_params: dict[str, str] | None = None) -> None:
        self.headers = headers or {}
        self.query_params = query_params or {}


class TestWsAuth(unittest.TestCase):
    def test_rejects_missing_token_when_required(self) -> None:
        ws = _FakeWebSocket(headers={"origin": "http://localhost:5173"})
        with patch.object(ws_auth, "WS_ALLOWED_ORIGINS", ["http://localhost:5173"]), patch.object(
            ws_auth, "WS_AUTH_REQUIRED", True
        ), patch.object(ws_auth, "WS_AUTH_TOKEN", "abc123"), patch.object(ws_auth, "WS_TOKEN_SIGNING_SECRET", ""):
            ok, reason = ws_auth.validate_websocket_handshake(ws)
        self.assertFalse(ok)
        self.assertEqual(reason, "unauthorized")

    def test_accepts_shared_token_query_param(self) -> None:
        ws = _FakeWebSocket(
            headers={"origin": "http://localhost:5173"},
            query_params={"token": "abc123"},
        )
        with patch.object(ws_auth, "WS_ALLOWED_ORIGINS", ["http://localhost:5173"]), patch.object(
            ws_auth, "WS_AUTH_REQUIRED", True
        ), patch.object(ws_auth, "WS_AUTH_TOKEN", "abc123"), patch.object(ws_auth, "WS_TOKEN_SIGNING_SECRET", ""):
            ok, reason = ws_auth.validate_websocket_handshake(ws)
        self.assertTrue(ok)
        self.assertEqual(reason, "ok")

    def test_rejects_invalid_origin(self) -> None:
        ws = _FakeWebSocket(headers={"origin": "https://evil.example"}, query_params={"token": "abc123"})
        with patch.object(ws_auth, "WS_ALLOWED_ORIGINS", ["http://localhost:5173"]), patch.object(
            ws_auth, "WS_AUTH_REQUIRED", True
        ), patch.object(ws_auth, "WS_AUTH_TOKEN", "abc123"), patch.object(ws_auth, "WS_TOKEN_SIGNING_SECRET", ""):
            ok, reason = ws_auth.validate_websocket_handshake(ws)
        self.assertFalse(ok)
        self.assertEqual(reason, "forbidden_origin")

    def test_accepts_valid_signed_token(self) -> None:
        secret = "signing-secret"
        payload = {"exp": int(time.time()) + 120}
        payload_b64 = base64.urlsafe_b64encode(json.dumps(payload).encode("utf-8")).decode("utf-8").rstrip("=")
        sig = hmac.new(secret.encode("utf-8"), payload_b64.encode("utf-8"), hashlib.sha256).hexdigest()
        token = f"{payload_b64}.{sig}"
        ws = _FakeWebSocket(headers={"origin": "http://localhost:5173"}, query_params={"token": token})
        with patch.object(ws_auth, "WS_ALLOWED_ORIGINS", ["http://localhost:5173"]), patch.object(
            ws_auth, "WS_AUTH_REQUIRED", True
        ), patch.object(ws_auth, "WS_AUTH_TOKEN", ""), patch.object(ws_auth, "WS_TOKEN_SIGNING_SECRET", secret):
            ok, reason = ws_auth.validate_websocket_handshake(ws)
        self.assertTrue(ok)
        self.assertEqual(reason, "ok")


if __name__ == "__main__":
    unittest.main()
