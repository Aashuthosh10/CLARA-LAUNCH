"""Sarvam ASR: WAV bytes -> transcript."""
from __future__ import annotations

import logging
from typing import Any, Optional

from backend.clients.provider_clients import sarvam_stt_from_wav

logger = logging.getLogger(__name__)


def wav_to_transcript_with_meta(wav_bytes: bytes) -> tuple[Optional[str], dict[str, Any]]:
    """Send WAV (16 kHz mono preferred) to Sarvam ASR; return (transcript, metadata)."""
    try:
        import asyncio

        text, stt_meta = asyncio.run(sarvam_stt_from_wav(wav_bytes))
        if text is not None and (text or "").strip():
            logger.info("STT result: %r", (text or "").strip()[:200])
            return (text or "").strip(), stt_meta
        logger.warning("STT returned empty (meta=%s)", stt_meta)
        return None, stt_meta
    except Exception as e:
        logger.exception("Sarvam STT failed: %s", e)
        return None, {}


def wav_to_transcript(wav_bytes: bytes) -> Optional[str]:
    """Backward-compatible transcript-only API."""
    transcript, _ = wav_to_transcript_with_meta(wav_bytes)
    return transcript
