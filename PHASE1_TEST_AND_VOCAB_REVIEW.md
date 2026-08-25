# PHASE1_TEST_AND_VOCAB_REVIEW.md

Read-only quality review of `MULTILINGUAL_VOCABULARY_AUDIT.md` and `backend/tests/test_phase1_regional_card_regression.py`, to judge whether both are safe guides for Codex's Phase 2A implementation. No files other than this report were created or modified.

Evidence basis: full reads of the audit and the test file; direct inspection of `department_identity.py` (`match_department_spans_exclusive`:80, `match_department_keys_exclusive`:114), `semantic_vocab/catalog.py`, `semantic_composition.py`, `semantic_request_parser.py`, `content_unit_registry.py`, and all five regional locale JSONs; plus an actual execution of the suite (**443 collected: 438 passed, 5 failed**).

---

## 1. Executive conclusion

**Conditionally safe — with four material caveats.**

1. **The baseline no longer measures what its docstring claims.** The module docstring says `TestNewlyCapturedRegionalRegression` "is intentionally red until production vocabulary/normalization is repaired," yet 436 of its 441 parametrized cases **already pass**, because the in-flight Phase 2A vocabulary (localized display names and native HOD terms now present in `catalog.py`) has been landed alongside the test. The file has silently become a *green gate for Phase 2A* rather than a *record of the pre-repair baseline*. That is acceptable — arguably better — but anyone reading the docstring will misinterpret failures, and there is no longer any executable record of which cases were broken before. If the original red-state matters, capture it now (git history or a snapshot fixture) before further Phase 2A edits.
2. **The only genuine red tests expose a real, non-vocabulary defect:** `resolve_response_decision` returns `mode=CARD` with `items=()` and evidence `'non_unit_card_intent'` for an unknown department ("quantum department fees"). This is exactly the kind of bug the baseline should catch — see §5/§8. Codex must not "fix" this by weakening the test; the decision layer needs an empty-items guard.
3. **Two assertions encode undesired current behaviour** (`test_native_script_alias_currently_has_substring_false_positive`, and the overview-default test) and one encodes a debatable product default. Each will block a correct Phase 2B change unless updated deliberately (§5, §6).
4. **The audit's linguistic recommendations are sound at the architecture level but carry unverified native terms** — most importantly the Telugu achievements cue సాధన, which is now asserted green in the suite and is a live false-positive hazard (§4).

---

## 2. Incorrect or questionable mappings

| # | Item | Location | Problem | Severity |
|---|---|---|---|---|
| Q1 | hi HOD tested term `विभागाध्यक्ष` vs locale-displayed title `प्रमुख` (hi.json `role_holders.hod_by_department.cse.hod_title` ends "...विभाग के प्रमुख") | test:63; catalog (now contains विभागाध्यक्ष) | Users who read the card see प्रमुख; the parser accepts only विभागाध्यक्ष. A user echoing the on-screen word gets no card. Either alias both or align them. | High |
| Q2 | te achievements `సాధన` | test:78; catalog:88 | Ordinary Telugu word ("means/instrument/tool"); Indic topics match as substrings (`semantic_topics.py:33`), so any Telugu utterance containing it fires an achievements topic. Now asserted green, i.e., the baseline *locks in* the unsafe alias. | High |
| Q3 | kn achievements cue `ಸಾಧನ` vs canonical copy `ಸಾಧನೆಗಳು` (kannada_terms.py) | catalog:85 | Stem mismatch: the tested/queryable term differs from the user-visible copy. Same echo-the-screen failure mode as Q1, Kannada variant. | Medium |
| Q4 | ml HOD tested term `വിഭാഗത്തിന്റെ മേധാവി` | test:84 | Genitive *phrase* ("the head of the department"), not a standalone title. Fine inside a sentence; awkward/unnatural as an isolated topic query. Acceptable alias, questionable atomic term. | Low |
| Q5 | ta/te/ml cse_ds/cse_cysec/cse_bs display names keep Latin `CSE (...)` prefix while the parenthetical is native (e.g., `CSE (தரவு அறிவியல்)`) | locale JSONs | Correctness of mapping depends entirely on the native parenthetical being an alias; if any one is missing from the identity table, the Latin `CSE` prefix matches the **parent** instead (see §7). Tests currently guard each one individually — good — but the structural risk remains for future aliases. | Medium |
| Q6 | Audit §8 marks ~30 utterances [UNVERIFIED] and the audit itself flags this, but the test file's `NATIVE_TOPIC` terms were promoted into production catalog without the recommended native-speaker gate | catalog vs audit §11 | The verification step the audit demanded was skipped in the Phase 2A landing order. | Medium |

