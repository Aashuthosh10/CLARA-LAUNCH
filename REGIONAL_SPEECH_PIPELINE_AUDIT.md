# CLARA Regional Speech Pipeline Audit — Phase T0

Date: 2026-08-25
Scope: English (`en`) plus Kannada (`kn`), Hindi (`hi`), Tamil (`ta`), Telugu (`te`), and Malayalam (`ml`)
Phase boundary: audit only; no production behavior changed

## Executive conclusion

CLARA can currently generate valid Sarvam WAV audio for all six configured locales, and one real application-generated CSE HOD narration per locale played to the Windows default output device. That proves the configured key, provider endpoint, locale values, WAV decoding, and host audio output worked during this audit. It does **not** prove natural pronunciation or production-kiosk reliability; no native-language reviewer evaluated the samples and the Docker application was unavailable because the Docker Desktop Linux engine was not running.

The audit found three direct, high-confidence causes of regional corruption or truncated/stuttering speech:

1. Regional failures can silently retry the same regional-script text as `en-IN`. This is a language switch, not a language-preserving fallback.
2. Long Sarvam responses containing multiple WAV items are concatenated without repairing RIFF/data lengths. The browser accepts the first header, can calculate only the first item’s duration, and can truncate or watchdog-stop the remainder.
3. Both TTS hard chunking and narration caption clipping slice Python strings by raw code-point count. All five Indic scripts can be split immediately before a virama/combining continuation, breaking a grapheme in the middle.

Additional high-risk findings are the absence of a runtime speakable-text sanitizer, one global speaker for every language, expected duplicate interim/final audio transport without a stable audio asset ID, a WebSocket send-lock timeout that permits unordered concurrent sends, and playback state split between the response scheduler, legacy queue refs, presentation manager, and an independent ACK player.

Phase T0 therefore does not support a claim of “perfect” or production-ready regional speech. Phase T1 should begin only after approval.

## 1. Complete speech pipeline

### 1.1 Normal answer turn

```text
user_message / backend microphone transcript
  → process_user_text_and_reply
  → answer source (deterministic template, FAQ, RAG/Groq, or ContentUnit)
  → reply_text and optional PresentationBundle/narration_plan
  → spoken_for_payload = tts_text or reply_text
  → normalize_tts_pronunciation (only CLARA → Clara)
  → plan_response_tts
      short answer: one clip
      long answer: split_tts_chunks
      card bundle: one clip per spoken summary
  → tts_to_base64_cached
      SHA-256 cache key includes locale, speaker, pace, model, normalized text
      per-key single-flight lock
      Sarvam bulbul:v3 request
      optional same-provider en-IN retry for regional failures
  → interim assistant_audio_update per clip in low-latency mode
  → final assistant_audio_update containing tts_audio_queue or tts_clip_slots
  → useWebSocket session_gen/wire_seq guards and interim/final merge
  → responseTtsScheduler ingest/dedupe by turn + numeric sequence
  → ChatScreen creates one HTMLAudioElement for the selected response clip
  → PresentationAudioManager binds card/presentation listeners to that element
  → ended/error/watchdog completes the scheduler clip
  → nextPlayable advances in numeric order
```

Primary code: `backend/app/main.py`, `backend/services/tts_orchestrator.py`, `backend/services/tts_chunking.py`, `backend/clients/provider_clients.py`, `frontend/src/hooks/useWebSocket.ts`, `frontend/src/lib/tts/responseTtsScheduler.ts`, and `frontend/src/screens/ChatScreen.tsx`.

### 1.2 Card narration turn

The canonical path is:

```text
ContentUnit
  → narrate_unit
  → NarrationSegment.tts_text
  → immutable PresentationBundle.spoken_summaries
  → one planned TTS clip per segment
  → tts_clip_slots indexed by segmentIndex/unitId
  → scheduler sequence
  → active card selected by unitId/sectionId
```

This path preserves deterministic unit and narration order. However, card summaries bypass `split_tts_chunks`; an oversized individual summary is sent as a single provider request. `_clip_caption` may already have raw-sliced its text at 240 or 280 code points.

