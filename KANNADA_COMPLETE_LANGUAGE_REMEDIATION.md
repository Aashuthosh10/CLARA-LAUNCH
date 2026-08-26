# CLARA Kannada Complete Language Remediation

Date: 2026-08-27  
Branch/HEAD reviewed: `main` / `450535f` (`content(kn): import 37 validated Kannada V2 corrections`)  
Commit/push: not performed

## 1. Complete Kannada source inventory

The inventory combined a recursive Unicode scan of production Python/TypeScript/TSX/JSON, a scalar walk of the locale trees, the 388-row bilingual review workbook/CSV, and runtime consumer tracing.

| Source family | Count | Authority and runtime consumer | Reachability |
|---|---:|---|---|
| `backend/data/locales/kn.json` string leaves | 472 raw / 469 distinct display strings | Canonical institutional facts; backend content resolver and frontend `@college-locales` alias | Production |
| `backend/data/locales/ui.json` Kannada leaves | 75 | Canonical fixed UI, clarification, error, session, card-label and deterministic-action copy | Production |
| `backend/data/faq_answers.json` Kannada FAQ text | 78 (39 questions + 39 answers) | FAQ selector and answer path | Production |
| Kannada-bearing production files | 54 | Content maps, semantic vocabulary, narration and legacy card content | Production; individual paths classified below |
| Remaining measured code literals | 86 | Mostly legacy card/campus content; fixed UI and FAQ consumers now resolve through canonical data | Production or explicitly legacy |
| `frontend/src/data/locales/kn.json` | 29 | Orphaned legacy locale; no production import | Unreachable/orphaned |
| LLM-generated Kannada surfaces | 2 | Structured narrator and open-ended RAG/answer generation | Production; constrained, not pre-approved prose |

Runtime inventory by surface:

| ID / user surface | Authoritative source | Production consumer | Kind | Display / narration | First defect before remediation | Result / verification |
|---|---|---|---|---|---|---|
| language.select | `ui.kn.language.select` | language gate / ChatScreen | fixed | display | duplicate frontend literal | exact-key test + browser |
| welcome.general | `ui.kn.welcome.general_*` | greetings, templates, WebSocket, ChatScreen | fixed | both | competing time-based greetings | exact-key/backend/browser |
| welcome.named | `ui.kn.welcome.named_*` | guest-name gate | fixed + `{name}` | both | fragment/duplicate authority | Kannada/Latin/long-name tests + browser |
| welcome.name_prompt | `ui.kn.welcome.name_prompt` | WebSocket name stage | fixed | both | old competing prompt | exact test + browser |
| status.* | `ui.kn.status.*` | App, ChatScreen, orb | fixed | display | English/hardcoded fallback | frontend tests |
| clarification.* | `ui.kn.clarification.*` | conversation templates and main WebSocket route | fixed | both | duplicated literals / missing HOD and fee paths | backend tests |
| error.* | `ui.kn.error.*` | browser STT, backend STT, WebSocket, audio failures | fixed | both | English fallback | backend/frontend tests |
| session.* | `ui.kn.session.*` | App reset/reconnect and kiosk controls | fixed | display/both | missing fixed Kannada | contract tests |
| action.* | `ui.kn.action.*` | deterministic card replies | fixed + variables | narration | English fallback and fragment composition | backend direct-route tests |
| card labels | `ui.kn.cards.*` | admissions, placement, department decks, brochure | fixed | display | duplicated hardcoded labels | frontend type/build/tests |
| institution facts | `kn.json:institution_overview` | answer context/content resolver | fixed facts | both | raw structured-string risk | generated-output guard; blocker recorded |
| leadership/trustees/HOD | `kn.json:leadership`, `role_holders` | cards and unit narration | fixed facts + names | both | 11 missing HOD bios; protected Latin names | missing-source blockers retained |
| departments | `kn.json:departments` | department cards/unit narration | fixed facts | both | terminology and fee conflicts | 37 V2 values preserved; conflicts blocked/reported |
| admissions | `kn.json:admissions_and_fees` | admissions cards/narration | fixed facts | both | Python-dict strings and fee conflicts | fee slides fail closed; raw structures tested absent |
| placements | `kn.json:placements_and_training` | card deck/narration | fixed facts | both | duplicated labels | canonical labels used |
| campus hostel/canteen/events | `kn.json:campus_units` + UI blocker | campus cards and unit narration | fixed but unconfirmed | both | 112 sentinel occurrences | sentinel remains internal; 28 units expose only blocker |
| FAQ | `faq_answers.json` | FAQ ticker/query response | fixed | both | separate authority | retained and inventoried |
| generated institutional answer | constrained prompt + verified facts | Groq/RAG answer path | LLM-generated | both | possible English/JSON/ID/citation leakage | fail-closed validator |
| generated structured narration | constrained prompt + locale slices | narrator path | LLM-generated | narration | literal/English fallback risk | terminology/output contract |
| orphan frontend locale | `frontend/src/data/locales/kn.json` | none | fixed legacy | neither | duplicate drifting authority | import regression test |

