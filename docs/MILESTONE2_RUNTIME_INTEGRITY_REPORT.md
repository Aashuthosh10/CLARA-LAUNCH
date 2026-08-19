# Milestone 2 — Runtime Integrity & Localization Hardening
## Implementation Report

### Changed files

| File | Reason |
|------|--------|
| `backend/config/settings.py` | Runtime / localization / contract / translation-cache settings |
| `backend/services/runtime/*` | Context, ownership, localization, presentation contract/integrity, translation cache, diagnostics, settings bundle, startup |
| `backend/app/main.py` | Contract gate before `narration_plan`; freeze/release; startup integrity |
| `backend/services/answer_generation.py` | Translation cache delegated to runtime module |
| `backend/tests/test_runtime_integrity.py` | Contract, ownership, locale, cache tests |
| `frontend/src/runtime/*` | Additive store, ownership, freeze, contract, diagnostics, DEV dashboard, settings |
| `frontend/src/screens/ChatScreen.tsx` | Contract before `loadPresentation`; ownership guards; cascade; freeze on language |
| `frontend/src/App.tsx` | `claraDebug.getRuntimeIntegrity`; remount sync; DEV dashboard mount |
| `docs/MILESTONE2_RUNTIME_INTEGRITY_REPORT.md` | This report |

### Runtime validations added

- Callback ownership tokens (`generation`, `turnId`, `presentationId`, …) — reject only
- Additive `ConversationRuntimeContext` / FE store (sync only; not a second owner)
- Localization freeze during presentation; language pick blocked while frozen
- Localization consistency before plan attach (conversation == plan == TTS)

### Presentation Contract (mandatory)

Before attaching / loading a plan:

- Count equality: cards == scenes == narrations == captions == audio == indices
- Unique continuous `cardIndex` `0..n-1`
- Non-empty `displayText` / `ttsText`
- Unique scene/segment ids
- Language verified

On failure: `PRESENTATION_CONTRACT_FAILED` → **no** Engine load / **no** plan attach → owner cascade:

`Single Card` → `FULL_TEXT` → concise receptionist reply (never silent).

### Localization validations

- Freeze snapshot on successful plan path
- Verify session language vs plan/TTS lang key
- Release on complete / cancel / contract failure / remount

### Diagnostics added

- Backend: `clara.runtime` / `RUNTIME_*` events when `RUNTIME_DIAGNOSTICS`
- Frontend: timeline + `window.claraDebug.getRuntimeIntegrity()`
- DEV dashboard when `VITE_RUNTIME_DASHBOARD=1`

### Verification

```text
python -m pytest backend/tests/test_runtime_integrity.py \
  backend/tests/test_conversation_intelligence.py \
  backend/tests/test_golden_query_matrix.py \
  backend/tests/test_intent_pipeline.py -q
```

Result: **46 passed, 62 subtests passed**.

### SSOT reminder

Validators reject only. Adapters sync only. Owners mutate business state. Contract never silently repairs.

### Remaining work (Milestone 3)

- Full ConversationLifecycle FSM (if product still requires)
- Intelligent Presentation Planner / Scene Generator
- Narration plan call-site NameError hardening (if still present for some intents)
- Broader FE ownership coverage on every audio queue edge case
- Stricter startup hard-fail as default for production kiosk images
