# M5 Card Surface Inventory (Phase 0)

Read-only audit of every user-visible card/presentation surface. Based on code inspection only — no inferred mappings.

**Critical rule:** Same topic ≠ same ContentUnit.

---

## Trace path (per card)

```
user input / menu trigger → localIntent / CI intent → SurfaceSelector → content source
→ card/presentation component → narration source → TTS → PresentationEngine scene
```

---

## Master surface registry

Registered in `backend/services/content/types.py` (`ALL_SURFACES`), `surface_registry.py`, `registry.py`; selected by `surface_selector.py`.

| Surface | showCard | Intent(s) | Presentation mode |
|---|---|---|---|
| `department_overview` | `department_overview` | `DEPARTMENT_OVERVIEW` | CARD_PRESENTATION |
| `department_fees` | `department_fees` | `DEPARTMENT_FEES` | CARD_PRESENTATION |
| `documents` | `documents` | `DOCUMENTS` | CARD_PRESENTATION |
| `principal_profile` | `principal_profile` | `PRINCIPAL_PROFILE` | CARD_PRESENTATION |
| `vice_principal_profile` | `vice_principal_profile` | `VICE_PRINCIPAL_PROFILE` | CARD_PRESENTATION |
| `hod` | `hod` | `HOD_PROFILE`, `HOD_TRUSTEES_PROFILE` → `hod` | CARD_PRESENTATION |
| `placements` | `placements` | `PLACEMENTS` | CARD_PRESENTATION |
| `admissions` | `admissions` | `ADMISSIONS` | CARD_PRESENTATION |
| `trustees` | `trustees` | `TRUSTEES_PROFILE` | CARD_PRESENTATION |
| `college` | `college` | `COLLEGE_OVERVIEW` | CARD_PRESENTATION |
| `department_comparison` | `department_comparison` | `DEPARTMENT_COMPARISON` | CARD_PRESENTATION |
| `bus_routes` | `bus_routes` | `BUS_ROUTES` | CARD_PRESENTATION |
| `course_menu` | `course_menu` | `COURSE_MENU` | CARD_PRESENTATION |
| `faq` | `None` | FAQ path | DIRECT_FAQ |

---

## Mandatory investigations

### 1. Global fees vs department-context fees

| Field | Global / menu fees | Department fees slide |
|---|---|---|
| **Surface** | `department_fees` (alias `fees`) | `department_overview` slide 5 |
| **Voice routing** | Fee query **without** dept → `ADMISSIONS` (not `department_fees`) | Dept overview / dept + fee → `DEPARTMENT_FEES` or dept slide |
| **Proposed unit** | `fees.overview` | `{dept}.fees` (e.g. `cse.fees`) |
| **Context** | global | department |
| **BE content** | `adapt_fees` → `_FEES_AMOUNT_BY_KEY` hardcoded table | locale `departments.*.fees` prose |
| **FE component** | `DepartmentFeesCard.tsx` (all-dept table) | `DepartmentCardFactory` fees slide |
| **Narration** | Legacy `segment_fees`, `card_id=fees` | Canonical `section_id=fees` in dept deck |
| **Safe to migrate** | deferred | yes (M5.0 production path) |
| **Divergence** | Amounts table vs locale prose; undepartmented fees route to admissions |

### 2. General documents vs admission documents

| Field | Documents surface | Admissions context |
|---|---|---|
| **Surface** | `documents` | `admissions` (also undepartmented fee queries) |
| **Proposed unit** | `documents.overview` | `admission.documents_required` |
| **Context** | global | admission |
| **BE content** | `DOCUMENT_ITEMS` in `narration_plan.py` | `admissions_and_fees` locale |
| **FE component** | `DocumentsBlock.tsx` | `ChatScreen` forces FULL_TEXT for admissions |
| **Narration** | `card_id=documents`, chunked segments | `card_id=admissions`, up to 5 slides |
| **Safe to migrate** | deferred | deferred |
| **Divergence** | BE vs FE wording drift; admissions card suppressed in FE |

### 3. HOD per department

| Field | Value |
|---|---|
| **Surface** | `hod` |
| **Proposed units** | `cse.hod`, `cse_aiml.hod`, … (per dept key) |
| **Context** | department |
| **BE content** | locale `departments.*.hod_voice` via `adapt_hod` |
| **FE component** | `LeadershipOverview.tsx` → `PremiumHODCard` |
| **Narration** | `segment_hod_single`, `card_id=hod` or `hod_pick` |
| **section_id** | `department`, `hod_voice` (adapter) |
| **Safe to migrate** | deferred |

### 4. Principal / Vice Principal profiles

| Surface | Intent | FE | BE content | Proposed unit |
|---|---|---|---|---|
| `principal_profile` | `PRINCIPAL_PROFILE` | `PremiumPrincipalCard.tsx` | `EXEC_PRINCIPAL` inline | `principal.profile` |
| `vice_principal_profile` | `VICE_PRINCIPAL_PROFILE` | `PremiumVicePrincipalCard.tsx` | `EXEC_VICE` inline | `vice_principal.profile` |

