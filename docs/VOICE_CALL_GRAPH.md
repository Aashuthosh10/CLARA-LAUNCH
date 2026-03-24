# CLARA Voice Call Graph

## Issues Found (Pre-Patch)

| Issue | File:Line | Severity |
|-------|-----------|----------|
| record_audio returned Optional[bytes], no error code | audio_pipeline.py | Medium |
| Generic "No speech heard" for MIC_SILENT vs VAD_TIMEOUT | main.py | Medium |
| No turn_id in error payloads | main.py | Low |
| No device validation at startup | main.py | Low |
| No AUDIO_OUTPUT_DEVICE config | config.py | Low |
| VAD aggressiveness hardcoded | audio_pipeline.py | Low |
| No pre-roll buffer in VAD | audio_pipeline.py | Low |
| Error payloads inconsistent schema | main.py | Low |
| Frontend not showing error hints | ChatScreen.tsx | Low |

## Voice Call Path (Backend Mode)

```
[Frontend] User taps orb
    → App.tsx: sendMessageWithOverlay({ action: 'mic_start' })
    → useWebSocket.ts: sendMessage() → socket.send(JSON.stringify(msg))

[Backend] WebSocket receives
    → main.py: websocket_clara() L454
    → action == "toggle_mic" | "mic_start" → L505
    → TurnTiming() created
    → websocket.send_json({ state: 5, payload: { isProcessing: True } })
    → wav_bytes = await asyncio.to_thread(record_audio)  [L513]
    → record_audio() → core/audio_pipeline.py
        → _resolve_input_device() → device index
        → AUDIO_RECORD_MODE == "fixed" | "vad"
        → fixed: _record_fixed_duration() → sd.rec() → sd.wait() → WAV
        → vad: sd.InputStream() → webrtcvad loop → _build_wav_from_chunks()
    → timing.mark("record_end")
    → sarvam_stt_from_wav(wav_bytes) → clients.py
    → timing.mark("stt_start") / "stt_end" / "transcript_ready"
    → process_user_text_and_reply() → main.py L363
        → maybe_auto_detect_session_language()
        → RAG context
        → _stream_groq_reply() or cache
        → tts_to_base64_cached() → sarvam_tts_to_base64() → clients.py
        → websocket.send_json({ state: 5, payload: { messages, audioBase64, isProcessing: False, isSpeaking } })

[Frontend] Receives payload
    → useWebSocket: onmessage → setPayload(payload)
    → App.tsx: chatPayload → ChatScreen
    → ChatScreen: useEffect on payload?.audioBase64
        → base64ToBytes → detectAudioMime → new Audio() → play()
        → setIsPlayingBackendAudio(true) → orbState = 'speaking'
        → onended → setIsPlayingBackendAudio(false)
```

## Voice Call Path (Browser STT Mode)

```
[Frontend] User taps orb
    → ChatScreen: handleOrbTap() → voiceInputMode === 'browser' → startSpeechRecognition()
    → useSpeechRecognition.ts: recognition.start()
    → Web Speech API captures → onresult
    → sendMessage({ action: 'user_message', text: transcript })

[Backend] WebSocket receives user_message
    → main.py: action == "user_message" L507
    → process_user_text_and_reply() [same as above, no record_audio/STT]
```

## File:Function Chain

| Stage | File | Function |
|-------|------|----------|
| Mic button → start | App.tsx | sendMessageWithOverlay | 
| WS send | useWebSocket.ts | sendMessage |
| WS receive | main.py | websocket_clara |
| Mic start handler | main.py | L505–761 (inline) |
| Audio capture | core/audio_pipeline.py | record_audio |
| Device resolve | core/audio_pipeline.py | _resolve_input_device |
| VAD fixed record | core/audio_pipeline.py | _record_fixed_duration |
| VAD mode loop | core/audio_pipeline.py | record_audio (InputStream) |
| STT | clients.py | sarvam_stt_from_wav |
| LLM | main.py | _stream_groq_reply |
| TTS | clients.py | sarvam_tts_to_base64 |
| TTS cached | main.py | tts_to_base64_cached |
| Process reply | main.py | process_user_text_and_reply |
| WS payload | main.py | websocket.send_json |
| Frontend playback | ChatScreen.tsx | useEffect (audioBase64) |
| Orb state | ChatScreen.tsx | useEffect (isPlayingBackendAudio, isProcessing) |

## WebSocket Events (state 5 payloads)

| Event | payload keys |
|-------|--------------|
| listening start | isProcessing: true |
| processing | isProcessing: true, (debug) |
| assistant_partial | text, isProcessing |
| assistant_first_sentence_audio | text, audioBase64, isProcessing |
| done | messages, isProcessing: false, isSpeaking, audioBase64? |
| error | error, errorCode?, isProcessing: false |
| mic_stop | isProcessing: false |

## Config Dependencies

- AUDIO_INPUT_DEVICE_INDEX, AUDIO_INPUT_DEVICE_NAME
- AUDIO_SAMPLE_RATE (16000), AUDIO_CHANNELS
- AUDIO_RECORD_MODE (fixed|vad)
- AUDIO_VAD_FRAME_MS, AUDIO_SILENCE_STOP_MS, AUDIO_SPEECH_TIMEOUT_MS
- AUDIO_MAX_UTTERANCE_MS, AUDIO_SILENT_RMS_THRESHOLD
- ENABLE_FIRST_SENTENCE_TTS
