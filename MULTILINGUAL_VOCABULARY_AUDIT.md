# MULTILINGUAL_VOCABULARY_AUDIT.md

Read-only audit of multilingual department/topic vocabulary coverage in the CLARA repository.
Scope: six supported languages — English (`en`), Kannada (`kn`), Hindi (`hi`), Tamil (`ta`), Telugu (`te`), Malayalam (`ml`). No seventh language assumed.
No production code, tests, configuration, locale files, or documentation were modified; this report is the only artifact created.

---

## 1. Supported-language confirmation

Confirmed from actual source, not assumptions:

| Source | Evidence |
|---|---|
| Backend semantic vocab | `backend/services/content/semantic_vocab/types.py:18` — languages `* | en | kn | hi | ta | te | ml` |
| Backend language detection | `backend/core/language_detection.py:9-16` (`LANGUAGE_KEY_TO_NAME`), `:48-54` (script ranges Devanagari 0x0900–0x097F, Kannada 0x0C80–0x0CFF, Tamil 0x0B80–0x0BFF, Telugu 0x0C00–0x0C7F, Malayalam 0x0D00–0x0D7F) |
| Content unit registry | `backend/services/content/content_unit_registry.py:63` — default `supported_languages=("en","hi","kn","ta","te","ml")` |
| Frontend language context | `frontend/src/context/LanguageContext.tsx:3` — `English | Kannada | Hindi | Tamil | Telugu | Malayalam` |
| Localization freeze | `frontend/src/runtime/localizationFreeze.ts:12-19` — `{English:'en', Kannada:'kn', Hindi:'hi', Tamil:'ta', Telugu:'te', Malayalam:'ml'}` |

**Critical architecture note:** the frontend build consumes `backend/data/locales/*.json` via the Vite alias `'@college-locales'` (`frontend/vite.config.ts:13`, `frontend/src/hooks/useCollegeData.ts:10-15`). The copies under `frontend/src/data/locales/` are **orphaned legacy files** whose content has drifted from the backend originals (e.g., kn cse display name differs; fee figures differ). All coverage analysis below uses the authoritative `backend/data/locales/`.

---

## 2. Canonical department inventory

Canonical IDs come from `DEPARTMENT_JSON_KEY_ORDER` (`backend/services/answer_generation.py:38-50`; mirrored at `frontend/src/lib/collegeLocaleUtils.ts:6-18`) and are registered per-department in `content_unit_registry.py` with unit IDs `{dept}.{overview|hod|achievements|placements|fees}`:

```
cse, ise, cse_aiml, cse_ds, cse_cysec, cse_bs, ece, civil, mechanical, mba, basic_sciences   (11 departments)
```

Registered card topics per department (`_SECTION_TO_UNIT_SUFFIX`, content_unit_registry.py:35–41; section list in narration_plan.py:722): `intro→overview`, `hod_voice→hod`, `achievements`, `placement→placements`, `fees`. Faculty/contact/location are **not** registered cards.

**Phantom departments:** legacy synonyms for `Mathematics`, `Physics`, `Chemistry` exist (`answer_generation.py:808-810`, frontend `LeadershipOverview.tsx:140-142`) but have no entry in `_CANONICAL_DEPARTMENT_TO_JSON_KEY` (53–65) or the unit registry — they can be detected but never resolve to a deck. They are excluded from the matrix below.

---

## 3. Department coverage matrix

Legend: ✅ Fully covered · 🟡 Partially covered · ◻ Display only · ❌ Missing · ⚠ Ambiguous.
"Display name" = authoritative localized name in `backend/data/locales/<lang>.json` (`departments.*.name`, kn refs shown). "Semantic aliases" = `semantic_vocab/catalog.py` DEPARTMENT entries (lines noted).

### 3.1 `cse`

| Lang | Display name | Native alias | English alias | Acronym | Transliterated | Deterministic parse? |
|---|---|---|---|---|---|---|
| en | Computer Science & Engineering | — | computer science, computer science engineering | cse ✅ | — | ✅ all parsers |
| hi | कंप्यूटर विज्ञान एवं इंजीनियरिंग | — | via injection सूचना… no | सीएसई ✅ (catalog:142), सी एस ई (143); legacy injection सीएसई/सी एस ई (answer_generation.py:1957-1958) | कंप्यूटर साइंस (display only) | ✅ acronym path |
| kn | ಕಂಪ್ಯೂಟರ್ ವಿಜ್ಞಾನ ಮತ್ತು ಎಂಜಿನಿಯರಿಂಗ್ (kn.json:152) | — | — | ಸಿಎಸ್ಇ / ಸಿಎಸ್‌ಇ / ಸಿಎಸ್ ಇ ✅ (catalog:139-141; legacy 1919-1921) | — | ✅ |
| ta | கணினி அறிவியல் & பொறியியல் | — | — | ❌ no Tamil CSE acronym alias | — | ⚠ display name alone not matched |
| te | కంప్యూటర్ సైన్స్ & ఇంజనీరింగ్ | — | — | ❌ | — | ⚠ same gap |
| ml | കമ്പ്യൂട്ടർ സയൻസ് & എഞ്ചിനീയറിംഗ് | — | — | ❌ | — | ⚠ same gap |

