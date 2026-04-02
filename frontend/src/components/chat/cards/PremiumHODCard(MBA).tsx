import React from 'react';
import PremiumHODCard from './PremiumHODCard';
import placeholderImg from '../../../assets/image_8c37bf.png';

export default function PremiumHODCardMBA() {
  return (
    <PremiumHODCard
      name="Dr. Jogish D"
      title="Professor & HOD, Master of Business Administration (MBA)"
      bio="Dr. Jogish D leads the MBA department, integrating management education with practical exposure to industry practices. He has experience in teaching, training, and consultancy, guiding students towards careers in business, analytics, and entrepreneurship. His interests span marketing, strategy, and organizational development."
      portrait={placeholderImg}
    />
  );
}
