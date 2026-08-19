# M5.4 Receptionist Intelligence Forensic Audit

**Status:** READ-ONLY. No production code, tests, prompts, routing, RAG, cards, or TTS were changed.  
**Date:** 2026-08-18  
**Scope:** Current intelligence, semantic routing, RAG, cards, fallback, multilingual, context, LLM, TTS handoff.  
**Target M5.4 architecture:** documented as a recommendation only. It is **not** implemented.

Evidence sources: in-process `ConversationOrchestrator` + `parse_semantic_request` (Groq client disabled for CI entity-LLM), live `ws://127.0.0.1:6969/ws/clara`, and the M5.3 mixed-input audit where it still holds. Probe artifacts: `docs/_m54_receptionist_probe.py`, `docs/_m54_receptionist_probe_out.json`.

---

## 1. Executive Summary

CLARA is **not** a single receptionist brain. It is two stacked systems plus a Groq answer shell:

1. **M5.3 ContentUnit stack** (authoritative for representable department cards):  
   `parse_semantic_request` → `SemanticRequest` → `UnitSelector` → `narration_plan.unitIds` → TTS clips.
2. **M1 Conversation Intelligence** (authoritative for *whether* to card, answer, greet, clarify, or unknown):  
   `extract_features` → `resolve_intent_from_features` → `route_policy` → `PolicyAction`.
3. **`main.py` post-orchestrator shell** (still competing): Groq translation/classify, RAG, comparison LLM, course-menu LLM, unavailable/off-topic templates, TTS.

**What currently makes CLARA look intelligent** is mostly **deterministic keyword / alias / catalog matching**, not a domain model of “card vs question vs irrelevant.”

**The receptionist gap is real and measured:**

| Input | Desired (M5.4 target) | Current |
|---|---|---|
| Who is the HOD of CSE Data Science? | CARD | CARD `cse_ds.hod` |
| CSE fees / CSE fees yestu? | CARD | CARD `cse.fees` |
| How good are the teachers here? | ANSWER (RAG) | Route ANSWER, **live Groq/unavailable → admission office** |
| How is campus life? (4 tokens) | ANSWER | **UNKNOWN template** (token-count confidence 0.50 < 0.60) |
| what is the capital of France? | OUT_OF_SCOPE | **COURSE_MENU** (`france`≈`branches` 0.714) |
| hello | GREETING | **NO_SPEECH_RETRY** (`hello` is a filler) |
| Who is its HOD? after DS overview | CARD hod of cse_ds | **No pronoun resolution** |
| Compare … with Harvard | OUT_OF_SCOPE / clarify | **DEPARTMENT_COMPARISON card** |

There is **no** first-class `response_mode ∈ {CARD, ANSWER, CLARIFY, FALLBACK}`. The closest reconstruction is `PolicyAction` plus later `main.py` intent mutations.

**M5.3 must not be broken:** unit identity, exclusive department matching, fail-closed multi-topic `None`, N-HOD UnitSelector. M5.4 should sit **in front of** UnitSelector, not replace it.

---

## 2. Current Repository State

| Item | Value |
|---|---|
| Branch | `main` |
| HEAD | `0cc81fc628b59e757b5044e61f0ca165f8762a1a` (25 Jul 2026 npm audit). **No M5.0–M5.3 commits.** Entire stack is uncommitted. |
| Dirty files | 126 paths (production + tests + docs + forensic probes) |
| Do not clean | Confirmed. Working tree left intact. |

**Process freeze (unchanged since 10:26 IST):**

| | PID | Start | Command |
|---|---|---|---|
| Backend :6969 | 3256 | 2026-08-18 10:26:11 | `python -m backend.main` (venv; no `--reload`) |
| Frontend :5176 | 29880 | 2026-08-18 10:26:12 | `vite --host=0.0.0.0 --port 5176 --strictPort` |

**Environment (names only; no secrets):** Groq key set; Sarvam TTS/STT key set; Postgres+pgvector configured; `RAG_MODEL=llama-3.1-8b-instant`; `RAG_TOP_K=5`; `RAG_CONTEXT_TIMEOUT_S=0.8`; `LLM_MAX_TOKENS=100`; `INTENT_CONFIDENCE_THRESHOLD=0.60`; `LOW_LATENCY_VOICE_MODE=true`; `AUTO_LANGUAGE_DETECT_ENABLED=true`. **Gemini is not used.**

### File classes

| Class | Examples |
|---|---|
| PRODUCTION | `backend/app/main.py`, `backend/services/**`, `frontend/src/**` (except tests) |
| TEST | `backend/tests/**`, `frontend/**/__tests__/**`, `frontend/e2e/*.spec.ts` |
| FORENSIC | `docs/_m53_*`, `docs/_m54_*`, `frontend/e2e/_m53_*` |
| LEGACY | `extract_features` / `resolve_intent_from_features` still live; `_resolve_department_overview`; Groq `normalize_and_classify_query`; ChatScreen `inferForced*` |
| DOCUMENTATION | `docs/M5_*.md`, `docs/MILESTONE*.md` |
| TEMPORARY | `docs/_m54_receptionist_probe_out.json` |

---

## 3. Current User-Input Call Graph

