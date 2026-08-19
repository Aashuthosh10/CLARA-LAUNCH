# M5.3 WebSocket outbound command lifecycle

Date: 15 Aug 2026  
HEAD at start: `0cc81fc` (`fix(ci): clear remaining frontend npm audit findings.`)  
M5.0–M5.3 uncommitted tree was preserved. No semantic / UnitSelector / PresentationEngine edits.

## 1. Original root cause

`sendMessage()` wrote to the socket only when `readyState === OPEN`. `wake` and `conversation_started` issued during CONNECTING were dropped. `retryConnect()` opened a new socket and did not replay them. Greeting and language picker never appeared.

## 2. Why the old architecture was wrong

Outbound delivery had no owner. App.tsx compensated with a one-shot rAF retry plus `retryConnect`. ChatScreen fired `conversation_started` once on mount. Those were competing, incomplete retries — not a command lifecycle. A replacement socket could not see the lost commands. Optimistic `setManualState(5)` was then overwritten by the backend hello `state: 0`, which also cleared the language gate.

## 3. New lifecycle architecture

UI intent → `sendMessage` → **one** `OutboundCommandDispatcher` (pending FIFO) → flush on **current** socket OPEN → server.

Socket create/replace stays in `useWebSocket`. The dispatcher only accepts, holds, flushes, or invalidates commands.

## 4. State machine

Connection (hook): DISCONNECTED / CONNECTING / OPEN / CLOSING / RECONNECTING.

Command: PENDING → SENT (marked before `socket.send`) or INVALIDATED (session epoch bump).

Wake in-flight: `wakeUnacked` until inbound state 3/4/5. Inbound `state: 0` is held while wake is unacked so hello-sleep cannot clobber the wake UI.

## 5. Ownership map

| Concern | Owner | Class |
| --- | --- | --- |
| Socket create / OPEN / reconnect | `useWebSocket` singleton | AUTHORITATIVE |
| Outbound enqueue / flush / coalesce / invalidate | `outboundCommandDispatcher` | AUTHORITATIVE |
| `sendMessage` | enqueue + flush current gen | AUTHORITATIVE API |
| `App.onWake` | `sendMessage({ action: 'wake' })` + UI route | CONSUMER |
| `ChatScreen` mount `conversation_started` | one `sendMessage` | CONSUMER |
| Offline banner `retryConnect` | socket replace only | CONSUMER |
| Removed rAF / `retryConnect` in `onWake` | — | COMPETING (removed) |

## 6. Files changed

- `frontend/src/lib/ws/outboundCommandDispatcher.ts` (new)
- `frontend/src/lib/ws/outboundCommandDispatcher.test.ts` (new, 13 tests)
- `frontend/src/hooks/useWebSocket.ts`
- `frontend/src/App.tsx`
- `frontend/src/session/hardResetTransaction.ts` (comment/return semantics)
- `frontend/e2e/m53-ws-lifecycle.spec.ts` (new)
- `frontend/e2e/m53-hod-identity.spec.ts` (language coverage + locator accuracy)

## 7. Old competing logic removed

- App.tsx `onWake` rAF second `wake` + `retryConnect`
- Drop-if-not-OPEN `sendMessage`
- No ChatScreen retry, no wake `setTimeout`, no second queue

`socket.send` exists only inside the dispatcher `flush`.

## 8. Unit tests

13/13 passed, including the ten required cases plus hold-sleep and SENT-before-send.

## 9. Live WS results

`docs/_m53_live_ws_six_lang.py`: **LIVE_WS_ALL_OK** — 18/18 (en/kn/hi/ta/te/ml × 1/2/3 HOD). Body-only localized `ttsText`. No mocks.

## 10. Browser E2E results

Lifecycle (`m53-ws-lifecycle.spec.ts`, no `installM52Socket`): **3/3 passed** (~13s)

- A. wake during CONNECTING → picker
- B. wake after OPEN → picker
- C. reconnect while CONNECTING → picker

HOD live browser (`m53-hod-identity.spec.ts`): **12/19 passed** on the full run.

Passed: English 1/2/3, Kannada 1/2, Hindi 1/2/3, Tamil 1/2, Telugu 1/2. Malayalam 1 passed on rerun.

Failed (not the CONNECTING drop; do not treat as dispatcher regressions):

- Kannada/Tamil/Telugu **three-HOD**: TTS `queueLength` stuck at 2 for 90s (clip 3 not on the wire). Owner: backend TTS streaming latency.
- New turn 3→1: card stayed `data-hod-count=3` after the single-HOD query. Owner: HOD presentation reset, not outbound WS.
- Malayalam 2/3: `queueLength` 0 after cards appeared. Owner: TTS queue fill, not command enqueue.

## 11. M5.2 regression

`e2e/m52-card-tts.spec.ts` (mocked socket): **8/8 passed**. Does not count as M5.3 acceptance.

`tsc --noEmit`: clean. Dispatcher Vitest: 13/13.

## 12. Multilingual regression

Semantic + WS content: 18/18 live WS. Browser cards: English and Hindi 1/2/3 proven; Kannada/Tamil/Telugu 1/2 proven; Malayalam 1 proven. Remaining gaps are TTS clip arrival / new-turn card identity, not language-specific dispatchers.

## 13. Remaining limitations

- **Transport:** logical exactly-once on the frontend. SENT commands are not resent if TCP dies after mark. No server ack.
- **New TCP after SENT wake:** backend session is empty; we do not replay SENT wake (avoids duplicate greeting). Reconnect-during-CONNECTING is covered (commands still PENDING).
- **3rd regional TTS clip** can exceed 90s under load.
- **New-turn HOD count** can remain at N after a 1-unit follow-up. Separate owner; not patched here.

## Change card (lifecycle)

**PROBLEM:** Wake/conversation_started lost while CONNECTING; picker never shown.  
**ROOT CAUSE:** No outbound command queue; drop-if-not-OPEN; competing rAF/retryConnect; hello `state: 0` cleared the language gate.  
**WHY OLD PATH WAS WRONG:** Retries were not the socket owner and did not survive replacement.  
**NEW DESIGN:** One dispatcher, sessionEpoch + logicalKey, socketGeneration flush guard, wake-unacked holds inbound sleep.  
**WHY PERMANENT:** Single owner; UI is a consumer; reconnect flushes PENDING without duplicating SENT.  
**WHAT WAS REMOVED:** rAF wake retry, onWake retryConnect, drop-if-not-OPEN send.  
**HOW TESTED:** 13 unit tests; live WS 18/18; lifecycle Playwright 3/3; HOD browser 12/19 with failures classified by owner.

**M5.3 ACCEPTANCE VERIFIED is not claimed.** Lifecycle CONNECTING/OPEN/reconnect picker path is proven. Full multilingual 1/2/3 HOD browser matrix is not complete until TTS clip-3 and new-turn card reset are owned and fixed separately.
