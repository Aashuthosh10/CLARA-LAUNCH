"""Backend audio capture: device resolution, VAD, WAV output. For use via asyncio.to_thread(record_audio).

On Linux, the `sounddevice` package requires the PortAudio system library (e.g. Debian/Ubuntu:
`portaudio19-dev`). CI does not install PortAudio; the import guard below lets the rest of
the app and unit tests load on headless runners.
"""
import io
import logging
import struct
import time
from typing import Optional

import numpy as np
import webrtcvad
try:
    import sounddevice as sd
    _SOUNDDEVICE_IMPORT_ERROR: Exception | None = None
except Exception as exc:  # pragma: no cover - depends on host audio libs
    sd = None  # type: ignore[assignment]
    _SOUNDDEVICE_IMPORT_ERROR = exc

from backend.config.settings import (
    AUDIO_CHANNELS,
    AUDIO_MAX_UTTERANCE_MS,
    AUDIO_SAMPLE_RATE,
    AUDIO_SILENCE_STOP_MS,
    AUDIO_SPEECH_TIMEOUT_MS,
    AUDIO_VAD_FRAME_MS,
    AUDIO_VAD_AGGRESSIVENESS,
    AUDIO_PREROLL_BUFFER_MS,
    AUDIO_INPUT_DEVICE_NAME,
    AUDIO_INPUT_DEVICE_INDEX,
    AUDIO_RECORD_MODE,
    AUDIO_FIXED_RECORD_SECONDS,
    AUDIO_SILENT_RMS_THRESHOLD,
)

logger = logging.getLogger(__name__)

# webrtcvad only accepts 10, 20, 30 ms
_VAD_FRAME_MS = 10 if AUDIO_VAD_FRAME_MS <= 10 else (20 if AUDIO_VAD_FRAME_MS <= 20 else 30)
SAMPLES_PER_FRAME = (AUDIO_SAMPLE_RATE * _VAD_FRAME_MS) // 1000
BYTES_PER_FRAME = SAMPLES_PER_FRAME * 2  # int16


def _require_sounddevice() -> None:
    if sd is None:
        detail = f": {_SOUNDDEVICE_IMPORT_ERROR}" if _SOUNDDEVICE_IMPORT_ERROR else ""
        raise RuntimeError(f"sounddevice unavailable{detail}")


def _resolve_input_device() -> int:
    """Resolve input device index from config (name substring or explicit index)."""
    _require_sounddevice()
    devices = list(sd.query_devices())
    if not devices:
        raise RuntimeError("No audio input devices found on this system.")

    default_device = sd.default.device
    try:
        default_in = default_device[0]
    except (TypeError, IndexError):
        default_in = default_device
    if default_in is None or default_in < 0 or default_in >= len(devices):
        default_in = next((i for i, dev in enumerate(devices) if dev.get("max_input_channels", 0) > 0), -1)
    if default_in < 0:
        raise RuntimeError("No audio input-capable devices found on this system.")

    if AUDIO_INPUT_DEVICE_INDEX is not None:
        if 0 <= AUDIO_INPUT_DEVICE_INDEX < len(devices) and devices[AUDIO_INPUT_DEVICE_INDEX].get("max_input_channels", 0) > 0:
            logger.info("Using audio input device index %s: %s", AUDIO_INPUT_DEVICE_INDEX, devices[AUDIO_INPUT_DEVICE_INDEX].get("name", "?"))
            return AUDIO_INPUT_DEVICE_INDEX
        logger.warning("AUDIO_INPUT_DEVICE_INDEX=%s invalid or no input; using default %s", AUDIO_INPUT_DEVICE_INDEX, default_in)

    if AUDIO_INPUT_DEVICE_NAME:
        name_lower = AUDIO_INPUT_DEVICE_NAME.lower()
        for i, dev in enumerate(devices):
            if dev.get("max_input_channels", 0) > 0 and name_lower in (dev.get("name") or "").lower():
                logger.info("Using audio input device by name '%s': index %s, %s", AUDIO_INPUT_DEVICE_NAME, i, dev.get("name"))
                return i
        logger.warning("No input device name containing '%s'; using default %s", AUDIO_INPUT_DEVICE_NAME, default_in)

    logger.info("Using default audio input device index %s: %s", default_in, devices[default_in].get("name", "?") if default_in < len(devices) else "?")
    return default_in


def get_input_device_info() -> tuple[int, str]:
    """Return (device_index, device_name) for logging."""
    try:
        _require_sounddevice()
        device_id = _resolve_input_device()
        devices = list(sd.query_devices())
        dev = devices[device_id] if 0 <= device_id < len(devices) else {}
        return device_id, dev.get("name", "?")
    except Exception as exc:
        logger.warning("Audio input device info unavailable: %s", exc)
        return -1, "No audio input device"


