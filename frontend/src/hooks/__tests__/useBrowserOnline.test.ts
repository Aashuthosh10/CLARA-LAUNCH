import { describe, expect, it } from 'vitest';
import { BROWSER_OFFLINE_GRACE_MS } from '../useBrowserOnline';

describe('useBrowserOnline', () => {
  it('keeps the browser-offline grace period centralized at 2500ms', () => {
    expect(BROWSER_OFFLINE_GRACE_MS).toBe(2500);
  });
});
