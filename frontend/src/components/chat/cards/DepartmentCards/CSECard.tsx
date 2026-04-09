import React from 'react';
import { Users, MessageSquare, TrendingUp, Award, Rocket } from 'lucide-react';
import BaseDepartmentCard from './BaseDepartmentCard';

interface CardProps {
  slides: any[];
  currentIdx: number;
  onNext: () => void;
  onPrev: () => void;
  onSelectSlide: (idx: number) => void;
  language: string;
}

const CSE_IMAGES = [
  "https://images.unsplash.com/photo-1550751827-4bd374c3f58b",
  "https://images.unsplash.com/photo-1560250097-0b93528c311a",
  "https://images.unsplash.com/photo-1521737711867-e3b97375f902",
  "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4",
  "https://images.unsplash.com/photo-1522071820081-009f0129c71c"
];

const CSE_ICONS = [<Users />, <MessageSquare />, <TrendingUp />, <Award />, <Rocket />];

export default function CSECard({ 
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
      name: "Computer Science & Engineering",
      tagline: "The backbone of the digital revolution",
      hod: "Dr. Shashikumar D R"
    },
    Kannada: {
       name: "ಪರಿಗಣಕ ವಿಜ್ಞಾನ ಮತ್ತು ಎಂಜಿನಿಯರಿಂಗ್",
       tagline: "ಡಿಜಿಟಲ್ ಕ್ರಾಂತಿಯ ಬೆನ್ನೆಲುಬು",
       hod: "ಡಾ. ಶಶಿಕುಮಾರ್ ಡಿ ಆರ್"
    },
    Hindi: {
       name: "कंप्यूटर विज्ञान और इंजीनियरिंग",
       tagline: "डिजिटल क्रांति की रीढ़",
       hod: "डॉ. शशिकुमार डी आर"
    },
    Tamil: {
       name: "கணினி அறிவியல் மற்றும் பொறியியல்",
       tagline: "டிஜிட்டல் புரட்சியின் முதுகெலும்பு",
       hod: "டாக்டர். சசிகுமார் டி ஆர்"
    },
    Telugu: {
       name: "కంప్యూటర్ సైన్స్ & ఇంజనీరింగ్",
       tagline: "డిజిటల్ విప్లవానికి వెన్నెముక",
       hod: "డా. శశికుమార్ డి ఆర్"
    },
    Malayalam: {
       name: "കമ്പ്യൂട്ടർ സയൻസ് & എഞ്ചിനീയറിംഗ്",
       tagline: "ഡിജിറ്റൽ വിപ്ലവത്തിന്റെ നട്ടെല്ല്",
       hod: "ഡോ. ശശികുമാർ ഡി ആർ"
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
      image={CSE_IMAGES[currentIdx % CSE_IMAGES.length]}
      icon={CSE_ICONS[currentIdx % CSE_ICONS.length]}
      isHOD={currentIdx === 1} // Mapping HOD Message to index 1 as per design repo
      hodName={info.hod}
      currentSlide={currentIdx}
      totalSlides={slides.length}
      onNext={onNext}
      onPrev={onPrev}
      onSelectSlide={onSelectSlide}
    />
  );
}
