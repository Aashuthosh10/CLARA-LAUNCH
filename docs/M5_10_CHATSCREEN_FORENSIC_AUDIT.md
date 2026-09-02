# M5.10 ChatScreen Architecture Forensic Audit

Date: 2026-08-26  
Repository: `Naveenkumar2027/clara_finished-.git`  
Branch: `main`  
Local HEAD: `192d118487ab455ec79de13347563ac48fe429c1`  
Remote `clara_finished/main`: `192d118487ab455ec79de13347563ac48fe429c1`

This is an audit-only document. No production code was changed, committed, or pushed during this audit.

## 1. Frozen state

The working tree already contained unrelated changes before this audit:

- `backend/data/locales/en.json`
- `backend/tests/test_groq_completion_params.py`
- `docs/M5_5_FULL_SYSTEM_RECOVERY_REPORT.md`
- `scripts/m55_recovery_probe.py`
- untracked `docs/M5_10_KN_CARD_REGRESSION_FORENSIC.md`

These files were not staged or modified.

Relevant history, oldest to newest:

| Commit | Finding |
|---|---|
| `69d2106` | First deterministic `narration_plan` card-narration synchronization in the older ChatScreen architecture. |
| `72de7dd` | Universal N-unit selection and session-language presentation. |
| `2ff85a6`, `b7bb1eb` | M5.8 response TTS queue, ACK separation, turn fencing, and pipelining. M5.8 remains frozen. |
| `9790086`, `95301cb`, `f9adc57` | Business Systems, independent campus/event/person units, and generic unit narration. |
| `0fe1ab9` | Kannada language pipeline changes across backend, narration, and ChatScreen. |
| `b455d89` | PresentationEngine ownership restoration and unit-based scene transitions. |
| `7b5bd8f` | Course-menu presentation route consolidation. |
| `78e3e2c` | Kannada STT card-variant normalization. |
| `90d6f69` | Stale legacy card-scene quarantine and CSE Data Science fee source alignment. |
| `192d118` | Partial valid-unit preservation and browser SpeechRecognition error diagnostics. |

## 2. Current architecture proven by source

```text
Chrome SpeechRecognition / UI action
        ↓
ChatScreen interceptAndSendMessage
        ↓ WebSocket callback from parent
payload.narration_plan
        ↓ ChatScreen effect at lines 828–990
freezeLocalization + PresentationController.loadPresentation(kind='plan')
        ↓
PresentationEngine.planToScenes
        ↓
PresentationEngine snapshot
        ↓ ChatScreen effect at lines 992–1030
currentCardIdx = snapshot.cardIndex
        ↓
currentUnitCard = unitBackedCards[currentCardIdx]
        ↓
unit-aware card renderer
        ↓
M5.8 response TTS scheduler / audio clip unitId
```

The canonical unit-backed path exists and is wired correctly in source. It is not, however, the only executable path.

## 3. Historical/original architecture still present

```text
showCard / cardTrigger
        ↓
ChatScreen stage flags and activeCards/cardsToSync
        ↓
DepartmentCardStage / LeadershipOverview / DepartmentFeesCard / Trustees
        ↓
currentCardIdx local indexing
```

This older surface remains necessary for non-unit-backed compatibility flows, but it is still production code inside the same 5,098-line ChatScreen and shares state with the unit-backed path.

## 4. ChatScreen state ownership

