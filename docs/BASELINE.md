# Code Structure Baseline

This document captures the current code structure of the CLARA deployment as of the baseline. Use it as a reference before making large changes.

---

## Repository layout

```
clara-deploy-frontend/             # repo root
├── BASELINE.md                    # This file
├── backend/                       # Python FastAPI + WebSocket server
│   ├── main.py                    # App entry, WS handler, TTS/STT/RAG orchestration
│   ├── config.py                  # Env/config (Groq, Sarvam, DB, etc.)
│   ├── db.py                      # PostgreSQL + RAG (pgvector)
│   ├── rag.py                     # get_relevant_context, embeddings
│   ├── answer_generation.py       # Intent (overview, course menu, dept), prompts
│   ├── greetings.py               # GREETINGS by language
│   ├── stt.py                     # wav_to_transcript (Sarvam/Whisper)
│   ├── ingest_college_knowledge_pg.py
│   ├── core/
│   │   ├── audio_pipeline.py      # record_audio
│   │   └── __init__.py
│   ├── tools/
│   │   └── mic_probe.py
│   ├── models/
│   │   └── __init__.py
│   └── test_db_rag.py
├── frontend/                      # React + Vite + TypeScript
│   ├── src/
│   │   ├── App.tsx                # State machine (0=Sleep, 3=Lang, 4|5=Chat), overlays (course menu, dept stack), 70:30 minimize
│   │   ├── main.tsx               # LanguageProvider wraps App
│   │   ├── context/
│   │   │   └── LanguageContext.tsx # language, t(), translations
│   │   ├── content/
│   │   │   └── cardContent.ts     # Single source for card copy (all 6 languages): menu, dept titles, institution name
│   │   ├── hooks/
│   │   │   ├── useWebSocket.ts
│   │   │   ├── useVoiceAnalyser.ts
│   │   │   ├── useSpeechRecognition.ts
│   │   │   └── useAnimeAnimations.ts
│   │   ├── types/
│   │   │   └── chat.ts            # ChatMessage, CollegeBriefMessage, etc.
│   │   ├── utils/
│   │   │   ├── intentClassifier.ts # isAboutCollegeIntent, getMessageIntent
│   │   │   └── parseOverviewReply.ts
│   │   └── components/
│   │       ├── SleepScreen.tsx
│   │       ├── LanguageSelect.tsx
│   │       ├── ChatScreen.tsx     # Chat + split cards for overview intents
│   │       ├── VoiceOrb.tsx, VoiceOrbCanvas.tsx, VoiceWaveformVisualizer.tsx
│   │       ├── BackgroundParticles.tsx
│   │       └── chat/
│   │           ├── CardStackComponent.tsx # Department cards (same position as book), fade, diary_tts
│   │           ├── CourseMenuComponent.tsx # Department list grid, click → "X department overview"
│   │           ├── CollegeDiaryCard.tsx
│   │           ├── ClaraBubble, UserBubble, SystemBubble
│   │           ├── CardMessage, ImageCard
│   │           └── ...
│   ├── package.json, vite.config.ts, tsconfig.json
│   └── e2e/
│       └── chat-flow.spec.ts
└── config/
    └── ui_config.json
```

---

## App flow (frontend)

- **State (effectiveState):** 0 = Sleep, 3 = Language select, 4|5 = Chat. URL `?state=5` overrides; keys 0–8 in dev switch state.
- **Chat (state 4|5):** Renders `ChatScreen` when no overlay. Overlays: **course_menu** (generic programs query → course menu fullscreen), **dept_wait** (preparing), **dept_stack** (department cards with Close/Minimize; minimize → 70% cards, 30% chat + orb).
- **College overview:** rendered in chat split-card mode (no Digital Book mode).
- **Department cards:** When backend returns 5-section department reply, `App` shows `CardStackComponent` with same header (Close, Minimize). Close → main chat; Minimize → 70:30 with chat list + orb in 30%.
- **ChatScreen** `forcePanelView`: when embedded in 30% column (e.g. minimized cards), shows only chat list + orb.

---

## WebSocket contract (unchanged by baseline)

- **Payload:** `messages`, `isProcessing`, `isSpeaking`; optional `error`, `audioBase64`.
- **Frontend → Backend:** e.g. `wake`, `language_selected`, `conversation_started`, `mic_start`, user text messages.

---

## Digital Book

- Removed from the active UI flow.

---

## Department / Course flow (current behavior)

- **Backend intents:** `COURSE_MENU` (generic “courses/departments” query → reply "COURSE_MENU"), `DEPARTMENT_OVERVIEW` (specific department → 5-section reply, translated). Priority: department > course menu > college overview > normal.
- **Course menu:** Fullscreen `CourseMenuComponent`; groups from `cardContent.ts` (all 6 languages). Click department → send "X department overview" → backend → department cards.
- **Department cards:** `CardStackComponent`; 5 cards (cover + 4 content); TTS via `diary_tts`.
- **Card content:** `frontend/src/lib/cardContent.ts` — `getCardContent(language)` for institution name, menu groups, department card titles, copy (all 6 languages).

---

## Backend (current behavior)

- **main.py:** WebSocket handler; intent-driven (overview, course menu, department, normal); RAG; answer_generation; TTS; sends messages and optional `audioBase64`.
- **answer_generation.py:** `detect_intent` (COLLEGE_OVERVIEW, COURSE_MENU, DEPARTMENT_OVERVIEW, NORMAL_QUERY), `build_system_prompt` (overview 6-section; department 5-section; normal), `generate_reply`.
- **db.py, rag.py:** PostgreSQL, pgvector, embeddings for RAG.

---

## Key files to touch for common changes

| Change | Where |
|--------|--------|
| Kiosk states / routing / overlays | `frontend/src/App.tsx` |
| Chat layout + split cards | `frontend/src/screens/ChatScreen.tsx` |
| Department cards, TTS, fade | `frontend/src/components/chat/CardStackComponent.tsx` |
| Course menu list, copy | `frontend/src/components/chat/CourseMenuComponent.tsx`, `frontend/src/lib/cardContent.ts` |
| Card copy (all 6 languages) | `frontend/src/lib/cardContent.ts` |
| Language/UI copy | `frontend/src/context/LanguageContext.tsx` |
| Intent (about college, etc.) | `frontend/src/lib/intentClassifier.ts` |
| WS URL, env | `frontend/.env`, `App.tsx` (WS_URL) |
| API keys, DB, RAG config | `backend/config/settings.py`, `backend/app/main.py` |
| Intents, overview/department prompts | `backend/answer_generation.py` |

---

*Baseline set: Department/Course flow with split cards and chat, cardContent.ts for all 6 languages, intents COURSE_MENU and DEPARTMENT_OVERVIEW.*

