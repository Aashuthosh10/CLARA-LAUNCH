/**
 * Presentation ownership — unit-backed plans outrank legacy single/card loads.
 *
 * PresentationEngine is the sole playhead. ChatScreen must not guess cardIndex.
 */

export function unitIdsFromSegments(
  segments: Array<{ unitId?: string | null } | null | undefined> | null | undefined,
): string[] {
  if (!Array.isArray(segments)) return [];
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const seg of segments) {
    const uid = typeof seg?.unitId === 'string' ? seg.unitId.trim() : '';
    if (!uid || seen.has(uid)) continue;
    seen.add(uid);
    ids.push(uid);
  }
  return ids;
}

export function loadedSceneUnitIds(
  scenes: Array<{ unitId?: string | null } | null | undefined> | null | undefined,
): string[] {
  if (!Array.isArray(scenes)) return [];
  return scenes
    .map((s) => (typeof s?.unitId === 'string' ? s.unitId.trim() : ''))
    .filter(Boolean);
}

/**
 * Load (or replace) the engine presentation when the incoming plan is a
 * unit-backed sequence that the currently loaded scenes do not already own.
 */
export function shouldLoadUnitPlan(args: {
  incomingTurnId: string;
  lastLoadedTurnId: string | null | undefined;
  incomingUnitIds: string[];
  loadedSceneUnitIds: string[];
}): boolean {
  const turnId = (args.incomingTurnId || '').trim();
  if (!turnId) return false;
  if (args.incomingUnitIds.length === 0) return false;

  const last = (args.lastLoadedTurnId || '').trim();
  if (last !== turnId) return true;

  const loaded = args.loadedSceneUnitIds;
  if (loaded.length !== args.incomingUnitIds.length) return true;
  return loaded.some((id, i) => id !== args.incomingUnitIds[i]);
}

/** Legacy kind:'single' / kind:'cards' without unitIds — only when no unit plan exists. */
export function shouldAllowLegacySingle(incomingUnitIds: string[]): boolean {
  return incomingUnitIds.length === 0;
}

export function unitSequencesEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((id, i) => id === b[i]);
}
