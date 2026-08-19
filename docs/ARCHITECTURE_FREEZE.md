# Architecture Freeze

**Effective:** Milestone 3.6 — Legacy Migration Completion

## Rule

Future milestones may **extend** these systems but must **not redesign or replace** them.

**`main.py` is an execution shell only.** Business decisions must not be introduced into `process_user_text_and_reply` or WS handlers after this milestone. Extend Conversation Intelligence, Runtime Integrity, or ConversationOrchestrator instead.

## Frozen subsystems

| Subsystem | Owner package / surface |
|-----------|-------------------------|
| Conversation Intelligence | `backend/services/conversation/` |
| Runtime Integrity | `backend/services/runtime/` |
| Conversation Orchestrator | `backend/services/orchestration/conversation_orchestrator.py` |
| Response Authority | `backend/services/orchestration/response_authority.py` |
| Presentation Bundle | `backend/services/orchestration/presentation_bundle.py` |
| Outbound Response Builder | `backend/services/orchestration/outbound_builder.py` |
| Turn Finalizer | `backend/services/runtime/turn_finalizer.py` |
| Conversation Snapshot | `backend/services/runtime/conversation_snapshot.py` |
| Emit Gate | `backend/services/orchestration/emit_gate.py` |
| Architecture Linter | `backend/services/orchestration/architecture_linter.py` |
| Presentation Engine | `frontend/src/features/chat/presentation/` |
| Runtime Validators (FE) | `frontend/src/runtime/` |
| Conversation Resolution | `backend/services/orchestration/types.py` |
| WebSocket contract | Existing payload fields only — no schema redesign |
| ChatScreen ownership | `frontend/src/screens/ChatScreen.tsx` (execution of plans; not response authority) |

## Canonical turn flow (do not fork)

```text
ConversationResolution
  → ResponseAuthority (sealed)
  → PresentationBundle (if CARD)
  → OutboundResponse (single builder)
  → WS emit
  → ConversationSnapshot
  → TURN_FINALIZED
```

## Enforcement

- `test_architecture_escape.py` — permanent regression suite
- `architecture_linter.py` at startup (`RUNTIME_STRICT_STARTUP` hard-fails)

## Intentional non-answer UX

Early partial “Got it.” / ack earcon are **not** ResponseAuthority answers. Do not treat them as alternate response owners.
