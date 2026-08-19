# M5.7 — TTS reliability implementation

**Date:** 2026-08-19  
**Scope:** response-TTS reliability only. No semantic parser, RAG, UnitSelector, ResponseDecision, department identity, or six-language routing changes.

## 1. Root cause

ACK/earcon playback and response TTS shared `ChatScreen.handleAudioPlayback`. ACK `onended` advanced `ttsPlayheadRef` while the stream queue was still empty, so later ANSWER/CARD clips inserted at index 0 were skipped. Cached CARD clips could also be skipped by `isPlayingBackendAudio && !streamTurnReset`.

Sarvam, backend WAV generation, and WebSocket delivery were not the first broken boundary. M5.6 (show text before TTS) made the silent queue visible; it was not the root cause.

## 2. Architecture before

```
ACK earcon ──┐
             ├── handleAudioPlayback ── ttsPlayheadRef / ttsStreamQueueRef
ANSWER TTS ──┤
CARD TTS ────┘

visible_payload (audioPending=true) → stream interims → unconditional ANSWER backup TTS
```

Playback order depended on arrival order plus a shared playhead. ACK completion looked like TTS completion.

## 3. Architecture after

```
ACK/EARCON
    independent AckPlayer
    never touches response-TTS sequence

RESPONSE TTS
    createResponseTtsScheduler()
    PENDING → GENERATING → READY → PLAYING → COMPLETED
    or GENERATING → FAILED

KIOSK_COMPLETE_RESPONSE_TTS=true (default)
    hold THINKING (isProcessing) until complete audio is validated
    present answer/card
    play
```

Streaming TTS remains behind `KIOSK_COMPLETE_RESPONSE_TTS=false`. It is isolated, not deleted.

## 4. ACK / TTS separation

New module: `frontend/src/lib/tts/ackAudio.ts`.

- ACK frames (`assistant_ack_audio` / `ack_earcon`) play only through `AckPlayer`.
- ACK `onended` / `play().catch` / `stop` do not call `completeClip`, do not increment `ttsPlayheadRef`, and do not mark response clips COMPLETED.
- Starting response playback stops ACK so two speakers do not overlap.

## 5. TTS scheduler

New module: `frontend/src/lib/tts/responseTtsScheduler.ts`.

Owns:

- current turn id
- clip sequence (ingest by index, not arrival order)
- READY / PLAYING / COMPLETED / FAILED / CANCELLED
- presentation-ready gate
- playhead (advanced only by `completeClip` from `response-ended` | `response-error` | `watchdog`)

Duplicates of a READY clip are ignored. Stale-turn ingest is rejected. Current-turn ingest may `beginTurn` if the owner is not yet assigned (turn-fence PENDING adopt).

## 6. ANSWER flow

```
USER INPUT
→ THINKING (isProcessing)
→ answer generated
→ complete TTS (chunk collect, no streaming interims)
→ validate audio
→ final assistant_audio_update { audioPending:false, tts_audio_queue, audioBase64 }
→ present text
→ play sequence
```

If primary chunks cover the full spoken text, **no backup TTS** is generated.

## 7. CARD flow

```
CARD plan + narration_plan
→ TTS for required clips
→ tts_clip_slots on the final frame (PLAYABLE or FAILED per index)
→ CARD ready
→ play clips in segmentIndex order
```

Failed middle clips stay on the wire. Playback skips FAILED and continues. Ordering is `unit 0 → clip 0`, not arrival order.

## 8. Failure recovery

| Failure | Recovery |
| --- | --- |
| Sarvam timeout / empty / HTTP | bounded 3 attempts per chunk, then optional full-reply backup only if primary incomplete |
| Invalid/empty base64 | scheduler marks FAILED, never READY |
| `audio.play()` reject | `completeClip(..., 'response-error')`, unmute hint, next clip / next turn |
| `onended` never fires | watchdog = estimated duration + 2.5s, clamped 4s–60s |
| Stale turn | fence reject |
| New user turn during TTS | scheduler `reset()`, ACK `stop()`, playback generation bump |
| TTS total failure | `audioUnavailable=true`, thinking released, text still commits |

