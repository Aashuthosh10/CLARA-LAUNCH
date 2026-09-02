# M5.10 — Real STT Provenance Gate Report

Date: 2026-08-26  
Environment: real external Chrome tab, `http://localhost:5176/`  
Scope: one diagnostic interaction only. No production code, parser logic, locale content, ChatScreen, PresentationEngine, UnitSelector, STT implementation, or transport was changed.

## Result

The real Chrome UI interaction was completed through the actual controls:

1. CLARA was opened from the existing Chrome tab.
2. The session reached the language-selection UI.
3. `ಕನ್ನಡ Kannada` was selected.
4. The real `Tap to speak` button was located and clicked.
5. The UI changed from idle (`Tap to speak`) to `Listening...`; the control was exposed as `Voice input listening`.
6. After approximately 1.5 seconds with no supplied speech, the UI returned to idle.

The automation cannot provide human microphone speech. Therefore the required speech-input step was not performed:

> Unable to perform the speech-input step.

This run must not be interpreted as proof that Chrome SpeechRecognition, the backend, the parser, card selection, presentation, or TTS failed.

## Required provenance answers

1. **What the human said:** Nothing was spoken during this automated run.
2. **What Chrome returned:** No interim or final transcript was observed.
3. **Exact backend text:** Not observed; no final transcript was available to dispatch.
4. **Was language preserved?** Kannada was visibly selected in the UI. The source configuration maps Kannada to `kn-IN`; a live `recognition.lang` value was not exposed by the page diagnostics during this run.
5. **Did the parser receive the correct transcript?** Not applicable. No genuine final transcript was produced.
6. **First proven failure boundary:** None proven. The evidence boundary is `real microphone speech input not provided`; the run ended before a transcript existed.
7. **Did a real transcript reproduce the previous regional-language failure?** No. There was no real transcript to compare.
8. **What next:** Perform the speech step manually in the already verified listening state, or use a separately approved real-audio input path. Capture the Chrome final transcript and its dispatch before investigating downstream layers.

## A–I acceptance checklist

| Check | Result | Evidence |
|---|---|---|
| A. Did automation click `Tap to Speak`? | YES | Real Chrome button click succeeded. |
| B. Did CLARA enter Listening? | YES | DOM showed `Voice input listening` and `Listening...`. |
| C. Did SpeechRecognition start? | NOT PROVEN | The page exposed listening state, but no explicit `onstart` diagnostic event was captured. |
| D. Was actual speech/transcript provided? | NO | The automation cannot provide human microphone speech. |
| E. Was a final transcript produced? | NO | No interim/final transcript observed. |
| F. Was it sent to backend? | NO | No final transcript existed for dispatch. |
| G. What unitIds came back? | NONE OBSERVED | No backend response was caused by this run. |
| H. Did cards visibly advance? | NOT TESTED | The run stopped before a response plan. |
| I. Did TTS match the active card? | NOT TESTED | The run stopped before a response plan. |

## Runtime health observed

- Frontend URL remained `http://localhost:5176/` throughout the interaction.
- Vite console events showed `connecting...` followed by `connected.`
- The browser console showed `CLARA WebSocket connected` before the test.
- No Vite restart/crash was observed during this short run.
- The page did show pre-existing React style warnings involving `animation`/`animationDelay`; these did not prevent the UI from entering Listening and were not changed.

## Event evidence

Observed UI sequence:

```text
idle: Tap to speak
  -> real button click
listening: Voice input listening / Listening...
  -> approximately 1.5 seconds without supplied speech
idle: Tap to speak
```

No trustworthy browser events were captured for `onstart`, `onresult`, `onerror`, `onend`, `user_message_sent`, backend response, plan, presentation activation, visible unit, or TTS. The existing console output contained generic runtime diagnostics and the pre-existing WebSocket-connected message, but not a real transcript or fabricated transport event.

## Hard-stop conclusion

The provenance gate is **not passed** and no implementation fix is authorized by this evidence. The only demonstrated fact is that the real UI click works and enters its listening state. A future run must supply real speech after that click and capture the resulting final transcript before any backend or regional-language diagnosis is made.

No commit or push was made.
