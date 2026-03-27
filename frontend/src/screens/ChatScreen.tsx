import React, { useEffect, useRef, useState, useCallback, useMemo, useLayoutEffect } from 'react';
import { AnimatePresence, motion, LayoutGroup } from 'motion/react';
import { Sparkles, Volume2 } from 'lucide-react';
import { useLanguage, type Language } from '../context/LanguageContext';
import {
  type ChatMessage,
  type OrbState,
  isTextMessage,
} from '../types/chat';
import { useVoiceFrequencyAnalyser } from '../hooks/useVoiceAnalyser';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import VoiceOrb from '../components/VoiceOrb';
import AnimatedAiMessage from '../components/chat/AnimatedAiMessage';
import ThreeDVisual from '../components/chat/cards/ThreeDVisual';
import { getCardsForTrigger } from '../lib/cardData';

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
const MIN_FULL_TEXT_AUTO_SCALE = 0.7;

type PendingAudio = {
  audioBase64: string;
  segmentKey: string;
  isOverview: boolean;
  cardsToSync: any[] | null;
  targetLayout: 'FULL_TEXT' | 'SPLIT_CARDS';
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
  onOrbTap,
  sendMessage,
}: ChatScreenProps) {
  const { language } = useLanguage();
  const scrollRef = useRef<HTMLDivElement>(null);
  const fullTextStageRef = useRef<HTMLDivElement>(null);
  const fullTextMessageRef = useRef<HTMLDivElement>(null);
  const [displayMessages, setDisplayMessages] = useState<ChatMessage[]>(payloadMessages);
  
  // Layout Management State
  const [layoutMode, setLayoutMode] = useState<'FULL_TEXT' | 'SPLIT_CARDS'>('FULL_TEXT');
  const [activeCards, setActiveCards] = useState<any[] | null>(null);
  const [currentCardIdx, setCurrentCardIdx] = useState(0);
  const [suppressedTurnId, setSuppressedTurnId] = useState<string | null>(null);
  const [currentAudioDuration, setCurrentAudioDuration] = useState<number>(0);
  
  // Interaction State
  const [orbState, setOrbState] = useState<OrbState>('idle');
  const [isPlayingBackendAudio, setIsPlayingBackendAudio] = useState(false);
  const [showUnmuteHint, setShowUnmuteHint] = useState(false);
  const [thinkingIndex, setThinkingIndex] = useState(0);
  const [pendingAudio, setPendingAudio] = useState<PendingAudio | null>(null);
  const [fullTextAutoScale, setFullTextAutoScale] = useState(1);
  const hasStartedRef = useRef(false);

  // Audio Playback Ref
  const playedSegmentKeysRef = useRef<Set<string>>(new Set());
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const cardProgressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Intent Classifier & Speech Hooks
  const voiceAnalyser = useVoiceFrequencyAnalyser(orbState === 'listening');
  const { startListening: startSpeechRecognition } = useSpeechRecognition(
    sendMessage,
    language,
    () => {},
    () => {}
  );

  // Keep chat history stable when backend emits partial payloads without `messages`.
  useEffect(() => {
    if (Array.isArray(payload?.messages)) {
      setDisplayMessages(payload.messages as ChatMessage[]);
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

  const resolveCardsFromTrigger = useCallback((trigger: unknown): any[] | null => {
    const mapSingleTrigger = (key: string): any[] | null => {
      return getCardsForTrigger(language, key);
    };

    const triggerList = Array.isArray(trigger) ? trigger : [trigger];
    const merged: any[] = [];
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
  }, [language]);

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
        setShowUnmuteHint(true);
    });
  }, []);

  // Sync from payload
  useEffect(() => {
    if (!payload) return;
    const cardTrigger = payload?.showCard;
    const audioBase64 = payload?.audioBase64;
    const turnId = payload?.turn_id ?? 'greeting';
    const type = payload?.type ?? '';
    const utteranceKind = payload?.utterance_kind ?? '';
    const segmentIndex = payload?.segment_index ?? 0;
    const isFinalSegment = payload?.is_final_segment ?? true;
    // Small signature so missing metadata cannot cause false collisions.
    const audioSig = `${audioBase64?.length ?? 0}:${audioBase64?.slice(0, 24) ?? ''}`;
    const segmentKey = [turnId, type, utteranceKind, segmentIndex, isFinalSegment, audioSig].join('|');

    const cardsForTrigger = resolveCardsFromTrigger(cardTrigger);

    if (cardsForTrigger) {
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
  }, [payload, resolveCardsFromTrigger]);

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

  // Keep split mode visible for 30s after activity/audio, then auto-return to full text.
  useEffect(() => {
    if (layoutMode !== 'SPLIT_CARDS') return;
    if (isPlayingBackendAudio || isProcessing) return;
    const idleTimer = setTimeout(() => {
      setLayoutMode('FULL_TEXT');
      setActiveCards(null);
      setCurrentCardIdx(0);
      setSuppressedTurnId(null);
    }, SPLIT_IDLE_TIMEOUT_MS);
    return () => clearTimeout(idleTimer);
  }, [layoutMode, isPlayingBackendAudio, isProcessing, displayMessages.length]);

  // Orb State
  useEffect(() => {
    if (isPlayingBackendAudio) setOrbState('speaking');
    else if (isProcessing) setOrbState('processing');
    else if (propIsListening) setOrbState('listening');
    else setOrbState('idle');
  }, [propIsListening, isProcessing, isPlayingBackendAudio]);

  useEffect(() => {
    if (!hasStartedRef.current) {
      hasStartedRef.current = true;
      sendMessage({ action: 'conversation_started' });
    }
  }, [sendMessage]);

  const handleOrbTap = () => {
    setShowUnmuteHint(false);
    if (orbState === 'idle') {
      if (voiceInputMode === 'backend') onOrbTap();
      else startSpeechRecognition();
    }
  };

  const filteredMessages = useMemo(() => {
    return displayMessages.filter(m => {
       const isHidden = (m as any).isHidden || (m as any).isCardData;
       return !isHidden && (m.id !== suppressedTurnId);
    });
  }, [displayMessages, suppressedTurnId]);

  const lastAssistantMsg = [...filteredMessages]
    .reverse()
    .find(m => isTextMessage(m) && m.role === 'clara');
  const fullTextMessageText =
    lastAssistantMsg && isTextMessage(lastAssistantMsg) ? lastAssistantMsg.text : '';
  const fullTextMessageClassName = 'word-by-word-text';
  const baseFullTextMessageStyle = useMemo<React.CSSProperties>(() => {
    const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
    const compactLength = fullTextMessageText.replace(/\s+/g, '').length;
    const nonAsciiChars = (fullTextMessageText.match(/[^\u0000-\u00ff]/g) || []).length;
    const weightedLength = compactLength + Math.floor(nonAsciiChars * 0.58);
    const wordCount = fullTextMessageText.trim() ? fullTextMessageText.trim().split(/\s+/).length : 0;
    const isEnglish = language === 'English';
    const avgCharsPerLine = isEnglish ? 30 : 24;
    const estimatedLines = wordCount > 0 ? Math.max(1, Math.ceil(weightedLength / avgCharsPerLine)) : 0;

    // Blend character and line pressure so size drops smoothly as content grows.
    const lengthCurve = clamp((weightedLength - 30) / (isEnglish ? 430 : 370), 0, 1);
    const lineCurve = clamp((estimatedLines - 2) / 10, 0, 1);
    const curve = clamp(lengthCurve * 0.62 + lineCurve * 0.58, 0, 1);

    // Smoothly scale typography down as message length grows.
    const maxFontRem = isEnglish ? 4.0 : 3.75;
    const minFontRem = isEnglish ? 0.98 : 0.92;
    const fontSizeRem = maxFontRem - (maxFontRem - minFontRem) * Math.pow(curve, 0.9);
    const lineHeight = 1.28 + 0.34 * curve;
    const maxWidthPct = 82 + 16 * curve;
    const letterSpacingEm = isEnglish
      ? 0.016 - 0.010 * curve
      : 0.006 - 0.004 * curve;

    return {
      fontSize: `${fontSizeRem.toFixed(3)}rem`,
      lineHeight: Number(lineHeight.toFixed(3)),
      maxWidth: `${maxWidthPct.toFixed(1)}%`,
      letterSpacing: `${Math.max(0, letterSpacingEm).toFixed(4)}em`,
    };
  }, [fullTextMessageText, language]);
  const fullTextMessageStyle = useMemo<React.CSSProperties>(() => {
    const fontRemRaw =
      typeof baseFullTextMessageStyle.fontSize === 'string'
        ? Number.parseFloat(baseFullTextMessageStyle.fontSize)
        : 1;
    const minReadableRem = language === 'English' ? 0.95 : 0.9;
    const scaledFontRem = Math.max(fontRemRaw * fullTextAutoScale, minReadableRem);
    return {
      ...baseFullTextMessageStyle,
      fontSize: `${scaledFontRem.toFixed(3)}rem`,
      transition: 'font-size 220ms ease, line-height 220ms ease, max-width 220ms ease, letter-spacing 220ms ease',
    };
  }, [baseFullTextMessageStyle, fullTextAutoScale, language]);
  const languageTaglines = THINKING_TAGLINES[language] ?? THINKING_TAGLINES.English;
  const thinkingTagline = languageTaglines[thinkingIndex % languageTaglines.length];
  const thinkingTitle = THINKING_TITLE[language] ?? THINKING_TITLE.English;
  const thinkingEmoji = THINKING_EMOJIS[thinkingIndex % THINKING_EMOJIS.length];

  useLayoutEffect(() => {
    if (layoutMode !== 'FULL_TEXT' || isProcessing || !fullTextMessageText.trim()) {
      setFullTextAutoScale(prev => (prev === 1 ? prev : 1));
      return;
    }
    const stageEl = fullTextStageRef.current;
    const messageEl = fullTextMessageRef.current;
    if (!stageEl || !messageEl) return;

    const recalcScale = () => {
      const availableHeight = stageEl.clientHeight * 0.94;
      const messageHeight = messageEl.scrollHeight;
      if (!availableHeight || !messageHeight) return;
      const nextScale = Math.min(1, Math.max(MIN_FULL_TEXT_AUTO_SCALE, availableHeight / messageHeight));
      setFullTextAutoScale(prev => (Math.abs(prev - nextScale) < 0.015 ? prev : nextScale));
    };

    let rafA = 0;
    let rafB = 0;
    rafA = requestAnimationFrame(() => {
      recalcScale();
      rafB = requestAnimationFrame(recalcScale);
    });

    const onResize = () => recalcScale();
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(rafA);
      cancelAnimationFrame(rafB);
      window.removeEventListener('resize', onResize);
    };
  }, [layoutMode, isProcessing, fullTextMessageText, baseFullTextMessageStyle]);

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
              <div ref={fullTextStageRef} className="full-text-message-stage">
                {isProcessing ? (
                  <div className="clara-thinking-stage">
                    <div className="clara-thinking-emoji" aria-hidden>{thinkingEmoji}</div>
                    <div className="clara-thinking-title">{thinkingTitle}</div>
                    <div className="clara-thinking-tagline">{thinkingTagline}</div>
                    <div className="clara-thinking-dots" aria-hidden>...</div>
                  </div>
                ) : (
                  lastAssistantMsg && isTextMessage(lastAssistantMsg) && (
                    <div ref={fullTextMessageRef} className="full-text-message-wrapper">
                      <AnimatedAiMessage 
                        text={lastAssistantMsg.text} 
                        animate={true}
                        audioDuration={currentAudioDuration}
                        className={fullTextMessageClassName}
                        style={fullTextMessageStyle}
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
                <AnimatePresence mode="wait">
                  {activeCards && activeCards[currentCardIdx] && (
                    <motion.div key={currentCardIdx} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="cinematic-card">
                      <div className="flex-1">
                        <h2 className="card-title">{activeCards[currentCardIdx].title}</h2>
                        <p className="card-body">{activeCards[currentCardIdx].content}</p>
                      </div>
                      <div className="w-[50%] h-[40%] self-end bg-slate-50 rounded-3xl overflow-hidden mt-6 border border-slate-200 shadow-sm">
                        <ThreeDVisual type={activeCards[currentCardIdx].type} />
                      </div>
                      <div className="mt-auto flex gap-4 pt-8">{activeCards.map((_, i) => (
                        <div key={i} className={`h-2 flex-1 rounded-full ${i === currentCardIdx ? 'bg-violet-600' : i < currentCardIdx ? 'bg-violet-200' : 'bg-slate-200'}`} />
                      ))}</div>
                    </motion.div>
                  )}
                </AnimatePresence>
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
