"""Split assistant reply text into bounded chunks for resilient TTS."""

from __future__ import annotations

import re


def split_tts_chunks(text: str, *, max_chars: int = 220) -> list[str]:
    """Group sentences up to max_chars; hard-split any segment that still exceeds max_chars."""
    raw = (text or "").strip()
    if not raw:
        return []

    sentences = re.split(r"(?<=[.!?])\s+", raw)
    chunks: list[str] = []
    current = ""

    def flush_current() -> None:
        nonlocal current
        if current.strip():
            chunks.append(current.strip())
        current = ""

    def hard_split_piece(piece: str) -> list[str]:
        p = piece.strip()
        if not p:
            return []
        if len(p) <= max_chars:
            return [p]
        out: list[str] = []
        start = 0
        while start < len(p):
            out.append(p[start : start + max_chars].strip())
            start += max_chars
        return [x for x in out if x]

    for s in sentences:
        s = (s or "").strip()
        if not s:
            continue
        candidate = f"{current} {s}".strip() if current else s
        if len(candidate) <= max_chars:
            current = candidate
        else:
            flush_current()
            if len(s) <= max_chars:
                current = s
            else:
                for part in hard_split_piece(s):
                    chunks.append(part)
                current = ""

    flush_current()
    return chunks if chunks else [raw]
