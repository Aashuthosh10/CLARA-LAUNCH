import React, { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { Layers, ZoomIn, ZoomOut, MapPin, Waypoints, DoorOpen, Building2, ChevronsUp } from 'lucide-react';
import type { Language } from '../context/LanguageContext';
import { campusLabels } from './campusDirections';
import type { CampusFloor, CampusFloorId, CampusMapData, CampusRoom } from './campusMapTypes';
import type { CampusRouteHighlightPoint } from './campusExactRouting';
import {
  findRoomByCodeOrId,
  findRoomOnFloor,
  floorIdForRoomCode,
  isExactImageMappedRoom,
  normalizeRoomCode,
} from './campusMapGeometry';

const DEBUG_LS_KEY = 'clara_campus_map_debug';
const ANNOTATION_LS_KEY = 'clara_campus_annotate';
const EXACT_FLOOR_IMAGES: Record<CampusFloorId, { src: string; w: number; h: number }> = {
  GF: { src: '/maps/ground-floor.png', w: 1999, h: 1545 },
  FF: { src: '/maps/first-floor.png', w: 1600, h: 1131 },
  SF: { src: '/maps/second-floor.png', w: 1999, h: 1545 },
};

function readCampusMapDebugEnabled(): boolean {
  if (!import.meta.env.DEV) return false;
  try {
    return typeof window !== 'undefined' && window.localStorage?.getItem(DEBUG_LS_KEY) === '1';
  } catch {
    return false;
  }
}

function readCampusMapAnnotationEnabled(): boolean {
  if (!import.meta.env.DEV) return false;
  try {
    return typeof window !== 'undefined' && window.localStorage?.getItem(ANNOTATION_LS_KEY) === '1';
  } catch {
    return false;
  }
}

function polygonPointsAttr(pts: [number, number][]): string {
  return pts.map(([x, y]) => `${x},${y}`).join(' ');
}

function polygonCentroid(pts: [number, number][]): [number, number] {
  let sx = 0;
  let sy = 0;
  for (const [x, y] of pts) {
    sx += x;
    sy += y;
  }
  const n = pts.length || 1;
  return [sx / n, sy / n];
}

function iterRoomsOnFloor(floor: CampusFloor): CampusRoom[] {
  const out: CampusRoom[] = [];
  for (const block of floor.blocks) {
    for (const room of block.rooms) {
      out.push(room);
    }
  }
  return out;
}

type CampusMap2DProps = {
  data: CampusMapData | null;
  /** Room code from map JSON (e.g. A-001, CLARA-KIOSK) */
  highlightCode: string | null;
  /** Preferred floor from backend match (avoids code-based heuristics). */
  targetFloorId?: CampusFloorId | null;
  viewFloorId?: CampusFloorId;
  onFloorChange?: (floorId: CampusFloorId) => void;
  showFloorTabs?: boolean;
  language: Language;
  loadError?: string | null;
  /**
   * Optional route in map pixel space for the **currently viewed** floor.
   * (Routing phase will populate; must align with floor image / JSON coordinates.)
   */
  routePolyline?: [number, number][] | null;
  routeHighlightPoints?: CampusRouteHighlightPoint[];
  routeWarning?: string | null;
  onRoomSelect?: (roomCode: string) => void;
  /**
   * Temporary kiosk / “you are here” override. When `floor_id` matches the viewed floor, shown on top of the map.
   * If omitted, `data.kiosk` is used when present.
   */
  mapOrigin?: { x: number; y: number; floor_id: CampusFloorId; label?: string } | null;
};

export default function CampusMap2D({
  data,
  highlightCode,
  targetFloorId,
  viewFloorId: controlledViewFloorId,
  onFloorChange,
  showFloorTabs = true,
  language,
  loadError,
  routePolyline = null,
  routeHighlightPoints = [],
  routeWarning = null,
  onRoomSelect,
  mapOrigin = null,
}: CampusMap2DProps) {
  const labels = campusLabels(language) as Record<string, string>;
  const overlayHint =
    labels.campusMapOverlayUnavailable ||
    'Outline data for this room is not on the map yet — the floor plan still shows below.';

  const [viewFloorId, setViewFloorId] = useState<CampusFloorId>('GF');
  const effectiveFloorId = controlledViewFloorId ?? viewFloorId;

  const [intrinsicSize, setIntrinsicSize] = useState<{ w: number; h: number } | null>(null);
  const [mapZoom, setMapZoom] = useState(1.12);
  const [debugEnabled, setDebugEnabled] = useState(() => readCampusMapDebugEnabled());
  const [annotationEnabled, setAnnotationEnabled] = useState(() => readCampusMapAnnotationEnabled());
  const [debugPoint, setDebugPoint] = useState<{ x: number; y: number } | null>(null);
  const [annotationPoints, setAnnotationPoints] = useState<[number, number][]>([]);
  const [annotationDoor, setAnnotationDoor] = useState<[number, number] | null>(null);

  const ZOOM_MIN = 0.8;
  const ZOOM_MAX = 2.2;
  const ZOOM_STEP = 0.2;
  const routeArrowId = `campusRouteArrow-${useId().replace(/:/g, '')}`;

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const onStorage = (e: StorageEvent) => {
      if (e.key === DEBUG_LS_KEY) setDebugEnabled(readCampusMapDebugEnabled());
      if (e.key === ANNOTATION_LS_KEY) setAnnotationEnabled(readCampusMapAnnotationEnabled());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    if (!import.meta.env.DEV || !annotationEnabled) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setAnnotationPoints([]);
        setAnnotationDoor(null);
        return;
      }
      if (e.key === 'Backspace') {
        setAnnotationPoints((pts) => pts.slice(0, -1));
        return;
      }
      if (e.key.toLowerCase() === 'c') {
        const payload = JSON.stringify(
          {
            polygon: annotationPoints,
            ...(annotationDoor ? { door: { x: annotationDoor[0], y: annotationDoor[1], label: 'Door' } } : {}),
          },
          null,
          2,
        );
        console.log('Campus polygon annotation:', payload);
        void navigator.clipboard?.writeText(payload).catch(() => undefined);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [annotationDoor, annotationEnabled, annotationPoints]);

  useEffect(() => {
    if (targetFloorId) {
      setViewFloorId(targetFloorId);
      return;
    }
    const matched = findRoomByCodeOrId(data, highlightCode);
    if (matched.floor?.floor_id) {
      setViewFloorId(matched.floor.floor_id as CampusFloorId);
      return;
    }
    if (!highlightCode) return;
    setViewFloorId(floorIdForRoomCode(highlightCode));
  }, [data, highlightCode, targetFloorId]);

  const floor = useMemo(() => data?.floors.find((f) => f.floor_id === effectiveFloorId) ?? null, [data, effectiveFloorId]);

  const highlightedRoom = useMemo(() => {
    if (!floor || !highlightCode) return null;
    return findRoomOnFloor(floor, highlightCode);
  }, [floor, highlightCode]);

  const exactFloorImage = EXACT_FLOOR_IMAGES[effectiveFloorId as CampusFloorId] ?? EXACT_FLOOR_IMAGES.GF;

  const viewBoxW = floor?.width ?? intrinsicSize?.w ?? exactFloorImage.w;
  const viewBoxH = floor?.height ?? intrinsicSize?.h ?? exactFloorImage.h;

  const imageSrc = floor?.image_ref || exactFloorImage.src;

  useEffect(() => {
    setIntrinsicSize({ w: exactFloorImage.w, h: exactFloorImage.h });
  }, [exactFloorImage.h, exactFloorImage.w, imageSrc]);

  const handleImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = e.currentTarget;
    if (naturalWidth > 0 && naturalHeight > 0) {
      setIntrinsicSize({ w: naturalWidth, h: naturalHeight });
    }
  }, []);

  const exactHighlightedRoom = isExactImageMappedRoom(highlightedRoom) ? highlightedRoom : null;
  const hasRoomOverlay =
    Boolean(exactHighlightedRoom?.polygon && exactHighlightedRoom.polygon.length >= 3) ||
    Boolean(exactHighlightedRoom?.door);

  const kioskMarker = useMemo(() => {
    if (!floor) return null;
    const fromProp =
      mapOrigin && mapOrigin.floor_id === (effectiveFloorId as CampusFloorId)
        ? { x: mapOrigin.x, y: mapOrigin.y, label: mapOrigin.label ?? labels.mainEntrance }
        : null;
    const k = data?.kiosk;
    const fromJson =
      k && (k.floor_id === effectiveFloorId || k.floor_id === floor.floor_id)
        ? { x: k.x, y: k.y, label: k.label || labels.mainEntrance }
        : null;
    return fromProp ?? fromJson;
  }, [data?.kiosk, effectiveFloorId, floor, labels.mainEntrance, mapOrigin]);

  const routeOnFloor = useMemo(() => {
    if (!routePolyline || routePolyline.length < 2) return null;
    return routePolyline;
  }, [routePolyline]);

  const selectedPolygon = exactHighlightedRoom?.polygon && exactHighlightedRoom.polygon.length >= 3
    ? exactHighlightedRoom.polygon
    : null;
  const selectedDoor = exactHighlightedRoom?.door ?? null;

  const allRoomsOnFloor = useMemo(() => (floor ? iterRoomsOnFloor(floor) : []), [floor]);
  const exactMappedRoomsOnFloor = useMemo(
    () => allRoomsOnFloor.filter((room) => isExactImageMappedRoom(room) && room.polygon && room.polygon.length >= 3),
    [allRoomsOnFloor],
  );

  const overlayWarnings = useMemo(() => {
    if (!highlightCode || !highlightedRoom) return [];
    if (routeWarning) return [routeWarning];
    if (!isExactImageMappedRoom(highlightedRoom)) {
      return ['Exact map highlight is not available for this room yet.'];
    }
    const out: string[] = [];
    if (!highlightedRoom.polygon || highlightedRoom.polygon.length < 3) out.push('Room outline is not mapped yet.');
    if (!highlightedRoom.door) out.push('Door point is not mapped yet.');
    if (!routeOnFloor) out.push('Route path is not mapped yet.');
    return out;
  }, [highlightCode, highlightedRoom, routeOnFloor, routeWarning]);

  const svgPointFromEvent = useCallback((e: React.PointerEvent<SVGSVGElement>): { x: number; y: number } | null => {
      const svg = e.currentTarget;
      const pt = svg.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      const matrix = svg.getScreenCTM();
      if (!matrix) return;
      const p = pt.matrixTransform(matrix.inverse());
      const x = Math.round(p.x);
      const y = Math.round(p.y);
      return { x, y };
  }, []);

  const handleOverlayPointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!import.meta.env.DEV || (!debugEnabled && !annotationEnabled)) return;
      const point = svgPointFromEvent(e);
      if (point) setDebugPoint(point);
    },
    [annotationEnabled, debugEnabled, svgPointFromEvent],
  );

  const handleOverlayPointerDown = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!import.meta.env.DEV || (!debugEnabled && !annotationEnabled)) return;
      const point = svgPointFromEvent(e);
      if (!point) return;
      const { x, y } = point;
      console.log('Campus map coordinate:', { floor_id: effectiveFloorId, x, y });
      void navigator.clipboard?.writeText(`[${x}, ${y}]`).catch(() => undefined);
      if (annotationEnabled) {
        e.preventDefault();
        e.stopPropagation();
        if (e.altKey) {
          setAnnotationDoor([x, y]);
        } else {
          setAnnotationPoints((pts) => [...pts, [x, y]]);
        }
      }
    },
    [annotationEnabled, debugEnabled, effectiveFloorId, svgPointFromEvent],
  );

  if (loadError || !data) {
    return (
      <div className="campus-map-2d campus-map-2d--empty" role="status">
        <Layers size={28} aria-hidden />
        <p>{loadError ? labels.campusMapLoadError : labels.campusMapLoading}</p>
      </div>
    );
  }

  return (
    <div className="campus-map-2d">
      {showFloorTabs ? (
        <div className="campus-map-2d-tabs" role="tablist" aria-label={labels.floorPlanTabs}>
          {(['GF', 'FF', 'SF'] as const).map((id) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={effectiveFloorId === id}
              className={effectiveFloorId === id ? 'is-active' : ''}
              onClick={() => {
                setViewFloorId(id);
                onFloorChange?.(id);
              }}
            >
              {id === 'GF'
                ? labels.floorTabGFFull || labels.floorTabGF
                : id === 'FF'
                  ? labels.floorTabFFFull || labels.floorTabFF
                  : labels.floorTabSFFull || labels.floorTabSF}
            </button>
          ))}
        </div>
      ) : null}

      <div className="campus-map-2d-canvas">
        <div
          className="campus-map-2d-viewport"
          style={{ aspectRatio: `${viewBoxW} / ${viewBoxH}` }}
        >
          <div
            className="campus-map-2d-zoom-layer"
            style={{
              transform: `scale(${mapZoom})`,
              transformOrigin: 'center center',
            }}
          >
            <img
              src={imageSrc}
              alt={floor?.floor_name ?? labels.visualMap}
              className="campus-map-2d-image"
              draggable={false}
              onLoad={handleImageLoad}
            />
            <svg
              className="campus-map-2d-overlay-svg"
              viewBox={`0 0 ${viewBoxW} ${viewBoxH}`}
              preserveAspectRatio="xMidYMid meet"
              onPointerMove={handleOverlayPointerMove}
              onPointerDown={handleOverlayPointerDown}
            >
              <defs>
                <marker
                  id={routeArrowId}
                  markerWidth="10"
                  markerHeight="10"
                  refX="9"
                  refY="3"
                  orient="auto"
                  markerUnits="strokeWidth"
                >
                  <path d="M0,0 L0,6 L9,3 z" fill="#6d28d9" />
                </marker>
              </defs>
              {routeOnFloor ? (
                <>
                  <polyline
                    className="campus-map-route-polyline-underlay"
                    points={polygonPointsAttr(routeOnFloor)}
                    fill="none"
                  />
                  <polyline
                    className="campus-map-route-polyline"
                    points={polygonPointsAttr(routeOnFloor)}
                    fill="none"
                    markerEnd={`url(#${routeArrowId})`}
                  />
                </>
              ) : null}

            {exactMappedRoomsOnFloor.map((room) => {
              const isSelected = normalizeRoomCode(room.code) === normalizeRoomCode(highlightCode ?? '');
              return (
                <polygon
                  key={`click-poly-${room.id}`}
                  data-room-code={room.code}
                  points={polygonPointsAttr(room.polygon!)}
                  className={isSelected ? 'campus-map-click-room is-selected' : 'campus-map-click-room'}
                  onClick={(e) => {
                    e.stopPropagation();
                    onRoomSelect?.(room.code);
                  }}
                />
              );
            })}

            {import.meta.env.DEV && debugEnabled && floor
              ? exactMappedRoomsOnFloor.map((room) => {
                  const poly = room.polygon;
                  const isHi = highlightedRoom && room.code === highlightedRoom.code;
                  return (
                    <polygon
                      key={`dbg-poly-${room.id}`}
                      points={polygonPointsAttr(poly)}
                      className={isHi ? 'campus-map-room-dbg is-highlighted' : 'campus-map-room-dbg'}
                    />
                  );
                })
              : null}

            {selectedPolygon ? (
              <polygon
                points={polygonPointsAttr(selectedPolygon)}
                className="campus-map-room-highlight"
              />
            ) : null}

            {import.meta.env.DEV && debugEnabled
              ? allRoomsOnFlatRooms(exactMappedRoomsOnFloor).map((room) => {
                  const d = room.door;
                  if (!d) return null;
                  return (
                    <g key={`dbg-door-${room.id}`}>
                      <circle className="campus-map-door-dbg" cx={d.x} cy={d.y} r={5} />
                      <text
                        className="campus-map-debug-text"
                        x={d.x + 8}
                        y={d.y - 6}
                        textAnchor="start"
                      >
                        {`${Math.round(d.x)},${Math.round(d.y)}`}
                      </text>
                    </g>
                  );
                })
              : null}

            {selectedDoor ? (
              <g className="campus-map-door-marker">
                <circle className="campus-map-door-ring" cx={selectedDoor.x} cy={selectedDoor.y} r={16} />
                <circle className="campus-map-door-highlight" cx={selectedDoor.x} cy={selectedDoor.y} r={8} />
                <text className="campus-map-door-label" x={selectedDoor.x + 12} y={selectedDoor.y - 12}>
                  DOOR
                </text>
                {exactHighlightedRoom ? (
                  <text className="campus-map-room-label" x={selectedDoor.x + 12} y={selectedDoor.y + 10}>
                    {exactHighlightedRoom.code}
                  </text>
                ) : null}
              </g>
            ) : null}

            {routeHighlightPoints.map((point) => {
              if (point.kind !== 'lift') return null;
              return (
                <g key={`route-highlight-${point.kind}-${point.x}-${point.y}`} className="campus-map-lift-highlight">
                  <circle className="campus-map-lift-ring" cx={point.x} cy={point.y} r={24} />
                  <circle className="campus-map-lift-dot" cx={point.x} cy={point.y} r={10} />
                  <text className="campus-map-lift-label" x={point.x + 16} y={point.y - 16}>
                    LIFT
                  </text>
                </g>
              );
            })}

            {kioskMarker ? (
              <g className="campus-map-kiosk-marker">
                <g transform={`translate(${kioskMarker.x},${kioskMarker.y})`}>
                  <path
                    d="M0,-20 C-9,-20 -16,-13 -16,-4 C-16,8 0,24 0,24 C0,24 16,8 16,-4 C16,-13 9,-20 0,-20 Z"
                    fill="#6d28d9"
                    stroke="#ffffff"
                    strokeWidth="2"
                  />
                  <circle cx="0" cy="-7" r="4.5" fill="#ffffff" />
                </g>
                <g transform={`translate(${kioskMarker.x},${kioskMarker.y + 34})`}>
                  <rect
                    x="-78"
                    y="-10"
                    width="156"
                    height="22"
                    rx="8"
                    fill="#6d28d9"
                    stroke="#fff"
                    strokeWidth="1.5"
                  />
                  <text
                    x="0"
                    y="5"
                    textAnchor="middle"
                    className="campus-map-you-are-here-text"
                    fill="#ffffff"
                    fontSize="11"
                    fontWeight="700"
                    fontFamily="system-ui, sans-serif"
                  >
                    {labels.campusYouAreHere}
                  </text>
                </g>
              </g>
            ) : null}

            {import.meta.env.DEV && debugEnabled && highlightedRoom?.polygon && highlightedRoom.polygon.length >= 3 ? (
              <text
                className="campus-map-debug-text"
                x={polygonCentroid(highlightedRoom.polygon)[0]}
                y={polygonCentroid(highlightedRoom.polygon)[1]}
                textAnchor="middle"
                dominantBaseline="middle"
              >
                {highlightedRoom.id}
              </text>
            ) : null}

            {import.meta.env.DEV && annotationEnabled ? (
              <g className="campus-map-annotation-layer">
                {annotationPoints.length >= 2 ? (
                  <polyline
                    points={polygonPointsAttr(annotationPoints)}
                    className="campus-map-annotation-polyline"
                    fill="none"
                  />
                ) : null}
                {annotationPoints.map(([x, y], i) => (
                  <g key={`annotation-point-${i}`}>
                    <circle className="campus-map-annotation-point" cx={x} cy={y} r={6} />
                    <text className="campus-map-debug-text" x={x + 8} y={y - 8}>
                      {i + 1}
                    </text>
                  </g>
                ))}
                {annotationDoor ? (
                  <g>
                    <circle className="campus-map-annotation-door" cx={annotationDoor[0]} cy={annotationDoor[1]} r={8} />
                    <text className="campus-map-debug-text" x={annotationDoor[0] + 10} y={annotationDoor[1] - 10}>
                      door
                    </text>
                  </g>
                ) : null}
              </g>
            ) : null}
            </svg>
          </div>

          {import.meta.env.DEV && debugEnabled ? (
            <div className="campus-map-debug-badge">
              {effectiveFloorId} {viewBoxW}x{viewBoxH}
              {debugPoint ? ` | ${debugPoint.x},${debugPoint.y}` : ''}
              {highlightedRoom ? ` | ${highlightedRoom.code} | ${highlightedRoom.geometry_source ?? 'unverified'}` : ''}
            </div>
          ) : null}

          {import.meta.env.DEV && annotationEnabled ? (
            <div className="campus-map-annotation-badge">
              Click: polygon point | Alt-click: door | C: copy JSON | Backspace: undo | Esc: clear
            </div>
          ) : null}

          {overlayWarnings.length ? (
            <div className="campus-map-overlay-warning" role="status">
              {overlayWarnings[0]}
            </div>
          ) : null}

          <div className="campus-map-2d-chrome">
            <div className="campus-map-2d-zoom-ctl" role="group" aria-label={labels.campusMapZoomControls}>
              <button
                type="button"
                className="campus-map-2d-icon-btn"
                aria-label={labels.campusMapZoomIn}
                disabled={mapZoom >= ZOOM_MAX - 0.01}
                onClick={() => setMapZoom((z) => Math.min(ZOOM_MAX, Math.round((z + ZOOM_STEP) * 10) / 10))}
              >
                <ZoomIn size={18} strokeWidth={2.25} />
              </button>
              <button
                type="button"
                className="campus-map-2d-icon-btn"
                aria-label={labels.campusMapZoomOut}
                disabled={mapZoom <= ZOOM_MIN + 0.01}
                onClick={() => setMapZoom((z) => Math.max(ZOOM_MIN, Math.round((z - ZOOM_STEP) * 10) / 10))}
              >
                <ZoomOut size={18} strokeWidth={2.25} />
              </button>
            </div>
            <div className="campus-map-2d-compass" title={labels.campusMapCompassHint}>
              <span className="campus-map-2d-compass-n" aria-hidden>
                N
              </span>
            </div>
          </div>
        </div>

        <div className="campus-map-2d-symbol-legend" role="list" aria-label={labels.campusMapLegendTitle}>
          <span className="campus-map-2d-symbol-item" role="listitem">
            <Waypoints size={14} className="campus-map-2d-symbol-icon" aria-hidden />
            {labels.campusMapLegendRoute}
          </span>
          <span className="campus-map-2d-symbol-item" role="listitem">
            <MapPin size={14} className="campus-map-2d-symbol-icon" aria-hidden />
            {labels.campusMapLegendYouAreHere}
          </span>
          <span className="campus-map-2d-symbol-item" role="listitem">
            <DoorOpen size={14} className="campus-map-2d-symbol-icon" aria-hidden />
            {labels.campusMapLegendDoor}
          </span>
          <span className="campus-map-2d-symbol-item" role="listitem">
            <Building2 size={14} className="campus-map-2d-symbol-icon" aria-hidden />
            {labels.campusMapLegendLift}
          </span>
          <span className="campus-map-2d-symbol-item" role="listitem">
            <ChevronsUp size={14} className="campus-map-2d-symbol-icon" aria-hidden />
            {labels.campusMapLegendStairs}
          </span>
        </div>

        <div className="campus-map-2d-legend-row">
          {highlightedRoom ? (
            <div className="campus-map-2d-legend-stack">
              <div className="campus-map-2d-legend">
                <strong>{highlightedRoom.code}</strong>
                <span>{highlightedRoom.name}</span>
              </div>
              {!hasRoomOverlay ? <p className="campus-map-2d-legend-hint">{overlayHint}</p> : null}
            </div>
          ) : highlightCode ? (
            <div className="campus-map-2d-legend campus-map-2d-legend--muted">{labels.campusMapNoOverlayMatch}</div>
          ) : (
            <div />
          )}
        </div>
        {import.meta.env.DEV ? (
          <p className="campus-map-2d-dev-hint" data-testid="campus-map-debug-hint">
            Debug overlay: set <code>localStorage.{DEBUG_LS_KEY} = &apos;1&apos;</code>. Annotation:
            set <code>localStorage.{ANNOTATION_LS_KEY} = &apos;1&apos;</code>, then reload.
          </p>
        ) : null}
      </div>
    </div>
  );
}

/** Typo guard: flatMap rooms (kept name for min diff if any). */
function allRoomsOnFlatRooms(rooms: CampusRoom[]): CampusRoom[] {
  return rooms;
}
