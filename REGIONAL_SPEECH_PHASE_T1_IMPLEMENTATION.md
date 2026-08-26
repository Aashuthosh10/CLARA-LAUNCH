# CLARA Regional Speech Phase T1 Implementation

## Scope and outcome

Phase T1 establishes one explicit narration-text contract and one deterministic
sanitization boundary before text reaches a TTS provider. It does not change
provider selection, voice mapping, Unicode chunking, WAV reconstruction,
playback ownership, WebSocket ordering, retry policy, or cancellation behavior.

The production contract is represented by `NarrationTextContract`:

- `narration_text` (`narrationText`) is the narration selected by the existing
  presentation and narration pipeline.
- `sanitized_tts_text` (`sanitizedTtsText`) is the only text permitted at the
  provider boundary.

Display text is genuinely distinct but remains owned by `NarrationSegment` and
`PresentationBundle`; it is not falsely copied into the TTS-boundary contract.
`build_narration_text_contract()` is called by production at the shared boundary,
and `sanitize_tts_text()` remains the single shared deterministic sanitizer.

## Runtime boundary

The authoritative runtime boundary is `tts_to_base64_cached()` in
`backend/app/main.py`. Sanitization occurs after the existing CLARA pronunciation
normalization and before cache-key construction, cache lookup, logging preview,
or provider invocation. Consequently, the cache and provider observe the same
sanitized text. Production now constructs `NarrationTextContract` here and uses
its `sanitized_tts_text`; the contract is not test-only.

`sarvam_tts_to_base64()` reuses the same sanitizer defensively so direct callers
cannot bypass the contract. This is not a second sanitizer or a different policy.
Both the Sarvam HTTP request and its existing SDK fallback receive only the
sanitized value.

If sanitization produces an empty string, the runtime returns without consulting
the TTS cache or calling a provider. It emits a structured warning with the turn,
utterance kind, language, rejection reason, and source character count. It does
not log the rejected text, synthesize an English replacement, or alter existing
language-fallback behavior.

## Path trace

Static and localized cards flow from content units through unit narration and
`NarrationSegment(display_text, tts_text)`, then through the presentation bundle,
spoken summaries, and narration plan before reaching the shared boundary.
Model-generated answers, clarifications, greetings, errors, navigation responses,
and language prompts also converge on `tts_to_base64_cached()`. Multi-card order
is established upstream and is not reordered by sanitization. The ACK earcon is
generated audio rather than provider-bound text, so it is outside this contract.

No frontend or WebSocket payload schema was changed. Display text therefore
remains byte-for-byte under the ownership of the existing presentation path.

## Sanitization rules

The sanitizer deterministically:

- removes Markdown structure while retaining useful visible labels and prose;
- removes HTML tags and script/style blocks, and decodes nested HTML entities to
  a fixed point within eight passes;
- removes URLs, filesystem paths, internal unit identifiers, embedded metadata,
  raw JSON-like structures, translation labels, and structurally marked
  prompt/role artifacts;
- removes control characters and emoji while preserving permitted joiners;
- normalizes whitespace and excessive repeated punctuation;
- removes only consecutive duplicate sentences, preserving original order; and
- fails closed for non-string values and payloads that are entirely serialized
  objects or arrays.

The sanitizer is idempotent: sanitizing its output again yields the same output.
The bounded entity decoder returns only a stable fixed point. Entity nesting that
still changes after the eighth pass fails closed, preventing both infinite decode
and cross-invocation drift.

Prompt handling is deliberately structural rather than semantic. Anchored role
lines, `[INST]` blocks, `<<SYS>>` blocks, and `<|role|>` wrappers are removed.
Ordinary narration is not removed merely because it contains words such as
system, prompt, assistant, user, instruction, translate, or language. In
particular, both `The HOD said "system prompt" aloud.` and
`You are an AI receptionist for SVIT.` now pass through unchanged.

Representative transformations:

| Narration input | Provider text |
| --- | --- |
| `# Fees\n- Pay **₹45,000** now.` | `Fees Pay ₹45,000 now.` |
| `See [the portal](https://svit.example/fees).` | `See the portal.` |
| `CSE fees are ₹45,000. (unit_id=cse.fees)` | `CSE fees are ₹45,000.` |
| `Fees are ₹45,000. Fees are ₹45,000.` | `Fees are ₹45,000.` |
| `English translation: ಶುಲ್ಕ ₹45,000.` | `ಶುಲ್ಕ ₹45,000.` |
| `{"unitId":"cse.hod","text":"Dr. Rao"}` | empty; provider is not called |

## Unicode preservation

