import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { AnimatePresence, motion, LayoutGroup } from 'motion/react';
import { Sparkles, Home, MapPinned, MessageSquareText, Square, Volume2 } from 'lucide-react';
import { useLanguage, type Language } from '../context/LanguageContext';
import whatsappBgImage from '../assets/whatsapp_bg.png';
import fullTextBgImage from '../assets/full_text_bg.png';
import {
  type ChatMessage,
  type OrbState,
  isTextMessage,
} from '../types/chat';
import { useVoiceFrequencyAnalyser } from '../hooks/useVoiceAnalyser';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import AnimatedAiMessage from '../components/chat/AnimatedAiMessage';
import CourseMenuComponent from '../components/chat/CourseMenuComponent';
import DepartmentCardStage from '../components/chat/DepartmentCardStage';
import DepartmentCardFactory from '../components/chat/cards/DepartmentCards/DepartmentCardFactory';
import LeadershipOverview from '../components/chat/LeadershipOverview';
import DepartmentFeesCard from '../components/chat/cards/DepartmentFeesCard';
import DocumentsBlock from '../components/chat/cards/DocumentsBlock';
import CampusNavigationStage from '../components/chat/CampusNavigationStage';
import ChatOrbControl from './chat/ChatOrbControl';
import { useChatLayoutReducer } from './chat/useChatLayoutReducer';
import { LANGUAGE_OPTIONS } from './LanguageSelect';
import { getStaticCardsForTrigger, type CardDataItem } from '../lib/cardData';
import {
  buildAllDepartmentSummaryCardsFromLocale,
  buildAllHodCardsFromLocale,
  buildDepartmentSlidesFromRecord,
  buildPlacementCardsFromLocale,
  getDepartmentRecord,
  menuLabelToJsonKey,
} from '../lib/collegeLocaleUtils';
import { useCollegeData } from '../hooks/useCollegeData';
import {
  CAMPUS_DIRECTIONS,
  campusLabels,
  campusSpeechText,
  localizedCampusSteps,
} from '../data/campusDirections';

const THINKING_TAGLINES: Record<Language, string[]> = {
  English: [
    'Reading your question and gathering the right details...',
    'Cross-checking campus info so the answer stays accurate...',
    'Brewing a clear response tailored for you...',
    'Connecting the dots from CLARA knowledge...',
    'Almost there... shaping the best possible answer...',
  ],
  Kannada: [
    'ನಿಮ್ಮ ಪ್ರಶ್ನೆಯನ್ನು ಓದಿ ಸರಿಯಾದ ಮಾಹಿತಿಯನ್ನು ಸಂಗ್ರಹಿಸುತ್ತಿದ್ದೇನೆ...',
    'ಉತ್ತರ ನಿಖರವಾಗಿರಲು ಮಾಹಿತಿಯನ್ನು ಪರಿಶೀಲಿಸುತ್ತಿದ್ದೇನೆ...',
    'ನಿಮಗಾಗಿ ಸ್ಪಷ್ಟ ಉತ್ತರವನ್ನು ಸಿದ್ಧಪಡಿಸುತ್ತಿದ್ದೇನೆ...',
    'CLARA ಜ್ಞಾನದಿಂದ ಸರಿಯಾದ ಸಂಪರ್ಕಗಳನ್ನು ಕಟ್ಟುತ್ತಿದ್ದೇನೆ...',
    'ಇನ್ನೇನು ಸಿದ್ಧ... ಅತ್ಯುತ್ತಮ ಉತ್ತರ ಬರುತ್ತಿದೆ...',
  ],
  Hindi: [
    'आपके सवाल को पढ़कर सही जानकारी जुटा रही हूँ...',
    'उत्तर सटीक रहे, इसलिए जानकारी दोबारा जाँच रही हूँ...',
    'आपके लिए स्पष्ट और सरल उत्तर तैयार कर रही हूँ...',
    'CLARA ज्ञान से सही बिंदु जोड़ रही हूँ...',
    'बस अभी... सबसे बेहतर जवाब तैयार है...',
  ],
  Tamil: [
    'உங்கள் கேள்வியை வாசித்து சரியான தகவலை தொகுத்து வருகிறேன்...',
    'பதில் துல்லியமாக இருக்க தகவலை மறுபரிசீலனை செய்கிறேன்...',
    'உங்களுக்கான தெளிவான பதிலை தயார் செய்கிறேன்...',
    'CLARA அறிவில் இருந்து சரியான தகவல்களை இணைக்கிறேன்...',
    'இன்னும் சில நொடிகளில்... சிறந்த பதில் வருகிறது...',
  ],
  Telugu: [
    'మీ ప్రశ్నను చదివి సరైన వివరాలు సేకరిస్తున్నాను...',
    'సమాధానం ఖచ్చితంగా ఉండేందుకు సమాచారాన్ని తనిఖీ చేస్తున్నాను...',
    'మీకు సరళమైన స్పష్టమైన సమాధానం సిద్ధం చేస్తున్నాను...',
    'CLARA జ్ఞానం నుంచి సరైన అంశాలను కలుపుతున్నాను...',
    'ఇంకొంచెంలో... మంచి సమాధానం సిద్ధమవుతోంది...',
  ],
  Malayalam: [
    'നിങ്ങളുടെ ചോദ്യത്തിന് അനുയോജ്യമായ വിവരം ശേഖരിക്കുകയാണ്...',
    'ഉത്തരം കൃത്യമാകാൻ വിവരങ്ങൾ വീണ്ടും പരിശോധിക്കുകയാണ്...',
    'നിങ്ങൾക്കായി ലളിതവും വ്യക്തവുമായ മറുപടി തയ്യാറാക്കുന്നു...',
    'CLARA അറിവിൽ നിന്ന് ശരിയായ ഭാഗങ്ങൾ ചേർക്കുന്നു...',
    'ഇനി കുറച്ച് നിമിഷങ്ങൾ... മികച്ച മറുപടി വരുന്നു...',
  ],
};

const THINKING_TITLE: Record<Language, string> = {
  English: 'CLARA is thinking',
  Kannada: 'CLARA ಯೋಚಿಸುತ್ತಿದೆ',
  Hindi: 'CLARA सोच रही है',
  Tamil: 'CLARA யோசிக்கிறது',
  Telugu: 'CLARA ఆలోచిస్తోంది',
  Malayalam: 'CLARA ചിന്തിക്കുന്നു',
};

const THINKING_EMOJIS = ['🤔', '🧠', '✨', '⚡', '💡'];
const SPLIT_IDLE_TIMEOUT_MS = 30_000;
const CARD_AUDIO_START_DELAY_MS = 450;
const FULL_TEXT_AUDIO_START_DELAY_MS = 140;
const DEFAULT_COURSE_MENU_OPTIONS = [
  'CSE',
  'ISE',
  'CSE (AI & ML)',
  'CSE (Data Science)',
  'CSE (Cyber Security)',
  'CSE (Business Systems)',
  'ECE',
  'Civil',
  'Mechanical',
  'MBA',
  'Basic Sciences',
];

const INFO_STAGE_CHIPS: Record<Language, { placements: string }> = {
  English: { placements: 'Placements & training' },
  Kannada: { placements: 'ಪ್ಲೇಸ್‌ಮೆಂಟ್ ಮತ್ತು ತರಬೇತಿ' },
  Hindi: { placements: 'प्लेसमेंट और प्रशिक्षण' },
  Tamil: { placements: 'பிளேஸ்மென்ட் மற்றும் பயிற்சி' },
  Telugu: { placements: 'ప్లేస్‌మెంట్ మరియు శిక్షణ' },
  Malayalam: { placements: 'പ്ലേസ്മെന്റും പരിശീലനവും' },
};

const READY_SUGGESTIONS: Record<Language, { label: string; text: string }[]> = {
  English: [
    { label: 'Which course is best for my child?', text: 'Which course would be best for my child?' },
    { label: 'Tell me about fees', text: 'Please tell me about the fees.' },
    { label: 'How are the placements?', text: 'How are the placements?' },
  ],
  Kannada: [
    { label: 'ನನ್ನ ಮಗುವಿಗೆ ಯಾವ ಕೋರ್ಸ್ ಉತ್ತಮ?', text: 'ನನ್ನ ಮಗುವಿಗೆ ಯಾವ ಕೋರ್ಸ್ ಉತ್ತಮ?' },
    { label: 'ಫೀಸ್ ಬಗ್ಗೆ ಹೇಳಿ', text: 'ಫೀಸ್ ಬಗ್ಗೆ ಹೇಳಿ.' },
    { label: 'ಪ್ಲೇಸ್‌ಮೆಂಟ್ ಹೇಗಿದೆ?', text: 'ಪ್ಲೇಸ್‌ಮೆಂಟ್ ಹೇಗಿದೆ?' },
  ],
  Hindi: [
    { label: 'मेरे बच्चे के लिए कौन सा कोर्स अच्छा है?', text: 'मेरे बच्चे के लिए कौन सा कोर्स अच्छा रहेगा?' },
    { label: 'फीस के बारे में बताइए', text: 'कृपया फीस के बारे में बताइए।' },
    { label: 'प्लेसमेंट कैसे हैं?', text: 'प्लेसमेंट कैसे हैं?' },
  ],
  Tamil: [
    { label: 'என் குழந்தைக்கு எந்த பாடநெறி சிறந்தது?', text: 'என் குழந்தைக்கு எந்த பாடநெறி சிறந்தது?' },
    { label: 'கட்டண விவரம் சொல்லுங்கள்', text: 'கட்டண விவரம் சொல்லுங்கள்.' },
    { label: 'பிளேஸ்மென்ட் எப்படி உள்ளது?', text: 'பிளேஸ்மென்ட் எப்படி உள்ளது?' },
  ],
  Telugu: [
    { label: 'నా పిల్లలకి ఏ కోర్స్ మంచిది?', text: 'నా పిల్లలకి ఏ కోర్స్ మంచిది?' },
    { label: 'ఫీజుల గురించి చెప్పండి', text: 'ఫీజుల గురించి చెప్పండి.' },
    { label: 'ప్లేస్‌మెంట్స్ ఎలా ఉన్నాయి?', text: 'ప్లేస్‌మెంట్స్ ఎలా ఉన్నాయి?' },
  ],
  Malayalam: [
    { label: 'എന്റെ കുട്ടിക്ക് ഏത് കോഴ്സാണ് നല്ലത്?', text: 'എന്റെ കുട്ടിക്ക് ഏത് കോഴ്സാണ് നല്ലത്?' },
    { label: 'ഫീസ് വിവരങ്ങൾ പറയൂ', text: 'ഫീസ് വിവരങ്ങൾ പറയൂ.' },
    { label: 'പ്ലേസ്മെന്റുകൾ എങ്ങനെയാണ്?', text: 'പ്ലേസ്മെന്റുകൾ എങ്ങനെയാണ്?' },
  ],
};

