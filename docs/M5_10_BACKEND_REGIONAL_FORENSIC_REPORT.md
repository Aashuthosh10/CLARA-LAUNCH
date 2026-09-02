# M5.10 Backend-Only Regional Pipeline Forensic Report

Date: 2026-08-26  
Scope: backend-only, in-process diagnostic trace  
Repository: `192d118487ab455ec79de13347563ac48fe429c1` (`main`)

## Scope and safety boundary

This run did not start Chrome, Playwright, the microphone, the frontend, a WebSocket client, an LLM provider, or an external TTS provider. It did not modify production code. The diagnostic fixture is [test_m510_backend_regional_forensic.py](../backend/tests/test_m510_backend_regional_forensic.py).

The trace exercises the existing deterministic backend stages:

`raw transcript → detect_language → session language → normalize_user_input → parse_semantic_request → resolve_response_decision → select_content_units → resolve_units_for_plan → map_content_units_to_segments`

It cannot provide evidence for browser STT, WebSocket transport, PresentationEngine activation, visible DOM cards, or real TTS playback.

## Executive result

The exact Kannada backend input succeeds through the backend composition path. It produces the intended ordered units:

`cse_ds.hod → cse_ds.fees → events.techvidya`

All three resolved units and their narration segments carry Kannada (`kn`) content. Therefore, for this exact text, the first backend failure is **none**. The backend is capable of producing the requested three-card plan when it receives the intended Kannada transcript.

The deterministic proof diagnostic preserves every expected result from the brief, including the two captured STT expectations. It produced **6 PASS / 3 FAIL**:

| Case | Expected | Actual | Verdict | First failed stage | Classification |
|---|---|---|---|---|---|
| English exact | `cse_ds.hod`, `cse_ds.fees`, `events.techvidya` | same | PASS | none | A. BACKEND CORRECT |
| Kannada exact | `cse_ds.hod`, `cse_ds.fees`, `events.techvidya` | same | PASS | none | A. BACKEND CORRECT |
| Kannada real capture #1 | `cse_ds.hod` | `cse_ds.overview` | FAIL | semantic parser | D. SEMANTIC PARSER FAILURE |
| Kannada real capture #2 | `cse_ds.hod` | none | FAIL | semantic parser | D. SEMANTIC PARSER FAILURE |
| Hindi | `cse_ds.hod`, `cse_ds.fees`, `events.techvidya` | same | PASS | none | A. BACKEND CORRECT |
| Tamil | `cse_ds.hod`, `cse_ds.fees`, `events.techvidya` | same | PASS | none | A. BACKEND CORRECT |
| Telugu | `cse_ds.hod`, `cse_ds.fees`, `events.techvidya` | same | PASS | none | A. BACKEND CORRECT |
| Malayalam | `cse_ds.hod`, `cse_ds.fees`, `events.techvidya` | `cse_ds.hod`, `cse_ds.fees` | FAIL | semantic parser | D. SEMANTIC PARSER FAILURE |
| Romanized Kannada | `cse_ds.hod`, `cse_ds.fees`, `events.techvidya` | same | PASS | none | A. BACKEND CORRECT |

The captured STT variants explain the observed “CSE HOD card in English / other cards do not trigger” symptom at the backend boundary:

| Input label | Normalized form (abridged only where shown) | Semantic result | Unit IDs | Backend consequence |
|---|---|---|---|---|
| English exact | `who is the cse data science hod what are the fees and tell me about techvidya` | mixed request | `cse_ds.hod`, `cse_ds.fees`, `events.techvidya` | complete 3-unit plan |
| Kannada exact | `data science ವಿಭಾಗದ hod ಯಾರು ಮತ್ತು ಫೀಸ್ ಎಷ್ಟು ಮತ್ತು techvidya ಬಗ್ಗೆ ಹೇಳಿ` | mixed request | `cse_ds.hod`, `cse_ds.fees`, `events.techvidya` | complete 3-unit plan, `kn` content |
| Captured STT 1 | `data science ಸಚಿವರು ಯಾರು` | single department overview | `cse_ds.overview` | HOD intent is lost; overview is selected |
| Captured STT 2 | `ಡೇಟಾ ಸಂಖ್ಯೆ ಸಚಿವರು ಯಾರು` | no semantic request | none | clarification path |
| Hindi equivalent | `data science विभाग के hod कौन हैं और फीस कितनी है और techvidya के बारे में बताइए` | mixed request | `cse_ds.hod`, `cse_ds.fees`, `events.techvidya` | complete 3-unit plan, `hi` content |
| Tamil equivalent | regional-normalized mixed request | mixed request | `cse_ds.hod`, `cse_ds.fees`, `events.techvidya` | complete 3-unit plan, `ta` content |
| Telugu equivalent | regional-normalized mixed request | mixed request | `cse_ds.hod`, `cse_ds.fees`, `events.techvidya` | complete 3-unit plan, `te` content |
| Malayalam equivalent | regional-normalized mixed request | mixed request | `cse_ds.hod`, `cse_ds.fees` | TechVidya entity is not recognized in this fixture |
| Romanized Kannada equivalent | `data science vibhagada hod who mattu fees how much mattu techvidya about` | mixed request | `cse_ds.hod`, `cse_ds.fees`, `events.techvidya` | complete 3-unit plan, `kn` content |

