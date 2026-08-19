# M5.1 Multilingual Semantic Content-Unit Selection (Deterministic)

## Goal
Allow users to request *exactly* the department atomic info they want (e.g. `cse.fees` instead of the full department deck), while keeping:
- content-unit identity language-independent (`unit_id`, `section_id`)
- CI intent values unchanged (intents determine card ownership, not unit selection)
- the existing M4.3 playback contract (`section_id`-driven activate)

## Non-goals (M5.1)
- No RAG-driven card/content ownership.
- No LLM-based unit planning.
- No migration of other surfaces (admissions/docs/etc.) into this semantic unit selector.

## Data flow (M5.1 unit selection contract)
1. `semantic_request_parser.parse_semantic_request()`  
   Produces a deterministic `SemanticRequest` (language-independent semantic topic + department entities).
2. `unit_selector.select_content_units()`  
   Maps the `SemanticRequest` to an ordered `PresentationPlan` containing only unit IDs from `ContentUnitRegistry`.
3. `narration_resolver.resolve_narration()`  
   When `department_overview` card is active, resolves selected unit IDs via `ContentUnitResolver` and maps them to `NarrationSegment[]` using the existing `map_content_units_to_segments()` (preserving `section_id`).

## Language normalization approach
- Department/entity normalization reuses the existing `DepartmentResolver` (`resolve_department_key`).
- Mixed-language cues are handled by the existing deterministic normalization + feature extraction in `backend/services/answer_generation.py`.
- M5.1 only adds a *small* controlled vocabulary for gaps not currently exposed as atomic flags (notably achievements/rankings cues).

## Supported semantic topics (M5.1)
Controlled vocabulary topic families:
- `overview`
- `hod`
- `fees`
- `placements`
- `achievements` (cue-based; no new LLM/translation tables)

## Explicit overview scope (anti-deck expansion)
The overview topic supports:
- `requested_scope=single`: e.g. `"CSE overview"` → `[cse.overview]`
- `requested_scope=full_department`: e.g. `"Tell me about CSE"` → `[cse.overview, cse.hod, cse.achievements, cse.placements, cse.fees]`

## Multi-entity behavior
- `unit_selector` supports multi-entity selection at selector level (e.g. `[cse.hod, cse_aiml.hod]` for HOD).
- Production wiring is fail-closed for the existing `department_overview` surface:
  - overrides to `department_overview` only occur when the semantic request can be represented as a single department entity.

## Verification (what this milestone adds)
### New tests
- `backend/tests/test_semantic_request.py`
- `backend/tests/test_multilingual_unit_selection.py`
- `backend/tests/test_unit_selector.py`

These cover:
- multilingual determinism (`unit_id` + `section_id` consistency)
- anti-expansion overview vs full-department deck
- mixed-language code-switching
- multi-entity selection at selector level
- unknown-topic fallback producing no unit selection

## Known baseline failures (pre-existing)
- `test_tts_full_reply.py`
- `test_provider_failure_paths.py`

These are treated as known baseline issues and must not be “fixed” by weakening assertions as part of M5.1.