Status: en/hi/kn Fully covered; ta/te/ml Partially covered (display + generic English words only). Collision risk: low ("cse" distinctive).

### 3.2 `ise`

All languages: display names localized (e.g., kn ಮಾಹಿತಿ ವಿಜ್ಞಾನ, kn.json:192). Native-script alias exists only as legacy Kannada/Tamil/Hindi injection tokens: ಮಾಹಿತಿ ವಿಜ್ಞಾನ→information science (1924), தகவல் அறிவியல் (1932), सूचना विज्ञान (1955). Acronym `ise` ✅ en only (catalog:145).
- kn/ta/hi: 🟡 Partially covered (via injection → ise). te/ml: ❌ Missing native/acronym aliases — a fully Telugu/Malayalam ISE query fails deterministic parsing.
- Collision risk ⚠: `"ise"` is a common English suffix (e.g., "rise", "otherwise") — safe only because Latin matching is word-boundary based (`_contains_phrase` answer_generation.py:1289-1299; `cue_in_hay` semantic_topics.py:26-34).

### 3.3 `cse_aiml`

- en: ✅ (aiml, ai ml, artificial intelligence, machine learning — catalog:120-126; note "machine learning"/"artificial intelligence" exist only in legacy `DEPARTMENT_SYNONYMS`:769-778, not catalog).
- kn: ✅ strong — ಎ ಎಂ ಎಲ್ variants, ಎಎಂಎಲ್ (legacy 1911-1915).
- hi: ✅ एआईएमएल / ए आई एम एल (1944-1945). ta/te/ml: ✅ transliterated script acronyms (1928, 1934, 1939).
- Missing: native terms ("ಕೃತಕ ಬುದ್ಧಿಮತ್ತೆ" etc.) everywhere; catalog lacks the standalone "machine learning" alias.
- Collision risk low.

### 3.4 `cse_ds`

- en: ✅ rich incl. misspellings daascince/datascince/datscience/dtascience (779-788, 1605-1612) but bare `"ds"` appears ONLY in legacy extract_features (1612) and DEPARTMENT_KEYWORDS (2086) — ⚠ high collision: raw-substring `"ds" in n` matches inside "heads".
- kn: ✅ ಡೇಟಾ ಸೈನ್ಸ್ (1917). hi: ✅ डेटा साइंस/डाटा साइंस (1946-1947). ta: ✅ டேட்டா சயின்ஸ் (1929). te: ✅ డేటా సైన్స్ (1935). ml: ✅ ഡാറ്റാ സയൻസ് (1940).
- Native terms missing (e.g., ಮಾಹಿತಿ ವಿಜ್ಞಾನ-style equivalents like ta தரவு அறிவியல் appear in display names only). Status: Fully covered via transliteration; Partially covered natively.

### 3.5 `cse_cysec`

- en: ✅ cyber security/cybersecurity (catalog:127-130); bare `"cyber"` only in extract_features:1623/comparison map:848 — ⚠ would capture "cyber cafe".
- Script: kn ಸೈಬರ್ ಸೆಕ್ಯುರಿಟಿ ✅ (1922); ta சைபர் செக்யூரிட்டி ✅ (1930); te సైబర్ సెక్యూరిటీ ✅ (1936); ml സൈബർ സെക്യൂരിട്ടി ✅ (1941); hi साइबर सुरक्षा / साइबर सिक्योरिटी ✅ (1948-1949).
- Status: Fully covered (transliterated). Display names use native terms (kn ಸೈಬರ್ ಭದ್ರತೆ, ta சைபர் பாதுகாப்பு, hi साइबर सुरक्षा, ml സൈബർ സുരക്ഷ) that are NOT parseable aliases — mismatch between what's displayed and what matches.

### 3.6 `cse_bs`

- en: ✅ business systems (catalog:131-133). Legacy adds "cs business" (800).
- Script: kn ಬಿಸಿನೆಸ್ ಸಿಸ್ಟಮ್ಸ್ ✅ (1923); hi बिजनेस सिस्टम्स / बिज़नेस सिस्टम्स ✅ (1950-1951). **ta/te/ml: ❌ Missing entirely** — no injection pattern, no catalog entry. A Tamil "CSE பிஸினஸ் சிஸ்டம்ஸ்" query cannot resolve deterministically.
- Display names in ta/te/ml are native (வணிக அமைப்புகள் etc.), never matchable. Status: kn/hi Fully covered; ta/te/ml Display only.

