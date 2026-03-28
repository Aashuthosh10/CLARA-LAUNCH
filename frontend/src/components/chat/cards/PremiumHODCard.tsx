import React from 'react';
import { motion } from 'motion/react';
import hodPortrait from '../../../assets/image_8c37bf.png';

export default function PremiumHODCard() {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
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
              Faculty Spotlight
            </motion.div>
            
            <motion.h2 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="premium-hod-name"
            >
              Dr. Nagashree N.
            </motion.h2>

            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="premium-hod-title"
            >
              Associate Professor & HOD (CSE - Data Science)
            </motion.div>

            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.6 }}
              className="premium-hod-bio"
            >
              With 20 years of experience, Dr. Nagashree N. holds a Ph.D. from 
              Visvesvaraya Technological University. Specialized in Data Science, 
              Machine Learning, Deep Learning, and she has over 35 publications 
              in International Journals/Conferences.
            </motion.p>
          </div>
        </div>

        {/* Right Side: Portrait */}
        <div className="premium-hod-right">
          <motion.img 
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.8, ease: "easeOut" }}
            src={hodPortrait} 
            alt="Dr. Nagashree N." 
            className="premium-hod-portrait"
          />

        </div>
      </div>
    </motion.div>
  );
}
