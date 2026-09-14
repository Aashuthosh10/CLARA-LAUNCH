/**
 * Canonical campus directory adapter.
 *
 * Room identity, floor, code, and map geometry come from the same JSON consumed
 * by the backend. This module only adapts those records to the existing
 * CampusDirection UI shape; it is not a second destination registry.
 */

import campusMapJson from '../data/svit-campus-map.json';
import type { CampusDirection } from './campusDirections';
import type { CampusFloorId, CampusMapData } from './campusMapTypes';

const MAIN = 'Main entrance (inner vertex between Block A and Block B)';
const MAP = campusMapJson as unknown as CampusMapData;

const FLOOR_LABELS: Record<CampusFloorId, string> = {
  GF: 'Ground Floor',
  FF: 'First Floor',
  SF: 'Second Floor',
};

export type CampusDirectoryRow = {
  id: string;
  code: string;
  name: string;
  block: CampusDirection['block'];
  floor_id: CampusFloorId;
  floorLabel: string;
};

function isFloorId(value: string): value is CampusFloorId {
  return value === 'GF' || value === 'FF' || value === 'SF';
}

function isBlock(value: string): value is CampusDirection['block'] {
  return value === 'A' || value === 'B' || value === 'C';
}

function canonicalRows(): CampusDirectoryRow[] {
  const rows: CampusDirectoryRow[] = [];
  const seen = new Set<string>();
  for (const floor of MAP.floors ?? []) {
    if (!isFloorId(floor.floor_id)) continue;
    for (const block of floor.blocks ?? []) {
      if (!isBlock(block.block_code)) continue;
      for (const room of block.rooms ?? []) {
        const id = String(room.id || '').trim();
        const code = String(room.code || '').trim();
        const name = String(room.name || '').trim();
        if (!id || !code || !name || seen.has(id)) continue;
        seen.add(id);
        rows.push({
          id,
          code,
          name,
          block: block.block_code,
          floor_id: floor.floor_id,
          floorLabel: floor.floor_name || FLOOR_LABELS[floor.floor_id],
        });
      }
    }
  }
  return rows;
}

export const CAMPUS_PRIORITY_ROWS = canonicalRows();

/** Existing public API retained while its source expands from 84 to all 150 rooms. */
export function buildPriorityCampusDirections(): CampusDirection[] {
  return CAMPUS_PRIORITY_ROWS.map((row) => ({
    from: MAIN,
    to: `${row.code} - ${row.name} (${row.floorLabel})`,
    block: row.block,
    floor: row.floorLabel,
    floor_id: row.floor_id,
    steps: [
      `Follow the highlighted route toward Block ${row.block}.`,
      `Locate ${row.name} (${row.code}) on the corridor room boards.`,
    ],
    estimated_steps: 24,
    estimated_time_seconds: 36,
  }));
}
