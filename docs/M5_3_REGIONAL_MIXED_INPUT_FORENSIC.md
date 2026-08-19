# M5.3 Regional Mixed-Input Forensic Audit

**Status:** READ-ONLY. No production code was changed.  
**Date:** 2026-08-18  
**Exact query:** `datascience mathe aiml du hod yaaru ?`  
**Objective:** Prove runtime freshness, reproduce the failure, and identify the first failed stage. Do not patch.

---

## 1. Current runtime / infrastructure state

| Item | Value |
|---|---|
| Git branch | `main` |
| HEAD | `0cc81fc628b59e757b5044e61f0ca165f8762a1a` (`fix(ci): clear remaining frontend npm audit findings.`, 25 Jul 2026) |
| Working tree | Entire M5.0–M5.3 tree is uncommitted. HEAD does **not** contain the semantic parser. |
| Backend listen | `0.0.0.0:6969` |
| Backend PID (port owner) | **3256** (`python3.13.exe`) |
| Backend parent PID | **17588** (`backend\.venv\Scripts\python.exe`) |
| Backend start | **2026-08-18 10:26:11 IST** |
| Backend cwd | `C:\CLARA-LAUNCH\CLARA-LAUNCH` (start script `Set-Location` project root) |
| Backend launch | `powershell -ExecutionPolicy Bypass -File scripts\start-backend.ps1` → `"...\backend\.venv\Scripts\python.exe" -m backend.main` |
| Uvicorn | `uvicorn.run(app, host=HOST, port=PORT)` — **no `--reload`** |
| Python | venv `C:\CLARA-LAUNCH\CLARA-LAUNCH\backend\.venv\Scripts\python.exe` → 3.13.14; process ExecutablePath is WindowsApps `python3.13.exe` |
| Frontend listen | `0.0.0.0:5176` |
| Frontend PID | **29880** (`node.exe` Vite) |
| Frontend parent | **15520** `cmd.exe /d /s /c vite --host=0.0.0.0 --port 5176 --strictPort` |
| Frontend start | **2026-08-18 10:26:12 IST** |
| Frontend cwd | inferred `frontend/` (`npm run dev` script matches the live command exactly) |
| Frontend launch | `node ...\vite\bin\vite.js --host=0.0.0.0 --port 5176 --strictPort` |
| Node | v22.19.0 (`C:\Program Files\nodejs\node.exe`) |
| Vite HMR | **active** (dev server). Browser also opened `ws://localhost:5176/?token=...` (Vite) plus `ws://localhost:6969/ws/clara` (backend). |
| Stale Python/Node | **No extra listeners.** PID 17588 is the venv launcher; PID 3256 is the actual listener. One Vite process only. |

File mtimes vs process start (all **older** than 10:26 today):

| File | mtime |
|---|---|
| `backend/services/content/semantic_request_parser.py` | 2026-08-14 20:41:47 |
| `backend/services/content/unit_selector.py` | 2026-08-14 20:41:52 |
| `backend/services/content/semantic_topics.py` | 2026-08-14 20:41:38 |
| `backend/services/content/semantic_vocab/catalog.py` | 2026-08-15 09:31:56 |
| `backend/services/answer_generation.py` | 2026-08-15 12:01:57 |
| `backend/app/main.py` | 2026-08-16 13:23:22 |
| `frontend/src/screens/ChatScreen.tsx` | 2026-08-16 13:39:21 |
| `frontend/src/hooks/useWebSocket.ts` | 2026-08-16 13:19:02 |

Because uvicorn has **no reload**, the running backend loaded these files at 10:26:11. They have not been written since. The running process contains this M5.3 tree.

---

## 2. Runtime freshness proof

There is **no existing runtime fingerprint / version sentinel** on WS payloads. None was added.

Identity was proven by four independent checks:

1. **Disk vs import:** in-process `inspect.getfile(semantic_request_parser)` = `C:\CLARA-LAUNCH\CLARA-LAUNCH\backend\services\content\semantic_request_parser.py`. SHA-256 prefix `8789750a22376456` matches the file on disk.
2. **Process vs mtime:** backend PID 3256 started 10:26:11; parser mtime 14 Aug. No later write → imported bytecode is this file.
3. **In-process vs live WS:** same query, same unitIds (`cse_ds.hod`, `cse_aiml.hod`) from:
   - `parse_semantic_request` + `select_content_units`
   - `ConversationOrchestrator.run` (no Groq)
   - live `ws://127.0.0.1:6969/ws/clara` (Kannada session)
   - live English session
