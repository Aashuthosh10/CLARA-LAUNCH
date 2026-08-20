# M5.8 — TTS pipeline restoration + deterministic voice orchestration

**Date:** 2026-08-20  
**Scope:** response-TTS architecture only. Semantic parser, vocabulary, ResponseDecision, UnitSelector, PresentationEngine, RAG, GPT-OSS router, department identity, and six-language routing were not modified.

## 1. Original TTS architecture findings

Reference: `https://github.com/Aashuthosh10/CLARA-LAUNCH.git` at `origin/main` `0cc81fc`.

Default `LOW_LATENCY_VOICE_MODE=true`:

- Early `visible_payload` with `audioPending=true` and `isProcessing=false` **before** TTS (text first).
- Always `split_tts_chunks(..., max_chars=220)` even for short receptionist answers.
- Stream `assistant_audio_update` (`tts_streaming=true`) per successful chunk.
- Per-chunk up to 3 Sarvam attempts.
- First-sentence TTS is **skipped** when `LOW_LATENCY_VOICE_MODE` is on, so `ENABLE_FIRST_SENTENCE_TTS` / `ENABLE_TTS_PIPELINING` flags existed but were inactive on the default path.
- Shared `httpx.AsyncClient` (connection reuse) + `TTS_CACHE` + singleflight.
- ACK/earcon used the same `handleAudioPlayback` as response TTS (the M5.7 playhead bug).
- Documented latency philosophy: visible answer p95 ~242ms; first audio-ready p95 ~3s with `AUDIO_UPDATE_TIMEOUT_S=3.0`.

## 2. Current TTS architecture findings (M5.7 at `2ff85a6`)

- `KIOSK_COMPLETE_RESPONSE_TTS=true`: hold THINKING until **every** clip is collected, then one final frame with `tts_audio_queue` / `tts_clip_slots`.
- Streaming isolated behind the complete-response flag, not deleted.
- ACK isolated (`AckPlayer`); response playhead owned by `createResponseTtsScheduler()`.
- Turn fencing, WAV validation, no-backup-if-primary-complete.
- Frontend `isPresentationReady()` required **all** expected clips non-PENDING.
- Short answers still split at 220 chars when the splitter produced multiple sentences.
- Low-latency TTS budget could be clamped to `AUDIO_UPDATE_TIMEOUT_S - elapsed` (~3s remaining), starving generation while the UI waited for complete audio anyway.

## 3. Exact architectural divergence

| Topic | Original | M5.7 | M5.8 target |
| --- | --- | --- | --- |
| TTS request count | Often 2–3 chunks + optional backup | Same chunking, wait-for-all, backup only if incomplete | Short answer = 1 call; long/card = N ordered; backup only if zero successful clips |
| Chunk size | 220 / 260 / 340 | Same | Short path bypasses split when `len(text) <= 480` |
| First-sentence TTS | Flag on, inactive in low-latency | Same | First **playable segment** is the production first-audio path |
| Pipelining | Emit each chunk as generated | Collect all, then present | Emit each clip into the scheduler by index; present on clip 0 |
| HTTP reuse / cache | Shared client + cache | Same | Cache key now includes language+voice+pace+model+text; English fallback is not cached under a regional key |
| Retry | 3/chunk | 3/chunk | 2/chunk (`TTS_CHUNK_MAX_ATTEMPTS`) plus provider 5xx retry |
| Timeout | 3s visible cap; 6s first chunk | Same 3s cap used as generation budget | Hold-thinking uses `TTS_TIMEOUT_S`; first chunk default 10s |
| Fallback | Unconditional full backup in older code | Backup if char-count incomplete | Backup only when primary produced **zero** clips |
| Queue ownership | Shared playhead with ACK | Scheduler + ACK isolation | Unchanged M5.7 ownership; streaming now **ingests into the same scheduler** |
| Present gate | Text first | All clips ready | First playable clip ready |
| Cards | Narration chunks streamed | Wait for all slots | Same orchestrator; N clips from UnitSelector/PresentationEngine plan |

