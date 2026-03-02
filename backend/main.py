"""CLARA backend - FastAPI app with WebSocket support."""
import asyncio
import base64
import json
import logging
import os
import sys
import tempfile
import uuid
from contextlib import asynccontextmanager
from pathlib import Path

# Ensure backend directory is on path when run as script
_BACKEND_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(_BACKEND_DIR))

from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware

from config import (
    GROQ_API_KEY,
    HOST,
    PORT,
    FRONTEND_URL,
    RAG_MODEL,
    RAG_TOP_K,
    SARVAM_API_KEY,
    TARGET_LANGUAGE_CODES,
    LANGUAGE_NAME_TO_CODE_KEY,
)
from greetings import GREETINGS
from db import log_db_status
from rag import get_relevant_context, get_rag_document_count
from answer_generation import (
    INTENT_COLLEGE_OVERVIEW,
    detect_intent,
    build_overview_context,
    build_normal_context,
    generate_reply,
)
from core.audio_pipeline import record_audio
from stt import wav_to_transcript

logger = logging.getLogger(__name__)

# Safe payload shape: frontend expects messages (list), isProcessing (bool), isSpeaking (bool); error and audioBase64 optional.
def _safe_payload(
    messages: list | None = None,
    is_processing: bool = False,
    is_speaking: bool = False,
    error: str | None = None,
    audio_base64: str | None = None,
    **extra,
) -> dict:
    """Build payload that always has messages, isProcessing, isSpeaking. Never change shape."""
    payload = {
        "messages": list(messages) if messages is not None else [],
        "isProcessing": bool(is_processing),
        "isSpeaking": bool(is_speaking),
    }
    if error is not None:
        payload["error"] = error
    if audio_base64 is not None:
        payload["audioBase64"] = audio_base64
    for k, v in extra.items():
        payload[k] = v
    return payload


def tts_to_base64(text: str, language_code: str) -> str | None:
    """Convert text to speech via Sarvam; return base64 WAV or None on failure."""
    if not SARVAM_API_KEY or not text:
        return None
    try:
        from sarvamai import SarvamAI

        client = SarvamAI(api_subscription_key=SARVAM_API_KEY)
        audio = client.text_to_speech.convert(
            text=text,
            model="bulbul:v3",
            target_language_code=language_code,
        )
        
        # Manually concatenate audio chunks and write to temp file
        import base64 as b64
        combined_audio_data = b""
        for i, chunk in enumerate(audio.audios):
            chunk_data = b64.b64decode(chunk)
            if i == 0:
                combined_audio_data = chunk_data
            else:
                data_pos = chunk_data.find(b"data")
                if data_pos != -1:
                    combined_audio_data += chunk_data[data_pos + 8:]

        # Update WAV header for multiple chunks
        if len(audio.audios) > 1:
            total_size = len(combined_audio_data) - 8
            combined_audio_data = (
                combined_audio_data[:4]
                + total_size.to_bytes(4, "little")
                + combined_audio_data[8:]
            )
            data_pos = combined_audio_data.find(b"data")
            if data_pos != -1:
                data_size = len(combined_audio_data) - data_pos - 8
                combined_audio_data = (
                    combined_audio_data[:data_pos + 4]
                    + data_size.to_bytes(4, "little")
                    + combined_audio_data[data_pos + 8:]
                )

        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
            f.write(combined_audio_data)
            tmp_path = f.name
        
        with open(tmp_path, "rb") as rf:
            data = rf.read()
        
        try:
            os.unlink(tmp_path)
        except OSError:
            pass
            
        return base64.b64encode(data).decode("utf-8")
    except Exception as e:
        logger.error("TTS failed: %s", e, exc_info=True)
        return None


