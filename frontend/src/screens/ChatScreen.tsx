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
import WordByWordText from '../components/chat/WordByWordText';
import ThreeDVisual from '../components/chat/cards/ThreeDVisual';
import { 
  COLLEGE_OVERVIEW_DATA, 
  DEPARTMENT_OVERVIEW_DATA, 
  HOD_INFO_DATA, 
  TRUSTEES_INFO_DATA 
} from '../lib/cardData';
import { detectOverviewType } from '../lib/intentClassifier';

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
  
  // Layout Management State
  const [layoutMode, setLayoutMode] = useState<'FULL_TEXT' | 'SPLIT_CARDS'>('FULL_TEXT');
  const [activeCards, setActiveCards] = useState<any[] | null>(null);
  const [currentCardIdx, setCurrentCardIdx] = useState(0);
  const [suppressedTurnId, setSuppressedTurnId] = useState<string | null>(null);
  
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

    audio.onloadedmetadata = () => startSync(audio.duration);
    setTimeout(() => { if (isOverview && audio.duration) startSync(audio.duration); }, 1000);

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

    if (cardTrigger) {
        let data = cardTrigger === 'college' ? COLLEGE_OVERVIEW_DATA 
                  : cardTrigger === 'dept' ? DEPARTMENT_OVERVIEW_DATA.CSE 
                  : cardTrigger === 'hod' ? HOD_INFO_DATA 
                  : TRUSTEES_INFO_DATA;
        setLayoutMode('SPLIT_CARDS');
        setActiveCards(data);
        setSuppressedTurnId(turnId);
        if (audioBase64) handleAudioPlayback(audioBase64, turnId, true, data);
    } else if (audioBase64) {
        handleAudioPlayback(audioBase64, turnId, false, null);
    }
  }, [payload, handleAudioPlayback]);

  // Fallback Detection
  useEffect(() => {
    const lastMsg = payloadMessages[payloadMessages.length - 1];
    if (lastMsg && isTextMessage(lastMsg) && lastMsg.role === 'clara' && layoutMode === 'FULL_TEXT' && !payload?.showCard) {
      const type = detectOverviewType(lastMsg.text);
      if (type) {
        let data = type === 'college' ? COLLEGE_OVERVIEW_DATA 
                  : type === 'dept' ? DEPARTMENT_OVERVIEW_DATA.CSE 
                  : type === 'hod' ? HOD_INFO_DATA 
                  : TRUSTEES_INFO_DATA;
        setLayoutMode('SPLIT_CARDS');
        setActiveCards(data);
        setCurrentCardIdx(0);
        setSuppressedTurnId(lastMsg.id);
      }
    }
  }, [payloadMessages, layoutMode, payload?.showCard]);

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

  return (
    <div className="light-chat-container">
      <div className="cinematic-overlay" />
      <LayoutGroup>
        <AnimatePresence mode="wait">
          {layoutMode === 'FULL_TEXT' ? (
            <motion.div key="full-text" layoutId="main" className="full-text-layout">
              <div className="status-text-top flex items-center gap-2">
                <Sparkles size={16} className="text-violet-500" />
                <span>CLARA UNIFIED KIOSK</span>
              </div>
              <div className="flex-1 flex items-center justify-center w-full px-10">
                {lastAssistantMsg && isTextMessage(lastAssistantMsg) && (
                  <WordByWordText text={lastAssistantMsg.text} isSpeaking={isPlayingBackendAudio && !suppressedTurnId} />
                )}
              </div>
              <motion.div layoutId="orb" className="orb-float-bottom relative">
                {showUnmuteHint && (
                  <div className="absolute -top-16 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black text-white px-4 py-2 rounded-full text-xs flex items-center gap-2">
                    <Volume2 size={14} /> Tap to Unmute
                  </div>
                )}
                <VoiceOrb state={orbState} amplitude={voiceAnalyser.amplitude} onTap={handleOrbTap} />
              </motion.div>
            </motion.div>
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
                      <div className="w-[50%] h-[40%] self-end bg-slate-50/50 rounded-3xl overflow-hidden mt-6 shadow-sm border border-black/5">
                        <ThreeDVisual type={activeCards[currentCardIdx].type} />
                      </div>
                      <div className="mt-auto flex gap-4 pt-8">{activeCards.map((_, i) => (
                        <div key={i} className={`h-2 flex-1 rounded-full ${i === currentCardIdx ? 'bg-violet-600' : i < currentCardIdx ? 'bg-violet-200' : 'bg-gray-100'}`} />
                      ))}</div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <motion.aside className="interaction-panel-30">
                <header className="panel-header"><div className="panel-title flex items-center gap-2"><Sparkles size={18} /> CLARA</div></header>
                <div ref={scrollRef} className="panel-messages no-scrollbar">
                  {filteredMessages.map((m, i) => isTextMessage(m) && (
                    <div key={m.id || i} className={m.role === 'user' ? 'bubble-user' : 'bubble-clara'}>{m.text}</div>
                  ))}
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
