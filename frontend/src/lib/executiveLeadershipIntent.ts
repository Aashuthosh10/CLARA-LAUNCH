/**
 * Client-side intent hints when `showCard` is missing but the user's question
 * clearly targets Principal or Vice Principal / Dean Academics (multilingual).
 * Vice-principal patterns are evaluated first so phrases like "vice principal"
 * are not routed to the principal card.
 */

export type ExecutiveLeadershipKind = 'principal' | 'vice_principal';

function matchesAny(haystacks: string[], needles: string[]): boolean {
  return needles.some((needle) => haystacks.some((h) => h.includes(needle)));
}

/** Markers for Vice Principal / Dean Academics (checked first). */
const VICE_MARKERS: string[] = [
  // English
  'vice principal',
  'vice-principal',
  'deputy principal',
  'associate principal',
  'dean academics',
  'dean academic',
  'dean of academics',
  'academic dean',
  'dean of academic',
  // Kannada
  'ಉಪ ಪ್ರಾಂಶುಪಾಲ',
  // Hindi
  'उप प्राचार्य',
  'डीन एकेडमिक',
  'शैक्षणिक डीन',
  // Tamil
  'துணை முதல்வர்',
  'உதவி முதல்வர்',
  'கல்வி டீன்',
  // Telugu
  'ఉప ప్రిన్సిపాల్',
  'డీన్ ఎకడెమిక్స్',
  'వైస్ ప్రిన్సిపాల్',
  // Malayalam
  'ഉപ പ്രിൻസിപ്പൽ',
  'അക്കാദമിക് ഡീൻ',
  'ഡീൻ അക്കാദമിക്',
  // Transliterations often seen in spoken queries
  'viceprincipal',
];

/** Principal / institutional head (excluding vice markers already handled). */
const PRINCIPAL_MARKERS: string[] = [
  // English
  'principal of',
  'principle of',
  'the principal',
  'about the principal',
  'tell me about the principal',
  'who is the principal',
  'who is the principle',
  'college principal',
  'who runs the college',
  'who runs this college',
  'runs this college',
  'runs the college',
  'college head',
  'head of the college',
  'head of college',
  'head of the institution',
  'head of institution',
  'institution head',
  'institutional head',
  'academic leadership',
  // Principal as standalone token (avoid matching inside unrelated words minimally)
  ' principal ',
  // Kannada
  'ಪ್ರಾಂಶುಪಾಲ',
  'ಕಾಲೇಜು ಮುಖ್ಯಸ್ಥ',
  // Hindi
  'प्राचार्य',
  'कॉलेज प्रमुख',
  // Tamil
  'முதல்வர்',
  'கல்லூரி தலைவர்',
  // Telugu
  'ప్రిన్సిపాల్',
  'కళాశాల ముఖ్యుడు',
  // Malayalam
  'പ്രിൻസിപ്പൽ',
  'കലാലയ തലവൻ',
];

export function inferExecutiveProfileFromUserText(raw: string): ExecutiveLeadershipKind | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const lower = trimmed.toLowerCase();
  const normalizedSpaced = ` ${lower.replace(/\s+/g, ' ')} `;
  const haystacks = [trimmed, lower, normalizedSpaced];

  if (matchesAny(haystacks, VICE_MARKERS)) {
    return 'vice_principal';
  }

  if (matchesAny(haystacks, PRINCIPAL_MARKERS)) {
    return 'principal';
  }

  // Standalone "principal" / transliterations at edges
  if (/\bprincipal\b/i.test(lower)) return 'principal';
  if (/\bprinciple\b/i.test(lower)) return 'principal';
  if (/प्राचार्य/.test(trimmed)) return 'principal';
  if (/ಪ್ರಾಂಶುಪಾಲ/.test(trimmed)) return 'principal';

  return null;
}
