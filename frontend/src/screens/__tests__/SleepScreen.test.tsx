import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import SleepScreen from '../SleepScreen';

describe('SleepScreen layout', () => {
  it('places About Me top-right (text left of icon), not a bottom-left pill', () => {
    const markup = renderToStaticMarkup(
      <SleepScreen onWake={vi.fn()} onAboutMe={vi.fn()} />,
    );
    expect(markup).toContain('data-testid="sleep-screen"');
    expect(markup).toContain('data-testid="about-me-entry"');
    expect(markup).toContain('data-testid="sleep-quote"');
    expect(markup).toContain('data-testid="sleep-start-prompt"');
    expect(markup).toContain('data-testid="sleep-vignette"');
    expect(markup).toContain('About Me');
    expect(markup).toContain('TAP ANYWHERE TO START');
    expect(markup).toContain('Tomorrow');
    expect(markup).toContain('today');
    expect(markup).toContain('SAI VIDYA');
    expect(markup).not.toContain('Copyright');
    expect(markup).not.toContain('All Rights Reserved');
    expect(markup).not.toContain('bottom-10 left-10');
    expect(markup).not.toContain('rounded-full border border-white/60 bg-white/20 px-8');
    expect(markup).toContain('top-[min(3.5vh,2.25rem)] right-[min(3.5vw,2.75rem)]');
  });
});
