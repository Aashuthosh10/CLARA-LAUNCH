"""Deterministic approved-narration-to-provider text contract.

Display text remains owned by the presentation layer. At the TTS boundary,
``narration_text`` is the approved narration and ``sanitized_tts_text`` is the
only value permitted to reach cache or provider code.
"""

from __future__ import annotations

import html
import json
import re
import unicodedata
from dataclasses import dataclass


_URL_RE = re.compile(r"(?i)\b(?:https?://|www\.)[^\s<>()]+")
_WINDOWS_PATH_RE = re.compile(r"(?i)(?<!\w)(?:[a-z]:\\|\\\\)[^\s,;]+")
_UNIX_PATH_RE = re.compile(
    r"(?i)(?<!\w)(?:(?:\.\.?/)|/(?:home|usr|var|tmp|etc|opt|users|mnt)/)[^\s,;]+"
)
_UNIT_ID_RE = re.compile(
    r"(?i)\b[a-z][a-z0-9_]*\.(?:overview|hod|fees|achievements|placements)\b"
)
_HTML_BLOCK_RE = re.compile(r"(?is)<(?:script|style)\b[^>]*>.*?</(?:script|style)\s*>")
_HTML_TAG_RE = re.compile(r"(?s)<[^>]+>")
_MARKDOWN_LINK_RE = re.compile(r"\[([^\]]+)\]\((?:https?://|www\.)[^)]+\)", re.I)
_ROLE_LINE_RE = re.compile(
    r"(?im)^\s*(?:#{1,6}\s*)?"
    r"(?:system|developer|assistant|user|prompt|instructions?)\s*:\s*.*$"
)
_PROMPT_WRAPPER_RE = re.compile(
    r"(?is)(?:"
    r"<\|(?:system|developer|assistant|user)\|>.*?(?=<\|(?:system|developer|assistant|user)\|>|\Z)"
    r"|\[INST\].*?\[/INST\]"
    r"|<<SYS>>.*?<</SYS>>"
    r")"
)
_TRANSLATION_LABEL_RE = re.compile(
    r"(?im)^\s*(?:(?:english|kannada|hindi|tamil|telugu|malayalam)\s+)?"
    r"(?:translation|translated\s+text)\s*:\s*"
)
_PAREN_METADATA_RE = re.compile(
    r"(?is)\((?=[^)]*(?:unit[_ ]?id|card[_ ]?index|language[_ ]?code|"
    r"trace[_ ]?id|debug|metadata|internal|source\s*=|"
    r"[a-z][a-z0-9_]*\.(?:overview|hod|fees|achievements|placements)))"
    r"[^)]*\)"
)
_EMBEDDED_OBJECT_RE = re.compile(r"(?s)\{[^{}]*\}")
_EMBEDDED_ARRAY_RE = re.compile(r"(?s)\[(?=[^\]]*[\"':])[^\[\]]*\]")
_SENTENCE_SPLIT_RE = re.compile(r"(?<=[!?।॥])\s+|(?<!\d)(?<=\.)\s+")
_MAX_HTML_ENTITY_DECODE_PASSES = 8


@dataclass(frozen=True)
class NarrationTextContract:
    """Keep approved narration and provider-bound text distinct."""

    narration_text: str
    sanitized_tts_text: str


def build_narration_text_contract(
    *,
    narration_text: str,
) -> NarrationTextContract:
    """Build the TTS-boundary contract without mutating approved narration."""
    narration = narration_text if isinstance(narration_text, str) else ""
    return NarrationTextContract(
        narration_text=narration,
        sanitized_tts_text=sanitize_tts_text(narration),
    )


def _decode_html_entities_to_fixed_point(text: str) -> str | None:
    """Decode nested entities within a strict bound; fail closed if not stable."""
    current = text
    for _ in range(_MAX_HTML_ENTITY_DECODE_PASSES):
        decoded = html.unescape(current)
        if decoded == current:
            return current
        current = decoded
    return current if html.unescape(current) == current else None


def _looks_like_serialized_container(text: str) -> bool:
    stripped = text.strip()
    if len(stripped) < 2 or (stripped[0], stripped[-1]) not in {("{", "}"), ("[", "]")}:
        return False
    try:
        return isinstance(json.loads(stripped), (dict, list))
    except (TypeError, ValueError, json.JSONDecodeError):
        return stripped.startswith("{") and ":" in stripped


