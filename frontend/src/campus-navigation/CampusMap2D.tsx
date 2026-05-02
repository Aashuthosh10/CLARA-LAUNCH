import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Layers } from 'lucide-react';
import type { Language } from '../context/LanguageContext';
import { campusLabels } from './campusDirections';
import type { CampusFloor, CampusFloorId, CampusMapData, CampusRoom } from './campusMapTypes';
import { computeFloorRefBounds, findRoomOnFloor, floorIdForRoomCode } from './campusMapGeometry';

const DEBUG_LS_KEY = 'clara_campus_map_debug';

function readCampusMapDebugEnabled(): boolean {
  if (!import.meta.env.DEV) return false;
  try {
    return typeof window !== 'undefined' && window.localStorage?.getItem(DEBUG_LS_KEY) === '1';
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
  /**
   * Temporary kiosk / “you are here” override. When `floor_id` matches the viewed floor, shown on top of the map.
   * If omitted, `data.kiosk` is used when present.
   */
  mapOrigin?: { x: number; y: number; floor_id: CampusFloorId } | null;
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
  mapOrigin = null,
}: CampusMap2DProps) {
  const labels = campusLabels(language);
  const overlayHint =
    (labels as Record<string, string>).campusMapOverlayUnavailable ||
    'Outline data for this room is not on the map yet — the floor plan still shows below.';

  const [viewFloorId, setViewFloorId] = useState<CampusFloorId>('GF');
  const effectiveFloorId = controlledViewFloorId ?? viewFloorId;

  const [intrinsicSize, setIntrinsicSize] = useState<{ w: number; h: number } | null>(null);
  const [debugEnabled, setDebugEnabled] = useState(() => readCampusMapDebugEnabled());

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const onStorage = (e: StorageEvent) => {
      if (e.key === DEBUG_LS_KEY) setDebugEnabled(readCampusMapDebugEnabled());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    if (targetFloorId) {
      setViewFloorId(targetFloorId);
      return;
    }
    if (!highlightCode) return;
    setViewFloorId(floorIdForRoomCode(highlightCode));
  }, [highlightCode, targetFloorId]);

  const floor = useMemo(() => data?.floors.find((f) => f.floor_id === effectiveFloorId) ?? null, [data, effectiveFloorId]);

  const highlightedRoom = useMemo(() => {
    if (!floor || !highlightCode) return null;
    return findRoomOnFloor(floor, highlightCode);
  }, [floor, highlightCode]);

  const refBounds = useMemo(() => (floor ? computeFloorRefBounds(floor) : { refW: 1980, refH: 1260 }), [floor]);

  const viewBoxW = intrinsicSize?.w ?? refBounds.refW;
  const viewBoxH = intrinsicSize?.h ?? refBounds.refH;

  const imageSrc = floor?.image_ref ?? '/maps/ground-floor.png';

  const handleImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = e.currentTarget;
    if (naturalWidth > 0 && naturalHeight > 0) {
      setIntrinsicSize({ w: naturalWidth, h: naturalHeight });
    }
  }, []);

  const hasRoomOverlay =
    Boolean(highlightedRoom?.polygon && highlightedRoom.polygon.length >= 3) || Boolean(highlightedRoom?.door);

  const kioskMarker = useMemo(() => {
    if (!floor) return null;
    const fromProp =
      mapOrigin && mapOrigin.floor_id === (effectiveFloorId as CampusFloorId)
        ? { x: mapOrigin.x, y: mapOrigin.y, label: labels.mainEntrance }
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

  const allRoomsOnFloor = useMemo(() => (floor ? iterRoomsOnFloor(floor) : []), [floor]);

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
              {id === 'GF' ? labels.floorTabGF : id === 'FF' ? labels.floorTabFF : labels.floorTabSF}
            </button>
          ))}
        </div>
      ) : null}

      <div className="campus-map-2d-canvas">
        <div
          className="campus-map-2d-viewport"
          style={{ aspectRatio: `${viewBoxW} / ${viewBoxH}` }}
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
            aria-hidden
          >
            {routeOnFloor ? (
              <polyline
                className="campus-map-route-polyline"
                points={polygonPointsAttr(routeOnFloor)}
                fill="none"
              />
            ) : null}

            {import.meta.env.DEV && debugEnabled && floor
              ? allRoomsOnFloor.map((room) => {
                  const poly = room.polygon;
                  if (!poly || poly.length < 3) return null;
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

            {highlightedRoom?.polygon && highlightedRoom.polygon.length >= 3 ? (
              <polygon
                points={polygonPointsAttr(highlightedRoom.polygon)}
                className="campus-map-room-highlight"
              />
            ) : null}

            {import.meta.env.DEV && debugEnabled
              ? allRoomsOnFlatRooms(allRoomsOnFloor).map((room) => {
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

            {highlightedRoom?.door ? (
              <circle
                className="campus-map-door-highlight"
                cx={highlightedRoom.door.x}
                cy={highlightedRoom.door.y}
                r={10}
              />
            ) : null}

            {kioskMarker ? (
              <g className="campus-map-kiosk-marker">
                <circle cx={kioskMarker.x} cy={kioskMarker.y} r={12} />
                <circle className="campus-map-kiosk-dot" cx={kioskMarker.x} cy={kioskMarker.y} r={4} />
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
          </svg>
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
            Debug overlay: in dev, set <code>localStorage.{DEBUG_LS_KEY} = &apos;1&apos;</code> then reload.
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
