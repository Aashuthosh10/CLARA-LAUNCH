# M5.10 Regional Semantic Parser Root-Cause and Original-Trigger Comparison

Date: 2026-08-26  
Scope: source/history forensics only  
Production changes: none

## Executive conclusion

The valid canonical Kannada request is not failing in the backend presentation architecture. The current production orchestrator produces the ordered three-unit plan and localized narration bundle.

The failing cases diverge earlier because the current deterministic semantic vocabulary does not recognize the observed STT substitutions as HOD cues:

- `ಸಚಿವರು` is not a current HOD vocabulary entry. Because `data science` still resolves, the parser falls back to the department default `overview`, yielding `cse_ds.overview`.
- `ಸಂಖ್ಯೆ` is not a current HOD cue, and `ಡೇಟಾ ಸಂಖ್ಯೆ` is not a recognized Data Science department phrase. No department/topic pair is formed, so the parser returns `None` and the response decision clarifies.
- Malayalam recognizes HOD and fees, but the current event detector does not bind the Malayalam form `TechVidyaയെ` to `events.techvidya`, so the valid department items survive and the event item is absent.

This is a semantic-recognition/vocabulary gap, not a UnitSelector, narration, ChatScreen, or PresentationEngine failure for a valid plan. The correct eventual change is a small, product-approved regional normalization/recognition layer before semantic pairing—not restoration of legacy presentation rendering.

## Phase 1 — exact current pipeline traces

The production path is:

`WebSocket action=user_message` → `process_user_text_and_reply()` → `maybe_auto_detect_session_language()` → `ConversationOrchestrator.run()` → `run_conversation_intelligence()` → transcript assessment/entity rules/intent scoring → `parse_semantic_request()` → `resolve_response_decision()` → `route_policy()` → `resolve_presentation()` → `_apply_unit_plan_authority()` → `resolve_narration()` → `select_content_units()` → `resolve_units_for_plan()` → `map_content_units_to_segments()` → segment finalization/validation → `PresentationBundle.narration_plan_payload()`.

The parser receives the same `text` value passed to `ConversationOrchestrator.run()` and to `resolve_narration(user_text=text)`. The in-process orchestrator reproduction used no Groq/LLM, provider TTS, browser, or WebSocket client.

### Kannada captured STT #1

Raw transcript: `ಡೇಟಾ ಸೈನ್ಸ್ ಸಚಿವರು ಯಾರು`  
Detected language: `kn`, script heuristic, confidence `0.99`  
Session language: `kn`, Kannada, `kn-IN`, manually selected in the isolated run  
Normalized text: `data science ಸಚಿವರು ಯಾರು`

Intermediate semantic state:

- department/entity: `cse_ds` from the normalized `data science` span;
- atomic topic hits: none;
- topic spans: none;
- HOD candidate: rejected because `ಸಚಿವರು` is absent from the current HOD catalog;
- fallback topic: `overview` for the one department with no recognized explicit topic;
- final `SemanticRequest`: `items=[("cse_ds", "overview")]`, confidence `HIGH`, context `department`;
- response decision: `CARD`, evidence `semantic_request`, confidence `0.95`;
- selected/resolved/narration unit: `cse_ds.overview`;
- expected `cse_ds.hod`: lost at semantic parsing, before UnitSelector.

Classification: **D. SEMANTIC PARSER FAILURE**, caused by **A. missing regional vocabulary / C. STT word substitution**. The word is not proven to mean HOD; it is only an observed ASR substitution candidate.

### Kannada captured STT #2

Raw transcript: `ಡೇಟಾ ಸಂಖ್ಯೆ ಸಚಿವರು ಯಾರು`  
Detected language: `kn`, script heuristic, confidence `0.99`  
Session language: `kn`, Kannada, `kn-IN`  
Normalized text: unchanged: `ಡೇಟಾ ಸಂಖ್ಯೆ ಸಚಿವರು ಯಾರು`

Intermediate semantic state:

- department/entity: none; `ಡೇಟಾ ಸಂಖ್ಯೆ` is not mapped to the `data science` department pattern;
- topic hits: none;
- HOD candidate: rejected; neither `ಸಚಿವರು` nor another HOD cue is in the current catalog;
- final `SemanticRequest`: `None`;
- response decision: `CLARIFY`, reason `unrecognised_request`, evidence `no_evidence`;
- selected/resolved/narration units: none;
- expected `cse_ds.hod`: lost at semantic parsing, before UnitSelector.

Classification: **D. SEMANTIC PARSER FAILURE**, caused by **A. missing regional vocabulary, C. STT word substitution, and F. entity mapping loss**. Language detection and session state are correct.

### Malayalam

