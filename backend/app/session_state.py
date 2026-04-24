"""Session history helpers for websocket conversation state."""

from __future__ import annotations


def append_session_history(session: dict, role: str, text: str, *, max_turns: int = 3) -> None:
    cleaned = (text or "").strip()
    if not cleaned:
        return
    history = session.setdefault("history", [])
    history.append({"role": role, "text": cleaned})
    max_items = max_turns * 2
    if len(history) > max_items:
        del history[:-max_items]


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
