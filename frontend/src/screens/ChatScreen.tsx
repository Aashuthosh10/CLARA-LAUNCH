import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { AnimatePresence, motion, useAnimationFrame, useMotionValue, useTransform } from 'motion/react';
import { Sparkles, Home, MapPinned, MessageSquareText, Square, Volume2, FileText, X } from 'lucide-react';
import { useLanguage, type Language } from '../context/LanguageContext';
import whatsappBgImage from '../assets/whatsapp_bg.png';
import fullTextBgImage from '../assets/full_text_bg.png';
import collegeBrochurePdfUrl from '../assets/College brochure/svit_brochure.pdf?url';
import {
  type ChatMessage,
  type OrbState,
  type TextMessage,
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
import PremiumPrincipalCard from '../components/chat/cards/DepartmentCards/PremiumPrincipalCard';
import PremiumVicePrincipalCard from '../components/chat/cards/DepartmentCards/PremiumVicePrincipalCard';
import DocumentsBlock from '../components/chat/cards/DocumentsBlock';
import Trustees from '../components/chat/cards/Trustees/Trustees';
import DepartmentComparisonCinema from '../components/comparison/DepartmentComparisonCinema';
import BusRoutesFullscreen from '../components/bus/BusRoutesFullscreen';
import ChatOrbControl from './chat/ChatOrbControl';
import { useChatLayoutReducer, type ChatLayoutMode } from './chat/useChatLayoutReducer';
import { countGraphemes, useResponseLayout } from '../features/chat/layout';
import {
  FAQ_TICKER_SPEED_PX_PER_MS,
  useFaqTickerLayout,
  type FaqTickerLayout,
} from '../features/chat/faq';
import { getScriptTypography } from '../features/chat/typography';
import { resolvePagedPlayback, useAudioPlaybackClock } from '../features/chat/reveal';
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
  type CampusDirection,
  type CampusMatchApiRoom,
  type CampusNavigationRouteMode,
  type CampusRouteResult,
  CampusNavigationMapOnly,
  campusDirectionFromMapMatch,
  campusLabels,
  campusSpeechText,
  getCampusRouteApi,
  legacyCampusIndexForCode,
  localizedCampusSteps,
  matchCampusTranscriptApi,
} from '../campus-navigation';
import { parseRoomCodeFromDestinationLabel } from '../campus-navigation/campusMapGeometry';

function campusNavigationRouteModeToApi(mode: CampusNavigationRouteMode): string {
  switch (mode) {
    case 'accessible':
      return 'accessible';
    case 'lift':
      return 'lift';
    case 'stairs':
      return 'stairs';
    default:
      return 'shortest';
  }
}
import {
  inferFaqCategories,
  selectFaqSuggestions,
  type FaqSuggestionCategory,
} from '../data/faqSuggestions';
import { inferForcedBusRoutesFromUserText } from '../lib/busRoutesIntent';
import { inferForcedDepartmentComparisonFromUserText } from '../lib/departmentComparisonIntent';
import { inferExecutiveProfileFromUserText } from '../lib/executiveLeadershipIntent';
import type { ExecutiveLeadershipKind } from '../lib/executiveLeadershipIntent';
import type { ClaraChatSurface } from '../types/chatSurface';
import type { FaceChannel } from '../hooks/useFaceChannel';
import { inferEmotionFromPayload } from '../lib/faceEmotion';

declare global {
  interface Window {
    __CLARA_TEST_SEND_MESSAGE?: (text: string) => void;
  }
}

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
const CARD_AUDIO_START_DELAY_MS = 220;
const FULL_TEXT_AUDIO_START_DELAY_MS = 0;
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

type PendingAudio = {
  audioBase64: string;
  segmentKey: string;
  turnId: string;
  isOverview: boolean;
  cardsToSync: any[] | null;
  targetLayout: 'FULL_TEXT' | 'SPLIT_CARDS';
};

/** Backend may stream multiple WAV chunks under one turn; defer single-clip pending until queue drains. */
function shouldDeferAssistantTtsToStream(p: unknown): boolean {
  if (!p || typeof p !== 'object') return false;
  const o = p as Record<string, unknown>;
  if (o.type !== 'assistant_audio_update') return false;
  if (o.tts_streaming === true) return true;
  if (Array.isArray(o.tts_audio_queue) && o.tts_audio_queue.length > 0) return true;
  return false;
}

type VisibleFaqSuggestion = {
  id: string;
  text: string;
};

type NarrationPlan = {
  turnId: string;
  mode: 'card_narration';
  segments: {
    segmentId: string;
    displayText: string;
    ttsText: string;
    cardIndex: number | null;
    cardId: string | null;
    isFinalSegment: boolean;
  }[];
};

const FAQ_CAROUSEL_INTERVAL_MS = 3600;
const GENERAL_FAQ_CATEGORIES: FaqSuggestionCategory[] = ['college', 'campus', 'admissions', 'placements'];
/** Must match `row_order.length` in `departmentComparison.json` (3 narrative beats). */
const COMPARISON_NARRATION_SECTIONS = 3;

function processResponseSentences(value: unknown): string[] {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  if (!text) return [];
  const matches = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [];
  return matches.map((sentence) => sentence.trim()).filter(Boolean);
}

function payloadResponseText(payload: any, fallback: string): string {
  if (payload?.event === 'error' || payload?.errorCode) return fallback ?? '';
  return String(payload?.responseText ?? payload?.assistantText ?? fallback ?? '');
}

/** Face lip-sync needs text; streaming often plays audio before `responseText` is populated. */
function payloadAssistantSpeechText(payload: any): string {
  const direct = payloadResponseText(payload, '').trim();
  if (direct.length > 0) return direct;
  const messages = Array.isArray(payload?.messages) ? payload.messages : [];
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i] as { role?: string; text?: string; isHidden?: boolean; isCardData?: boolean };
    if (!m || String(m.role ?? '').toLowerCase() !== 'clara') continue;
    if (m.isHidden || m.isCardData) continue;
    const t = typeof m.text === 'string' ? m.text.trim() : '';
    if (t.length > 0) return t;
  }
  const spoken = typeof payload?.spokenText === 'string' ? payload.spokenText.trim() : '';
  if (spoken.length > 0) return spoken;
  return '';
}

function finitePositiveMs(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
}

function fallbackSentenceDurationMs(sentence: string): number {
  return Math.max(600, sentence.length * 40);
}

function allocateSentenceDurations(sentences: string[], totalMs: number | null): number[] {
  if (!sentences.length) return [];
  if (!totalMs || totalMs <= 0) {
    return sentences.map(fallbackSentenceDurationMs);
  }

  const roundedTotal = Math.max(sentences.length, Math.round(totalMs));
  const weights = sentences.map((sentence) => Math.max(1, sentence.replace(/\s+/g, '').length));
  const weightTotal = weights.reduce((sum, weight) => sum + weight, 0);
  const durations = weights.map((weight) => Math.max(1, Math.round((roundedTotal * weight) / weightTotal)));
  let delta = roundedTotal - durations.reduce((sum, duration) => sum + duration, 0);
  let i = 0;
  while (delta !== 0 && durations.length > 0) {
    const idx = i % durations.length;
    const step = delta > 0 ? 1 : -1;
    if (durations[idx] + step > 0) {
      durations[idx] += step;
      delta -= step;
    }
    i += 1;
  }
  return durations;
}

// #region agent log
const _agentDbg = (
  hypothesisId: string,
  location: string,
  message: string,
  data: Record<string, unknown>,
  runId = 'pre',
) => {
  if (!import.meta.env.DEV) return;
  // eslint-disable-next-line no-console
  console.debug('[CLARA_AGENT]', hypothesisId, message, { ...data, location, runId });
};
// #endregion

function FaqTickerCard({
  suggestion,
  index,
  layout,
  cycleLength,
  x,
  onSelect,
  scriptClass,
}: {
  suggestion: VisibleFaqSuggestion;
  index: number;
  layout: FaqTickerLayout;
  cycleLength: number;
  x: ReturnType<typeof useMotionValue<number>>;
  onSelect: (id: string, question: string) => void;
  scriptClass: string;
}) {
  const totalWidth = Math.max(1, layout.totalTrackWidth);
  const center = layout.viewportWidth / 2;
  const itemWidth = layout.widths[index % cycleLength] ?? 160;
  const itemOffset = layout.offsets[index % cycleLength] ?? 0;
  const cycleIndex = Math.floor(index / cycleLength);
  const baseOffset = itemOffset + cycleIndex * totalWidth;

  const distanceFromCenter = useTransform(x, (value) => {
    const raw = baseOffset + itemWidth / 2 + value;
    const wrapped = ((raw % totalWidth) + totalWidth) % totalWidth;
    const direct = Math.abs(wrapped - center);
    return Math.min(direct, Math.abs(direct - totalWidth));
  });
  const span = Math.max(120, itemWidth);
  const scale = useTransform(distanceFromCenter, [0, span * 1.25], [1.2, 0.85]);
  const opacity = useTransform(distanceFromCenter, [0, span * 1.4], [1, 0.6]);
  const filter = useTransform(distanceFromCenter, (distance) =>
    distance > span * 0.75 ? 'blur(1px)' : 'blur(0px)',
  );

  return (
    <motion.button
      type="button"
      className={`faq-suggestion-pill ${scriptClass}`}
      style={{ scale, opacity, filter, width: itemWidth, minWidth: itemWidth }}
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.98 }}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(suggestion.id, suggestion.text);
      }}
    >
      {suggestion.text}
    </motion.button>
  );
}

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

const getPayloadMessageText = (m: unknown): string => {
  if (!m || typeof m !== 'object') return '';
  const o = m as { text?: unknown; content?: unknown };
  if (typeof o.text === 'string') return o.text;
  if (typeof o.content === 'string') return o.content;
  return '';
};