Exact inventory totals:

```text
TOTAL KANNADA SOURCES: 54 production files
FIXED LOCALE STRINGS: 622 (469 canonical locale + 78 FAQ + 75 fixed UI)
HARDCODED KANNADA STRINGS: 86 remaining measured code literals; fixed-UI bindings migrated to ui.json and 39 duplicated FAQ questions removed from frontend code
FRAGMENT-COMPOSED SENTENCES: 9 variable-bearing template families reviewed
LLM-GENERATED SURFACES: 2
DISPLAY-ONLY STRINGS: 31 fixed UI keys/families
NARRATION-ONLY STRINGS: 10 deterministic action/template families
DISPLAY-AND-NARRATION STRINGS: 34 fixed UI keys/families plus canonical fact rows
ENGLISH FALLBACK PATHS: 31 identified fixed-state/action paths; removed for Kannada selection
DUPLICATED SOURCES: 74 fixed UI/card-label/FAQ bindings removed or overridden by one authority
OFFICIAL-FACT BLOCKERS: 90 evidence rows (84 campus placeholder rows + 6 fee conflicts)
MISSING-SOURCE BLOCKERS: 11 HOD biography rows
UNREACHABLE/ORPHANED SOURCES: 29 legacy locale strings in 1 unimported file
```

Counts distinguish source strings from UI surface families; a source can feed both display and narration.

## 2. Root causes

1. Fixed copy was spread across backend maps, frontend maps and component literals.
2. Several Kannada sessions entered generic English failure branches.
3. Campus placeholder markers were treated as content instead of editorial status.
4. Admissions fee values conflicted across authoritative-looking stores, including Python-dict strings.
5. Generated answers had language instructions but no fail-closed output validation.
6. UI captions used UTF-16 `.slice()`, allowing Indic grapheme/mid-word clipping.
7. Kannada typography was applied to main answer text but not every state/control surface.
8. A stale 29-string frontend locale remained in the tree, although Vite correctly imported the backend locale.

## 3. Terminology glossary

