import React from 'react';
import PremiumHODCard from './PremiumHODCard';
import placeholderImg from '../../../assets/image_8c37bf.png';

export default function PremiumHODCardPhysics() {
  return (
    <PremiumHODCard
      name="Dr. Shankar P"
      title="Professor & HOD, Physics"
      bio="Dr. Shankar P leads the Physics department, concentrating on engineering physics and fundamental science education. He emphasizes conceptual clarity and experimental skills through well-designed laboratory work. His interests include materials, electronics-related physics, and applied physical sciences."
      portrait={placeholderImg}
    />
  );
}
