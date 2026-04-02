import React from 'react';
import PremiumHODCard from './PremiumHODCard';
import hodImg from '../../../assets/hod_maths.jpg';

export default function PremiumHODCardMathematics() {
  return (
    <PremiumHODCard
      name="Dr. Arun Kumar R"
      title="Professor & HOD, Mathematics"
      bio="Dr. Arun Kumar R heads the Mathematics department, ensuring strong mathematical foundations for all engineering disciplines. He has extensive teaching experience and focuses on applied mathematics relevant to engineering and data analysis. His work supports advanced courses and research that rely on rigorous quantitative skills."
      portrait={hodImg}
    />
  );
}
