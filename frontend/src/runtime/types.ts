/** Runtime integrity types (Milestone 2). */

export type LocalizationFreeze = {
  codeKey: string;
  languageName: string;
  frozen: boolean;
};

export type ConversationRuntimeSnapshot = {
  sessionId: string | null;
  conversationId: string | null;
  turnId: string | null;
  generation: number;
  guestName: string | null;
  currentLanguage: string;
  previousIntent: string | null;
  currentIntent: string | null;
  activePresentationId: string | null;
  activeSurface: string | null;
  activeScene: number | null;
  runtimeState: string;
  localization: LocalizationFreeze;
};

export type OwnershipTokens = {
  sessionId?: string | null;
  conversationId?: string | null;
  turnId?: string | null;
  presentationId?: string | null;
  generation?: number | null;
  language?: string | null;
};

export type ContractFailure = {
  reason: string;
  expected?: unknown;
  actual?: unknown;
};

export type PresentationContractResult = {
  ok: boolean;
  failures: ContractFailure[];
  counts: Record<string, number>;
};

export const INITIAL_RUNTIME_SNAPSHOT: ConversationRuntimeSnapshot = {
  sessionId: null,
  conversationId: null,
  turnId: null,
  generation: 0,
  guestName: null,
  currentLanguage: 'English',
  previousIntent: null,
  currentIntent: null,
  activePresentationId: null,
  activeSurface: null,
  activeScene: null,
  runtimeState: 'idle',
  localization: {
    codeKey: 'en',
    languageName: 'English',
    frozen: false,
  },
};
