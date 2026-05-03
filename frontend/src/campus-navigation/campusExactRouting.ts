import type {
  CampusFloor,
  CampusFloorId,
  CampusMapData,
  CampusNavigationRouteMode,
  CampusRoom,
  CampusRouteSegment,
} from './campusMapTypes';
import { findRoomOnFloor, isExactImageMappedRoom } from './campusMapGeometry';

export type CampusRouteHighlightPoint = {
  floor_id: CampusFloorId;
  x: number;
  y: number;
  kind: 'lift' | 'stairs' | 'door' | 'kiosk';
  label: string;
};

export type CampusExactRoutePlan = {
  floorSegments: CampusRouteSegment[];
  displaySteps: string[];
  floorsInvolved: CampusFloorId[];
  highlightPoints: CampusRouteHighlightPoint[];
  warning: string | null;
  usesLift: boolean;
};

const FLOOR_LABELS: Record<CampusFloorId, string> = {
  GF: 'Ground Floor',
  FF: 'First Floor',
  SF: 'Second Floor',
};

function floorId(value: string | undefined | null): CampusFloorId | null {
  return value === 'GF' || value === 'FF' || value === 'SF' ? value : null;
}

function floorById(data: CampusMapData | null, id: CampusFloorId): CampusFloor | null {
  return data?.floors.find((floor) => floor.floor_id === id) ?? null;
}

function liftOnFloor(data: CampusMapData | null, id: CampusFloorId): CampusRoom | null {
  const floor = floorById(data, id);
  if (!floor) return null;
  const room = findRoomOnFloor(floor, 'B-LIFT');
  return isExactImageMappedRoom(room) ? room : null;
}

function blockLabel(room: CampusRoom, fallbackBlock?: string | null): string {
  const b = (room.block_code || fallbackBlock || room.code.match(/^([A-Z])-/)?.[1] || '').trim().toUpperCase();
  return b ? `Block ${b}` : 'the destination block';
}

function routeStepsForRoom(room: CampusRoom, floor: CampusFloor, usesLift: boolean): string[] {
  const dest = `${room.name} (${room.code})`;
  if (usesLift) {
    const floorName = floor.floor_name || FLOOR_LABELS[(floor.floor_id as CampusFloorId) ?? 'FF'];
    return [
      'Start from the CLARA kiosk.',
      'Follow the highlighted route to the Ground Floor lift lobby.',
      `Take the lift to the ${floorName}.`,
      'Exit the lift and follow the highlighted corridor route.',
      `Arrive at ${dest}.`,
    ];
  }

  return [
    'Start from the CLARA kiosk.',
    'Follow the highlighted route along the corridor.',
    `Continue toward ${blockLabel(room, floor.blocks.find((block) => block.rooms.includes(room))?.block_code)}.`,
    `Arrive at ${dest}.`,
  ];
}

export function buildCampusExactRoutePlan(
  data: CampusMapData | null,
  room: CampusRoom | null,
  floor: CampusFloor | null,
  routeMode: CampusNavigationRouteMode,
): CampusExactRoutePlan {
  const empty: CampusExactRoutePlan = {
    floorSegments: [],
    displaySteps: [],
    floorsInvolved: [],
    highlightPoints: [],
    warning: null,
    usesLift: false,
  };

  if (!data || !room || !floor || !isExactImageMappedRoom(room)) {
    return { ...empty, warning: 'Exact room geometry is not mapped yet.' };
  }

  const destFloor = floorId(room.floor_id || floor.floor_id);
  if (!destFloor) return { ...empty, warning: 'Destination floor is not mapped yet.' };

  const highlightPoints: CampusRouteHighlightPoint[] = [];
  if (room.door) {
    highlightPoints.push({
      floor_id: destFloor,
      x: room.door.x,
      y: room.door.y,
      kind: 'door',
      label: `${room.code} door`,
    });
  }

  if (destFloor === 'GF') {
    if (room.route_polyline_from_kiosk && room.route_polyline_from_kiosk.length >= 2) {
      return {
        floorSegments: [{ floor_id: 'GF', polyline: room.route_polyline_from_kiosk }],
        displaySteps: routeStepsForRoom(room, floor, false),
        floorsInvolved: ['GF'],
        highlightPoints,
        warning: null,
        usesLift: false,
      };
    }
    return {
      ...empty,
      displaySteps: routeStepsForRoom(room, floor, false),
      floorsInvolved: ['GF'],
      highlightPoints,
      warning: 'Route path is not mapped for this room yet.',
    };
  }

  if (routeMode === 'stairs') {
    return {
      ...empty,
      displaySteps: [
        'Start from the CLARA kiosk.',
        'A stairs route was requested, but stairs corridor data is not mapped for this room yet.',
        `The selected room is ${room.name} (${room.code}).`,
      ],
      floorsInvolved: ['GF', destFloor],
      highlightPoints,
      warning: 'Stairs route path is not mapped for this room yet.',
    };
  }

  const gfLift = liftOnFloor(data, 'GF');
  const destLift = liftOnFloor(data, destFloor);
  const gfLiftRoute = gfLift?.route_polyline_from_kiosk;
  const destLiftRoute = room.route_polyline_from_lift;

  if (gfLift?.door) {
    highlightPoints.push({
      floor_id: 'GF',
      x: gfLift.door.x,
      y: gfLift.door.y,
      kind: 'lift',
      label: 'Ground Floor lift',
    });
  }
  if (destLift?.door) {
    highlightPoints.push({
      floor_id: destFloor,
      x: destLift.door.x,
      y: destLift.door.y,
      kind: 'lift',
      label: `${FLOOR_LABELS[destFloor]} lift`,
    });
  }

  const floorSegments: CampusRouteSegment[] = [];
  if (gfLiftRoute && gfLiftRoute.length >= 2) {
    floorSegments.push({ floor_id: 'GF', polyline: gfLiftRoute });
  }
  if (destLiftRoute && destLiftRoute.length >= 2) {
    floorSegments.push({ floor_id: destFloor, polyline: destLiftRoute });
  }

  const missing: string[] = [];
  if (!gfLift || !gfLiftRoute || gfLiftRoute.length < 2) missing.push('Ground Floor lift route');
  if (!destLift) missing.push(`${FLOOR_LABELS[destFloor]} lift point`);
  if (!destLiftRoute || destLiftRoute.length < 2) missing.push(`${FLOOR_LABELS[destFloor]} lift-to-room route`);

  return {
    floorSegments,
    displaySteps: routeStepsForRoom(room, floor, true),
    floorsInvolved: ['GF', destFloor],
    highlightPoints,
    warning: missing.length ? `${missing.join(', ')} is not mapped yet.` : null,
    usesLift: true,
  };
}

export function routePolylineForFloor(plan: CampusExactRoutePlan | null, floor: CampusFloorId): [number, number][] | null {
  const segment = plan?.floorSegments.find((s) => s.floor_id === floor);
  return segment?.polyline && segment.polyline.length >= 2 ? segment.polyline : null;
}

export function routeHighlightsForFloor(
  plan: CampusExactRoutePlan | null,
  floor: CampusFloorId,
): CampusRouteHighlightPoint[] {
  return plan?.highlightPoints.filter((p) => p.floor_id === floor) ?? [];
}
