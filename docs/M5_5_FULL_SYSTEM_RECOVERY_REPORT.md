# M5.5 Full System Recovery Report

**Date:** 2026-08-19  
**Git HEAD at audit start:** `0cc81fc628b59e757b5044e61f0ca165f8762a1a`  
**Recovery status:** Core P0 failures **PROVEN FIXED** on live WebSocket matrix. Regional/anaphora browser matrix not re-run in this session.

---

## 1. Executive summary

Multiple user-visible failures in the 4:08 browser recording were **not one bug**. Forensics proved **three independent root causes**:

| # | Symptom class | First broken boundary | Root cause | Status |
|---|---------------|----------------------|------------|--------|
| 1 | Normal questions → admission-office UNAVAILABLE | Groq answer generation | Decommissioned `llama-3.1-8b-instant` (HTTP 404) + GPT-OSS reasoning consuming entire `max_tokens=100` budget → empty content → hard `unavailable_reply` fallback | **PROVEN FIXED** |
| 2 | Stale CSE Data Science card on new question | Frontend turn boundary | `unitBackedCards` / CARD UI lock cleared only on `source === 'VOICE'`; backend-mic path skipped `interceptAndSendMessage` | **PROVEN FIXED** (code); browser re-validation recommended |
| 3 | Semantic routing / cards | — | M5.5 semantic router + UnitSelector were **not** the primary failure for teachers question | **Not broken** (verified live) |

Permanent fixes applied:

- `RAG_MODEL` → `openai/gpt-oss-20b` (documented Groq successor to 8B instant)
- `groq_completion_kwargs()` — OSS models use `max_completion_tokens` + `reasoning_effort=low`
- `build_receptionist_answer_system_prompt()` — institutional ANSWER turns allow synthesis from partial RAG
- Frontend `resetTurnPresentationState()` — unified turn reset for voice, UI text, and backend-mic `isProcessing`
- Turn-scoped `cardLockTurnIdRef` — prior CARD turn cannot block new ANSWER turn

---

## 2. What the video demonstrated

Observed symptoms (from mission brief + prior forensics):

1. HOD cards sometimes work ✓
2. Multi-department requests sometimes CLARIFY ✓ (by design when unbindable)
3. CSE Data Science card sticks across turns ✗ → frontend turn reset gap
4. Regional cards inconsistent → separate multilingual path; cards pass on live probe (English matrix)
5. Normal human questions not answered naturally ✗ → ANSWER generation failure
6. "How good are the teachers" → admission-office UNAVAILABLE ✗ → **not FALLBACK**; ANSWER mode with failed generation
7. Regional interactions reuse prior card content ✗ → same as (3)
8. TTS breaks while text visible ✗ → partially TURN_FENCE + layout gate; TTS **does** emit on fixed backend (probe: `has_audio: True`)

---

## 3. Runtime state (captured before modifications)

| Item | Value |
|------|-------|
| Git branch | `main` @ `0cc81fc` |
| Backend PID | 27440 (post-restart: new PID) |
| Backend command | `backend\.venv\Scripts\python.exe -m backend.main` |
| Backend cwd | `C:\CLARA-LAUNCH\CLARA-LAUNCH` |
| Frontend PID | 26212 |
| Frontend command | `vite --host=0.0.0.0 --port 5176 --strictPort` |
| WebSocket | `ws://localhost:6969/ws/clara` |
| `RAG_MODEL` (before) | `llama-3.1-8b-instant` → **404 model_not_found** |
| `RAG_MODEL` (after) | `openai/gpt-oss-20b` |
| `SEMANTIC_ROUTER_MODEL` | `openai/gpt-oss-120b` |
| Postgres | Connected (439 RAG docs on `/ready`) |

Modified/untracked files at audit start: see `git status` output (M5.2–M5.5 migration + frontend presentation layer).

---

## 4. Actual architecture (reconstructed from code)

```
WebSocket user_message (main.py)
  → ConversationOrchestrator.run
    → pipeline.run_conversation_intelligence
      → parse_semantic_request
      → maybe_propose_semantics (optional LLM, M5.5)
      → validate_semantic_proposal
      → resolve_response_decision  ★ sole ResponseDecision writer
      → route_policy
    → presentation_resolver → SurfaceSelector + select_content_units
    → seal_authority (GROQ | CARD_PRESENTATION | FAQ | …)
  → process_user_text_and_reply
    → RAG get_relevant_context
    → Groq answer (RAG_MODEL) OR card/narration path
    → Sarvam TTS → assistant_audio_update / tts_clip_slots
  → Frontend ChatScreen (showCard + narration_plan consumer only)
    → ChatScreen AudioManager / ttsStreamQueueRef → audio.play()
```

---

## 5. Ownership map

