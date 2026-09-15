import { describe, expect, it } from 'vitest';
import campusMapJson from '../../data/svit-campus-map.json';
import {
  buildCampusExactRoutePlan,
  resolveCampusRoutePolyline,
} from '../campusExactRouting';
import { findRoomByCodeOrId } from '../campusMapGeometry';
import type { CampusMapData, CampusRouteResult } from '../campusMapTypes';

const MAP = campusMapJson as unknown as CampusMapData;

function okApiRoute(polyline: [number, number][]): CampusRouteResult {
  return {
    status: 'ok',
    error_code: null,
    route_id: 'test',
    mode: 'shortest',
    origin: {},
    destination: {},
    distance_m: 1,
    eta_s: 1,
    floors_involved: ['GF'],
    path_nodes: [],
    path_edges: [],
    floor_segments: [{ floor_id: 'GF', polyline }],
    warnings: [],
  };
}

describe('resolveCampusRoutePolyline', () => {
  it('prefers exact-image B-004 polyline over mismatched API graph coords', () => {
    const lookup = findRoomByCodeOrId(MAP, 'B-004');
    expect(lookup.room?.door).toEqual({ x: 417, y: 211, label: 'Door' });

    const exactPlan = buildCampusExactRoutePlan(MAP, lookup.room, lookup.floor, 'default');
    const apiWrong = okApiRoute([
      [636.24, 303.6],
      [747.12, 154.56],
    ]);

    const poly = resolveCampusRoutePolyline({
      exactPlan,
      routeResult: apiWrong,
      floorId: 'GF',
    });

    expect(poly).not.toBeNull();
    expect(poly!.length).toBeGreaterThanOrEqual(2);
    const end = poly![poly!.length - 1]!;
    expect(end[0]).toBe(417);
    expect(end[1]).toBe(211);
  });

  it('falls back to API polyline when exact plan has no corridor path', () => {
    const apiPoly: [number, number][] = [
      [10, 10],
      [20, 20],
    ];
    const poly = resolveCampusRoutePolyline({
      exactPlan: {
        floorSegments: [],
        displaySteps: [],
        floorsInvolved: [],
        highlightPoints: [],
        warning: 'Route path is not mapped for this room yet.',
        usesLift: false,
      },
      routeResult: okApiRoute(apiPoly),
      floorId: 'GF',
    });
    expect(poly).toEqual(apiPoly);
  });
});
