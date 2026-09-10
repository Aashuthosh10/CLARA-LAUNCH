/**
 * Dual-mode face: SPEAKING (TTS lip sync, eyes fixed / soft smile) vs IDLE (alive loops — never overlap).
 * Bright expressive face: curvy eyebrows + no sad idle variant.
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
    left: 'M -8,-30 H 108 A 60,60 0 0 1 168,30 V 110 A 60,60 0 0 1 108,170 H -8 A 60,60 0 0 1 -68,110 V 30 A 60,60 0 0 1 -8,-30 Z',
    right: 'M -8,-30 H 108 A 60,60 0 0 1 168,30 V 110 A 60,60 0 0 1 108,170 H -8 A 60,60 0 0 1 -68,110 V 30 A 60,60 0 0 1 -8,-30 Z',
  },
  curious: {
    left: 'M 4,-4 H 96 A 50,50 0 0 1 146,46 V 98 A 50,50 0 0 1 96,148 H 4 A 50,50 0 0 1 -46,98 V 46 A 50,50 0 0 1 4,-4 Z',
    right: 'M -6,-28 H 106 A 62,62 0 0 1 168,34 V 110 A 62,62 0 0 1 106,172 H -6 A 62,62 0 0 1 -68,110 V 34 A 62,62 0 0 1 -6,-28 Z',
  },
  heart: {
    left: 'M 50,108 C 50,108 -22,72 -22,18 C -22,-8 6,-22 32,-22 C 44,-22 48,-14 50,6 C 52,-14 56,-22 68,-22 C 94,-22 122,-8 122,18 C 122,72 50,108 50,108 Z',
    right: 'M 50,108 C 50,108 -22,72 -22,18 C -22,-8 6,-22 32,-22 C 44,-22 48,-14 50,6 C 52,-14 56,-22 68,-22 C 94,-22 122,-8 122,18 C 122,72 50,108 50,108 Z',
  },
  speaking: {
    left: 'M -8,-26 H 108 A 62,62 0 0 1 170,36 V 104 A 62,62 0 0 1 108,166 H -8 A 62,62 0 0 1 -70,104 V 36 A 62,62 0 0 1 -8,-26 Z',
    right: 'M -8,-26 H 108 A 62,62 0 0 1 170,36 V 104 A 62,62 0 0 1 108,166 H -8 A 62,62 0 0 1 -70,104 V 36 A 62,62 0 0 1 -8,-26 Z',
  },
};

/**
 * Tapered crescent brows: thick nasal side, narrow outer tips.
 * Kept low enough that upward gaze never pushes them past the screen top.
 */
type BrowPack = { left: string; right: string };

const BROW_PATHS: Record<string, BrowPack> = {
  happy: {
    left:
      'M -68,-76 C -70,-81 -52,-96 -16,-104 C 8,-109 32,-96 40,-82 C 43,-76 38,-72 29,-73 C 5,-85 -20,-81 -60,-71 C -69,-73 -68,-76 -68,-76 Z',
    right:
      'M 168,-76 C 170,-81 152,-96 116,-104 C 92,-109 68,-96 60,-82 C 57,-76 62,-72 71,-73 C 95,-85 120,-81 160,-71 C 169,-73 168,-76 168,-76 Z',
  },
  speaking: {
    left:
      'M -66,-70 C -68,-75 -50,-90 -14,-98 C 10,-103 34,-90 42,-76 C 45,-70 40,-66 31,-67 C 7,-79 -18,-75 -58,-63 C -67,-65 -66,-70 -66,-70 Z',
    right:
      'M 166,-70 C 168,-75 150,-90 114,-98 C 90,-103 66,-90 58,-76 C 55,-70 60,-66 69,-67 C 93,-79 118,-75 158,-63 C 167,-65 166,-70 166,-70 Z',
  },
  listening: {
    left:
      'M -64,-66 C -66,-71 -48,-86 -12,-94 C 12,-99 36,-86 44,-72 C 47,-66 42,-62 33,-63 C 9,-75 -16,-71 -56,-59 C -65,-61 -64,-66 -64,-66 Z',
    right:
      'M 164,-66 C 166,-71 148,-86 112,-94 C 88,-99 64,-86 56,-72 C 53,-66 58,-62 67,-63 C 91,-75 116,-71 156,-59 C 165,-61 164,-66 164,-66 Z',
  },
  curious: {
    left:
      'M -72,-86 C -74,-93 -54,-108 -16,-116 C 8,-121 34,-106 42,-90 C 45,-84 40,-79 31,-80 C 5,-94 -24,-88 -64,-75 C -73,-77 -72,-86 -72,-86 Z',
    right:
      'M 162,-64 C 164,-69 148,-84 114,-92 C 92,-97 70,-84 62,-72 C 59,-66 64,-61 73,-62 C 95,-72 120,-69 154,-59 C 163,-61 162,-64 162,-64 Z',
  },
  thinking: {
    left:
      'M -70,-80 C -72,-87 -52,-102 -14,-110 C 10,-115 34,-100 42,-86 C 45,-80 40,-75 31,-76 C 5,-88 -22,-84 -62,-71 C -71,-73 -70,-80 -70,-80 Z',
    right:
      'M 164,-66 C 166,-71 150,-86 116,-94 C 94,-99 72,-86 64,-74 C 61,-68 66,-63 75,-64 C 97,-74 122,-71 156,-61 C 165,-63 164,-66 164,-66 Z',
  },
};

