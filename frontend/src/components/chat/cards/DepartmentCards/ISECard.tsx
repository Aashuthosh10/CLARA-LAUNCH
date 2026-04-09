import React from 'react';
import { BookOpen, MessageSquare, Lightbulb, Users, TrendingUp } from 'lucide-react';
import BaseDepartmentCard from './BaseDepartmentCard';

interface CardProps {
  slides: any[];
  currentIdx: number;
  onNext: () => void;
  onPrev: () => void;
  onSelectSlide: (idx: number) => void;
  language: string;
}

const ISE_IMAGES = [
  "https://images.unsplash.com/photo-1516321318423-f06f85e504b3",
  "https://images.unsplash.com/photo-1580489944761-15a19d654956",
  "https://images.unsplash.com/photo-1498050108023-c5249f4df085",
  "https://images.unsplash.com/photo-1515187029135-18ee286d815b",
  "https://images.unsplash.com/photo-1460925895917-afdab827c52f"
];

const ISE_ICONS = [<BookOpen />, <MessageSquare />, <Lightbulb />, <Users />, <TrendingUp />];

export default function ISECard({ 
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
      name: "Information Science & Engineering",
      tagline: "Managing information, empowering minds",
      hod: "Dr. Vrinda Shetty"
    },
    Kannada: {
       name: "ಮಾಹಿತಿ ವಿಜ್ಞಾನ ಮತ್ತು ಎಂಜಿನಿಯರಿಂಗ್",
       tagline: "ಮಾಹಿತಿ ನಿರ್ವಹಣೆ, ಮನಸ್ಸುಗಳ ಸಬಲೀಕರಣ",
       hod: "ಡಾ. ವೃಂದಾ ಶೆಟ್ಟಿ"
    },
    Hindi: {
       name: "सूचना विज्ञान और इंजीनियरिंग",
       tagline: "सूचना प्रबंधन, दिमागों का सशक्तिकरण",
       hod: "डॉ. वृंदा शेट्टी"
    },
    Tamil: {
       name: "தகவல் அறிவியல் மற்றும் பொறியியல்",
       tagline: "தகவல் மேலாண்மை, மனதை மேம்படுத்துதல்",
       hod: "டாக்டர். பிருந்தா ஷெட்டி"
    },
    Telugu: {
       name: "ఇన్ఫర్మేషన్ సైన్స్ & ఇంజనీరింగ్",
       tagline: "సమాచార నిర్వహణ, మనస్సుల సాధికారత",
       hod: "డా. వృందా శెట్టి"
    },
    Malayalam: {
       name: "ഇൻഫർമേഷൻ സയൻസ് & എഞ്ചിനീയറിംഗ്",
       tagline: "വിവര മാനേജ്‌മെന്റ്, മനസ്സുകളുടെ ശാക്തീകരണം",
       hod: "ഡോ. വൃന്ദ ഷെട്ടി"
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
      image={ISE_IMAGES[currentIdx % ISE_IMAGES.length]}
      icon={ISE_ICONS[currentIdx % ISE_ICONS.length]}
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
