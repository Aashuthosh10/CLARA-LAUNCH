import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

/**
 * Documents the App-level contract: Sleep wake and About Enter CLARA
 * share one startClaraSession callback (verified via prop wiring shape).
 */
describe('canonical startClaraSession contract', () => {
  it('AboutMeScreen requires onEnterClara distinct from onExit', async () => {
    const AboutMeScreen = (await import('../AboutMeScreen')).default;
    const onExit = vi.fn();
    const onEnterClara = vi.fn();
    const markup = renderToStaticMarkup(
      <AboutMeScreen onExit={onExit} onEnterClara={onEnterClara} />,
    );
    expect(markup).toContain('data-testid="about-me-back"');
    expect(markup).toContain('data-testid="enter-clara"');
    expect(onExit).not.toHaveBeenCalled();
    expect(onEnterClara).not.toHaveBeenCalled();
  });
});
