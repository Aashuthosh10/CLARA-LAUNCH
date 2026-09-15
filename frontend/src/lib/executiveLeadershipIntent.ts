/**
 * Executive leadership card identity.
 *
 * M5.4: the backend response decision owns principal / vice-principal triggering.
 * Only the rendering kind survives here; the client no longer infers the card
 * from user text.
 */

import type { DeanProfileId } from './deanLeadershipLocale';

export type ExecutiveLeadershipKind =
  | 'principal'
  | 'vice_principal'
  | 'deans'
  | DeanProfileId;
