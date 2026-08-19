# Milestone 3.5 — Architecture Completion & Turn Finalization

## Deep Implementation Report

### 1. File-by-file changes

| File | Change | Why | Extends |
|------|--------|-----|---------|
| `backend/services/orchestration/response_authority.py` | **Created** — `ResponseAuthority` enum, `select_response_authority`, `assert_authority_allows`, `seal_authority` | Exactly one immutable response owner per turn | M3 resolution flags |
| `backend/services/orchestration/presentation_bundle.py` | **Created** — frozen `PresentationBundle`, `build_presentation_bundle`, `compute_contract_hash` | One immutable presentation object; FE data derived only from this | M3 narration attach + M2 contract |
| `backend/services/orchestration/final_validation.py` | **Created** — `validate_turn_integrity` | Authority ↔ bundle ↔ flags consistency | M3 validators |
| `backend/services/orchestration/types.py` | Extended `ConversationResolution` with `response_authority`, `authority_sealed`, `presentation_bundle` | Carry sealed authority + bundle reference | M3 |
| `backend/services/orchestration/validators.py` | Authority consistency checks when sealed | Fail closed on inconsistent seal | M3 |
| `backend/services/orchestration/conversation_orchestrator.py` | Seal non-card authorities in `run`; build bundle + seal CARD/GROQ in `attach_narration`; diagnostics events | Single authority + one-shot bundle | M3 orchestrator |
| `backend/services/orchestration/__init__.py` | Export M3.5 symbols | Public API | M3 |
| `backend/services/runtime/turn_finalizer.py` | **Created** — `finalize_turn`, `is_turn_finalized`, `reject_if_finalized`, `reject_late_callback` | Terminal turn state; release freeze; reject late BE work | M2 freeze/release/ownership/diagnostics |
| `backend/services/runtime/types.py` | `finalized_turn_id` on `ConversationRuntimeContext` | Sync-only terminal marker | M2 context |
| `backend/services/runtime/__init__.py` | Export finalizer helpers | Public API | M2 |
| `backend/app/main.py` | Authority gates (FAQ/Groq/card); early deferred card attach; derive `narration_plan` from bundle; `finalize_turn` after emit | Downstream obeys sealed authority; no dual replies | M3 wiring + M2 |
| `backend/tests/test_response_authority.py` | **Created** | Authority allow/block + seal | — |
| `backend/tests/test_presentation_bundle.py` | **Created** | Immutability + hash | — |
| `backend/tests/test_turn_finalization.py` | **Created** | Finalize / late reject | — |
| `docs/MILESTONE3_5_ARCHITECTURE_COMPLETION.md` | **Created** | This report | — |

**Not changed (by design):** PresentationEngine, ChatScreen, WS schema, Conversation Intelligence internals, Runtime Integrity contract semantics, narration_plan builder (still wrapped), Response Layout.

---

### 2. Runtime flow (after M3.5)

```text
Wake / greeting
  → Language (session / auto-detect)
  → Conversation Intelligence (M1)           [via ConversationOrchestrator]
  → Runtime Integrity hooks (M2)             [freeze / contract / ownership APIs]
  → Conversation Orchestrator (M3)
       → LocalizationResolver
       → PresentationResolver
       → ResponseAuthority select + seal     [M3.5]
       → (deferred) attach_narration
            → narration_plan + card localize
            → M2 presentation contract
            → PresentationBundle (immutable) [M3.5]
            → seal CARD_PRESENTATION or GROQ
  → Final validation (authority ↔ bundle)
  → Single emit path in main.py
       → FAQ only if authority == FAQ
       → Groq only if authority == GROQ
       → narration_plan only from bundle if CARD
       → TTS
  → TURN_FINALIZED                           [M3.5]
       → release localization freeze
       → clear presentation ownership fields
       → reject late callbacks for this turn_id
```

Diagnostics timeline (gated by `RUNTIME_DIAGNOSTICS`):

`TURN_STARTED` → `AUTHORITY_SELECTED` → `LOCALIZATION_LOCKED` → `PRESENTATION_READY` → `TTS_STARTED` → `TURN_FINALIZED`

---

### 3. Response Authority table

| Authority | When selected | Allowed | Explicitly blocked |
|-----------|---------------|---------|-------------------|
| `RETRY_TEMPLATE` | `NO_SPEECH_RETRY` / RETRY mode | Template short-circuit emit | Groq, RAG, card narration, FAQ |
| `UNKNOWN_TEMPLATE` | UNKNOWN / FOOD / ENVIRONMENT / clarification | Template short-circuit emit | Groq, RAG, card, FAQ |
| `DETERMINISTIC` | GREETING / ENTITY_UPDATE / SMALL_TALK | Template short-circuit emit | Groq, RAG, card, FAQ |
| `FAQ` | DIRECT_RESPONSE / FAQ probe | Deterministic FAQ text + TTS | Groq, RAG, card narration |
| `CARD_PRESENTATION` | Card mode + successful bundle after contract | Bundle-derived `narration_plan` / showCard / spoken summaries | Groq emit, RAG, FAQ emit, rebuild/translate after seal |
| `GROQ` | NORMAL_REPLY / FULL_TEXT / card degrade | RAG (when flags allow) + Groq + spoken FULL_TEXT | Card narration emit, FAQ as alternate authority, second assistant reply from another authority |

**Rule:** Never two assistant replies from different authorities on the same turn. Authority is sealed once; `main.py` cannot force CARD after GROQ seal.

---

### 4. PresentationBundle contents

