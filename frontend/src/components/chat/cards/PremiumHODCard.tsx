import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface PremiumHODCardProps {
  name: string;
  title: string;
  bio: string;
  portrait: string;
  label?: string;
  /** When set with variant=video_spotlight, full-card muted looping background video. */
  videoSrc?: string | null;
  /** Only the active card's video should play. */
  mediaActive?: boolean;
  /**
   * profile = existing HOD/creator layout (text | portrait).
   * video_spotlight = full-card video + floating glass panel (department explanation).
   */
  variant?: 'profile' | 'video_spotlight';
  /** Stable key so stage changes do not remount/restart the video. */
  videoStableKey?: string | null;
}

/**
 * Canonical CLARA profile / spotlight card (HOD source of truth).
 * video_spotlight extends the same shell with full-bleed muted looping video
 * and a floating glass panel — same family, not a second card system.
 */
export default function PremiumHODCard({
  name,
  title,
  bio,
  portrait,
  label = 'Faculty Spotlight',
  videoSrc = null,
  mediaActive = true,
  variant = 'profile',
  videoStableKey = null,
}: PremiumHODCardProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const useVideoSpotlight = variant === 'video_spotlight';
  const useSideVideo = variant === 'profile' && Boolean(videoSrc);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || (!useVideoSpotlight && !useSideVideo) || !videoSrc) return;
    if (mediaActive) {
      el.muted = true;
      const playAttempt = el.play();
      if (playAttempt && typeof playAttempt.catch === 'function') {
        playAttempt.catch(() => {
          /* autoplay policies — stay muted silent */
        });
      }
    } else {
      el.pause();
    }
  }, [mediaActive, useVideoSpotlight, useSideVideo, videoSrc, videoStableKey]);

  if (useVideoSpotlight) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="premium-hod-container premium-hod-container--video-spotlight"
        data-testid="premium-hod-card"
        data-media="video-spotlight"
        data-variant="video_spotlight"
      >
        {videoSrc ? (
          <video
            ref={videoRef}
            key={videoStableKey || videoSrc || 'spotlight-video'}
            src={videoSrc || undefined}
            className="premium-hod-fullcard-video"
            muted
            loop
            playsInline
            autoPlay={mediaActive}
            aria-hidden
            data-testid="premium-hod-video"
          />
        ) : (
          <div className="premium-hod-fullcard-video premium-hod-fullcard-video--fallback" aria-hidden />
        )}
        <div className="premium-hod-border-outer" />
        <div className="premium-hod-border-inner" />
        <div className="premium-hod-vignette" />
        <div className="premium-hod-glow" />

        <div className="premium-hod-spotlight-overlay">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${name}|${title}|${bio.slice(0, 48)}`}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="premium-hod-glass-float"
              data-testid="department-glass-panel"
            >
              <div className="premium-hod-label">{label}</div>
              <h2 className="premium-hod-name">{name}</h2>
              <div className="premium-hod-title">{title}</div>
              <p className="premium-hod-bio">{bio}</p>
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="premium-hod-container"
      data-testid="premium-hod-card"
      data-media={useSideVideo ? 'video' : 'image'}
      data-variant="profile"
    >
      <div className="premium-hod-border-outer" />
      <div className="premium-hod-border-inner" />
      <div className="premium-hod-vignette" />
      <div className="premium-hod-glow" />

      <div className="premium-hod-content">
        <div className="premium-hod-left">
          <div className="premium-hod-text-box">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="premium-hod-label"
            >
              {label}
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="premium-hod-name"
            >
              {name}
            </motion.h2>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="premium-hod-title"
            >
              {title}
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.6 }}
              className="premium-hod-bio"
            >
              {bio}
            </motion.p>
          </div>
        </div>

        <div className="premium-hod-right">
          {useSideVideo ? (
            <video
              ref={videoRef}
              key={videoSrc || 'video'}
              src={videoSrc || undefined}
              className="premium-hod-portrait"
              muted
              loop
              playsInline
              autoPlay={mediaActive}
              aria-hidden
              data-testid="premium-hod-video"
            />
          ) : (
            <motion.img
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.8, ease: 'easeOut' }}
              src={portrait}
              alt={name}
              className="premium-hod-portrait"
            />
          )}
        </div>
      </div>
    </motion.div>
  );
}
