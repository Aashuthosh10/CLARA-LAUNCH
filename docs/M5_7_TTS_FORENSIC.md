# M5.7 — Global TTS forensic audit

**Date:** 2026-08-19  
**HEAD:** `d9df0d5` (M5.6 runtime: card-lock crash fix + ANSWER text without waiting for TTS)  
**Scope:** audit only. No production code, prompts, models, RAG, UnitSelector, semantic routing, turn-fence invariant, retries, fallbacks, architecture, commit, or push.  
**Question answered:** why CLARA shows ANSWER text and cards after M5.6, but produces no audible speech on either path.

**Evidence classes**

| Class | What was run | Status |
|-------|----------------|--------|
| Live Sarvam HTTP | `POST https://api.sarvam.ai/text-to-speech` for `en-IN` `hi-IN` `kn-IN` `ta-IN` `te-IN` `ml-IN` | executed |
| Live WebSocket | `ws://127.0.0.1:6969/ws/clara` English ANSWER, English CARD, Kannada ANSWER, Kannada CARD | executed |
| Current source | TTS client, `main.py` chunk loop, `useWebSocket` merge, `ChatScreen` drain / `handleAudioPlayback` | executed |
| Git | last-known-good `5c6cf1e`, chunking `0d2e9e1`, playhead skip `958e22d`, M5.6 `d9df0d5` | executed |
| Browser `audio.play()` of answer/card clips | Playwright/kiosk speaker capture | **not live-captured** — first failure is *before* that call |

Six languages are first-class. The proven playback bug is language-agnostic. Provider language coverage was live-tested for all six codes.

---

## 1. Executive summary

Sarvam is not the first broken boundary.

Live provider calls return HTTP 200, JSON `audios[]`, and RIFF/WAVE bytes for every CLARA language code. Live WebSocket turns for English and Kannada deliver those same valid WAV bytes on `assistant_audio_update.audioBase64`. Visible ANSWER text and CARD `showCard` / `narration_plan` are present. `audioUnavailable` is false.

The first broken boundary is **frontend stream-playhead ownership**.

Both PATH A (normal ANSWER) and PATH B (unit-backed card) defer playback to `ttsStreamQueueRef` + `ttsPlayheadRef` (`ChatScreen.tsx` drain effect ~3032). The ack earcon (`ENABLE_ACK_EARCON`, default true) is played through the **same** `handleAudioPlayback` function, whose `onended` / `play().catch` handlers **unconditionally increment** `ttsPlayheadRef` even when the stream queue is empty (~1834–1836, ~1873–1875).

Deterministic turn sequence:

1. `interceptAndSendMessage` resets `ttsPlayheadRef = 0` and empties the stream queue (~972–974).
2. Backend sends `assistant_ack_audio` (6888-char WAV, 160 ms) with the **same** `turn_id` as the reply.
3. ChatScreen treats ack as ordinary `pendingAudio` (type is not `assistant_audio_update`, so `shouldDeferAssistantTtsToStream` is false) and calls `handleAudioPlayback`.
4. Ack `onended` runs: queue still empty, `ttsPlayheadRef` becomes **1**.
5. Streamed reply clip(s) are pushed at index **0**. Drain reads `queue[playhead]` → index **1** → `undefined` → return. `audio.play()` is never called for the answer/card clip.

Cached CARD makes it worse: English HOD clip arrived **3 ms** after ack (seq 9 at +67 ms vs ack seq 7 at +64 ms). Drain then hits `isPlayingBackendAudio && !streamTurnReset` (~3226 / ~3295) and skips start; ack `onended` can mark the waiting clip `COMPLETED` without playing it.

M5.6 (`d9df0d5`) is **not** the TTS root cause. It made ANSWER text and cards visible without waiting for audio, so the pre-existing silent stream queue is now obvious.

**COMMON FAILURE:** `ChatScreen.handleAudioPlayback` `audio.onended` advances `ttsPlayheadRef` for the ack earcon, so streamed ANSWER/card clips are never selected.

**ROOT CAUSE:** ack earcon and streamed TTS share one playhead; the playhead is incremented even when no stream clip is current.

**LAST KNOWN-GOOD DIFFERENCE:** `5c6cf1e` (2026-03-24) played reply TTS on the same pending-audio path as ack, distinguished only by `segmentKey` (`turn_id` + `type`). Chunking (`0d2e9e1`, 2026-05-03) moved reply audio onto `tts_audio_queue` / clip slots. `958e22d` (2026-08-19) added the `isPlayingBackendAudio` drain skip. Ack still uses the old pending-audio path and now corrupts the new playhead.

---

## 2. Current TTS architecture

Two wire paths, one frontend player.

### PATH A — normal ANSWER

