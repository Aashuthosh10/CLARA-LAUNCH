# M5.3 TTS + turn ownership — implementation baseline

**Date:** 16 Aug 2026  
**Branch:** `main`  
**HEAD:** `0cc81fc628b59e757b5044e61f0ca165f8762a1a` — `fix(ci): clear remaining frontend npm audit findings.`  
**Working tree:** Entire M5.0–M5.3 overlay uncommitted. Not cleaned. Not reverted.

## Runtime at freeze

| Process | Port | PID (listener) | Status |
|---|---|---|---|
| Backend Uvicorn | 6969 | 15696 | Listen |
| Frontend Vite | 5176 | 28628 | Listen |

## Historical evidence (not re-run at this freeze)

| Probe | Result | Class |
|---|---|---|
| Live WS six-lang unitIds + ttsText | 18/18 (does not count clip frames) | PARTIALLY PROVEN for N clips |
| Browser HOD identity | 12/19 (15 Aug) | kn/ta/te 3-HOD q=2; ml 2/3 q=0; 3→1 stayed 3 |
| WS lifecycle E2E | 3/3 CONNECTING/OPEN/reconnect picker | PROVEN |
| Dispatcher as clip-loss owner | Refuted | PROVEN |
| Sarvam 402 as 12/19 root | Not in `_m53` traces | NOT PROVEN |

## Invariants this change must restore

1. N unit-backed segments → N logical clip slots (FAILED occupies the index).
2. `payload.turn_id !== activeTurnId` cannot mutate presentation/TTS.
3. Concatenated backup must not replace unit-backed clips.
4. Greeting dispatcher unchanged.

## Protected

SemanticRequest, UnitSelector, unitId, PresentationEngine sequencing, OutboundCommandDispatcher, multilingual normalization.
