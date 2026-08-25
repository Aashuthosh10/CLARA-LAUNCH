# Phase 2B Routing Design Audit — Regional Fees / Department Clarification

Read-only design audit. No production code was modified. All references are real files/lines verified against the working tree.

---

## 1. Executive summary

The five remaining Phase 2B failures (`unknown native department + regional fees`, one per language: kn/hi/ta/te/ml) are **not** a vocabulary problem. Both the legacy ladder and the semantic layer already recognize every regional fees term. The defect is **decision ordering** in `backend/services/conversation/response_decision.py`:

- When the department cannot be resolved, the legacy ladder (`resolve_intent_from_features`, `answer_generation.py:2184–2191`) demotes what is semantically a *department fees* question to `INTENT_ADMISSIONS`.
- `INTENT_ADMISSIONS` is a member of `NON_UNIT_CARD_INTENTS` (response_decision.py:70–84) but **not** of `DEPARTMENT_CARD_INTENTS` (:86–94).
- Therefore **Step 7** (`non_unit_card_intent`, :437–454) accepts a general Admissions card *before* **Step 9** (`topic_without_department` CLARIFY, :470–496) — the guard that would have produced the correct "Which department?" clarification — ever runs.

**Recommended ownership:** the **Response Decision policy layer** (one new guarded clause between Steps 6 and 7). The pipeline already declares the ResponseDecision "AUTHORITATIVE" (`conversation/pipeline.py:104–105`); `PHASE1_TEST_AND_VOCAB_REVIEW.md` §8 independently concludes these five failures "cannot pass via vocabulary work; they require a decision-layer fix."

**Smallest safe fix:** a single guard — do *not* accept the `ADMISSIONS` non-unit card when (a) the semantic layer detects the atomic `fees` topic in the raw text, (b) no department entity resolved, and (c) the text carries no genuine admissions vocabulary. Route such turns to the existing `topic_without_department` CLARIFY. Genuine admissions requests, known-department fee cards, and all Phase 2A behaviour are untouched; the ladder is untouched (so `test_golden_query_matrix.py:23` still passes at the intent level).

---

## 2. Reproduction evidence

### 2.1 Failing tests

`backend/tests/test_phase1_regional_card_regression.py`
- Helper `_decision()` (**:142–154**) is the only harness that wires the **real** legacy intent (`normalize_user_input` → `extract_features` → `resolve_intent_from_features`) into `resolve_response_decision`, mirroring production (`pipeline.py:97–139`). The M5.4/M5.5 harnesses pass `ci_intent=None` (`test_m54_authority_matrix.py:44`, `test_m55_response_policy.py:36–48`), which is why they stay green while production misroutes — the bug lives exactly in the seam those suites don't exercise.
- Red test: `test_unknown_native_department_does_not_card` (**:289–293**, class `TestNewlyCapturedRegionalRegression`) asserts that `<native quantum department> <native fees term>` produces no units **and** `decision.mode is not ResponseMode.CARD`. Currently the decision is `CARD` with `items=()` and `evidence="non_unit_card_intent"`.

### 2.2 Baseline

Phase 2A: **438 passed / 5 failed** (from 144 passed / 299 failed). The 5 failures map 1:1 onto the five language variants of this single routing defect.

### 2.3 Documented prior analysis

`PHASE1_TEST_AND_VOCAB_REVIEW.md` §1 item 2 and §8 item 1 record the exact observed decision: `mode=CARD, items=(), evidence='non_unit_card_intent'` for "quantum department fees". §5 notes the M5.4/M5.5 blind spot: "a regression confined to the legacy ladder would not flip any assertion here."

---

## 3. Current control flow

Per-turn order in `run_conversation_intelligence()` (`conversation/pipeline.py:30`):

| # | Stage | Location |
|---|---|---|
| 1 | Transcript assessment | pipeline.py:50 |
| 2 | Rule entities (dept via `detect_department_name`) | entity_extractor.py:75 → answer_generation.py:1426–1428 |
| 3 | Legacy topic regex map | semantic_normalize.py:62–70 (FEES pattern :37 — English + `kattanam` only) |
| 4 | FAQ probe | pipeline.py:90–95 |
| 5 | Legacy intent ladder (via wrapper) | intent_confidence.py:49 → extract_features (answer_generation.py:1443–1754) → resolve_intent_from_features (:2171–2196) |
| 6 | Semantic request parser | semantic_request_parser.py:59–238 (fail-closed ⇒ `None`) |
| 7 | Optional LLM proposal | pipeline.py:118–125 |
| 8 | **Authoritative ResponseDecision** | response_decision.py:246–553 |
| 9 | Policy projection | policy_router.py:134–182 |
| 10 | Presentation/surface/unit authority | presentation_resolver.py:113, `_apply_unit_plan_authority` :69–110 |

