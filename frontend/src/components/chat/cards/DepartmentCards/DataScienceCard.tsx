import React from 'react';
import { GraduationCap, MessageSquare, Award, Globe, TrendingUp } from 'lucide-react';
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

const DS_ICONS = [<GraduationCap />, <MessageSquare />, <Award />, <Globe />, <TrendingUp />];

export default function DataScienceCard({ 
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
      name: "CSE (Data Science)",
      tagline: "Turning raw information into actionable intelligence",
      hod: "Dr. Nagashree N"
    },
    Kannada: {
       name: "ಪರಿಗಣಕ ವಿಜ್ಞಾನ ಮತ್ತು ಎಂಜಿನಿಯರಿಂಗ್ (Data Science)",
       tagline: "ದತ್ತಾಂಶದಿಂದ ಜ್ಞಾನದತ್ತ ಪಯಣ",
       hod: "ಡಾ. ನಾಗಶ್ರೀ ಎನ್"
    },
    Hindi: {
       name: "कंप्यूटर विज्ञान और इंजीनियरिंग (Data Science)",
       tagline: "कच्ची जानकारी को कार्रवाई योग्य बुद्धिमत्ता में बदलना",
       hod: "डॉ. नागश्री एन"
    },
    Tamil: {
       name: "கணினி அறிவியல் மற்றும் பொறியியல் (Data Science)",
       tagline: "தகவல்களை அறிவாற்றலாக மாற்றுதல்",
       hod: "டாக்டர். நாகஸ்ரீ என்"
    },
    Telugu: {
       name: "కంప్యూటర్ సైన్స్ & ఇంజనీరింగ్ (Data Science)",
       tagline: "డేటా నుండి తెలివితేటలను వెలికితీస్తున్నాము",
       hod: "డా. నాగశ్రీ ఎన్"
    },
    Malayalam: {
       name: "കമ്പ്യൂട്ടർ സയൻസ് & എഞ്ചിനീയറിംഗ് (Data Science)",
       tagline: "വിവരങ്ങളിൽ നിന്ന് വിവേകം വീണ്ടെടുക്കുന്നു",
       hod: "ഡോ. നാഗശ്രീ എൻ"
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
      icon={DS_ICONS[currentIdx % DS_ICONS.length]}
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
