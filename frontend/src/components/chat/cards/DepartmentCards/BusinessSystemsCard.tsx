import React from 'react';
import { Briefcase, MessageSquare, Award, Globe, TrendingUp } from 'lucide-react';
import BaseDepartmentCard from './BaseDepartmentCard';

interface CardProps {
  slides: any[];
  currentIdx: number;
  onNext: () => void;
  onPrev: () => void;
  onSelectSlide: (idx: number) => void;
  language: string;
  departmentId: string;
}

const BS_ICONS = [<Briefcase />, <MessageSquare />, <Award />, <Globe />, <TrendingUp />];

export default function BusinessSystemsCard({
  slides,
  currentIdx,
  onNext,
  onPrev,
  onSelectSlide,
  language,
  departmentId,
}: CardProps) {
  const currentSlide = slides[currentIdx] || {};
  const visualSlotIndex =
    typeof currentSlide?.slotIndex === 'number' ? currentSlide.slotIndex : currentIdx;

  const DEPT_INFO = {
    English: {
      name: 'CSE (Business Systems)',
      tagline: 'Bridging technology and enterprise strategy',
    },
    Hindi: {
      name: 'सीएसई (बिजनेस सिस्टम्स)',
      tagline: 'प्रौद्योगिकी और उद्यम रणनीति के बीच सेतु',
    },
    Tamil: {
      name: 'CSE (வணிக அமைப்புகள்)',
      tagline: 'தொழில்நுட்பத்திற்கும் நிறுவன உத்திக்கும் பாலம்',
    },
    Telugu: {
      name: 'CSE (బిజినెస్ సిస్టమ్స్)',
      tagline: 'టెక్నాలజీ మరియు ఎంటర్‌ప్రైజ్ వ్యూహాన్ని కలుపుతాం',
    },
    Malayalam: {
      name: 'CSE (ബിസിനസ് സിസ്റ്റംസ്)',
      tagline: 'സാങ്കേതികവിദ്യയും എന്റർപ്രൈസ് തന്ത്രവും തമ്മിലുള്ള പാലം',
    },
  };

  const info = DEPT_INFO[language as keyof typeof DEPT_INFO] || DEPT_INFO.English;

  return (
    <BaseDepartmentCard
      department={info.name}
      deptTagline={info.tagline}
      title={currentSlide.title || 'Loading...'}
      tagline={currentSlide.tagline || ''}
      description={currentSlide.content || ''}
      icon={BS_ICONS[visualSlotIndex % BS_ICONS.length]}
      isHOD={visualSlotIndex === 1}
      departmentId={departmentId}
      currentSlide={currentIdx}
      visualSlotIndex={visualSlotIndex}
      totalSlides={slides.length}
      onNext={onNext}
      onPrev={onPrev}
      onSelectSlide={onSelectSlide}
    />
  );
}