def validate_audio_devices() -> tuple[bool, str]:
    """
    Validate configured audio input (and optionally output) devices exist.
    Returns (ok, message). If not ok, message describes the issue.
    """
    try:
        _require_sounddevice()
        devices = sd.query_devices()
        if not devices:
            return False, "No audio devices found on this system."
        dev_idx, dev_name = get_input_device_info()
        if dev_idx >= len(devices):
            return False, f"Audio input device index {dev_idx} out of range."
        dev = devices[dev_idx]
        if dev.get("max_input_channels", 0) < 1:
            return False, f"Device {dev_name} (index {dev_idx}) has no input channels."
        return True, f"Audio input OK: {dev_name} (index {dev_idx})"
    except Exception as e:
        return False, f"Audio device validation failed: {e}"


def _frame_to_mono(frame: np.ndarray, channels: int) -> bytes:
    """Convert (samples, channels) int16 to mono bytes."""
    if channels <= 1:
        return frame.tobytes()
    mono = frame.mean(axis=1).astype(np.int16)
    return mono.tobytes()


def _compute_rms(mono_bytes: bytes) -> float:
    """Compute RMS (normalized 0..1) from mono int16 PCM."""
    if len(mono_bytes) < 2:
        return 0.0
    arr = np.frombuffer(mono_bytes, dtype=np.int16)
    return float(np.sqrt(np.mean(arr.astype(np.float64) ** 2)) / 32768.0)


def _record_fixed_duration(
    device_id: int, devices: list, channels: int
) -> tuple[Optional[bytes], Optional[str], dict]:
    """Record exactly AUDIO_FIXED_RECORD_SECONDS. Returns (wav_bytes, error_code, meta)."""
    duration_s = max(0.5, min(30.0, AUDIO_FIXED_RECORD_SECONDS))
    samples_total = int(AUDIO_SAMPLE_RATE * duration_s) * channels
    rec = sd.rec(samples_total, samplerate=AUDIO_SAMPLE_RATE, channels=channels, dtype="int16", device=device_id)
    sd.wait()
    if channels > 1:
        mono_arr = rec.mean(axis=1).astype(np.int16)
    else:
        mono_arr = rec.squeeze()
    mono_bytes = mono_arr.tobytes()
    rms = _compute_rms(mono_bytes)
    peak = float(np.abs(np.frombuffer(mono_bytes, dtype=np.int16)).max() / 32768.0) if len(mono_bytes) >= 2 else 0.0
    meta = {"duration_ms": duration_s * 1000, "rms": rms, "peak": peak}
    logger.info("Fixed record: %.2f s, RMS=%.6f", duration_s, rms)
    if rms < AUDIO_SILENT_RMS_THRESHOLD:
        logger.warning("MIC_SILENT: RMS %.6f below threshold %.6f", rms, AUDIO_SILENT_RMS_THRESHOLD)
        return None, "MIC_SILENT", meta
    return _build_wav_from_mono_bytes(mono_bytes), None, meta


def _build_wav_from_mono_bytes(mono: bytes) -> bytes:
    """Build WAV from mono int16 PCM bytes."""
    if len(mono) == 0:
        return b""
    n_frames = len(mono) // 2
    buf = io.BytesIO()
    buf.write(b"RIFF")
    buf.write(struct.pack("<I", 36 + n_frames * 2))
    buf.write(b"WAVEfmt ")
    buf.write(struct.pack("<IHHIIHH", 16, 1, 1, AUDIO_SAMPLE_RATE, AUDIO_SAMPLE_RATE * 2, 2, 16))
    buf.write(b"data")
    buf.write(struct.pack("<I", n_frames * 2))
    buf.write(mono)
    return buf.getvalue()


