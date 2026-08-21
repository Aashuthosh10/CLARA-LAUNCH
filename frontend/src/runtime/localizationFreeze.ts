/** Localization freeze helpers — sync freeze flag on additive runtime store. */

import { getConversationRuntime, patchConversationRuntime } from './conversationRuntimeStore';
import { pushRuntimeEvent } from './diagnostics';

export function localizationCodeKey(
  languageName: string | null | undefined,
  payloadCode?: string | null,
): string {
  const fromPayload = String(payloadCode || '').trim().toLowerCase();
  if (fromPayload) return fromPayload;
  const map: Record<string, string> = {
    English: 'en',
    Kannada: 'kn',
    Hindi: 'hi',
    Tamil: 'ta',
    Telugu: 'te',
    Malayalam: 'ml',
  };
  return map[(languageName || '').trim()] || 'en';
}

export function freezeLocalization(languageName: string, codeKey = 'en'): void {
  const key = (codeKey || 'en').trim().toLowerCase() || 'en';
  patchConversationRuntime({
    currentLanguage: languageName,
    localization: {
      codeKey: key,
      languageName,
      frozen: true,
    },
  });
  pushRuntimeEvent('LOCALE_FREEZE', { language: languageName, codeKey: key });
}

export function releaseLocalizationFreeze(): void {
  const snap = getConversationRuntime();
  patchConversationRuntime({
    localization: { ...snap.localization, frozen: false },
    activePresentationId: null,
    activeScene: null,
    runtimeState: 'idle',
  });
  pushRuntimeEvent('LOCALE_RELEASE', { language: snap.currentLanguage });
}

export function isLocalizationFrozen(): boolean {
  return getConversationRuntime().localization.frozen;
}

/** Returns false when language change must be ignored during an active presentation. */
export function canChangeLanguageNow(): boolean {
  return !isLocalizationFrozen();
}