async def process_user_text_and_reply(session: dict, text: str, websocket: WebSocket) -> None:
    """Shared flow: RAG context, Groq reply, TTS (or digitalBook for overview), send state 5 payload. Assumes text is non-empty. Never raises."""
    messages = session.get("messages") or []
    try:
        await websocket.send_json({"state": 5, "payload": _safe_payload(messages=messages, is_processing=True)})
    except Exception as e:
        logger.warning("Could not send isProcessing: %s", e)
        return
    lang = session.get("language") or "English"
    lang_code = session.get("language_code") or TARGET_LANGUAGE_CODES.get("en", "en-IN")
    try:
        intent = detect_intent(text)
        if intent == INTENT_COLLEGE_OVERVIEW:
            context = build_overview_context()
        else:
            context = build_normal_context(text)
        if context.strip():
            logger.info("Intent=%s context_size=%d chars", intent, len(context))
        else:
            logger.warning("RAG context empty for query")

        reply_result = None
        try:
            if GROQ_API_KEY:
                from groq import Groq
                client = Groq(api_key=GROQ_API_KEY)
                reply_result = generate_reply(
                    intent, text, context, lang, messages, client, RAG_MODEL,
                    tts_callback=tts_to_base64 if intent == INTENT_COLLEGE_OVERVIEW else None,
                    language_code=lang_code if intent == INTENT_COLLEGE_OVERVIEW else None,
                )
            else:
                reply_result = "I'm sorry, the assistant is not configured."
        except Exception as e:
            logger.error("LLM/Groq failed: %s", e, exc_info=True)
            err_str = str(e).lower()
            status = getattr(e, "status_code", None) or getattr(e, "code", None)
            if status == 404 or "404" in err_str or ("model" in err_str and "not found" in err_str):
                logger.warning("Groq model not found (404). Check RAG_MODEL in .env")
            reply_result = None

        if intent == INTENT_COLLEGE_OVERVIEW and isinstance(reply_result, dict) and "digitalBook" in reply_result:
            user_msg = {"id": f"user-{uuid.uuid4().hex}", "role": "user", "text": text}
            session["messages"] = messages + [user_msg]
            payload = _safe_payload(
                messages=session["messages"],
                is_processing=False,
                is_speaking=False,
            )
            payload["digitalBook"] = reply_result["digitalBook"]
            await websocket.send_json({"state": 5, "payload": payload})
            return
        reply_text = reply_result if isinstance(reply_result, str) else None
        if not reply_text or not reply_text.strip():
            if context.strip():
                logger.info("Using RAG fallback reply (LLM unavailable or empty)")
                intro = "Based on our college information: "
                max_fallback_chars = 600
                trimmed = context.strip()
                if len(trimmed) > max_fallback_chars:
                    trimmed = trimmed[: max_fallback_chars - 3].rsplit(maxsplit=1)[0] + "..."
                reply_text = intro + trimmed
            else:
                reply_text = "I'm sorry, I couldn't process your request right now."
        user_msg = {"id": f"user-{uuid.uuid4().hex}", "role": "user", "text": text}
        assistant_msg = {"id": f"clara-{uuid.uuid4().hex}", "role": "clara", "text": reply_text}
        session["messages"] = messages + [user_msg, assistant_msg]
        audio_b64 = None
        try:
            audio_b64 = tts_to_base64(reply_text, lang_code)
        except Exception as e:
            logger.warning("TTS in process_user_text_and_reply: %s", e)
        payload = _safe_payload(
            messages=session["messages"],
            is_processing=False,
            is_speaking=bool(audio_b64),
            audio_base64=audio_b64,
        )
        if not audio_b64:
            payload["error"] = "Reply is shown but could not be read aloud."
        await websocket.send_json({"state": 5, "payload": payload})
    except Exception as e:
        logger.error("process_user_text_and_reply failed: %s", e, exc_info=True)
        try:
            await websocket.send_json({
                "state": 5,
                "payload": _safe_payload(
                    messages=session.get("messages", []),
                    is_processing=False,
                    error="Something went wrong. Please try again.",
                ),
            })
        except Exception:
            pass


@asynccontextmanager
async def lifespan(app: object):
    """Startup: health check logging (DB, model, port, RAG config). Do not stop server if DB fails."""
    logger.info("Environment loaded; port=%s", PORT)
    logger.info("RAG config: model=%s top_k=%s", RAG_MODEL, RAG_TOP_K)
    try:
        log_db_status()
        n = get_rag_document_count()
        if n == 0:
            logger.warning("RAG: college_knowledge table is empty. Run: python -m backend.ingest_college_knowledge_pg")
        else:
            logger.info("RAG: college_knowledge has %s documents.", n)
    except Exception as e:
        logger.warning("RAG: could not check database: %s. Running in LLM-only fallback mode.", e)
    yield