### 1.3 Other audio paths

- ACK/earcon audio uses `createAckPlayer`, a separate HTML audio object.
- Campus-navigation and trustee narration use the backend TTS route but ultimately share `ChatScreen.currentAudioRef` with response audio.
- Language-gate and greeting audio enter the legacy `handleAudioPlayback` path.
- `PresentationAudioManager.playBase64` can create an audio element, but no production call site was found; current ChatScreen binds its already-created element instead.
- `CardStackComponent` contains another direct `new Audio(...)` path, but no import/use site was found, so it is currently dormant.

### 1.4 Cancellation and stale-turn controls

The backend cancels `active_reply_task`, increments `session_generation`, and checks the generation before later streaming/final sends. Every outbound WebSocket payload receives `session_gen` and monotonic `wire_seq`.

The frontend resets queues, increments `playbackGenRef`, pauses `currentAudioRef`, stops ACK audio, clears the scheduler, cancels presentation state, and applies turn fences on a new request. The orb interrupt pauses current response audio and clears legacy queues, while the next processing turn performs the full scheduler reset. Late payloads with an older generation or non-increasing `wire_seq` are dropped.

These controls are substantive, but are not complete proof of cancellation: a timed-out WebSocket send lock deliberately sends without the lock, and no live provider/browser/kiosk interruption trace was captured in T0.

## 2. Provider and voice matrix

Runtime configuration observed without exposing secrets:

- Sarvam key: present
- Groq key: present
- Model: `bulbul:v3`
- Speaker: `simran`
- Pace: `1.15`
- Provider HTTP retry setting: `1` retry after the first attempt
- Edge TTS dependency: declared, but no Edge implementation or call site exists

| Language | App code | Provider | Provider locale | Voice ID | Fallback provider | Fallback voice/locale |
| --- | --- | --- | --- | --- | --- | --- |
| English | `en` | Sarvam | `en-IN` | `simran` | none | none |
| Kannada | `kn` | Sarvam | `kn-IN` | `simran` | no true fallback | same Sarvam speaker with **`en-IN`** on eligible failures |
| Hindi | `hi` | Sarvam | `hi-IN` | `simran` | no true fallback | same Sarvam speaker with **`en-IN`** on eligible failures |
| Tamil | `ta` | Sarvam | `ta-IN` | `simran` | no true fallback | same Sarvam speaker with **`en-IN`** on eligible failures |
| Telugu | `te` | Sarvam | `te-IN` | `simran` | no true fallback | same Sarvam speaker with **`en-IN`** on eligible failures |
| Malayalam | `ml` | Sarvam | `ml-IN` | `simran` | no true fallback | same Sarvam speaker with **`en-IN`** on eligible failures |

The live API accepted `simran` for every locale during two separate six-language runs. That validates that the configured identifier is accepted by the current provider integration. It does not establish that one global speaker is the intended or best regional voice, because the repository contains no per-language speaker inventory, validation table, or voice-selection policy.

Unit-backed card narration disables the English-locale retry. Ordinary answers, greetings, campus navigation, and other calls use the default `allow_english_fallback=True` unless explicitly overridden. Unsupported/regional failures therefore do not consistently fail explicitly.

## 3. Six-language real-audio trace

### 3.1 Provider structural test

`backend/tests/test_m58_live_sarvam.py` generated one short phrase per locale. All six responses were RIFF/WAVE and the test passed:

| Locale | Bytes | Generation time |
| --- | ---: | ---: |
| `en-IN` | 110,542 | 1,941.8 ms |
| `kn-IN` | 101,202 | 1,024.4 ms |
| `hi-IN` | 88,812 | 2,902.5 ms |
| `ta-IN` | 88,220 | 1,413.6 ms |
| `te-IN` | 86,836 | 1,151.7 ms |
| `ml-IN` | 81,548 | 1,231.1 ms |

### 3.2 Application narration to audible host output

