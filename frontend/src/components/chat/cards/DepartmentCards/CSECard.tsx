import React from 'react';
import { Users, MessageSquare, TrendingUp, Award, Rocket } from 'lucide-react';
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

const CSE_ICONS = [<Users />, <MessageSquare />, <TrendingUp />, <Award />, <Rocket />];

export default function CSECard({ 
  slides, 
  currentIdx, 
  onNext, 
  onPrev, 
  onSelectSlide,
  language,
  departmentId,
}: CardProps) {
  const currentSlide = slides[currentIdx] || {};
  const visualSlotIndex = typeof currentSlide?.slotIndex === 'number' ? currentSlide.slotIndex : currentIdx;

  const DEPT_INFO = {
    English: {
      name: "Computer Science & Engineering",
      tagline: "The backbone of the digital revolution",
      hod: "Dr. Shashikumar D R"
    },
    Hindi: {
       name: "कंप्यूटर विज्ञान और इंजीनियरिंग",
       tagline: "डिजिटल क्रांति की रीढ़",
       hod: "डॉ. शशिकुमार डी आर"
    },
    Tamil: {
       name: "கணினி அறிவியல் மற்றும் பொறியியல்",
       tagline: "டிஜிட்டல் புரட்சியின் முதுகெலும்பு",
       hod: "டாக்டர். சசிகுமார் டி ஆர்"
    },
    Telugu: {
       name: "కంప్యూటర్ సైన్స్ & ఇంజనీరింగ్",
       tagline: "డిజిటల్ విప్లవానికి వెన్నెముక",
       hod: "డా. శశికుమార్ డి ఆర్"
    },
    Malayalam: {
       name: "കമ്പ്യൂട്ടർ സയൻസ് & എഞ്ചിനീയറിംഗ്",
       tagline: "ഡിജിറ്റൽ വിപ്ലവത്തിന്റെ നട്ടെല്ല്",
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
      icon={CSE_ICONS[visualSlotIndex % CSE_ICONS.length]}
      isHOD={visualSlotIndex === 1} // HOD message belongs to the HOD/vision visual slot.
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

