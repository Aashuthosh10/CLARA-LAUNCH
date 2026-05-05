# CLARA Face Display (5177)

This is a **separate Vite app** that renders the animated robot face and lip-syncs to CLARA TTS.

## Run

1. `cd facial-display`
2. `npm install`
3. `npm run dev` (serves on `http://localhost:5177`)

## Important constraint (Chrome popup rules)

The face window **must be opened by the main UI** (`http://localhost:5176`) using a **user gesture** (click/tap).  
Programmatic kiosk-mode auto-launch of `5177` is **not** supported with `window.postMessage` transport.

## Protocol

Main (`5176`) -> Face (`5177`) via `window.postMessage`:

- `clara_speech` `{ turnId, sentences, durationsMs, emotion }`
- `clara_interrupt` `{ turnId }`
- `clara_idle` `{ turnId }`

Face (`5177`) -> Main (`5176`):

- `face_ready` (handshake)
