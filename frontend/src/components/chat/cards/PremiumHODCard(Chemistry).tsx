import React from 'react';
import PremiumHODCard from './PremiumHODCard';
import hodImg from '../../../assets/hod_chemistry.jpg';

export default function PremiumHODCardChemistry() {
  return (
    <PremiumHODCard
      name="Dr. Bhagya N P"
      title="Professor & HOD, Chemistry"
      bio="Dr. Bhagya N P heads the Chemistry department, teaching engineering chemistry and its applications in materials and environmental domains. She has strong academic experience and promotes lab-based learning to connect theory with practice. Her interests lie in applied chemistry relevant to engineering and industry processes."
      portrait={hodImg}
    />
  );
}