## 4. Root cause(s)

1. **Wait-for-all** made reliability mean “serialize every clip before the kiosk can speak.” That is not the original low-latency idea and is not required for ordered playback.
2. **220-char splitting** turned normal 2–4 sentence receptionist answers into extra Sarvam calls. The answer-length governor already caps normal replies at ~480 characters.
3. **Complete-response + 3s remaining budget** combined to wait longer and still starve TTS.
4. **Streaming clips were not ingested by the M5.7 scheduler** (`tts_streaming===true` skipped the ingest branch). Turning streaming back on without that ingest would have revived a second player path.
5. **Char-count backup** (`successful_chunk_chars < len(source)`) could fire a full-reply duplicate even when primary clips already covered the response.

## 5. Files changed

- `backend/services/tts_orchestrator.py` (new)
- `backend/services/tts_chunking.py` (Indic `।` / `\|` sentence split)
- `backend/config/settings.py`
- `backend/app/main.py`
- `backend/app/telemetry.py`
- `backend/utils/timing.py`
- `.env.example`
- `frontend/src/lib/tts/responseTtsScheduler.ts`
- `frontend/src/screens/ChatScreen.tsx`
- `frontend/src/lib/tts/__tests__/responseTtsScheduler.test.ts`
- `frontend/e2e/m58-tts-orchestrator.spec.ts` (new)
- `backend/tests/test_m58_tts_orchestrator.py` (new)
- `backend/tests/test_m58_live_sarvam.py` (new)
- `backend/tests/test_m57_complete_response_tts.py`
- `backend/tests/test_low_latency_response.py`
- `backend/tests/test_m53_tts_clip_slots.py`
- `scripts/m58_live_ws_probe.py` (new)
- `docs/M5_8_TTS_IMPLEMENTATION_REPORT.md` (this file)

## 6. Files deliberately NOT changed

Semantic parser, semantic vocabulary, institution cues, ResponseDecision, UnitSelector, department identity, PresentationEngine, RAG retrieval, GPT-OSS semantic router, RAG model, six-language semantic routing, card selection policy, `backend/services/answer_generation.py`.

ACK player, audio validation, turn fence modules were kept. Wait-for-all remains available via `KIOSK_COMPLETE_RESPONSE_TTS=true` for experiments.

## 7. New TTS architecture

```
USER INPUT
    → STT / text
    → semantic routing / ResponseDecision / UnitSelector / PresentationEngine
    → RESPONSE CONTENT
    → TTS ORCHESTRATOR (plan_response_tts)
          ANSWER short → 1 segment
          ANSWER long  → ordered sentence segments
          CARD         → N clips from narration/spoken_summaries
    → generate clip i (retry that clip only)
    → emit assistant_audio_update by tts_chunk_index
    → ResponseTtsScheduler (ingest by index)
    → play 0 → 1 → 2
ACK / earcon remains outside this path (AckPlayer)
```

Production defaults:

- `KIOSK_COMPLETE_RESPONSE_TTS=false`
- `KIOSK_HOLD_THINKING_UNTIL_FIRST_AUDIO=true`
- `TTS_SHORT_ANSWER_MAX_CHARS=480`
- `TTS_CHUNK_MAX_ATTEMPTS=2`
- `TTS_CHUNK_FIRST_TIMEOUT_S=10.0`

THINKING stays until the first playable clip is validated. Later clips may still generate. Playback order is always index order.

## 8. TTS request-count comparison