Clean English, Kannada, Hindi, Tamil, Telugu, and Malayalam narration is asserted
to pass through exactly. The tests include native department and HOD language,
person names, acronyms, dates, multiple sentences, numbers, and the rupee symbol.
Combining marks, vowel signs, virama sequences, and both ZWJ and ZWNJ are retained.
No replacement character or English substitute is introduced.

The exact script fixtures are:

| Script | Fixture |
| --- | --- |
| Kannada | `ಕ್‍ಷ ಕ್‌ಷ ಕಾ` |
| Hindi | `क्‍ष क्‌ष की` |
| Tamil | `க்‍ஷ க்‌ஷ கீ` |
| Telugu | `క్‍ష క్‌ష కీ` |
| Malayalam | `ക്‍ഷ ക്‌ഷ കീ` |

Each fixture contains a virama/halant sequence followed by U+200D, another
followed by U+200C, and a native vowel-sign combining sequence. Tests compare the
entire output string and its code-point tuple exactly and reject U+FFFD.

## Narration-plan integration coverage

The integration regression constructs real `NarrationSegment` objects, finalizes
them with `finalize_segment_list()`, builds a real `PresentationBundle`, obtains
its `spoken_summaries`, and passes those through `plan_response_tts()` and
`tts_to_base64_cached()`. Only `sarvam_tts_to_base64()`—the external provider
boundary—is mocked.

The regression verifies card/unit order, unchanged display captions, removal of a
consecutive duplicate sentence, sanitized provider arguments, and the actual
cache entries derived from sanitized text.

The rejected-text regression verifies that an empty sanitized result performs no
cache lookup and no provider call, does not attempt English fallback, and logs
only safe fields: turn ID, utterance kind, language, rejection reason, and source
character count. The rejected narration and a unique secret marker are asserted
absent from captured logs.

## Provider coverage

The repository contains an active Sarvam TTS request builder. Tests exercise its
real HTTP payload construction with only the network call mocked and verify that
only sanitized text is sent. They also verify that an empty sanitized value makes
no network call.

`edge-tts` is present as a dependency, but the audited production code has no Edge
TTS request builder or invocation path. No artificial Edge path or test double was
introduced because doing so would expand T1 into provider implementation work.

## Files changed

- `backend/services/tts_text_contract.py` — contract and shared sanitizer.
- `backend/app/main.py` — authoritative pre-cache/pre-provider boundary.
- `backend/clients/provider_clients.py` — defensive Sarvam boundary reuse.
- `backend/tests/test_tts_text_contract.py` — contract, safety, Unicode, and
  idempotence regressions.
- `backend/tests/test_tts_text_provider_boundary.py` — cache/provider, Sarvam,
  empty-input, and multi-card ordering regressions.
- `REGIONAL_SPEECH_PHASE_T1_IMPLEMENTATION.md` — this implementation report.

## Verification

The following commands were run from the repository root:

- `python -m pytest -q backend/tests/test_tts_text_contract.py backend/tests/test_tts_text_provider_boundary.py`
  — 80 passed.
- `python -m pytest -q backend/tests/test_tts_full_reply.py backend/tests/test_presentation_timeline.py backend/tests/test_presentation_bundle.py backend/tests/test_narration_segments_flow.py backend/tests/test_narration_plan.py backend/tests/test_m58_tts_orchestrator.py backend/tests/test_m57_complete_response_tts.py backend/tests/test_m53_tts_clip_slots.py backend/tests/test_m52_ws_narration_plan_propagation.py backend/tests/test_m510_phase2d_universal.py`
  — 63 passed and 583 subtests passed.
- `python -m pytest -q backend/tests/test_phase1_regional_card_regression.py`
  — 443 passed.
- `python -m pytest -q backend/tests/test_phase2b_fee_routing.py backend/tests/test_phase2b_fee_routing_orchestrator.py backend/tests/test_phase2b_inherited_department_presentation.py`
  — 65 passed.
- `python -m pytest -q backend/tests/test_provider_failure_paths.py backend/tests/test_low_latency_response.py backend/tests/test_auto_language_session.py backend/tests/test_conversation_orchestrator.py backend/tests/test_response_authority.py`
  — 32 passed.
- `python -m pytest -q backend/tests` — final confirmation: 1,132 passed and 927
  subtests passed.

Frontend tests were not required because T1 does not alter a frontend or shared
payload contract.

## Deferred work and remaining risks

Phase T1 intentionally leaves the audit's T2–T8 concerns unchanged: provider and
voice mapping, Unicode-aware chunking, WAV reconstruction, playback ownership,
WebSocket sequencing, retry policy, cancellation, and the absent Edge runtime
path. Sanitization is deliberately conservative, but future narration formats may
introduce new metadata shapes or safe symbols that require reviewed fixtures.
Provider pronunciation quality remains provider- and voice-dependent even when
the input text is safe and Unicode-preserving.
