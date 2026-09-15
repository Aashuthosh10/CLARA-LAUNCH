import React from 'react';
import PremiumHODCard from './PremiumHODCard';
import hodImg from '../../../assets/hod_shashikumar.jpg';

export default function PremiumHODCardCSE() {
  return (
    <PremiumHODCard
      name="Dr. G. Dhivyashri"
      title="Professor & HOD, Computer Science & Engineering"
      bio="With around 10 years of experience in teaching, research, and academic leadership. Her expertise spans AI, Machine Learning, Data Science, and IoT, with active involvement in student mentoring, innovation, and faculty development."
      portrait={hodImg}
    />
  );
}
