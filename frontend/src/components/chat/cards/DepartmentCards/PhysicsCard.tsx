import React from 'react';
import { Atom, MessageSquare, Award, Globe, Rocket } from 'lucide-react';
import BaseDepartmentCard from './BaseDepartmentCard';

interface CardProps {
  slides: any[];
  currentIdx: number;
  onNext: () => void;
  onPrev: () => void;
  onSelectSlide: (idx: number) => void;
  language: string;
}

const PHYSICS_IMAGES = [
  "https://images.unsplash.com/photo-1636466484292-713cf130838b",
  "https://images.unsplash.com/photo-1451187580459-43490279c0fa",
  "https://images.unsplash.com/photo-1532094349884-543bc11b234d",
  "https://images.unsplash.com/photo-1544006659-f0b21884cb1d",
  "https://images.unsplash.com/photo-1507413245164-6160d8298b31"
];

const PHYSICS_ICONS = [<Atom />, <MessageSquare />, <Award />, <Globe />, <Rocket />];

export default function PhysicsCard({ 
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
      name: "Department of Physics",
      tagline: "Exploring the fundamental laws of nature",
      hod: "Dr. Shankar P"
    },
    Kannada: {
       name: "ಭೌತಶಾಸ್ತ್ರ ವಿಭಾಗ",
       tagline: "ಪ್ರಕೃತಿಯ ಮೂಲಭೂತ ನಿಯಮಗಳ ಅನ್ವೇಷಣೆ",
       hod: "ಡಾ. ಶಂಕರ್ ಪಿ"
    },
    Hindi: {
       name: "भौतिकी विभाग",
       tagline: "प्रकृति के मूलभूत नियमों की खोज",
       hod: "डॉ. शंकर पी"
    },
    Tamil: {
       name: "இயற்பியல் துறை",
       tagline: "இயற்கையின் அடிப்படை விதிகளை ஆராய்தல்",
       hod: "டாக்டர். சங்கர் பி"
    },
    Telugu: {
       name: "భౌతిక శాస్త్ర విభాగం",
       tagline: "ప్రకృతి యొక్క ప్రాథమిక నియమాలను అన్వేషిస్తున్నాము",
       hod: "డా. శంకర్ పి"
    },
    Malayalam: {
       name: "ഫിസിക്സ് ഡിപ്പാർട്ട്മെന്റ്",
       tagline: "പ്രകൃതിയുടെ അടിസ്ഥാന നിയമങ്ങൾ പര്യവേക്ഷണം ചെയ്യുന്നു",
       hod: "ഡോ. ശങ്കർ പി"
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
      image={PHYSICS_IMAGES[currentIdx % PHYSICS_IMAGES.length]}
      icon={PHYSICS_ICONS[currentIdx % PHYSICS_ICONS.length]}
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