Parallel locale: `role_holders.principal` / VP in locale JSON. **Safe to migrate:** deferred.

### 5. Placements global vs department

| Field | Global placements | Dept placement slide |
|---|---|---|
| **Surface** | `placements` | `department_overview` slide 4 |
| **Proposed unit** | `placements.overview` | `{dept}.placements` |
| **BE content** | locale `placements_and_training` | locale `departments.*.placement` |
| **FE** | `buildPlacementCardsFromLocale` | `DepartmentCardFactory` slide 4 |
| **Narration** | `build_placement_segments`, 3 segments | `section_id=placement` |
| **Safe to migrate** | deferred | yes (within dept M5 path) |

### 6. Course menu vs department-specific

| Surface | Trigger | Content | FE | Proposed unit |
|---|---|---|---|---|
| `course_menu` | `COURSE_MENU` | `COURSE_MENU_OPTIONS` | `CourseMenuComponent` | `course_menu.overview` |
| `department_overview` | menu click / dept voice | locale departments | `DepartmentCardFactory` | `{dept}.overview` |

### 7. Comparison presentations

| Field | Value |
|---|---|
| **Surface** | `department_comparison` |
| **Proposed unit** | `comparison.{dept_a}.{dept_b}` (multi-unit, deferred) |
| **BE content** | `department_comparison.json` |
| **FE content** | `departmentComparison.json` |
| **Narration** | `comparison_insight_defaults.json` |
| **FE component** | `DepartmentComparisonCinema.tsx` |
| **Safe to migrate** | deferred |

### 8. Other surfaces

| Surface | Proposed unit(s) | Content source | Narration | FE | Migrate |
|---|---|---|---|---|---|
| `trustees` | `trustees.overview` | `static_cards.json#trustees` | legacy slides | `Trustees/` | deferred |
| `college` | `college.overview` | `static_cards.json#college` | legacy slides | `cardData.ts` | deferred |
| `bus_routes` | `bus_routes.overview` | spoken prompt only | no legacy branch | `BusRoutesFullscreen` | deferred |
| `admissions` | `admission.overview` | locale `admissions_and_fees` | legacy `_admissions_slides` | FULL_TEXT forced | deferred |
| `faq` | N/A (no card) | `faq_answers.json` | N/A | text only | N/A |

---

## Per-surface inventory records

### department_overview (single dept)

| Field | Value |
|---|---|
| Triggers | Voice `DEPARTMENT_OVERVIEW`; menu `localIntent.type=department_click` + `departmentLabel` |
| localIntent | `department_click` |
| SurfaceSelector | `_INTENT_TO_SURFACE`, aliases `department`, `dept` |
| Content source | `backend/data/locales/*.json#departments` via `adapt_department` |
| FE component | `DepartmentCardFactory.tsx`, `DepartmentCardStage.tsx` |
| Narration | **Canonical** `narration_resolver._resolve_department_overview` → `surface_narration_mapper` |
| section_id | `intro`, `hod_voice`, `achievements`, `placement`, `fees` |
| Deck type | Fixed 5-slide deck (single dept) |
| Coexist | No — one dept deck at a time |
| Context | department |
| Proposed units | `{dept}.overview`, `{dept}.hod`, `{dept}.achievements`, `{dept}.placements`, `{dept}.fees` |
| Safe to migrate | **yes** (M5.0 scope) |

### department_overview (all depts)

| Field | Value |
|---|---|
| Triggers | Voice text matching all-departments pattern |
| Narration | **Legacy** `build_pre_llm_narration_plan` |
| section_id | `dept_{json_key}` per section |
| card_id | `dept_summary` |
| Safe to migrate | deferred |

---

## Narration routing summary

| Intent path | Narration owner |
|---|---|
| `DEPARTMENT_OVERVIEW` (single dept) | Canonical ContentResolver + surface_narration_mapper |
| `DEPARTMENT_OVERVIEW` (all depts) | Legacy narration_plan |
| All other card intents | Legacy `build_pre_llm_narration_plan` |

Only `department_overview` single-dept uses canonical narration in production.

---

## Known source divergences

1. Fee query without department → `admissions`, not `department_fees`.
2. `department_fees` uses hardcoded quota table; dept slide uses locale prose.
3. `documents` BE `DOCUMENT_ITEMS` vs FE `DocumentsBlock` wording drift.
4. `admissions` card narration exists; FE suppresses card UI (FULL_TEXT).
5. `college` vs `college_overview` FE trigger mismatch.
6. Comparison BE/FE JSON files differ; narration uses third file.
7. `HOD_TRUSTEES_PROFILE` maps to `hod` surface only.
8. `bus_routes` has no `build_pre_llm_narration_plan` branch.

---

## M5.0 migration boundary

**In scope:** single-dept `department_overview` entity-scoped units only.

**Out of scope (descriptor-only in registry):** fees.overview, documents.overview, admission.documents_required, and all surfaces listed as deferred above.