def _remove_unsupported_characters(text: str) -> str:
    out: list[str] = []
    for char in text:
        codepoint = ord(char)
        category = unicodedata.category(char)
        if char in {"\n", "\t"}:
            out.append(char)
        elif category in {"Cc", "Cs"}:
            continue
        elif category == "Cf" and char not in {"\u200c", "\u200d"}:
            continue
        elif (
            0x1F000 <= codepoint <= 0x1FAFF
            or 0x2600 <= codepoint <= 0x27BF
            or 0x1F1E6 <= codepoint <= 0x1F1FF
            or 0x1F3FB <= codepoint <= 0x1F3FF
            or codepoint in {0xFE0E, 0xFE0F}
        ):
            continue
        else:
            out.append(char)
    return "".join(out)


def _deduplicate_consecutive_sentences(text: str) -> str:
    sentences = [part.strip() for part in _SENTENCE_SPLIT_RE.split(text) if part.strip()]
    if len(sentences) < 2:
        return text
    result: list[str] = []
    previous_key: str | None = None
    for sentence in sentences:
        key = unicodedata.normalize("NFC", sentence).casefold().strip()
        key = re.sub(r"[.!?।॥]+$", "", key).strip()
        if key and key == previous_key:
            continue
        result.append(sentence)
        previous_key = key
    return " ".join(result)


def sanitize_tts_text(text: object) -> str:
    """Return deterministic, Unicode-preserving text safe for provider submission."""
    if not isinstance(text, str) or not text.strip():
        return ""
    if _looks_like_serialized_container(text):
        return ""

    sanitized = text.replace("\r\n", "\n").replace("\r", "\n")
    sanitized = _remove_unsupported_characters(sanitized)
    decoded = _decode_html_entities_to_fixed_point(sanitized)
    if decoded is None:
        return ""
    sanitized = decoded
    sanitized = _PROMPT_WRAPPER_RE.sub(" ", sanitized)
    sanitized = _HTML_BLOCK_RE.sub(" ", sanitized)
    sanitized = _MARKDOWN_LINK_RE.sub(r"\1", sanitized)
    sanitized = _HTML_TAG_RE.sub(" ", sanitized)
    sanitized = _ROLE_LINE_RE.sub(" ", sanitized)
    sanitized = _TRANSLATION_LABEL_RE.sub("", sanitized)
    sanitized = _PAREN_METADATA_RE.sub(" ", sanitized)
    sanitized = _URL_RE.sub(" ", sanitized)
    sanitized = _WINDOWS_PATH_RE.sub(" ", sanitized)
    sanitized = _UNIX_PATH_RE.sub(" ", sanitized)
    sanitized = _EMBEDDED_OBJECT_RE.sub(" ", sanitized)
    sanitized = _EMBEDDED_ARRAY_RE.sub(" ", sanitized)
    sanitized = _UNIT_ID_RE.sub(" ", sanitized)

    sanitized = re.sub(r"(?m)^\s{0,3}#{1,6}\s+", "", sanitized)
    sanitized = re.sub(r"(?m)^\s*(?:[-*+•◦▪]|\d+[.)])\s+", "", sanitized)
    sanitized = sanitized.replace("```", "").replace("`", "")
    sanitized = sanitized.replace("**", "").replace("__", "").replace("~~", "")
    sanitized = re.sub(r"(?<!\w)[*_~]+|[*_~]+(?!\w)", "", sanitized)

    sanitized = re.sub(r"[!?]{2,}", lambda m: "?" if "?" in m.group(0) else "!", sanitized)
    sanitized = re.sub(r"\.{4,}", "...", sanitized)
    sanitized = re.sub(r",{2,}", ",", sanitized)
    sanitized = re.sub(r";{2,}", ";", sanitized)
    sanitized = re.sub(r"।{2,}", "।", sanitized)
    sanitized = re.sub(r"॥{2,}", "॥", sanitized)
    sanitized = re.sub(r"\s+([.,;:!?।॥])", r"\1", sanitized)
    sanitized = re.sub(r",(?:\s*,)+", ",", sanitized)
    sanitized = re.sub(r"\s+", " ", sanitized).strip()
    sanitized = _deduplicate_consecutive_sentences(sanitized)
    return re.sub(r"\s+", " ", sanitized).strip()
