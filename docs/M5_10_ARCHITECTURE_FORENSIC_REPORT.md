# M5.10 deterministic architecture forensic report

Date: 2026-08-26  
Scope: current HEAD `192d118487ab455ec79de13347563ac48fe429c1`  
Mode: deterministic fixtures only; no Chrome speech test, parser test, UnitSelector test, or production fix

## Conclusion

The canonical unit-backed presentation path is deterministic-correct in isolation:

```text
narration_plan
  -> planToScenes
  -> PresentationEngine.loadPresentation(kind='plan')
  -> play / per-clip audio completion
  -> activateByUnitId
  -> snapshot.cardIndex + snapshot.activeScene.unitId
  -> ChatScreen snapshot effect (currentCardIdx)
  -> card renderer / M5.8 TTS consumer
```

The architecture is **not fully proven correct**. The first deterministic failure is an unguarded legacy call to `PresentationEngine.loadPresentation(kind='single'|'cards')` after a valid plan: `loadPresentation` atomically replaces the current scenes. The current ChatScreen code contains ownership guards intended to prevent this call, but this suite did not mount the full ChatScreen asynchronous effect graph, so it cannot prove every race is excluded.

No fix was implemented.

## Test implementation and results

Added:

`frontend/src/features/chat/presentation/__tests__/m510ArchitectureForensic.test.ts`

The suite uses the real `planToScenes`, `PresentationEngine`, `activateByUnitId`, audio-end transition, and `snapshot()` APIs. It does not set `currentCardIdx` manually or mock the final visible-card state.

Results:

```text
M5.10 forensic suite + existing presentation suites: 65 passed, 0 failed
TypeScript: npm run lint (tsc --noEmit) passed
```

The new suite covers 30 multilingual N-unit cases: five sequences in each of `en`, `kn`, `hi`, `ta`, `te`, and `ml`.

Every case produced:

```text
scene unitIds == requested unitIds
activateByUnitId == true in order
snapshot.cardIndex == 0..N-1
snapshot.activeScene.unitId == requested unitId
snapshot.activeScene.spokenSummary == that unit's TTS fixture
```

The critical three-unit case remained:

```text
cse_ds.hod -> cse_ds.fees -> events.techvidya
cardIndex: 0 -> 1 -> 2
TTS:       hod -> fees -> TechVidya
```

The test suite proves the engine contract, not the backend's ability to produce these plans and not the DOM's ability to mount every ChatScreen branch.

## Exact current architecture

```text
Backend payload.narration_plan
  -> ChatScreen effect (ChatScreen.tsx:843-979)
  -> unitIdsFromSegments()
  -> shouldLoadUnitPlan()
  -> freezeLocalization()
  -> PresentationController.loadPresentation(kind='plan')
  -> PresentationEngine.loadPresentation()
  -> planToScenes()
  -> PresentationEngine.play()
  -> per-clip audio callback
  -> PresentationEngine.activateByUnitId(unitId)
  -> PresentationEngine.snapshot()
  -> ChatScreen snapshot subscription (ChatScreen.tsx:992-1030)
  -> setCurrentCardIdx(snapshot.cardIndex)
  -> rendered unit-backed card selection
  -> response TTS scheduler / clip unit identity
```

## Failure matrix

| Test group | Plan received | Scene IDs/unit IDs | Activation | cardIndex | Visible unit | TTS unit | Result |
|---|---|---|---|---|---|---|---|
| 30 multilingual sequences | Yes, fixture | Correct and ordered | A→B→C… accepted | 0→1→2… | Matches snapshot active scene | Matches scene spokenSummary | Pass |
| Critical KN HOD/fees/TechVidya | Yes, fixture | Correct and ordered | All accepted | 0→1→2 | HOD→fees→TechVidya | Matching unit fixture | Pass |
| Guarded legacy condition | Yes, valid unit plan | Guard sees unit IDs | Legacy single/cards refused by helper | Unchanged | Canonical plan retained | Not replaced | Pass |
| Unguarded direct legacy load | Yes, valid unit plan | Legacy scene replaces plan | N/A after replacement | Resets to 0 | `unitId=null` | Legacy text | **First architecture failure** |
| Missing unitId segments | Invalid/incomplete plan | No invented unit | No unit fallback | N/A | Fail closed | N/A | Pass |

