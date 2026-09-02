# M5.10-KN-RECOVERY — Card regression forensic (audit only)

**Date:** 2026-08-21  
**Repository:** `Naveenkumar2027/clara_finished-` (`clara_finished` / `main`)  
**HEAD audited:** `0fe1ab99ca2f1e9576bed4974e468c5b0db04da9`  
**Parent (pre-Kannada-hardening):** `f9adc5755dac3332bf4cc2c076918daecb1fb94c`  
**Rule:** No production code was modified in this audit. No fix. No push.

**Frozen (confirmed untouched at HEAD vs TTS milestone commits):**

- `frontend/src/lib/tts/responseTtsScheduler.ts`
- `frontend/src/lib/tts/ackAudio.ts`

Last commits touching those files remain `b7bb1eb` / `2ff85a6`. Kannada Phase 2D (`0fe1ab9`) does not include them.

---

## Executive finding

This is **not** primarily a Kannada vocabulary miss for the examples in the recovery prompt.

At HEAD, every listed English and Kannada (pure + code-switch) card query **parses to CARD**, **selects the correct canonical `unitId`s**, and **maps narration from those units**.

The first incorrect state transition that explains the kiosk symptoms — first card speaks, next independent card does not become the visible active card; cards feel unreliable in regional flows — is **not** in the parser.

It is in **ChatScreen presentation ownership**:

1. **Who is allowed to own `currentCardIdx` is now split.**  
   Comment in `ChatScreen.tsx` still says PresentationEngine is the sole source of card index. Phase 2D-KN (`0fe1ab9`) added a second writer: `setCurrentCardIdx` from `unitBackedCardsRef` after `activateByUnitId`, **without checking the boolean return**. A later effect overwrites from `presentation.snapshot.cardIndex`. If activation is rejected, React is forced back to card 0.

2. **Campus / HOD / principal / VP / trustees / fees unit-backed turns are offered to audio as `isOverview: false` and `cardsToSync: null`.**  
   English “CSE HOD and CSE fees” takes a different branch (`isOverview: true` + `cardsToSync` slides). Kannada launch traffic (hostel + canteen + event, mixed leadership) stays on the unit-id / per_clip path. That is why English appears reliable and Kannada multi-card does not.

3. **A competing `kind: 'single'` presentation load (no `unitId` on scenes) plus `per_clip` `activateByUnitId` `unknown_unit` / `out_of_order` makes N units collapse to one visible scene.**  
   M5.8 still speaks clip 2. The visible card stays clip 1. That matches “TTS is fine, next card does not activate.”

Do not add more Kannada aliases to “fix” this. Aliases are not the first failing boundary for the listed examples.

---

## Verified pipeline (source at `0fe1ab9`)

```
raw input
  → parse_semantic_request          semantic_request_parser.py
  → resolve_response_decision       response_decision.py   CARD | ANSWER | CLARIFY | FALLBACK
  → select_content_units            unit_selector.py       sole unitId owner; N items → N units
  → resolve_unit                    content_unit_resolver.py
  → narrate_unit                    unit_narration.py      tts_text from the same ContentUnit
  → map_content_units_to_segments   surface_narration_mapper.py
  → WS showCard + narration_plan + language_code_key
  → ChatScreen                      showCard / unitBackedCards / currentCardIdx
  → PresentationEngine              activateByUnitId / per_clip order guard
  → visible card                    currentUnitCard = unitBackedCards[currentCardIdx]
  → M5.8                            speaks segment tts_text only
```

---

## A. Direct card request — live probe at HEAD

Probed with `parse_semantic_request` → `resolve_response_decision` → `select_content_units` → `map_content_units_to_segments`.

