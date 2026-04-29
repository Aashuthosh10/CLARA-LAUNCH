/**
 * src/dev/runtimeDiagnostics.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Kiosk-grade observability and runtime diagnostics (Stage 3).
 *
 * Implements real-time telemetry for long-running kiosk deployments including
 * FPS tracking, memory trending, and resource audit.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { getStore } from '../lib/ws/state';
import { getActiveSocketCount } from '../lib/ws/connection';
import { kioskStore, getNotifyRate } from '../store/kiosk/kioskStore';
import { getAudioDiagnostics } from '../features/chat/hooks/useVoiceInteraction';
import { getActiveOrbLoops } from '../components/SiriOrb';

interface Diagnostics {
    websocket: any;
    memory: any;
    performance: any;
    resources: any;
    uptime: string;
}

const startTime = Date.now();
let frameCount = 0;
let lastFpsUpdate = performance.now();
let currentFps = 60;

// Memory Trend Tracking
const memoryHistory: number[] = [];
const MAX_HISTORY = 20;

/**
 * Start the diagnostic background loops.
 */
function startTelemetry() {
    if (typeof window === 'undefined') return;

    // 1. FPS Tracking Loop
    const fpsLoop = () => {
        frameCount++;
        const now = performance.now();
        const elapsed = now - lastFpsUpdate;

        if (elapsed >= 1000) {
            currentFps = Math.round((frameCount * 1000) / elapsed);
            frameCount = 0;
            lastFpsUpdate = now;
        }
        requestAnimationFrame(fpsLoop);
    };
    requestAnimationFrame(fpsLoop);

    // 2. Memory Sampling Loop (Every 30s)
    setInterval(() => {
        const mem = (performance as any).memory;
        if (mem) {
            const used = mem.usedJSHeapSize / (1024 * 1024);
            memoryHistory.push(used);
            if (memoryHistory.length > MAX_HISTORY) memoryHistory.shift();
        }
    }, 30000);
}

export function initDiagnostics(wsUrl: string) {
    if (typeof window === 'undefined') return;

    startTelemetry();

    (window as any).claraDebug = {
        /**
         * Returns a detailed real-time health report.
         */
        getHealth: (): Diagnostics => {
            const wsStore = getStore(wsUrl);
            const wsSnap = wsStore.getSnapshot();
            const kioskSnap = kioskStore.getSnapshot();
            const mem = (performance as any).memory;

            return {
                websocket: {
                    phase: wsSnap.phase,
                    isConnected: wsSnap.isConnected,
                    retryCount: wsSnap.retryCount,
                    appState: wsSnap.appState,
                    latency_est: '---', // Placeholder for actual ping/pong if implemented
                },
                memory: mem ? {
                    current: (mem.usedJSHeapSize / (1024 * 1024)).toFixed(2) + ' MB',
                    limit: (mem.jsHeapSizeLimit / (1024 * 1024)).toFixed(2) + ' MB',
                    trend: memoryHistory.map(m => m.toFixed(1) + 'MB').join(' → '),
                } : 'Webkit memory API not supported',
                performance: {
                    fps: currentFps,
                    store_updates_per_sec: getNotifyRate().toFixed(1),
                    last_transition: ((Date.now() - kioskSnap.lastTransitionTimestamp) / 1000).toFixed(1) + 's ago',
                },
                resources: {
                    subscribers: kioskStore.getSubscriberCount(),
                    active_screen: kioskSnap.activeScreen,
                    messages_in_store: kioskSnap.messages.length,
                    websocket_instances: getActiveSocketCount(),
                    audio_engine: getAudioDiagnostics(),
                    active_orb_loops: getActiveOrbLoops(),
                },
                uptime: Math.floor((Date.now() - startTime) / 1000) + 's',
            };
        },

        forceReconnect: () => {
            console.log('[DEBUG] Forcing websocket reconnect...');
            // Note: In Stage 1/2 we didn't expose a direct method, 
            // but we can trigger via getClaraSocket(wsUrl).retryNow() if needed.
        }
    };

    if (import.meta.env.DEV) {
        console.log('%c[CLARA] Stage 3 Telemetry Active. Use window.claraDebug.getHealth()', 'color: #3b82f6; font-weight: bold;');
    }
}
