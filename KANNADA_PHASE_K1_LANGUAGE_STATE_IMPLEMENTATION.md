# Kannada Phase K1 — Language Selection State & Visitor Session Lifecycle

Status: **Implemented (K1 only)** — no K2/K3/T2 work included. Not committed.

## 1. Executive summary

K1 establishes one authoritative canonical language code (`en|kn|hi|ta|te|ml`) per
active visitor session, on both frontend and backend:

- CLARA boots to sleep; tap wakes it and shows a **visual-only** welcome/language
  gate (six options, native labels). **No English audio plays before selection.**
- Selecting ಕನ್ನಡ stores `kn` as the visitor-session authority, persists it in
  **session-scoped** browser storage bound to a visitor-session identity, and
  registers it with the backend session.
- `kn` survives WebSocket reconnects and accidental page refresh; it is cleared
  deterministically on End Session / Back to Sleep / idle timeout / explicit reset,
  so the next visitor never inherits it.
- Explicit selection overrides auto-detection for output; detection can never
  silently replace an explicit pick.

## 2. Previous language authorities

| Layer | Field | Problem |
|---|---|---|
| Frontend | `LanguageContext.language: 'English'\|'Kannada'\|…` (display-name union) | Default `'English'` silently meant "selected English"; nothing persisted (refresh lost selection) |
| Frontend | `language_selected {language:'Kannada'}` payload | Display name on the wire, not canonical code |
| Backend | per-socket `session["language_code_key"]` (main.py WS handler) | Died with the socket — reconnect/refresh produced a fresh session with no language |
| Backend | `set_session_language` coerced invalid values to `"en"` | Invalid input silently became "English selected" |
| Reset | Back-to-sleep only did `setManualState(0)` | Preserved kn across kiosk visitors (defective) |

## 3. New canonical authority

- **Frontend:** `LanguageContext.selectedCode: LanguageCode | null`
  (`frontend/src/session/languageCodes.ts` defines `en/kn/hi/ta/te/ml`,
  `LANGUAGE_SELECTION_OPTIONS`, strict `parseLanguageCode`). `null` means
  *language not selected* — never silently English. UI chrome derives its display
  language from the code. All network payloads carry the code
  (`language_code_key`); provider locales stay at the TTS boundary.
- **Backend:** `session["language_code_key"]` remains the single backend field,
  now written **only** through strict validation
  (`normalize_application_language` / `set_session_language` in
  `backend/services/session_language.py`). `kn-IN`, display names and junk fail
  closed instead of coercing to `en`. Existing API conventions kept: invalid
  `language_selected` gets the same silent ack as before; valid-but-frozen picks
  get `{"error":"language_frozen"}`.

## 4. Visitor-session identity

`frontend/src/session/visitorSession.ts`:

- `beginVisitorSession()` creates `clara_visitor_id` (crypto UUID) at wake; sent
  to the backend with `wake`, `language_selected`, `restore_language` and
  `conversation_started`.
- The backend binds it at `wake` (`session["visitor_session_id"]`) and requires
  an exact match for `restore_language`.

## 5. Storage strategy

`window.sessionStorage` keys: `clara_visitor_id`, `clara_visitor_language`,
`clara_visitor_welcome_done`. Survives accidental refresh and React remounts;
cleared deterministically by `endVisitorSession()` (invoked from
`resetToDefaultLanguage()` inside the existing hard-reset transaction). Stored
values are canonical codes only; anything else fails safe to "not selected".

## 6. Welcome timing

- Pre-selection: `conversation_started` returns text-only visual welcome
  (`isSpeaking:false`, no `audioBase64`, no `languagePromptAudioBase64`). The
  spoken English nudge request path was removed from ChatScreen; the six-option
  overlay is the instruction. Audio accessibility pre-selection is a deferred
  product decision.
- After selecting Kannada: unchanged approved flow (localized name prompt /
  greeting via existing locale content).
- Duplicate-welcome prevention: SleepScreen one-shot wake ref (existing);
  ChatScreen `languagePickInFlightRef` + gate-satisfied guard (double tap);
  outbound dispatcher singleton dedupe of `wake`/`conversation_started`;
  `resumed:true` flag skips replay after refresh; reconnect never re-triggers
  `conversation_started` (no remount) and `restore_language` carries no audio.
- Welcome-completed marker is set once per visitor at selection time.

## 7. WebSocket reconnect

New backend action `restore_language` (`{language_code_key, visitor_session_id,
ui_state}`): validates the canonical code against the six codes, verifies the
visitor id matches the one bound at wake, is rejected when frozen, then sets the
session language and echoes the client's current ui_state — **no narration, no
welcome**. App.tsx sends it on every false→true connect transition while a
selection is stored; after a reset the storage is empty so nothing stale is
restored. Stale-narration-event rejection beyond this generation guard remains
T5 work.

## 8. Refresh restoration

Refresh keeps sessionStorage → on reconnect the stored `kn` is restored before
any interaction. On next wake, ChatScreen sends `conversation_started
{resumed:true}`; the backend answers `welcome_resumed` (state 5, no audio) so
the completed welcome is not replayed. Card/conversation history is intentionally
not persisted (out of K1 scope).

## 9. Explicit language change

The same authoritative write path handles changes: canonical code replaces the
previous value in context, storage and backend session; incompatible card/reply
presentation state is cleared by the existing pick handler
(`presentationRef.cancel`, suggestion-layer clear, focused-message reset). The
next request uses the new code. Frozen-language windows keep the existing
`LOCALE_CHANGE_BLOCKED` behaviour.

