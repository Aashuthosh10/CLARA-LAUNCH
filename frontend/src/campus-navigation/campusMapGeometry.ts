import type { CampusFloor, CampusFloorId, CampusMapData, CampusRoom } from './campusMapTypes';

/** Bounding box of all room polygons and doors on a floor (JSON coordinate space). */
export function computeFloorRefBounds(floor: CampusFloor): { refW: number; refH: number } {
  let refW = 0;
  let refH = 0;
  for (const block of floor.blocks) {
    for (const room of block.rooms) {
      for (const pt of room.polygon ?? []) {
        refW = Math.max(refW, pt[0]);
        refH = Math.max(refH, pt[1]);
      }
      const d = room.door;
      if (d) {
        refW = Math.max(refW, d.x);
        refH = Math.max(refH, d.y);
      }
    }
  }
  return { refW: refW || 1980, refH: refH || 1260 };
}

export function floorIdForRoomCode(code: string): CampusFloorId {
  const c = code.trim().toUpperCase();
  if (c.includes('CLARA')) return 'GF';
  const m = c.match(/-(\d+)\s*$/);
  if (!m) {
    if (c.includes('MATH') && c.includes('HOD')) return 'FF';
    return 'GF';
  }
  const n = parseInt(m[1], 10);
  if (n >= 200) return 'SF';
  if (n >= 100) return 'FF';
  return 'GF';
}

/**
 * Parse a leading room code from legacy `CampusDirection.to` labels
 * (e.g. "A-001 - CAED Lab", "C-003 - Library").
 */
export function parseRoomCodeFromDestinationLabel(to: string): string | null {
  const t = to.trim();
  const m = t.match(/^([A-Za-z]+-[\w.-]+?)(?:\s*-\s|\s+\(|$)/);
  if (m) return m[1].toUpperCase().replace(/^([A-Z])-/i, (_, b) => `${b.toUpperCase()}-`);
  const m2 = t.match(/^([A-Za-z]+-\d+)/);
  return m2 ? m2[1].toUpperCase() : null;
}

export function findRoomOnFloor(floor: CampusFloor, code: string): CampusRoom | null {
  const want = code.trim().toUpperCase();
  for (const block of floor.blocks) {
    for (const room of block.rooms) {
      if (room.code.toUpperCase() === want) return room;
    }
  }
  return null;
}

export function findRoomInMap(data: CampusMapData, code: string): { floor: CampusFloor; room: CampusRoom } | null {
  const fid = floorIdForRoomCode(code);
  const floor = data.floors.find((f) => f.floor_id === fid);
  if (!floor) return null;
  const room = findRoomOnFloor(floor, code);
  return room ? { floor, room } : null;
}
