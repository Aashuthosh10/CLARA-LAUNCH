# M5.4 Phase 3 — Card Trigger Registry

Authoritative list of every card-producing content family CLARA supports, derived from the
code (not assumed). Sources:

- [backend/services/content/content_unit_registry.py](../backend/services/content/content_unit_registry.py)
- `DEPARTMENT_JSON_KEY_ORDER` in [backend/services/answer_generation.py](../backend/services/answer_generation.py)
- `_DEPT_SLIDE_SECTION_IDS` in [backend/services/narration_plan.py](../backend/services/narration_plan.py)
- vocabulary in [backend/services/content/semantic_vocab/catalog.py](../backend/services/content/semantic_vocab/catalog.py)

**Total addressable content units: 58** = 11 departments x 5 unit suffixes + 3 context-scoped units.

---

## 1. Department entities (11)

| json key | canonical label | latin aliases in vocab | native-script injection today |
|---|---|---|---|
| `cse` | CSE | `cse`, `computer science`, `computer science engineering`, `computer science and engineering`, `computer science & engineering` | — (latin acronym survives all scripts) |
| `ise` | ISE | `ise`, `information science` | kn `ಐಎಸ್ಇ`, kn `ಮಾಹಿತಿ ವಿಜ್ಞಾನ` |
| `cse_aiml` | CSE (AI & ML) | `aiml`, `ai ml`, `ai & ml`, `cse aiml`, `cse ai ml`, `cse (ai & ml)`, `cse_aiml` | kn, ta, te, ml spelled-letter forms |
| `cse_ds` | CSE (Data Science) | `data science`, `datascience`, `cse ds`, `cse data science`, `cse datascience`, `cse (data science)`, `cse_ds` | kn, ta, te, ml — **hi missing** |
| `cse_cysec` | CSE (Cyber Security) | `cyber security`, `cybersecurity`, `cse cyber security`, `cse_cysec` | kn only |
| `cse_bs` | CSE (Business Systems) | `business systems`, `cse business systems`, `cse_bs` | kn only |
| `ece` | ECE | `ece`, `electronics` | kn `ಇಸಿಇ`, kn `ಎಲೆಕ್ಟ್ರಾನಿಕ್ಸ್` |
| `civil` | Civil | `civil` | kn `ಸಿವಿಲ್` |
| `mechanical` | Mechanical | `mechanical` | kn `ಮೆಕ್ಯಾನಿಕಲ್` |
| `mba` | MBA | `mba` | — |
| `basic_sciences` | Basic Sciences | `basic sciences` | — |

Identity is resolved **only** by `match_department_keys_exclusive` (exclusive longest-span,
occupancy-consuming). `cse` can never be extracted from inside `cse_ds` or `cse_aiml`.

### 1.1 Native-script coverage gaps (fixed in Phase 5)

`_inject_regional_department_tokens` covers Kannada broadly but Hindi has **no** department
entries at all, so `डेटा साइंस` (Hindi Data Science) does not resolve to `cse_ds`. Tamil,
Telugu and Malayalam cover AIML, Data Science and (Tamil only) Cyber Security. These are
vocabulary gaps at the single entity authority, not per-language routing patches.

---

## 2. Department content units (55)

Every department key combines with all five suffixes. Unit id form: `{dept}.{suffix}`.

| suffix | section_id | topic id | example unit | renderer slot |
|---|---|---|---|---|
| `overview` | `intro` | `overview` | `cse_ds.overview` | 0 |
| `hod` | `hod_voice` | `hod` | `cse_aiml.hod` | 1 |
| `achievements` | `achievements` | `achievements` | `ece.achievements` | 2 |
| `placements` | `placement` | `placements` | `cse.placements` | 3 |
| `fees` | `fees` | `fees` | `mba.fees` | 4 |

### 2.1 `{dept}.overview`

