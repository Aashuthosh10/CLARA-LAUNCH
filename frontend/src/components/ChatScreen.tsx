import React, { useEffect, useRef, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import {
  type ChatMessage,
  type OrbState,
  isTextMessage,
  isSystemMessage,
  isCardMessage,
  isCollegeBriefMessage,
  isImageCardMessage,
} from '../types/chat';
import { useVoiceFrequencyAnalyser } from '../hooks/useVoiceAnalyser';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import ClaraBubble from './chat/ClaraBubble';
import UserBubble from './chat/UserBubble';
import SystemBubble from './chat/SystemBubble';
import CardMessage from './chat/CardMessage';
import CollegeDiaryCard from './chat/CollegeDiaryCard';
import ImageCard from './chat/ImageCard';
import VoiceOrb from './VoiceOrb';
import BackgroundParticles from './BackgroundParticles';
import { useMessageAnimation } from '../hooks/useAnimeAnimations';
import { getMessageIntent, isAboutCollegeIntent } from '../utils/intentClassifier';
import DigitalBook from './chat/DigitalBook';

const COLLEGE_BOOK_DATA: any[] = [
  {
    layout: 'cover',
    title: "Sai Vidya Institute of Technology",
    subtitle: "Established 2008",
    content: null
  },
  {
    layout: 'editorial',
    title: "SVIT Overview",
    content: (
      <p>Sai Vidya Institute of Technology (SVIT) is a premier engineering institution committed to providing quality technical education. Founded with a vision to nurture innovation and excellence, SVIT has become a hub for aspiring engineers.</p>
    ),
    image: "https://images.unsplash.com/photo-1541339907198-e08756ebafe3?auto=format&fit=crop&q=80&w=1000"
  },
  {
    title: "Our Heritage",
    content: (
      <p>Established by a group of eminent academicians and industrialists, the institute carries a legacy of academic rigor and character building. Our history is rooted in the belief that education should empower individuals to solve global challenges.</p>
    )
  },
  {
    title: "Campus Life",
    content: (
      <p>The campus is spread across a lush green environment, providing a perfect atmosphere for learning. From state-of-the-art laboratories to vibrant cultural festivals, SVIT offers a holistic development experience.</p>
    ),
    image: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&q=80&w=1000"
  },
  {
    title: "Visions & Goals",
    content: (
      <p>Our vision is to be a globally recognized center of excellence in technical education. We aim to produce technically competent and ethically strong professionals who contribute to the sustainable development of society.</p>
    )
  }
];

const GREETING_TTS_DURATION_MS = 4500;

interface ChatScreenProps {
  messages: ChatMessage[];
  isListening?: boolean;
  isProcessing?: boolean;
  isConnected?: boolean;
  voiceInputMode?: 'browser' | 'backend';
  payload?: { audioBase64?: string; error?: string } | null;
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
  const { t, language } = useLanguage();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<ChatMessage[]>(() => []);
  const [orbState, setOrbState] = useState<OrbState>('idle');
  const [isPlayingBackendAudio, setIsPlayingBackendAudio] = useState(false);
  const [isSplit, setIsSplit] = useState(false);
  const [isAboutCollege, setIsAboutCollege] = useState(false);
  const userRequestedListeningRef = useRef(false);
  const lastPlayedAudioRef = useRef<string | null>(null);
  const isPlayingRef = useRef(false);
  const hasStartedRef = useRef(false);

  // Trigger layout split/fullscreen based on user intent category
  useEffect(() => {
    if (messages.length === 0) {
      setIsSplit(false);
      setIsAboutCollege(false);
      return;
    }

    // Find the last message from the user
    const userMessages = messages.filter(m => m.role === 'user');
    if (userMessages.length === 0) {
      // If there are messages but no user messages (e.g. only welcome), stay in fullscreen
      setIsSplit(false);
      setIsAboutCollege(false);
      return;
    }

    const lastUserMsg = userMessages[userMessages.length - 1];
    const userText = lastUserMsg.text || '';

    // Robust Intent Detection
    const isAbout = isAboutCollegeIntent(userText);
    const intent = getMessageIntent(userText);

    // We split if it's generally informational OR specifically about the college
    const shouldSplit = intent === 'informational' || isAbout;

    console.log(`[Intent Detection] Text: "${userText}" | Split: ${shouldSplit} | AboutCollege: ${isAbout}`);

    // Update Split State
    if (isSplit !== shouldSplit) {
      setIsSplit(shouldSplit);
    }

    // Update "About College" specifically (triggers Digital Book)
    if (isAboutCollege !== isAbout) {
      setIsAboutCollege(isAbout);
    }
  }, [messages, isSplit, isAboutCollege]);

  const addSystemMessage = useCallback((text: string) => {
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.role === 'system' && last.text === text) return prev;
      const sys: ChatMessage = { id: `sys-${Date.now()}`, role: 'system', text };
      return [...prev, sys];
    });
  }, []);

  const { startListening: startSpeechRecognition } = useSpeechRecognition(
    sendMessage,
    language,
    (_, message) => addSystemMessage(message),
    () => addSystemMessage("I didn't catch that. Please try again.")
  );

  const voiceAnalyser = useVoiceFrequencyAnalyser(orbState === 'listening');

  useEffect(() => {
    const audioBase64 = payload?.audioBase64;
    if (!audioBase64 || audioBase64 === lastPlayedAudioRef.current || isPlayingRef.current) return;
    lastPlayedAudioRef.current = audioBase64;
    isPlayingRef.current = true;
    setIsPlayingBackendAudio(true);
    try {
      const binary = atob(audioBase64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: 'audio/wav' });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      const onEnd = () => {
        URL.revokeObjectURL(url);
        isPlayingRef.current = false;
        setIsPlayingBackendAudio(false);
      };
      audio.addEventListener('ended', onEnd);
      audio.addEventListener('error', onEnd);
      audio.play().catch(() => onEnd());
    } catch {
      isPlayingRef.current = false;
      setIsPlayingBackendAudio(false);
    }
  }, [payload?.audioBase64]);

  useEffect(() => {
    if (isPlayingBackendAudio) {
      setOrbState('speaking');
      return;
    }
    if (isProcessing) {
      setOrbState('processing');
      return;
    }
    if (propIsListening) {
      setOrbState('listening');
      return;
    }
    if (hasStartedRef.current) setOrbState('idle');
  }, [propIsListening, isProcessing, isPlayingBackendAudio]);

  useEffect(() => {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;
    setOrbState('idle');
    setTimeout(() => {
      setMessages((prev) => (prev.length === 0 ? [{ id: 'greet-1', role: 'clara', text: t('welcome_message') }] : prev));
    }, 500);
  }, [t]);

  useEffect(() => {
    if (payloadMessages.length > 0) {
      // De-duplicate consecutive identical messages from the same sender
      const cleanMessages = payloadMessages.filter((msg, index, array) => {
        if (index === 0) return true;
        const prev = array[index - 1];

        // Check if messages have text content
        const currentText = 'text' in msg ? msg.text : '';
        const prevText = 'text' in prev ? prev.text : '';
        const currentRole = 'role' in msg ? msg.role : '';
        const prevRole = 'role' in prev ? prev.role : '';

        // If consecutive messages have exact same role and same text, it's likely a duplication
        if (currentRole && prevRole && currentRole === prevRole && currentText === prevText && currentText.trim() !== '') {
          return false;
        }
        return true;
      });

      setMessages(cleanMessages);
    }
  }, [payloadMessages]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const handleOrbTap = () => {
    if (!isConnected) {
      addSystemMessage('Waiting for backend connection...');
      return;
    }
    if (orbState === 'idle') {
      userRequestedListeningRef.current = true;
      if (voiceInputMode === 'backend') {
        onOrbTap();
      } else {
        startSpeechRecognition();
      }
    }
  };

  // Render the large centered text for Fullscreen mode
  const renderFullscreenContent = () => {
    const lastAssistantMsg = [...messages].reverse().find(m => m.role === 'clara');
    return (
      <motion.div
        key="fullscreen"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
        className="fullscreen-content"
      >
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="status-text-top"
        >
          CLARA is listening...
        </motion.div>

        <div className="flex-1 flex items-center justify-center w-full">
          {lastAssistantMsg && (
            <motion.div
              key={lastAssistantMsg.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="huge-reply-text"
            >
              {lastAssistantMsg.text}
            </motion.div>
          )}
        </div>

        {/* Orb at bottom center in Fullscreen */}
        <motion.div
          layoutId="voice-orb-wrapper"
          className="orb-container-fullscreen"
        >
          <VoiceOrb
            state={orbState}
            amplitude={voiceAnalyser.amplitude}
            onTap={handleOrbTap}
          />
        </motion.div>
      </motion.div>
    );
  };

  // Render the 70/30 Split logic
  const renderSplitContent = () => {
    return (
      <motion.div
        key="split"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
        className="chat-layout-wrapper"
      >
        <section className="kiosk-visual-side" style={{ width: '70%', height: '100%', position: 'relative' }}>
          {isAboutCollege ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, rotateY: -10 }}
              animate={{ opacity: 1, scale: 1, rotateY: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="w-full h-full"
            >
              <DigitalBook pages={COLLEGE_BOOK_DATA} />
            </motion.div>
          ) : null}
        </section>

        <aside className="kiosk-interaction-panel" style={{ width: '30%' }}>
          <header className="chat-header-minimal">
            <button
              onClick={onBack}
              className="p-2 hover:bg-white/5 rounded-full transition-colors text-white/60"
            >
              <ArrowLeft size={24} />
            </button>
            <h1 className="kiosk-header-title">CLARA</h1>
          </header>

          <div ref={scrollRef} className="chat-messages-scroll no-scrollbar">
            {messages.map((msg) => (
              <div key={msg.id}>
                {isSystemMessage(msg) && <SystemBubble message={msg} />}
                {msg.role === 'user' && <UserBubble message={msg} />}
                {isTextMessage(msg) && <ClaraBubble message={msg} />}
                {isCardMessage(msg) && <CardMessage message={msg} />}
                {isCollegeBriefMessage(msg) && <CollegeDiaryCard message={msg} />}
                {isImageCardMessage(msg) && <ImageCard message={msg} />}
              </div>
            ))}

            {isProcessing && (
              <div className="clara-typing-container">
                <div className="typing-dot" />
                <div className="typing-dot" />
                <div className="typing-dot" />
              </div>
            )}
          </div>

          {/* Orb anchored at bottom of Chat Panel in Split */}
          <motion.div
            layoutId="voice-orb-wrapper"
            className="orb-container-split"
          >
            <VoiceOrb
              state={orbState}
              amplitude={voiceAnalyser.amplitude}
              onTap={handleOrbTap}
            />
          </motion.div>
        </aside>
      </motion.div>
    );
  };

  return (
    <div className="chat-screen-container">
      <AnimatePresence mode="wait">
        {isSplit ? renderSplitContent() : renderFullscreenContent()}
      </AnimatePresence>

      <BackgroundParticles />
    </div>
  );
}

function MessageWrapper({ msg, propIsListening, t }: { msg: ChatMessage; propIsListening: boolean; t: any }) {
  const role = ('role' in msg) ? (msg as any).role : 'clara';
  const itemRef = useMessageAnimation(role === 'user' ? 'user' : 'clara');

  return (
    <div ref={itemRef} className={`opacity-0 ${role === 'user' ? 'kiosk-msg-user' : 'kiosk-msg-clara'}`}>
      {isSystemMessage(msg) ? (
        <SystemBubble message={msg} />
      ) : isCollegeBriefMessage(msg) ? (
        <CollegeDiaryCard message={msg} />
      ) : isImageCardMessage(msg) ? (
        <ImageCard message={msg} />
      ) : isCardMessage(msg) ? (
        <CardMessage
          message={msg}
          listeningLabel={propIsListening ? t('listening') : undefined}
        />
      ) : isTextMessage(msg) ? (
        <>
          <span className="kiosk-msg-label">{role === 'clara' ? 'CLARA' : 'Guest'}</span>
          <div className="kiosk-msg-text">
            {msg.text}
          </div>
        </>
      ) : null}
    </div>
  );
}
