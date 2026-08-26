# KANNADA_VERTICAL_SLICE_AUDIT.md

Phase K0 — Read-only Kannada vertical-slice audit.
Date: 2026-08-25.
Scope: sleep → wake → welcome → language selection → Kannada session → cards → narration → TTS → playback → reset.
No production code, tests, locales, configuration, existing reports, or workstream files were modified. This report is the only artifact created. Codex-owned T1 files (`tts_text_contract.py`, `main.py`, `provider_clients.py`, both T1 test files, `REGIONAL_SPEECH_PHASE_T1_IMPLEMENTATION.md`) were inspected read-only only where needed.

Evidence basis: full reads of CLAUDE.md, CLARA_WORKSTREAM_STATUS.md, MULTILINGUAL_VOCABULARY_AUDIT.md, PHASE1_TEST_AND_VOCAB_REVIEW.md, PHASE2B_ROUTING_DESIGN.md, REGIONAL_SPEECH_PIPELINE_AUDIT.md, REGIONAL_SPEECH_PHASE_T1_IMPLEMENTATION.md; direct reads of SleepScreen.tsx, App.tsx, ChatScreen.tsx, LanguageContext.tsx, useWebSocket.ts, LanguageSelect.tsx, main.py (WS endpoint + TTS wrapper), session_language.py, settings.py, greetings.py, templates.py, unit_narration.py, narration_plan.py, content_unit_registry.py, semantic_vocab/catalog.py; full mechanical scans of `backend/data/locales/kn.json` (all 469 scalar strings), `frontend/src/data/locales/kn.json` (29), `backend/data/faq_answers.json` (78 Kannada Q/A strings), and ~125 Kannada string literals in five core content/code files. All prior-report claims used below were re-verified against current source.

---

## 1. Executive summary

**Kannada is already substantially wired end-to-end and is authoritative after selection — but the session that makes it authoritative is fragile, and the pre-selection experience is entirely English by design.**

What works today (verified in code):

1. `language_selected {language:"Kannada"}` sets `session.language_code_key="kn"` (`set_session_language`, session_language.py:11–36). Auto-detection can **never** overwrite an explicit pick (`should_run_auto_detect` returns False when `is_language_auto is False`). While a presentation bundle is frozen, further changes are rejected (`is_language_frozen`).
2. `"kn"` drives everything downstream from one place: answer-language resolution, localized clarification templates (`templates.py` has full Kannada parity, asserted at import), card text from `kn.json`, narration templates in `unit_narration.py`, and the Sarvam `kn-IN` provider request. Canonical routing identities are language-neutral json keys (`cse.fees`) — translated text is never a routing identity (verified in `department_identity.py`, `semantic_request_parser.py`, `content_unit_registry.py`).
3. `kn.json` has **complete structural parity** with `en.json`: 320 flattened paths / 472 scalar leaves each; the only difference is 11 deliberate `hod_bio` → `hod_bio_source: "departments.<dept>.hod_voice"` pointer substitutions. Zero missing Kannada sections.
4. Mechanical Unicode hygiene of stored Kannada is excellent: **zero** foreign-script contamination, zero U+FFFD, zero orphaned combining marks, zero non-NFC strings, zero HTML/URLs/internal IDs inside display strings (scanned 701 Kannada strings total).

The five highest-severity root causes:

| # | Root cause | Effect on a Kannada user |
|---|---|---|
| RC1 | **Session language dies with the WebSocket connection.** Session dict is created per connection (main.py:3141); reconnect does not re-send `language_selected`; refresh resets React context to `'English'`. | Any network blip silently returns the kiosk to the English gate mid-conversation. |
| RC2 | **en-IN TTS fallback** on primary-language failure (`main.py` tts_to_base64_cached, `allow_english_fallback=True` default): Kannada text spoken with the en-IN voice/locale while the screen stays Kannada. | Wrong-language audio; the single worst audible defect (also T0 P0). |
| RC3 | **Pre-selection welcome is spoken English** (greetings.py:21–29, TTS en-IN) before the six-language picker appears (~2.2 s after greeting audio). | Violates the product rule that selected language controls speech; Kannada-first visitors hear English first. |
| RC4 | **Fee-value contradictions between Kannada surfaces** (departments.cse.fees ₹3,50,000 vs ug_management/_FEES_AMOUNT_BY_KEY/frontend ₹3,25,000; same pattern for aiml/ds/ece/civil/mechanical; ISE absent from ug_management table). | The kiosk speaks and displays different fees depending on which card answered. |
| RC5 | **Raw Python-repr dict strings stored as Kannada display values** (affiliations_and_accreditations, fee_structures.ug_management, fee_structures.pg_mba) and **SAMPLE_REPLACE_WITH_OFFICIAL sentinels inside 112 campus-unit display/narration strings**. | If rendered/spoken verbatim, users see/hear `{...}`, quotes, and placeholder markers. |

Secondary but systematic: hardcoded Kannada is duplicated across ≥15 frontend/backend files with real drift (ಪರಿಗಣಕ ವಿಜ್ಞಾನ vs ಕಂಪ್ಯೂಟರ್ ವಿಜ್ಞಾನ; ಸೈಬರ್ ಭದ್ರತೆ vs ಸೈಬರ್ ಸೆಕ್ಯುರಿಟಿ); several hardcoded English replies bypass localization (HOD-no-department prompt, error/STT messages); narration HOD names are Latin (`Dr. Shashikumar D R`) while card bios are Kannada-script (`ಡಾ. ಶಶಿಕುಮಾರ್ ಡಿ ಆರ್`).

Recommended next phase: **K1 — authoritative language-selection state** (persist + restore `kn`, re-send on reconnect, keep through wake cycles).

---

## 2. Current sleep-to-speech flow (K0.1)

Launch chain: `main.tsx` mounts `StrictMode > LanguageProvider > App` → `App.renderState()` shows **SleepScreen** when effective state = 0 (App.tsx:315). `WelcomeScreen.tsx` exists but is **dead code** (no imports). Production welcome lives inside ChatScreen via the backend greeting.

| # | Step | File / function | Line(s) | Input state | Output state | Language before → after | Failure/fallback |
|---|---|---|---|---|---|---|---|
| 1 | Initial route | `frontend/src/App.tsx` `renderState` | :315 | mounted, state 0 | SleepScreen rendered | n/a | dev override `?state=` |
| 2 | Sleep screen | `screens/SleepScreen.tsx` root div | :202–229 | idle slideshow | tap armed (`role="button"`, `data-testid="sleep-screen"`) | English-only chrome | Wake Lock API absent (no `wakeLock` anywhere) |
| 3 | Tap handler | `requestWake` (SleepScreen) guarded by `wakeRequestedRef` | :61–66 | any pointer/key event | one-shot `onWake()` | — | double-tap safe |
| 4 | State transition | `App.tsx` onWake | :320–326 | state 0 | sends `{action:'wake'}`; `setManualState(5)`; `showChatLanguageGate=true` | none → gate pending | — |
| 5 | Backend ack | `main.py` WS handler `action=="wake"` | :3223–3226 | fresh session (`language_code_key=None`) | ack state 5; comment: "language is chosen inline after the first greeting" | None → None | — |
| 6 | Welcome event | ChatScreen mount effect | :3912–3917 | chat mounted | sends `{action:'conversation_started'}` once per mount | — | singleton-deduped per session epoch |
| 7 | Welcome text | `services/greetings.py` `get_wakeup_language_gate_display_text` | :21–25, main.py:3327–3360 | no language yet | message id `'greeting'` | **English** ("Good morning. I am CLARA, your campus assistant.") | time-of-day variant only |
| 8 | Welcome audio | `tts_to_base64_cached(..., TARGET_LANGUAGE_CODES["en"])` | main.py:3330–3340 | greeting text | `payload.audioBase64`, `turn_id:"greeting_opening"` | **en-IN** | cache miss ⇒ live TTS; failure ⇒ silent (text remains) |
| 9 | Nudge audio | `LANGUAGE_GATE_NUDGE_ENGLISH` | greetings.py:27–29; main.py:3343–3352; ChatScreen :2200–2234 | overlay shown | second clip "Please choose the language that feels most comfortable." | **English** | client plays payload clip or requests `language_gate_prompt` (main.py:3228–3248) |
| 10 | Picker reveal | ChatScreen effect | :1334–1366 | assistant msg present ∧ playback done | waits 2200 ms (850 ms if no audio) then `setShowLanguageOverlay(true)` | — | — |
| 11 | Selection screen | ChatScreen inline gate (production); `LanguageSelect.tsx` standalone is unused except `LANGUAGE_OPTIONS` | :4652–4714; LanguageSelect :18–25 | overlay visible | six buttons: English, ಕನ್ನಡ, हिन्दी, தமிழ், తెలుగు, മലയാളം | title localized via `t('selectLanguage')` (pre-pick context still 'English' → English title) | — |
| 12 | Kannada button | `handleInlineLanguagePick('Kannada')` | :1368–1390 | gate open | cancels presentation, clears caption/freeze, `setLanguage('Kannada')`, `patchConversationRuntime({currentLanguage:'Kannada'})` | English → Kannada (client) | blocked during freeze (`LOCALE_CHANGE_BLOCKED`) |
| 13 | Payload to backend | same handler | :1384 | pick accepted | `sendMessage({action:'language_selected', language:'Kannada'})` | — | name string, not code |
| 14 | Backend session language | `main.py:3250–3293` → `set_session_language` | session_language.py:11–36 | `VALID_LANGUAGES` check | `language_code_key='kn'`, `language_name='Kannada'`, `is_language_auto=False`; mirrors `language='Kannada'`, `language_code='kn-IN'` | None → kn | invalid name ignored; frozen ⇒ `{"error":"language_frozen"}` |
| 15 | Post-pick prompt | `get_name_prompt('Kannada')` | main.py:3250–3293; greetings.py:90+ | language set | localized name_prompt + TTS in kn-IN | English → Kannada | parity asserted at import |
| 16 | Per-turn resolution | `resolve_session_language(session)` | session_language.py:39–45 | session keys | `(code_key, name, tts_code)` e.g. `("kn","Kannada","kn-IN")` | kn persists per turn | unknown key clamps to `"en"` |
| 17 | ANSWER-turn override | `resolve_answer_language(text, session)` | main.py:1339–1341; answer_language.py:21–32 | ANSWER mode | native Indic script *this turn* may win for reply language without rewriting session | kn stays session-authoritative | romanized input keeps kn |
| 18 | Conversation processing | orchestrator → pipeline | conversation_orchestrator.py:66–72; pipeline.py:113–150 | lang_key/name | semantic parser `language_code_key='kn'`, policy router language | kn | defaults `"en"` if unset |
| 19 | Canonical unit selection | `parse_semantic_request` → `map_content_units_to_segments(units,'kn')` | narration_resolver.py:48–87 | raw text + kn | canonical units `cse.overview` etc. (language-neutral IDs) | neutral IDs | fail-closed ⇒ CLARIFY |
| 20 | Kannada display content | adapters load `load_locale_data_for_lang_key('kn')` | content/adapters.py:60–124; kn.json | unit + kn | card bodies/titles from `kn.json#departments/#campus_units/#role_holders` | kn | missing file ⇒ `{}` ⇒ English literals (narration_plan.py:1174 `raw.get(lk_eff) or raw.get('en')`) |
| 21 | Kannada narration | `narrate_unit(unit,'kn')` templates | unit_narration.py:57–163 | unit + kn | kn sentence templates (`"{dept} ವಿಭಾಗದ ಮುಖ್ಯಸ್ಥರು {name} ಅವರು."`) | kn | `_lk()` unsupported ⇒ `"en"`; `.get(lk, <English>)` per topic |
| 22 | Sanitization | `sanitize_tts_text` in `tts_to_base64_cached` (Codex T1 boundary; under active edit) | main.py:686–696 | narration text | sanitized provider text; empty ⇒ reject, no provider call | unchanged for clean Kannada (T1 tests assert byte-exact preservation) | — |
| 23 | Provider selection | `sarvam_tts_to_base64(text,'kn-IN')` | provider_clients.py:128–199 | sanitized text + kn-IN | HTTP POST `bulbul:v3`, speaker `SARVAM_TTS_SPEAKER`, pace `SARVAM_TTS_PACE`; SDK fallback identical params | kn-IN | endpoint retry ×2 candidates ×HTTP_RETRY_ATTEMPTS |
| 24 | Fallback | en-IN retry when primary fails ∧ `allow_english_fallback` | main.py:772–802 | kn-IN failure | en-IN request with **same Kannada text** | kn-IN → en-IN (audio only) | fallback audio never cached (:804); card bundles pass `allow_english_fallback=False` (main.py:2452) |
| 25 | Audio events | `assistant_audio_update` frames keyed by `turn_id` + sequence | useWebSocket.ts:388–445 | clips ready | interim + final frames carrying base64 WAV | — | stale `session_gen`/`wire_seq` dropped |
| 26 | Playback | response scheduler → single HTMLAudioElement in ChatScreen | responseTtsScheduler; ChatScreen | merged slots | sequential playback, captions set | — | autoplay rejection fails the clip (no gesture retry) |
| 27 | Card sync | presentation bundle bound to same element; `presentationLanguage = languageFromPayload(payload) ?? language` | ChatScreen :583, :4802–4875 | payload `language_code_key='kn'` | exclusive card stage chain, `data-card-language="kn"` | kn | payload-missing language falls back to client context |
| 28 | Session completion | user Home / inactivity (240 s default, App.tsx:44) / Back | App `resetClaraSession` :129–147 → hardResetTransaction.ts:21–31 | active session | `resetToDefaultLanguage()` (**→ English**) + kiosk reset + `{action:'reset_session'}` + remount | kn → English | **Back to sleep does NOT reset language** (`onBack={()=>setManualState(0)}`, App :346) |
| 29 | Backend reset | `action=="reset_session"/"home"` | main.py:3185–3205 | generation bump | all language keys nulled, cached greeting cleared | kn → None | `cancel_turn` keeps language |

