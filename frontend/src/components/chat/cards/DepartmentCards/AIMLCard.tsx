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
}

const AIML_IMAGES = [
  "https://images.unsplash.com/photo-1677442136019-21780ecad995",
  "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e",
  "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4",
  "https://images.unsplash.com/photo-1522071820081-009f0129c71c",
  "https://images.unsplash.com/photo-1523050335456-c38a89b7d28b"
];

const AIML_ICONS = [<Cpu />, <MessageSquare />, <Award />, <Rocket />, <Globe />];

export default function AIMLCard({ 
  slides, 
  currentIdx, 
  onNext, 
  onPrev, 
  onSelectSlide,
  language 
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
      image={AIML_IMAGES[currentIdx % AIML_IMAGES.length]}
      icon={AIML_ICONS[currentIdx % AIML_ICONS.length]}
      isHOD={currentIdx === 1}
      hodName={info.hod}
      currentSlide={currentIdx}
      totalSlides={slides.length}
      onNext={onNext}
      onPrev={onPrev}
      onSelectSlide={onSelectSlide}
    />
  );
}
