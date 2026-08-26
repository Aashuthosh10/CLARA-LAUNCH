import React from 'react';
import { Settings, MessageSquare, Rocket, BookOpen, TrendingUp } from 'lucide-react';
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

const MECH_ICONS = [<Settings />, <MessageSquare />, <Rocket />, <BookOpen />, <TrendingUp />];

export default function MechanicalCard({ 
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
      name: "Mechanical Engineering",
      tagline: "Precision engineering for a physical world",
      hod: "Dr. Raghavendra S"
    },
    Hindi: {
       name: "मैकेनिकल इंजीनियरिंग",
       tagline: "भौतिक दुनिया के लिए सटीक इंजीनियरिंग",
       hod: "डॉ. राघवेंद्र एस"
    },
    Tamil: {
       name: "இயந்திரப் பொறியியல்",
       tagline: "இயற்பியல் உலகிற்கான துல்லியமான பொறியியல்",
       hod: "டாக்டர். ராகவேந்திரா எஸ்"
    },
    Telugu: {
       name: "మెకానికల్ ఇంజనీరింగ్",
       tagline: "భౌతిక ప్రపంచం కోసం ఖచ్చితమైన ఇంజనీరింగ్",
       hod: "డా. రాఘవేంద్ర ఎస్"
    },
    Malayalam: {
       name: "മെക്കാനിക്കൽ എഞ്ചിനീയറിംഗ്",
       tagline: "ഭൗതിക ലോകത്തിനായി കൃത്യതയാർന്ന എഞ്ചിനീയറിംഗ്",
       hod: "ഡോ. രാഘവേന്ദ്ര എസ്"
    }
  };

  const info = DEPT_INFO[language as keyof typeof DEPT_INFO] || DEPT_INFO.English;

  return (
    <BaseDepartmentCard
      department={info.name}
      deptTagline={info.tagline}
      title={currentSlide.title || "Loading..."}
      tagline={currentSlide.tagline || ""}
      description={currentSlide.content || ""}
      icon={MECH_ICONS[visualSlotIndex % MECH_ICONS.length]}
      isHOD={visualSlotIndex === 1}
      hodName={info.hod}
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