### Supporting layers (verified)

- **Semantic fees vocabulary (complete, six languages):** `semantic_vocab/catalog.py:19–39` — native scripts `ಶುಲ್ಕ`(kn), `फीस`/`शुल्क`(hi), `கட்டணம்`(ta), `ఫీజు`(te), `ഫീസ്`(ml), plus code-switch-tolerant romanized cues `yestu/eshtu/estu`(kn), `kitna`(hi), `evlo/kattanam`(ta), `entha`(te), `ethra`(ml) tagged language `"*"`. Detection: `cue_in_hay` (semantic_topics.py:26–34 — Indic substring, Latin word-boundary), `detect_topic_spans` longest-first with occupancy (semantic_composition.py:50–80, `_boundaries_ok` :106–112).
- **Department identity (exclusive spans):** `normalize_for_department_match` injects regional tokens then casefolds (department_identity.py:21–23; injection table `_inject_regional_department_tokens`, answer_generation.py:1913–1975). Alias table merges catalog DEPARTMENT entries (incl. native-script acronyms, catalog.py:116–156), canonical json keys, and locale display names (department_identity.py:50–89). `match_department_spans_exclusive` (:101–132) consumes longest spans first; `cse` can never leak out of `cse_ds`.
- **Ladder fee detection:** `extract_features.fees_keywords` (answer_generation.py:1540–1557) mirrors the catalog; `is_fee_query` at :1688; phrase-level `_is_fee_query` (:1823–1833) over `FEES_KEYWORDS` (:749–766) and broad `FEE_QUERY_KEYWORDS` (:689–747).
- **The ladder demotion (root cause site):**
  ```python
  # answer_generation.py:2184–2191
  if features.is_fee_query and features.has_department:
      return INTENT_DEPARTMENT_FEES      # ← requires a resolved department
  ...
  if features.is_fee_query:
      return INTENT_ADMISSIONS           # ← catch-all when the department didn't resolve
  ```
- **Response decision steps relevant here:**

| Step | Lines | Rule | Mode |
|---|---|---|---|
| 4 | :389–404 | Resolved `semantic_request` | CARD (`semantic_request`, real items) |
| 6 | :421–432 | Intent ∈ `DEPARTMENT_CARD_INTENTS`, no dept entity | CLARIFY `missing_department` |
| 7 | :434–454 | Intent ∈ `NON_UNIT_CARD_INTENTS` | CARD `non_unit_card_intent` (college-wide placements/overview degrade to ANSWER :438–446; **ADMISSIONS does not**) |
| 8 | :456–468 | Dept-card intent WITH dept-like entity the parser couldn't use | CLARIFY `unresolved_department_request` |
| 9 | :470–496 | `has_card_topic_cue(raw)` + no dept entity | ANSWER (college-wide topics) or **CLARIFY `topic_without_department`** |

- **Card eligibility downstream:** `SURFACE_ADMISSIONS ∉ _UNIT_BACKED_SURFACES` (presentation_resolver.py:64–66), so the empty-items Admissions card survives `_apply_unit_plan_authority` and renders — the wrong outcome users see.
- **Session inheritance:** previous-turn departments flow back via `session["last_semantic_entities"]` (conversation_orchestrator.py:149–152) into `ci_entities.department_keys` (pipeline.py:106–117), but the parser admits carry-over **only under explicit anaphora** (`semantic_request_parser.py:80–88`; gate `has_anaphora`, semantic_anaphora.py:102–112). This stickiness guard is correct and must be preserved.
- **Legacy contract documenting the collision:** `test_golden_query_matrix.py:23` — `("fees structure", INTENT_ADMISSIONS, None, "admissions")` — bare fees-without-department is *intentionally* classified ADMISSIONS at the intent level, while :24 shows the department-scoped variant `("cse fees eshtu", INTENT_DEPARTMENT_FEES, ...)`.

---

## 4. Exact cause of each remaining failure

