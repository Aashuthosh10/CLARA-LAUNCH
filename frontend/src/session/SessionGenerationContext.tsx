import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

/**
 * Screen remount epoch: incremented on every hard Home reset so Sleep + Chat subtrees fully remount (fresh kiosk boot).
 * Stale websocket merges are gated by useWebSocket (session_gen + wire_seq + appliedBackendGen floor).
 */
export type SessionGenerationContextValue = {
  uiRemountEpoch: number;
  bumpUiRemountEpoch: () => void;
};

const SessionGenerationContext = createContext<SessionGenerationContextValue | null>(
  null
);

export function SessionGenerationProvider({ children }: { children: React.ReactNode }) {
  const [uiRemountEpoch, setUiRemountEpoch] = useState(0);

  const bumpUiRemountEpoch = useCallback(() => {
    setUiRemountEpoch((n) => n + 1);
  }, []);

  const value = useMemo<SessionGenerationContextValue>(
    () => ({
      uiRemountEpoch,
      bumpUiRemountEpoch,
    }),
    [uiRemountEpoch, bumpUiRemountEpoch]
  );

  return (
    <SessionGenerationContext.Provider value={value}>
      {children}
    </SessionGenerationContext.Provider>
  );
}

export function useSessionGeneration(): SessionGenerationContextValue {
  const v = useContext(SessionGenerationContext);
  if (!v) {
    throw new Error('useSessionGeneration requires SessionGenerationProvider');
  }
  return v;
}
