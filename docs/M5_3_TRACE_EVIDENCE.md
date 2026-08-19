# M5.3 Phase 1 / 1A — Trace evidence

Golden EXPECTED IR was defined in `docs/_m53_forensic_probe.py` **before** comparing ACTUAL. ASR = `typed` / `N/A`.

## Method

1. **In-process (full matrix, 75 cases):** typed text + session `language_code_key` → `normalize_user_input` → `parse_semantic_request` → `select_content_units` → `resolve_units_for_plan`. Raw: `docs/_m53_forensic_traces.json`.
2. **Live typed WS:** real backend `:6969` `/ws/clara`, Origin `http://localhost:5176`, `language_selected` then typed `user_message` (guest name first). Raw: `docs/_m53_live_ws_traces.json`. Same IR functions as WS `narration_resolver`.

Vite `:5176` was up. No `installM52Socket`. No speech/ASR.

## Score

| Probe | Total | Pass vs golden unitIds | Fail |
| --- | --- | --- | --- |
| In-process | 75 | 62 | 13 |
| Live WS | representative subset (see below) | matches in-process IR on completed turns | same first-failure classes |

## Golden vs actual — failures only

First-failure stage below is the **earliest incorrect pipeline stage**, not the probe’s naive field-order label. “Wrong card” is never the root cause.

### Cluster 1 — entity identity leak (`cse` inside “CSE Data Science”)

EXPECTED (all six languages): `topic=hod`, `entities=[cse_ds]`, `scope=single`, `unitIds=[cse_ds.hod]`.

| ID | INPUT | LANGUAGE | ACTUAL entities | ACTUAL unitIds | Confidence | FIRST FAILED STAGE |
| --- | --- | --- | --- | --- | --- | --- |
| parity_hod_ds_en | Who is the HOD of CSE Data Science? | en | `[cse_ds, cse]` | `[cse_ds.hod, cse.hod]` | MEDIUM (0.75) | **entity_resolution** |
| parity_hod_ds_kn | CSE Data Science HOD yaaru? | kn | same | same | MEDIUM | **entity_resolution** |
| parity_hod_ds_hi | CSE Data Science ka HOD kaun hai? | hi | same | same | MEDIUM | **entity_resolution** |
| parity_hod_ds_ta | CSE Data Science HOD yaar? | ta | same | same | MEDIUM | **entity_resolution** |
| parity_hod_ds_te | CSE Data Science HOD evaru? | te | same | same | MEDIUM | **entity_resolution** |
| parity_hod_ds_ml | CSE Data Science HOD aaranu? | ml | same | same | MEDIUM | **entity_resolution** |
| en_wo_hod | HOD of CSE Data Science who | en | `[cse_ds, cse]` | `[cse_ds.hod, cse.hod]` | MEDIUM | **entity_resolution** |

Language, topic (`hod`), and scope (`single`) were correct. UnitSelector faithfully expanded the **wrong entity list**. Live WS for all six parity_hod_ds turns carried `[cse_ds.hod, cse.hod]` on `narration_plan` (TTS audio present on the first live run).

Mechanism: `extract_comparison_department_canonical_labels` matches overlapping aliases (`cse data science` **and** `cse`) without exclusive span consumption. `department_resolver` can also fall through to `_loose_resolve_department_json_key` (`canon.lower() in blob`).

### Cluster 2 — normalization destroys native-script topic cues

| ID | INPUT | LANGUAGE | EXPECTED | ACTUAL | FIRST FAILED STAGE |
| --- | --- | --- | --- | --- | --- |
| kn_lit_fees | CSE ಶುಲ್ಕ | kn | fees / `[cse]` / `[cse.fees]` | overview / `[cse]` / `[cse.overview]` MEDIUM | **normalization** |
| hi_script_fees | CSE फीस | hi | fees / `[cse]` / `[cse.fees]` | overview / `[cse]` / `[cse.overview]` MEDIUM | **normalization** |

`normalize_user_input` → `normalize_query_to_english` runs `re.sub(r"[^\w\s&()]+", " ", out)`. Python `\w` does **not** keep Indic combining marks / virama:

- `CSE ಶುಲ್ಕ` → `cse ಶ ಲ ಕ`
- `CSE फीस` → `cse फ स`

