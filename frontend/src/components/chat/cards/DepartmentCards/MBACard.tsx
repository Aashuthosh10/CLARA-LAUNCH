import React from 'react';
import { Briefcase, MessageSquare, Lightbulb, Users, TrendingUp } from 'lucide-react';
import BaseDepartmentCard from './BaseDepartmentCard';

interface CardProps {
  slides: any[];
  currentIdx: number;
  onNext: () => void;
  onPrev: () => void;
  onSelectSlide: (idx: number) => void;
  language: string;
}

const MBA_IMAGES = [
  "https://images.unsplash.com/photo-1507679799987-c73779587ccf",
  "https://images.unsplash.com/photo-1556157382-97dee2dcb748",
  "https://images.unsplash.com/photo-1556761175-b413da4baf72",
  "https://images.unsplash.com/photo-1522202176988-66273c2fd55f",
  "https://images.unsplash.com/photo-1521791136064-7986c2959213"
];

const MBA_ICONS = [<Briefcase />, <MessageSquare />, <Lightbulb />, <Users />, <TrendingUp />];

export default function MBACard({ 
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
      name: "Master of Business Administration",
      tagline: "Developing leaders for a global economy",
      hod: "Dr. Jogish D"
    },
    Kannada: {
       name: "ಮಾಸ್ಟರ್ ಆಫ್ ಬಿಸಿನೆಸ್ ಅಡ್ಮಿನಿಸ್ಟ್ರೇಷನ್",
       tagline: "ಜಾಗತಿಕ ಆರ್ಥಿಕತೆಗಾಗಿ ನಾಯಕರನ್ನು ರೂಪಿಸುತ್ತಿದ್ದೇವೆ",
       hod: "ಡಾ. ಜೋಗಿಶ್ ಡಿ"
    },
    Hindi: {
       name: "मास्टर ऑफ बिजनेस एडमिनिस्ट्रेशन",
       tagline: "वैश्विक अर्थव्यवस्था के लिए नेताओं का विकास",
       hod: "डॉ. जोगिश डी"
    },
    Tamil: {
       name: "வணிக மேலாண்மை முதுகலை",
       tagline: "உலகளாவிய பொருளாதாரத்திற்கான தலைவர்களை உருவாக்குதல்",
       hod: "டாக்டர். ஜோகிஷ் டி"
    },
    Telugu: {
       name: "మాస్టర్ ఆఫ్ బిజినెస్ అడ్మినిస్ట్రేషన్",
       tagline: "ప్రపంచ ఆర్థిక వ్యవస్థ కోసం నాయకులను అభివృద్ధి చేస్తున్నాము",
       hod: "డా. జోగిష్ డి"
    },
    Malayalam: {
       name: "മാസ്റ്റർ ഓഫ് ബിസിനസ് അഡ്മിനിസ്ട്രേഷൻ",
       tagline: "ആഗോള സമ്പദ്‌വ്യവസ്ഥയ്ക്കായി നേതാക്കളെ വികസിപ്പിക്കുന്നു",
       hod: "ഡോ. ജോഗീഷ് ഡി"
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
      image={MBA_IMAGES[currentIdx % MBA_IMAGES.length]}
      icon={MBA_ICONS[currentIdx % MBA_ICONS.length]}
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
