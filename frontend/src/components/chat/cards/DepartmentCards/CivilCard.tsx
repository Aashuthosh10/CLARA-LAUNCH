import React from 'react';
import { Building2, MessageSquare, Settings, Users, TrendingUp } from 'lucide-react';
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

const CIVIL_ICONS = [<Building2 />, <MessageSquare />, <Settings />, <Users />, <TrendingUp />];

export default function CivilCard({ 
  slides, 
  currentIdx, 
  onNext, 
  onPrev, 
  onSelectSlide,
  language,
  departmentId,
}: CardProps) {
  const currentSlide = slides[currentIdx] || {};

  const DEPT_INFO = {
    English: {
      name: "Civil Engineering",
      tagline: "Building the foundations of the future",
      hod: "Dr. Ananthayya M B"
    },
    Kannada: {
       name: "ಸಿವಿಲ್ ಎಂಜಿನಿಯರಿಂಗ್",
       tagline: "ಭವಿಷ್ಯದ ಅಡಿಪಾಯವನ್ನು ನಿರ್ಮಿಸುತ್ತಿದ್ದೇವೆ",
       hod: "ಡಾ. ಅನಂತಯ್ಯ ಎಂ ಬಿ"
    },
    Hindi: {
       name: "सिविल इंजीनियरिंग",
       tagline: "भविष्य की नींव बनाना",
       hod: "डॉ. अनंतैया एम बी"
    },
    Tamil: {
       name: "சிவில் பொறியியல்",
       tagline: "எதிர்காலத்திற்கான அடித்தளத்தை உருவாக்குதல்",
       hod: "டாக்டர். அனந்தையா எம் பி"
    },
    Telugu: {
       name: "సివిల్ ఇంజనీరింగ్",
       tagline: "భవిష్యత్తు పునాదులను నిర్మిస్తున్నాము",
       hod: "డా. అనంతయ్య ఎం బి"
    },
    Malayalam: {
       name: "സിവിൽ എഞ്ചിനീയറിംഗ്",
       tagline: "ഭാവിയിലേക്കുള്ള അടിത്തറ പാകുന്നു",
       hod: "ഡോ. അനന്തയ്യ എം ബി"
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
      icon={CIVIL_ICONS[currentIdx % CIVIL_ICONS.length]}
      isHOD={currentIdx === 1}
      hodName={info.hod}
      departmentId={departmentId}
      currentSlide={currentIdx}
      totalSlides={slides.length}
      onNext={onNext}
      onPrev={onPrev}
      onSelectSlide={onSelectSlide}
    />
  );
}