`audioPending` watchdog remains at 20s so presentation cannot deadlock.

## 9. Turn fencing

M5.6 fence is preserved:

- CURRENT turn audio accepted
- STALE turn audio rejected
- While PENDING, the newly identified `turn_id` is adopted (current-turn audio is not dropped because the owner is late)

Scheduler `beginTurn` is called from intercept reset recovery, `isProcessing`, fence adopt, and ingest-if-unassigned.

## 10. Audio validation

`frontend/src/lib/tts/audioValidation.ts` requires:

- non-empty base64
- successful decode
- decoded bytes > 0
- RIFF/WAV encoding

Only then READY.

## 11. Six-language support

The scheduler and complete-response path are language-agnostic. Language detection → `*-IN` TTS code is unchanged.

Unit tests cover en/kn/hi/ta/te/ml ingest and complete-response finals.

## 12. Tests

**Backend** (`python -m unittest discover -s backend/tests -p "test_*.py"`): 437 tests. Two first-sentence failures from an overly broad complete-TTS skip were fixed; targeted re-run of `test_tts_full_reply` + M5.7 + low-latency = OK.

**Frontend:** `npx tsc --noEmit` clean. `npx vitest run src` — **121 passed**.

**E2E:**

- M5.6 six-language ANSWER after TTS ready + failure recovery: passed
- M5.7 ACK isolation + `audio.play()` reject next-turn: passed
- M5.2 card TTS including multi-HOD and left/right seek: passed
- chat-flow language matrix: passed except one pre-existing flake (`Sleep -> Language -> Chat` language button not stable, 15s timeout)

New tests: scheduler ACK isolation, out-of-order, duplicate, stale/current turn, play reject, watchdog, missing sequence, complete-response no-stream / no-backup, six-language finals, clip slots on the terminal frame.

## 13. Real kiosk results

| Probe | Result |
| --- | --- |
| Live Sarvam REST `en-IN hi-IN kn-IN ta-IN te-IN ml-IN` | **executed** — all six returned RIFF WAV (67–92 KB greeting samples) |
| Live WS `ws://127.0.0.1:6969/ws/clara` English ANSWER | **executed** — final `assistant_audio_update`, `audioUnavailable=false`, 1,049,918-byte RIFF |
| Live WS English CARD (`Who is the HOD of CSE Data Science?`) | **executed against the already-running :6969 process** — `showCard=department_overview`, no audio bytes on that process |
| Live WS mixed Kannada (`teachers hegiddare?`) | **executed** — RIFF payload received |
| Browser speaker capture of all six languages | **not claimed** — Playwright uses mocked `HTMLMediaElement.play`; this machine did not record kiosk speakers |

The running `:6969` process was not restarted during this phase, so live WS reflects that process, not necessarily the just-built tree until that backend is redeployed. Provider REST used the current `sarvam_tts_to_base64` client.

## 14. Known limitations

- Streaming TTS is still present behind `KIOSK_COMPLETE_RESPONSE_TTS=false`. Default kiosk path is complete-response.
- ACK may be stopped when response playback starts (no dual-speaker overlap).
- `ttsStreamQueueRef` is now a **mirror** of the scheduler for M5.2 seek/debug; only the scheduler advances response sequence.
- First-sentence pipelined TTS remains available when `LOW_LATENCY_VOICE_MODE=false`.
- Live audible verification of all six languages on kiosk speakers was not performed in this session.

## Files (primary)

- `frontend/src/lib/tts/ackAudio.ts`
- `frontend/src/lib/tts/responseTtsScheduler.ts`
- `frontend/src/lib/tts/audioValidation.ts`
- `frontend/src/lib/chat/answerVisibility.ts`
- `frontend/src/screens/ChatScreen.tsx`
- `frontend/src/hooks/useWebSocket.ts`
- `backend/app/main.py`
- `backend/config/settings.py`
- `docs/M5_7_TTS_IMPLEMENTATION_REPORT.md`