```
user text
→ ConversationOrchestrator / resolve_response_decision = ANSWER
→ RAG_MODEL (openai/gpt-oss-20b) reply_text
→ visible_payload (audioPending=true, no audioBase64, no type=assistant_audio_update)
→ LOW_LATENCY chunk loop: split_tts_chunks → tts_to_base64_cached → sarvam_tts_to_base64
→ assistant_audio_update { tts_streaming:true, tts_chunk_index, audioBase64 }  (no tts_audio_queue on wire)
→ always full-reply backup TTS (even after successful chunks)
→ assistant_audio_update { tts_streaming:false, audioBase64=backup }
→ useWebSocket mergeTtsAudioQueue from audioBase64 while tts_streaming
→ ChatScreen drain tts_audio_queue → handleAudioPlayback → new Audio(data:audio/wav;base64) → audio.play()
```

### PATH B — unit-backed CARD

```
user text
→ ResponseMode CARD → SemanticRequest → UnitSelector unitId
→ narration_plan on later audio frames (not on the first visible_payload)
→ visible_payload hides showCard while audioPending (`defer_card_until_tts_ready`)
→ per-unit spoken_summaries as chunks, timeout ≥12s
→ assistant_audio_update chunk with narration_plan + audioBase64 (no tts_clip_slots on wire)
→ TTS_FULL_BACKUP_SKIPPED for unit-backed
→ final assistant_audio_update { tts_streaming:false, audioBase64 omitted }
→ useWebSocket mergeTtsClipSlot → tts_clip_slots
→ ChatScreen drain clip slots → same handleAudioPlayback
```

Ack (both paths, before visible answer):

```
ENABLE_ACK_EARCON
→ assistant_ack_audio { audioBase64: 160ms WAV, isProcessing:true, same turn_id }
→ ChatScreen pendingAudio (not the stream queue)
→ handleAudioPlayback  ← mutates ttsPlayheadRef
```

Language codes (`TARGET_LANGUAGE_CODES`): `en→en-IN`, `hi→hi-IN`, `kn→kn-IN`, `ta→ta-IN`, `te→te-IN`, `ml→ml-IN`. ANSWER TTS language: `resolve_answer_language`. CARD TTS language: session language. Unit-backed disables English TTS fallback (`allow_english_fallback=not used_bundle_plan`).

---

## 3. Normal ANSWER trace

**Input:** `"How good are the teachers here?"`  
**Session:** English, guest name Naveen, live `ws://127.0.0.1:6969/ws/clara`  
**Exception:** none. **audioUnavailable:** never true.

| Step | File / function / line | Input | Output / evidence | Result |
|------|------------------------|--------|-------------------|--------|
| USER INPUT | WS `user_message` | English string | accepted | success |
| isProcessing | `main.py` ~1250 | turn_id | seq=5 empty processing frame | success |
| ack | `main.py` 1263–1278 | 160 ms WAV | seq=7 `assistant_ack_audio` b64=6888 RIFF | success |
| visible ANSWER | `main.py` 2081–2112 | reply_text | seq, `utterance_kind=assistant_visible_answer`, `audioPending=true`, **no** `audioBase64`, **no** `type=assistant_audio_update` | text on wire |
| TTS invoke | `main.py` 2278–2342 `tts_to_base64_cached` | chunk 0, `en-IN`, timeout 6s | live chunk arrived | success |
| Sarvam | `provider_clients.py` 127–157 | `target_language_code=en-IN`, `bulbul:v3`, speaker `simran` | HTTP 200, `audios[]` RIFF | **PROVIDER SUCCESS** |
| audio bytes | live WS | chunk_0 | b64=563712 decoded=422784 magic=`RIFF…WAVE` | valid WAV |
| backend payload | `_merge_assistant_audio_payload` 2211 | audio_b64 | `tts_streaming=true` `tts_chunk_index=0` **`tts_audio_queue` absent** | success |
| WS send | `_ws_send_json` 2851 | large JSON | client received seq=11 (Kannada analog seq=11) | success |
| WS receive | probe / `useWebSocket.ts` 348 | frame | audio present | success |
| queue insertion | `useWebSocket.ts` 419–428 | `tts_streaming` + `audioBase64` | **must** synthesize `tts_audio_queue`; not on wire | merge required |
| turn validation | `turnFence.ts` 23–37 | PENDING then adopt turn_id | M5.6 adopts current turn; not the first drop | not first failure |
| drain select | `ChatScreen.tsx` 3307–3332 | `ttsStreamQueueRef[ttsPlayheadRef]` | playhead already 1 after ack `onended` | **FAIL — clip at [0] never selected** |
| AudioManager / `audio.play()` | `handleAudioPlayback` 1659 / 1848 | answer WAV | **not called for the answer clip** | never reached |
| audible output | speaker | — | not produced for the answer | fail |

Kannada ANSWER live (`ಇಲ್ಲಿನ ಶಿಕ್ಷಕರು ಎಷ್ಟು ಒಳ್ಳೆಯವರು?`): chunk_0 b64=658544 RIFF at +9023 ms; chunk_1 b64=382388 RIFF at +12197 ms; backup b64=992920 RIFF at +20052 ms; `audioUnavailable=false`. Same playhead defect. Variant: with playhead=1, drain *could* start at chunk_1 (skipping chunk_0) if a second clip exists; a single-chunk English turn is complete silence.

