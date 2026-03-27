import React from 'react';
import { motion } from 'motion/react';

export default function CourseMenuComponent({
  options,
  onSelect,
}: {
  options: string[];
  onSelect: (departmentName: string) => void;
}) {
  return (
    <div className="course-menu-overlay">
      <div className="course-menu-shell">
        <div className="course-menu-header">
          <div className="course-menu-eyebrow">ENGINEERING</div>
          <h2 className="course-menu-title">Select a Department</h2>
        </div>
        <div className="course-menu-grid">
          {options.map((dept, idx) => (
            <motion.button
              key={dept}
              type="button"
              onClick={() => onSelect(dept)}
              className="course-menu-tile"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, delay: idx * 0.03 }}
            >
              <span className="course-menu-tile-title">{dept}</span>
              <span className="course-menu-tile-subtitle">Overview</span>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}
