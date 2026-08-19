# M5.4 Semantic Cleanup — Phase 0 Baseline Freeze

Recorded: 2026-08-18 12:38–12:41 IST
Recorded **before** any M5.4 change. The working tree was **not** cleaned, no test was weakened,
no failure was hidden.

---

## 1. Repository state

| Item | Value |
|---|---|
| Branch | `main` |
| HEAD | `0cc81fc628b59e757b5044e61f0ca165f8762a1a` |
| HEAD date | 2026-07-25 16:57:30 +0530 |
| HEAD subject | `fix(ci): clear remaining frontend npm audit findings.` |
| Working tree | **DIRTY (intentional)** — the entire M5.0–M5.3 tree is uncommitted |

`git status --porcelain` totals:

| Count | Status |
|---|---|
| 30 | ` M` modified, unstaged |
| 2 | ` D` deleted, unstaged |
| 97 | `??` untracked |
| **129** | total entries |

The two deletions are the already-removed frontend competing classifiers
(`frontend/src/lib/intentClassifier.ts`, `frontend/src/lib/intentNormalizer.ts`).

**Freeze rule for this phase:** do not `git clean`, do not `git checkout --`, do not stash,
do not commit unless explicitly asked.

---

## 2. Live processes (not restarted for the baseline)

| Role | Port | PID | Started | Command |
|---|---|---|---|---|
| Backend | 6969 | 3256 | 2026-08-18 10:26:11 | `backend\.venv\Scripts\python.exe -m backend.main` (no `--reload`) |
| Frontend | 5176 | 29880 | 2026-08-18 10:26:12 | Vite `--host=0.0.0.0 --port 5176 --strictPort` |

Backend interpreter: Python 3.13 (`backend/.venv`). Frontend runtime: Node v22.19.0.

Because the backend runs **without** `--reload`, any backend source change in later phases
requires a deliberate restart before live verification (Phase 15).

---

## 3. Backend pytest baseline

Command: `backend\.venv\Scripts\python.exe -m pytest backend/tests -q`

```
10 failed, 317 passed, 62 subtests passed in 46.62s
```

### 3.1 Failing tests (pre-existing, NOT introduced by M5.4)

| # | Test | Root cause classification |
|---|---|---|
| 1 | `test_m53_unicode_normalize.py::test_hindi_fees_word_survives` | Unicode helper |
| 2 | `test_m53_unicode_normalize.py::test_kannada_fees_word_survives` | Unicode helper |
| 3 | `test_m53_unicode_normalize.py::test_malayalam_fees_word_survives` | Unicode helper |
| 4 | `test_m53_unicode_normalize.py::test_tamil_fees_word_survives` | Unicode helper |
| 5 | `test_m53_unicode_normalize.py::test_telugu_fees_word_survives` | Unicode helper |
| 6 | `test_provider_failure_paths.py::test_rag_empty_falls_back_without_crashing` | **Token-count routing** |
| 7 | `test_provider_failure_paths.py::test_tts_timeout_still_returns_text_response` | **Token-count routing** |
| 8 | `test_tts_full_reply.py::test_first_sentence_and_remainder_are_non_overlapping` | **Token-count routing** |
| 9 | `test_tts_full_reply.py::test_single_sentence_reply_emits_single_final_segment` | **Card mis-route** |
| 10 | `test_tts_full_reply.py::test_cache_hit_path_still_segments_without_overlap` | **Token-count routing** |

### 3.2 Group A — Unicode grapheme loss (5 tests)

`normalize_user_input` / `normalize_query_to_english` strip Indic combining marks and virama:

```
"CSE फीस"    → "cse फ स"      (expected to contain "फीस")
"CSE ಶುಲ್ಕ"    → "cse ಶ ಲ ಕ"     (expected to contain "ಶುಲ್ಕ")
"CSE கட்டணம்" → "cse கட டணம"   (expected to contain "கட்டணம்")
```

Impact on card routing today is **masked**, because `detect_atomic_topics` is called with
both raw text and normalized text, so the fees topic still matches on the raw string.
This is a latent defect in a **utility**, not in a semantic authority.

### 3.3 Group B — Token-count routing (4 tests)

These four failures are caused by the exact defect M5.4 Phase 9 removes.

`score_intent_from_features` scores `NORMAL_QUERY` purely on token count, so a legitimate
4-token institutional question never reaches the `INTENT_CONFIDENCE_THRESHOLD` of 0.60 and
`route_policy` returns `UNKNOWN`:

| Utterance | Tokens | Confidence | Policy | Test expectation |
|---|---|---|---|---|
| `Tell me about library` | 4 | 0.50 | `UNKNOWN` | RAG/Groq answer |
| `What are library timings?` | 4 | 0.50 | `UNKNOWN` | RAG/Groq answer |
| `Tell me library timings.` | 4 | 0.50 | `UNKNOWN` | RAG/Groq answer |

Observed reply text in all three:

```
I don't currently have reliable information about that. However, I can help you with
admissions, departments, placements, fees, facilities, and campus information.
```

These tests are correct and must **pass** after Phase 8/9. They are treated as
acceptance criteria for this cleanup, not as tests to weaken.

### 3.4 Group C — Card mis-route (1 test)

`test_single_sentence_reply_emits_single_final_segment` sends `Admissions?`.
`assistantText` is the Groq reply (`Admissions are currently open.`) while `spokenText`
is the deterministic documents bundle (`Required documents are: 10th Marks Card; ...`).

Two different authorities produced the displayed text and the spoken text for one turn.
This is the "TTS from bundle **or** Groq `reply_text`" collision recorded in the
M5.4 receptionist forensic. It must be resolved by the single response contract.

---

## 4. Frontend baseline

### 4.1 TypeScript

Command: `npx tsc --noEmit` (in `frontend/`)

```
exit 0 — no type errors
```

### 4.2 Vitest

Command: `npx vitest run src --reporter=dot`

```
Test Files  10 passed (10)
     Tests  67 passed (67)
```

Command: `npx vitest run --reporter=dot` (unscoped)

```
Test Files  4 failed | 10 passed (14)
     Tests  67 passed (67)
```

The 4 "failed files" are **not** test failures. The unscoped Vitest glob collects the
Playwright specs in `frontend/e2e/`, and Playwright refuses `test.describe()` outside its
own runner:

```
Error: Playwright Test did not expect test.describe() to be called here.
```

Pre-existing tooling overlap. All 67 real unit tests pass. Scoped runs (`vitest run src`)
are the correct baseline command and are used for the rest of M5.4.

### 4.3 Playwright

Command: `npx playwright test --list`

```
Total: 41 tests in 4 files
```

Spec files: `m53-hod-identity.spec.ts`, `m53-ws-lifecycle.spec.ts`, and two others.
Not executed in Phase 0 (they require the live stack and are Phase 15 acceptance).

---

## 5. Baseline summary and exit criteria

| Suite | Baseline | M5.4 exit requirement |
|---|---|---|
| Backend pytest | 10 failed / 317 passed | Groups B and C (5 tests) must **pass**; Group A may remain if untouched, and must not regress |
| Frontend tsc | clean | stays clean |
| Frontend vitest (`src`) | 67 passed | stays green plus new M5.4 tests |
| Playwright | 41 collected | Phase 15 live acceptance |

No test in this baseline may be deleted, skipped, or relaxed to make M5.4 pass.