The table’s regional-language labels are the explicitly requested equivalent fixtures. The two “captured STT” rows are the exact previously observed transcripts and are not rewritten as successful wording.

## Required backend trace fields

The executable trace prints one `M510_BACKEND_TRACE` JSON record per case containing:

- exact `raw_transcript`;
- requested/session language, language name, TTS code, and `is_language_auto`;
- deterministic `detected_from_raw` result;
- exact normalized text;
- complete `semantic_request` including ordered `(entity, topic)` items;
- complete `response_decision`;
- selected unit IDs;
- resolved unit language, section, metadata, and body;
- narration segment unit ID, card index, display text, and TTS text.

For the exact Kannada case, the backend record is:

- session: `language_code_key=kn`, `language_name=Kannada`, `tts_code=kn-IN`, `is_language_auto=false`;
- parser items: `(cse_ds, hod)`, `(cse_ds, fees)`, `(events.techvidya, overview)`;
- response decision: `CARD`, confidence `0.85`, evidence `semantic_request`;
- selected IDs: `cse_ds.hod`, `cse_ds.fees`, `events.techvidya`;
- narration IDs/card indexes: `cse_ds.hod/0`, `cse_ds.fees/1`, `events.techvidya/2`;
- resolved content language: `kn`, `kn`, `kn`;
- narration text is localized Kannada for each unit. The TechVidya source is explicitly marked `SAMPLE_REPLACE_WITH_OFFICIAL` in the existing content data; that is a content-status finding, not a routing failure.

The CSE Data Science fee source is the localized department record in `backend/data/locales/*.json#departments`, unit `cse_ds.fees`; the value is `KCET: KEA norms / KEA standards, Management: ₹3,00,000/year` (localized wording per locale).

## Production-path verification

The real in-process production orchestration path was exercised without a server, provider, or browser:

`ConversationOrchestrator.run()` → `run_conversation_intelligence()` → `assess_transcript()` / rule entity extraction / intent scoring → `parse_semantic_request()` → `resolve_response_decision()` → `route_policy()` → `resolve_presentation()` → `_apply_unit_plan_authority()` → `resolve_narration()` → `select_content_units()` → `resolve_units_for_plan()` → `map_content_units_to_segments()` → `finalize_segment_list()` → `validate_before_narration_plan()` → `build_presentation_bundle()` → presentation timeline validation.

The WebSocket entry point in `backend/app/main.py` receives `action == "user_message"`, calls `process_user_text_and_reply()`, performs `maybe_auto_detect_session_language()` first, and then calls `ConversationOrchestrator.run(..., defer_narration=True)`. It later calls `attach_narration()` before emitting the existing `narration_plan` payload. The direct orchestrator run confirmed the same backend outcome:

- exact Kannada: `CARD_PRESENTATION`, `department_overview`, bundle units `cse_ds.hod`, `cse_ds.fees`, `events.techvidya`;
- captured STT #1: `CARD_PRESENTATION`, bundle unit `cse_ds.overview`;
- captured STT #2: `UNKNOWN`, no bundle;
- Malayalam: `CARD_PRESENTATION`, bundle units `cse_ds.hod`, `cse_ds.fees`.

This verifies that the direct fixture is not bypassing the production orchestration decision. The transcript passed to the parser is the same `text` argument received by `ConversationOrchestrator.run()` and later `resolve_narration(user_text=text)`. The only intentionally omitted production boundary is the external WebSocket transport and the provider-backed audio generation.

## Fuzziness matrix (backend-only)

Observed deterministic results for Kannada variations:

| Intent / combination | Input | Actual unit IDs |
|---|---|---|
| HOD exact | `ಡೇಟಾ ಸೈನ್ಸ್ ವಿಭಾಗದ HOD ಯಾರು` | `cse_ds.hod` |
| HOD natural | `ಡೇಟಾ ಸೈನ್ಸ್ ವಿಭಾಗದ ಮುಖ್ಯಸ್ಥರು ಯಾರು` | `cse_ds.hod` |
| HOD STT substitution | `ಡೇಟಾ ಸೈನ್ಸ್ ಸಚಿವರು ಯಾರು` | `cse_ds.overview` — FAIL for HOD expectation |
| HOD mixed English | `Data Science ವಿಭಾಗದ HOD ಯಾರು` | `cse_ds.hod` |
| HOD Romanized | `Data Science vibhagada HOD yaaru` | `cse_ds.hod` |
| Department overview | `ಡೇಟಾ ಸೈನ್ಸ್ ವಿಭಾಗದ ಬಗ್ಗೆ ಹೇಳಿ` | `cse_ds.overview` |
| Overview reordered | `ವಿಭಾಗದ ಡೇಟಾ ಸೈನ್ಸ್ ಬಗ್ಗೆ ಹೇಳಿ` | `cse_ds.overview` |
| Fees exact | `ಡೇಟಾ ಸೈನ್ಸ್ ಶುಲ್ಕ ಎಷ್ಟು` | `cse_ds.fees` |
| Fees colloquial | `ಡೇಟಾ ಸೈನ್ಸ್ ಫೀಸ್ ಎಷ್ಟು` | `cse_ds.fees` |
| Fees mixed English | `Data Science ಫೀಸ್ ಎಷ್ಟು` | `cse_ds.fees` |
| TechVidya native | `ಟೆಕ್ ವಿದ್ಯಾ ಬಗ್ಗೆ ಹೇಳಿ` | `events.techvidya` |
| TechVidya mixed English | `TechVidya ಬಗ್ಗೆ ಹೇಳಿ` | `events.techvidya` |
| TechVidya spelling substitution | `ಟೆಕ್ವಿದ್ಯಾ ಬಗ್ಗೆ ಹೇಳಿ` | none — FAIL |
| HOD + fees | `ಡೇಟಾ ಸೈನ್ಸ್ HOD ಮತ್ತು ಫೀಸ್ ಎಷ್ಟು` | `cse_ds.hod`, `cse_ds.fees` |
| HOD + TechVidya | `ಡೇಟಾ ಸೈನ್ಸ್ HOD ಮತ್ತು ಟೆಕ್ ವಿದ್ಯಾ ಬಗ್ಗೆ ಹೇಳಿ` | `cse_ds.hod`, `events.techvidya` |
| Fees + TechVidya | `ಡೇಟಾ ಸೈನ್ಸ್ ಫೀಸ್ ಮತ್ತು ಟೆಕ್ ವಿದ್ಯಾ ಬಗ್ಗೆ ಹೇಳಿ` | `cse_ds.fees`, `events.techvidya` |
| HOD + fees + TechVidya | `ಡೇಟಾ ಸೈನ್ಸ್ HOD ಮತ್ತು ಫೀಸ್ ಮತ್ತು ಟೆಕ್ ವಿದ್ಯಾ ಬಗ್ಗೆ ಹೇಳಿ` | `cse_ds.hod`, `cse_ds.fees`, `events.techvidya` |

The matrix shows that one bad item does not destroy valid items in the current UnitSelector: valid pairs survive when an explicitly constructed unknown pair is present, and recognized multi-intent combinations preserve order. The gaps are recognition/normalization gaps for the STT substitution `ಸಚಿವರು`, the corrupted `ಡೇಟಾ ಸಂಖ್ಯೆ` transcript, and the spelling variant `ಟೆಕ್ವಿದ್ಯಾ`.

## Original versus current trigger architecture

The known-good historical path is visible before the M5.4/M5.10 semantic authority consolidation (notably the pre-current `main.py` implementation around commit `958e22d`). It used `normalize_and_classify_query()` / `resolve_card_intent_and_department()` and then `infer_show_card_label()` to create a broad `showCard` value. ChatScreen consumed `showCard`/`cardTrigger`, built local `cardsToSync`, and advanced cards using the legacy timed/audio layout. Historical source contains direct card branches for HOD, fees, department overview, college-wide cards, and multi-trigger values such as `['hod', 'trustees']`.

