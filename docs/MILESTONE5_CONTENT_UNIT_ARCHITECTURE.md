# Milestone 5.0 — Content Unit Architecture

## 1. Why fixed card decks were insufficient

Department presentations were conceptually treated as a mandatory 5-slide deck (`intro`, `hod_voice`, `achievements`, `placement`, `fees`). In practice, users request single topics (fees only, HOD only) or multi-entity comparisons (HOD of CSE and AIML). Same-topic content also appears in different presentation contexts (global fees table vs department fee slide).

## 2. ContentUnit architecture

A `ContentUnit` is one independently addressable presentation/content unit in a **specific semantic context**.

Key fields: `unit_id`, `context`, `context_id`, `section_id`, `body`, `canonical_source`, `content_hash`.

See [`backend/services/content/content_unit.py`](../backend/services/content/content_unit.py).

## 3. Registry ownership

**Single owner:** [`content_unit_registry.py`](../backend/services/content/content_unit_registry.py)

- Entity-scoped: `{dept}.{suffix}` derived from `DEPARTMENT_JSON_KEY_ORDER × _DEPT_SLIDE_SECTION_IDS`
- Context-scoped descriptors: `fees.overview`, `documents.overview`, `admission.documents_required`

## 4. ContentUnit resolution

**Single owner:** [`content_unit_resolver.py`](../backend/services/content/content_unit_resolver.py)

`resolve_unit(unit_id, language, language_code)` → `ContentUnit | None`

No database, RAG, or LLM imports. Must not collapse contextual units by topic alone.

## 5. PresentationPlan

**Single owner:** [`presentation_plan_builder.py`](../backend/services/presentation/presentation_plan_builder.py)

A plan is an **ordered selection** of unit IDs — not necessarily every unit on a surface.

## 6. Example: CSE full presentation

Query: "Tell me about CSE"

```
cse.overview → cse.hod → cse.achievements → cse.placements → cse.fees
```

## 7. Example: CSE fees-only

Query: "CSE fees"

```
cse.fees
```

Planner must **not** auto-expand to the full 5-unit deck.

## 8. Example: CSE + AIML HOD

Query: "Who are the HODs of CSE and AIML?"

```
cse.hod → cse_aiml.hod
```

## 9. M4.3 playback relationship

```
ContentUnit.section_id → NarrationSegment.section_id → PresentationTimeline → activateBySectionId()
```

Department `section_id` values unchanged: `intro|hod_voice|achievements|placement|fees`.

## 10. Backward compatibility

M5.0 production path: single-dept `department_overview` via unit composition. M4.1 parity tests (`test_department_migration`, `test_m4_regression`) verify byte-identical captions, section IDs, and hashes.

## 11. Why PostgreSQL is excluded

ContentUnits resolve from locale JSON and canonical adapters — not RAG retrieval. PostgreSQL state is unchanged in M5.0.

## 12. Why ambiguous sources are not migrated yet

Surfaces with duplicate-topic contracts (fees, documents, admissions, profiles) require the Phase 0 inventory before production migration. See [`M5_CARD_SURFACE_INVENTORY.md`](M5_CARD_SURFACE_INVENTORY.md).

## 13. Future semantic planner

M5.0 uses deterministic keyword fixtures in `presentation_plan_builder.py`. NLP/semantic unit selection is deferred to M5.1+ via `content_selection.py` contract.

## 14. Card Surface Inventory

Full audit: [`M5_CARD_SURFACE_INVENTORY.md`](M5_CARD_SURFACE_INVENTORY.md)

## 15. Contextual ContentUnit identity

`unit_id` is globally unique and deterministic. Identity = topic + entity/context where required.

## 16. Global vs entity-scoped units

| Type | Example | Context |
|---|---|---|
| Entity-scoped | `cse.fees` | department |
| Context-scoped | `fees.overview` | global |

## 17. Fees: `fees.overview` vs `cse.fees`

- `fees.overview` — global all-department quota table (`department_fees` surface)
- `cse.fees` — locale prose on CSE department slide

Same underlying fee facts may overlap; units remain distinct.

## 18. Documents: `documents.overview` vs `admission.documents_required`

- `documents.overview` — general documents checklist (global context)
- `admission.documents_required` — admission-specific document requirement (admission context)

## 19. Why shared underlying facts do not imply shared presentation units

`documents.overview` and `admission.documents_required` may share `DOCUMENT_ITEMS` source but differ in context, scope, and UI contract.

## 20. Migration boundary for ambiguous/duplicate surfaces

**M5.0 production migration:** single-dept `department_overview` only.

**Deferred:** Fees, Documents, Admissions, Principal, VP, Trustees, Placements, Comparison, Bus, Course Menu.

## 21. Critical composition invariant

Five department units are independently addressable. A full 5-unit plan is one valid composition, not the default runtime contract. Single-unit requests must not auto-expand.

---

## Architecture flow

```
USER QUESTION → Surface/Intent → Context Understanding → Presentation Planner
  → Content Units → Presentation Plan → Narration Segments
  → section_id → Timeline → TTS → activateBySectionId() → Correct Card
```

## Verification (M5.0)

```bash
PYTHONPATH=backend python -m unittest \
  backend.tests.test_content_units \
  backend.tests.test_presentation_plan \
  backend.tests.test_m4_regression \
  backend.tests.test_department_migration \
  backend.tests.test_presentation_timeline \
  backend.tests.test_architecture_escape
```

Result: **54 tests OK** (M5 gate suite).
