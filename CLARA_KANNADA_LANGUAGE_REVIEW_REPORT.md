# CLARA Kannada Language Review — Report

Date: 2026-08-26
Scope: Review artifact only. No production files modified; nothing committed or pushed.

## 1. Source files used

- `backend/data/locales/en.json` (authoritative English locale)
- `backend/data/locales/kn.json` (authoritative Kannada locale)

Both files were validated as parseable JSON and were **not** modified (byte-for-byte unchanged; confirmed via `git status --short`, which shows no changes under `backend/data/locales/`).

## 2. Total extracted strings

- **388** translatable/displayable string rows extracted from the English tree and paired with the Kannada tree at identical JSON paths.
- Breakdown by content group:

| Group | Rows |
|---|---|
| Institution Overview | 17 |
| Leadership | 26 |
| Role Holders / Trustees / HOD | 86 |
| Admissions & Fees | 43 |
| Departments | 66 |
| Placements & Training | 10 |
| Campus Units (Sample) | 140 |

Status breakdown: AI Checked 15 · Needs Native Review 227 · Do Not Translate 51 · Blocked – Missing Source 11 · Blocked – Official Fact 84.

## 3. Missing Kannada strings

11 rows: every `role_holders.hod_by_department.<dept>.hod_bio` (cse, cse_aiml, cse_ds, ise, ece, civil, mechanical, mba, mathematics, physics, chemistry). The Kannada file replaces these with `hod_bio_source` pointers to `departments.<dept>.hod_voice`, so no direct Kannada bio text exists.

## 4. Placeholder count

84 rows contain `SAMPLE_REPLACE_WITH_OFFICIAL` — all 28 `campus_units` entries (title/body/tts_summary/points). Marked **Blocked – Official Fact**.

## 5. Raw dictionary count

2 strings are Python-dict-literals stored as plain strings:
- `institution_overview.affiliations_and_accreditations` (both EN and KN)
- `admissions_and_fees.fee_structures.ug_management` and `pg_mba` (both EN and KN)

## 6. English fallbacks

3 Kannada values are untranslated English:
- `role_holders.hod_by_department.mathematics.department_name` ("Mathematics")
- `role_holders.hod_by_department.physics.department_name` ("Physics")
- `role_holders.hod_by_department.chemistry.department_name` ("Chemistry")

Additionally, all 11 `hod_name` values remain in English script (treated as protected identity facts, not errors).

## 7. Terminology conflicts (see Glossary sheet)

- ಕಂಪ್ಯೂಟರ್ **ವಿಜ್ಞಾನ** vs ಕಂಪ್ಯೂಟರ್ **ಸೈನ್ಸ್** for Computer Science
- ಪ್ರಾಧ್ಯಾಪಕರು vs ಪ್ರೊಫೆಸರ್ for Professor
- ಮ್ಯಾನೇಜ್‌ಮೆಂಟ್ ಕೋಟಾ vs ನಿರ್ವಹಣೆ for Management (quota)
- KEA vs ಕೆಇಎ and NBA vs ಎನ್‌ಬಿಎ (mixed-script abbreviations)
- ಪ್ಲೇಸ್‌ಮೆಂಟ್ vs ನಿಯೋಜನೆ for Placements
- ಅರ್ಹತೆ vs ಯೋಗ್ಯತೇ for Eligibility/Qualification overlap

No variant has been declared "official" — candidates only, pending human approval.

## 8. Factual blockers (16 recorded on Blockers sheet)

Highest-risk five:
1. **CSE/AIML fee conflict**: department cards say ₹3,50,000/year management; admissions table says ₹3,25,000.
2. **Data Science fee conflict**: ₹2,50,000 (card) vs ₹3,00,000 (admissions).
3. **ECE fee conflict**: ₹2,00,000 (card) vs ₹2,50,000 (admissions).
4. **Civil/Mechanical KCET-vs-Management inversion**: cards quote a KCET fee while other departments say KCET follows KEA norms.
5. **All 28 campus_units entries are sample placeholders** (`SAMPLE_REPLACE_WITH_OFFICIAL`) — hostel/canteen/event facts unconfirmed.

Also recorded: empty Kannada trustee designations (padma_reddy, shanmukha), `hod_bio` vs `hod_bio_source` structural mismatch, duplicated leadership Dean/trustee entries, Principal name spelling mismatch (`TN` vs `T N`), localization_gaps vs existing cysec/bs/basic_sciences cards, duplicated entrance-exam list items, redundant "Founder/Chancellor:" prefix inside name field.

## 9. Display/narration conflicts

Linked via `Canonical Unit`. Noted: several narration lines contain pipe characters (`|`) inherited from display fee lines (TTS-unsafe); flagged in Issue Types. Trustee `description` vs `tts_summary` are identical (safe). Campus-unit tts_summaries restate body content consistently but rest on placeholder facts.

## 10. Recommended review order

1. Welcome / language selection *(note: not present in locale JSON — verify frontend strings separately)*
2. Clarifications and errors *(generated in backend code, not locale JSON)*
3. CSE → 4. AIML → 5. Other departments → 6. Admissions & fees → 7. Placements → 8. Campus facilities → 9. Session-ending/fallback → 10. Narration templates

## 11–12. Artifacts

- Workbook: `CLARA_KANNADA_LANGUAGE_REVIEW.xlsx` (4 sheets: Kannada Review, Kannada Glossary, Blockers, Summary; frozen header, filters, wrap text, status dropdown, status color coding)
- CSV: `CLARA_KANNADA_LANGUAGE_REVIEW.csv` (UTF-8 with BOM; same 16 columns and 388 rows as the review sheet)

## 13. Production-file confirmation

No production file, test, config, frontend or backend file was changed by this task, and the locale JSON files were not rewritten. The three artifacts above are new untracked files. Pre-existing working-tree modifications listed by `git status --short` (e.g., `backend/app/main.py`, `frontend/src/App.tsx`, etc.) existed before this task began and were untouched.

## Verification performed

- Both JSON files parse successfully (unchanged on disk).
- XLSX reopened programmatically: 388 data rows = CSV 388 data rows.
- No duplicate `JSON Key + Context` pairs.
- No U+FFFD in any Kannada cell.
- All Status cells restricted to allowed dropdown values; no row marked `Approved`.