No incorrect *canonical* mappings found: every display name maps to its own key, and every specialization resolves to itself, never to its parent (verified by execution of `test_department_identity_resolution` and `test_every_native_department_and_topic` across all 55 language×department pairs).

---

## 3. Safe mappings

Verified correct by inspection and by the passing suite:

- All 11 canonical IDs × 5 regional display names resolve exclusively to their own key (`test_department_identity_resolution`, 55 cases, green).
- Topic terms per language that come straight from `catalog.py` (overview/fees/placements everywhere; kn HOD set incl. STT variants; te/ml fees; hi/ta placements transliterations) are safe deterministic aliases — distinctive strings, low embedding risk except where noted (Q2).
- English acronym tier (`cse`, `ise`, `ece`, `mba`, `aiml`, compound forms) with Latin word-boundary matching is safe; the three negative probes (`civilization`, `mechanically`, `showcase`) confirm boundaries hold.
- Locale structure supports the mappings: `departments.<key>.name` exists for all keys in `DEPARTMENT_JSON_KEY_ORDER` in all six locales (asserted structurally at test:110-124).
- No two canonical departments share an unsafe alias at the identity-matcher layer today; the known shared aliases (`management` MBA/trustees, who-words fees/HOD) live in the *legacy* layer, outside this suite's scope — tracked in audit §6.

---

## 4. Native HOD terminology review

Terms as asserted in `NATIVE_TOPIC` (test:53-89); provenance checked against `catalog.py` (all five now present) and locale `hod_title` strings.

| Lang | Term | Classification | Rationale |
|---|---|---|---|
| kn | `ವಿಭಾಗದ ಮುಖ್ಯಸ್ಥರು` (+ ಮುಖ್ಯಸ್ಥ, ಹೋಡ್, ಹೆಡ್, ಹೆಚ್ಒಡಿ, ಹೆಚ್ಓಡಿ, ವಿಭಾಗದ ಹೆಡ್) | **Safe deterministic alias** | Long, distinctive, matches locale title wording; multi-word form resists embedding. Short variants ಹೆಡ್/ಹೋಡ్ are **acceptable alternate aliases** but carry mild embedded-compound risk once Indic boundaries tighten. |
| hi | `विभागाध्यक्ष` | **Linguistically uncertain / questionable** (Q1) | Correct word for "department head", but NOT the term the UI displays (प्रमुख). As a parser alias: **safe deterministic alias** (distinctive, long). As the sole tested term: wrong target. Add प्रमुख as an **acceptable alternate alias** only with care — प्रमुख also means "prominent/principal" generally; medium breadth. |
| ta | `துறைத் தலைவர்` | **Safe deterministic alias**, pending native confirmation | Matches locale title suffix exactly ("...துறைத் தலைவர்"); distinctive compound. சாதனை/கட்டணம் neighbours are likewise safe. |
| te | `విభాగం అధిపతి` | **Acceptable alternate alias**, pending native confirmation | Multi-word phrase matches locale title. Note the bare word అధిపతి ("chief/boss") would be **too broad** if ever aliased alone. The sibling te achievements term సాధన is separately **ambiguous/too broad** (Q2) and is the single worst term in the table. |
| ml | `വിഭാഗത്തിന്റെ മേധാവി` | **Acceptable alternate alias** | Phrase-form, distinctive; slightly unnatural as a standalone query (Q4). Bare മേധാവി would be acceptable; bare തലവൻ-class generics would be too broad. |

Cross-cutting: none of these terms has documented native-speaker verification anywhere in the repository. Per the instruction not to invent additional translations, none are proposed here; the gap is recorded in §10.

---

## 5. Phase 1 assertion quality

Class-by-class:

### TestExistingPassingBehaviour — good
Correctly describes desired behaviour; tight unit tuples; dedup and clarify contracts are precise. Two notes:
- `test_unknown_non_atomic_topic_does_not_create_units` (bus routes → None) is desired behaviour, well pinned.
- `test_unknown_native_department_does_not_card` (test:203-204, English variant) asserts `"CSE quantum curriculum" == ("cse.overview",)` — this **documents a questionable fallback** (any unrecognized topic silently becomes overview). It may be intentional UX, but it must be a conscious decision; a stricter policy would clarify instead. Flagged for human confirmation (§10).

