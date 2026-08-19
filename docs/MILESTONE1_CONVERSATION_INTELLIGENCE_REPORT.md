# Milestone 1 — Conversation Intelligence Layer
## Implementation Report

### Changed files

| File | Reason |
|------|--------|
| `backend/config/settings.py` | `INTENT_CONFIDENCE_THRESHOLD`, `CONVERSATION_INTEL_DEBUG` |
| `backend/services/conversation/__init__.py` | Package exports |
| `backend/services/conversation/types.py` | Shared dataclasses / policy actions |
| `backend/services/conversation/transcript_validator.py` | Transcript quality gates |
| `backend/services/conversation/entity_extractor.py` | Rule-first entities (+ optional Groq) |
| `backend/services/conversation/semantic_normalize.py` | Synonym → topic map |
| `backend/services/conversation/intent_confidence.py` | Confidence wrap over existing features |
| `backend/services/conversation/policy_router.py` | Answer / retry / unknown / entity routing |
| `backend/services/conversation/templates.py` | Multilingual short-circuit replies |
| `backend/services/conversation/answer_length.py` | Non-card length governor |
| `backend/services/conversation/logging_util.py` | DEV-gated `CONV_INTEL` logs |
| `backend/services/conversation/pipeline.py` | `run_conversation_intelligence` entry |
| `backend/app/main.py` | Early wire + `_emit_direct_conversation_reply` + length governor |
| `backend/tests/test_conversation_intelligence.py` | Unit / pipeline tests |

### Not changed (regression)

PresentationEngine / Controller / AudioManager, ChatScreen, Response Layout, greeting/wake/language flows, WS schema, narration_plan builders, card UI, FAQ, Orb.

### Verification

```text
python -m pytest backend/tests/test_conversation_intelligence.py \
  backend/tests/test_golden_query_matrix.py \
  backend/tests/test_intent_pipeline.py -q
```

Result: **37 passed, 62 subtests passed**.

Covered behaviours:
- `"My name is Naveen"` → stores `Naveen`, `ENTITY_UPDATE`
- Noise / `uh` → `NO_SPEECH_RETRY`
- Canteen / environment → `UNKNOWN` (no department force)
- `"Tell me about CSE"` → `CARD_PRESENTATION` passthrough
- Length governor truncates normal; presentation kind unchanged
- `localIntent` forces passthrough even on noisy text

### Regression risks

- False `NO_SPEECH_RETRY` on very short but valid utterances (e.g. bare “fees” may be low confidence → unknown/clarify rather than fees card). Prefer fuller phrasing or card clicks via `localIntent`.
- Over-eager `UNKNOWN` on unsupported semantic topics that share wording with valid campus queries (mitigated by checking unsupported topics before card passthrough only when topic map hits FOOD/ENVIRONMENT).
- Optional Groq entity extraction adds latency only when rules are ambiguous and transcript confidence ≥ 0.5.

### Remaining work (Milestone 2)

- Conversation lifecycle integrity (single lifecycle authority)
- Language-gate / reload identity hardening
- Presentation Planner / Scene Generator (intelligent per-card narration)
- Narration plan call-site robustness in `main.py`
- Ownership validation matrix across FE callbacks
