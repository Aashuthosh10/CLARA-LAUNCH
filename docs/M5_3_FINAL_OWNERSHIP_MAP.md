# M5.3 Final ownership map (Stage B cutover)

Exactly **one** authoritative department-card semantic path:

`typed text → parse_semantic_request → SemanticRequest → select_content_units → narration_plan.unitId → frontend PresentationEngine (consumer)`

M5.2 playback was not modified.

## Table

| Path | Classification |
| --- | --- |
| `parse_semantic_request` + structured vocab + exclusive department identity | **AUTHORITATIVE** (department-card IR) |
| `UnitSelector.select_content_units` | **AUTHORITATIVE** (unitIds). Refuses LOW/NONE. |
| `presentation_resolver` / `narration_resolver` unit-backed branch | **CONSUMER** of SemanticRequest + UnitSelector |
| Frontend `ChatScreen` / PresentationEngine / `narration_plan.unitId` | **CONSUMER** (M5.2 playback unchanged) |
| `extract_features` / `resolve_intent_from_features` | **LEGACY FALLBACK / CI** — policy, FAQ, bus, documents, comparison. **Not** unit identity. |
| `normalize_and_classify_query` (Groq) in `main.py` | **LEGACY FALLBACK** for RAG/LLM English translation. **Not** unit selection. |
| `_loose_resolve_department_json_key` in `narration_plan.py` | **LEGACY FALLBACK** for pre-LLM non-unit narration only. |
| `_exact_department_json_key` in `department_resolver.py` | **AUTHORITATIVE** for already-canonical json keys (`cse_ds` stays `cse_ds`). Loose resolve is last-resort for human labels only — never for unit IR keys. |
| `LeadershipOverview.hodCopyFromUnitCard` | **CONSUMER** of `PresentationCardModel` text. `HOD_FALLBACK` is **LEGACY FALLBACK** for non-unit cards only. |
| Representable HOD `PresentationPlan` vs CI `DEPARTMENT_COMPARISON` | **AUTHORITATIVE** unit plan wins the overview surface. CI comparison remains for true contrast queries. |
| FE `inferForcedBusRoutesFromUserText` / `inferForcedDepartmentComparisonFromUserText` | **COMPETING** only for bus/comparison UI force — those topics are not unit-selector owned. |
| `frontend/src/lib/intentClassifier.ts` | **REMOVED** (zero production/test imports; grep clean except historical docs) |
| `frontend/src/lib/intentNormalizer.ts` | **REMOVED** (same) |

## Production callers still remaining (intentional)

Department-card unitIds:

- `backend/services/orchestration/presentation_resolver.py`
- `backend/services/orchestration/narration_resolver.py`

CI / non-card (must keep):

- `backend/services/conversation/intent_confidence.py` → `extract_features`
- `backend/app/main.py` → `extract_features`, `resolve_intent_from_features`, `normalize_and_classify_query`
- `backend/services/answer_generation.py` → comparison aliases for **comparison intent**, not unit IR

## ASR

Not modified. Typed parity is the gate that passed. Speech → transcript → same parser is a later isolated evaluation.