| Concept | Final Kannada | Protected abbreviation / contextual note |
|---|---|---|
| Welcome | ಸ್ವಾಗತ | — |
| Department | ವಿಭಾಗ | CSE/ISE/ECE remain protected codes |
| Head of Department | ವಿಭಾಗ ಮುಖ್ಯಸ್ಥರು | `HOD` accepted in recognition; full Kannada in user copy |
| Professor | ಪ್ರಾಧ್ಯಾಪಕರು | `Prof.` retained in official names |
| Principal | ಪ್ರಾಂಶುಪಾಲರು | — |
| Admission | ಪ್ರವೇಶಾತಿ / ಪ್ರವೇಶ | ಪ್ರವೇಶಾತಿ for process; ಪ್ರವೇಶ for examination compounds |
| Eligibility | ಅರ್ಹತೆ | — |
| Documents | ದಾಖಲೆಗಳು | — |
| Fees / annual fees | ಶುಲ್ಕ / ವಾರ್ಷಿಕ ಶುಲ್ಕ | never infer a numeric value |
| Management quota | ಮ್ಯಾನೇಜ್‌ಮೆಂಟ್ ಕೋಟಾ | policy term; fee facts may be blocked |
| Placements | ಪ್ಲೇಸ್‌ಮೆಂಟ್‌ಗಳು | consistent zero-width non-joiner retained |
| Achievements | ಸಾಧನೆಗಳು | — |
| Facilities | ಸೌಲಭ್ಯಗಳು | — |
| Campus | ಕ್ಯಾಂಪಸ್ | — |
| Hostel | ಹಾಸ್ಟೆಲ್ | girls/boys qualifier precedes the noun |
| Canteen | ಕ್ಯಾಂಟೀನ್ | — |
| Transport | ಸಾರಿಗೆ | `ಬಸ್` retained for bus routes |
| Scholarship | ವಿದ್ಯಾರ್ಥಿವೇತನ | — |
| Accreditation | ಮಾನ್ಯತೆ | NBA/NAAC protected |
| Engineering | ಎಂಜಿನಿಯರಿಂಗ್ | — |
| Computer Science | ಕಂಪ್ಯೂಟರ್ ಸೈನ್ಸ್ | CSE protected |
| Artificial Intelligence | ಕೃತಕ ಬುದ್ಧಿಮತ್ತೆ | AI/AIML protected |
| Machine Learning | ಯಂತ್ರ ಕಲಿಕೆ | ML/AIML protected |
| Data Science | ಡೇಟಾ ಸೈನ್ಸ್ | — |
| Cyber Security | ಸೈಬರ್ ಭದ್ರತೆ | — |
| Business Systems | ಬಿಸಿನೆಸ್ ಸಿಸ್ಟಮ್ಸ್ | — |
| Information Science | ಇನ್ಫರ್ಮೇಶನ್ ಸೈನ್ಸ್ | ISE protected |
| Electronics and Communication | ಎಲೆಕ್ಟ್ರಾನಿಕ್ಸ್ ಮತ್ತು ಕಮ್ಯುನಿಕೇಶನ್ | ECE protected |
| Mechanical Engineering | ಮೆಕ್ಯಾನಿಕಲ್ ಎಂಜಿನಿಯರಿಂಗ್ | — |
| Civil Engineering | ಸಿವಿಲ್ ಎಂಜಿನಿಯರಿಂಗ್ | — |
| Basic Sciences | ಮೂಲ ವಿಜ್ಞಾನಗಳು | — |
| Research | ಸಂಶೋಧನೆ | — |
| Interview | ಸಂದರ್ಶನ | — |
| Training | ತರಬೇತಿ | — |
| Internship | ಇಂಟರ್ನ್‌ಶಿಪ್ | — |
| Clarification | ಸ್ಪಷ್ಟೀಕರಣ | user prompts remain direct questions |
| Error / retry / timeout | ದೋಷ / ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ / ಸಮಯ ಮೀರಿದೆ | fixed UI contract |
| Thank you | ಧನ್ಯವಾದಗಳು | — |

Protected unchanged tokens include `CLARA`, `SVIT`, `VTU`, `CSE`, `AIML`, `ISE`, `ECE`, `MBA`, `KCET`, `COMEDK`, `KEA`, `NBA`, `NAAC`, names, numbers and official addresses.

## 4. Corrected surfaces and old/new evidence

