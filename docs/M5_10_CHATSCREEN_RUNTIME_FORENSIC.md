# M5.10 ChatScreen Runtime Forensic Report

Date: 2026-08-26  
Repository: `clara_finished-.git`  
Branch: `main`  
Local and remote HEAD: `192d118487ab455ec79de13347563ac48fe429c1`

Audit status: source and runtime forensic work only. No production code was changed. No commit or push was made for this report.

## 1. Frozen state and service evidence

The working tree already contained unrelated changes in:

```text
backend/data/locales/en.json
backend/tests/test_groq_completion_params.py
docs/M5_5_FULL_SYSTEM_RECOVERY_REPORT.md
scripts/m55_recovery_probe.py
docs/M5_10_KN_CARD_REGRESSION_FORENSIC.md
```

They were not staged or modified.

At audit time, fresh checks found ports 6969, 5176, and 5177 down. A same-session Vite restart temporarily made 5176 return HTTP 200 and allowed lazy-loaded trustee/image components to render; after the terminal session ended, a fresh Chrome tab again received `ERR_CONNECTION_REFUSED`. This is a service-lifecycle failure separate from ChatScreen logic.

## 2. Executable architecture map

```text
ChatOrbControl / UI chip / test-only sender
  → ChatScreen handleOrbTap or interceptAndSendMessage
  → useSpeechRecognition.onresult (real voice only)
  → { action: 'user_message', text }
  → useWebSocket / backend ws /clara
  → main.py process_user_text_and_reply
  → language/session resolution
  → semantic_request_parser
  → ResponseDecision / presentation_resolver
  → UnitSelector
  → ContentUnit resolver + locale
  → narration_resolver / presentation_bundle
  → payload.narration_plan + tts clip metadata
  → ChatScreen payload effect
  → PresentationController.loadPresentation(kind='plan')
  → PresentationEngine.planToScenes
  → snapshot.activeScene / snapshot.cardIndex
  → ChatScreen currentCardIdx and currentUnitCard
  → unit-aware renderer
  → M5.8 response TTS scheduler/audio binding
```

Real microphone source: `frontend/src/hooks/useSpeechRecognition.ts`, `startListening`, `recognition.onresult`, and `recognition.onerror`. It maps Kannada to `kn-IN` and sends only a final trimmed transcript.

Frontend request source: `ChatScreen.tsx:1125–1164`, `interceptAndSendMessage`; voice input resets turn presentation state and delegates to parent `sendMessage`.

Backend WebSocket source: `backend/app/main.py:3383–3424`, `action == 'user_message'`; it schedules `process_user_text_and_reply`.

Backend planning sources: `main.py:1209–1316`, `services/content/semantic_request_parser.py`, `services/content/unit_selector.py`, `services/orchestration/presentation_resolver.py`, `services/orchestration/narration_resolver.py`, and `services/orchestration/presentation_bundle.py`.

## 3. ChatScreen inventory and classification

### Canonical M5.10 path

- `narrationPlanRef` stores the payload plan at `ChatScreen.tsx:843–860`.
- Unit IDs are extracted with `unitIdsFromSegments`.
- `freezeLocalization` and `localizationCodeKey` are applied before plan loading at `884–885` and `961–962`.
- `loadPresentation({ kind: 'plan' })` occurs at `886–902`, `963–979`, and `1832–1842`.
- `PresentationEngine` owns scenes and exposes `snapshot.cardIndex`.
- The snapshot effect at `992–1030` writes `currentCardIdx` and caption.
- `presentationCardsFromNarrationSegments` populates `unitBackedCards` at `2822–2853`.
- `currentUnitCard` selects `unitBackedCards[currentCardIdx]` at `4383–4387`.
- JSX checks `currentUnitCard` before legacy stage branches at `4815–4848`.

### Legacy but still production-reachable

