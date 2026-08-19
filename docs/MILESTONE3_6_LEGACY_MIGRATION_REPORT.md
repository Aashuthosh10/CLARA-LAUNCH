# Milestone 3.6 — Legacy Migration Completion & Architecture Freeze

## Deep Implementation Report

### 1. File-by-file changes

| File | Change | Why |
|------|--------|-----|
| `backend/services/orchestration/emit_gate.py` | **Created** | Require sealed authority; deterministic orch-failure fallback; out-of-band DETERMINISTIC seal |
| `backend/services/orchestration/outbound_builder.py` | **Created** | Single `OutboundResponse` owner for assistant payloads |
| `backend/services/orchestration/architecture_linter.py` | **Created** | Static ownership metrics + startup gate |
| `backend/services/runtime/conversation_snapshot.py` | **Created** | Immutable per-turn debug snapshot |
| `backend/services/runtime/turn_finalizer.py` | Store snapshot on finalize | Terminal audit record |
| `backend/services/runtime/startup.py` | Run architecture linter | Fail/warn on ownership regressions |
| `backend/services/orchestration/presentation_resolver.py` | LOCATION / OFF_TOPIC → DIRECT (DETERMINISTIC); card `should_call_groq=False` | Templates never sealed as GROQ |
| `backend/services/conversation/semantic_normalize.py` | Add LOCATION topic | Pre-seal DETERMINISTIC mapping |
| `backend/app/main.py` | Orch fail → fallback return; FAQ/Groq/cache/direct_reply gated; remove `build_pre_llm_narration_plan`; guest/direct via builder + finalize | Execution shell; legacy emit retired |
| `backend/services/orchestration/__init__.py` | Export M3.6 symbols | Public API |
| `backend/services/runtime/__init__.py` | Export snapshot helpers | Public API |
| `backend/tests/test_architecture_escape.py` | **Created** | Permanent escape regression suite |
| `docs/ARCHITECTURE_FREEZE.md` | **Created** | Frozen subsystem list + main.py shell rule |
| `docs/MILESTONE3_6_LEGACY_MIGRATION_REPORT.md` | **Created** | This report |

---

### 2. Legacy removal report

| Bypass (before M3.6) | Disposition |
|----------------------|-------------|
| Orch exception → `conversation_resolution = None` + full legacy pipeline | **Removed** → `safe_deterministic_fallback_resolution` + emit + finalize + return |
| FAQ when resolution missing / “legacy” comment | **Removed** → FAQ only if `assert_can_emit(emit_faq)` |
| `build_pre_llm_narration_plan` in `main.py` | **Removed** → only orchestrator `narration_resolver` |
| Template helpers (location/docs/fees/…) while authority GROQ | **Removed** → blocked; helpers only under DETERMINISTIC/FAQ/CARD |
| LLM cache hydrate for non-GROQ | **Removed** → cache read/write only when GROQ allowed |
| Guest-name emit without authority | **Migrated** → `seal_out_of_band_deterministic` + finalize + snapshot |
| Short-circuit hand-rolled payload | **Migrated** → `build_template_outbound` |
| Wake / language-gate TTS (many WS sites) | **Intentionally retained** as non-conversation UX; guest-name covered. Remaining wake/language prompts still use existing handlers — documented as out-of-band; guest path is the onboarding answer. Full wake sweep can extend same helper later without redesign. |
| Early “Got it.” / ack earcon | **Retained** — non-answer UX (Architecture Freeze) |
| `build_pre_llm_narration_plan` library + unit tests | **Retained** — sole production caller is narration_resolver |

---

### 3. Response ownership audit

