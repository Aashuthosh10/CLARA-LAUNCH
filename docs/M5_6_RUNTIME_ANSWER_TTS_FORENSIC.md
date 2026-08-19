# M5.6 — Runtime stability + normal ANSWER/TTS forensic

**Date:** 2026-08-19  
**Scope:** audit only. No production code, prompts, models, vocabulary, WebSocket protocol, AudioManager, ChatScreen, UnitSelector, or ResponseDecision were changed.  
**Source of truth:** current repository source. Previous M5.4/M5.5 reports are cited only where they disagree with source.  
**Live kiosk session:** not executed this phase. Routing, config, and frontend/backend control flow are proven from source + unit tests. Audible TTS and painted pixels are classified as **not live-tested**.

Six languages are first-class throughout: English, Kannada, Hindi, Tamil, Telugu, Malayalam (native script, romanized, and code-switch).

---

## 1. Executive summary

Two independent broken boundaries are proven. They are not the same defect.

**First broken boundary (P0 — UI crash / black screen):**  
`engageCardUiLock` in `frontend/src/screens/ChatScreen.tsx` lines **592–596** immediately calls itself. Any call site (campus navigation, course-menu click, comparison, bus, fees, trustees, department overview) throws `RangeError: Maximum call stack size exceeded`. There is no React error boundary. `html, body, #root` are `background-color: #000` (`frontend/src/index.css` lines 13–18). The painted result is a black viewport.

This function is **not** invoked on a typed/voice non-card intercept (`interceptAndSendMessage` lines 1000–1038). A pure ANSWER turn does not take this crash path unless a later card-lock call runs (campus button, course menu, or a CARD `showCard` becoming `isResponseReady`).

**First broken boundary for normal ANSWER text/TTS (P1):**  
`LOW_LATENCY_VOICE_MODE` (default **true**; not overridden in `.env`) sends a visible ANSWER with `isProcessing: false` and `audioPending: true` (`backend/app/main.py` lines 2081–2086). ChatScreen then:

1. Defers `setDisplayMessages` (`ChatScreen.tsx` 1142–1151).
2. Clears `visuallyFocusedMessage` (1149–1150).
3. Treats `audioPending` as response-pending (`isResponsePending` line 633).
4. Replaces the answer stage with the thinking overlay (4157–4170).
5. Commits deferred messages **only** from the `pendingAudio` effect (2950–2970).

Ordinary ANSWER TTS is streamed on `tts_audio_queue` (`useWebSocket.ts` 419–428), and `shouldDeferAssistantTtsToStream` (ChatScreen 242–249) **skips** `setPendingAudio`. Deferred text therefore does not commit through the pending-audio path. Text becomes visible only if a later payload sets `visuallyFocusedMessage` (1160–1164) after `audioPending` clears, or if a non-audio terminal payload hits the `else` branch at 1152–1155.

Invariant **TEXT SUCCESS ≠ AUDIO SUCCESS is violated** for the visible-answer window: generated text is hidden because audio is pending.

**RAG_MODEL is not the retired Groq 8B id.** Current `.env` and `settings.py` use `openai/gpt-oss-20b`. Groq’s public catalog still lists that id as live (2026-08-19). `docs/M5_5_IMPLEMENTATION_REPORT.md` still saying `llama-3.1-8b-instant` is **stale** and must not be trusted.

**Routing** of the required faculty/campus/facilities/placements questions is ANSWER in all six languages for the M5.5 matrix (13/13 tests pass). Live ANSWER text + TTS + ChatScreen paint were **not** re-run. `"Is studying here worth it?"` is a confirmed CLARIFY/UNKNOWN miss (`no_evidence`).

---

## 2. Current architecture actually implemented

Authority map from **current source**, not prior reports.

| Concern | Sole writer | File | Consumers (must not own) |
|---------|-------------|------|---------------------------|
| `ResponseMode` CARD / ANSWER / CLARIFY / FALLBACK | `resolve_response_decision` | `backend/services/conversation/response_decision.py` ~245 | GPT-OSS 120B proposal, frontend, TTS, RAG |
| Domain relevance | `detect_domain_relevance` | same file ~188 | semantic router skip / FALLBACK gate |
| Semantic parse (entity + topic) | `parse_semantic_request` | `backend/services/content/semantic_request_parser.py` | pipeline |
| LLM proposal | `maybe_propose_semantics` → `validate_semantic_proposal` | `semantic_router.py`, `semantic_proposal_validator.py` | `resolve_response_decision` only |
| PolicyAction | `route_policy` | conversation pipeline / policy | orchestrator short-circuit |
| `unitId` | `select_content_units` | `backend/services/content/unit_selector.py` | PresentationEngine, TTS clip slots |
| Presentation / narration | `resolve_presentation` / narration resolver | `presentation_resolver.py`, `narration_resolver.py` | ChatScreen |
| ANSWER generation | `_stream_groq_reply` / `_complete_groq_reply` using **`RAG_MODEL`** | `backend/app/main.py` ~844+, ~1876 | ChatScreen messages |
| Semantic understanding LLM | `SEMANTIC_ROUTER_MODEL` (`openai/gpt-oss-120b`) | `semantic_router.py` ~109 | never ResponseMode / unitId |
| TTS | `sarvam_tts_to_base64` / `tts_to_base64_cached` | `provider_clients.py`, main.py chunk loop ~2278 | AudioManager / `new Audio` |
| WebSocket send | `_ws_send_json` | `main.py` | `useWebSocket` |
| Session history | `append_session_history` max 3 turns | `backend/app/session_state.py` | ANSWER skips `history_for_llm` |
| Last CARD entities | `session["last_semantic_entities"]` | `conversation_orchestrator.py` 146–148 | parser anaphora + router prompt |
| Layout | `useChatLayoutReducer` / `setLayoutMode` | ChatScreen | must not infer cards from text (comment at 1999–2000) |
| Audio element (ANSWER + fallback) | `handleAudioPlayback` → `new Audio(data:audio/wav;base64,…)` | ChatScreen 1635 | PresentationAudioManager.invalidate on new clip |
| Card scene audio token | `PresentationAudioManager` | `frontend/src/features/chat/presentation/PresentationAudioManager.ts` | does not own unitId |