## 10. Back-to-sleep / end / timeout reset

Back to Sleep is now treated as the same new-visitor boundary as Home:
`onBack={resetClaraSessionWithTimestamp}` runs the existing hard-reset
transaction, which clears the visitor identity, selected code and welcome flag
(`resetToDefaultLanguage`), bumps the WS session floor (stale payloads dropped),
sends `reset_session` (backend clears all language fields +
`visitor_session_id`), forces sleep UI and remounts the kiosk subtree. Idle
timeout uses the identical transaction (existing wiring). A late response from
the ended visitor cannot restore the old language: restore requires the bound
visitor id that reset cleared.

## 11. Auto-detection priority

Unchanged production policy, now verified by tests: explicit selection disables
auto-detect writes (`should_run_auto_detect` false), detected language may still
inform utterance interpretation, and only an explicit new selection updates the
output language. Additionally, the backend-mic path previously bypassed the
gate (fresh-session voice could auto-pin `en` via latin fallback); K1 gates
`mic_start/toggle_mic` identically to typed messages until a selection exists.

## 12. Files changed

Frontend:
- `frontend/src/session/languageCodes.ts` (new)
- `frontend/src/session/visitorSession.ts` (new)
- `frontend/src/context/LanguageContext.tsx`
- `frontend/src/App.tsx`
- `frontend/src/screens/ChatScreen.tsx`

Backend:
- `backend/services/session_language.py`
- `backend/app/main.py`
- `backend/app/ws_schemas.py`
- `backend/tests/test_provider_failure_paths.py` (mic-gate conflict resolution only)

Docs/tests:
- `KANNADA_PHASE_K1_LANGUAGE_STATE_IMPLEMENTATION.md` (this file)
- `backend/tests/test_k1_language_state.py` (new)
- `frontend/src/session/__tests__/languageCodes.test.ts` (new)
- `frontend/src/session/__tests__/visitorSession.test.ts` (new)

## 13. Tests added

Backend (`test_k1_language_state.py`):
- six codes accepted; `kn-IN`, `Kannada`, `ಕನ್ನಡ`, non-strings fail closed;
  invalid values leave the session unchanged (never coerced to en)
- explicit `kn` blocks auto-detect; detection cannot override explicit pick
- WS: canonical-code selection over socket; reconnect `restore_language`
  restores `kn` without audio; invalid selections never activate; reset clears
  language and blocks stale restores while a new visitor can reselect;
  pre-selection welcome is visual-only; resumed visitors get no welcome replay

Frontend:
- exactly six options, correct native labels, each mapping to exactly one
  canonical code, Kannada→`kn` only
- provider locales/display names rejected as application codes
- visitor lifecycle: initial not-selected state, stable identity, refresh
  persistence, fail-safe invalid reads, welcome-completed gating, deterministic
  end-of-session clearing, no inheritance by the next visitor

## 14. Commands and results

| Command | Result |
|---|---|
| `python -m pytest backend/tests/test_k1_language_state.py -q` | 12 passed |
| `python -m pytest backend/tests/test_phase1_regional_card_regression.py backend/tests/test_phase2b_fee_routing.py backend/tests/test_golden_query_matrix.py -q` | 500 passed, 19 subtests |
| `python -m pytest backend/tests/test_tts_text_contract.py backend/tests/test_tts_text_provider_boundary.py -q` (T1) | 80 passed |
| `python -m pytest backend/tests -q` (full suite) | **1144 passed, 927 subtests** |
| `python -m compileall -q backend` | OK |
| `cd frontend && npx tsc --noEmit` | no errors |
| `npx vitest run src` (unit suites incl. new K1 tests) | 166 passed* |
| `npx vite build` | built OK |
| `git diff --check` | clean |

\* Running vitest over the whole repo also collects `e2e/*.spec.ts` Playwright
files, which vitest cannot execute ("Playwright Test did not expect
test.describe() here"). This is a pre-existing harness overlap unrelated to K1;
those specs run via `npm run test:e2e`.

### Existing-test conflict resolved

`backend/tests/test_provider_failure_paths.py` (`test_stt_timeout_returns_recoverable_error`,
`test_stt_empty_transcript_returns_retry_prompt`) drove `mic_start` on a fresh
session with no language selected — encoding the old defect where the
backend-mic path bypassed the language gate (K1 forbids this; it could silently
pin `en` via latin fallback). Their STT-failure assertions are preserved
unchanged; each test now establishes an explicit `en` selection first via the
canonical `language_selected {language_code_key}` handshake (TTS mocked). No
assertion was weakened.

## 15. Remaining limitations

- Component-level render tests (overlay rendering, Strict Mode double-effect)
  would require adding `@testing-library/react` + `jsdom`; K1 covers the
  equivalent logic at module level (one-shot guards, dedupe, storage). Strict
  Mode safety relies on the existing WS singleton reuse plus dispatcher dedupe.
- Full 16-step interactive integration walkthrough runs manually / via the
  existing Playwright e2e harness; automated end-to-end coverage of every step
  is not added in K1.
- Pre-selection accessibility prompt is visual-only (documented product
  decision above).

## 16. Deferred work

- **T2:** provider-locale mapping from `kn` at the TTS boundary (K1 only passes
  `kn` through application layers; `kn-IN` construction untouched).
- **T5:** full stale-narration/audio-event rejection across visitor resets;
  K1 implements only the visitor-id binding + WS session-generation floor.
- **K2/K3:** pronunciation/content quality, further regional speech pipeline.