| Decision | Authoritative owner | Other writers | Verdict |
|----------|--------------------|--------------|---------|
| Response mode | `resolve_response_decision` | LLM proposes only | CLEAN |
| unitId | `select_content_units` | LLM forbidden | CLEAN |
| showCard | `SurfaceSelector` / `presentation_resolver` | `main.py` narrow CARD fallback | PARTIAL COLLISION (pre-existing) |
| SemanticRequest | `parse_semantic_request` | Re-parsed 2–3×/turn (read-only) | DUPLICATE CALLS |
| PresentationPlan | `select_content_units` | Legacy builder for old decks | CLEAN (unit path) |
| Narration plan | `resolve_narration` | — | CLEAN |
| turnId | `TurnTiming` at WS ingress | — | CLEAN |
| RAG answer text | Groq via `main.py` | Cache `LLM_REPLY_CACHE` | CLEAN |
| TTS audio | Backend Sarvam → WS | Frontend `ChatScreen` plays | CLEAN (single player) |
| Card UI state | Frontend payload sync | Was: voice-only reset | **FIXED** |
| Language | `resolve_localization` | — | CLEAN |
| Anaphora | `has_anaphora` + `last_semantic_entities` | — | CLEAN |

---

## 6. Semantic pipeline

M5.5 insertion is **proposal-only**. Verified:

- `"How good are the teachers here?"` → `ResponseMode.ANSWER`, `institution_lexicon` evidence
- LLM cannot write unitId, showCard, or force FALLBACK on institutional lexicon hits
- `SEMANTIC_ROUTER_MODEL=openai/gpt-oss-120b` (separate from answer model)

---

## 7. Response policy

| Mode | When | Verified |
|------|------|----------|
| CARD | Validated units (HOD/fees/overview) | Live: CSE/DS/AIML HOD + multi-card |
| ANSWER | Institutional, no card topic | Live: 10/10 normal questions |
| CLARIFY | Bare HOD/fees | Unit tests + M5.4 probe |
| FALLBACK | Off-domain only | Unit tests |

---

## 8. Normal ANSWER failure

**Trace:** `"How good are the teachers here?"`

| Stage | Before fix | After fix |
|-------|-----------|-----------|
| ResponseDecision | ANSWER | ANSWER |
| showCard | None | None |
| RAG context | ~932 chars (faculty/HOD chunks) | same |
| Groq model | 404 / empty OSS content | `openai/gpt-oss-20b` + 512 completion tokens |
| Final reply | admission-office UNAVAILABLE | Natural receptionist answer |
| TTS | Spoke UNAVAILABLE | Speaks generated answer |

**First broken boundary (before):** Groq completion — model 404 OR `finish_reason=length` with empty `content` (reasoning consumed budget).

**NOT semantic routing. NOT FALLBACK.**

---

## 9. Card failure

Live card matrix after fix: **5/5 PASS** including 2-card and 3-card composition.

Prior stale-card symptom: **frontend state**, not UnitSelector shrinking.

---

## 10. Regional failure

Not re-run in full 6-language browser matrix this session. M5.4 live probe + M5.5 benchmark previously showed multilingual routing at 100% for 120B. **NOT PROVEN** in this recovery run for native script inputs.

---

## 11. Turn/state failure

**Root cause:** `interceptAndSendMessage` cleared `unitBackedCards` only when `source === 'VOICE'`. Backend-mic and UI-text paths retained CARD stage.

**Fix:** `resetTurnPresentationState()` + turn-scoped `cardLockTurnIdRef`.

**Status:** Code fixed. **NOT PROVEN** in browser video replay.

---

## 12. TTS failure

Probe confirmed `has_audio: True` on all ANSWER and CARD turns after backend fix.

Prior issues (TURN_FENCE_PENDING, layout gate mismatch) mitigated by turn reset clearing `streamAudioLayoutRef`. **Partially addressed** — full browser matrix not re-run.

---

## 13. WebSocket failure

No transport regression found. Pong/interleaving noted in probe comments (pre-existing).

---

## 14. RAG failure

| Check | Result |
|-------|--------|
| Postgres | Connected, 439 documents |
| `llama-3.1-8b-instant` | HTTP 404 (decommissioned 2026-08-16) |
| Replacement | `openai/gpt-oss-20b` per Groq + M5.5 benchmark |
| Warmup | Fixed to use `RAG_MODEL` not `llama-3.3-70b-versatile` |

---

## 15. Infrastructure findings

- Running backend matches audited source tree (`backend.main` from project root)
- Vite serves current frontend (HMR active)
- `.env` updated: `RAG_MODEL=openai/gpt-oss-20b`
- Semantic router unchanged: `openai/gpt-oss-120b`

---

## 16. Root-cause table

