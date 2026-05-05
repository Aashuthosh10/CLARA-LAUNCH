import { CAMPUS_DIRECTIONS, type CampusDirection } from './campusDirections';
import type { CampusMatchApiRoom } from './campusMapTypes';
import { legacyCampusIndexForCode } from './legacyCampusIndex';

function parseFloorId(s: string | undefined): CampusDirection['floor_id'] {
  if (s === 'GF' || s === 'FF' || s === 'SF') return s;
  return undefined;
}

function blockFromCode(code: string): CampusDirection['block'] {
  const m = code.trim().toUpperCase().match(/^([ABC])-/);
  const b = m?.[1];
  if (b === 'A' || b === 'B' || b === 'C') return b;
  return 'A';
}

export function campusDirectionFromMapMatch(room: CampusMatchApiRoom): CampusDirection {
  const idx = legacyCampusIndexForCode(
    room.code,
    parseFloorId(room.floor_id) ?? undefined,
  );
  const floor_id = parseFloorId(room.floor_id);
  if (idx !== null) {
    const base = CAMPUS_DIRECTIONS[idx]!;
    return {
      ...base,
      floor: room.floor_name || base.floor,
      ...(floor_id ? { floor_id } : {}),
    };
  }
  const block = (room.block_code?.trim()?.[0]?.toUpperCase() as CampusDirection['block'] | undefined) ?? blockFromCode(room.code);
  const safeBlock: CampusDirection['block'] = block === 'A' || block === 'B' || block === 'C' ? block : blockFromCode(room.code);
  return {
    from: 'Main Entrance (inner vertex of the building, between Block A and Block B)',
    to: `${room.code} - ${room.name}`,
    block: safeBlock,
    floor: room.floor_name || 'Ground Floor',
    ...(floor_id ? { floor_id } : {}),
    steps: [`Head toward ${room.name} (${room.code}).`],
    estimated_steps: 24,
    estimated_time_seconds: 36,
  };
}
