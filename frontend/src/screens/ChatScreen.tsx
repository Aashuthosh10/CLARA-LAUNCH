import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { AnimatePresence, motion, LayoutGroup } from 'motion/react';
import { Sparkles, Volume2, Home } from 'lucide-react';
import { useLanguage, type Language } from '../context/LanguageContext';
import whatsappBgImage from '../assets/whatsapp_bg.png';
import {
  type ChatMessage,
  type OrbState,
  isTextMessage,
} from '../types/chat';
import { useVoiceFrequencyAnalyser } from '../hooks/useVoiceAnalyser';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import VoiceOrb from '../components/VoiceOrb';
import AnimatedAiMessage from '../components/chat/AnimatedAiMessage';
import CourseMenuComponent from '../components/chat/CourseMenuComponent';
import DepartmentCardStage from '../components/chat/DepartmentCardStage';
import LeadershipOverview from '../components/chat/LeadershipOverview';
import { getStaticCardsForTrigger, type CardDataItem } from '../lib/cardData';
import {
  buildAdmissionsCardsFromLocale,
  buildAllDepartmentSummaryCardsFromLocale,
  buildAllHodCardsFromLocale,
  buildDepartmentSlidesFromRecord,
  buildPlacementCardsFromLocale,
  getDepartmentRecord,
  menuLabelToJsonKey,
} from '../lib/collegeLocaleUtils';
import { useCollegeData } from '../hooks/useCollegeData';

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

const INFO_STAGE_CHIPS: Record<Language, { admissions: string; placements: string }> = {
  English: { admissions: 'Admissions & fees', placements: 'Placements & training' },
  Kannada: { admissions: 'ಪ್ರವೇಶ ಮತ್ತು ಶುಲ್ಕ', placements: 'ಪ್ಲೇಸ್‌ಮೆಂಟ್ ಮತ್ತು ತರಬೇತಿ' },
  Hindi: { admissions: 'प्रवेश और शुल्क', placements: 'प्लेसमेंट और प्रशिक्षण' },
  Tamil: { admissions: 'சேர்க்கை மற்றும் கட்டணம்', placements: 'பிளேஸ்மென்ட் மற்றும் பயிற்சி' },
  Telugu: { admissions: 'ప్రవేశం మరియు ఫీజులు', placements: 'ప్లేస్‌మెంట్ మరియు శిక్షణ' },
  Malayalam: { admissions: 'പ്രവേശനവും ഫീസും', placements: 'പ്ലേസ്മെന്റും പരിശീലനവും' },
};

type PendingAudio = {
  audioBase64: string;
  segmentKey: string;
  isOverview: boolean;
  cardsToSync: any[] | null;
  targetLayout: 'FULL_TEXT' | 'SPLIT_CARDS';
};

