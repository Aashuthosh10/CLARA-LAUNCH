/** Additive conversation runtime store — sync only; not a business-state owner. */

import {
  ConversationRuntimeSnapshot,
  INITIAL_RUNTIME_SNAPSHOT,
} from './types';
import { pushRuntimeEvent } from './diagnostics';

let snapshot: ConversationRuntimeSnapshot = { ...INITIAL_RUNTIME_SNAPSHOT, localization: { ...INITIAL_RUNTIME_SNAPSHOT.localization } };
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

export function getConversationRuntime(): ConversationRuntimeSnapshot {
  return snapshot;
}

export function patchConversationRuntime(
  patch: Partial<ConversationRuntimeSnapshot> & {
    localization?: Partial<ConversationRuntimeSnapshot['localization']>;
  },
): ConversationRuntimeSnapshot {
  const nextLoc = patch.localization
    ? { ...snapshot.localization, ...patch.localization }
    : snapshot.localization;
  snapshot = {
    ...snapshot,
    ...patch,
    localization: nextLoc,
  };
  pushRuntimeEvent('RUNTIME_PATCH', {
    turnId: snapshot.turnId,
    generation: snapshot.generation,
    language: snapshot.currentLanguage,
    runtimeState: snapshot.runtimeState,
  });
  notify();
  return snapshot;
}

export function resetConversationRuntime(): void {
  snapshot = {
    ...INITIAL_RUNTIME_SNAPSHOT,
    localization: { ...INITIAL_RUNTIME_SNAPSHOT.localization },
  };
  pushRuntimeEvent('RUNTIME_RESET', {});
  notify();
}

export function subscribeConversationRuntime(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useConversationRuntime(): ConversationRuntimeSnapshot {
  // Lazy hook-compatible getter; ChatScreen may call getConversationRuntime directly
  // to avoid forcing React import cycles. Prefer getConversationRuntime + subscribe.
  return getConversationRuntime();
}
