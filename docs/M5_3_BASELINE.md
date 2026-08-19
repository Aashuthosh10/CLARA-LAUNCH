# M5.3 Phase 0 / 0A — Baseline (read-only)

Recorded 2026-08-14. **No production semantic behavior was changed** for this baseline.

## Phase 0A — Repository integrity

| Field | Value |
| --- | --- |
| Branch | `main` (tracks `origin/main`) |
| HEAD | `0cc81fc628b59e757b5044e61f0ca165f8762a1a` |
| HEAD subject | `fix(ci): clear remaining frontend npm audit findings.` |
| Baseline state | Working tree **is not clean**. Uncommitted M5.0–M5.2 work is the current product state. |

**Do not revert. Do not overwrite unrelated user changes.** Every later M5.3 Stage B edit must be attributable to M5.3 against this tree.

### Modified (already M5.0–M5.2 / related product work)

- `backend/app/main.py`, `backend/config/settings.py`, `backend/services/answer_generation.py`, `backend/services/narration_plan.py`
- Frontend chat/runtime: `ChatScreen.tsx`, `useWebSocket.ts`, `LeadershipOverview.tsx`, `DepartmentCardStage.tsx`, department cards, `collegeLocaleUtils.ts`, `App.tsx`, Playwright/package files
- `facial-display/vite.config.ts`

### Untracked (M5.0–M5.2 architecture — keep)

- `backend/services/content/`, `conversation/`, `orchestration/`, `presentation/`, `runtime/`
- Matching backend tests (`test_m52_*.py`, `test_semantic_request.py`, `test_unit_selector.py`, M4/M5 suites)
- Milestone docs `docs/MILESTONE*.md`, `docs/ARCHITECTURE_FREEZE.md`
- Frontend `src/runtime/`, `src/features/chat/presentation/`, `e2e/m52-card-tts.spec.ts`

### Untracked (M5.3 Stage A forensic only — temporary)

- `docs/_m53_forensic_probe.py`, `docs/_m53_forensic_traces.json`
- `docs/_m53_live_ws_probe.py`, `docs/_m53_live_ws_traces.json`
- `docs/_m53_debug_fees.py`, `docs/_m53_backend_pytest.txt`
- This file and the other `docs/M5_3_*.md` Stage A reports

Temporary probes must not become production architecture.

## Test baseline (do not hide failures; tests were not changed)

### Backend

```
python -m pytest backend/tests -q --tb=no
```

**267 passed, 5 failed**, 2 warnings, 62 subtests passed (~59s).

Pre-existing unrelated failures (TTS / provider paths — **not** M5.3 semantic):

1. `test_provider_failure_paths.py::test_rag_empty_falls_back_without_crashing`
2. `test_provider_failure_paths.py::test_tts_timeout_still_returns_text_response`
3. `test_tts_full_reply.py::test_cache_hit_path_still_segments_without_overlap`
4. `test_tts_full_reply.py::test_first_sentence_and_remainder_are_non_overlapping`
5. `test_tts_full_reply.py::test_single_sentence_reply_emits_single_final_segment`

Raw log: `docs/_m53_backend_pytest.txt`.

### Frontend typecheck

```
npx tsc --noEmit
```

Exit code **0**.

### Targeted vitest (M5.2 playback / ownership)

```
npx vitest run src/runtime/ownership.test.ts src/features/chat/presentation/__tests__/playbackSeek.test.ts src/features/chat/presentation/__tests__/PresentationCardModel.test.ts src/features/chat/presentation/__tests__/presentationTimeline.test.ts src/hooks/__tests__/mergeTtsAudioQueue.test.ts src/components/chat/__tests__/toDepartmentKey.test.ts
```

**6 files, 37 tests passed.**

### Playwright

```
npx playwright test e2e/m52-card-tts.spec.ts --reporter=line
```

**Did not execute tests:** Playwright Chromium headless shell missing (`ms-playwright/chromium_headless_shell-1208`). All 8 specs failed at `browserType.launch`, not at assertions. `e2e/chat-flow.spec.ts` was not run for the same reason.

This is an environment gap, not an M5.2 semantic regression. Prior M5.2 work in this tree reported 8/8 `m52-card-tts` passing with `installM52Socket`. **M5.3 must not use that mock for acceptance.** Live typed WS (Phase 1) is the Stage A browser-adjacent gate.

## Live services at baseline

| Service | Status |
| --- | --- |
| Backend `http://localhost:6969/health` | `{"status":"healthy"}` |
| Vite `http://localhost:5176` | HTTP 200 |
| WS origin allow-list | `http://localhost:5176`, `http://127.0.0.1:5176` |
| `WS_AUTH_REQUIRED` | `false` (local) |

## Semantic IR used for traces

In-process probe calls the same functions the live WS card path uses:

`parse_semantic_request` → `select_content_units` → `resolve_units_for_plan`

Live WS additionally wraps that path in `ConversationOrchestrator` → `presentation_resolver` / `narration_resolver` → `narration_plan` on `assistant_audio_update`.
