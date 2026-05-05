import React, { forwardRef, useCallback } from 'react';
import {
  Accessibility,
  Armchair,
  ArrowUp,
  Building2,
  Clock,
  CornerUpLeft,
  CornerUpRight,
  Footprints,
  MapPinCheck,
  MapPinned,
  Ruler,
  Search,
  Square,
  Volume2,
} from 'lucide-react';
import type { Language } from '../context/LanguageContext';
import type { CampusDirection } from './campusDirections';
import { CAMPUS_DIRECTIONS, campusLabels } from './campusDirections';
import { parseRoomCodeFromDestinationLabel } from './campusMapGeometry';
import type { CampusNavigationRouteMode, CampusRouteResult } from './campusMapTypes';
import ChatOrbControl from '../screens/chat/ChatOrbControl';
import type { ChatOrbState } from '../screens/chat/ChatOrbControl';

export type CampusNavSidebarProps = {
  direction: CampusDirection;
  language: Language;
  routeResult: CampusRouteResult | null;
  displaySteps: string[];
  routeMode: CampusNavigationRouteMode;
  onRouteModeChange: (mode: CampusNavigationRouteMode) => void;
  selectedCampusIndex: number;
  onDestinationIndexChange: (index: number) => void;
  onSpeakRoute: () => void;
  onStopSpeak: () => void;
  isCampusSpeaking: boolean;
  onStartOver: () => void;
  orbState: ChatOrbState;
  isOrbProcessing: boolean;
  orbAmplitude: number;
  onOrbTap: () => void;
};

function formatEta(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '—';
  if (seconds < 90) return `${Math.max(1, Math.round(seconds))}s`;
  const m = Math.ceil(seconds / 60);
  return `${m} min`;
}

function StepIcon({ step, isLast }: { step: string; isLast: boolean }) {
  const s = step.toLowerCase();
  if (isLast || s.includes('arrive')) return <MapPinCheck size={18} strokeWidth={2.4} aria-hidden />;
  if (s.includes('left')) return <CornerUpLeft size={18} strokeWidth={2.2} aria-hidden />;
  if (s.includes('right')) return <CornerUpRight size={18} strokeWidth={2.2} aria-hidden />;
  return <ArrowUp size={18} strokeWidth={2.2} aria-hidden />;
}

