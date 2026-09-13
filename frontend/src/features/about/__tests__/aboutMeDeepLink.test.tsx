import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MIND_MAP_CAPABILITIES } from '../components/Card02CapabilitiesMindMap';
import { CREATORS_FIVE } from '../data/aboutData';

describe('About Me conversational deep-link', () => {
  it('opens Capabilities with schedule expanded', async () => {
    const AboutMeScreen = (await import('../AboutMeScreen')).default;
    const markup = renderToStaticMarkup(
      <AboutMeScreen
        onExit={vi.fn()}
        onEnterClara={vi.fn()}
        initialSection="capabilities"
        initialItemId="schedule"
      />,
    );
    expect(MIND_MAP_CAPABILITIES.map((c) => c.id)).toEqual([
      'understand',
      'know',
      'speak',
      'schedule',
      'connect',
      'communicate',
    ]);
    // Expanded panel renders schedule detail text.
    expect(markup).toContain('data-testid="capability-card-schedule"');
    expect(markup).toContain('data-expanded="true"');
    expect(markup).toContain('SCHEDULE');
    expect(markup).toContain('appointment-related interactions');
  });

  it('opens Creators with Dhanush selectable via existing ids', async () => {
    const AboutMeScreen = (await import('../AboutMeScreen')).default;
    const dhanush = CREATORS_FIVE.find((c) => c.id === 'c4');
    expect(dhanush).toBeTruthy();
    const markup = renderToStaticMarkup(
      <AboutMeScreen
        onExit={vi.fn()}
        onEnterClara={vi.fn()}
        initialSection="creators"
        initialItemId="c4"
      />,
    );
    expect(markup).toContain('THE PEOPLE BEHIND');
    expect(markup).toContain('data-testid="creator-modal"');
    expect(markup).toContain('data-creator-id="c4"');
    expect(CREATORS_FIVE.some((c) => c.name.toUpperCase().includes('CHINMAYI'))).toBe(false);
  });

  it('opens Guide section from deep-link index', async () => {
    const AboutMeScreen = (await import('../AboutMeScreen')).default;
    const markup = renderToStaticMarkup(
      <AboutMeScreen
        onExit={vi.fn()}
        onEnterClara={vi.fn()}
        initialSection="guide"
      />,
    );
    expect(markup).toContain('DR. NAGASHREE N');
    expect(markup).toContain('Project Guide / Academic Mentor');
  });
});