| State | Intended owner | Other writers/consumers | Can run during N-unit plan? | Assessment |
|---|---|---|---|---|
| `currentCardIdx` | PresentationEngine snapshot effect, lines 992–1030 | turn reset, course-menu reset, manual `handleCardSelect` | Yes | Canonical during active plan, but local resets/manual seek remain reachable. |
| active scene | PresentationEngine snapshot | `activateByUnitId`, `activateBySectionId`, `jumpToCardIndex`, audio callbacks | Yes | Engine-owned; activation may be rejected by turn/order guards. |
| presentation scenes | PresentationEngine | six `loadPresentation` callers | Yes | `kind='plan'` is canonical, but `single` and `cards` are still available. |
| `unitBackedCards` | narration-plan payload processing, lines 2822–2853 | reset to null at turn boundaries | Yes | Correct model source, but renderer also checks legacy stage flags. |
| `cardsToSync` | legacy audio/layout state | stream queue, legacy loaders, fallback renderer | Yes | Still passed through many audio paths; guarded but not removed. |
| `showCard` / `cardTrigger` | backend payload / normalization at lines 2295–2315 | stage selection branches 2431–3230 | Yes | Still drives compatibility branches and can affect layout/stage state. |
| `showCard` visual state | no local setter; derived from payload/stage state | layout and stage branches | Yes | Shared payload metadata still influences split/full layout. |
| narration plan | `narrationPlanRef` from payload | audio playback and failed-clip recovery | Yes | Canonical identity source, but audio code has legacy fallback branches. |
| localization | LanguageContext plus `presentationLanguage` from payload | `freezeLocalization` at lines 884, 943, 961 | Yes | Correct freeze exists; several card components still have their own fallback language/data. |
| audio state | M5.8 scheduler plus ChatScreen queue refs | `handleAudioPlayback`, stream effects, failure recovery | Yes | M5.8 scheduler remains owner, but ChatScreen still contains substantial orchestration glue. |
| turn ownership | `lastLoadedPresentationTurnRef`, audio owner refs, session generation | payload effect and audio callbacks | Yes | Guards exist, but multiple asynchronous entry points remain. |

## 5. Complete presentation-path inventory

### Canonical unit-backed path

- `payload.narration_plan` is recognized at lines 843–860.
- Unit IDs are extracted with `unitIdsFromSegments`.
- `freezeLocalization` is called using payload language and `language_code_key`.
- `ctrl.loadPresentation({ kind: 'plan', ... })` is called at lines 886–902 and 963–979.
- `PresentationEngine` converts plan segments to scenes.
- `PresentationEngine` snapshot drives `setCurrentCardIdx(snap.cardIndex)` at line 1011.
- `presentationCardsFromNarrationSegments` populates `unitBackedCards` at lines 2822–2853.
- `currentUnitCard` maps the snapshot index to the unit-backed model at lines 4383–4387.
- Unit-aware renderers are selected before the legacy stages at lines 4815–4848.

### Legacy-but-required paths

- `kind: 'single'` is used for trustee narration, fallback single-card display, and executive/compatibility surfaces.
- `kind: 'cards'` is used for legacy overview/card arrays when there is no unit-backed plan.
- `DepartmentCardStage` remains the renderer for info slides and legacy department placement/slide surfaces.
- `LeadershipOverview` remains the renderer for legacy `activeCards` and HOD fallback state.
- `DepartmentFeesCard`, `Trustees`, and executive cards can render from stage flags when no `currentUnitCard` is available.
- Course Menu remains an explicit UI surface and sends a backend request with `localIntent`; it is not itself a direct card renderer after the M5.10 route change.

### Still reachable compatibility branches

The following production branches are still reachable from `handleAudioPlayback` and payload processing:

```text
ChatScreen.tsx:942–950       kind='single' fallback after contract failure
ChatScreen.tsx:1627–1634     trustee single presentation
ChatScreen.tsx:1936–1943     kind='cards' legacy multi-card fallback
ChatScreen.tsx:1957–1965     kind='single' legacy fallback
ChatScreen.tsx:2683         legacy department slide array
ChatScreen.tsx:3009         legacy slide array
ChatScreen.tsx:3035         legacy full-department card array
ChatScreen.tsx:3075         legacy synchronized card array
ChatScreen.tsx:3150–3178    resolveCardsFromTrigger/cardTrigger fallback
```

