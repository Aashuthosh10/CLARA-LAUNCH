# Milestone 3 — Unified Conversation Orchestration
## Implementation Report

### Changed files

| File | Reason |
|------|--------|
| `backend/services/orchestration/types.py` | `ConversationResolution`, `PresentationMode` |
| `backend/services/orchestration/result.py` | `OrchestratorResult` |
| `backend/services/orchestration/validators.py` | Conversation-level flag consistency contract |
| `backend/services/orchestration/diagnostics.py` | Unified `TURN_*` timeline via M2 `log_runtime_event` |
| `backend/services/orchestration/localization_resolver.py` | Single language authority for the turn |
| `backend/services/orchestration/presentation_resolver.py` | Map M1 `PolicyAction` → one presentation mode + Groq/RAG/plan flags |
| `backend/services/orchestration/narration_resolver.py` | Thin wrap of `build_pre_llm_narration_plan` |
| `backend/services/orchestration/card_localization.py` | Caption/TTS language match; fail closed (no mixed languages) |
| `backend/services/orchestration/conversation_orchestrator.py` | Fixed pipeline + `attach_narration` (M2 contract) |
| `backend/services/orchestration/__init__.py` | Public exports |
| `backend/app/main.py` | Replace inline M1 block with orchestrator; gate RAG/Groq/plan/length from resolution |
| `backend/tests/test_conversation_orchestrator.py` | M3 unit tests |
| `docs/MILESTONE3_ORCHESTRATION_REPORT.md` | This report |

### What the orchestrator does

Fixed order (no redesign of CI / runtime / PresentationEngine / WS / ChatScreen):

1. M1 transcript → entities → semantic → intent → policy  
2. LocalizationResolver (freeze language fields on `ConversationResolution`)  
3. PresentationResolver → single `presentation_mode` + flags  
4. Narration (deferred in `main` until after language auto-detect, then `attach_narration`)  
5. CardLocalizationAdapter + M2 presentation contract  
6. Emit `ConversationResolution` — sole authority for downstream Groq/RAG/plan branches  

Short-circuits (`RETRY` / `UNKNOWN` / `DIRECT`) still use `_emit_direct_conversation_reply` with existing WS payload shape.

### Flag mapping (summary)

| Mode | Groq | RAG | Plan |
|------|------|-----|------|
| RETRY / UNKNOWN / DIRECT | no | no | no |
| DIRECT_FAQ | no | no | no |
| CARD_PRESENTATION | yes (fallback) | no | yes |
| NORMAL_REPLY | yes | yes | no |
| FULL_TEXT (degraded) | yes | per path | no |

Unsupported topics (`FOOD` / `ENVIRONMENT`) never become nearest-department cards.

### Degradation

- Narration / contract / localization fail → `FULL_TEXT`, no segments attached, never silent  
- Timeline: `TURN_STARTED` → `TRANSCRIPT_OK` → `ENTITY_OK` → `INTENT_OK` → `LOCALIZATION_OK` → `PRESENTATION_OK` → `NARRATION_OK` / `*_DEGRADED` → `TURN_COMPLETED`

### Tests

```text
pytest backend/tests/test_conversation_orchestrator.py \
       backend/tests/test_conversation_intelligence.py \
       backend/tests/test_runtime_integrity.py -q
# 36 passed
```

Covered: canonical name, food/environment UNKNOWN flags, RETRY never RAG, card presentation flags, localization identity, contract fail → no segments / FULL_TEXT.

### Remaining work (out of M3 scope)

- True Scene Generator / Presentation Planner (not in repo; still `narration_plan`)  
- Conversation lifecycle FSM beyond turn-level resolution  
- Optional FE sync of `ConversationResolution.language` into runtime store (not required for DoD; session language already aligned)  
- Stronger localIntent → card intent mapping inside M1 `score_intent_from_features` (orchestrator compensates for `department_click`)