4. **Browser → Vite → backend:** Playwright against `http://localhost:5176/?e2e=1` opened `ws://localhost:6969/ws/clara` and received the same `narration_plan.unitIds`.

**Verdict: the query is hitting the M5.3 code under audit. Do not stop for a stale backend.**

If a previous human session showed a Data Science **overview deck**, that session was not this process, or the visible HOD&Vision copy was mistaken for overview (see §8–9).

---

## 3. Exact reproduction

Input used everywhere, unmodified:

```
datascience mathe aiml du hod yaaru ?
```

| Path | `narration_plan.unitIds` | `showCard` | `intent` | Visible UI |
|---|---|---|---|---|
| A. In-process parser → UnitSelector | `cse_ds.hod`, `cse_aiml.hod` | n/a | CI `HOD_PROFILE` | n/a |
| A. Orchestrator (Kannada session) | `cse_ds.hod`, `cse_aiml.hod` | `department_overview` | `HOD_PROFILE` | n/a |
| B. Live WS Kannada | `cse_ds.hod`, `cse_aiml.hod` | `department_overview` | `HOD_PROFILE` | n/a |
| B. Live WS English | `cse_ds.hod`, `cse_aiml.hod` | `department_overview` | `HOD_PROFILE` | n/a |
| C. Real browser Kannada `?e2e=1` | `cse_ds.hod`, `cse_aiml.hod` | `department_overview` | `HOD_PROFILE` | `hod-card` visible, `data-hod-count=2`, `isHodStage=true`, `isDepartmentOverviewStage=false` |

A, B, and C **agree**. The current runtime does **not** emit a CSE Data Science five-slide overview for this sentence.

---

## 4. Golden expected IR (locked before seeing results)

Do not revise after the fact.

```
topic: hod
entities: [cse_ds, cse_aiml]     # user order: datascience first, then aiml
scope: multi
ordered unitIds: [cse_ds.hod, cse_aiml.hod]
```

### Recorded ambiguity (not guessed into the IR)

| Token | Status |
|---|---|
| `mathe` | **Not in vocab.** Most likely a misspelling of romanized Kannada `mattu` (and). It is **not** matched as Mathematics (`math` is a 4-letter alias and does not fuzzy-match `mathe`). Entity resolution does not need the conjunction. |
| `du` | **Stripped to empty** by `normalize_query_to_english` token_map `"du": ""`. Likely a Kannada particle / genitive (“AIML *du* HOD”). Not a department. |
| `yaaru` | Catalog `QUESTION` cue for topic `hod` (Kannada “who”). Also mapped to `who` in mixed-language phrase patterns. |
| `datascience` / `aiml` | English technical aliases in `semantic_vocab/catalog.py`. |

---

## 5. Actual trace (every stage)

Session language for the browser/WS reproduction: **Kannada** (`kn-IN`). English session produces the same unitIds with English HOD bodies.

| Stage | Actual value |
|---|---|
| RAW INPUT | `datascience mathe aiml du hod yaaru ?` |
| session language | Kannada (`language_code_key=kn`) or English (`en`); **unit identity identical** |
| `normalize_query_to_english` | `datascience mathe aiml hod yaaru` (`du` removed) |
| `normalize_user_input` | `datascience mathe aiml hod who` (`yaaru` → `who`; `mathe` unchanged) |
| `normalize_for_department_match` | `datascience mathe aiml du hod yaaru` (`du` kept here) |
| language/script | Latin / romanized + English technical terms. No Indic script in this sentence. |
| topic candidates | `{hod}` from both raw and normalized (`hod` TOPIC + `yaaru` QUESTION). Not overview. Not fees. |
| department/entity candidates | `('cse_ds', 'cse_aiml')` exclusive longest-span, **user order** |
| scope (`is_full_department_scope`) | `false` (`bagge`/`heli`/`tell me about` absent) |
| confidence | `MEDIUM` (parser rule: HOD + ≥2 entities) |
| **SemanticRequest** | `topic=hod`, `entities=['cse_ds','cse_aiml']`, **`requested_scope='single'`**, `source=m5.3_semantic_request_parser` |
| UnitSelector | `['cse_ds.hod', 'cse_aiml.hod']`, policy `MULTI_UNIT` |
| PresentationPlan | those two units, surface `department_overview` |
| `narration_plan.unitIds` | `cse_ds.hod`, `cse_aiml.hod` |
| ContentUnits | `cse_ds.hod` / `hod_voice` (Dr. Nagashree N); `cse_aiml.hod` / `hod_voice` (Dr. T G Manjunatha) |
| TTS text (English session) | first clip body: `Dr. Nagashree N directs our commitment to generate knowledge…` |
| TTS text (Kannada session) | Kannada localization of the same HOD bodies |
| visible card/unitId | `cse_ds.hod`, hod-count **2** |