- `cardsToSync`: retained in stream/audio layout state, queue entries, and compatibility fallbacks.
- `cardTrigger`: normalized from `payload.showCard` at `2295–2315`, then used across branches `2431–3230`.
- `kind: 'cards'`: `1936–1943`, for no-unit legacy multi-card turns.
- `kind: 'single'`: `942–950`, `1627–1634`, and `1957–1965`.
- `resolveCardsFromTrigger`: `1392–1427` and fallback use at `3150–3178`.
- `DepartmentCardStage`: info-slide/legacy department rendering at `4868–4874`.
- `LeadershipOverview`: legacy `activeCards` and HOD fallback at `4831–4842` and `4877–4883`.
- `DepartmentFeesCard`, `Trustees`, principal, and vice-principal cards: can render from stage flags when no `currentUnitCard` is present.
- Course Menu sends a backend request with `localIntent`; it is not itself a direct card renderer after the route change.

### Potential conflict points

The `90d6f69` guards require an empty unit plan before the audio callback installs `kind: 'cards'` or `kind: 'single'`. This blocks the previously identified direct stale-scene override in the normal valid-plan case. It does not remove the old state graph: stage flags, `activeCards`, `cardsToSync`, `cardTrigger`, and fallback loaders remain reachable from asynchronous payload/audio branches.

`activateByUnitId` is called from audio playback (`1896`), failed-clip recovery (`2135`), and manual seek (`4036`). `PresentationEngine` rejects unknown/out-of-order activations and emits `SCENE_ACTIVATE_REJECTED`, but ChatScreen has no single structured trace joining those events to the originating transcript and clip.

## 4. State ownership table

| State | Owner | Writers/readers | N-unit risk |
|---|---|---|---|
| `currentCardIdx` | Intended: PresentationEngine snapshot | snapshot effect, resets, manual seek, legacy renderers | Duplicate local reset/manual writers remain. |
| active scene | PresentationEngine | `activateByUnitId`, `activateBySectionId`, `jumpToCardIndex`, audio callbacks | Safe only when turn ownership accepts the call. |
| scenes | PresentationEngine | `loadPresentation` plan/cards/single | Three load kinds remain. |
| `unitBackedCards` | narration plan payload | reset and renderer | Canonical identity coexists with legacy stage flags. |
| `cardsToSync` | legacy ChatScreen audio/layout state | queue and fallback branches | Can affect non-unit turns; guarded for valid unit plans. |
| `cardTrigger` | backend `showCard` payload normalization | numerous stage branches | Still controls compatibility state and layout. |
| localization | LanguageContext + payload | `presentationLanguage`, freeze calls, component fallback | Runtime proof incomplete because no transcript was captured. |
| narration plan | `narrationPlanRef` | payload effect and audio recovery | Canonical, but audio glue also supports legacy plans. |
| audio queue | M5.8 scheduler plus ChatScreen stream refs | playback callbacks and failure recovery | M5.8 files were not changed; boundary needs live trace. |

## 5. Original versus current pipeline

Historical ChatScreen code used `showCard`/`cardTrigger` to select frontend stage flags and card arrays, then rendered `DepartmentCardStage`, `LeadershipOverview`, or fee/principal/trustee components using local `currentCardIdx`. Local intent and frontend aliases could select cards without a canonical backend unit plan.

M5.9/M5.10 introduced independent ContentUnits, ordered narration segments with `unitId`, and PresentationEngine scene ownership. The migration added canonical plan handling but retained legacy surfaces for non-unit-backed flows, Course Menu compatibility, campus/brochure/document surfaces, and fallback behavior.

Therefore the current code is a hybrid, not a fully retired old architecture. The guards are a compatibility boundary, not proof that the old paths are unreachable.

## 6. Synthetic E2E versus real browser

The passing HOD E2E harness (`frontend/e2e/m53-hod-identity.spec.ts`, `m52-card-tts.spec.ts`) does this:

```text
page.addInitScript
  → replace window.WebSocket with MockClaraWebSocket
  → call window.__CLARA_TEST_SEND_MESSAGE(text)
  → mock constructs unitIds, narration_plan, ttsText, cardIndex
  → override HTMLMediaElement.play
  → dispatch synthetic audio ended events
  → assert __CLARA_M52_DEBUG / DOM
```