A temporary diagnostic resolved the real `cse.hod` ContentUnit in each language, called `narrate_unit`, submitted that exact narration to the mapped Sarvam locale, decoded the returned WAV, and played it sequentially through output device 4, `Headphone (2- Realtek(R) Audio)`. The temporary diagnostic was deleted after the run.

| App code | Locale | Narration chars | Audio bytes | Generate | Device playback | Result |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| `en` | `en-IN` | 54 | 139,894 | 1,836.0 ms | 3,352.0 ms | played |
| `kn` | `kn-IN` | 66 | 160,872 | 1,512.7 ms | 3,822.1 ms | played |
| `hi` | `hi-IN` | 61 | 156,216 | 2,043.4 ms | 3,717.1 ms | played |
| `ta` | `ta-IN` | 63 | 141,532 | 1,747.5 ms | 3,353.0 ms | played |
| `te` | `te-IN` | 57 | 160,080 | 1,740.9 ms | 3,792.6 ms | played |
| `ml` | `ml-IN` | 69 | 160,552 | 1,680.2 ms | 3,814.6 ms | played |

This crossed the application narration-selection and real-provider boundaries and produced audible device output. It did not traverse the application WebSocket/browser queue, and the agent cannot judge sound emitted by a physical headphone. Pronunciation, random-word, and naturalness columns therefore remain **unreviewed**, not passed.

## 4. Reproduction matrix by language

Legend: `A` actual Sarvam audio played to host output; `U` automated unit/integration evidence; `B` mocked browser evidence; `C` code-path reproduction/inspection; `K` physical kiosk/native review still required; `FAIL` a defect is proven.

Because all languages share the same orchestration, chunking, WebSocket, and playback code, most results are intentionally identical across columns.

| Scenario | en | kn | hi | ta | te | ml | T0 result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1. Short department overview | U/C/K | U/C/K | U/C/K | U/C/K | U/C/K | U/C/K | localized units resolve; full kiosk path not run |
| 2. HOD card | A/U/K | A/U/K | A/U/K | A/U/K | A/U/K | A/U/K | real app narration generated and played; pronunciation unreviewed |
| 3. Fees card | U/C/K | U/C/K | U/C/K | U/C/K | U/C/K | U/C/K | deterministic narration exists; no physical playback review |
| 4. Three-card request | U/B/K | U/B/K | U/B/K | U/B/K | U/B/K | U/B/K | unit order tests pass; mocked browser suite partly passes |
| 5. Long narration | C/FAIL/K | C/FAIL/K | C/FAIL/K | C/FAIL/K | C/FAIL/K | C/FAIL/K | unsafe hard split and malformed multi-WAV merge proven |
| 6. Person name | A/U/K | A/U/K | A/U/K | A/U/K | A/U/K | A/U/K | HOD name crossed real provider; linguistic correctness unreviewed |
| 7. Acronym (`CSE`, `AI`, `MBA`) | C/K | C/K | C/K | C/K | C/K | C/K | no acronym pronunciation normalization contract |
| 8. Rapid second request | U/B/K | U/B/K | U/B/K | U/B/K | U/B/K | U/B/K | generation/turn fences exist; real-provider cancellation unmeasured |
| 9. Card arrow during playback | U/B/K | U/B/K | U/B/K | U/B/K | U/B/K | U/B/K | seeking tests pass; scheduler can retain multiple PLAYING statuses |
| 10. User interruption | U/B/K | U/B/K | U/B/K | U/B/K | U/B/K | U/B/K | current element is paused; physical late-response test required |
| 11. Provider failure/fallback | C | C/FAIL | C/FAIL | C/FAIL | C/FAIL | C/FAIL | regional text can be resubmitted as `en-IN` |
| 12. Repeated request | U/C/K | U/C/K | U/C/K | U/C/K | U/C/K | U/C/K | cache and sequence dedupe exist; no stable audioAssetId |
| 13. Page refresh | C/K | C/K | C/K | C/K | C/K | C/K | singleton socket survives Strict Mode; physical refresh not validated |
| 14. WebSocket reconnect | U/B-FAIL/K | U/B-FAIL/K | U/B-FAIL/K | U/B-FAIL/K | U/B-FAIL/K | U/B-FAIL/K | unit tests pass; all 3 targeted lifecycle Playwright cases failed |
| 15. Slow network | C/K | C/K | C/K | C/K | C/K | C/K | timeout/watchdog paths exist; real throttled kiosk trace absent |