```
USER typed | STT transcript
    │
    ├─ frontend ChatScreen.interceptAndSendMessage
    │     typed/test: source VOICE → NO localIntent
    │     UI click: source UI → localIntent {trigger, departmentLabel}
    │     competing: inferForcedDepartmentComparisonFromUserText
    │                inferForcedBusRoutesFromUserText
    │                inferExecutiveProfileFromUserText
    │
    ▼
useWebSocket → outboundCommandDispatcher → ws://host:6969/ws/clara
    │
    ▼
backend/app/main.py websocket_clara
    └─ process_user_text_and_reply
          │
          ├─ ConversationOrchestrator.run(defer_narration=True)
          │     run_conversation_intelligence
          │       assess_transcript
          │       extract_entities_rules  [optional Groq JSON entities]
          │       normalize_semantic_topic   (FOOD/ENVIRONMENT/FEES/…)
          │       get_faq_answer_for_question (exact string)
          │       score_intent_from_features → extract_features
          │       route_policy → PolicyAction
          │     resolve_localization
          │     resolve_presentation → SurfaceSelector
          │                          → _maybe_override_to_department_overview_surface
          │                            (parse_semantic_request + UnitSelector)
          │
          ├─ maybe_auto_detect_session_language  (if session unlocked)
          ├─ attach_narration
          │     parse_semantic_request(raw text)
          │     select_content_units
          │     map_content_units_to_segments  OR  legacy _resolve_department_overview
          │
          ├─ [COMPETING] Groq normalize_and_classify_query (non-clear-English)
          ├─ [COMPETING] extract_features(merged translation+raw) AGAIN
          ├─ [COMPETING] localIntent intent overrides
          ├─ [COMPETING] _llm_detect_broad_course_intent
          ├─ [COMPETING] _llm_resolve_department_comparison_spec
          │
          ├─ RAG get_relevant_context  if should_call_rag / NORMAL_QUERY
          ├─ Groq _stream_groq_reply / _complete_groq_reply  if emit_groq
          │     history_for_llm(session)  last 3 turns ONLY here
          └─ TTS tts_to_base64_cached (Sarvam) from
                presentation_bundle.joined_spoken_text()  OR  Groq reply_text
                OR template short_circuit_reply
```

**WHO CALLS WHOM (production critical path)**

| Caller | Callee |
|---|---|
| `ChatScreen` | `useWebSocket.send` / dispatcher |
| `main.websocket_clara` | `process_user_text_and_reply` |
| `process_user_text_and_reply` | `ConversationOrchestrator.run`, then `attach_narration`, then Groq/RAG/TTS |
| `ConversationOrchestrator` | CI pipeline, `resolve_presentation`, `resolve_narration` |
| `resolve_narration` | `parse_semantic_request`, `select_content_units`, or legacy plan |
| `ChatScreen` on payload | `presentationCardsFromNarrationSegments`, PresentationEngine `activateByUnitId` |

---

## 4. Current Intelligence Architecture

Intelligence is **policy + keywords + catalog**, with Groq used as:

- optional entity JSON when rules find nothing
- multilingual preprocessor (translate/classify) — **after** narration attach
- RAG answer writer
- comparison department-id repair
- broad course-menu detector

There is **no** dedicated relevance classifier. “Institutional question” vs “out of scope” is either:

- token-count proxy on `NORMAL_QUERY`, or
- Groq instructed to emit the **same** admission-office sentence used for missing facts.

---

## 5. Semantic Authorities

| FILE | FUNCTION | INPUT | OUTPUT | CONSUMER | CLASS |
|---|---|---|---|---|---|
| `semantic_request_parser.py` | `parse_semantic_request` | raw text, lang, optional CI entities | `SemanticRequest` or `None` | UnitSelector, presentation override, narration | **AUTHORITATIVE** for unit identity |
| `unit_selector.py` | `select_content_units` | SemanticRequest | PresentationPlan unitIds | narration mapper, frontend | **AUTHORITATIVE** for N cards |
| `department_identity.py` | `match_department_keys_exclusive` | raw text | ordered json keys | parser | **AUTHORITATIVE** entity identity |
| `semantic_topics.py` + `catalog.py` | `detect_atomic_topics` | raw+normalized | topic set | parser | **AUTHORITATIVE** topic |
| `intent_confidence.py` | `score_intent_from_features` | text | intent + **heuristic** confidence | `route_policy` | **AUTHORITATIVE** for PolicyAction; **COMPETING** vs parser |
| `answer_generation.py` | `extract_features` | text | QueryFeatures | CI, main.py second pass | **COMPETING** / live |
| `answer_generation.py` | `resolve_intent_from_features` | features | INTENT_* | CI, main.py | **COMPETING** |
| `policy_router.py` | `route_policy` | CI bundle | PolicyAction | orchestrator | **AUTHORITATIVE** for short-circuit vs continue |
| `semantic_normalize.py` | `normalize_semantic_topic` | text | FOOD/ENV/FEES/… | policy, presentation | **AUTHORITATIVE** for FOOD/ENV unknown |
| `presentation_resolver.py` | `_maybe_override_to_department_overview_surface` | parse+plan | show_card surface | WS showCard | **CONSUMER** (surface alias) |
| `surface_selector.py` | `select_surface` | intent/localIntent | card surface | presentation | **AUTHORITATIVE** surface before override |
| `main.py` | `normalize_and_classify_query` | non-English text | translation + advisory intent | extract_features merge | **LEGACY / COMPETING**; must not drive unitIds (parser uses raw) |
| `main.py` | `_llm_detect_broad_course_intent` | text | bool | mutates intent → COURSE_MENU | **COMPETING** (can influence **surface**, not unitId) |
| `main.py` | `_llm_resolve_department_comparison_spec` | text | department_ids | comparison cinema | **COMPETING** — **LLM can change which depts appear** |
| `entity_extractor.py` | `extract_entities_llm_optional` | text | entities | merge into CI | **COMPETING** if rules empty |
| `faq_answers.py` | `get_faq_answer_for_question` | exact question | canned text | CI + main | **AUTHORITATIVE** exact FAQ |
| `core/rag.py` | `get_relevant_context` | query_en | chunk text | Groq prompt | **AUTHORITATIVE** retrieval |
| `session_state.py` | `history_for_llm` | session.history | last 6 msgs | Groq only | **CONSUMER** |
| ChatScreen | `inferForced*` | last user text | forced showCard | UI | **COMPETING** |
| ChatScreen | `normalizeCardTrigger` | backend showCard | trigger | card stage | **CONSUMER** (+ aliasing) |
| deleted | `intentClassifier.ts` / `intentNormalizer.ts` | — | — | — | **OBSOLETE** (deleted, uncommitted) |