All five failures share one causal chain (illustrated with Kannada `ಕ್ವಾಂಟಮ್ ವಿಭಾಗ ಶುಲ್ಕ`; identical shape for hi/ta/te/ml):

1. **Fees recognized (twice).** Catalog :32–39 registers `ಶುಲ್ಕ`; `detect_topic_spans` finds a `fees` span; `extract_features` fees_keywords :1552 also match ⇒ `is_fee_query=True`.
2. **Department unresolved ⇒ no semantic request.** "quantum department" matches no alias span (department_identity.py:101–132), there is no anaphora so carry-over is refused (parser :80–88), `parse_semantic_request` returns `None` (:112). Hence Step 4 can't fire and `has_department_entity=False`.
3. **Ladder demotes to ADMISSIONS** (answer_generation.py:2190–2191) because `has_department=False`. Had the name resolved, the identical utterance would have been `DEPARTMENT_FEES` — a member of `DEPARTMENT_CARD_INTENTS` — and Step 6 would have clarified correctly.
4. **Step 7 preempts Step 9.** `ADMISSIONS ∈ NON_UNIT_CARD_INTENTS` (:70–84) ⇒ CARD, `items=()`, `evidence="non_unit_card_intent"` (:437–454). Step 9's `topic_without_department` CLARIFY — which *does* see the fees topic via `has_card_topic_cue` (:211–213) — is unreachable.
5. **Wrong card renders.** `SURFACE_ADMISSIONS` is not unit-backed (presentation_resolver.py:64–66), so nothing drops it.

Per-language nuance: each of the five failures exercises a different fees cue (kn `ಶುಲ್ಕ`, hi `फीस`, ta `கட்டணம்`, te `ఫీజు`, ml `ഫീസ്` per the NATIVE_TOPIC table, test_phase1_regional_card_regression.py:53–89), but the divergence point is always Step 7-vs-Step 9 ordering — never vocabulary.

---

## 5. Scenario decision table

Terminology: **missing department** = user named no department at all. **Unknown department** = user uttered a department-shaped phrase that fails identity resolution. The architecture already distinguishes them (`missing_department` vs `unresolved_department_request` reasons, response_decision.py:427 vs :462); the distinction should be preserved where detectable.

