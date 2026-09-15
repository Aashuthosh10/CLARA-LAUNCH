"""Append-only local feedback persistence for conversation closure."""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

_REPO_ROOT = Path(__file__).resolve().parents[2]
_DEFAULT_FEEDBACK_PATH = _REPO_ROOT / "feedback" / "clara_feedback.jsonl"


def feedback_file_path() -> Path:
    return _DEFAULT_FEEDBACK_PATH


def append_feedback_record(
    *,
    feedback: str,
    language: str | None,
    session_id: str | None,
    rating: str | None = None,
    path: Path | None = None,
) -> Path:
    """
    Append one JSONL feedback record. Raises OSError on persistence failure.
    Does not store audio or unnecessary PII.
    """
    target = path or feedback_file_path()
    record: dict[str, Any] = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "language": (language or "English").strip() or "English",
        "feedback": (feedback or "").strip(),
        "rating": (rating or "").strip() or None,
        "session_id": (session_id or "").strip() or None,
    }
    target.parent.mkdir(parents=True, exist_ok=True)
    line = json.dumps(record, ensure_ascii=False) + "\n"
    with target.open("a", encoding="utf-8") as fh:
        fh.write(line)
    logger.info(
        "FEEDBACK_STORED path=%s session_id=%s chars=%d",
        target,
        record.get("session_id"),
        len(record["feedback"]),
    )
    return target