**LLM does not write `unitId`.** UnitIds come only from UnitSelector (or are absent). LLM **can** influence comparison department lists and course-menu **surface**.

---

## 6. Card Trigger Architecture

**What causes a card (typed path):**

1. CI `is_card_intent(intent)` and confidence ≥ 0.75 → `PolicyAction.CARD_PRESENTATION`.
2. SurfaceSelector maps intent → `hod` / `department_overview` / `department_fees` / …  
3. If parser+UnitSelector plan is M5.2-representable, surface is forced to `department_overview`.
4. `attach_narration` builds segments with `unitId`.
5. WS `showCard` + `narration_plan`.
6. Frontend: if unitIds present and all `.hod` → HOD stage; else unit-backed slides; if **no** unitIds → **legacy five-slide deck** from `departmentId`.

| Question | Evidence |
|---|---|
| Multiple cards? | Yes. HOD loops all entities. Full-department = 5 units. |
| How is N determined? | `len(entities)` for HOD; descriptor list for full_department; 1 otherwise. |
| maxHod / slice(0,2)? | **No** on unit path. Comparison cinema **slice(0,3)**. |
| First-department logic? | **Yes in CI** `department_name`. Parser keeps user order. |
| SemanticRequest None? | No unitIds. May legacy-overview if surface already department_overview + leftover dept, or HOD prompt “please choose a department”. |
| Missing unitIds? | Frontend **fail-open** five-slide overview. |
| Accidental overview? | `showCard=department_overview` alias; full_scope cues (`bagge`/`heli`); missing unitIds. |
| Wrong department? | CI first-hit; fuzzy aliases. |
| LLM influence cards? | Comparison spec + course menu. **Not** HOD unitIds. |
| CI override semantic? | CI chooses **whether** to present; parser chooses **which units** when surface is department_overview. |
| Frontend independent card? | UI `localIntent`; `inferForced*` if backend showCard empty / comparison. |

---

## 7. Normal Question Architecture

**THIS IS THE RECEPTIONIST HOLE.**

CI treats non-card intents as `NORMAL_QUERY` with confidence from **token count only**:

| Tokens | Confidence | Policy (≥0.60 threshold) |
|---|---|---|
| ≥5 | 0.62 | **ANSWER** → RAG + Groq |
| 3–4 | 0.50 | **UNKNOWN** template (not RAG) |
| <3 and NORMAL | 0.35 | **ASK_CLARIFICATION** if <0.45 else UNKNOWN |

In-process vs live:

| Question | Policy | Live spoken |
|---|---|---|
| How good are the teachers here? (6 tok) | ANSWER, should_rag True | **Admission office unavailable sentence** |
| Tell me about campus life. (5 tok) | ANSWER | (in-process only; same Groq/unavailable risk) |
| How is campus life? (4 tok) | **UNKNOWN** | Kannada live: no card; probe missed template text |
| Are the professors experienced? (4) | UNKNOWN | — |
| Are there good labs? (4) | UNKNOWN | — |
| Is this college good for engineering? (7) | ANSWER | — |
| Can students participate in hackathons? (6) | ANSWER | — |
| Do students get opportunities? | **DOCUMENTS card** (`do students`≈`documents` 0.737) | — |
| How are placements? | **DEPARTMENT_COMPARISON** (cue `" placements "`) | — |

**The system cannot reliably distinguish CARD vs NORMAL INSTITUTIONAL vs OUT-OF-SCOPE vs AMBIGUOUS.**  
It distinguishes **card-keyword hit** vs **token-count NORMAL_QUERY** vs **filler/unknown**. That is not domain relevance.

Why ANSWER still becomes admission-office: Groq prompt (`main.py` ~1573–1585) uses `get_unavailable_reply`, which is **byte-for-byte the same English string** as `get_off_topic_reply`. Empty/timeout RAG (`0.8s`) or thin chunks → model emits that sentence. Live teachers question proves it.