### 3.7 `ece`

- en: ✅ ece, electronics (catalog:146-147, risk=medium flagged in catalog itself); "electronics and communication" variants legacy-only (803).
- Script: kn ಇಸಿಇ/ಎಲೆಕ್ಟ್ರಾನಿಕ್ಸ್ ✅ (1925-1926); ta எலக்ட்ரானிக்ஸ் ✅ (1933); te ఎలక్ట్రానిక్స్ ✅ (1937); ml ഇലക്ട്രോണിക്സ് ✅ (1942); hi इलेक्ट्रॉनिक्स ✅ (1956).
- ⚠ High collision: legacy `DEPARTMENT_KEYWORDS` maps bare `"ec"` → ECE with raw substring matching (`if key in n`, 2144-2148) — matches inside "because", "receive". Worst single collision in the codebase.
- Status: Fully covered; fix `ec`.

### 3.8 `civil`

- en: ✅ civil/civil engineering (catalog:148, 804). Script: kn ಸಿವಿಲ್ ✅ (1927), hi सिविल ✅ (1957). **ta/te/ml: ❌ Missing** (no script aliases anywhere). Native display terms (சிவில் பொறியியல் etc.) unmatched. Status: en/kn/hi covered; ta/te/ml Display only. Low collision.

### 3.9 `mechanical`

Same shape as civil: en ✅ mech/mechanical (catalog:149, 805); kn ಮೆಕ್ಯಾನಿಕಲ್ ✅ (1927), hi मैकेनिकल ✅ (1958); **ta/te/ml ❌** (native displays இயந்திர பொறியியல், మెకానికల్, മെക്കാനിക്കൽ unmatched). Status mirrors civil.

### 3.10 `mba`

- en: ✅ mba/business administration (catalog:150); `"management"` alias (legacy 806, locale role_holders aliases) ⚠ collides with trustees keyword `"management"` (1134) — ambiguous routing.
- **Script: ❌ Missing in ALL five non-en languages** — no ಎಂಬಿಎ / एमबीए / எம்பிஏ / ఎంబీఏ / എംബിഎ aliases exist anywhere (only the Kannada menu label 'ಎಂ.ಬಿ.ಎ' in LanguageContext.tsx:318-325, which is display-only). Status: en Fully covered; all regional languages Display only.

### 3.11 `basic_sciences`

- en: ✅ basic sciences/science departments (catalog:151, 807). Script: ❌ none in any language. Display names native (kn ಮೂಲ ವಿಜ್ಞಾನಗಳು kn.json:232, ta அடிப்படை அறிவியல், te ప్రాథమిక శాస్త్రాలు, ml അടിസ്ഥాന ശാസ്ത്രങ്ങൾ, hi बुनियादी विज्ञान) — none parseable. Status: en covered; all others Display only.

### Department summary

| Department | en | kn | hi | ta | te | ml |
|---|---|---|---|---|---|---|
| cse | ✅ | ✅ | ✅ | 🟡 | 🟡 | 🟡 |
| ise | ✅ | 🟡 | 🟡 | 🟡 | ❌ | ❌ |
| cse_aiml | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| cse_ds | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| cse_cysec | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| cse_bs | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| ece | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| civil | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| mechanical | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| mba | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| basic_sciences | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

Pattern: coverage was built Kannada-first (M5.x work); ta/te/ml rely on whatever injection regexes happen to exist; MBA/basic_sciences have zero regional recognition.

---

## 4. Topic coverage matrix

Topics audited: the five registered card topics only. Sources: `semantic_vocab/catalog.py` topic entries, legacy keyword lists in `answer_generation.py`, `multilingual_terms.py`, locale files.

### overview
| Lang | Native term | Aliases present | Parses deterministically | Depends on English |
|---|---|---|---|---|
| en | overview | "overview", "over view" (61-62); 22 OVERVIEW_KEYWORDS_EN phrases (553-576) | ✅ | — |
| kn | ಅವಲೋಕನ (63) | romanized cues bagge/baare/helu/heli/tilisi (95-101, OVERVIEW_FULL_DEPARTMENT_CUES 37-73) | ✅ via cues, ❌ native term works (substring) | partly |
| hi | अवलोकन (64) | baare/batao/bataye/bolo | ✅ | partly |
| ta | கண்ணோட்டம் (65) | pattri/pathi/patti/sollu/solunga/parayu | ✅ | partly |
| te | అవలోకనం (66) | gurunchi/gurinchi/kurichu/cheppu/cheppandi | ✅ | partly |
| ml | അവലോകനം (67) | kurich/parayoo/vivaram | ✅ | partly |

