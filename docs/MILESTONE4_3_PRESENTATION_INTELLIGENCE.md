# Milestone 4.3 — Presentation Intelligence & Canonical Playback

## Summary

Playback is driven by **canonical section meaning**, not array position.

```text
Canonical Section
        ↓
Narration Segment (section_id)
        ↓
PresentationTimeline entry
        ↓
PresentationScene (sectionId)
```

`PresentationEngine` activates scenes with `activateBySectionId("placement")` — never “activate scene #3”.

## 1. Before / after

**Before (positional):**

```text
Segment 0 → Scene 0
Segment 3 → Scene 3   // brittle under TTS queue races
```

ChatScreen often activated using live `latestPayload.tts_chunk_index`, which could race ahead of the clip actually playing.

**After (section-driven):**

```text
section_id=intro      → Scene Intro
section_id=hod_voice  → Scene HOD
section_id=placement  → Scene Placements
```

Each TTS queue item stores `sectionId` / `segmentId` / `chunkIndex` at enqueue time. On clip start, the engine activates by that stored `sectionId`.

## 2. `section_id` on narration segments

| Field | Role |
|-------|------|
| `segment_id` / WS `segmentId` | Turn-scoped identity (`{turn}:seg:{i}`) from `finalize` |
| `section_id` / WS `sectionId` | Stable meaning key from CanonicalContent section ids |

Department five beats:

| section_id | Scene |
|------------|-------|
| `intro` | Intro |
| `hod_voice` | HOD & Vision |
| `achievements` | Achievements |
| `placement` | Placements |
| `fees` | Fees |

Additive only — no new WS message types. Legacy builders get best-effort `section_id` from `card_id` or `seg_{i}` in `finalize_segment_list`.

## 3. PresentationTimeline (backend)

Package: `backend/services/presentation/`

- `build_presentation_timeline(bundle)` — pure projection; one entry per segment
- `validate_presentation_timeline` — fail closed (unique section/segment ids, continuous indices, caption/spoken non-empty, dept section set when applicable)
- Diagnostics: `PRESENTATION_STARTED`, `TIMELINE_CONTRACT_FAIL`, …

Wired in `attach_narration` after `build_presentation_bundle`. On timeline contract failure → degrade to full text (same path as presentation contract fail). Timeline stored on `session["_presentation_timeline"]` for observability — **not** a new WS field.

## 4. Frontend engine rules

- Primary API: `activateBySectionId(sectionId)`
- `activateBySegmentIndex` resolves index → `sectionId` then delegates
- Order guard (per_clip auto-playback): same section (idempotent), next section only, or first section when `READY`
- User `jumpToCardIndex` remains manual override
- No timer advance for plan / `per_clip` presentations
- Diagnostics (dev console): `SCENE_ENTERED`, `SEGMENT_STARTED`, `SEGMENT_FINISHED`, `SCENE_EXITED`, `PRESENTATION_COMPLETED`

## 5. TTS queue binding fix

In `ChatScreen.tsx`:

1. On enqueue: attach `chunkIndex`, `sectionId`, `segmentId` from the plan segment at that index
2. On clip start: `activateBySectionId(clip.sectionId)` — **never** live `tts_chunk_index`

## 6. Ownership chain

```text
CanonicalContent.sections[].id
  → NarrationSegment.section_id
  → TimelineEntry.section_id
  → PresentationScene.sectionId
```

Engine does not invent order or captions.

## 7. Explicit non-goals

- ChatScreen layout / card factory redesign
- Content migrations (fees/documents/principal)
- PresentationBundle frozen field changes
- AI summarization
- New top-level WS messages

## 8. Behaviour identity

| Area | Expectation |
|------|-------------|
| Wording / locales | Unchanged |
| Department five beats | Same content; keyed by `section_id` |
| Playback | Scene follows spoken **section** |
| Manual swipe | Still by card index |
| Timer advance on card_narration | Forbidden |

## 9. Verification

```bash
python -m pytest backend/tests/test_presentation_timeline.py backend/tests/test_department_migration.py backend/tests/test_surface_selector.py backend/tests/test_presentation_bundle.py backend/tests/test_conversation_orchestrator.py -q
```

FE: `frontend/src/features/chat/presentation/__tests__/presentationTimeline.test.ts` (Vitest-compatible).