---

## 8. RAG Architecture

| Piece | Current |
|---|---|
| Store | PostgreSQL + pgvector (`POSTGRES_*`) |
| Embeddings | local `sentence-transformers/paraphrase-multilingual-mpnet-base-v2` (768-d) |
| Retrieve | `get_relevant_context` → `get_similar_contents` |
| top-k | env 5; production call `min(RAG_TOP_K, 4)` |
| timeout | **0.8s** then empty |
| language | retrieve **English** chunks as canonical; Hindi may augment |
| empty | `_load_svit_json_context` json_fallback |
| cards | **no vector RAG** (`is_narrator_intent`) |
| answer model | Groq `llama-3.1-8b-instant`, `LLM_MAX_TOKENS` default **100**, temperature 0.1 |
| history | last 3 turns in Groq messages only |

**Can RAG answer “how good are the teachers?”**  
Architecturally yes (ANSWER + retrieve). **Empirically live: no** — user heard unavailable/admission office. Causes may be empty retrieval, timeout, missing corpus, or the prompt collapsing missing-fact and off-topic.

---

## 9. Fallback Architecture

Several **different** fallbacks share similar or **identical** user-visible English.

| Trigger | Action | Message owner |
|---|---|---|
| filler / low transcript conf (`hello` in fillers) | NO_SPEECH_RETRY | “didn't quite catch that” |
| FOOD / ENVIRONMENT topic | UNKNOWN | “don't currently have reliable information… admissions, departments…” |
| NORMAL_QUERY conf 0.45–0.59 | UNKNOWN | same unknown_reply |
| NORMAL_QUERY conf <0.45 | ASK_CLARIFICATION | “tell me a bit more” |
| Groq missing fact | unavailable_reply | **admission office** |
| Groq off-topic instruction | off_topic_reply | **same English as unavailable** |
| SemanticRequest None on HOD | spoken choose-department | narration_plan |
| Narrator payload None | intent forced NORMAL + RAG | main.py |
| Frontend no unitIds | five-slide overview | ChatScreen |

**Critical distinction (failed today):**  
“Not a card request” is **not** modeled. Short institutional questions become **UNKNOWN** (treated like unreliable/irrelevant). Longer ones become ANSWER then often **unavailable**, which users hear as fallback.

---

## 10. Relevance / Domain Detection

**Not present as a concept.**

No enum `INSTITUTION_RELEVANT | OUT_OF_SCOPE | AMBIGUOUS | UNSAFE`.

| Mechanism | Type |
|---|---|
| `normalize_semantic_topic` FOOD/ENVIRONMENT | keyword, then UNKNOWN (campus life **vibe** only; “campus life” alone is not ENVIRONMENT) |
| `INTENT_OFF_TOPIC` | **almost unused** in `resolve_intent_from_features` (no off-topic feature flag). Groq preprocessor *may* map OFF_TOPIC; presentation treats it as DIRECT template |
| Token-count NORMAL confidence | implicit pseudo-relevance |
| Groq system prompt “if not related to SVIT say {off_topic_reply}” | LLM, same string as missing-fact |

Measured: “capital of France” is **not** off-topic; it is a **course menu**. “Harvard comparison” is a **department comparison card**.

---

## 11. Multilingual Intelligence

| Layer | Behavior |
|---|---|
| Session language | UI picker; optional auto-detect (script / STT meta / fallback English) |
| TTS language | `TARGET_LANGUAGE_CODES` from session (`kn-IN`, …) |
| Parser | raw text + catalog + exclusive aliases; **does not need translation** |
| Normalization | `normalize_user_input` romanized maps (`yaaru`→who, `yestu`, `bagge`); **splits Kannada graphemes** via `_normalize_text` |
| Groq preprocessor | non-clear-English: translate to `query_en` for RAG/features **after** cards attached |
| RAG | English chunks; reply language via prompt |
| Cards | locale JSON by `language_code_key` |

Successful Kannada TTS on fees/HOD is **not** proof of understanding: units came from latin aliases `CSE`/`datascience`/`aiml`.

---

## 12. Code-Switching / Romanization

Confirmed working (M5.3 + this probe):

- `datascience mathe aiml du hod yaaru?` → `[cse_ds.hod, cse_aiml.hod]` (live Kannada)
- `CSE fees yestu?` → `cse.fees` (Kannada session, Kannada fee TTS)
- `CSE ಶುಲ್ಕ` / `CSE फीस` → in-process `cse.fees`

Gaps (unchanged from M5.3): Hindi native `डेटा साइंस` dropped; `mathe` unmapped; `requested_scope` always `single` for one atomic topic; no pronoun layer.

---

## 13. Context / Conversation Memory

| Store | Used by semantic parser? | Used by Groq? | Used by RAG query? |
|---|---|---|---|
| `session["history"]` max 3 turns | **No** | **Yes** (`history_for_llm`) | RAG query is **this turn** `query_en` only |
| `session["messages"]` UI | No | No | No |
| `session["conversation_entities"]` merged | **Not passed into parse** (`entities_for_pres` is **this turn only**) | No | No |

