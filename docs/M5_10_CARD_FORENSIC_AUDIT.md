# M5.10 — Card Forensic Audit (Phase 1)

**Date:** 2026-08-21  
**Repository:** `Naveenkumar2027/clara_finished-` (remote: `clara_finished`)  
**Local HEAD at audit:** `53a0d5a2f4030cf4193c2b229f4b926f4c0a421d`  
**Rule:** No production code modified in this phase. Source tree inspected directly.

**Frozen architecture (do not redesign):** M5.8 `responseTtsScheduler`, `AckPlayer`, turn fencing, ordered playback (`frontend/src/lib/tts/responseTtsScheduler.ts`, `ackAudio.ts`).

---

## Executive summary

CLARA has **61 registered content units** (M5.0–M5.9), a working **UnitSelector → PresentationPlan → narration_plan → M5.8 TTS** pipeline, and **six-locale department card bodies** in `backend/data/locales/*.json`.

**Missing vs M5.10 target inventory:** hostel, canteen, events (Sanchalana, TechVidya, Siri Kannada Utsava, etc.) — **no registry units, no surfaces, no frontend cards** (by current design they route to ANSWER/RAG).

**Highest-impact defects for M5.10:**

1. `cse_bs` registered but **no factory map** → falls back to CSE skin (`DepartmentCardFactory.tsx:38`)
2. **Trustees UI English-only** while backend narration is localized (`Trustees.tsx`)
3. **`role_holders.hod_by_department` missing** in kn/hi/ta/te/ml → HOD names/titles English-fallback in regional sessions
4. Unit-backed **`{dept}.placements`** UI loads **college-wide** placement deck, not dept unit content (`ChatScreen.tsx`)
5. **No hostel / canteen / events** units — required by M5.10 spec but absent from registry

---

## Architecture map (verified in source)

```
USER INPUT
  → parse_semantic_request (semantic_request_parser.py)
  → resolve_response_decision (response_decision.py) — CARD / ANSWER / CLARIFY / FALLBACK
  → select_content_units (unit_selector.py) — sole unitId authority
  → content_unit_resolver (content_unit_resolver.py)
  → surface_narration_mapper + unit_narration (tts_text)
  → PresentationBundle / narration_plan
  → WebSocket: showCard + narration_plan + language_code_key
  → ChatScreen + PresentationEngine
  → responseTtsScheduler (M5.8) → Sarvam → ordered playback
```

Card narration enters **only** via `tts_text` on narration segments; M5.8 scheduler owns playback. No card component calls `audio.play()` for response TTS.

---

## A. Which cards currently exist?

### Registered units (61) — `content_unit_registry.py`

| Family | Count | Pattern |
|--------|-------|---------|
| Department decks | 55 | `{dept}.{overview\|hod\|achievements\|placements\|fees}` × 11 depts |
| Leadership | 3 | `leadership.principal`, `leadership.vice_principal`, `leadership.trustees` |
| Context-scoped | 3 | `fees.overview`, `documents.overview`, `admission.documents_required` |

**Departments** (`DEPARTMENT_JSON_KEY_ORDER`): `cse`, `ise`, `cse_aiml`, `cse_ds`, `cse_cysec`, `cse_bs`, `ece`, `civil`, `mechanical`, `mba`, `basic_sciences`

**Section → suffix** (`narration_plan.py` / registry): `intro→overview`, `hod_voice→hod`, `achievements`, `placement→placements`, `fees`

### Visual surfaces (frontend)

| Surface | Component |
|---------|-----------|
| Department overview (5-slot deck) | `DepartmentCardFactory` + per-dept `*Card.tsx` |
| HOD portrait | `LeadershipOverview` → `PremiumHODCard` |
| Principal / VP | `PremiumPrincipalCard`, `PremiumVicePrincipalCard` |
| Trustees slideshow | `Trustees/Trustees.tsx` |
| Department fees | `DepartmentFeesCard.tsx` |
| Documents | `DocumentsBlock.tsx` |
| College placements (legacy) | `buildPlacementCardsFromLocale` |
| Comparison / bus / course menu | Separate surfaces (not unit-backed deck) |

### Explicitly NOT cards today

Hostel, canteen, campus, events, faculty, clubs → ANSWER/RAG (`leadership_units.py:8`, `test_m59_universal_units.py`).

---

## B. Where is each card implemented?

