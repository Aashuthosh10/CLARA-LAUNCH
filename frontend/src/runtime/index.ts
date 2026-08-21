/** Frontend runtime integrity (Milestone 2). */

export {
  getConversationRuntime,
  patchConversationRuntime,
  resetConversationRuntime,
  subscribeConversationRuntime,
} from './conversationRuntimeStore';
export { assertRuntimeOwnership, assertLivePresentationOwnership } from './ownership';
export {
  canChangeLanguageNow,
  freezeLocalization,
  isLocalizationFrozen,
  localizationCodeKey,
  releaseLocalizationFreeze,
} from './localizationFreeze';
export {
  choosePresentationFallback,
  validatePresentationContract,
} from './presentationContract';
export { getRuntimeTimeline, pushRuntimeEvent } from './diagnostics';
export { runtimeSettings } from './settings';
export type {
  ConversationRuntimeSnapshot,
  OwnershipTokens,
  PresentationContractResult,
} from './types';
