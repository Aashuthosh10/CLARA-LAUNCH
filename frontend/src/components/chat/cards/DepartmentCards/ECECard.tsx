import React from 'react';
import { Settings, MessageSquare, Award, Globe, Cpu } from 'lucide-react';
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

const ECE_ICONS = [<Settings />, <MessageSquare />, <Award />, <Globe />, <Cpu />];

export default function ECECard({ 
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
      name: "Electronics & Communication Engineering",
      tagline: "Connecting the world through signals",
      hod: "Dr. Venkatesha M"
    },
    Kannada: {
       name: "ಎಲೆಕ್ಟ್ರಾನಿಕ್ಸ್ ಮತ್ತು ಕಮ್ಯುನಿಕೇಶನ್ ಎಂಜಿನಿಯರಿಂಗ್",
       tagline: "ಸಿಗ್ನಲ್‌ಗಳ ಮೂಲಕ ವಿಶ್ವವನ್ನು ಸಂಪರ್ಕಿಸುತ್ತಿದ್ದೇವೆ",
       hod: "ಡಾ. ವೆಂಕಟೇಶ ಎಂ"
    },
    Hindi: {
       name: "इलेक्ट्रॉनिक्स और कम्युनिकेशन इंजीनियरिंग",
       tagline: "सिग्नल के माध्यम से दुनिया को जोड़ना",
       hod: "डॉ. वेंकटेशा एम"
    },
    Tamil: {
       name: "மின்னணுவியல் மற்றும் தகவல் தொடர்பு பொறியியல்",
       tagline: "சமிக்ஞைகள் மூலம் உலகை இணைத்தல்",
       hod: "டாக்டர். வெங்கடேஷா எம்"
    },
    Telugu: {
       name: "ఎలక్ట్రానిక్స్ & కమ్యూనికేషన్ ఇంజనీరింగ్",
       tagline: "సిగ్నల్స్ ద్వారా ప్రపంచాన్ని అనుసంధానిస్తున్నాము",
       hod: "డా. వెంకటేశ ఎం"
    },
    Malayalam: {
       name: "ഇലക്ട്രോണിക്സ് & കമ്മ്യൂണിക്കേഷൻ എഞ്ചിനീയറിംഗ്",
       tagline: "സിഗ്നലുകളിലൂടെ ലോകത്തെ ബന്ധിപ്പിക്കുന്നു",
       hod: "ഡോ. വെങ്കിടേഷ എം"
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
      departmentId={departmentId}
      icon={ECE_ICONS[currentIdx % ECE_ICONS.length]}
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