### TestNewlyCapturedRegionalRegression — mostly green, docstring stale
As covered in §1: the "intentionally red" framing is obsolete (438/443 pass). The assertions themselves are high quality: they check units AND decision-mode AND non-duplication, and the unknown-department cases are the only true reds — correctly catching the empty-CARD defect (`resolve_response_decision` returning CARD with `items=()` for `ക്വാണ്ടം വിഭാഗം ഫീസ്` etc.). **These 5 tests cannot pass via vocabulary work; they require a decision-layer fix. Codex must know this — they are not Phase 2A's to satisfy.**

### TestParserBoundaries — excellent
Precisely layered (identity → topic spans → parser → unit selection → decision), so a future failure localizes itself. One caveat: `test_native_missing_department` asserts `clarification_reason == "missing_department"` when the input is *only* a topic term. For te this passes partly *because* సాధన is recognized — meaning the test currently validates the ambiguous alias's existence. If Phase 2B removes/demotes సాధన, this case still passes (unrecognized → None → clarify), so no blockage; just noting the coupling.

### Could-pass-while-broken risks
- `_decision()` merges legacy intent + semantic request; a regression confined to the legacy ladder would not flip any assertion here (semantic path dominates CARD decisions). The legacy path is essentially unguarded by this file — acceptable for Phase 1 scope, but worth stating.
- `assert len(units) == len(set(units))` catches duplicates but nothing asserts ordering stability across the semantic/legacy merge beyond the fixed expected tuples — those do cover order, so this is fine.

### Could-block-a-correct-later-fix
See §6 items C4/C5 and the overview-default test above.

---

## 6. Collision-test review (the 17 passing `TestCurrentCollisionBehaviour` tests)

Composition: 6× Hindi-alias-under-every-selected-language + 6× English-acronym-inside-regional-sentence + 1× longest-match precedence + 3× short-alias-negative + 1× Indic-substring false positive = 17. Verdicts:

| Group | Encodes… | Verdict |
|---|---|---|
| C1: `सीएसई फीस` resolves under all 6 selected languages | Desired behaviour (language-global matching enables code-switching) | **Keep.** But it hard-codes the *no-language-filtering* policy: if Phase 2B introduces selected-language priority with a universal tier, सीएसई must be reachable under `en` too (via universal tier or priority+fallback). The test as written permits either implementation — good. |
| C2: `ದಯವಿಟ್ಟು CSE ಶುಲ್ಕ` under all languages | Desired behaviour (English acronyms work inside regional sentences) | **Keep.** Directly encodes audit §9 item 3's universal-acronym requirement. |
| C3: longest-match `CSE Data Science fees → cse_ds` | Desired behaviour | **Keep** (see §7). |
| C4: `civilization/mechanically/showcase → ()` | Desired behaviour (Latin word-boundary discipline) | **Keep.** Genuine regression tripwire. |
| C5: `ಅಸಿಎಸ್ಇಯ → cse` | **Existing undesired behaviour** (Indic substring matches inside a declined word — "ಅಸಿಎಸ್ಇಯ" is not "CSE") | **Will block Phase 2B.** The comment admits Phase 2 must decide boundary policy, but as a hard assert it makes the correct fix fail CI. Convert to an explicit expected-failure marker or update it in the same commit that lands Indic boundary checking. |

Net: 15 of 17 encode desired behaviour and are valuable guards; 1 (C5) documents debt as a green assert; the group collectively pins the *global-matching* policy that Phase 2B intends to revise — they constrain *how* language prioritization may be implemented (acronyms + cross-language fees must survive) without forbidding it. That is the right shape.

---

## 7. Compound-department expectations

Recommended exact contract (consistent with C3 and the exclusive-span matcher):

| Input span | Expected canonical | Rule |
|---|---|---|
| `CSE` alone | `cse` | Parent only when no specialization token co-occurs in the same utterance |
| `CSE Data Science` / `CSE (Data Science)` / `data science` | `cse_ds` | Longest-span exclusive; the `cse` range inside the compound is consumed, never emitted |
| `CSE Cyber Security` | `cse_cysec` | same |
| `CSE AI & ML` / `AIML` | `cse_aiml` | same |
| `CSE Data Science and CSE` (mixed) | `(cse_ds, cse)` | Specialization consumes its own span; trailing bare parent still resolves independently |
| `CSE Business Systems`, `CSE DS` | `cse_bs`, `cse_ds` | same; note bare `DS` is only safe with exact-token matching (audit §6.1) |
| Localized compounds, e.g. `CSE (ಡೇಟಾ ಸೈನ್ಸ್)` | `cse_ds` | The Latin prefix must never satisfy the match alone when a specialization alias covers a longer span; if the native parenthetical lacks an alias, the matcher must return `()` or `cse` — **returning parent silently is forbidden**; the suite's per-name equality asserts enforce this today |

