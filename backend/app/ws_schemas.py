"""Inbound WebSocket message schemas and validation."""

from __future__ import annotations

import json
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, ValidationError

_ALLOWED_ACTIONS = {
    "wake",
    "reset_session",
    "home",
    "language_selected",
    "language_gate_prompt",
    "conversation_started",
    "user_message",
    "campus_navigation_tts",
    "toggle_mic",
    "mic_start",
    "mic_stop",
    "mic_cancel",
    "menu_select",
}


class _BaseWsMessage(BaseModel):
    model_config = ConfigDict(extra="forbid")
    action: str


class WakeMessage(BaseModel):
    """Client may attach diagnostic/meta fields beside action."""

    model_config = ConfigDict(extra="allow")
    action: Literal["wake"]


class SessionResetMessage(_BaseWsMessage):
    # Allow kiosk clients to include diagnostic/meta keys.
    model_config = ConfigDict(extra="allow")
    action: Literal["reset_session", "home"]


class ConversationStartedMessage(_BaseWsMessage):
    action: Literal["conversation_started"]


class LanguageGatePromptMessage(_BaseWsMessage):
    action: Literal["language_gate_prompt"]


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


class CampusNavigationTtsMessage(_BaseWsMessage):
    # Keep extra fields because frontend includes text/language/turn_id metadata.
    model_config = ConfigDict(extra="allow")
    action: Literal["campus_navigation_tts"]


_ACTION_TO_MODEL = {
    "wake": WakeMessage,
    "reset_session": SessionResetMessage,
    "home": SessionResetMessage,
    "conversation_started": ConversationStartedMessage,
    "language_gate_prompt": LanguageGatePromptMessage,
    "language_selected": LanguageSelectedMessage,
    "user_message": UserMessage,
    "campus_navigation_tts": CampusNavigationTtsMessage,
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