| Concern | Old trigger pipeline | Current semantic pipeline |
|---|---|---|
| HOD recognition | normalized intent keyword/profile detection; `infer_show_card_label()` maps HOD intent to `hod` | `detect_topic_spans()` + semantic parser topic `hod`, then `(entity, topic)` pair |
| Department recognition | `extract_features()` / `resolve_card_intent_and_department()` plus raw-text fallback | exclusive department span matching plus canonical department resolver |
| Fees | fee-like normalized query and direct `department_fees`/`fees` card trigger | semantic topic `fees` → `cse_ds.fees` |
| TechVidya/events | older broad/local trigger and frontend static-card resolution where available | campus entity detector → `events.techvidya` registered ContentUnit |
| Regional vocabulary | older normalizer/LLM-assisted path could translate or broaden some regional wording | deterministic multilingual term vocabularies and `normalize_user_input()`; unsupported substitutions fail closed |
| STT noise tolerance | broad intent strings and raw/translated fallback; tolerance was implicit rather than unit-level | exact normalized tokens, explicit aliases/spans, no invented mapping for unknown words |
| Multiple intents | `showCard` and frontend `cardsToSync` families/timed sequence | ordered `(entity, topic)` items → ordered unit IDs; no arbitrary cap |
| Fallback | frontend could construct cards from `cardTrigger`/`cardsToSync` when payload was incomplete | unit-backed plan is authoritative; missing plan degrades/clarifies rather than guessing |

The historical source does not establish that `ಸಚಿವರು` was an intentional Kannada HOD alias. It establishes a broader trigger/normalization architecture, not a justified semantic equivalence. Treating that word as HOD would be a product decision requiring explicit approval, not a forensic conclusion.

## FIRST FAILED BOUNDARY

For the exact intended Kannada transcript: **none in the backend-only path**.

For the previously captured STT runs:

1. `ಡೇಟಾ ಸೈನ್ಸ್ ಸಚಿವರು ಯಾರು` first fails semantically at **STT transcript fidelity / parser input meaning**: the transcript contains `ಸಚಿವರು` (“minister”-like wording) rather than the HOD cue, so the parser intentionally selects `cse_ds.overview`.
2. `ಡೇಟಾ ಸಂಖ್ಯೆ ಸಚಿವರು ಯಾರು` first fails at **semantic request parsing**: no department/topic combination is recognized, so `SemanticRequest=None`, `ResponseDecision=CLARIFY`, and no unit IDs exist.

Those are backend observations of already-captured text. They are not proof that Chrome SpeechRecognition itself failed, because this run intentionally did not perform speech input.

## Language ownership

The current backend ownership path is:

1. `main.maybe_auto_detect_session_language()` calls `detect_language(text, stt_meta, threshold)` only when the session has no language code and auto-detection is enabled.
2. `set_session_language()` writes `language_code_key`, `language_name`, `language_code`/TTS code, and `is_language_auto`.
3. `resolve_session_language()` returns the session code/name/TTS tuple.
4. The orchestrator/localization resolver copies that tuple to the turn resolution.
5. The parser receives the resolved `language_code_key`, and content resolution/narration uses the same key.

In this diagnostic, language was explicitly seeded per requested case (`is_language_auto=false`) to isolate backend semantic behavior. The fixture also records the independent script detector result, but it does not claim that result is the live WebSocket session state.

## Legacy ChatScreen reachability audit

This report does not claim the legacy paths are deleted. Source inspection shows they remain present in `frontend/src/screens/ChatScreen.tsx`, but the current canonical unit-plan branch is checked before legacy fallback behavior.

| Legacy mechanism | Location / caller | Condition | Reachable in this backend-only run? | Can override canonical plan? |
|---|---|---|---|---|
| `cardTrigger` | `ChatScreen.tsx` response handler | `payload.showCard` normalized, then branch-specific handling | Not exercised; browser required | It remains a legacy/native trigger input, but the unit-backed plan branch takes precedence for `department_overview`/unit segments |
| `cardsToSync` | `ChatScreen.tsx` state/TTS layout | legacy card arrays supplied by payload or trigger fallback | Not exercised; browser required | Intended fallback only; current unit-backed branch sets it to `null` for a valid unit plan |
| `kind: 'cards'` | `ChatScreen.tsx` legacy presentation helpers | no unit-backed plan / legacy payload shape | Not exercised; browser required | `shouldAllowLegacySingle()` permits legacy only when incoming unit IDs are empty |
| `kind: 'single'` | `ChatScreen.tsx` legacy presentation helpers | no unit-backed plan / legacy payload shape | Not exercised; browser required | Same no-unit-plan guard; not a backend authority |
| legacy renderer | `frontend/src/features/chat/presentation/planToScenes.ts` fallback | `narration_plan` absent, fallback cards available | Not exercised; browser required | Can render only when canonical narration plan is absent; this backend run confirms canonical plan is present for exact Kannada |

This is a reachability-by-source table, not a live browser claim. A live DOM/runtime table requires the separately authorized browser test and must not be inferred from this backend-only run.