---

## 4. Card narration trace

**Input:** `"Who is the HOD of CSE Data Science?"`  
**Live English (cached TTS) and Kannada native script.**

| Step | File / function / line | Input | Output / evidence | Result |
|------|------------------------|--------|-------------------|--------|
| USER INPUT | WS | HOD query | accepted | success |
| CARD decision | orchestrator / `resolve_response_decision` | text | `showCard` appears on **audio** frames, not on visible_payload (`defer_card_until_tts_ready` 2080–2093) | success |
| unitId | UnitSelector | CSE DS HOD | `narration_plan` on chunk/final (`has_narration_plan=true`) | success |
| visible | `main.py` 2112 | messages | `audioPending=true`, `showCard=null` | text/plan deferred |
| TTS | chunk 0 of spoken summary | `en-IN` / `kn-IN` | EN b64=470968 RIFF; KN b64=581360 RIFF | **PROVIDER SUCCESS** |
| WS chunk | seq=9 | `tts_streaming=true` `showCard=department_overview` | **`tts_clip_slots` absent on wire** | payload ok |
| WS final | seq=10, **+5 ms** (EN cache) / **+2 ms** (KN) | `tts_streaming=false` **`audioBase64` omitted** | by design (`final_wire_audio=None if had_streaming_interim` 2543) | empty audio |
| clip merge | `useWebSocket.ts` 406–418 | chunk + plan unitId | slots exist only if chunk is applied before/with merge | fragile |
| drain | `ChatScreen.tsx` 3133–3238 | slots or queue | EN: ack +64 ms, chunk +67 ms → `isPlayingBackendAudio` skip ~3226 | **FAIL start** |
| playhead | `handleAudioPlayback` 1834–1836 | ack `onended` | playhead 1, or waiting slot marked COMPLETED | **FAIL select** |
| `audio.play()` of HOD clip | 1848 | HOD WAV | not reached / skipped | fail |
| audible | speaker | — | none | fail |

Cards display because final frame still carries `showCard=department_overview` and `narration_plan`. Audio is not required for the card surface. That is why M5.6 can show cards while speech is silent.

---

## 5. Sarvam provider trace

**Do not assume Sarvam is broken. It is not, on this machine, with current `.env`.**

| Field | Value |
|-------|--------|
| Provider called | yes |
| Endpoint | `https://api.sarvam.ai/text-to-speech` (then `/speech/text-to-speech`; SDK fallback unused when REST succeeds) |
| Model | `bulbul:v3` |
| Speaker | `simran` (`SARVAM_TTS_SPEAKER`) |
| Pace | `1.05` |
| Language field | production sends `target_language_code`; live REST also accepts `language_code` (both HTTP 200) |
| HTTP status | 200 for all six `*-IN` codes |
| Body | `{ request_id, audios: [base64 WAV] }` |
| Decoded magic | `RIFF….WAVE` every language |
| MIME | `application/json` wrapping base64 WAV (not a raw audio response) |
| Exception / timeout | none on direct probe (~0.9–1.6 s) |
| Retry | `HTTP_RETRY_ATTEMPTS=1`; chunk loop up to 3 attempts (`main.py` 2331) — not exercised (first attempt succeeded) |
| Cache | English CARD second run: chunk at +67 ms (cache hit). Kannada CARD: +5464 ms (miss/synthesis) |

Direct probe (English phrase “Teachers here are supportive.”):

| Code | HTTP | ms | decoded bytes | RIFF |
|------|------|----|---------------|------|
| en-IN | 200 | 1155 | 76096 | yes |
| hi-IN | 200 | 1107 | 74414 | yes |
| kn-IN | 200 | 1572 | 117456 | yes |
| ta-IN | 200 | 911 | 59526 | yes |
| te-IN | 200 | 1190 | 70354 | yes |
| ml-IN | 200 | 1095 | 74176 | yes |

`target_language_code` vs `language_code`: both 200 + valid WAV. Field-name mismatch with newer public docs is **not** the live failure.

**PROVIDER = SUCCESS.** Continue downstream.

---

## 6. Audio-byte validation

| Check | Sarvam REST | Backend WS chunk | Frontend (intended) |
|-------|-------------|------------------|---------------------|
| Non-zero length | yes (59–117 KB decoded in REST; 353–493 KB on live turns) | yes | same bytes if frame applied |
| Encoding | PCM WAV | base64 of WAV | `data:audio/wav;base64,…` (`ChatScreen.tsx` 1659) |
| MIME | JSON + base64 | JSON | hardcoded `audio/wav` — matches RIFF |
| base64 validity | decodes | decodes | `atob` in `estimateWavDurationSeconds` 415 |
| Corruption Sarvam→backend→WS | not observed | magic still `52494646…57415645` (`RIFF`/`WAVE`) | N/A if play never called |