| Path | Original default | M5.7 default | M5.8 default |
| --- | --- | --- | --- |
| Short receptionist answer (~2–4 sentences, ≤480 chars) | 1–N chunks at 220 chars, plus possible backup | Same chunking, wait for all | **1** provider call when cache miss |
| Long / FAQ / comparison | N chunks streamed | N chunks, wait-for-all | N chunks, first-playable, no full backup if any clip succeeded |
| Card N units | N clips | N clips wait-for-all | N clips, same scheduler |
| Live WS Kannada short answer | — | — | `tts_requests_per_turn=1`, `tts_chunks_per_turn=1`, `tts_backup_used=false` |
| Live WS English HOD card | — | — | `tts_plan_mode=card`, `tts_requests_per_turn=1` |

## 9. Latency comparison

Do not treat unit tests as kiosk latency.

| Source | user→first audio | TTS calls | Notes |
| --- | --- | --- | --- |
| Original docs | first audio-ready p95 ~3000ms | chunked | Text was shown first (`AUDIO_UPDATE_TIMEOUT_S=3.0`) |
| M5.7 complete-response | first audio = last clip | N serial | THINKING until all clips |
| Live Sarvam REST (this machine, 2026-08-20) | 1.31–2.01s per short phrase | 1 / language | See §15 |
| Live WS Kannada short (fresh `:6971`) | `first_audio_ready_ms=7526`, `tts_generation_ms=5197` | 1 | Includes LLM + TTS; first stream at 13.2s from socket start |
| Live WS English short retry | `first_audio_ready_ms=1024` | 0 HTTP (cache hit) | Cache from earlier English attempt |
| Live WS English HOD card | `first_audio_ready_ms=5196` | 1 | `tts_plan_mode=card` |

M5.8 does not claim a new invented p95. The architectural improvement vs M5.7 is: **first playable clip unblocks THINKING** instead of waiting for later clips. Vs original: **text is not shown before validated speech**, which was a kiosk requirement.

First English live WS attempt timed out at the old 6s first-chunk budget while the connection was cold; that is why `TTS_CHUNK_FIRST_TIMEOUT_S` default is now 10s.

## 10. Six-language results

Planner + mocked WS path (`test_m58_tts_orchestrator`): en, kn, hi, ta, te, ml short answers each produced **one** chunk and the session language code (`en-IN` … `ml-IN`) was passed through unchanged.

Mixed queries (`teachers hegiddare?`, `CSE Data Science fee eshtu?`, `AIML HOD yaaru?`, `teachers kaise hain?`, `CSE Data Science fee evlo?`) kept `kn-IN` as the TTS code when the session language was Kannada.

Live Sarvam REST: all six codes returned validated RIFF/WAV (see §15).

Live WS: Kannada short answer and English card succeeded. Tamil live WS on the first `:6971` process did not return a final frame before the probe timeout (same 6s first-chunk race as the first English attempt). That is a timeout/probe issue, not a language-code mapping bug.

## 11. Card results

UnitSelector/PresentationEngine still choose cards. TTS only narrates `spoken_summaries` / narration segments.

Live WS: `Who is the HOD of CSE Data Science?` → `tts_plan_mode=card`, one clip, audio present, no backup.

M5.3 slot tests still pass in complete-response mode (wait-all remains an explicit flag).

## 12. Multi-card results

Planner: `plan_response_tts(card_segments=[...N])` preserves N clips with no two-card cap.

M5.3 three-HOD slot test: three indexed slots, failed middle clip stays FAILED, no full-reply backup.

Frontend scheduler: ingest by sequence, play 0→1→2 even if clip 1 arrives first. Presentation is allowed when clip 0 is READY while later clips are still PENDING.

## 13. Failure recovery results

- Empty/invalid audio → FAILED, not READY.
- Total TTS failure → `audioUnavailable`, THINKING released, text committed, no delay-failsafe speech.
- Partial clip failure → do **not** regenerate the whole reply; successful clips are kept.
- `audio.play()` rejection / watchdog → clip FAILED, next clip unblocked.
- Stale-turn ingest rejected; new turn clears previous clips.
- E2E: TTS failure keeps `data-testid=chat-screen` mounted and the next question works.
- Bounded retries: 2 attempts per clip, then mark FAILED.

