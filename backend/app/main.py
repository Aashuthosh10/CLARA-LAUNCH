"""CLARA backend - FastAPI app with WebSocket support and latency optimizations."""

from __future__ import annotations

import asyncio
import base64
import hashlib
import json
import logging
import math
import os
import re
import struct
import sys
import uuid
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

# Ensure project root is on path when run as a script.
_PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))

from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware

from backend.clients.provider_clients import (
    close_clients,
    get_groq_client,
    sarvam_stt_from_wav,
    sarvam_tts_to_base64,
    warmup_clients,
)
from backend.config.settings import (
    AUDIO_RECORD_MODE,
    AUTO_LANGUAGE_DETECT_CONFIDENCE_THRESHOLD,
    AUTO_LANGUAGE_DETECT_ENABLED,
    ENABLE_ACK_EARCON,
    ENABLE_EARLY_PARTIAL_TEXT,
    ENABLE_LLM_STREAMING,
    ENABLE_ONCE_ONLY_TTS_SEGMENTS,
    ENABLE_FIRST_SENTENCE_TTS,
    ENABLE_TTS_PIPELINING,
    GROQ_API_KEY,
    HOST,
    LANGUAGE_NAME_TO_CODE_KEY,
    LLM_MAX_TOKENS,
    LLM_STREAM_PARTIAL_DEBOUNCE_MS,
    LLM_STREAM_TIMEOUT_S,
    LLM_TEMPERATURE,
    PERF_DEBUG_TIMINGS,
    PORT,
    FRONTEND_URL,
    RAG_CONTEXT_TIMEOUT_S,
    RAG_MODEL,
    RAG_TOP_K,
    TARGET_LANGUAGE_CODES,
)
from backend.core.audio_pipeline import get_input_device_info, record_audio, validate_audio_devices
from backend.core.language_detection import detect_language
from backend.core.rag import get_relevant_context, get_rag_document_count, warmup_rag
from backend.services.greetings import get_greeting
from backend.services.session_language import resolve_session_language, set_session_language, should_run_auto_detect
from backend.services.answer_generation import (
    INTENT_COLLEGE_OVERVIEW,
    INTENT_COURSE_MENU,
    INTENT_DEPARTMENT_OVERVIEW,
    INTENT_HOD_PROFILE,
    INTENT_HOD_TRUSTEES_PROFILE,
    INTENT_NORMAL_QUERY,
    INTENT_TRUSTEES_PROFILE,
    detect_department_name,
    detect_intent,
    get_course_menu_options,
    get_course_menu_spoken_prompt,
    get_off_topic_reply,
    get_profile_direct_reply,
    get_unavailable_reply,
    is_college_related_query,
)
from backend.utils.cache import TTLRUCache
from backend.utils.timing import TurnTiming
from backend.utils.voice_logger import (
    log_voice_capture_end,
    log_voice_capture_start,
    log_voice_stt,
    log_voice_tts,
    log_voice_turn_end,
)

logger = logging.getLogger(__name__)
_SVIT_LOCALES_DIR = _PROJECT_ROOT / "backend" / "data" / "locales"
_svit_json_context_cache: dict[str, str] = {}
# Reliability-first mode: only emit final TTS segment.
# This avoids first-sentence pipeline races that can cause silent turns.
FORCE_FINAL_TTS_ONLY = True
RAG_WARMUP_TIMEOUT_S = 5.0
RAG_DOC_COUNT_TIMEOUT_S = 3.0
AUDIO_DEVICE_VALIDATE_TIMEOUT_S = 3.0

# Unified error event schema
ERROR_RECOVERABLE_HINTS: dict[str, str] = {
    "MIC_SILENT": "Check mic selection and speak closer.",
    "VAD_TIMEOUT": "Speak within 10 seconds of tapping the mic.",
    "STT_EMPTY": "Speak clearly and try again.",
    "STT_FAILED": "Speech recognition failed. Please try again.",
    "MIC_CAPTURE_FAILED": "Check mic connection and permissions.",
    "RECORD_ERROR": "Recording failed. Check mic and try again.",
    "PROCESS_FAILED": "Something went wrong. Please try again.",
}


def _build_error_payload(
    code: str,
    message: str,
    turn_id: str,
    *,
    recoverable: bool = True,
) -> dict[str, Any]:
    return {
        "event": "error",
        "error": message,
        "errorCode": code,
        "code": code,
        "message": message,
        "turn_id": turn_id,
        "recoverable": recoverable,
        "hint": ERROR_RECOVERABLE_HINTS.get(code, "Please try again."),
        "isProcessing": False,
    }

LLM_REPLY_CACHE = TTLRUCache[str, str](max_size=256, ttl_seconds=600.0)
TTS_CACHE = TTLRUCache[str, str](max_size=256, ttl_seconds=1200.0)
_singleflight_lock_guard = asyncio.Lock()
_singleflight_locks: dict[str, asyncio.Lock] = {}
_ACK_EARCON_B64: str | None = None


async def _singleflight_lock_for(key: str) -> asyncio.Lock:
    async with _singleflight_lock_guard:
        lock = _singleflight_locks.get(key)
        if lock is None:
            lock = asyncio.Lock()
            _singleflight_locks[key] = lock
        return lock


def _normalized_cache_text(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "").strip()).lower()


def _text_preview(text: str, limit: int = 80) -> str:
    compact = re.sub(r"\s+", " ", (text or "").strip())
    return compact[:limit]


