import React from 'react';
import { motion } from 'motion/react';
import { useLanguage, type Language } from '../../../context/LanguageContext';
import hodPortrait from '../../../assets/image_8c37bf.png';

const LOCALES: Record<Language, { label: string; name: string; title: string; bio: string; }> = {
  English: {
    label: "Faculty Spotlight",
    name: "Dr. Nagashree N.",
    title: "Associate Professor & HOD (CSE - Data Science)",
    bio: "With 20 years of experience, Dr. Nagashree N. holds a Ph.D. from Visvesvaraya Technological University. Specialized in Data Science, Machine Learning, Deep Learning, and she has over 35 publications in International Journals/Conferences."
  },
  Kannada: {
    label: "ಅಧ್ಯಾಪಕರ ಪರಿಚಯ",
    name: "Dr. ನಾಗಶ್ರೀ N.",
    title: "ಸಹ ಪ್ರಾಧ್ಯಾಪಕರು & HOD (CSE - ಡೇಟಾ ಸೈನ್ಸ್)",
    bio: "20 ವರ್ಷಗಳ ಅನುಭವದೊಂದಿಗೆ, Dr. ನಾಗಶ್ರೀ ಅವರು VTU ನಿಂದ Ph.D. ಪಡೆದಿದ್ದಾರೆ. ಡೇಟಾ ಸೈನ್ಸ್, ಮಷಿನ್ ಲರ್ನಿಂಗ್, ಡೀಪ್ ಲರ್ನಿಂಗ್‌ನಲ್ಲಿ ಪರಿಣತಿ ಹೊಂದಿದ್ದು, 35ಕ್ಕೂ ಹೆಚ್ಚು ಅಂತಾರಾಷ್ಟ್ರೀಯ ಪ್ರಕಟಣೆಗಳನ್ನು ಹೊಂದಿದ್ದಾರೆ."
  },
  Hindi: {
    label: "फैकल्टी स्पॉटलाइट",
    name: "डॉ. नागश्री एन.",
    title: "एसोसिएट प्रोफेसर और एचओडी (सीएसई - डेटा साइंस)",
    bio: "20 वर्षों के अनुभव के साथ, डॉ. नागश्री के पास VTU से पीएच.डी. है। डेटा साइंस, मशीन लर्निंग, डीप लर्निंग में विशेषज्ञ, और 35 से अधिक अंतरराष्ट्रीय प्रकाशन हैं।"
  },
  Tamil: {
    label: "ஆசிரியர் அறிமுகம்",
    name: "Dr. நாகஸ்ரீ N.",
    title: "இணை பேராசிரியர் & HOD (CSE - தரவு அறிவியல்)",
    bio: "20 வருட அனுபவத்துடன், Dr. நாகஸ்ரீ VTU இல் Ph.D. பெற்றவர். தரவு அறிவியல், இயந்திர கற்றல், ஆழ்ந்த கற்றல் ஆகியவற்றில் நிபுணத்துவம் பெற்று, 35 சர்வதேச வெளியீடுகளைக் கொண்டுள்ளார்."
  },
  Telugu: {
    label: "ఫ్యాకల్టీ పరిచయం",
    name: "డా. నాగశ్రీ ఎన్.",
    title: "అసోసియేట్ ప్రొఫెసర్ & HOD (CSE - డేటా సైన్స్)",
    bio: "20 ఏళ్ల అనుభవంతో, డా. నాగశ్రీ VTU నుండి Ph.D. పొందారు. డేటా సైన్స్, మెషిన్ లెర్నింగ్, డీప్ లెర్నింగ్‌లో నిపుణులు మరియు 35 పైగా అంతర్జాతీయ ప్రచురణలు చేశారు."
  },
  Malayalam: {
    label: "അധ്യാപകരെ അറിയാം",
    name: "Dr. നാഗശ്രീ N.",
    title: "അസോസിയേറ്റ് പ്രൊഫസർ & HOD (CSE - ഡാറ്റാ സയൻസ്)",
    bio: "20 വർഷത്തെ അനുഭവമുള്ള Dr. നാഗശ്രീക്ക് VTU ൽ നിന്ന് പിഎച്ച്.ഡി. ഉണ്ട്. ഡാറ്റാ സയൻസ്, മെഷീൻ ലേണിംഗ്, ഡീപ്പ് ലേണിംഗ് എന്നിവയിൽ പ്രാവീണ്യം നേടിയ അവർക്ക് 35 ലധികം പ്രസിദ്ധീകരണങ്ങളുണ്ട്."
  }
};

export default function PremiumHODCard() {
  const { language } = useLanguage();
  const L = LOCALES[language] ?? LOCALES.English;

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="premium-hod-container"
    >
      {/* Decorative Borders */}
      <div className="premium-hod-border-outer" />
      <div className="premium-hod-border-inner" />
      <div className="premium-hod-vignette" />
      <div className="premium-hod-glow" />

      <div className="premium-hod-content">
        {/* Left Side: Content */}
        <div className="premium-hod-left">
          <div className="premium-hod-text-box">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="premium-hod-label"
            >
              {L.label}
            </motion.div>
            
            <motion.h2 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="premium-hod-name"
            >
              {L.name}
            </motion.h2>

            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="premium-hod-title"
            >
              {L.title}
            </motion.div>

            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.6 }}
              className="premium-hod-bio"
            >
              {L.bio}
            </motion.p>
          </div>
        </div>

        {/* Right Side: Portrait */}
        <div className="premium-hod-right">
          <motion.img 
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.8, ease: "easeOut" }}
            src={hodPortrait} 
            alt={L.name} 
            className="premium-hod-portrait"
          />
        </div>
      </div>
    </motion.div>
  );
}
