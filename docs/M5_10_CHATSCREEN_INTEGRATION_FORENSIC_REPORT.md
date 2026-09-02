# M5.10 ChatScreen architecture integration forensic

Date: 2026-08-26  
HEAD: `192d118487ab455ec79de13347563ac48fe429c1`  
Scope: deterministic mounted ChatScreen integration only; no live speech, parser, UnitSelector, TTS-provider, or production fix

## Verdict

**CHATSCREEN IS NOT BLOCKING CANONICAL PRESENTATION in the tested mounted path.**

The real mounted ChatScreen consumed the backend-shaped N-unit payload, loaded the canonical plan through the real presentation controller and `PresentationEngine`, advanced by `activateByUnitId`, and rendered the ordered visible unit sequence. Same-turn `cardTrigger`/`cardsToSync` legacy frames and a previous-turn `single` frame did not replace the plan in the tested flow.

This is bounded evidence, not live-browser acceptance. It proves the tested React/effect path, not every possible asynchronous payload permutation.

## Test added

`frontend/e2e/m510-chatscreen-integration.spec.ts`

The test mounts the actual application and actual `ChatScreen`; it does not mock `PresentationEngine`, manually set `currentCardIdx`, or inject a final rendered card state. It uses a deterministic WebSocket fixture only to provide backend-shaped payloads.

The fixture sends, in order:

1. language/session onboarding frames
2. a valid `narration_plan` with `cse_ds.hod → cse_ds.fees → events.techvidya`
3. same-turn legacy `showCard/cardTrigger='hod'` plus `cardsToSync`
4. previous-turn legacy `single`
5. same-turn legacy `cards` plus `cardsToSync`

The test then ends each real current audio element through the existing test hook and observes the mounted UI/debug state.

## Results

```text
English     PASS
Kannada     PASS
Hindi       PASS
Tamil       PASS
Telugu      PASS
Malayalam   PASS

Mounted integration: 6 passed
Canonical sequence per language: cse_ds.hod → cse_ds.fees → events.techvidya
cardIndex per language: 0 → 1 → 2
visible unitId per language: cse_ds.hod → cse_ds.fees → events.techvidya
TTS fixture identity per language: same unit order
```

The existing deterministic presentation suites remain green: `65/65` tests passed and `npm run lint` passed.

## Exact mounted path

```text
deterministic backend-shaped WebSocket payload
  -> useWebSocket payload state
  -> ChatScreen payload sync effect
  -> turn fence adopts m510-mounted
  -> unitIdsFromSegments()
  -> shouldLoadUnitPlan()
  -> freezeLocalization(payload language)
  -> presentationRef.current.loadPresentation(kind='plan')
  -> PresentationEngine.planToScenes()
  -> PresentationEngine.play()
  -> real ChatScreen audio/playhead callback
  -> PresentationEngine.activateByUnitId(next unitId)
  -> PresentationEngine.snapshot()
  -> ChatScreen snapshot subscription
  -> currentUnitCard/currentCardIdx
  -> rendered `[data-current-unit-id]`
```

## Observed sequence

For all six language cases:

```text
plan received:       [cse_ds.hod, cse_ds.fees, events.techvidya]
engine scenes:       [cse_ds.hod, cse_ds.fees, events.techvidya]
after first clip:    cardIndex=0, visible=cse_ds.hod
after second clip:   cardIndex=1, visible=cse_ds.fees
after third clip:    cardIndex=2, visible=events.techvidya
TTS unit association:[cse_ds.hod, cse_ds.fees, events.techvidya]
```

The test asserts the final visible identity from the mounted DOM attribute and the engine/debug state; it does not derive visibility from a manually incremented index.

## Legacy interference result

The deliberate legacy frames were delivered after the canonical plan. The canonical unit list, engine active unit, card index, and rendered DOM unit remained unchanged while the test advanced the three clips.

| Mechanism | Source reachability | Tested after valid plan | Observed override |
|---|---|---|---|
| `cardTrigger` / `showCard` | `ChatScreen.tsx:2295-3230` | Same-turn `hod` | No |
| `cardsToSync` | `ChatScreen.tsx:291`, `1710-2202`, `3357+` | Same-turn `hod`/`cards` | No |
| `kind:'single'` fallback | `ChatScreen.tsx:944-979`, `1946-1966` | Previous-turn `single` payload | No |
| `kind:'cards'` fallback | `ChatScreen.tsx:1916-1944` | Same-turn `cards` payload | No |
| snapshot/current index | `ChatScreen.tsx:1011` | Every clip | Correct `0→1→2` |
| legacy render branches | `ChatScreen.tsx:4815-4884` | Same-turn stage metadata | No visible replacement |