const normalizeCardTrigger = (trigger: unknown): string | null => {
  if (typeof trigger !== 'string') return null;
  const n = trigger.trim().toLowerCase();
  if (!n) return null;
  if (n === 'hod_info' || n === 'head_of_department' || n === 'hod_profile') return 'hod';
  if (n === 'dept' || n === 'department') return 'department_overview';
  if (n === 'fees') return 'department_fees';
  if (
    n === 'principal_profile' ||
    n === 'principal' ||
    n === 'principle' ||
    n === 'college_principal' ||
    n === 'principal_card' ||
    n === 'principle_profile' ||
    n === 'principle_card'
  ) {
    return 'principal_profile';
  }
  if (
    n === 'vice_principal_profile' ||
    n === 'vice_principal' ||
    n === 'dean_academics' ||
    n === 'dean_academic' ||
    n === 'dean_of_academics' ||
    n === 'academic_dean'
  ) {
    return 'vice_principal_profile';
  }
  if (n === 'bus_route' || n === 'bus_routes' || n === 'college_bus_routes') {
    return 'bus_routes';
  }
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
  /** Kiosk: reset 1-minute inactivity-to-sleep timer on real user intent. */
  onChatUserActivity?: () => void;
  /** When true, App pauses chat→sleep idle countdown (e.g. college brochure overlay). */
  onChatIdleOverlayChange?: (active: boolean) => void;
  sendMessage: (msg: object) => void;
  /** When true, discard payload-driven updates (ghost session prevention). */
  isPayloadStale?: (p: unknown) => boolean;
  faceChannel?: FaceChannel;
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
  onChatUserActivity,
  onChatIdleOverlayChange,
  sendMessage,
  isPayloadStale,
  faceChannel,
}: ChatScreenProps) {
  const { language, setLanguage, t } = useLanguage();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [displayMessages, setDisplayMessages] = useState<ChatMessage[]>(payloadMessages);
  
  // Layout Management State
  const { layoutMode, setLayoutMode } = useChatLayoutReducer('FULL_TEXT');
  const [activeCards, setActiveCards] = useState<any[] | null>(null);
  const [currentCardIdx, setCurrentCardIdx] = useState(0);
  const [narrationCaption, setNarrationCaption] = useState<string>('');
  const narrationPlanRef = useRef<NarrationPlan | null>(null);
  const [suppressedTurnId, setSuppressedTurnId] = useState<string | null>(null);
  const [currentAudioDuration, setCurrentAudioDuration] = useState<number>(0);
  const [courseMenuOptions, setCourseMenuOptions] = useState<string[]>([]);
  const [activeDepartmentId, setActiveDepartmentId] = useState<string | null>(null);
  const [isDepartmentOverviewStage, setIsDepartmentOverviewStage] = useState(false);
  const [isInfoSlideStage, setIsInfoSlideStage] = useState(false);
  const [infoSlideChip, setInfoSlideChip] = useState('');
  const [infoSlides, setInfoSlides] = useState<{ title: string; content: string }[]>([]);
  const [isHodStage, setIsHodStage] = useState(false);
  const [executiveLeadershipKind, setExecutiveLeadershipKind] = useState<ExecutiveLeadershipKind | null>(
    null,
  );
  const [isFeesStage, setIsFeesStage] = useState(false);
  const [activeFeesDepartmentId, setActiveFeesDepartmentId] = useState<string | null>(null);
  const [isDocumentsStage, setIsDocumentsStage] = useState(false);
  const [isCampusNavigationStage, setIsCampusNavigationStage] = useState(false);
  const [isTrusteesStage, setIsTrusteesStage] = useState(false);
  const [selectedCampusIndex, setSelectedCampusIndex] = useState(0);
  const [isCampusSpeaking, setIsCampusSpeaking] = useState(false);
  const [hasCampusRoomSelection, setHasCampusRoomSelection] = useState(false);
  const [campusRouteMode, setCampusRouteMode] = useState<CampusNavigationRouteMode>('default');
  const [campusRouteResult, setCampusRouteResult] = useState<CampusRouteResult | null>(null);
  const [campusDirectionOverride, setCampusDirectionOverride] = useState<CampusDirection | null>(null);
  const [surface, setSurface] = useState<ClaraChatSurface>('chat');
  const departmentComparisonOpen = surface === 'department_comparison';
  const isBrochureOpen = surface === 'brochure';
  const isBusRoutesSurface = surface === 'bus_routes';

  const [comparisonDeptIds, setComparisonDeptIds] = useState<string[]>([]);
  const [comparisonHighlightId, setComparisonHighlightId] = useState<string | null>(null);
  const [comparisonRecommendFocus, setComparisonRecommendFocus] = useState<string | null>(null);
  const [comparisonNarrationSection, setComparisonNarrationSection] = useState(0);
  const comparisonLayoutSnapRef = useRef<ChatLayoutMode | null>(null);
  const comparisonTtsSyncActiveRef = useRef(false);
  const comparisonSyncModeRef = useRef<'time' | 'clip'>('time');
  const comparisonTotalEstimateSecRef = useRef<number | null>(null);
  const comparisonAccumulatedSecRef = useRef(0);
  const comparisonClipPlayIndexRef = useRef(0);
  const comparisonSlideSinkRef = useRef<(idx: number) => void>(() => {});
  const [showLanguageOverlay, setShowLanguageOverlay] = useState(false);
  const [languageGateSatisfied, setLanguageGateSatisfied] = useState(() => !inlineLanguageGate);
  const isE2EFlow = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).has('e2e');
  }, []);

  // Response Priority Lock (CARD > UI > TEXT)
  const currentUiLockRef = useRef<'CARD' | 'TEXT' | 'IDLE'>('IDLE');
  const lastSuggestionIdsRef = useRef<string[]>([]);
  const lastSuggestionTurnIdRef = useRef<string | null>(null);
  const [faqSuggestions, setFaqSuggestions] = useState<VisibleFaqSuggestion[]>(() =>
    selectFaqSuggestions('English', GENERAL_FAQ_CATEGORIES, []),
  );
  const [faqCarouselIndex, setFaqCarouselIndex] = useState(0);
  const [isFaqCarouselPaused, setIsFaqCarouselPaused] = useState(false);
  const [busRoutesMountKey, setBusRoutesMountKey] = useState(0);
  const [busRoutesHighlightQuery, setBusRoutesHighlightQuery] = useState<string | null>(null);
  const lastPayloadTurnIdRef = useRef<string | null>(null);
  const busRoutesDismissedTurnIdRef = useRef<string | null>(null);
  const closingBusRef = useRef(false);
  const lastTrusteeNarrationKeyRef = useRef<string | null>(null);

  useEffect(() => {
    onChatIdleOverlayChange?.(isBrochureOpen || isBusRoutesSurface);
  }, [isBrochureOpen, isBusRoutesSurface, onChatIdleOverlayChange]);

  useEffect(
    () => () => {
      onChatIdleOverlayChange?.(false);
    },
    [onChatIdleOverlayChange],
  );
  const tickerX = useMotionValue(0);
  const scriptPreset = useMemo(() => getScriptTypography(language), [language]);
  const [faqViewportWidth, setFaqViewportWidth] = useState(() =>
    typeof window !== 'undefined' ? Math.min(980, window.innerWidth * 0.92) : 900,
  );
  useEffect(() => {
    const update = () => setFaqViewportWidth(Math.min(980, window.innerWidth * 0.92));
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  const faqTickerLayout = useFaqTickerLayout(faqSuggestions, language, faqViewportWidth);
  const isResponsePending = isProcessing || Boolean(payload?.audioPending);
  const ensureSuggestions = useCallback(
    (nextSuggestions?: VisibleFaqSuggestion[]) => {
      const base = (nextSuggestions && nextSuggestions.length > 0)
        ? nextSuggestions
        : selectFaqSuggestions(language, GENERAL_FAQ_CATEGORIES, lastSuggestionIdsRef.current);
      const safe = (base.length ? base : selectFaqSuggestions('English', GENERAL_FAQ_CATEGORIES, []))
        .slice(0, 5);
      setFaqSuggestions(safe);
      setFaqCarouselIndex(0);
      tickerX.set(0);
      setIsFaqCarouselPaused(false);
    },
    [language, tickerX],
  );

  const clearSuggestionLayer = useCallback(() => {
    ensureSuggestions();
    lastSuggestionTurnIdRef.current = null;
  }, [ensureSuggestions]);

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
  const [sentenceRevealText, setSentenceRevealText] = useState('');
  const [sentenceRevealTurnId, setSentenceRevealTurnId] = useState<string | null>(null);
  const [isAwaitingReadyPrompt, setIsAwaitingReadyPrompt] = useState(false);
  const hasStartedRef = useRef(false);
  const prevLayoutModeRef = useRef<'FULL_TEXT' | 'SPLIT_CARDS'>('FULL_TEXT');
  const languagePromptRequestedRef = useRef(false);
  const wasPlayingAudioRef = useRef(false);
  const isPendingListeningRef = useRef(false);
  const deferredMessagesRef = useRef<ChatMessage[] | null>(null);
  const deferredTurnIdRef = useRef<string | null>(null);
  const savedChatFocusRef = useRef<ChatMessage | null>(null);
  const campusTtsSerialRef = useRef(0);
  const processCampusVoiceTranscriptRef = useRef<(transcript: string) => void>(() => {});
  const audioPrimedRef = useRef(false);
  const sentenceRevealAbortRef = useRef(0);
  const sentenceRevealKeyRef = useRef<string | null>(null);
  const fullTextScrollRef = useRef<HTMLDivElement | null>(null);
  const latestPayloadRef = useRef<any | null>(payload ?? null);
  const faceChannelRef = useRef<FaceChannel | undefined>(faceChannel);

  // Audio Playback Ref
  const playedSegmentKeysRef = useRef<Set<string>>(new Set());
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const cardProgressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamAudioLayoutRef = useRef<{
    isOverview: boolean;
    cardsToSync: any[] | null;
    targetLayout: 'FULL_TEXT' | 'SPLIT_CARDS';
    turnId: string;
  } | null>(null);
  const ttsStreamQueueRef = useRef<
    {
      audioBase64: string;
      segmentKey: string;
      isOverview: boolean;
      cardsToSync: any[] | null;
      turnId: string;
      totalDurationEstimateMs?: number | null;
    }[]
  >([]);
  const appliedBackendTtsQueueLenRef = useRef(0);
  const lastBackendTtsStreamTurnRef = useRef<string>('');
  const receivedTtsChunkIndicesRef = useRef<Set<number>>(new Set());
  const firstTtsChunkSeenAtRef = useRef<number | null>(null);
  const ttsBufferTimerRef = useRef<number | null>(null);
  const pendingFinalBackupRef = useRef<{
    audioBase64: string;
    segmentKey: string;
    turnId: string;
  } | null>(null);
  const audioLockRef = useRef(false);
  const handleAudioPlaybackRef = useRef<
    | ((
        audioBase64: string,
        segmentKey: string,
        isOverview: boolean,
        cardsToSync: any[] | null,
        _turnId?: string | null,
        audioChainFollowUp?: boolean,
        totalDurationEstimateMs?: number | null,
      ) => void)
    | null
  >(null);
  /** Server `turn_id` for the in-flight assistant reply (set from isProcessing payload). */
  const assistantAudioTurnOwnerRef = useRef<string | null>(null);

  useEffect(() => {
    latestPayloadRef.current = payload ?? null;
    const plan = payload?.narration_plan;
    if (plan && typeof plan === 'object' && plan.mode === 'card_narration' && Array.isArray(plan.segments)) {
      narrationPlanRef.current = plan as NarrationPlan;
    }
  }, [payload]);

  useEffect(() => {
    faceChannelRef.current = faceChannel;
  }, [faceChannel]);

  // Face display: push "thinking" state as soon as backend marks turn processing.
  useEffect(() => {
    if (!payload || isPayloadStale?.(payload)) return;
    if (payload.isProcessing !== true) return;
    const tid = typeof payload.turn_id === 'string' ? payload.turn_id.trim() : '';
    if (!tid) return;
    faceChannelRef.current?.postThinking?.(tid);
  }, [payload, isPayloadStale]);

  // Wraps original sendMessage to sniff for intents dynamically on dispatch.
  // Deterministic FAQ answers are resolved by the backend before Groq/RAG.
  const interceptAndSendMessage = useCallback((msg: any, source: 'VOICE' | 'UI' = 'VOICE') => {
    if (msg?.action === 'user_message' && typeof msg.text === 'string') {
      const trimmed = msg.text.trim();
      if (source === 'VOICE' && isCampusNavigationStage && trimmed) {
        processCampusVoiceTranscriptRef.current(trimmed);
        return;
      }
      clearSuggestionLayer();
      appliedBackendTtsQueueLenRef.current = 0;
      ttsStreamQueueRef.current = [];
      lastBackendTtsStreamTurnRef.current = '';
      receivedTtsChunkIndicesRef.current.clear();
      firstTtsChunkSeenAtRef.current = null;
      if (ttsBufferTimerRef.current) {
        window.clearTimeout(ttsBufferTimerRef.current);
        ttsBufferTimerRef.current = null;
      }
      pendingFinalBackupRef.current = null;
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }
      audioLockRef.current = false;
      streamAudioLayoutRef.current = null;
      assistantAudioTurnOwnerRef.current = null;
      playedSegmentKeysRef.current.clear();
      // Rule 5: navigation clicks (UI source) should not wipe the layout mode.
      if (source === 'VOICE') {
        setSurface('chat');
        comparisonLayoutSnapRef.current = null;
        busRoutesDismissedTurnIdRef.current = null;
        setBusRoutesHighlightQuery(null);
        setLayoutMode('FULL_TEXT');
        setActiveCards(null);
        setCurrentCardIdx(0);
        setSuppressedTurnId(null);
        setIsCampusNavigationStage(false);
        setIsDepartmentOverviewStage(false);
        setActiveDepartmentId(null);
        setIsInfoSlideStage(false);
        setInfoSlides([]);
        setInfoSlideChip('');
        setIsHodStage(false);
        setExecutiveLeadershipKind(null);
        setIsFeesStage(false);
        setActiveFeesDepartmentId(null);
        setIsDocumentsStage(false);
        setCourseMenuOptions([]);
        currentUiLockRef.current = 'IDLE';
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

      const text = typeof msg.text === 'string' ? msg.text : '';
      const isBackgroundNoiseDummy =
        text.includes('BACKGROUND_NOISE') || text.includes('**BACKGROUND_NOISE**');
      if (!isBackgroundNoiseDummy) {
        onChatUserActivity?.();
      }
    }
    sendMessage(msg);
  }, [clearSuggestionLayer, sendMessage, setLayoutMode, onChatUserActivity, isCampusNavigationStage]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.__CLARA_TEST_SEND_MESSAGE = (text: string) => {
      interceptAndSendMessage({ action: 'user_message', text }, 'VOICE');
    };
    return () => {
      delete window.__CLARA_TEST_SEND_MESSAGE;
    };
  }, [interceptAndSendMessage]);

  // Prime browser audio on first user gesture to reduce autoplay blocks in demos/kiosk.
  useEffect(() => {
    const primeAudio = () => {
      if (audioPrimedRef.current) return;
      audioPrimedRef.current = true;
      const probe = new Audio(
        'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA='
      );
      probe.muted = true;
      probe
        .play()
        .then(() => {
          probe.pause();
          probe.currentTime = 0;
        })
        .catch(() => {
          // Best effort only; fallback hint remains in regular playback path.
        });
    };
    window.addEventListener('pointerdown', primeAudio, { once: true });
    window.addEventListener('keydown', primeAudio, { once: true });
    return () => {
      window.removeEventListener('pointerdown', primeAudio);
      window.removeEventListener('keydown', primeAudio);
    };
  }, []);


  // Intent Classifier & Speech Hooks
  const voiceAnalyser = useVoiceFrequencyAnalyser(orbState === 'listening');
  // Browser Speech Rec fallback (used if not relying on backend voice activity detection)
  const handleEmptyTranscript = useCallback(() => {
    if (isCampusNavigationStage) return;
    setShowUnmuteHint(false);
    setIsDepartmentOverviewStage(false);
    setActiveDepartmentId(null);
    interceptAndSendMessage({
      action: 'user_message',
      text: '**BACKGROUND_NOISE** No words detected, returning to idle state.',
    });
  }, [interceptAndSendMessage, isCampusNavigationStage]);

  const handleSpeechError = useCallback((errorCode: string, userMessage: string) => {
    if (errorCode === 'aborted' || !userMessage?.trim()) return;
    if (import.meta.env.DEV) {
      console.warn('[CLARA_SPEECH] browser speech error', { errorCode, userMessage });
    }
    // Ensure UI can recover immediately from browser speech failures.
    setIsCampusSpeaking(false);
    setIsPlayingBackendAudio(false);
    setHasGreeted(true);
    const errorBubble: ChatMessage = {
      id: `speech-error-${Date.now()}`,
      role: 'clara',
      text: userMessage || 'Voice input failed. Try again or type your question.',
    };
    setDisplayMessages((prev) => [...prev, errorBubble]);
    setVisuallyFocusedMessage(errorBubble);

    // Transient browser-STT failures should not permanently own the kiosk answer stage.
    if (errorCode === 'network' || errorCode === 'no-speech') {
      window.setTimeout(() => {
        setVisuallyFocusedMessage((current) =>
          current?.id === errorBubble.id ? null : current,
        );
      }, 4500);
    }
  }, []);

  const { startListening: startSpeechRecognition, stopListening, isListening: speechListening } = useSpeechRecognition(
    interceptAndSendMessage,
    language,
    handleSpeechError,
    handleEmptyTranscript
  );

  // Keep chat history stable when backend emits partial payloads without `messages`.
  useEffect(() => {
    if (payload && isPayloadStale?.(payload)) return;
    if (Array.isArray(payload?.messages)) {
      const incomingMessages = payload.messages as ChatMessage[];
      const hasReadyPrompt = incomingMessages.some((m: any) => m?.id === 'ready_prompt');
      const hasNamePrompt = incomingMessages.some((m: any) => m?.id === 'name_prompt');
      if (
        hasReadyPrompt ||
        hasNamePrompt ||
        payload?.turn_id === 'ready_after_language_pick' ||
        payload?.turn_id === 'name_after_language_pick'
      ) {
        setIsAwaitingReadyPrompt(false);
      }
      const hasAudio = typeof payload?.audioBase64 === 'string' && payload.audioBase64.length > 0;
      const isWaitingForAudio = Boolean(payload?.audioPending);
      const isTerminalTurn = payload?.isProcessing === false;
      if (isTerminalTurn && (hasAudio || isWaitingForAudio)) {
        // Defer message commit until playback kickoff for tighter text-audio sync.
        deferredMessagesRef.current = incomingMessages;
        deferredTurnIdRef.current = payload?.turn_id ?? null;
        if (isWaitingForAudio) {
          setVisuallyFocusedMessage(null);
        }
      } else {
        deferredMessagesRef.current = null;
        deferredTurnIdRef.current = null;
        setDisplayMessages(incomingMessages);
      }
      const isCardTurn = Boolean(payload?.showCard);
      if (isCardTurn) {
        setVisuallyFocusedMessage(null);
      } else if (payload?.isProcessing !== true && !isWaitingForAudio) {
        const latestAssistant = [...incomingMessages]
          .reverse()
          .find((m: any) => m?.role === 'clara' && typeof m?.text === 'string' && !(m as any)?.isHidden && !(m as any)?.isCardData);
        setVisuallyFocusedMessage((latestAssistant as ChatMessage) ?? null);
      }
    }
  }, [payload, isPayloadStale]);

  useEffect(() => {
    if (!isResponsePending) {
      setThinkingIndex(0);
      return;
    }
    const ticker = setInterval(() => {
      setThinkingIndex(prev => prev + 1);
    }, 2200);
    return () => clearInterval(ticker);
  }, [isResponsePending]);

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
        ('role' in m && m.role === 'clara') &&
        !(m as { isHidden?: boolean }).isHidden &&
        typeof (m as { text?: string }).text === 'string'
    );
    if (!hasAssistant || isResponsePending) return;

    const openingTurn = payload?.turn_id === 'greeting_opening';
    const hasOpeningAudio = typeof payload?.audioBase64 === 'string' && payload.audioBase64.length > 0;
    const shouldRevealPicker = isE2EFlow || hasGreeted || (openingTurn && !hasOpeningAudio);
    if (!shouldRevealPicker) return;

    const t = window.setTimeout(() => setShowLanguageOverlay(true), hasOpeningAudio ? 850 : 2200);
    return () => window.clearTimeout(t);
  }, [
    inlineLanguageGate,
    languageGateSatisfied,
    displayMessages,
    isResponsePending,
    hasGreeted,
    isE2EFlow,
    payload?.turn_id,
    payload?.audioBase64,
    isPayloadStale,
  ]);

  const handleInlineLanguagePick = useCallback(
    (lang: Language) => {
      onChatUserActivity?.();
      setLanguage(lang);
      setIsAwaitingReadyPrompt(true);
      clearSuggestionLayer();
      setVisuallyFocusedMessage(null);
      sendMessage({ action: 'language_selected', language: lang });
      setShowLanguageOverlay(false);
      setLanguageGateSatisfied(true);
      onInlineLanguageResolved?.();
    },
    [clearSuggestionLayer, sendMessage, setLanguage, onInlineLanguageResolved, onChatUserActivity]
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

  const handleCloseDepartmentComparison = useCallback(() => {
    comparisonTtsSyncActiveRef.current = false;
    setComparisonNarrationSection(0);
    setSurface('chat');
    const snap = comparisonLayoutSnapRef.current;
    if (snap !== null) setLayoutMode(snap);
    comparisonLayoutSnapRef.current = null;
  }, [setLayoutMode]);

  const handleCloseBusRoutes = useCallback(() => {
    if (closingBusRef.current) return;
    closingBusRef.current = true;
    const tid = lastPayloadTurnIdRef.current;
    if (tid !== null) busRoutesDismissedTurnIdRef.current = tid;
    setSurface('chat');
    setBusRoutesHighlightQuery(null);
    currentUiLockRef.current = 'IDLE';
    const scrollEl = fullTextScrollRef.current;
    if (scrollEl) scrollEl.scrollTop = 0;
    window.setTimeout(() => {
      closingBusRef.current = false;
    }, 220);
  }, []);
  useEffect(() => {
    comparisonSlideSinkRef.current = (idx: number) => {
      setComparisonNarrationSection((prev) => {
        const next = Math.max(0, Math.min(COMPARISON_NARRATION_SECTIONS - 1, idx));
        return prev === next ? prev : next;
      });
    };
  }, []);

  const applyComparisonNarrationSegment = useCallback(
    (seg: NarrationPlan['segments'][number]) => {
      if (!seg || typeof seg !== 'object') return;
      if (seg.cardId?.startsWith('comparison_')) {
        comparisonTtsSyncActiveRef.current = false;
        // Prefer explicit card index if available; fallback to known card id phases.
        if (typeof seg.cardIndex === 'number' && Number.isFinite(seg.cardIndex)) {
          comparisonSlideSinkRef.current(seg.cardIndex);
        } else if (seg.cardId === 'comparison_learning') {
          comparisonSlideSinkRef.current(0);
        } else if (seg.cardId === 'comparison_jobs') {
          comparisonSlideSinkRef.current(1);
        }
      }
      if (typeof seg.cardIndex === 'number' && Number.isFinite(seg.cardIndex)) {
        setCurrentCardIdx(Math.max(0, seg.cardIndex));
      }
      if (typeof seg.displayText === 'string' && seg.displayText.trim()) {
        setNarrationCaption(seg.displayText.trim());
      }
    },
    [],
  );

  useEffect(() => {
    if (!departmentComparisonOpen) {
      comparisonTtsSyncActiveRef.current = false;
      setComparisonNarrationSection(0);
    }
  }, [departmentComparisonOpen]);
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
    setExecutiveLeadershipKind(null);
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

  const stopTextReveal = useCallback((clearText = false) => {
    sentenceRevealAbortRef.current += 1;
    sentenceRevealKeyRef.current = null;
    if (clearText) {
      setSentenceRevealText('');
      setSentenceRevealTurnId(null);
    }
  }, []);

  const handleHomeClick = useCallback(() => {
    clearSuggestionLayer();
    stopTextReveal(true);
    setPendingAudio(null);
    appliedBackendTtsQueueLenRef.current = 0;
    ttsStreamQueueRef.current = [];
    lastBackendTtsStreamTurnRef.current = '';
    streamAudioLayoutRef.current = null;
    assistantAudioTurnOwnerRef.current = null;
    playedSegmentKeysRef.current.clear();
    if (cardProgressTimerRef.current) {
      clearInterval(cardProgressTimerRef.current);
      cardProgressTimerRef.current = null;
    }
    stopListening();
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    setIsPlayingBackendAudio(false);
    setIsCampusSpeaking(false);
    setSurface('chat');
    comparisonLayoutSnapRef.current = null;
    busRoutesDismissedTurnIdRef.current = null;
    setBusRoutesHighlightQuery(null);
    if (onHome) onHome();
  }, [clearSuggestionLayer, stopTextReveal, stopListening, onHome]);

  const requestCampusTts = useCallback((text: string, key: string) => {
    const cleanText = text.trim();
    if (!cleanText) return;

    stopCampusSpeech();
    onChatUserActivity?.();
    setIsCampusSpeaking(true);
    campusTtsSerialRef.current += 1;
    sendMessage({
      action: 'campus_navigation_tts',
      language,
      text: cleanText,
      turn_id: `campus-${key}-${language}-${campusTtsSerialRef.current}`,
    });
  }, [language, onChatUserActivity, sendMessage, stopCampusSpeech]);

  const speakCampusDirection = useCallback(
    (index?: number) => {
      const direction =
        index !== undefined
          ? (CAMPUS_DIRECTIONS[index] ?? CAMPUS_DIRECTIONS[0])
          : (campusDirectionOverride ?? (CAMPUS_DIRECTIONS[selectedCampusIndex] ?? CAMPUS_DIRECTIONS[0]));
      if (!direction) return;
      const key = index !== undefined ? `nav-${index}` : `nav-${selectedCampusIndex}-cur`;
      requestCampusTts(campusSpeechText(direction, language), key);
    },
    [language, requestCampusTts, selectedCampusIndex, campusDirectionOverride],
  );

  const processCampusVoiceTranscript = useCallback(
    async (transcript: string) => {
      const match = await matchCampusTranscriptApi(transcript);
      const labels = campusLabels(language);
      if (!match?.matched || !match.room) {
        requestCampusTts(
          labels.selectRoomPrompt || "Sorry, I couldn't match that to a campus room. Try a room code.",
          'campus-no-match',
        );
        return;
      }
      const direction = campusDirectionFromMapMatch(match.room);
      setCampusDirectionOverride(direction);
      const idx = legacyCampusIndexForCode(match.room.code);
      if (idx !== null) setSelectedCampusIndex(idx);
      setHasCampusRoomSelection(true);
      requestCampusTts(campusSpeechText(direction, language), 'nav-voice');
    },
    [language, requestCampusTts],
  );

  const handleMappedCampusRoomSelect = useCallback(
    (room: CampusMatchApiRoom) => {
      const direction = campusDirectionFromMapMatch(room);
      setCampusDirectionOverride(direction);
      const idx = legacyCampusIndexForCode(room.code, room.floor_id as 'GF' | 'FF' | 'SF');
      if (idx !== null) setSelectedCampusIndex(idx);
      setCampusRouteResult(null);
      setHasCampusRoomSelection(true);
      requestCampusTts(campusSpeechText(direction, language), `nav-map-${room.code}`);
    },
    [language, requestCampusTts],
  );

  useEffect(() => {
    processCampusVoiceTranscriptRef.current = (text: string) => {
      void processCampusVoiceTranscript(text);
    };
  }, [processCampusVoiceTranscript]);

  const promptCampusRoomSelection = useCallback(() => {
    const labels = campusLabels(language);
    requestCampusTts(labels.selectRoomPrompt || labels.selectPrompt, 'select-room');
  }, [language, requestCampusTts]);

  const handleTrusteeNarration = useCallback(
    (summary: string, trusteeIndex: number) => {
      const cleanSummary = summary.trim();
      if (!isTrusteesStage || !cleanSummary) return;
      const key = `${trusteeIndex}:${cleanSummary}`;
      if (lastTrusteeNarrationKeyRef.current === key) return;
      lastTrusteeNarrationKeyRef.current = key;
      sendMessage({
        action: 'campus_navigation_tts',
        language,
        text: cleanSummary,
        turn_id: `trustee-card-${trusteeIndex}-${language}-${Date.now()}`,
      });
    },
    [isTrusteesStage, language, sendMessage],
  );

  const openCampusNavigation = useCallback(() => {
    onChatUserActivity?.();
    stopListening();
    clearSuggestionLayer();
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
    setSurface('chat');
    comparisonLayoutSnapRef.current = null;
    setIsCampusNavigationStage(true);
    setSelectedCampusIndex(0);
    setHasCampusRoomSelection(false);
    setCampusRouteMode('default');
    setCampusRouteResult(null);
    setCampusDirectionOverride(null);
    setLayoutMode('SPLIT_CARDS');
  }, [
    clearCardStages,
    clearSuggestionLayer,
    displayMessages,
    onChatUserActivity,
    setLayoutMode,
    stopListening,
    visuallyFocusedMessage,
  ]);

  const returnToChatFromCampus = useCallback(() => {
    stopCampusSpeech();
    clearSuggestionLayer();
    setIsCampusNavigationStage(false);
    currentUiLockRef.current = 'IDLE';
    setCampusRouteMode('default');
    setCampusRouteResult(null);
    setCampusDirectionOverride(null);
    setLayoutMode('FULL_TEXT');
    setVisuallyFocusedMessage(savedChatFocusRef.current);
  }, [clearSuggestionLayer, setLayoutMode, stopCampusSpeech]);

  // Sync Card Progression with Backend Audio Duration
  const handleAudioPlayback = useCallback(
    (
      audioBase64: string,
      segmentKey: string,
      isOverview: boolean,
      cardsToSync: any[] | null,
      _turnId?: string,
      audioChainFollowUp?: boolean,
      totalDurationEstimateMs?: number | null,
    ) => {
    // Dedupe by a per-segment key (not just per-turn), because the backend can stream
    // multiple TTS segments for the same `turn_id` (ack + first sentence + remainder).
    if (playedSegmentKeysRef.current.has(segmentKey)) return;

    const tid = typeof _turnId === 'string' ? _turnId : '';
    const skipTurnOwnerGuard =
      !tid ||
      tid.startsWith('campus-') ||
      tid.startsWith('greeting') ||
      tid.includes('language_gate') ||
      tid.includes('name_after') ||
      tid.includes('ready_after');
    if (
      !skipTurnOwnerGuard &&
      assistantAudioTurnOwnerRef.current &&
      tid !== assistantAudioTurnOwnerRef.current
    ) {
      return;
    }
    if (audioLockRef.current && currentAudioRef.current && !currentAudioRef.current.paused) {
      if (audioChainFollowUp) {
        ttsStreamQueueRef.current.unshift({
          audioBase64,
          segmentKey,
          isOverview,
          cardsToSync,
          turnId: tid,
          totalDurationEstimateMs,
        });
      }
      return;
    }

    playedSegmentKeysRef.current.add(segmentKey);

    if (!audioChainFollowUp) {
      if (cardProgressTimerRef.current) {
        clearInterval(cardProgressTimerRef.current);
        cardProgressTimerRef.current = null;
      }
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }
    } else if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }

    const audio = new Audio(`data:audio/wav;base64,${audioBase64}`);
    currentAudioRef.current = audio;
    audioLockRef.current = true;
    setIsPlayingBackendAudio(true);

    // Narration-plan sync: each streamed TTS chunk is one visual beat.
    // The backend sets `tts_chunk_index` to match narration plan segment index.
    if (payload?.tts_streaming === true && typeof payload?.tts_chunk_index === 'number') {
      const plan = narrationPlanRef.current;
      const seg = plan?.segments?.[payload.tts_chunk_index];
      if (plan && seg && plan.turnId === tid) {
        applyComparisonNarrationSegment(seg);
      }
    }

    const liveFaceChannel = faceChannelRef.current;
    if (!audioChainFollowUp && liveFaceChannel?.enabled && tid) {
      const latestPayload = latestPayloadRef.current;
      let text = payloadAssistantSpeechText(latestPayload);
      const explicitTotalMs =
        finitePositiveMs(totalDurationEstimateMs) ??
        finitePositiveMs(latestPayload?.tts_total_duration_estimate_ms);
      let sentences = processResponseSentences(text);
      let durationsMs = allocateSentenceDurations(sentences, explicitTotalMs);
      if (!sentences.length) {
        const fallbackMs =
          finitePositiveMs(explicitTotalMs) ??
          finitePositiveMs(latestPayload?.tts_total_duration_estimate_ms);
        if (fallbackMs !== null && fallbackMs > 0) {
          sentences = ['Audio'];
          durationsMs = [fallbackMs];
        }
      }
      if (sentences.length && durationsMs.length === sentences.length) {
        liveFaceChannel.postSpeech({
          turnId: tid,
          sentences,
          durationsMs,
          emotion: inferEmotionFromPayload(latestPayload),
          emotionHint: 'calm',
        });
      }
    }

    let comparisonTimeHandler: (() => void) | null = null;
    const detachComparisonAudio = () => {
      if (comparisonTimeHandler) {
        audio.removeEventListener('timeupdate', comparisonTimeHandler);
        comparisonTimeHandler = null;
      }
    };

    if (comparisonTtsSyncActiveRef.current) {
      if (!audioChainFollowUp) {
        comparisonAccumulatedSecRef.current = 0;
      }
      if (comparisonSyncModeRef.current === 'clip') {
        if (!audioChainFollowUp) {
          comparisonClipPlayIndexRef.current = 0;
          comparisonSlideSinkRef.current(0);
        }
      } else {
        comparisonTimeHandler = () => {
          const total =
            comparisonTotalEstimateSecRef.current && comparisonTotalEstimateSecRef.current > 0
              ? comparisonTotalEstimateSecRef.current
              : audio.duration && Number.isFinite(audio.duration) && audio.duration > 0
                ? audio.duration
                : 0;
          if (!total) return;
          const elapsed = comparisonAccumulatedSecRef.current + audio.currentTime;
          const idx = Math.min(
            COMPARISON_NARRATION_SECTIONS - 1,
            Math.floor((elapsed / total) * COMPARISON_NARRATION_SECTIONS),
          );
          comparisonSlideSinkRef.current(idx);
        };
        audio.addEventListener('timeupdate', comparisonTimeHandler);
      }
    }

    const startSync = (duration: number) => {
        if (!isOverview || !cardsToSync) return;
        // Narration-plan mode: card index is driven by tts_chunk_index/segments, not time slicing.
        const plan = narrationPlanRef.current;
        if (plan && plan.turnId === tid) return;
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

    const preferredSyncDurationSeconds = () =>
      !audioChainFollowUp &&
      typeof totalDurationEstimateMs === 'number' &&
      Number.isFinite(totalDurationEstimateMs) &&
      totalDurationEstimateMs > 0
        ? totalDurationEstimateMs / 1000
        : audio.duration;

    audio.onloadedmetadata = () => {
        const syncDurationSeconds = preferredSyncDurationSeconds();
        setCurrentAudioDuration(syncDurationSeconds);
        if (!audioChainFollowUp) {
          startSync(syncDurationSeconds);
        }
    };
    setTimeout(() => {
        if (!audioChainFollowUp && isOverview && audio.duration) {
            const syncDurationSeconds = preferredSyncDurationSeconds();
            setCurrentAudioDuration(syncDurationSeconds);
            startSync(syncDurationSeconds);
        }
    }, 1000);

    audio.onended = () => {
        detachComparisonAudio();
        const moreQueued = ttsStreamQueueRef.current.length > 0;
        if (comparisonTtsSyncActiveRef.current) {
          if (comparisonSyncModeRef.current === 'time') {
            comparisonAccumulatedSecRef.current += audio.duration || 0;
            if (!moreQueued) {
              comparisonSlideSinkRef.current(COMPARISON_NARRATION_SECTIONS - 1);
            }
          } else if (comparisonSyncModeRef.current === 'clip') {
            const next = Math.min(
              COMPARISON_NARRATION_SECTIONS - 1,
              comparisonClipPlayIndexRef.current + 1,
            );
            comparisonClipPlayIndexRef.current = next;
            comparisonSlideSinkRef.current(next);
          }
        } else if (!moreQueued) {
          // Narration-plan mode: ensure we settle on final section after last chunk.
          const plan = narrationPlanRef.current;
          if (plan && plan.turnId === tid) {
            comparisonSlideSinkRef.current(COMPARISON_NARRATION_SECTIONS - 1);
          }
        }
        if (cardProgressTimerRef.current && (!audioChainFollowUp || !moreQueued)) {
            clearInterval(cardProgressTimerRef.current);
            cardProgressTimerRef.current = null;
        }
        setIsPlayingBackendAudio(false);
        audioLockRef.current = false;
        setIsCampusSpeaking(false);
        setHasGreeted(true); // Session is active after any Clara audio completes
        if (isOverview && cardsToSync && cardsToSync.length > 0 && !moreQueued) {
            setCurrentCardIdx(cardsToSync.length - 1);
        }
        if (moreQueued) {
          const next = ttsStreamQueueRef.current.shift()!;
          handleAudioPlaybackRef.current?.(
            next.audioBase64,
            next.segmentKey,
            next.isOverview,
            next.cardsToSync,
            next.turnId,
            true,
          );
        } else if (pendingFinalBackupRef.current) {
          pendingFinalBackupRef.current = null;
        }
        if (!moreQueued) faceChannelRef.current?.postIdle(tid);
        if (!moreQueued) setNarrationCaption('');
    };

    audio.play().catch(err => {
        detachComparisonAudio();
        audioLockRef.current = false;
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
        if (ttsStreamQueueRef.current.length > 0) {
          const next = ttsStreamQueueRef.current.shift()!;
          handleAudioPlaybackRef.current?.(
            next.audioBase64,
            next.segmentKey,
            next.isOverview,
            next.cardsToSync,
            next.turnId,
            true,
          );
        }
    });
  }, []);

  useEffect(() => {
    handleAudioPlaybackRef.current = handleAudioPlayback;
  }, [handleAudioPlayback]);

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
        handleAudioPlayback(
          promptAudio,
          `language_gate_prompt|${audioSig}`,
          false,
          null,
          'language_gate_prompt',
          false,
          null,
        );
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

    if (payload.isProcessing === true && typeof payload.turn_id === 'string' && payload.turn_id.length > 0) {
      const nextOwner = String(payload.turn_id);
      if (assistantAudioTurnOwnerRef.current !== nextOwner) {
        playedSegmentKeysRef.current.clear();
        assistantAudioTurnOwnerRef.current = nextOwner;
        appliedBackendTtsQueueLenRef.current = 0;
        ttsStreamQueueRef.current = [];
        receivedTtsChunkIndicesRef.current.clear();
        firstTtsChunkSeenAtRef.current = null;
        if (ttsBufferTimerRef.current) {
          window.clearTimeout(ttsBufferTimerRef.current);
          ttsBufferTimerRef.current = null;
        }
        pendingFinalBackupRef.current = null;
        if (currentAudioRef.current) {
          currentAudioRef.current.pause();
          currentAudioRef.current = null;
        }
        audioLockRef.current = false;
      }
    }

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
    const payloadMessageList = Array.isArray(payload?.messages) ? payload.messages : [];
    const isResponseReady =
      payload?.isProcessing !== true &&
      payload?.audioPending !== true &&
      payloadMessageList.length > 0;

    const lastUserForInference = [...payloadMessageList].reverse().find((m: any) => {
      const role = String(m?.role ?? '').toLowerCase();
      return role === 'user' && getPayloadMessageText(m).trim().length > 0;
    });
    const lastUserTextForInference = lastUserForInference
      ? getPayloadMessageText(lastUserForInference).trim()
      : '';
    const forcedDeptComparison = inferForcedDepartmentComparisonFromUserText(lastUserTextForInference);
    const forcedBus = inferForcedBusRoutesFromUserText(lastUserTextForInference);

    let cardTrigger = normalizeCardTrigger(nativeTrigger);
    if (isResponseReady && !cardTrigger) {
      const inferred = inferExecutiveProfileFromUserText(lastUserTextForInference);
      if (inferred === 'principal') cardTrigger = 'principal_profile';
      else if (inferred === 'vice_principal') cardTrigger = 'vice_principal_profile';
    }
    if (
      isResponseReady &&
      forcedDeptComparison.force &&
      forcedDeptComparison.departmentIds.length >= 2
    ) {
      cardTrigger = 'department_comparison';
    }
    if (
      isResponseReady &&
      cardTrigger !== 'department_comparison' &&
      forcedBus.force &&
      !(forcedDeptComparison.force && forcedDeptComparison.departmentIds.length >= 2)
    ) {
      cardTrigger = 'bus_routes';
    }

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
    lastPayloadTurnIdRef.current = String(turnId);
    const type = payload?.type ?? '';
    const utteranceKind = payload?.utterance_kind ?? '';
    const segmentIndex = payload?.segment_index ?? 0;
    const isFinalSegment = payload?.is_final_segment ?? true;
    // Small signature so missing metadata cannot cause false collisions.
    const audioSig = `${audioBase64?.length ?? 0}:${audioBase64?.slice(0, 24) ?? ''}`;
    // Dedupe key intentionally ignores optional streaming metadata that can drift between retries.
    // Keeping this keyed to turn + actual audio bytes avoids duplicate playback for repeated frames.
    const segmentKey = [turnId, audioSig].join('|');
    if (typeof audioBase64 === 'string' && audioBase64.length > 0) {
      const estimatedDuration = estimateWavDurationSeconds(audioBase64);
      if (estimatedDuration) {
        setCurrentAudioDuration(estimatedDuration);
      }
    }

    const deferAssistantTtsToStream = shouldDeferAssistantTtsToStream(payload);
    const offerAssistantAudio = (opts: {
      audioBase64: string | undefined;
      segmentKey: string;
      turnId: string;
      isOverview: boolean;
      cardsToSync: any[] | null;
      targetLayout: 'FULL_TEXT' | 'SPLIT_CARDS';
    }) => {
      streamAudioLayoutRef.current = {
        isOverview: opts.isOverview,
        cardsToSync: opts.cardsToSync,
        targetLayout: opts.targetLayout,
        turnId: opts.turnId,
      };
      if (typeof opts.audioBase64 !== 'string' || opts.audioBase64.length === 0) {
        return;
      }
      if (!deferAssistantTtsToStream) {
        setPendingAudio({
          audioBase64: opts.audioBase64,
          segmentKey: opts.segmentKey,
          turnId: opts.turnId,
          isOverview: opts.isOverview,
          cardsToSync: opts.cardsToSync,
          targetLayout: opts.targetLayout,
        });
      }
    };

    if (type === 'campus_navigation_tts') {
      if (audioBase64) {
        offerAssistantAudio({
          audioBase64,
          segmentKey,
          turnId: turnId,
          isOverview: false,
          cardsToSync: null,
          targetLayout: isCampusNavigationStage ? 'SPLIT_CARDS' : 'FULL_TEXT',
        });
      } else {
        setIsCampusSpeaking(false);
        setIsPlayingBackendAudio(false);
      }
      return;
    }

    // If backend explicitly says it is not speaking and gives no audio, force-release local speaking flags.
    if (!audioBase64 && payload?.isSpeaking === false) {
      setIsCampusSpeaking(false);
      setIsPlayingBackendAudio(false);
    }

    // Defer all split-card transitions until the turn has finalized messages.
    if (cardTrigger && cardTrigger !== 'documents' && !isResponseReady) {
      if (audioBase64) {
        offerAssistantAudio({
          audioBase64,
          segmentKey,
          turnId: turnId,
          isOverview: false,
          cardsToSync: null,
          targetLayout: 'FULL_TEXT',
        });
      }
      return;
    }

    if (cardTrigger === 'department_comparison' && isResponseReady) {
      currentUiLockRef.current = 'CARD';
      if (comparisonLayoutSnapRef.current === null) {
        comparisonLayoutSnapRef.current = layoutMode;
      }
      const rawList = payload?.comparisonDepartments;
      const cmpIds = Array.isArray(rawList)
        ? (rawList as unknown[]).filter((x): x is string => typeof x === 'string')
        : [];
      const mergedCmp =
        cmpIds.length >= 2 ? cmpIds : forcedDeptComparison.departmentIds;
      setComparisonDeptIds(mergedCmp);
      setComparisonHighlightId(
        typeof payload?.comparisonHighlightId === 'string' ? payload.comparisonHighlightId : null,
      );
      setComparisonRecommendFocus(
        typeof payload?.comparisonRecommendFocus === 'string'
          ? payload.comparisonRecommendFocus
          : null,
      );
      // If backend provided a narration plan for comparison, do NOT run time/clip-based drift sync.
      // Section + point are driven by narration_plan segment index (tts_chunk_index) instead.
      const plan = payload?.narration_plan;
      const hasComparisonNarrationPlan =
        plan &&
        typeof plan === 'object' &&
        plan.mode === 'card_narration' &&
        typeof plan.turnId === 'string' &&
        Array.isArray(plan.segments) &&
        plan.segments.some(
          (s: any) =>
            s &&
            typeof s === 'object' &&
            (s.cardId === 'comparison_learning' || s.cardId === 'comparison_jobs'),
        );
      comparisonTtsSyncActiveRef.current = !hasComparisonNarrationPlan;
      comparisonAccumulatedSecRef.current = 0;
      comparisonClipPlayIndexRef.current = 0;
      const estMs = payload?.tts_total_duration_estimate_ms;
      if (typeof estMs === 'number' && Number.isFinite(estMs) && estMs > 0) {
        comparisonTotalEstimateSecRef.current = estMs / 1000;
        comparisonSyncModeRef.current = 'time';
      } else {
        comparisonTotalEstimateSecRef.current = null;
        const q = payload?.tts_audio_queue;
        comparisonSyncModeRef.current = Array.isArray(q) && q.length > 1 ? 'clip' : 'time';
      }
      setComparisonNarrationSection(0);
      setSurface('department_comparison');
      setBusRoutesHighlightQuery(null);
      setLayoutMode('FULL_TEXT');
      if (audioBase64) {
        offerAssistantAudio({
          audioBase64,
          segmentKey,
          turnId: turnId,
          isOverview: false,
          cardsToSync: null,
          targetLayout: 'FULL_TEXT',
        });
      }
      return;
    }

    if (cardTrigger === 'bus_routes' && isResponseReady) {
      const turnIdStr = String(turnId);
      if (busRoutesDismissedTurnIdRef.current !== turnIdStr) {
        currentUiLockRef.current = 'CARD';
        comparisonLayoutSnapRef.current = null;
        setBusRoutesHighlightQuery(lastUserTextForInference);
        setBusRoutesMountKey((k) => k + 1);
        setSurface('bus_routes');
        setLayoutMode('FULL_TEXT');
        if (audioBase64) {
          setPendingAudio({
            audioBase64,
            segmentKey,
            turnId,
            isOverview: false,
            cardsToSync: null,
            targetLayout: 'FULL_TEXT',
          });
        }
        return;
      }
    }

    // Keep Bus routes fullscreen sticky while TTS trailing frames omit `showCard`.
    if (isBusRoutesSurface && currentUiLockRef.current === 'CARD' && cardTrigger !== 'bus_routes') {
      setLayoutMode('FULL_TEXT');
      if (audioBase64) {
        setPendingAudio({
          audioBase64,
          segmentKey,
          turnId,
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
        offerAssistantAudio({
          audioBase64,
          segmentKey,
          turnId: turnId,
          isOverview: false,
          cardsToSync: null,
          targetLayout: 'SPLIT_CARDS',
        });
      }
      return;
    }

    // Keep Principal / Vice Principal premium cards sticky across TTS chunks that omit `showCard`.
    if (
      executiveLeadershipKind &&
      currentUiLockRef.current === 'CARD' &&
      cardTrigger !== 'principal_profile' &&
      cardTrigger !== 'vice_principal_profile'
    ) {
      setLayoutMode('SPLIT_CARDS');
      if (audioBase64) {
        offerAssistantAudio({
          audioBase64,
          segmentKey,
          turnId: turnId,
          isOverview: false,
          cardsToSync: null,
          targetLayout: 'SPLIT_CARDS',
        });
      }
      return;
    }

    // Keep Trustees stage sticky — suppress any backend audio that arrives
    // during the slideshow.
    if (isTrusteesStage && currentUiLockRef.current === 'CARD') {
      setLayoutMode('SPLIT_CARDS');
      const isTrusteeNarrationTurn = String(turnId).startsWith('trustee-card-');
      // Block unrelated backend audio while trustees are active, but allow trustee summaries.
      if (!isTrusteeNarrationTurn) return;
    }

    // Trustees Premium Slideshow Integration
    const userMessage = payloadMessageList.slice().reverse().find((m: any) => m.role === 'user')?.text?.toLowerCase() || '';
    const isTrusteeKeyword = /trustee|trust member|board of trustee|ಧರ್ಮದರ್ಶಿ|ಟ್ರಸ್ಟಿ|प्रबंधक|ട്രസ്റ്റി|ధర్మకర్త|అறங்கావлер/i.test(userMessage);

    if (cardTrigger === 'trustees' || type === 'TRUSTEES_UI' || isTrusteeKeyword) {
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
      setIsDocumentsStage(false);
      setIsTrusteesStage(true);
      setLayoutMode('SPLIT_CARDS');
      lastTrusteeNarrationKeyRef.current = null;
      
      // Avoid stale non-trustee audio continuing when trustees UI takes over.
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
        setIsPlayingBackendAudio(false);
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
      setIsHodStage(false);
      setExecutiveLeadershipKind(null);
      setIsFeesStage(false);
      setActiveFeesDepartmentId(null);
      setIsDocumentsStage(false);
      setCourseMenuOptions(menuOptionsFromPayload.length ? menuOptionsFromPayload : DEFAULT_COURSE_MENU_OPTIONS);
      if (audioBase64) {
        offerAssistantAudio({
          audioBase64,
          segmentKey,
          turnId: turnId,
          isOverview: false,
          cardsToSync: null,
          targetLayout: 'SPLIT_CARDS',
        });
      }
      return;
    }

    if (cardTrigger === 'admissions' || cardTrigger === 'college_overview') {
      // These intents are answered by the backend LLM as text; no card UI.
      setCourseMenuOptions([]);
      setIsDepartmentOverviewStage(false);
      setActiveDepartmentId(null);
      setIsInfoSlideStage(false);
      setInfoSlides([]);
      setInfoSlideChip('');
      setIsHodStage(false);
      setExecutiveLeadershipKind(null);
      setIsFeesStage(false);
      setActiveFeesDepartmentId(null);
      setIsDocumentsStage(false);
      currentUiLockRef.current = 'TEXT';
      setLayoutMode('FULL_TEXT');
      if (audioBase64) {
        offerAssistantAudio({
          audioBase64,
          segmentKey,
          turnId: turnId,
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
      setExecutiveLeadershipKind(null);
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
        offerAssistantAudio({
          audioBase64,
          segmentKey,
          turnId: turnId,
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
        setExecutiveLeadershipKind(null);
        setIsHodStage(true);
        setLayoutMode('SPLIT_CARDS');
      } else if (currentUiLockRef.current !== 'CARD') {
        // No department resolved — only go to text if we haven't already locked a card
        setLayoutMode('FULL_TEXT');
      }
      return;
    }

    if (cardTrigger === 'principal_profile') {
      currentUiLockRef.current = 'CARD';
      setIsFeesStage(false);
      setActiveFeesDepartmentId(null);
      setIsDocumentsStage(false);
      setIsInfoSlideStage(false);
      setInfoSlides([]);
      setInfoSlideChip('');
      setIsDepartmentOverviewStage(false);
      setActiveDepartmentId(null);
      setCourseMenuOptions([]);
      setIsHodStage(false);
      setExecutiveLeadershipKind('principal');
      setLayoutMode('SPLIT_CARDS');
      setActiveCards(null);
      if (audioBase64) {
        offerAssistantAudio({
          audioBase64,
          segmentKey,
          turnId: turnId,
          isOverview: false,
          cardsToSync: null,
          targetLayout: 'SPLIT_CARDS',
        });
      }
      return;
    }

    if (cardTrigger === 'vice_principal_profile') {
      currentUiLockRef.current = 'CARD';
      setIsFeesStage(false);
      setActiveFeesDepartmentId(null);
      setIsDocumentsStage(false);
      setIsInfoSlideStage(false);
      setInfoSlides([]);
      setInfoSlideChip('');
      setIsDepartmentOverviewStage(false);
      setActiveDepartmentId(null);
      setCourseMenuOptions([]);
      setIsHodStage(false);
      setExecutiveLeadershipKind('vice_principal');
      setLayoutMode('SPLIT_CARDS');
      setActiveCards(null);
      if (audioBase64) {
        offerAssistantAudio({
          audioBase64,
          segmentKey,
          turnId: turnId,
          isOverview: false,
          cardsToSync: null,
          targetLayout: 'SPLIT_CARDS',
        });
      }
      return;
    }

    if (cardTrigger === 'placements') {
      setIsHodStage(false);
      setIsFeesStage(false);
      setExecutiveLeadershipKind(null);
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
        offerAssistantAudio({
          audioBase64,
          segmentKey,
          turnId: turnId,
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
      setExecutiveLeadershipKind(null);
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
          offerAssistantAudio({
            audioBase64,
            segmentKey,
            turnId: turnId,
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
        offerAssistantAudio({
          audioBase64,
          segmentKey,
          turnId: turnId,
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
      setExecutiveLeadershipKind(null);
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
        offerAssistantAudio({
          audioBase64,
          segmentKey,
          turnId: turnId,
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
      setExecutiveLeadershipKind(null);
      setIsFeesStage(false);
      setActiveFeesDepartmentId(null);
      setIsDocumentsStage(true);
      setLayoutMode('SPLIT_CARDS');
      setActiveCards(null);
      setSuppressedTurnId(null);
      if (audioBase64) {
        offerAssistantAudio({
          audioBase64,
          segmentKey,
          turnId: turnId,
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
        setIsHodStage(false);
        setExecutiveLeadershipKind(null);
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
          offerAssistantAudio({
            audioBase64,
            segmentKey,
            turnId: turnId,
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
          offerAssistantAudio({
            audioBase64,
            segmentKey,
            turnId: turnId,
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
          offerAssistantAudio({
        audioBase64,
        segmentKey,
        turnId: turnId,
        isOverview: false,
        cardsToSync: null,
        targetLayout: 'FULL_TEXT',
      });
    }

  }, [
    payload,
    resolveCardsFromTrigger,
    collegeData,
    language,
    interceptAndSendMessage,
    isPayloadStale,
    isCampusNavigationStage,
    executiveLeadershipKind,
    isFeesStage,
    isDepartmentOverviewStage,
    isBusRoutesSurface,
    layoutMode,
  ]);

  useEffect(() => {
    if (payload && isPayloadStale?.(payload)) return;

    let categories: FaqSuggestionCategory[] = GENERAL_FAQ_CATEGORIES;
    let turnId = 'general';

    if (payload?.type !== 'campus_navigation_tts' && payload?.type !== 'assistant_ack_audio' && payload?.type !== 'assistant_partial') {
      if (Array.isArray(payload?.messages)) {
        const latestAssistant = [...payload.messages]
          .reverse()
          .find(
            (message: any) =>
              message?.role === 'clara' &&
              typeof message?.text === 'string' &&
              !message?.isHidden &&
              !message?.isCardData,
          );
        const assistantText =
          latestAssistant?.text ??
          (typeof payload?.assistantText === 'string' ? payload.assistantText : '') ??
          '';
        turnId = String(payload?.turn_id || latestAssistant?.id || 'general');
        categories = inferFaqCategories(payload, assistantText);
      }
    }

    const nextSuggestions = selectFaqSuggestions(language, categories, lastSuggestionIdsRef.current);
    ensureSuggestions(nextSuggestions);
    if (turnId !== 'general') {
      lastSuggestionTurnIdRef.current = turnId;
      const ids = nextSuggestions.map((suggestion) => suggestion.id);
      lastSuggestionIdsRef.current = [...ids, ...lastSuggestionIdsRef.current]
        .filter((id, index, list) => list.indexOf(id) === index)
        .slice(0, 15);
    }
  }, [payload, language, isPayloadStale, ensureSuggestions]);

  useEffect(() => {
    if (
      departmentComparisonOpen ||
      isBusRoutesSurface ||
      faqSuggestions.length <= 1 ||
      isFaqCarouselPaused ||
      isBrochureOpen
    )
      return;
    const maxIndex = Math.max(0, faqSuggestions.length - 1);
    const timer = setInterval(() => {
      setFaqCarouselIndex((index) => (index >= maxIndex ? 0 : index + 1));
    }, FAQ_CAROUSEL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [
    departmentComparisonOpen,
    isBusRoutesSurface,
    faqSuggestions.length,
    isFaqCarouselPaused,
    isBrochureOpen,
  ]);

  useAnimationFrame((_time, delta) => {
    if (
      departmentComparisonOpen ||
      isBusRoutesSurface ||
      !faqSuggestions.length ||
      isFaqCarouselPaused ||
      isBrochureOpen ||
      isResponsePending ||
      isPlayingBackendAudio ||
      isCampusSpeaking ||
      (showLanguageOverlay && inlineLanguageGate && !languageGateSatisfied)
    ) {
      return;
    }
    const totalWidth = faqTickerLayout.totalTrackWidth;
    if (!totalWidth) return;
    const next = tickerX.get() - delta * FAQ_TICKER_SPEED_PX_PER_MS;
    tickerX.set(next <= -totalWidth ? next + totalWidth : next);
  });

  // Start queued audio only after its target layout is visible.
  useEffect(() => {
    if (!pendingAudio) return;
    if (layoutMode !== pendingAudio.targetLayout) return;
    const delayMs =
      pendingAudio.targetLayout === 'SPLIT_CARDS'
        ? CARD_AUDIO_START_DELAY_MS
        : FULL_TEXT_AUDIO_START_DELAY_MS;
    const timer = setTimeout(() => {
      if (
        deferredMessagesRef.current &&
        (!deferredTurnIdRef.current || deferredTurnIdRef.current === pendingAudio.turnId)
      ) {
        const committedMessages = deferredMessagesRef.current;
        setDisplayMessages(committedMessages);
        const latestAssistant = [...committedMessages]
          .reverse()
          .find((m: any) => m?.role === 'clara' && typeof m?.text === 'string' && !(m as any)?.isHidden && !(m as any)?.isCardData);
        setVisuallyFocusedMessage((latestAssistant as ChatMessage) ?? null);
        deferredMessagesRef.current = null;
        deferredTurnIdRef.current = null;
      }
      handleAudioPlayback(
        pendingAudio.audioBase64,
        pendingAudio.segmentKey,
        pendingAudio.isOverview,
        pendingAudio.cardsToSync,
        pendingAudio.turnId
      );
      setPendingAudio(current =>
        current?.segmentKey === pendingAudio.segmentKey ? null : current
      );
    }, delayMs);
    return () => clearTimeout(timer);
  }, [pendingAudio, layoutMode, handleAudioPlayback]);

  // Progressive backend TTS: `tts_audio_queue` is merged in useWebSocket; drain clips sequentially.
  useEffect(() => {
    if (!payload || isPayloadStale?.(payload)) return;
    const tid = String(payload.turn_id ?? '');
    if (
      assistantAudioTurnOwnerRef.current &&
      tid &&
      tid !== assistantAudioTurnOwnerRef.current
    ) {
      return;
    }
    if (tid !== lastBackendTtsStreamTurnRef.current) {
      lastBackendTtsStreamTurnRef.current = tid;
      appliedBackendTtsQueueLenRef.current = 0;
      ttsStreamQueueRef.current = [];
      receivedTtsChunkIndicesRef.current.clear();
      firstTtsChunkSeenAtRef.current = null;
      if (ttsBufferTimerRef.current) {
        window.clearTimeout(ttsBufferTimerRef.current);
        ttsBufferTimerRef.current = null;
      }
      pendingFinalBackupRef.current = null;
    }
    const chunkIndex =
      typeof payload.tts_chunk_index === 'number' && Number.isInteger(payload.tts_chunk_index)
        ? payload.tts_chunk_index
        : null;
    if (payload.tts_streaming === true && chunkIndex !== null) {
      receivedTtsChunkIndicesRef.current.add(chunkIndex);
    }
    const hasContiguousChunks = () => {
      const indices = [...receivedTtsChunkIndicesRef.current].sort((a, b) => a - b);
      if (indices.length === 0) return false;
      return indices.every((value, idx) => value === idx);
    };
    const finalBackupAudio =
      payload.tts_streaming === false &&
      typeof payload.audioBase64 === 'string' &&
      payload.audioBase64.length > 0
        ? payload.audioBase64
        : null;
    if (finalBackupAudio) {
      const finalSig = `${finalBackupAudio.length}:${finalBackupAudio.slice(0, 24)}`;
      pendingFinalBackupRef.current = {
        audioBase64: finalBackupAudio,
        segmentKey: `${tid}|tts_final_backup|${finalSig}`,
        turnId: tid,
      };
      if (!hasContiguousChunks()) {
        ttsStreamQueueRef.current = [];
        appliedBackendTtsQueueLenRef.current = Array.isArray(payload.tts_audio_queue)
          ? payload.tts_audio_queue.length
          : appliedBackendTtsQueueLenRef.current;
        if (currentAudioRef.current) {
          currentAudioRef.current.pause();
          currentAudioRef.current = null;
        }
        audioLockRef.current = false;
        handleAudioPlaybackRef.current?.(
          finalBackupAudio,
          pendingFinalBackupRef.current.segmentKey,
          false,
          null,
          tid,
          false,
        );
        pendingFinalBackupRef.current = null;
        return;
      }
    }
    const q = payload.tts_audio_queue;
    if (!Array.isArray(q) || q.length === 0) return;
    const layout = streamAudioLayoutRef.current?.targetLayout ?? 'FULL_TEXT';
    if (layoutMode !== layout) return;

    let added = false;
    while (appliedBackendTtsQueueLenRef.current < q.length) {
      const idx = appliedBackendTtsQueueLenRef.current;
      const b64 = q[idx];
      appliedBackendTtsQueueLenRef.current += 1;
      if (typeof b64 !== 'string' || !b64.length) continue;
      added = true;
      const st = streamAudioLayoutRef.current;
      const isOv = Boolean(st?.isOverview) && idx === 0;
      const totalDurationEstimateMs =
        idx === 0 &&
        typeof payload.tts_total_duration_estimate_ms === 'number' &&
        Number.isFinite(payload.tts_total_duration_estimate_ms)
          ? payload.tts_total_duration_estimate_ms
          : null;
      const segKey = `${tid}|tts_stream|${idx}|${b64.length}:${b64.slice(0, 24)}`;
      ttsStreamQueueRef.current.push({
        audioBase64: b64,
        segmentKey: segKey,
        isOverview: isOv,
        cardsToSync: isOv ? st?.cardsToSync ?? null : null,
        turnId: tid,
        totalDurationEstimateMs,
      });
    }
    if (!added) return;
    if (isPlayingBackendAudio) return;
    if (firstTtsChunkSeenAtRef.current === null) {
      firstTtsChunkSeenAtRef.current = Date.now();
    }
    const bufferedEnough =
      ttsStreamQueueRef.current.length >= 2 ||
      Date.now() - firstTtsChunkSeenAtRef.current >= 300 ||
      payload.tts_streaming === false;
    if (!bufferedEnough) {
      if (ttsBufferTimerRef.current) return;
      ttsBufferTimerRef.current = window.setTimeout(() => {
        ttsBufferTimerRef.current = null;
        const next = ttsStreamQueueRef.current.shift();
        if (!next || isPlayingBackendAudio) return;
        handleAudioPlaybackRef.current?.(
          next.audioBase64,
          next.segmentKey,
          next.isOverview,
          next.cardsToSync,
          next.turnId,
          false,
          next.totalDurationEstimateMs,
        );
      }, 300);
      return;
    }
    const delayMs =
      layout === 'SPLIT_CARDS' ? CARD_AUDIO_START_DELAY_MS : FULL_TEXT_AUDIO_START_DELAY_MS;
    const timer = window.setTimeout(() => {
      const next = ttsStreamQueueRef.current.shift();
      if (!next) return;
      handleAudioPlaybackRef.current?.(
        next.audioBase64,
        next.segmentKey,
        next.isOverview,
        next.cardsToSync,
        next.turnId,
        false,
        next.totalDurationEstimateMs,
      );
    }, delayMs);
    return () => clearTimeout(timer);
  }, [
    payload,
    isPayloadStale,
    layoutMode,
    isPlayingBackendAudio,
    handleAudioPlayback,
  ]);

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

  useEffect(() => {
    return () => {
      stopTextReveal(false);
    };
  }, [stopTextReveal]);

  // Time-based reset UI behavior removed to enforce persistent screen state.

  // Orb State — with persistent 'completed' state for post-response guidance
  // "Tap to Speak" stays visible FOREVER until user taps orb or listening starts.
  useEffect(() => {
    // Detect speaking → finished transition
    const wasSpeaking = wasPlayingAudioRef.current;
    const audioPending = Boolean(payload?.audioPending);
    const backendSaysSpeaking = Boolean(propIsSpeaking) && !audioPending;
    wasPlayingAudioRef.current = isPlayingBackendAudio || backendSaysSpeaking;

    if (isPlayingBackendAudio || isCampusSpeaking || backendSaysSpeaking) {
      setOrbState('speaking');
    } else if (audioPending) {
      setOrbState('processing');
    } else if (isProcessing) {
      setOrbState('processing');
    } else if (propIsListening || isPendingListeningRef.current) {
      // User started speaking or explicitly tapped the orb (optimistic listening)
      setOrbState('listening');
    } else if (wasSpeaking && !isPlayingBackendAudio && !backendSaysSpeaking) {
      // CLARA just finished speaking → show 'completed' with "Tap to Speak"
      // This state persists indefinitely — NO auto-timeout.
      // Only cleared when: user taps orb OR listening begins.
      setOrbState('completed');
    } else if (orbState !== 'completed') {
      // Normal idle/ready — never override a persistent completed state
      if (hasGreeted && !showUnmuteHint) setOrbState('ready');
      else setOrbState('idle');
    }
  }, [
    propIsListening,
    propIsSpeaking,
    payload?.audioPending,
    isProcessing,
    isPlayingBackendAudio,
    isCampusSpeaking,
    hasGreeted,
    showUnmuteHint,
    orbState,
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
    // #region agent log
    _agentDbg('A', 'ChatScreen.tsx:handleOrbTap', 'handleOrbTap_enter', {
      speechListening,
      pendingListen: isPendingListeningRef.current,
      propIsListening,
      voiceInputMode,
      audioPending: Boolean(payload?.audioPending),
      isProcessing,
    });
    // #endregion
    const browserListening = speechListening || isPendingListeningRef.current;
    const backendListening = voiceInputMode === 'backend' && propIsListening;
    const shouldStopMic = browserListening || backendListening;

    const interruptedTurnId = assistantAudioTurnOwnerRef.current;
    sendMessage({ action: 'cancel_turn' });
    faceChannel?.postInterrupt(interruptedTurnId);
    assistantAudioTurnOwnerRef.current = null;
    playedSegmentKeysRef.current.clear();

    clearSuggestionLayer();
    setIsFaqCarouselPaused(true);
    stopTextReveal(true);
    setPendingAudio(null);
    if (cardProgressTimerRef.current) {
      clearInterval(cardProgressTimerRef.current);
      cardProgressTimerRef.current = null;
    }
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    stopListening();
    setIsPlayingBackendAudio(false);
    setIsCampusSpeaking(false);
    setShowUnmuteHint(false);
    setHasGreeted(true);
    isPendingListeningRef.current = false;

    if (shouldStopMic) {
      if (voiceInputMode === 'backend') {
        sendMessage({ action: 'mic_stop' });
      }
      setOrbState('idle');
      return;
    }
    
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

    if (voiceInputMode === 'backend') onOrbTap();
    else startSpeechRecognition();
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
      clearSuggestionLayer();
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
    [clearSuggestionLayer, interceptAndSendMessage]
  );

  const filteredMessages = useMemo(() => {
    return displayMessages.filter(m => {
       const isHidden = (m as any).isHidden || (m as any).isCardData;
       return !isHidden && (m.id !== suppressedTurnId);
    });
  }, [displayMessages, suppressedTurnId]);
  const recentPanelMessages = useMemo(() => filteredMessages.slice(-4), [filteredMessages]);

  const latestTextAssistantMsg = useMemo((): TextMessage | null => {
    const found = [...filteredMessages]
      .reverse()
      .find((message): message is TextMessage => isTextMessage(message) && message.role === 'clara');
    return found ?? null;
  }, [filteredMessages]);
  const lastAssistantMsg: TextMessage | null =
    visuallyFocusedMessage &&
    isTextMessage(visuallyFocusedMessage) &&
    visuallyFocusedMessage.role === 'clara'
      ? visuallyFocusedMessage
      : latestTextAssistantMsg;
  const isLanguageGateOpen = inlineLanguageGate && !languageGateSatisfied;
  const shouldHideFaqSuggestions =
    isLanguageGateOpen || isResponsePending || departmentComparisonOpen || isBusRoutesSurface;
  const submitFaqSuggestion = useCallback(
    (_id: string, question: string) => {
      // #region agent log
      _agentDbg('B', 'ChatScreen.tsx:submitFaqSuggestion', 'faq_submit', {
        qLen: question.length,
        audioPending: Boolean(payload?.audioPending),
        isProcessing,
        propIsListening,
      });
      // #endregion
      stopListening();
      isPendingListeningRef.current = false;
      if (voiceInputMode === 'backend' && propIsListening) {
        sendMessage({ action: 'mic_stop' });
      }
      // Force orb out of any optimistic listening state before the new turn
      // begins so a stuck `processing` visual cannot be misread as the mic
      // being live. The orb effect will switch to `processing`/`speaking`
      // shortly after based on backend state.
      setOrbState('idle');
      clearSuggestionLayer();
      interceptAndSendMessage({ action: 'user_message', text: question }, 'VOICE');
    },
    [clearSuggestionLayer, interceptAndSendMessage, propIsListening, sendMessage, stopListening, voiceInputMode],
  );
  /** English greeting uses Didone-style stack from backend (`greetings.py` → `greetingFontFamily`). */
  const greetingFontStyle = useMemo((): React.CSSProperties | undefined => {
    if (payload && isPayloadStale?.(payload)) return undefined;
    const ff = payload?.greetingFontFamily;
    if (typeof ff !== 'string' || !ff.trim()) return undefined;
    return { fontFamily: ff };
  }, [payload, payload?.greetingFontFamily, isPayloadStale]);
  const fullTextGreetingStyle =
    lastAssistantMsg?.id === 'greeting' ? greetingFontStyle : undefined;
  const fullTextDisplayText =
    lastAssistantMsg && sentenceRevealTurnId === lastAssistantMsg.id
      ? sentenceRevealText
      : lastAssistantMsg?.text ?? '';
  const fullTextAnimate = true;

  const responseLayoutEnabled =
    layoutMode === 'FULL_TEXT' &&
    Boolean(fullTextDisplayText) &&
    !isResponsePending &&
    !isAwaitingReadyPrompt &&
    !(showLanguageOverlay && inlineLanguageGate && !languageGateSatisfied);

  const playbackClock = useAudioPlaybackClock(currentAudioRef, responseLayoutEnabled);

  const responseLayout = useResponseLayout({
    text: fullTextDisplayText,
    language,
    containerRef: fullTextScrollRef,
    enabled: responseLayoutEnabled,
    audioDurationSeconds: currentAudioDuration,
    externalPlaybackSync: true,
  });

  const pageGraphemeCounts = useMemo(
    () => responseLayout.pages.map((p) => Math.max(1, countGraphemes(p.replace(/\s+/g, '')))),
    [responseLayout.pages],
  );

  const pagedPlayback = useMemo(() => {
    const duration =
      playbackClock.duration > 0
        ? playbackClock.duration
        : currentAudioDuration > 0
          ? currentAudioDuration
          : 0;
    const t = playbackClock.currentTime;
    if (responseLayout.overflowMode !== 'paginated' || responseLayout.pages.length <= 1) {
      const progress =
        duration > 0 ? Math.min(1, Math.max(0, t / duration)) : playbackClock.progress;
      return { pageIndex: 0, localProgress: progress };
    }
    return resolvePagedPlayback(t, duration || 1, pageGraphemeCounts);
  }, [
    playbackClock.currentTime,
    playbackClock.duration,
    playbackClock.progress,
    currentAudioDuration,
    responseLayout.overflowMode,
    responseLayout.pages.length,
    pageGraphemeCounts,
  ]);

  useEffect(() => {
    if (!responseLayoutEnabled) return;
    if (responseLayout.overflowMode !== 'paginated' || responseLayout.pages.length <= 1) return;
    if (pagedPlayback.pageIndex !== responseLayout.activePageIndex) {
      responseLayout.setActivePageIndex(pagedPlayback.pageIndex);
    }
  }, [
    responseLayoutEnabled,
    responseLayout.overflowMode,
    responseLayout.pages.length,
    responseLayout.activePageIndex,
    responseLayout.setActivePageIndex,
    pagedPlayback.pageIndex,
  ]);

  const fullTextPageText =
    responseLayout.pages[responseLayout.activePageIndex] ?? fullTextDisplayText;

  const fullTextPageAudioDuration = useMemo(() => {
    if (responseLayout.overflowMode !== 'paginated' || responseLayout.pages.length <= 1) {
      return currentAudioDuration;
    }
    const totalGraphemes = Math.max(
      1,
      countGraphemes(fullTextDisplayText.replace(/\s+/g, '')),
    );
    const pageGraphemes = Math.max(
      1,
      countGraphemes(fullTextPageText.replace(/\s+/g, '')),
    );
    return currentAudioDuration * (pageGraphemes / totalGraphemes);
  }, [
    responseLayout.overflowMode,
    responseLayout.pages.length,
    fullTextDisplayText,
    fullTextPageText,
    currentAudioDuration,
  ]);

  const fullTextRevealProgress = useMemo(() => {
    // Prefer live playback; fall back to 1 when audio finished / unavailable so text remains readable.
    if (playbackClock.playing || playbackClock.progress > 0) {
      return pagedPlayback.localProgress;
    }
    if (currentAudioDuration <= 0 && fullTextDisplayText) {
      return 1;
    }
    return pagedPlayback.localProgress;
  }, [
    playbackClock.playing,
    playbackClock.progress,
    pagedPlayback.localProgress,
    currentAudioDuration,
    fullTextDisplayText,
  ]);

  const fullTextAnswerStyle = useMemo((): React.CSSProperties => {
    return {
      ...responseLayout.answerStyle,
      ...(fullTextGreetingStyle ?? {}),
    };
  }, [responseLayout.answerStyle, fullTextGreetingStyle]);

  const fullTextMessageClassName = `word-by-word-text full-text-readable ${scriptPreset.cssClass}`;

  useEffect(() => {
    if (!lastAssistantMsg || isAwaitingReadyPrompt || isResponsePending) return;
    if (payload && isPayloadStale?.(payload)) return;
    if (
      payload &&
      (payload.showCard ||
        payload.event === 'error' ||
        payload.errorCode ||
        (payload.type === 'assistant_audio_update' && payload.tts_streaming))
    ) {
      return;
    }

    const sourceText = payloadResponseText(payload, lastAssistantMsg.text);
    const processedSentences = processResponseSentences(sourceText);
    if (!processedSentences.length) return;

    const visibleText = processedSentences.join(' ');
    const revealKey = `${lastAssistantMsg.id}:${language}:${visibleText}`;
    if (sentenceRevealKeyRef.current === revealKey) return;

    sentenceRevealKeyRef.current = revealKey;
    sentenceRevealAbortRef.current += 1;
    setSentenceRevealTurnId(lastAssistantMsg.id);
    setSentenceRevealText(visibleText);
  }, [
    lastAssistantMsg?.id,
    lastAssistantMsg?.text,
    language,
    isAwaitingReadyPrompt,
    isResponsePending,
    payload,
    isPayloadStale,
  ]);

  const languageTaglines = THINKING_TAGLINES[language] ?? THINKING_TAGLINES.English;
  const thinkingTagline = languageTaglines[thinkingIndex % languageTaglines.length];
  const thinkingTitle = THINKING_TITLE[language] ?? THINKING_TITLE.English;
  const thinkingEmoji = THINKING_EMOJIS[thinkingIndex % THINKING_EMOJIS.length];
  const campusCopy = campusLabels(language);
  const selectedCampusDirection = useMemo(
    () => campusDirectionOverride ?? (CAMPUS_DIRECTIONS[selectedCampusIndex] ?? CAMPUS_DIRECTIONS[0])!,
    [campusDirectionOverride, selectedCampusIndex],
  );
  const campusDisplaySteps = useMemo(() => {
    if (campusRouteResult?.status === 'ok') {
      const flat = campusRouteResult.floor_segments.flatMap((s) => s.steps ?? []);
      if (flat.length) return flat;
    }
    return localizedCampusSteps(selectedCampusDirection, language);
  }, [campusRouteResult, selectedCampusDirection, language]);

  useEffect(() => {
    if (!isCampusNavigationStage || !hasCampusRoomSelection) {
      setCampusRouteResult(null);
      return;
    }
    const code = parseRoomCodeFromDestinationLabel(selectedCampusDirection.to);
    if (!code) {
      setCampusRouteResult(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      const res = await getCampusRouteApi({
        destination_room_code: code,
        mode: campusNavigationRouteModeToApi(campusRouteMode),
        language: language === 'English' ? 'en' : 'en',
      });
      if (!cancelled) setCampusRouteResult(res);
    })();
    return () => {
      cancelled = true;
    };
  }, [
    campusRouteMode,
    hasCampusRoomSelection,
    isCampusNavigationStage,
    language,
    selectedCampusDirection.to,
  ]);

  const departmentSlides = useMemo(() => {
    if (!isDepartmentOverviewStage || !activeDepartmentId) return [];
    const jk = menuLabelToJsonKey(activeDepartmentId);
    if (!jk) return [];
    const rec = getDepartmentRecord(collegeData, jk);
    return buildDepartmentSlidesFromRecord(rec, jk, language);
  }, [isDepartmentOverviewStage, activeDepartmentId, collegeData, language]);

  const renderFaqCarousel = (placement: 'full' | 'panel') => {
    if (placement === 'full' && (departmentComparisonOpen || isBusRoutesSurface)) return null;
    if (placement === 'panel') {
      const activeSuggestion = faqSuggestions[faqCarouselIndex % faqSuggestions.length];
      if (!activeSuggestion) return null;
      return (
        <div
          className={`faq-panel-suggestion-row ${shouldHideFaqSuggestions ? 'faq-suggestions-hidden' : ''}`}
          onMouseEnter={() => setIsFaqCarouselPaused(true)}
          onMouseLeave={() => setIsFaqCarouselPaused(false)}
        >
          <motion.button
            type="button"
            className={`faq-suggestion-pill faq-suggestion-pill-panel ${scriptPreset.cssClass}`}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.98 }}
            onClick={(event) => {
              event.stopPropagation();
              submitFaqSuggestion(activeSuggestion.id, activeSuggestion.text);
            }}
          >
            {activeSuggestion.text}
          </motion.button>
        </div>
      );
    }

    const tickerItems = [...faqSuggestions, ...faqSuggestions, ...faqSuggestions];
    const visibleGroupWidth = Math.max(1, faqTickerLayout.viewportWidth);
    return (
      <div
        className={`faq-carousel-shell faq-carousel-shell-full ${shouldHideFaqSuggestions ? 'faq-suggestions-hidden' : ''}`}
        onMouseEnter={() => setIsFaqCarouselPaused(true)}
        onMouseLeave={() => setIsFaqCarouselPaused(false)}
      >
        <div
          className="faq-carousel-viewport"
          style={{ width: visibleGroupWidth }}
        >
          <motion.div
            className="faq-carousel-track"
            style={{ x: tickerX, gap: faqTickerLayout.gap }}
          >
            {tickerItems.map((suggestion, index) => (
              <React.Fragment key={`${suggestion.id}-${index}`}>
                <FaqTickerCard
                  suggestion={suggestion}
                  index={index}
                  layout={faqTickerLayout}
                  cycleLength={faqSuggestions.length}
                  x={tickerX}
                  onSelect={submitFaqSuggestion}
                  scriptClass={scriptPreset.cssClass}
                />
              </React.Fragment>
            ))}
          </motion.div>
        </div>
      </div>
    );
  };

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
  }, [layoutMode, recentPanelMessages, isResponsePending, thinkingIndex]);

  return (
    <div className="light-chat-container" data-testid="chat-screen">
      <AnimatePresence mode="wait" initial={false}>
        {surface === 'bus_routes' ? (
          React.createElement(BusRoutesFullscreen, {
            key: `bus-routes-${busRoutesMountKey}`,
            highlightQuery: busRoutesHighlightQuery,
            onClose: handleCloseBusRoutes,
          })
        ) : (
          <motion.div
            key="main-chat-shell"
            role="presentation"
            className="relative flex h-full min-h-0 w-full flex-1 flex-col"
            initial={false}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
          >
      <div className="cinematic-overlay" />

      {/* Global Home Button */}
      <motion.button
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        onClick={handleHomeClick}
        data-testid="home-button"
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
            onChatUserActivity?.();
            setSurface('brochure');
          }}
          className="group flex items-center gap-2 rounded-full border-2 border-[#2a115c]/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.74),rgba(252,231,243,0.58),rgba(167,139,250,0.36))] px-4 py-2.5 text-sm font-semibold text-slate-900 backdrop-blur-xl transition-colors hover:border-[#17072f]/90 hover:bg-white/82"
        >
          <FileText className="h-4 w-4 text-[#2a115c]" />
          College Brochure
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

      <AnimatePresence mode="wait">
          {/* ─── FULL TEXT MODE ─── */}
          {layoutMode === 'FULL_TEXT' ? (
            <motion.div
              key="full-text"
              layoutId="main"
              className={`full-text-layout min-h-0${departmentComparisonOpen ? ' full-text-layout--comparison-active' : ''}`}
            >
              <div
                className={`full-text-message-stage relative z-10 flex min-h-0 flex-col${departmentComparisonOpen ? ' full-text-message-stage--with-comparison' : ''}`}
              >
                <div
                  ref={fullTextScrollRef}
                  className={`text-container${
                    !departmentComparisonOpen &&
                    lastAssistantMsg &&
                    isTextMessage(lastAssistantMsg) &&
                    !isAwaitingReadyPrompt &&
                    !isResponsePending &&
                    !(
                      showLanguageOverlay &&
                      inlineLanguageGate &&
                      !languageGateSatisfied
                    )
                      ? ' text-container--optical'
                      : ''
                  }`}
                  style={
                    responseLayoutEnabled
                      ? {
                          width: responseLayout.containerStyle.width,
                          overflowY: responseLayout.containerStyle.overflowY,
                          // Optical spacers own vertical placement when --optical is active.
                          ...(departmentComparisonOpen
                            ? { justifyContent: responseLayout.containerStyle.justifyContent }
                            : {}),
                        }
                      : undefined
                  }
                >
                  <AnimatePresence mode="wait">
                    {showLanguageOverlay &&
                    inlineLanguageGate &&
                    !languageGateSatisfied &&
                    layoutMode === 'FULL_TEXT' &&
                    !isResponsePending ? (
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
                    ) : isResponsePending ? (
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
                          key={`${lastAssistantMsg.id ?? 'msg'}-page-${responseLayout.activePageIndex}`}
                          text={fullTextPageText}
                          animate={fullTextAnimate}
                          audioDuration={fullTextPageAudioDuration}
                          playbackProgress={fullTextRevealProgress}
                          className={fullTextMessageClassName}
                          style={fullTextAnswerStyle}
                        />
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>

                {!departmentComparisonOpen ? (
                  <div
                    className="full-text-orb-zone"
                    onPointerDownCapture={(ev) => {
                      // #region agent log
                      const el = ev.target as HTMLElement;
                      _agentDbg('A', 'ChatScreen.tsx:full-text-orb-zone', 'pointer_capture', {
                        placement: 'full',
                        tag: el?.tagName,
                        cls: typeof el?.className === 'string' ? el.className.slice(0, 120) : '',
                      });
                      // #endregion
                    }}
                  >
                    {renderFaqCarousel('full')}
                    <div className="chat-orb-stack-below-faq">
                      <ChatOrbControl
                        orbState={orbState}
                        isProcessing={isResponsePending}
                        amplitude={orbState === 'listening' ? voiceAnalyser.amplitude : (isResponsePending ? 0.3 : 0.05)}
                        onTap={handleOrbTap}
                        bottomClassName="mt-2 mb-5 w-full text-center"
                      />
                    </div>
                  </div>
                ) : null}
              </div>

              <DepartmentComparisonCinema
                language={language}
                open={departmentComparisonOpen}
                initialDepartmentIds={comparisonDeptIds}
                highlightId={comparisonHighlightId}
                recommendFocus={comparisonRecommendFocus}
                narrationSectionIndex={comparisonNarrationSection}
                onClose={handleCloseDepartmentComparison}
              />
            </motion.div>

          /* ─── SPLIT CARDS MODE (college/dept/hod/trustees) ─── */
          ) : (
            <motion.div
              key="split"
              className={`split-cards-layout ${isCampusNavigationStage ? 'split-cards-layout--campus-map-and-panel' : ''}`}
            >
              <div className={`visual-stage-70 flex flex-col items-center ${isCampusNavigationStage ? 'visual-stage-70--campus-map-only' : ''}`}>
                {/* Content Layer */}
                <div className="relative z-10 w-full h-full flex flex-col items-center justify-center">

                {isCampusNavigationStage && selectedCampusDirection ? (
                  <CampusNavigationMapOnly
                    direction={selectedCampusDirection}
                    language={language}
                    routeMode={campusRouteMode}
                    routeResult={campusRouteResult}
                    onMappedRoomSelect={handleMappedCampusRoomSelect}
                  />
                ) : executiveLeadershipKind === 'principal' ? (
                  <PremiumPrincipalCard language={language} />
                ) : executiveLeadershipKind === 'vice_principal' ? (
                  <PremiumVicePrincipalCard language={language} />
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
                ) : isTrusteesStage ? (
                  <Trustees onNarrateTrustee={handleTrusteeNarration} />
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
              <motion.aside
                className={`interaction-panel-30 ${isCampusNavigationStage ? 'interaction-panel-30--campus-directions' : ''}`}
                onPointerDownCapture={(ev) => {
                  // #region agent log
                  const el = ev.target as HTMLElement;
                  _agentDbg('A', 'ChatScreen.tsx:interaction-panel-30', 'pointer_capture', {
                    placement: 'panel30',
                    tag: el?.tagName,
                    cls: typeof el?.className === 'string' ? el.className.slice(0, 120) : '',
                  });
                  // #endregion
                }}
              >

                <header className="panel-header">
                  <div className="panel-title flex items-center gap-2">
                    <Sparkles size={18} /> {isCampusNavigationStage ? campusCopy.campusNavigation : 'CLARA'}
                  </div>
                </header>
                {narrationCaption ? (
                  <div className="px-4 pb-2 pt-1">
                    <div className="rounded-2xl bg-white/5 px-4 py-3 text-[13px] leading-snug text-white/90 backdrop-blur-sm">
                      {narrationCaption}
                    </div>
                  </div>
                ) : null}
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
                          setCampusDirectionOverride(null);
                          setCampusRouteResult(null);
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
                          {campusDisplaySteps.map((step, index) => (
                            <li key={`${selectedCampusDirection.to}-${index}`}>{step}</li>
                          ))}
                        </ol>
                      </div>

                      <button
                        type="button"
                        onClick={() => (isCampusSpeaking ? stopCampusSpeech() : speakCampusDirection())}
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
                              text={sentenceRevealTurnId === m.id ? sentenceRevealText : m.text} 
                              animate={i === recentPanelMessages.length - 1}
                              audioDuration={i === recentPanelMessages.length - 1 ? currentAudioDuration : 0}
                              className="bubble-clara"
                              style={m.id === 'greeting' ? greetingFontStyle : undefined}
                            />
                      ))}
                      {isResponsePending && (
                        <div className="bubble-clara bubble-thinking">
                          <span aria-hidden>{thinkingEmoji}</span> {thinkingTagline}
                        </div>
                      )}
                    </>
                  )}
                </div>
                {renderFaqCarousel('panel')}
                
                {!isCampusNavigationStage && (
                  <motion.div className="chat-orb-stack-below-faq w-full flex justify-center pb-12">
                    <ChatOrbControl
                      orbState={orbState}
                      isProcessing={isResponsePending}
                      amplitude={orbState === 'listening' ? voiceAnalyser.amplitude : (isResponsePending ? 0.3 : 0.05)}
                      onTap={handleOrbTap}
                      bottomClassName="absolute -bottom-10 left-1/2 -translate-x-1/2 w-full text-center"
                    />
                  </motion.div>
                )}
              </motion.aside>
            </motion.div>
          )}
      </AnimatePresence>

      {/* Comparison mode: orb lives outside the FULL_TEXT motion wrapper so position:fixed is viewport-anchored
          (transform on layoutId/main would otherwise trap fixed positioning and overlap the panel). */}
      {layoutMode === 'FULL_TEXT' && departmentComparisonOpen ? (
        <>
          <div className="full-text-comparison-faq-layer">
            {renderFaqCarousel('full')}
          </div>
          <div className="full-text-comparison-orb-layer">
            <ChatOrbControl
              orbState={orbState}
              isProcessing={isResponsePending}
              amplitude={orbState === 'listening' ? voiceAnalyser.amplitude : (isResponsePending ? 0.3 : 0.05)}
              onTap={handleOrbTap}
              comparisonMode
              bottomClassName="pointer-events-none mt-1 w-full text-center"
            />
          </div>
        </>
      ) : null}

      <AnimatePresence>
        {isBrochureOpen && (
          <motion.div
            key="college-brochure-modal"
            className="brochure-modal-backdrop"
            role="presentation"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            onClick={() => {
              onChatUserActivity?.();
              setSurface('chat');
            }}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="brochure-title"
              className="brochure-modal-card"
              initial={{ opacity: 0, y: 28, scale: 0.94, filter: 'blur(12px)' }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: 14, scale: 0.97, filter: 'blur(8px)' }}
              transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                className="brochure-modal-close"
                onClick={() => {
                  onChatUserActivity?.();
                  setSurface('chat');
                }}
                aria-label="Close college brochure"
              >
                <X className="h-5 w-5" />
              </button>
              <header className="brochure-modal-head">
                <div className="brochure-modal-head-row">
                  <FileText className="brochure-modal-head-icon" aria-hidden />
                  <div className="brochure-modal-head-text">
                    <h2 id="brochure-title">College Brochure</h2>
                    <p className="brochure-modal-sub">Latest SVIT brochure — use viewer controls to zoom.</p>
                  </div>
                </div>
              </header>
              <object
                aria-label="College Brochure PDF Viewer"
                data={`${collegeBrochurePdfUrl}#view=FitH`}
                type="application/pdf"
                className="brochure-modal-frame"
              >
                <div className="brochure-modal-fallback">
                  <FileText className="h-10 w-10" />
                  <strong>Brochure preview</strong>
                  <span>
                    Open{' '}
                    <a href={collegeBrochurePdfUrl} download className="text-[#2a115c] underline">
                      svit_brochure.pdf
                    </a>
                    .
                  </span>
                </div>
              </object>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
