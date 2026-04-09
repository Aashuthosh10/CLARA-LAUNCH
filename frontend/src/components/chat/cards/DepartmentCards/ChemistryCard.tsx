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
}

const CHEMISTRY_IMAGES = [
  "https://images.unsplash.com/photo-1532187863486-abf2ad240c74",
  "https://images.unsplash.com/photo-1518152006812-edab29b069ac",
  "https://images.unsplash.com/photo-1544006659-f0b21884cb1d",
  "https://images.unsplash.com/photo-1581093450021-4a7360e9a6b5",
  "https://images.unsplash.com/photo-1628191010210-a59de471f02c"
];

const CHEMISTRY_ICONS = [<FlaskConical />, <MessageSquare />, <Award />, <Globe />, <Rocket />];

export default function ChemistryCard({ 
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
      name: "Department of Chemistry",
      tagline: "Unlocking the secrets of matter",
      hod: "Dr. Bhagya N P"
    },
    Kannada: {
       name: "ರಸಾಯನಶಾಸ್ತ್ರ ವಿಭಾಗ",
       tagline: "ದ್ರವ್ಯದ ರಹಸ್ಯಗಳನ್ನು ಬಿಡಿಸುತ್ತಿದ್ದೇವೆ",
       hod: "ಡಾ. ಭಾಗ್ಯ ಎನ್ ಪಿ"
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
      image={CHEMISTRY_IMAGES[currentIdx % CHEMISTRY_IMAGES.length]}
      icon={CHEMISTRY_ICONS[currentIdx % CHEMISTRY_ICONS.length]}
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