Kannada native-script CARD/ANSWER chunks were valid WAV, not empty, not MP3/ID3.

Corruption is **not** the first failure. The bytes exist on the wire and are valid.

---

## 7. WebSocket trace

Do not confuse TEXT frames with AUDIO frames.

| Frame | TEXT | AUDIO | Notes |
|-------|------|-------|--------|
| processing / `assistant_partial` | no | no | `Got it.` |
| `assistant_ack_audio` | no | yes (160 ms earcon) | same `turn_id` as the reply |
| `assistant_visible_answer` | yes (`messages`, `audioPending`) | **no** | not `type=assistant_audio_update` |
| `assistant_audio_update` streaming | yes (messages copied) | **yes** `audioBase64` | `tts_streaming=true` |
| `assistant_audio_update` final CARD | yes + `showCard` | **no** `audioBase64` | 2–5 ms after chunk |
| `assistant_audio_update` final ANSWER | yes | yes (full backup) | ~20 s later |

**Sent?** Yes. **Received?** Yes on an isolated probe socket (monotonic `wire_seq`). **Merged?** Only inside `useWebSocket.ts` 390–444. Backend never sends `tts_audio_queue` or `tts_clip_slots`.

**Overwritten?** CARD final has empty `audioBase64`. Merge must keep prior slots/queue. If the empty final is applied without a prior merged queue (`tts_streaming===false` branch 429–443) and the chunk was dropped, the React payload has no playable audio while cards still render.

**Ignored / stale `turn_id`?** M5.6 fence adopts the current turn while PENDING. Not the first drop for these live frames (all frames shared one `turn_id`).

**`wire_seq` drop (contributing, not first on idle probe):** `useWebSocket.ts` 367–370 drops `wseq <= lastAppliedWireSeq`. `_ws_send_json` may send without the lock after 250 ms (`main.py` 2848–2880). A small empty final can overtake a large chunk; the chunk is then dropped. `debug-ba7e8c.log` records repeated `ws_send_lock_contention`. Isolated probe did **not** invert seq (9 then 10). Kiosk with a busy socket can. Language-agnostic.

---

## 8. Queue trace

### PATH A — `tts_audio_queue`

| Event | What happens |
|-------|----------------|
| Insert | Client-side only: each `tts_streaming=true` frame with `audioBase64` is `push`ed (`useWebSocket.ts` 424–428). |
| Drain insert | `ChatScreen.tsx` 3246–3292 copies new indices into `ttsStreamQueueRef` as `PLAYABLE`. |
| Pending | 300 ms buffer if fewer than 2 clips and still streaming (~3299–3325). Timer **closes over** `isPlayingBackendAudio`; if true, callback returns without play. |
| Playable | Drain calls `handleAudioPlayback(queue[playhead])`. |
| Permanent pending | If playhead > last index, `if (!next) return` forever. No watchdog advances playhead for skipped [0]. |
| Empty strings | skipped (`if (!b64.length) continue` 3250). |
| Failed chunks | Backend ANSWER `continue`s without sending (`main.py` 2373–2374). Indices can hole. |
| Successful skip | **yes:** playhead 1 skips clip 0. |

### PATH B — `tts_clip_slots`

| Event | What happens |
|-------|----------------|
| Slot create | Client `mergeTtsClipSlot` when `isUnitBackedNarrationPlan` and `tts_streaming` + `tts_chunk_index`. |
| Ordering | Sparse list; holes `PENDING`. |
| Failed slot | `audioUnavailable` → FAILED; drain `completeFailedClip` fake-ends the scene (~1936). |
| Completed | `onended` marks COMPLETED. |
| Missing | Final frame with no slots + empty `audioBase64` → drain sees no array → no play. |
| Advancement | same playhead as PATH A. |

**Silent drop of valid audio:** yes. Valid WAV on `audioBase64` is never inserted into the local play list if merge is skipped, and is never played if playhead does not point at it.

---

## 9. Turn-fence trace

M5.6 changed PENDING behavior (`frontend/src/lib/ws/turnFence.ts`).

| Mechanism | Current behavior | Drops current-turn audio? |
|-----------|------------------|---------------------------|
| `TURN_FENCE_PENDING` | Reject previous `turn_id`; adopt new `turn_id` (`adoptTurnOwner` 40–53) | no (that was the M5.6 fix) |
| `isProcessing` assign | `resetTurnPresentationState` then owner = `turn_id` (`ChatScreen.tsx` 2000–2006) | resets queue/playhead **before** ack; then ack breaks playhead again |
| `playbackGenRef` | incremented on intercept and on stream turn change | `onended`/`play().catch` no-op if gen changed **without** unlocking if catch returns early (~1849) — contributing |
| `assistantAudioTurnOwnerRef` | current turn after adopt | live frames matched |
| Card UI lock | `engageCardUiLockState` (M5.6) | does not cancel audio by itself |

Required invariant (unchanged, not to be removed): current-turn audio must play; stale-turn audio must be rejected. The playhead bug violates the first clause **without** violating the second.

