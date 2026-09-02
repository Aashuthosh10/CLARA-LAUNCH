import { describe, expect, it } from 'vitest';
import rawBusData from '../../../data/collegeBusRoutes.json';
import { clampRouteIndex, routeIndicator } from '../busRouteNavigation';

describe('bus route navigation', () => {
  const routes = rawBusData.routes;

  it('exposes exactly eight independent route states', () => {
    expect(routes).toHaveLength(8);
    expect(routes.map((route) => route.route_number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('reaches route eight and returns to route one', () => {
    let index = 0;
    for (let step = 0; step < routes.length - 1; step += 1) index = clampRouteIndex(index + 1, routes.length);
    expect(index).toBe(7);
    expect(routeIndicator(index, routes.length)).toBe('08 / 08');
    for (let step = 0; step < routes.length - 1; step += 1) index = clampRouteIndex(index - 1, routes.length);
    expect(index).toBe(0);
    expect(routeIndicator(index, routes.length)).toBe('01 / 08');
  });

  it('clamps navigation at both ends', () => {
    expect(clampRouteIndex(-1, routes.length)).toBe(0);
    expect(clampRouteIndex(99, routes.length)).toBe(7);
  });
});
