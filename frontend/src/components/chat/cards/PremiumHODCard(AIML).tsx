import React from 'react';
import PremiumHODCard from './PremiumHODCard';
import hodImg from '../../../assets/hod_manjunatha.jpg';

export default function PremiumHODCardAIML() {
  return (
    <PremiumHODCard
      name="Dr. T G Manjunatha"
      title="Professor & HOD, CSE (Artificial Intelligence & Machine Learning)"
      bio="Dr. T G Manjunatha heads the AIML department, emphasizing solid foundations in AI, machine learning, and data-driven problem solving. He has significant academic and research experience, guiding projects that apply AI techniques to real-world applications. Under his leadership, the department conducts workshops, coding events, and hands-on sessions to build strong practical skills."
      portrait={hodImg}
    />
  );
}
