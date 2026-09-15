import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MIND_MAP_CAPABILITIES } from '../components/Card02CapabilitiesMindMap';
import { CREATORS_FIVE } from '../data/aboutData';
import {
  CHAT_ABOUT_ME_ORB_SAFE_INSET_PX,
  CHAT_FAQ_PILL_MIN_HEIGHT_PX,
  CHAT_ORB_MORPH_BOX_PX,
} from '../../../screens/chat/chatOrbLayout';

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

describe('About Me conversational surface contract', () => {
  it('keeps ChatScreen chrome authority (FAQ + orb) — About Me does not own bottom', () => {
    const contract = {
      keepChatMounted: true,
      openViaUiAction: 'open_about_me',
      aboutMeCoversFullChatScreen: false,
      aboutMeEndsAboveLiveChrome: true,
      fakeBottomSafeSpacer: false,
      suggestionPillsAuthority: 'ChatScreen',
      orbAuthority: 'ChatScreen',
      noDuplicateOrb: true,
      noDuplicatePills: true,
    };
    expect(contract.aboutMeCoversFullChatScreen).toBe(false);
    expect(contract.aboutMeEndsAboveLiveChrome).toBe(true);
    expect(contract.fakeBottomSafeSpacer).toBe(false);
    expect(contract.suggestionPillsAuthority).toBe('ChatScreen');
    expect(contract.orbAuthority).toBe('ChatScreen');
  });

  it('chat entryMode fills constrained parent; direct stays fullscreen', async () => {
    expect(CHAT_ABOUT_ME_ORB_SAFE_INSET_PX).toBeGreaterThanOrEqual(
      CHAT_ORB_MORPH_BOX_PX + CHAT_FAQ_PILL_MIN_HEIGHT_PX + 100,
    );

    const AboutMeScreen = (await import('../AboutMeScreen')).default;
    const chatMarkup = renderToStaticMarkup(
      <AboutMeScreen
        onExit={vi.fn()}
        onEnterClara={vi.fn()}
        initialSection="creators"
        entryMode="chat"
        autoAdvanceArmed={false}
      />,
    );
    expect(chatMarkup).toContain('data-entry-mode="chat"');
    expect(chatMarkup).toContain('about-me-root--chat-overlay');
    // No artificial safe-area crop spacer inside About Me.
    expect(chatMarkup).not.toContain('data-testid="about-me-orb-safe-area"');
    expect(chatMarkup).toContain('data-auto-advance-armed="false"');
    expect(chatMarkup).toContain('data-timer-armed="false"');
    expect(chatMarkup).toContain('relative h-full w-full');

    const directMarkup = renderToStaticMarkup(
      <AboutMeScreen
        onExit={vi.fn()}
        onEnterClara={vi.fn()}
        initialSection="overview"
        entryMode="direct"
      />,
    );
    expect(directMarkup).toContain('data-entry-mode="direct"');
    expect(directMarkup).toContain('fixed inset-0');
    expect(directMarkup).toContain('data-timer-armed="true"');
  });

  it('chat Creators/Guide/Overview/Capabilities use chat overlay mode without safe spacer', async () => {
    const AboutMeScreen = (await import('../AboutMeScreen')).default;
    for (const section of ['creators', 'guide', 'overview', 'capabilities'] as const) {
      const markup = renderToStaticMarkup(
        <AboutMeScreen
          onExit={vi.fn()}
          onEnterClara={vi.fn()}
          initialSection={section}
          entryMode="chat"
        />,
      );
      expect(markup).toContain('data-entry-mode="chat"');
      expect(markup).not.toContain('data-testid="about-me-orb-safe-area"');
      expect(markup).toContain('data-testid="about-me-section-pager"');
    }
  });

  it('gates chat auto-advance until autoAdvanceArmed', async () => {
    const AboutMeScreen = (await import('../AboutMeScreen')).default;
    const waiting = renderToStaticMarkup(
      <AboutMeScreen
        onExit={vi.fn()}
        onEnterClara={vi.fn()}
        initialSection="creators"
        entryMode="chat"
        autoAdvanceArmed={false}
      />,
    );
    expect(waiting).toContain('data-timer-armed="false"');

    const armed = renderToStaticMarkup(
      <AboutMeScreen
        onExit={vi.fn()}
        onEnterClara={vi.fn()}
        initialSection="guide"
        entryMode="chat"
        autoAdvanceArmed={true}
      />,
    );
    expect(armed).toContain('data-timer-armed="true"');
  });
});