CI / competing features (not used for unit composition):

| Field | Value |
|---|---|
| `extract_features.department_name` | `CSE (Data Science)` — **first department only** |
| `is_hod_query` | `true` |
| `is_overview_query` | `false` |
| `is_comparison_query` | `false` (two labels present, no comparison cue) |
| `resolve_intent_from_features` | `HOD_PROFILE` |
| presentation override | `show_card = department_overview` because the HOD plan is M5.2-representable |

---

## 6. First failed stage

Classification required: exactly one of A–O.

### Against the locked golden IR

**H. scope detection** (then written into **J. SemanticRequest construction**).

Parser code:

```86:89:backend/services/content/semantic_request_parser.py
    if len(atomic) == 1:
        topic = next(iter(atomic))
        requested_scope = "single"
```

Any single atomic topic, including multi-entity HOD, is stored as `requested_scope="single"`. Golden IR wanted `multi`.

**This is the first field that differs from the golden IR.**

It is **not** the cause of a Data Science overview. UnitSelector loops all HOD entities regardless of `requested_scope`.

### Against the observed overview symptom

**Not reproduced on the current browser/backend.** SemanticRequest is already:

```
hod
[cse_ds, cse_aiml]
```

Per the audit rule: **do not modify the semantic parser to “fix overview.”** Move downstream — and downstream currently selects the two HOD units.

If a prior session truly showed a five-slide Data Science overview, the latent owner is **not** this parser result. See §8.

---

## 7. Root cause

### For this exact sentence, on this runtime

**There is no semantic misparse into overview.**

The mixed query **does** become the correct canonical request (topic + entities + unitIds). The only IR contract miss is `requested_scope`.

### What the user most likely saw (ranked, evidence-based)

1. **HOD & Vision copy looks like a department overview.**  
   `hod_voice` is vision prose (“directs our commitment to generate knowledge…”), titled “HOD ಮತ್ತು ದೃಷ್ಟಿಕೋನ” / “HOD & Vision”. That is the Data Science **HOD unit**, not `cse_ds.overview`. TTS correctly speaks that body.
2. **`showCard=department_overview` + `departmentId=CSE (Data Science)`** is the WS envelope even when units are HOD. Logs and chrome can read as “overview.” Frontend `allHod` branch still opens `hod-card`.
3. **First card remains / sequence does not occur** can be playback timing: at first HOD paint, `queueLength` was **1** (`cse_ds.hod` only) while `unitIds` already had two. This audit did not wait for clip two. That is a **playback observation**, not a parser failure.
4. **Latent fail-open (not taken today):** if `narration_plan` arrived **without** `unitId`s, `ChatScreen` `department_overview` falls through to the **fixed five-slide Data Science deck** using CI `departmentId`. That path **exactly** matches the reported symptom. It did **not** fire on the live probe (unitIds were present).

### Mixed-language architecture (the real long-term defect)

M5.3 does **not** “understand” regional + English as a language model. It matches:

- English/latin department aliases
- a small catalog of romanized question/scope words (`yaaru`, `bagge`, `yestu`, …)
- optional script→English **injection** for a few Kannada/Tamil/Telugu/Malayalam department spellings
- token stripping (`du`, `heli`)

