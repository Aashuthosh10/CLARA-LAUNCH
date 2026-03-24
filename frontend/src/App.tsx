import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useWebSocket } from './hooks/useWebSocket';
import { useLanguage } from './context/LanguageContext';

// Components
import SleepScreen from './screens/SleepScreen';
import LanguageSelect from './screens/LanguageSelect';
import ChatScreen from './screens/ChatScreen';
import CourseMenuComponent from './components/chat/CourseMenuComponent';
import CardStackComponent from './components/chat/CardStackComponent';
import { getCardContent } from './lib/cardContent';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:6969/ws/clara';
/** "browser" = Web Speech API only (default for dev); "backend" = send mic_start, use backend recording. */
const VOICE_INPUT_MODE = (import.meta.env.VITE_VOICE_INPUT_MODE || 'browser').toLowerCase() === 'backend' ? 'backend' : 'browser';
const BACKEND_URL = (() => {
  try {
    const u = new URL(WS_URL.replace(/^ws/, 'http'));
    return `${u.origin}`;
  } catch {
    return 'http://localhost:6969';
  }
})();

export default function App() {
  const { language } = useLanguage();
  const cardContent = getCardContent(language);
  const { state, payload, isConnected, setManualState, sendMessage, retryConnect, showOfflineBanner } = useWebSocket(WS_URL);
  const timings = payload?.debug?.timings_ms as { ttft_ms?: number; ttfs_ms?: number; total_ms?: number } | undefined;
  const [urlOverrideState, setUrlOverrideState] = React.useState<number | null>(null);
  const [overlay, setOverlay] = React.useState<'none' | 'course_menu' | 'dept_wait'>('none');
  const [pendingDept, setPendingDept] = React.useState<string | null>(null);
  const [isDeptStackMinimized, setIsDeptStackMinimized] = React.useState(false);
  const [suppressedMessageIds, setSuppressedMessageIds] = React.useState<string[]>([]);
  const lastSuppressedDeptReplyIdRef = React.useRef<string | null>(null);
  const dismissedCourseMenuRef = React.useRef(false);

  const handleCloseDeptStack = React.useCallback(() => {
    setOverlay('none');
    setPendingDept(null);
    setIsDeptStackMinimized(false);
  }, []);

  const effectiveState = urlOverrideState !== null ? urlOverrideState : state;

  const normalize = (s: string) => (s || '').toLowerCase().replace(/\s+/g, ' ').trim();

  const detectDepartment = (text: string): string | null => {
    const n = normalize(text);
    const table: Array<[string, string[]]> = [
      ['CSE (AI & ML)', ['cse ai', 'cse ai ml', 'ai ml', 'aiml', 'ai&ml', 'artificial intelligence', 'machine learning']],
      ['CSE (Data Science)', ['cse ds', 'cse data science', 'data science', 'datascience']],
      ['CSE', ['cse', 'computer science', 'computer science engineering']],
      ['ISE', ['ise', 'information science', 'information science engineering']],
      ['ECE', ['ece', 'electronics and communication', 'electronics & communication', 'electronics communication', 'electronics']],
      ['Civil', ['civil', 'civil engineering']],
      ['Mechanical', ['mechanical engineering', 'mechanical', 'mech']],
      ['MBA', ['mba', 'business administration', 'management']],
      ['Mathematics', ['mathematics', 'maths', 'math']],
      ['Physics', ['physics']],
      ['Chemistry', ['chemistry']],
    ];
    for (const [dept, keys] of table) {
      for (const k of keys) if (n.includes(k)) return dept;
    }
    return null;
  };

  const isGenericProgramsQuery = (text: string): boolean => {
    const n = normalize(text);
    if (detectDepartment(n)) return false;
    const keys = [
      'what courses are available',
      'show branches',
      'list programs',
      'what departments',
      'courses offered',
      'branches available',
      'departments',
      'programs',
      'courses',
    ];
    if (keys.some((k) => n.includes(k))) return true;
    if ((n.includes('course') || n.includes('courses') || n.includes('program') || n.includes('programs')) && (n.includes('list') || n.includes('show') || n.includes('available') || n.includes('offer'))) return true;
    if ((n.includes('branch') || n.includes('branches') || n.includes('department') || n.includes('departments')) && (n.includes('list') || n.includes('show') || n.includes('available'))) return true;
    return false;
  };

  /** Trim text to at most maxLines lines (for department cards: 2–3 lines each). */
  const truncateToLines = (text: string, maxLines: number = 3): string => {
    const s = (text || '').trim();
    if (!s) return '';
    const lines = s.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    return lines.slice(0, maxLines).join('\n');
  };

  const parseFiveNumberedSections = (text: string): string[] | null => {
    const raw = (text || '').trim();
    if (!raw) return null;
    const re = /(?:^|\n)\s*([1-5])\)\s*/g;
    const matches = [...raw.matchAll(re)];
    if (matches.length < 5) return null;
    const parts: Record<number, string> = {};
    for (let i = 0; i < matches.length; i++) {
      const num = parseInt(matches[i][1], 10);
      const start = (matches[i].index ?? 0) + matches[i][0].length;
      const end = i + 1 < matches.length ? (matches[i + 1].index ?? raw.length) : raw.length;
      const body = raw.slice(start, end).trim();
      if (num >= 1 && num <= 5) parts[num] = body;
    }
    if (![1, 2, 3, 4, 5].every((n) => typeof parts[n] === 'string')) return null;
    return [parts[1], parts[2], parts[3], parts[4], parts[5]];
  };

  const sendMessageWithOverlay = React.useCallback((msg: any) => {
    if (msg?.action === 'user_message' && typeof msg.text === 'string') {
      const text = msg.text;
      const dept = detectDepartment(text);
      if (!dept && isGenericProgramsQuery(text)) {
        setOverlay('course_menu');
        return;
      }
      if (dept) setPendingDept(dept);
    }
    sendMessage(msg);
  }, [sendMessage]);

  const payloadMessages: any[] = (payload?.messages ?? []) as any[];
  const lastAssistant = [...payloadMessages].reverse().find((m) => m?.role === 'clara' && typeof m?.text === 'string') as any;
  const lastUser = [...payloadMessages].reverse().find((m) => m?.role === 'user' && typeof m?.text === 'string') as any;
  const isCourseMenuToken = normalize(typeof lastAssistant?.text === 'string' ? lastAssistant.text : '') === 'course_menu';
  const deptSections = lastAssistant?.text ? parseFiveNumberedSections(lastAssistant.text) : null;
  const computedOverlay: 'none' | 'course_menu' | 'dept_wait' | 'dept_stack' =
    isCourseMenuToken && !dismissedCourseMenuRef.current
      ? 'course_menu'
      : deptSections
        ? 'dept_stack'
        : (overlay === 'course_menu' ? 'course_menu' : overlay === 'dept_wait' ? 'dept_wait' : 'none');

  const deptNameForCover = pendingDept || (lastUser?.text ? detectDepartment(lastUser.text) : null) || 'Department';
  const deptCards = React.useMemo(() => {
    if (!deptSections) return null;
    const [s1, s2, s3, s4, s5] = deptSections;
    const t = truncateToLines;
    const T = cardContent.DEPARTMENT_CARD_TITLES;
    return [
      `${deptNameForCover}\n${cardContent.INSTITUTION_NAME}`,
      `${T.card2}\n${t(s1, 2)}`,
      `${T.card3}\n${t(s2, 1)}\n${t(s3, 1)}`.trim() || t(s2, 2),
      `${T.card4}\n${t(s4, 2)}`,
      `${T.card5}\n${t(s5, 2)}`,
    ];
  }, [deptSections, deptNameForCover, cardContent]);

  // Hide the structured department reply from ChatScreen (no payload changes).
  useEffect(() => {
    const id = typeof lastAssistant?.id === 'string' ? lastAssistant.id : null;
    if ((!deptSections && !isCourseMenuToken) || !id) return;
    if (lastSuppressedDeptReplyIdRef.current === id) return;
    lastSuppressedDeptReplyIdRef.current = id;
    setSuppressedMessageIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }, [deptSections, isCourseMenuToken, lastAssistant?.id]);

  const visibleMessages = React.useMemo(() => {
    if (!suppressedMessageIds.length) return payloadMessages;
    const set = new Set(suppressedMessageIds);
    return payloadMessages.filter((m) => !(m?.id && set.has(m.id)));
  }, [payloadMessages, suppressedMessageIds]);

  const chatPayload = computedOverlay === 'none' ? payload : (payload ? { ...payload, audioBase64: undefined } : payload);

  // E2E / test: ?state=5 opens chat directly; sticky so WS cannot overwrite
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const s = params.get('state');
    if (s !== null) {
      const n = parseInt(s, 10);
      if (n >= 0 && n <= 8) setUrlOverrideState(n);
    }
  }, []);
  const setEffectiveState = (n: number) => {
    setUrlOverrideState(null);
    setManualState(n);
  };

  useEffect(() => {
    if (effectiveState !== 4 && effectiveState !== 5) {
      setOverlay('none');
      setPendingDept(null);
      setIsDeptStackMinimized(false);
      setSuppressedMessageIds([]);
      lastSuppressedDeptReplyIdRef.current = null;
      dismissedCourseMenuRef.current = false;
    }
  }, [effectiveState]);

  // Debug mode: Listen for keys 0-8
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = parseInt(e.key);
      if (key >= 0 && key <= 8) {
        console.log(`Debug: Switching to state ${key}`);
        setUrlOverrideState(null);
        setManualState(key);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setManualState]);

  const renderState = () => {
    switch (effectiveState) {
      case 0:
        return (
          <motion.div key="sleep" className="w-full h-full">
            <SleepScreen
              onWake={() => {
                sendMessage({ action: 'wake' });
                setUrlOverrideState(null);
                setManualState(3); // Transition to language select
              }}
            />
          </motion.div>
        );
      case 3:
        return (
          <motion.div key="lang" className="w-full h-full">
            <LanguageSelect
              onSelect={(language) => {
                sendMessage({ action: 'language_selected', language });
                setUrlOverrideState(null);
                setManualState(5); // Transition to chat (voice) post-language flow
              }}
              onHome={() => setEffectiveState(0)}
            />
          </motion.div>
        );
      case 4:
      case 5: {
        const showOverlayOnly = computedOverlay === 'course_menu' || computedOverlay === 'dept_wait' || (computedOverlay === 'dept_stack' && !isDeptStackMinimized);
        const chatScreenProps = {
          messages: visibleMessages ?? [],
          isListening: payload?.isListening ?? false,
          isSpeaking: payload?.isSpeaking ?? false,
          isProcessing: payload?.isProcessing ?? false,
          payload: chatPayload,
          isConnected,
          voiceInputMode: VOICE_INPUT_MODE,
          onBack: () => setEffectiveState(3),
          onOrbTap: () => sendMessageWithOverlay({ action: 'mic_start' }),
          sendMessage: sendMessageWithOverlay,
        };
        return (
          <motion.div key="voice" className="w-full h-full relative">
            {computedOverlay === 'none' && (
              <ChatScreen {...chatScreenProps} />
            )}

            {computedOverlay === 'course_menu' && (
              <div className="absolute inset-0 z-40 bg-stone-950">
                <CourseMenuComponent
                  onSelect={(dept) => {
                    setPendingDept(dept);
                    setOverlay('dept_wait');
                    sendMessage({ action: 'user_message', text: `${dept} department overview` });
                  }}
                  onBack={() => {
                    dismissedCourseMenuRef.current = true;
                    setOverlay('none');
                  }}
                />
              </div>
            )}

            {computedOverlay === 'dept_wait' && (
              <div className="absolute inset-0 z-40 flex items-center justify-center bg-stone-950">
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4 }}
                  className="glass rounded-3xl border border-white/10 px-10 py-8 text-center"
                >
                  <div className="text-stone-300 tracking-widest uppercase text-xs">{cardContent.DEPARTMENT_PREPARING_COPY.label}</div>
                  <div className="mt-3 text-3xl font-display italic text-white">{pendingDept ?? cardContent.DEPARTMENT_PREPARING_COPY.fallbackTitle}</div>
                </motion.div>
              </div>
            )}

            {computedOverlay === 'dept_stack' && deptCards && (
              <div className={`absolute inset-0 z-40 bg-stone-950 flex ${isDeptStackMinimized ? 'flex-row' : 'flex-col'}`}>
                <div className={isDeptStackMinimized ? 'w-[70%] h-full flex flex-col border-r border-white/10 flex-shrink-0 bg-stone-950' : 'flex-1 min-h-0 flex flex-col bg-stone-950'}>
                  <header className="flex-shrink-0 flex items-center justify-end gap-2 pr-4 pt-3 pb-2 bg-stone-900/80 border-b border-white/10 z-10">
                    <button
                      type="button"
                      onClick={() => setIsDeptStackMinimized((v) => !v)}
                      className="px-4 py-2 rounded-xl border border-white/20 bg-white/10 text-white text-sm font-medium hover:bg-white/15 transition-colors"
                      aria-label={isDeptStackMinimized ? 'Expand' : 'Minimize'}
                    >
                      {isDeptStackMinimized ? 'Expand' : 'Minimize'}
                    </button>
                    <button
                      type="button"
                      onClick={handleCloseDeptStack}
                      className="p-2 rounded-xl border border-white/20 bg-white/10 text-white hover:bg-white/15 transition-colors"
                      aria-label="Close"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </header>
                  <div className="flex-1 min-h-0">
                    <CardStackComponent
                      cards={deptCards}
                      skipFirstAudio
                      sendMessage={sendMessage}
                      payload={payload}
                      onComplete={handleCloseDeptStack}
                    />
                  </div>
                </div>
                {isDeptStackMinimized && (
                  <div className="w-[30%] h-full min-w-0 flex flex-col flex-shrink-0 overflow-hidden">
                    <ChatScreen {...chatScreenProps} forcePanelView />
                  </div>
                )}
              </div>
            )}
          </motion.div>
        );
      }
      default:
        return (
          <motion.div
            key="fallback"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full h-full flex items-center justify-center"
          >
            <div className="glass p-12 rounded-3xl text-center">
              <h2 className="text-3xl font-display italic mb-4">State {effectiveState}</h2>
              <p className="text-stone-400 tracking-widest uppercase text-sm">
                This interface is currently under development.
              </p>
              <button
                onClick={() => setEffectiveState(0)}
                className="mt-8 px-8 py-4 border border-white/10 rounded-full hover:bg-white/5 transition-colors"
              >
                Return to Sleep
              </button>
            </div>
          </motion.div>
        );
    }
  };

  return (
    <div className="relative w-full h-full bg-stone-950 overflow-hidden">
        {/* Connection banner when backend is unreachable */}
        {showOfflineBanner && (
          <div className="absolute top-0 left-0 right-0 z-30 px-4 py-3 bg-amber-500/20 border-b border-amber-500/40 rounded-b-lg text-center text-amber-200 text-sm flex flex-col items-center justify-center gap-1">
            <div className="flex flex-wrap items-center justify-center gap-2">
              <span>Cannot connect to backend at <a href={BACKEND_URL} target="_blank" rel="noopener noreferrer" className="underline">{BACKEND_URL}</a>.</span>
              <button type="button" onClick={retryConnect} className="px-3 py-1 rounded bg-amber-500/40 hover:bg-amber-500/60 text-amber-100 font-medium">Retry</button>
              <span className="text-amber-200/80">or refresh the page.</span>
            </div>
            <div className="text-amber-200/80 text-xs mt-1">
              Start backend from project root: <code className="bg-black/20 px-1 rounded">.\scripts\start-backend.ps1</code> or <code className="bg-black/20 px-1 rounded">.\.venv\Scripts\python backend\main.py</code>. Check <a href={`${BACKEND_URL}/health`} target="_blank" rel="noopener noreferrer" className="underline">/health</a>. If you changed frontend/.env.local, restart the frontend (npm run dev).
            </div>
          </div>
        )}
        {/* Global Warm Glow */}
        <div className="absolute inset-0 warm-glow pointer-events-none z-0" />

        {/* Main Content */}
        <main className="relative z-10 w-full h-full">
          <AnimatePresence mode="wait">
            {renderState()}
          </AnimatePresence>
        </main>

        {/* Subtle Kiosk Frame/Overlay */}
        <div className="absolute inset-0 border-[24px] border-black/20 pointer-events-none z-50 rounded-[40px]" />

        {/* Debug Indicator (Hidden in production) */}
        {import.meta.env.DEV && (
          <div className="absolute bottom-4 right-4 flex items-center gap-2 text-[8px] text-stone-800 uppercase tracking-widest">
            <span className="pointer-events-none">
              Kiosk Mode Active • State: {effectiveState} • WS: {isConnected ? 'Connected' : 'Disconnected'}
              {timings ? ` • TTFT: ${Math.round(timings?.ttft_ms ?? 0)}ms • TTFS: ${Math.round(timings?.ttfs_ms ?? 0)}ms • Total: ${Math.round(timings?.total_ms ?? 0)}ms` : ''}
            </span>
          </div>
        )}
      </div>
  );
}