The underlying `PresentationEngine.loadPresentation` replacement behavior remains a latent hazard if a caller invokes a legacy loader without the ChatScreen ownership guard. This mounted test did not find such a violating caller in the exercised sequence.

## Presentation writers inventory

| Writer | Location | Trigger | State/API modified | Classification | Can run after plan? |
|---|---|---|---|---|---|
| canonical plan loader | `ChatScreen.tsx:843-979` | `payload.narration_plan` with unit IDs | `loadPresentation(kind='plan')`, localization freeze | Canonical | Yes, for new/replacement turn |
| snapshot subscription | `ChatScreen.tsx:992-1030` | Engine snapshot | `currentCardIdx`, caption/runtime state | Canonical | Yes, every scene transition |
| streamed unit activation | `ChatScreen.tsx:1815-1900` | response audio clip metadata | `activateByUnitId`, playhead/audio state | Canonical | Yes, same turn |
| audio fallback cards | `ChatScreen.tsx:1916-1944` | no unit-backed plan plus legacy allowance | `loadPresentation(kind='cards')` | Legacy guarded | Source-reachable; not in valid-plan case |
| audio fallback single | `ChatScreen.tsx:1946-1966` | no unit-backed plan plus legacy allowance | `loadPresentation(kind='single')` | Legacy guarded | Source-reachable; not in valid-plan case |
| stage payload handler | `ChatScreen.tsx:2295-3230` | `showCard`/trigger metadata | stage flags, `activeCards`, `cardsToSync`, layout | Legacy/compatibility | Yes, but did not override tested plan |
| manual card selection | `ChatScreen.tsx:4007-4062` | user next/previous/select | `activateByUnitId`/jump plus explicit index state | Manual UI | Yes, by user action |
| reset/clear state | `ChatScreen.tsx:1046-1061`, `1080-1117` | new turn/reset/layout transition | cancels engine, clears models/index/stage flags | Lifecycle | Yes, when a new turn is fenced |
| renderer selection | `ChatScreen.tsx:4815-4884` | React state/model changes | renders department, HOD, fees, campus, leadership, legacy surfaces | Render | Yes, based on current state |

## React ordering and stale-turn behavior

The canonical plan effect runs from `payload` and loads the engine when the plan has unit IDs and `shouldLoadUnitPlan()` permits it. The payload sync effect first adopts/validates the turn fence. The mounted test proved that the plan remains authoritative when legacy payloads are delivered afterward in the same turn and from a previous turn.

The current code still has multiple effects and state writers. A race is therefore a source-level possibility, but this test provides no evidence that the tested same-turn/stale sequence causes an override. No claim is made for payload permutations not represented by the fixture.

## Language freeze

The mounted matrix passed for `en`, `kn`, `hi`, `ta`, `te`, and `ml` using the same unit sequence. Each payload carried its language code and name; the test verified that unit order and rendered unit identity did not change after legacy frames. This confirms ChatScreen did not collapse or reorder the regional plan in this mounted fixture.

It does not independently verify every locale content field or Sarvam language output, because those are outside this deterministic integration test.

## First failure boundary

There is **no product failure boundary in the completed mounted cases**. The first failed attempt was a test-fixture defect: the browser init script referenced the Node-side `UNITS` constant instead of serializing the list into the browser context. That caused the fixture to remain in “thinking”; it was corrected, and the same mounted test then passed all six locales.

The previously observed unguarded-engine replacement remains a latent boundary:

```text
valid plan loaded
  -> unguarded PresentationEngine.loadPresentation(kind='single'|'cards')
  -> atomic scene replacement
  -> unitId becomes null / legacy scene
```

The mounted ChatScreen test did not trigger that path after a valid plan.

## Original versus current

The original `69d2106` ChatScreen advanced a local `currentCardIdx` from audio duration/`ontimeupdate` and `cardsToSync`, then queued audio on `onended`. The current ChatScreen uses the engine snapshot as the canonical index and unit identity, while retaining legacy stage/card-array paths for compatibility.

The integration evidence supports the migration's intended behavior: canonical unit plans remain ordered and visible through ChatScreen. The remaining architectural concern is the number of retained legacy writers, not a reproduced override in this mounted scenario.

## Final scope decision

Do not modify ChatScreen, PresentationEngine, parser, aliases, UnitSelector, regional semantics, locale content, STT, or M5.8 based on this phase. The next investigation may return to the live/runtime pipeline because ChatScreen is not blocking this controlled valid-plan path.

No commit and no push were performed.
