/** Thin FE settings for runtime integrity (env-driven). */

export const runtimeSettings = {
  dashboardEnabled:
    typeof import.meta !== 'undefined' &&
    !!import.meta.env?.DEV &&
    String(import.meta.env?.VITE_RUNTIME_DASHBOARD || '') === '1',
  ownershipEnforce: true,
  contractEnforce: true,
};
