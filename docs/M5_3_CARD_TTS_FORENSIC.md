# M5.3 live multilingual card + TTS forensic

**Date:** 2026-08-14  
**Mode:** real browser (`http://localhost:5176/?e2e=1`) + live `ws://127.0.0.1:6969/ws/clara`. No mocks. No production patches.  
**Backend:** Uvicorn PID 9788 on `:6969`, started from current disk (`backend.main`). Restart not required — process already matches disk.

## Live Stage B fingerprint

| Probe | Result |
| --- | --- |
| Parser source | `m5.3_semantic_request_parser` — Stage B parser **is** loaded |
| Exclusive matcher | `CSE Data Science` → `cse_ds`; `AIML and Data Science` → `cse_aiml, cse_ds` |
| `department_resolver` | still imports `_loose_resolve_department_json_key` |
| Live English WS `"Who is the HOD of CSE Data Science?"` | **`[cse.hod]`** — not `[cse_ds.hod]` |
| Live English WS `"Who is the HOD of AIML and Data Science?"` | **`[cse.hod]`** — not `[cse_aiml.hod, cse_ds.hod]` |

Stage B claims the resolver was cut over. **Disk and the live process still run the pre-cutover resolver.** Exclusive identity works; post-match re-resolve undoes it. This is not a stale Stage A process (the old dual leak `[cse_ds.hod, cse.hod]` is gone).

---

## FIRST FAILURE

**ENTITY RESOLUTION** in `resolve_department_key` → `_loose_resolve_department_json_key`.

`match_department_keys_exclusive` returns the correct json keys. `semantic_request_parser.parse_semantic_request` then re-validates each key via `resolve_department_key(department=key, user_text="")`. Loose substring match treats `"cse"` as contained in `"cse_ds"` and `"cse_aiml"`, so both collapse to `cse`. Exact json-key fallback never runs.

This is the first incorrect boundary for identity, multi-HOD count, and “wrong HOD spoken.” It is **not** “the English card.”

---

## ROOT CAUSE

Two independent losses, stacked:

1. **M5.3 SEMANTIC / ENTITY** — exclusive keys are destroyed by loose substring re-resolve. Multi-HOD never reaches UnitSelector as two entities.
2. **FRONTEND** — `LeadershipOverview` does not render `PresentationCardModel` / `ContentUnit` text. It looks up `collegeData.role_holders.hod_by_department` (`useCollegeData`). Only `en.json` has `role_holders`. Kannada (and other regional files) miss it, so the card uses hardcoded English `HOD_FALLBACK`. Backend Kannada `displayText`/`ttsText` still arrive on the wire and in the chat bubble.

TTS language is **not** lost: Kannada sessions send Kannada `ttsText` and play audio. The spoken **identity** is wrong because of (1). The visible **card language** is English because of (2).

---

## Case A — Kannada multi-HOD (29-step)

Input: `AIML mattu Data Science HOD yaaru?`  
Session language: **Kannada** (`language_code=kn`, provider TTS `kn-IN` from session; `ttsCode` is **not** a narration_plan field).

| # | Stage | Expected | Actual | Boundary |
| --- | --- | --- | --- | --- |
| 1 | Input | AIML + Data Science HOD | same | OK |
| 2 | Session language | Kannada / kn | Kannada | OK |
| 3 | Normalized | romanized AIML + data science + hod | `aiml mattu data science hod yaaru` (yaaru kept; exclusive still hits) | OK |
| 4–8 | SemanticRequest | topic=`hod`, entities=`(cse_aiml, cse_ds)`, scope=single/multi HOD, HIGH | topic=`hod`, entities=`(cse,)`, scope=`single`, HIGH | **ENTITY** |
| 9 | PresentationPlan unitIds | `[cse_aiml.hod, cse_ds.hod]` | `[cse.hod]` | follows entity |
| 10–11 | ContentUnit title/body | AIML + DS Kannada hod_voice | CSE Kannada hod_voice (Shashikumar) | follows entity; **language OK** |
| 12–15 | narration_plan unitId / displayText / ttsText / ttsCode | two segs, Kannada Manjunatha + Nagashree, kn-IN | one seg `cse.hod`, Kannada Shashikumar vision; no per-seg ttsCode | follows entity; **language OK** |
| 16 | WS payload | two unitIds | `unitIds=[cse.hod]`, `showCard=department_overview`, `intent=HOD_PROFILE`, Kannada `ttsText`, audio present | WS faithful |
| 17 | PresentationCardModel | two hod models, Kannada title/content from displayText | one model `cse.hod` (Kannada display available) | follows WS |
| 18 | LeadershipOverview `targetDepartments` | `['cse_aiml','cse_ds']` | `['cse']` (`hodCount=1`) | follows unitIds |
| 19 | PremiumHODCard props | Kannada (or unit body) for AIML then DS | English `HOD_FALLBACK.cse`: Dr. Shashikumar D R, CSE bio | **FRONTEND overwrite** |
| 20 | Rendered DOM | Kannada HOD cards, two scenes | English Faculty Spotlight, `data-hod-dept=cse`, **zero Kannada on card** | FRONTEND |
| 21–23 | TTS queue unitId / ttsCode / ttsText | two clips, kn-IN, Kannada AIML then DS | queueLength=1, `cse.hod`; queue does **not** store ttsCode/ttsText; wire ttsText is Kannada CSE vision | entity for identity; TTS lang OK |
| 24 | Actual audio | two Kannada HOD clips | one clip playing (`hasCurrentAudio`); chat bubble shows same Kannada as `ttsText` | TTS playback of wrong entity |
| 25 | activateByUnitId | `cse_aiml.hod` then `cse_ds.hod` | `cse.hod` only | never given two units |
| 26 | engine sceneIndex/cardIndex | 0 then 1 | `cardIndex=0` only | follows unit count |
| 27 | Visible after clip 0 | AIML HOD | English CSE HOD | entity + frontend |
| 28 | Visible after clip 1 | DS HOD | **no clip 1** (`queueLength=1`, playhead ends at 1) | entity (never two units) |
| 29 | Completion | two-scene complete | `WAITING_FOR_AUDIO` / playhead past single clip | follows unit count |