def record_audio() -> tuple[Optional[bytes], Optional[str], dict]:
    """
    Record from configured input. Mode "fixed": record N seconds; mode "vad": VAD start/stop.
    Returns (wav_bytes, error_code, meta). Success: (bytes, None, meta). Failure: (None, code, meta).
    Error codes: MIC_SILENT, VAD_TIMEOUT, RECORD_ERROR.
    Intended to be run in asyncio.to_thread() so the event loop is not blocked.
    """
    start_ms = time.perf_counter() * 1000.0
    empty_meta: dict = {}
    try:
        device_id = _resolve_input_device()
        devices = sd.query_devices()
        dev = devices[device_id] if device_id < len(devices) else {}
        dev_name = dev.get("name", "?")
        max_ch = min(dev.get("max_input_channels", 1), max(1, AUDIO_CHANNELS))
        channels = max(1, max_ch)
        logger.info("record_audio: device_id=%s name=%s channels=%s mode=%s", device_id, dev_name, channels, AUDIO_RECORD_MODE)

        if AUDIO_RECORD_MODE == "fixed":
            wav, err, meta = _record_fixed_duration(device_id, devices, channels)
            meta["duration_ms"] = (time.perf_counter() * 1000.0 - start_ms)
            return wav, err, meta

        # VAD mode: 16kHz mono int16, 20ms frames, bytes = .tobytes()
        agg = max(0, min(3, AUDIO_VAD_AGGRESSIVENESS))
        vad = webrtcvad.Vad(agg)
        silence_frames_to_stop = (AUDIO_SILENCE_STOP_MS + _VAD_FRAME_MS - 1) // _VAD_FRAME_MS
        speech_timeout_frames = max(1, (AUDIO_SPEECH_TIMEOUT_MS + _VAD_FRAME_MS - 1) // _VAD_FRAME_MS)
        max_utterance_frames = max(1, (AUDIO_MAX_UTTERANCE_MS + _VAD_FRAME_MS - 1) // _VAD_FRAME_MS)
        preroll_frames = max(0, (AUDIO_PREROLL_BUFFER_MS + _VAD_FRAME_MS - 1) // _VAD_FRAME_MS)
        block_size = (AUDIO_SAMPLE_RATE * _VAD_FRAME_MS) // 1000
        accumulated: list[bytes] = []
        preroll: list[bytes] = []
        consecutive_silence = 0
        speech_started = False
        frames_without_speech = 0
        speech_frames = 0

        def _finalize_wav(chunks: list[bytes]) -> Optional[bytes]:
            if not chunks:
                return None
            wav = _build_wav_from_chunks(chunks)
            mono = b"".join(chunks)
            if len(mono) >= BYTES_PER_FRAME and _compute_rms(mono) < AUDIO_SILENT_RMS_THRESHOLD:
                logger.warning("MIC_SILENT: VAD segment RMS below threshold")
                return None
            return wav

        with sd.InputStream(
            device=device_id,
            samplerate=AUDIO_SAMPLE_RATE,
            channels=channels,
            dtype="int16",
            blocksize=block_size,
        ) as stream:
            while True:
                frame, overflowed = stream.read(block_size)
                if overflowed:
                    logger.warning("InputStream overflow")
                raw_mono = _frame_to_mono(frame, channels)
                if len(raw_mono) < BYTES_PER_FRAME:
                    continue
                for off in range(0, len(raw_mono) - BYTES_PER_FRAME + 1, BYTES_PER_FRAME):
                    vad_frame = raw_mono[off : off + BYTES_PER_FRAME]
                    if vad.is_speech(vad_frame, AUDIO_SAMPLE_RATE):
                        if not speech_started:
                            speech_started = True
                            logger.info("Speech detected start")
                            accumulated = list(preroll)
                        consecutive_silence = 0
                        speech_frames += 1
                        if speech_frames >= max_utterance_frames:
                            logger.info("Stop condition reached (max utterance %s ms)", AUDIO_MAX_UTTERANCE_MS)
                            accumulated.append(raw_mono[: off + BYTES_PER_FRAME])
                            wav = _finalize_wav(accumulated)
                            meta = {"duration_ms": time.perf_counter() * 1000.0 - start_ms, "rms": _compute_rms(b"".join(accumulated)) if accumulated else 0.0}
                            return (wav, "MIC_SILENT" if wav is None else None, meta)
                    else:
                        consecutive_silence += 1
                        if speech_started and consecutive_silence >= silence_frames_to_stop:
                            logger.info("Stop condition reached (silence frames %s)", consecutive_silence)
                            accumulated.append(raw_mono[:off])
                            wav = _finalize_wav(accumulated)
                            meta = {"duration_ms": time.perf_counter() * 1000.0 - start_ms, "rms": _compute_rms(b"".join(accumulated)) if accumulated else 0.0}
                            return (wav, "MIC_SILENT" if wav is None else None, meta)
                accumulated.append(raw_mono)
                if not speech_started:
                    preroll.append(raw_mono)
                    if len(preroll) > preroll_frames:
                        preroll.pop(0)
                    frames_without_speech += 1
                    if frames_without_speech >= speech_timeout_frames:
                        logger.warning("No speech detected within timeout (%s ms)", AUDIO_SPEECH_TIMEOUT_MS)
                        rms = _compute_rms(b"".join(preroll)) if preroll else 0.0
                        meta = {"duration_ms": time.perf_counter() * 1000.0 - start_ms, "rms": rms}
                        return None, "VAD_TIMEOUT", meta
                else:
                    frames_without_speech = 0
    except Exception as e:
        logger.exception("Recording failed: %s", e)
        return None, "RECORD_ERROR", {"duration_ms": time.perf_counter() * 1000.0 - start_ms}


def _build_wav_from_chunks(chunks: list[bytes]) -> bytes:
    """Build mono 16-bit WAV from list of mono PCM chunks."""
    mono = b"".join(chunks)
    if len(mono) == 0:
        return b""
    n_frames = len(mono) // 2
    buf = io.BytesIO()
    buf.write(b"RIFF")
    buf.write(struct.pack("<I", 36 + n_frames * 2))
    buf.write(b"WAVEfmt ")
    buf.write(struct.pack("<IHHIIHH", 16, 1, 1, AUDIO_SAMPLE_RATE, AUDIO_SAMPLE_RATE * 2, 2, 16))
    buf.write(b"data")
    buf.write(struct.pack("<I", n_frames * 2))
    buf.write(mono)
    return buf.getvalue()
