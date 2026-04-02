import React from 'react';
import PremiumHODCard from './PremiumHODCard';
import hodImg from '../../../assets/hod_shashikumar.jpg';

export default function PremiumHODCardCSE() {
  return (
    <PremiumHODCard
      name="Dr. Shashikumar D R"
      title="Professor & HOD, Computer Science & Engineering"
      bio="With extensive teaching and research experience in core computer science, Dr. Shashikumar D R leads the CSE department with a strong focus on fundamentals and industry-oriented learning. He has guided multiple student projects, promotes coding culture and hackathons, and actively works on curriculum enhancement aligned with emerging technologies. His areas of interest span algorithms, software engineering, and modern computing practices."
      portrait={hodImg}
    />
  );
}
