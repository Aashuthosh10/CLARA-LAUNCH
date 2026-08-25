# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Required reading at task start

`AGENTS.md` and `docs/CLARA_PROJECT_MEMORY.md` are the authoritative invariants documents for this repo — read them fully before substantive work. They define features that must be preserved and hard rules for safe edits (minimal diffs, no broad refactors, never remove fallback/error-handling paths without explicit request).

## Project

CLARA is a multilingual AI receptionist kiosk for SVIT: React/Vite kiosk UI + FastAPI backend with a WebSocket endpoint (`/ws/clara`) + optional PostgreSQL/pgvector RAG. Voice-first; supports English, Kannada, Hindi, Tamil, Telugu, Malayalam.

## Commands

Backend tests (all): `python -m pytest backend/tests -q`
Single test / single suite:
```bash
python -m pytest backend/tests/test_phase2b_fee_routing.py -q
python -m pytest backend/tests/test_phase1_regional_card_regression.py::TestNewlyCapturedRegionalRegression -q
```

Backend run: `python -m backend.main` (or `powershell -ExecutionPolicy Bypass -File scripts\start-backend.ps1`) → http://localhost:6969

Frontend: `cd frontend && npm ci && npm run dev` → http://localhost:5176. Lint/typecheck `npm run lint`, build `npm run build`, mocked E2E (needs backend+frontend running) `npm run test:e2e`.

RAG DB init/repair: `powershell -ExecutionPolicy Bypass -File scripts\db\init-rag-db.ps1`; ingest: `python -m backend.tools.ingest_college_knowledge_pg`; smoke: `python backend/tools/test_db_rag.py`.

Full release bundle: `powershell -ExecutionPolicy Bypass -File scripts\production-check.ps1` (add `-RunLatencyGate` for the latency benchmark).

Env: copy `.env.example` to `.env`; needs at least `GROQ_API_KEY`, `SARVAM_API_KEY`, `POSTGRES_PASSWORD`. Frontend token goes in `frontend/.env.local`. Port 6969 conflicts: `scripts\kill-backend-port.ps1`.

## Architecture

### Per-turn conversation pipeline (the core flow)

Entry: `ConversationOrchestrator.run()` (`backend/services/orchestration/conversation_orchestrator.py`) → `run_conversation_intelligence()` (`backend/services/conversation/pipeline.py`). Fixed stage order per turn:

1. Transcript assessment → 2. rule-based entities (`entity_extractor.py`) → 3. legacy topic regex map (`semantic_normalize.py`) → 4. FAQ probe → 5. **legacy intent ladder** (`intent_confidence.py` wrapping `extract_features` + `resolve_intent_from_features` in `answer_generation.py`) → 6. **semantic request parser** (`content/semantic_request_parser.py`, deterministic, fail-closed → `None`) → 7. optional LLM proposal (`semantic_router.py`, validated by `semantic_proposal_validator.py`) → 8. **`resolve_response_decision`** (`conversation/response_decision.py`) — the AUTHORITATIVE mode decision (CARD/ANSWER/CLARIFY/FALLBACK) → 9. policy projection (`policy_router.py`) → 10. presentation/surface/unit resolution (`orchestration/presentation_resolver.py`, `content/surface_selector.py`, `content/unit_selector.py`).

Key invariant: the ResponseDecision owns mode selection; downstream stages consume it rather than re-deriving. Decision steps are strictly ordered (local UI intent → off-domain → proposals → parsed semantic_request → FAQ → department-card clarify rules → non-unit card intents → clarification fallback). When changing routing, preserve this ordering — see `PHASE2B_ROUTING_DESIGN.md` for a worked example of an ordering bug.

### Two parallel understanding layers (intentional)

- **Legacy layer** (`answer_generation.py`, ~4k lines): regex/fuzzy keyword features → intent constants (`INTENT_*`). Its fee-without-department demotion to `INTENT_ADMISSIONS` is a pinned golden contract (`test_golden_query_matrix.py`) — do not "fix" it there.
- **Semantic layer** (`backend/services/content/`): language-neutral vocabulary catalog (`semantic_vocab/catalog.py`, six languages, `"*"` = code-switch tolerant), exclusive longest-span department identity (`department_identity.py` — `cse` must never match inside `cse_ds`), topic span detection + entity/topic proximity pairing (`semantic_composition.py`, returns None when not uniquely bindable), and `(department_key, topic)` pair production (`semantic_request_parser.py`).

Canonical cards only exist as registered units `"{dept}.{overview|hod|fees|achievements|placements}"` plus campus/leadership units (`content_unit_registry.py`). Unit selection is fail-closed: any unbindable pair ⇒ no plan. Department-scoped intents without a resolved department must CLARIFY ("Which department?"), never guess or default.

Multilingual normalization: native-script department names are injected as English tokens (`_inject_regional_department_tokens`, answer_generation.py) identically into both layers; Indic cues match by substring, Latin by word boundary (`unicode_text.py` keeps Indic graphemes alive — a naive `[^\w\s]` strip shreds them).

### Session/entity inheritance

Previous-turn departments live in `session["last_semantic_entities"]` and are admitted **only under explicit anaphora** ("its fees", `ಅದರ`, `उसका`, …; `content/semantic_anaphora.py`). Carried keys are validated exactly against known locale json keys — invalid keys fail closed, they never collapse to a similar department.

### Voice / latency contract

Low-latency mode sends visible text/card first, then audio later via `assistant_audio_update` on the same `turn_id`. Audio states (`audioPending`, `isSpeaking`, …) must always settle — never leave the UI stuck. TTS lives in `tts_orchestrator.py` / `tts_chunking.py`; first-sentence TTS is opportunistic with degradation to full TTS/text-only.

### Other structure

- `frontend/`: React 19 + Vite kiosk UI; surface-based exclusive card rendering owned by `screens/ChatScreen.tsx`.
- `facial-display/`: separate package (do not confuse with `frontend/`).
- `backend/core/`: audio pipeline, language detection, RAG retrieval; `backend/clients/provider_clients.py` (Groq/Sarvam with retries/fallbacks), `clients/database.py` (pgvector pooling with resilient no-DB fallback).
- Locales: `backend/data/locales/{en,kn,hi,ta,te,ml}.json` are the authoritative display names; translations normalize onto existing internal json keys and never become new identities.

## Testing conventions

Regression suites deliberately wire the **real** legacy intent into decisions (see `_decision()` helpers in `test_phase1_regional_card_regression.py` / `test_phase2b_fee_routing.py`) — passing `ci_intent=None` hides legacy-ladder bugs. When adding decision-layer tests, mirror the production wiring from `pipeline.py`. Never weaken existing assertions (e.g., `_assert_card_contract`) to make failures pass.
