# CLARA – AI Receptionist Kiosk System

Full-stack application: **React (Vite)** frontend + **FastAPI** backend with WebSocket for the CLARA AI receptionist kiosk.

**Repository:** [FB-Clara](https://github.com/thequantumbugs-coder/FB-Clara)

## Repository structure

```
├── backend/          # FastAPI API + WebSocket (/ws/clara)
├── frontend/         # React 19 + Vite + TypeScript UI
├── config/           # Runtime UI config
├── scripts/          # Launch and deployment helpers
├── docs/             # Setup and baseline documentation
└── .env.example      # Backend env template (copy to .env)
```

## Prerequisites

- **Node.js** 20+ (for frontend)
- **Python** 3.8+ (for backend)

## Clone and setup

```
├── backend/          # FastAPI API + WebSocket (/ws/clara)
├── frontend/         # React 19 + Vite + TypeScript UI
├── config/           # Runtime UI config
├── scripts/          # Launch and deployment helpers
├── docs/             # Setup and baseline documentation
└── .env.example      # Backend env template (copy to .env)
```

Then run with one of the options below. On systems without Node in `PATH`, you can extract a Node binary into `.node/` (see frontend README); `scripts/run-dev.sh` will use `.node/bin` if present.

## Quick start

### Option 1: Run both (backend + frontend)

```
├── backend/          # FastAPI API + WebSocket (/ws/clara)
├── frontend/         # React 19 + Vite + TypeScript UI
├── config/           # Runtime UI config
├── scripts/          # Launch and deployment helpers
├── docs/             # Setup and baseline documentation
└── .env.example      # Backend env template (copy to .env)
```

- Backend: http://localhost:8000  
- Frontend: http://localhost:5173  

### Option 2: Run separately

Start the **backend first**, then the frontend. The frontend connects to the backend WebSocket (default `ws://localhost:8001/ws/clara`; override with `VITE_WS_URL` in `frontend/.env.local`) and retries every 3 seconds if the backend is not running. If the backend reports "address already in use", free the port (e.g. `netstat -ano | findstr :8001` then `taskkill /PID <pid> /F`) or set `PORT=8002` in `.env` and `VITE_WS_URL=ws://localhost:8002/ws/clara` in `frontend/.env.local`.

**Backend**

```
├── backend/          # FastAPI API + WebSocket (/ws/clara)
├── frontend/         # React 19 + Vite + TypeScript UI
├── config/           # Runtime UI config
├── scripts/          # Launch and deployment helpers
├── docs/             # Setup and baseline documentation
└── .env.example      # Backend env template (copy to .env)
```

**Frontend** (in another terminal)

```
├── backend/          # FastAPI API + WebSocket (/ws/clara)
├── frontend/         # React 19 + Vite + TypeScript UI
├── config/           # Runtime UI config
├── scripts/          # Launch and deployment helpers
├── docs/             # Setup and baseline documentation
└── .env.example      # Backend env template (copy to .env)
```

## Configuration

- Copy `.env.example` to `.env` in the project root and set API keys (e.g. `GROQ_API_KEY`, `SARVAM_*`) and **`POSTGRES_PASSWORD`** for RAG. See **docs/POSTGRES_SETUP.md** for PostgreSQL + pgvector (Ubuntu) and env details.
- **College knowledge (RAG):** Start PostgreSQL (e.g. `docker compose up -d`), run schema once (`scripts/db/init_pgvector.sql`), then run: `python -m backend.tools.ingest_college_knowledge_pg` when `college_knowledge.txt` is ready.
- Frontend: optional `frontend/.env.local` (e.g. `GEMINI_API_KEY`, `VITE_WS_URL` for a different backend WebSocket URL such as `ws://localhost:8002/ws/clara`).

### Voice / TTS (CLARA speaks in your language)

For full voice (greeting and replies spoken in the selected language), set in `.env`:

- `GROQ_API_KEY` – for LLM replies (e.g. from [Groq Console](https://console.groq.com/keys)).
- `SARVAM_API_KEY` – for text-to-speech (or `SARVAM_ASR_API_KEY` / `SARVAM_TTS_API_KEY`; get keys at [Sarvam AI](https://dashboard.sarvam.ai/)).

Run the backend with **full** dependencies (not minimal): `pip install -r backend/requirements/requirements.txt`. Supported languages: English, Kannada, Hindi, Tamil, Telugu, Malayalam. The frontend sends the selected language with `language_selected`; user speech is sent as `user_message` with `text` (from the browser’s speech recognition).

## Tech stack

| Layer    | Stack |
| -------- | ----- |
| Frontend | React 19, Vite 6, TypeScript, Tailwind CSS, Motion |
| Backend  | FastAPI, Uvicorn, WebSockets |
| Protocol | WebSocket at `ws://localhost:8000/ws/clara` (state + payload) |

## Pushing to GitHub (FB-Clara)

This repo is set up to push to **https://github.com/thequantumbugs-coder/FB-Clara**. From the project root:

```
├── backend/          # FastAPI API + WebSocket (/ws/clara)
├── frontend/         # React 19 + Vite + TypeScript UI
├── config/           # Runtime UI config
├── scripts/          # Launch and deployment helpers
├── docs/             # Setup and baseline documentation
└── .env.example      # Backend env template (copy to .env)
```

If Git prompts for credentials, use your GitHub username and a [Personal Access Token](https://github.com/settings/tokens) (scope `repo`). Or use SSH: `git remote set-url fb-clara git@github.com:thequantumbugs-coder/FB-Clara.git` then run the script again.

## Development

- Backend: `backend/main.py` (compat entrypoint), `backend/app/main.py` (FastAPI app), `backend/config/settings.py` (env from `.env`).
- Frontend: `frontend/` (Vite + React); WebSocket URL in `frontend/src/App.tsx` (`ws://localhost:8000/ws/clara`).

## License

See repository defaults.

## Automatic Language Detection

- Keep `SARVAM_LANGUAGE_CODE=unknown` (or unset) to allow STT auto-detection at ASR level.
- Backend performs one-time text-level language detection on the first meaningful transcript and persists it in session.
- Supported auto-detect targets: `en`, `hi`, `kn`, `ta`, `te`, `ml`.
- If confidence is below threshold, CLARA falls back to English.
- Manual selection from LanguageSelect is always an override for that session.

Environment knobs:

- `AUTO_LANGUAGE_DETECT_ENABLED=true`
- `AUTO_LANGUAGE_DETECT_CONFIDENCE_THRESHOLD=0.70`

WebSocket notification (backward compatible `state=5` payload):

```
├── backend/          # FastAPI API + WebSocket (/ws/clara)
├── frontend/         # React 19 + Vite + TypeScript UI
├── config/           # Runtime UI config
├── scripts/          # Launch and deployment helpers
├── docs/             # Setup and baseline documentation
└── .env.example      # Backend env template (copy to .env)
```

## Voice Latency Runbook

CLARA now emits per-turn structured latency metrics and WS debug timings.

### What is measured per turn

- `record_end_ms` or `transcript_ready_ms`
- `stt_ms`
- `llm_first_token_ms`
- `llm_ms`
- `tts_ms`
- `play_ms`
- `ttff_ms` (time to first feedback)
- `total_ms`

Metrics are emitted in:

- Backend JSON logs (`{"type":"turn_metrics", ...}`)
- WS payload as `payload.debug.timings_ms` (when `PERF_DEBUG_TIMINGS=true`)

### Performance controls

- `AUDIO_SILENCE_STOP_MS` (default `600`)
- `AUDIO_MAX_UTTERANCE_MS` (default `7000`)
- `LLM_MAX_TOKENS` (default `100`)
- `LLM_TEMPERATURE` (default `0.2`)
- `LLM_STREAM_PARTIAL_DEBOUNCE_MS` (default `120`)

### Warmups

At startup, CLARA runs best-effort background warmups for Groq and Sarvam (non-blocking).

### How to validate latency (20 turns)

1. Start backend and frontend.
2. Run 20 short turns (<=6 words each).
3. Collect backend logs and extract `turn_metrics` JSON lines.
4. Compute p50/p95 for `ttff_ms` and `total_ms`.

Quick PowerShell extraction example (from backend log file):

```
├── backend/          # FastAPI API + WebSocket (/ws/clara)
├── frontend/         # React 19 + Vite + TypeScript UI
├── config/           # Runtime UI config
├── scripts/          # Launch and deployment helpers
├── docs/             # Setup and baseline documentation
└── .env.example      # Backend env template (copy to .env)
```