There is **no** conjunction vocabulary (`mattu` / `mathe` / `aur` / `hagu`). Multi-entity works only because exclusive alias spans do not need “and.”

---

## 8. Why overview was selected

**It was not selected as content.**

| Hypothesis | Result |
|---|---|
| Parser returned `overview` / `[cse_ds]` | **False.** Parser returned `hod` / `[cse_ds, cse_aiml]`. |
| Parser failed → legacy `_resolve_department_overview` 5-unit deck | **False.** Unit-backed path returned 2 HOD segments. |
| CI intent mismatch → presentation override to overview **units** | **Partial.** Override sets **surface** `department_overview` but UnitSelector still emits HOD units. CI intent is `HOD_PROFILE`. |
| Frontend inferred department and forced overview | **False.** Typed path does not send `localIntent`. `inferForcedDepartmentComparisonFromUserText` does not fire (no comparison cue). Browser `isDepartmentOverviewStage=false`. |
| Frontend legacy 5-slide because `models.length === 0` | **False.** `unitIds` present; `allHod` branch taken. |

**Owner of the word “overview” in the payload:** `presentation_resolver._maybe_override_to_department_overview_surface`. It remaps the **card surface** so M5.2 can carry HOD units on the department-overview channel. It does not rewrite topic to overview.

**Owner of CI `departmentId=CSE (Data Science)`:** `extract_features` first-department-wins. Harmless when unitIds exist. **Dangerous** if unitIds are missing (legacy deck of that one department).

---

## 9. Why TTS spoke overview

TTS received **HOD `hod_voice` body**, not `cse_ds.overview` intro.

English live WS first `ttsText`:

> Dr. Nagashree N directs our commitment to generate knowledge through state-of-the-art concepts…

Kannada live/browser: the Kannada localization of the same Nagashree HOD paragraph.

**TTS is speaking what it was given.** The given text is vision-style HOD copy, which a listener can reasonably call “overview.” It is not the department intro unit.

If a human heard a full five-slide department intro (intake, facilities, etc.), that audio is **not** this process’s plan. Investigate a stale session or the latent no-`unitId` fallback — not Sarvam.

Clip identity on first browser paint: `playbackUnitId=cse_ds.hod`, `engineState=WAITING_FOR_AUDIO`, `hasCurrentAudio=true`. AIML clip not yet in queue at that instant.

---

## 10. Multi-HOD capability findings

Repo search: **no** `maxHod`, **no** `firstHod`, **no** HOD `slice(0, 2)` in the unit path.

| Query | Entities (user order) | Units |
|---|---|---|
| AIML + Data Science (English) | `cse_aiml`, `cse_ds` | 2 HOD |
| AIML + Data Science + CSE | `cse_aiml`, `cse_ds`, `cse` | 3 HOD |
| AIML + Data Science + CSE + ECE | `cse_aiml`, `cse_ds`, `cse`, `ece` | **4 HOD** |

UnitSelector:

```85:91:backend/services/content/unit_selector.py
    elif topic == TOPIC_HOD:
        for dept_key in entities:
            uid = _unit_id_for_topic(dept_key=dept_key, topic=topic)
            ...
            unit_ids.append(uid)
```

**N entities are supported for HOD.** Order follows exclusive match order.

Limits that exist elsewhere (must not be confused with HOD):

- `extract_comparison_department_canonical_labels` / comparison cinema: **cap 3**
- Frontend comparison: `slice(0, 3)`
- Duplicate `hod_voice` `sectionId` is **not** collapsed (frontend tests assert this)

Frontend HOD stage maps `data-hod-count` from unit-backed models. Browser: count `2`.

---

## 11. Six-language parity findings

Same intent should yield same canonical `unitIds`; normalized text need not match.

### Single HOD — Data Science

| Language | Phrase | Units |
|---|---|---|
| English | Who is the HOD of CSE Data Science? | `cse_ds.hod` |
| Kannada romanized | CSE Data Science HOD yaaru? | `cse_ds.hod` |
| Hindi romanized | CSE Data Science ka HOD kaun hai? | `cse_ds.hod` |
| Tamil romanized | CSE Data Science HOD yaar? | `cse_ds.hod` |
| Telugu romanized | CSE Data Science HOD evaru? | `cse_ds.hod` |
| Malayalam romanized | CSE Data Science HOD aaranu? | `cse_ds.hod` |

