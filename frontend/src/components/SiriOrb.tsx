import React, { useEffect } from 'react';
import { motion } from 'motion/react';

/** Mounted `<SiriOrb />` instances (diagnostics / kiosk telemetry). */
let siriOrbMountCount = 0;

export function getActiveOrbLoops(): number {
  return siriOrbMountCount;
}

interface SiriOrbProps {
  amplitude?: number;
  isListening?: boolean;
}

const SiriOrb: React.FC<SiriOrbProps> = ({ amplitude = 0, isListening = false }) => {
  useEffect(() => {
    siriOrbMountCount += 1;
    return () => {
      siriOrbMountCount -= 1;
    };
  }, []);
  // Dynamically control speed via inline animationDuration — no class toggling needed
  const idlePulseDur   = isListening ? '1.4s' : '3.5s';
  const flow1Dur       = isListening ? '4s'   : '10s';
  const flow2Dur       = isListening ? '5.5s' : '13s';
  const flow3Dur       = isListening ? '3.5s' : '9s';
  const coreDur        = isListening ? '1.2s' : '2.8s';
  const waveDur        = isListening ? '1.0s' : '2.4s';
  const ambientDur     = isListening ? '1.5s' : '3.2s';

  const extraAmp = amplitude * 0.12;
  const glowScale = 1 + (isListening ? 0.06 : 0) + extraAmp;

  const outerGlow = isListening
    ? `0 0 0 2px rgba(216,70,164,0.35),
       0 0 40px  rgba(99,102,241,0.75),
       0 0 80px  rgba(59,130,246,0.55),
       0 0 130px rgba(139,92,246,0.35)`
    : `0 0 0 2px rgba(216,70,164,0.2),
       0 0 28px  rgba(99,102,241,0.48),
       0 0 58px  rgba(59,130,246,0.28),
       0 0 95px  rgba(139,92,246,0.16)`;

  return (
    <>
      <style>{`
        /* ── Orb outer breathe ── */
        @keyframes _so_idle_pulse {
          0%,100% { transform: scale(1); }
          50%      { transform: scale(1.03); }
        }
        @keyframes _so_listen_pulse {
          0%,100% { transform: scale(1); }
          50%      { transform: scale(1.08); }
        }

        /* ── Internal flow rotation (blobs orbit inside the sphere) ── */
        @keyframes _so_flow_cw {
          0%   { transform: rotate(0deg)   scale(1); }
          50%  { transform: rotate(180deg) scale(1.05); }
          100% { transform: rotate(360deg) scale(1); }
        }
        @keyframes _so_flow_ccw {
          0%   { transform: rotate(0deg)   scale(1); }
          50%  { transform: rotate(-180deg) scale(1.06); }
          100% { transform: rotate(-360deg) scale(1); }
        }

        /* ── Vertical wave ── */
        @keyframes _so_wave {
          0%,100% { transform: translateY(0px); }
          50%      { transform: translateY(-7px); }
        }

        /* ── Core glow breathe ── */
        @keyframes _so_core {
          0%,100% { opacity: 0.82; transform: scale(1); }
          50%      { opacity: 1;    transform: scale(1.12); }
        }

        /* ── Shimmer (opacity oscillation) ── */
        @keyframes _so_shimmer {
          0%,100% { opacity: 0.85; }
          50%      { opacity: 1; }
        }

        /* ── Ambient halo ── */
        @keyframes _so_ambient {
          0%,100% { opacity: 0.5; transform: scale(1); }
          50%      { opacity: 0.9; transform: scale(1.04); }
        }

        /* ── Dotted ring pulse ── */
        @keyframes _so_rings {
          0%,100% { opacity: 0.17; }
          50%      { opacity: 0.36; }
        }
      `}</style>

      {/* ══ Root wrapper ══ */}
      <div style={{ position: 'relative', width: 200, height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>

        {/* ── AMBIENT HALO ── */}
        <div style={{
          position: 'absolute', width: 320, height: 320, borderRadius: '50%',
          background: `radial-gradient(circle at 50% 50%,
            rgba(139,92,246,${isListening ? 0.3 : 0.2})  0%,
            rgba(99,102,241,${isListening ? 0.18 : 0.12}) 40%,
            transparent 72%)`,
          filter: 'blur(30px)',
          animation: `_so_ambient ${ambientDur} ease-in-out infinite`,
        }} />

        {/* ── DOTTED CONCENTRIC RINGS ── */}
        {[192, 174, 157, 141].map((d, i) => (
          <div key={i} style={{
            position: 'absolute',
            width: d, height: d,
            borderRadius: '50%',
            border: `1px dotted rgba(${isListening ? '180,160,240' : '160,150,210'},0.26)`,
            left: '50%', top: '50%',
            transform: 'translate(-50%,-50%)',
            animation: `_so_rings ${ambientDur} ease-in-out infinite`,
            animationDelay: `${i * 0.45}s`,
          }} />
        ))}

        {/* ══ MAIN ORB — overflow:hidden clips all internal layers ══ */}
        <div style={{
          position: 'relative',
          width: 126, height: 126,
          borderRadius: '50%',
          overflow: 'hidden',
          transform: `scale(${glowScale})`,
          transition: 'transform 0.5s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.5s ease',
          boxShadow: outerGlow,
          animation: isListening
            ? `_so_listen_pulse ${idlePulseDur} ease-in-out infinite`
            : `_so_idle_pulse   ${idlePulseDur} ease-in-out infinite`,
        }}>

          {/* ── 1. DEEP DARK BASE ── */}
          <div style={{
            position: 'absolute', inset: 0,
            background: `radial-gradient(circle at 48% 62%,
              #1a1540 0%, #0e0b28 55%, #06040f 100%)`,
          }} />

          {/* ══ INTERNAL FLOW LAYER 1 — blue-cyan swirl (clockwise) ══ */}
          <div style={{
            position: 'absolute', inset: '-20%',   // oversized to prevent edge reveal during rotation
            borderRadius: '50%',
            background: `
              radial-gradient(circle at 65% 28%, rgba(34,211,238,0.8) 0%, rgba(59,130,246,0.5) 28%, transparent 55%),
              radial-gradient(circle at 30% 72%, rgba(59,130,246,0.55) 0%, transparent 45%)
            `,
            filter: 'blur(14px)',
            animation: `_so_flow_cw ${flow1Dur} linear infinite`,
            transformOrigin: '50% 50%',
          }} />

          {/* ══ INTERNAL FLOW LAYER 2 — violet-purple swirl (counter-clockwise) ══ */}
          <div style={{
            position: 'absolute', inset: '-20%',
            borderRadius: '50%',
            background: `
              radial-gradient(circle at 38% 55%, rgba(124,58,237,0.9) 0%, rgba(109,40,217,0.55) 28%, transparent 55%),
              radial-gradient(circle at 72% 68%, rgba(99,102,241,0.5) 0%, transparent 42%)
            `,
            filter: 'blur(12px)',
            animation: `_so_flow_ccw ${flow2Dur} linear infinite`,
            transformOrigin: '50% 50%',
          }} />

          {/* ══ INTERNAL FLOW LAYER 3 — pink-magenta wave (vertical wave) ══ */}
          <div style={{
            position: 'absolute', inset: '-20%',
            borderRadius: '50%',
            background: `
              radial-gradient(circle at 20% 80%, rgba(236,72,153,0.65) 0%, rgba(217,70,239,0.35) 25%, transparent 52%),
              radial-gradient(circle at 80% 20%, rgba(167,139,250,0.4) 0%, transparent 40%)
            `,
            filter: 'blur(16px)',
            animation: `_so_wave ${waveDur} ease-in-out infinite, _so_flow_cw ${flow3Dur} linear infinite`,
            transformOrigin: '50% 50%',
          }} />

          {/* ══ IRIDESCENT WAVEFORMS (Fiber-optic filaments) ══ */}
          <div style={{
            position: 'absolute', inset: '-15%',
            pointerEvents: 'none',
            zIndex: 5,
            opacity: 1, // High visibility
          }}>
            <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
              <defs>
                <linearGradient id="wave1" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#22D3EE" stopOpacity="1" />
                  <stop offset="50%" stopColor="#818CF8" stopOpacity="1" />
                  <stop offset="100%" stopColor="#EC4899" stopOpacity="1" />
                </linearGradient>
                <linearGradient id="wave2" x1="100%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#6366F1" stopOpacity="1" />
                  <stop offset="50%" stopColor="#A78BFA" stopOpacity="1" />
                  <stop offset="100%" stopColor="#F472B6" stopOpacity="1" />
                </linearGradient>
                <filter id="waveGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>
              
              {/* Primary Waveform 1 — static path; motion on <g> avoids undefined `d` from path morphing */}
              <motion.g
                animate={{
                  rotate: 360,
                  scale: isListening ? [1, 1.2, 1] : 1,
                  opacity: [0.9, 1, 0.9],
                }}
                transition={{
                  rotate: { duration: isListening ? 4 : 10, repeat: Infinity, ease: 'linear' },
                  scale: { duration: 1, repeat: Infinity, ease: 'easeInOut' },
                  opacity: { duration: 1, repeat: Infinity, ease: 'easeInOut' },
                }}
                style={{ transformOrigin: '50px 50px' }}
              >
                <path
                  d="M 15 50 Q 50 10 85 50 Q 50 25 15 50 Z"
                  fill="url(#wave1)"
                  filter="url(#waveGlow)"
                />
              </motion.g>

              <motion.g
                animate={{
                  rotate: -360,
                  scale: isListening ? [1, 1.15, 1] : 1,
                  opacity: [0.8, 1, 0.8],
                }}
                transition={{
                  rotate: { duration: isListening ? 6 : 14, repeat: Infinity, ease: 'linear' },
                  scale: { duration: 1.2, repeat: Infinity, ease: 'easeInOut' },
                  opacity: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' },
                }}
                style={{ transformOrigin: '50px 50px' }}
              >
                <path
                  d="M 20 30 Q 80 50 20 70 Q 50 50 20 30 Z"
                  fill="url(#wave2)"
                  filter="url(#waveGlow)"
                />
              </motion.g>

              <motion.g
                animate={{
                  rotate: 360,
                  opacity: [0.5, 0.9, 0.5],
                }}
                transition={{
                  rotate: { duration: isListening ? 3 : 8, repeat: Infinity, ease: 'linear' },
                  opacity: { duration: 1, repeat: Infinity, ease: 'easeInOut' },
                }}
                style={{ transformOrigin: '50px 50px' }}
              >
                <path
                  d="M 10 50 Q 50 0 90 50 Q 50 5 10 50 Z"
                  fill="#FFFFFF"
                  filter="url(#waveGlow)"
                />
              </motion.g>
            </svg>
          </div>

          {/* ── 5. INDIGO FILL — depth connector ── */}
          <div style={{
            position: 'absolute', inset: 0,
            background: `radial-gradient(circle at 52% 50%,
              rgba(99,102,241,0.4) 0%, transparent 60%)`,
            filter: 'blur(10px)',
            animation: `_so_shimmer ${coreDur} ease-in-out infinite`,
          }} />

          {/* ── 6. WHITE-LAVENDER CORE GLOW ── */}
          <div style={{
            position: 'absolute', inset: 0,
            background: `radial-gradient(circle at 45% 35%,
              rgba(255,255,255,1.0)  0%,
              rgba(196,181,253,0.88) 15%,
              rgba(139,92,246,0.48)  38%,
              transparent            60%)`,
            animation: `_so_core ${coreDur} ease-in-out infinite`,
          }} />

          {/* ── 7. GLASS SPECULAR TOP-LEFT ── */}
          <div style={{
            position: 'absolute',
            top: 10, left: 14,
            width: 42, height: 24,
            borderRadius: '50%',
            background: `linear-gradient(135deg,
              rgba(255,255,255,0.58) 0%,
              rgba(255,255,255,0.1)  50%,
              transparent            75%)`,
            transform: 'rotate(-32deg)',
            filter: 'blur(5px)',
          }} />

          {/* ── 8. GLASS SECONDARY STREAK — right side ── */}
          <div style={{
            position: 'absolute',
            top: '30%', right: 9,
            width: 11, height: 34,
            borderRadius: '50%',
            background: `linear-gradient(180deg,
              rgba(255,255,255,0.38) 0%,
              rgba(255,255,255,0.04) 60%,
              transparent            100%)`,
            filter: 'blur(4px)',
          }} />

          {/* ── 9. NEON RING EDGE — soft masked perimeter glow ── */}
          <div style={{
            position: 'absolute', inset: 0,
            background: `
              radial-gradient(circle at 50%   0%,  rgba(255,255,255,${isListening ? 0.9 : 0.75}) 0%, transparent 20%),
              radial-gradient(circle at 100% 30%,  rgba(34,211,238,${isListening ? 0.85 : 0.7}) 0%, transparent 22%),
              radial-gradient(circle at 88%  82%,  rgba(59,130,246,0.55)  0%, transparent 20%),
              radial-gradient(circle at 5%   75%,  rgba(236,72,153,${isListening ? 0.88 : 0.72}) 0%, transparent 22%),
              radial-gradient(circle at 42%  100%, rgba(167,139,250,0.55) 0%, transparent 20%)
            `,
            WebkitMask: 'radial-gradient(circle at center, transparent 38%, black 43%, black 50%, transparent 56%)',
            mask:        'radial-gradient(circle at center, transparent 38%, black 43%, black 50%, transparent 56%)',
            filter: `blur(${2.5 + amplitude * 2}px)`,
            animation: `_so_shimmer ${idlePulseDur} ease-in-out infinite`,
            transform: `scale(${1 + amplitude * 0.1})`,
          }} />

          {/* ══ 10. VOICE SHIMMER (Reactive Overlay) ══ */}
          {amplitude > 0.05 && (
            <div style={{
              position: 'absolute', inset: 0,
              background: `radial-gradient(circle at center, rgba(255,255,255,${0.2 + amplitude * 0.5}), transparent 70%)`,
              mixBlendMode: 'overlay',
              pointerEvents: 'none',
              filter: 'blur(8px)',
              transform: `scale(${1 + amplitude * 0.4})`,
              transition: 'transform 0.1s ease-out, opacity 0.1s ease-out',
            }} />
          )}

        </div>
        {/* ── end orb ── */}

      </div>
    </>
  );
};

export default SiriOrb;
