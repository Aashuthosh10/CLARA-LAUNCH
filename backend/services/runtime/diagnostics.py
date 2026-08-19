"""DEV-gated runtime diagnostics timeline."""

from __future__ import annotations

import logging
from collections import deque
from typing import Any

from backend.config.settings import RUNTIME_DIAGNOSTICS, RUNTIME_TIMELINE_MAX

logger = logging.getLogger("clara.runtime")

_TIMELINE: deque[dict[str, Any]] = deque(maxlen=200)


def log_runtime_event(event: str, **fields: Any) -> None:
    if not RUNTIME_DIAGNOSTICS:
        return
    entry = {"event": event, **{k: v for k, v in fields.items() if v is not None}}
    _TIMELINE.append(entry)
    logger.info("RUNTIME %s", entry)


def get_runtime_timeline() -> list[dict[str, Any]]:
    return list(_TIMELINE)


def clear_runtime_timeline() -> None:
    _TIMELINE.clear()


# Apply configured max length lazily
def _resize_timeline() -> None:
    global _TIMELINE
    max_n = max(20, int(RUNTIME_TIMELINE_MAX))
    if _TIMELINE.maxlen != max_n:
        _TIMELINE = deque(_TIMELINE, maxlen=max_n)


_resize_timeline()
