# M5.4 Semantic Cleanup — Final Report

Scope: consolidate ownership of semantic understanding, card triggering, fallback, and
frontend inference. **No LLM semantic router was added.** The deterministic stack now has one
owner per decision, and that is what this report proves.

Companion documents:

- [M5_4_SEMANTIC_CLEANUP_BASELINE.md](./M5_4_SEMANTIC_CLEANUP_BASELINE.md) — pre-change state
- [M5_4_SEMANTIC_AUTHORITY_MAP.md](./M5_4_SEMANTIC_AUTHORITY_MAP.md) — pre-change collisions
- [M5_4_CARD_TRIGGER_REGISTRY.md](./M5_4_CARD_TRIGGER_REGISTRY.md) — every card family
- [M5_4_FINAL_AUTHORITY_MAP.md](./M5_4_FINAL_AUTHORITY_MAP.md) — post-change ownership

---

## Headline

| Metric | Baseline | After |
|---|---|---|
| Backend pytest | 324 passed, **10 failed** | **378 passed, 0 failed** |
| Frontend `tsc --noEmit` | 0 errors | 0 errors |
| Vitest | 67 passed | 70 passed |
| Live WS acceptance (`:6969`) | not runnable as a matrix | 18/18 cases pass across six languages |
| Live browser acceptance (`:5176`) | not covered | 3/3 Playwright cases pass |
| Modules that can trigger a department card | 6 | 1 |
| Modules that can write a `unitId` | 1 | 1 (unchanged, extended in place) |

---

## 1. Response mode had no owner

**PROBLEM.** "Is this a card?" was answered independently by `route_policy`, `select_surface`,
`extract_features`, two Groq helpers in `main.py`, and three `inferForced*` functions in the
frontend. The answers disagreed, so the same sentence could card, answer, and refuse in the
same turn.

**ROOT CAUSE.** There was no `response_mode` anywhere in the system. Mode was *inferred* from a
`PolicyAction` plus a surface plus a post-orchestrator rewrite.

**OLD.** `PolicyAction` values were produced by threshold comparisons on an intent confidence
score, then re-derived downstream.

**NEW.** [response_decision.py](../backend/services/conversation/response_decision.py) returns
exactly one of `CARD | ANSWER | CLARIFY | FALLBACK`, with `items` (entity+topic pairs, never
unitIds), `clarification_target`, and `domain_relevance`. `route_policy` projects it;
everything downstream consumes it.

**PROOF.** `backend/tests/test_m54_card_fail_closed.py::TestNoCompetingCardAuthority`.

---

## 2. Mixed composition was impossible, and failure invented a deck

**PROBLEM.** `Data Science overview and AIML HOD` could not compose. `parse_semantic_request`
fail-closed on two topics, and the frontend then rendered a five-slide deck for whichever
department it happened to know.

**ROOT CAUSE.** Topics were detected as an unordered set with no positions, so no entity could
be bound to a topic. `UnitSelector` looped all entities for HOD and used the **first entity
only** for every other topic.

**OLD.** `len(atomic) >= 2 → None`, then a fail-open five-card overview downstream.

**NEW.**

- `match_department_spans_exclusive` returns positions, not just keys.
- [semantic_composition.py](../backend/services/content/semantic_composition.py) detects topic
  spans and binds entity↔topic by globally minimum distance.
- `SemanticRequest.items` carries ordered `(entity, topic)` pairs.
- `select_content_units` iterates `items`: N pairs become N independently addressable units in
  user order. No `maxHod`, no `slice(0, 2)`, no first-only, no family lock.
- Unbindable requests return `None`, and `None` now means CLARIFY everywhere.

**PROOF.** `test_m54_authority_matrix.py` classes A–F; live cases A–E.

---

## 3. Frontend was a second card authority

**PROBLEM.** `ChatScreen` re-read the user's text and could force comparison, bus routes,
trustees, and executive-profile cards, and could invent a department deck when the backend sent
no units.

