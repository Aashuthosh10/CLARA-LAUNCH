import React from 'react';
import PremiumHODCard from './PremiumHODCard';
import hodImg from '../../../assets/hod_venkatesha.jpg';

export default function PremiumHODCardEC() {
  return (
    <PremiumHODCard
      name="Dr. Chaya B M"
      title="Professor & HOD, Electronics & Communication Engineering"
      bio="With 18 years of teaching and 10 years of research experience. She holds a Ph.D. in Integrated Photonics from VTU. Her research interests include OLEDs, QLEDs, Organic Photodetectors, Micro-LEDs, Optical Sensors, and Lab-on-a-Chip systems. She has 35 research publications, 10+ patents, and completed a ₹5 lakh sponsored research project. A VTU-recognized Research Supervisor, she guides Ph.D. scholars. Her achievements include a VTU Gold Medal, Best Paper Award, IEEE Certificate of Appreciation, and multiple Certificates of Excellence."
      portrait={hodImg}
    />
  );
}