## Legacy ChatScreen reachability audit

| Legacy mechanism | Current location | Caller/condition | Reachable in source? | Can override canonical plan? |
|---|---|---|---|---|
| `cardTrigger` | `ChatScreen.tsx:2295-3230` | Payload `showCard`/trigger normalization and stage branches | Yes | Yes, if a branch changes layout/stage after plan handling |
| `cardsToSync` | `ChatScreen.tsx:291`, audio/layout paths around `1710-2202`, `3357+` | Legacy card arrays and streaming metadata | Yes | Yes, if a legacy loader is reached |
| `kind:'cards'` | `ChatScreen.tsx:1916-1944` | Only when plan has zero unit IDs plus legacy guard | Yes | Guarded in normal unit-plan case; direct caller can override |
| `kind:'single'` | `ChatScreen.tsx:944-979`, `1946-1966`, other stage/UI paths | Missing/legacy plan or explicit UI/stage path | Yes | Guarded in the audio fallback; other UI paths remain separate owners |
| Legacy renderer | `ChatScreen.tsx:4815-4884` and stage branches | Stage flags, `activeCards`, department/campus renderers | Yes | Yes, if stage state is changed by a competing payload/effect |
| Snapshot/current index | `ChatScreen.tsx:1011` plus reset/manual writers | Snapshot is canonical during active presentation; reset/manual paths remain | Yes | Reset writers can affect a new turn or explicit UI seek; they are not all impossible during races |

Important distinction: the helper guard passes; the underlying engine has no protection against an unguarded replacement. The exact function responsible for the observed deterministic override is `PresentationEngine.loadPresentation`, whose documented behavior is atomic replacement.

## Language-freeze result

The fixture matrix retained `en`, `kn`, `hi`, `ta`, `te`, and `ml` metadata for every plan, and unit order/content identity remained unchanged. However, `NarrationPlanInput` and `PresentationEngine` do not themselves carry or enforce `language_code_key`; the production payload carries language outside the engine plan and ChatScreen applies localization freezing. Therefore this deterministic suite proves unit identity under multilingual fixture metadata, but **does not prove full locale resolution or stale React-language rejection**.

## Original versus current implementation

The older implementation at commit `69d2106` used a local playback state machine:

```text
audio clip
  -> ontimeupdate / duration estimate
  -> setCurrentCardIdx(index)
  -> cardsToSync array renderer
  -> onended queues the next audio item
```

It selected a card by array position and advanced `currentCardIdx` directly. That explains why the old path could visibly advance a deck, but it also created multiple presentation/audio owners and allowed a card array to diverge from a unit identity.

The current implementation moved canonical response presentation to:

```text
narration_plan segment.unitId
  -> planToScenes
  -> PresentationEngine sceneIndex/cardIndex
  -> activateByUnitId
  -> snapshot-driven ChatScreen index
```

This fixes identity/order at the engine level. The migration did not delete every old stage, `cardsToSync`, or legacy loader; it added guards around the normal audio fallback. The remaining risk is therefore not a failure of the canonical engine sequence, but an asynchronous or alternate caller that invokes an old loader after the plan.

## First failure boundary and ranking

1. **P0 — Not established by this deterministic suite:** backend/parser/STT/runtime production failure. This suite intentionally does not exercise those layers.
2. **P1 — Proven latent architecture failure:** an unguarded `PresentationEngine.loadPresentation(kind='single'|'cards')` replaces a valid N-unit plan. Responsible function: `PresentationEngine.loadPresentation` atomic replacement, combined with any caller that bypasses `shouldAllowLegacySingle` / `shouldLoadUnitPlan`.
3. **P1 — Unproven ChatScreen race risk:** legacy `cardTrigger`, `cardsToSync`, stage flags, and alternate renderer branches remain executable. The source guards reduce the normal override path, but a mounted asynchronous integration test is still required to prove precedence under same-turn/stale payload ordering.
4. **P2 — Contract gap:** language is not part of the `PresentationEngine` plan type, so engine-level tests cannot independently prove payload language authority.

## Scope boundary

Not run in this phase:

- live Chrome or SpeechRecognition
- typed-input comparison
- backend WebSocket/parser/UnitSelector execution
- real locale-content resolution
- real TTS provider playback
- commit or push

The working tree's unrelated existing changes were not staged or modified.
