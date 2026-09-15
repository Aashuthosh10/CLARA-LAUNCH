import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { PROJECT_GUIDE } from '../data/aboutData';

/**
 * Documents the App-level contract: the About Me guide card can enter the
 * same CLARA session started from the sleep screen.
 */
describe('canonical startClaraSession contract', () => {
  it('AboutMeScreen keeps its guide-card entry distinct from onExit', async () => {
    const AboutMeScreen = (await import('../AboutMeScreen')).default;
    const onExit = vi.fn();
    const onEnterClara = vi.fn();
    const markup = renderToStaticMarkup(
      <AboutMeScreen onExit={onExit} onEnterClara={onEnterClara} />,
    );
    expect(markup).toContain('data-testid="about-me-back"');
    expect(markup).toContain('data-testid="enter-clara"');
    expect(markup).toContain('data-testid="about-me-navbar"');
    expect(markup).toContain('pt-[11.5rem]');
    expect(markup).not.toContain('PREV:');
    expect(markup).not.toContain('NEXT:');
    expect(onExit).not.toHaveBeenCalled();
    expect(onEnterClara).not.toHaveBeenCalled();
  });

  it('does not render an Enter CLARA action in the overview card', async () => {
    const ClaraHero = (await import('../components/ClaraHero')).ClaraHero;
    const markup = renderToStaticMarkup(<ClaraHero />);

    expect(markup).not.toContain('data-testid="enter-clara"');
    expect(markup).not.toContain('>ENTER CLARA<');
  });

  it('Overview body uses the exact supplied CLARA paragraph', async () => {
    const AboutMeScreen = (await import('../AboutMeScreen')).default;
    const markup = renderToStaticMarkup(
      <AboutMeScreen onExit={vi.fn()} onEnterClara={vi.fn()} />,
    );
    expect(markup).toContain('data-testid="about-overview-body"');
    expect(markup).toContain(
      'CLARA is an intelligent AI receptionist located at the campus',
    );
    expect(markup).toContain('visitors, guests, and students');
    expect(markup).toContain('online in real time');
    expect(markup).not.toContain(
      'AI-powered virtual receptionist designed for educational institutions',
    );
  });

  it('Our Guide uses exact Dr. Nagashree N content from data', () => {
    expect(PROJECT_GUIDE.name).toBe('DR. NAGASHREE N');
    expect(PROJECT_GUIDE.role).toBe('Project Guide / Academic Mentor');
    expect(PROJECT_GUIDE.department).toBe(
      'Department of Computer Science & Engineering (Data Science)',
    );
    expect(PROJECT_GUIDE.description).toBe(
      'Provided foundational academic guidance and rigorous architectural review for CLARA, her institutional insight was pivotal in transforming this conceptual intelligence platform into a fully realized campus assistant.',
    );
  });
});