The important protection added by `90d6f69` is real: the `kind='cards'` and `kind='single'` audio fallbacks require `unitIdsFromSegments(...).length === 0`, and `shouldAllowLegacySingle`. This prevents the known stale legacy scene from overriding a valid unit-backed plan in the normal case. It does not retire the old architecture or prove that every asynchronous race is impossible.

## 6. Card-index writers and transition risks

Actual `setCurrentCardIdx` writers are:

- line 1011: PresentationEngine snapshot, intended canonical writer.
- line 1047: `clearCardStages` turn/reset cleanup.
- line 1141: voice-turn reset in `interceptAndSendMessage`.
- line 2605: Course Menu reset.
- line 4062: non-presenting/manual fallback in `handleCardSelect`.

`handleCardSelect` also calls `jumpToCardIndex` and `activateByUnitId` during presentation. That is valid manual seeking, but it is another state transition path separate from streamed audio.

The unit-backed renderer is selected first, but the final JSX still has legacy branches keyed by `isHodStage`, `isFeesStage`, `isDepartmentOverviewStage`, `isDocumentsStage`, `isTrusteesStage`, `activeCards`, and `courseMenuOptions`. These flags are cleared and set in many payload branches. They are therefore architectural competition points even when they do not win over `currentUnitCard`.

## 7. Passing E2E path versus real browser path

The passing HOD E2E tests use:

```text
reachReadyChat
  → page.goto(...?e2e=1)
  → mocked WebSocket installed in page.addInitScript
  → window.__CLARA_TEST_SEND_MESSAGE(text)
  → ChatScreen interceptAndSendMessage
  → MockClaraWebSocket.send
  → synthetic narration_plan payload
  → PresentationEngine
  → __CLARA_M52_DEBUG assertions
```

Concrete bypasses in `frontend/e2e/m53-hod-identity.spec.ts` and `m52-card-tts.spec.ts`:

- SpeechRecognition is never used.
- The browser microphone is never used.
- The real backend WebSocket is replaced with a mock class.
- The real parser, ResponseDecision, UnitSelector, locale resolver, and narration builder are bypassed.
- The test itself creates the `unitId`, `displayText`, `ttsText`, `cardIndex`, and `narration_plan`.
- Audio is neutralized by overriding `HTMLMediaElement.prototype.play`.
- The test advances clips by dispatching a synthetic `ended` event.

This proves the frontend can consume a correctly formed synthetic unit plan. It does not prove the real regional pipeline.

## 8. Real browser evidence

Previously captured real Chrome attempts reached:

```text
Tap to speak
  → Listening...
  → SpeechRecognition configured with kn-IN
  → no final transcript
  → no user_message WebSocket request
  → no backend parser/decision/unit/narration payload
  → no card transition to diagnose
```

The browser console reported a browser SpeechRecognition error on an earlier attempt. Because no final transcript was produced, the first proven regional failure is before the backend: Chrome SpeechRecognition did not deliver a transcript. This is not evidence of a parser failure.

During this audit, a separate service-layer failure was also reproduced: the Vite process stopped listening on port 5176 after a previous terminal session ended. A fresh Chrome tab then returned `net::ERR_CONNECTION_REFUSED`. Restarting Vite temporarily restored the UI and lazy image imports. The frontend dev service is therefore not persistent in the current launch workflow.

No real Kannada utterance was captured during this audit, so the stages after SpeechRecognition are not live-proven.

## 9. Localization ownership

Current source path:

```text
payload.language_code_key / language
  → languageFromPayload(payload) ?? LanguageContext.language
  → presentationLanguage
  → localizationCodeKey
  → freezeLocalization
  → useCollegeData(presentationLanguage)
  → unit/card renderer language prop
```

The backend manual-language guard exists in `session_language.py`; explicit selection sets `is_language_auto=False`, and auto-detection is skipped afterward. Source therefore supports stable explicit Kannada ownership. Live proof is incomplete because the real transcript stage has not succeeded.

Potential fallback points that require runtime tracing, not assumptions:

