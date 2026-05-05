import type { CampusBlock, CampusFloor, CampusFloorId, CampusMapData, CampusRoom } from './campusMapTypes';

/** Bounding box of room polygons, doors, graph nodes on a floor, and authored map canvas (JSON coordinate space). */
export function computeFloorRefBounds(floor: CampusFloor, mapData?: CampusMapData | null): { refW: number; refH: number } {
  let refW = floor.width ?? floor.map_width ?? mapData?.coordinate_space?.width ?? 0;
  let refH = floor.height ?? floor.map_height ?? mapData?.coordinate_space?.height ?? 0;

  const expand = (x: number, y: number): void => {
    refW = Math.max(refW, x);
    refH = Math.max(refH, y);
  };

  for (const block of floor.blocks) {
    for (const room of block.rooms) {
      for (const pt of room.polygon ?? []) {
        expand(pt[0], pt[1]);
      }
      const d = room.door;
      if (d) expand(d.x, d.y);
    }
  }

  const fid = floor.floor_id;
  for (const n of mapData?.nodes ?? []) {
    if (n.floor_id !== fid) continue;
    const x = n.x;
    const y = n.y;
    if (typeof x === 'number' && typeof y === 'number') expand(x, y);
  }

  return {
    refW: refW > 0 ? refW : 1980,
    refH: refH > 0 ? refH : 1260,
  };
}

export function normalizeRoomCode(value: string | null | undefined): string {
  const raw = String(value ?? '').trim().toUpperCase();
  if (!raw) return '';
  const compact = raw.replace(/[\s_-]+/g, '');
  const m = compact.match(/^([A-Z]+)(\d+[A-Z]*)$/);
  if (m) return `${m[1]}-${m[2]}`;
  return compact;
}

export function floorIdForRoomCode(code: string): CampusFloorId {
  const c = code.trim().toUpperCase();
  if (c.includes('CLARA')) return 'GF';
  if (c === 'A-HOD-MATH') return 'FF';
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
  const want = normalizeRoomCode(code);
  for (const block of floor.blocks) {
    for (const room of block.rooms) {
      if (normalizeRoomCode(room.code) === want) return room;
    }
  }
  return null;
}

export function findRoomInMap(data: CampusMapData, code: string): { floor: CampusFloor; room: CampusRoom } | null {
  const found = findRoomByCodeOrId(data, code);
  return found.room && found.floor ? { floor: found.floor, room: found.room } : null;
}

export type CampusRoomLookupResult = {
  room: CampusRoom | null;
  floor: CampusFloor | null;
  block: CampusBlock | null;
  ambiguous?: boolean;
  matches?: Array<{ room: CampusRoom; floor: CampusFloor; block: CampusBlock }>;
  reason?: string;
};

function uniqueResult(
  matches: Array<{ room: CampusRoom; floor: CampusFloor; block: CampusBlock }>,
  reason: string,
): CampusRoomLookupResult {
  if (matches.length === 1) return { ...matches[0], ambiguous: false, matches, reason };
  if (matches.length > 1) return { room: null, floor: null, block: null, ambiguous: true, matches, reason };
  return { room: null, floor: null, block: null, ambiguous: false, matches, reason };
}

export function findRoomByCodeOrId(data: CampusMapData | null | undefined, query: string | null | undefined): CampusRoomLookupResult {
  const q = String(query ?? '').trim();
  if (!data || !q) return { room: null, floor: null, block: null, ambiguous: false, matches: [], reason: 'empty-query' };

  const all: Array<{ room: CampusRoom; floor: CampusFloor; block: CampusBlock }> = [];
  for (const floor of data.floors ?? []) {
    for (const block of floor.blocks ?? []) {
      for (const room of block.rooms ?? []) {
        all.push({ room, floor, block });
      }
    }
  }

  const qUpper = q.toUpperCase();
  const qNorm = normalizeRoomCode(q);

  let matches = all.filter(({ room }) => String(room.code ?? '').trim().toUpperCase() === qUpper);
  if (matches.length) return uniqueResult(matches, 'exact-code');

  matches = all.filter(({ room }) => normalizeRoomCode(room.code) === qNorm);
  if (matches.length) return uniqueResult(matches, 'normalized-code');

  matches = all.filter(({ room }) => String(room.id ?? '').trim().toUpperCase() === qUpper);
  if (matches.length) return uniqueResult(matches, 'exact-id');

  matches = all.filter(({ room }) => (room.aliases ?? []).some((a) => String(a).trim().toUpperCase() === qUpper));
  if (matches.length) return uniqueResult(matches, 'exact-alias');

  matches = all.filter(({ room }) => String(room.name ?? '').trim().toUpperCase() === qUpper);
  if (matches.length) return uniqueResult(matches, 'exact-name');

  return { room: null, floor: null, block: null, ambiguous: false, matches: [], reason: 'not-found' };
}

export function isExactImageMappedRoom(room: CampusRoom | null | undefined): boolean {
  return room?.geometry_source === 'exact_image';
}
