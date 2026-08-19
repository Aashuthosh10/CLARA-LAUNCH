# M5.3 TTS clip + turn ownership — final report

**Date:** 16 Aug 2026  
**HEAD:** `0cc81fc628b59e757b5044e61f0ca165f8762a1a`  
**Working tree:** M5.0–M5.3 overlay remains uncommitted. Plan file was not edited.

## PROBLEM

Unit-backed turns dropped clip identity and turn identity:

1. N narration segments did not stay N logical clips. Failed TTS used `continue` with no WS frame, and the frontend only appended non-empty WAVs, so `queueLength` shrank (historical kn/ta/te 3-HOD stuck at 2).
2. A new `user_message` nulled `assistantAudioTurnOwnerRef`, which disabled the turn guard. The payload effect depended on `layoutMode`, so Turn A’s 3-HOD plan reapplied after intercept set `FULL_TEXT` (historical 3→1 stayed at 3).

## ROOT CAUSE

Two missing ownership boundaries, not SemanticRequest / UnitSelector / PresentationEngine / greeting dispatcher:

- **Clip owner:** HTTP success count, not `segmentIndex`. Concatenated backup then replaced the clip list on unit-backed turns.
- **Turn owner:** `activeTurnId` was cleared on intercept instead of fenced. Stale `payload.turn_id` could mutate cards and TTS after the next turn began.

## WHAT CHANGED

### Backend (`backend/app/main.py`)

- Unit-backed loop keeps N spoken summaries aligned to plan segments (empty text occupies a slot).
- Never skip a unit-backed index: failure/timeout/empty still sends `assistant_audio_update` with `tts_streaming=true`, `tts_chunk_index=i`, `audioUnavailable=true`, no `audioBase64`.
- Skip concatenated `assistant_full_reply_backup` when `used_bundle_plan`.
- `tts_to_base64_cached(..., allow_english_fallback=False)` on unit-backed chunks so regional **card** clips mark FAILED instead of speaking English. Non-unit replies keep the en-IN fallback.
- Non-unit LOW_LATENCY still `continue`s on failed chunks and may run backup (FAQ/plain replies unchanged).

### Frontend

- Same `ttsStreamQueueRef` (not a second queue), records `{ turnId, unitId, segmentIndex, status, audioBase64? }`.
- `useWebSocket` merges unit-backed frames by `tts_chunk_index` into `tts_clip_slots` (holes stay PENDING). Legacy `mergeTtsAudioQueue` remains for non-unit string queues.
- PLAYABLE → existing `handleAudioPlayback` + `activateByUnitId`. FAILED → show card, no `new Audio`, synthetic engine `ended`, advance playhead.
- Intercept sets `TURN_FENCE_PENDING` (does not null the fence). `isProcessing` assigns `activeTurnId`. `payload.turn_id !== activeTurnId` is IGNORE, including after `layoutMode` changes.
- Unit-backed cards apply when `plan.turnId === activeTurnId` even if `audioPending`.
- Greeting stays on the single-`audioBase64` path.

## PROTECTED (untouched)

- SemanticRequest / UnitSelector / PresentationPlan / `unitId`
- PresentationEngine sequencing / `activateByUnitId` / M5.2 seek
- `frontend/src/lib/ws/outboundCommandDispatcher.ts`
- Unicode-safe multilingual normalization

## UNIT / INTEGRATION

| Suite | Result |
|---|---|
| `backend/tests/test_m53_tts_clip_slots.py` | 4/4 — 3 frames with index 2 `audioUnavailable`; timeout slot; no unit-backed backup; en-IN fallback skipped when `allow_english_fallback=False` |
| `backend/tests/test_low_latency_response.py` | pass (non-unit backup preserved) |
| `backend/tests/test_m52_ws_narration_plan_propagation.py` | pass |
| `backend/tests/test_m53_ws_unitid_parity.py` | pass |
| Vitest `ttsClipSlots` + `turnFence` + `mergeTtsAudioQueue` | 14/14 — 3→1 fence, FAILED length, late chunk, late `onended` / `playbackGen` |
| `npx tsc --noEmit` | pass |

## LIVE E2E (no `installM52Socket`)

Ports: backend `:6969` (restarted PID 6860 after the patch), frontend `:5176`.

| Probe | Result |
|---|---|
| `m53-ws-lifecycle.spec.ts` | **3/3** CONNECTING / OPEN / reconnect picker |
| `m53-hod-identity.spec.ts` | **12/20** |

Passed: all six languages 1-HOD; kn/hi/ta/te/ml 2-HOD; **3→1 new-turn reset** (`data-hod-count` 3 → 1).

Failed: English 2-HOD sequential; all six 3-HOD sequential; 1→3 expand assert on first clip of the new 3-HOD turn.

**Live failure class (PROVEN in backend log, not clip-drop):** Sarvam TTS `402 insufficient_quota_error` / `No credits available` (also 429/404 retries). Unit-backed slots were still emitted (`TTS_CHUNK_FAILED` with `total_chunks=3` for 3-HOD). FAILED skip then advanced `unitId` without speech, so sequential `assertClip` saw `cse.hod` instead of `cse_ds.hod`. This is the specified failed-clip product path, not the old “index 2 never on the wire” bug.

**3→1 is PROVEN fixed** on a live browser (the historical turn-ownership failure).

`docs/_m53_live_ws_six_lang.py` now waits for N `tts_chunk_index` frames and flags backup; it was **not** re-run as acceptance after the 402 quota exhaustion.

## ACCEPTANCE BLOCK

| Question | YES/NO |
|---|---|
| N unit-backed segments emit N logical clip slots (FAILED occupies the index)? | **YES** (backend unit test + live `TTS_CHUNK_FAILED total_chunks=N`) |
| Concatenated backup skipped on unit-backed turns? | **YES** (unit test) |
| Turn fence ignores stale `payload.turn_id` after intercept? | **YES** (Vitest + live 3→1) |
| Greeting dispatcher unchanged / lifecycle E2E still green? | **YES** (3/3) |
| Live 1/2/3 HOD × 6 langs sequential PLAYABLE clips? | **NO** — Sarvam 402 quota; 3-HOD sequential failed |
| Live 3→1 card reset? | **YES** |
| Live 1→3 first-clip identity? | **NO** — same 402 FAILED-skip race on the 3-HOD turn |
| Claim `M5.3 TTS + TURN ARCHITECTURE COMPLETE`? | **NO** |

## FILES

- `backend/app/main.py`
- `backend/tests/test_m53_tts_clip_slots.py`
- `frontend/src/lib/ws/ttsClipSlots.ts` + `__tests__/ttsClipSlots.test.ts`
- `frontend/src/lib/ws/turnFence.ts` + `__tests__/turnFence.test.ts`
- `frontend/src/hooks/useWebSocket.ts`
- `frontend/src/screens/ChatScreen.tsx`
- `frontend/e2e/m53-hod-identity.spec.ts` (`waitForClipSlots`, 1→3)
- `docs/_m53_live_ws_six_lang.py` (chunk-index evidence)
- `docs/M5_3_TTS_TURN_FINAL_BASELINE.md`
- `docs/M5_3_TTS_TURN_FINAL_REPORT.md` (this file)

## FOLLOW-UP (out of this change)

Restore Sarvam credits and re-run `m53-hod-identity.spec.ts` plus `_m53_live_ws_six_lang.py` before claiming the architecture complete. Do not treat 402/empty audio as a clip-merge regression.