- `languageFromPayload(payload) ?? language` in ChatScreen.
- Per-component `languageProp || contextLanguage` fallback.
- `FEES_COPY_BY_LANGUAGE[language] ?? English` in `DepartmentFeesCard`.
- frontend card data that is independently stored instead of resolved from ContentUnit.

## 10. Fee source ownership

The current CSE Data Science management fee is numerically aligned at ₹3,00,000 in:

- `backend/services/narration_plan.py` `_FEES_AMOUNT_BY_KEY`.
- `backend/services/content/adapters.py` through the canonical fees adapter.
- backend locale fee data.
- `frontend/src/components/chat/cards/DepartmentFeesCard.tsx` `MANAGEMENT_QUOTA_FEE_BY_KEY`.

The value is currently equal, but the frontend card still owns a duplicate static amount map. Therefore visible fee and TTS are not guaranteed by a single source in the implementation structure; equality is current state, not architectural proof.

## 11. Root-cause ranking

### P0

1. **Real microphone boundary is unproven/failing before transcript.** Chrome SpeechRecognition reaches listening but has not delivered a final transcript, so the backend cannot receive or process the spoken turn.
2. **Frontend dev-service lifecycle is unstable.** Port 5176 can disappear, causing lazy-loaded UI components and assets to fail with `ERR_CONNECTION_REFUSED`.

### P1

1. **ChatScreen remains a mixed-generation presentation coordinator.** Canonical plan presentation and legacy stage/card-array presentation share state, payload routing, and audio callbacks. `90d6f69` narrows the conflict but does not remove the competing paths.
2. **The browser trace is insufficiently correlated.** Console diagnostics are mostly rendered as `Object`, and there is no single browser-visible trace carrying transcript → parser → unit → scene → TTS identity.
3. **Frontend fee content remains duplicated from backend ContentUnit data.** Current values match but can drift again.

### P2

1. React reports repeated shorthand/non-shorthand animation style warnings. These were visible in the live console but did not prevent the restored UI from rendering.
2. Course Menu and non-unit surfaces need an explicit documented compatibility boundary.

## 12. Exactly what must change next

1. Make the frontend service startup persistent and verify ports 6969/5176/5177 before browser testing.
2. Add one correlated diagnostic trace at the actual frontend/backend boundary, without changing semantic behavior.
3. Capture a real deterministic Kannada phrase: `CSE Data Science HOD ಮತ್ತು fees`.
4. Compare its actual transcript with the synthetic E2E input.
5. Only if the transcript reaches the backend, trace parser and UnitSelector; do not add aliases before that evidence.
6. If a valid unit plan reaches ChatScreen, trace whether any legacy stage branch loads afterward and whether `activateByUnitId` returns true or rejects.
7. Define a safe boundary for legacy `kind='single'`/`kind='cards'` surfaces. Do not delete them until each remaining caller is classified.
8. Move fee display data behind the resolved ContentUnit adapter once the runtime trace proves the visible/TTS divergence.

## 13. What must not change

- Do not modify `frontend/src/lib/tts/responseTtsScheduler.ts`.
- Do not modify `frontend/src/lib/tts/ackAudio.ts`.
- Do not add regional aliases or a second regional pipeline before transcript and parser evidence.
- Do not delete Course Menu or compatibility paths blindly.
- Do not treat mocked E2E success as real microphone acceptance.
- Do not stage the unrelated working-tree files listed above.

## Audit conclusion

The current ContentUnit → narration_plan → PresentationEngine path is implemented and is the intended owner for valid unit-backed plans. It is not the sole executable presentation architecture: ChatScreen still contains reachable legacy stage, card-array, and single-scene paths. The existing guards reduce direct override risk, but source alone cannot prove that asynchronous payload/audio ordering never enters a legacy branch.

The first currently proven live failure is earlier than ChatScreen: Chrome has not delivered a final microphone transcript. The separately reproduced port-5176 outage can also prevent frontend components from loading at all. A real Kannada end-to-end architectural conclusion must wait until the service is persistent and an actual transcript is captured.