| Field | Value |
|---|---|
| Entity requirement | exactly one department per unit |
| Scope | `single` |
| Composition | composes with any other department unit |
| Expected mode | CARD |
| English triggers | `Data Science overview`, `CSE overview`, `overview of ECE` |
| Multilingual | kn `ಡೇಟಾ ಸೈನ್ಸ್ overview`, hi `CSE का overview` |
| Romanized / code-switch | `datascience overview`, `CSE overview thoris` |
| Ambiguous | `overview` alone -> CLARIFY (no entity) |
| Invalid | `Quantum Basket Weaving overview` -> CLARIFY (unknown entity) |

### 2.2 `{dept}` full deck (5 units, atomic)

| Field | Value |
|---|---|
| Trigger | scope cue with **no** explicit topic: `tell me about`, `explain`, `describe`, kn `bagge/helu`, hi `batao/baare`, ta `pattri/tilisi`, te `gurinchi/kurichu`, ml `paray/parayoo` |
| Entity requirement | exactly **one** department |
| Emits | `{d}.overview`, `{d}.hod`, `{d}.achievements`, `{d}.placements`, `{d}.fees` |
| Composition | **not composable** — the deck is atomic |
| Expected mode | CARD |
| Examples | `Tell me about CSE`, `tell me something about CSE`, `CSE bagge helu` |
| Ambiguous | `tell me about CSE and AIML` -> CLARIFY (two entities, no topic: could mean two decks or a comparison) |
| Never | this deck must never be substituted when a different unit resolution fails |

### 2.3 `{dept}.hod`

| Field | Value |
|---|---|
| Entity requirement | one department per unit; N departments produce N units |
| Composition | composes freely; the canonical N-card case |
| Expected mode | CARD |
| English | `Who is the HOD of CSE Data Science?`, `Who are the HODs of AIML, Data Science and CSE?` |
| Multilingual | kn `CSE HOD ಯಾರು?`, hi `CSE का HOD कौन है?`, ta `CSE HOD yaar?`, te `CSE HOD evaru?`, ml `CSE HOD aaranu?` |
| Romanized / code-switch | `datascience mathe aiml du hod yaaru ?`, `CSE mattu AIML HOD yaaru?` |
| Ambiguous | `Who is the HOD?` -> **CLARIFY: missing department** |
| Ambiguous | `Who heads that one?` -> CLARIFY unless the previous turn bound exactly one department |
| Invalid | `Who is the HOD of Hogwarts?` -> CLARIFY |

### 2.4 `{dept}.fees`

| Field | Value |
|---|---|
| Entity requirement | one department per unit |
| Composition | composes |
| Expected mode | CARD |
| English | `CSE fees`, `What is the fee structure for MBA?` |
| Multilingual | kn `CSE ಶುಲ್ಕ`, hi `CSE फीस`, ta `CSE கட்டணம்`, te `CSE ఫీజు`, ml `CSE ഫീസ്` |
| Romanized | `CSE fees yestu?`, `CSE fees kitna hai?`, `CSE fee evlo?` |
| Ambiguous | `Fees?` -> CLARIFY missing department (or the global `fees.overview` surface, see 3.1) |

### 2.5 `{dept}.placements`

| Field | Value |
|---|---|
| Entity requirement | one department per unit |
| Composition | composes |
| Expected mode | CARD when a department is named |
| English | `CSE placements`, `ECE placement record` |
| Ambiguous | `How are placements?` -> department-less. Must be ANSWER (institution-wide) or CLARIFY, and must **never** become a department comparison |

### 2.6 `{dept}.achievements`

| Field | Value |
|---|---|
| Entity requirement | one department per unit |
| Composition | composes |
| Expected mode | CARD |
| English | `CSE achievements`, `ECE rankings` |
| Vocabulary note | English-only cues today (`achievement(s)`, `ranking(s)`). Non-English requests fall back to the full deck or CLARIFY, never to a guessed unit |

---

## 3. Context-scoped units (3)

### 3.1 `fees.overview`

