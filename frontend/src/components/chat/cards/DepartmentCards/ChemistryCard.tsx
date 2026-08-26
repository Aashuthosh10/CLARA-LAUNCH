import React from 'react';
import { FlaskConical, MessageSquare, Award, Globe, Rocket } from 'lucide-react';
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

const CHEMISTRY_ICONS = [<FlaskConical />, <MessageSquare />, <Award />, <Globe />, <Rocket />];

export default function ChemistryCard({ 
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
      name: "Department of Chemistry",
      tagline: "Unlocking the secrets of matter",
      hod: "Dr. Bhagya N P"
    },
    Hindi: {
       name: "रसायन विज्ञान विभाग",
       tagline: "पदार्थ के रहस्यों को उजागर करना",
       hod: "डॉ. भाग्या एन पी"
    },
    Tamil: {
       name: "வேதியியல் துறை",
       tagline: "பொருளின் ரகசியங்களைத் திறத்தல்",
       hod: "டாக்டர். பாக்யா என் பி"
    },
    Telugu: {
       name: "రసాయన శాస్త్ర విభాగం",
       tagline: "ద్రవ్యం యొక్క రహస్యాలను వెలికితీస్తున్నాము",
       hod: "డా. భాగ్య ఎన్ పి"
    },
    Malayalam: {
       name: "കെമിസ്ട്രി ഡിപ്പാർട്ട്മെന്റ്",
       tagline: "ദ്രവ്യത്തിന്റെ രഹസ്യങ്ങൾ അന്വേഷിക്കുന്നു",
       hod: "ഡോ. ഭാഗ്യ എൻ പി"
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
      icon={CHEMISTRY_ICONS[visualSlotIndex % CHEMISTRY_ICONS.length]}
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

