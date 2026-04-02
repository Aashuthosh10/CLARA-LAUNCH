import React from 'react';
import PremiumHODCard from './PremiumHODCard';
import hodImg from '../../../assets/hod_venkatesha.jpg';

export default function PremiumHODCardEC() {
  return (
    <PremiumHODCard
      name="Dr. Venkatesha M"
      title="Professor & HOD, Electronics & Communication Engineering"
      bio="Dr. Venkatesha M heads the ECE department, focusing on core electronics, communication systems, and embedded technologies. He has many years of academic experience and actively supports student participation in hardware projects and research. His work spans VLSI, communication networks, and applied electronics."
      portrait={hodImg}
    />
  );
}
