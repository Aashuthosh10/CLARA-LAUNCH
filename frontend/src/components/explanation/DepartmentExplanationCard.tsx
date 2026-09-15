/**
 * DepartmentExplanationCard — cinematic card for one department explanation.
 *
 * Layout: video background (muted loop cover) with a glass panel on the left
 * showing title + summary. When no video is available, falls back to a
 * gradient without any crash or error state shown to the visitor.
 *
 * DO NOT import SiriOrb, RobotFace, SpeechRecognition, or ResponseTtsScheduler.
 */

import React, { useRef, useState } from 'react';
import { motion } from 'motion/react';

export interface DepartmentExplanationCardProps {
  /** Backend unit id, e.g. "department_explanation.cse" */
  unitId: string;
  /** Short display title for the department */
  title: string;
  /** One-sentence summary / placeholder */
  summary: string;
  /** Optional video path from unit metadata.video_src */
  videoSrc?: string;
  /** Language code for locale-aware rendering */
  languageCode?: string;
}

// Gradient fallbacks — one per dept order; cycle if > defined count.
const GRADIENT_FALLBACKS = [
  'from-indigo-900 via-blue-900 to-slate-900',
  'from-violet-900 via-purple-900 to-slate-900',
  'from-cyan-900 via-teal-900 to-slate-900',
  'from-emerald-900 via-green-900 to-slate-900',
  'from-rose-900 via-pink-900 to-slate-900',
  'from-amber-900 via-orange-900 to-slate-900',
  'from-sky-900 via-blue-900 to-slate-900',
  'from-fuchsia-900 via-violet-900 to-slate-900',
  'from-lime-900 via-green-900 to-slate-900',
  'from-red-900 via-rose-900 to-slate-900',
  'from-blue-900 via-indigo-900 to-slate-900',
];

function gradientForUnit(unitId: string): string {
  // Stable deterministic gradient from unit_id hash.
  let h = 0;
  for (let i = 0; i < unitId.length; i++) {
    h = (h * 31 + unitId.charCodeAt(i)) >>> 0;
  }
  return GRADIENT_FALLBACKS[h % GRADIENT_FALLBACKS.length];
}

export const DepartmentExplanationCard: React.FC<DepartmentExplanationCardProps> = ({
  unitId,
  title,
  summary,
  videoSrc,
  languageCode = 'en',
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoFailed, setVideoFailed] = useState(false);
  const gradient = gradientForUnit(unitId);

  const showVideo = Boolean(videoSrc) && !videoFailed;

  return (
    <motion.div
      className="relative w-full h-full overflow-hidden rounded-2xl"
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
    >
      {/* Background: video or gradient */}
      {showVideo ? (
        <video
          ref={videoRef}
          src={videoSrc}
          className="absolute inset-0 w-full h-full object-cover"
          autoPlay
          loop
          muted
          playsInline
          onError={() => setVideoFailed(true)}
          aria-hidden="true"
        />
      ) : (
        <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`} />
      )}

      {/* Subtle dark overlay so text is always readable */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Glass panel — LEFT aligned; wide enough for regional scripts */}
      <div className="absolute inset-y-0 left-0 w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl flex items-center">
        <motion.div
          className={[
            'mx-4 my-6 p-5 sm:p-6 rounded-xl w-full',
            'bg-white/10 backdrop-blur-md',
            'border border-white/20',
            'shadow-2xl',
            'flex flex-col gap-3',
          ].join(' ')}
          initial={{ x: -24, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.15, ease: 'easeOut' }}
        >
          {/* Title */}
          <h3
            className="text-white font-bold text-lg sm:text-xl leading-snug line-clamp-3"
            lang={languageCode}
          >
            {title}
          </h3>

          {/* Summary / supporting line */}
          <p
            className="text-white/80 text-sm sm:text-base leading-relaxed line-clamp-4"
            lang={languageCode}
          >
            {summary}
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default DepartmentExplanationCard;