const CampusNavSidebar = forwardRef<HTMLSelectElement, CampusNavSidebarProps>(function CampusNavSidebar(
  {
    direction,
    language,
    routeResult,
    displaySteps,
    routeMode,
    onRouteModeChange,
    selectedCampusIndex,
    onDestinationIndexChange,
    onSpeakRoute,
    onStopSpeak,
    isCampusSpeaking,
    onStartOver,
    orbState,
    isOrbProcessing,
    orbAmplitude,
    onOrbTap,
  },
  destinationSelectRef,
) {
  const lb = campusLabels(language) as Record<string, string>;

  const focusDestinationPicker = useCallback(() => {
    const el =
      typeof destinationSelectRef === 'function' ? null : destinationSelectRef?.current;
    el?.focus();
    try {
      el?.showPicker?.();
    } catch {
      /* optional API */
    }
  }, [destinationSelectRef]);

  const code = parseRoomCodeFromDestinationLabel(direction.to);
  const metaOk = routeResult?.status === 'ok';
  const dist = metaOk ? `${Math.round(routeResult.distance_m ?? 0)} m` : '—';
  const eta = metaOk ? formatEta(routeResult.eta_s ?? 0) : '—';
  const stepCount = metaOk
    ? routeResult.floor_segments.reduce((n, s) => n + (s.steps?.length ?? 0), 0) || displaySteps.length
    : displaySteps.length;

  const destTitle = code
    ? direction.to.replace(new RegExp(`^${code}\\s*[-–—]?\\s*`, 'i'), '').trim() || direction.to
    : direction.to;

  const modes: { id: CampusNavigationRouteMode; label: string; icon: React.ReactNode }[] = [
    { id: 'default', label: lb.campusModeShortest, icon: <Footprints size={16} aria-hidden /> },
    { id: 'accessible', label: lb.campusModeAccessible, icon: <Accessibility size={16} aria-hidden /> },
    { id: 'lift', label: lb.campusModeLift, icon: <Building2 size={16} aria-hidden /> },
    { id: 'stairs', label: lb.campusModeStairs, icon: <MapPinned size={16} aria-hidden /> },
  ];

  const selectId = 'campus-nav-sidebar-destination';

  return (
    <aside className="campus-nav-route-column-inner" aria-label={lb.campusTripSummary}>
      <div className="campus-nav-sidebar-dest-card">
        <div className="campus-nav-sidebar-dest-icon" aria-hidden>
          <Armchair size={22} strokeWidth={2} />
        </div>
        <div>
          <p className="campus-nav-sidebar-dest-kicker">{lb.destination}</p>
          <h3 className="campus-nav-sidebar-dest-title">{destTitle}</h3>
          {code ? <p className="campus-nav-sidebar-dest-code">{code}</p> : null}
        </div>
      </div>

      <label className="campus-nav-sidebar-select-label" htmlFor={selectId}>
        {lb.chooseDestination}
      </label>
      <select
        ref={destinationSelectRef}
        id={selectId}
        className="campus-nav-sidebar-select"
        value={selectedCampusIndex}
        onChange={(e) => onDestinationIndexChange(Number(e.target.value))}
      >
        {CAMPUS_DIRECTIONS.map((d, index) => (
          <option key={`${d.floor_id ?? 'GF'}-${d.block}-${index}-${d.to.slice(0, 32)}`} value={index}>
            {d.to}
          </option>
        ))}
      </select>

      <div className="campus-nav-sidebar-metrics" role="group" aria-label={lb.campusTripSummary}>
        <div className="campus-nav-sidebar-metric">
          <Clock size={16} aria-hidden />
          <span className="campus-nav-sidebar-metric-label">{lb.campusEtaShort}</span>
          <strong>{metaOk ? eta : routeResult ? lb.campusRouteComputing : '—'}</strong>
        </div>
        <div className="campus-nav-sidebar-metric">
          <Ruler size={16} aria-hidden />
          <span className="campus-nav-sidebar-metric-label">{lb.campusDistanceShort}</span>
          <strong>{dist}</strong>
        </div>
        <div className="campus-nav-sidebar-metric">
          <Footprints size={16} aria-hidden />
          <span className="campus-nav-sidebar-metric-label">{lb.campusStepCountMetric}</span>
          <strong>{stepCount}</strong>
        </div>
      </div>

      <div className="campus-nav-sidebar-modes" role="group" aria-label={lb.campusRouteMetaRouteMode}>
        {modes.map((m) => (
          <button
            key={m.id}
            type="button"
            className={`campus-nav-sidebar-mode ${routeMode === m.id ? 'is-active' : ''}`}
            aria-pressed={routeMode === m.id}
            onClick={() => onRouteModeChange(m.id)}
          >
            {m.icon}
            {m.label}
          </button>
        ))}
      </div>

      <ol className="campus-nav-sidebar-steps">
        {displaySteps.map((step, i) => (
          <li key={`${direction.to}-sb-${i}`}>
            <span className="campus-nav-sidebar-step-num" aria-hidden>
              {i + 1}
            </span>
            <span className="campus-nav-sidebar-step-icon">
              <StepIcon step={step} isLast={i === displaySteps.length - 1} />
            </span>
            <span className="campus-nav-sidebar-step-text">{step}</span>
          </li>
        ))}
      </ol>

      <div className="campus-nav-sidebar-stick-footer">
        <div className="campus-nav-sidebar-orb-wrap">
          <ChatOrbControl
            orbState={orbState}
            isProcessing={isOrbProcessing}
            amplitude={orbAmplitude}
            onTap={onOrbTap}
            compact
            bottomClassName="relative mt-2 w-full text-center"
          />
        </div>
        <div className="campus-nav-sidebar-actions-row">
          <button
            type="button"
            className="campus-nav-sidebar-btn campus-nav-sidebar-btn--ghost campus-nav-sidebar-btn--half"
            onClick={() => (isCampusSpeaking ? onStopSpeak() : onSpeakRoute())}
          >
            {isCampusSpeaking ? <Square size={15} /> : <Volume2 size={16} />}
            {isCampusSpeaking ? lb.stop : lb.campusRepeat}
          </button>
          <button
            type="button"
            className="campus-nav-sidebar-btn campus-nav-sidebar-btn--ghost campus-nav-sidebar-btn--half"
            onClick={onStartOver}
          >
            <MapPinned size={15} />
            {lb.campusStartOver}
          </button>
        </div>
        <button type="button" className="campus-nav-sidebar-btn campus-nav-sidebar-btn--primary" onClick={focusDestinationPicker}>
          <Search size={17} aria-hidden />
          {lb.campusChangeDestination ?? lb.campusKioskChangeDestinationCta}
        </button>
      </div>
    </aside>
  );
});

export default CampusNavSidebar;
