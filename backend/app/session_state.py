"""Session history helpers for websocket conversation state."""

from __future__ import annotations

import re


def append_session_history(session: dict, role: str, text: str, *, max_turns: int = 3) -> None:
    cleaned = (text or "").strip()
    if not cleaned:
        return
    history = session.setdefault("history", [])
    history.append({"role": role, "text": cleaned})
    max_items = max_turns * 2
    if len(history) > max_items:
        del history[:-max_items]


def prior_user_question(session: dict, current_text: str) -> str:
    """The immediately previous visitor utterance, if any. Never assistant speech."""
    current = (current_text or "").strip()
    for item in reversed(session.get("history") or []):
        if item.get("role") != "user":
            continue
        text = (item.get("text") or "").strip()
        if text and text != current:
            return text
    return ""


def history_for_llm(session: dict) -> list[dict[str, str]]:
    """Last 3 conversational turns only (6 messages) to limit context bleed."""
    out: list[dict[str, str]] = []
    recent = session.get("history", [])[-6:]
    for item in recent:
        role = "assistant" if item.get("role") == "assistant" else "user"
        text = (item.get("text") or "").strip()
        if text:
            out.append({"role": role, "content": text})
    return out


def text_contains_guest_name_token(text: str, name: str) -> bool:
    """
    True if `text` contains `name` as a whole word or whole multi-word phrase.
    Short names (< 3 chars) return False to avoid ambiguous matches and false suppression.
    """
    name = (name or "").strip()
    if len(name) < 3:
        return False
    hay = (text or "").strip()
    if not hay:
        return False

    parts = name.split()
    if len(parts) >= 2:
        pattern = r"\b" + r"\s+".join(re.escape(p) for p in parts) + r"\b"
        try:
            return bool(re.search(pattern, hay, re.IGNORECASE))
        except re.error:
            return name.casefold() in hay.casefold()

    token = parts[0]
    if len(token) < 3:
        return False
    if token.isascii() and token.isalpha():
        return bool(re.search(rf"\b{re.escape(token)}\b", hay, re.IGNORECASE))
    return token.casefold() in hay.casefold()


def assistant_last_reply_used_guest_name(session: dict, name: str) -> bool:
    """True if the most recent assistant history line includes the guest name (token-aware)."""
    for item in reversed(session.get("history") or []):
        if item.get("role") != "assistant":
            continue
        return text_contains_guest_name_token((item.get("text") or "").strip(), name)
    return False