GPT-OSS 120B is **only** semantic proposal/understanding. Answer tokens come from `RAG_MODEL`.

Configuration actually read at runtime:

| Key | Where read | Current value |
|-----|------------|---------------|
| `RAG_MODEL` | `backend/config/settings.py` 77; `.env` 38 | `openai/gpt-oss-20b` |
| `SEMANTIC_ROUTER_MODEL` | settings.py 93; `.env` 44 | `openai/gpt-oss-120b` |
| `SEMANTIC_ROUTER_ENABLED` | settings.py 87–92 default **false**; `.env` 43 | **true** |
| `LLM_MAX_TOKENS` | settings.py 178; `.env` 57 | **100** (OSS uses `max_completion_tokens = max(100+256, 512)` via `groq_completion_kwargs` in `provider_clients.py` 90–100) |
| `LOW_LATENCY_VOICE_MODE` | settings.py 285 | default **true** (not in `.env`) |
| `AUDIO_UPDATE_TIMEOUT_S` | settings.py 287 | 3.0 |
| `TTS_CHUNK_FIRST_TIMEOUT_S` / `TTS_CHUNK_TIMEOUT_S` | settings.py 292–293 | 6.0 / 5.0 for **normal ANSWER**; FAQ ≥8s; cards/comparison ≥12s (`main.py` 2306–2324) |
| `RAG_TOP_K` / `RAG_MAX_TOKENS` | settings.py 74–79; `.env` | 5 / 6000; retrieval call uses `min(RAG_TOP_K, 4)` (`main.py` 1602) |
| `RAG_CONTEXT_TIMEOUT_S` | `.env` 61 | 2.5 |

---

## 3. Black-screen trace

### Path A — proven crash (black `#000`)

```
USER taps campus nav / course menu / CARD becomes isResponseReady
  → engageCardUiLock(ownerTurnId)
  → ChatScreen.tsx:593 engageCardUiLock(lastPayloadTurnIdRef.current ?? 'ui-local')
  → same function, infinite recursion
  → RangeError
  → no ErrorBoundary in App.tsx or ChatScreen
  → ChatScreen unmounts
  → html/body/#root background #000
```

**File / function / line:** `frontend/src/screens/ChatScreen.tsx`, `engageCardUiLock`, **592–596**.

```592:596:frontend/src/screens/ChatScreen.tsx
  const engageCardUiLock = useCallback((ownerTurnId: string) => {
    engageCardUiLock(lastPayloadTurnIdRef.current ?? 'ui-local');
    const tid = ownerTurnId.trim();
    cardLockTurnIdRef.current = tid || null;
  }, []);
```

Call sites that invoke it (all crash if reached): 1511 (`openCampusNavigation`), 2131 (comparison), 2170 (bus), 2262 (trustees), 2287 / 2345 / 2390 / 2413 / 2441 / 2510 / 2702 / 2741 / 2772 (other card stages), 3522 (`handleCourseMenuSelect`).

**Intended first statement (dead):** `currentUiLockRef.current = 'CARD'` is **never assigned** anywhere in the file. Grep shows only `'IDLE'` and `'TEXT'`. Sticky branches that require `currentUiLockRef.current === 'CARD'` (2191, 2210, 2232, 2252) cannot run even if recursion were removed, unless that assignment is restored.

**Input:** any argument.  
**Output:** stack overflow; `cardLockTurnIdRef` is never written.  
**State transition:** none (crash before lock).  
**First failure:** line 593 self-call.

### Path B — proven non-crash blank answer stage (normal ANSWER)

```
USER: "How good are the teachers here?"
  → interceptAndSendMessage (does NOT call engageCardUiLock)
  → resetTurnPresentationState → assistantAudioTurnOwnerRef = TURN_FENCE_PENDING
  → backend orchestrator (may wait SEMANTIC_ROUTER_TIMEOUT_S=6s)
  → isProcessing:true (assigns owner)
  → Groq ANSWER
  → visible_payload audioPending=true isProcessing=false
  → message effect: defer displayMessages; visuallyFocusedMessage=null
  → isResponsePending=true
  → FULL_TEXT renders thinking overlay, not answer text
```

Container is light (`light-chat-container`), not black. Users can still report “blank” because the generated answer is not on screen.

