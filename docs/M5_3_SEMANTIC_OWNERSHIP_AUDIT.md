# M5.3 Phase 3 — Semantic ownership audit

Forensic only. **No competing path was modified or deleted.**

A path is not obsolete merely because it looks redundant. Removal in Stage B requires zero required production callers, then grep.

## Decision map

| Decision | Writers (production) | Callers | Classification |
| --- | --- | --- | --- |
| Session language | `language_selected` in `backend/app/main.py`; `set_session_language`; `maybe_auto_detect_session_language` → `backend/core/language_detection.py` | Orchestrator, TTS, locale load, `parse_semantic_request(language_code_key=…)` | **AUTHORITATIVE** = frozen session language after user pick. Auto-detect is a **LEGACY FALLBACK** when key is unset. Script detection is not the M5.3 IR language. |
| Normalization | `normalize_user_input` / `normalize_query_to_english` / `_inject_regional_department_tokens` in `answer_generation.py`; Groq `normalize_and_classify_query` (non-English `main.py`) | Parser (`parse_semantic_request` uses `normalize_user_input` only); `main.py` feature extract uses Groq English translation **in parallel** | **COMPETING.** Parser never sees Groq translation. `normalize_query_to_english` **strips Indic combining marks** (`[^\w\s&()]+`). |
| Topic detection | `parse_semantic_request` (HOD → fees → placements → `ACHIEVEMENT_CUES` → overview); `extract_features` booleans; `contains_any_cue` substring; CI `normalize_semantic_topic` (`semantic_normalize.py`, English regex) | Unit path: parser. CI path: `pipeline.py` → policy. `main.py` `resolve_intent_from_features` | **AUTHORITATIVE for unitIds** = parser topic. **COMPETING** = CI/features intent (can disagree; presentation override only runs for a subset of CI intents). Achievements: English-only `ACHIEVEMENT_CUES`. |
| Department / entity resolution | `extract_comparison_department_canonical_labels` (HOD multi); `extract_features.department_name`; `resolve_department_key`; `_loose_resolve_department_json_key`; CI `extract_entities_rules` / optional LLM entities | Parser, `department_resolver`, `narration_plan`, CI pipeline | **COMPETING.** Parser entities drive UnitSelector. Loose resolve uses `canon.lower() in blob` (substring identity). LLM entities are hints only (`ci_entities`) — must not invent unitIds; today they can seed `department_hint`. |
| Intent classification (CI) | `score_intent_from_features` → `extract_features` + `resolve_intent_from_features`; FAQ; `localIntent` | `run_conversation_intelligence` | **AUTHORITATIVE for policy/short-circuit** (noise, FAQ, off-topic). **COMPETING** with SemanticRequest for department card family. |
| SemanticRequest creation | `parse_semantic_request` only | `presentation_resolver`, `narration_resolver`, tests, Stage A probes | **AUTHORITATIVE IR** for M5.2 unit-backed cards. |
| UnitSelector | `select_content_units` | `presentation_resolver`, `narration_resolver` | **AUTHORITATIVE** selection. Correctly expands whatever entities the parser gave it (including leaked `cse`). |
| Presentation selection | `resolve_presentation` + M5.2 override when plan representable; SurfaceSelector | Orchestrator | **AUTHORITATIVE** surface for representable unit plans. |
| Narration selection | `resolve_narration`: unit-backed `map_content_units_to_segments` if representable; else `_legacy_plan` / `build_pre_llm_narration_plan` | Orchestrator | **AUTHORITATIVE** when representable. **LEGACY FALLBACK** full-deck / pre-LLM plan when not representable. |
| Groq classify | `normalize_and_classify_query` | `main.py` after orchestrator, for non-clear-English | **COMPETING** for intent/department on the RAG/LLM branch; not the unit selector. |
| Frontend semantic inference | `inferForcedBusRoutesFromUserText`, `inferForcedDepartmentComparisonFromUserText` (`ChatScreen.tsx`); `localIntent` for UI clicks | Typed/UI turns | **COMPETING** for bus/comparison only. **CONSUMER** of `narration_plan.unitId` for department cards. Does **not** parse fees/HOD/overview (confirmed: no FE parser for those topics). |
| `intentClassifier.ts` | none imported | **zero** `from`/`import` outside the file | **OBSOLETE candidate** — prove again at deletion time. |
| `intentNormalizer.ts` (`normalizeIntent`) | none imported | **zero** production/test imports | **OBSOLETE candidate** — same gate. |
| Frontend `toDepartmentKey` | display mapping | `LeadershipOverview` | **CONSUMER** of canonical keys. Exact-key fix (M5.2) must not be reverted. Not a semantic authority. |

## Minimum files (as specified)

| File | Role now |
| --- | --- |
| `semantic_request_parser.py` | Authoritative IR builder; uses competing feature/alias extractors |
| `unit_selector.py` | Authoritative selector; language-independent; no KannadaSelector |
| `department_resolver.py` | Intended single resolver; **delegates to substring loose resolve** |
| `answer_generation.py` | Features, aliases, normalize, Groq classify, legacy intent |
| `presentation_resolver.py` | Consumes SemanticRequest; may no-op override if CI intent mismatches topic |
| `narration_resolver.py` | Unit-backed vs legacy full deck |
| `main.py` | WS typed path; second `extract_features` / Groq; guest name; TTS |
| `language_detection.py` | Script/STT language; not IR |

## Competing-authority finding (do not delete in Stage A)

Production department-card turns still run **two** semantic stacks:

1. Conversation Intelligence: `extract_features` → `resolve_intent_from_features` (+ optional Groq translate in `main.py`).
2. M5.1/M5.2: `parse_semantic_request` → `UnitSelector` → `narration_plan.unitId`.

Live WS failures matched stack (2). Stack (1) did not save them. Leaving both “just in case” is the cutover debt for Stage B.

## Call graph (unit-backed card)

```
typed user_message
  → ConversationOrchestrator
      → CI (features + policy)
      → resolve_presentation (parse_semantic_request + select_content_units)
      → resolve_narration (same parser + selector → segments)
  → main.py (Groq/features again for RAG path)
  → WS narration_plan
  → ChatScreen PresentationEngine (CONSUMER)
```