**ROOT CAUSE.** These paths were written as compensation for backend multilingual gaps. Once
the backend gained native-script vocabulary, they became a competing authority that shadowed
real backend bugs.

**OLD.** `inferForcedDepartmentComparisonFromUserText`, `inferForcedBusRoutesFromUserText`,
`inferExecutiveProfileFromUserText`, a trustee keyword regex, and a five-slide builder reached
on any unit-less `department_overview`.

**NEW.**

- All three inference modules are gone (`busRoutesIntent.ts` and `departmentComparisonIntent.ts`
  deleted; `executiveLeadershipIntent.ts` reduced to its render type).
- The trustee regex is gone; trustees open from `showCard` or an explicit UI event.
- The deck builder now requires `uiClickDeckDepartmentRef`, set only by an actual menu click.
  A voice turn without unitIds renders no card.
- `localIntent` is retained for UI clicks, which is documented UI behaviour, not inference.

**PROOF.** `tsc --noEmit` clean, Vitest green, and no remaining `inferForced*` reference outside
historical forensic docs.

---

## 4. Mixed decks rendered the wrong department

**PROBLEM.** Even when the backend composed `cse_ds.overview` + `cse_aiml.hod`, the UI mapped
**all** models through one department's `buildDepartmentSlidesFromRecord`, so the AIML HOD slide
showed Data Science content.

**ROOT CAUSE.** Slide content was resolved from an active department in UI state instead of from
the unit identity.

**NEW.** `buildDepartmentSlideForUnit(data, unitId, language)` resolves each unit against the
department named in its own `unitId`. `activeDepartmentId` is left null for multi-department
decks so nothing downstream can re-collapse them.

**PROOF.** `frontend/src/lib/__tests__/mixedUnitSlides.test.ts`.

---

## 5. ANSWER sounded like FALLBACK, and short questions were downgraded

**PROBLEM.** "How good are the teachers here?" routed to ANSWER but spoke refusal copy.
"Campus life?" was treated as low confidence purely because it was two words.

**ROOT CAUSE.** `UNAVAILABLE_REPLY_BY_LANGUAGE` and `OFF_TOPIC_REPLY_BY_LANGUAGE` shared the
English admission-office sentence, and `score_intent_from_features` scored `NORMAL_QUERY` by
token count.

**NEW.** The two copies are distinct in every language, and token-count scoring is deleted —
intent confidence is now observability only, because routing belongs to `ResponseDecision`.

**PROOF.** `TestLInstitutionalAnswer`, `TestFallbackIsNotAnUnavailableAnswer`.

---

## 6. FOOD / ENVIRONMENT refused institutional questions

**PROBLEM.** "How is the canteen?" answered with the unknown template.

**ROOT CAUSE.** `UNSUPPORTED_TOPICS` was enforced as *unanswerable* in `policy_router`, when its
real meaning is *not card-representable*.

**NEW.** `SurfaceSelector` still refuses the card; the question is answered by RAG. The two
orchestrator tests that encoded the old contract were rewritten, not deleted.

**PROOF.** `test_conversation_orchestrator.py::UnsupportedTopicTests`.

---

## 7. Topic and intent theft

**PROBLEM.** "What is the capital of France?" became `COURSE_MENU` (`france` ≈ `branches`), "Do
students get opportunities?" became `DOCUMENTS`, "How are placements?" became a department
comparison, and `hello` was rejected as speech noise.

**ROOT CAUSE.** A 0.70 fuzzy threshold in `extract_features`, `" placements "` sitting in the
comparison cue list, `lex_multi` treating any two department mentions as a comparison, and
greetings living in the transcript filler list.

**NEW.** Fuzzy threshold raised to `_INTENT_FUZZY_MIN = 0.88`; placements removed from the
comparison cues; comparison now **requires** an explicit contrast or recommendation cue, so
naming two departments is no longer a comparison; greetings are recognised as speech.

**PROOF.** `TestMNFallback`, `test_placements_question_is_not_a_department_comparison`,
`test_greeting_is_a_greeting_not_a_speech_retry`.