Chat bubble (backend caption) is Kannada. Card (React props) is English. Localized content is **not** lost at SemanticRequest language, ContentUnitResolver, narration_plan, or WS. It is discarded at **LeadershipOverview → PremiumHODCard**.

---

## Case B — Kannada single HOD

`CSE Data Science HOD yaaru?`

Same first miss: exclusive `cse_ds` → resolve → `cse`. Live WS `[cse.hod]`. Browser: English Shashikumar card, `hodCount=1`, `hasKannadaInCard=false`. TTS wire Kannada CSE `hod_voice`.

---

## Case C — Kannada fees

`CSE ಶುಲ್ಕ ಎಷ್ಟು?`

| Stage | Result |
| --- | --- |
| Exclusive / entities | `cse` — **PASS** for this wording |
| Topic | fees — **PASS** (native `ಶುಲ್ಕ` survived Unicode-safe normalize) |
| ContentUnit | `cse.fees`, Kannada body `KCET: … ₹3,50,000/ವರ್ಷ` |
| WS | `[cse.fees]`, Kannada display/tts, audio present |
| DOM | Kannada `DepartmentFeesCard`, selected CSE, table **₹3,25,000** |

Fees card is **not** English. It is a **separate frontend reconstruction**: `DepartmentFeesCard` ignores `ContentUnit.body` and uses hardcoded `MANAGEMENT_QUOTA_FEE_BY_KEY` (₹3,25,000 vs locale ₹3,50,000). TTS speaks the locale unit string.

---

## Case D — English multi-HOD control

`Who is the HOD of AIML and Data Science?`

Live WS and browser: `[cse.hod]`, `hodDepartments=['cse']`, one English Shashikumar card. Golden `[cse_aiml.hod, cse_ds.hod]` fails at **ENTITY**, before engine/card index.

---

## Where localized content is lost

```
SemanticRequest.language_code = kn     OK
ContentUnitResolver kn.json hod_voice  OK (wrong entity, right language)
narration_plan displayText/ttsText     OK (Kannada on the wire)
WS                                     OK
PresentationCardModel                  would have Kannada from displayText
LeadershipOverview                     DOES NOT USE the model
useCollegeData kn.json                 no role_holders.hod_by_department
HOD_FALLBACK                           English hardcoded
PremiumHODCard / DOM                   English
```

Frontend **is** reconstructing English/default HOD records and overwriting localized backend ContentUnit content.

---

## TTS path

```
session language_code kn-IN     used in tts_to_base64_cached (main.py)
ttsText                         Kannada (wire + in-process)
provider request                Kannada text + kn-IN (no per-segment ttsCode on plan)
returned audio                  present (audioBase64 / queue)
queue                           unitId only; no ttsCode/ttsText fields
playback                        plays that clip
```

First TTS failure is **not** language_code / provider / queue. Spoken **content identity** is wrong because entity collapsed. There is an additional content-type mismatch even in English: card uses `hod_bio`, TTS uses `departments.hod_voice`.

Fallback `retrying en-IN` exists in `tts_to_base64_cached` if primary fails; this run produced Kannada `ttsText` with audio and a Kannada chat caption, so that fallback is not the observed first miss.

---

## Multi-HOD path

