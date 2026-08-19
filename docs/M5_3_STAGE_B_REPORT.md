# M5.3 Stage B report — Option B implemented

Typed multilingual semantic parity for department cards. ASR not touched. M5.2 playback not modified.

## Commands

```
python -m pytest backend/tests -q --tb=no
# 301 passed, 5 failed (pre-existing TTS/RAG — unchanged, not hidden)

npx tsc --noEmit   # frontend, exit 0

npx vitest run src/runtime/ownership.test.ts ...toDepartmentKey.test.ts
# 37 passed
```

Live `:6969` process was **not restarted**; a one-shot WS against that process still returned old `[cse_ds.hod, cse.hod]`. In-process WS (`test_m53_ws_unitid_parity.py`, real `process_user_text_and_reply`) returns `[cse_ds.hod]`. **Restart the backend** to load M5.3 on the live socket.

Playwright Chromium binary is missing in this environment; real-browser E2E is **NOT VERIFIED** here. Do not use `installM52Socket` for M5.3 acceptance.

## Fixed Stage A failures

### 1. CSE Data Science HOD identity leak

- **INPUT:** `Who is the HOD of CSE Data Science?` (and kn/hi/ta/te/ml equivalents)
- **EXPECTED IR:** topic=`hod`, entities=`[cse_ds]`, scope=`single`
- **OLD ACTUAL IR:** entities=`[cse_ds, cse]`
- **ROOT CAUSE:** overlapping alias match; `cse` substring/span inside Data Science
- **CHANGE:** exclusive longest-span matching; consume spans; no `_loose_resolve` on unit identity
- **NEW IR:** hod / `[cse_ds]` / single / HIGH
- **UNIT IDS:** `[cse_ds.hod]`
- **TEST:** `test_m53_parity.py::test_hod_cse_data_science_six_languages`, `test_m53_department_identity.py`, `test_m53_ws_unitid_parity.py::test_cse_data_science_hod_ws_matches_ir`

### 2. Native-script fees destroyed in normalize

- **INPUT:** `CSE ಶುಲ್ಕ` / `CSE फीस` / Tamil/Telugu/Malayalam fee words
- **EXPECTED IR:** fees / `[cse]` / `[cse.fees]`
- **OLD ACTUAL IR:** overview / `[cse.overview]` (`ಶುಲ್ಕ` → `ಶ ಲ ಕ`)
- **ROOT CAUSE:** `re.sub(r"[^\w\s&()]+")` stripped Indic combining marks
- **CHANGE:** `strip_punctuation_keep_graphemes` (keep L/N/M); TOPIC vocab native fee words
- **NEW IR:** fees / `[cse]` / HIGH
- **UNIT IDS:** `[cse.fees]`
- **TEST:** `test_m53_unicode_normalize.py`, `test_m53_parity.py::test_native_script_fees`

### 3. Dual-topic first-keyword-wins

- **INPUT:** `CSE fees and HOD` / `CSE placements and fees` / `CSE HOD and AIML fees` / `CSE fees mattu HOD yaaru`
- **EXPECTED IR:** None (no unitId)
- **OLD ACTUAL IR:** guessed hod or fees at MEDIUM 0.75
- **ROOT CAUSE:** first matching topic wins; confidence did not fail closed
- **CHANGE:** detect **all** atomic topics; ≥2 → None; selector refuses LOW/NONE; narration does not expand to five cards
- **NEW IR:** None
- **UNIT IDS:** none
- **TEST:** `test_m53_fail_closed.py`, `test_m53_ws_unitid_parity.py::test_fail_closed_ws_has_no_unit_ids`

## Controls that still pass

Romanized fees, code-switch overview, colloquial HOD, multi-HOD order `[cse_aiml.hod, cse_ds.hod]`, plain CSE vs CSE AIML vs CSE Data Science, ECE fees, unknown/near-match None.

## Pre-existing failures (unchanged)

1. `test_rag_empty_falls_back_without_crashing`
2. `test_tts_timeout_still_returns_text_response`
3–5. `test_tts_full_reply.py` overlap/segment tests
