import React from 'react';
import PremiumHODCard from './PremiumHODCard';
import hodImg from '../../../assets/hod_mechanical.jpg';

export default function PremiumHODCardMechanical() {
  return (
    <PremiumHODCard
      name="Dr. Raghavendra S"
      title="Professor & HOD, Mechanical Engineering"
      bio="Dr. Raghavendra S heads the Mechanical Engineering department, focusing on design, manufacturing, and thermal engineering. He has strong academic and research exposure and supports project-based learning, labs, and industry interaction. His interests include advanced manufacturing and applied mechanics."
      portrait={hodImg}
    />
  );
}
