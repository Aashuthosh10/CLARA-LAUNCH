import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';

const MESSAGE_TWO_DELAY_MS = 5000;
const PARTICLE_COUNT = 8;
const PARTICLE_RADIUS_PX = 22;

const fadeEase = [0.16, 1, 0.3, 1] as const;

function ParticleRing() {
  return (
    <motion.div
      className="relative h-16 w-16"
      aria-hidden
      animate={{ rotate: 360 }}
      transition={{ duration: 4.8, repeat: Infinity, ease: 'linear' }}
    >
      {Array.from({ length: PARTICLE_COUNT }, (_, index) => {
        const angle = (index / PARTICLE_COUNT) * Math.PI * 2;
        const x = Math.cos(angle) * PARTICLE_RADIUS_PX;
        const y = Math.sin(angle) * PARTICLE_RADIUS_PX;
        const opacity = 0.22 + (index / (PARTICLE_COUNT - 1)) * 0.7;
        return (
          <span
            key={index}
            className="absolute left-1/2 top-1/2 h-[5px] w-[5px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white"
            style={{
              transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
              opacity,
              animation: `clara-offline-particle-pulse 2.4s ease-in-out ${index * 0.12}s infinite`,
            }}
          />
        );
      })}
    </motion.div>
  );
}

export default function OfflineRecoveryScreen() {
  const [phase, setPhase] = useState<'cooking' | 'updates'>('cooking');

  useEffect(() => {
    const timer = window.setInterval(() => {
      setPhase((currentPhase) => (currentPhase === 'cooking' ? 'updates' : 'cooking'));
    }, MESSAGE_TWO_DELAY_MS);
    return () => {
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const active = document.activeElement;
    if (active instanceof HTMLElement) {
      active.blur();
    }
  }, []);

  return (
    <div
      className="fixed inset-0 z-[110] flex h-[100vh] w-[100vw] max-h-[100vh] max-w-[100vw] select-none items-center justify-center overflow-hidden bg-black px-8 py-12"
      role="status"
      aria-live="assertive"
      aria-busy="true"
      data-testid="browser-offline-fallback"
    >
      <style>{`
        @keyframes clara-offline-particle-pulse {
          0%, 100% { opacity: 0.28; }
          50% { opacity: 1; }
        }
      `}</style>
      <AnimatePresence mode="wait">
        {phase === 'cooking' ? (
          <motion.div
            key="cooking"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7, ease: fadeEase }}
            className="flex flex-col items-center text-center"
          >
            <span
              className="mb-5 text-[clamp(1.25rem,2.4vw,1.75rem)] leading-none"
              aria-hidden
            >
              ❗
            </span>
            <p
              data-testid="offline-cooking-message"
              className="max-w-[min(92vw,40rem)] text-[clamp(1.55rem,3.8vw,2.65rem)] font-normal leading-[1.45] text-white"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              Please wait,{' '}
              <br />
              the creators are still cooking
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="updates"
            data-testid="offline-updates-message"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.85, ease: fadeEase }}
            className="flex flex-col items-center text-center"
          >
            <ParticleRing />
            <p
              className="mt-10 max-w-[min(92vw,32rem)] text-[clamp(1.05rem,2.4vw,1.55rem)] font-light leading-relaxed tracking-[0.04em] text-white/92"
              style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
            >
              Updates are underway.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