```
entity resolution     FAIL (both keys → cse, deduped)
UnitSelector          never sees two entities
WS unitIds            one
CardModel count       one
LeadershipOverview    hodCount=1
PresentationEngine    one scene
activateByUnitId      cse.hod only
React card index      0 only
TTS queue             length 1
```

**Multi-HOD is not a separate engine/frontend scene bug.** It is the same ENTITY collapse. Engine/index/queue cannot show two cards when the plan has one unitId.

---

## EXACT FILE / FUNCTION

| Failure | File | Function |
| --- | --- | --- |
| Entity collapse | `backend/services/content/department_resolver.py` | `resolve_department_key` calling `_loose_resolve_department_json_key` |
| Re-resolve of already-canonical keys | `backend/services/content/semantic_request_parser.py` | `parse_semantic_request` (~98–107) |
| Substring `"cse" in "cse_ds"` | `backend/services/narration_plan.py` | `_loose_resolve_department_json_key` |
| English HOD card | `frontend/src/components/chat/LeadershipOverview.tsx` | locale `hod_by_department` + `HOD_FALLBACK` → `PremiumHODCard` |
| Missing regional HOD records | `backend/data/locales/kn.json` (also hi/ta/te/ml) | no `role_holders` |
| Fees table not ContentUnit | `frontend/src/components/chat/cards/DepartmentFeesCard.tsx` | hardcoded amounts + FEES_COPY |

---

## EXPECTED vs ACTUAL (identity)

| Request | Expected unitIds | Actual |
| --- | --- | --- |
| Who is the HOD of CSE Data Science? | `[cse_ds.hod]` | `[cse.hod]` |
| Who is the HOD of AIML and Data Science? | `[cse_aiml.hod, cse_ds.hod]` | `[cse.hod]` |
| AIML mattu Data Science HOD yaaru? | `[cse_aiml.hod, cse_ds.hod]` | `[cse.hod]` |
| CSE Data Science HOD yaaru? | `[cse_ds.hod]` | `[cse.hod]` |
| CSE ಶುಲ್ಕ ಎಷ್ಟು? | `[cse.fees]` | `[cse.fees]` |

---

## WHY THE ARCHITECTURE LOSES IT

Exclusive matcher is span-safe. The parser does not trust those keys: it sends `cse_ds` / `cse_aiml` back through a resolver whose first fuzzy path is `canon.lower() in blob`. Blob `cse_ds` contains `cse`. Identity for unit IR is still owned by a **legacy fallback** that the ownership map said was removed.

HOD presentation is not a consumer of `ContentUnit`. M5.2 playback consumes `unitId` for scene identity, then `LeadershipOverview` re-hydrates people from a second catalog (English-only `role_holders` / `HOD_FALLBACK`). Caption/TTS stay on the unit path; the card does not.

---

## CLASSIFICATION

| Symptom | Layer |
| --- | --- |
| Latest live-browser ENTITY FAILURE | **M5.3 SEMANTIC** |
| Multi-HOD not two cards | **M5.3 SEMANTIC** (not a separate WS/engine failure) |
| Regional card English | **FRONTEND** (overwrite; after entity) |
| Regional TTS “wrong content” | **M5.3 SEMANTIC** for identity; TTS language **OK** |
| Fees Kannada table vs unit ₹3,50,000 | **FRONTEND** (not English-card; amount/source mismatch) |
| Live backend “old code” | Parser new, **resolver cutover not on disk** |

---

## WHETHER MULTI-HOD IS A SEPARATE FAILURE

**No.** Same `resolve_department_key` collapse. Do not “fix” PresentationEngine / `activateByUnitId` until live WS emits two `.hod` unitIds.

---

## EXACT MINIMAL ARCHITECTURAL FIX

Do not patch in this gate. When implementation is allowed:

1. **Unit IR:** In `resolve_department_key`, if `raw_label` is already a locale json key (`cse_ds`, `cse_aiml`, …), return it **before** `_loose_resolve_department_json_key`. Do not re-loose-resolve keys produced by `match_department_keys_exclusive`. Keep `_loose_resolve` off the unit-identity path (legacy non-unit narration only).
2. **HOD card:** `LeadershipOverview` must render `PresentationCardModel.title/content` (backend `displayText` / ContentUnit) for unit-backed HOD turns. Stop using English `HOD_FALLBACK` as the primary body when a unit model exists. Portraits may still key off `departmentId`.
3. **Prove:** restart `:6969`, live WS `[cse_ds.hod]` and `[cse_aiml.hod, cse_ds.hod]`, then re-run Kannada browser: two scenes, Kannada caption **and** Kannada card (or explicit portrait+unit text), clip 0 ≠ clip 1.

Do not add a giant dictionary, do not invent unitIds in the LLM, do not change M5.2 playback to paper over (1).
