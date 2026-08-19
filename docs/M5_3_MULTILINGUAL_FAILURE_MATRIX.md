# M5.3 Phase 2 — Multilingual failure matrix

First-failure rule: classify **only the earliest incorrect stage**. “Wrong card” is a symptom.

Pipeline:

`INPUT → language → normalization → entity resolution → topic detection → scope detection → SemanticRequest → UnitSelector → ContentUnitResolver → localization → TTS language → WS → presentation`

## Confidence evidence (today)

`SemanticRequest.confidence` is a float, not HIGH/MEDIUM/LOW/NONE.

| Band used in traces | Float | How produced | Evidence quality |
| --- | --- | --- | --- |
| HIGH | 0.85 | department present **and** `overview` + `full_department` | Heuristic, not calibrated |
| MEDIUM | 0.75 | `features.has_department` | Assigned even when entity list is wrong or topic is guessed |
| LOW | 0.6 | theoretical default if no department | **Never observed** on a produced SemanticRequest (parser returns `None` instead) |
| NONE | no request | no resolved department or no topic | Correct for several negatives |

**Invariant broken:** LOW/NONE must not guess a unitId. Dual-topic and identity-leak cases still emit MEDIUM and a guessed/expanded plan.

## Matrix — failed requests

| ID | INPUT | Lang | EXPECTED IR | ACTUAL IR | First failed stage | Confidence | Why this stage | Not the root cause |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| parity_hod_ds_* (×6) | CSE Data Science HOD (en/kn/hi/ta/te/ml) | 6 | hod / `[cse_ds]` / `[cse_ds.hod]` | hod / `[cse_ds, cse]` / both HOD units | **entity_resolution** | MEDIUM | Overlapping alias `cse` inside `cse_ds`; language+topic correct | Two HOD cards (symptom) |
| en_wo_hod | HOD of CSE Data Science who | en | same | same leak | **entity_resolution** | MEDIUM | Same overlap; word order not the failure | Presentation |
| kn_lit_fees | CSE ಶುಲ್ಕ | kn | fees / `[cse.fees]` | overview / `[cse.overview]` | **normalization** | MEDIUM | `[^\\w\\s&()]+` splits virama; cue gone before topic | Topic detector missing ಕನ್ನಡ (cues exist but never see the word) |
| hi_script_fees | CSE फीस | hi | fees / `[cse.fees]` | overview / `[cse.overview]` | **normalization** | MEDIUM | Same `\w` strip of matras | Hindi cue list |
| neg_fees_and_hod | CSE fees and HOD | en | None | hod / `[cse.hod]` | **topic_detection** | MEDIUM | Two topics; `is_hod_query` wins; no refuse | Entity `cse` is in the text |
| neg_place_and_fees | CSE placements and fees | en | None | fees / `[cse.fees]` | **topic_detection** | MEDIUM | Two topics; fees before placements | “Wrong fees card” |
| neg_hod_and_aiml_fees | CSE HOD and AIML fees | en | None | hod / `[cse.hod, cse_aiml.hod]` | **topic_detection** | MEDIUM | Mixed topics; HOD plan invented for AIML | Multi-HOD (unsupported mix) |
| kn_amb_fees_hod | CSE fees mattu HOD yaaru | kn | None | hod / `[cse.hod]` | **topic_detection** | MEDIUM | Same dual-topic guess | Kannada localization (bodies were kn) |

UnitSelector, ContentUnitResolver, localization, TTS language, and WS **did not originate** these failures. Live WS `unitId` lists matched the bad IR.

## Matrix — representative passes (control)

| Category | Example | First incorrect stage |
| --- | --- | --- |
| Romanized fees | `CSE fees yestu?` → `cse.fees` | NONE |
| Code-switch overview | `CSE bagge heli` → five CSE units, kn bodies | NONE |
| Multi-HOD unambiguous | AIML and Data Science HOD → `[cse_aiml.hod, cse_ds.hod]` | NONE |
| Anti-expansion | `CSE overview` → `[cse.overview]` | NONE |
| Additional dept | `ECE fees` → `[ece.fees]` | NONE |
| Unknown dept | `Quantum Basket Weaving HOD` → None | NONE |
| Near-match | `CSS fees` → None | NONE |
| Topic-only | `fees` / `who?` / `which department?` → None | NONE |

## Localization / TTS (not first-failure for the 13)

When the IR was correct, `resolve_units_for_plan` returned session-language bodies (kn/hi/ta/te/ml). Live WS first run produced TTS audio for English/Kannada/Hindi/Tamil/Telugu/Malayalam Data Science HOD turns. Remaining live-WS TTS: see `_m53_live_ws_traces.json` (`tts_verified`).

ASR: not in this matrix.