Live follow-up (English, one WS session):

| Turn | unitIds | intent |
|---|---|---|
| Tell me about Data Science. | 5-unit `cse_ds.*` | DEPARTMENT_OVERVIEW |
| Who is its HOD? | **same 5-unit overview** (no `its` → cse_ds.hod) | DEPARTMENT_OVERVIEW |
| What about AIML? | `cse_aiml.overview` (explicit alias) | DEPARTMENT_OVERVIEW |
| Who heads that one? | leftover AIML overview + showCard `hod` | HOD_PROFILE spoken **“Please say or choose a department”** |

**Pronoun / “that department” resolution is not implemented.** History does not mean the LLM or parser receives a discourse model.

---

## 14. Current LLM Usage

| Call | Provider | Model | Purpose | Influences unitId? |
|---|---|---|---|---|
| `normalize_and_classify_query` | Groq | `MULTILINGUAL_PREPROCESSOR_MODEL` default llama-3.1-8b-instant | translate + advisory intent | **No** (parser uses raw) |
| `extract_entities_llm_optional` | Groq | RAG_MODEL | JSON entities if rules empty | Indirect if CI dept hint only; parser prefers raw aliases |
| `_stream_groq_reply` / `_complete_groq_reply` | Groq | RAG_MODEL | receptionist text | No cards if authority CARD |
| `_llm_detect_broad_course_intent` | Groq | RAG_MODEL | force COURSE_MENU | **Surface yes** |
| `_llm_resolve_department_comparison_spec` | Groq | RAG_MODEL | department_ids ≤3 | **Comparison set yes** |
| Gemini | — | — | **not present** | — |

Failure handling: timeouts → skip preprocess / empty RAG / empty spec; Groq missing → empty reply strings.

---

## 15. Current Confidence Model

| Layer | Scale | Routing effect |
|---|---|---|
| TranscriptAssessment | 0–0.95 from length/filler | <0.35 or filler → NO_SPEECH_RETRY |
| IntentResult (card) | 0.88–0.93 **constants** | ≥0.75 → CARD |
| IntentResult (NORMAL) | 0.35/0.50/0.62 from **token count** | <0.45 clarify; <0.60 unknown; else ANSWER |
| SemanticRequest.confidence | HIGH/MEDIUM strings | UnitSelector rejects anything not HIGH/MEDIUM (LOW unused) |
| SurfaceSelection.confidence | 0.95–0.99 constants | display only |
| Groq | none | n/a |

**Not calibrated.** LOW SemanticRequest cannot invent unitIds (selector returns None). Card intents at 0.88 fire even without a department (`Who is the HOD?`).

---

## 16. Ambiguity Handling

`PolicyAction.ASK_CLARIFICATION` exists (`clarification_reply`) but fires mainly for **short NORMAL_QUERY** (e.g. `fuck you` 2 tokens → 0.35), **not** for missing department or multi-topic.

| Input | Behavior | Owner |
|---|---|---|
| Who is the HOD? | CARD hod, no units, “choose a department” | HOD without entity |
| Fees? | ADMISSIONS (fee without dept) | extract_features |
| Tell me about CSE and fees. | **FEES card only** (`cse.fees`) — not fail-closed, not clarify | single atomic topic `fees` |
| What about them? | UNKNOWN (3 tokens, 0.50) | token confidence |
| Which one? | likely clarify/unknown | length |
| Who is its HOD? | no coreference | parser+CI |

**Guessing happens more than clarification** (France→courses, opportunities→documents, placements→comparison).

---

## 17. Frontend Semantic Authority

| Mechanism | Class |
|---|---|
| Typed `localIntent` | **Not sent** (VOICE source) |
| UI clicks `localIntent` | **AUTHORITATIVE** for menu/department_click |
| `normalizeCardTrigger` | CONSUMER of showCard |
| `inferForcedDepartmentComparisonFromUserText` | COMPETING if comparison cues + ≥2 depts |
| `inferForcedBusRoutesFromUserText` | COMPETING |
| `inferExecutiveProfileFromUserText` | COMPETING when showCard empty |
| PresentationEngine + unitIds | CONSUMER |
| Empty unitId overview builder | LEGACY FALLBACK / fail-open |
| Deleted intentClassifier.ts | OBSOLETE |

Backend and frontend **can disagree** (backend overview + frontend forced comparison). Typed HOD path: frontend consumed unitIds correctly in M5.3.

---

## 18. TTS Boundary

```
CARD:     presentation_bundle.tts_text (unit body) → Sarvam(session tts_code)
ANSWER:   Groq reply_text → Sarvam
GREETING: template + optional greeting TTS (language pick / auto-detect)
FALLBACK: short_circuit_reply → same TTS helper
FAQ:      canned string → TTS
```

All four **can** reach TTS independently. Provider quota is a **provider** failure, not semantic (M5.3). Semantic wrong-route still TTS’s the wrong string (France course-menu prompt was spoken live).

---

## 19. Infrastructure Verification

| Check | Result |
|---|---|
| Backend current source | PID 3256 started after parser mtime; no uvicorn reload |
| Frontend Vite current | PID 29880; HMR; `ChatScreen.tsx` mtime 16 Aug < start |
| Ports | 6969 / 5176 only those PIDs |
| WS | browser/probes use `ws://localhost:6969/ws/clara` |
| Duplicate backend | venv launcher 17588 + listener 3256 only |
| Keys | Groq + Sarvam configured (values not copied here) |
| Stale build | Vite dev, not a cached prod bundle |