def _load_svit_json_context(language_code_key: str | None) -> str:
    """
    Load locale-specific SVIT knowledge JSON and return minified JSON string for prompt injection.
    Uses Hindi locale for "hi"; defaults to English locale for all other language keys.
    Returns empty string if file is missing/invalid.
    """
    locale = "hi" if (language_code_key or "").strip().lower() == "hi" else "en"
    if locale in _svit_json_context_cache:
        return _svit_json_context_cache[locale]
    try:
        path = _SVIT_LOCALES_DIR / f"{locale}.json"
        if not path.is_file():
            if locale != "en":
                logger.warning("Fallback JSON locale missing (%s), defaulting to English", path)
                path = _SVIT_LOCALES_DIR / "en.json"
            if not path.is_file():
                logger.warning("Fallback JSON context missing: %s", path)
                _svit_json_context_cache[locale] = ""
                return ""
        raw = path.read_text(encoding="utf-8")
        data = json.loads(raw)
        minified = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
        _svit_json_context_cache[locale] = minified
        return minified
    except Exception as exc:
        logger.warning("Could not load fallback JSON context: %s", exc)
        _svit_json_context_cache[locale] = ""
        return ""


def _split_first_sentence(text: str) -> tuple[str, str]:
    cleaned = (text or "").strip()
    if not cleaned:
        return "", ""
    match = re.search(r"[.!?](?:\s|$)", cleaned)
    if not match:
        return cleaned, ""
    end = match.end()
    return cleaned[:end].strip(), cleaned[end:].strip()


def _estimate_wav_duration_ms(audio_b64: str) -> float | None:
    try:
        data = base64.b64decode(audio_b64)
        if len(data) < 44 or data[:4] != b"RIFF":
            return None
        sample_rate = int.from_bytes(data[24:28], "little", signed=False)
        channels = int.from_bytes(data[22:24], "little", signed=False)
        bits_per_sample = int.from_bytes(data[34:36], "little", signed=False)
        data_size = int.from_bytes(data[40:44], "little", signed=False)
        if sample_rate <= 0 or channels <= 0 or bits_per_sample <= 0:
            return None
        bytes_per_sample = bits_per_sample / 8.0
        duration_s = data_size / (sample_rate * channels * bytes_per_sample)
        return max(0.0, duration_s * 1000.0)
    except Exception:
        return None


def _audio_bytes_len(audio_b64: str | None) -> int:
    if not audio_b64:
        return 0


def _get_ack_earcon_base64() -> str:
    """Generate and cache a short WAV earcon (160ms)."""
    global _ACK_EARCON_B64
    if _ACK_EARCON_B64:
        return _ACK_EARCON_B64
    sample_rate = 16000
    duration_ms = 160
    n_samples = int(sample_rate * duration_ms / 1000.0)
    freq = 880.0
    amp = 0.18
    pcm = bytearray()
    for i in range(n_samples):
        env = min(1.0, i / 200.0, (n_samples - i) / 200.0)
        s = int(32767.0 * amp * env * math.sin(2.0 * math.pi * freq * (i / sample_rate)))
        pcm.extend(struct.pack("<h", s))
    n_frames = len(pcm) // 2
    wav = bytearray()
    wav.extend(b"RIFF")
    wav.extend(struct.pack("<I", 36 + n_frames * 2))
    wav.extend(b"WAVEfmt ")
    wav.extend(struct.pack("<IHHIIHH", 16, 1, 1, sample_rate, sample_rate * 2, 2, 16))
    wav.extend(b"data")
    wav.extend(struct.pack("<I", n_frames * 2))
    wav.extend(pcm)
    _ACK_EARCON_B64 = base64.b64encode(bytes(wav)).decode("ascii")
    return _ACK_EARCON_B64
    try:
        return len(base64.b64decode(audio_b64))
    except Exception:
        return 0


def _debug_payload(timing: TurnTiming) -> dict[str, Any]:
    if not PERF_DEBUG_TIMINGS:
        return {}
    return {
        "debug": {
            "timings_ms": timing.summary_ms(),
        },
        "turn_id": timing.turn_id,
    }


def _append_session_history(session: dict[str, Any], role: str, text: str, *, max_turns: int = 4) -> None:
    cleaned = (text or "").strip()
    if not cleaned:
        return
    history = session.setdefault("history", [])
    history.append({"role": role, "text": cleaned})
    max_items = max_turns * 2
    if len(history) > max_items:
        del history[:-max_items]


def _history_for_llm(session: dict[str, Any]) -> list[dict[str, str]]:
    out: list[dict[str, str]] = []
    for item in session.get("history", []):
        role = "assistant" if item.get("role") == "assistant" else "user"
        text = (item.get("text") or "").strip()
        if text:
            out.append({"role": role, "content": text})
    return out


def _llm_detect_broad_course_intent(text: str, language_name: str) -> bool:
    """
    LLM classifier for broad course/department-list questions across mixed languages.
    Returns True only when the query asks for a broad list/menu of courses or departments.
    """
    try:
        client = get_groq_client()
        if not client:
            return False
        system_prompt = (
            "You classify user intent for a college kiosk.\n"
            "Return ONLY one token: BROAD_COURSE_MENU or OTHER.\n"
            "BROAD_COURSE_MENU means user is asking broad options/list of courses, branches, departments, programs.\n"
            "Examples: 'What courses are available?', 'list departments', 'courses kya hain', "
            "'departments batao', 'branches in college', and equivalent mixed-language queries.\n"
            "If the user asks about one specific department, return OTHER."
        )
        user_prompt = f"Language context: {language_name}\nQuery: {text.strip()}"
        completion = client.chat.completions.create(
            model=RAG_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.0,
            top_p=0.3,
            max_tokens=6,
        )
        result = (completion.choices[0].message.content or "").strip().upper()
        return result.startswith("BROAD_COURSE_MENU")
    except Exception:
        return False


def _log_turn_metrics(timing: TurnTiming, **extra: Any) -> None:
    payload = timing.structured_log(**extra)
    logger.info(json.dumps(payload, ensure_ascii=False, separators=(",", ":")))


def _normalize_tts_pronunciation(text: str) -> str:
    # Normalize known brand-name pronunciation for TTS voices.
    return re.sub(r"\bCLARA\b", "Clara", text or "", flags=re.IGNORECASE)


