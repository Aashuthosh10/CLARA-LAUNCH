import React, { useMemo } from 'react';
import { useLanguage, type Language } from '../../../context/LanguageContext';

const DOCUMENTS_EN: string[] = [
  '10th Marks Card',
  '12th / II PUC Marks Card',
  'CET / COMEDK Rank Card + Allotment Letter',
  'Transfer Certificate (TC)',
  'Conduct / Character Certificate',
  'Caste / Income Certificate (if applicable)',
  'Aadhaar Card Copy',
  'Passport Size Photos (6–10)',
  'Migration Certificate (for other board students)',
  'VTU Eligibility Certificate (if required)',
];

const TITLE_BY_LANGUAGE: Record<Language, string> = {
  English: 'Required Documents',
  Kannada: 'ಅಗತ್ಯ ದಾಖಲೆಗಳು',
  Hindi: 'आवश्यक दस्तावेज़',
  Tamil: 'தேவையான ஆவணங்கள்',
  Telugu: 'అవసరమైన పత్రాలు',
  Malayalam: 'ആവശ്യമായ രേഖകൾ',
};

const DOCUMENT_TRANSLATIONS: Record<Language, Record<string, string>> = {
  English: {},
  Kannada: {
    '10th Marks Card': '10ನೇ ತರಗತಿ ಮಾರ್ಕ್ಸ್ ಕಾರ್ಡ್',
    '12th / II PUC Marks Card': '12ನೇ / ದ್ವಿತೀಯ ಪಿಯುಸಿ ಮಾರ್ಕ್ಸ್ ಕಾರ್ಡ್',
    'CET / COMEDK Rank Card + Allotment Letter': 'CET / COMEDK ರ್ಯಾಂಕ್ ಕಾರ್ಡ್ + ಅಲಾಟ್ಮೆಂಟ್ ಲೆಟರ್',
    'Transfer Certificate (TC)': 'ಟ್ರಾನ್ಸ್‌ಫರ್ ಪ್ರಮಾಣಪತ್ರ (TC)',
    'Conduct / Character Certificate': 'ಕಂಡಕ್ಟ್ / ಕ್ಯಾರಕ್ಟರ್ ಪ್ರಮಾಣಪತ್ರ',
    'Caste / Income Certificate (if applicable)': 'ಜಾತಿ / ಆದಾಯ ಪ್ರಮಾಣಪತ್ರ (ಅಗತ್ಯವಿದ್ದರೆ)',
    'Aadhaar Card Copy': 'ಆಧಾರ್ ಕಾರ್ಡ್ ಪ್ರತ',
    'Passport Size Photos (6–10)': 'ಪಾಸ್ಪೋರ್ಟ್ ಗಾತ್ರದ ಫೋಟೋಗಳು (6–10)',
    'Migration Certificate (for other board students)': 'ಮೈಗ್ರೇಶನ್ ಪ್ರಮಾಣಪತ್ರ (ಇತರೆ ಬೋರ್ಡ್ ವಿದ್ಯಾರ್ಥಿಗಳಿಗೆ)',
    'VTU Eligibility Certificate (if required)': 'VTU ಅರ್ಹತಾ ಪ್ರಮಾಣಪತ್ರ (ಅಗತ್ಯವಿದ್ದರೆ)',
  },
  Hindi: {
    '10th Marks Card': '10वीं अंकतालिका',
    '12th / II PUC Marks Card': '12वीं / II PUC अंकतालिका',
    'CET / COMEDK Rank Card + Allotment Letter': 'CET / COMEDK रैंक कार्ड + अलॉटमेंट लेटर',
    'Transfer Certificate (TC)': 'ट्रांसफर सर्टिफिकेट (TC)',
    'Conduct / Character Certificate': 'कंडक्ट / चरित्र प्रमाण पत्र',
    'Caste / Income Certificate (if applicable)': 'जाति / आय प्रमाण पत्र (यदि लागू हो)',
    'Aadhaar Card Copy': 'आधार कार्ड की प्रति',
    'Passport Size Photos (6–10)': 'पासपोर्ट आकार फोटो (6–10)',
    'Migration Certificate (for other board students)': 'माइग्रेशन प्रमाण पत्र (अन्य बोर्ड छात्रों के लिए)',
    'VTU Eligibility Certificate (if required)': 'VTU पात्रता प्रमाण पत्र (यदि आवश्यक हो)',
  },
  Tamil: {
    '10th Marks Card': '10ஆம் வகுப்பு மதிப்பெண் அட்டை',
    '12th / II PUC Marks Card': '12ஆம் / II PUC மதிப்பெண் அட்டை',
    'CET / COMEDK Rank Card + Allotment Letter': 'CET / COMEDK தரவரிசை அட்டை + ஒதுக்கீட்டு கடிதம்',
    'Transfer Certificate (TC)': 'மாற்றுச் சான்றிதழ் (TC)',
    'Conduct / Character Certificate': 'நடத்தை / குணச் சான்றிதழ்',
    'Caste / Income Certificate (if applicable)': 'சாதி / வருமானச் சான்றிதழ் (தேவையெனில்)',
    'Aadhaar Card Copy': 'ஆதார் அட்டை நகல்',
    'Passport Size Photos (6–10)': 'பாஸ்போர்ட் அளவு புகைப்படங்கள் (6–10)',
    'Migration Certificate (for other board students)': 'மைக்ரேஷன் சான்றிதழ் (பிற வாரிய மாணவர்களுக்கு)',
    'VTU Eligibility Certificate (if required)': 'VTU தகுதி சான்றிதழ் (தேவையெனில்)',
  },
  Telugu: {
    '10th Marks Card': '10వ తరగతి మార్క్స్ కార్డ్',
    '12th / II PUC Marks Card': '12వ / II PUC మార్క్స్ కార్డ్',
    'CET / COMEDK Rank Card + Allotment Letter': 'CET / COMEDK ర్యాంక్ కార్డ్ + అలాట్‌మెంట్ లెటర్',
    'Transfer Certificate (TC)': 'ట్రాన్స్‌ఫర్ సర్టిఫికేట్ (TC)',
    'Conduct / Character Certificate': 'కండక్ట్ / క్యారెక్టర్ సర్టిఫికేట్',
    'Caste / Income Certificate (if applicable)': 'కులం / ఆదాయం సర్టిఫికేట్ (అవసరమైతే)',
    'Aadhaar Card Copy': 'ఆధార్ కార్డ్ కాపీ',
    'Passport Size Photos (6–10)': 'పాస్‌పోర్ట్ సైజ్ ఫోటోలు (6–10)',
    'Migration Certificate (for other board students)': 'మైగ్రేషన్ సర్టిఫికేట్ (ఇతర బోర్డు విద్యార్థులకు)',
    'VTU Eligibility Certificate (if required)': 'VTU ఎలిజిబిలిటీ సర్టిఫికేట్ (అవసరమైతే)',
  },
  Malayalam: {
    '10th Marks Card': '10ാം ക്ലാസ് മാർക്ക് കാർഡ്',
    '12th / II PUC Marks Card': '12ാം / II PUC മാർക്ക് കാർഡ്',
    'CET / COMEDK Rank Card + Allotment Letter': 'CET / COMEDK റാങ്ക് കാർഡ് + അലോട്ട്മെന്റ് ലെറ്റർ',
    'Transfer Certificate (TC)': 'ട്രാൻസ്ഫർ സർട്ടിഫിക്കറ്റ് (TC)',
    'Conduct / Character Certificate': 'കണ്ടക്റ്റ് / കാരക്ടർ സർട്ടിഫിക്കറ്റ്',
    'Caste / Income Certificate (if applicable)': 'ജാതി / വരുമാന സർട്ടിഫിക്കറ്റ് (ആവശ്യമായാൽ)',
    'Aadhaar Card Copy': 'ആധാർ കാർഡ് പകർപ്പ്',
    'Passport Size Photos (6–10)': 'പാസ്‌പോർട്ട് സൈസ് ഫോട്ടോകൾ (6–10)',
    'Migration Certificate (for other board students)': 'മൈഗ്രേഷൻ സർട്ടിഫിക്കറ്റ് (മറ്റ് ബോർഡ് വിദ്യാർത്ഥികൾക്ക്)',
    'VTU Eligibility Certificate (if required)': 'VTU യോഗ്യത സർട്ടിഫിക്കറ്റ് (ആവശ്യമായാൽ)',
  },
};