Raw transcript: `ഡാറ്റാ സയൻസ് വിഭാഗത്തിന്റെ HOD ആര്, ഫീസ് എത്ര, TechVidyaയെ കുറിച്ച് പറയൂ`  
Detected/session language: `ml` / Malayalam / `ml-IN`  
Normalized text: `data science വിഭാഗത്തിന്റെ hod ആര് ഫീസ് എത്ര techvidyaയെ കുറിച്ച് പറയൂ`

Intermediate semantic state:

- entity: `cse_ds`;
- topic spans: HOD and fees;
- TechVidya event entity: not recognized from this Malayalam-bound form;
- final request items: `("cse_ds", "hod")`, `("cse_ds", "fees")`;
- response decision: `CARD`, evidence `semantic_request`, confidence `0.85`;
- selected/resolved/narration units: `cse_ds.hod`, `cse_ds.fees`;
- expected `events.techvidya`: absent at semantic parsing, before UnitSelector.

Classification: **D. SEMANTIC PARSER FAILURE**, caused by **A. missing regional event vocabulary / F. entity mapping loss**. This is not multi-card fail-closed behavior: HOD and fees remain present.

## Phase 2 — original implementation evidence

The history contains multiple earlier trigger layers, so “the original implementation” is not one single algorithm:

1. The pre-semantic frontend normalizer in commit `51978ff` used `MULTILINGUAL_TOKEN_MAP`, `INTENT_MAP`, and `DEPT_MAP`.
2. Its HOD map explicitly contained regional terms, including Kannada `ಮುಖ್ಯಸ್ಥ`, `ಹೆಚ್ಒಡಿ`, `ವಿಭಾಗದ ಮುಖ್ಯಸ್ಥ`; Hindi, Tamil, Telugu, and Malayalam HOD forms.
3. The same historical frontend used lowercased substring matching (`includes`) and returned one broad trigger such as `hod_info` or `department_overview`.
4. The older backend answer path used `normalize_and_classify_query()`, `resolve_card_intent_and_department()`, `extract_features()`, and `infer_show_card_label()`. It included transliterated fee terms and Latin-token `SequenceMatcher` fuzziness, plus raw-text fallback in some department paths.
5. Historical ChatScreen then constructed/advanced `cardsToSync` from broad `showCard`/`cardTrigger` values. That was presentation behavior, not the canonical unit architecture.

The historical source does **not** prove that `ಸಚಿವರು` was a HOD alias, nor that the old system successfully handled the exact two captured transcripts. It does prove that regional HOD vocabulary was present in the older frontend trigger knowledge and that some older paths used broader transliteration/fuzzy handling.

## Old trigger pipeline versus current semantic pipeline

| Input / concern | Old trigger result/evidence | Current parser result | Expected |
|---|---|---|---|
| Kannada exact HOD: `ಡೇಟಾ ಸೈನ್ಸ್ ವಿಭಾಗದ HOD ಯಾರು` | Historical regional department + HOD maps could yield `hod_info`/department card; current historical code also supports Latin HOD | `cse_ds.hod` | `cse_ds.hod` |
| Captured #1: `ಡೇಟಾ ಸೈನ್ಸ್ ಸಚಿವರು ಯಾರು` | No historical source proves `ಸಚಿವರು` was recognized as HOD; broad old fallback may classify department info, but exact HOD result is unproven | `cse_ds.overview` | `cse_ds.hod` |
| Captured #2: `ಡೇಟಾ ಸಂಖ್ಯೆ ಸಚಿವರು ಯಾರು` | No historical source proves this corrupted department/entity form | none | `cse_ds.hod` |
| Kannada HOD + fees + TechVidya | Historical maps were primarily one broad intent/trigger; multi-card accumulation was frontend/card-family behavior | `cse_ds.hod`, `cse_ds.fees`, `events.techvidya` for the exact canonical phrase | three units |
| Romanized Kannada HOD | Historical `yaaru`/Latin HOD terms and current normalization support common forms | `cse_ds.hod` | `cse_ds.hod` |
| Malayalam HOD + fees + TechVidya | Historical HOD/fee regional vocabulary exists; exact event result not proven | HOD + fees only | three units |
| Hindi equivalent | Historical regional maps include HOD/fee/dept cues | all three units | three units |
| Tamil equivalent | Historical regional maps include HOD/fee/dept cues | all three units | three units |
| Telugu equivalent | Historical regional maps include HOD/fee/dept cues | all three units | three units |
| English equivalent | English keyword triggers | all three units | three units |
| Obvious Latin spelling noise | Older `SequenceMatcher` paths covered some longer Latin tokens; short tokens were protected from false positives | current semantic catalog uses exact cue/span matching, not general fuzzy distance | case-specific |