type PendingAudio = {
  audioBase64: string;
  segmentKey: string;
  isOverview: boolean;
  cardsToSync: any[] | null;
  targetLayout: 'FULL_TEXT' | 'SPLIT_CARDS';
};

const estimateWavDurationSeconds = (audioBase64: string): number | null => {
  try {
    const binary = atob(audioBase64);
    if (binary.length < 44 || binary.slice(0, 4) !== 'RIFF' || binary.slice(8, 12) !== 'WAVE') {
      return null;
    }
    const view = new DataView(new ArrayBuffer(binary.length));
    for (let i = 0; i < binary.length; i += 1) {
      view.setUint8(i, binary.charCodeAt(i));
    }
    const sampleRate = view.getUint32(24, true);
    const byteRate = view.getUint32(28, true);
    const dataSize = view.getUint32(40, true);
    const rate = byteRate || sampleRate;
    if (!rate || !dataSize) return null;
    return dataSize / rate;
  } catch {
    return null;
  }
};

const normalizeDepartmentMenuKey = (departmentId: string): string | null => {
  const raw = (departmentId || '').trim();
  const value = raw.toLowerCase();
  if (!value) return null;
  if (value.includes('basic')) return 'Basic Sciences';
  if (value.includes('mba') || value.includes('management')) return 'MBA';
  if (value.includes('mechanical') || value === 'mech') return 'Mechanical';
  if (value.includes('civil')) return 'Civil';
  if (value.includes('ece') || value.includes('electronics')) return 'ECE';
  if (value.includes('ise') || value.includes('information science')) return 'ISE';
  if (value.includes('cyber security') || value.includes('cybersecurity')) return 'CSE (Cyber Security)';
  if (value.includes('business system')) return 'CSE (Business Systems)';
  if (value.includes('data science')) return 'CSE (Data Science)';
  if ((value.includes('ai') && value.includes('ml')) || value.includes('aiml') || value.includes('ai & ml')) {
    return 'CSE (AI & ML)';
  }
  if (value.includes('cse') || value.includes('computer')) return 'CSE';
  return raw;
};

const normalizeCardTrigger = (trigger: unknown): string | null => {
  if (typeof trigger !== 'string') return null;
  const n = trigger.trim().toLowerCase();
  if (!n) return null;
  if (n === 'hod_info' || n === 'head_of_department' || n === 'hod_profile') return 'hod';
  if (n === 'dept' || n === 'department') return 'department_overview';
  if (n === 'fees') return 'department_fees';
  return n;
};

interface ChatScreenProps {
  messages: ChatMessage[];
  isListening?: boolean;
  isSpeaking?: boolean;
  isProcessing?: boolean;
  isConnected?: boolean;
  voiceInputMode?: 'browser' | 'backend';
  payload?: any | null;
  /** When true, after the first greeting an in-chat language picker is shown. */
  inlineLanguageGate?: boolean;
  onInlineLanguageResolved?: () => void;
  onBack: () => void;
  onHome?: () => void;
  onOrbTap: () => void;
  sendMessage: (msg: object) => void;
  /** When true, discard payload-driven updates (ghost session prevention). */
  isPayloadStale?: (p: unknown) => boolean;
}

