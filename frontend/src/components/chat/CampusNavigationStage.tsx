import React from 'react';
import { Building2, MapPin, Navigation } from 'lucide-react';
import type { CampusDirection } from '../../data/campusDirections';
import { campusLabels } from '../../data/campusDirections';
import type { Language } from '../../context/LanguageContext';

type CampusNavigationStageProps = {
  direction: CampusDirection;
  language: Language;
};

const blockPosition: Record<CampusDirection['block'], string> = {
  A: 'campus-route-a',
  B: 'campus-route-b',
  C: 'campus-route-c',
};

export default function CampusNavigationStage({ direction, language }: CampusNavigationStageProps) {
  const labels = campusLabels(language);
  const routeClass = blockPosition[direction.block];
  const isBlockBJunctionRoom = direction.block === 'B' && /^B-01[2-5]\b/.test(direction.to);
  const firstMove =
    direction.block === 'A'
      ? labels.turnLeft
      : isBlockBJunctionRoom
        ? labels.goStraight
        : labels.turnRight;
  const routeHints = [labels.start, firstMove, labels.goStraight, labels.reached];

  return (
    <div className="campus-nav-stage">
      <div className="campus-nav-card">
        <div className="campus-nav-card-border" />
        <div className="campus-nav-header">
          <div>
            <span className="campus-nav-eyebrow">{labels.visualMap}</span>
            <h2>{labels.campusNavigation}</h2>
          </div>
          <div className="campus-nav-badge">
            <Building2 size={16} />
            {labels.block} {direction.block}
          </div>
        </div>

        <div className="campus-map-wrap" aria-label={`${labels.routePreview}: ${direction.to}`}>
          <div className="campus-map-grid" />
          <div className="campus-building campus-building-a">
            <span>Block A</span>
          </div>
          <div className="campus-building campus-building-b">
            <span>Block B</span>
          </div>
          <div className="campus-building campus-building-c">
            <span>Block C</span>
          </div>
          <div className="campus-entrance">
            <MapPin size={18} />
            <span>{labels.mainEntrance}</span>
          </div>
          <div className={`campus-route-line ${routeClass}`} />
          <div className={`campus-destination-pin campus-pin-${direction.block.toLowerCase()}`}>
            <Navigation size={18} />
          </div>
          <div className="campus-route-hints" aria-hidden>
            {routeHints.map((hint, index) => (
              <div key={`${hint}-${index}`} className="campus-route-hint">
                <span>{index + 1}</span>
                <strong>{hint}</strong>
              </div>
            ))}
          </div>
        </div>

        <div className="campus-nav-footer">
          <div>
            <span>{labels.destination}</span>
            <strong>{direction.to}</strong>
          </div>
          <div className="campus-nav-metrics">
            <span>{direction.estimated_steps} {labels.steps}</span>
            <span>{direction.estimated_time_seconds} {labels.seconds}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
