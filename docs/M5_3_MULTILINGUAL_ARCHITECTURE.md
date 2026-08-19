# M5.3 Multilingual architecture (Stage A — design only)

**Status: Stage B Option B implemented.** See `docs/M5_3_STAGE_B_REPORT.md` and `docs/M5_3_FINAL_OWNERSHIP_MAP.md`.

Evidence: `docs/M5_3_TRACE_EVIDENCE.md`, `docs/M5_3_MULTILINGUAL_FAILURE_MATRIX.md`, `docs/M5_3_SEMANTIC_OWNERSHIP_AUDIT.md`, `docs/M5_3_BASELINE.md`.

---

## Phase 4 — Architecture decision (evidence-driven)

### Options

| Option | Meaning |
| --- | --- |
| **A** | Patch in place: more cues in `multilingual_terms` / `FEE_QUERY_KEYWORDS`, keep substring aliases and competing CI/`extract_features`/Groq paths. |
| **B** | Keep M5.1 IR shape (`SemanticRequest` → `UnitSelector` → `PresentationPlan` → `unitId`). Replace normalization + department identity; structured vocab (not a giant dictionary); fail-closed; one production authority for unitIds; M5.2 playback unchanged. |
| **C** | New IR or LLM-owned unit selection (language-specific selectors, or Groq invents unitIds). |

### Scoring (15 criteria)

For each: evidence → current weakness → option impact → decision.

1. **Multilingual determinism**  
   Evidence: 62/75 golden IR matches; 13 misses are systematic (identity, Indic `\w`, dual-topic), not random.  
   Weakness: same English-shaped input in six languages shares the *bug* (parity_hod_ds).  
   A: more cues, leak remains. B: one parser, language-independent IDs. C: non-deterministic unitIds.  
   **B.**

2. **Language independence**  
   Evidence: romanized/code-switch pass; native-script fees fail *before* topic lists apply.  
   Weakness: IR is already language-independent; **normalization is not**.  
   A: language-specific patches. B: preserve grapheme clusters; vocab by purpose. C: per-language selectors (forbidden unless C).  
   **B.**

3. **Canonical department identity**  
   Evidence: `cse_ds` + `cse` on “CSE Data Science”; same class of bug as frontend `toDepartmentKey`. Loose resolve `canon in blob`.  
   Weakness: substring identity is still authoritative in the parser/resolver.  
   A: keep loose resolve. B: exact key → exact label → alias → validated variant; **never** substring identity. C: LLM labels.  
   **B.**

4. **Romanization**  
   Evidence: `yestu`/`kitna`/`evlo`/`entha`/`ethra` fees pass.  
   Weakness: romanized dept aliases overlap (`cse` vs `cse_ds`).  
   A: add more romanizations, overlap stays. B: longest exclusive span. C: unnecessary.  
   **B.**

5. **Code-switching**  
   Evidence: `CSE bagge heli`, `CSE fees yestu?` pass.  
   Weakness: mixed-script fees fail in normalize.  
   **B.**

6. **Colloquial phrasing**  
   Evidence: `CSE HOD yaaru?` etc. pass when entity is plain CSE.  
   Weakness: colloquial + Data Science still leaks `cse`.  
   **B** (identity, not a new colloquial dictionary).

7. **Ambiguity handling**  
   Evidence: dual-topic strings emit MEDIUM + a guessed unitId. Unknown dept / `CSS fees` correctly None.  
   Weakness: fail-closed missing for multi-topic; confidence not LOW/NONE.  
   A: still first-keyword-wins. B: SemanticRequest None or explicit unsupported representation. C: LLM guess.  
   **B.**

8. **Multi-entity HOD**  
   Evidence: AIML + Data Science order preserved and live-WS matched. CSE Data Science HOD incorrectly becomes *two* entities.  
   Weakness: multi-entity works only when aliases don’t overlap.  
   **B** (exclusive spans + HOD-only multi-entity, order preserved).

9. **Fail-closed behavior**  
   Evidence: MEDIUM 0.75 on guessed dual-topic and leaked identity.  
   A: no. B: LOW/NONE → no unitId, no five-card expansion of a targeted/ambiguous turn. C: hallucinate.  
   **B.**

