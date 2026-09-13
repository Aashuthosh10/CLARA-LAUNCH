import { ArrowLeft } from 'lucide-react';
import AboutApp from './App';
import './index.css';

export type AboutMeSection = 'overview' | 'capabilities' | 'creators' | 'guide';

type AboutMeScreenProps = {
  onExit: () => void;
  /** Same canonical start flow as SleepScreen tap. */
  onEnterClara: () => void;
  /** Deep-link from conversational chat navigation. */
  initialSection?: AboutMeSection | null;
  initialItemId?: string | null;
};

/** Embeds the complete About Me application inside the CLARA screen model. */
export default function AboutMeScreen({
  onExit,
  onEnterClara,
  initialSection = null,
  initialItemId = null,
}: AboutMeScreenProps) {
  return (
    <div className="about-me-root relative w-full h-full overflow-y-auto">
      <button
        type="button"
        aria-label="Back to CLARA"
        data-testid="about-me-back"
        onClick={onExit}
        className="fixed top-14 left-6 z-[70] inline-flex items-center gap-3 rounded-full border-2 border-[#D8CDF7]/70 bg-white/85 px-7 py-3.5 text-base sm:text-lg font-bold text-[#49358F] shadow-lg backdrop-blur-md transition hover:bg-white"
      >
        <ArrowLeft className="h-6 w-6 sm:h-7 sm:w-7" />
        Back to CLARA
      </button>
      <AboutApp
        onEnterClara={onEnterClara}
        initialSection={initialSection}
        initialItemId={initialItemId}
      />
    </div>
  );
}
