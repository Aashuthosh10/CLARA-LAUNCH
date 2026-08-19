# M5.5 implementation report

**Date:** 2026-08-19  
**Git HEAD at start:** `0cc81fc628b59e757b5044e61f0ca165f8762a1a`  
**Status:** semantic-understanding proposal is wired. Production answer-generation `RAG_MODEL` was not changed.

## What landed

GPT-OSS 120B may **propose** a `SemanticProposal`. `validate_semantic_proposal` fail-closes. `resolve_response_decision` remains the only `ResponseDecision` writer. `select_content_units` remains the only `unitId` writer.

```
parse_semantic_request
  → maybe_propose_semantics (flagged, skipped on atomic CARD parse)
  → validate_semantic_proposal
  → resolve_response_decision
  → existing M5.4 route_policy / presentation / RAG
```

## Policy

- Institutional, no card → **ANSWER** (lexicon, or validated `domain=institution` on a lexicon miss).
- Structured HOD/fees/overview units → **CARD** (LLM skipped when parse already bound atomic topics).
- Bare HOD/fees → **CLARIFY**.
- Off-domain / external college compare → **FALLBACK** only. LLM `FALLBACK` cannot override “How good are the teachers here?”.
- LLM failure / pytest / missing client → today’s deterministic decision. Never FALLBACK-because-Groq-is-down.

## Config (only semantic-router keys)

```
SEMANTIC_ROUTER_ENABLED=true
SEMANTIC_ROUTER_MODEL=openai/gpt-oss-120b
SEMANTIC_ROUTER_TIMEOUT_S=6.0
```

`RAG_MODEL` is still `llama-3.1-8b-instant`. ANSWER turns can still speak the admission-office **UNAVAILABLE** sentence until that id is a live Groq catalog entry. That is not `ResponseMode.FALLBACK`.

## Anaphora

Last CARD `ResponseDecision.entities` are stored as `session["last_semantic_entities"]` and passed into `parse_semantic_request` as `department_keys`. `has_anaphora` still gates carry-over. A new explicit entity wins.

## Tests

- Backend pytest: **431 passed**, 0 failed (includes `test_m54_*`, `test_m55_*`, and `test_m55_multilingual_answer.py`).
- No live Groq in pytest (`PYTEST_CURRENT_TEST` skip after fast-path reasons).
- Frontend `tsc`: pre-existing error in `mixedUnitSlides.test.ts` (`CollegeLocaleData` not exported). Not introduced by this phase.

## Six-language ANSWER (this phase)

Non-card ANSWER is no longer English-first. Routing, retrieval query construction, answer-language ownership, and length budget cover English, Kannada, Hindi, Tamil, Telugu, and Malayalam (native, romanized, code-switch).

Live spoken path (Groq + Sarvam + play) is **not** claimed complete. See `docs/M5_5_MULTILINGUAL_ANSWER_MATRIX.md`.

## Protected

UnitSelector, PresentationEngine, TTS, WebSocket, frontend inference, admission-office copy, and the M5.5 benchmark harness were not rewritten.
