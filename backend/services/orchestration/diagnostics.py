"""Unified orchestration timeline (wraps M2 runtime diagnostics)."""

from __future__ import annotations

from typing import Any

from backend.services.runtime.diagnostics import log_runtime_event


def orch_event(event: str, **fields: Any) -> None:
    log_runtime_event(event, **fields)
