# CLARA Voice Pipeline — Verification Checklist

## Pre-Deploy Verification

- Classification: `backend.tools.voice_smoketest` is a **manual hardware/runtime** smoke check (non-CI-blocking).
- [ ] Run smoke test 5 times: `for /L %i in (1,1,5) do python -m backend.tools.voice_smoketest`
- [ ] All 5 runs show PASS
- [ ] Backend starts without audio validation error
- [ ] Mic probe lists devices: `python -m backend.tools.mic_probe`

## Deterministic Companion Coverage

- Planned companion check: `backend.tools.voice_smoketest_sample` (sample WAV, no live capture).
- CI should run deterministic sample-audio smoke checks only.
- Manual release checklist must still include live mic/speaker smoke runs from this document.

## Voice Flow Verification

1. **Backend mode** (VITE_VOICE_INPUT_MODE=backend):
   - [ ] Tap orb → isProcessing shown
   - [ ] Speak → transcript appears, TTS plays
   - [ ] Silent tap → error with hint (MIC_SILENT or VAD_TIMEOUT)
   - [ ] Error shows in chat (system message with hint)

2. **Browser mode** (default):
   - [ ] Tap orb → Web Speech API listens
   - [ ] Speak → transcript sent, reply plays

3. **Terminal events**:
   - [ ] Every turn ends with done (messages + audio) or error
   - [ ] No stuck listening/thinking/speaking

## Config Checklist

- [ ] AUDIO_INPUT_DEVICE_INDEX or AUDIO_INPUT_DEVICE_NAME if multiple mics
- [ ] SARVAM_LANGUAGE_CODE = 'unknown' or valid (en-IN, hi-IN, etc.)
- [ ] SARVAM_API_KEY set for STT/TTS
- [ ] GROQ_API_KEY set for LLM

## Logs to Check

Voice instrumentation emits JSON lines:
- `stage: capture_start` — device, sample_rate, mode
- `stage: capture_end` — duration_ms, wav_bytes, rms, error_code
- `stage: stt` — latency_ms, transcript_len
- `stage: tts` — latency_ms, text_len, audio_bytes
- `stage: turn_end` — success, timings_ms, error_code