| Field | Created from | Who reads | Why immutable |
|-------|--------------|-----------|---------------|
| `presentation_id` | `turn_id` + surface + uuid | Runtime context / diagnostics / late reject | Identity of this presentation |
| `language` | resolution.language | Diagnostics | Must match conversation language |
| `language_code` | resolution.language_code_key | Contract verify / hash | Plan locale key |
| `tts_language` | resolution.tts_code | TTS path / verify | Same language authority |
| `card_surface` | resolution.show_card | `showCard` in WS payload | Surface cannot drift |
| `segments` | Validated narration segment public dicts | `narration_plan.segments` | Captions/TTS fixed |
| `spoken_summaries` | segment `tts_text` | TTS chunking / spokenText | No post-edit speech |
| `display_captions` | segment `display_text` | FE captions via plan | No post-edit captions |
| `contract_hash` | sha256 of captions/tts/indices/surface/lang | Diagnostics / integrity | Detect tampering/rebuild |
| `created_at` | UTC ISO timestamp | Diagnostics | Audit |

**Created once** in `ConversationOrchestrator.attach_narration` **after** M2 `validate_before_narration_plan` passes.  
**No rebuilding, no translation, no caption mutation after build.**  
FE still receives the **existing** `narration_plan` shape derived via `bundle.narration_plan_payload(turn_id)` — **zero new WS fields**.

---

### 5. Turn Finalization behavior

When `finalize_turn(session, turn_id=...)` runs (after short-circuit emit or final assistant WS payload):

**Released / cleared (session-side):**
- Localization freeze (`release_localization`)
- `active_presentation_id`, `active_scene`
- `runtime_state` → `idle`
- Sets `finalized_turn_id` + `session["_turn_finalized"]`

**Rejected after finalize (same `turn_id`):**
- Late TTS / Groq / narration / FAQ re-emit attempts via `reject_if_finalized` / `reject_late_callback`
- Duplicate narration / audio / caption attach attempts (same helper)
- Ownership mismatches still rejected via M2 `validate_callback_token`

**Not owned by BE finalizer (unchanged FE):** PresentationEngine audio queue, FE timers, ChatScreen playback — still FE/M2 FE freeze release on presentation complete. BE finalizer closes the prior gap where successful turns never released session localization freeze.

**Idempotent:** second finalize for the same turn is a no-op success with diagnostics `idempotent=True`.

---

### 6. Regression analysis

| Question | Answer |
|----------|--------|
| Could this break wake/greeting? | **Unlikely.** Guest-name path unchanged; DETERMINISTIC short-circuit still uses `_emit_direct_conversation_reply`. |
| Could this break language selection? | **Unlikely / improves.** Finalizer releases freeze after turn so language is not stuck frozen after successful cards. No WS language schema change. |
| Could this break PresentationEngine? | **Unlikely.** Same `narration_plan` segment shape; no PE/ChatScreen edits. |
| Could this break ChatScreen? | **Unlikely.** Zero WS field additions; existing fields only. |
| Could this break FULL_TEXT? | **Unlikely.** Card contract/localization fail → degrade + seal `GROQ` → existing spoken reply path. |
| Could this break Runtime Integrity? | **Unlikely.** Composes freeze/release/contract/ownership; does not rewrite contract semantics. |
| Could this break M1 Conversation Intelligence? | **Unlikely.** Still invoked only through orchestrator; policy/templates unchanged. |

**Tightening (intentional):** If orch seals `GROQ`, main can no longer force a card plan later. That prevents dual authorities; some edge cases where main feature-routing alone found a card after orch said ANSWER will now stay FULL_TEXT/GROQ unless orch classified CARD.

---

### 7. Test report

```text
pytest backend/tests/test_response_authority.py \
       backend/tests/test_presentation_bundle.py \
       backend/tests/test_turn_finalization.py \
       backend/tests/test_conversation_orchestrator.py \
       backend/tests/test_conversation_intelligence.py \
       backend/tests/test_runtime_integrity.py -q

52 passed in 0.56s
```

| Suite | Role |
|-------|------|
| `test_response_authority.py` | Groq/FAQ/card/retry/unknown blocked; seal aligns flags |
| `test_presentation_bundle.py` | Frozen bundle; stable hash; build from segments |
| `test_turn_finalization.py` | Release freeze; idempotent finalize; late rejects |
| M1 / M2 / M3 suites | Kept green |

No failing tests. No production logging added outside existing `RUNTIME_DIAGNOSTICS` gate.

---

### 8. Remaining production work

At this point architecture integrity for turns is largely complete. Remaining work is mostly:

1. **Presentation Intelligence** (true Scene Generator / Planner, if still desired beyond `narration_plan`)
2. **Content expansion** (canteen, hostel, environment, clubs, richer FAQ/topics)
3. **UI polishing** (kiosk UX, not architectural)
4. **End-to-end production validation** (wake → multilingual card → TTS → language change after finalize; load/latency; ownership under cancel/barge-in)
5. Optional: wire more late-reject call sites in streaming TTS/Groq loops for belt-and-suspenders coverage beyond finalize + stale generation markers

---

### Architectural decisions (summary)

1. **Zero new WS fields** — bundle → existing `narration_plan` / `showCard` / `spokenText`.
2. **Authority sealed in orchestration** (card after attach; others immediately).
3. **`TURN_FINALIZED` after outbound emit**, distinct from orch `TURN_COMPLETED`.
4. **FE audio/queue/timers stay FE-owned**; BE finalizer owns session freeze + late BE callback rejection.
5. **No redesign** of PresentationEngine, Runtime Integrity core, CI, ChatScreen, or WS.
