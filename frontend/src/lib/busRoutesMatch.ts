import type { CollegeBusRoute } from '../data/collegeBusRoutes.types';

/** Fold for fuzzy compare; keep letters and numbers across scripts. */
export function normalizeForMatch(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Longest alphanumeric token sequences from user query (skip very short noise). */
function significantTokens(query: string): string[] {
  const n = normalizeForMatch(query);
  if (!n) return [];
  return n.split(' ').filter((w) => w.length >= 2);
}

/** Levenshtein-based similarity in [0,1] for short place names (~≤40 chars). */
function similarityRatio(normA: string, normB: string): number {
  if (!normA.length || !normB.length) return 0;
  if (normA === normB) return 1;
  const al = normA.length;
  const bl = normB.length;
  if (normA.includes(normB) || normB.includes(normA))
    return 0.9 + Math.min(normB.length / normA.length, normA.length / normB.length) * 0.05;

  let prev = new Array(bl + 1);
  let cur = new Array(bl + 1);
  for (let j = 0; j <= bl; j++) prev[j] = j;

  for (let i = 1; i <= al; i++) {
    cur[0] = i;
    const ca = normA.charCodeAt(i - 1);
    for (let j = 1; j <= bl; j++) {
      const cost = ca === normB.charCodeAt(j - 1) ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, cur] = [cur, prev];
  }

  const dist = prev[bl];
  return 1 - dist / Math.max(al, bl);
}

export type BusStopHighlight = {
  routeNumber: number;
  /** Exact stop name string from JSON (for row key/highlight equality). */
  stopName: string;
};

/** Find best matching stop across all routes using user location text. */
export function findBestBusStopHighlight(
  userQuery: string | null | undefined,
  routes: CollegeBusRoute[],
): BusStopHighlight | null {
  const raw = typeof userQuery === 'string' ? userQuery : '';
  if (!normalizeForMatch(raw)) return null;

  const tokens = significantTokens(raw);
  const normalizedQuery = normalizeForMatch(raw);

  let bestScore = 0.35;
  let best: BusStopHighlight | null = null;

  for (const route of routes) {
    for (const stop of route.stops) {
      const normStop = normalizeForMatch(stop.name);
      let score = 0;

      if (normalizedQuery && normStop) {
        if (normStop.includes(normalizedQuery) || normalizedQuery.includes(normStop)) {
          score = Math.max(score, 0.95);
        }
      }

      for (const tok of tokens) {
        if (tok.length < 3) continue;
        if (normStop.includes(tok) || tok.includes(normStop)) {
          score = Math.max(score, 0.88);
        }
        score = Math.max(score, similarityRatio(tok, normStop));
      }

      if (tokens.length >= 2) {
        const joined = tokens.slice(0, 4).join(' ');
        score = Math.max(score, similarityRatio(joined, normStop));
      }

      score = Math.max(score, similarityRatio(normalizedQuery, normStop));

      if (score > bestScore) {
        bestScore = score;
        best = { routeNumber: route.route_number, stopName: stop.name };
      }
    }
  }

  return best;
}

/** First index among ordered routes for route_number. */
export function routeIndexByNumber(routes: CollegeBusRoute[], routeNumber: number): number {
  const i = routes.findIndex((r) => r.route_number === routeNumber);
  return Math.max(0, i);
}

/** Triplet windows: centered on focused route when possible. */
export function visibleRouteStartIndex(
  routesLen: number,
  focusedRouteNumber: number,
  routesSorted: CollegeBusRoute[],
): number {
  if (routesLen <= 3) return 0;
  const idx = routesSorted.findIndex((r) => r.route_number === focusedRouteNumber);
  const fi = idx < 0 ? 0 : idx;
  let start = Math.max(0, fi - 1);
  start = Math.min(start, routesLen - 3);
  return start;
}