| Layer | Key files |
|-------|-----------|
| Registry | `backend/services/content/content_unit_registry.py` |
| Selection | `backend/services/content/unit_selector.py` |
| Resolution | `backend/services/content/content_unit_resolver.py` |
| Narration | `backend/services/content/unit_narration.py`, `surface_narration_mapper.py` |
| Localization gate | `backend/services/orchestration/card_localization.py` |
| WS emit | `backend/app/main.py`, `presentation_bundle.py` |
| Render | `frontend/src/screens/ChatScreen.tsx`, `frontend/src/components/chat/cards/**` |
| Presentation FSM | `frontend/src/features/chat/presentation/PresentationEngine.ts` |
| TTS playback | `frontend/src/lib/tts/responseTtsScheduler.ts` |

---

## C. Backend unit per card

All 61 IDs in registry. Examples:

- `cse_ds.hod`, `cse_ds.overview`, `cse_ds.fees`
- `leadership.principal`, `leadership.trustees`
- `fees.overview` (global, not topic-selectable via UnitSelector)

---

## D. Frontend component per card

| Unit pattern | Renderer |
|--------------|----------|
| `{dept}.overview` etc. | `DepartmentCardFactory` |
| `{dept}.hod` | `LeadershipOverview` + `PremiumHODCard` |
| `{dept}.fees` | `DepartmentFeesCard` |
| `leadership.principal` | `PremiumPrincipalCard` |
| `leadership.trustees` | `Trustees` |

**Factory map** (`DepartmentCardFactory.tsx:15-29`): CSE, AIML, DS, CyberSec, ISE, ECE, Civil, Mechanical, MBA, Math, Physics, Chemistry, Basic Sciences→Physics fallback.

**Missing:** `CSE (Business Systems)` / `cse_bs` — unmapped → **CSECard fallback** (line 38).

---

## E. Trigger per card

| Path | Source |
|------|--------|
| Natural language | `semantic_request_parser.py` + `semantic_vocab/catalog.py` |
| CARD mode | `resolve_response_decision` → `UnitSelector` |
| `showCard` on WS | `surface_selector.py` → `ChatScreen` |
| Menu / `localIntent` | UI deterministic commands |

Rule: `ChatScreen` consumes `showCard` + `narration_plan.unitIds`; does not infer cards from text alone (M5.4+).

---

## F. Languages with localized CARD CONTENT

**Locale files:** `backend/data/locales/{en,kn,hi,ta,te,ml}.json`

| Content | All 6 langs? |
|---------|--------------|
| Dept section bodies (55 sections × 11 depts) | **Yes** — verified structure |
| Principal / VP UI copy | **Yes** — `executiveLeadershipLocale.ts` |
| Principal / VP narration | **Yes** — `unit_narration.py`, `narration_plan.py` |
| HOD narration templates | **Yes** (dept label localized) |
| Fees card chrome | **Yes** — `DepartmentFeesCard.tsx` |
| Per-dept card headers | **Yes** — hardcoded per `*Card.tsx` |
| Trustees visible bios | **No** — English static array |

---

## G. Labels only (not full body)

| Item | Issue |
|------|-------|
| Trustees UI | English names/descriptions/`tts_summary` |
| HOD official names (regional) | `role_holders.hod_by_department` empty in kn/hi/ta/te/ml |
| Legacy Math/Physics/Chemistry HOD | English-only `LeadershipOverview` fallbacks |

---

## H. Languages with no localization

Among the six supported codes, **no department deck is entirely unlocalized**. Unsupported codes fall back to English (`narration_plan.py` `_effective_lang`).

---

## I. English fallback usage

| Case | Mechanism |
|------|-----------|
| Unknown factory dept | `COMPONENT_MAP[departmentId] \|\| CSECard` |
| `cse_bs` | Unmapped → CSE skin |
| Regional HOD names | Resolver loads `en.json` role_holders when missing |
| Trustees | Static English in `Trustees.tsx` |
| Orchestrator degrade | English segments + no translator → drop card (`card_localization.py`) |

---

## J. Incorrectly grouped sets

| Issue | Detail |
|-------|--------|
| Full-dept scope | One overview intent → **5 atomic units** (`unit_selector.py` full_department) — intentional but not user-ordered subset |
| `{dept}.placements` unit | UI shows **college-wide** placement slides, not dept unit |
| Legacy `showCard=placements` | Same college-wide path |
| `basic_sciences` | One backend dept; frontend Math/Physics/Chemistry legacy keys orphaned |

