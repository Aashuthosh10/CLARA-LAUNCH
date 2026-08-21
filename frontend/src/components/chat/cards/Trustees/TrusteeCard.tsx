import React from 'react';
import { motion } from 'motion/react';

interface TrusteeCardProps {
  key?: React.Key;
  direction: 1 | -1;
  name: string;
  role: string;
  description: string;
  image: string;
  boardLabel?: string;
}

export default function TrusteeCard({
  direction,
  name,
  role,
  description,
  image,
  boardLabel = 'Board of Trustees',
}: TrusteeCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: direction > 0 ? 24 : -24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: direction > 0 ? -24 : 24 }}
      transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
      className="trustee-card"
    >
      {/* Decorative Borders */}
      <div className="trustee-card-border-outer" />
      <div className="trustee-card-border-inner" />
      <div className="trustee-card-vignette" />
      <div className="trustee-card-glow" />

      <div className="trustee-card-content">
        {/* Left Side: Content */}
        <div className="trustee-card-left">
          <div className="trustee-card-text-box">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="trustee-card-label"
            >
              {boardLabel}
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="trustee-card-name"
            >
              {name}
            </motion.h2>

            {role ? (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="trustee-card-role"
            >
              {role}
            </motion.div>
            ) : null}

            {description ? (
            <motion.p
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6, duration: 0.5 }}
              className="trustee-card-description trustee-description"
            >
              {description}
            </motion.p>
            ) : null}
          </div>
        </div>

        {/* Right Side: Portrait */}
        <div className="trustee-card-right">
          <motion.img
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.8, ease: "easeOut" }}
            src={image}
            alt={name}
            className="trustee-card-portrait"
          />
        </div>
      </div>
    </motion.div>
  );
}