async def tts_to_base64_cached(
    text: str,
    language_code: str,
    *,
    turn_id: str | None = None,
    utterance_kind: str = "reply",
) -> tuple[str | None, bool]:
    tts_text = _normalize_tts_pronunciation(text)
    key = f"{utterance_kind}|{language_code}|{_normalized_cache_text(tts_text)}"
    logger.info(
        "TTS_REQUEST turn_id=%s kind=%s text_len=%d preview=%r",
        turn_id or "-",
        utterance_kind,
        len(tts_text or ""),
        _text_preview(tts_text),
    )
    cached = TTS_CACHE.get(key)
    if cached:
        logger.info(
            "TTS_RESULT turn_id=%s kind=%s source=cache audio_bytes=%d wav_duration_s=%.3f",
            turn_id or "-",
            utterance_kind,
            _audio_bytes_len(cached),
            ((_estimate_wav_duration_ms(cached) or 0.0) / 1000.0),
        )
        return cached, True

    key_lock = await _singleflight_lock_for(key)
    async with key_lock:
        cached = TTS_CACHE.get(key)
        if cached:
            logger.info(
                "TTS_RESULT turn_id=%s kind=%s source=cache_after_wait audio_bytes=%d wav_duration_s=%.3f",
                turn_id or "-",
                utterance_kind,
                _audio_bytes_len(cached),
                ((_estimate_wav_duration_ms(cached) or 0.0) / 1000.0),
            )
            return cached, True

        logger.info("TTS_HTTP_START turn_id=%s kind=%s", turn_id or "-", utterance_kind)
        audio = await sarvam_tts_to_base64(tts_text, language_code)
        if not audio and language_code != "en-IN":
            logger.warning(
                "TTS primary language failed turn_id=%s kind=%s lang=%s; retrying en-IN",
                turn_id or "-",
                utterance_kind,
                language_code,
            )
            audio = await sarvam_tts_to_base64(tts_text, "en-IN")
        logger.info("TTS_HTTP_END turn_id=%s kind=%s", turn_id or "-", utterance_kind)
        if audio:
            TTS_CACHE.set(key, audio)
        logger.info(
            "TTS_RESULT turn_id=%s kind=%s source=network audio_bytes=%d wav_duration_s=%.3f",
            turn_id or "-",
            utterance_kind,
            _audio_bytes_len(audio),
            ((_estimate_wav_duration_ms(audio or "") or 0.0) / 1000.0),
        )
        return audio, False


async def maybe_auto_detect_session_language(
    session: dict[str, Any],
    text: str,
    websocket: WebSocket,
    timing: TurnTiming,
    stt_meta: dict[str, Any] | None = None,
) -> None:
    if not AUTO_LANGUAGE_DETECT_ENABLED or not should_run_auto_detect(session):
        return

    detection = detect_language(
        text=text,
        stt_meta=stt_meta,
        threshold=AUTO_LANGUAGE_DETECT_CONFIDENCE_THRESHOLD,
    )
    is_fallback = detection.method == "threshold_fallback"

    set_session_language(
        session,
        detection.lang_key,
        is_auto=True,
        confidence=detection.confidence,
        method=detection.method,
        sample=text,
    )

    if is_fallback:
        logger.info(
            "Auto language detect fallback -> English (method=%s confidence=%.2f sample=%r)",
            detection.method,
            detection.confidence,
            text[:80],
        )
    else:
        logger.info(
            "Auto language detected: %s (%s, confidence=%.2f)",
            session.get("language_name"),
            detection.method,
            detection.confidence,
        )

    _, lang_name, lang_code = resolve_session_language(session)
    greeting_text = get_greeting(lang_name)
    greeting_audio_b64, _ = await tts_to_base64_cached(
        greeting_text,
        lang_code,
        turn_id=timing.turn_id,
        utterance_kind="auto_detect_greeting",
    )

    if session.get("messages"):
        first = session["messages"][0]
        if isinstance(first, dict) and first.get("id") == "greeting":
            first["text"] = greeting_text

    event_payload: dict[str, Any] = {
        "type": "language_auto_detected",
        "language": lang_name,
        "language_code_key": session.get("language_code_key"),
        "confidence": detection.confidence,
        "method": detection.method,
        "is_language_auto": True,
        "greetingText": greeting_text,
    }
    if greeting_audio_b64:
        event_payload["greetingAudioBase64"] = greeting_audio_b64

    event_payload.update(_debug_payload(timing))
    await websocket.send_json({"state": 5, "payload": event_payload})


async def _stream_groq_reply(
    *,
    session: dict[str, Any],
    user_text: str,
    system_prompt: str,
    websocket: WebSocket,
    timing: TurnTiming,
    on_first_sentence: Any | None = None,
) -> tuple[str, str]:
    client = await get_groq_client()
    if not client:
        return "", ""

    messages = [{"role": "system", "content": system_prompt}]
    messages.extend(_history_for_llm(session))
    messages.append({"role": "user", "content": user_text})

    timing.mark("llm_start")
    stream = await client.chat.completions.create(
        model=RAG_MODEL,
        messages=messages,
        stream=True,
        max_tokens=LLM_MAX_TOKENS,
        temperature=LLM_TEMPERATURE,
    )

    chunks: list[str] = []
    first_sentence = ""
    last_partial_sent = 0.0

    async for chunk in stream:
        delta = ""
        try:
            delta = (chunk.choices[0].delta.content or "")
        except Exception:
            delta = ""

        if not delta:
            continue

        if not timing.has("llm_first_token"):
            timing.mark("llm_first_token")
            timing.set_if_missing("first_feedback")

        chunks.append(delta)
        partial_text = "".join(chunks).strip()

        now_ms = asyncio.get_running_loop().time() * 1000.0
        if now_ms - last_partial_sent >= LLM_STREAM_PARTIAL_DEBOUNCE_MS:
            payload = {
                "type": "assistant_partial",
                "text": partial_text,
                "isProcessing": True,
            }
            payload.update(_debug_payload(timing))
            await websocket.send_json({"state": 5, "payload": payload})
            last_partial_sent = now_ms

        if not first_sentence:
            s1, _ = _split_first_sentence(partial_text)
            if s1 and s1.endswith((".", "!", "?")):
                first_sentence = s1
                if not timing.has("llm_first_sentence"):
                    timing.mark("llm_first_sentence")
                if on_first_sentence is not None:
                    try:
                        on_first_sentence(first_sentence)
                    except Exception:
                        pass

    timing.mark("llm_end")
    return "".join(chunks).strip(), first_sentence