| Query | Lang key | Mode | Evidence | Units |
|---|---|---|---|---|
| CSE HOD | en, kn | CARD | semantic_request | `cse.hod` |
| Who is the CSE HOD? | en | CARD | semantic_request | `cse.hod` |
| CSE HOD ಯಾರು? | kn | CARD | semantic_request | `cse.hod` |
| ಸಿಎಸ್ಇ ವಿಭಾಗದ ಮುಖ್ಯಸ್ಥರು ಯಾರು? | kn | CARD | semantic_request | `cse.hod` |
| CSE Data Science HOD | en, kn | CARD | semantic_request | `cse_ds.hod` |
| CSE Data Science HOD ಯಾರು? | kn | CARD | semantic_request | `cse_ds.hod` |
| CSE fees / CSE ಶುಲ್ಕ | en, kn | CARD | semantic_request | `cse.fees` |
| CSE achievements / CSE ಸಾಧನೆ | en, kn | CARD | semantic_request | `cse.achievements` |
| CSE placements | en, kn | CARD | semantic_request | `cse.placements` |
| principal / ಪ್ರಾಂಶುಪಾಲರು | en, kn | CARD | semantic_request | `leadership.principal` |
| vice principal / ಉಪ ಪ್ರಾಂಶುಪಾಲರು | en, kn | CARD | semantic_request | `leadership.vice_principal` |
| trustees | en, kn | CARD | semantic_request | `leadership.trustees` |
| girls hostel rooms / ಹುಡುಗಿಯರ ಹಾಸ್ಟೆಲ್ ಕೊಠಡಿಗಳು | en, kn | CARD | semantic_request | `hostel.girls.rooms` |
| boys hostel fees | en, kn | CARD | semantic_request | `hostel.boys.fees` |
| canteen hygiene / ಕ್ಯಾಂಟೀನ್ ಸ್ವಚ್ಛತೆ | en, kn | CARD | semantic_request | `canteen.hygiene` |
| TechVidya | en, kn | CARD | semantic_request | `events.techvidya` |

**Classification for these strings:** not 1–6. Parser, decision, unit selection, content resolution, and narration bind correctly.

If a kiosk turn on these strings still shows no card, the first incorrect boundary is **after UnitSelector** (WS / ChatScreen / engine / renderer), not “Kannada detection.”

---

## B. Multi-card request — live probe at HEAD

| Query | Units (order preserved) |
|---|---|
| CSE HOD and CSE fees | `cse.hod`, `cse.fees` |
| CSE HOD ಮತ್ತು CSE ಶುಲ್ಕ | `cse.hod`, `cse.fees` |
| girls hostel rooms and canteen hygiene | `hostel.girls.rooms`, `canteen.hygiene` |
| CSE Data Science HOD and TechVidya | `cse_ds.hod`, `events.techvidya` |
| principal and trustees / ಪ್ರಾಂಶುಪಾಲರು ಮತ್ತು ಟ್ರಸ್ಟಿಗಳು | `leadership.principal`, `leadership.trustees` |

Backend does **not** collapse N units into one. `unit_selector.select_content_units` returns N ids. Narration segments are 1:1 with those ids. Spoken text for unit 2 does not copy unit 1’s topic.

**The drop from N units to one visible card happens in ChatScreen / PresentationEngine, not UnitSelector.**

---

## C. Regional vs English — same semantic path, different presentation branch

Desired architecture (still correct on the backend):

```
language-specific input
  → canonical (entity, topic)
  → canonical unitIds
  → locale pack for display + narrate_unit(lang)
  → same PresentationEngine
  → same M5.8 tts_text pipeline
```

Kannada Phase 2D did **not** add a second UnitSelector. It did add language-specific **input** cues and **templates**, which is allowed.

The **presentation** split is language-agnostic code that Kannada traffic hits more often:

| Shape | ChatScreen branch (`ChatScreen.tsx` ~2783–2941) | Audio offer |
|---|---|---|
| All HOD | `allHod` → `LeadershipOverview` | `isOverview: false`, `cardsToSync: null` |
| All fees (1) | `allFees` | `isOverview: false`, `cardsToSync: null` |
| All principal / VP / trustees | executive / trustees stage | `isOverview: false`, `cardsToSync: null` |
| All campus (hostel/canteen/event) | `campusOnly` → `CampusUnitCard` | `isOverview: false`, `cardsToSync: null` |
| Mixed dept (HOD + fees, overview + …) | `isDepartmentOverviewStage` | `isOverview: true`, `cardsToSync: slides` |

English “CSE HOD and CSE fees” uses the **last** row.  
Kannada “rooms + hygiene + TechVidya” uses **campusOnly**.  
Mixed “CSE DS HOD and TechVidya” uses the department-overview slide mapper even though unit 2 is an event — then the renderer switches to `CampusUnitCard` only if `currentCardIdx` actually moves.

That is why English mixed **department** cards still look like the reference, while Kannada multi-campus and mixed leadership/campus do not.

---

## D. Card switching — who owns the visible unit?

### Authorities (actual)

