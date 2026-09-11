import { useEffect, useState } from 'react';

/** Sustained browser-offline delay before the dedicated recovery screen. Keep in one place. */
export const BROWSER_OFFLINE_GRACE_MS = 2500;

function readBrowserOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

export function useBrowserOnline(options?: { graceMs?: number }): {
  isBrowserOffline: boolean;
  showOfflineFallback: boolean;
} {
  const graceMs = options?.graceMs ?? BROWSER_OFFLINE_GRACE_MS;
  const [isBrowserOffline, setIsBrowserOffline] = useState(readBrowserOffline);
  const [showOfflineFallback, setShowOfflineFallback] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    const clearTimer = () => {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
    };

    const goOnline = () => {
      clearTimer();
      setIsBrowserOffline(false);
      setShowOfflineFallback(false);
    };

    const armOfflineFallback = () => {
      clearTimer();
      setIsBrowserOffline(true);
      setShowOfflineFallback(false);
      timer = setTimeout(() => {
        timer = null;
        if (readBrowserOffline()) {
          setShowOfflineFallback(true);
        }
      }, graceMs);
    };

    if (readBrowserOffline()) {
      armOfflineFallback();
    } else {
      goOnline();
    }

    const onOffline = () => {
      armOfflineFallback();
    };
    const onOnline = () => {
      goOnline();
    };

    window.addEventListener('offline', onOffline);
    window.addEventListener('online', onOnline);
    return () => {
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('online', onOnline);
      clearTimer();
    };
  }, [graceMs]);

  return { isBrowserOffline, showOfflineFallback };
}
