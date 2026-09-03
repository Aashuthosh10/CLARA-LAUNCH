"""Inbound WebSocket message schemas and validation."""

from __future__ import annotations

import json
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, ValidationError, model_validator

WS_MESSAGE_MAX_BYTES = 64 * 1024
WS_USER_TEXT_MAX_CHARS = 4096
WS_VISITOR_SESSION_ID_MAX_CHARS = 256
WS_AUXILIARY_TEXT_MAX_CHARS = 1024
WS_LOCAL_INTENT_TEXT_MAX_CHARS = 128

_ALLOWED_ACTIONS = {
    "wake",
    "reset_session",
    "home",
    "language_selected",
    "language_gate_prompt",
    "conversation_started",
    "restore_language",
    "user_message",
    "campus_navigation_tts",
    "toggle_mic",
    "mic_start",
    "mic_stop",
    "mic_cancel",
    "cancel_turn",
    "menu_select",
}


class _BaseWsMessage(BaseModel):
    model_config = ConfigDict(extra="forbid")
    action: str


class WakeMessage(BaseModel):
    """Client may attach diagnostic/meta fields beside action."""

    model_config = ConfigDict(extra="allow")
    action: Literal["wake"]
    visitor_session_id: str | None = Field(
        default=None, max_length=WS_VISITOR_SESSION_ID_MAX_CHARS
    )


class SessionResetMessage(_BaseWsMessage):
    # Allow kiosk clients to include diagnostic/meta keys.
    model_config = ConfigDict(extra="allow")
    action: Literal["reset_session", "home"]
    type: str | None = Field(default=None, max_length=WS_AUXILIARY_TEXT_MAX_CHARS)


class ConversationStartedMessage(_BaseWsMessage):
    # K1: resumed visitors (refresh within the same visitor session) carry
    # resume + visitor-session metadata beside the action.
    model_config = ConfigDict(extra="allow")
    action: Literal["conversation_started"]
    resumed: bool | None = None
    visitor_session_id: str | None = Field(
        default=None, max_length=WS_VISITOR_SESSION_ID_MAX_CHARS
    )


class LanguageGatePromptMessage(_BaseWsMessage):
    action: Literal["language_gate_prompt"]


class LanguageSelectedMessage(_BaseWsMessage):
    # K1: canonical `language_code_key` is authoritative; legacy display-name
    # `language` remains accepted for backward compatibility.
    model_config = ConfigDict(extra="allow")
    action: Literal["language_selected"]
    language: str | None = Field(default=None, max_length=64)
    language_code_key: str | None = Field(default=None, max_length=16)

    @model_validator(mode="after")
    def _require_some_language_field(self) -> "LanguageSelectedMessage":
        if not self.language and not self.language_code_key:
            raise ValueError("language_selected requires language or language_code_key")
        return self


class RestoreLanguageMessage(BaseModel):
    """K1: re-bind the canonical selected language on a new socket."""

    model_config = ConfigDict(extra="allow")
    action: Literal["restore_language"]
    language_code_key: str | None = Field(default=None, max_length=16)
    visitor_session_id: str | None = Field(
        default=None, max_length=WS_VISITOR_SESSION_ID_MAX_CHARS
    )
    ui_state: int | None = None


class LocalIntentMessage(BaseModel):
    """Bounded frontend navigation hint; it is never an open-ended object."""

    model_config = ConfigDict(extra="forbid")
    type: str | None = Field(default=None, max_length=WS_LOCAL_INTENT_TEXT_MAX_CHARS)
    departmentLabel: str | None = Field(default=None, max_length=WS_LOCAL_INTENT_TEXT_MAX_CHARS)
    requested_card: str | None = Field(default=None, max_length=WS_LOCAL_INTENT_TEXT_MAX_CHARS)
    trigger: str | None = Field(default=None, max_length=WS_LOCAL_INTENT_TEXT_MAX_CHARS)
    intent: str | None = Field(default=None, max_length=WS_LOCAL_INTENT_TEXT_MAX_CHARS)
    showCard: str | None = Field(default=None, max_length=WS_LOCAL_INTENT_TEXT_MAX_CHARS)


class UserMessage(_BaseWsMessage):
    action: Literal["user_message"]
    text: str | None = Field(default=None, max_length=WS_USER_TEXT_MAX_CHARS)
    localIntent: LocalIntentMessage | None = None


class MicControlMessage(_BaseWsMessage):
    action: Literal["toggle_mic", "mic_start", "mic_stop", "mic_cancel"]


class CancelTurnMessage(BaseModel):
    """Client aborts the in-flight assistant reply (orb interrupt / new intent)."""

    model_config = ConfigDict(extra="allow")
    action: Literal["cancel_turn"]


class MenuSelectMessage(_BaseWsMessage):
    # Keep extra fields because frontend may include menu metadata.
    model_config = ConfigDict(extra="allow")
    action: Literal["menu_select"]
    text: str | None = Field(default=None, max_length=WS_AUXILIARY_TEXT_MAX_CHARS)
    label: str | None = Field(default=None, max_length=WS_AUXILIARY_TEXT_MAX_CHARS)
    value: str | None = Field(default=None, max_length=WS_AUXILIARY_TEXT_MAX_CHARS)
    departmentLabel: str | None = Field(default=None, max_length=WS_AUXILIARY_TEXT_MAX_CHARS)


class CampusNavigationTtsMessage(_BaseWsMessage):
    # Keep extra fields because frontend includes text/language/turn_id metadata.
    model_config = ConfigDict(extra="allow")
    action: Literal["campus_navigation_tts"]
    text: str = Field(min_length=1, max_length=WS_AUXILIARY_TEXT_MAX_CHARS)
    language: str | None = Field(default=None, max_length=64)
    turn_id: str | None = Field(default=None, max_length=WS_VISITOR_SESSION_ID_MAX_CHARS)


_ACTION_TO_MODEL = {
    "wake": WakeMessage,
    "reset_session": SessionResetMessage,
    "home": SessionResetMessage,
    "conversation_started": ConversationStartedMessage,
    "language_gate_prompt": LanguageGatePromptMessage,
    "language_selected": LanguageSelectedMessage,
    "restore_language": RestoreLanguageMessage,
    "user_message": UserMessage,
    "campus_navigation_tts": CampusNavigationTtsMessage,
    "toggle_mic": MicControlMessage,
    "mic_start": MicControlMessage,
    "mic_stop": MicControlMessage,
    "mic_cancel": MicControlMessage,
    "cancel_turn": CancelTurnMessage,
    "menu_select": MenuSelectMessage,
}


def parse_inbound_ws_message(raw_text: str) -> tuple[dict[str, Any] | None, str | None]:
    """
    Parse and validate one inbound websocket JSON message.
    Returns (message, None) on success, (None, reason) on failure.
    """
    # UTF-8 is at least one byte per Python character. The character check
    # avoids allocating another large byte string for obviously huge frames.
    if (
        len(raw_text) > WS_MESSAGE_MAX_BYTES
        or len(raw_text.encode("utf-8")) > WS_MESSAGE_MAX_BYTES
    ):
        return None, "message_too_large"
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