Fence is **not** the first broken TTS boundary after M5.6.

---

## 10. AudioManager trace

| Question | Evidence |
|----------|----------|
| Who owns play? | `ChatScreen.handleAudioPlayback` constructs `HTMLAudioElement` (1659) and calls `audio.play()` (1848). `PresentationAudioManager` binds listeners / tokens; `playBase64` is **not** the ANSWER path. |
| Bind | `bindPlaybackAudio` 1781; returns `null` if no presentation scene (ANSWER) — does not block `play()`. |
| `invalidate()` | on new non-follow-up clip (1648) and turn reset (984, 3050). Detaches listeners; does not null `currentAudio` inside the manager. |
| `readyState` / `duration` / `paused` | not captured live for answer clips because `play()` is not reached for those clips. |
| Cancellation | intercept pause + null `currentAudioRef` (989–992). Does **not** clear `isPlayingBackendAudio` in `resetTurnPresentationState` (contributing). |
| `onended` | shared with stream playhead (1826–1846). |
| `onerror` | manager emits `error`; ChatScreen play rejection logs `[CLARA_TTS] audio.play() failed` (M5.6). |

Ack **does** reach `new Audio` + `audio.play()`. Answer/card clips often never do.

---

## 11. Browser playback trace

Classification for **answer/card** speech (not the 160 ms earcon):

**A. `play()` never called** — **proven for the reply clip** by source + live turn timing (ack always precedes clips; `onended` always increments playhead).

**B. `play()` rejected** — not needed to explain global silence; would be a second defect if A were fixed. Autoplay `NotAllowedError` is possible without a gesture; ChatScreen primes a muted WAV on first pointer/keydown (1070–1095). Not live-measured on the kiosk speaker.

**C. `play()` resolves but no audible sound** — not reached for reply clips. Do not call this a browser/output issue.

Earcon: 160 ms at 880 Hz, amplitude 0.18 (`main.py` 536–548). Easy to miss; it is not the HOD/answer narration.

---

## 12. Six-language matrix

TTS language resolution is per path. The playhead failure does not depend on script.

| Language | Input (this audit) | Resolved TTS code | Provider | Audio bytes | WS | Frontend playhead | Playback |
|----------|--------------------|-------------------|----------|-------------|----|-------------------|----------|
| English ANSWER | How good are the teachers here? | en-IN | 200 WAV | chunk 563712 | received | skip [0] | **silent (predicted)** |
| English CARD | Who is the HOD of CSE Data Science? | en-IN | 200 WAV | chunk 470968 | received + empty final | skip / complete-without-play | **silent (predicted)** |
| Kannada ANSWER | ಇಲ್ಲಿನ ಶಿಕ್ಷಕರು ಎಷ್ಟು ಒಳ್ಳೆಯವರು? | kn-IN | 200 WAV | 2 chunks + backup | received | skip [0]; [1] maybe | **first chunk silent** |
| Kannada CARD | CSE Data Science HOD ಯಾರು? | kn-IN | 200 WAV | 581360 + empty final | received | same as EN CARD | **silent (predicted)** |
| Hindi | REST probe + routing identical | hi-IN | 200 WAV | REST 74414 | not WS-probed this phase | same playhead | **same defect** |
| Tamil | REST probe | ta-IN | 200 WAV | REST 59526 | not WS-probed | same | **same defect** |
| Telugu | REST probe | te-IN | 200 WAV | REST 70354 | not WS-probed | same | **same defect** |
| Malayalam | REST probe | ml-IN | 200 WAV | REST 74176 | not WS-probed | same | **same defect** |

Native-script Kannada CARD spokenText on the wire was Kannada (`ಡಾ. ನಾಗಶ್ರೀ…`) with a valid WAV — routing **and** TTS synthesis work.

Romanized / code-switch: not a separate provider failure. `resolve_answer_language` / session language still emit `*-IN`. Same queue/playhead.

---

## 13. Mixed-language matrix

| Category | Example | TTS code (source) | Provider | Queue/playhead |
|----------|---------|-------------------|----------|----------------|
| English | How good are the teachers here? | en-IN | live OK | broken |
| Kannada native | ಇಲ್ಲಿನ ಶಿಕ್ಷಕರು ಎಷ್ಟು ಒಳ್ಳೆಯವರು? | kn-IN | live WS OK | broken |
| Kannada romanized | illina teachers eshtu olleyavaru? | kn-IN if session kn | same client | broken (not WS-probed) |
| Hindi native | यहाँ के शिक्षक कितने अच्छे हैं? | hi-IN | REST OK | broken |
| Hindi romanized mix | teachers yahan kitne acche hain? | hi-IN / en-IN per resolver | REST OK for both codes | broken |
| Tamil / Telugu / Malayalam native | equivalents | ta-IN / te-IN / ml-IN | REST OK | broken |
| EN+regional code-switch | AIML HOD yaaru (session kn) | kn-IN card path | KN CARD live OK | broken |