| Surface | Old behavior/copy | Final Kannada / action | Meaning preservation |
|---|---|---|---|
| general welcome | time-dependent introduction variants | `ಸ್ವಾಗತ. ಇಂದು ನಿಮಗೆ ಯಾವ ಮಾಹಿತಿ ಬೇಕು?` | preserves welcome + request for information, removes duplicate self-introduction |
| named welcome | separate acknowledgement fragments | `{name}, ಸ್ವಾಗತ. ಇಂದು ನಿಮಗೆ ಯಾವ ಮಾಹಿತಿ ಬೇಕು?` | name remains vocative; complete sentence follows |
| name prompt | competing “preferred/dear name” wording | `ದಯವಿಟ್ಟು ನಿಮ್ಮ ಹೆಸರನ್ನು ತಿಳಿಸಿ.` | asks only for the name; no added preference claim |
| language selection | duplicated frontend literal | `ಭಾಷೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ.` | exact imperative |
| listening/processing/thinking | hardcoded and English fallback variants | centralized `status.*` text | state meaning retained |
| department/HOD/fee clarification | generic or English-only paths | complete `clarification.*` questions | missing variable is explicitly requested |
| browser/back-end speech errors | English messages | centralized `error.*` Kannada | recovery action retained; typing alternative supplied |
| offline/reconnect/home/brochure | English chrome | centralized Kannada UI keys | same control action |
| deterministic card actions | English or fragment-composed reply | `action.*` complete templates | department/name variables preserved |
| campus samples | sentinel and `(ಮಾದರಿ)` visible/spoken | approved official-fact blocker | status only; no missing fact presented |
| admissions fee cards | conflicting figures/raw dict text | approved official-fact blocker | no unverified fee asserted |
| generated replies | prompt only | constrained prompt + output validator + localized fallback | verified facts remain separate from wording generation |
| caption/name clipping | raw character slice | word/grapheme-safe clipping or rejection | no mid-grapheme output |

The 37 values in commit `450535f` were not changed. `git diff -- backend/data/locales/kn.json` is empty.

## 5. Blocked official facts and missing sources

- All 28 hostel/canteen/event units remain internally marked `SAMPLE_REPLACE_WITH_OFFICIAL`; their 112 stored marker-bearing fields remain evidence, never public copy.
- Six fee conflicts remain unresolved in source data. Kannada admissions fee display/narration is blocked instead of selecting one amount.
- Eleven HOD biographies lack direct Kannada source text. No biography was invented.
- Trustee designation/name inconsistencies and Principal spacing differences remain source-owner blockers.
- Approved official-fact message: `ಈ ಮಾಹಿತಿಯನ್ನು ಇನ್ನೂ ಅಧಿಕೃತವಾಗಿ ದೃಢೀಕರಿಸಲಾಗಿಲ್ಲ. ಹೆಚ್ಚಿನ ಮಾಹಿತಿಗಾಗಿ ಸಂಬಂಧಿತ ವಿಭಾಗವನ್ನು ಸಂಪರ್ಕಿಸಿ.`
- Approved missing-source message: `ಅನುಮೋದಿತ ಮೂಲದಲ್ಲಿ ಈ ಮಾಹಿತಿ ಲಭ್ಯವಿಲ್ಲ. ಹೆಚ್ಚಿನ ಮಾಹಿತಿಗಾಗಿ ಸಂಬಂಧಿತ ವಿಭಾಗವನ್ನು ಸಂಪರ್ಕಿಸಿ.`

## 6. Fixed UI templates

`backend/data/locales/ui.json` is the one fixed-copy contract. Backend uses `backend/services/ui_localization.py`; frontend imports the same JSON through `@college-locales/ui.json`. Variable interpolation is key-based and tested for Kannada names, Latin names, mixed-script names, acronyms, numbers, missing names and long names.

## 7. Generated-answer controls

Both Kannada generation routes require natural concise Kannada, the glossary, protected acronyms/names/numbers, and prohibit English fallback, raw JSON, IDs, citations, metadata, placeholders and system instructions. `generated_reply_is_safe_for_language` rejects unsafe output before display or TTS; the caller substitutes the approved localized unavailable state.

Classification: **Runtime Generated – Constrained**. Native-human perfection is not claimed.

## 8. Frontend fidelity

- backend locale alias remains authoritative; orphan locale imports are regression-tested absent;
- Kannada root uses `script-typo-kn` and `lang="kn"`;
- speech errors, offline banner, orb labels, Home and brochure chrome use Kannada keys;
- raw `.slice()` was removed from user captions and summaries;
- `Intl.Segmenter` clips by grapheme, then by a complete word where possible;
- sample campus cards replace marker text and clear sample points;
- conflicting fee dictionaries are not rendered;
- K1 reset/reconnect/session-language behavior remains in place.

