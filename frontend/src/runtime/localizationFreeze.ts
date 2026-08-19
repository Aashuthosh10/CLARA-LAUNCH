/** Localization freeze helpers — sync freeze flag on additive runtime store. */

import { getConversationRuntime, patchConversationRuntime } from './conversationRuntimeStore';
import { pushRuntimeEvent } from './diagnostics';

export function freezeLocalization(languageName: string, codeKey = 'en'): void {
  patchConversationRuntime({
    currentLanguage: languageName,
    localization: {
      codeKey,
      languageName,
      frozen: true,
    },
  });
  pushRuntimeEvent('LOCALE_FREEZE', { language: languageName });
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
