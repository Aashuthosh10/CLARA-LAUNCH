# CLARA Voice Pipeline — Troubleshooting

## Quick Commands

```bash
# Run voice smoke test 5 times
cd clara-deploy-frontend
for /L %i in (1,1,5) do python -m backend.tools.voice_smoketest

# List audio devices
python -m backend.tools.mic_probe

# Test Sarvam TTS voice
python -m backend.tools.sarvam_voice_test
```

## Smoke Test Pass Criteria

- **Capture**: RMS > 0.001, WAV bytes > 1000
- **STT**: Non-empty transcript
- **LLM**: Non-empty reply (or skip if GROQ_API_KEY not set)
- **TTS**: Non-empty base64 audio
- **Playback**: Completes without error

## Device Selection

| Env var | Purpose |
|---------|---------|
| `AUDIO_INPUT_DEVICE_INDEX` | Mic by index (0, 1, 2...) |
| `AUDIO_INPUT_DEVICE_NAME` | Mic by name substring (e.g. "ReSpeaker") |
| `AUDIO_OUTPUT_DEVICE_INDEX` | Speaker for smoke test playback |
| `AUDIO_OUTPUT_DEVICE_NAME` | Speaker by name substring |

To find device indices, run `python -m backend.tools.mic_probe`.

## Error Codes

| Code | Meaning | Fix |
|------|---------|-----|
| `MIC_SILENT` | RMS below threshold | Check mic selection, speak closer |
| `VAD_TIMEOUT` | No speech within 10s | Speak within 10 seconds of tapping mic |
| `STT_EMPTY` | STT returned empty transcript | Speak clearly, check SARVAM_LANGUAGE_CODE |
| `STT_FAILED` | Sarvam API error | Check SARVAM_API_KEY, network |
| `MIC_CAPTURE_FAILED` | No WAV captured | Check mic connection, permissions |
| `RECORD_ERROR` | Recording exception | Check mic, sounddevice |
| `PROCESS_FAILED` | LLM/TTS pipeline error | Check logs, retry |

## Symptom → Cause → Fix

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| "No speech heard" | MIC_SILENT or VAD_TIMEOUT | Set AUDIO_SILENT_RMS_THRESHOLD lower, or use fixed mode |
| Infinite listening | VAD too strict | Lower AUDIO_VAD_AGGRESSIVENESS (0–3) |
| Instant stop | VAD too aggressive | Raise AUDIO_VAD_AGGRESSIVENESS |
| No audio playback | Frontend decode/play | Check browser console, audio format |
| Truncated TTS | First-sentence-only bug | Ensure full reply_text passed to TTS |
| Stuck in "thinking" | No terminal event | Backend must always send done or error |
| STT 400 error | Invalid language_code | Set SARVAM_LANGUAGE_CODE to 'unknown' or valid code |

## VAD Tuning

- `AUDIO_VAD_AGGRESSIVENESS`: 0 (least) to 3 (most). Default 2.
- `AUDIO_SILENCE_STOP_MS`: Silence duration to stop. Default 600.
- `AUDIO_SPEECH_TIMEOUT_MS`: Max wait for speech start. Default 10000.
- `AUDIO_PREROLL_BUFFER_MS`: Audio before speech start. Default 300.
- `AUDIO_SILENT_RMS_THRESHOLD`: Reject if RMS below this. Default 0.001.