## What was lost or changed

**A. Regional trigger vocabulary removed? Partially.** The migration did not remove all regional support: the current semantic catalog has Kannada HOD/fee cues, regional department normalization, and Romanized question cues. But historical frontend HOD vocabulary was not carried over wholesale, and event vocabulary coverage is incomplete for Malayalam-bound TechVidya.

**B. Fuzzy matching replaced by exact semantic matching? Partially.** The current semantic topic/span catalog uses exact cue matching after normalization. Some older backend feature extraction still contains Latin-token `SequenceMatcher` behavior, but that is not the authority for the current unit plan. The current canonical parser does not fuzzy-match `ಸಚಿವರು` to HOD.

**C. Normalization became weaker? For these cases, yes.** Current normalization translates department names and selected particles, but it leaves `ಸಚಿವರು`, `ಸಂಖ್ಯೆ`, and Malayalam-bound `TechVidyaയെ` unresolved. It does not create a contextual interpretation from those words.

**D. Transliteration support disappeared? No, not globally.** Romanized Kannada such as `yaaru`, `eshtu`, `bagge`, and `vibhagada` is supported sufficiently for the tested canonical combination. Coverage is selective, not a general transliteration engine.

**E. Intent priority changed? Yes in a meaningful way.** The current parser defaults a single recognized department with no atomic topic to `overview`. That is why captured #1 becomes `cse_ds.overview`; it does not treat an unknown leadership-like word as HOD. This is safer against false positives but less tolerant of ASR substitutions.

**F. Did old logic accumulate multiple triggers while current resolves one dominant intent?** The old UI exposed broad trigger families and some multi-trigger arrays, but it did not provide the current ordered `(entity, topic)` composition contract. The current parser does accumulate recognized topics correctly; exact Kannada produces all three units. The loss is recognition of missing/noisy items, not a first-intent-only selector failure.

**G. Did locale JSON useful trigger phrases stop being consulted?** Locale JSON is content authority, not the current primary trigger vocabulary. The current semantic catalog and department identity modules own recognition. Historical locale text may contain natural terms, but there is no evidence that arbitrary locale prose is safely used as a trigger source today.

**H. Is an old path better for noisy regional STT?** The old Latin fuzzy/substring and explicit regional trigger maps are more tolerant in selected cases, but no old evidence proves the two captured Kannada forms. The old path is not safe to revive wholesale because substring matching and broad triggers can create false positives.

**I. Correct solution?** Yes, if approved: adapt the proven regional recognition knowledge into the current `SemanticRequest → ContentUnit → narration_plan` path. Do not revive legacy `showCard`/`cardsToSync` rendering or timed frontend card ownership.

## Phase 5 — smallest safe future change

The minimal eventual production change is a bounded, context-aware regional semantic normalization step before topic/entity span pairing:

1. Preserve native and Romanized department normalization.
2. Add only product-approved contextual substitutions for the observed ASR forms, requiring a department context and a person/leadership question cue rather than mapping a broad word globally.
3. Add a bounded Malayalam TechVidya/event identity form, including the attached Malayalam suffix form, only in the event entity matcher.
4. Keep topic accumulation and user order unchanged.
5. Keep unknown items observable and preserve valid items.
6. Keep English behavior unchanged through negative tests.

No implementation should begin until product owners confirm whether `ಸಚಿವರು` and `ಸಂಖ್ಯೆ` are acceptable ASR substitutions for HOD/Data Science. The forensic evidence alone cannot establish that semantic equivalence.

## Required regression cases for the later implementation

- exact Kannada HOD, fees, TechVidya, and all-three composition;
- captured Kannada #1 and #2 with the approved expected interpretation;
- Malayalam HOD + fees + TechVidya;
- Romanized Kannada HOD and all-three composition;
- Hindi, Tamil, Telugu equivalents;
- native, colloquial, mixed, reordered, omitted-particle, and bounded spelling variants;
- negative cases proving broad `ಸಚಿವರು` without department/person context does not trigger HOD;
- fee consistency across ContentUnit body, display text, TTS text, and metadata;
- partial-resolution preservation when one event/entity remains unresolved;
- English false-positive guards.

## Source-of-truth decision

For a valid canonical Kannada plan, ChatScreen, PresentationEngine, UnitSelector, and narration mapping are ruled out by the existing mounted/deterministic evidence and the production-orchestrator reproduction. For the failing captured transcripts, the expected HOD/event units never reach those downstream layers.

**STOP HERE. Do not modify production code, aliases, locale content, STT, ChatScreen, PresentationEngine, UnitSelector, narration, TTS, M5.8, commit, or push until this report is reviewed and the disputed ASR mappings are approved.**
