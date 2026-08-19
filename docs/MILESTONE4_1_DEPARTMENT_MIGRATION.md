# Milestone 4.1 — Department Canonical Migration

## Summary

First production surface on Canonical Content: **`department_overview` only**.

Voice and Course Menu both resolve through:

```text
DepartmentResolver → ContentResolver → CanonicalContent → SurfaceNarrationMapper
  → finalize_segment_list → localize_card_segments → PresentationBundle → PresentationEngine
```

Intentional behaviour change: menu clicks no longer pass display labels (e.g. `"CSE"`) as fake json keys. Menu and voice now produce the **same** 5-slide narration and the **same** `contract_hash` for identical content.

No FE / WS / ResponseAuthority / PresentationEngine redesign. Adapters and locale JSON unchanged.

---

## 1. Architecture before

```text
Voice  → build_pre_llm_narration_plan → locale departments[jkey]
Menu   → menu_department_json_key = "CSE" (bypass) → miss → 1-slide unlisted
FE     → locale slides (5) independently
```

## 2. Architecture after

```text
Voice/Menu
      │
      ▼
DepartmentResolver          (one json_key)
      │
      ▼
ContentResolver             (department_overview only)
      │
      ▼
CanonicalContent
      │
      ▼
SurfaceNarrationMapper      (department branch only)
      │
      ▼
finalize_segment_list
      │
      ▼
localize_card_segments
      │
      ▼
PresentationBundle          (+ backend canonical_* metadata)
      │
      ▼
PresentationEngine
```

## 3. DepartmentResolver flow

`resolve_department_key(department=..., menu_department=..., department_hint=..., language=...)`

- Never returns `"CSE"` as `json_key` — always `cse`.
- Uses `department_label_to_json_key` + loose resolve; validates key exists in locale.
- Sources: `menu` | `voice` | `hint` | `unresolved`.
- Event: `DEPARTMENT_KEY_RESOLVED`.

## 4. CanonicalContent flow

`ContentResolver.resolve(surface="department_overview", department=<json_key>, ...)`.

Adapter remains read-only over `backend/data/locales/*.json#departments`.

Events: `CANONICAL_CONTENT_USED`.

## 5. SurfaceNarrationMapper

Public API: `map_canonical_content_to_segments(content, *, lang_key)`.

- Department branch: section order `intro` → `hod_voice` → `achievements` → `placement` → `fees`.
- Titles from `dept_labels` (not adapter English).
- Caption clip parity with `build_department_slide_segments`.
- Future FEES / DOCUMENTS / PRINCIPAL branches are stubs only — **not wired**.

Event: `NARRATION_FROM_CANONICAL`.

## 6. Voice / Menu parity

| | Voice | Menu |
|--|-------|------|
| Entry | NLP / department label | `department_click` + `from_menu` |
| Key | DepartmentResolver | **same** DepartmentResolver |
| Segments | 5 dept_slide | **identical** 5 |
| Captions / TTS | same | same |
| `content.hash` | same | same |
| `contract_hash` | same | same |
| Differs | `turn_id` / `segment_id` / `presentation_id` | same |

## 7. Bundle parity

- `CanonicalContent.hash` stable for identical title/sections/surface/language.
- `PresentationBundle.contract_hash` stable for identical captions + spoken + language + surface.
- Voice vs menu: equal hashes when content matches.

## 8. Segment finalization fix

`ConversationOrchestrator.attach_narration` now:

1. resolve_narration  
2. **finalize_segment_list** → `SEGMENTS_FINALIZED`  
3. localize_card_segments  
4. re-finalize if localize mutated text  
5. validate_before_narration_plan  
6. build_presentation_bundle → `PRESENTATION_READY`

No unfinished segments enter the PresentationBundle.

## 9. Canonical identity metadata (no WS)

On `ConversationResolution` and `PresentationBundle` (backend only):

- `canonical_surface`
- `canonical_content_id`
- `content_hash`

Not included in `narration_plan_payload` or any WS field. No FE changes. Does not affect timing.

## 10. Regression analysis

| Risk | Mitigation |
|------|------------|
| Menu caption desync | Fixed by DepartmentResolver |
| Empty TTS / missing segmentId | finalize before contract |
| Hardcoded EN titles | mapper uses `dept_labels` |
| Fee table bleed | overview still uses locale `fees` prose via adapter |
| Non-department surfaces | still use legacy `build_pre_llm_narration_plan` |

## 11. Architecture Invariants (permanent)

These rules apply to M4.1 and **every** future content migration (Fees, Documents, Principal, Hostel, Canteen, Placements, etc.).

### 1. One resolver

Every production content surface must resolve through:

```text
DepartmentResolver (or future SurfaceResolver)
        ↓
ContentResolver
```

No feature may bypass `ContentResolver` by reading raw locale JSON (or other owners) directly once that surface has been migrated.

### 2. One mapper

All narration segments for migrated surfaces must be produced through:

```text
SurfaceNarrationMapper  →  map_canonical_content_to_segments
```

Future surfaces **extend this mapper** (new branch). Do **not** create:

- `fees_narration_mapper.py`
- `documents_narration_mapper.py`
- `principal_mapper.py`

### 3. One content identity

Every migrated surface must carry immutable backend metadata:

- `canonical_surface`
- `canonical_content_id`
- `content_hash`

Stable for identical content. Backend-only — never affects presentation timing or WS payloads.

### 4. One narration pipeline

For migrated surfaces the only valid production flow is:

```text
ContentResolver
        ↓
CanonicalContent
        ↓
SurfaceNarrationMapper
        ↓
finalize_segment_list
        ↓
localize_card_segments
        ↓
PresentationBundle
```

No alternate production narration builders for a migrated surface.

### 5. Behaviour parity

Migrating a surface must **not** change wording, slide order, narration timing, localization, authority, or presentation contract unless a later milestone explicitly approves it.

**Migration changes ownership, not behaviour.**

### 6. Future migration checklist

Every future surface migration must satisfy:

- Same user-visible output
- Same PresentationBundle contract
- Same ResponseAuthority
- Same bundle hash for identical content
- No new production narration builder
- No duplicate content owner

---

## Files touched (M4.1)

| File | Role |
|------|------|
| `backend/services/content/department_resolver.py` | **new** |
| `backend/services/content/surface_narration_mapper.py` | **new** |
| `backend/services/content/__init__.py` | exports |
| `backend/services/orchestration/narration_resolver.py` | department_overview canonical path |
| `backend/services/orchestration/conversation_orchestrator.py` | finalize before contract |
| `backend/services/orchestration/types.py` | canonical_* fields |
| `backend/services/orchestration/presentation_bundle.py` | metadata fields (not WS) |
| `backend/tests/test_department_migration.py` | **new** |
| `docs/MILESTONE4_1_DEPARTMENT_MIGRATION.md` | this doc |

## Explicit non-goals

Fees, Documents, Principal, HOD, Admissions, Trustees, College, Placements, FAQ, Course Menu, Comparison — **not** migrated.
