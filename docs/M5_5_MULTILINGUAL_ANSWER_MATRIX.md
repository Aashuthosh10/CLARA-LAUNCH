# M5.5 multilingual non-card ANSWER matrix

**Date:** 2026-08-19  
**Principle:** CLARA is one six-language receptionist, not English plus five translated modes.  
**Git HEAD at start of this phase:** `0cc81fc628b59e757b5044e61f0ca165f8762a1a`

This report does **not** claim “non-card questions work” from five English samples.

## What “PASS” means in the grid

Each category × language cell is **PASS** only when deterministic tests proved:

1. Semantic intent is treated as institutional (not off-domain).
2. Mode is **ANSWER**, not CARD / CLARIFY / FALLBACK.
3. Native script, romanized, English code-switch, informal, short, and conversational forms were included for that language.

Live Groq generation and live Sarvam TTS were **not** run for this matrix. Those are called out in the TTS row and in the limitations section. Do not read a PASS cell as “the kiosk already spoke a perfect Kannada answer.”

Golden tests: `backend/tests/test_m55_multilingual_answer.py`  
Backend pytest after this phase: **431 passed**.

## Matrix

| Category | EN | KN | HI | TA | TE | ML |
|----------|----|----|----|----|----|----|
| Faculty | PASS | PASS | PASS | PASS | PASS | PASS |
| Campus life | PASS | PASS | PASS | PASS | PASS | PASS |
| Facilities | PASS | PASS | PASS | PASS | PASS | PASS |
| Student experience | PASS | PASS | PASS | PASS | PASS | PASS |
| Internships | PASS | PASS | PASS | PASS | PASS | PASS |
| Placements | PASS | PASS | PASS | PASS | PASS | PASS |
| Academics | PASS | PASS | PASS | PASS | PASS | PASS |
| College environment | PASS | PASS | PASS | PASS | PASS | PASS |
| General institutional | PASS | PASS | PASS | PASS | PASS | PASS |
| Follow-up/anaphora | PASS | PASS | PASS | PASS | PASS | PASS |
| Code-switching | PASS | PASS | PASS | PASS | PASS | PASS |
| TTS | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED |

### Evidence (routing)

- 9 categories × 6 languages × 6 forms (A native / B romanized / C code-switch / D informal / E short / F conversational) assert `ResponseMode.ANSWER`.
- Native-script faculty questions with **no Latin letters** are `DomainRelevance.INSTITUTION` (the old Latin-only lexicon would have missed them).
- `"Datascience teachers hegiddare?"` is ANSWER, not a Data Science overview card.
- College-wide `"How are placements?"` is ANSWER, not “which department?”.
- Anaphora cues exist in all six languages (`its` / `ಅದರ` / `उसका` / `அதன்` / `దాని` / `അതിന്റെ`).
- Native script on an ANSWER turn selects that language for reply + TTS **even if the kiosk session is still English**. Romanized input keeps the session language (script cannot tell Kannada romanization from English).

### Evidence (RAG)

Live probe against the current vector store (439 documents), faculty question in each language, bilingual embed (`original + English gloss`):

| Lang | Context returned | Native-language chunks? | Preview |
|------|------------------|-------------------------|---------|
| EN | 1398 chars | English corpus | ISE `hod_voice` — faculty/workshops |
| KN | 1398 chars | **No** — same English chunk | same |
| HI | 876 chars | English + optional `hi` rows | same family of English faculty text |
| TA | 648 chars | **No** | same English faculty text |
| TE | 648 chars | **No** | same English faculty text |
| ML | 648 chars | **No** | same English faculty text |

**Architectural limitation (not hidden):** the pgvector store is English-canonical. Hindi may augment. Kannada, Tamil, Telugu, and Malayalam have locale JSON (`backend/data/locales/{kn,ta,te,ml}.json`) but **no dedicated vector language rows**. Retrieval still returns relevant English evidence via the multilingual embedding. Native-language grounding for ANSWER is the compact locale slice (`institution_overview` + `placements_and_training`), not a pretend kn/ta/te/ml index.

We did **not** make “translate every query to English and drop the original” the retrieval strategy. `build_retrieval_query` keeps the visitor’s words.

### Evidence (TTS)

Wired, not live-proven:

- `en-IN`, `kn-IN`, `hi-IN`, `ta-IN`, `te-IN`, `ml-IN` are the only TTS codes.
- ANSWER uses `resolve_answer_language` → Sarvam → existing WebSocket audio path.
- Auto-detect now runs **before** orchestration so first-turn native script is not parsed as English.

**TTS row stays NOT TESTED** until each language completes: final answer text → Sarvam → audio bytes → WebSocket → frontend AudioManager → `play()`.

## Architecture (language-agnostic where possible)

```
CURRENT QUESTION
  → parse + multilingual institution cues (one matcher, six-language vocab)
  → semantic proposal (optional; skipped in pytest)
  → ResponseDecision (CARD | ANSWER | CLARIFY | FALLBACK)
  → ANSWER language (script vs session — separate from semantic intent)
  → retrieval query = original + English gloss
  → English (and hi) chunks + locale evidence in the reply language
  → generate in the reply language (no English-then-translate)
  → 2–4 sentence budget in every language
  → TTS in the same reply language
```

Semantic language (what they mean) is not coupled to answer language (what CLARA speaks).

### What changed

| Concern | Before | After |
|---------|--------|--------|
| Institution relevance | Latin-only lexicon; native script → UNKNOWN → CLARIFY | Shared `cue_in_hay` over six-language campus vocabulary |
| Department inside a quality question | `"Datascience teachers hegiddare?"` → overview CARD | Overview-only parse without “tell me about” → ANSWER |
| College-wide placements | Topic cue → CLARIFY / placements card | ANSWER |
| Answer model input | English translation | Original visitor text |
| Post-generation | Translate English reply into session language | Skipped for ANSWER |
| RAG query | English only | Original + English gloss |
| RAG empty fallback | Entire locale JSON | Compact institution + placements slice |
| Length | Space-split English words | 2–4 sentences; Indic uses character budget |
| First-turn language | Auto-detect after orch | Auto-detect before orch |
| Context into Groq | Last 3 turns including prior assistant speech | ANSWER: current question + one prior user question |

No `if Kannada:` routing. No change to `RAG_MODEL`. UnitSelector / PresentationEngine / WS contract untouched.

## Honest non-acceptance

Full product acceptance still requires a live pass of:

**6 languages × major categories × ANSWER routing × relevant retrieval × short natural spoken answer × correct output language × TTS play.**

This phase proves the **semantic and language architecture** for that acceptance. It does not replace the live voice loop.

Romanized language ID remains session-owned. `"teachers hegiddare?"` with an English kiosk session still answers in English unless the visitor selected Kannada (or typed Kannada script).
