import React, { useEffect, useMemo, useState } from 'react';
import { Layers } from 'lucide-react';
import type { CampusDirection } from './campusDirections';
import { campusLabels } from './campusDirections';
import type { Language } from '../context/LanguageContext';
import CampusMap2D from './CampusMap2D';
import { findRoomByCodeOrId, parseRoomCodeFromDestinationLabel } from './campusMapGeometry';
import { buildCampusExactRoutePlan, routeHighlightsForFloor, routePolylineForFloor } from './campusExactRouting';
import { useCampusMapData } from './useCampusMapData';
import type { CampusFloorId, CampusMatchApiRoom, CampusNavigationRouteMode, CampusRouteResult } from './campusMapTypes';

export type CampusNavigationMapOnlyProps = {
  direction: CampusDirection;
  language: Language;
  routeMode: CampusNavigationRouteMode;
  routeResult?: CampusRouteResult | null;
  onMappedRoomSelect?: (room: CampusMatchApiRoom) => void;
};

export default function CampusNavigationMapOnly({
  direction,
  language,
  routeMode,
  routeResult = null,
  onMappedRoomSelect,
}: CampusNavigationMapOnlyProps) {
  const labels = campusLabels(language) as Record<string, string>;
  const { data, error } = useCampusMapData();
  const highlightCode = parseRoomCodeFromDestinationLabel(direction.to);
  const selectedRoomLookup = useMemo(() => findRoomByCodeOrId(data, highlightCode), [data, highlightCode]);
  const [viewFloorId, setViewFloorId] = useState<CampusFloorId>(direction.floor_id ?? 'GF');

  useEffect(() => {
    setViewFloorId((selectedRoomLookup.floor?.floor_id as CampusFloorId | undefined) ?? direction.floor_id ?? 'GF');
  }, [direction.floor_id, selectedRoomLookup.floor?.floor_id]);

  const exactRoutePlan = useMemo(
    () => buildCampusExactRoutePlan(data, selectedRoomLookup.room, selectedRoomLookup.floor, routeMode),
    [data, routeMode, selectedRoomLookup.floor, selectedRoomLookup.room],
  );

  const routePolyline = useMemo(
    () => {
      if (routeResult?.status === 'ok') {
        const segment = routeResult.floor_segments.find((s) => s.floor_id === viewFloorId);
        if (segment?.polyline && segment.polyline.length >= 2) {
          return segment.polyline;
        }
      }
      return routePolylineForFloor(exactRoutePlan, viewFloorId);
    },
    [exactRoutePlan, routeResult, viewFloorId],
  );

  const routeHighlightPoints = useMemo(
    () => routeHighlightsForFloor(exactRoutePlan, viewFloorId),
    [exactRoutePlan, viewFloorId],
  );

  const handleRoomSelect = (roomCode: string) => {
    const lookup = findRoomByCodeOrId(data, roomCode);
    if (!lookup.room || !lookup.floor || !lookup.block || !onMappedRoomSelect) return;
    onMappedRoomSelect({
      id: lookup.room.id,
      code: lookup.room.code,
      name: lookup.room.name,
      floor_id: lookup.floor.floor_id,
      floor_name: lookup.floor.floor_name,
      block_code: lookup.block.block_code,
      block_id: lookup.block.block_id,
      category: lookup.room.category ?? null,
      type: lookup.room.type ?? null,
      department: lookup.room.department ?? null,
    });
  };

  return (
    <section className="campus-map-only-stage" aria-label={labels.campusNavigation}>
      <nav className="campus-nav-floor-tabs campus-nav-floor-tabs--prominent" role="tablist" aria-label={labels.floorPlanTabs}>
        {(['GF', 'FF', 'SF'] as const).map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={viewFloorId === id}
            className={viewFloorId === id ? 'is-active' : ''}
            onClick={() => setViewFloorId(id)}
          >
            {viewFloorId === id ? <Layers size={18} strokeWidth={2.2} aria-hidden /> : null}
            {id === 'GF'
              ? labels.floorTabGFFull || labels.floorTabGF
              : id === 'FF'
                ? labels.floorTabFFFull || labels.floorTabFF
                : labels.floorTabSFFull || labels.floorTabSF}
          </button>
        ))}
      </nav>
      <div className="campus-map-wrap campus-map-wrap--2d campus-map-wrap--embedded">
        <CampusMap2D
          data={data}
          highlightCode={highlightCode}
          targetFloorId={(selectedRoomLookup.floor?.floor_id as CampusFloorId | undefined) ?? direction.floor_id ?? null}
          viewFloorId={viewFloorId}
          onFloorChange={setViewFloorId}
          showFloorTabs={false}
          language={language}
          loadError={error}
          routePolyline={routePolyline}
          routeHighlightPoints={routeHighlightPoints}
          routeWarning={exactRoutePlan.warning}
          onRoomSelect={handleRoomSelect}
        />
      </div>
    </section>
  );
}
