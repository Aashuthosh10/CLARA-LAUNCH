import React, { useEffect, useState } from 'react';
import type { CampusDirection } from './campusDirections';
import { campusLabels } from './campusDirections';
import type { Language } from '../context/LanguageContext';
import CampusMap2D from './CampusMap2D';
import { parseRoomCodeFromDestinationLabel } from './campusMapGeometry';
import { useCampusMapData } from './useCampusMapData';
import type { CampusFloorId } from './campusMapTypes';

export type CampusNavigationRouteMode = 'default' | 'accessible' | 'lift' | 'stairs';

export type CampusNavigationStageProps = {
  direction: CampusDirection;
  language: Language;
};

export default function CampusNavigationStage({ direction, language }: CampusNavigationStageProps) {
  const labels = campusLabels(language) as Record<string, string>;
  const { data, error } = useCampusMapData();
  const highlightCode = parseRoomCodeFromDestinationLabel(direction.to);
  const [viewFloorId, setViewFloorId] = useState<CampusFloorId>(direction.floor_id ?? 'GF');

  useEffect(() => {
    setViewFloorId(direction.floor_id ?? 'GF');
  }, [direction.floor_id]);

  return (
    <div className="campus-nav-stage campus-nav-stage--map-first">
      <div className="campus-nav-card campus-nav-card--map-first">
        <div className="campus-nav-card-border" />

        <header className="campus-nav-header campus-nav-app-header">
          <div className="campus-nav-app-title-block">
            <span className="campus-nav-eyebrow">{labels.campusNavigation}</span>
            <h2 className="campus-nav-title">{labels.routePreview}</h2>
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
              {id === 'GF' ? labels.floorTabGF : id === 'FF' ? labels.floorTabFF : labels.floorTabSF}
            </button>
          ))}
        </nav>

        <div className="campus-nav-body campus-nav-body--map-only">
          <div className="campus-nav-map-column">
            <div className="campus-map-wrap campus-map-wrap--2d campus-map-wrap--embedded" aria-label={`${labels.routePreview}: ${direction.to}`}>
              <CampusMap2D
                data={data}
                highlightCode={highlightCode}
                targetFloorId={direction.floor_id ?? null}
                viewFloorId={viewFloorId}
                onFloorChange={setViewFloorId}
                showFloorTabs={false}
                language={language}
                loadError={error}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