### Two HOD — AIML + Data Science

English / `mattu` / `aur` / `yaar` / `evaru` / `aaranu` mixed with English dept names: **`cse_aiml.hod`, `cse_ds.hod`** (or DS-first when the user said datascience first).

Exact audit query (romanized Kannada + English): **`cse_ds.hod`, `cse_aiml.hod`**.

### Three HOD — AIML, Data Science, CSE

English and romanized regional `HOD yaaru/yaar/evaru/aaranu`: **`cse_aiml.hod`, `cse_ds.hod`, `cse.hod`**.

### Phase-6 example set

| # | Input | Result |
|---|---|---|
| 1 | `datascience mathe aiml du hod yaaru ?` | 2 HOD, DS then AIML |
| 2 | `CSE mattu AIML HOD yaaru?` | 2 HOD, **`cse` then `cse_aiml`** (plain CSE, not DS) |
| 3 | `AIML mattu Data Science HOD yaaru?` | 2 HOD, AIML then DS |
| 4 | `CSE bagge heli` | **full-department overview** 5 units (`bagge`/`heli` are SCOPE cues) |
| 5 | `CSE fees yestu?` | `cse.fees` |
| 6 | `CSE ಶುಲ್ಕ ಎಷ್ಟು?` | `cse.fees` (topic from **raw** script cue). Normalized text **splits Kannada aksharas** via `_normalize_text` |
| 7 | `CSE HOD yaaru?` | `cse.hod` |
| 8 | `CSE HOD yaaru anta heli` | still `cse.hod` (atomic `{hod}` wins; `heli` is scope-only) |

### Native-script gaps (not this query, but parity)

| Input | Entities | Failure |
|---|---|---|
| `ಡೇಟಾ ಸೈನ್ಸ್ ಹಾಗೂ AIML HOD ಯಾರು?` | `cse_ds`, `cse_aiml` | Kannada DS inject exists. `ಯಾರು` is **not** the catalog variant `yaaru`; topic still `hod` from English `HOD`. |
| `डेटा साइंस और AIML HOD कौन है?` | **`cse_aiml` only** | **Hindi “डेटा साइंस” is not in `_inject_regional_department_tokens` and not in the department catalog.** Multi-entity parity **fails**. `कौन` is not `kaun`; topic still `hod` from `HOD`. |

**Parity is latin-alias + romanized question-word parity, not native-script department parity.**

---

## 12. Competing authority findings

Production path for this query (proven):

```
typed input
→ ConversationOrchestrator (raw user_text)
→ parse_semantic_request
→ SemanticRequest {hod, [cse_ds, cse_aiml]}
→ UnitSelector
→ narration_plan [cse_ds.hod, cse_aiml.hod]
→ WS
→ ChatScreen allHod / hod-card
```

`defer_narration=True` then `attach_narration` after language lock still uses **raw** `text`. Groq `normalize_and_classify_query` runs **after** narration attach and does **not** feed the parser.

| Mechanism | Class | Role on this query |
|---|---|---|
| `parse_semantic_request` | **AUTHORITATIVE** | topic + entities + unit identity |
| `select_content_units` | **AUTHORITATIVE** | unitIds |
| `extract_features` | **CONSUMER** of text; **AUTHORITATIVE** only for CI intent/dept **label** | first dept = Data Science |
| `resolve_intent_from_features` | **AUTHORITATIVE** for CI intent | `HOD_PROFILE` (hod keywords beat comparison) |
| `normalize_and_classify_query` (Groq) | **LEGACY / COMPETING** for LLM query_en | not used by parser |
| `normalize_user_input` / token_map | **CONSUMER** of mixed tokens | strips `du`, maps `yaaru`→`who`; ignores `mathe` |
| `_inject_regional_department_tokens` | **CONSUMER** | unused (query is latin) |
| `_maybe_override_to_department_overview_surface` | **CONSUMER** | surface alias only |
| `resolve_narration` unit path | **AUTHORITATIVE** when `card_surface=department_overview` | 2 HOD segs |
| `_resolve_department_overview` / `build_full_department_plan` | **LEGACY FALLBACK** | **not taken** |
| `main.py` frontend `localIntent` | **LEGACY FALLBACK** for UI clicks | not sent on typed input |
| ChatScreen inference (comparison/bus/executive) | **COMPETING** if `showCard` empty | not taken |
| ChatScreen `department_overview` with `models.length===0` | **LEGACY FALLBACK / fail-open** | **not taken**; this **would** become DS overview |
| Frontend `presentationCardsFromNarrationSegments` | **CONSUMER** | does not invent units |