For failures/retries, current telemetry cannot reliably answer all requested count questions. It lacks a unified trace ID, actual external request number, provider/voice fields per event, stable audio asset ID, queue length at enqueue, and playback start/end events. The code-derived count bounds are in section 7.

## 5. Source narration findings

### What is working

- ContentUnit card narration is deterministic and separated from card display text.
- `PresentationBundle` freezes `segments`, `spoken_summaries`, captions, locale, and contract hash.
- All registered units resolved and produced non-empty narration in all six languages: `14 passed, 560 subtests passed` in `test_m510_phase2d_universal.py`.
- Narration tests reject a small list of known UI filler such as “showing the” and “this sample card”.
- Prompts request plain text with no Markdown, bullets, or emoji.
- HOD and leadership names come from canonical/localized data rather than being invented during TTS.

### Gaps

- Ordinary `reply_text` can go straight to TTS. Prompt instructions are not runtime enforcement.
- `_fact_sentence` passes unit body through `_clip_caption`, not a speakable-text sanitizer.
- `_with_sparse_guest_name` injects a guest name into narration composition. This is intentional but should be part of the future narration contract and pronunciation review.
- Tamil, Telugu, and Malayalam leadership templates retain Latin `Sai Vidya Institute of Technology`; names and technical terms are legitimate exceptions, but their pronunciation is not normalized or reviewed.
- No generic detection/removal exists for Markdown, bullets, HTML, JSON, URLs, internal IDs, file paths, emoji, repeated punctuation, parenthetical metadata, prompt leakage, duplicate sentences, or unwanted filler.
- No runtime script/language validator proves that regional narration is predominantly in the requested script before submission.
- Logs record a text preview but do not preserve distinct `originalNarrationText` and `sanitizedNarrationText`, because no sanitization stage exists.

Random words could therefore originate in model output or localization/template content and pass unchanged into TTS. T0 found no evidence that the provider itself invents text; proving provider invention would require paired audio transcription or native review against the exact TTS input.

## 6. Sanitization and pronunciation findings

`normalize_tts_pronunciation` only changes case-insensitive `CLARA` to `Clara`. It does not:

- sanitize markup or metadata;
- normalize acronyms;
- transform currency, dates, or URLs;
- enforce one language/script;
- deduplicate sentences;
- remove control characters;
- preserve a separate sanitized field.

No SSML generation was found. This avoids SSML being read literally, but also means there is no provider-neutral pronunciation or pause contract.

The future contract must retain three separate values: display text, narration text, and sanitized TTS text. Sanitization must be Unicode-aware and must not strip Indic vowel signs, viramas, joiners, or other meaningful marks.

## 7. Chunking, request, and event counts

### 7.1 Chunking defects

`split_tts_chunks` first splits on whitespace following `. ! ? । |`. The `|` in the character class is treated as a literal delimiter. It does not recognize all punctuation conventions and requires whitespace after punctuation.

If a sentence exceeds the configured limit, it slices `piece[start:start + max_chars]` and strips each slice. With a 220-character boundary, repeated `ಕ್ಷ`, `क्ष`, `க்ஷ`, `క్ష`, and `ക്ഷ` samples all put the virama/continuation at the beginning of the second chunk. This is a direct broken-grapheme reproduction for Kannada, Hindi, Tamil, Telugu, and Malayalam.

The same raw slicing exists in `_clip_caption`; it can damage a ContentUnit narration before the TTS chunker sees it. Card bundle segments then bypass the chunker entirely.

No property test currently asserts grapheme safety, word safety, stable reconstruction, or absence of omission/repetition.

