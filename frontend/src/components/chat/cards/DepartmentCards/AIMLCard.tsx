import React from 'react';
import { Cpu, MessageSquare, Award, Rocket, Globe } from 'lucide-react';
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

const AIML_ICONS = [<Cpu />, <MessageSquare />, <Award />, <Rocket />, <Globe />];

export default function AIMLCard({ 
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
      name: "CSE (AI & ML)",
      tagline: "Building the intelligence of tomorrow",
      hod: "Dr. T G Manjunatha"
    },
    Kannada: {
       name: "ಪರಿಗಣಕ ವಿಜ್ಞಾನ ಮತ್ತು ಎಂಜಿನಿಯರಿಂಗ್ (AI & ML)",
       tagline: "ನಾಳೆಯ ಬುದ್ಧಿವಂತಿಕೆಯನ್ನು ರೂಪಿಸುತ್ತಿದ್ದೇವೆ",
       hod: "ಡಾ. ಟಿ ಜಿ ಮಂಜುನಾಥ"
    },
    Hindi: {
       name: "कंप्यूटर विज्ञान और इंजीनियरिंग (AI & ML)",
       tagline: "कल की बुद्धिमत्ता का निर्माण",
       hod: "डॉ. टी जी मंजुनाथ"
    },
    Tamil: {
       name: "கணினி அறிவியல் மற்றும் பொறியியல் (AI & ML)",
       tagline: "நாளைக்கான அறிவாற்றலை உருவாக்குதல்",
       hod: "டாக்டர். டி ஜி மஞ்சுநாதா"
    },
    Telugu: {
       name: "కంప్యూటర్ సైన్స్ & ఇంజనీరింగ్ (AI & ML)",
       tagline: "రేపటి మేధస్సును నిర్మిస్తున్నాము",
       hod: "డా. టి జి మంజునాథ"
    },
    Malayalam: {
       name: "കമ്പ്യൂട്ടർ സയൻസ് & എഞ്ചിനീയറിംഗ് (AI & ML)",
       tagline: "നാളെയുടെ ബുദ്ധിശക്തി രൂപപ്പെടുത്തുന്നു",
       hod: "ഡോ. ടി ജി മഞ്ജുനാഥ"
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
      icon={AIML_ICONS[currentIdx % AIML_ICONS.length]}
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
