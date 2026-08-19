"""Presentation-layer diagnostics (logger events; no production side effects)."""

from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger("clara.presentation")


def presentation_event(event: str, **fields: Any) -> None:
    """Emit a structured presentation-layer diagnostic event."""
    extra = " ".join(f"{k}={v!r}" for k, v in fields.items() if v is not None)
    if extra:
        logger.info("%s %s", event, extra)
    else:
        logger.info("%s", event)