Legacy vs semantic agreement: both recognize romanized cues; legacy additionally fires only on entity+cue co-occurrence (1881-1890). Note mislabels: `"tilisi"` tagged tamil_tell but is Kannada (catalog:101); `"kurichu"` tagged telugu vs Malayalam-flavored elsewhere; `"entha"` Telugu in fees (29) vs Malayalam filler in legacy (1476).

### hod
| Lang | Native term | Aliases | Parses | Notes |
|---|---|---|---|---|
| en | hod | hod, hods, head of department, head of… (41-45; HOD_PROFILE_KEYWORDS 1100-1120) | ✅ | — |
| kn | ಮುಖ್ಯಸ್ಥರು (46) | ಮುಖ್ಯಸ್ಥ, ವಿಭಾಗದ ಮುಖ್ಯಸ್ಥರು + STT variants ಹೋಡ್, ಹೆಡ್, ಹೆಚ್ಒಡಿ, ಹೆಚ್ಓಡಿ, ವಿಭಾಗದ ಹೆಡ್ (50-54); who-words yaaru/yaar | ✅ best-in-class | ⚠ ಹೆಡ್ short Indic substring risk |
| hi | — ❌ no native term | kaun (57) only | ⚠ partial — "HOD kaun hai" works only via English "HOD"+kaun | heavy |
| ta | — ❌ | yaar | ⚠ same | heavy |
| te | — ❌ | evaru | ⚠ same | heavy |
| ml | — ❌ | aaranu | ⚠ same | heavy |

hi/ta/te/ml HOD detection depends entirely on the English acronym "HOD" plus a who-word. A fully native phrase (e.g., "துறைத் தலைவர் யார்") fails. Who-words yaaru/kaun/evaru also sit inside FEE_QUERY_KEYWORDS (723-725) — saved only by HOD-first precedence.

### fees
| Lang | Native term | Aliases | Parses | Notes |
|---|---|---|---|---|
| en | fees | fees, fee, tuition, fee structure, cost, price (20-23; FEE_QUERY_KEYWORDS 689-747; FEES_KEYWORDS 749-766; ASR regex `\bf(?:e|i){1,2}s\b` 1820) | ✅ | richest set |
| kn | ಶುಲ್ಕ (32) | ಶುಲ್ಕಗಳು, ಫೀಸ್; romanized estu/eshtu/yestu/bele/kaasu/duddu/feesu | ✅ | — |
| hi | फीस (35) | शुल्क, shulk(a/galu), kitna, paise | ✅ | — |
| ta | கட்டணம் (37) | kattanam, evlo, entha(dup 711/721), ethra | ✅ | — |
| te | ఫీజు (38) | phiju, dabbu, karchu, entha | ✅ | — |
| ml | ഫീസ് (39) | ethra, evlo | ✅ | ⚠ entha cross-language conflict ta/te/ml |

Legacy and semantic parsers agree well here (fees is the most mature topic).

### placements
| Lang | Native term | Aliases | Parses | Depends on English |
|---|---|---|---|---|
| en | placements | placement(s), job, hiring, package, salary, ctc, internship, recruiter, tnp, … (1855-1877) | ✅ | — |
| kn | ಪ್ಲೇಸ್‌ಮೆಂಟ್ ZWJ (71) + no-ZWJ form (72), ಉದ್ಯೋಗಾವಕಾಶ (73) | — | ✅ (both spellings enumerated) | partially |
| hi | प्लेसमेंट (74) | — | ✅ | yes |
| ta | பிளேஸ்மென்ட் (75), வேலைவாய்ப்பு (76) | — | ✅ | partially |
| te | ప్లేస్‌మెంట్ (77) | — | ✅ | yes |
| ml | പ്ലേസ്‌മെന്റ് (78)/(79) | — | ✅ | yes |

⚠ **Legacy has ZERO non-Latin placement keywords** — `_is_placements_query` (1855-1877) is English-only. Semantic parser covers scripts; legacy does not. Any legacy-path placement query in a regional language fails unless translation pipeline supplies English. Also: `"salary"` appears in both comparison cues (943) and placement phrases (1866) — comparison wins; `"t&p"` only in the third vocabulary `conversation/semantic_normalize.py:28-34`.

### achievements
| Lang | Native term | Aliases | Parses | Notes |
|---|---|---|---|---|
| en | achievements | achievement(s), ranking(s) (81-84); ACHIEVEMENT_CUES multilingual_terms.py:19-31 English-only | ✅ | — |
| kn | ಸಾಧನ (85) | canonical copy ಸಾಧನೆಗಳು (kannada_terms.py:17) — stem mismatch between cue and copy | ✅ (stem substring) | ⚠ |
| hi | उपलब्धि (86) | — | ✅ | — |
| ta | சாதனை (87) | — | ✅ | — |
| te | సాధన (88) | — | ✅ | ⚠ సాధన means "means/instrument" — common word; Indic substring matching ⇒ false positives |
| ml | നേട്ടം (89) | — | ✅ | — |