If thinking then yields `lastAssistantMsg == null` and `!isResponsePending`, render is **`null`** at ChatScreen **4190** — empty stage over the cinematic background.

### Path C — not a ChatScreen unmount

`chat-screen-container` in `chat.css` is `#000`, but ChatScreen root is `light-chat-container` (cinematic-light.css line 4, light gradient). Path A’s black screen is the **document** background after unmount, not the light chat theme.

---

## 4. Normal ANSWER trace

**Input:** `"How good are the teachers here?"` (English).

Proven this phase by executing the current parser + decision (no Groq/Sarvam):

| Stage | Result | Evidence |
|-------|--------|----------|
| Normalization / parse | `parse_semantic_request` → **None** | live Python 2026-08-19 |
| Domain | `INSTITUTION` | `detect_domain_relevance` |
| Semantic router | **BYPASSED** for this string when parse is empty and lexicon already INSTITUTION; live 120B not invoked in this unit trace. Runtime `.env` has router **enabled**; skip reasons in `skip_semantic_router_reason` do not include “already ANSWER”. Live session **may still call GPT-OSS 120B**. | `semantic_router.py` 40–70; `.env` `SEMANTIC_ROUTER_ENABLED=true` |
| Proposal validation | N/A on this offline trace | — |
| `resolve_response_decision` | **ANSWER**, evidence `institution_lexicon`, topic None, entities `()` | `response_decision.py` |
| RAG | **NOT LIVE TESTED**. Code path: `is_answer_turn` → `build_retrieval_query(text, query_en)` → `get_relevant_context(..., min(RAG_TOP_K,4), lang_key=lang_key)` + locale slice `institution_overview` + `placements_and_training` | `main.py` 1438–1449, 1602, 1646–1658 |
| Answer generation | **NOT LIVE TESTED**. `_stream_groq_reply` / `_complete_groq_reply` with `RAG_MODEL`, `include_conversation_history=False` for ANSWER | `main.py` 1439, 1876–1901 |
| Empty Groq content | `reply_text = unavailable_reply` | `main.py` 1933–1948 |
| Length governor | `govern_answer_length` for non-card | `main.py` 1950–1957 |
| Final text | SUCCESS if Groq returns content; UNAVAILABLE template if empty | not live |
| WebSocket visible | `audioPending: true`, `isProcessing: false`, `messages` include user+clara | `main.py` 2081–2112 |
| Frontend receipt | `useWebSocket` `onmessage` → `entry.payload` | `useWebSocket.ts` 444–445 |
| `displayMessages` | **FAILURE** to commit on visible_answer (deferred) | ChatScreen 1145–1151 |
| TTS | see §5 | — |

Classification for this query’s **routing**: SUCCESS.  
Classification for this query’s **on-screen text at visible_answer**: FAILURE (deferred + thinking).  
Classification for **audible TTS**: source-proven gates exist; live play **not executed**.

---

## 5. Normal TTS trace

Ordinary ANSWER uses **legacy `tts_audio_queue`**, not `tts_clip_slots`.

| Stage | Function | File | Field / state | Gate | Failure behavior |
|-------|----------|------|---------------|------|------------------|
| Reply text | `process_user_text_and_reply` | `main.py` | `reply_text` / `tts_text` | empty → unavailable template | TTS skipped if blank |
| Chunk | `split_tts_chunks` | `main.py` 2303 | `TTS_CHUNK_MAX_CHARS` | — | — |
| Provider | `tts_to_base64_cached` → Sarvam | `main.py` 2334; `provider_clients.py` | `lang_code` from `resolve_answer_language` on ANSWER | timeout `TTS_CHUNK_FIRST_TIMEOUT_S` **6s** first chunk, **5s** later (stricter than cards’ 12s) | empty chunk logged; continue |
| Bytes | WAV base64 | interim payload | `audioBase64` | — | `audioUnavailable` if no bytes |
| WS | `_merge_assistant_audio_payload` | `main.py` 2211–2273 | `type=assistant_audio_update`, `tts_streaming=true`, `tts_chunk_index`, `audioPending=false` on first chunk | stale turn drop | return |
| Frontend merge | `useWebSocket` onmessage | 419–428 | append to `tts_audio_queue` when **not** unit-backed | same `turn_id` as previous payload | non-streaming overwrites |
| Defer single-clip | `shouldDeferAssistantTtsToStream` | ChatScreen 242–249 | true if `assistant_audio_update` + streaming/queue/slots | skips `setPendingAudio` | deferred messages never flushed by pendingAudio |
| Drain | TTS effect | ChatScreen 2986–3237 | `tts_audio_queue` | `shouldIgnorePayloadTurn`; `layoutMode` must match `streamAudioLayoutRef` | return without play |
| Play | `handleAudioPlayback` | ChatScreen 1577–1635 | `currentAudioRef`, `playbackGenRef` | owner ≠ `TURN_FENCE_PENDING`; turn_id match | silent return |
| Audible | `audio.play()` | 1824 | — | autoplay block | `console.error` **DEV only**; unmute hint |

**Path letter:** **A** (legacy `tts_audio_queue`). Clip slots only when `isUnitBackedNarrationPlan` (`ttsClipSlots.ts` 12–27).