| Field | Value |
|---|---|
| Surface | `department_fees` (global fee table) |
| Entity requirement | **none** (global) |
| Composition | not composable with department units |
| Expected mode | CARD |
| Triggers | `fee structure`, `college fees`, fee questions with no department |
| Frontend | `cardTypeFromUnitId` maps it to `unsupported` so it can never render as a department fees card |

### 3.2 `documents.overview` / 3.3 `admission.documents_required`

| Field | Value |
|---|---|
| Surface | `documents` |
| Entity requirement | none |
| Composition | not composable with department units |
| Expected mode | CARD |
| Triggers | `documents required`, `what documents do I need`, `admission documents` |
| Invalid look-alike | `Do students get opportunities?` — currently steals this surface at fuzzy 0.737. Must be ANSWER |
| Parser | `documents` is an `UNSUPPORTED` vocab cue, so `parse_semantic_request` deliberately returns `None` and leaves this family to the feature path |

---

## 4. Non-unit card surfaces (retained, not UnitSelector-owned)

These are legitimate cards that are **not** content units. They keep their existing owners;
they must not be reachable by frontend text inference.

| Surface | Owner today | Entity | Expected mode | Example triggers | Notes |
|---|---|---|---|---|---|
| `principal_profile` | `extract_features` / `PRINCIPAL_PROFILE_KEYWORDS` | none | CARD | `who is the principal`, `principal of svit` | ASR variant `principle` handled |
| `vice_principal_profile` | same, checked **before** principal | none | CARD | `vice principal name` | must win over `principal` |
| `trustees` / leadership | `extract_features` | none | CARD | `who are the trustees` | frontend regex duplicate must be removed |
| `course_menu` | `extract_features` `_is_course_menu_query` | none | CARD | `what courses do you offer`, `branches available` | `What is the capital of France?` currently steals this at fuzzy 0.714 |
| `admissions` | `extract_features` | none | CARD | `admission process`, `how to apply` | |
| `bus_routes` | `extract_features` `text_has_bus_routes_cue` | route/stop | CARD | `college bus routes from majestic` | `UNSUPPORTED_BUS` keeps the unit parser out |
| `department_comparison` | `extract_features` + comparison registry | 2-3 SVIT departments | CARD | `compare AIML and Data Science` | **intra-SVIT only** |
| `college_overview` | `extract_features` | none | CARD | `tell me about the college` | |

### 4.1 External-college comparison (locked product decision)

`Compare this college with Harvard`, `compare with another college` -> **FALLBACK**.
It must not open the comparison cinema and must not fall back to the first three departments
(`default_comparison_ids(3)`).

---

## 5. Non-card response modes

| Mode | When | Examples |
|---|---|---|
| ANSWER | institutional question with no card family, regardless of length | `How good are the teachers here?`, `Campus life?`, `Are professors experienced?`, `What are the labs like?`, `Tell me about library`, `What are library timings?` |
| CLARIFY | card topic recognised but entity missing, unknown, or composition unbindable | `Who is the HOD?`, `Fees?`, `tell me about CSE and AIML`, `Quantum Basket Weaving HOD` |
| FALLBACK | out of domain, unsafe, or explicitly unsupported | `What is the capital of France?`, `Tell me a joke`, external-college comparison |

An institutional ANSWER with no supporting fact must speak the **unavailable** copy, which
must differ from the FALLBACK copy.

---

## 6. Composition contract summary

| Request shape | Result |
|---|---|
| 1 topic, N entities | N units of that topic, user entity order |
| N topics, 1 entity | N units for that entity, user topic order |
| N topics, N entities, explicitly paired | proximity-bound pairs, user order |
| 0 topics, 1 entity, scope cue | full 5-unit deck (atomic) |
| 0 topics, 1 entity, no scope cue | single `{dept}.overview` |
| 0 topics, N entities | CLARIFY |
| topic present, 0 entities | CLARIFY |
| topics and entities that cannot bind uniquely | CLARIFY |
| any unknown entity | CLARIFY |

No `maxHod`, no `slice(0, 2)`, no first-only, no department-family lock, no artificial
two-card limit. Each unit stays independently addressable by `unitId`.
