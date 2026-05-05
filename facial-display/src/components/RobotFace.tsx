/**
 * Dual-mode face: SPEAKING (TTS lip sync, eyes fixed / soft smile) vs IDLE (alive loops — never overlap).
 */
import { motion, type MotionValue } from 'motion/react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';

import { useDualModeIdle, type IdleEyeVariant } from '../hooks/useDualModeIdle';

function buildTalkingPillPath(talkPulse: number): string {
  const pulse = Math.max(0, Math.min(1, talkPulse));
  const centerX = 25;
  const centerY = 18;
  const widthScale = 6 + pulse * 14;
  const heightScale = 4 + pulse * 12;
  const left = centerX - widthScale - 5;
  const right = centerX + widthScale + 5;
  return `M ${left},${centerY} 
              C ${left},${centerY + heightScale} ${right},${centerY + heightScale} ${right},${centerY} 
              C ${right},${centerY - heightScale * 0.4} ${left},${centerY - heightScale * 0.4} ${left},${centerY} Z`;
}

const EYE_PATHS: Record<IdleEyeVariant | 'speaking', { left: string; right: string }> = {
  happy: {
    left: 'M 20,10 H 80 A 30,30 0 0 1 110,40 V 80 A 30,30 0 0 1 80,110 H 20 A 30,30 0 0 1 -10,80 V 40 A 30,30 0 0 1 20,10 Z',
    right: 'M 20,10 H 80 A 30,30 0 0 1 110,40 V 80 A 30,30 0 0 1 80,110 H 20 A 30,30 0 0 1 -10,80 V 40 A 30,30 0 0 1 20,10 Z',
  },
  curious: {
    left: 'M 30,30 H 70 A 20,20 0 0 1 90,50 V 80 A 20,20 0 0 1 70,100 H 30 A 20,20 0 0 1 10,80 V 50 A 20,20 0 0 1 30,30 Z',
    right: 'M 25,5 H 75 A 35,35 0 0 1 110,40 V 80 A 35,35 0 0 1 75,115 H 25 A 35,35 0 0 1 -10,80 V 40 A 35,35 0 0 1 25,5 Z',
  },
  heart: {
    left: 'M 50,90 C 50,90 -10,60 -10,20 C -10,0 10,-10 30,-10 C 40,-10 45,-5 50,10 C 55,-5 60,-10 70,-10 C 90,-10 110,0 110,20 C 110,60 50,90 50,90 Z',
    right: 'M 50,90 C 50,90 -10,60 -10,20 C -10,0 10,-10 30,-10 C 40,-10 45,-5 50,10 C 55,-5 60,-10 70,-10 C 90,-10 110,0 110,20 C 110,60 50,90 50,90 Z',
  },
  sad: {
    left: 'M 15,20 H 85 A 35,35 0 0 1 120,55 V 90 A 35,35 0 0 1 85,125 H 15 A 35,35 0 0 1 -20,90 V 55 A 35,35 0 0 1 15,20 Z',
    right: 'M 15,20 H 85 A 35,35 0 0 1 120,55 V 90 A 35,35 0 0 1 85,125 H 15 A 35,35 0 0 1 -20,90 V 55 A 35,35 0 0 1 15,20 Z',
  },
  sleep: {
    left: 'M 12,46 H 88 Q 94,46 94,50 Q 94,54 88,54 H 12 Q 6,54 6,50 Q 6,46 12,46 Z',
    right: 'M 12,46 H 88 Q 94,46 94,50 Q 94,54 88,54 H 12 Q 6,54 6,50 Q 6,46 12,46 Z',
  },
  speaking: {
    left: 'M 22,14 H 78 A 28,28 0 0 1 106,42 V 76 A 28,28 0 0 1 78,104 H 22 A 28,28 0 0 1 -6,76 V 42 A 28,28 0 0 1 22,14 Z',
    right: 'M 22,14 H 78 A 28,28 0 0 1 106,42 V 76 A 28,28 0 0 1 78,104 H 22 A 28,28 0 0 1 -6,76 V 42 A 28,28 0 0 1 22,14 Z',
  },
};

const BLINK_PATH = 'M 5,35 Q 50,15 95,35 L 95,38 Q 50,18 5,38 Z';

const IDLE_MOUTH: Record<IdleEyeVariant, string> = {
  happy: 'M 5,15 Q 25,35 45,15 Q 25,48 5,15 Z',
  curious: 'M 10,18 Q 25,30 40,18 Q 25,42 10,18 Z',
  heart: 'M 8,12 Q 25,45 42,12 Q 25,35 8,12 Z',
  sad: 'M 5,38 Q 25,12 45,38 Q 25,25 5,38 Z',
  sleep: 'M 14,26 H 36 V 31 H 14 Z',
};

const GAZE_EASE: [number, number, number, number] = [0.42, 0, 0.58, 1];
const SNAP_EASE: [number, number, number, number] = [0.33, 1, 0.68, 1];