⚠ Achievements has **no legacy feature at all** (confirmed by comment multilingual_terms.py:17-18). It exists only in the semantic stack — legacy/semantic authority divergence is total for this topic.

### Topic summary

| Topic | en | kn | hi | ta | te | ml |
|---|---|---|---|---|---|---|
| overview | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| hod | ✅ | ✅ | 🟡 | 🟡 | 🟡 | 🟡 |
| fees | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| placements | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (semantic only) |
| achievements | ✅ | 🟡 | ✅ | ✅ | ⚠ ambiguous | ✅ |

---

## 5. Parser-authority comparison

Four parsing authorities coexist:

| # | Component | Location | Departments | Topics | Normalization | Matching |
|---|---|---|---|---|---|---|
| 1 | Legacy entity parser | `backend/services/answer_generation.py` (DEPARTMENT_SYNONYMS 768-811; extract_features dept_aliases 1604-1636; DEPARTMENT_KEYWORDS 2086-2104) | 11 (+phantom math/physics/chemistry) | overview, hod, fees, placements (NO achievements) | lowercase, whitespace collapse, token map, punctuation strip — **no Unicode NFC/NFKC** | mixed: `\b` word-boundary regex for ASCII (1289-1299), padded substring (1656), fuzzy SequenceMatcher>0.7 (1486-1497), **raw substring `key in n`** (2144-2148) |
| 2 | Semantic vocabulary + request parser | `semantic_vocab/catalog.py` + `semantic_request_parser.py` + `semantic_composition.py` + `semantic_topics.py` | 11 (subset of aliases) | all 5 topics + scopes + UNSUPPORTED | casefold_keep_scripts (unicode_text.py:31-33) + regional-token injection reuse | longest-span exclusive department matching (department_identity.py:80-111), word-boundary Latin / substring Indic, fail-closed clarify on ambiguity |
| 3 | Department identity matcher | `department_identity.py` + `department_resolver.py` | merged table sorted len-desc, exclusive spans | none | normalize_for_department_match (19-21) | priority: json-key 0.99 → label 0.95 → loose fallback 0.8 |
| 4 | Third parallel vocab | `conversation/semantic_normalize.py` (FOOD/PLACEMENTS/FEES/ADMISSIONS/BUS/DOCUMENTS/LOCATION regexes) | none | partial topics | own regexes | own precedence |