The suite currently verifies rows 2–3 and the localized single-name cases. Missing (recommended additions for Phase 2B, not implemented here): mixed parent+specialization in one utterance, and the explicit "no silent parent fallback" negative case for a hypothetical unaliased specialization name.

---

## 8. Risks Codex should be checked against

1. **Empty-CARD decision defect** (the 5 red tests): `ResponseDecision(mode=CARD, items=(), evidence='non_unit_card_intent')` is emitted for unknown departments. Any Phase 2A work touching `response_decision.py` must fix this at the decision layer, not in vocabulary. Vocabulary changes cannot make these green.
2. **Stale docstring → misread failures**: contributors may treat unexpected reds as "expected baseline reds." Update the module docstring when the baseline flips green (documentation change, out of scope here).
3. **సాధన lock-in**: the te achievements alias is asserted green in two places (topic resolution + multicard). Demoting/replacing it in Phase 2B will break `test_native_semantic_topic_resolution[te-achievements]` and the te multicard case. Sequence the replacement with test updates; do not let the green state veto the safety fix.
4. **C5 substring assert** blocks Indic boundary work (§6).
5. **Language-priority implementation must preserve C1/C2**: hard filtering by session language would break both 6-case groups and real code-switched queries (e.g., faqSuggestions fixtures mixing scripts).
6. **ZWJ/ZWNJ spelling pairs**: tests use the exact catalog spellings (e.g., ಪ್ಲೇಸ್‌ಮೆಂಟ್ with ZWJ). NFC-folding in Phase 2B must keep both enumerated spellings matching during transition or the suite regresses spuriously.
7. **hi प्रमुख gap (Q1)**: users echoing on-screen titles get no recognition; if Codex adds प्रमुख, watch its breadth ("prominent").

---

## 9. Recommended Phase 2B matching policy

Endorses the audit's §9 with refinements:

1. **Single authority** — semantic stack + identity matcher as canonical; legacy delegates; retire `conversation/semantic_normalize.py`.
2. **Selected-language priority, not filter** — rank: (a) selected-language aliases, (b) universal tier, (c) other languages. Never hard-exclude (a)–(c); demote instead. Ambiguity between tiers resolves toward the selected language; ties within a tier go to clarify.
3. **Universal tier** — ASCII acronyms ≥2 chars verified collision-free (CSE, ISE, ECE, MBA, AIML, HOD, TNP) under strict Latin word boundaries, plus established English technical terms (data science, cyber security, placement(s)). Explicitly excluded: `ds`, `ec`, bare `cyber`, bare `head`.
4. **Longest-valid-match-first with exclusive spans**, applied identically to department and topic spans; specialization always beats parent; no silent parent fallback.
5. **Indic boundary check** — accept a non-Latin alias only if neither neighbouring character is an Indic letter (grapheme-boundary approximation). Eliminates the ಅಸಿಎಸ್ಇಯ/సాధన-embedded classes without a tokenizer. Romanized Indic cues stay on strict Latin-style boundaries with enumerated STT variants.
6. **Unicode NFC fold + ZWJ/ZWNJ stripping** applied identically to haystack and aliases at ingestion; keep enumerated pairs only as deprecated duplicates.
7. **Ambiguity → clarify, never guess**; preserve the existing fail-closed N≠M binding contract.
8. **One alias, one verified language tag**; resolve entha/kurichu/tilisi tag conflicts centrally before priority ranking ships.

Sequencing note relative to the baseline: land (5)+(6) together with the C5/సాధన test updates in one commit; land (2)+(3) after confirming C1/C2 remain green.

---

## 10. Exact items requiring human confirmation

1. **te సాధన** — replace with which term? Candidates exist in the repo (సాధనలు) but native adequacy is unverified; a native speaker must pick.
2. **hi HOD term alignment** — alias विभागाध्यक्ष only, or also प्रमुख (the displayed word)? Breadth of प्रमुख needs a native judgement call.
3. **kn ಸಾಧನ vs ಸಾಧನೆಗಳು** — which is canonical for parsing vs display?
4. **Overview-default for unknown topics** (`CSE quantum curriculum → cse.overview`) — intentional product behaviour or placeholder?
5. **All [UNVERIFIED] audit-corpus utterances and the four new HOD/topic phrases** (ta துறைத் தலைவர், te విభాగం అధిపతి, ml വിഭാഗത്തിന്റെ മേധാവി, plus hi above) — native-speaker sign-off before Phase 2B builds further vocabulary on top of them.
