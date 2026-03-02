import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
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

/** Cover page only; content pages come from LLM overview reply. */
const BOOK_COVER = {
  layout: 'cover' as const,
  title: 'Sai Vidya Institute of Technology',
  subtitle: 'Established 2008',
  content: null as React.ReactNode,
};

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
  /** When true, always show only the chat panel (header + message list + orb), e.g. when embedded in 30% column. */
  forcePanelView?: boolean;
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
  forcePanelView = false,
}: ChatScreenProps) {
  const { t, language } = useLanguage();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<ChatMessage[]>(() => []);
  const [orbState, setOrbState] = useState<OrbState>('idle');
  const [isPlayingBackendAudio, setIsPlayingBackendAudio] = useState(false);
  const [isSplit, setIsSplit] = useState(false);
  const [isAboutCollege, setIsAboutCollege] = useState(false);
  const userRequestedListeningRef = useRef(false);

  // Open Digital Book as soon as user asks about college (no wait for LLM reply) to avoid load latency and block overview TTS from playing in chat.
  const { overviewSessionId, overviewReplyId } = (() => {
    const list = payloadMessages ?? [];
    if (list.length < 1) return { overviewSessionId: null as string | null, overviewReplyId: null as string | null };
    const last = list[list.length - 1];
    const lastText = typeof (last as any)?.text === 'string' ? (last as any).text : '';
    if ((last as any)?.role === 'user' && isAboutCollegeIntent(lastText))
      return { overviewSessionId: (last as any).id ?? null, overviewReplyId: null };
    if (list.length >= 2) {
      const prev = list[list.length - 2];
      const prevText = typeof (prev as any)?.text === 'string' ? (prev as any).text : '';
      if ((last as any)?.role === 'clara' && (prev as any)?.role === 'user' && isAboutCollegeIntent(prevText))
        return { overviewSessionId: (prev as any).id ?? null, overviewReplyId: (last as any).id ?? null };
    }
    return { overviewSessionId: null, overviewReplyId: null };
  })();

  // Digital Book content: injected copy in current language (display + TTS). Same content in all 6 languages.
  const overviewBookPages = useMemo(
    () => [
      BOOK_COVER,
      { title: t('bookPage1Title'), content: <p className="premium-page-body-p">{t('bookPage1Content')}</p> as React.ReactNode },
      { title: t('bookPage2Title'), content: <p className="premium-page-body-p">{t('bookPage2Content')}</p> as React.ReactNode },
      { title: t('bookPage3Title'), content: <p className="premium-page-body-p">{t('bookPage3Content')}</p> as React.ReactNode },
      { title: t('bookPage4Title'), content: <p className="premium-page-body-p">{t('bookPage4Content')}</p> as React.ReactNode },
      { title: t('bookPage5Title'), content: <p className="premium-page-body-p">{t('bookPage5Content')}</p> as React.ReactNode },
    ],
    [t, language]
  );
  const overviewPageTexts = useMemo(
    () => ['', t('bookPage1Content'), t('bookPage2Content'), t('bookPage3Content'), t('bookPage4Content'), t('bookPage5Content')],
    [t, language]
  );

  const [completedOverviewId, setCompletedOverviewId] = useState<string | null>(null);
  const [isDigitalBookMinimized, setIsDigitalBookMinimized] = useState(false);
  const [userClosedDigitalBook, setUserClosedDigitalBook] = useState(false);
  const isDigitalBookFlow = Boolean(overviewSessionId && overviewSessionId !== completedOverviewId);
  const completedDigitalBookRef = useRef<any>(null);

  // Allow showing the book again when a new digital book or new overview session arrives.
  useEffect(() => {
    const db = (payload as any)?.digitalBook;
    if (db && db !== completedDigitalBookRef.current) {
      setUserClosedDigitalBook(false);
      setIsDigitalBookMinimized(false);
    }
  }, [(payload as any)?.digitalBook]);
  useEffect(() => {
    if (overviewSessionId && overviewSessionId !== completedOverviewId) {
      setUserClosedDigitalBook(false);
      setIsDigitalBookMinimized(false);
    }
  }, [overviewSessionId, completedOverviewId]);
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
    if (isDigitalBookFlow) return;
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
  }, [payload?.audioBase64, isDigitalBookFlow]);

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

  // Greeting comes only from backend (greetings.py). Request it when chat screen mounts.
  useEffect(() => {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;
    setOrbState('idle');
    sendMessage({ action: 'conversation_started' });
  }, [sendMessage]);

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

  // Render the large centered text for Fullscreen mode (overview reply is shown only in the book, not here)
  const renderFullscreenContent = () => {
    const lastAssistantMsg = [...messages].reverse().find((m) => m.role === 'clara' && m.id !== overviewReplyId);
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
              <DigitalBook pages={overviewBookPages} />
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
            {messages
              .filter((msg) => msg.id !== overviewReplyId)
              .map((msg) => (
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

  // Digital Book from backend (one payload with pages + all audio): no diary_tts, no chat, instant playback.
  const digitalBook = (payload as any)?.digitalBook;
  const showBackendDigitalBook = digitalBook && digitalBook !== completedDigitalBookRef.current;
  const showLegacyDigitalBook = isDigitalBookFlow;

  // Shared fullscreen card layout: header (Close, Minimize) and either fullscreen book or 70:30 book | chat.
  if ((showBackendDigitalBook || showLegacyDigitalBook) && !userClosedDigitalBook) {
    const handleCloseBook = () => {
      if (showBackendDigitalBook) completedDigitalBookRef.current = digitalBook;
      if (showLegacyDigitalBook) setCompletedOverviewId(overviewSessionId);
      setUserClosedDigitalBook(true);
      setIsDigitalBookMinimized(false);
    };
    const bookContent = showBackendDigitalBook ? (
      <DigitalBook
        pages={digitalBook.pages}
        onComplete={handleCloseBook}
      />
    ) : (
      <DigitalBook
        pages={overviewBookPages}
        pageTexts={overviewPageTexts}
        sendMessage={sendMessage}
        payload={payload}
        onComplete={handleCloseBook}
        skipFirstAudio
      />
    );
    const headerBar = (
      <header className="flex-shrink-0 flex items-center justify-end gap-2 pr-4 pt-3 pb-2 bg-stone-900/80 border-b border-white/10 z-10">
        <button
          type="button"
          onClick={() => setIsDigitalBookMinimized((v) => !v)}
          className="px-4 py-2 rounded-xl border border-white/20 bg-white/10 text-white text-sm font-medium hover:bg-white/15 transition-colors"
          aria-label={isDigitalBookMinimized ? 'Expand' : 'Minimize'}
        >
          {isDigitalBookMinimized ? 'Expand' : 'Minimize'}
        </button>
        <button
          type="button"
          onClick={handleCloseBook}
          className="p-2 rounded-xl border border-white/20 bg-white/10 text-white hover:bg-white/15 transition-colors"
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </header>
    );
    if (!isDigitalBookMinimized) {
      return (
        <div className="chat-screen-container flex flex-col h-full bg-stone-950">
          {headerBar}
          <div className="flex-1 min-h-0">
            {bookContent}
          </div>
          <BackgroundParticles />
        </div>
      );
    }
    return (
      <div className="chat-screen-container flex flex-row h-full w-full bg-stone-950">
        <div className="w-[70%] h-full flex flex-col border-r border-white/10 flex-shrink-0 bg-stone-950">
          {headerBar}
          <div className="flex-1 min-h-0">
            {bookContent}
          </div>
        </div>
        <div className="w-[30%] h-full min-w-0 flex flex-col flex-shrink-0 overflow-hidden">
          <header className="chat-header-minimal flex-shrink-0">
            <button onClick={onBack} className="p-2 hover:bg-white/5 rounded-full transition-colors text-white/60" aria-label="Back">
              <ArrowLeft size={24} />
            </button>
            <h1 className="kiosk-header-title">CLARA</h1>
          </header>
          <div ref={scrollRef} className="chat-messages-scroll no-scrollbar flex-1 min-h-0 overflow-y-auto">
            {(messages ?? []).map((msg) => (
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
          <motion.div layoutId="voice-orb-wrapper" className="orb-container-split flex-shrink-0">
            <VoiceOrb state={orbState} amplitude={voiceAnalyser.amplitude} onTap={handleOrbTap} />
          </motion.div>
        </div>
        <BackgroundParticles />
      </div>
    );
  }

  // Embedded panel only (e.g. 30% column when department cards minimized): show chat list + orb.
  if (forcePanelView) {
    return (
      <div className="chat-screen-container flex flex-col h-full min-h-0">
        <header className="chat-header-minimal flex-shrink-0">
          <button
            onClick={onBack}
            className="p-2 hover:bg-white/5 rounded-full transition-colors text-white/60"
            aria-label="Back"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="kiosk-header-title">CLARA</h1>
        </header>
        <div ref={scrollRef} className="chat-messages-scroll no-scrollbar flex-1 min-h-0 overflow-y-auto">
          {(messages ?? []).map((msg) => (
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
        <motion.div layoutId="voice-orb-wrapper" className="orb-container-split flex-shrink-0">
          <VoiceOrb
            state={orbState}
            amplitude={voiceAnalyser.amplitude}
            onTap={handleOrbTap}
          />
        </motion.div>
      </div>
    );
  }

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