**Findings:**
- **Duplicate responsibilities:** #1 and #2 both detect departments and {overview, hod, fees, placements}; #4 re-implements placements/fees/bus/documents again. Alias sets disagree (four divergent department tables — see §3 line refs).
- **Vocabulary in only one parser:** "machine learning"/"artificial intelligence" (#1 only); bare "ds"/"aml"/"cyber" (#1 only); ALL script-level department aliases for ta/te/ml (#1 injection only — catalog has none beyond cse kn/hi); achievements entirely (#2 only); "t&p", food/location intents (#4 only).
- **Conflicting canonical mappings:** Mathematics/Physics/Chemistry detectable in #1 and frontend `toDepartmentKey` but unregistered in #2/#3; "management" maps to MBA in dept tables but is also a trustees keyword; "entha"/"kurichu"/"tilisi" carry conflicting language tags across files.
- **Different normalization:** #1 lowercases without Unicode normalization; #2 casefolds keeping combining marks; neither applies NFC/NFKC — ZWJ/ZWNJ handled only by enumerating both spellings (placements kn 71-72; cse kn 139-141); frontend bus-route matcher is the only NFKD user (busRoutesMatch.ts:7-9); frontend `resolver.ts:20-23` strips all non-ASCII outright.
- **Different matching precedence:** #1 fixed intent ladder HOD→documents→bus→comparison→dept-fees→course-menu→dept-overview→admissions→placements→college-overview (2158-2183), role before department (2120-2148); #2 fail-closed positional binding with explicit clarify (semantic_composition.py:123-219); #4 its own ladder.
- **Cross-language risk:** neither parser filters vocabulary by session language — every language's aliases are scanned always (deliberate for code-switching, but enables cross-language false positives like te సాధన or ml/ta entha).
- **Recommended single canonical authority:** the semantic stack (#2 with #3's identity matcher). It is the only fail-closed, span-exclusive, positionally-binding component, and it already owns achievements and script-level topic vocabulary. Legacy (#1) should delegate to it; #4 should be retired into it.

---

## 6. Alias-collision findings

Ranked by severity:

1. **`"ds"` → CSE (Data Science)** via raw substring (`DEPARTMENT_KEYWORDS:2086`, matched `key in n`:2145) — matches "heads", "records", "students". Highest risk.
2. **`"ec"` → ECE**, same raw substring path — matches "because", "receive", "second".
3. **`"cyber"` → CSE (Cyber Security)** (extract_features:1623, comparison map:848) — captures unrelated "cyber cafe"-type phrases.
4. **te సాధన (achievements)** — ordinary Telugu word; Indic aliases match as substrings by design (`cue_in_hay:33`, `_boundaries_ok:107-109`), so false positives in any Telugu sentence are likely.
5. **Who-word leakage into fees**: yaaru/kaun/evaru inside FEE_QUERY_KEYWORDS (723-725); "hod yaaru" queries reach the fees detector, saved only by precedence order.
6. **`"head"`/ಹೆಡ್ short forms** — English "head" is common; ಹೆಡ್ can embed in longer Kannada compounds.
7. **`"management"`** dual mapping (MBA vs trustees, 1134).
8. **Cross-language alias conflicts:** entha (fees ta vs filler ml), kurichu (te vs ml), tilisi (tagged tamil, actually kannada).
9. **`"science department(s)"` → basic_sciences** (807) — a query about "data science department" could partially overlap; mitigated today by longest-first sorting, fragile otherwise.
10. **Frontend substring chains** (`menuLabelToJsonKey` collegeLocaleUtils.ts:139-169, `toDepartmentKey` LeadershipOverview.tsx:125-163) — `.includes()` ordering-dependent; `resolver.ts` discards Indic input entirely.

---

## 7. Missing-alias inventory (actionable gaps)

**Departments**
- MBA: native-script acronyms for all 5 regional languages (ಎಂಬಿಎ, एमबीए, எம்பிஏ, ఎంబీఏ, എംബിഎ) + romanized "embeea"-class STT variants.
- basic_sciences: native aliases in all 6 non-en locales.
- cse_bs: ta/te/ml script aliases.
- civil/mechanical: ta/te/ml script aliases (சிவில்/மெக்கானிக்கல் class).
- ise: te/ml script aliases (ఐఎస్ఈ, ഐഎസ്‌ഇ) + Tamil already has தகவல் அறிவியல️ injection — add to catalog.
- cse: ta/te/ml script acronym aliases (சிஎஸ்இ class) — currently only display names.
- Resolve phantom math/physics/chemistry (register or remove).

**Topics**
- hod: native terms for hi/ta/te/ml (e.g., प्रमुख/विभागाध्यक्ष, துறைத் தலைவர், అధిపతి/విభాగాధిపతి, മേധാവി/വകുപ്പധ്യക്ഷൻ) — *linguistic correctness unverified; needs native-speaker confirmation*.
- placements: add script keywords to the LEGACY list (or retire the legacy path) so both authorities agree.
- achievements: reconcile ಸಾಧನ stem vs ಸಾಧನೆಗಳು canonical copy; reconsider te సాధన (too ambiguous — prefer సాధనలు/విజయాలు, unverified).
- fees: deduplicate entha (711/721) and disambiguate its language tag.

**Data hygiene**
- Delete or sync orphaned `frontend/src/data/locales/*` (drifted duplicates).
- Localize `departmentComparison.json` display_names (currently English for all non-en).
- Reconcile LanguageContext menu labels that remain untranslated for ta/te/ml (e.g., 'CSE (AI & ML)' LanguageContext.tsx:262-268).

---

## 8. Realistic utterance corpus

Preference was given to phrases already present in repo fixtures/e2e specs (sources cited). Phrases marked **[UNVERIFIED]** are constructed from existing vocabulary/display names but their naturalness/native phrasing has not been confirmed by a native speaker; they are still composed strictly from strings that exist in this repository.

### Kannada (kn)
- Overview: `ಕಂಪ್ಯೂಟರ್ ವಿಜ್ಞಾನ ವಿಭಾಗದ ಬಗ್ಗೆ ತಿಳಿಸಿ` [UNVERIFIED] (bagge-family cue)
- HOD: `CSE Data Science HOD yaaru?` ✅ (m53-hod-identity.spec.ts:139); fully native: `ಡೇಟಾ ಸೈನ್ಸ್ ವಿಭಾಗದ ಮುಖ್ಯಸ್ಥರು ಯಾರು?` [UNVERIFIED]
- Fees: `ಡೇಟಾ ಸೈನ್ಸ್ ಶುಲ್ಕ ಎಷ್ಟು?` [UNVERIFIED] (uses ಶುಲ್ಕ, catalog:32)
- Placements: `ಡೇಟಾ ಸೈನ್ಸ್ ಪ್ಲೇಸ್‌ಮೆಂಟ್` ✅ (mixedUnitSlides.test.ts:78)
- Achievements: `ಸಿಎಸ್ಇ ಸಾಧನೆಗಳು` [UNVERIFIED]
- Two-topic: `AIML mattu Data Science HOD yaaru?` ✅ (spec:152)
- Three-topic: `AIML, Data Science mattu CSE HOD yaaru?` ✅ (spec:161)
- English acronym in regional sentence: `ಸಿಎಸ್ಇ ವಿಭಾಗದ ಬಗ್ಗೆ ಹೇಳಿ` [UNVERIFIED] (ಸಿಎಸ್ಇ = catalog:139)
- HOD word embedded: `CSE ವಿಭಾಗದ ಹೆಡ್ ಯಾರು?` [UNVERIFIED] (ವಿಭಾಗದ ಹೆಡ್ = catalog:54)
- Fully native: `ಮಾಹಿತಿ ವಿಜ್ಞಾನ ವಿಭಾಗದ ಅವಲೋಕನ ತೋರಿಸಿ` [UNVERIFIED]
- Mixed: `AIML ವಿಭಾಗದ fees eshtu?` [UNVERIFIED]

### Hindi (hi)
- Overview: `कंप्यूटर विज्ञान विभाग के बारे में बताओ` [UNVERIFIED]
- HOD: `CSE Data Science ka HOD kaun hai?` ✅ (spec:201)
- Fees: `सीएसई की फीस कितनी है?` [UNVERIFIED] (फीस catalog:35)
- Placements: `सीएसई की प्लेसमेंट जानकारी दो` [UNVERIFIED]
- Achievements: `सीएसई की उपलब्धियाँ बताओ` [UNVERIFIED]
- Two-topic: `AIML aur Data Science ke HOD kaun hain?` ✅ (spec:202)
- Three-topic: `AIML, Data Science aur CSE ke HOD kaun hain?` ✅ (spec:203)
- Acronym: `इलेक्ट्रॉनिक्स विभाग ECE hai kya?` [UNVERIFIED]
- HOD embedded: `ECE ka HOD kaun hai?` ✅ pattern (spec family)
- Fully native: `सूचना विज्ञान विभाग का अवलोकन दो` [UNVERIFIED]
- Mixed: `मैकेनिकल की fees kitna hai?` [UNVERIFIED]

### Tamil (ta)
- Overview: `கணினி அறிவியல் துறையைப் பற்றி சொல்லுங்கள்` [UNVERIFIED]
- HOD: `CSE Data Science HOD yaar?` ✅ (spec:208)
- Fees: `சிஎஸ்இ கட்டணம் எவ்வளவு?` [UNVERIFIED] (கட்டணம் catalog:37)
- Placements: `சிஎஸ்இ பிளேஸ்மென்ட்` [UNVERIFIED]
- Achievements: `சிஎஸ்இ சாதனை` [UNVERIFIED]
- Two/three-topic: `AIML, Data Science rendu... HOD yaar?` — see spec:209-210 patterns (`AIML, Data Science irandukum HOD yaar?` style) ✅ pattern
- Acronym: `டேட்டா சயின்ஸ் துறை எங்கே உள்ளது` [UNVERIFIED] — note: location intent, expect UNSUPPORTED/no-card
- Fully native: `தகவல் அறிவியல் துறையின் கண்ணோட்டம்` [UNVERIFIED]
- Mixed: `ECE fees entha alavu?` [UNVERIFIED]

### Telugu (te)
- Overview: `కంప్యూటర్ సైన్స్ విభాగం గురించి చెప్పండి` [UNVERIFIED]
- HOD: `CSE Data Science HOD evaru?` ✅ (spec:215)
- Fees: `సిఎస్ఇ ఫీజు ఎంత?` [UNVERIFIED]
- Placements: `సిఎస్ఇ ప్లేస్‌మెంట్` [UNVERIFIED]
- Achievements: `సిఎస్ఇ సాధనలు` [UNVERIFIED — ⚠ సాధన ambiguity, see §6.4]
- Two/three-topic: spec:216-217 patterns ✅
- Fully native: `సమాచార శాస్త్రం విభాగం అవలోకనం` [UNVERIFIED]
- Mixed: `Mechanical fees dabbu entha?` [UNVERIFIED]

### Malayalam (ml)
- Overview: `കമ്പ്യൂട്ടർ സയൻസ് വകുപ്പിനെക്കുറിച്ച് പറയൂ` [UNVERIFIED]
- HOD: `CSE Data Science HOD aaranu?` ✅ (spec:222)
- Fees: `സിഎസ്ഇ ഫീസ് എത്ര?` [UNVERIFIED]
- Placements: `സിഎസ്ഇ പ്ലേസ്‌മെന്റ്` [UNVERIFIED]
- Achievements: `സിഎസ്ഇ നേട്ടം` [UNVERIFIED]
- Two/three-topic: spec:223-224 patterns ✅
- Fully native: `ഇൻഫർമേഷൻ സയൻസ് വകുപ്പിന്റെ അവലോകനം` [UNVERIFIED]
- Mixed: `MBA feethu ethra?` [UNVERIFIED — expected to FAIL parsing today, see §7 MBA gap]

Every [UNVERIFIED] phrase should be validated by native speakers during Phase 1 baseline recording; all vocabulary tokens used are traceable to catalog/locale strings listed above.

---

## 9. Recommended canonical matching policy (recommendation only — not implemented)

1. **Single canonical authority:** migrate department + topic detection to the semantic stack (`semantic_vocab/catalog.py` consumed through `department_identity.py` + `semantic_composition.py`); reduce legacy `answer_generation.py` to a delegating shim; absorb/retire `conversation/semantic_normalize.py`.
2. **Language-prioritized matching:** filter/prioritize `VocabEntry.language` against the session language — selected-language aliases rank first; do NOT hard-restrict, so mixed-language requests keep working.
3. **Safe universal tier:** regardless of selected language, always allow (a) ASCII English acronyms ≥2 chars that are proven collision-free (CSE, ISE, ECE, MBA, AIML, HOD, TNP), matched with strict word boundaries, and (b) established English technical terms (data science, cyber security, placements). Exclude the known-colliding short forms (`ds`, `ec`, bare `cyber`) from the universal tier.
4. **Longest valid match first, spans exclusive:** retain `match_department_spans_exclusive` semantics globally (longest-span, occupied-range consumption) so "cse ds" never leaks "cse"; extend the same discipline to topic spans.
5. **Word boundaries for Latin AND romanized Indic; boundary-aware matching for Indic scripts** — replace pure Indic substring matching with a check that the match is not embedded in a longer word (e.g., verify surrounding characters are spaces/boundary-class), eliminating the సాధన/ಹೆಡ್ class of false positives without requiring full tokenizers.
6. **Unicode NFC normalization at ingestion** for both input haystacks and alias tables (plus explicit ZWJ/ZWNJ-stripped secondary forms) instead of enumerating spelling pairs.
7. **Reject rather than guess:** preserve the fail-closed contract — ambiguous or N≠M entity/topic bindings produce an explicit clarification, never a silent pick.
8. **One alias table, one language tag:** every alias gets exactly one verified language tag; conflicting tags (entha, kurichu, tilisi) resolved once, centrally.

---

## 10. Recommended Phase 2 implementation order

1. **Collision removal** (low risk, high value): delete `ds`/`ec`/bare-`cyber` from legacy substring paths or gate them behind exact-token matching.
2. **Unify normalization:** apply NFC + casefold_keep_scripts consistently in both stacks; strip ZWJ/ZWNJ into canonical comparison forms.
3. **Consolidate authority:** make legacy department/topic detection delegate to the semantic parser (keeping the existing intent ladder only where it encodes product behavior like HOD-before-fees).
4. **Fill the highest-value alias gaps:** MBA native acronyms (all 5 languages), cse_bs/civil/mechanical ta-te-ml, hod native terms hi/ta/te/ml (after native verification).
5. **Language-prioritized matching + universal English-acronym tier** per §9.
6. **Retire the third vocabulary** (`conversation/semantic_normalize.py`) and orphaned frontend locale copies.
7. **Regression-gate everything** against the Phase 1 baseline corpus (§8) before each step.

---

## 11. Risks and unresolved linguistic questions

- **Native-term correctness:** proposed hod/achievements native terms (§7) and all [UNVERIFIED] utterances require native-speaker validation; machine-derived phrasing must not ship unverified.
- **సాధన (te) ambiguity:** may be unusable as an achievements cue even with boundary checks; needs a replacement term decision.
- **Romanized Indic variance:** STT produces highly variable romanizations (eshtu/yestu, yaaru/yaar/aaru); the boundary policy for Latin text must tolerate these enumerated forms without opening substring holes.
- **ZWJ/ZWNJ:** until NFC-based folding lands, any unlisted combining-mark spelling silently fails — enumerate-and-pray is the current de facto policy.
- **Mixed-language regression risk:** tightening matching (language prioritization) can break code-switched queries that fixtures already cover (faqSuggestions.ts:457-460 "computer labs" mixing); Phase 2 changes need those cases in the baseline.
- **Precedence-encoded product behavior:** the legacy ladder (role-before-department, HOD-before-fees, comparison-over-placements via "salary") encodes deliberate UX decisions; consolidation must preserve observable behavior or the Phase 1 baseline will flag intentional differences.
- **Orphaned data drift:** frontend/src/data/locales divergence suggests other stale copies may exist; a full duplicate sweep is advisable before further vocabulary edits.