function iconForDocument(doc: string): string {
  const n = doc.toLowerCase();
  if (n.includes('aadhaar')) return '🪪';
  if (n.includes('marks')) return '📄';
  if (n.includes('rank card')) return '🎫';
  if (n.includes('photo')) return '🖼️';
  if (n.includes('certificate')) return '📁';
  return '📌';
}

export default function DocumentsBlock() {
  const { language } = useLanguage();
  const title = TITLE_BY_LANGUAGE[language] ?? TITLE_BY_LANGUAGE.English;
  const translations = DOCUMENT_TRANSLATIONS[language] ?? DOCUMENT_TRANSLATIONS.English;
  const items = useMemo(
    () =>
      DOCUMENTS_EN.map((doc) => ({
        text: translations[doc] ?? doc,
        icon: iconForDocument(doc),
      })),
    [translations],
  );

  return (
    <div data-testid="documents-block" className="w-full max-w-5xl rounded-3xl border border-[#d8d0c3] bg-[#f8f5ee] p-8 shadow-md">
      <div className="text-[12px] tracking-[0.18em] text-[#9b8e6c] uppercase mb-2">📄 Documents</div>
      <h2 className="text-[42px] leading-[1.06] font-semibold text-[#1f1f1f] mb-6">{title}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {items.map((item) => (
          <div
            key={item.text}
            className="flex items-center gap-3 rounded-xl border border-[#c8c0b4] bg-[#f3f0e9] px-4 py-3 text-[#222]"
          >
            <span className="text-xl" aria-hidden>
              {item.icon}
            </span>
            <span className="text-[17px] leading-snug">{item.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