| Response type | Authority | Sealed | Emitted | Finalized |
|---------------|-----------|--------|---------|-----------|
| Retry | `RETRY_TEMPLATE` | Orch short-circuit | `_emit_direct` → OutboundBuilder | After emit |
| Unknown / food / environment | `UNKNOWN_TEMPLATE` | Orch short-circuit | same | After emit |
| Greeting / name / small-talk | `DETERMINISTIC` | Orch short-circuit | same | After emit |
| Off-topic / location templates | `DETERMINISTIC` | PresentationResolver → orch seal | main under DETERMINISTIC gate or short-circuit | After emit |
| FAQ | `FAQ` | Orch (DIRECT_FAQ) | FAQ path only if emit_faq | After final WS |
| Card presentation | `CARD_PRESENTATION` | `attach_narration` + bundle | Bundle → narration_plan via builder fields | After final WS |
| Full text / normal answer | `GROQ` | Orch (non-card) | Groq/cache only if emit_groq | After final WS |
| Orch failure | `DETERMINISTIC` | emit_gate fallback | Template emit | After emit |
| Guest-name ready | `DETERMINISTIC` | `seal_out_of_band_deterministic` | OutboundBuilder | After emit |

---

### 4. Architecture escape audit

Confirmed by `run_architecture_lint()` + `test_architecture_escape.py`:

- No `build_pre_llm_narration_plan` in `main.py`
- No “continuing with legacy pipeline”
- Single ResponseAuthority selector, PresentationBundle builder, narration production caller, outbound builder, finalizer
- Wrong-authority FAQ/Groq/card blocked
- Finalize writes `ConversationSnapshot`; late callbacks rejected

**Remaining (documented, not conversation-answer owners):** wake/language prompt TTS sites in WS handler still assemble some onboarding payloads locally; guest-name is on the DETERMINISTIC path. Early partial/ack are non-answers.

---

### 5. Migration completeness

**Legacy conversation answer pipeline: retired** for `process_user_text_and_reply` (orch fail no longer continues; no main narration builder; authority gates on FAQ/Groq/templates/cards).

**Compatibility retained:** narration_plan library for orchestrator; existing WS field names; FE PresentationEngine unchanged.

---

### 6. Regression report

| Area | Impact |
|------|--------|
| Wake / greeting | Low — guest-name now DETERMINISTIC+finalize; wake prompts unchanged shape |
| Language selection | Low — no WS/lang redesign; freeze still released on finalize |
| Card presentations | Low — bundle-only narration; same `narration_plan` shape |
| FULL_TEXT | Low — card degrade still seals GROQ |
| PresentationEngine | None — no PE edits |
| Runtime Integrity | Extended (snapshot + linter), not redesigned |
| Conversation Intelligence | Extended LOCATION topic only |
| WebSocket compatibility | Preserved — no new fields |

---

### 7. Architecture freeze confirmation

See [`docs/ARCHITECTURE_FREEZE.md`](ARCHITECTURE_FREEZE.md). Frozen: CI, Runtime Integrity, Orchestrator, ResponseAuthority, PresentationBundle, OutboundBuilder, TurnFinalizer, Snapshot, PE, validators, ConversationResolution, WS contract, ChatScreen ownership. **main.py = execution shell only.**

---

### 8. Architecture Metrics

| Metric | Target | Actual (linter) |
|--------|--------|-----------------|
| ConversationResolution owners | 1 | 1 |
| ResponseAuthority selectors | 1 | 1 |
| PresentationBundle builders | 1 | 1 |
| Narration builders (production) | 1 | 1 |
| Outbound response builders | 1 | 1 |
| Runtime finalizers | 1 | 1 |
| Legacy emit paths | 0 | 0 |
| Legacy narration paths in main | 0 | 0 |
| Authority bypasses | 0 | 0 |
| Architecture violations | 0 | 0 |

---

### 9. Test report

```text
pytest … (M1–M3.6 + golden matrix)
62 passed, 13 subtests passed
```

---

### 10. Remaining production work

1. Presentation Intelligence (Scene Generator / Planner beyond `narration_plan`) if desired  
2. Content expansion (canteen, hostel, clubs, …)  
3. UI polish  
4. End-to-end production validation  
5. Optional: migrate remaining wake/language WS prompts onto `seal_out_of_band_deterministic` + OutboundBuilder for full onboarding uniformity  
