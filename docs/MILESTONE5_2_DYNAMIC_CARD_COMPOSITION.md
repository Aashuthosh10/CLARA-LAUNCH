# M5.2 Dynamic Unit-Based Card Composition & Unit-Driven Playback

## Goal
Milestone **M5.2** makes selected `ContentUnit`s directly determine the **visual cards/scenes** shown to the user, and makes playback activation deterministic using the selected unit identity.

## Identity model (source of truth)
* `sectionId`: semantic meaning key used for legacy/meaning-driven behavior (may repeat).
* `unitId`: unique, language-independent content identity for the selected `ContentUnit` (primary identity for unit-backed activation).
* `segmentId`: runtime narration identity (used for TTS chunk ownership).
* `cardIndex`: presentation/UI position used for deck ordering/progress.

**M5.2 rule:** `sectionId` may repeat across different units (e.g. multi-department HOD), but `unitId` must uniquely identify each selected unit scene.

## Backend changes (unitId propagation)
1. `NarrationSegment` is now **additively** extended with `unit_id: str | None`.
   * `public_dict()` emits `unitId` only when `unit_id` is present.
2. `map_content_units_to_segments()` sets `NarrationSegment.unit_id = unit.unit_id`.
3. `PresentationTimeline` (`TimelineEntry`) is extended with `unit_id: str | None` and builds frontend entries from the incoming `narration_plan` segments.
4. `timeline_contract.py` validation updated:
   * Duplicate `section_id` is **allowed** when `unit_id` differs.
   * Duplicate `unit_id` is still **rejected**.
   * Legacy segments (missing `unitId`) preserve the prior “duplicate `sectionId` invalid” behavior.

## Frontend changes (unit-aware scenes + activation)
1. `PresentationScene` and `TimelineEntry` now carry `unitId?: string | null`.
2. `planToScenes` maps narration-plan `unitId` into created scenes.
3. Added `PresentationEngine.activateByUnitId(unitId, presentationId?)`:
   * Finds the target scene by `scene.unitId`.
   * Uses the existing **per_clip ordering guard**: only “current”, “next”, or “first on READY” are allowed.
4. Chat playback sync:
   * When a narration segment carries `unitId`, ChatScreen activates using `activateByUnitId`.
   * If `unitId` is missing, the engine falls back to the existing `activateBySectionId(sectionId)` behavior.

## Frontend dynamic card composition (driven by narration_plan.unitId)
In M5.2, the frontend reconstructs the already-selected unit list from:
* `payload.narration_plan.segments[].unitId`

From the ordered unit list, ChatScreen selects the appropriate existing UI:
* `*.fees` → render **`DepartmentFeesCard`** (single fees card)
* `*.hod` → render **`LeadershipOverview`** in HOD stage
  * multi-HOD supports multiple departments sequentially via `currentCardIdx`
* `*.placements` → render **existing placements** info stage
* `*.overview` / `*.achievements` → render **department_overview** stage with a subset deck (not a fixed 5-slide deck)

### Multi-department HOD
* `LeadershipOverview` was updated to accept `targetDepartments?: string[]`.
* It renders a single `PremiumHODCard` at a time, selected by `currentCardIdx` from the `PresentationEngine` scene activation order.

### Subset deck image-slot correctness
* `DepartmentStageSlide` now supports optional `slotIndex?: number`.
* `buildDepartmentSlidesFromRecord()` assigns template slot indices:
  * overview=0, hod=1, achievements=2, placements=3, fees=4
* `BaseDepartmentCard` now supports `visualSlotIndex` to pick the correct department image slot even when the rendered deck is a subset.
* Department card wrappers propagate `visualSlotIndex` based on the slide’s `slotIndex`.

## Clean cutover boundary (unit-backed XOR legacy)

M5.2 production path is a **non-overlapping branch**:

```
SemanticRequest → UnitSelector PresentationPlan → ContentUnitResolver
  → map_content_units_to_segments (unitId on segments)
  → WS narration_plan
  → PresentationCardModel[] (consumer only)
  → existing visual renderers
  → PresentationEngine.activateByUnitId
```

**Authority:** UnitSelector selects units. ChatScreen / renderers only consume ordered `unitId`s. There is no second composition authority for the same request.