Do not treat mixed input as a second TTS provider bug. The shared playhead fails after successful synthesis.

---

## 14. Failure-recovery matrix

| Case | Recovers? | Text remains? | Queue unblocks? | Next turn works? |
|------|-----------|---------------|-----------------|------------------|
| A Sarvam timeout | ANSWER: skip chunk, then 20s backup (`FULL_TTS_FALLBACK_TIMEOUT`). CARD: send `audioUnavailable` slot, no backup | yes (M5.6) | playhead still ack-broken | next turn repeats ack bug |
| B Sarvam HTTP failure | same as empty audio | yes | no | no (same playhead) |
| C empty audio | CARD still sends frame; ANSWER skips chunk | yes | no playable clip | no |
| D invalid base64 | `estimateWavDurationSeconds` catch; `new Audio` would error if play reached | yes | play().catch advances playhead | next turn still ack-broken |
| E WS audio loss / `wire_seq` drop | CARD empty final can win | yes / cards yes | no clip | no |
| F queue insertion failure | drain no-ops | yes | stuck | no |
| G turn rejection | M5.6 adopts current turn | yes | N/A | stale still rejected |
| H AudioManager | bind null on ANSWER is OK | yes | N/A | N/A |
| I `audio.play` reject | logs; marks FAILED; increments playhead | yes | may skip remaining | next turn ack-broken |
| J `onended` not firing | `isPlayingBackendAudio` stays true; drain skip ~3295 | yes | **deadlock until next intercept** | intercept resets queue, then ack breaks again |
| K new user turn during playback | intercept reset + backend `session_generation` cancel | previous text kept in messages | reset | new turn still silent |

**TEXT ALWAYS SURVIVES AUDIO FAILURE** after M5.6. **VALID AUDIO IS SILENTLY SKIPPED** (playhead / drain). That is the opposite of “never skip speech.”

---

## 15. Last known-good comparison

Last known-good **playback coupling** for ack vs reply: commit **`5c6cf1e`** (2026-03-24) “Fix TTS playback after greeting”.

That fix: `segmentKey` includes `payload.type` so `assistant_ack_audio` does not collide with final TTS; both still used one `playAudioBase64` pending path (no `ttsPlayheadRef`).

| Component | Last known good (`5c6cf1e` / pre-chunk) | Current (`d9df0d5`) | Change |
|-----------|------------------------------------------|---------------------|--------|
| Provider call | Sarvam REST `target_language_code` | same | not the regression |
| Audio generation | one full reply TTS | chunked LOW_LATENCY + ANSWER always-on 20s backup | `0d2e9e1` / `84beff0` |
| Payload | `audioBase64` on the reply frame | streaming frames + CARD final **without** audio | `final_wire_audio` 2543 |
| Queue | none (single pending clip) | client-merged `tts_audio_queue` / `tts_clip_slots` | `0d2e9e1` |
| Turn ownership | later fence / M5.6 adopt | PENDING adopt | M5.6 **helps** audio, does not cause silence |
| Playback | `playAudioBase64` keyed by type | `ttsPlayheadRef` + `handleAudioPlayback` shared with ack | **regression surface** |
| Failure handling | segment-key dedupe | `isPlayingBackendAudio` skip (`958e22d`); play() log / 20s audioPending watchdog (M5.6) | skip can drop clips |

Earliest change that can explain **global** reply silence: **TTS chunking + shared playhead** (`0d2e9e1`, 2026-05-03), worsened by **`isPlayingBackendAudio && !streamTurnReset`** (`958e22d`, 2026-08-19). **Not** `d9df0d5`.

---

## 16. First broken boundary

**File:** `frontend/src/screens/ChatScreen.tsx`  
**Function:** `handleAudioPlayback`  
**Lines:** `audio.onended` **1834–1836** (and `play().catch` **1873–1875**)  
**Also required:** ack routed through this function via `pendingAudio` (~2889–2897) because `shouldDeferAssistantTtsToStream` is false for `type !== 'assistant_audio_update'` (~250–257).

**Input:** ack earcon `audioBase64` (b64_len=6888), `turn_id` = current user turn.  
**State:** `ttsStreamQueueRef = []`, `ttsPlayheadRef = 0` (just reset).  
**Output:** `ttsPlayheadRef = 1`.  
**Success/failure:** earcon may play; **reply/card clip selection fails.**

This is the **first** identical failure on both PATH A and PATH B after successful TTS and successful WS delivery.

---

## 17. Common failure

| Stage | Normal ANSWER | Card | Common? |
|-------|---------------|------|---------|
| TTS invoked | yes | yes | yes |
| Sarvam request | yes | yes | yes |
| Sarvam response 200 WAV | yes | yes | yes |
| audio bytes non-zero RIFF | yes | yes | yes |
| backend payload `audioBase64` | yes (chunks + backup) | yes (chunk only) | yes on chunk |
| WebSocket sent/received | yes | yes | yes |
| queue/slot insertion | client merge | client merge | same merge layer |
| turn validation | adopt current | adopt current | not first fail |
| drain `queue[playhead]` | playhead 1, clip at 0 | playhead 1 or COMPLETED without play | **yes — FAIL** |
| AudioManager | not reached for clip | not reached / skipped | yes |
| Audio object for clip | not created | not created | yes |
| `audio.play()` of clip | not called | not called | **yes — FAIL** |
| play resolved | n/a | n/a | n/a |
| audible output | no | no | **yes — FAIL** |

