export function clampRouteIndex(index: number, routeCount: number): number {
  if (routeCount <= 0) return 0;
  return Math.max(0, Math.min(routeCount - 1, index));
}

export function routeIndicator(index: number, routeCount: number): string {
  return `${String(clampRouteIndex(index, routeCount) + 1).padStart(2, '0')} / ${String(routeCount).padStart(2, '0')}`;
}
