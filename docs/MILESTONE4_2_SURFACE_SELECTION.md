# Milestone 4.2 — Canonical Surface Selection & Presentation Intelligence

## Summary

Centralizes **which surface satisfies the request** into:

1. **SurfaceSelector** — sole production owner of surface selection  
2. **SurfaceRegistry** — Surface Capability Contract per surface  

Does **not** migrate content (except department already on CanonicalContent from M4.1). Changes selection ownership only — no wording, WS schema, ChatScreen, or PresentationEngine changes.

## 1. Old selection (multi-owner)

```text
card_trigger_hints  →  presentation_resolver  →  show_card
main.py intent cascade  →  show_card (parallel, often diverged)
bundle.card_surface  →  late WS override
```

Example divergence: trustees → orch `trustees` vs main `college`.

## 2. New selection (single owner)

```text
Conversation Intelligence
        ↓
ConversationResolution
        ↓
SurfaceSelector.select_surface
        ↓
SurfaceRegistry (capability contract)
        ↓
SurfaceSelection { surface, owner, card_surface, supports_* }
        ↓
Consumers (presentation_resolver, main, narration) — consume only
```

## 3. Surface vs content owner

```python
SurfaceSelection(surface="department_overview", owner="department_overview", ...)
```

Today `surface == owner`. Later allowed:

```text
surface = department_overview
owner   = department_overview_v2
```

Presentation uses `surface` / `card_surface`; ContentResolver uses `owner`.

## 4. Priority table (first match wins)

| # | Rule | Surface |
|---|------|---------|
| 1 | `department_click` | `department_overview` |
| 2 | Explicit trigger / requested_card | mapped |
| 3 | FAQ matched | `faq` |
| 4 | Department overview intent | `department_overview` |
| 5 | HOD | `hod` |
| 6 | Principal | `principal_profile` |
| 7 | Vice principal | `vice_principal_profile` |
| 8 | Fees | `department_fees` |
| 9 | Documents | `documents` |
| 10 | Admissions | `admissions` |
| 11 | Placements | `placements` |
| 12 | Comparison | `department_comparison` |
| 13 | College | `college` |
| 14 | Trustees | `trustees` |
| 15 | Bus | `bus_routes` |
| 16 | Course menu | `course_menu` |
| 17 | else | `None` (unknown) |

## 5. Surface Capability Contract

Each `SurfaceDescriptor` registers:

| Field | Role |
|-------|------|
| `content_owner` | ContentResolver owner id |
| `narration_owner` | `canonical` or `legacy` |
| `presentation_mode` | CARD / DIRECT_FAQ / … |
| `card_surface` | WS showCard when card allowed |
| `supports_card` | Emit card? |
| `supports_tts` | Spoken path? |
| `supports_menu` | Menu entry? |
| `supports_interrupt` | Interruptible presentation? |
| `supports_language_translation` | Locale packs apply? |
| `supports_summary_generation` | **False for all in M4.2** |
| `supports_scene_navigation` | Multi-slide deck? |

FAQ: `supports_card=False` → WS `showCard` stays `None`.

## 6. Diagnostics chain

```text
SURFACE_REQUESTED
SURFACE_RESOLVED
CONTENT_OWNER_SELECTED
SURFACE_SELECTED          (summary)
CONTENT_READY             (canonical dept path)
NARRATION_READY
BUNDLE_READY
```

## 7. Invariant (permanent)

**SurfaceSelector is the only production owner of surface selection.**

Consumers may never derive or replace a surface. Consumers only consume.

Same spirit as ResponseAuthority.

## 8. Migrated content vs legacy narration

| Surface | Selection | Content / narration |
|---------|-----------|---------------------|
| `department_overview` | SurfaceSelector | Canonical (M4.1) |
| All other card surfaces | SurfaceSelector | Legacy builders |
| `faq` | SurfaceSelector | FAQ answers; no card |

## 9. FAQ vs WS

Selection: `surface=faq`, `owner=faq`.  
WS: `showCard=None` (`supports_card=False`). UI unchanged.

## 10. Future migration strategy

1. Register surface in SurfaceRegistry (capability contract)  
2. Point `content_owner` / migrate adapter  
3. Set `narration_owner=canonical` and extend SurfaceNarrationMapper  
4. Do **not** add a second surface decider  

## Files

| File | Change |
|------|--------|
| `backend/services/content/surface_registry.py` | **new** |
| `backend/services/content/surface_selector.py` | **new** |
| `presentation_resolver.py` | consume `select_surface` |
| `main.py` | consume orch `show_card`; selector fallback only |
| `answer_generation.card_trigger_hints` | thin delegate |
| `conversation_orchestrator.py` | pass local_intent; `BUNDLE_READY` |
| `narration_resolver.py` | `CONTENT_READY` / `NARRATION_READY` |
| `backend/tests/test_surface_selector.py` | **new** |
| `docs/MILESTONE4_2_SURFACE_SELECTION.md` | this doc |
