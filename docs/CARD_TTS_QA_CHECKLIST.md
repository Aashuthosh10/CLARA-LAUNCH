# Card TTS + auto-advance — manual QA matrix

Run on a kiosk build after changes. For each **language** (`en`, `hi`, `kn`, `ta`, `te`, `ml`) and each **card intent** below, verify:

1. The correct card / stage opens.
2. TTS speaks the first slide/segment (or shows caption if TTS is disabled).
3. The carousel advances on `audio.onended` for each further segment.
4. If TTS is empty or autoplay is blocked, slides still advance within ~2–6s (caption-length-based fallback).

## Intents to spot-check

| Area | Notes |
|------|--------|
| `department_overview` | With a specific department, with **all** departments, and with **no** department resolved (should show all-dept summary, not freeze). |
| `department_fees` | With and without department; fees card should open in both cases. |
| `hod` | With and without department; HOD stage should open even without department. |
| `principal_profile` / `vice_principal_profile` | Card opens without requiring `audioBase64` on first payload. |
| `college` / `trustees` / `placements` / `admissions` / `documents` / `course_menu` | Card or info stage opens; narration order matches segments. |

## WebSocket ordering

- `narration_plan` may arrive before `visible` payloads; the UI should still open the card when the plan includes `showCard` + `narration_active`.

## Backend settings

- `ENABLE_NARRATION_PLAN` should be **true** in the deployed environment.
- Optional: `NARRATION_SEGMENT_TTS_BUDGET_S` per-segment TTS budget (see `settings.py`).
