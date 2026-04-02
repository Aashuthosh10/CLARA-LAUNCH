import React from 'react';
import PremiumHODCard from './PremiumHODCard';
import hodImg from '../../../assets/hod_vrinda.jpg';

export default function PremiumHODCardISE() {
  return (
    <PremiumHODCard
      name="Dr. Vrinda Shetty"
      title="Professor & HOD, Information Science & Engineering"
      bio="Dr. Vrinda Shetty leads the ISE department with a focus on information systems, data management, and modern software technologies. She has rich teaching experience and encourages students to work on industry-relevant projects and internships. Her interests include databases, networking, and emerging trends in information science."
      portrait={hodImg}
    />
  );
}