### 7.2 Provider call bounds

Current configured values are: outer clip attempts `2`; Sarvam HTTP retry attempts `1`; two endpoint candidates; SDK compatibility fallback after HTTP exhaustion.

For one logical `tts_to_base64_cached` cache miss:

- best case: 1 external HTTP request;
- primary-locale worst case: 4 HTTP requests plus 1 SDK request = 5 provider calls;
- eligible regional call with English-locale retry: up to 10 provider calls;
- outer clip retry can repeat that call, so an unfinished non-card regional clip can reach 20 provider calls;
- if all non-card primary clips fail, a full-reply backup can add up to 10 more calls.

For `N` clips, the worst code-path bound is approximately `20N + 10` external calls for an eligible regional non-card turn, or `10N` for a unit-backed card turn where English retry is disabled. These are code bounds, not observed normal-operation counts.

`tts_requests_per_turn` increments once per cache-miss wrapper call. It does not count endpoint attempts, SDK fallback calls, or distinguish primary-locale from English-locale provider calls. `tts_retries_per_turn` similarly undercounts internal retry activity.

### 7.3 WebSocket event counts

With current low-latency mode and complete-response mode disabled:

- a successful `N`-clip response normally emits `N` streaming `assistant_audio_update` events plus 1 final event;
- the final event repeats the audio bytes in `tts_audio_queue` or `tts_clip_slots` for recovery/merge;
- a one-clip response therefore normally transports its audio in 2 narration events, but should play once;
- ACK and initial/final processing frames are separate and not counted as response narration clips.

The repeated final transport is intentional recovery behavior, but events have no `audioAssetId`. Client dedupe relies on turn plus numeric sequence and terminal scheduler status.

The per-session WebSocket send lock times out after 250 ms and then sends without the lock. Two senders can consequently increment `wire_seq` and complete writes out of order. The frontend will drop the later-arriving lower sequence, which prevents stale replay but can discard a valid narration chunk.

### 7.4 Frontend playback counts

For an in-order response, `responseTtsScheduler.ingestClip` ignores replacement data once a sequence is READY, PLAYING, or terminal. Interim sequence 0 and final queue sequence 0 therefore yield one scheduled playback.

Actual playback count is not logged. There is no stable narration/audio ID carried from backend through playback, and no structured start/end counter. The requested count can only be inferred from scheduler state in tests.

## 8. Audio response integrity

`_parse_sarvam_audio` handles a multi-item `audios` response by retaining the first WAV and appending only bytes following later `data` headers. It does not update the first RIFF chunk size or data chunk size.

Consequences:

- the browser duration parser reads only the first header’s data size;
- `validateTtsAudioBase64` accepts any RIFF prefix and does not verify RIFF/data lengths against decoded bytes;
- playback may ignore appended samples or report an early duration;
- the response watchdog may stop the element before appended audio completes;
- the symptom can present as truncation, mid-sentence stutter, or a jump to the next card.

This logic is duplicated in the HTTP response parser and SDK fallback and is a direct production defect.

## 9. Playback ownership, overlap, and queue findings

### Positive controls

- The normal response uses one current HTMLAudioElement at a time.
- Starting a response stops the ACK player.
- A new turn pauses and clears current response audio and resets generation state.
- Presentation listeners are tokenized and detached on rebind, protecting against late callbacks.
- Scheduler tests cover duplicate sequence suppression, stale turn rejection, invalid audio, cancellation, order, and completion.
- Browser autoplay failure exposes an unmute hint and releases speaking state rather than deadlocking the UI.

### Ownership gaps

