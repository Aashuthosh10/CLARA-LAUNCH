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
}

const MECH_IMAGES = [
  "https://images.unsplash.com/photo-1537462715879-360eeb61a0ad",
  "https://images.unsplash.com/photo-1556157382-97dee2dcb748",
  "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158",
  "https://images.unsplash.com/photo-1581092160562-40aa08e78837",
  "https://images.unsplash.com/photo-1537462715879-360eeb61a0ad"
];

const MECH_ICONS = [<Settings />, <MessageSquare />, <Rocket />, <BookOpen />, <TrendingUp />];

export default function MechanicalCard({ 
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
      name: "Mechanical Engineering",
      tagline: "Precision engineering for a physical world",
      hod: "Dr. Raghavendra S"
    },
    Kannada: {
       name: "ಮೆಕ್ಯಾನಿಕಲ್ ಎಂಜಿನಿಯರಿಂಗ್",
       tagline: "ಭೌತಿಕ ಜಗತ್ತಿಗಾಗಿ ನಿಖರ ಎಂಜಿನಿಯರಿಂಗ್",
       hod: "ಡಾ. ರಾಘವೇಂದ್ರ ಎಸ್"
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
      image={MECH_IMAGES[currentIdx % MECH_IMAGES.length]}
      icon={MECH_ICONS[currentIdx % MECH_ICONS.length]}
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
