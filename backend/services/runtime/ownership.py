"""Ownership token validation — reject only, never mutate business state."""

from __future__ import annotations

from typing import Any


def validate_callback_token(
    *,
    expected_generation: int | None = None,
    actual_generation: int | None = None,
    expected_turn_id: str | None = None,
    actual_turn_id: str | None = None,
    expected_presentation_id: str | None = None,
    actual_presentation_id: str | None = None,
    expected_session_id: str | None = None,
    actual_session_id: str | None = None,
    expected_conversation_id: str | None = None,
    actual_conversation_id: str | None = None,
) -> bool:
    """Return True when all provided expected tokens match actual. Missing expected = skip check."""
    checks: list[tuple[Any, Any]] = [
        (expected_generation, actual_generation),
        (expected_turn_id, actual_turn_id),
        (expected_presentation_id, actual_presentation_id),
        (expected_session_id, actual_session_id),
        (expected_conversation_id, actual_conversation_id),
    ]
    for exp, act in checks:
        if exp is None:
            continue
        if act != exp:
            return False
    return True
