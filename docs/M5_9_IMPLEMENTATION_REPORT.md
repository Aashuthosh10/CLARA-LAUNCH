# M5.9 — Universal unit selection + six-language card presentation

**Baseline HEAD:** `ffa8c42277433ca09a82d7a267f07acbb2ccd0c7` (M5.8 report-hash follow-up)  
**M5.8 TTS:** frozen. This milestone builds cards/units on top of it.

## 1. Root cause / current architecture

UnitSelector already selected **N department units** with no card cap. Multi-unit broke at other boundaries:

| Boundary | Defect |
|---|---|
| `parse_semantic_request` | Returned `None` without a department span, so principal / dean / trustees never entered UnitSelector |
| Pairing | Two named departments with no topic (`tell me about CSE and AIML`) fail-closed (kept). `"Show me A and B"` was also `None` |
| ChatScreen | Mixed-department decks set `activeDepartmentId = null`, so `DepartmentCardFactory` did not mount |
| Card language | Cards read `LanguageContext`; TTS used session `language_code_key`. WS `assistant_audio_update` did not send session language, so Kannada TTS could sit next to English cards |
| Narration | `tts_text` was the card body, not an intent-aware sentence |

**M5.8 TTS was not modified.**

Ownership is unchanged:

- ResponseDecision → ANSWER / CARD / CLARIFY / FALLBACK
- UnitSelector → which unit IDs
- PresentationEngine / ChatScreen → how those units display
- Narration planner → what is spoken
- M5.8 TTS → how that text is spoken

## 2. What was changed

INTENT → N canonical units (any valid registry combination) → localized presentation → smart narration → existing M5.8 TTS.

No new HOD data, canteen photos, or campus photos.

## 3. Files changed

New:

- `backend/services/content/leadership_units.py`
- `backend/services/content/unit_narration.py`
- `backend/tests/test_m59_universal_units.py`
- `frontend/e2e/m59-card-language.spec.ts`

Edited: registry, resolver, parser, UnitSelector, narration mapper, semantic proposal atomic topics, `main.py` language fields on the existing WS merge, ChatScreen mixed-deck + session language, `useCollegeData` override, presentation card types, existing leadership/fees/trustees cards (testids / language prop only).

Not edited: `responseTtsScheduler.ts`, `ackAudio.ts`, `tts_orchestrator.py`, ACK/playhead/fence/chunking.

## 4. Unit registry discovered

Existing department units (11 × 5):

`{cse, ise, cse_aiml, cse_ds, cse_cysec, cse_bs, ece, civil, mechanical, mba, basic_sciences}.{overview, hod, achievements, placements, fees}`

Existing context units (not department cards): `fees.overview`, `documents.overview`, `admission.documents_required`

Registered existing leadership cards (not invented):

| UNIT | CANONICAL ID | DATA SOURCE | UI | NARRATION | LOCALIZATION | PHOTO | UNITSELECTOR |
|---|---|---|---|---|---|---|---|
| Principal | `leadership.principal` | `EXEC_PRINCIPAL` + `role_holders.principal` (en) | `PremiumPrincipalCard` / `PRINCIPAL_COPY` | `unit_narration` → M5.8 | six langs in EXEC/PRINCIPAL_COPY | existing principal portrait | yes |
| Vice Principal / Dean | `leadership.vice_principal` | `EXEC_VICE` | `PremiumVicePrincipalCard` | same | six langs | existing VP portrait | yes |
| Trustees | `leadership.trustees` | locale `role_holders.trustees` + static cards | `Trustees` | same | names from locale; long bios still English in the React list | existing trustee images | yes |
| Department overview | `{dept}.overview` | `locales/*.json#departments.*.intro` | `DepartmentCardFactory` | localized intro + lead-in | locale JSON | department slot images | yes |
| HOD | `{dept}.hod` | `departments.*.hod_voice` + `role_holders.hod_by_department` | `LeadershipOverview` / factory slot | “The Head of {dept} is {name}.” in 6 langs | hod_voice localized; official name from role_holders | existing HOD portraits | yes |
| Achievements | `{dept}.achievements` | locale | factory | localized | locale JSON | slot images | yes |
| Placements (dept) | `{dept}.placements` | locale | factory | localized | locale JSON | slot images | yes |
| Fees (dept) | `{dept}.fees` | locale + fee table | `DepartmentFeesCard` / factory | localized | locale + `FEES_COPY_BY_LANGUAGE` | n/a | yes |