| State | Owner (intended) | Owner (actual at `0fe1ab9`) |
|---|---|---|
| Engine `sceneIndex` / `cardIndex` | `PresentationEngine` | `PresentationEngine` |
| React `currentCardIdx` | Engine snapshot effect | **Two writers** |
| `unitBackedCards` | `presentationCardsFromNarrationSegments(narration_plan)` | Same, but **cleared to `null` on every showCard frame** |
| `currentUnitCard` | `unitBackedCards[currentCardIdx]` | Follows the split-brain index |
| Visible campus/HOD/principal | `currentUnitCard.cardType` first, then stage flags | Same |

### Writer 1 — engine (pre-existing, correct)

`ChatScreen.tsx` ~943–981:

```
setCurrentCardIdx(snap.cardIndex);
```

This is the M5.9 contract: PresentationEngine is the sole card index.

### Writer 2 — Phase 2D-KN (new, incorrect dual authority)

Added in `0fe1ab9` in three places:

- `applyComparisonNarrationSegment` (~1426–1432)
- `handleAudioPlayback` unitId branch (~1827–1833)
- failed-clip path (~2058–2064)

```
presentationRef.current.activateByUnitId(unitId);
const idx = unitBackedCardsRef.current.findIndex(m => m.unitId === unitId);
if (idx >= 0) setCurrentCardIdx(idx);   // ignores activateByUnitId's boolean
```

### What happens when the next unit arrives

1. M5.8 scheduler starts clip 1 for `unitId` B (correct; TTS is not the defect).
2. `handleAudioPlayback` / `applyComparisonNarrationSegment` calls `activateByUnitId('…B')`.
3. `PresentationEngine.activateByUnitId` (`PresentationEngine.ts` ~388–441):
   - `scenes.findIndex(s => s.unitId === B)`
   - if **no scene has that unitId** → `SCENE_ACTIVATE_REJECTED` reason `unknown_unit`, return `false`
   - if `per_clip` and index is not same / next / first-on-READY → `out_of_order`, return `false`
4. ChatScreen **still** `setCurrentCardIdx(1)` if B is in `unitBackedCards`.
5. Snapshot effect sees `cardIndex` still 0 → **`setCurrentCardIdx(0)`**.
6. `currentUnitCard` stays unit A. User sees card 1 while clip 2 is spoken.

### When scenes have no unitId

`singleScenePresentation` (`planToScenes.ts` ~120) and `cardsToScenes` (`planToScenes.ts` ~81) **do not set `unitId`**.

`handleAudioPlayback` ~1871–1889 loads `kind: 'single'` when:

- narration plan turnId does not match this clip, **or** plan activation path did not run, **and**
- `isOverview` is false (campus/HOD/principal/fees path), **and**
- engine is IDLE / CANCELLED / PRESENTATION_COMPLETE

That single scene cannot satisfy `activateByUnitId` for unit 2.

If the plan-load effect (`ChatScreen.tsx` ~856–857) then sees `lastLoadedPresentationTurnRef === turnId`, it **refuses to load the N-unit plan**. The turn is permanently a one-scene presentation.

`validatePresentationContract` failure (`ChatScreen.tsx` ~871–906) also loads `kind: 'single'` and sets `lastLoadedPresentationTurnRef`. Same trap.

### `unitBackedCards` flicker

Every `department_overview` payload frame does:

```
setUnitBackedCards(null);
… rebuild models …
setUnitBackedCards(models);
```

(`ChatScreen.tsx` ~2765, ~2784)

While `null`, `currentUnitCard` is null. The renderer has nothing to show. Streaming Kannada TTS sends more frames, so this flicker is more visible in regional sessions. This is a **CHATSCREEN STATE** defect, language-agnostic, worse under streaming.

### Language freeze

`freezeLocalization(presentationLanguage)` (`0fe1ab9`) still calls:

```
freezeLocalization(languageName, codeKey = 'en')
```

(`localizationFreeze.ts` ~6)

So freeze stores `languageName: "Kannada"` and **`codeKey: "en"` always**. Card copy does **not** read `codeKey` (cards use `presentationLanguage` / `useCollegeData`). Freeze only blocks `canChangeLanguageNow()` (language picker). It does **not** by itself hide the next card.

Adding `presentationLanguage` to the plan-load effect deps causes extra runs; those runs usually hit `lastLoadedPresentationTurnRef === turnId` and return. Harmless unless the first run already installed a single-scene fallback.

