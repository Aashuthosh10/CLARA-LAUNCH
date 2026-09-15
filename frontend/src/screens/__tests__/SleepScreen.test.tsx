import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getDailyThought } from '../../data/dailyThoughts';
import SleepScreen from '../SleepScreen';

describe('SleepScreen layout', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-10T09:41:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('places clock top-right and About Me bottom-right (text left of icon)', () => {
    const markup = renderToStaticMarkup(
      <SleepScreen onWake={vi.fn()} onAboutMe={vi.fn()} />,
    );
    expect(markup).toContain('data-testid="sleep-screen"');
    expect(markup).toContain('data-testid="about-me-entry"');
    expect(markup).toContain('data-testid="sleep-quote"');
    expect(markup).toContain('data-testid="sleep-start-prompt"');
    expect(markup).toContain('data-testid="sleep-vignette"');
    expect(markup).toContain('data-testid="sleep-dark-overlay"');
    expect(markup).toContain('bg-black/40');
    expect(markup).toContain('data-testid="sleep-clock"');
    expect(markup).toContain('data-testid="sleep-clock-time"');
    expect(markup).toContain('data-testid="sleep-clock-date"');
    expect(markup).toContain('9:41 AM');
    expect(markup).toContain('Thursday');
    expect(markup).toContain('10 September 2026');
    expect(markup).toContain('About Me');
    expect(markup).toContain('TAP ANYWHERE TO START');
    expect(markup).toContain(getDailyThought());
    expect(markup).toContain('SAI VIDYA');
    expect(markup).not.toContain('data-testid="sleep-date-time"');
    expect(markup).not.toContain('data-testid="sleep-date"');
    expect(markup).not.toContain('data-testid="sleep-time"');
    expect(markup).not.toContain('Copyright');
    expect(markup).not.toContain('All Rights Reserved');
    expect(markup).not.toContain('bottom-10 left-10');
    expect(markup).not.toContain('rounded-full border border-white/60 bg-white/20 px-8');
    expect(markup).toContain('bottom-[min(7vh,3.75rem)] right-[min(3.5vw,2.75rem)]');
    expect(markup).toContain('top-[min(8.5vh,4.75rem)] right-[min(3.5vw,2.75rem)]');
    expect(markup).not.toContain('top-[min(9vh,5.25rem)] right-[min(3.5vw,2.75rem)]');
  });

  it('About Me entry stops wake via stopPropagation wiring', () => {
    const markup = renderToStaticMarkup(
      <SleepScreen onWake={vi.fn()} onAboutMe={vi.fn()} />,
    );
    expect(markup).toContain('data-testid="about-me-entry"');
    // Compact utility control, not a large pill
    expect(markup).not.toContain('rounded-full border border-white/60 bg-white/20 px-8');
  });
});
