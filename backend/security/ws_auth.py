"""Minimal WebSocket auth/origin validation for CLARA."""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import logging
import time
from typing import Any

from fastapi import WebSocket

from backend.config.settings import (
    WS_ALLOWED_ORIGINS,
    WS_AUTH_REQUIRED,
    WS_AUTH_TOKEN,
    WS_TOKEN_SIGNING_SECRET,
)

logger = logging.getLogger(__name__)

_SIGNED_TOKEN_TTL_SECONDS = 300


def _extract_bearer_token(auth_header: str | None) -> str | None:
    if not auth_header:
        return None
    prefix = "bearer "
    header = auth_header.strip()
    if not header.lower().startswith(prefix):
        return None
    token = header[len(prefix) :].strip()
    return token or None


def _verify_hmac_signed_token(token: str) -> bool:
    """
    Signed token format:
      base64url(payload_json).hex_hmac_sha256
    payload_json must include {"exp": <unix epoch seconds>}
    """
    if not WS_TOKEN_SIGNING_SECRET:
        return False
    try:
        payload_b64, provided_sig = token.split(".", 1)
    except ValueError:
        return False
    if not payload_b64 or not provided_sig:
        return False
    expected_sig = hmac.new(
        WS_TOKEN_SIGNING_SECRET.encode("utf-8"),
        payload_b64.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    if not hmac.compare_digest(provided_sig, expected_sig):
        return False
    try:
        padded = payload_b64 + "=" * ((4 - len(payload_b64) % 4) % 4)
        payload_bytes = base64.urlsafe_b64decode(padded.encode("utf-8"))
        payload: dict[str, Any] = json.loads(payload_bytes.decode("utf-8"))
        exp = int(payload.get("exp", 0))
    except Exception:
        return False
    now = int(time.time())
    if exp <= now:
        return False
    if (exp - now) > _SIGNED_TOKEN_TTL_SECONDS:
        # Defensive: reject unusually long-lived tokens for this minimal layer.
        return False
    return True


def validate_websocket_handshake(websocket: WebSocket) -> tuple[bool, str]:
    """
    Validate origin and token before websocket.accept().
    Returns (True, "ok") on success else (False, safe_error_reason).
    """
    origin = (websocket.headers.get("origin") or "").strip()
    if WS_ALLOWED_ORIGINS and origin not in WS_ALLOWED_ORIGINS:
        return False, "forbidden_origin"

    if not WS_AUTH_REQUIRED:
        return True, "ok"

    header_token = _extract_bearer_token(websocket.headers.get("authorization"))
    query_token = (websocket.query_params.get("token") or "").strip() or None
    presented = header_token or query_token

    if not presented:
        return False, "unauthorized"
    if WS_AUTH_TOKEN and hmac.compare_digest(presented, WS_AUTH_TOKEN):
        return True, "ok"
    if _verify_hmac_signed_token(presented):
        return True, "ok"
    return False, "unauthorized"


def log_ws_auth_configuration_warnings() -> None:
    if not WS_AUTH_REQUIRED:
        logger.warning("WS auth is disabled (WS_AUTH_REQUIRED=false). This is insecure.")
        return
    if not WS_AUTH_TOKEN and not WS_TOKEN_SIGNING_SECRET:
        logger.warning(
            "WS auth is enabled but no WS_AUTH_TOKEN/WS_TOKEN_SIGNING_SECRET configured; all WS handshakes will be rejected."
        )
