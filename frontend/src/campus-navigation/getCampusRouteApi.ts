import { claraHttpBase } from './claraHttpBase';
import type { CampusRouteResult } from './campusMapTypes';

export type GetCampusRouteParams = {
  origin_node_id?: string | null;
  destination_room_code: string;
  /** Disambiguate lift / stairs room codes that repeat on every floor. */
  destination_floor_id?: 'GF' | 'FF' | 'SF' | null;
  /** Backend: shortest | accessible | lift | stairs */
  mode?: string;
  /** BCP-47 or short code; MVP steps are English regardless. */
  language?: string;
};

function syntheticRoute(
  status: 'error' | 'no_route',
  error_code: string,
  mode: string,
  warnings: string[],
): CampusRouteResult {
  return {
    status,
    error_code,
    route_id: '',
    mode,
    origin: {},
    destination: {},
    distance_m: 0,
    eta_s: 0,
    floors_involved: [],
    path_nodes: [],
    path_edges: [],
    floor_segments: [],
    warnings,
  };
}

function normalizeRouteJson(raw: unknown, mode: string): CampusRouteResult {
  if (!raw || typeof raw !== 'object') {
    return syntheticRoute('error', 'unknown', mode, ['Unexpected route response.']);
  }
  const o = raw as Partial<CampusRouteResult> & { warnings?: unknown };
  const warnings = Array.isArray(o.warnings) ? o.warnings.map((w) => String(w)) : [];
  const status = o.status === 'ok' || o.status === 'no_route' || o.status === 'error' ? o.status : 'error';
  let error_code = o.error_code != null && String(o.error_code).trim() ? String(o.error_code) : null;
  if (status === 'ok') {
    error_code = error_code ?? null;
  } else if (!error_code) {
    error_code = status === 'no_route' ? 'no_path' : 'unknown';
  }
  return {
    status,
    error_code,
    route_id: typeof o.route_id === 'string' ? o.route_id : '',
    mode: typeof o.mode === 'string' ? o.mode : mode,
    origin: (o.origin && typeof o.origin === 'object' ? o.origin : {}) as CampusRouteResult['origin'],
    destination: (o.destination && typeof o.destination === 'object' ? o.destination : {}) as CampusRouteResult['destination'],
    distance_m: typeof o.distance_m === 'number' ? o.distance_m : 0,
    eta_s: typeof o.eta_s === 'number' ? o.eta_s : 0,
    floors_involved: Array.isArray(o.floors_involved) ? o.floors_involved.map(String) : [],
    path_nodes: Array.isArray(o.path_nodes) ? (o.path_nodes as CampusRouteResult['path_nodes']) : [],
    path_edges: Array.isArray(o.path_edges) ? (o.path_edges as CampusRouteResult['path_edges']) : [],
    floor_segments: Array.isArray(o.floor_segments) ? (o.floor_segments as CampusRouteResult['floor_segments']) : [],
    warnings,
  };
}

/**
 * Fetches a deterministic campus route. Never returns null for a non-empty code:
 * network/HTTP failures become structured `CampusRouteResult` rows (no fake path).
 */
export async function getCampusRouteApi(params: GetCampusRouteParams): Promise<CampusRouteResult> {
  const code = params.destination_room_code.trim();
  const mode = params.mode ?? 'shortest';
  if (!code) {
    return syntheticRoute('error', 'invalid_destination', mode, ['destination_room_code is empty.']);
  }
  try {
    const res = await fetch(`${claraHttpBase()}/api/campus/route`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        origin_node_id: params.origin_node_id ?? undefined,
        destination_room_code: code,
        destination_floor_id: params.destination_floor_id ?? undefined,
        mode,
        language: params.language ?? 'en',
      }),
    });
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      body = null;
    }
    if (!res.ok) {
      const msg =
        body && typeof body === 'object' && 'detail' in body
          ? String((body as { detail?: unknown }).detail)
          : `Server returned HTTP ${res.status}.`;
      return syntheticRoute('error', 'http_error', mode, [msg]);
    }
    return normalizeRouteJson(body, mode);
  } catch {
    return syntheticRoute(
      'error',
      'backend_unreachable',
      mode,
      ['Could not reach the directions server. Check your connection and try again.'],
    );
  }
}