**Fail-closed check:** a failed HOD parse is **not** converted to SemanticRequest overview by the parser (multi-topic → `None`). Overview **units** appear only from (a) true overview topic, or (b) **legacy narration / frontend deck** after a missing plan. Path (b) is the fail-closed violation to eliminate next — it was idle here.

---

## 13. Infrastructure verdict

**INFRASTRUCTURE BLOCKER: NO**

Proof: port 6969 = PID 3256 started after parser mtime; live WS unitIds = in-process unitIds; browser WS URL is `ws://localhost:6969/ws/clara`.

Not a stale Python process, not a wrong port, not a silent TTS outage.

---

## 14. Semantic architecture verdict

**SEMANTIC FAILURE: NO** for this sentence’s topic/entities/unitIds.

**SEMANTIC FAILURE: YES** for the *architecture* of mixed input:

- `requested_scope` cannot express multi-entity HOD (`H`)
- no language-independent conjunction / particle layer (`mathe`, `mattu`, `du`)
- department catalog is English-latin; Hindi (and incomplete other-script) names drop entities (`F`/`G` on native script)
- `normalize_user_input` → `_normalize_text` **breaks Kannada graphemes**; topic detection is rescued only because `detect_atomic_topics` also sees **raw** text (`B`/`C` latent)

Do **not** add a Kannada-only parser. Extend the **one** catalog + exclusive identity + UnitSelector.

---

## 15. Frontend verdict

**FRONTEND PRESENTATION FAILURE: NO** on the current probe.

Backend unitIds were correct **and** the UI showed `hod-card` / `data-hod-count=2` / `isDepartmentOverviewStage=false`.

Residual risks (not this failure):

- `showCard=department_overview` naming
- legacy five-slide path if `unitId`s are absent
- first-clip queue vs N units (playback, not composition)

---

## 16. TTS verdict

**TTS FAILURE: NO**

TTS received the Data Science HOD body and the Kannada localization of that body. Identity is `cse_ds.hod`. Sarvam key exhaustion is out of scope (TTS is live again).

Wrong-sounding speech is **content selection of `hod_voice`**, not a provider/audio-identity bug.

---

## 17. Permanent architectural correction (advisory only — not implemented)

One canonical pipeline, all languages:

```
raw user text (any script / code-switch)
  → Unicode grapheme-safe normalize (do not split aksharas)
  → language-independent catalog match
        DEPARTMENT aliases (latin + native + romanized)
        TOPIC / QUESTION / SCOPE / particles / conjunctions
  → exclusive longest-span entities (user order)
  → atomic topics (fail-closed if ≥2 topics)
  → SemanticRequest { topic, entities[], requested_scope: single|multi|full_department }
  → UnitSelector (HOD: N units in entity order)
  → PresentationPlan.unitIds
  → localize ContentUnit body for display/TTS
```

Rules:

1. **Never** invent a second parser per language.
2. **Never** use Groq translation as SemanticRequest input.
3. **Never** let CI `department_name` (first hit) compose cards.
4. **Never** turn `SemanticRequest is None` into a full department overview.
5. `requested_scope=multi` when `topic=hod` and `len(entities)≥2` (IR honesty). UnitSelector already implements N.
6. Conjunctions (`mattu`/`mathe`/`aur`/…) are optional glue, not entity detectors.
7. Surface name: carrying HOD units on `department_overview` is a migration alias; do not let it drive a five-slide builder.

---

## 18. Files that should change (next implementation, not this audit)

