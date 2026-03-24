/**
 * Lightweight Frontend Intent Classifier
 * Categorizes queries into 'conversational' or 'informational' to drive layout logic.
 */

type IntentCategory = 'conversational' | 'informational';

const INTENT_GROUPS: Record<string, { conversational: string[], about_college: string[], informational: string[] }> = {
    en: {
        conversational: [
            'how are you', 'who are you', 'what is your name', 'tell me about clara',
            'who is the principal', 'principal name', 'who is principal', 'who is the hod',
            'hello', 'hi', 'good morning', 'good evening', 'thank you', 'thanks'
        ],
        about_college: [
            'tell me about the college', 'about the college', 'college overview',
            'information about the college', 'describe the college', 'about college',
            'overview of institution', 'history of college', 'college description',
            'institutional description', 'tell me about svit', 'about svit'
        ],
        informational: [
            'college', 'courses', 'available', 'admission', 'fee', 'tuition', 'placement',
            'department', 'engineering', 'where is', 'direction', 'building', 'campus',
            'facilities', 'hostel', 'library', 'lab', 'canteen', 'office'
        ]
    },
    hi: {
        conversational: [
            'आप कैसे हैं', 'आप कौन हैं', 'आपका नाम क्या है', 'क्लारा के बारे में बताएं',
            'प्रिंसिपल कौन है', 'नमस्ते', 'धन्यवाद'
        ],
        about_college: [
            'कॉलेज के बारे में', 'कॉलेज की जानकारी', 'कॉलेज का परिचय',
            'कॉलेज के बारे में बताएं', 'संस्था का विवरण', 'कॉलेज का इतिहास'
        ],
        informational: [
            'कोर्स', 'विभाग', 'प्रवेश', 'शुल्क', 'फीस', 'प्लेसमेंट',
            'रास्ता', 'भवन', 'इमारत', 'कैंपस', 'सुविधा', 'छात्रावास', 'पुस्तकालय'
        ]
    },
    kn: {
        conversational: [
            'ಹೇಗಿದ್ದೀರಾ', 'ನೀವು ಯಾರು', 'ನಿಮ್ಮ ಹೆಸರೇನು', 'ಕ್ಲಾರಾ ಬಗ್ಗೆ ಹೇಳಿ',
            'ಪ್ರಿನ್ಸಿಪಾಲ್ ಯಾರು', 'ಹಲೋ', 'ನಮಸ್ಕಾರ', 'ಧನ್ಯವಾದ'
        ],
        about_college: [
            'ಕಾಲೇಜ್ ಬಗ್ಗೆ', 'ಕಾಲೇಜಿನ ಮಾಹಿತಿ', 'ಕಾಲೇಜಿನ ಪರಿಚಯ', 'ಕಾಲೇಜ್ ವಿವರ',
            'ಕಾಲೇಜ್ ಬಗ್ಗೆ ಹೇಳಿ', 'ಕಾಲೇಜಿನ ಬಗ್ಗೆ ಮಾಹಿತಿ', 'ಸಂಸ್ಥೆಯ ವಿವರ', 'ಕಾಲೇಜಿನ ಇತಿಹಾಸ'
        ],
        informational: [
            'ಕಾಲೇಜ್', 'ಕಾಲೇಜು', 'ಕೋರ್ಸ್', 'ವಿಭಾಗ', 'ಪ್ರವೇಶ', 'ಶುಲ್ಕ', 'ಫೀಸು',
            'ಪ್ಲೇಸ್ಮೆಂಟ್', 'ಎಲ್ಲಿದೆ', 'ದಾರಿ', 'ಕಟ್ಟಡ', 'ಭವನ', 'ಕ್ಯಾಂಪಸ್', 'ಸೌಲಭ್ಯ'
        ]
    },
    ta: {
        conversational: [
            'எப்படி இருக்கிறீர்கள்', 'யார் நீங்கள்', 'உங்கள் பெயர் என்ன', 'கிளாரா பற்றி சொல்லுங்கள்',
            'முதல்வர் யார்', 'வணக்கம்', 'நன்றி'
        ],
        about_college: [
            'கல்லூரி பற்றி', 'கல்லூரி தகவல்', 'கல்லூரி அறிமுகம்',
            'கல்லூரியைப் பற்றி சொல்லுங்கள்', 'கல்லூரி வரலாறு', 'நிறுவன விளக்கம்'
        ],
        informational: [
            'பாடநெறி', 'துறை', 'சேர்க்கை', 'கட்டணம்', 'வேலைவாய்ப்பு',
            'வழி', 'கட்டிடம்', 'வளாகம்', 'வசதி', 'விடுதி', 'நூலகம்'
        ]
    },
    te: {
        conversational: [
            'ఎలా ఉన్నారు', 'మీరు ఎవరు', 'మీ పేరు ఏమిటి', 'క్లారా గురించి చెప్పండి',
            'ప్రిన్సిపాల్ ఎవరు', 'నమస్కారం', 'ధನ್ಯవాదాలు'
        ],
        about_college: [
            'కళాశాల గురించి', 'కళాశాల సమాచారం', 'కళాశాల పరిచయం',
            'కళాశాల గురించి చెప్పండి', 'కళాశాల చరిత్ర', 'సంస్థ వివరణ'
        ],
        informational: [
            'కోర్సు', 'విభాగం', 'ప్రవేశం', 'ఫీజు', 'ప్లేస్‌మెంట్',
            'దారి', 'భవనం', 'క్యాంపస్', 'సౌకర్యం', 'హాస్టల్', 'గ్రంథాలయం'
        ]
    },
    ml: {
        conversational: [
            'സുഖമാണോ', 'ആരാണ് നിങ്ങൾ', 'എന്താണ് പേര്', 'ക്ലാരയെക്കുറിച്ച് പറയുക',
            'പ്രിൻസിപ്പൽ ആരാണ്', 'ഹലോ', 'നമസ്കാരം', 'നന്ദി'
        ],
        about_college: [
            'കോളേജ് பற்றி', 'കോളേജ് വിവരങ്ങൾ', 'കോളേജ് പരിചയം',
            'കോളേജിനെക്കുറിച്ച് പറയുക', 'കോളേജ് ചരിത്രം', 'സ്ഥാപന വിവരണം'
        ],
        informational: [
            'കോഴ്സ്', 'വിഭാഗം', 'പ്രവേശനം', 'ഫീസ്', 'പ്ലേസ്‌മെന്റ്',
            'വഴി', 'കെട്ടിടം', 'ക്യാമ്പസ്', 'സൗകര്യം', 'ഹോസ്റ്റൽ', 'ലൈബ്രറി'
        ]
    }
};