Flow diagram:

```
SleepScreen(tap) ─▶ {wake} ─▶ ChatScreen ─▶ {conversation_started}
      ▲                                        │
      │                             English greeting text + en-IN TTS
      │                                        │
   Home/240s-idle/refresh                 2.2 s later: 6-language overlay
   resets lang→English                         │ tap ಕನ್ನಡ
      │                                        ▼
      └── hardResetTransaction        {language_selected:"Kannada"}
                                               │
                                    session.language_code_key="kn"
                                               │
              user_message ──▶ resolve_session_language=("kn","Kannada","kn-IN")
                                               │
              semantic parser(kn) ─▶ canonical units (cse.fees…) ─▶ kn.json cards
                                               │
              narrate_unit(unit,"kn") ─▶ sanitize ─▶ Sarvam kn-IN (bulbul:v3, simran)
                                               │               │ fail
                                               ▼               ▼
                              assistant_audio_update ◀── en-IN retry (uncached)
```

---

## 3. Language-state authority (K0.2)

Representations of Kannada found:

| Layer | File/function | Field/value | Example | Authoritative? | Reset behaviour |
|---|---|---|---|---|---|
| Selection UI | ChatScreen.tsx:1368–1390 | `lang.name` = `'Kannada'` | `'Kannada'` | No — input only | context reset → `'English'` |
| React context | LanguageContext.tsx:3,397 | `useState<Language>('English')` | `'Kannada'` | Client-side authority for display chrome | `resetToDefaultLanguage()` → English (hardResetTransaction) |
| localStorage/sessionStorage | — | **absent** | — | — | nothing persisted; refresh loses selection |
| Outbound WS | ws_schemas.py:54–57 | `language_selected.language` | `"Kannada"` | Transport only | not resent on reconnect |
| STT locale | useSpeechRecognition.ts:4–11 | `LANGUAGE_TO_BCP47` | `'kn-IN'` | Derived | follows context |
| Backend session (canonical) | session_language.py:11–36 | `language_code_key` | `"kn"` | **YES — the single backend authority** | nulled by reset_session/home; survives cancel_turn |
| Backend mirror | same | `language_name`/`language`/`language_code` | `'Kannada'`/`'Kannada'`/`'kn-IN'` | Mirrors only | same lifecycle |
| Auto-detect | session_language.py:48–51; main.py:824 | `is_language_auto` | True | Never overrides explicit pick | cleared on explicit pick |
| Freeze guard | runtime/context.py:43–53 | `localization_frozen` snapshot | `{code_key:'kn',…}` | Turn-scoped lock | released at finalize_turn / contract failure |
| Pipeline | pipeline.py:113–150 | `language_code_key` arg | `'kn'` | Consumed | per-turn |
| Response decision | response_decision.py | (no language field — decisions are language-neutral) | — | Correctly language-blind | — |
| Presentation resolver / narration plan | narration_resolver.py:48; narration_plan.py:43,279–281 | `lang_key`, `LANG_KEY_FALLBACK_ORDER` | `'kn'` | Consumed; clamps invalid → `'en'` | per-turn |
| Frontend payload echo | main.py:2340–2343 | `payload.language_code_key/language_name` | `'kn'` | Server stamp; client prefers it (ChatScreen :583) | per-message |
| TTS cache | tts_orchestrator.py:111–121 | key includes `language_code` | `kn-IN\|simran\|…` | Language-safe (cannot hit en audio) | TTL 1200 s |
| Provider request | provider_clients.py:140–146 | `target_language_code` | `'kn-IN'` | Consumed | per-call |
| Playback | ChatScreen narration caption/slots | keyed by turn, not language | — | Not language-bearing | cleared on new turn |

Findings:

- **One canonical internal code exists**: `session.language_code_key` ∈ {en,kn,hi,ta,te,ml}. Recommendation: adopt `"kn"` (the `code_key`) as the sole canonical application code everywhere; treat `'Kannada'` (UI name) and `'kn-IN'` (provider locale) as pure derivations at the edges. Today three spellings coexist (`Kannada` / `kn` / `kn-IN`) and conversion happens independently in four places (settings maps, LanguageContext, localizationFreeze, ChatScreen `LANGUAGE_FROM_CODE_KEY`) — a known drift surface.
- Multiple conflicting authorities? Functionally no (explicit pick wins over auto-detect; server stamp wins over client context for payloads), but the *client* context and the *server* session can disagree after reconnect (client=Kannada, server=None) — an inconsistent split-brain until the next pick.
- Survives every turn: yes, within one connection. Refresh: no. Reconnect: **no** (new TCP socket ⇒ new session; `flush()` resends only PENDING commands, and SENT commands — including `language_selected` — are never resent; outboundCommandDispatcher.ts:135–146).
- Returning to sleep: **Back preserves kn; Home/idle-reset clears it** — inconsistent UX.
- Explicit change: clears old presentation/captions client-side (cancel + releaseLocalizationFreeze) and resets guest-name flow server-side; old queued audio is dropped by turn fences.
- Stale response restoring previous language: prevented within a session by `session_gen`/`wire_seq`; across sessions the generation floor resets, so late frames from a prior socket are not fenced against — low risk since the socket is dead.
- Backend defaults overwriting Kannada: auto-detect cannot; but the **mic path skips the language gate** (toggle_mic → `_schedule_process_user_text_reply` directly, main.py:3563), so on a *fresh* session voice input can trigger auto-detect; a Latin/romanized utterance pins `en` permanently (`latin_fallback` conf 0.74, language_detection.py:130–132; `should_run_auto_detect` then never fires again).
- Case/naming mismatches: campus route API bug — `language: language === 'English' ? 'en' : 'en'` always sends `'en'` (ChatScreen:4323). Invalid `language_code_key` silently coerces to `'en'` (session_language.py:20) rather than failing loudly.

## 4. Welcome timing and policy (K0.3)

Current behaviour: CLARA welcomes **before language selection**, in **English**, **spoken** (backend TTS, en-IN), followed by a second spoken English nudge; the picker reveals only after greeting playback + ~2.2 s delay. Exactly one greeting per session (cached greeting reused across sleep/wake only after a language is chosen, main.py:3362–3400). All six languages are visible simultaneously once the overlay opens.

