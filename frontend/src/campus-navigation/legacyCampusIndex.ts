import { CAMPUS_DIRECTIONS } from './campusDirections';

/** Map canonical room code to dropdown index; optionally disambiguate B-LIFT / stairs across floors. */
export function legacyCampusIndexForCode(code: string, floorId?: 'GF' | 'FF' | 'SF' | null): number | null {
  const want = code.trim().toUpperCase();
  const idx = CAMPUS_DIRECTIONS.findIndex((d) => {
    const m = d.to.match(/^([A-Za-z0-9-]+)/);
    const codeOk = m !== null && m[1].toUpperCase() === want;
    if (!codeOk) return false;
    if (floorId && d.floor_id && d.floor_id !== floorId) return false;
    return true;
  });
  return idx >= 0 ? idx : null;
}