**INFRASTRUCTURE BLOCKER: NO.** Routing bugs are architectural.

---

## 20. Live Trace Evidence

Minimum eight traces (plus follow-up). Spoken text truncated.

| # | Input | Lang | Route | unitIds | RAG/card | Spoken |
|---|---|---|---|---|---|---|
| 1 | Who is the HOD of CSE Data Science? | en | CARD HOD | cse_ds.hod | no RAG | Nagashree hod_voice |
| 2 | How good are the teachers here? | en | ANSWER / NORMAL | none | Groq | **admission office unavailable** |
| 3 | what is the capital of France? | en | COURSE_MENU | none | no RAG | “Here are the departments… select one.” |
| 4 | CSE fees yestu? | kn | CARD FEES | cse.fees | no RAG | Kannada fee body |
| 5 | How is campus life? | kn session | in-process UNKNOWN | none | no RAG | live probe captured no spoken (template path) |
| 6 | datascience mathe aiml du hod yaaru? | kn | CARD HOD | cse_ds.hod, cse_aiml.hod | no RAG | Kannada DS HOD body |
| 7 | Who are the HODs of AIML and Data Science? | en | CARD HOD | cse_aiml.hod, cse_ds.hod | no RAG | Manjunatha then DS |
| 8 | Follow-up DS → its HOD → AIML → heads that | en | see §13 | no pronoun | — | choose-department on last |

In-process matrix for the remaining required sentences is in `docs/_m54_receptionist_probe_out.json`.

---

## 21. Competing Authorities

1. **Parser vs `extract_features`** — two department/topic systems. Cards that are M5.2-representable follow parser; CI still picks PolicyAction and `departmentId`.
2. **`main.py` second `extract_features`** after Groq translation vs orchestrator intent.
3. **SurfaceSelector vs presentation override** (`hod` vs `department_overview`).
4. **Groq comparison/course-menu** vs catalog.
5. **Frontend inferForced\*** vs backend showCard.
6. **Legacy five-slide deck** vs unitIds.
7. **Unavailable vs off-topic vs unknown vs clarify** — four policies, two identical English strings.

---

## 22. Architectural Debt

### A. MUST REMOVE BEFORE M5.4 (or isolate behind a gate)

- Treating **token count** as relevance (`NORMAL_QUERY` 0.50 → UNKNOWN).
- Fuzzy `_sim >= 0.7` on course/documents **without** length guards (`france`→`branches`, `do students`→`documents`).
- Comparison cue `" placements "` stealing PLACEMENTS.
- `hello` listed as transcript **filler** (blocks GREETING).
- Identical `UNAVAILABLE_REPLY` and `OFF_TOPIC_REPLY` English.
- `main.py` intent mutations after orchestrator (`COURSE_MENU` LLM, comparison LLM) as **silent card authority**.
- Frontend fail-open overview when unitIds missing.
- Passing **this-turn-only** entities so session memory cannot resolve “its HOD”.

### B. MUST KEEP

- `SemanticRequest` / exclusive identity / UnitSelector / unitIds on WS.
- Fail-closed multi-atomic-topic `None`.
- ResponseAuthority seal (card vs groq vs template).
- Locale ContentUnits + Sarvam TTS boundary.
- Exact FAQ matcher (narrow, safe).

### C. MUST REFACTOR

- One **response_mode** owner (CI policy today, main.py tomorrow — pick one).
- `requested_scope=multi` for N-entity HOD (IR honesty; UnitSelector already loops).
- Grapheme-safe normalize on `normalize_user_input`.
- Catalog completeness for native-script departments.

### D. SAFE TO REUSE

- Vocab catalog pattern; department_identity; presentation bundle; TTS clip slots; orchestrator skeleton; FAQ JSON; RAG **store** (not the 0.8s/unavailable prompt contract).

### E. UNKNOWN — NEEDS EVIDENCE

- Whether `college_knowledge` / pgvector actually contains teacher quality / campus life / labs facts.
- Whether RAG timeout 0.8s is the teachers-question failure vs empty corpus vs prompt.
- Follow-up turn-2 WS frames vs genuine overview re-plan (turn-4 is unambiguous).

---

## 23. Current Failure Modes

1. **Keyword collision cards** (France, opportunities, placements-as-compare).
2. **Short institutional questions → UNKNOWN**, not RAG.
3. **Long institutional questions → ANSWER → admission-office** (unavailable=off-topic).
4. **No coreference.**
5. **External college compare → internal department comparison.**
6. **Abuse / injection:** no dedicated filter; short abuse → clarify; long text could hit Groq.
7. **HOD without entity** still CARD surface.
8. **Multi-topic “CSE and fees”** collapses to fees, does not clarify.
9. **Latent overview fail-open** if unitIds drop.

Contradiction vs M5.3 mixed-input report: **none** on the mixed HOD sentence — still correct units. This audit **adds** that receptionist/normal-question routing is the broken layer *around* that stack.

---

## 24. What M5.4 MUST NOT BREAK