**Classification for freeze:** not the first switching failure. Do not loosen fencing blindly. The freeze **invariant** (do not change locale mid-presentation) is still valid. The bug is passing the default `codeKey = 'en'` and treating freeze as a card-activation gate — it is not one.

### Renderer mismatch

`ChatScreen.tsx` ~4748–4756 prefers `currentUnitCard.cardType`. Mixed HOD+event at index 0 is rendered through the department-overview stage (`isHodStage` is false because `allHod` is false). Index 1 should be `CampusUnitCard`. If `currentCardIdx` never leaves 0, the event card never mounts. That looks like “only one card” even though `unitBackedCards.length === 2`.

---

## E. Failure classification (listed examples)

Use **one** class per symptom.

| Symptom | First incorrect boundary | Class | File | Function | Condition |
|---|---|---|---|---|---|
| Listed single-card strings produce no **backend** card | None at HEAD | — | — | Parser/decision/units succeed | If kiosk still fails, skip to ChatScreen |
| N units selected, only card 1 visible, clip 2 spoken | ChatScreen vs engine index | **11 CHATSCREEN STATE FAILURE** then **10 PRESENTATION ENGINE FAILURE** | `ChatScreen.tsx`, `PresentationEngine.ts` | `applyComparisonNarrationSegment` / `handleAudioPlayback` then `activateByUnitId` | `setCurrentCardIdx` ignores activate return; snapshot resets; or `unknown_unit` because scenes have no `unitId` |
| Campus N-unit never advances | Audio offer + single-scene load | **9 PRESENTATION PLAN FAILURE** then **10** | `ChatScreen.tsx` ~2885–2899, ~1871–1889 | campusOnly `offerAssistantAudio`; `loadPresentation({ kind: 'single' })` | `isOverview === false` && `cardsToSync === null`; lastLoaded blocks N-unit plan |
| Mixed HOD+fees English works, campus Kannada does not | Different ChatScreen branch, not language if | **11** | `ChatScreen.tsx` ~2785–2938 | `allHod` / `campusOnly` vs mixed dept slides | English mixed dept uses `cardsToSync`; campus does not |
| Direct CARD replaced by Groq on **these** strings | Not observed at HEAD | **15 LLM/RAG ESCAPE** only if parser returns None in live ASR | `presentation_resolver.py` ~268–273 | `resolve_presentation` ANSWER branch | `should_call_groq=True` only when policy is not CARD |
| Bare `ಹಾಸ್ಟೆಲ್` / `hostel` is CLARIFY | Intentional 2D-KN | **4 RESPONSE_DECISION** (by design) | `response_decision.py` ~498–510 | `is_bare_hostel_request` | No girls/boys span |
| Wrong topic spoken vs visible card | Not observed for listed units | **7 NARRATION** would be `narrate_unit` suffix/family | `unit_narration.py` | `narrate_unit` | Campus uses that unit’s `tts_summary`; HOD uses `.hod` template |

Do not file these as “Kannada issue.” Kannada is the **input language**. The broken transition is **presentation ownership**.

---

## F. Over-freezing / Phase 2D-KN delta vs working architecture

`git diff f9adc57..0fe1ab9` production files:

| Change | Necessary invariant? | Effect on cards |
|---|---|---|
| Catalog `ಸಿಎಸ್ಇ`, `ಮುಖ್ಯಸ್ಥರು` | Input layer only | **Helps** CARD; does not steal English |
| Campus `ಸ್ವಚ್ಛತೆ`, `ಟೆಕ್‌ವಿದ್ಯಾ`, family-aware `_bind_campus_proximity` | Pair topic only to legal family | **Helps** N-unit; English 2C tests still pass |
| `is_bare_hostel_request` → CLARIFY | Fail-closed gender | Does **not** fire when girls/boys span exists |
| Greeting `ನಮಸ್ಕಾರ`, templates, fallbacks, HOD `ಅವರು` | Language layer | Not card selection |
| `freezeLocalization(presentationLanguage)` | Locale freeze mid-presentation | Correct **name**; still stores `codeKey: 'en'` |
| **`setCurrentCardIdx` after `activateByUnitId`** | **No.** Violates “engine is sole cardIndex” | **Split-brain; this is the 2D-KN switching regression** |
| `unitBackedCardsRef` | Harmless if used only after successful activate | Currently used to write index even on failed activate |

Guards that must **remain**:

- M5.8 scheduler / ACK / playhead
- `per_clip` sequential activate (do not skip-ahead) — but only when scenes **have** `unitId`s
- UnitSelector fail-closed (no invented unit)
- CARD ⇒ `should_call_groq=False` in `presentation_resolver.py` ~222–223
- Turn fence `shouldIgnorePayloadTurn`

Guards that are now **blocking valid N-unit cards** when combined:

- `lastLoadedPresentationTurnRef === turnId` after a **single-scene fallback**
- `activateByUnitId` `unknown_unit` on scenes built by `singleScenePresentation` / `cardsToScenes`
- Dual `currentCardIdx` writers

---

## G. Why English still works

1. English mixed department requests (`CSE HOD and CSE fees`) set `isOverview: true` and pass `cardsToSync` slides. Visual advance can follow the overview carousel / shared_clip path even when unitId activation is weak.
2. English single HOD/principal is **one** scene. `kind: 'single'` is accidentally correct. Kannada single HOD is the same — those should still show **one** card. User reports of “direct cards missing” on exact `CSE HOD` strings are **not** reproduced by the parser at HEAD; if seen live, inspect ASR text and whether `setUnitBackedCards(null)` ran on a streaming frame.
3. Session language is already English, so `language` does not change mid-turn and the plan-load effect does not extra-fire.

Kannada does **not** use a second UnitSelector. It uses the same unitIds, then hits the campus/HOD `isOverview: false` presentation branch more often.

---

## H. Smart narration audit (`unit_narration.py`) — no code change

| Unit suffix / family | Spoken source | Invent other topic? |
|---|---|---|
| `*.hod` | Template + `hod_name` from **that** unit | No |
| `*.fees` / placements / achievements | Lead + `_fact_sentence(unit.body)` | No |
| `leadership.principal` / `.vice_principal` | Executive pack + KN `ಅವರು` template | No |
| `leadership.trustees` | `_trustee_opening_spoken(lk)` | No |
| hostel / canteen / event | `metadata.tts_summary` for **that** `unit_id` | No — rooms does not speak food |

Deterministic card units do **not** call Groq (`presentation_resolver` CARD: `should_call_groq=False`). Narration does not bypass ContentUnit. Kannada HOD line is the KN template, not an English paragraph translated.

Do not change narration to fix switching.

---

## I. M5.8 TTS freeze

- `responseTtsScheduler.ts` / `ackAudio.ts` **not** in `0fe1ab9`.
- Cards still enter TTS as `NarrationSegment.tts_text` → existing response pipeline.
- Clip 2 playing while card 1 is visible is **proof TTS advanced** and **visual did not**. Do not add `audio.play()`, a second queue, or ACK/shared-playhead restoration.

M5.8 is **not** the first failing boundary.

---

## J. Required answers

### 1–4. Exact first failing boundary

**For next-card-not-visible (primary user-visible regression):**

- **Boundary:** React `currentCardIdx` vs `PresentationEngine.sceneIndex` after clip N+1  
- **File:** `frontend/src/screens/ChatScreen.tsx`  
- **Function:** `applyComparisonNarrationSegment` and `handleAudioPlayback`  
- **Condition:** `setCurrentCardIdx(idx)` runs even when `activateByUnitId` returns false; snapshot effect then writes `snap.cardIndex` (still 0). Underlying engine reject: `unknown_unit` (single-scene or `cardsToScenes` without `unitId`) or `out_of_order` (`PresentationEngine.activateByUnitId`, `per_clip` guard at ~416–429).

**Contributing load that makes `unknown_unit` inevitable:**

- **File:** `frontend/src/screens/ChatScreen.tsx`  
- **Function:** campusOnly / allHod / principal `offerAssistantAudio` (`isOverview: false`, `cardsToSync: null`) plus `loadPresentation({ kind: 'single' })` at ~1871  
- **Then:** plan-load effect `lastLoadedPresentationTurnRef.current === turnId` (~856) refuses the N-unit plan.

**For listed CARD strings themselves:** first backend boundary is **not failing** at HEAD.

### 5. Why English still works

Mixed English department multi-card uses `isOverview: true` + `cardsToSync`. Single English cards are one scene. English session language is stable.

### 6. Why Kannada / regional flow fails

Same unitIds. Different ChatScreen **surface family** (campusOnly / leadership / HOD all set `isOverview: false`). Kannada N-unit examples from Phase 2D are exactly that family. Streaming frames also clear `unitBackedCards` more often.