Topic detection never sees `ಶುಲ್ಕ` / `फीस` even though those strings exist in `FEE_QUERY_KEYWORDS`. Romanized equivalents (`CSE fees yestu?`, `CSE fees kitna`) **pass**.

The in-process probe labeled these `topic_detection`; that is a **later symptom**. Earliest incorrect stage is normalization.

### Cluster 3 — fail-closed not implemented (guessed unitId at MEDIUM)

EXPECTED: `SemanticRequest = None`, no unitIds.

| ID | INPUT | ACTUAL topic / entities / unitIds | FIRST FAILED STAGE |
| --- | --- | --- | --- |
| neg_fees_and_hod | CSE fees and HOD | hod / `[cse]` / `[cse.hod]` | **topic_detection** (dual topic; HOD wins parser order) |
| neg_place_and_fees | CSE placements and fees | fees / `[cse]` / `[cse.fees]` | **topic_detection** (dual topic; fees before placements) |
| neg_hod_and_aiml_fees | CSE HOD and AIML fees | hod / `[cse, cse_aiml]` / `[cse.hod, cse_aiml.hod]` | **topic_detection** (mixed topics; HOD wins; AIML fees dropped) |
| kn_amb_fees_hod | CSE fees mattu HOD yaaru | hod / `[cse]` / `[cse.hod]` | **topic_detection** |

Entity `cse` is present in the text; the first *incorrect* decision is composing one topic instead of refusing. Confidence is **MEDIUM 0.75**, not LOW/NONE — so the system does not fail closed.

## Passed categories (same IR across languages)

When entities are unambiguous (plain `CSE`, `AIML`, `ECE`) and topic cues are Latin/romanized:

- Literal / natural / colloquial / romanized / code-switch / short / long fees, HOD, placements, achievements, overview
- `CSE fees yestu?` → `fees` / `[cse]` / `[cse.fees]` (entities `[cse]`, not `cse_ds`, as defined before the run)
- Multi-HOD `Who is the HOD of AIML and Data Science?` → `[cse_aiml.hod, cse_ds.hod]` (order preserved). Live WS matched.
- `CSE mattu AIML HOD yaaru?` → `[cse.hod, cse_aiml.hod]`
- `Tell me about CSE` / `CSE bagge heli` / regional equivalents → full five-unit CSE deck; content bodies in session language (kn/hi/ta/te/ml)
- `CSE overview` → single `cse.overview` (no expansion)
- `tell me something about CSE` → full deck (supported overview)
- Negatives that correctly returned None: `which department?`, `fees`, `who?`, `Quantum Basket Weaving HOD`, `CSS fees`

## Live WS notes

Handshake succeeded (origin allow-list). Typed only. No `installM52Socket`.

**Run 1 (authoritative wire evidence):** eight complete turns, wait-for-final-TTS:

| ID | WS unitIds | Golden match | TTS audio |
| --- | --- | --- | --- |
| parity_hod_ds_en/kn/hi/ta/te/ml | `[cse_ds.hod, cse.hod]` | no (entity leak on the wire) | yes |
| parity_fees_aiml_en | `[cse_aiml.fees]` | yes | yes |
| parity_mh_en | `[cse_aiml.hod, cse_ds.hod]` | yes | yes |

WS `unitId` lists matched in-process IR on every completed turn (including the failure). TTS is **VERIFIED** for this sample (all six languages on Data Science HOD plus English fees/multi-HOD).

**Run 2** was aborted: completing a turn on the first leftover audio frame after `reset_session` produced empty `ws_unit_ids` for some language switches. That is a probe artifact, not a semantic miss.

Remaining matrix rows (native-script fees, fail-closed, romanized regional) use the in-process probe, which is the same `parse_semantic_request` → `select_content_units` path `narration_resolver` uses.

ASR was not used. Do not treat STT as a semantic failure.

## Pipeline fields captured per row

INPUT, LANGUAGE, EXPECTED_TOPIC / ENTITIES / SCOPE / UNIT_IDS, ACTUAL_NORMALIZED_TEXT, ACTUAL_SEMANTIC_REQUEST, ACTUAL_UNIT_IDS, ACTUAL_CONTENT_LANGUAGE, ACTUAL_TTS_CODE (`TARGET_LANGUAGE_CODES`), ACTUAL_PRESENTATION (unitIds). Live WS adds `ws_unit_ids` from `narration_plan.segments[].unitId`.