Card vs ANSWER timeout: ANSWER first chunk 6s vs card narration 12s (`main.py` 2310–2324). Same Sarvam provider; different budget. That is a proven behavioral fork, not a second TTS vendor.

---

## 6. Card TTS trace

| Path | TTS function | Queue | WS payload | Frontend handler | Audio owner |
|------|--------------|-------|------------|------------------|-------------|
| Ordinary ANSWER | `tts_to_base64_cached` per `split_tts_chunks` | `tts_audio_queue` merged in `useWebSocket.ts` 419–428 | `assistant_audio_update`, `tts_streaming`, `tts_chunk_index`, `audioBase64` | ChatScreen 3184+ drain → `handleAudioPlayback` | `assistantAudioTurnOwnerRef` after `isProcessing` |
| Unit-backed card narration | same Sarvam, chunks = `spoken_summaries` aligned to plan (`main.py` 2286–2299) | `tts_clip_slots` merged 406–418 | same type + `narration_plan.mode=card_narration` | ChatScreen 3028+ `unitBackedSlots` | same owner + `PresentationAudioManager` token |
| Multi-unit narration | one slot per segment index | `tts_clip_slots` | `unitId` from plan segment | `activateByUnitId` in playback | PresentationEngine scene; HTMLAudio still `handleAudioPlayback` |

`shouldDeferAssistantTtsToStream` is true for both streaming ANSWER and clip-slot cards. Competing owners: **turn fence** vs **PresentationAudioManager.invalidate()** (ChatScreen 1624, 970). On a new non-follow-up clip, presentation audio is invalidated, then `new Audio` plays. Two managers, one element.

Card first-audio `isResponseReady` also calls `engageCardUiLock` → **P0 crash before playback completes**. That is why card TTS can “behave differently”: the card UI path dies.

---

## 7. Turn-fence analysis

Symbols:

- `TURN_FENCE_PENDING = '__turn_fence_pending__'` — `frontend/src/lib/ws/turnFence.ts` line 2  
- `shouldIgnorePayloadTurn`: if owner is PENDING, **return true (ignore all payloads)** — lines 17–22  
- `assistantAudioTurnOwnerRef` set PENDING in `resetTurnPresentationState` — ChatScreen 981  
- Owner assigned only when `payload.isProcessing === true` **and** `turn_id` non-empty — ChatScreen 1975–1981  
- `handleAudioPlayback` returns immediately if owner is PENDING — 1583–1584  
- TTS drain effect also fences — 2990–2991  
- Message effect **does not** fence (only `isPayloadStale`)

### Timeline — Turn A then Turn B (both normal ANSWER)

| T | Event | Owner | Audio A | Audio B | Text |
|---|--------|-------|---------|---------|------|
| 1 | User A intercept | PENDING | — | — | previous messages still in `displayMessages` |
| 2 | Orchestrator (router up to 6s) **before** `isProcessing` | PENDING | any late A-1 audio ignored | — | — |
| 3 | `isProcessing:true` turn A | owner=A (after reset which briefly PENDING then assign) | — | — | thinking if `isProcessing` |
| 4 | visible_answer A `audioPending` | owner=A | not yet | — | **deferred**; thinking |
| 5 | User B intercept **before A TTS** | PENDING; `playbackGenRef++`; pause `currentAudioRef` | **discarded** (intended barge-in) | — | — |
| 6 | `isProcessing` B | owner=B | ignore | — | — |
| 7 | A TTS chunk arrives with turn_id A | owner=B | **rejected** (`tid !== owner`) | — | message effect may still apply if payload replaces React state with A’s messages (stale text risk) |
| 8 | B TTS | owner=B | — | play if not PENDING | same deferral rules |

**Valid stream A can be rejected:** yes — barge-in (intentional) **and** if visible_answer/TTS arrives while owner is still PENDING (first frame not `isProcessing`). Backend sends `isProcessing` only **after** orchestrator (`main.py` 1195–1252). With `SEMANTIC_ROUTER_ENABLED=true`, that gap is up to `SEMANTIC_ROUTER_TIMEOUT_S` (6s) **plus** orchestrator work.

Backend-mic path never runs intercept; owner is assigned on first `isProcessing` frame (comment at 1978). Typed/voice intercept always fences first.

`isPayloadStale` (`useWebSocket.ts` 150–159) drops payloads whose `session_gen` is below the applied floor. That is session-reset, not turn-fence.

---

## 8. RAG model analysis

