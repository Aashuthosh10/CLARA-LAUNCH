# Audio Latency Runbook (Ops)

## Fast Diagnosis Order

1. Verify backend is reachable on `:6969` and frontend on `:5176`.
2. Run:
   - `python -m backend.tools.mic_probe`
   - `python -m backend.tools.latency_probe --url ws://localhost:6969/ws/clara --turns 10 --origin http://localhost:5176`
3. Check if `isSpeaking` drops and whether `total_ms` spikes above 8s.

## Control Knobs

- `AUDIO_INPUT_DEVICE_INDEX` / `AUDIO_INPUT_DEVICE_NAME`
- `AUDIO_SILENCE_STOP_MS` / `AUDIO_MAX_UTTERANCE_MS`
- `RAG_CONTEXT_TIMEOUT_S`
- `MULTILINGUAL_PREPROCESSOR_TIMEOUT_S`
- `LLM_STREAM_TIMEOUT_S`
- `TTS_TIMEOUT_S`

## Rollback Profiles

### Stable profile (current)
- `AUDIO_SILENCE_STOP_MS=800`
- `AUDIO_MAX_UTTERANCE_MS=9000`
- `RAG_CONTEXT_TIMEOUT_S=0.8`
- `MULTILINGUAL_PREPROCESSOR_TIMEOUT_S=1.6`
- `LLM_STREAM_TIMEOUT_S=8.0`
- `TTS_TIMEOUT_S=4.0`

### Conservative speech-completion profile
- `AUDIO_SILENCE_STOP_MS=900`
- `AUDIO_MAX_UTTERANCE_MS=9000`
- Use only if users report early cut-offs.

### Latency-first fallback profile
- `AUDIO_SILENCE_STOP_MS=700`
- `AUDIO_MAX_UTTERANCE_MS=8000`
- `RAG_CONTEXT_TIMEOUT_S=0.6`
- `LLM_STREAM_TIMEOUT_S=6.0`
- `TTS_TIMEOUT_S=3.0`
- Use only when cloud latency/rate limits are severe.

## SLO Gate Suggestion

- Run 20-turn probe before release.
- Block rollout when:
  - `total_ms p95 > 4000` OR
  - `isSpeaking=False` on more than 10% of turns.