It bypasses Chrome SpeechRecognition, microphone permissions, actual transcript wording, real backend language detection, parser, ResponseDecision, UnitSelector, locale resolution, Sarvam/audio delivery, and real timing. It proves the frontend can consume a well-formed plan; it does not prove the kiosk can create that plan.

## 7. Real browser trace and first divergence

Previously captured live Chrome evidence reached:

```text
selected UI: Kannada
SpeechRecognition.lang: kn-IN
button: Listening...
onresult/final transcript: absent
user_message WebSocket request: absent
backend parser/decision/unit plan: not reached
card/TTS transition: not reached
```

The first proven microphone-path divergence is Chrome SpeechRecognition → final transcript. No parser or UnitSelector conclusion is justified from that attempt.

A separate live failure was reproduced during frontend UI investigation: a fresh browser request to `localhost:5176` returned `ERR_CONNECTION_REFUSED`; lazy image imports consequently failed. After Vite was started, the same page rendered trustee/image content and the asset errors disappeared. The current launch workflow does not keep the frontend service alive across terminal-session teardown.

No real Kannada utterance was captured during this audit, so stages after SpeechRecognition are not live-proven.

## 8. Localization and content-source findings

Explicit language selection is stored by `session_language.py` with `is_language_auto=False`; `main.py` skips auto-detection for that session. ChatScreen derives `presentationLanguage` from payload language when present, applies `freezeLocalization`, and passes the selected language to unit-aware renderers.

This ownership is source-supported but not live-proven for a real spoken turn because no final transcript reached the backend.

The CSE Data Science management fee is currently ₹3,00,000 in backend narration/adapter/locale data and the frontend `DepartmentFeesCard` map. The values match, but the frontend still independently stores the amount map, so the architecture has duplicate sources of truth.

## 9. Root-cause ranking

### P0

1. Frontend service lifecycle: port 5176 is not persistent, causing genuine asset/component load failures.
2. Real Chrome SpeechRecognition has not produced a final transcript in the observed Kannada attempts; backend stages cannot run without it.

### P1

1. ChatScreen is still a mixed-generation coordinator with reachable legacy state and three presentation load kinds.
2. There is no single structured runtime trace correlating microphone, backend turn, plan, scene, visible unit, and TTS clip.
3. Frontend fee values are duplicated outside the canonical ContentUnit path.

### P2

1. Repeated React animation shorthand/non-shorthand warnings were visible but did not prevent rendering once Vite was healthy.
2. Course Menu and other non-unit surfaces need a formally documented compatibility boundary.

## 10. Minimal correction plan — not implemented

1. Stabilize service startup and verify 6969/5176/5177 before browser tests.
2. Add temporary structured trace points without changing routing or aliases.
3. Capture one real deterministic Kannada phrase and verify `onresult`, `isFinal`, `recognition.lang`, and outbound `user_message`.
4. Only after transcript delivery is proven, trace parser → UnitSelector → narration plan.
5. If a valid plan reaches ChatScreen, capture all `loadPresentation` and `activateByUnitId` results to prove or disprove legacy interference.
6. Define and enforce the safe boundary for legacy surfaces; do not delete them blindly.
7. Unify fee rendering behind resolved ContentUnit data after a runtime source trace proves it is needed.

## 11. What must not change

- `frontend/src/lib/tts/responseTtsScheduler.ts`
- `frontend/src/lib/tts/ackAudio.ts`
- parser aliases or a new regional pipeline before real STT evidence
- Course Menu or compatibility surfaces without reachability proof
- unrelated working-tree files

## Conclusion

The source confirms that ContentUnit → narration_plan → PresentationEngine exists and is intended to own valid unit-backed presentations. It is not the only executable presentation architecture: legacy ChatScreen state and loaders survive the migration. However, the first proven live regional failure currently occurs earlier, at Chrome SpeechRecognition’s missing final transcript, and the frontend service itself can independently disappear from port 5176. The next implementation decision must wait for a persistent runtime and a captured real transcript.