1. ACK audio is an independent player. An ACK arriving after response playback has started does not pause response audio; only the reverse transition is serialized. That creates a credible overlap path.
2. Response state exists in both `responseTtsScheduler` and legacy refs (`ttsStreamQueueRef`, `ttsPlayheadRef`, applied queue length). They are copied between each other rather than having one exclusive owner.
3. Manual arrow navigation updates the legacy playhead and directly invokes response playback. It does not complete/cancel the previous scheduler clip first. The scheduler can retain the old sequence as PLAYING and mark the target sequence PLAYING as well, even though the HTML element itself is paused.
4. Orb interruption does not explicitly call `responseTtsScheduler.cancel`; it relies on paused audio, cleared legacy refs, generation invalidation, and the next turn reset.
5. Autoplay rejection marks the response clip failed. A later user gesture does not retry that same clip, so the narration is lost even after the audio system becomes usable.
6. `useWebSocket` keeps a singleton socket for Strict Mode, but only one callback pair is stored per URL. Cleanup sets those callbacks to no-op. This is safe for one consumer’s remount pattern but is not a multi-subscriber event bus and needs a development Strict Mode/reconnect browser test.

The dormant `CardStackComponent` audio path is not currently a production overlap source because it has no call site. It should remain excluded or be routed through the future single owner if reintroduced.

## 10. Timeout, retry, cache, and fallback findings

- TTS cache: 256 entries, 1,200-second TTL, keyed by locale, speaker, pace, model, and text.
- A per-key asyncio lock prevents duplicate simultaneous synthesis inside one backend process.
- English-locale fallback audio is not cached under the regional key, which avoids persistent cache poisoning.
- First/other chunk timeouts are 10/5 seconds; full backup timeout is 20 seconds; the default standalone TTS timeout is 10 seconds.
- A clip may receive two outer attempts, while each provider invocation also performs endpoint retries and SDK fallback.
- Completed scheduler sequences ignore later replacement events, reducing retry replay.
- The full-response backup is generated only if zero primary clips succeeded and is disabled for unit-backed card bundles. That avoids replacing unit-indexed card audio with one unrelated blob.
- The principal unsafe behavior remains retrying regional script with `en-IN`; a fallback must preserve the locale or fail explicitly.

## 11. Diagnostics coverage

No temporary production diagnostics were retained. Existing evidence includes `turn_id`, utterance kind, locale, text length/preview, cache source, audio byte length/duration, session generation, wire sequence, chunk index, expected clip count, retry/cache metrics, and failure/watchdog logs.

The requested trace schema is not available end to end:

| Field | Current state |
| --- | --- |
| `traceId` | absent as one cross-stage identifier |
| `sessionId` | session generation exists; no stable safe session trace ID |
| `requestId` | `turn_id` approximates it |
| selected/detected language | exists in session/diagnostics, not consistently attached to playback |
| `voiceId` / provider | configuration only; not emitted per narration event |
| original/sanitized text | preview only; no sanitizer distinction |
| chunk index / total | available on response events |
| TTS request number | logical metric only; actual external attempts absent |
| `audioAssetId` | absent; client uses byte signature and sequence |
| WebSocket event number | `wire_seq` is available |
| playback queue length | not logged end to end |
| playback start/end | only errors/watchdogs are logged |
| cancellation reason | partial; no unified structured field |
| retry count | wrapper-level partial count only |

T1/T4 diagnostics should hash or identify narration safely and avoid logging full sensitive user content in production.

## 12. Exact root causes and confidence

| Priority | Root cause | Expected symptom | Confidence |
| --- | --- | --- | --- |
| P0 | regional failure retries same text as `en-IN` | English/wrong pronunciation, random-sounding regional output | proven by code |
| P0 | invalid multi-WAV byte concatenation | truncation, stutter, early card advance/watchdog | proven by code |
| P0 | raw code-point hard split | damaged Indic grapheme, mid-word artifacts | reproduced in all five Indic scripts |
| P0 | no runtime speakable-text sanitizer | Markdown/JSON/URL/UI metadata or model filler can be spoken | proven absence |
| P1 | one global speaker, no per-language voice policy | voice mismatch cannot be detected or enforced | proven design gap |
| P1 | ACK player independent from response owner | two voices can overlap if ACK arrives late | credible code path |
| P1 | dual scheduler/legacy queue state | stale status, manual seek inconsistency, hard-to-count playback | proven design gap |
| P1 | unlocked WebSocket send after 250 ms contention | valid audio event can arrive out of order and be dropped | proven code path |
| P1 | WAV validator checks prefix, not container lengths | malformed combined audio marked READY | proven by code |
| P2 | autoplay-rejected clip is failed, not gesture-retriable | silent answer after browser policy block | proven by code |
| P2 | no stable audio/narration ID and playback telemetry | duplicate/retry origin cannot be conclusively attributed | proven observability gap |
| P2 | acronym/name/currency pronunciation not normalized | unnatural or inconsistent technical speech | requires audio review |