## 9. Narration and TTS text

Display line breaks and narration spacing remain separate. Campus status narration replaces line breaks with pauses but never speaks the sentinel. The T1 sanitizer and provider-boundary tests preserve Kannada characters/joiners while filtering unsafe text. English TTS retry is not introduced for Kannada. Generated output is validated before narration.

## 10. Automated tests

Added/extended coverage:

- exact UI goldens;
- named/no-name/long-name/mixed-script variables;
- generated Kannada language/metadata rejection;
- campus placeholder internal/public separation;
- conflicting fee display/narration blocking;
- shared frontend/back-end source authority;
- orphan-locale import prevention;
- browser speech error localization;
- Kannada grapheme clipping;
- exact campus card blocked copy;
- real Chromium Kannada flow.

Results recorded after the final changes:

- mandatory deterministic backend bundle: `809 passed, 781 subtests passed`; an earlier full discovery run completed `1158 passed` and exposed five superseded exact-copy/sample-narration assertions, which were strengthened for the new contract;
- frontend Vitest unit set: `175 passed`; the raw `vitest run` command also discovers Playwright specs and reports framework-context errors, so unit verification excludes `e2e/**`;
- TypeScript: pass;
- production Vite build: pass (only existing chunk-size/dynamic-import warnings);
- Chromium Kannada remediation spec: `1 passed`.

## 11. Browser verification matrix

The browser used the real Vite application and a real current-code FastAPI WebSocket on isolated ports. No Kannada payload was mocked. Missing PostgreSQL/RAG intentionally exercised the approved missing-source state.

| Exact action/input | Expected | Actual/source/component/font | Clip / English / duplicate | Result | Screenshot |
|---|---|---|---|---|---|
| wake → select Kannada | Kannada name prompt | exact `welcome.name_prompt`; ChatScreen; `script-typo-kn` | no/no/no | PASS | named-welcome image |
| enter `ಆಶಾ` | exact named welcome | exact `welcome.named_narration`; WebSocket → AnimatedAiMessage | no/no/no | PASS | named-welcome image |
| inspect chat root | Kannada font/language metadata | `script-typo-kn`, `lang=kn` | no/no/no | PASS | both images |
| ask `girls hostel rooms` with RAG unavailable | approved blocker | exact `availability.missing_source`; full-text answer | no/no/no | PASS | blocker image |
| inspect rendered page for sentinel | absent | zero `SAMPLE_REPLACE_WITH_OFFICIAL` nodes | n/a | PASS | blocker image |
| inspect fixed controls | localized Home/brochure/orb | shared UI keys; ChatScreen/ChatOrbControl | no/no/no | PASS after correction | automated + build |
| campus sample adapter | approved official blocker | `campusUnitFromLocale` and backend narration | no/no/no | PASS | automated contract test |
| reconnect/refresh/new visitor reset | canonical selected code or cleared visitor | K1 session suites | n/a | PASS | automated |
| department/HOD/fees/placements/achievements/admissions/leadership/trustees/multi-card | locale-backed Kannada and blockers where required | canonical unit/narration regression suites | no sentinel/raw dict | PASS | automated; individual screenshot capture not repeated |
| timeout/thank-you/session ending | exact fixed keys | shared UI contract goldens | no English fallback | PASS | automated |

Screenshots:

- `frontend/test-results/kannada-named-welcome.png`
- `frontend/test-results/kannada-approved-blocker.png`

## 12. Remaining risks

- Generated Kannada remains model-produced and therefore cannot be guaranteed grammatically perfect.
- The 469 canonical locale strings have audit evidence, but no native-human certification exists for the complete set.
- Official owners must resolve the six fee conflicts, 28 sample campus units, 11 missing HOD biographies and leadership identity/designation inconsistencies.
- The orphan locale remains physically present but is not imported; deletion should be a separate cleanup after ownership confirmation.
- Legacy unused components still contain English-only copy; they are classified unreachable and should not be reintroduced without localization.
- Live microphone/Sarvam pronunciation on kiosk hardware remains a hardware/provider acceptance gate.

