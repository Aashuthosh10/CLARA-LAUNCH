# CLARA Coding Agent Instructions

## Mandatory context (read before substantive work)

Treat the following as **authoritative narrative and invariants** for this repo. Read them **fully** at the start of a task session (not skimmed, not replaced by chat summaries alone):

1. `AGENTS.md` (this document)
2. `docs/CLARA_PROJECT_MEMORY.md`

After that, use `README.md` and the file map in the sections below for the specific area you are changing.

## Project Identity

- CLARA is a multilingual AI receptionist kiosk.
- Stack: React/Vite frontend + FastAPI/WebSocket backend + PostgreSQL/pgvector RAG.
- Primary user-facing flows are voice-first and state-driven.
- Current production posture: repo-side checks are strong; final readiness still depends on target kiosk voice/hardware validation.

## Read Before Editing (Required)

1. `AGENTS.md` (this file)
2. `docs/CLARA_PROJECT_MEMORY.md`
3. `README.md`
4. If editing backend behavior: `backend/app/main.py`, `backend/app/ws_schemas.py`, `backend/services/answer_generation.py`
5. If editing frontend behavior: `frontend/src/App.tsx`, `frontend/src/hooks/useWebSocket.ts`, `frontend/src/screens/ChatScreen.tsx`

## Features That Must Be Preserved

- Wake -> language gate -> conversation lifecycle.
- Existing WebSocket action contract and payload compatibility.
- Voice pipeline (STT/TTS) and graceful degradation behavior.
- Session staleness protection (`session_gen`, `wire_seq`).
- RAG retrieval with safe fallback when DB is unavailable.
- Existing card/menu/department interaction behavior.
- Hard reset semantics returning kiosk to sleep with clean session state.
- Health/readiness monitoring endpoints: `/health` and `/ready`.

## Hard Rules for Safe Edits

- Do not make broad refactors unless explicitly requested.
- Do not change UI flow, voice behavior, WebSocket contract, or RAG behavior unless explicitly requested.
- Make one focused change per task.
- Keep changes minimal and localized.
- Never remove fallback/error-handling paths without explicit request.
- Do not delete files unless explicitly requested.

## Commands

- Backend run: `python -m backend.main`
- Frontend run: `cd frontend && npm run dev`
- Backend deps: `pip install -r backend/requirements/requirements.txt`
- Initialize or repair local RAG DB: `powershell -ExecutionPolicy Bypass -File scripts\db\init-rag-db.ps1`
- Ingest RAG data: `python -m backend.tools.ingest_college_knowledge_pg`
- Production check bundle: `powershell -ExecutionPolicy Bypass -File scripts\production-check.ps1`
- Frontend E2E kiosk flow: start backend/frontend, then `cd frontend && npm run test:e2e`

## Current Verified Production Gates

Last verified locally on 2026-05-02:

- Backend tests: `56 passed, 49 subtests passed`.
- RAG DB smoke: passing with `575` documents in `college_knowledge`.
- Multilingual RAG smoke: passing for `en`, `hi`, `kn`, `ta`, `te`, `ml`.
- Frontend typecheck: passing.
- Frontend production build: passing.
- Frontend E2E kiosk flow: `10 passed` using mocked local-safe WebSocket behavior.
- Frontend audit: `0 vulnerabilities`.
- Python installed-environment audit: no known vulnerabilities after upgrading local venv `pip`.
- Frontend main app JS chunk reduced to about `442 kB` via Vite vendor chunking.
- Low-latency receptionist benchmark: visible answer p95 `242ms`; first audio-ready p95 `3,000ms` with `AUDIO_UPDATE_TIMEOUT_S=3.0`.
- Production check bundle: `DEGRADED` only because git working tree is dirty; backend, RAG, frontend, and dependency-audit gates pass.

Known non-blocking warnings:

- Vite reports one duplicate static/dynamic import warning for `college-logo.png`.
- Hugging Face may warn about unauthenticated model downloads unless `HF_TOKEN` is set.

## Production Readiness Gates Still Requiring Hardware

- Full kiosk flow on target machine: sleep -> wake -> language -> chat -> voice answer -> reset.
- Microphone capture quality on the actual kiosk device.
- Speaker output quality and volume on the actual kiosk device.
- STT/TTS provider latency and reliability with real `GROQ_API_KEY` and `SARVAM_API_KEY`.
- Manual spoken checks for all six supported languages.
- Confirm `/ready` returns `status: ready` on the production machine.

## Cleanup Rules

- Remove temporary debug code/log spam before finishing.
- Keep comments concise and only where needed.
- Keep docs/config aligned with any behavioral changes.
- Ensure modified files are intentional and scoped.

## Production-Hardening Priority Order

1. Reliability and error handling
2. Backward compatibility of contracts
3. Voice latency and responsiveness
4. Security/config correctness
5. Performance improvements
6. UX polish

## Production Utilities Added

- `scripts\db\init-rag-db.ps1`: starts/repairs PostgreSQL, aligns the DB role password with `.env`, creates the configured DB, and applies pgvector schema.
- `scripts\production-check.ps1`: runs backend tests, RAG checks, frontend checks, frontend audit, and local Python audit.
- `scripts\production-check.ps1 -RunLatencyGate`: additionally runs the receptionist latency benchmark and fails if visible answer p95 exceeds `1,000ms` or first audio-ready p95 exceeds `3,000ms`.
- `/health`: lightweight process liveness endpoint.
- `/ready`: dependency readiness endpoint. With `PRODUCTION_STRICT_READY=true`, it requires provider keys, RAG document count >= `RAG_MIN_DOCUMENTS`, WebSocket auth when required, and locked-down allowed origins. It does not expose secrets.
- `backend/tests/test_health_endpoints.py`: coverage for `/health` and `/ready`.
- `backend/tests/test_provider_failure_paths.py`: mocked provider failure coverage for STT/TTS/Groq/RAG fallback behavior.
- `backend/tests/test_golden_query_matrix.py`: deterministic admissions/receptionist query matrix.
- `frontend/e2e/chat-flow.spec.ts`: mocked kiosk E2E flow for sleep, wake/language gate, English query, reset, and all six language selections.
- Low-latency WebSocket flow: assistant text/card payload is sent first with `audioPending=true`, then audio is attached through `type="assistant_audio_update"` on the same `turn_id`.

## Low-Latency Behavior to Preserve

- Text/cards must not wait for TTS when `LOW_LATENCY_VOICE_MODE=true`.
- Audio updates must merge into the current assistant turn by `turn_id`; they must not create duplicate assistant messages.
- `audioPending`, `audioUnavailable`, `isProcessing`, and `isSpeaking` must always settle to a non-stuck state.
- Deterministic receptionist intents should prefer local structured answers over Groq/RAG/provider waits when data is available.
- First-sentence TTS should be opportunistic and non-blocking; failure must degrade to final/full TTS or text-only.

## Definition of Done

- Requested scope implemented with minimal diff.
- No unintended source behavior changes.
- Relevant lint/tests/smoke checks pass for touched area.
- For production-related work, run `scripts\production-check.ps1` when feasible.
- Final report includes: changed files, why changed, verification done, remaining risks.