- Exclusive longest-span department identity (`cse` vs `cse_ds`).
- Multi-HOD N units in user order.
- Fail-closed: ≥2 atomic topics → no invented unitId.
- Unit-backed frontend (no hidden 5-slide expansion when unitIds exist).
- PresentationEngine activation by `unitId`.
- TTS clip identity = unitId (M5.2/M5.3 playback).
- ResponseAuthority: cards must not be rewritten by Groq reply text.

---

## 25. Requirements for Future LLM Layer

**Where it sits (recommendation, not implemented):**

```
normalize (grapheme-safe, no translation-as-identity)
    → DETERMINISTIC parser (entities, catalog topics)  [always runs]
    → LLM receptionist interpreter (optional, validated)
         output: {response_mode, topic?, entities[], confidence, notes}
    → VALIDATOR (entities ⊆ catalog; topic ∈ enum; mode ∈ CARD|ANSWER|CLARIFY|FALLBACK)
    → if CARD and valid: UnitSelector (LLM never emits unitId)
    → if ANSWER: RAG + answer LLM (separate call)
    → if CLARIFY / FALLBACK: templates
```

**Receive:** raw text, session language, **validated** previous entity list, last SemanticRequest, not raw WS dumps.

**Output:** structured IR, never unitIds, never TTS text for cards.

**NEVER control:** unitId, json department keys outside catalog, presentation order, TTS provider, clip assembly.

**Fail:** use deterministic parser only; if still invalid → CLARIFY or FALLBACK, **not** overview.

**Low confidence:** CLARIFY; no cards unless parser HIGH/MEDIUM alone would have produced the same units.

**Invalid entities:** drop; do not nearest-neighbor a department.

**Normal question:** ANSWER + RAG; **not** UNKNOWN merely because it is not a card.

**Card request:** parser/validator → UnitSelector.

**Ambiguous:** CLARIFY with what is missing (department vs topic).

**Irrelevant:** FALLBACK template distinct from missing-fact.

---

## 26. Recommended Architecture

Target (from the mission). Current closest mapping:

| Target box | Current owner | Gap |
|---|---|---|
| LANGUAGE / NORMALIZATION | session + `normalize_user_input` + optional Groq translate | translate not identity; grapheme split |
| SEMANTIC UNDERSTANDING | **split** parser vs extract_features | must unify |
| RELEVANCE / DOMAIN | **missing** | token-count + Groq string |
| CARD REQUEST | CI card intent + parser | collisions |
| NORMAL QUESTION | ANSWER iff ≥5 tokens then Groq | threshold + unavailable |
| FALLBACK | many templates | overlapped copy |
| CLARIFICATION | rare | used as short-query dump |

Recommended M5.4: **one SemanticRouter** producing `response_mode`, then existing UnitSelector **unchanged** for CARD.

---

## 27. Migration Strategy

1. Freeze M5.3 unit tests; do not touch PresentationEngine/TTS provider.
2. Introduce `response_mode` as a **pure function** beside CI; log-only (shadow).
3. Replace token-count UNKNOWN for institutional-length questions with ANSWER (still no new LLM).
4. Split unavailable vs off-topic copy.
5. Remove/guard fuzzy collisions (`branches`/`documents`/` placements `).
6. Stop `hello` filler from blocking greeting.
7. Add validator boundary; only then add LLM interpreter **behind** it.
8. Discourse: pass last validated entities into parser `ci_entities` for “its HOD”.
9. Only after shadow equality on M5.3 golden HOD/fees matrix, switch CI PolicyAction to SemanticRouter.

---

## 28. Test Strategy

- Keep all `test_m53_*` / unit selector / fail-closed tests **green, unmodified** this phase.
- New (later): golden matrix CARD vs ANSWER vs CLARIFY vs FALLBACK for this audit’s sentences.
- Live WS: France must **not** be course_menu; teachers must **not** be admission-office unless corpus empty (assert retrieval non-empty separately).
- Follow-up: “its HOD” after DS overview → `cse_ds.hod` only.
- Never weaken existing tests to admit collisions.

---

## 29. Open Questions

1. Does pgvector contain teacher/campus-life/labs chunks? (live unavailable unexplained)
2. Should ENVIRONMENT include “campus life” without “vibe”? (today it does not; 4-token UNKNOWN fires first anyway)
3. Is comparison-with-Harvard in-scope marketing or out-of-scope?
4. Should `Who is the HOD?` clarify vs guess last department?
5. Groq preprocessor intent: is it ever still merged into card intent after orchestrator?

---

## 30. Explicit STOP / NO IMPLEMENTATION

This document is **forensic understanding plus a technically justified M5.4 recommendation**.

- No production code was modified.
- No tests were modified.
- No LLM was added.
- Cards, RAG, fallback, and TTS were not changed.
- The target receptionist architecture is **not** implemented.

STOP.

---

## Decision matrix