**FIRST identical failure boundary:** stream playhead after ack `onended`, i.e. drain never passes the reply/card WAV into `handleAudioPlayback`.

---

## 18. Root cause

The ack earcon and low-latency streamed TTS share `handleAudioPlayback`’s `ttsPlayheadRef`. `onended` increments that playhead even when no stream clip is current. Streamed clips are appended at index 0 and never selected. Cached CARD also races the still-playing earcon (`isPlayingBackendAudio` skip at 3226/3295), so ack `onended` can mark the real clip `COMPLETED` without `audio.play()`.

This is independent of language, RAG, models, prompts, UnitSelector, and the M5.6 fence/text fixes.

---

## 19. Contributing causes

1. **`isPlayingBackendAudio && !streamTurnReset` skip** (`ChatScreen.tsx` 3226, 3295, introduced `958e22d`) — drops drain start while earcon plays (CARD cache: 3 ms gap).
2. **Ack `onended` marks `queue[playhead]` COMPLETED** even if that slot is a later-inserted real clip.
3. **`resetTurnPresentationState` does not `setIsPlayingBackendAudio(false)`** (~969–1013) — leftover speaking flag from greeting/name TTS.
4. **300 ms buffer timer closes over `isPlayingBackendAudio`** (~3305–3308) — stale true aborts delayed start.
5. **Backend does not send `tts_audio_queue` / `tts_clip_slots`** — empty CARD final relies on client merge order.
6. **`_ws_send_json` 250 ms lock bail-out** + frontend `wire_seq` drop — empty final can obsolete the only audio chunk on a contended kiosk socket.
7. **ANSWER always runs 20 s full backup TTS** after chunks (`main.py` 2435–2446) — extra latency/load, not the silence itself; `needs_full_backup` is logged then ignored.
8. **`play().catch` returns without unlocking if `playbackGen` changed** (~1849) — can stick the lock.
9. **Drain `layoutMode !== targetLayout`** (~3142, ~3243) — first CARD render FULL_TEXT vs SPLIT_CARDS can skip one effect pass (usually recovered on the next render unless playhead already wrong).
10. **M5.6 text/card visibility** — not a cause; it unmasked the silence.

---

## 20. False leads eliminated

| Hypothesis | Verdict |
|------------|---------|
| Sarvam down / wrong `language_code` field | **false** — live 200 + RIFF for six codes; both field names work |
| Invalid / non-WAV bytes | **false** — `RIFF…WAVE` on REST and WS |
| `RAG_MODEL` / prompts / semantic routing | **false** — text and cards generate; out of TTS path |
| M5.6 turn fence still dropping current-turn audio | **false** — live frames share `turn_id`; adopt is designed to play them |
| M5.6 card-lock recursion black screen | **fixed** in `d9df0d5`; not this symptom |
| Frontend `data:audio/wav` vs MP3 | **false** — payload is WAV |
| English-only TTS | **false** — Kannada native WAV on the wire |
| “Browser issue” without evidence | **rejected** — `play()` of the reply clip is not reached |
| Missing `SARVAM_API_KEY` in the running server | **false** — live WS audio sizes match synthesis |
| `audioUnavailable` terminal frames | **false** — live `audioUnavailable=false` |

---

## 21. Recommended fix options

Do **not** implement in this phase. Options for a later implementation commit:

**Option A (smallest, preferred for “never skip speech”):** Ack/greeting/`pendingAudio` must not increment `ttsPlayheadRef` or complete stream slots. Only clips that were actually started from `ttsStreamQueueRef` may advance the playhead. If `queue[playhead]` is missing, do not increment.

**Option B:** Drain always starts the first `PLAYABLE` clip at or after playhead 0 (scan), never `queue[playhead]` when that slot is empty/undefined.

**Option C:** Play ack on a separate `HTMLAudioElement` path that cannot touch stream state (`audioLockRef` / `isPlayingBackendAudio` should not block the first stream clip, or ack must yield immediately when a stream clip is ready).

**Option D (backend, complementary):** Put `tts_audio_queue` / `tts_clip_slots` on the wire; do not emit a CARD final with omitted `audioBase64` until the chunk is known applied; hold the WS send lock for the duration of audio frames (do not time out at 250 ms and invert `wire_seq`).

**Option E:** Stop synthesizing the ANSWER 20 s backup when chunks already cover the text (latency policy only; does not fix silence).

Keep: stale-turn fence, text visible without audio, no silent hide of messages.

---

## 22. Recommended architecture

