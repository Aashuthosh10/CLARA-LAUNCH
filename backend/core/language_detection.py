"""Language detection for CLARA-supported languages only."""

from __future__ import annotations

from dataclasses import dataclass
import re
from typing import Any

LANGUAGE_KEY_TO_NAME = {
    "en": "English",
    "hi": "Hindi",
    "kn": "Kannada",
    "ta": "Tamil",
    "te": "Telugu",
    "ml": "Malayalam",
}

SUPPORTED_LANGUAGE_KEYS = frozenset(LANGUAGE_KEY_TO_NAME.keys())

LANG_ALIAS_TO_KEY = {
    "en": "en",
    "eng": "en",
    "english": "en",
    "en-in": "en",
    "hi": "hi",
    "hin": "hi",
    "hindi": "hi",
    "hi-in": "hi",
    "kn": "kn",
    "kan": "kn",
    "kannada": "kn",
    "kn-in": "kn",
    "ta": "ta",
    "tam": "ta",
    "tamil": "ta",
    "ta-in": "ta",
    "te": "te",
    "tel": "te",
    "telugu": "te",
    "te-in": "te",
    "ml": "ml",
    "mal": "ml",
    "malayalam": "ml",
    "ml-in": "ml",
}

# Unicode script blocks for deterministic detection.
SCRIPT_RANGES = {
    "hi": ((0x0900, 0x097F),),  # Devanagari
    "kn": ((0x0C80, 0x0CFF),),  # Kannada
    "ta": ((0x0B80, 0x0BFF),),  # Tamil
    "te": ((0x0C00, 0x0C7F),),  # Telugu
    "ml": ((0x0D00, 0x0D7F),),  # Malayalam
}


@dataclass(frozen=True)
class DetectionResult:
    lang_key: str
    confidence: float
    method: str


def _normalize_lang_token(token: str | None) -> str | None:
    if not token:
        return None
    cleaned = token.strip().lower().replace("_", "-")
    if cleaned in LANG_ALIAS_TO_KEY:
        return LANG_ALIAS_TO_KEY[cleaned]
    base = cleaned.split("-")[0]
    return LANG_ALIAS_TO_KEY.get(base)


def _extract_from_stt_meta(stt_meta: dict[str, Any] | None) -> DetectionResult | None:
    if not stt_meta:
        return None

    lang_candidates = (
        stt_meta.get("language_code"),
        stt_meta.get("detected_language"),
        stt_meta.get("language"),
        stt_meta.get("locale"),
    )

    lang_key = None
    for candidate in lang_candidates:
        lang_key = _normalize_lang_token(str(candidate) if candidate is not None else None)
        if lang_key:
            break

    if not lang_key:
        return None

    conf_raw = stt_meta.get("confidence") or stt_meta.get("language_confidence") or stt_meta.get(
        "detected_language_confidence"
    )
    try:
        confidence = float(conf_raw)
    except (TypeError, ValueError):
        confidence = 0.85

    return DetectionResult(lang_key=lang_key, confidence=max(0.0, min(confidence, 1.0)), method="stt_metadata")


def _detect_by_script(text: str) -> DetectionResult | None:
    counts = {key: 0 for key in SCRIPT_RANGES}
    latin_count = 0

    for ch in text:
        code = ord(ch)
        if "A" <= ch <= "Z" or "a" <= ch <= "z":
            latin_count += 1
        for key, ranges in SCRIPT_RANGES.items():
            if any(start <= code <= end for start, end in ranges):
                counts[key] += 1

    best_key = max(counts, key=counts.get)
    best_count = counts[best_key]
    total_non_space = len(re.sub(r"\s+", "", text))

    if best_count > 0 and total_non_space > 0:
        confidence = min(0.99, 0.75 + (best_count / max(total_non_space, 1)) * 0.24)
        return DetectionResult(lang_key=best_key, confidence=confidence, method="script_heuristic")

    if latin_count > 0:
        confidence = 0.74 if latin_count >= 4 else 0.60
        return DetectionResult(lang_key="en", confidence=confidence, method="latin_fallback")

    return None


def detect_language(
    text: str,
    stt_meta: dict[str, Any] | None = None,
    threshold: float = 0.70,
) -> DetectionResult:
    """Detect a supported language key from text+optional STT metadata.

    Returns one of: en, hi, kn, ta, te, ml. Falls back to English if uncertain.
    """

    safe_text = (text or "").strip()
    if not safe_text:
        return DetectionResult(lang_key="en", confidence=1.0, method="empty_fallback")

    meta_result = _extract_from_stt_meta(stt_meta)
    if meta_result and meta_result.lang_key in SUPPORTED_LANGUAGE_KEYS and meta_result.confidence >= threshold:
        return meta_result

    script_result = _detect_by_script(safe_text)
    if script_result and script_result.lang_key in SUPPORTED_LANGUAGE_KEYS and script_result.confidence >= threshold:
        return script_result

    return DetectionResult(lang_key="en", confidence=0.5, method="threshold_fallback")