## 14. Browser results

Playwright Chromium (`e2e/m57-tts-scheduler.spec.ts`, `e2e/m58-tts-orchestrator.spec.ts`): **5 passed**.

Verified with mocked `audio.play()` (not speaker capture):

- THINKING until first playable clip, then answer visible.
- ACK does not skip response audio.
- TTS failure: ChatScreen remains mounted; next question works.
- `play()` rejection: no black screen.

These E2E tests mock WebSocket and `HTMLMediaElement.play`. They prove UI/scheduler ownership, not live Sarvam.

## 15. Real Sarvam results

`backend.tests.test_m58_live_sarvam` against the configured key, 2026-08-20, shared httpx client:

| Language | HTTP audio | generation_ms | bytes | validation | retries |
| --- | --- | --- | --- | --- | --- |
| en-IN | yes | 2005.9 | 110260 | RIFF/WAV | 0 |
| kn-IN | yes | 1874.0 | 121030 | RIFF/WAV | 0 |
| hi-IN | yes | 1840.8 | 113880 | RIFF/WAV | 0 |
| ta-IN | yes | 1358.4 | 93160 | RIFF/WAV | 0 |
| te-IN | yes | 1306.9 | 85242 | RIFF/WAV | 0 |
| ml-IN | yes | 1485.2 | 96170 | RIFF/WAV | 0 |

Live WebSocket was run against a **fresh** uvicorn on `127.0.0.1:6971` from this tree (not an unknown old `:6969` process).

## 16. Git commit hash

Recorded after commit/push in the follow-up line of this file and in chat.

## 17. GitHub verification result

Recorded after `git push` to `https://github.com/Naveenkumar2027/clara_finished-.git` `main`.

## 18. Remaining limitations

- First-sentence TTS remains inactive in default `LOW_LATENCY_VOICE_MODE`. Production first-audio is first-playable orchestrator clips, not the old first-sentence task.
- Remaining long-answer clips are generated sequentially after clip 0 (frontend can play 0 while 1 is generating). HTTP overlap of later clips is not enabled, to avoid a Sarvam thundering herd.
- English fallback on non-unit answers still exists for the current turn if the primary language fails, but that audio is **not** written into the regional cache key.
- Playwright does not capture real loudspeaker output.
- Answer-length governor still caps normal replies at ~480 characters; long pipelining is for FAQ/comparison/card narration and explicitly long text.
- A cold first WebSocket turn can still miss a 6s provider wait on a process started before the 10s default; restart the backend after deploy so `:6969` is this tree.
- Unrelated local stash `unrelated-m55-answer-generation` was not applied.

## Acceptance checklist

- [x] Original TTS architecture audited
- [x] Current TTS architecture audited
- [x] Exact divergence documented
- [x] One authoritative response-TTS path (orchestrator → scheduler)
- [x] Short answers avoid unnecessary TTS calls
- [x] Long answers use ordered sentence-aware pipelining
- [x] ACK isolated
- [x] Turn fencing kept
- [x] TTS failures recover
- [x] No infinite retry
- [x] No duplicate TTS generation when primary covers the response
- [x] No stale speech (turn fence)
- [x] Cards use the same TTS architecture
- [x] Arbitrary N-card narration (planner + scheduler)
- [x] Six languages covered in unit + live REST
- [x] Mixed-language cases tested
- [x] ChatScreen E2E remains mounted on TTS failure
- [x] No black screen in E2E
- [x] Real Sarvam calls tested
- [x] Real WebSocket tested on a fresh backend
- [x] Browser/kiosk flow tested (Playwright; play() mocked)
- [x] Latency measured (REST + live WS; not invented p95)
- [x] TTS request count measured
- [x] No unrelated architecture changed
- [x] Relevant tests pass
- [ ] Changes committed (this revision)
- [ ] Changes pushed and GitHub HEAD verified
