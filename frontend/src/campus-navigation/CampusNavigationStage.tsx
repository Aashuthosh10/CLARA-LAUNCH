import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Layers } from 'lucide-react';
import type { CampusDirection } from './campusDirections';
import { campusLabels } from './campusDirections';
import type { Language } from '../context/LanguageContext';
import CampusMap2D from './CampusMap2D';
import { findRoomByCodeOrId, parseRoomCodeFromDestinationLabel } from './campusMapGeometry';
import {
  buildCampusExactRoutePlan,
  routeHighlightsForFloor,
  routePolylineForFloor,
} from './campusExactRouting';
import { useCampusMapData } from './useCampusMapData';
import type { CampusFloorId, CampusMatchApiRoom, CampusNavigationRouteMode, CampusRouteResult } from './campusMapTypes';
import type { ChatOrbState } from '../screens/chat/ChatOrbControl';
import CampusNavSidebar from './CampusNavSidebar';
import CampusNavKioskChrome from './CampusNavKioskChrome';
import { legacyCampusIndexForCode } from './legacyCampusIndex';

export type CampusNavigationStageProps = {
  direction: CampusDirection;
  language: Language;
  routeResult?: CampusRouteResult | null;
  displaySteps: string[];
  routeMode: CampusNavigationRouteMode;
  onRouteModeChange: (mode: CampusNavigationRouteMode) => void;
  selectedCampusIndex: number;
  onDestinationIndexChange: (index: number) => void;
  onMappedRoomSelect?: (room: CampusMatchApiRoom) => void;
  onSpeakRoute: () => void;
  onStopSpeak: () => void;
  isCampusSpeaking: boolean;
  onStartOverNav: () => void;
  orbState: ChatOrbState;
  isOrbProcessing: boolean;
  orbAmplitude: number;
  onOrbTap: () => void;
};

export default function CampusNavigationStage({
  direction,
  language,
  routeResult = null,
  displaySteps,
  routeMode,
  onRouteModeChange,
  selectedCampusIndex,
  onDestinationIndexChange,
  onMappedRoomSelect,
  onSpeakRoute,
  onStopSpeak,
  isCampusSpeaking,
  onStartOverNav,
  orbState,
  isOrbProcessing,
  orbAmplitude,
  onOrbTap,
}: CampusNavigationStageProps) {
  const labels = campusLabels(language) as Record<string, string>;
  const { data, error } = useCampusMapData();
  const highlightCode = parseRoomCodeFromDestinationLabel(direction.to);
  const selectedRoomLookup = useMemo(() => findRoomByCodeOrId(data, highlightCode), [data, highlightCode]);
  const [viewFloorId, setViewFloorId] = useState<CampusFloorId>(direction.floor_id ?? 'GF');
  const destinationSelectRef = useRef<HTMLSelectElement>(null);

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

  const sidebarSteps = exactRoutePlan.displaySteps.length > 0 ? exactRoutePlan.displaySteps : displaySteps;

  const handleRoomSelect = (roomCode: string) => {
    const lookup = findRoomByCodeOrId(data, roomCode);
    const index = legacyCampusIndexForCode(roomCode, lookup.floor?.floor_id as CampusFloorId | undefined);
    if (index !== null) {
      onDestinationIndexChange(index);
      return;
    }
    if (lookup.room && lookup.floor && lookup.block && onMappedRoomSelect) {
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
      return;
    }
    if (import.meta.env.DEV) {
      console.warn('Mapped room is not present in CAMPUS_DIRECTIONS:', roomCode);
    }
  };

  const floorsInvolved =
    routeResult?.status === 'ok'
      ? routeResult.floors_involved ?? []
      : exactRoutePlan.floorsInvolved.length > 0
        ? exactRoutePlan.floorsInvolved
        : [];
  const multiFloor = floorsInvolved.length > 1;

  return (
    <div className="campus-nav-stage campus-nav-stage--map-first campus-nav-stage--kiosk-layout">
      <CampusNavKioskChrome
        language={language}
        onPickDestinationIndex={onDestinationIndexChange}
        destinationSelectRef={destinationSelectRef}
      />
      <div className="campus-nav-card campus-nav-card--map-first campus-nav-card--kiosk-density">
        <div className="campus-nav-card-border" />

        <header className="campus-nav-header campus-nav-app-header">
          <div className="campus-nav-app-title-block">
            <span className="campus-nav-eyebrow">{labels.campusNavigation}</span>
            <h2 className="campus-nav-title">{labels.routePreview}</h2>
            {multiFloor ? (
              <p className="campus-nav-floors-involved-text" role="note">
                {labels.campusRouteFloorsInvolved ?? 'Floors'}{' '}
                {floorsInvolved
                  .map((id) =>
                    id === 'GF' ? labels.floorTabGF : id === 'FF' ? labels.floorTabFF : labels.floorTabSF,
                  )
                  .join(' · ')}
              </p>
            ) : null}
          </div>
        </header>

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

        <div className="campus-nav-body">
          <div className="campus-nav-map-column">
            <div className="campus-map-wrap campus-map-wrap--2d campus-map-wrap--embedded" aria-label={`${labels.routePreview}: ${direction.to}`}>
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
                routeWarning={routeResult?.status === 'ok' ? null : exactRoutePlan.warning}
                onRoomSelect={handleRoomSelect}
              />
            </div>
          </div>
          <div className="campus-nav-route-column">
            <CampusNavSidebar
              ref={destinationSelectRef}
              direction={direction}
              language={language}
              routeResult={routeResult ?? null}
              displaySteps={sidebarSteps}
              routeMode={routeMode}
              onRouteModeChange={onRouteModeChange}
              selectedCampusIndex={selectedCampusIndex}
              onDestinationIndexChange={onDestinationIndexChange}
              onSpeakRoute={onSpeakRoute}
              onStopSpeak={onStopSpeak}
              isCampusSpeaking={isCampusSpeaking}
              onStartOver={onStartOverNav}
              orbState={orbState}
              isOrbProcessing={isOrbProcessing}
              orbAmplitude={orbAmplitude}
              onOrbTap={onOrbTap}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
