export type CampusPoint = {
  x: number;
  y: number;
};

export type CampusDoor = CampusPoint & {
  label?: string;
};

export type CampusRoom = {
  id: string;
  code: string;
  name: string;
  aliases?: string[];
  type?: string;
  category?: string;
  department?: string | null;
  floor_id?: string;
  block_code?: string;
  door?: CampusDoor;
  polygon?: [number, number][];
  /** Only "exact_image" geometry is rendered on the PNG floor plan. Legacy schematic geometry is ignored. */
  geometry_source?: 'exact_image' | 'schematic' | string;
  route_polyline_from_kiosk?: [number, number][];
  route_polyline_from_lift?: [number, number][];
  clickable?: boolean;
  routable?: boolean;
  location_note?: string;
  landmark?: string;
};

export type CampusBlock = {
  block_id: string;
  block_code: string;
  block_name: string;
  rooms: CampusRoom[];
};

export type CampusFloor = {
  floor_id: string;
  floor_number: number;
  floor_name: string;
  image_ref: string;
  /** Exact rendered floor-plan image dimensions when available. */
  width?: number;
  height?: number;
  /** Legacy authored SVG/logical size. Do not use for exact PNG overlays unless geometry_source is exact_image. */
  map_width?: number;
  map_height?: number;
  blocks: CampusBlock[];
};

/** Navigation graph vertices from svit-campus-map.json (subset used for overlay bounds). */
export type CampusGraphNode = {
  id: string;
  floor_id?: string;
  x?: number;
  y?: number;
};

/** Optional kiosk / default map origin marker in map pixel space. */
export type CampusMapKiosk = {
  floor_id: string;
  x: number;
  y: number;
  label?: string;
};

export type CampusMapData = {
  version: string;
  institution: string;
  address?: string;
  coordinate_space?: { unit?: string; note?: string; width?: number; height?: number };
  kiosk?: CampusMapKiosk;
  nodes?: CampusGraphNode[];
  floors: CampusFloor[];
};

export type CampusFloorId = 'GF' | 'FF' | 'SF';

export type CampusMatchApiRoom = {
  id?: string;
  code: string;
  name: string;
  floor_id: string;
  floor_name: string;
  block_code: string;
  block_id?: string;
  category?: string | null;
  type?: string | null;
  department?: string | null;
};

export type CampusMatchApiResponse = {
  matched: boolean;
  score: number;
  room: CampusMatchApiRoom | null;
  error?: string;
  clarify?: { question: string; options: CampusMatchApiRoom[] } | null;
};

export type CampusRouteNode = Record<string, unknown>;
export type CampusRouteEdge = Record<string, unknown>;

export type CampusRouteFloorSegment = {
  floor_id: string;
  polyline?: [number, number][];
  steps?: string[];
};

export type CampusRouteSegment = {
  floor_id: string;
  polyline: [number, number][];
};

export type CampusNavigationRouteMode = 'default' | 'accessible' | 'lift' | 'stairs';

export type CampusRouteResult = {
  status: 'ok' | 'error' | 'no_route';
  error_code: string | null;
  route_id: string;
  mode: string;
  origin: Record<string, unknown>;
  destination: Record<string, unknown>;
  distance_m: number;
  eta_s: number;
  floors_involved: string[];
  path_nodes: CampusRouteNode[];
  path_edges: CampusRouteEdge[];
  floor_segments: CampusRouteFloorSegment[];
  warnings: string[];
};