No evidence justifies attributing random words solely to Sarvam. Text capture plus audio transcription/native review is required to separate source-text defects from provider pronunciation.

## 13. Files likely requiring Phase T1–T7 changes

No files in this list were changed during T0.

- `backend/app/main.py`: enforce sanitized text, safe fallback, trace metadata, accurate counts, emission contract.
- `backend/clients/provider_clients.py`: repair/remove WAV concatenation and expose provider-attempt metadata.
- `backend/config/settings.py`: authoritative per-language provider/locale/voice mapping.
- `backend/services/tts_chunking.py`: sentence-aware, word-aware, grapheme-safe deterministic chunks.
- `backend/services/content/unit_narration.py`: emit narration text into the contract without raw clipping.
- `backend/services/narration_plan.py`: replace raw `_clip_caption` for spoken content.
- New backend TTS text-contract module: sanitization, language/script validation, pronunciation normalization, duplicate-sentence handling.
- `frontend/src/lib/tts/responseTtsScheduler.ts`: make it the exclusive response queue owner and support explicit seek/cancel semantics.
- `frontend/src/screens/ChatScreen.tsx`: remove legacy queue ownership and direct response starts.
- `frontend/src/lib/tts/ackAudio.ts`: coordinate ACK through the one playback arbiter.
- `frontend/src/lib/tts/audioValidation.ts`: parse WAV chunks and validate container/data lengths.
- `frontend/src/hooks/useWebSocket.ts`: stable audio IDs and safer multi-subscriber/order behavior.
- `frontend/src/features/chat/presentation/PresentationAudioManager.ts`: sole element lifecycle/cleanup owner.

Phase 2A canonical department/HOD files and assertions must be preserved while these later changes are developed.

## 14. Proposed automated tests

### Backend

1. Table-driven provider/locale/voice mapping for all six languages.
2. Regional provider failure never calls `en-IN` or another language.
3. Unsupported locale/voice fails explicitly.
4. Sanitizer removes Markdown, bullets, HTML, JSON wrappers, URLs, internal IDs, file paths, emoji/control characters, and repeated sentences while retaining meaningful Indic marks.
5. Script/language validation detects whole-sentence wrong-language fallback while allowing configured proper names/acronyms.
6. Grapheme property tests for Kannada, Hindi, Tamil, Telugu, and Malayalam.
7. Chunk reconstruction equals normalized sanitized input with no omission/repetition/reordering.
8. No chunk begins with a combining mark, virama continuation, or joiner detached from its base.
9. Acronyms and person names are not split.
10. Multi-audio provider response is decoded/re-encoded into a valid WAV with correct RIFF/data lengths, or returned as separate assets.
11. External provider-attempt count includes endpoints, SDK, outer retry, and fallback.
12. One audio asset ID maps to one chunk and one emitted terminal status.
13. Concurrent WebSocket sends preserve wire order or explicitly queue.

### Frontend

1. One global arbiter prevents ACK/response/campus overlap.
2. Duplicate interim/final event with one audio ID plays once.
3. New turn cancels current and queued clips and rejects late old-session frames.
4. Manual right/left seek cancels the old scheduler clip and leaves exactly one PLAYING state.
5. `ended`, `error`, watchdog, pause, and retry cannot complete/advance the same item twice.
6. Autoplay rejection can retry safely after a user gesture without duplicating audio.
7. Strict Mode double mount creates one effective listener/subscription.
8. Refresh and reconnect do not replay an already completed asset.
9. Slow/out-of-order events remain ordered by stable chunk/audio identity.
10. Multi-card `unitId` order remains synchronized with playback.

