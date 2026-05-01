# CLARA Audio + Latency Remediation Report

Date: 2026-04-26 (local)

## Completed Work

1. Baseline instrumentation and repeat probes collected:
   - `backend/tools/post_fix_benchmark.json`
   - `backend/tools/tuned_benchmark.json`
   - `backend/tools/final_tuned_benchmark.json`
   - `backend/tools/post_fix_probe.txt`
   - `backend/tools/tuned_probe.txt`
   - `backend/tools/final_tuned_probe.txt`
2. Device-selection hardening completed:
   - `AUDIO_INPUT_DEVICE_INDEX` is now primary operational input selector.
   - `MIC_DEVICE_INDEX` retained only as legacy fallback in settings and docs.
   - `.env` updated to explicit `AUDIO_INPUT_DEVICE_INDEX=1` (matches machine default input from probe).
3. VAD profile sweep executed with deterministic probe:
   - Added `backend/tools/vad_profile_probe.py`
   - Output: `backend/tools/vad_profile_probe.json`
   - Chosen baseline profile remains `AUDIO_SILENCE_STOP_MS=800`, `AUDIO_MAX_UTTERANCE_MS=9000`.
4. Provider-stage latency guards applied:
   - Lowered context and stream tail defaults:
     - `MULTILINGUAL_PREPROCESSOR_TIMEOUT_S=1.6`
     - `LLM_STREAM_TIMEOUT_S=8.0`
     - `RAG_CONTEXT_TIMEOUT_S=0.8`
   - Added hard TTS timeout control:
     - `TTS_TIMEOUT_S=4.0` in settings/env
     - Enforced via `asyncio.wait_for(...)` in `tts_to_base64_cached(...)`.
5. Playback/failure hardening:
   - Browser autoplay priming already integrated in frontend chat screen.
   - Backend now degrades faster to text-only on slow/unavailable TTS paths.
6. Validation gates run:
   - Backend tests: `37 passed`
   - Frontend lint: pass
   - Frontend build: pass

## Key Measured Outcomes

- Tuned benchmark (`final_tuned_benchmark.json`):
  - `TOTAL p50=2238ms`, `p95=10713ms`, `mean=3901ms`
- Tuned websocket probe (`final_tuned_probe.txt`):
  - `ttft p50=0.3ms`, `ttfs p50=0.4ms`
  - `total p50=8511ms`, `p95=12946ms`
  - Some turns returned `isSpeaking=False` due intentional fast-fail TTS timeout behavior.

## What Is Fixed vs What Remains

Fixed:
- Port and websocket origin consistency.
- Legacy input-device ambiguity.
- Deprecated Groq model usage.
- Frontend autoplay unlock reliability path.
- Hard timeout controls preventing unbounded provider stalls.

Remaining external bottleneck:
- Cloud-provider variance and rate limits still dominate p95/p99 tails (Groq + TTS).
- This environment does not yet meet strict `<1.5s end-of-speech to first audible semantic response` consistently.

## Recommended Next Production Actions

1. Move Groq account to higher TPM tier or lower concurrent token pressure.
2. Add local/edge TTS fallback (or pre-generated response audio bank) for high-frequency prompts.
3. Add turn-level SLO gate in CI/ops:
   - fail deployment if `TOTAL p95 > 4000ms` on standard probe profile.
4. Run a longer soak on target kiosk hardware with realistic microphone signal and network path.