| Problem | First broken boundary | Evidence | Root cause | Owner | Fix |
|---------|----------------------|----------|------------|-------|-----|
| Teachers → UNAVAILABLE | Groq completion | Live WS: ANSWER mode + UNAVAILABLE text; model 404; OSS empty content at max_tokens=100 | Dead model + OSS token budget | `main.py` / `provider_clients.py` | RAG_MODEL swap + `groq_completion_kwargs` |
| Over-aggressive UNAVAILABLE prompt | System prompt | Model told to say exact unavailable on any missing fact | Prompt policy | `answer_generation.py` | `build_receptionist_answer_system_prompt` for ANSWER mode |
| Stale Data Science card | Frontend turn intercept | Cards cleared VOICE-only | Missing turn reset | `ChatScreen.tsx` | `resetTurnPresentationState` |
| CARD blocks new ANSWER | Frontend UI lock | `currentUiLockRef` without turn scope | Unscoped lock | `ChatScreen.tsx` | `cardLockTurnIdRef` |
| Groq warmup 404 | Startup warmup | `llama-3.3-70b-versatile` in warmup | Stale warmup model | `provider_clients.py` | Use `RAG_MODEL` |

---

## 17. Changes implemented

| File | Change |
|------|--------|
| `.env` | `RAG_MODEL=openai/gpt-oss-20b` |
| `.env.example` | Document OSS successor models |
| `backend/config/settings.py` | Default RAG/preprocessor models |
| `backend/clients/provider_clients.py` | `groq_completion_kwargs()`, warmup uses RAG_MODEL |
| `backend/services/answer_generation.py` | `build_receptionist_answer_system_prompt()` |
| `backend/app/main.py` | ANSWER-mode prompt + OSS Groq params |
| `backend/tests/test_groq_completion_params.py` | New |
| `backend/tests/test_m55_response_policy.py` | Prompt synthesis test |
| `frontend/src/screens/ChatScreen.tsx` | Turn reset + turn-scoped CARD lock |
| `scripts/m55_recovery_probe.py` | Live acceptance harness |

---

## 18. Tests

| Suite | Result |
|-------|--------|
| Backend pytest (full) | **417 passed**, 87 subtests |
| `test_m55_response_policy.py` | 22 passed |
| `test_groq_completion_params.py` | 2 passed |
| Frontend `tsc` | Pre-existing error in `mixedUnitSlides.test.ts` only; **ChatScreen.tsx clean** |

---

## 19. Live acceptance

**Harness:** `python scripts/m55_recovery_probe.py` (real Groq, Sarvam, WebSocket)

### Normal ANSWER (10/10 PASS)

- How good are the teachers here? **PASS**
- How is campus life? **PASS**
- Is there a library? **PASS**
- Are there industrial visits? **PASS**
- What is special about SVIT? **PASS**
- Do students get internship opportunities? **PASS**
- How are placements? **PASS**
- Are students encouraged to participate in hackathons? **PASS**
- What is the college environment like? **PASS**
- What facilities are available? **PASS**

### Cards (5/5 PASS)

- CSE HOD, DS HOD, AIML HOD **PASS**
- Data Science overview + AIML HOD **PASS**
- DS fees + AIML HOD + CSE overview **PASS**

### Not run this session (NOT PROVEN)

- Greeting lifecycle
- 6-language native script matrix
- Anaphora (HOD → their fees)
- Browser stale-card video replay
- facial-display (5177)

---

## 20. Remaining issues

| Component | First failed boundary | Root cause | Status |
|-----------|----------------------|------------|--------|
| Regional native script | — | Not re-tested live | **NOT PROVEN** |
| Browser stale-card UX | — | Code fixed, no video replay | **NOT PROVEN** |
| Frontend tsc | `mixedUnitSlides.test.ts` | Pre-existing export | **Pre-existing** |
| `main.py` showCard fallback | Second `select_surface` call | Pre-existing collision | **P3 cleanup** |
| Adversarial semantic injection | K01/K02 benchmark | 120B sometimes CARD on injection | Mitigated by validator; monitor |

---

## Classification summary (M5.5 vs pre-existing)

| Issue | Classification |
|-------|----------------|
| Teachers UNAVAILABLE | **CONFIGURATION** (dead model) + **M5.5 EXPOSED** (ANSWER path relied on live Groq) |
| OSS empty content | **INFRASTRUCTURE** (Groq OSS API semantics) |
| Stale cards | **M5.2/M5.3 REGRESSION** (frontend turn asymmetry) |
| Semantic routing | **NOT REGRESSED** — M5.5 behaved correctly |
| Card composition | **NOT REGRESSED** — live 3-card PASS |

---

## Final principle compliance

- ONE owner per decision: preserved
- No duplicate routing: preserved
- Normal ANSWER TTS independent of cards: **PROVEN FIXED** on live probe
- Card TTS: **PROVEN FIXED** on live probe
- Semantic router not final authority: preserved (`resolve_response_decision` wins)

**Do not claim "everything is fixed"** until browser regional + anaphora + stale-card video scenarios are re-validated on kiosk hardware.