const normalizeDepartmentMenuKey = (departmentId: string): string => {
  const raw = (departmentId || '').trim();
  const value = raw.toLowerCase();
  if (!value) return 'CSE';
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

interface ChatScreenProps {
  messages: ChatMessage[];
  isListening?: boolean;
  isSpeaking?: boolean;
  isProcessing?: boolean;
  isConnected?: boolean;
  voiceInputMode?: 'browser' | 'backend';
  payload?: any | null;
  onBack: () => void;
  onHome?: () => void;
  onOrbTap: () => void;
  sendMessage: (msg: object) => void;
}

export default function ChatScreen({
  messages: payloadMessages,
  isListening: propIsListening = false,
  isProcessing = false,
  isConnected = true,
  voiceInputMode = 'browser',
  payload,
  onBack,
  onHome,
  onOrbTap,
  sendMessage,
}: ChatScreenProps) {
  const { language } = useLanguage();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [displayMessages, setDisplayMessages] = useState<ChatMessage[]>(payloadMessages);
  
  // Layout Management State
  const [layoutMode, setLayoutMode] = useState<'FULL_TEXT' | 'SPLIT_CARDS'>('FULL_TEXT');
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
  const hasStartedRef = useRef(false);
  const prevLayoutModeRef = useRef<'FULL_TEXT' | 'SPLIT_CARDS'>('FULL_TEXT');
  const hasAutoStartedRef = useRef(false);

  // Audio Playback Ref
  const playedSegmentKeysRef = useRef<Set<string>>(new Set());
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const cardProgressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Intent Classifier & Speech Hooks
  const voiceAnalyser = useVoiceFrequencyAnalyser(orbState === 'listening');
  const { startListening: startSpeechRecognition, stopListening } = useSpeechRecognition(
    sendMessage,
    language,
    () => {},
    () => {}
  );

  // Keep chat history stable when backend emits partial payloads without `messages`.
  useEffect(() => {
    if (Array.isArray(payload?.messages)) {
      const incomingMessages = payload.messages as ChatMessage[];
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
  }, [payload]);

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
    if (onHome) onHome();
  }, [stopListening, onHome]);

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
        setHasGreeted(true); // Fallback so they can progress
        setShowUnmuteHint(true);
    });
  }, []);

  // Sync from payload
  useEffect(() => {
    if (!payload) return;
    const cardTrigger = payload?.showCard;
    const departmentIdFromPayload = typeof payload?.departmentId === 'string' ? payload.departmentId : null;
    const targetDepartment = String(payload?.targetDepartment ?? payload?.target_department ?? departmentIdFromPayload ?? '').trim();
    setActiveTargetDepartment(targetDepartment || null);


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

    if (cardTrigger === 'course_menu') {
      setLayoutMode('SPLIT_CARDS');
      setActiveCards(null);
      setCurrentCardIdx(0);
      setSuppressedTurnId(null);
      setActiveDepartmentId(null);
      setIsDepartmentOverviewStage(false);
      setIsInfoSlideStage(false);
      setInfoSlides([]);
      setInfoSlideChip('');
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

    if (cardTrigger === 'admissions') {
      setCourseMenuOptions([]);
      setIsDepartmentOverviewStage(false);
      setActiveDepartmentId(null);
      setIsInfoSlideStage(true);
      const chips = INFO_STAGE_CHIPS[language] ?? INFO_STAGE_CHIPS.English;
      setInfoSlideChip(chips.admissions);
      const slides = buildAdmissionsCardsFromLocale(collegeData, language);
      setInfoSlides(slides);
      const payloadMessageList = Array.isArray(payload?.messages) ? payload.messages : [];
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

    if (cardTrigger === 'placements') {
      setCourseMenuOptions([]);
      setIsDepartmentOverviewStage(false);
      setActiveDepartmentId(null);
      setIsInfoSlideStage(true);
      const chips = INFO_STAGE_CHIPS[language] ?? INFO_STAGE_CHIPS.English;
      setInfoSlideChip(chips.placements);
      const slides = buildPlacementCardsFromLocale(collegeData, language);
      setInfoSlides(slides);
      const payloadMessageList = Array.isArray(payload?.messages) ? payload.messages : [];
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
      setIsInfoSlideStage(false);
      setInfoSlides([]);
      setInfoSlideChip('');
      const targetRaw = String(
        payload?.targetDepartment ?? payload?.target_department ?? departmentIdFromPayload ?? ''
      ).trim();

      const targetAll = targetRaw.toLowerCase() === 'all';

      const payloadMessageList = Array.isArray(payload?.messages) ? payload.messages : [];
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

      const resolvedDept = normalizeDepartmentMenuKey(departmentIdFromPayload ?? 'CSE');

      const jsonKey = menuLabelToJsonKey(resolvedDept) ?? 'cse';
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

    const cardsForTrigger = resolveCardsFromTrigger(cardTrigger);

    if (cardsForTrigger) {
        setCourseMenuOptions([]);
        setActiveDepartmentId(null);
        setIsDepartmentOverviewStage(false);
        setIsInfoSlideStage(false);
        setInfoSlides([]);
        setInfoSlideChip('');
        const payloadMessageList = Array.isArray(payload?.messages) ? payload.messages : [];
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
    } else {
        // For text-only replies, always move back to full-text before playback.
        if (payload?.isProcessing === false) {
          setLayoutMode('FULL_TEXT');
          setActiveCards(null);
          setCurrentCardIdx(0);
          setSuppressedTurnId(null);
          setActiveDepartmentId(null);
          setIsDepartmentOverviewStage(false);
          setIsInfoSlideStage(false);
          setInfoSlides([]);
          setInfoSlideChip('');
          setCourseMenuOptions([]);
        }
        if (audioBase64) {
          setPendingAudio({
            audioBase64,
            segmentKey,
            isOverview: false,
            cardsToSync: null,
            targetLayout: 'FULL_TEXT',
          });
        }
    }
  }, [payload, resolveCardsFromTrigger, collegeData, language]);

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

  // Time-based reset UI behavior removed to enforce persistent screen state.

  // Orb State
  useEffect(() => {
    if (isPlayingBackendAudio) setOrbState('speaking');
    else if (isProcessing) setOrbState('processing');
    else if (propIsListening) setOrbState('listening');
    else if (hasGreeted && !showUnmuteHint) setOrbState('ready');
    else setOrbState('idle');
  }, [propIsListening, isProcessing, isPlayingBackendAudio, hasGreeted, showUnmuteHint]);

  // Auto-Start Listening Loop (ONLY ONCE)
  useEffect(() => {
    if (orbState === 'ready' && !propIsListening && voiceInputMode !== 'backend' && !hasAutoStartedRef.current) {
      hasAutoStartedRef.current = true;
      const timer = setTimeout(() => {
        startSpeechRecognition();
      }, 600); // Sustain the 'ready' visual feedback briefly before engaging mic
      return () => clearTimeout(timer);
    }
  }, [orbState, propIsListening, voiceInputMode, startSpeechRecognition]);

  useEffect(() => {
    if (!hasStartedRef.current) {
      hasStartedRef.current = true;
      sendMessage({ action: 'conversation_started' });
    }
  }, [sendMessage]);

  const handleOrbTap = () => {
    setShowUnmuteHint(false);
    setHasGreeted(true);
    setVisuallyFocusedMessage(null);
    if (orbState === 'idle' || orbState === 'ready') {
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
      sendMessage({
        action: 'user_message',
        text: `Tell me about the ${departmentName} department`,
      });
    },
    [sendMessage]
  );

  const filteredMessages = useMemo(() => {
    return displayMessages.filter(m => {
       const isHidden = (m as any).isHidden || (m as any).isCardData;
       return !isHidden && (m.id !== suppressedTurnId);
    });
  }, [displayMessages, suppressedTurnId]);

  const lastAssistantMsg = visuallyFocusedMessage && isTextMessage(visuallyFocusedMessage) && visuallyFocusedMessage.role === 'clara'
    ? visuallyFocusedMessage
    : null;
  const fullTextMessageClassName = 'word-by-word-text full-text-readable';
  const languageTaglines = THINKING_TAGLINES[language] ?? THINKING_TAGLINES.English;
  const thinkingTagline = languageTaglines[thinkingIndex % languageTaglines.length];
  const thinkingTitle = THINKING_TITLE[language] ?? THINKING_TITLE.English;
  const thinkingEmoji = THINKING_EMOJIS[thinkingIndex % THINKING_EMOJIS.length];

  const departmentSlides = useMemo(() => {
    if (!isDepartmentOverviewStage || !activeDepartmentId) return [];
    const jk = menuLabelToJsonKey(activeDepartmentId) ?? 'cse';
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
  }, [layoutMode, filteredMessages, isProcessing, thinkingIndex]);

  return (
    <div className="light-chat-container" data-testid="chat-screen">
      <div className="cinematic-overlay" />
      <LayoutGroup>
        <AnimatePresence mode="wait">
          {/* ─── FULL TEXT MODE ─── */}
          {layoutMode === 'FULL_TEXT' ? (
            <motion.div key="full-text" layoutId="main" className="full-text-layout">
              {/* Clean top — no debug labels */}
              <div className="full-text-message-stage">
                {isProcessing ? (
                  <div className="clara-thinking-stage">
                    <div className="clara-thinking-emoji" aria-hidden>{thinkingEmoji}</div>
                    <div className="clara-thinking-title">{thinkingTitle}</div>
                    <div className="clara-thinking-tagline">{thinkingTagline}</div>
                    <div className="clara-thinking-dots" aria-hidden>...</div>
                  </div>
                ) : (
                  lastAssistantMsg && isTextMessage(lastAssistantMsg) && (
                    <div className="full-text-message-wrapper full-text-safe-zone">
                      <AnimatedAiMessage 
                        text={lastAssistantMsg.text} 
                        animate={true}
                        audioDuration={currentAudioDuration}
                        className={fullTextMessageClassName}
                      />
                    </div>
                  )
                )}
              </div>
              <motion.div layoutId="orb" className="orb-float-bottom relative">
                {showUnmuteHint && (
                  <div className="absolute -top-16 left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-800 text-white px-4 py-2 rounded-full text-xs flex items-center gap-2 shadow-lg">
                    <Volume2 size={14} /> Tap to Unmute
                  </div>
                )}
                <VoiceOrb state={orbState} amplitude={voiceAnalyser.amplitude} onTap={handleOrbTap} />
              </motion.div>
            </motion.div>

          /* ─── SPLIT CARDS MODE (college/dept/hod/trustees) ─── */
          ) : (
            <motion.div key="split" layoutId="main" className="split-cards-layout">
              <div className="visual-stage-70 flex flex-col items-center">
                {/* Custom WhatsApp Watermark Overlay */}
                <div 
                  className="absolute inset-0 z-0 opacity-100 pointer-events-none"
                  style={{
                    backgroundImage: `url(${whatsappBgImage})`,
                    backgroundSize: '250px 250px',
                    backgroundRepeat: 'repeat',
                  }}
                />

                {/* Content Layer */}
                <div className="relative z-10 w-full h-full flex flex-col items-center justify-center">

                {/* HOME BUTTON (TOP-LEFT OF LEFT PANEL) */}
                <motion.button
                  initial={{ y: -20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.5, duration: 0.8 }}
                  whileHover={{ scale: 1.03, backgroundColor: 'rgba(255, 255, 255, 0.12)' }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleHomeClick}
                  className="absolute z-[50] flex items-center justify-center w-16 h-16 rounded-2xl glass interactive-button group"
                  style={{ top: '20px', left: '20px' }}
                >
                  <Home className="w-6 h-6 text-slate-600 group-hover:text-slate-900 transition-colors" />
                </motion.button>

                {isDepartmentOverviewStage && activeDepartmentId ? (
                  <DepartmentCardStage
                    departmentLabel={activeDepartmentId}
                    slides={departmentSlides}
                    currentCardIdx={currentCardIdx}
                    onCardClick={handleCardSelect}
                  />
                ) : isInfoSlideStage && infoSlides.length > 0 ? (
                  <DepartmentCardStage
                    departmentLabel=""
                    chipText={infoSlideChip}
                    slides={infoSlides}
                    currentCardIdx={currentCardIdx}
                    onCardClick={handleCardSelect}
                  />
                ) : courseMenuOptions.length > 0 ? (
                  <CourseMenuComponent options={courseMenuOptions} onSelect={handleCourseMenuSelect} />
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

                <header className="panel-header"><div className="panel-title flex items-center gap-2"><Sparkles size={18} /> CLARA</div></header>
                <div ref={scrollRef} className="panel-messages no-scrollbar">
                  {filteredMessages.map((m, i) => isTextMessage(m) && (
                    m.role === 'user' 
                      ? <div key={m.id || i} className="bubble-user">{m.text}</div>
                      : <AnimatedAiMessage 
                          key={m.id || i} 
                          text={m.text} 
                          animate={i === filteredMessages.length - 1}
                          audioDuration={i === filteredMessages.length - 1 ? currentAudioDuration : 0}
                          className="bubble-clara" 
                        />
                  ))}
                  {isProcessing && (
                    <div className="bubble-clara bubble-thinking">
                      <span aria-hidden>{thinkingEmoji}</span> {thinkingTagline}
                    </div>
                  )}
                </div>
                <div className="orb-float-panel">
                  <VoiceOrb state={orbState} amplitude={voiceAnalyser.amplitude} onTap={handleOrbTap} />
                </div>
              </motion.aside>
            </motion.div>
          )}
        </AnimatePresence>
      </LayoutGroup>
    </div>
  );
}
