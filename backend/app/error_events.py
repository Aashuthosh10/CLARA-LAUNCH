"""Error payload helpers for WebSocket responses."""

from __future__ import annotations

from typing import Any

ERROR_RECOVERABLE_HINTS: dict[str, str] = {
    "MIC_SILENT": "Check mic selection and speak closer.",
    "VAD_TIMEOUT": "Speak within 10 seconds of tapping the mic.",
    "STT_EMPTY": "Speak clearly and try again.",
    "STT_FAILED": "Speech recognition failed. Please try again.",
    "MIC_CAPTURE_FAILED": "Check mic connection and permissions.",
    "RECORD_ERROR": "Recording failed. Check mic and try again.",
    "PROCESS_FAILED": "Something went wrong. Please try again.",
}


def error_hint(code: str, default: str = "Please try again.") -> str:
    return ERROR_RECOVERABLE_HINTS.get(code, default)


def build_error_payload(
    code: str,
    message: str,
    turn_id: str,
    *,
    recoverable: bool = True,
) -> dict[str, Any]:
    return {
        "event": "error",
        "error": message,
        "errorCode": code,
        "code": code,
        "message": message,
        "turn_id": turn_id,
        "recoverable": recoverable,
        "hint": error_hint(code),
        "isProcessing": False,
        # Clear any in-flight low-latency audio gate so the kiosk never sticks on "thinking".
        "audioPending": False,
    }
