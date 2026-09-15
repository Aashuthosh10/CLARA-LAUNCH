import { ArrowLeft } from 'lucide-react';
import AboutApp from './App';
import './index.css';

export type AboutMeSection = 'overview' | 'capabilities' | 'creators' | 'guide';
export type AboutMeEntryMode = 'chat' | 'direct';

type AboutMeScreenProps = {
  onExit: () => void;
  /** Same canonical start flow as SleepScreen tap. */
  onEnterClara: () => void;
  /** Deep-link from conversational chat navigation. */
  initialSection?: AboutMeSection | null;
  initialItemId?: string | null;
  /**
   * chat = conversational surface constrained above ChatScreen FAQ+orb chrome.
   * direct = manual/sleep About Me (fullscreen, unchanged).
   */
  entryMode?: AboutMeEntryMode;
  /**
   * Chat overlay only: section auto-advance arms after About Me TTS completes.
   * Direct mode ignores this (timers start on mount as before).
   */
  autoAdvanceArmed?: boolean;
};

/**
 * Embeds the complete About Me application inside the CLARA screen model.
 *
 * Chat mode: fills the parent overlay box that App already sizes to end ABOVE
 * the live ChatScreen FAQ+orb chrome. Does not reserve a fake bottom spacer —
 * ChatScreen chrome stays uncovered and owned by ChatScreen.
 */
export default function AboutMeScreen({
  onExit,
  onEnterClara,
  initialSection = null,
  initialItemId = null,
  entryMode = 'direct',
  autoAdvanceArmed = true,
}: AboutMeScreenProps) {
  const isChatOverlay = entryMode === 'chat';

  return (
    <div
      className={
        isChatOverlay
          ? 'about-me-root about-me-root--chat-overlay relative h-full w-full overflow-hidden'
          : 'about-me-root relative h-full w-full overflow-y-auto'
      }
      data-testid="about-me-screen"
      data-entry-mode={entryMode}
      data-auto-advance-armed={isChatOverlay ? String(autoAdvanceArmed) : undefined}
    >
      <button
        type="button"
        aria-label="Back to CLARA"
        data-testid="about-me-back"
        onClick={onExit}
        className="absolute top-14 left-6 z-[70] inline-flex items-center gap-3 rounded-full border-2 border-[#D8CDF7]/70 bg-white/85 px-7 py-3.5 text-base sm:text-lg font-bold text-[#49358F] shadow-lg backdrop-blur-md transition hover:bg-white"
      >
        <ArrowLeft className="h-6 w-6 sm:h-7 sm:w-7" />
        Back to CLARA
      </button>
      <div
        className={
          isChatOverlay
            ? 'about-me-scroll relative h-full min-h-0 w-full overflow-hidden'
            : undefined
        }
      >
        <AboutApp
          onEnterClara={onEnterClara}
          initialSection={initialSection}
          initialItemId={initialItemId}
          entryMode={entryMode}
          autoAdvanceArmed={autoAdvanceArmed}
        />
      </div>
    </div>
  );
}