app = FastAPI(title="CLARA Backend", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        FRONTEND_URL,
        "http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "http://localhost:5176", "http://localhost:5177", "http://localhost:5178",
        "http://localhost:5179", "http://localhost:5180", "http://localhost:5181", "http://localhost:5182",
        "http://127.0.0.1:5173", "http://127.0.0.1:5174", "http://127.0.0.1:5175", "http://127.0.0.1:5176", "http://127.0.0.1:5177", "http://127.0.0.1:5178",
        "http://127.0.0.1:5179", "http://127.0.0.1:5180", "http://127.0.0.1:5181", "http://127.0.0.1:5182",
        "http://127.0.0.1:8000", "http://localhost:8000", "http://127.0.0.1:8001", "http://localhost:8001", "http://127.0.0.1:8002", "http://localhost:8002",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"status": "ok", "service": "CLARA"}


@app.get("/health")
def health():
    return {"status": "healthy"}


VALID_LANGUAGES = frozenset(LANGUAGE_NAME_TO_CODE_KEY.keys())


@app.websocket("/ws/clara")
async def websocket_clara(websocket: WebSocket):
    await websocket.accept()
    logger.info("WebSocket client connected")
    session = {"language": None, "language_code": None, "messages": [], "cached_greeting_audio": None, "cached_greeting_message": None}
    try:
        # FRONT-Clara-1 expects { state: number, payload?: any }
        # Send initial state so client shows sleep screen (can be overridden by ?state= for E2E)
        await websocket.send_json({"state": 0, "payload": None})
        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data) if data else {}
                action = msg.get("action") or msg.get("event")
                msgs = session.get("messages") or []
                if action == "wake":
                    await websocket.send_json({"state": 3, "payload": None})
                elif action == "language_selected":
                    try:
                        language = msg.get("language")
                        if language in VALID_LANGUAGES:
                            session["language"] = language
                            code_key = LANGUAGE_NAME_TO_CODE_KEY[language]
                            session["language_code"] = TARGET_LANGUAGE_CODES.get(code_key, "en-IN")
                            try:
                                greeting_text = GREETINGS.get(language, GREETINGS["English"])
                                audio_b64 = tts_to_base64(greeting_text, session["language_code"])
                                if audio_b64:
                                    session["cached_greeting_audio"] = audio_b64
                                    greeting_msg = {"id": "greeting", "role": "clara", "text": greeting_text}
                                    session["cached_greeting_message"] = greeting_msg
                                    if not session.get("messages"):
                                        session["messages"] = [greeting_msg]
                            except Exception as e:
                                logger.warning("Preload greeting TTS failed: %s", e)
                        await websocket.send_json({"state": 5, "payload": _safe_payload(messages=msgs, is_processing=False, is_speaking=False)})
                    except Exception as e:
                        logger.error("language_selected failed: %s", e, exc_info=True)
                        await websocket.send_json({"state": 5, "payload": _safe_payload(messages=msgs, is_processing=False, error="Something went wrong. Please try again.")})
                elif action == "conversation_started":
                    try:
                        lang = session.get("language") or "English"
                        greeting_text = GREETINGS.get(lang, GREETINGS["English"])
                        greeting_message = {"id": "greeting", "role": "clara", "text": greeting_text}
                        audio_b64 = session.get("cached_greeting_audio")
                        if audio_b64 and session.get("cached_greeting_message"):
                            payload = _safe_payload(
                                messages=[session["cached_greeting_message"]],
                                is_speaking=True,
                                audio_base64=audio_b64,
                            )
                            session["cached_greeting_audio"] = None
                            session["cached_greeting_message"] = None
                        else:
                            lang_code = session.get("language_code") or TARGET_LANGUAGE_CODES.get("en", "en-IN")
                            try:
                                audio_b64 = tts_to_base64(greeting_text, lang_code)
                            except Exception as e:
                                logger.warning("Greeting TTS failed: %s", e)
                                audio_b64 = None
                            if not session.get("messages"):
                                session["messages"] = [greeting_message]
                            payload = _safe_payload(
                                messages=session["messages"],
                                is_speaking=bool(audio_b64),
                                audio_base64=audio_b64,
                            )
                            if not audio_b64:
                                payload["error"] = "Could not generate greeting audio."
                        await websocket.send_json({"state": 5, "payload": payload})
                    except Exception as e:
                        logger.error("conversation_started failed: %s", e, exc_info=True)
                        await websocket.send_json({"state": 5, "payload": _safe_payload(messages=msgs, is_processing=False, error="Something went wrong. Please try again.")})
                elif action == "user_message":
                    text = (msg.get("text") or "").strip() if msg.get("text") is not None else ""
                    if not text:
                        await websocket.send_json({
                            "state": 5,
                            "payload": _safe_payload(messages=msgs, is_processing=False, error="Please provide a valid query."),
                        })
                    else:
                        await process_user_text_and_reply(session, text, websocket)
                elif action == "diary_tts":
                    try:
                        text = (msg.get("text") or "").strip() if msg.get("text") is not None else ""
                        lang_code = session.get("language_code") or TARGET_LANGUAGE_CODES.get("en", "en-IN")
                        audio_b64 = tts_to_base64(text, lang_code) if text else None
                        await websocket.send_json({
                            "state": 5,
                            "payload": _safe_payload(
                                messages=session.get("messages", []),
                                is_processing=False,
                                is_speaking=bool(audio_b64),
                                audio_base64=audio_b64,
                            ),
                        })
                    except Exception as e:
                        logger.warning("diary_tts failed: %s", e)
                        await websocket.send_json({
                            "state": 5,
                            "payload": _safe_payload(
                                messages=session.get("messages", []),
                                is_processing=False,
                                is_speaking=False,
                                audio_base64=None,
                                error="TTS unavailable for this page.",
                            ),
                        })
                elif action in ("toggle_mic", "mic_start"):
                    try:
                        await websocket.send_json({"state": 5, "payload": _safe_payload(messages=msgs, is_processing=True)})
                        wav_bytes = None
                        try:
                            wav_bytes = await asyncio.to_thread(record_audio)
                        except Exception as e:
                            logger.error("Backend recording failed: %s", e, exc_info=True)
                        if not wav_bytes:
                            await websocket.send_json({
                                "state": 5,
                                "payload": _safe_payload(messages=msgs, is_processing=False, error="No speech heard.", errorCode="MIC_CAPTURE_FAILED"),
                            })
                        else:
                            try:
                                transcript = wav_to_transcript(wav_bytes)
                            except Exception as e:
                                logger.error("Sarvam STT failed: %s", e, exc_info=True)
                                await websocket.send_json({
                                    "state": 5,
                                    "payload": _safe_payload(messages=msgs, is_processing=False, error="Speech recognition failed. Please try again.", errorCode="STT_FAILED"),
                                })
                            else:
                                if not (transcript or "").strip():
                                    logger.warning("STT returned empty for %d-byte WAV", len(wav_bytes))
                                    await websocket.send_json({
                                        "state": 5,
                                        "payload": _safe_payload(messages=msgs, is_processing=False, error="No speech detected.", errorCode="NO_SPEECH_DETECTED"),
                                    })
                                else:
                                    await process_user_text_and_reply(session, transcript.strip(), websocket)
                    except Exception as e:
                        logger.error("mic_start/toggle_mic failed: %s", e, exc_info=True)
                        await websocket.send_json({"state": 5, "payload": _safe_payload(messages=session.get("messages", []), is_processing=False, error="Something went wrong. Please try again.")})
                elif action in ("mic_stop", "mic_cancel"):
                    await websocket.send_json({"state": 5, "payload": _safe_payload(messages=msgs, is_processing=False)})
                elif action == "menu_select":
                    p = dict(msg) if isinstance(msg, dict) else {}
                    p.setdefault("messages", msgs)
                    p.setdefault("isProcessing", False)
                    p.setdefault("isSpeaking", False)
                    await websocket.send_json({"state": 5, "payload": p})
                else:
                    p = dict(msg) if isinstance(msg, dict) else {}
                    p.setdefault("messages", msgs)
                    p.setdefault("isProcessing", False)
                    p.setdefault("isSpeaking", False)
                    await websocket.send_json({"state": 5, "payload": p})
            except Exception as ex:
                logger.error("WebSocket message handling error: %s", ex, exc_info=True)
                try:
                    await websocket.send_json({
                        "state": 5,
                        "payload": _safe_payload(messages=session.get("messages", []), is_processing=False, error="Something went wrong. Please try again."),
                    })
                except Exception:
                    pass
    except Exception as e:
        logger.error("WebSocket error: %s", e, exc_info=True)
        try:
            await websocket.send_json({
                "state": 5,
                "payload": _safe_payload(messages=[], is_processing=False, error="Something went wrong. Please try again."),
            })
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
    logger.info("WebSocket: ws://localhost:%s/ws/clara — frontend VITE_WS_URL must match this", PORT)
    uvicorn.run(app, host=HOST, port=PORT)