---

## K. Cards with narration

All resolved units → `map_content_units_to_segments` → `narrate_unit()` → `tts_text`. M5.8 plays clip sequence by segment index. ACK isolated via `AckPlayer`.

---

## L. Narration ≠ visible card

| Case | Visible | Spoken |
|------|---------|--------|
| `{dept}.placements` | College-wide slides | Dept-specific unit body |
| Trustees | English long bios | Localized name-list sentence |
| HOD (regional) | Localized body | English name if role_holders missing |
| By design | Full `display_text` | Shorter intent `tts_text` |

---

## M. Wrong identity / shared data

- `cse_bs` → CSE template
- `basic_sciences` → Physics template
- Placements UI identity swap (see L)
- `fees.overview` vs `{dept}.fees` — same fee source, different surfaces

---

## N. Independent selection

**Yes (M5.9):** N semantic items → N units, no hidden cap.

**Not independent:** full-dept atomic 5-pack; global `fees.overview` / `documents.overview` not in topic map; hostel/canteen/events (no units).

---

## O. Switching failures

- PresentationEngine order guard on out-of-order unit jumps
- Sticky CARD stages if turn boundary not cleared
- `cse_bs` wrong template in mixed decks
- M5.5 recovery added `resetTurnPresentationState` — mitigates stale cards; browser re-validation needed

---

## P. Regional-language failures

| Failure | Cause |
|---------|-------|
| HOD English names in KN/HI/TA/TE/ML | Missing `role_holders.hod_by_department` in regional locales |
| Trustees English UI | Hardcoded `Trustees.tsx` |
| Fail-closed localization | English segment detected → presentation dropped |

**Passing:** M5.9 tests — unit resolution in all 6 langs for HOD/fees/placements queries.

---

## M5.10 gap analysis vs required inventory

| Required | Status |
|----------|--------|
| 11 departments × 5 topics | **Registered**; visual gap `cse_bs` |
| Principal / VP / Trustees | **Units exist**; trustees UI not localized |
| Hostel (girls/boys + subtopics) | **Missing** |
| Canteen | **Missing** |
| Events (Sanchalana, TechVidya, Siri Kannada Utsava + 3–4 more) | **Missing** |
| Multilingual card content | **Dept bodies OK**; trustees + regional HOD names gap |
| Smart card narration | **Partial** — `unit_narration.py` intent sentences; placements/trustees mismatches |
| Person context | **Partial** — anaphora for departments; no scoped person entity for HOD follow-ups |
| M5.8 TTS integration | **Stable** — do not duplicate |

---

## Recommended implementation order (Phases 2–14)

1. **Phase 2:** Canonical unit registry doc + `cse_bs` factory fix  
2. **Phase 3:** Eliminate placements UI / unit identity mismatch  
3. **Phase 4:** Add hostel / canteen / events units (SAMPLE-tagged content)  
4. **Phase 5:** Centralize trustees + HOD `role_holders` in locales (6 langs)  
5. **Phase 6–8:** Multilingual triggers + narration grounded in visible card  
6. **Phase 9:** Scoped person context for HOD/principal follow-ups  
7. **Phase 10:** Verify narration → M5.8 only (no new player)  
8. **Phase 11–13:** Multi-card transition tests + E2E six-language matrix  
9. **Phase 14:** Commit / push / verify remote HEAD per milestone  

---

## Audit answers A–P (quick reference)

| Q | Answer |
|---|--------|
| A | 61 units + legacy surfaces; no hostel/canteen/events |
| B | Registry/resolver/mapper backend; ChatScreen/cards frontend |
| C | `{dept}.{suffix}`, `leadership.*`, context units |
| D | Factory, LeadershipOverview, Premium*, Trustees, Fees |
| E | Parser + UnitSelector + showCard + menu |
| F | 6-lang dept bodies; exec copy; fee chrome |
| G | Trustees bios; regional HOD names |
| H | None fully absent for dept content |
| I | cse_bs, trustees, role_holders fallback |
| J | Full-dept 5-pack; placements grouping |
| K | All resolved units narrated |
| L | Placements, trustees, display vs tts_text |
| M | cse_bs, basic_sciences, placements |
| N | Per-topic yes; full-dept atomic |
| O | Engine order guard; sticky UI |
| P | role_holders; English trustees |

**Phase 1 status:** COMPLETE — awaiting approval before Phase 2 production changes.