| # | Scenario | Expected behaviour today | Expected behaviour (target) | Changes? |
|---|---|---|---|---|
| 1 | Known dept + fees (`CSE fees eshtu`, `ಸಿಎಸ್ಇ ಶುಲ್ಕ`) | CARD `cse.fees` (Step 4) | CARD `cse.fees` | No |
| 2 | Unknown dept + fees (`ಕ್ವಾಂಟಮ್ ವಿಭಾಗ ಶುಲ್ಕ`) | ❌ CARD admissions (Step 7) | CLARIFY `unresolved_department_request` (preferred) or `topic_without_department` | **Fix** |
| 3 | Missing dept + fees, regional cue (`ಶುಲ್ಕ ಎಷ್ಟु`) | ❌ CARD admissions | CLARIFY `topic_without_department` ("Which department…?", templates.py:56–63) | **Fix** |
| 4 | General admissions (`admission process`, `kcet`, `how to apply`) | CARD admissions (Step 7) | CARD admissions | No |
| 5 | Known dept + admissions (`CSE admission`) | Existing (dept overview path) | Unchanged | No |
| 6 | Unknown dept + admissions (`quantum college admission`) | CARD admissions | CARD admissions (no fee topic ⇒ guard doesn't fire) | No |
| 7 | Bare fees, no dept, English (`fees`, `fee structure`) | CARD admissions (golden :23) | CLARIFY `topic_without_department` | Yes — see note |
| 8 | Mixed-language dept + regional fees (`ದಯವಿಟ್ಟು CSE ಶುಲ್ಕ`) | CARD `cse.fees` | CARD `cse.fees` | No |
| 9 | Native dept + English `fees` (`ಸಿಎಸ್ಇ fees`) | CARD `cse.fees` | CARD `cse.fees` | No |
| 10 | English acronym + regional fees (`CSE கட்டணம்`) | CARD `cse.fees` | CARD `cse.fees` | No |

**Note on scenario 7:** today bare English "fees" shows the Admissions card (documented legacy contract, golden :23). Under the proposed guard it will clarify instead, because "which department's fees?" is the honest answer to a bare fees question — and the M5.4/M5.5 suites already assert exactly that when `ci_intent=None`. This is a deliberate, small, defensible behaviour change; see §9 (Risk R1) and §12. Genuine admissions intent is preserved via the admissions-vocabulary exemption in §7.

---

## 6. Correct ownership layer

Evaluated candidates:

| Layer | Verdict | Reason |
|---|---|---|
| Legacy intent ladder | ✗ | Re-classifying bare fee queries away from `ADMISSIONS` breaks the documented golden contract (test_golden_query_matrix.py:23) and moves a routing decision into a feature-extraction heuristic. Also `_is_admissions_query` (:1836–1862) deliberately treats fee queries as admissions-like — undoing that equivalence is a broad rewrite. |
| Semantic request parser | ✗ | Already fail-closed and correct: it returns `None` for unresolvable identity. Making it emit partial results to help the decision layer duplicates responsibility. |
| Unit selector | ✗ | Purely downstream projection of `(entity, topic)` pairs; it never sees intents and cannot express CLARIFY. |
| **Response decision policy** | ✓ | Pipeline declares it authoritative (pipeline.py:104–105). It is the only place where the *conflict* between two signals (legacy `ADMISSIONS` intent vs. semantic atomic `fees` topic with no entity) is visible, and it already owns the exact clarification taxonomy needed (Steps 6/8/9). Phase 1 review independently reached this conclusion. |

**Recommendation:** one narrow guard inside `resolve_response_decision`, positioned between Step 6 and Step 7. No new parser, no new layer.

---

## 7. Minimal proposed code change

**One guarded clause in `backend/services/conversation/response_decision.py`, inserted after Step 6 (:432) and before Step 7 (:434):**

```python
# 6b. A fees question whose department never resolved is NOT a general
# admissions request. Only an explicit admissions vocabulary keeps the
# admissions card; otherwise ask which department.
if (
    intent == INTENT_ADMISSIONS
    and not has_department_entity
    and TOPIC_FEES in detect_atomic_topics(raw)
    and not _has_explicit_admissions_cue(raw)
):
    return _done(ResponseDecision(
        mode=ResponseMode.CLARIFY,
        clarification_target="department",
        clarification_reason="topic_without_department",
        ...  # mirror Step 9's construction verbatim
    ))
```

With one ~8-line module-private predicate alongside the existing helpers (~:143–145):

```python
_ADMISSIONS_CUE_TOKENS = frozenset({
    "admission", "admissions", "apply", "application", "enquiry",
    "eligibility", "counselling", "kcet", "comedk", "management quota",
})

def _has_explicit_admissions_cue(raw: str) -> bool:
    n = casefold_keep_scripts(raw)          # reuse content.unicode_text
    return any(t in n.split() or t in n for t in _ADMISSIONS_CUE_TOKENS)
```

Why this satisfies every constraint:

- **Doesn't remove the general admissions card** — scenario 4/6 keep it; only fee-topic-without-department-and-without-admissions-vocabulary is diverted.
- **Doesn't convert every regional fee question into a dept-fee card** — it produces the *existing* Step 9 CLARIFY, reusing `clarification_reply(language, "department")` → localized "Which department…" (templates.py:56–63). Zero new display strings.
- **No five language branches** — the trigger is the language-neutral semantic signal (`TOPIC_FEES in detect_atomic_topics(raw)`), which already covers all six languages uniformly via the catalog (`"*"` romanized entries + native scripts).
- **Clarification stays enabled** — it *re-arms* an existing clarification path.
- **No translated-display dependence** — detection runs on raw/casefolded input before any localization.
- **No Phase 1 weakening, no parser rewrite** — the ladder, parser, vocab, and unit selector are untouched.

Optional (still ≤ 5 lines): when the raw text additionally contains a department-scope word (`department`/`ವಿಭಾಗ`/`विभाग`/`துறை`/`విభాగం`/`വകുപ്പ്` — a natural extension of the existing scope-cue pattern in catalog CODE-SWITCH entries, catalog.py:99–110), emit `clarification_reason="unresolved_department_request"` instead of `topic_without_department`, honouring the missing-vs-unknown distinction. This is cosmetic (both targets render the same department question) and may be deferred.

---

## 8. Files and functions likely affected

**Production (one file):**
- `backend/services/conversation/response_decision.py` — one new clause between :432 and :434; one predicate + one frozenset near :70–145. Imports: `detect_atomic_topics` (already imported for Step 9, :211–213 area), `TOPIC_FEES` from `content.semantic_topics`.

**Not touched:** `answer_generation.py`, `semantic_request_parser.py`, `semantic_composition.py`, `semantic_vocab/*`, `department_identity.py`, `unit_selector.py`, `surface_selector.py`, `presentation_resolver.py`, `policy_router.py`, `templates.py`, locales, TTS/audio/frontend.

**Test files affected (additions only):**
- `backend/tests/test_phase1_regional_card_regression.py` — the 5 red tests (:289–293 pattern) turn green with zero edits; new classes per §10.
- Possibly `backend/tests/test_m54_authority_matrix.py` / `test_m55_response_policy.py` — additive cases only (they currently pass `ci_intent=None`, unaffected).

---

## 9. Regression risks

| # | Risk | Mitigation |
|---|---|---|
| R1 | **Bare English "fees" changes from Admissions card to clarification** (scenario 7). Any hidden test or UI flow expecting the admissions surface on bare fee words could flip. | Sweep the suite for end-to-end bare-fees assertions; update golden *behavioural* docs while leaving golden *intent* assertions intact (ladder untouched ⇒ `test_golden_query_matrix.py:23` passes). Product-wise this aligns with M5.4/M5.5 expectations. |
| R2 | **Admissions-cue predicate too narrow/broad.** If `_ADMISSIONS_CUE_TOKENS` misses a phrasing ("join the college"), a legitimate admissions request could clarify; if too broad (substring matching), fee queries containing e.g. "application form for CSE fees" could wrongly keep the card. | Keep the token list conservative and whole-word-biased; note `has_department_entity=True` bypasses the guard entirely (any resolved dept ⇒ old path). Cover both directions in tests (§10). |
| R3 | **Interaction with LLM proposal paths (Steps 3b/3c).** A validated LLM CARD proposal (:345–363) fires *before* the new guard; a hallucinated admissions card for a fee query could still slip through. | Out of scope for the five failures (they fail at Step 7), but add one test asserting the guard also holds when a proposal exists, or document the residual gap. |

Secondary risks (low): `detect_atomic_topics` cost on hot path (negligible; Step 9 already calls it); future topics added to `ATOMIC_TOPICS` won't auto-inherit the guard (intentionally scoped to fees; generalize later behind the same clause if product agrees).

---

## 10. Required automated tests

Extend `test_phase1_regional_card_regression.py` using its real-intent `_decision()`/:142–154 and `_units()`/:134–139 helpers (do **not** weaken `_assert_card_contract` :157–163):

1. **Five failure fixes (already written, must pass):** `test_unknown_native_department_does_not_card` per language (:289–293 pattern × 5) — no units, `mode is not CARD`, clarification target `"department"`.
2. **Valid department fees:** for each language, native dept + native fees ⇒ exact `("<key>.fees",)` CARD (existing :207+ rows must stay green).
3. **Valid general admissions:** `"admission process"`, `"kcet counselling"`, `"how to apply"` ⇒ mode CARD, evidence `"non_unit_card_intent"`, no units — across ≥ English + one regional session language.
4. **Missing department:** regional fees term alone (`ಶುಲ್ಕ ಎಷ್ಟು`) ⇒ CLARIFY `topic_without_department`; English bare `"fees"` ⇒ same (pins the R1 behaviour change explicitly).
5. **Unknown department:** `"quantum department fees"` (English) ⇒ CLARIFY, not CARD — proves language neutrality of the fix.
6. **Mixed language:** `ದಯವಿಟ್ಟು CSE ಶುಲ್ಕ` ⇒ `("cse.fees",)` (existing :361–366 stays green).
7. **English behaviour:** full re-run of `TestExistingPassingBehaviour` (:166–204) incl. multi-card composition and dedupe.
8. **Multi-card containing fees:** `"CSE achievements and fees and HOD"` ⇒ ordered tuple (:176+ stays green); plus regional variant with an unknown third department ⇒ CLARIFY (guard composes with N-entity pairing).
9. **Session context, previous department:** turn 2 `"its fees"`/anaphora variant with `last_semantic_entities=["cse"]` ⇒ `("cse.fees",)` (inheritance via parser :80–88 unaffected).
10. **Stale previous-department context:** `"its fees"` after a cleared/invalid `last_semantic_entities` entry ⇒ CLARIFY, not a stale-department card; and `"who is the HOD?"` with a hint still clarifies (existing m54 O-follow-up :238–256 stays green).
11. **Guard polarity:** fee query *with* admissions vocabulary (`"admission fees enquiry"`) ⇒ admissions card retained (documents the deliberate exemption); `"CSE admission fees"` ⇒ dept-scoped path (dept resolves ⇒ guard skipped).
12. **Intent-level golden stability:** `test_golden_query_matrix.py` unchanged and passing (proves ladder untouched).

---

## 11. Language-aware matching recommendations (staged; separate from §7 fix)

Current state (verified in `TestCurrentCollisionBehaviour`, test_phase1:351–380): matching is intentionally **global** — Hindi `सीएसई फीस` resolves under every selected language; English `CSE` inside Kannada sentences works; longest-match beats `cse_ds`; documented Indic substring false positive `ಅಸಿಎಸ್ಇಯ → cse` (:376–379).

- **Stage 1 (now): keep global matching, fix boundaries only.** Global cross-language matching maximizes recall on a campus kiosk and Phase 2A depends on it. One targeted improvement: for Indic aliases, require the matched span not be embedded in a longer grapheme cluster (e.g., reject when preceded/followed by combining vowel signs) to kill the `ಅಸಿಎಸ್ಇಯ` class of false positives. Implement inside `_find_unoccupied`/`_boundaries_ok` neighbourhood checks (department_identity.py:41–43; semantic_composition.py:106–112) — pure tightening, no policy shift.
- **Stage 2 (after 2B stabilizes): selected-language prioritization, not exclusion.** When the resolved session language has a *script-specific* alias hit, prefer it over same-length cross-script ties in `department_alias_table` sorting (department_identity.py:81). Never remove other languages' aliases from the table — code-switching is a first-class use case.
- **Stage 3 (deferred): safe global acronym whitelist.** Formalize short Latin acronyms (`cse`, `ece`, `ise`, …) as a curated global set with mandatory Latin word-boundary enforcement; longer/ambiguous aliases become session-language-gated. Requires usage telemetry before enabling.
- **Unicode rules (standing policy):** all normalization continues through `strip_punctuation_keep_graphemes` / `casefold_keep_scripts` (unicode_text.py:13–32); Latin cues = regex word boundaries, Indic cues = substring within unoccupied text (`cue_in_hay`, semantic_topics.py:26–34). Longest-match-first with span occupancy remains the composition contract (semantic_composition.py:50–80).

None of Stages 1–3 is required for the five failures; keep them out of the 2B diff.

---

## 12. Changes that must not be made

1. **Removing or degrading the general Admissions card** (scenarios 4/6 remain valid).
2. **Defaulting bare/regional fee questions to a department fee card** (e.g., snapping to the last or alphabetically-first department) — violates the never-guess-a-department invariant.
3. **Hardcoding five language-specific branches** in the decision layer.
4. **Disabling clarification** or collapsing `missing_department` / `unresolved_department_request` / `topic_without_department` into one generic reply.
5. **Depending on translated display text after canonical parsing** — decisions must key off canonical topics/json keys only.
6. **Rewriting `resolve_intent_from_features`' fee→ADMISSIONS demotion** — it is pinned by the golden contract and consumed elsewhere (surface_selector.py:82).
7. **Weakening Phase 1/2A assertions** (`_assert_card_contract`, collision-behaviour rows) to make the red tests pass vacuously.
8. **Broad parser/vocab expansion** (adding more fee synonyms, restructuring `ATOMIC_TOPICS`) as a supposed fix — Phase 1 review confirms vocabulary work cannot reach these failures.

---

## 13. Recommended implementation order

1. Add the §10 polarity/stability tests that currently pass (admissions-valid, mixed-language, session context) to lock the baseline before touching production.
2. Implement the §7 guard (clause + predicate + frozenset) in `response_decision.py`.
3. Verify the five red tests flip green with **zero edits to them**; run the full Phase 1/2A suite plus m54/m55/golden.
4. Resolve R1: sweep for bare-English-fees expectations; update behavioural docs/tests deliberately (never silently).
5. Optional follow-up: the `unresolved_department_request` refinement (§7 optional paragraph) and the R3 LLM-proposal interaction test.
6. Defer §11 stages entirely to a separate change set.

---

*End of audit. No files other than this report were created or modified.*
