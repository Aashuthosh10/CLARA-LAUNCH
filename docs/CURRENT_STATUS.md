# Current Status

Last updated: 2026-05-02

## Completed Stabilization

- Backend security hardening: done.
- WebSocket tests: passing.
- Backend tests (`python -m pytest backend/tests -q`): 56 passed, 49 subtests passed.
- Frontend typecheck (`npm run lint`): passing.
- Frontend build (`npm run build`): passing; main app JS chunk reduced to about 442 kB via vendor chunking.
- Frontend audit (`npm audit --audit-level=high`): passing, 0 vulnerabilities.
- DB/RAG deterministic smoke (`python backend/tools/test_db_rag.py`): passing with 575 documents.
- Multilingual RAG smoke (`python -m backend.tools.rag_multilingual_check`): passing for `en`, `hi`, `kn`, `ta`, `te`, `ml`.
- Frontend E2E kiosk flow (`npm run test:e2e`): passing, 10/10 Playwright tests with a mocked local-safe WebSocket.
- Strict readiness mode: implemented behind `PRODUCTION_STRICT_READY=true`, with RAG minimum, provider-key, WebSocket-auth, and origin-lock checks.
- Provider failure coverage: mocked STT timeout, empty STT, TTS timeout, Groq timeout, and RAG unavailable paths are covered.
- Golden query matrix: admissions, fees, documents, HOD/profile, department overview, placements, location, course menu, off-topic, and multilingual/transliterated queries are covered.
- Low-latency response mode: implemented behind `LOW_LATENCY_VOICE_MODE=true`, with immediate visible text/cards and a later `assistant_audio_update` payload for audio.
- Receptionist fast paths: admissions, fees, documents, HOD/profile, department overview, placements, location, course menu, and off-topic flows avoid unnecessary Groq/RAG waits when deterministic local data is enough.

## Software Readiness Report

- Last production-check result: `DEGRADED` on 2026-05-02.
- Reason for degraded result: git working tree has uncommitted/dirty files; all software gates in the script passed.
- RAG document count: `575`.
- RAG minimum gate: `575 >= 500`, passing.
- Latest latency benchmark (`python -m backend.tools.latency_benchmark --turns 20 --label low-latency-receptionist`): visible answer p95 `242ms`; first audio-ready p95 `3,000ms`.
- Latency gate status: receptionist visible answer target passed (`<= 1,000ms`); audio-ready target passed at the configured `AUDIO_UPDATE_TIMEOUT_S=3.0` cap.
- Software readiness: `90-92%`.
- Overall production readiness: `88-90%`.
- Honest blocker to 100%: target kiosk microphone/speaker/provider-latency validation is still manual and not software-provable.

## Known Runtime Notes

- Voice smoke (`python -m backend.tools.voice_smoketest`): manual/hardware-dependent; must be re-run on target kiosk hardware.
- Frontend build still reports one non-blocking duplicate static/dynamic import warning for `college-logo.png`.
- `rag_data_report.md` is intentionally retained/restored.
- Python dependency audit (`python -m pip_audit --progress-spinner off`): passing, no known vulnerabilities in the current venv.
- Hugging Face may warn about unauthenticated model downloads unless `HF_TOKEN` is set; this is non-blocking for the local gate.
- Some TTS turns can hit the 3-second audio update cap. This is now a graceful text-first/audio-later behavior, not a stuck UI state.

## Remaining Major Product Work

- Real kiosk hardware smoke: sleep -> wake -> language -> chat -> voice answer -> reset.
- Real microphone capture quality validation on the target kiosk.
- Real speaker output quality and volume validation on the target kiosk.
- Live Groq/Sarvam latency and reliability validation with production keys.
- Real kiosk audio-start latency validation against the auditorium/desk speaker setup.
- Spoken checks for all six supported languages.
- Release from a clean, reviewed git state after intentional changes are committed.
- Deterministic sample-audio voice smoke companion (`voice_smoketest_sample.py`) for CI-safe voice coverage.
- Production deployment/recovery documentation for kiosk auto-start and health monitoring.