| Item | Value |
|------|--------|
| Configured model | `openai/gpt-oss-20b` |
| Read | `settings.py:77` `os.getenv("RAG_MODEL", ...)`; `.env` line 38 |
| Called | `client.chat.completions.create(model=RAG_MODEL, ...)` in `_stream_groq_reply` (`main.py` 871–875) and complete path; warmup in `provider_clients.py` |
| Live catalog 2026-08-19 | Groq docs list `openai/gpt-oss-20b` as hosted (https://console.groq.com/docs/models). `llama-3.1-8b-instant` shutdown 2026-08-16. |
| HTTP 404 this phase | **not reproduced** (no live Groq call). Retired-id hypothesis against **current** `.env` is a **false lead**. |
| Fallback if Groq empty/timeout | `unavailable_reply` (`main.py` 1933–1948), not ResponseMode.FALLBACK |
| `SEMANTIC_ROUTER_MODEL` | `openai/gpt-oss-120b` — proposal only (`semantic_router.py` 109) |
| Stale doc | `docs/M5_5_IMPLEMENTATION_REPORT.md` line 35 still says RAG is 8B instant — **false vs source** |

`LLM_MAX_TOKENS=100` remains. For GPT-OSS, `groq_completion_kwargs` upgrades to `max_completion_tokens ≥ 512` and `reasoning_effort=low`. That prior empty-content failure mode is **mitigated in code**; not re-measured live.

---

## 9. Context analysis

ANSWER generator inputs (current `main.py` + `session_state.py`):

| Input | Present on ANSWER? | Bound |
|-------|--------------------|--------|
| RAG chunks | yes if `should_call_rag` | top-k `min(5,4)=4`, `RAG_MAX_TOKENS` 6000, timeout 2.5s |
| Locale slice | yes | `institution_overview` + `placements_and_training` only (`main.py` 514–530) |
| Conversation history to Groq | **no** (`include_conversation_history = not is_answer_turn`) | history still stored, max 3 turns / 6 messages |
| Prior user question | yes, prepended when `prior_user_question` exists | anaphora hint only, not full thread |
| Previous assistant answers | not in Groq messages on ANSWER | — |
| Previous semantic entities | **not** written on ANSWER decisions with empty `entities()`; written when `response_decision.entities` non-empty (typically CARD) | `conversation_orchestrator.py` 146–148 |
| Current language | yes | `resolve_answer_language` for ANSWER (`main.py` 1288–1289) |
| Current user message | original text, not English translation | `llm_user_text = text.strip()` |
| Card / narrator JSON | no on ANSWER | narrator path is CARD |
| System prompt | `build_receptionist_answer_system_prompt` + RAG college block | **not modified this phase** |
| Output tokens | `LLM_MAX_TOKENS` 100 → OSS completion budget ≥512 | `groq_completion_kwargs` |

**Anaphora:** `"Who heads that one?"` with **no** prior `last_semantic_entities` → `CLARIFY` / `unknown` / `no_evidence` (measured). After a CARD that stored entities, parser `allow_carry_over=has_anaphora` (`semantic_request_parser.py` 76). ANSWER-only faculty turns do **not** populate `last_semantic_entities` when decision.entities is empty — so `"CSE AI ML"` as a **CARD** can seed follow-up; `"Datascience teachers hegiddare?"` as ANSWER stores `('cse_ds',)` only because the **decision** from `entity_mention_in_answer` does not attach entities on the ResponseDecision object (entities `()` in the Python trace). **Measured:** `Datascience teachers hegiddare?` → mode ANSWER, semantic request `('overview', ('cse_ds',))`, but `resolve_response_decision` return `entities ()`. Orchestrator therefore **does not** persist `cse_ds` from that ANSWER decision. Follow-up `"Who heads that one?"` remains CLARIFY unless a prior CARD wrote entities. That is a context-boundary finding, not a redesign.

---

## 10. Frontend state analysis

| Variable | Role | Defect |
|----------|------|--------|
| `displayMessages` | rendered history | not updated while `audioPending` or `audioBase64` on terminal payload |
| `deferredMessagesRef` | holding pen | flushed **only** in `pendingAudio` effect (2950–2970); streaming ANSWER never sets `pendingAudio` |
| `visuallyFocusedMessage` | `lastAssistantMsg` preference | set `null` while waiting for audio (1149–1150) |
| `isResponsePending` | `isProcessing \|\| payload.audioPending` | hides answer; shows thinking (4157) |
| `responseLayoutEnabled` | requires text **and** `!isResponsePending` (3604–3609) | layout/optical path off during pending |
| `pendingAudio` | layout-gated play + message commit | skipped when `shouldDeferAssistantTtsToStream` |
| `audioPending` (payload) | backend gate | coupled to thinking UI |
| `layoutMode` | FULL_TEXT vs SPLIT_CARDS | intercept resets to FULL_TEXT unless UI nav |
| `engageCardUiLock` | intended CARD lock | recursive P0; never sets `currentUiLockRef` |
| `assistantAudioTurnOwnerRef` | TTS admission | PENDING drops clips |
| `playbackGenRef` | generation token | intercept increments; `onended`/`play().catch` abort if gen changed |
| Error surface | `audio.play().catch` DEV `console.error` only (1824–1831) | production swallows autoplay errors |
| Error boundary | **none** | crash → black body |

---

## 11. WebSocket analysis

```
backend _ws_send_json(state=5, payload)
  → frontend socket.onmessage
  → merge assistant_audio_update into tts_audio_queue OR tts_clip_slots
  → entry.onMessage(state, payload)
  → App payload state
  → ChatScreen effects
```

| Payload | Normal ANSWER | Drop / merge risk |
|---------|---------------|-------------------|
| `{isProcessing:true, turn_id}` | sent after orchestrator | ignored while fence PENDING **except** the assign block at 1975 runs **before** ignore (1975 then 1985). First `isProcessing` **can** assign owner. Subsequent mismatched turn_ids ignored. |
| visible `assistant_visible_answer` (`utterance_kind`) | `audioPending` true; may omit `type: assistant_audio_update` unless LOW_LATENCY sets it only on merge helper — visible_payload does **not** set `type` to `assistant_audio_update` (2081–2106). | classified as terminal+pending → defer messages |
| `assistant_audio_update` streaming | queue append same turn_id | different turn_id: no merge with previous queue; ChatScreen fence may ignore |
| `audioBase64` | chunk bytes | empty + `audioUnavailable` on final |
| `tts_streaming` / `tts_chunk_index` | ANSWER queue path | unit-backed uses slots instead |
| `turn_id` | required for owner match | missing turn_id: `shouldIgnorePayloadTurn` allows empty tid (`turnFence.ts` 24–25) |
| `audioPending` | true then false on first chunk (`main.py` 2396) | cancel cleanup only on `CancelledError` (2604–2627), not on generic hang |
| Card `showCard` | null on visible_answer if `defer_card_until_tts_ready` | first audio frame carries real `showCard` → `isResponseReady` → `engageCardUiLock` crash |

Stale classification: `session_gen` floor, not card-vs-answer. ANSWER is not reclassified as card on the frontend (`nativeTrigger = payload.showCard` only).

---

## 12. Six-language matrix

**Routing** executed 2026-08-19 via `backend.tests.test_m55_multilingual_answer` — **13 tests OK** (native / romanized / code-switch / informal forms in the M5.5 MATRIX). Additional explicit queries below.

Live ChatScreen paint and Sarvam TTS were **not** executed. Cells for Text visible / TTS are **source-risk**, not live pass.

| Language | Normal ANSWER (routing) | Text visible (ChatScreen) | TTS | Card path |
|----------|-------------------------|---------------------------|-----|-----------|
| English | PASS (`institution_lexicon` / topic ANSWER for faculty, campus, labs, internships, placements, environment, “special about this college”) | RISK: deferred + thinking while `audioPending`; commit not via pendingAudio on stream | RISK: fence PENDING; ANSWER chunk timeout 6s/5s; `audio.play` errors swallowed in prod | P0 if `engageCardUiLock` reached |
| Kannada | PASS on matrix + `teachers hegiddare?` / `campus life hegide?` | same frontend (language-agnostic) | same gates; TTS lang from `resolve_answer_language` (native script wins; romanized uses session) | same P0 |
| Hindi | PASS on matrix + `teachers kaise hain?` | same | same | same |
| Tamil | PASS on matrix + `campus life eppadi irukku?` | same | same | same |
| Telugu | PASS on matrix + `teachers ela unnaru?` | same | same | same |
| Malayalam | PASS on matrix + `campus engane aanu?` | same | same | same |

**Confirmed routing miss (all languages that lack lexicon cues):** English `"Is studying here worth it?"` → `CLARIFY` / `DomainRelevance.UNKNOWN` / `no_evidence`. Romanized worth-it variants: kn/hi/ta/ml **CLARIFY**; te `"ikkada chaduvu worth aa?"` **ANSWER** (lexicon/cue hit). This is P3, not the black-screen P0.

---

## 13. Mixed-language matrix

Measured `parse_semantic_request` + `resolve_response_decision` (no LLM):

| Input | Lang key used | Mode | Evidence | Notes |
|-------|---------------|------|----------|-------|
| `teachers hegiddare?` | kn | ANSWER | institution_lexicon | English token `teachers` |
| `campus life hegide?` | kn | ANSWER | institution_lexicon | `campus life` lexicon |
| `teachers kaise hain?` | hi | ANSWER | institution_lexicon | |
| `campus life eppadi irukku?` | ta | ANSWER | institution_lexicon | |
| `teachers ela unnaru?` | te | ANSWER | institution_lexicon | |
| `campus engane aanu?` | ml | ANSWER | institution_lexicon | |
| `Datascience teachers hegiddare?` | kn | ANSWER | entity_mention_in_answer | parse `overview`+`cse_ds`; decision entities still `()` |

Understanding **fails** (CLARIFY/UNKNOWN) where no institution cue matches, including English `"Is studying here worth it?"` and several romanized “worth it” forms. Semantic router **may** recover those in a live session (`institution_proposal` step 3b) — **not live-tested** here. Deterministic path does not.

Romanized language id remains session-owned (`answer_language.py` header). Wrong session language ⇒ wrong TTS code even when routing is ANSWER.

---

## 14. Confirmed defects

1. **P0** Recursive `engageCardUiLock` — ChatScreen.tsx 592–596. First failure: self-call. Black screen via uncaught exception + `#000` document background.  
2. **P1** TEXT coupled to AUDIO — visible_answer `audioPending` + deferred `displayMessages` + thinking overlay. Streaming ANSWER never `setPendingAudio`, so the only commit hook for deferred messages does not run.  
3. **P1** `TURN_FENCE_PENDING` drops TTS until `isProcessing` assigns owner; orchestrator/router delay sits **before** that frame. `handleAudioPlayback` 1583–1584.  
4. **P1** ANSWER TTS chunk budget (6s/5s) is stricter than card narration (12s) — `main.py` 2310–2324. Same provider, unequal timeout.  
5. **P1** `audio.play()` failure logged only when `import.meta.env.DEV` — ChatScreen 1827–1831. Production: silent.  
6. **P2/P4** `currentUiLockRef` never `'CARD'`; sticky CARD branches dead.  
7. **P3** `"Is studying here worth it?"` → CLARIFY/`no_evidence`.  
8. **P3** ANSWER decisions with empty `entities` do not update `last_semantic_entities`; anaphora after non-card entity mention is weak.  
9. **P4** No React error boundary; frontend errors swallowed except a few `console.error`s.

---

## 15. Suspected defects

These are **not** proven with a live WS capture this phase:

- Visible-answer → thinking → TTS fail without final `audioPending:false` leaving thinking forever (cancel cleanup exists only for `CancelledError`, `main.py` 2604–2627). Final merge **does** set `audio_pending=False` on the normal completion path (2544–2558). Hang without that frame is suspected, not captured.  
- Stale Turn A `messages` overwriting Turn B if React state applies unfenced message effect (message effect ignores turn fence).  
- Autoplay policy blocking kiosk `audio.play()` after intercept reset.  
- Live 120B proposal flipping an evaluative question to CARD (`validated_proposal_card` requires `semantic_request is None` and `mode_hint CARD`) — possible for lexicon-miss utterances; not captured.

---

## 16. False leads eliminated

| Claim | Verdict |
|-------|---------|
| `RAG_MODEL` is still retired `llama-3.1-8b-instant` | **FALSE** vs `.env` + `settings.py`. Stale in `docs/M5_5_IMPLEMENTATION_REPORT.md`. |
| Black screen after non-card **must** be AudioManager | **FALSE**. Pure ANSWER does not call `engageCardUiLock`. Crash-black is card-lock recursion. ANSWER “blank” is message deferral + thinking. |
| M5.3 unified all TTS onto `tts_clip_slots` | **FALSE**. ANSWER uses `tts_audio_queue`. |
| Semantic LLM owns ResponseMode / unitId | **FALSE**. Proposal is validated; `select_content_units` still sole `unitId` writer. |
| `currentUiLockRef === 'CARD'` leaks into ANSWER | **FALSE**. CARD lock value is never assigned (and recursion crashes first). |
| ChatScreen root is `chat-screen-container` `#000` | **FALSE**. Root is `light-chat-container`. Black is document background after crash. |
| TEXT SUCCESS already independent of AUDIO | **FALSE**. `isResponsePending` includes `audioPending`; messages deferred. |

---

## 17. First broken boundary

**For ChatScreen crash / black viewport:**  
`frontend/src/screens/ChatScreen.tsx` **`engageCardUiLock` line 593** — recursive call.  
INPUT: any `ownerTurnId`. OUTPUT: stack overflow. STATE: none. FIRST FAILURE: 593.

**For normal non-card ANSWER text not showing / TTS not playing:**  
1. Backend: `main.py` **2085** `audioPending: True` on successful `reply_text`.  
2. Frontend: ChatScreen **1145–1151** defer + **633** `isResponsePending` + **4157** thinking.  
3. TTS: ChatScreen **981** fence PENDING until **1975** `isProcessing`.  

The **earliest** ANSWER-pipeline break after successful generation is **1145** (text hidden because audio is pending), not RAG_MODEL.

---

## 18. Root cause(s)

Do not mix:

- **P0 root cause:** `engageCardUiLock` is implemented as a recursive call instead of setting `currentUiLockRef` / `cardLockTurnIdRef`.  
- **P1 text root cause:** low-latency visible_answer marks `audioPending` and ChatScreen refuses to commit/focus text until audio machinery runs; streaming ANSWER never sets `pendingAudio`, so the commit hook is skipped.  
- **P1 TTS root cause (ANSWER):** turn fence PENDING + ignored payloads; stricter chunk timeouts than cards; `audio.play` errors hidden in production.  
- **P3 routing root cause:** institution lexicon / cues miss evaluative “worth it” phrasing in several languages; empty-entity ANSWER does not persist department for anaphora.

---

## 19. Severity classification

| ID | Class | Summary |
|----|-------|---------|
| P0 | crashes UI / prevents normal operation | recursive `engageCardUiLock` |
| P1 | prevents normal answer/TTS | audioPending↔text coupling; fence; ANSWER TTS timeouts; swallowed play() |
| P2 | wrong routing/card | not proven for the faculty query; live 120B CARD steal **untested** |
| P3 | multilingual quality | “worth it” CLARIFY; anaphora after ANSWER entity; romanized TTS language = session |
| P4 | architectural cleanup | dead CARD lock flag; dual audio managers; no error boundary |

---

## 20. Exact files/functions involved

- `frontend/src/screens/ChatScreen.tsx` — `engageCardUiLock`, `interceptAndSendMessage`, message effect, `isResponsePending`, `handleAudioPlayback`, payload sync, `pendingAudio` effect, TTS drain, FULL_TEXT render  
- `frontend/src/lib/ws/turnFence.ts` — `TURN_FENCE_PENDING`, `shouldIgnorePayloadTurn`  
- `frontend/src/lib/ws/ttsClipSlots.ts` — `isUnitBackedNarrationPlan`, `mergeTtsClipSlot`  
- `frontend/src/hooks/useWebSocket.ts` — queue/slot merge, `isStalePayloadGen`  
- `frontend/src/features/chat/presentation/PresentationAudioManager.ts`  
- `frontend/src/App.tsx` — ChatScreen mount, no error boundary  
- `frontend/src/index.css` — `#000` document background  
- `backend/app/main.py` — orchestrator then `isProcessing`, ANSWER RAG/Groq/TTS, visible_payload, chunk timeouts  
- `backend/app/session_state.py` — history caps, `prior_user_question`  
- `backend/config/settings.py` — models, timeouts  
- `backend/clients/provider_clients.py` — `groq_completion_kwargs`, Sarvam TTS  
- `backend/services/conversation/pipeline.py` — parse → propose → `resolve_response_decision`  
- `backend/services/conversation/response_decision.py`  
- `backend/services/conversation/semantic_router.py`  
- `backend/services/content/unit_selector.py`  
- `backend/services/orchestration/conversation_orchestrator.py`  
- `backend/services/conversation/answer_language.py`

---

## 21. Recommended fix order

Do **not** implement in this phase. Order only:

1. **P0** Make `engageCardUiLock` non-recursive: set `currentUiLockRef.current = 'CARD'` and `cardLockTurnIdRef`; never call itself.  
2. **P1** Commit `displayMessages` / `visuallyFocusedMessage` on visible_answer even when `audioPending` is true. Thinking overlay must not replace an already-generated clara message.  
3. **P1** Assign `assistantAudioTurnOwnerRef` on intercept using the client-known or first payload `turn_id`, including `isProcessing: false` frames. Do not leave PENDING across visible_answer.  
4. **P1** Flush deferred messages on streaming queue start / `audioUnavailable`, not only `pendingAudio`.  
5. **P1** Equalize or justify ANSWER vs card TTS timeouts; surface `audio.play()` failure outside DEV.  
6. **P3** After P0/P1, re-verify all six languages native + romanized + mixed; then consider lexicon/anaphora persistence (no vocab change until that phase is authorized).  
7. **P4** Error boundary around ChatScreen; remove dead CARD-lock branches or wire `currentUiLockRef` consistently.

---

## Mandatory tables

### Problem / cause / evidence

| Problem | Root cause | Evidence | Severity | Fix later |
|---------|------------|----------|----------|-----------|
| ChatScreen black after card UI / campus / course click | `engageCardUiLock` recursive self-call | ChatScreen.tsx 592–596; call sites 1511, 2131, 3522, …; no ErrorBoundary; `index.css` 13–18 `#000` | P0 | rewrite lock setter; add error boundary |
| Blank/thinking instead of ANSWER text | `audioPending` defers messages and drives `isResponsePending` | main.py 2085; ChatScreen 633, 1145–1151, 4157; pendingAudio-only commit 2950–2970; stream skips pendingAudio 242–249, 2071 | P1 | commit text independently of TTS |
| Normal ANSWER TTS silent | fence PENDING and/or play() swallowed and/or chunk timeout | turnFence.ts 22; ChatScreen 981, 1583–1584, 1975–1986, 1824–1831; main.py 2324 vs 2313 | P1 | assign owner earlier; log play errors; review timeouts |
| Card TTS ≠ ANSWER TTS | two queues (`tts_audio_queue` vs `tts_clip_slots`) + unequal timeouts + P0 on card ready | useWebSocket.ts 406–428; ChatScreen 3028 vs 3184; main.py 2306–2324 | P1/P4 | keep two queues; fix lock first |
| Legitimate “worth it?” → CLARIFY | no lexicon/cue; `no_evidence` | measured: `Is studying here worth it?` → CLARIFY/UNKNOWN | P3 | later vocab/router (not this phase) |
| Context vanish / weak anaphora | ANSWER decision `entities ()`; orchestrator only stores non-empty decision.entities | Python trace; orchestrator.py 146–148 | P3 | persist parse entities when authorized |
| Retired Groq 8B blocking ANSWER | **not current** | `.env` `RAG_MODEL=openai/gpt-oss-20b`; Groq catalog live | — | none (false lead) |

### Language × ANSWER × text × TTS × card

| Language | Normal ANSWER | Text visible | TTS | Card path |
|----------|---------------|--------------|-----|-----------|
| English | PASS (faculty/campus/labs/placements; FAIL “worth it?” → CLARIFY) | NOT LIVE; source RISK (defer/thinking) | NOT LIVE; source RISK (fence/timeout/play) | P0 on lock |
| Kannada | PASS (matrix + mixed); FAIL some romanized worth-it | same RISK | same RISK | P0 on lock |
| Hindi | PASS (matrix + mixed); FAIL some romanized worth-it | same RISK | same RISK | P0 on lock |
| Tamil | PASS (matrix + mixed); FAIL some romanized worth-it | same RISK | same RISK | P0 on lock |
| Telugu | PASS (matrix + mixed); one worth-it variant ANSWER | same RISK | same RISK | P0 on lock |
| Malayalam | PASS (matrix + mixed); FAIL some romanized worth-it | same RISK | same RISK | P0 on lock |

---

**STOP.** No implementation. No production diffs. No prompt/model/vocab/protocol changes. Temporary instrumentation: none used (reverted N/A).
