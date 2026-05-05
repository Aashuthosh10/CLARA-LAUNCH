import React from 'react';
import { motion } from 'motion/react';

interface TrusteeCardProps {
  key?: React.Key;
  name: string;
  role: string;
  description: string;
  image: string;
}

export default function TrusteeCard({
  name,
  role,
  description,
  image
}: TrusteeCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -20 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="premium-hod-container"
    >
      {/* Decorative Borders */}
      <div className="premium-hod-border-outer" />
      <div className="premium-hod-border-inner" />
      <div className="premium-hod-vignette" />
      <div className="premium-hod-glow" />

      <div className="premium-hod-content">
        {/* Left Side: Content */}
        <div className="premium-hod-left">
          <div className="premium-hod-text-box">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="premium-hod-label"
            >
              Board of Trustees
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
              {role}
            </motion.div>

            <motion.p
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6, duration: 0.5 }}
              className="premium-hod-bio trustee-description"
            >
              {description}
            </motion.p>
          </div>
        </div>

        {/* Right Side: Portrait */}
        <div className="premium-hod-right">
          <motion.img
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.8, ease: "easeOut" }}
            src={image}
            alt={name}
            className="premium-hod-portrait"
          />
        </div>
      </div>
    </motion.div>
  );
}
