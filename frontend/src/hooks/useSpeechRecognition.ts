import { useCallback, useRef, useState } from 'react';
import type { Language } from '../context/LanguageContext';

const LANGUAGE_TO_BCP47: Record<Language, string> = {
  English: 'en-IN',
  Kannada: 'kn-IN',
  Hindi: 'hi-IN',
  Tamil: 'ta-IN',
  Telugu: 'te-IN',
  Malayalam: 'ml-IN',
};

function errorCodeToMessage(code: string): string {
  switch (code) {
    case 'not-allowed':
      return 'Microphone access denied.';
    case 'no-speech':
      return 'No speech heard. Try again.';
    case 'network': {
      // Chrome Web Speech API talks to Google’s cloud STT — not CLARA’s backend.
      const offline =
        typeof navigator !== 'undefined' && navigator.onLine === false;
      if (offline) {
        return 'You appear offline. Connect to the internet and tap to speak again.';
      }
      return 'Voice recognition could not reach the speech service. Check internet, then tap to speak again.';
    }
    case 'audio-capture':
      return 'No microphone found.';
    case 'service-not-allowed':
      return 'Browser blocked voice input.';
    default:
      return 'Voice input failed. Try again.';
  }
}

export function useSpeechRecognition(
  sendMessage: (msg: object) => boolean | void,
  language: Language,
  onError?: (errorCode: string, userMessage: string) => void,
  onEmptyTranscript?: () => void
) {
  const recognitionRef = useRef<{ stop: () => void; abort?: () => void } | null>(null);
  const isListeningRef = useRef(false);
  const [isListening, setIsListening] = useState(false);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const sendMessageRef = useRef(sendMessage);
  sendMessageRef.current = sendMessage;
  const onEmptyRef = useRef(onEmptyTranscript);
  onEmptyRef.current = onEmptyTranscript;

  const releaseMicStream = useCallback(() => {
    if (!mediaStreamRef.current) return;
    mediaStreamRef.current.getTracks().forEach((track) => {
      try {
        track.stop();
      } catch {
        // ignore track stop failures
      }
    });
    mediaStreamRef.current = null;
  }, []);

  const startListening = useCallback(() => {
    if (isListeningRef.current) return;

    const win = typeof window !== 'undefined' ? window : null;
    const SpeechRecognitionCtor = win
      ? (win as unknown as { SpeechRecognition?: new () => SpeechRecognition; webkitSpeechRecognition?: new () => SpeechRecognition }).SpeechRecognition ||
        (win as unknown as { webkitSpeechRecognition?: new () => SpeechRecognition }).webkitSpeechRecognition
      : undefined;
    if (!SpeechRecognitionCtor) {
      onError?.('unsupported', 'Voice input is not supported. Please use Chrome or Edge.');
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = LANGUAGE_TO_BCP47[language] || 'en-IN';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const result = event.results[event.resultIndex];
      const transcript = result?.[0]?.transcript?.trim();
      if (transcript) {
        const sent = sendMessageRef.current({ action: 'user_message', text: transcript });
        if (sent === false) onError?.('network', 'Connection lost. Try again.');
      } else {
        onEmptyRef.current?.();
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      const code = event.error || 'unknown';
      recognitionRef.current = null;
      isListeningRef.current = false;
      setIsListening(false);
      releaseMicStream();
      if (code === 'aborted') return;
      // Keep the browser-owned failure layer visible in Chrome DevTools. The
      // UI callback intentionally remains user-friendly, while this trace
      // preserves the actual Web Speech error and requested regional locale.
      if (typeof console !== 'undefined') {
        console.warn('[CLARA_SPEECH] browser speech error', {
          errorCode: code,
          recognitionLanguage: recognition.lang,
          online: typeof navigator === 'undefined' ? undefined : navigator.onLine,
          timestamp: new Date().toISOString(),
        });
      }
      const userMessage = errorCodeToMessage(code);
      if (userMessage) onError?.(code, userMessage);
      try {
        if (typeof recognition.abort === 'function') recognition.abort();
      } catch {
        // ignore
      }
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      isListeningRef.current = false;
      setIsListening(false);
      releaseMicStream();
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
      isListeningRef.current = true;
      setIsListening(true);
      if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
        void navigator.mediaDevices
          .getUserMedia({ audio: true })
          .then((stream) => {
            if (!isListeningRef.current) {
              stream.getTracks().forEach((track) => track.stop());
              return;
            }
            mediaStreamRef.current = stream;
          })
          .catch(() => {
            // Best effort only; speech API may still own mic directly.
          });
      }
    } catch {
      onError?.('start-failed', 'Could not start microphone. Try again.');
      recognitionRef.current = null;
      isListeningRef.current = false;
      setIsListening(false);
      releaseMicStream();
    }
  }, [language, onError, onEmptyTranscript, releaseMicStream]);

  const stopListening = useCallback(() => {
    const recognition = recognitionRef.current;
    if (recognition) {
      try {
        recognition.stop();
      } catch {
        // ignore
      }
      try {
        if (typeof recognition.abort === 'function') recognition.abort();
      } catch {
        // ignore
      }
    }
    recognitionRef.current = null;
    releaseMicStream();
    isListeningRef.current = false;
    setIsListening(false);
  }, [releaseMicStream]);

  return { startListening, stopListening, isListening };
}