10. **Latency**  
    Evidence: local parse+select is in-process; Groq `normalize_and_classify_query` already on non-English `main.py` path.  
    A: keep Groq. B: local-only semantic path for unitIds; Groq not in selection. C: network on every turn.  
    **B.**

11. **Maintainability**  
    Evidence: cues split across `multilingual_terms.py`, `FEE_QUERY_KEYWORDS`, `extract_features` lists, `_COMPARISON_DEPT_ALIASES`, loose resolve.  
    A: bigger lists. B: structured vocab by TOPIC/SCOPE/QUESTION/DEPT/ROMANIZED/CODE-SWITCH/ASR. C: prompt sprawl.  
    **B.**

12. **Testability**  
    Evidence: golden EXPECTED vs ACTUAL on IR+unitIds is already the right test.  
    A: snapshot of cues. B: parity + fail-closed + WS unitId identity. C: flaky LLM tests.  
    **B.**

13. **Removal of competing authorities**  
    Evidence: CI features + parser + Groq + loose resolve + FE bus/comparison force.  
    A: leave all. B: one authoritative unit path after coverage; retain CI for policy/FAQ; FE bus/comparison stay until those topics join IR or stay explicit exceptions. C: add a third.  
    **B.**

14. **Compatibility with M5.2**  
    Evidence: UnitSelector → `unitId` → PresentationEngine; live WS already carries plan.  
    A/B: keep playback. C: likely redesign.  
    **B.** Do not redesign playback.

15. **Production observability**  
    Evidence: float confidence; diagnostics dict on SemanticRequest; WS plan visible.  
    Weakness: no HIGH/MEDIUM/LOW/NONE on the wire; first-failure stage not logged.  
    **B** (band + first-stage in diagnostics). C: opaque LLM.

**Insufficient-evidence STOP?** No. Failures clustered; live WS confirmed the same IR on the wire; TTS verified on the first six-language HOD sample. ASR isolated (not run).

### Decision: **Option B**

Working hypothesis from the plan is **confirmed**: the IR shape is right; it is not yet a complete multilingual system. Option A cannot fix identity or fail-closed. Option C is rejected (latency, hallucination, M5.2 risk, LLM inventing unitIds).

---

## Phases 5–11 — Locked design (unless Stage B approval changes Option B)

### One IR

`SemanticRequest`: `topic`, `entities` (canonical json keys), `requested_scope`, `confidence` ∈ {HIGH, MEDIUM, LOW, NONE}, `language_code`.

LOW / NONE → `SemanticRequest = None` **or** an explicit supported “clarification” representation. **Never** a guessed unitId. **Never** silent expansion to the five-unit deck for a targeted or ambiguous turn.

### One selector

`UnitSelector` only. No KannadaSelector / HindiSelector. Identity is `unitId`.

### One department resolver

Order: exact canonical json key → exact locale label → known alias → normalized / transliteration / **validated** ASR variant (ASR is a later gate).

**Never** substring identity. `cse` must not match inside `CSE Data Science`. Exclusive longest-span matching; consume matched spans.

Stop calling `_loose_resolve_department_json_key` for canonical identity. Legacy narration may keep a clearly marked LEGACY FALLBACK until cutover grep is clean.

### Normalization (not a giant dictionary)

Structured vocabularies, each entry: canonical meaning, supported language, variant, reason/category, ambiguity risk.

Families:

- TOPIC
- SCOPE
- QUESTION CUES
- DEPARTMENT ALIASES
- ROMANIZED VARIANTS
- CODE-SWITCH VARIANTS
- ASR VARIANTS (future gate — do not compensate semantics for bad STT)

**Must not** destroy Indic grapheme clusters. Replace `re.sub(r"[^\w\s&()]+", " ", out)` with Unicode-safe punctuation stripping that keeps Mn/virama.

Do not solve multilingual support by dumping every translation into one map.

### Topic composition / fail-closed (mandatory tests)

Refuse (None or explicit unsupported) when the architecture cannot safely compose:

- `CSE fees and HOD`
- `CSE placements and fees`
- `CSE HOD and AIML fees`
- `tell me something about CSE` — **supported** as full overview (already)
- `which department?` / `fees` / `who?` — None
- unknown department / near-match (`CSS fees`) — None

Multi-entity **only for HOD**; order preserved.

### M5.2 playback