/**
 * Normalizes text for better intent matching
 */
function normalizeText(text: string): string {
    return text
        .normalize('NFC')
        .toLowerCase()
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "")
        .replace(/\s{2,}/g, " ")
        .trim();
}

/**
 * Detects the specific intent category of a given text string.
 */
export function getMessageIntent(text: string): IntentCategory {
    const normalized = normalizeText(text);
    if (!normalized) return 'conversational';

    // Helper to check keywords
    const matchesGroup = (keywords: string[]) => {
        return keywords.some(keyword => {
            const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(`(?:^|[^\\p{L}])(${escaped})(?:$|[^\\p{L}])`, 'ui');
            return regex.test(normalized);
        });
    };

    // 1. Check for specific "About College" intent first
    if (isAboutCollegeIntent(text)) {
        return 'informational';
    }

    // 2. Check for general Information Intent
    for (const lang in INTENT_GROUPS) {
        if (matchesGroup(INTENT_GROUPS[lang].informational)) {
            return 'informational';
        }
    }

    // 3. Default is conversational
    return 'conversational';
}

/**
 * Checks if the specific intent is about the college (triggers Digital Book)
 */
export function isAboutCollegeIntent(text: string): boolean {
    const normalized = normalizeText(text);
    if (!normalized) return false;

    // 1. Combination Match for English (Robust)
    // If it mentions both 'about' (or synonyms) AND 'college' (or synonyms)
    const enAboutWords = ['about', 'tell me', 'info', 'information', 'describe', 'overview', 'details', 'history', 'background'];
    const enCollegeWords = ['college', 'institution', 'svit', 'campus', 'academy', 'institute', 'place', 'here'];

    const hasEnAbout = enAboutWords.some(w => normalized.includes(w));
    const hasEnCollege = enCollegeWords.some(w => normalized.includes(w));

    if (hasEnAbout && hasEnCollege) return true;

    // 2. Specialized Logic for Telugu (Combination Match)
    const teCollegeWords = ['కళాశాల', 'కాలేజ్', 'svit'];
    const teInfoWords = ['గురించి', 'వివరాలు', 'సమాచారం', 'పరిచయం'];

    const hasTeCollege = teCollegeWords.some(w => normalized.includes(w));
    const hasTeInfo = teInfoWords.some(w => normalized.includes(w));

    if (hasTeCollege && hasTeInfo) return true;

    // 3. General matching for other languages / direct keyword matches
    for (const lang in INTENT_GROUPS) {
        const aboutKeywords = INTENT_GROUPS[lang].about_college;
        // Also check if normalized text INCLUDES any of these directly (partial match)
        if (aboutKeywords.some(keyword => normalized.includes(normalizeText(keyword)))) {
            return true;
        }

        // Regexp fallback for more precise word boundary matching if needed
        if (aboutKeywords.some(keyword => {
            const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(`(?:^|[^\\p{L}])(${escaped})(?:$|[^\\p{L}])`, 'ui');
            return regex.test(normalized);
        })) {
            return true;
        }
    }
    return false;
}

/**
 * Legacy support for components using the boolean check
 */
export function isCollegeIntent(text: string): boolean {
    return getMessageIntent(text) === 'informational';
}
