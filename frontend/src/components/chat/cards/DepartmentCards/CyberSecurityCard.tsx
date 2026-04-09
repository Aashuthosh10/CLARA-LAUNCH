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
}

const CYSEC_IMAGES = [
  "https://images.unsplash.com/photo-1550751827-4bd374c3f58b",
  "https://images.unsplash.com/photo-1563986768609-322da13575f3",
  "https://images.unsplash.com/photo-1555949963-ff9fe0c870eb",
  "https://images.unsplash.com/photo-1558494949-ef8b565b1d43",
  "https://images.unsplash.com/photo-1451187580459-43490279c0fa"
];

const CYSEC_ICONS = [<Shield />, <MessageSquare />, <Award />, <Lock />, <Globe />];

export default function CyberSecurityCard({ 
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
      name: "CSE (Cyber Security)",
      tagline: "Defending the digital frontier",
      hod: "Dr. Shashikumar D R"
    },
    Kannada: {
       name: "ಪರಿಗಣಕ ವಿಜ್ಞಾನ ಮತ್ತು ಎಂಜಿನಿಯರಿಂಗ್ (Cyber Security)",
       tagline: "ಡಿಜಿಟಲ್ ಗಡಿಗಳ ರಕ್ಷಣೆ",
       hod: "ಡಾ. ಶಶಿಕುಮಾರ್ ಡಿ ಆರ್"
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
       hod: "ഡോ. ಶಶಿಕುಮಾರ್ ಡಿ ಆರ್"
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
      image={CYSEC_IMAGES[currentIdx % CYSEC_IMAGES.length]}
      icon={CYSEC_ICONS[currentIdx % CYSEC_ICONS.length]}
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