Conflict assessment: the spoken English welcome directly conflicts with requirement 8 ("every speakable response narrated in Kannada") for the pre-selection window; it is defensible as a bootstrap necessity but the *double* English audio (greeting + nudge) delays Kannada availability by roughly 4–5 seconds.

Policy options evaluated:

1. **Neutral visual welcome before selection, spoken welcome after selection** — RECOMMENDED. Matches current architecture best: the greeting text path already branches on language presence (main.py:3327 vs :3362); suppressing only the two pre-selection TTS calls yields policy-compliant behaviour with minimal change, removes ~4 s of English audio, and the post-pick localized greeting infrastructure (`_GREETINGS_BY_PERIOD`, kn lines 172–197) already exists and is parity-tested.
2. Multilingual welcome before selection — requires either six TTS clips (latency, cost) or a stitched composite; poor kiosk latency profile; not recommended.
3. English welcome (status quo) — non-compliant with the product objective for regional-first visitors.
4. Remembered-language welcome — desirable later, but currently impossible: no persistence layer exists on either side (see §3). Should follow K1 persistence as an opt-in.

## 5. Six-language selection screen findings (K0.4)

- Exactly the required six are presented, in one shared constant (`LANGUAGE_OPTIONS`, LanguageSelect.tsx:18–25): English/"English", Kannada/"ಕನ್ನಡ", Hindi/"हिन्दी", Tamil/"தமிழ்", Telugu/"తెలుగు", Malayalam/"മലയാളം". Each production button shows native label large + English name uppercase beneath.
- Accessibility: region has `role="region"` + `aria-labelledby="inline-lang-title"`; individual buttons have **no aria-label** — accessible name falls back to visible text (native script + English name), acceptable but not explicit. Keyboard/touch: `<motion.button type="button">` receives focus/Enter/Space natively; SleepScreen itself has full keyboard support (Enter/Space, tabIndex=0).
- Target size: `min-h-[7rem]` (≈112 px) full column width in a 3-col grid — comfortably exceeds touch guidelines.
- Selected state: **none** — the gate closes immediately on pick, so there is no persistent selected styling in the production inline gate (the unused standalone screen has ring/scale styling). Minor gap.
- Double-tap: protected twice — `canChangeLanguageNow()` freeze guard logs `LOCALE_CHANGE_BLOCKED`, and the overlay closes + gate satisfies on first success. No duplicate welcome/audio observed in code (post-pick prompt sent once by backend per `language_selected`; repeated picks while unfrozen would restart the guest-name flow — possible duplicate prompt audio if a user taps Kannada, then Kannada again quickly, mitigated by the immediate close).
- Loading state: none shown between pick and backend prompt arrival; `isAwaitingReadyPrompt` suppresses suggestion layers meanwhile. Acceptable.
- Change selection later: allowed unless frozen; blocked mid-narration with a runtime event (silent to the user — no user-visible "please wait" message; minor gap).
- Old audio/cards cleared on change: yes client-side (`presentationRef.current.cancel()`, caption clear, freeze release).
- Canonical code: button passes `'Kannada'` (display name); conversion to `kn` happens only server-side. Correct but name-typed; see §3 recommendation.
- Downstream carriage: every subsequent reply/TTS/payload carries `kn`/`kn-IN` from the session (verified §2 steps 14–24). Exception: campus route API always sends `'en'` (bug, above).

## 6. Canonical unit-selector findings (K0.5)

Architecture verified: one canonical selector. `content_unit_registry.py` registers `{dept}.{overview|hod|fees|achievements|placements}` from `backend/data/locales/*.json#departments`; `semantic_vocab/catalog.py` entries carry language-neutral `canonical_id`s (`TOPIC_FEES="fees"`, dept ids `cse`,`cse_ds`,…); `department_identity.match_department_spans_exclusive` guarantees `cse` never leaks from `cse_ds`; `semantic_request_parser` is fail-closed. **Translated display text is never a routing identity** — kn.json display names feed the alias table as *aliases*, not as keys.

Kannada-specific vocabulary status (from catalog + Phase 0/1 audits, re-verified):

| Request (kn) | Resolves to | Route |
|---|---|---|
| CSE overview (`ಅವಲೋಕನ`/bagge cues) | `cse.overview` | ✅ native term + romanized cues |
| CSE HOD (`ವಿಭಾಗದ ಮುಖ್ಯಸ್ಥರು`, ಹೋಡ್, ಹೆಡ್, ಹೆಚ್ಒಡಿ…) | `cse.hod` | ✅ best-in-class kn set incl. STT variants |
| CSE fees (`ಶುಲ್ಕ/ಶುಲ್ಕಗಳು/ಫೀಸ್`, eshtu/yestu/bele) | `cse.fees` | ✅ mature |
| AIML overview/HOD/fees (`ಎಎಂಎಲ್` variants) | `cse_aiml.*` | ✅ |
| General admissions | admissions card | ✅ (non-unit intent) |
| Placements (`ಪ್ಲೇಸ್‌ಮೆಂಟ್` ZWJ and no-ZWJ forms, `ಉದ್ಯೋಗಾವಕಾಶ`) | placements | ✅ semantic stack (legacy path is English-only — authority divergence) |
| Achievements | achievements | ⚠ cue is stem `ಸಾಧನ` vs displayed copy `ಸಾಧನೆಗಳು`; substring matching accepts both but the mismatch is unverified terminology |
| Campus/facilities (hostel/canteen/events kn labels) | campus units | ✅ (`campus_unit_locale.py:33–44`) |
| Unknown dept + fees (`ಕ್ವಾಂಟಮ್ ವಿಭಾಗ ಶುಲ್ಕ`) | CLARIFY department | ✅ fixed in Phase 2B (workstream status §5.2, PASS) |
| Missing dept + fees (`ಶುಲ್ಕ ಎಷ್ಟು`) | CLARIFY department | ✅ PASS (same verification) |
| Three-card request (`AIML, Data Science mattu CSE HOD yaaru?`) | ordered tuple, deduped | ✅ pinned by phase1 regression suite |
| Anaphora (`ಅದರ ಶುಲ್ಕ`-class possessive cues) | inherited dept + fees | ✅ `semantic_anaphora.py` carries 29 Kannada cues; carried keys validated exactly |

Gaps specific to kn: MBA has **no Kannada recognition** (`ಎಂಬಿಎ` absent everywhere — MBA is English-acronym-only); basic_sciences likewise; mixed kn+English acronyms work (`ದಯವಿಟ್ಟು CSE ಶುಲ್ಕ` pinned green); documented substring false positive `ಅಸಿಎಸ್ಇಯ → cse` remains (pinned as known behaviour, backlog item 2). No duplicated business logic for Kannada exists — no separate kn selector anywhere. Multi-card order is established upstream and preserved (phase1 suite asserts exact tuples).

## 7. Kannada display inventory (K0.6)

