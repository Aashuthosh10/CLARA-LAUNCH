import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { AnimatePresence, motion, LayoutGroup } from 'motion/react';
import { Sparkles, Volume2 } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import {
  type ChatMessage,
  type OrbState,
  isTextMessage,
} from '../types/chat';
import { useVoiceFrequencyAnalyser } from '../hooks/useVoiceAnalyser';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import VoiceOrb from '../components/VoiceOrb';
import AnimatedAiMessage from '../components/chat/AnimatedAiMessage';
import DigitalBook from '../components/chat/DigitalBook';
import ThreeDVisual from '../components/chat/cards/ThreeDVisual';
import { 
  COLLEGE_OVERVIEW_DATA, 
  DEPARTMENT_OVERVIEW_DATA, 
  HOD_INFO_DATA, 
  TRUSTEES_INFO_DATA 
} from '../lib/cardData';
import { detectOverviewType } from '../lib/intentClassifier';

// ─── College DigitalBook pages built from card data ───
const COLLEGE_BOOK_PAGES = [
  {
    title: 'Sai Vidya Institute of Technology',
    subtitle: 'COLLEGE OVERVIEW',
    layout: 'cover' as const,
  },
  ...COLLEGE_OVERVIEW_DATA.map((card) => ({
    title: card.title,
    text: card.content,
    layout: 'default' as const,
  })),
];
const COLLEGE_BOOK_PAGE_TEXTS = [
  '', // cover — no TTS
  ...COLLEGE_OVERVIEW_DATA.map((card) => card.content),
];

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
  const latestMessagesRef = useRef<ChatMessage[]>(payloadMessages);
  
  useEffect(() => {
    latestMessagesRef.current = payloadMessages;
  }, [payloadMessages]);
  
  // Layout Management State
  const [showDigitalBook, setShowDigitalBook] = useState(false);
  const [layoutMode, setLayoutMode] = useState<'FULL_TEXT' | 'SPLIT_CARDS'>('FULL_TEXT');
  const [activeCards, setActiveCards] = useState<any[] | null>(null);
  const [currentCardIdx, setCurrentCardIdx] = useState(0);
  const [suppressedTurnId, setSuppressedTurnId] = useState<string | null>(null);
  const [currentAudioDuration, setCurrentAudioDuration] = useState<number>(0);
  const [isSplitView, setIsSplitView] = useState(false);
  
  // Permanent Split Trigger
  useEffect(() => {
    if (!isSplitView) {
      const hasInteraction = payloadMessages.some(m => isTextMessage(m) && m.role === 'user') || activeCards !== null;
      if (hasInteraction) {
        setIsSplitView(true);
      }
    }
  }, [payloadMessages, activeCards, isSplitView]);

  // Interaction State
  const [orbState, setOrbState] = useState<OrbState>('idle');
  const [isPlayingBackendAudio, setIsPlayingBackendAudio] = useState(false);
  const [showUnmuteHint, setShowUnmuteHint] = useState(false);
  const hasStartedRef = useRef(false);

  // Audio Playback Ref
  const playedSegmentKeysRef = useRef<Set<string>>(new Set());
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  // Intent Classifier & Speech Hooks
  const voiceAnalyser = useVoiceFrequencyAnalyser(orbState === 'listening');
  const { startListening: startSpeechRecognition } = useSpeechRecognition(
    sendMessage,
    language,
    () => {},
    () => {}
  );

  // Sync Card Progression with Backend Audio Duration
  const handleAudioPlayback = useCallback((audioBase64: string, turnId: string, isOverview: boolean, cardsToSync: any[] | null) => {
    const segmentKey = `${turnId}|audio`;
    if (playedSegmentKeysRef.current.has(segmentKey)) return;
    playedSegmentKeysRef.current.add(segmentKey);

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
        const interval = setInterval(() => {
            idx++;
            if (idx < cardsToSync.length) setCurrentCardIdx(idx);
            else clearInterval(interval);
        }, intervalTime);
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
        setIsPlayingBackendAudio(false);
        if (isOverview) {
            setTimeout(() => {
                setLayoutMode('FULL_TEXT');
                setActiveCards(null);
                setSuppressedTurnId(null);
                setCurrentCardIdx(0);
            }, 1000);
        }
    };

    audio.play().catch(err => {
        setIsPlayingBackendAudio(false);
        setShowUnmuteHint(true);
    });
  }, []);

  // Sync from payload
  useEffect(() => {
    if (!payload) return;
    const cardTrigger = payload?.showCard;
    const audioBase64 = payload?.audioBase64;
    const turnId = payload?.turn_id || `msg-${Date.now()}`;

    // ─── COLLEGE intent from backend → DigitalBook, NOT card stack ───
    if (cardTrigger === 'college') {
        setShowDigitalBook(true);
        setSuppressedTurnId(turnId);
        return; // DigitalBook handles its own TTS via diary_tts
    }

    if (cardTrigger) {
        let data = cardTrigger === 'dept' ? DEPARTMENT_OVERVIEW_DATA.CSE 
                  : cardTrigger === 'hod' ? HOD_INFO_DATA 
                  : TRUSTEES_INFO_DATA;
        setLayoutMode('SPLIT_CARDS');
        setActiveCards(data);
        if (audioBase64) handleAudioPlayback(audioBase64, turnId, true, data);
    } else if (audioBase64) {
        // Evaluate fallback detection synchronously to ensure proper audio sync mode
        const msgs = latestMessagesRef.current;
        const lastMsg = msgs[msgs.length - 1];
        let type = null;
        if (lastMsg && isTextMessage(lastMsg) && lastMsg.role === 'clara' && !payload?.showCard) {
            type = detectOverviewType(lastMsg.text);
        }

        if (type === 'college') {
            setShowDigitalBook(true);
            setSuppressedTurnId(lastMsg?.id || turnId);
            // College handles own audio logic mostly, but we don't trigger sync
        } else if (type) {
            let data = type === 'dept' ? DEPARTMENT_OVERVIEW_DATA.CSE 
                      : type === 'hod' ? HOD_INFO_DATA 
                      : TRUSTEES_INFO_DATA;
            setLayoutMode('SPLIT_CARDS');
            setActiveCards(data);
            setCurrentCardIdx(0);
            setSuppressedTurnId(lastMsg?.id || turnId);
            handleAudioPlayback(audioBase64, turnId, true, data);
        } else {
            handleAudioPlayback(audioBase64, turnId, false, null);
        }
    }
  }, [payload, handleAudioPlayback]);

  // Fallback Detection from CLARA reply text
  useEffect(() => {
    const lastMsg = payloadMessages[payloadMessages.length - 1];
    if (lastMsg && isTextMessage(lastMsg) && lastMsg.role === 'clara' && layoutMode === 'FULL_TEXT' && !payload?.showCard) {
      const type = detectOverviewType(lastMsg.text);

      // ─── COLLEGE intent → DigitalBook exclusively ───
      if (type === 'college') {
        setShowDigitalBook(true);
        setSuppressedTurnId(lastMsg.id);
        return; // short-circuit — no card stack
      }

      if (type) {
        let data = type === 'dept' ? DEPARTMENT_OVERVIEW_DATA.CSE 
                  : type === 'hod' ? HOD_INFO_DATA 
                  : TRUSTEES_INFO_DATA;
        setLayoutMode('SPLIT_CARDS');
        setActiveCards(data);
        setCurrentCardIdx(0);
        setSuppressedTurnId(lastMsg.id);
      }
    }
  }, [payloadMessages, layoutMode, payload?.showCard]);

  // Close DigitalBook handler
  const handleBookComplete = useCallback(() => {
    setShowDigitalBook(false);
    setLayoutMode('FULL_TEXT');
    setSuppressedTurnId(null);
  }, []);

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
    return payloadMessages.filter(m => {
       const isHidden = (m as any).isHidden || (m as any).isCardData;
       return !isHidden && (m.id !== suppressedTurnId);
    });
  }, [payloadMessages, suppressedTurnId]);

  const lastAssistantMsg = [...payloadMessages].reverse().find(m => isTextMessage(m) && m.role === 'clara' && !(m as any).isCardData);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [filteredMessages]);

  if (showDigitalBook) {
    return (
      <div className="light-chat-container" data-testid="chat-screen">
        <div className="cinematic-overlay" />
        <motion.div
          key="digital-book"
          className="w-full h-full"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <DigitalBook
            pages={COLLEGE_BOOK_PAGES}
            pageTexts={COLLEGE_BOOK_PAGE_TEXTS}
            sendMessage={sendMessage}
            payload={payload}
            onComplete={handleBookComplete}
            skipFirstAudio
          />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="light-chat-container" data-testid="chat-screen">
      <div className="cinematic-overlay" />
      <LayoutGroup>
        <div className="w-full h-full flex relative overflow-hidden">
          
          {/* ─── LEFT PANEL (Main Stage) ─── */}
          <motion.div
            layout
            initial={false}
            animate={{ width: isSplitView ? '70%' : '100%' }}
            transition={{ duration: 0.8, ease: [0.77, 0, 0.175, 1] }}
            className="h-full flex flex-col items-center justify-center relative flex-shrink-0"
          >
            {layoutMode === 'FULL_TEXT' || !activeCards ? (
              <>
                <div className="flex-1 flex items-center justify-center w-full px-10">
                  {lastAssistantMsg && isTextMessage(lastAssistantMsg) && (
                    <AnimatedAiMessage 
                      text={lastAssistantMsg.text} 
                      animate={true}
                      audioDuration={currentAudioDuration}
                      className="word-by-word-text" 
                    />
                  )}
                </div>
                {!isSplitView && (
                  <motion.div layoutId="orb" className="orb-float-bottom relative">
                    {showUnmuteHint && (
                      <div className="absolute -top-16 left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-800 text-white px-4 py-2 rounded-full text-xs flex items-center gap-2 shadow-lg">
                        <Volume2 size={14} /> Tap to Unmute
                      </div>
                    )}
                    <VoiceOrb state={orbState} amplitude={voiceAnalyser.amplitude} onTap={handleOrbTap} />
                  </motion.div>
                )}
              </>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-12">
                <AnimatePresence mode="wait">
                  {activeCards && activeCards[currentCardIdx] && (
                    <motion.div 
                      key={currentCardIdx} 
                      initial={{ opacity: 0, x: 20 }} 
                      animate={{ opacity: 1, x: 0 }} 
                      exit={{ opacity: 0, x: -20 }} 
                      className="cinematic-card w-full h-full"
                    >
                      <div className="flex-1">
                        <h2 className="card-title">{activeCards[currentCardIdx].title}</h2>
                        <p className="card-body">{activeCards[currentCardIdx].content}</p>
                      </div>
                      <div className="w-[50%] h-[40%] self-end bg-slate-50 rounded-3xl overflow-hidden mt-6 border border-slate-200 shadow-sm">
                        <ThreeDVisual type={activeCards[currentCardIdx].type} />
                      </div>
                      <div className="mt-auto flex gap-4 pt-8">
                        {activeCards.map((_, i) => (
                          <div key={i} className={`h-2 flex-1 rounded-full ${i === currentCardIdx ? 'bg-violet-600' : i < currentCardIdx ? 'bg-violet-200' : 'bg-slate-200'}`} />
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </motion.div>

          {/* ─── RIGHT PANEL (Assistant Panel) ─── */}
          <AnimatePresence>
            {isSplitView && (
              <motion.aside
                initial={{ width: '0%', opacity: 0, x: 40 }}
                animate={{ width: '30%', opacity: 1, x: 0 }}
                transition={{ delay: 0.1, duration: 0.7, ease: [0.77, 0, 0.175, 1] }}
                className="interaction-panel-30 h-full flex flex-col flex-shrink-0"
              >
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
                </div>
                <motion.div layoutId="orb" className="orb-float-panel relative">
                  {showUnmuteHint && (
                    <div className="absolute -top-16 left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-800 text-white px-4 py-2 rounded-full text-xs flex items-center gap-2 shadow-lg z-50">
                      <Volume2 size={14} /> Tap to Unmute
                    </div>
                  )}
                  <VoiceOrb state={orbState} amplitude={voiceAnalyser.amplitude} onTap={handleOrbTap} />
                </motion.div>
              </motion.aside>
            )}
          </AnimatePresence>
        </div>
      </LayoutGroup>
    </div>
  );
}
