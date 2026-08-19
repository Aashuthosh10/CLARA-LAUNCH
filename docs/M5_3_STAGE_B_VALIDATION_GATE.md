# M5.3 Stage B Validation Gate — STOPPED

**Date:** 2026-08-14  
**Mode:** real browser + live WebSocket. No mocks. No production patches.  
**Backend:** restarted on `:6969` (Uvicorn PID **9788**, `backend\.venv\Scripts\python.exe -m backend.main`).  
**Frontend:** `http://localhost:5176/?e2e=1` (real `ws://127.0.0.1:6969/ws/clara`).  
**Gate result:** **STOPPED on first failure.** Remaining matrix not executed.

## Live process is Stage B parser, not Stage A

Fingerprint after restart:

| Probe | Result |
| --- | --- |
| `parse_semantic_request` source | `m5.3_semantic_request_parser` |
| Exclusive matcher `match_department_keys_exclusive("Who is the HOD of CSE Data Science?")` | `('cse_ds',)` — Stage B identity **correct** |
| Parser IR entities | `('cse',)` — **collapsed** |
| Live WS / visible card unitId | `cse.hod` |
| Stage A leak signature `[cse_ds.hod, cse.hod]` | **absent** |

This is not a stale Stage A process. Exclusive longest-span matching is loaded. The live failure is **post-match re-resolve**.

Ownership map claimed `_loose_resolve_department_json_key` was removed from `department_resolver` / unit IR. **Disk and live process still import and call it.**

## Blocking case — English CSE Data Science HOD

Classification: **ENTITY FAILURE**

### Required trace

| Stage | Actual | English golden |
| --- | --- | --- |
| input | `Who is the HOD of CSE Data Science?` | same |
| language | `en` (inline language English) | `en` |
| normalized | `who is the hod of cse data science` | same (normalization **PASS**) |
| exclusive identity | `('cse_ds',)` | `('cse_ds',)` — matcher **PASS** |
| SemanticRequest | `topic=hod`, `entities=('cse',)`, `requested_scope=single`, `confidence=HIGH`, `source=m5.3_semantic_request_parser` | `entities=('cse_ds',)` |
| topic | `hod` | `hod` — topic **PASS** |
| scope | `single` | `single` — scope **PASS** |
| unitIds (selector) | `['cse.hod']` | `['cse_ds.hod']` |
| localized content | CSE HOD bio / `hod_voice` for **Dr. Shashikumar D R** | CSE (Data Science) HOD **Dr. Nagashree N** |
| TTS code | `en` | `en` — TTS not the first miss |
| WS unitIds | `['cse.hod']` (`queueUnitIds` / `playbackUnitId` / `engineUnitId`) | `['cse_ds.hod']` |
| visible card | `[data-testid=hod-card]` Faculty Spotlight, **Dr. Shashikumar D R**, Professor & HOD, **Computer Science & Engineering** | Dr. Nagashree N, CSE (Data Science) |

### First divergent stage

**ENTITY RESOLUTION** — `semantic_request_parser.py` re-validates each exclusive-match key via `resolve_department_key(department=key, user_text="")`.

```
match_department_keys_exclusive → ('cse_ds',)
department_label_to_json_key("cse_ds") → None
_loose_resolve_department_json_key("", "cse_ds", deps) → "cse"
  blob = "cse_ds cse_ds"
  first canon in _CANONICAL_DEPARTMENT_TO_JSON_KEY is "CSE"
  "cse" in "cse_ds cse_ds" → True
  returns json_key "cse" at confidence 0.8 (source=voice)
exact json-key fallback (`candidate in deps`) never runs
```

Same collapse is visible in the existing Stage B test (not modified):

`test_m53_parity.py::test_hod_cse_data_science_six_languages` → `('cse',) != ('cse_ds',)`.

Downstream UnitSelector, localization, TTS, WebSocket, and frontend **faithfully consumed the wrong entity**. They are not the root cause.

Visible card matching Dr. Shashikumar D R is a **symptom**. The first miss is `cse_ds` → `cse` inside `resolve_department_key`.

### Browser evidence (no mocks)

1. Wake sleep screen (`?e2e=1`) → English → name `Alex` via `window.__CLARA_TEST_SEND_MESSAGE`.
2. Query sent through the same live hook (typed text over the real Clara WebSocket).
3. `window.__CLARA_M52_DEBUG()`: `unitIds=["cse.hod"]`, `hodDepartments=["cse"]`, `engineState=PLAYING_SCENE` then `PRESENTATION_COMPLETE`.
4. Screenshot: `m53-stage-b-validation-cse-ds-hod-wrong-card.png`.

`installM52Socket` / chat-flow mock sockets were **not** used.

## Matrix classification

Stopped after the blocking identity case. Later rows are **NOT RUN**.

| Case | Classification |
| --- | --- |
| English CSE Data Science HOD (live browser + live WS) | **ENTITY FAILURE** |
| English semantic parity (remaining English goldens) | NOT RUN — blocked |
| CSE / CSE AIML / CSE Data Science identity separation | **ENTITY FAILURE** (same collapse; AIML/plain CSE not separately exercised) |
| Kannada native + Romanized + code-switched | NOT RUN — blocked |
| Hindi native + Romanized + code-switched | NOT RUN — blocked |
| Tamil native + Romanized + code-switched | NOT RUN — blocked |
| Telugu native + Romanized + code-switched | NOT RUN — blocked |
| Malayalam native + Romanized + code-switched | NOT RUN — blocked |
| Single HOD (plain CSE) | NOT RUN — blocked |
| Multi-HOD | NOT RUN — blocked |
| Fees | NOT RUN — blocked |
| Placements | NOT RUN — blocked |
| Achievements | NOT RUN — blocked |
| Overview | NOT RUN — blocked |
| Ambiguous multi-topic fail-closed | NOT RUN — blocked |
| New-turn / reset | NOT RUN — blocked |

No case in this gate is classified PASS / NORMALIZATION FAILURE / TOPIC FAILURE / SCOPE FAILURE / IR FAILURE / UNIT SELECTION FAILURE / LOCALIZATION FAILURE / TTS FAILURE / WS FAILURE / FRONTEND FAILURE except the blocking **ENTITY FAILURE** above.

## What must not be patched in this gate

No production, test, M5.2 playback, semantic, or frontend edits were made during this validation.

A later implementation turn (only if approved) must restore exact json-key acceptance (`cse_ds`, `cse_aiml`) **before** any blob/substring match, keep `_loose_resolve_department_json_key` off the unit-IR path, and add a regression that `resolve_department_key(department="cse_ds")` stays `cse_ds`. Then restart `:6969` and re-run this browser matrix.
