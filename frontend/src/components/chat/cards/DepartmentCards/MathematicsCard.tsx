import React from 'react';
import { Calculator, MessageSquare, Award, Globe, Rocket } from 'lucide-react';
import BaseDepartmentCard from './BaseDepartmentCard';

interface CardProps {
  slides: any[];
  currentIdx: number;
  onNext: () => void;
  onPrev: () => void;
  onSelectSlide: (idx: number) => void;
  language: string;
}

const MATH_IMAGES = [
  "https://images.unsplash.com/photo-1509228468518-180dd4864904",
  "https://images.unsplash.com/photo-1596495573105-d14658c10993",
  "https://images.unsplash.com/photo-1518152006812-edab29b069ac",
  "https://images.unsplash.com/photo-1635070041078-e363dbe005cb",
  "https://images.unsplash.com/photo-1509228627152-72ae9ae68466"
];

const MATH_ICONS = [<Calculator />, <MessageSquare />, <Award />, <Globe />, <Rocket />];

export default function MathematicsCard({ 
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
      name: "Department of Mathematics",
      tagline: "The language of logic and precision",
      hod: "Dr. Arun Kumar R"
    },
    Kannada: {
       name: "ಗಣಿತ ಶಾಸ್ತ್ರ ವಿಭಾಗ",
       tagline: "ತರ್ಕ ಮತ್ತು ನಿಖರತೆಯ ಭಾಷೆ",
       hod: "ಡಾ. ಅರುಣ್ ಕುಮಾರ್ ಆರ್"
    },
    Hindi: {
       name: "गणित विभाग",
       tagline: "तर्क और सटीकता की भाषा",
       hod: "डॉ. अरुण कुमार आर"
    },
    Tamil: {
       name: "கணிதத் துறை",
       tagline: "தர்க்கம் மற்றும் துல்லியத்தின் மொழி",
       hod: "டாக்டர். அருண் குமார் ஆர்"
    },
    Telugu: {
       name: "గణిత శాస్త్ర విభాగం",
       tagline: "తర్కం మరియు ఖచ్చితత్వ భాష",
       hod: "డా. అరుణ్ కుమార్ ఆర్"
    },
    Malayalam: {
       name: "മാത്തമാറ്റിക്സ് ഡിപ്പാർട്ട്മെന്റ്",
       tagline: "യുക്തിയുടെയും കൃത്യതയുടെയും ഭാഷ",
       hod: "ഡോ. അരുൺ കുമാർ ആർ"
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
      image={MATH_IMAGES[currentIdx % MATH_IMAGES.length]}
      icon={MATH_ICONS[currentIdx % MATH_ICONS.length]}
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