### 7. Why the next card fails to activate

Engine never enters scene 1 (`unknown_unit` or `out_of_order`), **or** it does and React index is reset, **or** `unitBackedCards` is briefly null. Visible card stays index 0. TTS clip 1 still plays.

### 8. Did Phase 2D-KN introduce the regression?

- **Parser aliases / hostel CLARIFY / family-aware bind:** not the switching defect; they make listed KN cards **more** CARD-correct.  
- **`setCurrentCardIdx` dual write:** **yes**, this is the new incorrect ownership introduced in `0fe1ab9`.  
- **campusOnly `isOverview: false`:** older than `0fe1ab9` (2C/2D), but Kannada hardening drove traffic onto that path.  
- Combined: 2D-KN did not invent the campus audio offer, but it **split card-index authority** on top of it.

### 9. Old M5.9/M5.10 guard now blocking valid cards?

Yes, **when applied to a presentation that was never loaded as N unitId scenes:**

- `per_clip` order / unknown_unit  
- `lastLoadedPresentationTurnRef` after single-card fallback  
- PresentationEngine-as-sole-index **plus** a second writer

Do not delete the per_clip guard. Load N unitId scenes, then let the engine be the only index.

### 10. Safe to modify later (not in this audit)

- ChatScreen: one card-index authority (engine snapshot only)  
- ChatScreen: do not `loadPresentation(kind: 'single')` when `narration_plan.segments` already has N `unitId`s  
- ChatScreen: campus/HOD/leadership must not skip plan scenes; `cardsToSync: null` must not mean “single scene”  
- `freezeLocalization(name, codeKey)` pass `kn` when payload is `kn` (does not fix switching by itself)  
- Stop `setUnitBackedCards(null)` on every TTS chunk of the same turn  

### 11. Must remain frozen

- M5.8 `responseTtsScheduler.ts`, `ackAudio.ts`  
- UnitSelector as sole `unitId` owner; no mega-card; no N-cap  
- Canonical unit id shapes  
- CARD ⇒ no Groq  
- `narrate_unit(unit)` as the only TTS text source for cards  
- English templates / English behaviour  

### 12. Minimal permanent fix architecture (do not implement now)

```
narration_plan.segments[i].unitId
        ↓
loadPresentation({ kind: 'plan' })  // N scenes, each with unitId
        ↓
clip i → activateByUnitId(unitId_i) only
        ↓
if false: do not write currentCardIdx
        ↓
snapshot.cardIndex → currentCardIdx → currentUnitCard
        ↓
M5.8 speaks the same segment tts_text
```

One presentation per turn. Never install `kind: 'single'` over an N-unit plan. Never a second index writer. Never a Kannada-only if/else.

### 13. Tests required before implementation

1. **Backend (already green at HEAD):** listed EN/KN strings → CARD + exact unitIds (keep `test_m510_phase2d_kn.py`).  
2. **Frontend unit:** `PresentationEngine` N campus scenes with `unitId`; clip1 then clip2 `activateByUnitId` returns true; `cardIndex` becomes 1.  
3. **Frontend unit:** `activateByUnitId` false ⇒ ChatScreen index **unchanged** (no optimistic `setCurrentCardIdx`).  
4. **Frontend unit:** payload with 3 unitIds + `showCard=department_overview` never calls `kind: 'single'`.  
5. **Frontend unit:** `cardsToScenes` currently omits `unitId` — either stop using that path for unit-backed turns, or the test must fail until plan path is used.  
6. **Regression:** English `CSE HOD and CSE fees` still CARD `cse.hod`+`cse.fees` and still advances.  
7. **M5.8 tests** unchanged and green.  
8. **Live (after fix):** Kannada 3-unit hostel+canteen+TechVidya — visible card id equals spoken `unitId` at each clip.

---

## Honest remainder

- Live Groq+Sarvam+WebSocket kiosk traces were **not** captured in this audit; classification of “direct card missing” on **exact** listed strings is **not** a parser miss at HEAD. If production ASR text differs, re-run the same probe on the **actual transcript**.  
- `is_bare_hostel_request` will CLARIFY bare hostel; that is fail-closed, not a CARD regression.  
- Campus copy is still SAMPLE. That is content, not routing.  
- Hindi/Tamil/Telugu/Malayalam were not in scope.

**STOP. No production fix. No commit. No push.**