### Capability rule
* Multi-entity allowed **only** for `topic=hod` plans (e.g. `[cse_aiml.hod, cse_ds.hod]`).
* Single-entity for overview / fees / placements / achievements / full_department.
* CI intent is never mutated; only `card_surface` / `show_card` / `presentation_type` may override to `department_overview` when a representable M5.2 plan exists.

### TTS contract
* Unit-backed segments: `display_text = title + "\n" + body`, **`tts_text = body` only**.
* `NarrationSegment.finalize`: preserves non-empty explicit `tts_text`; legacy empty `tts_text` still derives from `display_text`.

### Frontend composition (`PresentationCardModel`)
* `departmentId` derived from `unitId` (`cse_aiml.hod` → `cse_aiml`), never from a single global active department when multiple units are present.
* Renderer mapping is by **unitId shape**, not CI topic strings:
  * `{dept}.fees` → `DepartmentFeesCard`
  * `{dept}.hod` → `LeadershipOverview` (`targetDepartments` from each model’s `departmentId`)
  * `{dept}.placements` → one top-level placements presentation (internal slides stay internal)
  * overview / achievements / full five-unit plans → `DepartmentCardFactory` with **exactly** `models.length` slides
* Explicitly out of scope (must not map to department fees): `fees.overview`, `documents.overview`, `admission.documents_required`.
* When `showCard=department_overview` **and** narration_plan has ≥1 `unitId`: compose from models and **return** — never fall through to `buildDepartmentSlidesFromRecord()` fixed five-deck.
* Legacy fixed deck remains **only** when department_overview has **no** unitIds.

### Playback + reset
* TTS queue stores `unitId`; on clip start prefer `activateByUnitId`, else `activateBySectionId`.
* Do not use live `tts_chunk_index` as content identity.
* VOICE intercept / `clearCardStages` clear `activeHodDepartments`, unit deck ids, `unitBackedCards`, and turn-scoped fees sticky.

## Legacy / fallback behavior
* If `unitId` is missing from `narration_plan.segments` (legacy payloads), the UI preserves the prior fixed-deck / meaning-driven `sectionId` behavior.
* Duplicate `sectionId` rules remain stricter for legacy (missing `unitId`).
* Unsupported or missing unit-backed identities fall back to existing stage/card logic without fabricating `unitId`s.

## Ownership classification
* **AUTHORITATIVE:** `UnitSelector.select_content_units`, `presentation_resolver` M5.2 override gate, `narration_resolver` unit-backed branch.
* **CONSUMER:** `PresentationCardModel`, ChatScreen unit-backed staging, `activateByUnitId`.
* **LEGACY FALLBACK:** `buildDepartmentSlidesFromRecord` / all-dept paths when narration_plan has no unitIds; `activateBySectionId` when unitId absent.

## Verification performed (automated)
Backend:
* `python -m pytest -q backend/tests/test_m52_clean_cutover.py`
* `python -m pytest -q backend/tests/test_semantic_request.py backend/tests/test_multilingual_unit_selection.py backend/tests/test_unit_selector.py`
* `python -m pytest -q backend/tests/test_narration_plan.py backend/tests/test_narration_segments_flow.py`
* `python -m pytest -q backend/tests/test_presentation_timeline.py backend/tests/test_m4_regression.py`

Frontend:
* `npx vitest run src/features/chat/presentation/__tests__/PresentationCardModel.test.ts src/features/chat/presentation/__tests__/presentationTimeline.test.ts`
* Added/updated tests cover:
  * brutal no-hidden-five-card expansion (fees/HOD/placements/overview)
  * multi-HOD `departmentId` from each `unitId`
  * TTS body-only + finalize preserve/fallback
  * duplicate `sectionId` allowed when `unitId` differs
  * `activateByUnitId` out-of-order rejection (per_clip)

## Manual E2E expectations (user-visible)
After deploying the M5.2 clean cutover, explicitly verify:
1. “CSE fees” → exactly one fees card (`DepartmentFeesCard` for `cse.fees` only; never `fees.overview`) and TTS body-only by unitId.
2. “CSE HOD” / “CSE overview” / “CSE placements” → exactly one top-level unit; no sibling expansion.
3. “Tell me about CSE” → five top-level cards (not conflated with placements internal slides).
4. “AIML and Data Science HOD” → `[cse_aiml.hod, cse_ds.hod]` with `departmentId` from each unitId and unit-aware activation order.