## Comparison with the original working implementation

The repository history shows the older path accumulated direct `showCard`/`cardTrigger` and `cardsToSync` handling in `ChatScreen`, with speech recognition sending a final transcript directly to `user_message`. The deterministic `narration_plan` path was introduced at commit `69d2106` and later centralized under response authority/unit-backed presentation.

The important behavioral difference is:

- older path: transcript → broad intent/trigger → frontend legacy card construction and timed `cardsToSync` advancement;
- current path: transcript → session language → semantic request → ordered unit IDs → backend narration plan → frontend PresentationEngine.

The current backend did not remove the ability to select the multi-card composition for the exact Kannada phrase. The observed captured-transcript variants are materially different inputs, so an STT transcript that loses “HOD”, “fees”, or “TechVidya” cannot yield the intended three-item semantic request. The old frontend route may have appeared more forgiving because it used broad trigger inference and local card fallback, but that is not evidence that it preserved exact semantics or localized content correctly.

## Health and test separation

### Backend diagnostic / synthetic result

The proof diagnostic was run in-process with the project virtual environment. It emitted every record and intentionally exited non-zero because three supplied expected results do not match the current backend. Pytest reported `1 failed, 1 passed` at the test-method level, with `6 PASS / 3 FAIL` per case. This proves the diagnostic fails when expected unit IDs are not produced.

### Existing synthetic suite

The existing backend deterministic tests relevant to language detection, M5.9/M5.10 unit selection, Kannada routing, localization, narration, and WebSocket payload propagation remain the synthetic evidence set. They do not prove Chrome microphone behavior.

The existing suite, excluding the intentionally failing proof diagnostic, completed with `546 passed, 933 subtests passed` in the final rerun; the focused regression set completed with `83 passed, 763 subtests passed`.

### Real Chrome/browser result

**Not run by instruction.** No Chrome, microphone, browser automation, WebSocket client, Vite health, PresentationEngine DOM, or real TTS playback evidence was collected in this backend-only task. Accordingly, the following are **undetermined**, not failed: frontend reachability, lazy-asset reachability, Vite restart/crash status, WebSocket connectivity, visible card sequence, and audio playback matching.

## Ranked root causes from available evidence

### P0 — transcript/session fidelity is unproven in the real runtime

The requested acceptance flow depends on the real transcript reaching the backend exactly enough to preserve all semantic cues. This run cannot prove the microphone → SpeechRecognition → ChatScreen → WebSocket portion. The captured STT text demonstrates that malformed transcript wording changes or eliminates the intended card plan.

### P1 — semantic cue loss produces a valid but wrong/partial backend plan

The exact Kannada phrase yields all three units, but `ಡೇಟಾ ಸೈನ್ಸ್ ಸಚಿವರು ಯಾರು` yields only `cse_ds.overview`, and `ಡೇಟಾ ಸಂಖ್ಯೆ ಸಚಿವರು ಯಾರು` yields no unit. This is the first evidenced backend-side divergence for those inputs. It is not yet authorization to modify parser aliases or regional semantics.

### P2 — legacy frontend paths remain structurally present

`cardTrigger`, `cardsToSync`, and legacy `kind` fallbacks still exist in ChatScreen source. The current source comments/guards indicate unit-backed plans are meant to outrank them, but live reachability and override behavior remain unverified because browser testing was explicitly excluded.

## Final conclusion

**BACKEND FAILURE FOUND AT SEMANTIC PARSER for three required cases.**

The backend is proven correct for the exact Kannada request and five other multilingual/romanized fixtures, including localized display/TTS identity and the fee value. No downstream production layer should be changed based on this evidence.

Source-of-truth status: ChatScreen, PresentationEngine, UnitSelector, and narration mapping are ruled out for the exact valid Kannada plan by the existing deterministic/mounted evidence and this production-orchestrator run. They are not ruled out for a malformed or missing backend plan. The minimal eventual production change is therefore upstream transcript/semantic handling only: first decide, from product-approved regional vocabulary and real captured transcripts, whether to improve normalization/recognition for the observed substitutions. Do not implement that change in this phase.

## Conclusion / hard stop

Do not modify parser aliases, regional semantics, UnitSelector, narration-plan construction, ChatScreen, PresentationEngine, M5.8, or TTS based on this report alone. The backend evidence says the exact intended Kannada transcript already produces the requested ordered three-unit plan. The next authorized diagnostic step, if needed, is a separately controlled live browser test beginning with the physical “Tap to Speak” click and recording the actual transcript; this report does not perform or claim that test.
