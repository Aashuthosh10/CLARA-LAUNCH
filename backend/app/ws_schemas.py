"""Inbound WebSocket message schemas and validation."""

from __future__ import annotations

import json
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, ValidationError

_ALLOWED_ACTIONS = {
    "wake",
    "language_selected",
    "conversation_started",
    "user_message",
    "toggle_mic",
    "mic_start",
    "mic_stop",
    "mic_cancel",
    "menu_select",
}


class _BaseWsMessage(BaseModel):
    model_config = ConfigDict(extra="forbid")
    action: str


class WakeMessage(_BaseWsMessage):
    action: Literal["wake"]


class ConversationStartedMessage(_BaseWsMessage):
    action: Literal["conversation_started"]


class LanguageSelectedMessage(_BaseWsMessage):
    action: Literal["language_selected"]
    language: str


class UserMessage(_BaseWsMessage):
    action: Literal["user_message"]
    text: str | None = None
    localIntent: dict[str, Any] | None = None


class MicControlMessage(_BaseWsMessage):
    action: Literal["toggle_mic", "mic_start", "mic_stop", "mic_cancel"]


class MenuSelectMessage(_BaseWsMessage):
    # Keep extra fields because frontend may include menu metadata.
    model_config = ConfigDict(extra="allow")
    action: Literal["menu_select"]


_ACTION_TO_MODEL = {
    "wake": WakeMessage,
    "conversation_started": ConversationStartedMessage,
    "language_selected": LanguageSelectedMessage,
    "user_message": UserMessage,
    "toggle_mic": MicControlMessage,
    "mic_start": MicControlMessage,
    "mic_stop": MicControlMessage,
    "mic_cancel": MicControlMessage,
    "menu_select": MenuSelectMessage,
}


def parse_inbound_ws_message(raw_text: str) -> tuple[dict[str, Any] | None, str | None]:
    """
    Parse and validate one inbound websocket JSON message.
    Returns (message, None) on success, (None, reason) on failure.
    """
    try:
        payload = json.loads(raw_text) if raw_text else {}
    except json.JSONDecodeError:
        return None, "invalid_json"
    if not isinstance(payload, dict):
        return None, "invalid_message"

    action = payload.get("action") or payload.get("event")
    if not isinstance(action, str):
        return None, "missing_action"
    action = action.strip()
    if action not in _ALLOWED_ACTIONS:
        return None, "invalid_action"
    payload["action"] = action
    payload.pop("event", None)

    model = _ACTION_TO_MODEL[action]
    try:
        validated = model.model_validate(payload)
    except ValidationError:
        return None, "invalid_payload"
    return validated.model_dump(), None