## 13. Files changed by this remediation

Production additions/changes owned by this work:

- `backend/data/locales/ui.json`
- `backend/services/ui_localization.py`
- `backend/services/greetings.py`
- `backend/services/conversation/templates.py`
- `backend/services/answer_generation.py`
- `backend/services/content/content_unit_resolver.py`
- `backend/services/content/unit_narration.py`
- `backend/services/narration_plan.py`
- `backend/app/main.py` (Kannada-specific hunks layered over preserved K1/T1 work)
- `frontend/src/localization/uiCopy.ts`
- `frontend/src/localization/clipLocalizedText.ts`
- `frontend/src/context/LanguageContext.tsx` (Kannada authority overlay; K1 preserved)
- `frontend/src/hooks/useSpeechRecognition.ts`
- `frontend/src/App.tsx` (localized connectivity chrome; K1 preserved)
- `frontend/src/screens/ChatScreen.tsx` (fixed errors/typography/controls; K1 preserved)
- `frontend/src/screens/chat/ChatOrbControl.tsx`
- `frontend/src/components/VoiceConversation.tsx`
- `frontend/src/lib/collegeLocaleUtils.ts`
- `frontend/src/data/faqSuggestions.ts` (category metadata only; question text now comes from `backend/data/faq_answers.json`)
- `frontend/src/features/chat/presentation/planToScenes.ts`
- `frontend/src/components/chat/cards/CampusUnitCard/campusUnitLocale.ts`

Test/report changes:

- `backend/tests/test_kannada_complete_language_remediation.py`
- `backend/tests/test_m510_phase2c_campus_units.py`
- `backend/tests/test_m510_phase2d_kn.py`
- `backend/tests/test_m510_phase2d_universal.py`
- `frontend/src/localization/__tests__/kannadaUiCopy.test.ts`
- `frontend/src/components/chat/cards/CampusUnitCard/__tests__/campusUnitLocale.test.ts`
- `frontend/e2e/kannada-remediation.spec.ts`
- this report

Pre-existing K1/T1 and unrelated dirty files were preserved and are not claimed as remediation-owned changes.

## 14. Commit recommendation

Do not amend `450535f`. After reviewing the mixed dirty worktree and separating unrelated/K1/T1 ownership as needed, create a new commit for the remediation production files, tests and report. No commit or push was performed here.

```text
TOTAL KANNADA SOURCES: 55 production files / 622 fixed authoritative strings
TOTAL REACHABLE SURFACES: 624 fixed-or-generated source bindings
TOTAL CORRECTED STRINGS: 75 centralized fixed Kannada values
TOTAL UNCHANGED AFTER REVIEW: 547 canonical locale/FAQ strings (including preserved 37 V2 values)
TOTAL DUPLICATES REMOVED: 35 fixed-copy bindings
TOTAL ENGLISH FALLBACKS REMOVED: 31 fixed-state/action paths
TOTAL OFFICIAL-FACT BLOCKERS: 90 evidence rows
TOTAL MISSING-SOURCE BLOCKERS: 11 evidence rows
TOTAL GENERATED SURFACES: 2 (Runtime Generated – Constrained)
BACKEND TEST RESULT: PASS — 809 mandatory regression tests + 781 subtests; earlier full discovery reached 1158 passes
FRONTEND TEST RESULT: 174 Vitest unit tests passed; TypeScript and production build passed
BROWSER VERIFICATION RESULT: PASS — real application/FastAPI/Chromium, 1 spec passed, 2 screenshots
PRODUCTION FILES CHANGED: 20 remediation-owned files
TEST FILES ADDED: 3 (plus 4 existing tests strengthened)
COMMIT/PUSH: NOT PERFORMED
NATIVE-HUMAN CERTIFICATION: NOT CLAIMED
```
