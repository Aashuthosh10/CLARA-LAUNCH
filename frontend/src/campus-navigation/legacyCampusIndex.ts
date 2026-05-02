import { CAMPUS_DIRECTIONS } from './campusDirections';

/** Map a canonical room code (e.g. B-004) to the legacy dropdown / directions index, if any. */
export function legacyCampusIndexForCode(code: string): number | null {
  const want = code.trim().toUpperCase();
  const idx = CAMPUS_DIRECTIONS.findIndex((d) => {
    const m = d.to.match(/^([A-Za-z0-9-]+)/);
    return m !== null && m[1].toUpperCase() === want;
  });
  return idx >= 0 ? idx : null;
}
