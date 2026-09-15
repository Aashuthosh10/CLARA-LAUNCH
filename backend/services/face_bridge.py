"""Localhost face-bridge WebSocket: relay lip-sync between main UI and facial display.

Used when the face runs as a separate Chrome --kiosk window (no window.opener).
Bind clients with ?role=main or ?role=face. Messages are JSON objects forwarded
to the opposite role. Only one connection per role is kept (newest wins).
"""

from __future__ import annotations

import logging
from typing import Any

from fastapi import WebSocket, WebSocketDisconnect

logger = logging.getLogger(__name__)

_main: WebSocket | None = None
_face: WebSocket | None = None


async def _safe_send(ws: WebSocket | None, payload: Any) -> None:
    if ws is None:
        return
    try:
        await ws.send_json(payload)
    except Exception:
        logger.debug("face-bridge send failed", exc_info=True)


async def handle_face_bridge(websocket: WebSocket, role: str) -> None:
    """Accept and relay face-channel messages for role in {main, face}."""
    global _main, _face
    role = (role or "").strip().lower()
    if role not in {"main", "face"}:
        await websocket.close(code=1008)
        return

    await websocket.accept()
    if role == "main":
        old, _main = _main, websocket
    else:
        old, _face = _face, websocket
    if old is not None and old is not websocket:
        try:
            await old.close(code=1000)
        except Exception:
            pass

    logger.info("face-bridge connected role=%s", role)

    # Re-pair both sides whenever either role (re)connects so lip-sync survives
    # one-sided Chrome reloads.
    if role == "main":
        await _safe_send(_face, {"type": "clara_face_ping"})
    else:
        await _safe_send(_main, {"type": "face_ready"})
        if _main is not None:
            await _safe_send(_face, {"type": "clara_face_ping"})

    try:
        while True:
            data = await websocket.receive_json()
            if not isinstance(data, dict):
                continue
            msg_type = data.get("type")
            if role == "main":
                if msg_type == "clara_face_ping":
                    await _safe_send(_face, data)
                    continue
                await _safe_send(_face, data)
            else:
                if msg_type == "face_ready":
                    await _safe_send(_main, data)
                    continue
                # Face normally only sends face_ready; ignore others.
                await _safe_send(_main, data)
    except WebSocketDisconnect:
        logger.info("face-bridge disconnected role=%s", role)
    except Exception:
        logger.exception("face-bridge error role=%s", role)
    finally:
        if role == "main" and _main is websocket:
            _main = None
            await _safe_send(_face, {"type": "main_disconnected"})
        if role == "face" and _face is websocket:
            _face = None
            await _safe_send(_main, {"type": "face_disconnected"})
