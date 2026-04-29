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
  departmentId: string;
}

const MBA_ICONS = [<Briefcase />, <MessageSquare />, <Lightbulb />, <Users />, <TrendingUp />];

export default function MBACard({ 
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
      icon={MBA_ICONS[currentIdx % MBA_ICONS.length]}
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
