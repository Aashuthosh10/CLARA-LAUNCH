import { ArrowLeft } from 'lucide-react';
import AboutApp from './App';
import './index.css';

type AboutMeScreenProps = {
  onExit: () => void;
};

/** Embeds the complete About Me application inside the CLARA screen model. */
export default function AboutMeScreen({ onExit }: AboutMeScreenProps) {
  return (
    <div className="about-me-root relative w-full h-full overflow-y-auto">
      <button
        type="button"
        aria-label="Back to CLARA"
        data-testid="about-me-back"
        onClick={onExit}
        className="fixed top-5 left-5 z-[70] inline-flex items-center gap-2 rounded-full border border-[#D8CDF7]/70 bg-white/80 px-4 py-2 text-xs font-semibold text-[#49358F] shadow-lg backdrop-blur-md transition hover:bg-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to CLARA
      </button>
      <AboutApp />
    </div>
  );
}