async def _complete_groq_reply(
    *,
    session: dict[str, Any],
    user_text: str,
    system_prompt: str,
    timing: TurnTiming,
) -> tuple[str, str]:
    client = await get_groq_client()
    if not client:
        return "", ""
    messages = [{"role": "system", "content": system_prompt}]
    messages.extend(_history_for_llm(session))
    messages.append({"role": "user", "content": user_text})
    timing.mark("llm_start")
    completion = await client.chat.completions.create(
        model=RAG_MODEL,
        messages=messages,
        stream=False,
        max_tokens=LLM_MAX_TOKENS,
        temperature=LLM_TEMPERATURE,
    )
    timing.mark("llm_first_token")
    timing.set_if_missing("first_feedback")
    out = (completion.choices[0].message.content or "").strip()
    s1, _ = _split_first_sentence(out)
    if s1 and s1.endswith((".", "!", "?")) and not timing.has("llm_first_sentence"):
        timing.mark("llm_first_sentence")
    timing.mark("llm_end")
    return out, s1


async def process_user_text_and_reply(
    session: dict[str, Any],
    text: str,
    websocket: WebSocket,
    timing: TurnTiming,
    stt_meta: dict[str, Any] | None = None,
) -> None:
    """Shared flow: RAG context, Groq reply, TTS, send state 5 payload. Assumes text is non-empty."""
    _append_session_history(session, "user", text, max_turns=4)
    try:
        processing_payload = {"isProcessing": True}
        processing_payload.update(_debug_payload(timing))
        await websocket.send_json({"state": 5, "payload": processing_payload})
        if ENABLE_EARLY_PARTIAL_TEXT and not timing.has("first_feedback"):
            timing.mark("first_feedback")
            early_partial_payload = {
                "type": "assistant_partial",
                "text": "...",
                "isProcessing": True,
                "turn_id": timing.turn_id,
            }
            early_partial_payload.update(_debug_payload(timing))
            await websocket.send_json({"state": 5, "payload": early_partial_payload})
        if ENABLE_ACK_EARCON:
            ack_audio_b64 = _get_ack_earcon_base64()
            if not timing.has("play_start"):
                timing.mark("play_start")
                est = _estimate_wav_duration_ms(ack_audio_b64)
                if est is not None and not timing.has("play_end"):
                    timing.marks["play_end"] = timing.marks["play_start"] + est
            ack_payload = {
                "type": "assistant_ack_audio",
                "utterance_kind": "ack_earcon",
                "audioBase64": ack_audio_b64,
                "isProcessing": True,
                "turn_id": timing.turn_id,
            }
            ack_payload.update(_debug_payload(timing))
            await websocket.send_json({"state": 5, "payload": ack_payload})
    except Exception as exc:
        logger.warning("Could not send isProcessing: %s", exc)
        return

    await maybe_auto_detect_session_language(session, text, websocket, timing, stt_meta=stt_meta)
    lang_key, lang_name, lang_code = resolve_session_language(session)

    llm_cache_hit = False
    tts_cache_hit = False
    first_sentence_task: asyncio.Task | None = None
    first_sentence_sent = False

    try:
        intent = detect_intent(text)
        is_broad_course_menu = False
        if intent in (INTENT_COURSE_MENU, INTENT_NORMAL_QUERY):
            try:
                is_broad_course_menu = await asyncio.wait_for(
                    asyncio.to_thread(_llm_detect_broad_course_intent, text, lang_name),
                    timeout=1.6,
                )
            except asyncio.TimeoutError:
                is_broad_course_menu = False
            if is_broad_course_menu:
                intent = INTENT_COURSE_MENU
        detected_department = detect_department_name(text)
        off_topic_direct_reply: str | None = None
        if intent == INTENT_NORMAL_QUERY and not is_college_related_query(text):
            off_topic_direct_reply = get_off_topic_reply(lang_name)
        timing.mark("rag_start")
        if off_topic_direct_reply is not None:
            # Strict scope guard: do not answer non-college questions.
            context = ""
            timing.mark("rag_end")
        elif intent in (INTENT_HOD_PROFILE, INTENT_TRUSTEES_PROFILE, INTENT_HOD_TRUSTEES_PROFILE):
            # Profile/name queries are deterministic and should return instantly.
            context = ""
            timing.mark("rag_end")
        else:
            try:
                context = await asyncio.wait_for(
                    asyncio.to_thread(get_relevant_context, text, RAG_TOP_K, language=lang_key),
                    timeout=RAG_CONTEXT_TIMEOUT_S,
                )
            except asyncio.TimeoutError:
                logger.warning("RAG context timed out after %.2fs; continuing without context", RAG_CONTEXT_TIMEOUT_S)
                context = ""
            finally:
                timing.mark("rag_end")
            if context.strip():
                logger.info("RAG context: ok (%d chars)", len(context))
            else:
                logger.warning("RAG context: empty")
                json_context = _load_svit_json_context(lang_key)
                if json_context:
                    context = json_context
                    logger.info("RAG fallback: using JSON master context (%d chars)", len(context))

        # Intent-driven prompt control
        unavailable_reply = get_unavailable_reply(lang_name)
        off_topic_reply = get_off_topic_reply(lang_name)
        if intent == INTENT_COLLEGE_OVERVIEW:
            system_prompt = (
                f"You are CLARA, a sweet, helpful, and highly direct AI assistant for SVIT. Reply only in {lang_name}. "
                "CRITICAL: Keep responses extremely concise, punchy, and conversational. Maximum 2 to 3 short sentences. "
                "Do NOT output long lists, bullet points, or markdown. "
                "Tone: Warm, direct, and highly impactful. "
                "If user asks multiple distinct entities, answer all of them based strictly on context. "
                "For overview requests, summarize only the highest-impact facts."
            )
        elif intent == INTENT_DEPARTMENT_OVERVIEW:
            system_prompt = (
                f"You are CLARA, a sweet, helpful, and highly direct AI assistant for SVIT. Reply only in {lang_name}. "
                "CRITICAL: Keep responses extremely concise, punchy, and conversational. Maximum 2 to 3 short sentences. "
                "Do NOT output long lists, bullet points, or markdown. "
                "Tone: Warm, direct, and highly impactful. "
                "Give only a short department snapshot (leadership + core strength + one outcome) from context."
            )
        elif intent in (INTENT_HOD_PROFILE, INTENT_TRUSTEES_PROFILE, INTENT_HOD_TRUSTEES_PROFILE):
            system_prompt = (
                f"You are CLARA. Reply only in {lang_name}. "
                "Give a direct one-line answer with names only. No extra background."
            )
        else:
            system_prompt = (
                f"You are CLARA, a warm and professional campus receptionist for SVIT. "
                f"Reply only in {lang_name}. "
                "You are CLARA, a sweet, helpful, and highly direct AI assistant for SVIT. "
                "CRITICAL: Your responses MUST be extremely concise, punchy, and conversational. Maximum 2 to 3 short sentences. "
                "Do NOT output long lists, bullet points, or markdown formatting. "
                "If the user asks for fees or specific details, extract ONLY the exact number/fact from context and deliver it immediately. "
                "If the user asks multiple distinct questions or about multiple distinct entities in a single sentence, "
                "you MUST provide a complete answer for ALL of them based strictly on the provided context. "
                "Tone: Warm, direct, and highly impactful. "
                f"If information is unavailable, say exactly: {unavailable_reply}. "
                f"If the question is not related to SVIT/college topics, say exactly: {off_topic_reply}"
            )

        if context.strip():
            system_prompt += (
                " Use only the college information below when relevant. "
                f"Do not invent facts.\n\nCollege information:\n{context}"
            )

        context_sig = hashlib.sha256((context or "").encode("utf-8")).hexdigest()[:12]
        cache_key = f"v2-direct|{intent}|{lang_key}|{_normalized_cache_text(text)}|{context_sig}"
        direct_reply = off_topic_direct_reply or get_profile_direct_reply(intent, lang_name)
        if intent == INTENT_COURSE_MENU:
            direct_reply = get_course_menu_spoken_prompt(lang_name)
        reply_text = direct_reply or LLM_REPLY_CACHE.get(cache_key)
        first_sentence = ""

        async def _emit_first_sentence_audio(sentence: str) -> None:
            nonlocal first_sentence_sent
            if not sentence or first_sentence_sent:
                return
            timing.mark("tts_first_start")
            first_audio_b64, _ = await tts_to_base64_cached(
                sentence,
                lang_code,
                turn_id=timing.turn_id,
                utterance_kind="assistant_first_sentence",
            )
            timing.mark("tts_first_end")
            if not first_audio_b64:
                return
            first_sentence_sent = True
            if not timing.has("play_start"):
                timing.mark("play_start")
                est = _estimate_wav_duration_ms(first_audio_b64)
                if est is not None and not timing.has("play_end"):
                    timing.marks["play_end"] = timing.marks["play_start"] + est
            first_payload = {
                "type": "assistant_first_sentence_audio",
                "text": sentence,
                "audioBase64": first_audio_b64,
                "isProcessing": True,
                "turn_id": timing.turn_id,
                "utterance_kind": "assistant_first_sentence",
                "segment_index": 0,
                "is_final_segment": False,
            }
            first_payload.update(_debug_payload(timing))
            await websocket.send_json({"state": 5, "payload": first_payload})

        def _maybe_start_first_sentence_tts(sentence: str) -> None:
            nonlocal first_sentence_task
            if FORCE_FINAL_TTS_ONLY:
                return
            if not ENABLE_TTS_PIPELINING or not ENABLE_FIRST_SENTENCE_TTS:
                return
            if first_sentence_task is None and sentence and sentence.strip():
                first_sentence_task = asyncio.create_task(_emit_first_sentence_audio(sentence.strip()))

        if direct_reply:
            timing.mark("llm_start")
            timing.mark("llm_first_token")
            timing.mark("llm_end")
            first_sentence, _ = _split_first_sentence(reply_text)
            timing.set_if_missing("first_feedback")
            _maybe_start_first_sentence_tts(first_sentence)
        elif reply_text:
            llm_cache_hit = True
            timing.mark("llm_start")
            timing.mark("llm_first_token")
            timing.mark("llm_end")
            first_sentence, _ = _split_first_sentence(reply_text)
            timing.set_if_missing("first_feedback")
            _maybe_start_first_sentence_tts(first_sentence)
        else:
            try:
                if ENABLE_LLM_STREAMING:
                    reply_text, first_sentence = await asyncio.wait_for(
                        _stream_groq_reply(
                            session=session,
                            user_text=text,
                            system_prompt=system_prompt,
                            websocket=websocket,
                            timing=timing,
                            on_first_sentence=_maybe_start_first_sentence_tts,
                        ),
                        timeout=LLM_STREAM_TIMEOUT_S,
                    )
                else:
                    reply_text, first_sentence = await asyncio.wait_for(
                        _complete_groq_reply(
                            session=session,
                            user_text=text,
                            system_prompt=system_prompt,
                            timing=timing,
                        ),
                        timeout=LLM_STREAM_TIMEOUT_S,
                    )
            except asyncio.TimeoutError:
                logger.warning("Groq stream timed out after %.2fs", LLM_STREAM_TIMEOUT_S)
                timing.mark("llm_end")
                reply_text = ""
                first_sentence = ""
            except Exception as exc:
                logger.exception("Groq streaming failed: %s", exc)
                reply_text = ""
                first_sentence = ""

        if not reply_text:
            reply_text = unavailable_reply

        if not llm_cache_hit:
            LLM_REPLY_CACHE.set(cache_key, reply_text)
        _append_session_history(session, "assistant", reply_text, max_turns=4)

        if first_sentence and first_sentence != reply_text:
            logger.info(
                "TURN_TTS_SPLIT turn_id=%s first_sentence_len=%d full_reply_len=%d first_preview=%r full_preview=%r",
                timing.turn_id,
                len(first_sentence),
                len(reply_text),
                _text_preview(first_sentence),
                _text_preview(reply_text),
            )

        if (
            ENABLE_FIRST_SENTENCE_TTS
            and (not FORCE_FINAL_TTS_ONLY)
            and (not ENABLE_TTS_PIPELINING)
            and first_sentence
            and first_sentence != reply_text
        ):
            await _emit_first_sentence_audio(first_sentence)

        user_msg = {"id": f"user-{uuid.uuid4().hex}", "role": "user", "text": text}
        assistant_msg = {"id": f"clara-{uuid.uuid4().hex}", "role": "clara", "text": reply_text}
        if intent in (INTENT_COURSE_MENU, INTENT_DEPARTMENT_OVERVIEW):
            assistant_msg["isHidden"] = True
        
        # Mark card-driven intents so frontend opens the proper cards.
        show_card = None
        department_id = None
        course_menu_options = None
        if intent == INTENT_COLLEGE_OVERVIEW:
            show_card = "college"
        elif intent == INTENT_DEPARTMENT_OVERVIEW:
            show_card = "department_overview"
            department_id = detected_department or "CSE"
        elif intent == INTENT_HOD_PROFILE:
            show_card = "hod"
        elif intent == INTENT_TRUSTEES_PROFILE:
            show_card = "trustees"
        elif intent == INTENT_HOD_TRUSTEES_PROFILE:
            show_card = ["hod", "trustees"]
        elif intent == INTENT_COURSE_MENU:
            show_card = "course_menu"
            course_menu_options = get_course_menu_options()
            reply_text = get_course_menu_spoken_prompt(lang_name)
            assistant_msg["text"] = reply_text
            assistant_msg["isHidden"] = True

        if show_card is not None:
            assistant_msg["isCardData"] = True
            
        session["messages"] = session.get("messages", []) + [user_msg, assistant_msg]

        if first_sentence_task is not None:
            try:
                await first_sentence_task
            except Exception:
                logger.exception("First-sentence TTS task failed")

        tts_text = reply_text
        utterance_kind = "assistant_full_reply"
        segment_index = 0
        is_final_segment = True
        if first_sentence_sent and first_sentence and first_sentence.strip() == reply_text.strip():
            # Early first-sentence audio already covered the full reply; skip duplicate final TTS.
            tts_text = ""
            utterance_kind = "assistant_first_sentence_only"
            segment_index = 1
        elif (
            ENABLE_ONCE_ONLY_TTS_SEGMENTS
            and first_sentence_sent
            and first_sentence
            and first_sentence != reply_text
        ):
            _, remainder_text = _split_first_sentence(reply_text)
            remainder_text = remainder_text.strip()
            if remainder_text:
                tts_text = remainder_text
                utterance_kind = "assistant_remaining_reply"
                segment_index = 1
            else:
                tts_text = ""
                utterance_kind = "assistant_remaining_reply"
                segment_index = 1

        timing.mark("tts_start")
        full_audio_b64 = None
        tts_cache_hit = False
        if tts_text:
            full_audio_b64, tts_cache_hit = await tts_to_base64_cached(
                tts_text,
                lang_code,
                turn_id=timing.turn_id,
                utterance_kind=utterance_kind,
            )
        # Safety fallback: if segmented/final TTS returned nothing, retry once with full reply text.
        if not full_audio_b64 and reply_text.strip():
            fallback_audio_b64, fallback_cache_hit = await tts_to_base64_cached(
                reply_text,
                lang_code,
                turn_id=timing.turn_id,
                utterance_kind="assistant_full_reply_fallback",
            )
            if fallback_audio_b64:
                full_audio_b64 = fallback_audio_b64
                tts_cache_hit = tts_cache_hit or fallback_cache_hit
                utterance_kind = "assistant_full_reply_fallback"
                segment_index = 0
                is_final_segment = True
                tts_text = reply_text
        timing.mark("tts_end")
        if full_audio_b64 and not timing.has("play_start"):
            timing.mark("play_start")
            est = _estimate_wav_duration_ms(full_audio_b64)
            if est is not None:
                timing.marks["play_end"] = timing.marks["play_start"] + est

        tts_ms = timing.duration("tts_start", "tts_end") or 0.0
        log_voice_tts(
            timing.turn_id,
            tts_ms,
            len(tts_text),
            _text_preview(tts_text),
            _audio_bytes_len(full_audio_b64) if full_audio_b64 else 0,
            decoded_duration_ms=_estimate_wav_duration_ms(full_audio_b64) if full_audio_b64 else None,
        )

        timing.mark("turn_end")

        payload: dict[str, Any] = {
            "messages": session["messages"],
            "isProcessing": False,
            "isSpeaking": bool(full_audio_b64),
            "turn_id": timing.turn_id,
            "utterance_kind": utterance_kind,
            "segment_index": segment_index,
            "is_final_segment": is_final_segment,
            "showCard": show_card
        }
        if department_id:
            payload["departmentId"] = department_id
        if course_menu_options:
            payload["options"] = course_menu_options
        if full_audio_b64:
            payload["audioBase64"] = full_audio_b64

        payload.update(_debug_payload(timing))
        await websocket.send_json({"state": 5, "payload": payload})

        log_voice_turn_end(timing.turn_id, timing.summary_ms(), success=True)

        _log_turn_metrics(
            timing,
            llm_cache_hit=llm_cache_hit,
            tts_cache_hit=tts_cache_hit,
            language=session.get("language_name") or "English",
        )
    except Exception as exc:
        logger.exception("process_user_text_and_reply failed: %s", exc)
        timing.mark("turn_end")
        try:
            err_payload = _build_error_payload(
                "PROCESS_FAILED",
                "Something went wrong. Please try again.",
                timing.turn_id,
                recoverable=True,
            )
            err_payload.update(_debug_payload(timing))
            await websocket.send_json({"state": 5, "payload": err_payload})
        except Exception:
            pass
        _log_turn_metrics(timing, error="process_failed")
        log_voice_turn_end(timing.turn_id, timing.summary_ms(), success=False, error_code="PROCESS_FAILED")