Unchanged: `unitId`, PresentationEngine, seek, WS `narration_plan` consumer. Frontend remains a consumer. No second `currentCardIdx`. No mock socket for M5.3 E2E.

### No LLM inventing unitIds

Deterministic vocab + resolver. If an LLM is proposed later: document failure cases, latency, hallucination, registry validation — or reject. Groq classify must not be a second unit authority.

### Confidence

Map existing floats onto HIGH/MEDIUM/LOW/NONE with explicit evidence rules (e.g. exclusive entity + single topic + unambiguous cue → HIGH; dual topic → NONE; overlapping unresolved aliases → LOW/NONE).

---

## Proposed file changes (Stage B only — not a license to start)

| Action | File | Why |
| --- | --- | --- |
| Add | `backend/services/content/semantic_vocab/` (or similar) structured vocab modules | Purpose-tagged entries |
| Add | exclusive department span matcher | Replace overlapping alias hits |
| Change | `normalize_query_to_english` / `_normalize_text` | Keep Indic clusters |
| Change | `semantic_request_parser.py` | Fail-closed multi-topic; confidence bands; stop `cue in n` for IDs |
| Change | `department_resolver.py` | No substring identity; stop `_loose_resolve` for IR |
| Change | `unit_selector.py` | Only if confidence/scope contract needs it; no playback change |
| Change | `presentation_resolver.py` / `narration_resolver.py` | Consume one IR; do not re-derive entities |
| Change | tests: parity six languages, fail-closed, WS unitId, no M5.2 mock for M5.3 E2E | |
| Later | `main.py` Groq classify | Remove from unit-selection authority after coverage |
| Later | `answer_generation.extract_features` | CI policy only, not unitIds |

### Files to remove (only after zero production/test references + grep)

- `frontend/src/lib/intentClassifier.ts` — zero imports today; still not deleted in Stage A.
- `frontend/src/lib/intentNormalizer.ts` — same.
- `_loose_resolve_department_json_key` as **identity** authority (function may remain behind LEGACY FALLBACK for non-unit narration until grep-clean).

Do **not** remove `extract_features` wholesale (bus, documents, comparison, CI policy still need it until those topics are in IR).

Do **not** revert M5.0–M5.2 files as “cleanup”.

---

## Test strategy (Stage B)

1. Unit: parser IR + exclusive entity + Indic fees + fail-closed + confidence bands.
2. Integration: text → SemanticRequest → UnitSelector → `resolve_units_for_plan`.
3. Live typed WS: `narration_plan.unitId` identical across equivalent languages; no mock.
4. Parity: six languages, same topic/entities/scope/ordered unitIds.
5. Fail-closed list above.
6. Perf: local-only semantic path; no network in selection.
7. Regression: M4 + M5.0/5.1/5.2 + new M5.3; full `pytest backend/tests`; `tsc`.
8. Do not weaken M5.2 tests.

## E2E strategy (Stage B)

Real browser, frontend, backend, WebSocket, semantic pipeline, content resolver, TTS provider if credentials allow.

**Do not use `installM52Socket` for M5.3 acceptance.**

If TTS unavailable: mark TTS **NOT VERIFIED**; do not call semantics complete on cards alone.

Minimum: overview × 6 languages; fees/HOD/placements English + regional; multi-HOD English + regional; code-switch; romanized; reset + language switch. Parity E2E: “Who is the HOD of AIML and Data Science?” × 6 → IR + `[cse_aiml.hod, cse_ds.hod]`.

ASR gate **after** typed parity: speech → actual transcript → same pipeline; classify A ASR / B semantic / C localization / D TTS / E presentation. Do not patch semantics to hide STT.

## Risks

- Dual-authority cutover: CI intent vs SemanticRequest disagreement until callers migrate.
- Indic punctuation rewrite can affect other token maps — needs tests on romanized + script.
- Exclusive matching must not drop legitimate `CSE` when Data Science is **not** present.
- Guest-name / TTS latency on live WS (observed: waiting for full TTS stalls forensic loops).
- Pre-existing 5 TTS/RAG pytest failures must remain visible; do not “fix” by weakening tests.
- Uncommitted M5.0–M5.2 tree: Stage B diffs must not revert it.

---

## Stage A STOP

This document plus baseline, traces, failure matrix, and ownership audit are the Phase 0–11 pack.

**Wait for explicit implementation approval before Phases 12–20.**