**Not cards (do not invent):** campus, canteen, faculty quality, clubs → ANSWER/RAG.

## 5. UnitSelector changes

- Items no longer require department `entities` (leadership-only is valid)
- Each `(entity, topic)` maps independently to a registered unit ID
- No pairwise `if HOD + department` logic
- No N-card cap
- Full-department 5-unit deck still atomic for one department + overview + “tell me about”

Parser:

- Leadership spans from existing principal / vice-principal / dean / trustee cues (no generic “who” cues)
- `"Show me CSE Data Science and CSE AIML."` → two overviews
- `"tell me about CSE and AIML"` still fail-closed
- Anaphora carry-over unchanged

## 6. Localization changes

- WS `assistant_audio_update` now includes `language_code_key` + `language_name` when the session language is set
- ChatScreen `presentationLanguage` prefers that payload over lagging `LanguageContext`
- `useCollegeData(presentationLanguage)` loads the matching `locales/{en,kn,hi,ta,te,ml}.json`
- Cards receive `presentationLanguage`

## 7. Narration changes

`map_content_units_to_segments` sets `tts_text` from `narrate_unit()`. Display stays title + body. M5.8 only speaks `tts_text`.

HOD example (en): `The Head of the CSE (Data Science) department is Dr. Nagashree N.`  
Not: `Department Head. Dr. XXXXX. View details...`

## 8. TTS integration

**M5.8 TTS was not modified.**

`main.py` only adds session language fields onto the existing merge payload (presentation localization, not TTS architecture).

## 9. Six-language tests

`backend.tests.test_m59_universal_units`: EN/KN/HI/TA/TE/ML HOD queries; principal resolve+narration in all six; code-switch `HOD yaaru`.

Playwright `e2e/m59-card-language.spec.ts`: English, Kannada, Hindi, Tamil, Telugu, Malayalam HOD card `data-card-language`; Kannada principal card shows Kannada script.

## 10. Multi-unit tests

Principal+trustees, HOD+overview, two department overviews, fees+placements, four HODs (no cap). Campus+canteen → no units, ANSWER.

## 11. E2E results

- `e2e/m59-card-language.spec.ts`: **8 passed**
- `e2e/m58-tts-orchestrator.spec.ts`: **3 passed** (regression)

## 12. Runtime results

Browser e2e (Chromium, mocked WS matching production card/TTS contract):

- Cards render in the selected language
- Mixed CSE DS + AIML overviews mount `department-card` (no black screen, ChatScreen stays mounted)
- Kannada principal card visible with Kannada copy
- M5.8 first-playable / failure / play() rejection still pass

Live Sarvam kiosk pass was not required to prove architecture; M5.8 TTS path is unchanged.

## 13–14. Git

See commit after push.

## 15. Remaining limitations

- Campus / canteen / faculty / clubs remain ANSWER (no unit IDs in the repository)
- `tell me about CSE and AIML` still clarifies (ambiguous vs comparison / two full decks)
- `kn.json` has no `role_holders`; official HOD/trustee **names** fall back to English proper nouns
- Trustee long bios in `Trustees.tsx` are still English; spoken trustee narration is localized
- Global `fees.overview` / `documents.*` stay out of department renderers (existing M5.0 identity)
- Content/asset refresh (new HOD copy, canteen/campus photos) is the next controlled step