@asynccontextmanager
async def lifespan(app: object):
    """Startup: log RAG document count, validate audio devices, warm clients. Shutdown: close clients."""
    try:
        await asyncio.wait_for(
            asyncio.to_thread(warmup_rag),
            timeout=RAG_WARMUP_TIMEOUT_S,
        )
    except asyncio.TimeoutError:
        logger.warning("RAG warmup timed out after %.1fs; continuing without warmup", RAG_WARMUP_TIMEOUT_S)
    except Exception as exc:
        logger.warning("RAG warmup exception: %s", exc)

    try:
        n = await asyncio.wait_for(
            asyncio.to_thread(get_rag_document_count),
            timeout=RAG_DOC_COUNT_TIMEOUT_S,
        )
        if n == 0:
            logger.warning("RAG: college_knowledge table is empty. Run: python -m backend.tools.ingest_college_knowledge_pg")
        else:
            logger.info("RAG: college_knowledge has %s documents.", n)
    except asyncio.TimeoutError:
        logger.warning("RAG doc-count check timed out after %.1fs", RAG_DOC_COUNT_TIMEOUT_S)
    except Exception as exc:
        logger.warning("RAG: could not check database: %s", exc)

    try:
        audio_ok, audio_msg = await asyncio.wait_for(
            asyncio.to_thread(validate_audio_devices),
            timeout=AUDIO_DEVICE_VALIDATE_TIMEOUT_S,
        )
        if not audio_ok:
            logger.warning("AUDIO: %s Set AUDIO_INPUT_DEVICE_INDEX or AUDIO_INPUT_DEVICE_NAME in .env", audio_msg)
        else:
            logger.info("AUDIO: %s", audio_msg)
    except asyncio.TimeoutError:
        logger.warning("AUDIO validation timed out after %.1fs; continuing", AUDIO_DEVICE_VALIDATE_TIMEOUT_S)

    asyncio.create_task(warmup_clients())
    yield
    await close_clients()