const BLINK_PATH = 'M 5,35 Q 50,15 95,35 L 95,38 Q 50,18 5,38 Z';

const IDLE_MOUTH: Record<IdleEyeVariant, string> = {
  // Bright upturned smile (was previously shared with sad downturn)
  happy: 'M 5,15 Q 25,38 45,15 Q 25,52 5,15 Z',
  curious: 'M 10,16 Q 25,34 40,16 Q 25,44 10,16 Z',
  heart: 'M 6,10 Q 25,48 44,10 Q 25,38 6,10 Z',
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

  const browKey = isSpeaking
    ? 'speaking'
    : isListening
      ? 'listening'
      : isThinking
        ? 'thinking'
        : idleVariant;

  const browPack = BROW_PATHS[browKey] ?? BROW_PATHS.happy;
  // No brows while blinking or on heart eyes
  const showBrows = !(idle.blinkShut && !isSpeaking) && idleVariant !== 'heart';

  const curiousTilt = !isSpeaking && !isThinking && !isListening && idleVariant === 'curious' ? 3.2 : 0;

  function eyePathForSide(side: 'left' | 'right'): string {
    if (idle.blinkShut && !isSpeaking) return BLINK_PATH;
    return eyePack[side];
  }

  function restingMouthPath(): string {
    if (isListening) return 'M 10,14 Q 25,32 40,14 Q 25,42 10,14 Z';
    if (isSpeaking && !externalMouth) return buildTalkingPillPath(talkPulse);
    // Soft smile while thinking (not a flat bar)
    if (isThinking) return 'M 12,18 Q 25,30 38,18 Q 25,36 12,18 Z';
    if (!isSpeaking) return IDLE_MOUTH[idleVariant];
    return IDLE_MOUTH.happy;
  }

  const peakWhite = '#FFFFFF';

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-black overflow-hidden select-none pt-0">
      <svg style={{ visibility: 'hidden', position: 'absolute' }}>
        <defs>
          {/* Peak-white expression fill — no purple tint, no alpha attenuation. */}
          <radialGradient id="orbGradient" cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor={peakWhite} stopOpacity="1" />
            <stop offset="55%" stopColor={peakWhite} stopOpacity="1" />
            <stop offset="100%" stopColor={peakWhite} stopOpacity="1" />
          </radialGradient>
          <linearGradient id="browGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={peakWhite} stopOpacity="1" />
            <stop offset="50%" stopColor={peakWhite} stopOpacity="1" />
            <stop offset="100%" stopColor={peakWhite} stopOpacity="1" />
          </linearGradient>
          <radialGradient id="idleEyeGlow" cx="50%" cy="45%" r="55%">
            <stop offset="0%" stopColor={peakWhite} stopOpacity="0.55" />
            <stop offset="70%" stopColor={peakWhite} stopOpacity="0" />
          </radialGradient>
        </defs>
      </svg>

      <motion.div
        className="absolute inset-0 z-10 pointer-events-none overflow-visible"
        animate={{
          rotateX: isSpeaking ? 0 : -(macroDriftY * 0.35),
          rotateY: isSpeaking ? 0 : macroDriftX * 0.22,
          rotateZ: isSpeaking ? 0 : curiousTilt,
          scale: isSpeaking ? 1 : [1, 1.018, 1],
        }}
        transition={{
          rotateX: isSpeaking ? { duration: 0.28, ease: SNAP_EASE } : { duration: 0.58, ease: GAZE_EASE },
          rotateY: isSpeaking ? { duration: 0.28, ease: SNAP_EASE } : { duration: 0.58, ease: GAZE_EASE },
          rotateZ: { duration: 0.48, ease: GAZE_EASE },
          scale: isSpeaking ? { duration: 0.25 } : { duration: 4.2, repeat: Infinity, ease: 'easeInOut' },
        }}
        style={{ perspective: 1200, overflow: 'visible' }}
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
          const yOffset = !isSpeaking ? Math.max(isLeft ? macroDriftY * 1.02 : macroDriftY * 0.98, -12) : 0;

          const curiousScale = !isSpeaking && idleVariant === 'curious' ? (isLeft ? 1 : 0.9) : 1;

          return (
            <motion.div
              key={side}
              className={`absolute top-[1.5vh] ${isLeft ? 'left-[0.2vw]' : 'right-[0.2vw]'} w-[calc(min(46vw,52vh)+6cm)] h-[calc(min(46vw,52vh)+6cm)] overflow-visible`}
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
              style={{ overflow: 'visible' }}
            >
              {/* Cropped viewBox so eyes+brows fill the top-corner tile (no empty headroom). */}
              <svg
                viewBox="-90 -130 280 340"
                className="w-full h-full overflow-visible"
                style={{ overflow: 'visible' }}
                preserveAspectRatio="xMidYMin meet"
              >
                <filter
                  id={`glow-${side}`}
                  x="-50%"
                  y="-50%"
                  width="200%"
                  height="200%"
                  filterUnits="objectBoundingBox"
                >
                  <feGaussianBlur stdDeviation={isSpeaking ? 2.5 : 3.5} result="blur" />
                  <feFlood floodColor="#FFFFFF" floodOpacity="0.85" result="whiteFlood" />
                  <feComposite in="whiteFlood" in2="blur" operator="in" result="whiteBlur" />
                  <feMerge>
                    <feMergeNode in="whiteBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <filter
                  id={`brow-glow-${side}`}
                  x="-80%"
                  y="-120%"
                  width="260%"
                  height="340%"
                  filterUnits="objectBoundingBox"
                >
                  <feGaussianBlur stdDeviation="2.5" result="blur" />
                  <feFlood floodColor="#FFFFFF" floodOpacity="0.9" result="whiteFlood" />
                  <feComposite in="whiteFlood" in2="blur" operator="in" result="whiteBlur" />
                  <feMerge>
                    <feMergeNode in="whiteBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                {!isSpeaking && idleVariant === 'happy' && (
                  <ellipse cx="50" cy="58" rx="86" ry="66" fill="url(#idleEyeGlow)" opacity={0.55} />
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
                {/* Brows painted AFTER eyes so heart shapes never cover them */}
                {showBrows && (
                  <motion.path
                    animate={{ d: browPack[side] }}
                    transition={{ duration: isSpeaking ? 0.28 : 0.45, ease: 'easeInOut' }}
                    fill="url(#browGradient)"
                    stroke="none"
                    opacity={1}
                    style={{ filter: `url(#brow-glow-${side})` }}
                  />
                )}
              </svg>
            </motion.div>
          );
        })}
      </motion.div>

      <motion.div
        className="absolute inset-x-0 bottom-[3vh] z-10 w-full flex items-end justify-center pointer-events-none"
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
        {/* Bottom-center mouth, independent of raised/oversized eyes. */}
        <div className="relative w-[46vw] h-[18vw] max-w-[760px] max-h-[300px] min-w-[320px] min-h-[140px]">
          <svg viewBox="0 0 50 50" className="w-full h-full overflow-visible">
            {isSpeaking && externalMouth ? (
              <path
                ref={talkPathRef}
                fill="url(#orbGradient)"
                stroke="transparent"
                strokeWidth="0"
                strokeLinecap="round"
                style={{ filter: 'drop-shadow(0 0 12px rgba(255, 255, 255, 0.55))' }}
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
                style={{ filter: 'drop-shadow(0 0 12px rgba(255, 255, 255, 0.55))' }}
              />
            )}
          </svg>
        </div>
      </motion.div>

      <motion.div
        className="absolute inset-0 pointer-events-none opacity-[0.2]"
        animate={{
          opacity: isSpeaking ? [0.1, 0.1] : [0.06, 0.12, 0.06],
        }}
        transition={{
          duration: isSpeaking ? 0.3 : 4,
          repeat: isSpeaking ? 0 : Infinity,
          ease: 'easeInOut',
        }}
        style={{ background: 'radial-gradient(circle at center, rgba(255,255,255,0.08) 0%, transparent 80%)' }}
      />
    </div>
  );
}