export default function ChatScreen({
  messages: payloadMessages,
  isListening: propIsListening = false,
  isSpeaking: propIsSpeaking = false,
  isProcessing = false,
  isConnected = true,
  voiceInputMode = 'browser',
  payload,
  inlineLanguageGate = false,
  onInlineLanguageResolved,
  onBack,
  onHome,
  onOrbTap,
  sendMessage,
  isPayloadStale,
}: ChatScreenProps) {
  const { language, setLanguage, t } = useLanguage();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [displayMessages, setDisplayMessages] = useState<ChatMessage[]>(payloadMessages);
  
  // Layout Management State
  const { layoutMode, setLayoutMode } = useChatLayoutReducer('FULL_TEXT');
  const [activeCards, setActiveCards] = useState<any[] | null>(null);
  const [currentCardIdx, setCurrentCardIdx] = useState(0);
  const [suppressedTurnId, setSuppressedTurnId] = useState<string | null>(null);
  const [currentAudioDuration, setCurrentAudioDuration] = useState<number>(0);
  const [courseMenuOptions, setCourseMenuOptions] = useState<string[]>([]);
  const [activeDepartmentId, setActiveDepartmentId] = useState<string | null>(null);
  const [isDepartmentOverviewStage, setIsDepartmentOverviewStage] = useState(false);
  const [isInfoSlideStage, setIsInfoSlideStage] = useState(false);
  const [infoSlideChip, setInfoSlideChip] = useState('');
  const [infoSlides, setInfoSlides] = useState<{ title: string; content: string }[]>([]);
  const [isHodStage, setIsHodStage] = useState(false);
  const [isFeesStage, setIsFeesStage] = useState(false);
  const [activeFeesDepartmentId, setActiveFeesDepartmentId] = useState<string | null>(null);
  const [isDocumentsStage, setIsDocumentsStage] = useState(false);
  const [isCampusNavigationStage, setIsCampusNavigationStage] = useState(false);
  const [selectedCampusIndex, setSelectedCampusIndex] = useState(0);
  const [isCampusSpeaking, setIsCampusSpeaking] = useState(false);
  const [hasCampusRoomSelection, setHasCampusRoomSelection] = useState(false);
  const [showCampusReturnSuggestions, setShowCampusReturnSuggestions] = useState(false);
  const [showLanguageOverlay, setShowLanguageOverlay] = useState(false);
  const [languageGateSatisfied, setLanguageGateSatisfied] = useState(() => !inlineLanguageGate);

  // Response Priority Lock (CARD > UI > TEXT)
  const currentUiLockRef = useRef<'CARD' | 'TEXT' | 'IDLE'>('IDLE');

  // Wraps original sendMessage to sniff for intents dynamically on dispatch
  const interceptAndSendMessage = useCallback((msg: any, source: 'VOICE' | 'UI' = 'VOICE') => {
    if (msg?.action === 'user_message' && typeof msg.text === 'string') {
      // 1. Reset UI completely on NEW VOICE queries
      // Rule 5: Navigation clicks (UI source) should NOT wipe the layout mode.
      if (source === 'VOICE') {
        setLayoutMode('FULL_TEXT');
        setActiveCards(null);
        setIsCampusNavigationStage(false);
        setIsDepartmentOverviewStage(false);
        setActiveDepartmentId(null);
        setIsInfoSlideStage(false);
        setInfoSlides([]);
        setInfoSlideChip('');
        setIsHodStage(false);
        setIsFeesStage(false);
        setActiveFeesDepartmentId(null);
        setIsDocumentsStage(false);
        setCourseMenuOptions([]);
        currentUiLockRef.current = 'IDLE'; // Release the lock
      }
      
      // Backend is authoritative for intent routing on voice turns.
      // Frontend localIntent is allowed only for explicit UI command flows.
      if (source === 'UI' && msg?.localIntent) {
        if (import.meta.env.DEV) {
          console.log(
            `[CLARA_PIPELINE] UI localIntent forwarded type=${msg.localIntent?.type ?? 'unknown'} dept=${msg.localIntent?.departmentLabel ?? 'none'}`
          );
        }
      }
    }
    sendMessage(msg);
  }, [sendMessage]);

  const [activeTargetDepartment, setActiveTargetDepartment] = useState<string | null>(null);


  const collegeData = useCollegeData();

  // Interaction State
  const [orbState, setOrbState] = useState<OrbState>('idle');
  const [isPlayingBackendAudio, setIsPlayingBackendAudio] = useState(false);
  const [hasGreeted, setHasGreeted] = useState(false);
  const [showUnmuteHint, setShowUnmuteHint] = useState(false);
  const [thinkingIndex, setThinkingIndex] = useState(0);
  const [pendingAudio, setPendingAudio] = useState<PendingAudio | null>(null);
  const [visuallyFocusedMessage, setVisuallyFocusedMessage] = useState<ChatMessage | null>(null);
  const [isAwaitingReadyPrompt, setIsAwaitingReadyPrompt] = useState(false);
  const hasStartedRef = useRef(false);
  const prevLayoutModeRef = useRef<'FULL_TEXT' | 'SPLIT_CARDS'>('FULL_TEXT');
  const hasAutoStartedRef = useRef(false);
  const languagePromptRequestedRef = useRef(false);
  const wasPlayingAudioRef = useRef(false);
  const isPendingListeningRef = useRef(false);
  const savedChatFocusRef = useRef<ChatMessage | null>(null);
  const campusTtsSerialRef = useRef(0);

  // Audio Playback Ref
  const playedSegmentKeysRef = useRef<Set<string>>(new Set());
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const cardProgressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Intent Classifier & Speech Hooks
  const voiceAnalyser = useVoiceFrequencyAnalyser(orbState === 'listening');
  // Browser Speech Rec fallback (used if not relying on backend voice activity detection)
  const handleEmptyTranscript = useCallback(() => {
     setShowUnmuteHint(false);
     setIsDepartmentOverviewStage(false);
     setActiveDepartmentId(null);
     interceptAndSendMessage({
        action: "user_message",
        text: "**BACKGROUND_NOISE** No words detected, returning to idle state."
     });
  }, [interceptAndSendMessage]);

  const { startListening: startSpeechRecognition, stopListening } = useSpeechRecognition(
    interceptAndSendMessage,
    language,
    () => {},
    () => {}
  );

  // Keep chat history stable when backend emits partial payloads without `messages`.
  useEffect(() => {
    if (payload && isPayloadStale?.(payload)) return;
    if (Array.isArray(payload?.messages)) {
      const incomingMessages = payload.messages as ChatMessage[];
      const hasReadyPrompt = incomingMessages.some((m: any) => m?.id === 'ready_prompt');
      if (hasReadyPrompt || payload?.turn_id === 'ready_after_language_pick') {
        setIsAwaitingReadyPrompt(false);
      }
      setDisplayMessages(incomingMessages);
      const isCardTurn = Boolean(payload?.showCard);
      if (isCardTurn) {
        setVisuallyFocusedMessage(null);
      } else if (payload?.isProcessing !== true) {
        const latestAssistant = [...incomingMessages]
          .reverse()
          .find((m: any) => m?.role === 'clara' && typeof m?.text === 'string' && !(m as any)?.isHidden && !(m as any)?.isCardData);
        setVisuallyFocusedMessage((latestAssistant as ChatMessage) ?? null);
      }
    }
  }, [payload, isPayloadStale]);

  useEffect(() => {
    if (!isProcessing) {
      setThinkingIndex(0);
      return;
    }
    const ticker = setInterval(() => {
      setThinkingIndex(prev => prev + 1);
    }, 2200);
    return () => clearInterval(ticker);
  }, [isProcessing]);

  useEffect(() => {
    setLanguageGateSatisfied(!inlineLanguageGate);
    if (!inlineLanguageGate) {
      setShowLanguageOverlay(false);
    } else {
      setHasGreeted(false);
      languagePromptRequestedRef.current = false;
    }
  }, [inlineLanguageGate]);

  // Keep the wake text visible until local TTS playback has fully ended, then crossfade to the picker.
  useEffect(() => {
    if (payload && isPayloadStale?.(payload)) return;
    if (!inlineLanguageGate || languageGateSatisfied) {
      if (!inlineLanguageGate) setShowLanguageOverlay(false);
      return;
    }
    const hasAssistant = displayMessages.some(
      (m) =>
        m.role === 'clara' &&
        !(m as { isHidden?: boolean }).isHidden &&
        typeof (m as { text?: string }).text === 'string'
    );
    if (!hasAssistant || isProcessing) return;

    const openingTurn = payload?.turn_id === 'greeting_opening';
    const hasOpeningAudio = typeof payload?.audioBase64 === 'string' && payload.audioBase64.length > 0;
    const shouldRevealPicker = hasGreeted || (openingTurn && !hasOpeningAudio);
    if (!shouldRevealPicker) return;

    const t = window.setTimeout(() => setShowLanguageOverlay(true), hasOpeningAudio ? 850 : 2200);
    return () => window.clearTimeout(t);
  }, [
    inlineLanguageGate,
    languageGateSatisfied,
    displayMessages,
    isProcessing,
    hasGreeted,
    payload?.turn_id,
    payload?.audioBase64,
    isPayloadStale,
  ]);

  const handleInlineLanguagePick = useCallback(
    (lang: Language) => {
      setLanguage(lang);
      setIsAwaitingReadyPrompt(true);
      setVisuallyFocusedMessage(null);
      sendMessage({ action: 'language_selected', language: lang });
      setShowLanguageOverlay(false);
      setLanguageGateSatisfied(true);
      onInlineLanguageResolved?.();
    },
    [sendMessage, setLanguage, onInlineLanguageResolved]
  );

  const resolveCardsFromTrigger = useCallback((trigger: unknown): CardDataItem[] | null => {
    const mapSingleTrigger = (key: string): CardDataItem[] | null => {
      const n = key.toLowerCase();
      if (n === 'hod' || n === 'hod_profile' || n === 'head_of_department') {
        const c = buildAllHodCardsFromLocale(collegeData, language);
        return c.length ? c : null;
      }
      if (n === 'dept' || n === 'department' || n === 'department_overview') {
        const c = buildAllDepartmentSummaryCardsFromLocale(collegeData, language);
        return c.length ? c : null;
      }
      return getStaticCardsForTrigger(language, key);
    };

    const triggerList = Array.isArray(trigger) ? trigger : [trigger];
    const merged: CardDataItem[] = [];
    for (const item of triggerList) {
      if (typeof item !== 'string') continue;
      const cards = mapSingleTrigger(item);
      if (cards && cards.length) {
        merged.push(...cards);
      }
    }
    if (!merged.length) return null;

    return merged.filter((card, idx) => {
      const signature = `${card?.title ?? ''}|${card?.type ?? ''}`;
      return (
        idx ===
        merged.findIndex(
          (x) => `${x?.title ?? ''}|${x?.type ?? ''}` === signature
        )
      );
    });
  }, [language, collegeData]);

  const handleHomeClick = useCallback(() => {
    stopListening();
    if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
    }
    setIsPlayingBackendAudio(false);
    setIsCampusSpeaking(false);
    if (onHome) onHome();
  }, [stopListening, onHome]);

  const clearCardStages = useCallback(() => {
    setActiveCards(null);
    setCurrentCardIdx(0);
    setSuppressedTurnId(null);
    setCourseMenuOptions([]);
    setActiveDepartmentId(null);
    setIsDepartmentOverviewStage(false);
    setIsInfoSlideStage(false);
    setInfoSlides([]);
    setInfoSlideChip('');
    setIsHodStage(false);
    setIsFeesStage(false);
    setActiveFeesDepartmentId(null);
    setIsDocumentsStage(false);
  }, []);

  const stopCampusSpeech = useCallback(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    setIsPlayingBackendAudio(false);
    setIsCampusSpeaking(false);
  }, []);

  const requestCampusTts = useCallback((text: string, key: string) => {
    const cleanText = text.trim();
    if (!cleanText) return;

    stopCampusSpeech();
    setIsCampusSpeaking(true);
    campusTtsSerialRef.current += 1;
    sendMessage({
      action: 'campus_navigation_tts',
      language,
      text: cleanText,
      turn_id: `campus-${key}-${language}-${campusTtsSerialRef.current}`,
    });
  }, [language, sendMessage, stopCampusSpeech]);

  const speakCampusDirection = useCallback((index = selectedCampusIndex) => {
    const direction = CAMPUS_DIRECTIONS[index] ?? CAMPUS_DIRECTIONS[0];
    if (!direction) return;

    requestCampusTts(campusSpeechText(direction, language), `nav-${index}`);
  }, [language, requestCampusTts, selectedCampusIndex]);

  const promptCampusRoomSelection = useCallback(() => {
    const labels = campusLabels(language);
    requestCampusTts(labels.selectRoomPrompt || labels.selectPrompt, 'select-room');
  }, [language, requestCampusTts]);

  const openCampusNavigation = useCallback(() => {
    stopListening();
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
      setIsPlayingBackendAudio(false);
    }
    currentUiLockRef.current = 'CARD';
    const latestVisibleClara = [...displayMessages]
      .reverse()
      .find((m) => isTextMessage(m) && m.role === 'clara' && !(m as any).isHidden && !(m as any).isCardData) as ChatMessage | undefined;
    const latestUser = [...displayMessages]
      .reverse()
      .find((m) => isTextMessage(m) && m.role === 'user') as ChatMessage | undefined;
    savedChatFocusRef.current =
      visuallyFocusedMessage ??
      latestVisibleClara ??
      (latestUser && isTextMessage(latestUser)
        ? {
            id: 'campus-return-last-question',
            role: 'clara',
            text: latestUser.text,
          }
        : null);
    clearCardStages();
    setIsCampusNavigationStage(true);
    setSelectedCampusIndex(0);
    setHasCampusRoomSelection(false);
    setShowCampusReturnSuggestions(false);
    setLayoutMode('SPLIT_CARDS');
  }, [clearCardStages, displayMessages, setLayoutMode, stopListening, visuallyFocusedMessage]);

  const returnToChatFromCampus = useCallback(() => {
    stopCampusSpeech();
    setIsCampusNavigationStage(false);
    currentUiLockRef.current = 'IDLE';
    setLayoutMode('FULL_TEXT');
    setVisuallyFocusedMessage(savedChatFocusRef.current);
    setShowCampusReturnSuggestions(true);
  }, [setLayoutMode, stopCampusSpeech]);

  // Sync Card Progression with Backend Audio Duration
  const handleAudioPlayback = useCallback(
    (audioBase64: string, segmentKey: string, isOverview: boolean, cardsToSync: any[] | null) => {
    // Dedupe by a per-segment key (not just per-turn), because the backend can stream
    // multiple TTS segments for the same `turn_id` (ack + first sentence + remainder).
    if (playedSegmentKeysRef.current.has(segmentKey)) return;
    playedSegmentKeysRef.current.add(segmentKey);

    if (cardProgressTimerRef.current) {
        clearInterval(cardProgressTimerRef.current);
        cardProgressTimerRef.current = null;
    }
    if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
    }

    const audio = new Audio(`data:audio/wav;base64,${audioBase64}`);
    currentAudioRef.current = audio;
    setIsPlayingBackendAudio(true);

    const startSync = (duration: number) => {
        if (!isOverview || !cardsToSync) return;
        const totalDurationMs = duration * 1000;
        const intervalTime = totalDurationMs / cardsToSync.length;
        let idx = 0;
        setCurrentCardIdx(0);
        if (cardProgressTimerRef.current) {
            clearInterval(cardProgressTimerRef.current);
            cardProgressTimerRef.current = null;
        }
        const interval = setInterval(() => {
            idx++;
            if (idx < cardsToSync.length) {
                setCurrentCardIdx(idx);
            } else {
                clearInterval(interval);
                cardProgressTimerRef.current = null;
            }
        }, intervalTime);
        cardProgressTimerRef.current = interval;
    };

    audio.onloadedmetadata = () => {
        setCurrentAudioDuration(audio.duration);
        startSync(audio.duration);
    };
    setTimeout(() => { 
        if (isOverview && audio.duration) {
            setCurrentAudioDuration(audio.duration);
            startSync(audio.duration); 
        }
    }, 1000);

    audio.onended = () => {
        if (cardProgressTimerRef.current) {
            clearInterval(cardProgressTimerRef.current);
            cardProgressTimerRef.current = null;
        }
        setIsPlayingBackendAudio(false);
        setIsCampusSpeaking(false);
        setHasGreeted(true); // Session is active after any Clara audio completes
        if (isOverview && cardsToSync && cardsToSync.length > 0) {
            setCurrentCardIdx(cardsToSync.length - 1);
        }
    };

    audio.play().catch(err => {
        // Helps debug when the browser blocks autoplay or decoding fails.
        if (import.meta.env.DEV) {
          console.error('[CLARA_TTS] audio.play() failed', {
            segmentKey,
            error: err instanceof Error ? err.message : String(err),
          });
        }
        if (cardProgressTimerRef.current) {
            clearInterval(cardProgressTimerRef.current);
            cardProgressTimerRef.current = null;
        }
        setIsPlayingBackendAudio(false);
        setIsCampusSpeaking(false);
        setHasGreeted(true); // Fallback so they can progress
        setShowUnmuteHint(true);
    });
  }, []);

  useEffect(() => {
    if (!showLanguageOverlay || !inlineLanguageGate || languageGateSatisfied) return;
    if (languagePromptRequestedRef.current) return;
    if (payload && isPayloadStale?.(payload)) return;

    // Wait until the 3x2 bubbles have completed their staggered entrance, then speak the prompt.
    const t = window.setTimeout(() => {
      if (languagePromptRequestedRef.current) return;
      languagePromptRequestedRef.current = true;
      const promptAudio = payload?.languagePromptAudioBase64;
      if (typeof promptAudio === 'string' && promptAudio.length > 0) {
        const audioSig = `${promptAudio.length}:${promptAudio.slice(0, 24)}`;
        handleAudioPlayback(promptAudio, `language_gate_prompt|${audioSig}`, false, null);
      } else {
        sendMessage({ action: 'language_gate_prompt' });
      }
    }, 1300);
    return () => window.clearTimeout(t);
  }, [
    showLanguageOverlay,
    inlineLanguageGate,
    languageGateSatisfied,
    payload?.languagePromptAudioBase64,
    handleAudioPlayback,
    sendMessage,
    isPayloadStale,
  ]);

  // Sync from payload
  useEffect(() => {
    if (!payload) return;
    if (isPayloadStale?.(payload)) return;

    // Helper to detect if the backend is sending us a fallback message ("Go to admissions block")
    const isFallbackMessage = (text: string) => {
      const t = text.toLowerCase();
      return t.includes('admission block') || 
             t.includes('admissions block') || 
             t.includes('एडमिशन ब्लॉक') || 
             t.includes('अडमिशन ब्लॉक') ||
             t.includes('सबसे सटीक जानकारी');
    };
    
    // Fall back to client-side interpreted intent if the backend missed it due to NLP multi-lingual blindspots
    const nativeTrigger = payload?.showCard;
    const cardTrigger = normalizeCardTrigger(nativeTrigger);
    const payloadMessageList = Array.isArray(payload?.messages) ? payload.messages : [];
    const isResponseReady = payload?.isProcessing !== true && payloadMessageList.length > 0;
    
    const departmentIdFromPayload = typeof payload?.departmentId === 'string' ? payload.departmentId : null;
    const rawTargetDept = payload?.targetDepartment ?? payload?.target_department ?? departmentIdFromPayload;
    const localDeptLabel = null;
    // Click-driven department flows must always trust the locally clicked department.
    const shouldPreferLocalDepartment =
      Boolean(localDeptLabel) &&
      (cardTrigger === 'department_overview' || cardTrigger === 'department_fees' || cardTrigger === 'hod');
    const targetDepartment = shouldPreferLocalDepartment
      ? localDeptLabel
      : (rawTargetDept || localDeptLabel || null);

    
    // STICKY STATE: Only update if we have a fresh target, otherwise preserve existing for this turn
    if (targetDepartment && targetDepartment !== '') {
      setActiveTargetDepartment(targetDepartment);
      // Also sync back to activeDepartmentId if we are in an overview stage
      if (isDepartmentOverviewStage) {
        setActiveDepartmentId(targetDepartment);
      }
    }

    const menuOptionsFromPayload = Array.isArray(payload?.options)
      ? payload.options.filter((x: unknown) => typeof x === 'string')
      : [];
    const audioBase64 = payload?.audioBase64;
    const turnId = payload?.turn_id ?? 'greeting';
    const type = payload?.type ?? '';
    const utteranceKind = payload?.utterance_kind ?? '';
    const segmentIndex = payload?.segment_index ?? 0;
    const isFinalSegment = payload?.is_final_segment ?? true;
    // Small signature so missing metadata cannot cause false collisions.
    const audioSig = `${audioBase64?.length ?? 0}:${audioBase64?.slice(0, 24) ?? ''}`;
    const segmentKey = [turnId, type, utteranceKind, segmentIndex, isFinalSegment, audioSig].join('|');
    if (typeof audioBase64 === 'string' && audioBase64.length > 0) {
      const estimatedDuration = estimateWavDurationSeconds(audioBase64);
      if (estimatedDuration) {
        setCurrentAudioDuration(estimatedDuration);
      }
    }

    if (type === 'campus_navigation_tts') {
      if (audioBase64) {
        setPendingAudio({
          audioBase64,
          segmentKey,
          isOverview: false,
          cardsToSync: null,
          targetLayout: 'SPLIT_CARDS',
        });
      } else {
        setIsCampusSpeaking(false);
      }
      return;
    }

    // Defer all split-card transitions until the turn has finalized messages.
    if (cardTrigger && cardTrigger !== 'documents' && !isResponseReady) {
      if (audioBase64) {
        setPendingAudio({
          audioBase64,
          segmentKey,
          isOverview: false,
          cardsToSync: null,
          targetLayout: 'FULL_TEXT',
        });
      }
      return;
    }

    // Keep Fees card sticky for the active response stream.
    // Some backend chunks can arrive without `showCard: "fees"` (or with a generic fallback trigger),
    // which previously caused a temporary switch back to FULL_TEXT while TTS was still speaking.
    if (isFeesStage && currentUiLockRef.current === 'CARD' && cardTrigger !== 'department_fees') {
      setLayoutMode('SPLIT_CARDS');
      if (audioBase64) {
        setPendingAudio({
          audioBase64,
          segmentKey,
          isOverview: false,
          cardsToSync: null,
          targetLayout: 'SPLIT_CARDS',
        });
      }
      return;
    }

    if (cardTrigger === 'course_menu') {
      currentUiLockRef.current = 'CARD';
      setLayoutMode('SPLIT_CARDS');
      setActiveCards(null);
      setCurrentCardIdx(0);
      setSuppressedTurnId(null);
      setActiveDepartmentId(null);
      setIsDepartmentOverviewStage(false);
      setIsInfoSlideStage(false);
      setInfoSlides([]);
      setInfoSlideChip('');
      setIsFeesStage(false);
      setActiveFeesDepartmentId(null);
      setIsDocumentsStage(false);
      setCourseMenuOptions(menuOptionsFromPayload.length ? menuOptionsFromPayload : DEFAULT_COURSE_MENU_OPTIONS);
      if (audioBase64) {
        setPendingAudio({
          audioBase64,
          segmentKey,
          isOverview: false,
          cardsToSync: null,
          targetLayout: 'SPLIT_CARDS',
        });
      }
      return;
    }

    if (cardTrigger === 'admissions' || cardTrigger === 'college_overview' || cardTrigger === 'trustees') {
      // These intents are answered by the backend LLM as text; no card UI.
      setCourseMenuOptions([]);
      setIsDepartmentOverviewStage(false);
      setActiveDepartmentId(null);
      setIsInfoSlideStage(false);
      setInfoSlides([]);
      setInfoSlideChip('');
      setIsHodStage(false);
      setIsFeesStage(false);
      setActiveFeesDepartmentId(null);
      setIsDocumentsStage(false);
      currentUiLockRef.current = 'TEXT';
      setLayoutMode('FULL_TEXT');
      if (audioBase64) {
        setPendingAudio({
          audioBase64,
          segmentKey,
          isOverview: false,
          cardsToSync: null,
          targetLayout: 'FULL_TEXT',
        });
      }
      return;
    }

    if (cardTrigger === 'placements') {
      currentUiLockRef.current = 'CARD';
      setIsHodStage(false);
      setIsDepartmentOverviewStage(false);
      setActiveDepartmentId(null);
      setCourseMenuOptions([]);
      setIsFeesStage(false);
      setActiveFeesDepartmentId(null);
      setIsDocumentsStage(false);
      setIsInfoSlideStage(true);
      const chips = INFO_STAGE_CHIPS[language] ?? INFO_STAGE_CHIPS.English;
      setInfoSlideChip(chips.placements);
      const slides = buildPlacementCardsFromLocale(collegeData, language);
      setInfoSlides(slides);
      
      setLayoutMode('SPLIT_CARDS');
      setActiveCards(null);
      if (audioBase64) {
        setPendingAudio({
          audioBase64,
          segmentKey,
          isOverview: true,
          cardsToSync: slides.map(s => ({ title: s.title, content: s.content, type: 'dept' })),
          targetLayout: 'SPLIT_CARDS',
        });
      }
      return;
    }

    if (cardTrigger === 'hod') {
      setIsFeesStage(false);
      setActiveFeesDepartmentId(null);
      setIsDocumentsStage(false);
      const targetDept = String(targetDepartment || '').trim();
      if (targetDept) {
        // Any department with a valid label — lock onto the HOD card stage.
        // LeadershipOverview will pick the correct component from its COMPONENT_MAP.
        setIsInfoSlideStage(false);
        setInfoSlides([]);
        setInfoSlideChip('');
        setIsDepartmentOverviewStage(false);
        setActiveDepartmentId(null);
        setCourseMenuOptions([]);

        currentUiLockRef.current = 'CARD';
        setIsHodStage(true);
        setLayoutMode('SPLIT_CARDS');
      } else if (currentUiLockRef.current !== 'CARD') {
        // No department resolved — only go to text if we haven't already locked a card
        setLayoutMode('FULL_TEXT');
      }
      return;
    }

    if (cardTrigger === 'placements') {
      setIsFeesStage(false);
      setActiveFeesDepartmentId(null);
      setIsDocumentsStage(false);
      setCourseMenuOptions([]);
      setIsDepartmentOverviewStage(false);
      setActiveDepartmentId(null);
      setIsInfoSlideStage(true);
      const chips = INFO_STAGE_CHIPS[language] ?? INFO_STAGE_CHIPS.English;
      setInfoSlideChip(chips.placements);
      const slides = buildPlacementCardsFromLocale(collegeData, language);
      setInfoSlides(slides);
      const lastAssistantInPayload = [...payloadMessageList]
        .reverse()
        .find((m: any) => m?.role === 'clara' && typeof m?.id === 'string');
      const assistantMessageId = lastAssistantInPayload?.id ?? null;
      setLayoutMode('SPLIT_CARDS');
      setActiveCards(null);
      setSuppressedTurnId(assistantMessageId ?? turnId);
      if (audioBase64) {
        const syncCards: CardDataItem[] = slides.map((s) => ({
          title: s.title,
          content: s.content,
          type: 'dept',
        }));
        setPendingAudio({
          audioBase64,
          segmentKey,
          isOverview: true,
          cardsToSync: syncCards,
          targetLayout: 'SPLIT_CARDS',
        });
      }
      return;
    }

    if (cardTrigger === 'department_overview') {
      currentUiLockRef.current = 'CARD';
      setIsInfoSlideStage(false);
      setInfoSlides([]);
      setInfoSlideChip('');
      setIsHodStage(false); // Protect against HOD stage bleed-over
      setIsFeesStage(false);
      setActiveFeesDepartmentId(null);
      setIsDocumentsStage(false);
      
      const targetRaw = targetDepartment;
      const targetAll = targetRaw.toLowerCase() === 'all';

      const lastAssistantInPayload = [...payloadMessageList]
        .reverse()
        .find((m: any) => m?.role === 'clara' && typeof m?.id === 'string');
      const assistantMessageId = lastAssistantInPayload?.id ?? null;
      setCourseMenuOptions([]);

      if (targetAll) {
        setIsDepartmentOverviewStage(false);
        setActiveDepartmentId(null);
        const allDeptCards = buildAllDepartmentSummaryCardsFromLocale(collegeData, language);
        setLayoutMode('SPLIT_CARDS');
        setActiveCards(allDeptCards);
        setSuppressedTurnId(assistantMessageId ?? turnId);
        if (audioBase64) {
          setPendingAudio({
            audioBase64,
            segmentKey,
            isOverview: true,
            cardsToSync: allDeptCards,
            targetLayout: 'SPLIT_CARDS',
          });
        }
        return;
      }

      const resolvedDept = normalizeDepartmentMenuKey(departmentIdFromPayload ?? (targetDepartment || ''));

      if (!resolvedDept) {
          // If no department is resolved, and it's not 'all', do not switch layouts.
          // This prevents accidental CSE defaulting for "the department" queries.
          return;
      }

      const jsonKey = menuLabelToJsonKey(resolvedDept);
      if (!jsonKey) {
        // Never force a default department when backend/local resolution is ambiguous.
        return;
      }
      const deptRecord = getDepartmentRecord(collegeData, jsonKey);
      const slides = buildDepartmentSlidesFromRecord(deptRecord, jsonKey, language);
      const syncCards: CardDataItem[] = slides.map((s) => ({
        title: s.title,
        content: s.content,
        type: 'dept',
      }));

      setIsDepartmentOverviewStage(true);
      setActiveDepartmentId(resolvedDept);
      setLayoutMode('SPLIT_CARDS');
      setActiveCards(null);
      setSuppressedTurnId(assistantMessageId ?? turnId);
      if (audioBase64) {
        setPendingAudio({
          audioBase64,
          segmentKey,
          isOverview: true,
          cardsToSync: syncCards,
          targetLayout: 'SPLIT_CARDS',
        });
      }
      return;
    }

    if (cardTrigger === 'department_fees') {
      currentUiLockRef.current = 'CARD';
      setCourseMenuOptions([]);
      setIsDepartmentOverviewStage(false);
      setActiveDepartmentId(null);
      setIsInfoSlideStage(false);
      setInfoSlides([]);
      setInfoSlideChip('');
      setIsHodStage(false);
      setIsDocumentsStage(false);
      setActiveCards(null);
      setSuppressedTurnId(null);
      const resolvedDept = normalizeDepartmentMenuKey(
        String(departmentIdFromPayload || targetDepartment || ''),
      );
      const feeDeptKey =
        menuLabelToJsonKey(resolvedDept ?? '') ??
        menuLabelToJsonKey(String(targetDepartment || '')) ??
        menuLabelToJsonKey(String(departmentIdFromPayload || '')) ??
        null;
      setIsFeesStage(true);
      setActiveFeesDepartmentId(feeDeptKey);
      setLayoutMode('SPLIT_CARDS');

      if (audioBase64) {
        setPendingAudio({
          audioBase64,
          segmentKey,
          isOverview: false,
          cardsToSync: null,
          targetLayout: 'SPLIT_CARDS',
        });
      }
      return;
    }

    if (cardTrigger === 'documents') {
      currentUiLockRef.current = 'CARD';
      setCourseMenuOptions([]);
      setIsDepartmentOverviewStage(false);
      setActiveDepartmentId(null);
      setIsInfoSlideStage(false);
      setInfoSlides([]);
      setInfoSlideChip('');
      setIsHodStage(false);
      setIsFeesStage(false);
      setActiveFeesDepartmentId(null);
      setIsDocumentsStage(true);
      setLayoutMode('SPLIT_CARDS');
      setActiveCards(null);
      setSuppressedTurnId(null);
      if (audioBase64) {
        setPendingAudio({
          audioBase64,
          segmentKey,
          isOverview: false,
          cardsToSync: null,
          targetLayout: 'SPLIT_CARDS',
        });
      }
      return;
    }

    const cardsForTrigger = resolveCardsFromTrigger(cardTrigger);

    if (cardsForTrigger) {
        currentUiLockRef.current = 'CARD';
        setCourseMenuOptions([]);
        setActiveDepartmentId(null);
        setIsDepartmentOverviewStage(false);
        setIsInfoSlideStage(false);
        setInfoSlides([]);
        setInfoSlideChip('');
        setIsFeesStage(false);
        setActiveFeesDepartmentId(null);
        setIsDocumentsStage(false);
        const lastAssistantInPayload = [...payloadMessageList]
          .reverse()
          .find((m: any) => m?.role === 'clara' && typeof m?.id === 'string');
        const assistantMessageId = lastAssistantInPayload?.id ?? null;
        setLayoutMode('SPLIT_CARDS');
        setActiveCards(cardsForTrigger);
        setSuppressedTurnId(assistantMessageId ?? turnId);
        if (audioBase64) {
          setPendingAudio({
            audioBase64,
            segmentKey,
            isOverview: true,
            cardsToSync: cardsForTrigger,
            targetLayout: 'SPLIT_CARDS',
          });
        }
        return;
    }

    // FALLBACK / TEXT-ONLY RESPONSE
    // If a higher priority UI layout (CARD) is already locked, DO NOT override it with text.
    // TEXT-ONLY FALLBACK (NO CARD METADATA)
    // Check if we should block the 'FULL_TEXT' transition because this is a backend failure message
    const combinedContent = payloadMessageList.map((m: any) => m.content).join(' ');
    const isFallback = isFallbackMessage(combinedContent);

    if (currentUiLockRef.current === 'CARD' || (isFallback && activeTargetDepartment)) {
        if (isFallback && activeTargetDepartment) {
            // Backend failed, but we have a department. Stay in SPLIT_CARDS.
            setLayoutMode('SPLIT_CARDS'); 
        }
        if (audioBase64) {
          setPendingAudio({
            audioBase64,
            segmentKey,
            isOverview: false,
            cardsToSync: null,
            targetLayout: 'SPLIT_CARDS', // Play audio gracefully in background alongside locked card
          });
        }
        return; 
    }

    // Valid text progression since no higher priority rules are locked
    currentUiLockRef.current = 'TEXT';
    
    // Resetting behavior completely removed from backend completion chunk parsing (Rule 5)
    // We strictly use `interceptAndSendMessage` to reset on explicitly new inquiries!
    if (audioBase64) {
      setPendingAudio({
        audioBase64,
        segmentKey,
        isOverview: false,
        cardsToSync: null,
        targetLayout: 'FULL_TEXT',
      });
    }

  }, [payload, resolveCardsFromTrigger, collegeData, language, interceptAndSendMessage, isPayloadStale]);

  // Start queued audio only after its target layout is visible.
  useEffect(() => {
    if (!pendingAudio) return;
    if (layoutMode !== pendingAudio.targetLayout) return;
    const delayMs =
      pendingAudio.targetLayout === 'SPLIT_CARDS'
        ? CARD_AUDIO_START_DELAY_MS
        : FULL_TEXT_AUDIO_START_DELAY_MS;
    const timer = setTimeout(() => {
      handleAudioPlayback(
        pendingAudio.audioBase64,
        pendingAudio.segmentKey,
        pendingAudio.isOverview,
        pendingAudio.cardsToSync
      );
      setPendingAudio(current =>
        current?.segmentKey === pendingAudio.segmentKey ? null : current
      );
    }, delayMs);
    return () => clearTimeout(timer);
  }, [pendingAudio, layoutMode, handleAudioPlayback]);

  useEffect(() => {
    if (!isCampusNavigationStage) {
      stopCampusSpeech();
      return;
    }
    const timer = window.setTimeout(() => {
      if (!hasCampusRoomSelection) {
        promptCampusRoomSelection();
      }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [
    hasCampusRoomSelection,
    isCampusNavigationStage,
    selectedCampusIndex,
    language,
    promptCampusRoomSelection,
    stopCampusSpeech,
  ]);

  useEffect(() => {
    return () => stopCampusSpeech();
  }, [stopCampusSpeech]);

  // Time-based reset UI behavior removed to enforce persistent screen state.

  // Orb State — with persistent 'completed' state for post-response guidance
  // "Tap to Speak" stays visible FOREVER until user taps orb or listening starts.
  useEffect(() => {
    // Detect speaking → finished transition
    const wasSpeaking = wasPlayingAudioRef.current;
    wasPlayingAudioRef.current = isPlayingBackendAudio;

    if (isPlayingBackendAudio || isCampusSpeaking) {
      setOrbState('speaking');
    } else if (isProcessing) {
      setOrbState('processing');
    } else if (propIsListening || isPendingListeningRef.current) {
      // User started speaking or explicitly tapped the orb (optimistic listening)
      setOrbState('listening');
    } else if (wasSpeaking && !isPlayingBackendAudio) {
      // CLARA just finished speaking → show 'completed' with "Tap to Speak"
      // This state persists indefinitely — NO auto-timeout.
      // Only cleared when: user taps orb OR listening begins.
      setOrbState('completed');
    } else if (orbState !== 'completed') {
      // Normal idle/ready — never override a persistent completed state
      if (hasGreeted && !showUnmuteHint) setOrbState('ready');
      else setOrbState('idle');
    }
  }, [propIsListening, isProcessing, isPlayingBackendAudio, isCampusSpeaking, hasGreeted, showUnmuteHint]);

  // Auto-Start Listening Loop (ONLY ONCE) — skip while inline language gate is active so the mic does not open over the picker.
  useEffect(() => {
    if (inlineLanguageGate && !languageGateSatisfied) return;
    if (orbState === 'ready' && !propIsListening && voiceInputMode !== 'backend' && !hasAutoStartedRef.current) {
      hasAutoStartedRef.current = true;
      const timer = setTimeout(() => {
        startSpeechRecognition();
      }, 600); // Sustain the 'ready' visual feedback briefly before engaging mic
      return () => clearTimeout(timer);
    }
  }, [
    inlineLanguageGate,
    languageGateSatisfied,
    orbState,
    propIsListening,
    voiceInputMode,
    startSpeechRecognition,
  ]);

  useEffect(() => {
    if (!hasStartedRef.current) {
      hasStartedRef.current = true;
      sendMessage({ action: 'conversation_started' });
    }
  }, [sendMessage]);

  // Clear optimistic listening state once real listening engages
  useEffect(() => {
    if (propIsListening) {
      isPendingListeningRef.current = false;
    }
  }, [propIsListening]);

  const handleOrbTap = () => {
    setShowUnmuteHint(false);
    setHasGreeted(true);
    setShowCampusReturnSuggestions(false);
    setVisuallyFocusedMessage(null);
    
    // IMMEDIATE VISUAL FEEDBACK: Optimistically set listening state
    // so the UI feels instantly responsive. The effect above will clear
    // this when real listening engages or we timeout.
    isPendingListeningRef.current = true;
    setOrbState('listening');
    
    // Safety fallback: if mic fails to engage, drop optimistic state
    setTimeout(() => {
      isPendingListeningRef.current = false;
      // Force a re-render to evaluating state
      setOrbState(prev => prev === 'listening' && !propIsListening ? 'idle' : prev);
    }, 3000);

    if (orbState === 'idle' || orbState === 'ready' || orbState === 'completed') {
      if (voiceInputMode === 'backend') onOrbTap();
      else startSpeechRecognition();
    }
  };

  const handleCardSelect = useCallback((idx: number) => {
    if (cardProgressTimerRef.current) {
      clearInterval(cardProgressTimerRef.current);
      cardProgressTimerRef.current = null;
    }
    setCurrentCardIdx(idx);
  }, []);

  const handleCourseMenuSelect = useCallback(
    (departmentName: string) => {
      setCourseMenuOptions([]);
      
      // DIRECT ACTION MAPPING (UI_CLICK = Deterministic Command)
      // Completely bypass language pipeline by setting state IMMEDIATELY
      currentUiLockRef.current = 'CARD';
      setActiveDepartmentId(departmentName);
      setIsDepartmentOverviewStage(true);
      setLayoutMode('SPLIT_CARDS');
      
      // Notify backend for audio response in current language
      interceptAndSendMessage({
        action: 'user_message',
        text: departmentName,
        localIntent: {
          type: 'department_click',
          departmentLabel: departmentName,
        },
      }, 'UI');
    },
    [interceptAndSendMessage]
  );

  const filteredMessages = useMemo(() => {
    return displayMessages.filter(m => {
       const isHidden = (m as any).isHidden || (m as any).isCardData;
       return !isHidden && (m.id !== suppressedTurnId);
    });
  }, [displayMessages, suppressedTurnId]);
  const recentPanelMessages = useMemo(() => filteredMessages.slice(-4), [filteredMessages]);

  const lastAssistantMsg = visuallyFocusedMessage && isTextMessage(visuallyFocusedMessage) && visuallyFocusedMessage.role === 'clara'
    ? visuallyFocusedMessage
    : null;
  const shouldShowReadySuggestions =
    (lastAssistantMsg?.id === 'ready_prompt' || showCampusReturnSuggestions) &&
    !isProcessing &&
    !showLanguageOverlay &&
    !isAwaitingReadyPrompt;
  const readySuggestions = READY_SUGGESTIONS[language] ?? READY_SUGGESTIONS.English;
  const fullTextMessageClassName = 'word-by-word-text full-text-readable';
  /** English greeting uses Didone-style stack from backend (`greetings.py` → `greetingFontFamily`). */
  const greetingFontStyle = useMemo((): React.CSSProperties | undefined => {
    if (payload && isPayloadStale?.(payload)) return undefined;
    const ff = payload?.greetingFontFamily;
    if (typeof ff !== 'string' || !ff.trim()) return undefined;
    return { fontFamily: ff };
  }, [payload, payload?.greetingFontFamily, isPayloadStale]);
  const fullTextGreetingStyle =
    lastAssistantMsg?.id === 'greeting' ? greetingFontStyle : undefined;
  const languageTaglines = THINKING_TAGLINES[language] ?? THINKING_TAGLINES.English;
  const thinkingTagline = languageTaglines[thinkingIndex % languageTaglines.length];
  const thinkingTitle = THINKING_TITLE[language] ?? THINKING_TITLE.English;
  const thinkingEmoji = THINKING_EMOJIS[thinkingIndex % THINKING_EMOJIS.length];
  const campusCopy = campusLabels(language);
  const selectedCampusDirection = CAMPUS_DIRECTIONS[selectedCampusIndex] ?? CAMPUS_DIRECTIONS[0];
  const selectedCampusSteps = selectedCampusDirection
    ? localizedCampusSteps(selectedCampusDirection, language)
    : [];

  const departmentSlides = useMemo(() => {
    if (!isDepartmentOverviewStage || !activeDepartmentId) return [];
    const jk = menuLabelToJsonKey(activeDepartmentId);
    if (!jk) return [];
    const rec = getDepartmentRecord(collegeData, jk);
    return buildDepartmentSlidesFromRecord(rec, jk, language);
  }, [isDepartmentOverviewStage, activeDepartmentId, collegeData, language]);

  useEffect(() => {
    const prev = prevLayoutModeRef.current;
    if (prev === 'SPLIT_CARDS' && layoutMode === 'FULL_TEXT') {
      setVisuallyFocusedMessage(null);
    }
    prevLayoutModeRef.current = layoutMode;
  }, [layoutMode]);

  useEffect(() => {
    if (layoutMode !== 'SPLIT_CARDS') return;
    const panel = scrollRef.current;
    if (!panel) return;
    const raf = requestAnimationFrame(() => {
      panel.scrollTo({ top: panel.scrollHeight, behavior: 'smooth' });
    });
    return () => cancelAnimationFrame(raf);
  }, [layoutMode, recentPanelMessages, isProcessing, thinkingIndex]);

  return (
    <div className="light-chat-container" data-testid="chat-screen">
      <div className="cinematic-overlay" />

      {/* Global Home Button */}
      <motion.button
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        onClick={handleHomeClick}
        className="premium-home-button"
        title="Go Home"
      >
        <Home className="w-6 h-6" />
      </motion.button>

      {/* Global Quick Actions */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="absolute right-[30px] top-[30px] z-50 flex flex-wrap justify-end gap-2"
      >
        <motion.button
          type="button"
          whileHover={{ scale: 1.04, y: -2, boxShadow: 'none' }}
          whileTap={{ scale: 0.97 }}
          onClick={isCampusNavigationStage ? returnToChatFromCampus : openCampusNavigation}
          className="group flex items-center gap-2 rounded-full border-2 border-[#2a115c]/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.74),rgba(252,231,243,0.58),rgba(167,139,250,0.36))] px-4 py-2.5 text-sm font-semibold text-slate-900 backdrop-blur-xl transition-colors hover:border-[#17072f]/90 hover:bg-white/82"
        >
          {isCampusNavigationStage ? (
            <MessageSquareText className="h-4 w-4 text-[#2a115c]" />
          ) : (
            <MapPinned className="h-4 w-4 text-[#2a115c]" />
          )}
          {isCampusNavigationStage ? campusCopy.chat : campusCopy.campusNavigation}
        </motion.button>
        <motion.button
          type="button"
          whileHover={{ scale: 1.04, y: -2, boxShadow: 'none' }}
          whileTap={{ scale: 0.97 }}
          onClick={() => {
            if (isCampusNavigationStage) returnToChatFromCampus();
            interceptAndSendMessage({ action: 'user_message', text: 'Feedback' }, 'UI');
          }}
          className="group flex items-center gap-2 rounded-full border-2 border-[#2a115c]/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.74),rgba(252,231,243,0.58),rgba(167,139,250,0.36))] px-4 py-2.5 text-sm font-semibold text-slate-900 backdrop-blur-xl transition-colors hover:border-[#17072f]/90 hover:bg-white/82"
        >
          <MessageSquareText className="h-4 w-4 text-[#2a115c]" />
          Feedback
        </motion.button>
      </motion.div>

      {/* ─── GLOBAL CINEMATIC BACKGROUND ─── */}
      <div 
        className="absolute inset-0 w-full h-full z-0 pointer-events-none"
        style={{ 
          backgroundImage: `url(${fullTextBgImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      />

      <LayoutGroup>
        <AnimatePresence mode="wait">
          {/* ─── FULL TEXT MODE ─── */}
          {layoutMode === 'FULL_TEXT' ? (
            <motion.div key="full-text" layoutId="main" className="full-text-layout">

              {/* Center content crossfades from greeting to language bubbles; orb stays anchored below. */}
              <div
                className="full-text-message-stage relative z-10 flex min-h-0 flex-col"
                style={{
                  paddingLeft: '3rem',
                  paddingRight: '3rem',
                  paddingBottom: '1.25rem',
                  paddingTop: 0,
                }}
              >
                <div className="relative flex min-h-0 w-full flex-1 flex-col justify-center">
                  <AnimatePresence mode="wait">
                    {showLanguageOverlay &&
                    inlineLanguageGate &&
                    !languageGateSatisfied &&
                    layoutMode === 'FULL_TEXT' &&
                    !isProcessing ? (
                      <motion.div
                        key="inline-lang-panel"
                        role="region"
                        aria-labelledby="inline-lang-title"
                        initial={{ opacity: 0, y: 44, scale: 0.88, filter: 'blur(18px)', rotateX: -18 }}
                        animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)', rotateX: 0 }}
                        exit={{ opacity: 0, y: -24, scale: 0.96, filter: 'blur(12px)' }}
                        transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
                        className="mx-auto w-full max-w-5xl px-4"
                        style={{ perspective: 1200 }}
                      >
                        <motion.h2
                          id="inline-lang-title"
                          initial={{ opacity: 0, letterSpacing: '0.38em' }}
                          animate={{ opacity: 1, letterSpacing: '0.12em' }}
                          transition={{ duration: 0.9, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                          className="mb-8 text-center text-2xl sm:text-3xl font-semibold uppercase text-slate-900/85"
                          style={{ fontFamily: '"Bodoni Moda", "Libre Bodoni", Didot, "Playfair Display", serif' }}
                        >
                          {t('selectLanguage')}
                        </motion.h2>
                        <div className="grid grid-cols-3 gap-5 sm:gap-6">
                          {LANGUAGE_OPTIONS.map((lang, index) => {
                            const testId = `inline-language-${lang.name.toLowerCase()}`;
                            return (
                              <motion.button
                                key={lang.name}
                                type="button"
                                data-testid={testId}
                                initial={{ opacity: 0, y: 28, scale: 0.86, filter: 'blur(10px)' }}
                                animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                                transition={{
                                  delay: 0.18 + index * 0.06,
                                  duration: 0.62,
                                  ease: [0.16, 1, 0.3, 1],
                                }}
                                whileHover={{
                                  scale: 1.06,
                                  y: -4,
                                  boxShadow: '0 18px 48px rgba(55, 24, 112, 0.24)',
                                }}
                                whileTap={{ scale: 0.97 }}
                                onClick={() => handleInlineLanguagePick(lang.name)}
                                className="group relative min-h-[7rem] overflow-hidden rounded-[1.65rem] border-2 border-[#3b176f]/55 bg-white/55 px-6 py-5 text-center shadow-[0_14px_40px_rgba(55,24,112,0.12)] backdrop-blur-xl transition-colors hover:border-[#2a0f58]/80 hover:bg-white/75"
                              >
                                <span className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent" />
                                <span className="block text-2xl sm:text-3xl font-bold text-slate-950">
                                  {lang.label}
                                </span>
                                <span className="mt-2 block text-[11px] sm:text-xs uppercase tracking-[0.22em] text-slate-500 group-hover:text-indigo-500">
                                  {lang.name}
                                </span>
                              </motion.button>
                            );
                          })}
                        </div>
                      </motion.div>
                    ) : isProcessing ? (
                      <motion.div
                        key="thinking"
                        initial={{ opacity: 0, y: 18, filter: 'blur(10px)' }}
                        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                        exit={{ opacity: 0, y: -18, filter: 'blur(10px)' }}
                        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                        className="clara-thinking-stage"
                      >
                        <div className="clara-thinking-emoji" aria-hidden>{thinkingEmoji}</div>
                        <div className="clara-thinking-title">{thinkingTitle}</div>
                        <div className="clara-thinking-tagline">{thinkingTagline}</div>
                        <div className="clara-thinking-dots" aria-hidden>...</div>
                      </motion.div>
                    ) : lastAssistantMsg && isTextMessage(lastAssistantMsg) && !isAwaitingReadyPrompt ? (
                      <motion.div
                        key={lastAssistantMsg.id ?? lastAssistantMsg.text}
                        initial={{ opacity: 0, y: 18, filter: 'blur(10px)' }}
                        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                        exit={{ opacity: 0, y: -34, scale: 0.96, filter: 'blur(16px)' }}
                        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                        className="full-text-message-wrapper full-text-safe-zone"
                      >
                        <AnimatedAiMessage
                          text={lastAssistantMsg.text}
                          animate={true}
                          audioDuration={currentAudioDuration}
                          className={fullTextMessageClassName}
                          style={fullTextGreetingStyle}
                        />
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>

                <motion.div
                  layoutId="orb-container"
                  className="relative z-40 flex shrink-0 justify-center pb-2 pt-3"
                >
                  <AnimatePresence>
                    {shouldShowReadySuggestions && (
                      <motion.div
                        key="ready-suggestions"
                        initial={{ opacity: 0, y: 24, scale: 0.94, filter: 'blur(10px)' }}
                        animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                        exit={{ opacity: 0, y: 12, scale: 0.96, filter: 'blur(8px)' }}
                        transition={{ duration: 0.72, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
                        className="absolute bottom-[calc(100%+1.2rem)] left-1/2 flex w-[90vw] max-w-5xl -translate-x-1/2 flex-wrap justify-center gap-3 sm:gap-4"
                      >
                        {readySuggestions.map((suggestion, index) => (
                          <motion.button
                            key={suggestion.text}
                            type="button"
                            initial={{ opacity: 0, y: 20, scale: 0.88, filter: 'blur(8px)' }}
                            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                            transition={{
                              delay: 0.28 + index * 0.08,
                              duration: 0.56,
                              ease: [0.16, 1, 0.3, 1],
                            }}
                            whileHover={{
                              scale: 1.04,
                              y: -3,
                              boxShadow: '0 22px 54px rgba(24, 10, 44, 0.34), 0 0 0 1px rgba(255,255,255,0.26) inset',
                            }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => {
                              setShowCampusReturnSuggestions(false);
                              interceptAndSendMessage(
                                { action: 'user_message', text: suggestion.text },
                                'UI'
                              );
                            }}
                            className="group relative w-fit max-w-[18rem] overflow-hidden rounded-full border border-[#2a115c]/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.74),rgba(252,231,243,0.58),rgba(167,139,250,0.36))] px-4 py-2.5 text-center shadow-[0_16px_44px_rgba(24,10,44,0.24),inset_0_1px_0_rgba(255,255,255,0.72),inset_0_0_0_1px_rgba(255,255,255,0.22)] backdrop-blur-xl transition-colors hover:border-[#17072f]/85 hover:bg-white/82"
                          >
                            <span className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent" />
                            <span className="block text-xs sm:text-sm font-bold leading-snug text-slate-900">
                              {suggestion.label}
                            </span>
                          </motion.button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <ChatOrbControl
                    orbState={orbState}
                    isProcessing={isProcessing}
                    amplitude={orbState === 'listening' ? voiceAnalyser.amplitude : (isProcessing ? 0.3 : 0.05)}
                    onTap={handleOrbTap}
                    bottomClassName="absolute -bottom-12 left-1/2 -translate-x-1/2 w-full text-center"
                  />
                </motion.div>

              </div>
              


            </motion.div>

          /* ─── SPLIT CARDS MODE (college/dept/hod/trustees) ─── */
          ) : (
            <motion.div key="split" layoutId="main" className="split-cards-layout">
              <div className="visual-stage-70 flex flex-col items-center">
                {/* Content Layer */}
                <div className="relative z-10 w-full h-full flex flex-col items-center justify-center">

                {isCampusNavigationStage && selectedCampusDirection ? (
                  <CampusNavigationStage
                    direction={selectedCampusDirection}
                    language={language}
                  />
                ) : isHodStage ? (
                  <LeadershipOverview
                    cards={[]}
                    currentCardIdx={0}
                    targetDepartment={activeTargetDepartment}
                  />
                ) : isFeesStage ? (
                  <DepartmentFeesCard departmentId={activeFeesDepartmentId} />
                ) : isDepartmentOverviewStage && activeDepartmentId ? (
                  <DepartmentCardFactory 
                    departmentId={activeDepartmentId}
                    slides={departmentSlides}
                    currentIdx={currentCardIdx}
                    onNext={() => handleCardSelect(Math.min(departmentSlides.length - 1, currentCardIdx + 1))}
                    onPrev={() => handleCardSelect(Math.max(0, currentCardIdx - 1))}
                    onSelectSlide={handleCardSelect}
                    language={language}
                    onClose={() => {
                      setIsDepartmentOverviewStage(false);
                      setActiveDepartmentId(null);
                      currentUiLockRef.current = 'IDLE';
                    }}
                  />
                ) : courseMenuOptions.length > 0 ? (
                  <CourseMenuComponent options={courseMenuOptions} onSelect={handleCourseMenuSelect} />
                ) : isDocumentsStage ? (
                  <DocumentsBlock />
                ) : isInfoSlideStage && infoSlides.length > 0 ? (
                  <DepartmentCardStage
                    departmentLabel=""
                    chipText={infoSlideChip}
                    slides={infoSlides}
                    currentCardIdx={currentCardIdx}
                    onCardClick={handleCardSelect}
                  />
                ) : activeCards && activeCards.length > 0 ? (
                  <LeadershipOverview 
                    cards={activeCards} 
                    currentCardIdx={currentCardIdx} 
                    targetDepartment={activeTargetDepartment}
                    onCardClick={handleCardSelect}
                  />
                ) : null}
                </div>
              </div>
              <motion.aside className="interaction-panel-30">

                <header className="panel-header">
                  <div className="panel-title flex items-center gap-2">
                    <Sparkles size={18} /> {isCampusNavigationStage ? campusCopy.campusNavigation : 'CLARA'}
                  </div>
                </header>
                <div ref={scrollRef} className="panel-messages no-scrollbar">
                  {isCampusNavigationStage && selectedCampusDirection ? (
                    <div className="campus-direction-panel">
                      <label className="campus-select-label" htmlFor="campus-destination-select">
                        {campusCopy.chooseDestination}
                      </label>
                      <select
                        id="campus-destination-select"
                        value={selectedCampusIndex}
                        onChange={(event) => {
                          const nextIndex = Number(event.target.value);
                          setSelectedCampusIndex(nextIndex);
                          setHasCampusRoomSelection(true);
                          speakCampusDirection(nextIndex);
                        }}
                        className="campus-destination-select"
                      >
                        {CAMPUS_DIRECTIONS.map((direction, index) => (
                          <option key={direction.to} value={index}>
                            {direction.to}
                          </option>
                        ))}
                      </select>

                      <div className="campus-direction-card">
                        <span className="campus-direction-kicker">{campusCopy.destination}</span>
                        <h3>{selectedCampusDirection.to}</h3>
                        <div className="campus-direction-meta">
                          <span>{campusCopy.block} {selectedCampusDirection.block}</span>
                          <span>{campusCopy.groundFloor}</span>
                          <span>{selectedCampusDirection.estimated_steps} {campusCopy.steps}</span>
                          <span>{selectedCampusDirection.estimated_time_seconds} {campusCopy.seconds}</span>
                        </div>
                        <ol className="campus-direction-steps">
                          {selectedCampusSteps.map((step, index) => (
                            <li key={`${selectedCampusDirection.to}-${index}`}>{step}</li>
                          ))}
                        </ol>
                      </div>

                      <button
                        type="button"
                        onClick={isCampusSpeaking ? stopCampusSpeech : speakCampusDirection}
                        className="campus-speak-button"
                      >
                        {isCampusSpeaking ? <Square size={16} /> : <Volume2 size={17} />}
                        {isCampusSpeaking ? campusCopy.stop : campusCopy.speak}
                      </button>
                    </div>
                  ) : (
                    <>
                      {recentPanelMessages.map((m, i) => isTextMessage(m) && (
                        m.role === 'user' 
                          ? <div key={m.id || i} className="bubble-user">{m.text}</div>
                          : <AnimatedAiMessage 
                              key={m.id || i} 
                              text={m.text} 
                              animate={i === recentPanelMessages.length - 1}
                              audioDuration={i === recentPanelMessages.length - 1 ? currentAudioDuration : 0}
                              className="bubble-clara"
                              style={m.id === 'greeting' ? greetingFontStyle : undefined}
                            />
                      ))}
                      {isProcessing && (
                        <div className="bubble-clara bubble-thinking">
                          <span aria-hidden>{thinkingEmoji}</span> {thinkingTagline}
                        </div>
                      )}
                    </>
                  )}
                </div>
                
                {!isCampusNavigationStage && (
                  <motion.div 
                    layoutId="orb-container" 
                    className="w-full flex justify-center pb-12"
                  >
                    <ChatOrbControl
                      orbState={orbState}
                      isProcessing={isProcessing}
                      amplitude={orbState === 'listening' ? voiceAnalyser.amplitude : (isProcessing ? 0.3 : 0.05)}
                      onTap={handleOrbTap}
                      bottomClassName="absolute -bottom-10 left-1/2 -translate-x-1/2 w-full text-center"
                    />
                  </motion.div>
                )}
              </motion.aside>
            </motion.div>
          )}
        </AnimatePresence>
      </LayoutGroup>
    </div>
  );
}
