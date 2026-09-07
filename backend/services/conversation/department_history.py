"""Recover department identity from session history (outside app/ wiring)."""

from __future__ import annotations

from backend.app.session_state import prior_user_texts
from backend.services.content.department_identity import match_department_spans_exclusive


def department_keys_from_history(
    session: dict,
    *,
    language_code_key: str = "en",
    limit_user_turns: int = 3,
) -> tuple[str, ...]:
    """
    Recover department identity from recent user history when sticky session
    entities are missing. Does not invent topics — only span-matches prior text.
    """
    keys: list[str] = []
    seen: set[str] = set()
    for text in prior_user_texts(session, limit=limit_user_turns):
        for span in match_department_spans_exclusive(text):
            k = str(span.json_key or "").strip().lower()
            if k and k not in seen:
                seen.add(k)
                keys.append(k)
    _ = language_code_key  # reserved for locale-scoped matching if needed later
    return tuple(keys)
