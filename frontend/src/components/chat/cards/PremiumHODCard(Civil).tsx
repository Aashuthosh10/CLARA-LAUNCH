import React from 'react';
import PremiumHODCard from './PremiumHODCard';
import hodImg from '../../../assets/hod_civil.jpg';

export default function PremiumHODCardCivil() {
  return (
    <PremiumHODCard
      name="Dr. Ananthayya M B"
      title="Professor & HOD, Civil Engineering"
      bio="Dr. Ananthayya M B leads the Civil Engineering department with emphasis on structural, environmental, and construction engineering. He has considerable teaching and field experience, encouraging students to engage in practical design and site-related learning. His academic interests cover core civil domains and sustainable infrastructure."
      portrait={hodImg}
    />
  );
}