app = FastAPI(title="CLARA Backend", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        FRONTEND_URL,
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:5176",
        "http://localhost:5177",
        "http://localhost:5178",
        "http://localhost:5179",
        "http://localhost:5180",
        "http://localhost:5181",
        "http://localhost:5182",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5175",
        "http://127.0.0.1:5176",
        "http://127.0.0.1:5177",
        "http://127.0.0.1:5178",
        "http://127.0.0.1:5179",
        "http://127.0.0.1:5180",
        "http://127.0.0.1:5181",
        "http://127.0.0.1:5182",
        "http://127.0.0.1:8000",
        "http://localhost:8000",
        "http://127.0.0.1:8001",
        "http://localhost:8001",
        "http://127.0.0.1:8002",
        "http://localhost:8002",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root() -> dict[str, str]:
    return {"status": "ok", "service": "CLARA"}


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "healthy"}


VALID_LANGUAGES = frozenset(LANGUAGE_NAME_TO_CODE_KEY.keys())


@app.websocket("/ws/clara")
async def websocket_clara(websocket: WebSocket):
    await websocket.accept()
    logger.info("WebSocket client connected")
    session: dict[str, Any] = {
        "language": None,
        "language_code": None,
        "language_name": None,
        "language_code_key": None,
        "is_language_auto": None,
        "language_detection": None,
        "messages": [],
        "history": [],
        "cached_greeting_audio": None,
        "cached_greeting_message": None,
    }

    try:
        await websocket.send_json({"state": 0, "payload": None})

        while True:
            data = await websocket.receive_text()
            msg = json.loads(data) if data else {}
            action = msg.get("action") or msg.get("event")

            if action == "wake":
                await websocket.send_json({"state": 3, "payload": None})
                continue

            if action == "language_selected":
                language = msg.get("language")
                if language in VALID_LANGUAGES:
                    code_key = LANGUAGE_NAME_TO_CODE_KEY[language]
                    set_session_language(session, code_key, is_auto=False)
                    session["language_detection"] = None
                    try:
                        greeting_text = get_greeting(language)
                        audio_b64, _ = await tts_to_base64_cached(
                            greeting_text,
                            session["language_code"],
                            utterance_kind="language_selected_greeting",
                        )
                        if audio_b64:
                            session["cached_greeting_audio"] = audio_b64
                            greeting_msg = {"id": "greeting", "role": "clara", "text": greeting_text}
                            session["cached_greeting_message"] = greeting_msg
                            if not session.get("messages"):
                                session["messages"] = [greeting_msg]
                    except Exception as exc:
                        logger.exception("Preload greeting TTS failed: %s", exc)
                await websocket.send_json({"state": 5, "payload": None})
                continue

            if action == "conversation_started":
                _, lang_name, lang_code = resolve_session_language(session)
                greeting_text = get_greeting(lang_name)
                greeting_message = {"id": "greeting", "role": "clara", "text": greeting_text}

                audio_b64 = session.get("cached_greeting_audio")
                if audio_b64 and session.get("cached_greeting_message"):
                    payload = {
                        "messages": [session["cached_greeting_message"]],
                        "isSpeaking": True,
                        "audioBase64": audio_b64,
                        "turn_id": "greeting_selected"
                    }
                    session["cached_greeting_audio"] = None
                    session["cached_greeting_message"] = None
                    await websocket.send_json({"state": 5, "payload": payload})
                else:
                    audio_b64, _ = await tts_to_base64_cached(
                        greeting_text,
                        lang_code,
                        utterance_kind="conversation_started_greeting",
                    )
                    if not session.get("messages"):
                        session["messages"] = [greeting_message]
                    payload: dict[str, Any] = {
                        "messages": session["messages"],
                        "isSpeaking": bool(audio_b64),
                    }
                    if audio_b64:
                        payload["audioBase64"] = audio_b64
                        payload["turn_id"] = "greeting_started"
                    else:
                        payload["error"] = "Could not generate greeting audio."
                    await websocket.send_json({"state": 5, "payload": payload})
                continue

            if action == "user_message":
                text = (msg.get("text") or "").strip()
                timing = TurnTiming()
                timing.mark("transcript_ready")

                if not text:
                    timing.mark("turn_end")
                    payload = {"error": "Missing text", "isProcessing": False}
                    payload.update(_debug_payload(timing))
                    await websocket.send_json({"state": 5, "payload": payload})
                    _log_turn_metrics(timing, error="missing_text")
                else:
                    await process_user_text_and_reply(session, text, websocket, timing, stt_meta=None)
                continue

            if action in ("toggle_mic", "mic_start"):
                timing = TurnTiming()
                processing_payload = {"isProcessing": True, "turn_id": timing.turn_id}
                processing_payload.update(_debug_payload(timing))
                await websocket.send_json({"state": 5, "payload": processing_payload})

                dev_idx, dev_name = get_input_device_info()
                log_voice_capture_start(
                    timing.turn_id,
                    dev_idx,
                    dev_name,
                    sample_rate=16000,
                    channels=1,
                    dtype="int16",
                    mode=AUDIO_RECORD_MODE,
                    frame_ms=20,
                )

                wav_bytes, capture_error_code, capture_meta = None, None, {}
                try:
                    wav_bytes, capture_error_code, capture_meta = await asyncio.to_thread(record_audio)
                    timing.mark("record_end")
                except Exception as exc:
                    logger.exception("Backend recording failed: %s", exc)
                    capture_error_code = "RECORD_ERROR"
                    capture_meta = {}

                duration_ms = capture_meta.get("duration_ms", 0.0) or timing.since_start("record_end") or 0.0
                log_voice_capture_end(
                    timing.turn_id,
                    duration_ms,
                    len(wav_bytes) if wav_bytes else 0,
                    rms=capture_meta.get("rms"),
                    peak=capture_meta.get("peak"),
                    error_code=capture_error_code,
                )

                if not wav_bytes:
                    timing.mark("turn_end")
                    code = capture_error_code or "MIC_CAPTURE_FAILED"
                    msg = ERROR_RECOVERABLE_HINTS.get(code, "No speech heard.")
                    payload = _build_error_payload(code, msg, timing.turn_id)
                    payload.update(_debug_payload(timing))
                    await websocket.send_json({"state": 5, "payload": payload})
                    _log_turn_metrics(timing, error=code)
                    log_voice_turn_end(timing.turn_id, timing.summary_ms(), success=False, error_code=code)
                    continue

                try:
                    timing.mark("stt_start")
                    transcript, stt_meta = await sarvam_stt_from_wav(wav_bytes)
                    timing.mark("stt_end")
                    timing.mark("transcript_ready")
                    stt_ms = timing.duration("stt_start", "stt_end") or 0.0
                    log_voice_stt(
                        timing.turn_id,
                        stt_ms,
                        len(transcript or ""),
                        (transcript or "")[:80],
                    )
                except Exception as exc:
                    logger.exception("Sarvam STT failed: %s", exc)
                    timing.mark("turn_end")
                    payload = _build_error_payload("STT_FAILED", "Speech recognition failed. Please try again.", timing.turn_id)
                    payload.update(_debug_payload(timing))
                    await websocket.send_json({"state": 5, "payload": payload})
                    _log_turn_metrics(timing, error="stt_failed")
                    log_voice_turn_end(timing.turn_id, timing.summary_ms(), success=False, error_code="STT_FAILED")
                    continue

                if not (transcript or "").strip():
                    timing.mark("turn_end")
                    logger.warning("STT returned empty for %d-byte WAV", len(wav_bytes))
                    payload = _build_error_payload("STT_EMPTY", "No speech detected.", timing.turn_id)
                    payload.update(_debug_payload(timing))
                    await websocket.send_json({"state": 5, "payload": payload})
                    _log_turn_metrics(timing, error="stt_empty")
                    log_voice_turn_end(timing.turn_id, timing.summary_ms(), success=False, error_code="STT_EMPTY")
                    continue

                await process_user_text_and_reply(session, transcript.strip(), websocket, timing, stt_meta=stt_meta)
                continue

            if action in ("mic_stop", "mic_cancel"):
                await websocket.send_json({"state": 5, "payload": {"isProcessing": False}})
                continue

            if action == "menu_select":
                await websocket.send_json({"state": 5, "payload": msg})
                continue

            await websocket.send_json({"state": 5, "payload": msg})

    except Exception as exc:
        logger.exception("WebSocket error: %s", exc)
        try:
            await websocket.send_json({"state": -1, "payload": {"error": str(exc)}})
        except Exception:
            pass
    finally:
        logger.info("WebSocket client disconnected")
        try:
            await websocket.close()
        except Exception:
            pass


if __name__ == "__main__":
    import uvicorn

    logger.info("Groq API key: %s", "loaded" if GROQ_API_KEY else "not set (check .env)")
    logger.info("WebSocket: ws://localhost:%s/ws/clara - frontend VITE_WS_URL must match this", PORT)
    uvicorn.run(app, host=HOST, port=PORT)
