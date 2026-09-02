# M5.10 Trustee Cards Forensic Report

Status: forensic phase complete. No trustee production implementation was changed.

## Executive finding

The repository does **not** currently contain exactly eight trustee records. The
authoritative localized roster contains seven records in each supported language:

`holla`, `padma_reddy`, `srinivas_raju`, `shanmukha`, `manohar`, `jayasimha`, and
`narayan`.

The first architectural divergence is in `backend/services/orchestration/narration_resolver.py`.
The canonical `UnitSelector` can identify only the aggregate unit
`leadership.trustees`, but `resolve_narration()` uses the canonical path only for
`department_overview`. Trustee requests therefore go through `_legacy_plan()` and
`build_pre_llm_narration_plan()`, which reads `backend/data/narration/static_cards.json`.

That legacy pack contains nine entries: seven trustee profiles plus the principal,
vice-principal, and mission material mixed into the same `trustees` array. The
resulting `NarrationSegment` objects have no `unit_id` values.

The frontend then takes a second, independent path. `ChatScreen` sees
`showCard=trustees`, activates `isTrusteesStage`, and renders `Trustees.tsx`, which
reads the seven localized records directly. Each next/previous action changes local
carousel state and `handleTrusteeNarration()` creates a new `kind: 'single'`
presentation plus a `campus_navigation_tts` request. This bypasses the canonical
unit-backed sequence and does not use `activateByUnitId()` for trustee identity.

## Evidence and counts

The following values were obtained by directly loading the repository data and
calling the existing production builders; no expected values were substituted.

| Stage | Current result | Evidence |
|---|---:|---|
| Localized source trustees | 7 in each of `en`, `kn`, `hi`, `ta`, `te`, `ml` | `backend/data/locales/*.json`, `role_holder_localization.py` |
| Frontend records | 7 | `collegeData.role_holders.trustees` → `trusteesForLanguage()` |
| Legacy static `trustees` pack | 9 | `backend/data/narration/static_cards.json` |
| UnitSelector result | 1 aggregate unit: `leadership.trustees` | `test_m59_universal_units.py`, `unit_selector.py` |
| Resolved canonical aggregate sections | 7 | `adapt_trustees()` / `resolve_unit()` |
| Actual legacy narration segments | 9 | `build_pre_llm_narration_plan()` → `slides_from_cards()` |
| Unit IDs on actual legacy segments | 0 | `slides_from_cards()` does not set `unit_id` |
| Legacy card TTS clips | 9 planned | `plan_response_tts(card_segments=...)` |
| Backend timeline entries for legacy plan | 9 entries, but not unit-backed | timeline is built from the nine unitless segments |
| Frontend unit-backed card models | 0 from that legacy plan | `presentationCardsFromNarrationSegments()` drops segments without `unitId` |
| Frontend visible trustee records | 7 | `Trustees.tsx` uses the localized roster |
| Frontend navigation items | 7 | `trustees.length` controls previous/next/dots |
| Frontend trustee presentation loads | one `kind: 'single'` per local trustee narration | `handleTrusteeNarration()` |

Therefore the requested target state is not the current state:

```json
{
  "sourceTrustees": 7,
  "selectedTrustees": 9,
  "unitIds": [],
  "narrationSegments": 9,
  "ttsClips": 9,
  "presentationScenes": 9,
  "navigationItems": 7,
  "renderedCards": 7
}
```

The `selectedTrustees` value above refers to the active legacy narration selection,
not the canonical aggregate selector. The canonical selector returns one aggregate
unit, while the legacy narration builder expands the unrelated static array to nine
segments.

## Complete current flow

### Request and intent

Trustee language and intent detection is present and currently works for the
supported trustee cues. The semantic request parser produces the pair
`(leadership, trustees)`, and `UnitSelector` maps it to `leadership.trustees`.
Surface selection maps `INTENT_TRUSTEES_PROFILE` to `showCard=trustees`.

### Content sources

There are three different sources/representations involved:

1. `backend/data/locales/*.json#role_holders.trustees`: seven localized visual/data records.
2. `backend/services/content/role_holder_localization.py`: seven-record roster builder.
3. `backend/data/narration/static_cards.json#*.trustees`: nine legacy narration records,
   including non-trustee leadership/mission entries.

The frontend `trusteeLocale.ts` consumes the first source through `collegeDataForLanguage()`.
The backend legacy narration path consumes the third source. The canonical adapter
consumes the first source and creates seven `ContentSection` objects, but the current
orchestration path does not map those sections into seven trustee units.

### Narration and TTS

The active non-department narration route calls `build_pre_llm_narration_plan()`.
For trustees it calls `slides_from_cards(cards_t, card_type="trustees")`. That
function creates one segment per static row but leaves `unit_id` empty and leaves
`tts_text` to be derived later from each display text.

The M5.8 TTS planner consequently receives nine card segments. It can produce nine
ordered provider clips, but those clips are not associated with trustee unit IDs.
The canonical trustee helper `_trustee_opening_spoken()` also confirms the aggregate
design: it selects only the first non-empty trustee speech text for the aggregate
`leadership.trustees` unit.

### Presentation and rendering

On a trustee response, `ChatScreen.tsx` enters the `TRUSTEES_UI`/`showCard=trustees`
branch, sets `isTrusteesStage`, and renders `Trustees.tsx`. The custom component owns
its own `index`, previous/next buttons, dots, and animation.

Its narration callback does this for each local index:

```text
local trustee index
  → loadPresentation({ kind: 'single', cardId: 'trustee' })
  → play()
  → send campus_navigation_tts
```

It does not call `activateByUnitId()` and does not consume a backend
`narration_plan` containing trustee units. The callback uses a generic `cardId:
'trustee'`, so presentation identity is not stable per trustee.

## First divergence from a working canonical card

### Working multi-unit path

```text
request
→ semantic request
→ UnitSelector
→ ordered ContentUnit IDs
→ ContentUnitResolver
→ unit-aware narration segments
→ narration_plan with unitId per segment
→ TTS clip queue aligned to segments
→ PresentationEngine plan/scenes
→ activateByUnitId(unitId)
→ snapshot.cardIndex / activeScene
→ renderer selected by unit identity
```

### Trustee path

```text
request
→ semantic request (leadership, trustees)
→ aggregate UnitSelector result (leadership.trustees)
→ orchestration does not consume that plan for trustee narration
→ legacy static_cards trustees array
→ 9 unitless narration segments
→ 9 TTS clips without trustee unit identity
→ custom ChatScreen Trustees stage
→ local 7-record carousel
→ kind:'single' + campus_navigation_tts per local index
```

The first divergence is the orchestration decision that routes trustees to the
legacy narration builder rather than converting the canonical trustee content into
independent units. The second divergence is the frontend custom carousel and
`campus_navigation_tts` callback, which replaces canonical plan/scene ownership.

## Why the current behavior is wrong

The exact causes are:

1. The canonical registry defines only the aggregate `leadership.trustees` unit.
2. The canonical narration mapper supports department content, not trustee sections.
3. Non-department trustee narration falls back to the legacy nine-row static pack.
4. Legacy `slides_from_cards()` creates no `unitId` values.
5. The frontend local roster has seven records and therefore cannot navigate to an
   eighth trustee.
6. `Trustees.tsx` uses a trustee-specific visual system (`trustee-card` and
   `trustee-stage-shell`) rather than the normal unit-backed card contract.
7. Trustee narration is requested through `campus_navigation_tts` and loaded as
   generic `kind:'single'` presentation turns rather than one canonical sequence.

## Legacy reachability table

| Legacy mechanism | Location/caller | Reachable in real trustee runtime? | Can override canonical plan? |
|---|---|---|---|
| `cardTrigger` | `ChatScreen.tsx`, payload `showCard` normalization | Yes; opens `trustees` stage | Yes; trustee branch handles the surface before normal unit rendering |
| `cardsToSync` | `offerAssistantAudio()` and `handleAudioPlayback()` | Generic infrastructure is reachable; trustee custom branch passes `null` | Yes in generic fallback paths, but not the primary trustee carousel |
| `kind:'cards'` | `handleAudioPlayback()` fallback presentation path | Generic fallback reachable; not used by `handleTrusteeNarration()` | Potentially, if trustee payload loses unit plan and enters fallback |
| `kind:'single'` | `handleTrusteeNarration()` | Yes, once each trustee card mounts/narrates | Yes; it replaces a canonical multi-unit presentation with one generic scene |
| Legacy renderer | `Trustees.tsx` / `TrusteeCard.tsx` | Yes; it is the active visible trustee renderer | Yes; it owns visible content independently of backend unit identity |
| `activeCards` / `currentCardIdx` | `ChatScreen.tsx` generic card state | Reachable elsewhere; trustee component uses its own `index` | Not primary trustee state, but indicates competing presentation ownership |
| `campus_navigation_tts` | `handleTrusteeNarration()` → backend websocket action | Yes for every local trustee change | Yes; it creates one-off TTS turns outside the trustee response plan |

## Layout comparison

Trustees are not rendered by `PremiumHODCard`, `DepartmentCardStage`, or the generic
unit-backed card contract. They use:

- `trustee-stage-shell`
- `trustee-card`
- `trustee-card-content`
- `trustee-card-left/right`
- trustee-specific portrait, glow, borders, and navigation styles

The normal canonical leadership path uses unit identity to select
`PremiumPrincipalCard`/`PremiumVicePrincipalCard` or the standard presentation
surface. The trustee component is therefore a separate layout and state system,
not merely a different content template.

## Language findings

All six supported language files currently contain seven trustee records and stable
IDs in the same order. The frontend localizes names, roles, descriptions, and TTS
summaries from the active locale. The backend role-holder adapter also uses the
active locale. However, the active legacy narration path reads the static localized
pack, while the canonical aggregate unit reads locale role-holder sections. These
are parallel content paths and are not guaranteed to remain one-to-one after
trustee units are introduced.

## Minimal implementation plan (not executed)

1. Resolve the source-of-truth question first: confirm whether the product should
   contain seven trustees (the repository's actual roster) or provide a verified
   eighth record. Do not invent an eighth person or image.
2. Introduce stable trustee ContentUnit IDs following the repository convention,
   only after the approved roster count is known.
3. Map each localized trustee record to one canonical unit and one narration segment
   with matching `unitId`, display text, and TTS text.
4. Route trustee narration through the canonical presentation bundle/TTS queue.
5. Make the renderer consume the active unit snapshot and show exactly one trustee
   at a time; preserve approved trustee content and portrait treatment where
   possible.
6. Replace local trustee-index narration and `campus_navigation_tts` ownership only
   after canonical unit sequencing is proven.
7. Add six-language count/identity tests and a mounted browser test for forward and
   reverse traversal.

No implementation was made because the attached task explicitly requires stopping
after forensic proof and before the canonical fix.