```
TEXT PATH (already M5.6)
  reply/card payload → always paint text/cards
  audioPending never hides messages

ACK PATH (isolated)
  earcon Audio → onended does NOT touch ttsPlayheadRef / stream slots

STREAM PATH (PATH A + PATH B)
  every successful TTS chunk → wire audioBase64 AND explicit queue/slot
  frontend: insert PLAYABLE → play in order → mark played or FAILED
  empty/missing clip → FAILED + continue, never skip without a status
  current turn_id only; stale turn_id rejected (existing fence)

TIMEOUTS (policy later)
  reliability > extra 20s backup
  no unlimited wait; no permanent pending; no hide text
```

Invariant to restore: **every successful TTS response is either played or explicitly FAILED. No silent drop. No playhead hole.**

---

## 23. Files that must change later

- `frontend/src/screens/ChatScreen.tsx` — `handleAudioPlayback` onended/catch playhead; drain skip; ack vs stream isolation; optional `isPlayingBackendAudio` reset on turn reset
- `frontend/src/hooks/useWebSocket.ts` — optional: do not let empty final wipe unplayed audio; `wire_seq` vs audio frames
- `backend/app/main.py` — optional: emit queue/slots; CARD final audio; send-lock vs large audio; stop unconditional ANSWER backup
- Tests: ChatScreen playhead + ack; six-language WS fixtures; CARD empty-final merge; e2e that **asserts `audio.play` with reply segmentKey**, not only text visibility

---

## 24. Files that must NOT change

- `backend/services/conversation/response_decision.py` / policy / RAG / prompts / models
- `backend/services/content/unit_selector.py` and semantic routing
- `frontend/src/lib/ws/turnFence.ts` **invariant** (stale reject / current play) — may need tests, not a weaker fence
- Card identity / `narration_plan` unitId writers
- `.env` model IDs
- No new retries/fallbacks as a substitute for playing the clip that already exists

---

## 25. Test plan for implementation phase

1. Unit: ack `onended` with empty stream queue leaves `ttsPlayheadRef === 0`.
2. Unit: after ack, one ANSWER clip at `[0]` is selected and `handleAudioPlayback` receives it.
3. Unit: CARD cache (clip 3 ms after ack) still plays clip 0; never COMPLETED without play.
4. Unit: two ANSWER chunks play 0 then 1 in order.
5. Unit: empty CARD final does not delete a PLAYABLE slot.
6. Six-language matrix (native + romanized + mix): ANSWER + CARD each language — assert play invoked with non-empty WAV, not only DOM text.
7. `audio.play()` reject: text stays; next clip/turn still attempts speech.
8. New turn during playback: stale rejected; new turn plays.
9. Black-screen: card lock does not recurse; TTS failure does not unmount ChatScreen.
10. Live Sarvam smoke: one phrase per `*-IN` still RIFF (provider unchanged).
11. After implementation: commit, push `clara_finished`, report hash, STOP.

---

## Final root-cause table

| Path | First failure | Evidence | Severity |
|------|---------------|----------|----------|
| Normal ANSWER | `ttsPlayheadRef` advanced by ack `onended`; drain reads empty `[1]` | Live EN/KN WAV on WS; `ChatScreen.tsx` 1834–1836; drain 3330–3332 | **P0 speech** |
| Card narration | same playhead + `isPlayingBackendAudio` skip at cache (EN +3 ms) | Live EN seq 7→9 in 3 ms; KN chunk RIFF 581360; final `audioBase64` empty | **P0 speech** |
| Kannada | same (provider OK, native WAV on wire) | KN ANSWER/CARD live WS | **P0** |
| Hindi | same playhead (REST TTS OK) | REST hi-IN 200 RIFF; no WS this phase | **P0 (inferred)** |
| Tamil | same | REST ta-IN 200 RIFF | **P0 (inferred)** |
| Telugu | same | REST te-IN 200 RIFF | **P0 (inferred)** |
| Malayalam | same | REST ml-IN 200 RIFF | **P0 (inferred)** |

**COMMON FAILURE:**  
`ChatScreen.handleAudioPlayback` `audio.onended` (lines 1834–1836) increments `ttsPlayheadRef` for the ack earcon, so streamed ANSWER and card clips are never selected for `audio.play()`.

**ROOT CAUSE:**  
Ack earcon and low-latency stream TTS share one playhead; the playhead increments even when the stream queue is empty (or still holds an unplayed clip that drain skipped because `isPlayingBackendAudio` was true).

**LAST KNOWN-GOOD DIFFERENCE:**  
`5c6cf1e` played ack and reply on one pending-audio path keyed by `payload.type`. `0d2e9e1` moved reply audio onto `tts_audio_queue` / clip slots without isolating ack from `ttsPlayheadRef`. `958e22d` added the speaking-flag drain skip. `d9df0d5` (M5.6) did not introduce the silence; it made the missing speech visible next to working text and cards.

---

AUDIT ONLY. PROVE. STOP.  
No production code changes. No commit. No push.