---

## 8. Native-script identity gaps

**PROBLEM.** Hindi "डेटा साइंस" did not resolve to `cse_ds` although Kannada did, and Indic
combining marks were being stripped during normalization, breaking native-script topics.

**ROOT CAUSE.** `_inject_regional_department_tokens` lacked Devanagari and several Dravidian
entries, and `normalize_user_input` used `re.sub(r"[^\w\s&()]+", ...)`, which drops combining
marks.

**NEW.** Vocabulary completed at the single entity owner (not patched per language in the
parser), and normalization uses `strip_punctuation_keep_graphemes`.

**PROOF.** `TestGMultilingualNativeScript`, plus live cases G in all six languages.

---

## 9. Sticky department identity

**PROBLEM.** After discussing Data Science, a bare "Who is the HOD?" would silently card Data
Science instead of asking which department.

**ROOT CAUSE.** The parser accepted a carried CI department whenever the current text had none.

**NEW.** [semantic_anaphora.py](../backend/services/content/semantic_anaphora.py) admits a prior
entity only when the utterance refers back ("its fees", "ಅದರ", "उसका"). A new entity in the text
always wins.

**PROOF.** `TestOFollowUp`.

---

## Migrated / removed / retained

**Migrated to a single owner:** response mode, entity spans, topic spans, entity↔topic pairing,
card surface confirmation, narration composition, follow-up identity.

**Removed:** `_llm_detect_broad_course_intent`; the comparison fail-open to the first three
departments; the `is_card_intent` bypass in `resolve_presentation`; token-count confidence;
`UNSUPPORTED_TOPICS` → UNKNOWN; three frontend inference modules; the trustee keyword regex; the
unconditional five-slide fallback.

**Demoted:** `_llm_resolve_department_comparison_spec` (presentation detail only); Groq
`normalize_and_classify_query` (translation only); `extract_features` (non-department families
only); `select_surface` (naming only, after authorisation).

**Retained deliberately:** `localIntent` for UI clicks; the menu-click department deck; all
non-unit card surfaces in the trigger registry; the M5.2 PresentationEngine, playback, TTS clip
slots, turn fence, and dispatcher, which were not touched.

---

## Evidence

- Backend: `python -m pytest backend/tests -q` → **378 passed, 82 subtests passed**
  (baseline: 324 passed / 10 failed). New suites: `test_m54_authority_matrix.py` (A–O) and
  `test_m54_card_fail_closed.py`.
- Frontend: `npx tsc --noEmit` → clean. `npx vitest run` → **70 passed** (baseline 67).
  Vitest still reports collection errors for the Playwright `e2e/*.spec.ts` files; that is the
  documented baseline condition and those specs are run by Playwright, not Vitest.
- Live browser on the real `:5176` against the real `:6969`:
  `npx playwright test e2e/m54-authority.spec.ts` → **3 passed**, proving mixed decks render
  three distinct bodies from three different departments, and that unbindable or entity-less
  turns render no card at all.
- Live socket: `python scripts/m54_live_probe.py` against the real `:6969`, no mocked socket.
  Results in [m54_live_probe_output.txt](./m54_live_probe_output.txt): unitIds, count, order,
  and identity asserted for English, Kannada, Hindi, Tamil, Telugu, and Malayalam.

### Environment note

The Groq account's configured model (`llama-3.1-8b-instant`) returns HTTP 404 on this machine,
so free-text ANSWER turns fall back to their deterministic path. This is a credentials/model
configuration issue, not an M5.4 regression: it predates this work, affects only answer text
generation, and never touches mode selection, identity, or unitIds, all of which are
deterministic by design.

---

## Gate for the next milestone

The LLM semantic router may now be implemented, and it has exactly one seam:
`resolve_response_decision`. It must return the same `ResponseDecision` shape, must not write
`unitId`, and must not bypass `parse_semantic_request` → `UnitSelector`. Every invariant in the
[final authority map](./M5_4_FINAL_AUTHORITY_MAP.md) applies to it unchanged.
