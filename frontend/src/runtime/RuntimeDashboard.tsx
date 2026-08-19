/**
 * DEV-only runtime integrity dashboard.
 * Mount only when VITE_RUNTIME_DASHBOARD=1 in development.
 */

import React, { useEffect, useState } from 'react';
import {
  getConversationRuntime,
  subscribeConversationRuntime,
} from './conversationRuntimeStore';
import { getRuntimeTimeline } from './diagnostics';
import type { ConversationRuntimeSnapshot } from './types';

export function RuntimeDashboard() {
  const [snap, setSnap] = useState<ConversationRuntimeSnapshot>(() => getConversationRuntime());
  const [timeline, setTimeline] = useState(() => getRuntimeTimeline().slice(-12));

  useEffect(() => {
    return subscribeConversationRuntime(() => {
      setSnap(getConversationRuntime());
      setTimeline(getRuntimeTimeline().slice(-12));
    });
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setTimeline(getRuntimeTimeline().slice(-12)), 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div
      data-testid="runtime-dashboard"
      style={{
        position: 'fixed',
        right: 8,
        bottom: 8,
        zIndex: 99999,
        width: 320,
        maxHeight: '45vh',
        overflow: 'auto',
        background: 'rgba(12,16,24,0.92)',
        color: '#e8eef7',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        fontSize: 11,
        borderRadius: 8,
        padding: 10,
        boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
        pointerEvents: 'auto',
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 6 }}>CLARA Runtime</div>
      <div>Language: {snap.currentLanguage} {snap.localization.frozen ? '(frozen)' : ''}</div>
      <div>Turn: {snap.turnId ?? '—'}</div>
      <div>Gen: {snap.generation}</div>
      <div>Intent: {snap.currentIntent ?? '—'}</div>
      <div>Presentation: {snap.activePresentationId ?? '—'}</div>
      <div>Scene: {snap.activeScene ?? '—'}</div>
      <div>Surface: {snap.activeSurface ?? '—'}</div>
      <div>State: {snap.runtimeState}</div>
      <div style={{ marginTop: 8, opacity: 0.85 }}>Timeline</div>
      <ul style={{ margin: 0, paddingLeft: 16 }}>
        {timeline.map((e, i) => (
          <li key={i}>{String(e.event)}</li>
        ))}
      </ul>
    </div>
  );
}

export default RuntimeDashboard;