| Capability | Current implementation | Owner | Reliable? | Competing? | M5.4 action |
|---|---|---|---|---|---|
| Language | Session picker + optional auto-detect + Groq translate | session_language, detect_language, preprocessor | Session yes; romanized auto-detect weak | Translate vs raw parse | Keep session; never translate identity |
| Normalization | token_map + catalog casefold + `_normalize_text` | answer_generation, unicode_text | Mixed latin yes; Indic graphemes no | Two normalize paths | One grapheme-safe path |
| Entity | exclusive aliases + CI first-hit label | department_identity vs extract_features | Parser yes | **Yes** | Parser authoritative; CI label not composition |
| Topic | catalog atomic + CI keywords | semantic_topics vs extract_features | Cards yes | **Yes** | Catalog + validator |
| Scope | full_department cues; HOD stored as `single` | parser | Partial | IR lie | `multi` for N HOD |
| Relevance | **absent** (token count + Groq string) | policy_router, prompts | **No** | n/a | New domain decision |
| Card decision | CI card intent ≥0.75 + representable plan | policy + override + UnitSelector | HOD/fees yes; collisions no | Groq course/compare, frontend infer | Validator + UnitSelector only |
| Normal answer | ANSWER if ≥5 tokens then Groq+RAG | policy + main.py | **No** (unavailable) | UNKNOWN threshold | ANSWER ≠ not-a-card |
| RAG | pgvector + 0.8s + EN chunks | core/rag.py | Unknown corpus quality | json_fallback | Keep store; fix contract/timeout |
| Fallback | 4+ templates, 2 identical EN strings | templates, unavailable, off_topic | Confusing | **Yes** | Distinct FALLBACK vs MISSING_FACT |
| Clarification | ASK_CLARIFICATION on short NORMAL | policy_router | Rarely used correctly | UNKNOWN overlap | Use for missing slots |
| Context | history→Groq only; no pronouns | session_state | Groq maybe; cards **no** | — | Pass last entities to parser |
| Confidence | constants + token buckets | intent_confidence | Uncalibrated | — | Calibrate; never invent unitIds |
| TTS | Sarvam from bundle or reply | main.py TTS | Provider-dependent | — | Keep boundary; don’t route here |

---

## Required final answers

1. **What currently makes CLARA intelligent?**  
   Deterministic catalogs (departments, topics, fees/HOD cues), exclusive span matching, UnitSelector, plus Groq as a short-answer writer on the leftover path.

2. **What appears intelligent but is deterministic?**  
   Almost all cards; FAQ exact match; FOOD/ENV unknown; greetings/small-talk (when not swallowed as filler); multilingual HOD/fees via aliases.

3. **Semantic bottleneck?**  
   Dual authority (`extract_features` PolicyAction vs `parse_semantic_request` units) and **no relevance model**. Post-orchestrator `main.py` mutates intent again.

4. **Where multilingual fails?**  
   Native-script department names (Hindi DS), grapheme-splitting normalize, romanized conjunctions unused, session language ≠ parser (parser is language-independent but catalog is latin-heavy).

5. **Where normal-question understanding fails?**  
   Token-count UNKNOWN; keyword collisions to cards; ANSWER path emitting admission-office unavailable.

6. **Why do normal questions reach fallback?**  
   (a) 3–4 tokens → UNKNOWN; (b) ≥5 tokens → Groq with identical unavailable/off-topic instruction and/or empty RAG.

7. **Can current RAG answer institutional questions?**  
   It is **wired** to; live teachers question **did not**. Corpus/timeout/prompt unproven.

8. **What decides card vs normal answer?**  
   `route_policy`: card-intent & conf≥0.75 → CARD; else NORMAL conf≥0.60 → ANSWER; else UNKNOWN/CLARIFY. **Not** “is this a card request?”

9. **Competing semantic authorities?**  
   Yes — §21.

10. **ONE semantic authority?**  
    A validated **SemanticRequest + response_mode** produced in front of UnitSelector. UnitSelector remains the only unitId authority.

11. **Where should the future LLM sit?**  
    After deterministic parse, before UnitSelector/RAG, output schema only (§25).

12. **What should the LLM control?**  
    Proposed `response_mode`, optional topic/entities **as candidates**, clarification questions. Answer wording on ANSWER mode only.

13. **What should the LLM NEVER control?**  
    `unitId`, catalog keys, clip order, TTS, fail-open overview.

14. **Prevent hallucinated unitIds?**  
    LLM cannot emit them. Validator: entities ⊆ registry. UnitSelector fail-closed. LOW → no plan.

15. **Handle ambiguity?**  
    CLARIFY with missing slot (department vs topic). Do not guess last dept unless discourse state is explicit.

16. **Preserve M5.2/M5.3?**  
    Do not change UnitSelector/PresentationEngine/TTS clips; add a router in front; shadow-log first.

17. **Remove before M5.4?**  
    Token-count-as-relevance; unguarded 0.7 fuzzy card intents; placements comparison cue; hello-as-filler; identical unavailable/off-topic; silent Groq card mutations; missing-unitId overview fail-open.

18. **Reuse?**  
    Parser, catalog, UnitSelector, exclusive identity, authority seal, locale units, RAG store, FAQ exact, orchestrator frame.

19. **Redesign?**  
    Receptionist decision (card/answer/clarify/fallback), relevance, discourse, Groq prompt contract, CI vs parser unification.

20. **Safest sequence?**  
    §27: shadow router → fix deterministic collisions/thresholds/copy → discourse entities → then LLM behind validator.

---

*End of audit. STOP. No implementation.*