Method: full flatten-scan of `backend/data/locales/kn.json` (the authoritative source, aliased into the frontend build via Vite `@college-locales`), plus `frontend/src/data/locales/kn.json` (29 strings, **orphaned/drifting legacy** — do not trust), `faq_answers.json` Kannada fields, and hardcoded Kannada literals in code (≥15 files, largest: cardData.ts, LanguageContext.tsx, executiveLeadershipLocale.ts, faqSuggestions.ts, campusDirections.ts, DocumentsBlock.tsx, DepartmentFeesCard.tsx, DepartmentCards/*.tsx; backend: narration_plan.py, main.py, templates.py, greetings.py, campus_unit_locale.py).

Headline numbers:

| Metric | Count |
|---|---|
| Distinct Kannada display strings (backend kn.json scalars) | **469** (of 472 en leaves; 11 `hod_bio` replaced by pointers, net −3 due to pointer/empty handling) |
| Additional Kannada strings in FAQ bank | 78 (39 questions + 39 answers, zero gaps) |
| Hardcoded Kannada UI/chrome strings (frontend code) | ≈40 in LanguageContext + ~200 more across card components/decks |
| Orphaned legacy frontend locale strings | 29 (drifted copies) |
| Structurally missing vs en.json | **0** |
| English-fallback / Latin-retained values inside kn.json | 13 (11 Latin HOD names by stated policy + Mathematics/Physics/Chemistry `department_name` kept English) |
| Conflicting duplicates (cross-surface) | 6 fee-value conflicts + 2 terminology conflicts (§10) |
| Strings embedding `SAMPLE_REPLACE_WITH_OFFICIAL` / `(ಮಾದರಿ)` sentinels | **112** (all 28 campus units × title/body/tts_summary/points) |
| Dynamically generated Kannada (model output, not stored) | ANSWER-mode replies (prompt-enforced Kannada, answer_generation.py:1363–1369) — inherently unverified |
| Requiring native-speaker approval | effectively all 469 + narration set; prioritized subset in worksheet §20 |

Representative inventory rows (full leaf enumeration exists mechanically in kn.json; rows below cover every user-facing category):

| ID (key/unit) | Canonical key | English source | Current Kannada display text | Source file | Runtime path | Status |
|---|---|---|---|---|---|---|
| ui.selectLanguage | selectLanguage | Select Language | ಭಾಷೆಯನ್ನು ಆರಿಸಿ | LanguageContext.tsx:28–35 | inline gate heading | Present |
| ui.welcome | welcome | Welcome to campus | ಕ್ಯಾಂಪಸ್‌ಗೆ ಸುಸ್ವಾಗತ | LanguageContext.tsx | t() chrome | Present (unused pre-selection) |
| ui.tapToWake | — | TAP ANYWHERE TO START | (English only) | SleepScreen.tsx:326 | sleep screen | **Missing** (sleep chrome entirely English) |
| ui.listening | listening | Listening... | ಆಲಿಸಲಾಗುತ್ತಿದೆ... | LanguageContext.tsx | indicator | Present |
| ui.thinking | thinking | thinking taglines | ಕ್ಲಾರಾ ಯೋಚಿಸುತ್ತಿದ್ದಾಳೆ... | LanguageContext/ChatScreen THINKING_TAGLINES | indicator | Present |
| greet.opening | conversation_started | Good afternoon. I am CLARA… | (English only, pre-selection) | greetings.py:21–25 | greeting bubble | **Missing kn by design** (see §4 policy) |
| clarify.department | clarification | Which department…? | ನೀವು ಯಾವ ವಿಭಾಗದ ಬಗ್ಗೆ ತಿಳಿಯಲು ಬಯಸುತ್ತೀರಿ? | templates.py:58 | decision CLARIFY | Present |
| clarify.generic | clarification | …help with? | ನೀವು ಯಾವ ವಿಷಯದಲ್ಲಿ ಸಹಾಯ ಬೇಕು…? | templates.py:48 | CLARIFY | Present |
| clarify.hostel | clarification | girls'/boys' hostel? | ನೀವು ಹುಡುಗಿಯರ ಹಾಸ್ಟೆಲ್ ಅಥವಾ ಹುಡುಗರ…? | templates.py:67 | CLARIFY | Present |
| err.hod_no_dept | main.py:1793/1796 | Please specify the department… | (English only) | main.py | deterministic reply | **Missing** — English leak under kn session |
| err.generic | error path | Something went wrong… | (English only) | main.py:2862–2867 etc. | errors/STT failures | **Missing** |
| inst.about | institution_overview.about | About SVIT | ಸಾಯಿ ವಿದ್ಯಾ ಇನ್‌ಸ್ಟಿಟ್ಯೂಟ್ ಆಫ್ ಟೆಕ್ನಾಲಜಿ (SVIT) ರಾಜನುಕುಂಟೆ… | kn.json | overview card | Present; no terminal punctuation |
| inst.affiliations | affiliations_and_accreditations | Affiliations | `{'university': 'ವಿಶ್ವೇಶ್ವರಯ್ಯ…', …}` | kn.json | overview card | **Suspected formatting issue** — raw Python-repr dict |
| dept.cse.name | departments.cse.name | Computer Science & Engineering | ಕಂಪ್ಯೂಟರ್ ವಿಜ್ಞಾನ ಮತ್ತು ಎಂಜಿನಿಯರಿಂಗ್ | kn.json:152 | cards, identity aliases | Present; conflicting duplicate in CSECard.tsx (ಪರಿಗಣಕ ವಿಜ್ಞಾನ…) |
| dept.math.name | departments.mathematics.name | Mathematics | **Mathematics** (untranslated) | kn.json | basic-sciences cards | English fallback |
| dept.cse.fees | cse.fees | Fees | KCET: KEA ಮಾನದಂಡಗಳ ಪ್ರಕಾರ \| ನಿರ್ವಹಣೆ: ₹3,50,000/ವರ್ಷ | kn.json | fees card | Present; **conflicts ₹3,25,000 elsewhere** |
| hod.cse.name | role_holders.hod_by_department.cse | Dr. Shashikumar D R | Dr. Shashikumar D R (Latin, by policy) | kn.json | HOD card | English fallback (policy) |
| adm.documents | DOCUMENT_ITEMS["kn"] | Required documents | ಅಗತ್ಯವಿರುವ ದಾಖಲಾತಿಗಳು (+10 items) | narration_plan.py:207–218 | documents block | Present |
| plac.slides | placements_and_training | Training objectives | ತರಬೇತಿ ಮತ್ತು ಪ್ಲೇಸ್‌ಮೆಂಟ್ ಉದ್ದೇಶಗಳು … | narration_plan.py:771 | placement slides | Present |
| cmp.labels | department_comparison | comparison row labels | ನಾಲ್ಕು ವರ್ಷಗಳಲ್ಲಿ ನಿಮ್ಮ ವಿದ್ಯಾರ್ಥಿ ಏನು ಕಲಿಯುತ್ತಾರೆ | comparison JSONs ×3 copies | comparison cinema | Present; triple duplication risk |
| campus.hostel.girls.overview | campus_units.hostel.girls.overview | Hostel overview | ಹುಡುಗಿಯರ ಹಾಸ್ಟೆಲ್ — ಅವಲೋಕನ … SAMPLE_REPLACE_WITH_OFFICIAL | kn.json | campus card + TTS | Present but **sentinel-contaminated** |
| sess.thanks / timeout / offline | — | thank-you / timeout / offline | (no dedicated kn strings found) | — | end-of-session | **Missing** (reset is silent) |

## 8. Kannada narration inventory (K0.7)

| ID | Event/unit | Display source | Narration source | Current Kannada narration | TTS path | Status |
|---|---|---|---|---|---|---|
| narr.greeting.pre | conversation_started (no lang) | greeting bubble | get_wakeup_language_gate_tts_text | **none — English spoken** | tts_to_base64_cached, en-IN | English fallback (policy conflict, §4) |
| narr.nudge | language gate | picker heading | LANGUAGE_GATE_NUDGE_ENGLISH | none — English | en-IN | English fallback |
| narr.greeting.post | after pick | greeting bubble | _GREETINGS_BY_PERIOD['Kannada'] | ಶುಭ ಮಧ್ಯಾಹ್ನ. ನಾನು ಕ್ಲಾರಾ, ನಿಮ್ಮ ಕ್ಯಾಂಪಸ್ ಸಹಾಯಕಿ. | kn-IN | Present |
| narr.name_prompt | name flow | bubble | get_name_prompt('Kannada') | present, parity-asserted | kn-IN | Present |
| narr.clarify.dept | CLARIFY department | clarification bubble | clarification_reply → templates.py:58 | ನೀವು ಯಾವ ವಿಭಾಗದ ಬಗ್ಗೆ ತಿಳಿಯಲು ಬಯಸುತ್ತೀರಿ? | kn-IN | Present |
| narr.unit.hod | {dept}.hod | kn.json bio | unit_narration.py:72 template | "{dept_label} ವಿಭಾಗದ ಮುಖ್ಯಸ್ಥರು Dr. Shashikumar D R ಅವರು." | kn-IN | Present; **Latin name vs Kannada-script bio contradiction** |
| narr.unit.fees | {dept}.fees | departments.*.fees | unit_narration.py:89 lead + clipped body | "{dept} ಶುಲ್ಕ." + body | kn-IN | Present; clipped body (T0 raw-slice risk) |
| narr.unit.overview/placements/achievements | respective | kn.json | unit_narration leads :80/:103/:117 | ಅವಲೋಕನ/ಉದ್ಯೋಗಾವಕಾಶಗಳು/ಸಾಧನೆಗಳು lead sentences | kn-IN | Present |
| narr.principal/vice | leadership | role_holders | unit_narration.py:134/:150 | ಪ್ರಾಂಶುಪಾಲರು/ಉಪ ಪ್ರಾಂಶುಪಾಲರು templates | kn-IN | Present |
| narr.trustees | trustees | trustees[].tts_summary | unit_narration.py:206–219 | per-trustee kn tts_summary | kn-IN | Present |
| narr.admissions.slides | admissions | slide captions | narration_plan.py:853 | ಅರ್ಹತೆ / ಪ್ರವೇಶ ಪರೀಕ್ಷೆಗಳು / … | kn-IN | Present |
| narr.campus.units | campus_units | title/body | `_campus_unit_spoken` = locale tts_summary | contains SAMPLE_REPLACE_WITH_OFFICIAL markers | kn-IN | **Sentinel-contaminated narration** |
| narr.multi-card transition | opening-screen line | card | main.py:324,456–477 | f"{dept} ವಿಭಾಗದ ಶುಲ್ಕ ವಿವರಗಳನ್ನು ತೆರುತ್ತಿದ್ದೇನೆ." etc. | kn-IN | Present |
| narr.fallback.offdomain | off-domain | reply | answer_generation.py:461–520 constants | ಕ್ಷಮಿಸಿ, ಆ ಮಾಹಿತಿಯನ್ನು… | kn-IN | Present |
| narr.error.paths | errors/STT | bubbles | hardcoded English (main.py) | none — English spoken | en-IN | English fallback |
| narr.answer.dynamic | ANSWER mode | reply_text | Groq output under Kannada system prompt | dynamic, honorific-ಅವರು instructed | kn-IN | Dynamically generated; needs native sampling |
| narr.fallback.en.pack | locale pack missing | — | narration_plan.py:1237–1262 | English hardcodes if kn.json unreadable | en-IN | Degraded-path English fallback |

Assessment answers: narration comes predominantly from approved-in-repo Kannada content; display and narration share the same locale bodies (fees/overview speak clipped body text — consistent wording, truncation risk only). English enters narration via: pre-selection greeting/nudge, error/STT paths, `.get(lk, English)` template fallbacks, and degraded pack loading. Raw metadata entering narration: only the `hod_bio_source` pointers (routing metadata, never rendered) and the SAMPLE sentinels. The T1 sanitizer preserves clean Kannada byte-exactly (T1 tests assert equality; independent probes confirm virama/ZWJ/ZWNJ/danda survival). Multi-card narration order follows segment order; consecutive-duplicate removal only collapses identical adjacent sentences.

## 9. Unicode findings (K0.8)

Mechanical scan of 701 Kannada strings (469 kn.json + 29 orphan frontend + 78 FAQ + 125 code literals):

| Detector | Result |
|---|---|
| Telugu/Devanagari/Tamil/Malayalam chars inside kn strings | **0** |
| U+FFFD | **0** |
| Orphaned combining marks (Mn after space/start) | **0** |
| Non-NFC normalization | **0** |
| Unexpected control characters | **0** |
| Markdown / HTML / URLs / dotted internal IDs in display strings | **0** |
| ZWJ (U+200C→U+200D usage) | Present and legitimate (ಇನ್‌ಸ್ಟಿಟ್ಯೂಟ್, ಪ್ಲೇಸ್‌ಮೆಂಟ್, ಮ್ಯಾನೇಜ್‌ಮೆಂಟ) — correct joiner usage, preserved end-to-end |
| Raw Python-repr dict strings | **3** (below) |
| SAMPLE_REPLACE_WITH_OFFICIAL / (ಮಾದರಿ) sentinels | **112** |
| Missing terminal punctuation | many list-item/label strings (expected for labels; prose values flagged: inst.about, eligibility, scholarships, leadership[2..12] name fields) |
| Mixed quotation marks | 1 (inst.additional_details.tagline wraps Kannada quote in escaped ASCII `"\"…\""`; motto uses ASCII quotes around Kannada — inconsistent with typographic quotes elsewhere) |
| Unbalanced parentheses/quotes | **0** |

Issues table (mechanically detected):

| String ID | Exact stored text (excerpt) | Code points of concern | Source | Mechanical issue | User-visible risk |
|---|---|---|---|---|---|
| institution_overview.affiliations_and_accreditations | `{'university': 'ವಿಶ್ವೇಶ್ವರಯ್ಯ ತಾಂತ್ರಿಕ ವಿಶ್ವವಿದ್ಯಾಲಯ (VTU), ಬೆಳಗಾವಿ', …}` | ASCII braces/quotes | kn.json | Python-repr dict stored as display string | High if rendered/spoken verbatim |
| admissions_and_fees.fee_structures.ug_management | `{'CSE': '₹3,25,000', …}` | same | kn.json | same | High |
| admissions_and_fees.fee_structures.pg_mba | `{'General MBA': '₹1,55,000-3,10,000 …'}` | same | kn.json | same | High |
| campus_units.* (112 strings) | `…— SAMPLE_REPLACE_WITH_OFFICIAL` / `(ಮಾದರಿ)` | ASCII marker | kn.json | placeholder sentinel in user text | Medium-High (spoken aloud) |
| leadership[2].name | `ಸ್ಥಾಪಕ/ಕುಲಾಧಿಪತಿ: ಪ್ರೊ. ಎಂ. ಆರ್. ಹೊಳ್ಳ — 50+ …` | slash+colon+em-dash composite | kn.json | role+name+bio packed in one `name` field; inconsistent with other rows | Medium (layout/narration oddity) |
| inst.additional_details.tagline | `"\"ನಾಯಕತ್ವವನ್ನು ಕಲಿಯಿರಿ\""` | escaped ASCII quotes | kn.json | double-escaped quotes | Low-Medium |

Classification: **mechanically invalid: 0** · **mechanically suspicious: 116** (3 repr-dicts + 112 sentinels + tagline quoting) · **linguistically unverified: all** (no native sign-off exists anywhere in the repo).

## 10. Spelling and terminology consistency (K0.9)

| Concept | Existing Kannada variants | Files | Display usage | Narration usage | Consistent? | Native approval required? |
|---|---|---|---|---|---|---|
| Welcome | ಕ್ಯಾಂಪಸ್‌ಗೆ ಸುಸ್ವಾಗತ (only variant) | LanguageContext | yes | no | Yes | Yes |
| Select language | ಭಾಷೆಯನ್ನು ಆರಿಸಿ | LanguageContext | yes | no | Yes | Yes |
| Department | ವಿಭಾಗ | throughout (templates, narration, vocab) | yes | yes | Yes | Yes |
| Head of Department | ಮುಖ್ಯಸ್ಥರು / ಮುಖ್ಯಸ್ಥ / ವಿಭಾಗದ ಮುಖ್ಯಸ್ಥರು (+STT ಹೋಡ್, ಹೆಡ್, ಹೆಚ್ಒಡಿ, ಹೆಚ್ಓಡಿ, ವಿಭಾಗದ ಹೆಡ್) | catalog.py:46–54, templates, narration | yes | yes | Yes (deliberate alias family) | Yes |
| Fees | ಶುಲ್ಕ / ಶುಲ್ಕಗಳು / ಫೀಸ್ | catalog:32–34, kn.json | yes | yes | Yes (ಫೀಸ್ is common loanword) | Yes |
| Admission | ಪ್ರವೇಶ / ಪ್ರವೇಶ ಪರೀಕ್ಷೆಗಳು / ಅರ್ಜಿ forms vary | kn.json, narration_plan | yes | yes | Broadly yes | Yes |
| Eligibility | ಅರ್ಹತೆ | narration_plan:853 | yes | yes | Yes | Yes |
| Documents | ದಾಖಲಾತಿಗಳು (ಅಗತ್ಯವಿರುವ ದಾಖಲಾತಿಗಳು) | narration_plan:207–271 | yes | yes | Yes | Yes |
| Placement | ಪ್ಲೇಸ್‌ಮೆಂಟ್ (ZWJ) / ಪ್ಲೇಸ್ಮೆಂಟ್ / ಉದ್ಯೋಗಾವಕಾಶ | catalog:75–77 | yes | yes | Yes (both ZWJ spellings enumerated deliberately) | Yes |
| Achievement | cue ಸಾಧನ vs canonical copy ಸಾಧನೆಗಳು | catalog:85 vs kannada_terms.py:17, narration:117 | copy uses ಸಾಧನೆಗಳು | lead uses ಸಾಧನೆಗಳು | **Stem/cue mismatch (Q3, Phase-1 review)** | **Yes — decide parsing vs display term** |
| Facility | ಸೌಲಭ್ಯಗಳು | kn.json, vocab | yes | yes | Yes | Yes |
| Campus | ಕ್ಯಾಂಪಸ್ | kn.json, LanguageContext | yes | yes | Yes | Yes |
| Library | ಗ್ರಂಥಾಲಯ | kn.json infrastructure | yes | yes | Yes | Yes |
| Hostel | ಹಾಸ್ಟೆಲ್ (ಹುಡುಗಿಯರ/ಹುಡುಗರ) | kn.json, campus_unit_locale | yes | yes | Yes | Yes |
| Transport | (bus) ಬಸ್ ಮಾರ್ಗಗಳು class | answer_generation bus cues | yes | yes | Partially (legacy-only vocabulary) | Yes |
| Scholarship | ವಿದ್ಯಾರ್ಥಿವೇತನ | kn.json, narration slides | yes | yes | Yes | Yes |
| Contact | ಸಂಪರ್ಕ | collegeLocaleUtils etc. | yes | limited | Yes | Yes |
| Thank you | (no dedicated string found) | — | — | — | **Missing** | Yes |
| Please clarify / Which department? | ನೀವು ಯಾವ ವಿಭಾಗದ ಬಗ್ಗೆ ತಿಳಿಯಲು ಬಯಸುತ್ತೀರಿ? | templates:58 | yes | yes | Yes | Yes |
| CSE (dept) | ಕಂಪ್ಯೂಟರ್ ವಿಜ್ಞಾನ ಮತ್ತು ಎಂಜಿನಿಯರಿಂಗ್ (kn.json, narration `_DEPT_DISPLAY` uses short form ಕಂಪ್ಯೂಟರ್ ಸೈನ್ಸ್ (CSE)) **vs** ಪರಿಗಣಕ ವಿಜ್ಞಾನ ಮತ್ತು ಎಂಜಿನಿಯರಿಂಗ್ (CSECard.tsx:36) | kn.json vs frontend card | conflicting display | conflicting label | **NO — genuine synonym conflict** | **Yes** |
| Cyber security | ಸೈಬರ್ ಭದ್ರತೆ (kn.json display) vs ಸೈಬರ್ ಸೆಕ್ಯುರಿಟಿ (catalog alias, `_DEPT_DISPLAY`) | kn.json vs catalog | conflicting | conflicting | **NO — displayed word is NOT parseable** (echo-the-screen failure mode, mirrors hi प्रमुख issue) | **Yes** |
| AI&ML dept | CSE (AI & ML) Latin prefix retained in kn `department_name` | kn.json role_holders | yes | yes | Consistent with policy | Yes |
| MBA | ಮಾಸ್ಟರ್ ಆಫ್ ಬಿಸಿನೆಸ್ ಅಡ್ಮಿನಿಸ್ಟ್ರೇಷನ್ / MBA (MBA) redundant `_DEPT_DISPLAY` entry / ಎಂ.ಬಿ.ಎ menu label (frontend only, unparsed) | kn.json, narration_plan:82, LanguageContext:318 | conflicting | conflicting | **NO** | **Yes** |
| Basic sciences depts | Mathematics/Physics/Chemistry left English inside kn fields | kn.json | yes | yes | English fallback | Yes |

No authoritative repo source establishes a single glossary; all disagreements above are flagged for native review, none corrected here.

## 11. Display punctuation findings (K0.10)

Observed usage across kn display strings:

- **Full stop (ASCII `.`)** dominates sentence ends in kn.json prose and all narration templates; **danda `।`/`॥` appear nowhere in stored display content** (they exist only in test fixtures and sanitizer tests). One convention, consistently applied — though whether ASCII periods are the *desired* Kannada convention is a linguistic/product question.
- Question mark: ASCII `?` used (clarify templates). Comma: ASCII `,` in enumerations; Kannada-list contexts sometimes use `ಮತ್ತು` instead. Colon: used inside `leadership[2]` and address strings. Semicolon: one occurrence (scholarships). Parentheses: balanced everywhere; used for loanwords/acronyms `(SVIT)`, `(ಮಾದರಿ)`.
- Hyphen/slash: `/ವರ್ಷ`, SC/ST, `ಖಾಸಗಿ/ಮ್ಯಾನೇಜ್‌ಮೆಂಟ್`, hyphenated loans (ಪೋಸ್ಟ್-ಮೆಟ್ರಿಕ್) — consistent.
- Ellipsis: ASCII `...` in UI indicators (ಆಲಿಸಲಾಗುತ್ತಿದೆ...) — fine for chrome.
- ₹ values: consistent format `₹3,25,000` Indian digit grouping; ranges use ASCII hyphen `₹1,55,000-3,10,000` (an en-dash would be preferable; cosmetic). Percentages: `45%`, `40%`. Dates: mixed formats (`2008`, `NEP-2020`; no dd/mm strings found in kn content). Phone/contact: none stored.
- Em dash `—` used heavily in campus-unit titles/points (`ಹಾಸ್ಟೆಲ್ — ಕೊಠಡಿಗಳು`) and core values — consistent.
- Inconsistencies found: fee strings embed pipe tables (`KCET: … | ನಿರ್ವಹಣೆ: …`) — table syntax inside prose; repr-dict strings (§9); leadership[2] colon-composite; ASCII quotes vs none around mottos.

Recommended policy 1 (display, pending native approval): retain ASCII terminal punctuation OR migrate prose to danda — **decide once, apply everywhere**; standardize ₹ range separator; forbid pipe-table/repr syntax in display values; require balanced typographic quotes for mottos.

## 12. Narration punctuation findings (K0.12 input / K0.10b)

Narration sources mix three shapes: template sentences ending `.` (unit_narration), lead+body concatenations (fees: `"…ಶುಲ್ಕ." + body-without-final-period` risk), and slide-caption words without terminals (ಅರ್ಹತೆ). Sentence splitting downstream (`split_tts_chunks`, T0 §7.1) splits on `. ! ? । |` + whitespace — so ASCII periods currently drive chunking; introducing danda would also be handled (`।` is supported). The T1 sanitizer normalizes repeated `।{2,}→।`, `॥{2,}→॥`, pulls punctuation onto preceding tokens, and preserves both dandas — narration-safe.

Recommended policy 2 (TTS narration, pending native approval): one sentence = one terminal mark; prefer whichever mark the display policy chooses (keep display and narration identical to avoid display/narration divergence); keep ASCII commas for clause pauses (Sarvam handles them); never emit pipe tables/reprs to TTS (sanitizer strips embedded objects, but prevention beats sanitization).

## 13. Display/narration synchronization (K0.11)

| Unit | Display | Narration | Verdict |
|---|---|---|---|
| CSE overview | kn.json intro | speaks clipped intro body | Same text, truncated (T0 clipping risk) — synchronized wording |
| CSE HOD | Kannada-script bio (ಡಾ. ಶಶಿಕುಮಾರ್ ಡಿ ಆರ್ via hod_voice) + Latin hod_name on card | template inserts **Latin** hod_name | **Contradiction: different scripts/names between card and speech** |
| AIML HOD | same pattern | same | same contradiction |
| CSE/AIML fees | ₹3,50,000/ವರ್ಷ (departments.*) | lead + clipped body (same ₹3,50,000) | Internally synced, **but contradicts ug_management/₹3,25,000 surfaces** |
| Admissions | slides captions kn | captions spoken | Synced |
| Placements | placements_and_training kn | slide captions kn | Synced |
| Multi-card | upstream unit order | one clip per segment in order | Order preserved; no duplication (consecutive dedupe only) |
| Campus units | titles/bodies with sentinels | tts_summary with sentinels | Synced — including the contamination |

Missing narration: none for registered units. English narration for Kannada display occurs only via the fallback vectors listed in §14. Kannada narration for English display was not found.

## 14. Provider and voice mapping (K0.12)

From actual configuration (settings.py:28–46, 334–351; provider_clients.py:128–199):

| App language | App code | Provider | Provider locale | Voice ID | Fallback provider | Fallback locale | Fallback voice |
|---|---|---|---|---|---|---|---|
| Kannada | `kn` (code_key) → `kn-IN` (TARGET_LANGUAGE_CODES) | Sarvam `bulbul:v3` (HTTP + SDK fallback) | `kn-IN` | `SARVAM_TTS_SPEAKER` env, default **`simran`** | none (same provider retry) | **`en-IN` on eligible failures** (allow_english_fallback) | same speaker `simran` |
| (context) English | en → en-IN | Sarvam bulbul:v3 | en-IN | simran | none | — | — |
| Pace | — | SARVAM_TTS_PACE env, default **1.25** (settings.py:33–38; T0 runtime observation recorded 1.15 — env-dependent) | | | | | |

Verified behaviours:

- Cache keys include language + speaker + pace + model + normalized text (`tts_cache_material`, tts_orchestrator.py:111–121) — an English cache item cannot be returned for a kn request.
- en-IN retry exists for ordinary answers/greetings (main.py:772–802); fallback audio is **never cached**; unit-backed card bundles disable it (`allow_english_fallback=False`, main.py:2452). So yes — fallback **can silently switch to en-IN** for non-card turns.
- Unsupported Kannada (e.g., total provider failure after retries) fails explicitly-ish: returns no audio; UI settles audioPending (per T0 §audio-states) but no Kannada-specific error message exists.
- Selected kn reaches every reply-TTS call site (first-sentence, streamed chunks, backup, single-shot — all use the turn-resolved `lang_code`). Exception: `campus_navigation_tts` collapses missing/invalid language to English (main.py:3297–3300) and the campus-route fetch always sends `'en'`.

## 15. English and cross-language fallback paths (K0.14)

| Trigger | Source file/function | Intended language | Actual fallback | User-visible result | Severity |
|---|---|---|---|---|---|
| kn-IN provider failure (non-card turn) | main.py:772–802 | kn-IN audio | **en-IN audio, same Kannada text** | Kannada text read with wrong voice/locale | High |
| Fresh-session voice input (mic before pick) | main.py:3563; language_detection.py:130–132 | selected/auto | `latin_fallback → en`, pinned | Session locked English despite Kannada intent | High |
| Unknown HOD dept under CARD authority | main.py:1793,1796 | kn | hardcoded English "Please specify the department…" | English bubble+narration mid-kn-session | Medium |
| Errors / STT failure / invalid payload | main.py:2862+, 3525+, 3167+ | kn | hardcoded English | English error text | Medium |
| Locale pack unreadable | answer_generation.py:90–105; narration_plan.py:1174,1237–1262 | kn | `{}` ⇒ English literals/cards | English cards | Low (file always present today) |
| Template `.get(lk, English)` | unit_narration.py:71–155 | kn | English sentence | mixed-language narration | Low |
| FAQ answers | faq_answers.py:55 | kn | `answers.get("English")` | English answer | Low (kn complete today) |
| RAG corpus | rag.py:88–127 | en-canonical rows | multilingual embeddings + kn locale evidence | possible English-leaning synthesis | Medium (model-dependent) |
| Card localization looks-English, no translator | card_localization.py:52–59 | kn | fail-closed → FULL_TEXT+Groq degradation | text-only, possibly English reply | Medium |
| Campus navigation TTS | main.py:3297–3300 | kn | coerced English on bad name | English narration | Low |
| Cross-language false positives (global matching) | catalog global scan | kn | te సాధన-class aliases fire in kn text? — te-specific; kn analogues: ಹೆಡ್/ಸಾಧನ substring breadth | occasional wrong-topic card | Medium |
| Playback fallback | autoplay rejection | — | clip marked failed, not retried | silent narration loss | Medium (language-neutral) |
| Cached cross-language audio | impossible | — | cache keys language-scoped | none | N/A |

## 16. Kannada TTS integrity risks (K0.13)

From T0 + current code, Kannada-specific status:

| Issue | Status for kn | Note |
|---|---|---|
| Raw code-point chunking splits virama clusters (ಕ್ಷ class) | **Confirmed** (T0 reproduced for all five scripts incl. kn; unchanged in T1) | tts_chunking.py untouched |
| Broken grapheme ⇒ garbled word mid-chunk | Confirmed mechanism | same |
| Lost spaces at chunk boundaries | Possible (strip per slice) | |
| Repeated/reordered chunks | Not applicable (order-preserving concat) | |
| Sarvam multi-WAV concatenation without header repair | **Confirmed** (provider_clients `_parse_sarvam_audio` + SDK copy unchanged) | truncation/stutter |
| WAV length-header validation gap | Confirmed (frontend validator checks prefix only) | |
| Cache collisions across language | Not applicable (keys language-scoped) | |
| Duplicate TTS requests | Mitigated (singleflight per key) | |
| Primary/en-IN overlap | Confirmed path (sequential, but wrong-language outcome) | §15 |
| ACK/response overlap | Possible (independent ACK player, T0 §9.1) | language-neutral |
| WebSocket send-lock timeout ⇒ unordered sends | Confirmed code path (250 ms) | language-neutral |
| Duplicate narration events (interim+final transport) | Confirmed transport duplication; client dedupes by sequence | |
| Multiple audio owners | Confirmed design gap (scheduler vs legacy refs) | |
| New-query stale audio | Mitigated (generation fences); orb interrupt lacks explicit scheduler.cancel | Requires runtime repro |
| Card navigation during speech | Confirmed dual-PLAYING possibility (T0 §9.3) | |
| Strict Mode duplicate effects | Mitigated (singleton socket; conversation_started deduped) | Requires browser repro |
| Kiosk autoplay restrictions | Confirmed gap (failed clip not gesture-retriable) | Requires kiosk repro |

## 17. Root causes (consolidated, ranked)

1. **RC1 — Ephemeral language session** (no persistence; reconnect/refresh/Back-vs-Home inconsistency; mic-path gate skip). Files: main.py:3141, outboundCommandDispatcher flush, App.tsx reset choreography, useSpeechRecognition.
2. **RC2 — Wrong-language TTS fallback** (en-IN retry with Kannada text). Files: main.py:769–802.
3. **RC3 — Spoken-English pre-selection welcome + delayed picker**. Files: greetings.py:21–29, main.py:3327–3360, ChatScreen:1334–1366.
4. **RC4 — Contradictory Kannada fee data across surfaces**. Files: kn.json (departments.*.fees vs fee_structures.*), narration_plan._FEES_AMOUNT_BY_KEY, frontend/src/data/locales/kn.json, DocumentsBlock/DepartmentFeesCard duplicates.
5. **RC5 — Non-prose stored display values** (repr dicts ×3; 112 SAMPLE sentinels reaching cards and TTS). Files: kn.json.
6. RC6 — Hardcoded English replies bypassing localization (main.py error/HOD prompts).
7. RC7 — Terminology drift between display and parser vocabulary (ಸೈಬರ್ ಭದ್ರತೆ unparsed; ಪರಿಗಣಕ vs ಕಂಪ್ಯೂಟರ್; ಸಾಧನ stem; MBA/basic_sciences zero kn recognition).
8. RC8 — Grapheme-unsafe chunking + malformed multi-WAV assembly damaging spoken Kannada (T0 P0s, deferred to T3/T3.1).
9. RC9 — HOD name script mismatch card vs narration (Latin name in kn template).
10. RC10 — Triplicated Kannada data copies (comparison JSONs ×3, exec profiles ×2, static decks ×2, orphaned frontend locale) guaranteeing future drift.

## 18. Files likely requiring changes (K1–K8)

- K1: frontend/src/context/LanguageContext.tsx, hooks/useWebSocket.ts + lib/ws/outboundCommandDispatcher.ts (resend language on reconnect), App.tsx/hardResetTransaction.ts (Back-vs-Home semantics), main.py (session restore hook / accept language on reconnect), useSpeechRecognition.ts (gate mic before pick).
- K2: backend/data/locales/kn.json (repr dicts, sentinels, fee reconciliation), frontend/src/lib/cardData.ts, DepartmentCards/*, DocumentsBlock.tsx, DepartmentFeesCard.tsx, executiveLeadershipLocale.ts, comparison JSONs (dedupe to single source), delete/sync frontend/src/data/locales/.
- K3: services/content/unit_narration.py, narration_plan.py, main.py hardcoded English replies, greetings.py, conversation/templates.py.
- T2: main.py (remove en-IN regional retry), config/settings.py (voice matrix).
- T3/T3.1: tts_chunking.py, narration_plan._clip_caption callers, provider_clients._parse_sarvam_audio, frontend audioValidation.
- T4/T5/T6: frontend tts scheduler/ChatScreen/ackAudio/useWebSocket; main.py retry counters.
- K7/K8: new backend/tests/test_kannada_slice.py family + Playwright kn specs + REGIONAL validation doc.

## 19. Automated test plan (K0.15 — designs only, not implemented)

| # | Test | Layer | Input | Expected units | Display lang | Narration lang | Provider locale | Playback | Likely file |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Sleep→tap wakes once | FE unit | pointerdown ×2 | — | — | — | — | — | sleepScreen.test.tsx |
| 2 | Welcome timing (visual-only pre-selection) | BE+FE | conversation_started, no lang | — | en visual | **none spoken** | none | no audio | test_language_gate.py + FE |
| 3 | Six options exactly | FE unit | render gate | — | — | — | — | — | languageGate.spec.ts |
| 4 | ಕನ್ನಡ button → canonical `kn` | BE integration | language_selected Kannada | — | — | — | — | — | test_session_language.py |
| 5 | kn persists 3 turns | BE | 3× user_message | — | kn | kn | kn-IN | — | test_kannada_slice.py |
| 6 | kn survives reconnect | E2E | kill+reopen WS, resend session token/lang | — | kn | kn | kn-IN | — | reconnect.spec.ts |
| 7 | New session resets predictably | BE | reset_session | — | gate again | — | — | — | test_session_language.py |
| 8 | Explicit change kn→hi | BE+FE | language_selected mid-session | — | hi | hi | hi-IN | old audio cancelled | FE spec |
| 9/10 | kn clarify display+narration | BE | ಶುಲ್ಕ ಎಷ್ಟು | () CLARIFY | templates kn | kn | kn-IN | — | test_phase1 suite extension |
| 11–16 | CSE/AIML ×overview/hod/fees | BE | native phrases | exact unit tuples | kn.json | kn templates | kn-IN | — | test_kannada_units.py |
| 17/18 | admissions / placements | BE | kn phrases | admissions card / placements | kn | kn | kn-IN | — | same |
| 19/20 | unknown/missing dept + fees | BE | ಕ್ವಾಂಟಮ್ ವಿಭಾಗ ಶುಲ್ಕ / ಶುಲ್ಕ ಎಷ್ಟು | CLARIFY | kn | kn | — | — | existing (green) + guard pin |
| 21 | kn multi-card order | BE | 3-dept phrase | ordered tuple, no dupes | kn | ordered clips | kn-IN | — | phase1 pattern |
| 22 | kn anaphora (ಅದರ ಶುಲ್ಕ) | BE | turn2 after CSE | (cse.fees,) | kn | kn | kn-IN | — | anaphora suite |
| 23/24 | No unintended English in display/narration | BE+scan | full kn corpus replay | — | assert script ratio + no EN fallback constants | same | — | — | test_kannada_localization_parity.py |
| 25 | kn-IN on every provider call | BE | kn turn | — | — | — | spy target_language_code == kn-IN | — | test_provider_boundary ext |
| 26 | No en-IN fallback for kn cards (and eventually all kn) | BE | failing provider mock | — | — | — | assert no en-IN call | — | same |
| 27 | Sanitizer byte-exact kn preservation | BE | REGIONAL_SAMPLES + joiner cases | — | — | sanitized == input | — | — | test_tts_text_contract (exists) |
| 28 | Grapheme-safe chunk reconstruction | BE | kn virama corpus | — | — | chunks rejoin exactly, no cluster heads split | — | — | test_tts_chunking (future T3) |
| 29 | Valid multi-part WAV | BE+FE | forced multi-audio response | — | — | — | — | RIFF lengths valid | T3.1 tests |
| 30 | Single playback owner | FE | response+ACK+nav | — | — | — | — | ≤1 playing element | scheduler tests |
| 31 | New-query cancellation | FE | interrupt mid-narration | — | — | — | — | old clip stops, gen fence | low-latency tests |
| 32 | Duplicate-event suppression | FE | replay assistant_audio_update | — | — | — | — | plays once | scheduler tests |
| 33 | Refresh → language gate again (or restored, per K1 decision) | E2E | reload | — | per K1 policy | — | — | — | kiosk.spec.ts |
| 34 | Timeout reset | E2E | idle 240 s | — | sleep + English context | — | — | — | App test |
| 35 | Physical kiosk autoplay | Manual/E2E | gesture/no-gesture paths | — | — | — | — | unmute hint / gesture retry | device checklist |

## 20. Native-speaker review worksheet (K0.16)

Reviewer decision / corrected columns intentionally blank. (D = display, N = narration.)

| ID | Context | English meaning/source | Current kn display | Current kn narration | Reviewer decision | Corrected display | Corrected narration | Notes |
|---|---|---|---|---|---|---|---|---|
| KN-001 | Pre-selection greeting | Good morning/afternoon/evening. I am CLARA, your campus assistant. | (shown in English) | — (policy: suppress or localize?) | | | | Policy §4 |
| KN-002 | Language nudge | Please choose the language that feels most comfortable. | (English) | — | | | | |
| KN-003 | Gate heading | Select Language | ಭಾಷೆಯನ್ನು ಆರಿಸಿ | — | | | | |
| KN-004 | Post-pick greeting (3 variants) | Good morning/afternoon/evening… | ಶುಭೋದಯ / ಶುಭ ಮಧ್ಯಾಹ್ನ / ಶುಭ ಸಂಜೆ. ನಾನು ಕ್ಲಾರಾ, ನಿಮ್ಮ ಕ್ಯಾಂಪಸ್ ಸಹಾಯಕಿ. | same | | | | ಸಹಾಯಕಿ (feminine) intended? |
| KN-005 | Name ack | Nice to meet you, {name} | ನಿಮ್ಮನ್ನು ಭೇಟಿಯಾಗಿ ಸಂತೋಷ, {name} | same | | | | |
| KN-006 | Generic clarify | What would you like help with? | ನೀವು ಯಾವ ವಿಷಯದಲ್ಲಿ ಸಹಾಯ ಬೇಕು ಎಂದು ಸ್ವಲ್ಪ ಹೆಚ್ಚು ಹೇಳುತ್ತೀರಾ? | same | | | | phrasing naturalness |
| KN-007 | Dept clarify | Which department…? | ನೀವು ಯಾವ ವಿಭಾಗದ ಬಗ್ಗೆ ತಿಳಿಯಲು ಬಯಸುತ್ತೀರಿ? | same | | | | |
| KN-008 | Hostel clarify | girls' or boys' hostel? | ನೀವು ಹುಡುಗಿಯರ ಹಾಸ್ಟೆಲ್ ಅಥವಾ ಹುಡುಗರ ಹಾಸ್ಟೆಲ್ ಬಗ್ಗೆ ಕೇಳುತ್ತಿದ್ದೀರಾ? | same | | | | |
| KN-009 | Greeting alt | Welcome! How can I help? | ನಮಸ್ಕಾರ! CLARAಗೆ ಸ್ವಾಗತ. ಇಂದು ನಾನು ಹೇಗೆ ಸಹಾಯ ಮಾಡಬಹುದು? | same | | | | |
| KN-010 | Off-domain fallback | Sorry, I can't confirm that now. | ಕ್ಷಮಿಸಿ, ಆ ಮಾಹಿತಿಯನ್ನು ಈಗ ಖಚಿತಪಡಿಸಲು ನನಗೆ ಸಾಧ್ಯವಾಗುತ್ತಿಲ್ಲ. | same | | | | |
| KN-011..021 | HOD narration ×11 depts | {Dept} HOD is {name}. | (card bio in kn script) | {dept_label} ವಿಭಾಗದ ಮುಖ್ಯಸ್ಥರು {Latin name} ಅವರು. | | | | Script mismatch RC9 |
| KN-022..032 | Dept names ×11 | CSE / AI&ML / DS / ISE / ECE / Civil / Mech / MBA / Math / Phys / Chem | ಕಂಪ್ಯೂಟರ್ ವಿಜ್ಞಾನ ಮತ್ತು ಎಂಜಿನಿಯರಿಂಗ್; CSE (AI & ML); CSE (ಡೇಟಾ ಸೈನ್ಸ್); ಮಾಹಿತಿ ವಿಜ್ಞಾನ; ಎಲೆಕ್ಟ್ರಾನಿಕ್ಸ್ ಮತ್ತು ಸಂವಹನ; ಸಿವಿಲ್ ಇಂಜಿನಿಯರಿಂಗ್; ಮೆಕ್ಯಾನಿಕಲ್ ಇಂಜಿನಿಯರಿಂಗ್; ಮಾಸ್ಟರ್ ಆಫ್ ಬಿಸಿನೆಸ್ ಅಡ್ಮಿನಿಸ್ಟ್ರೇಷನ್; Mathematics; Physics; Chemistry | _DEPT_DISPLAY variants (incl. "MBA (MBA)") | | | | Confirm canon; fix math/phys/chem |
| KN-033/034 | Fees leads | {Dept} fees. | — | {dept} ಶುಲ್ಕ. / ಶುಲ್ಕದ ವಿವರಗಳು | | | | |
| KN-035..041 | Fee values ×7 conflicting | annual mgmt fees | ₹3,50,000 vs ₹3,25,000 etc. (cse, aiml, ds, ece, civil, mech, ISE-missing) | spoken from body | | | | Data truth first (RC4) |
| KN-042 | Admissions captions | Eligibility / Entrance exams / UG fees / MBA fees / Scholarships | ಅರ್ಹತೆ / ಪ್ರವೇಶ ಪರೀಕ್ಷೆಗಳು / ಯುಜಿ ಶುಲ್ಕ (ಉಲ್ಲೇಖ) / MBA / ಪಿಜಿ ಶುಲ್ಕ / ವಿದ್ಯಾರ್ಥಿವೇತನಗಳು | same | | | | |
| KN-043 | Documents title | Required documents | ಅಗತ್ಯವಿರುವ ದಾಖಲಾತಿಗಳು (+10 item names) | same | | | | |
| KN-044 | Placements captions | Objectives / Training programs / Summary | ತರಬೇತಿ ಮತ್ತು ಪ್ಲೇಸ್‌ಮೆಂಟ್ ಉದ್ದೇಶಗಳು / ತರಬೇತಿ ಕಾರ್ಯಕ್ರಮಗಳು / ಸಂಕ್ಷಿಪ್ತ ನೋಟ | same | | | | |
| KN-045 | Principal narration | Principal is {name} | ಪ್ರಾಂಶುಪಾಲರು card | ಸಾಯಿ ವಿದ್ಯಾ ಇನ್‌ಸ್ಟಿಟ್ಯೂಟ್ ಆಫ್ ಟೆಕ್ನಾಲಜಿಯ ಪ್ರಾಂಶುಪಾಲರು ಡಾ. ಮಂಜುನಾಥ್ ಟಿ ಎನ್ ಅವರು. | | | | |
| KN-046 | Vice-principal | Vice principal & academic dean | ಉಪ ಪ್ರಾಂಶುಪಾಲರು ಹಾಗೂ ಶೈಕ್ಷಣಿಕ ಡೀನ್ | matching template | | | | |
| KN-047..053 | Trustees ×7 | trustee summaries | display_name/designation/description kn | tts_summary kn | | | | |
| KN-054 | Cyber security naming | Cyber Security | ಸೈಬರ್ ಭದ್ರತೆ (display) vs ಸೈಬರ್ ಸೆಕ್ಯುರಿಟಿ (parser) | — | | | | Echo-the-screen failure; align |
| KN-055 | CSE synonym | Computer Science | ಕಂಪ್ಯೂಟರ್ ವಿಜ್ಞಾನ vs ಪರಿಗಣಕ ವಿಜ್ಞಾನ (CSECard) | — | | | | Pick one |
| KN-056 | Achievements | achievements | ಸಾಧನೆಗಳು (copy) vs ಸಾಧನ (cue) | lead ಸಾಧನೆಗಳು. | | | | Decide parsing term |
| KN-057..168 | Campus units ×28 (title/body/tts_summary/points) | hostel/canteen/events copy | contains SAMPLE_REPLACE_WITH_OFFICIAL/(ಮಾದರಿ) | same, spoken | | | | Replace with official copy |
| KN-169..246 | FAQ ×39 Q&A | FAQ set | questions.Kannada / answers.Kannada (78 strings) | spoken on FAQ answers | | | | Spot-check all |
| KN-247..286 | UI chrome ~40 | listening/thinking/etc. | LanguageContext kn column | indicators unspoken | | | | |
| KN-287..326 | Comparison labels/cells | comparison copy ×3 copies | row_labels.kn + cells | partially spoken | | | | Dedupe source first |
| KN-327 | Dynamic ANSWER replies | free-form answers | model-generated kn | model-generated kn | | | | Sample 10 live turns |
| KN-328 | Thank-you/session end | — | none found | none found | | | | Add string? |

## 21. Recommended phased implementation (K0.17)

| Phase | Objective | Likely files | Tests | Dependencies | Risks | Definition of done |
|---|---|---|---|---|---|---|
| **K1** | Authoritative, persistent language-selection state; single canonical code (`kn`-style code_key) at boundaries; reconnect/refresh/Back semantics defined; gate the mic path | LanguageContext.tsx, useWebSocket.ts, outboundCommandDispatcher.ts, App.tsx, hardResetTransaction.ts, session_language.py, main.py (gate mic), ChatScreen:4323 fix | Tests 1–8 above; LOCALE_CHANGE_BLOCKED UX message | none | Changing reset semantics may surprise existing e2e specs | Selection survives reconnect + refresh (or documented deliberate reset); one code spelling end-to-end; mic cannot pin `en` pre-pick |
| **K2** | Native-approved glossary + cleaned display content; reconcile fees; remove repr dicts/sentinels from display surfaces; dedupe triplicated copies | kn.json, cardData.ts, DepartmentCards/*, comparison JSONs, DocumentsBlock, DepartmentFeesCard, delete orphan locale | Localization-parity scan (#23), fee-value consistency test | Native review (worksheet §20) returned | Content edits shift pinned card snapshots | 0 repr/sentinel strings rendered; fee values agree across all surfaces; glossary committed |
| **K3** | Kannada narration consistency; localize remaining English replies; fix HOD name script | unit_narration.py, narration_plan.py, main.py hardcoded replies, greetings.py, templates.py | Tests 9/10, 23/24; HOD script assertion | K2 glossary | Narration wording changes affect cached audio (invalidate cache) | No hardcoded English replies under kn session; display↔narration name/script parity |
| **T2** | Provider/voice enforcement: remove en-IN regional retry, explicit failure, per-language voice matrix | main.py:769–802, settings.py | Tests 25/26 | K1 | Failed kn turns become silent — needs explicit user-facing failure message (K3) | No wrong-language audio possible; explicit failure surfaced |
| **T3/T3.1** | Grapheme-safe chunking; valid WAV assembly | tts_chunking.py, _clip_caption callers, provider_clients._parse_sarvam_audio, audioValidation.ts | Tests 28/29 | none (parallel to K phases) | Chunk-boundary change alters all cached audio | Property tests: reconstruction exact; no chunk starts with combining mark; valid RIFF lengths |
| **T4** | Single-owner playback | frontend scheduler/ChatScreen/ackAudio | Tests 30/32 | none | Large frontend refactor | One arbiter; no overlap paths |
| **T5** | Cancellation/stale protection | useWebSocket, scheduler, main.py | Test 31 | T4 | — | Orb interrupt explicitly cancels; late assets rejected by ID/gen |
| **T6** | Retry/fallback safety + accurate counters | main.py, provider_clients | provider-attempt metrics test | T2 | — | Counters reflect external attempts; no completed-item replay |
| **K7** | Automated Kannada verification suite | new test_kannada_* files, CI wiring | All of §19 automatable rows | K1–K3, T2/T3 | Suite brittleness vs content edits | Full §19 automated set green in CI |
| **K8** | Native-speaker + physical kiosk validation | REGIONAL_KANNADA_AUDIO_VALIDATION.md, kiosk checklist | Manual protocol (T0 §15) | T4–T6, K2/K3 sign-off | Findings may loop back | Signed worksheet + recorded kiosk runs per phrase |

## 22. Changes that must not be made

1. Do **not** create per-language unit selectors or duplicate business logic — the canonical registry + semantic stack stays the single selector (architectural rule).
2. Do **not** make translated display text a routing identity (department/topic ids stay canonical json keys).
3. Do **not** let auto-detect overwrite an explicit pick, and do not weaken the freeze contract.
4. Do **not** replace ASCII punctuation globally with danda (or vice versa) without native approval — mark for reviewer decision.
5. Do **not** silently "correct" any Kannada string in this report's findings; all wording changes route through the native worksheet.
6. Do **not** remove the fee-without-department demotion in the legacy ladder (pinned golden contract) or weaken `_assert_card_contract` / phase1 assertions while fixing anything above.
7. Do **not** edit the six Codex-owned T1 files while K0-derived work begins; sanitizer changes land through Codex's active stream.
8. Do **not** invent voice identifiers or add providers not present in configuration (only Sarvam bulbul:v3 / simran exist).
9. Do **not** persist language in ways that leak across users on a shared kiosk without a privacy decision.

---

### K0 completion answers

- Does Kannada remain authoritative after selection? **Yes, within one connection** (explicit pick locks out auto-detect; freeze protects mid-turn). It does not survive reconnect/refresh (RC1).
- One canonical internal code? **Yes — `language_code_key` ("kn")**; recommend formalizing it as the sole spelling (three coexist today).
- Do kn requests map to canonical units? **Yes**, language-neutrally; kn vocabulary is the strongest regional set; gaps: MBA, basic_sciences, cyber-security display-word unparseable.
- Every card localized? Structurally yes (parity complete); substantively no (sentinels, repr-dicts, Latin names, math/phys/chem English, sleep-screen chrome English-only).
- Every narration localized? Mostly; English leaks via pre-selection welcome, error paths, template fallbacks, en-IN fallback voice.
- Where can English enter display/speech? §15 table (12 enumerated paths).
- Mechanically invalid strings? **0 hard-invalid; 116 suspicious** (3 repr-dicts, 112 sentinels, 1 quoting anomaly).
- Inconsistent spelling? 3 confirmed conflicts (CSE synonym, ಸೈಬರ್ ಭದ್ರತೆ, ಸಾಧನ/ಸಾಧನೆಗಳು) + MBA redundancy.
- Inconsistent punctuation? Convention is uniform (ASCII periods); open question whether that is the desired Kannada policy; anomalies: pipe-tables, repr syntax, quote styles.
- Requires native approval? Effectively the entire 469+ narration corpus; prioritized worksheet covers ~330 grouped rows.
- Actual provider/locale/voice? Sarvam `bulbul:v3`, `kn-IN`, speaker `simran` (env-overridable), pace default 1.25.
- Can fallback silently switch to en-IN? **Yes**, for non-card turns on primary failure (fallback audio uncached).
- Can chunking damage Kannada? **Confirmed** (raw code-point slicing breaks virama clusters; unchanged since T0).
- Can playback duplicate/overlap? Duplication suppressed by scheduler; overlap paths remain (ACK player, send-lock timeout, dual PLAYING states).
- Exact files for K1–K8? §18.

*End of K0 audit. Only this file was created.*
