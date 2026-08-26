import React from 'react';
import { Shield, MessageSquare, Award, Lock, Globe } from 'lucide-react';
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

const CYSEC_ICONS = [<Shield />, <MessageSquare />, <Award />, <Lock />, <Globe />];

export default function CyberSecurityCard({ 
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
      name: "CSE (Cyber Security)",
      tagline: "Defending the digital frontier",
      hod: "Dr. Shashikumar D R"
    },
    Hindi: {
       name: "कंप्यूटर विज्ञान और इंजीनियरिंग (Cyber Security)",
       tagline: "डिजिटल सीमाओं की रक्षा",
       hod: "डॉ. शशिकुमार डी आर"
    },
    Tamil: {
       name: "கணினி அறிவியல் மற்றும் பொறியியல் (Cyber Security)",
       tagline: "டிஜிட்டல் எல்லைகளை பாதுகாத்தல்",
       hod: "டாக்டர். சசிகுமார் டி ஆர்"
    },
    Telugu: {
       name: "కంప్యూటర్ సైన్స్ & ఇంజనీరింగ్ (Cyber Security)",
       tagline: "డిజిటల్ సరిహద్దులను రక్షిస్తున్నాము",
       hod: "డా. శశికుమార్ డి ఆర్"
    },
    Malayalam: {
       name: "കമ്പ്യൂട്ടർ സയൻസ് & എഞ്ചിനീയറിംഗ് (Cyber Security)",
       tagline: "ഡിജിറ്റൽ അതിർത്തികൾ കാക്കുന്നു",
       hod: "ഡോ. ശശികുമാർ ഡി ആർ"
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
      icon={CYSEC_ICONS[visualSlotIndex % CYSEC_ICONS.length]}
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