Existing tests, including `backend/tests/test_phase1_regional_card_regression.py` and all its assertions/expected failures, must not be weakened, skipped, or marked `xfail`.

## 15. Required real-device tests

The following must run on the actual CLARA kiosk with its production Chromium flags, speakers/headphones, network, and microphone:

- five short and five long phrases per language;
- department/HOD names, other person names, institution name;
- `CSE`, `AI`, `AIML`, `MBA`, numbers, dates, fee/currency values;
- three-card and longer card sequences with observed card order;
- rapid second request, orb interruption, arrow navigation during speech;
- provider failure, retry, throttled/slow network, offline/online transition;
- page refresh and WebSocket reconnect;
- cold start before and after WebSocket OPEN;
- autoplay before and after a user gesture;
- speaker-output device selection and volume;
- native-language reviewer comparison of exact sanitized input against audible output.

For each sample, record the fields requested for `REGIONAL_SPEECH_AUDIO_VALIDATION.md`, including pronunciation correctness, duplication, stutter, foreign-language leakage, overlap, and reviewer notes. Audio recordings/transcripts should be handled according to the project’s privacy policy.

## 16. Verification performed in T0

| Check | Result |
| --- | --- |
| Live Sarvam six-language RIFF/WAV test | 1 passed; six real provider responses |
| Real app `cse.hod` narration → Sarvam → default output | played for all six locales |
| Backend TTS orchestration/full-reply tests | 17 passed, 23 subtests passed |
| Universal six-language ContentUnit narration | 14 passed, 560 subtests passed |
| Frontend scheduler/audio/slot/turn-fence/presentation tests | 65 passed |
| Additional WS dispatcher/presentation ownership tests | 30 passed |
| Frontend TypeScript lint | passed |
| Frontend production build | passed with existing chunk-size/dynamic-import warnings |
| Targeted Playwright audio/card/reconnect suite | 12 passed, 4 failed |
| Docker full stack | not run; Docker Desktop Linux engine unavailable |
| Native-language pronunciation review | not performed |
| Physical CLARA kiosk browser validation | not performed |

The four Playwright failures were:

1. targeted placements did not show `department-card-stage`;
2. cold-start wake during CONNECTING did not show the language picker;
3. cold-start wake after OPEN never exposed expected socket ready state;
4. reconnect while CONNECTING did not show the language picker.

These were retained as evidence and were not masked or fixed during T0.

## 17. Recommended phased fix plan

1. **T1 — Narration text contract:** introduce explicit display/narration/sanitized values, runtime sanitizer, language/script validation, and safe trace fields.
2. **T2 — Language and voice enforcement:** one authoritative provider/locale/speaker matrix; remove the `en-IN` regional retry; explicit failure or same-language fallback only.
3. **T3 — Unicode-safe chunking:** sentence, word, and grapheme boundaries with exact reconstruction properties; remove raw spoken-text clipping.
4. **T3.1 — WAV integrity:** correctly combine PCM with repaired headers or keep provider assets separate; strengthen validation.
5. **T4 — Single-owner playback:** route response, ACK, greeting, campus, trustee, and presentation audio through one arbiter; stable narration/audio IDs.
6. **T5 — interruption/stale-session protection:** explicit scheduler cancellation and provider abort propagation; reject late assets by generation and ID.
7. **T6 — retry/fallback safety:** per-item retry only, accurate external attempt counters, no completed-item replay, language-preserving fallback.
8. **T7 — automated verification:** add the tests listed above and resolve the four existing Playwright failures without weakening coverage.
9. **T8 — actual audio validation:** native-language and physical-kiosk review documented in `REGIONAL_SPEECH_AUDIO_VALIDATION.md`.

## T0 stop point

This document is the Phase T0 deliverable. No production behavior was modified. Do not begin Phase T1 until this audit is reviewed and approved.