| File | Why |
|---|---|
| `backend/services/content/semantic_request_parser.py` | Set `requested_scope=multi` for multi-entity HOD. Do not change topic/entity logic for this query. |
| `backend/services/content/semantic_vocab/catalog.py` | Language-independent conjunction/particle cues; native-script **department** aliases including Hindi Data Science; native “who” forms (`ಯಾರು`, `कौन`, …) if they must not rely on latin `HOD`. |
| `backend/services/answer_generation.py` | `_inject_regional_department_tokens` Hindi (and missing scripts); stop `_normalize_text` from splitting Indic graphemes; keep `du` stripping documented. |
| `backend/services/content/unicode_text.py` | Ensure **all** production normalize paths use grapheme-safe helpers (parser already uses this for identity; `normalize_user_input` does not). |
| `backend/services/orchestration/narration_resolver.py` | Fail-closed: never `_resolve_department_overview` when HOD parse failed or when entities≥2 and topic≠overview. |
| `frontend/src/screens/ChatScreen.tsx` | Fail-closed: `department_overview` + empty `unitIds` must not build a five-slide deck for a HOD/mixed typed query. |
| Tests listed in §20 | Lock the exact mixed sentence and native-script multi-HOD. |

---

## 19. Files that must remain untouched

- `frontend` PresentationEngine / `presentationTimeline` / M5.2 playback sequencing
- `frontend/src/lib/ws/outboundCommandDispatcher.ts`
- `frontend/src/lib/ws/ttsClipSlots.ts`, `turnFence.ts` (unless a later audit proves clip-2 never enqueues **after** waiting)
- TTS provider / Sarvam client / API-key loading
- Do not add retries
- Do not add an LLM to the semantic path
- Do not add a Kannada-specific UnitSelector or language-forked parser
- Do not change PresentationEngine activation rules to “fix” this sentence

---

## 20. Required tests

1. Exact: `datascience mathe aiml du hod yaaru ?` → SemanticRequest `hod` + `[cse_ds, cse_aiml]` + units `[cse_ds.hod, cse_aiml.hod]` for `kn` and `en` sessions.
2. Same units if `mathe` is replaced by `mattu` (conjunction optional).
3. `Who is the HOD of AIML and Data Science?` → `[cse_aiml.hod, cse_ds.hod]` (user order).
4. Three- and four-department English HOD lists → N units, no cap at 2.
5. Hindi native `डेटा साइंस और AIML HOD कौन है?` → **both** entities (today: AIML only). Must fail until catalog/inject is complete.
6. `CSE ಶುಲ್ಕ ಎಷ್ಟು?` → `cse.fees`; normalized text must **retain** `ಶುಲ್ಕ`.
7. `CSE bagge heli` remains full-department overview (not HOD).
8. `CSE HOD yaaru anta heli` remains `cse.hod` (not full deck).
9. Live WS + browser: `showCard` may be `department_overview`, but `unitIds` and `hod-card[data-hod-count=2]`; **must not** enter `isDepartmentOverviewStage`.
10. Fail-closed: if parser returns `None` for a mixed HOD-like string, WS must **not** emit a five-slide DS overview.

---

## 21. Acceptance criteria

- [ ] Runtime identity remains: live WS unitIds == in-process UnitSelector for the exact query.
- [ ] Exact mixed sentence → `[cse_ds.hod, cse_aiml.hod]` in parser, orchestrator, WS, and browser.
- [ ] Browser: HOD stage, count 2, first visible `cse_ds.hod`, second `cse_aiml.hod` after clip advance.
- [ ] TTS clip 1 speaks DS HOD body; clip 2 speaks AIML HOD body. No intro/overview unit audio.
- [ ] `requested_scope=multi` for this IR (after the **next** implementation, not claimed now).
- [ ] Native-script department names in all six languages resolve the same entity keys as latin aliases.
- [ ] No language-specific parser, no Groq-authored SemanticRequest, no overview fallback on failed HOD.
- [ ] This audit’s production files remain unmodified until the next approved implementation.

---

## Evidence artifacts (read-only probes)

- `docs/_m53_regional_mixed_forensic_probe.py` + `docs/_m53_regional_mixed_probe_out.json`
- `frontend/e2e/_m53_regional_mixed_browser.mjs` + `docs/_m53_regional_mixed_browser_out.json`

STOP. No implementation follows this report.