interface RobotFaceProps {
  /** True whenever CLARA TTS / lip-sync is active (exclusive with idle animations). */
  isSpeaking: boolean;
  /** When true, show thinking expression (exclusive with idle animations). */
  isThinking?: boolean;
  isListening?: boolean;
  mouthScale?: MotionValue<number> | null;
}

export default function RobotFace({
  isSpeaking,
  isThinking = false,
  isListening = false,
  mouthScale = null,
}: RobotFaceProps) {
  const externalMouth = Boolean(mouthScale);
  const idle = useDualModeIdle(isSpeaking || isThinking);

  const [talkPulse, setTalkPulse] = useState(0);
  const talkPathRef = useRef<SVGPathElement>(null);

  /** Motion's animated `d` + MotionValue is unreliable here; sync DOM `d` on every scale change. */
  useLayoutEffect(() => {
    if (!isSpeaking || !externalMouth || !mouthScale) return;
    const el = talkPathRef.current;
    if (!el) return;
    const sync = () => {
      el.setAttribute('d', buildTalkingPillPath(mouthScale.get()));
    };
    sync();
    return mouthScale.on('change', sync);
  }, [isSpeaking, externalMouth, mouthScale]);

  useEffect(() => {
    if (externalMouth || !isSpeaking) {
      setTalkPulse(0);
      return;
    }
    let frame: number;
    const update = () => {
      const time = Date.now() / 150;
      const pulse = (Math.sin(time) * 0.5 + 0.5) * 0.6 + Math.sin(time * 2.3) * 0.2;
      setTalkPulse(Math.max(0, pulse));
      frame = requestAnimationFrame(update);
    };
    frame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frame);
  }, [isSpeaking, externalMouth]);

  const macroDriftX = idle.macroGaze.x + idle.microDrift.x;
  const macroDriftY = idle.macroGaze.y + idle.microDrift.y;

  const idleVariant = idle.idleVariant;

  const eyePack =
    isSpeaking || isListening
      ? EYE_PATHS.speaking
      : isThinking
        ? EYE_PATHS.curious
        : EYE_PATHS[idleVariant];

  const curiousTilt = !isSpeaking && !isThinking && !isListening && idleVariant === 'curious' ? 3.2 : 0;
  const sadTilt = !isSpeaking && !isThinking && !isListening && idleVariant === 'sad' ? 6 : 0;
  const sleepBreathMs = !isSpeaking && !isThinking && idleVariant === 'sleep' ? 5.5 : 4.2;

  function eyePathForSide(side: 'left' | 'right'): string {
    if (idle.blinkShut && !isSpeaking) return BLINK_PATH;
    return eyePack[side];
  }

  function restingMouthPath(): string {
    if (isListening) return 'M 10,15 Q 25,28 40,15 Q 25,38 10,15 Z';
    if (isSpeaking && !externalMouth) return buildTalkingPillPath(talkPulse);
    if (isThinking) return 'M 15,25 H 35 V 32 H 15 Z';
    if (!isSpeaking) return IDLE_MOUTH[idleVariant];
    return IDLE_MOUTH.happy;
  }

  const vibrancePurple = '#a855f7';
  const accentWhite = '#ffffff';

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-black overflow-hidden select-none">
      <svg style={{ visibility: 'hidden', position: 'absolute' }}>
        <defs>
          <radialGradient id="orbGradient" cx="30%" cy="30%" r="70%">
            <stop offset="0%" stopColor={accentWhite} stopOpacity="0.95" />
            <stop offset="45%" stopColor={accentWhite} stopOpacity="0.6" />
            <stop offset="100%" stopColor={vibrancePurple} />
          </radialGradient>
          <radialGradient id="idleEyeGlow" cx="50%" cy="45%" r="55%">
            <stop offset="0%" stopColor="white" stopOpacity="0.35" />
            <stop offset="70%" stopColor="transparent" stopOpacity="0" />
          </radialGradient>
        </defs>
      </svg>

      <motion.div
        className="w-full h-[60%] flex items-center justify-center space-x-[1.5vw]"
        animate={{
          rotateX: isSpeaking ? 0 : -(macroDriftY * 0.35 + sadTilt * 0.15),
          rotateY: isSpeaking ? 0 : macroDriftX * 0.22,
          rotateZ: isSpeaking ? 0 : curiousTilt,
          scale: isSpeaking ? 1 : [1, 1.018, 1],
        }}
        transition={{
          rotateX: isSpeaking ? { duration: 0.28, ease: SNAP_EASE } : { duration: 0.58, ease: GAZE_EASE },
          rotateY: isSpeaking ? { duration: 0.28, ease: SNAP_EASE } : { duration: 0.58, ease: GAZE_EASE },
          rotateZ: { duration: 0.48, ease: GAZE_EASE },
          scale: isSpeaking ? { duration: 0.25 } : { duration: sleepBreathMs, repeat: Infinity, ease: 'easeInOut' },
        }}
        style={{ perspective: 1200 }}
      >
        {(['left', 'right'] as const).map((side) => {
          const isLeft = side === 'left';
          const leadMultiplier = 1.12;
          const trailMultiplier = 0.82;
          let xOffset = 0;
          if (!isSpeaking) {
            if (macroDriftX < 0) {
              xOffset = isLeft ? macroDriftX * leadMultiplier : macroDriftX * trailMultiplier;
            } else {
              xOffset = isLeft ? macroDriftX * trailMultiplier : macroDriftX * leadMultiplier;
            }
          }
          const yOffset = !isSpeaking ? (isLeft ? macroDriftY * 1.02 : macroDriftY * 0.98) : 0;

          const curiousScale = !isSpeaking && idleVariant === 'curious' ? (isLeft ? 1 : 0.9) : 1;

          return (
            <motion.div
              key={side}
              className="relative w-[40vw] h-[40vw]"
              animate={{
                x: xOffset,
                y: yOffset,
                rotateZ: isSpeaking ? 0 : isLeft ? macroDriftX * 0.04 : -macroDriftX * 0.04,
                scaleY: curiousScale,
              }}
              transition={{
                x: {
                  duration: isSpeaking ? 0.28 : 0.58,
                  ease: GAZE_EASE,
                },
                y: {
                  duration: isSpeaking ? 0.28 : 0.58,
                  ease: GAZE_EASE,
                },
                rotateZ: { duration: 0.48, ease: GAZE_EASE },
                scaleY: { duration: 0.52, ease: GAZE_EASE },
              }}
            >
              <svg viewBox="-40 -20 180 150" className="w-full h-full overflow-visible">
                <filter id={`glow-${side}`}>
                  <feGaussianBlur stdDeviation={isSpeaking ? 3 : 4} result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
                {!isSpeaking && idleVariant === 'happy' && (
                  <ellipse cx="50" cy="58" rx="38" ry="28" fill="url(#idleEyeGlow)" opacity={0.45} />
                )}
                <motion.path
                  animate={{ d: eyePathForSide(side) }}
                  transition={{
                    duration: idle.blinkShut && !isSpeaking ? 0.12 : isSpeaking ? 0.35 : 0.55,
                    ease: 'easeInOut',
                  }}
                  fill="url(#orbGradient)"
                  stroke="transparent"
                  strokeWidth="0"
                  strokeLinecap="round"
                  style={{ filter: `url(#glow-${side})` }}
                />
                {!isSpeaking && idleVariant === 'sad' && side === 'left' && (
                  <motion.circle
                    cx="42"
                    cy="118"
                    r="3"
                    fill="rgba(147,197,253,0.45)"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0.15, 0.55, 0.2], cy: [118, 124, 130] }}
                    transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
                  />
                )}
              </svg>
            </motion.div>
          );
        })}
      </motion.div>

      <motion.div
        className="w-full h-[35%] flex items-center justify-center pb-8"
        animate={{
          rotateX: isSpeaking ? 0 : macroDriftY * 0.08,
          scale: isSpeaking ? 1 : [1, 1.04, 1],
        }}
        transition={{
          rotateX: isSpeaking ? { duration: 0.28 } : { duration: 0.58, ease: GAZE_EASE },
          scale: isSpeaking ? { duration: 0.25 } : { duration: 5.2, repeat: Infinity, ease: 'easeInOut' },
        }}
        style={{ perspective: 1200 }}
      >
        <div className="relative w-[55vw] h-[25vw]">
          <svg viewBox="0 0 50 50" className="w-full h-full overflow-visible">
            {isSpeaking && externalMouth ? (
              <path
                ref={talkPathRef}
                fill="url(#orbGradient)"
                stroke="transparent"
                strokeWidth="0"
                strokeLinecap="round"
                style={{ filter: 'drop-shadow(0 0 10px rgba(168, 85, 247, 0.4))' }}
              />
            ) : (
              <motion.path
                animate={{ d: restingMouthPath() }}
                transition={{
                  duration: isSpeaking ? 0.08 : 0.55,
                  ease: isSpeaking ? 'linear' : 'easeInOut',
                }}
                fill="url(#orbGradient)"
                stroke="transparent"
                strokeWidth="0"
                strokeLinecap="round"
                style={{ filter: 'drop-shadow(0 0 10px rgba(168, 85, 247, 0.4))' }}
              />
            )}
          </svg>
        </div>
      </motion.div>

      <motion.div
        className="absolute inset-0 pointer-events-none opacity-[0.2]"
        animate={{
          opacity: isSpeaking ? [0.14, 0.14] : [0.08, 0.18, 0.08],
        }}
        transition={{
          duration: isSpeaking ? 0.3 : 4,
          repeat: isSpeaking ? 0 : Infinity,
          ease: 'easeInOut',
        }}
        style={{ background: `radial-gradient(circle at center, ${vibrancePurple}33 0%, transparent 80%)` }}
      />
    </div>
  );
}
