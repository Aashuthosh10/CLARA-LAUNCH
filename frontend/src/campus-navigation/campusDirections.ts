import type { Language } from '../context/LanguageContext';
import { buildPriorityCampusDirections } from './campusPriorityCatalog';

export type CampusDirection = {
  from: string;
  to: string;
  block: 'A' | 'B' | 'C';
  floor: string;
  /** When set (e.g. from map match), overrides code-based floor heuristics in the map UI. */
  floor_id?: 'GF' | 'FF' | 'SF';
  steps: string[];
  estimated_steps: number;
  estimated_time_seconds: number;
};

/** Priority destinations aligned with svit-campus-map.json (labs, admin, seminars, circulation). */
export const CAMPUS_DIRECTIONS: CampusDirection[] = buildPriorityCampusDirections();

export const CAMPUS_LANGUAGE_LABELS: Record<Language, Record<string, string>> = {
  English: {
    campusNavigation: 'Campus Navigation',
    destination: 'Destination',
    chooseDestination: 'Choose destination',
    visualMap: 'Visual Map',
    mainEntrance: 'Main Entrance',
    directions: 'Directions',
    steps: 'steps',
    seconds: 'sec',
    speak: 'Read Directions',
    stop: 'Stop Voice',
    block: 'Block',
    groundFloor: 'Ground Floor',
    routePreview: 'Route preview',
    selectPrompt: 'Select a destination to view the route.',
    selectRoomPrompt: 'Please select the room that you want to visit.',
    chat: 'Chat',
    start: 'Start',
    turnLeft: 'Turn left',
    turnRight: 'Turn right',
    goStraight: 'Walk straight',
    keepGoing: 'Keep going',
    reached: 'You reached',
    voiceDestinationPrompt:
      "Which room or place would you like to visit? Tap below to speak—for example 'A-001' or 'seminar hall'.",
    voiceNotUnderstood: "I didn't catch a confident room match. Try saying the room code or a shorter name.",
    voiceNoSpeechHeard: "I didn't hear speech. Tap the orb and try again.",
    voiceMatchedIntro: 'Showing directions for {name}.',
    floorPlanTabs: 'Floor',
    floorTabGF: 'Ground',
    floorTabFF: 'First',
    floorTabSF: 'Second',
    campusAsideVoiceHint: 'Tap the orb to say where you want to go.',
    campusRouteMetaRouteMode: 'Route mode',
    campusWhereToHeading: 'Where to?',
    campusClarifyTapHint: 'Tap a room to get directions.',
    campusMapLoading: 'Loading campus map…',
    campusMapLoadError: 'Could not load campus map.',
    campusMapOverlayUnavailable: 'Outline data for this room is not on the map yet — the floor plan still shows below.',
    campusMapNoOverlayMatch: 'This destination has no matching room on the vector map yet.',
    campusMapSwitchFloorHint: 'Switch the floor tab above to see this room on the map.',
    campusRouteFloorsInvolved: 'Route uses floors:',
    campusRouteRecalculating: 'Recalculating route…',
    campusRouteRetryCta: 'Retry route',
    campusRouteFallbackHint: 'Generic step-by-step directions below may still help.',
    campusRouteNotes: 'Notes',
    campusEta: 'ETA (est.)',
    campusRepeat: 'Repeat',
    campusChangeDestination: 'Change destination',
    campusYouAreHere: 'YOU ARE HERE',
    floorTabGFFull: 'Ground Floor',
    floorTabFFFull: 'First Floor',
    floorTabSFFull: 'Second Floor',
    campusMapZoomControls: 'Map zoom',
    campusMapZoomIn: 'Zoom in',
    campusMapZoomOut: 'Zoom out',
    campusMapCompassHint: 'Map north indicator',
    campusMapLegendTitle: 'Map symbols',
    campusMapLegendRoute: 'Route',
    campusMapLegendYouAreHere: 'You are here',
    campusMapLegendDoor: 'Door',
    campusMapLegendLift: 'Lift',
    campusMapLegendStairs: 'Stairs',
    campusEtaShort: 'ETA',
    campusDistanceShort: 'Distance',
    campusStepCountMetric: 'Steps',
    campusModeShortest: 'Shortest',
    campusModeAccessible: 'Accessible',
    campusModeLift: 'Lift',
    campusModeStairs: 'Stairs',
    campusStartOver: 'Start over',
    campusRouteComputing: 'Computing route…',
    campusTripSummary: 'Trip summary',
    campusVoiceRepeat: 'Read aloud',
    campusChooseDestinationShort: 'Destination',
    campusAsideRoutingOnMap: 'Use the map and the routing panel beside it to choose a destination and hear directions.',
    campusKioskBrandShort: 'CLARA',
    campusKioskSearchPlaceholder: 'Search for places, rooms, departments…',
    campusKioskDirectory: 'Directory',
    campusKioskHelp: 'Help',
    campusKioskLanguage: 'Language',
    campusKioskChromeNav: 'Campus kiosk links',
    campusKioskHelpBody:
      'Pick a destination from the directory or search, then follow the purple route on the map. Tap the orb to speak a room code or name. Use Read aloud for step-by-step audio.',
    campusKioskChangeDestinationCta: 'Change destination',
  },
  Kannada: {
    campusNavigation: 'ಕ್ಯಾಂಪಸ್ ನ್ಯಾವಿಗೇಶನ್',
    destination: 'ಗಮ್ಯಸ್ಥಾನ',
    chooseDestination: 'ಗಮ್ಯಸ್ಥಾನ ಆಯ್ಕೆಮಾಡಿ',
    visualMap: 'ದೃಶ್ಯ ನಕ್ಷೆ',
    mainEntrance: 'ಮುಖ್ಯ ಪ್ರವೇಶ ದ್ವಾರ',
    directions: 'ದಿಕ್ಕುಗಳು',
    steps: 'ಹೆಜ್ಜೆಗಳು',
    seconds: 'ಸೆಕೆಂಡು',
    speak: 'ದಿಕ್ಕುಗಳನ್ನು ಓದಿ',
    stop: 'ಧ್ವನಿ ನಿಲ್ಲಿಸಿ',
    block: 'ಬ್ಲಾಕ್',
    groundFloor: 'ನೆಲ ಮಹಡಿ',
    routePreview: 'ಮಾರ್ಗ ಪೂರ್ವನೋಟ',
    selectPrompt: 'ಮಾರ್ಗವನ್ನು ನೋಡಲು ಗಮ್ಯಸ್ಥಾನವನ್ನು ಆಯ್ಕೆಮಾಡಿ.',
    selectRoomPrompt: 'ದಯವಿಟ್ಟು ನೀವು ಭೇಟಿ ನೀಡಲು ಬಯಸುವ ಕೊಠಡಿಯನ್ನು ಆಯ್ಕೆಮಾಡಿ.',
    chat: 'ಚಾಟ್',
    start: 'ಪ್ರಾರಂಭ',
    turnLeft: 'ಎಡಕ್ಕೆ ತಿರುಗಿ',
    turnRight: 'ಬಲಕ್ಕೆ ತಿರುಗಿ',
    goStraight: 'ನೇರವಾಗಿ ನಡೆಯಿರಿ',
    keepGoing: 'ಮುಂದುವರಿಯಿರಿ',
    reached: 'ನೀವು ತಲುಪಿದ್ದೀರಿ',
  },
  Hindi: {
    campusNavigation: 'कैंपस नेविगेशन',
    destination: 'गंतव्य',
    chooseDestination: 'गंतव्य चुनें',
    visualMap: 'विजुअल मैप',
    mainEntrance: 'मुख्य प्रवेश द्वार',
    directions: 'दिशा-निर्देश',
    steps: 'कदम',
    seconds: 'सेकंड',
    speak: 'दिशा पढ़ें',
    stop: 'आवाज रोकें',
    block: 'ब्लॉक',
    groundFloor: 'भूतल',
    routePreview: 'मार्ग पूर्वावलोकन',
    selectPrompt: 'मार्ग देखने के लिए गंतव्य चुनें.',
    selectRoomPrompt: 'कृपया वह कमरा चुनें जहां आप जाना चाहते हैं.',
    chat: 'चैट',
    start: 'शुरू करें',
    turnLeft: 'बाएं मुड़ें',
    turnRight: 'दाएं मुड़ें',
    goStraight: 'सीधे चलें',
    keepGoing: 'आगे चलते रहें',
    reached: 'आप पहुंच गए',
  },
  Tamil: {
    campusNavigation: 'வளாக வழிகாட்டல்',
    destination: 'இலக்கு',
    chooseDestination: 'இலக்கைத் தேர்ந்தெடுக்கவும்',
    visualMap: 'காட்சி வரைபடம்',
    mainEntrance: 'முதன்மை நுழைவாயில்',
    directions: 'வழிமுறைகள்',
    steps: 'படிகள்',
    seconds: 'வினாடி',
    speak: 'வழிமுறைகளை வாசிக்கவும்',
    stop: 'குரலை நிறுத்து',
    block: 'பிளாக்',
    groundFloor: 'தரைத்தளம்',
    routePreview: 'பாதை முன்னோட்டம்',
    selectPrompt: 'பாதையைப் பார்க்க இலக்கைத் தேர்ந்தெடுக்கவும்.',
    selectRoomPrompt: 'நீங்கள் செல்ல விரும்பும் அறையைத் தேர்ந்தெடுக்கவும்.',
    chat: 'அரட்டை',
    start: 'தொடங்கு',
    turnLeft: 'இடப்புறம் திரும்புங்கள்',
    turnRight: 'வலப்புறம் திரும்புங்கள்',
    goStraight: 'நேராக நடக்கவும்',
    keepGoing: 'தொடர்ந்து செல்லுங்கள்',
    reached: 'நீங்கள் வந்துவிட்டீர்கள்',
  },
  Telugu: {
    campusNavigation: 'క్యాంపస్ నావిగేషన్',
    destination: 'గమ్యం',
    chooseDestination: 'గమ్యాన్ని ఎంచుకోండి',
    visualMap: 'విజువల్ మ్యాప్',
    mainEntrance: 'ప్రధాన ప్రవేశ ద్వారం',
    directions: 'దిశలు',
    steps: 'అడుగులు',
    seconds: 'సెకన్లు',
    speak: 'దిశలను చదవండి',
    stop: 'వాయిస్ ఆపు',
    block: 'బ్లాక్',
    groundFloor: 'గ్రౌండ్ ఫ్లోర్',
    routePreview: 'మార్గం ప్రివ్యూ',
    selectPrompt: 'మార్గాన్ని చూడడానికి గమ్యాన్ని ఎంచుకోండి.',
    selectRoomPrompt: 'దయచేసి మీరు వెళ్లాలనుకునే గదిని ఎంచుకోండి.',
    chat: 'చాట్',
    start: 'ప్రారంభం',
    turnLeft: 'ఎడమవైపు తిరగండి',
    turnRight: 'కుడివైపు తిరగండి',
    goStraight: 'నేరుగా నడవండి',
    keepGoing: 'ముందుకు కొనసాగండి',
    reached: 'మీరు చేరుకున్నారు',
  },
  Malayalam: {
    campusNavigation: 'ക്യാമ്പസ് നാവിഗേഷൻ',
    destination: 'ലക്ഷ്യം',
    chooseDestination: 'ലക്ഷ്യം തിരഞ്ഞെടുക്കുക',
    visualMap: 'വിഷ്വൽ മാപ്പ്',
    mainEntrance: 'പ്രധാന പ്രവേശനം',
    directions: 'ദിശകൾ',
    steps: 'ചുവടുകൾ',
    seconds: 'സെക്കൻഡ്',
    speak: 'ദിശകൾ വായിക്കുക',
    stop: 'ശബ്ദം നിർത്തുക',
    block: 'ബ്ലോക്ക്',
    groundFloor: 'ഗ്രൗണ്ട് ഫ്ലോർ',
    routePreview: 'റൂട്ട് പ്രിവ്യൂ',
    selectPrompt: 'റൂട്ട് കാണാൻ ഒരു ലക്ഷ്യം തിരഞ്ഞെടുക്കുക.',
    selectRoomPrompt: 'ദയവായി നിങ്ങൾ പോകാൻ ആഗ്രഹിക്കുന്ന മുറി തിരഞ്ഞെടുക്കുക.',
    chat: 'ചാറ്റ്',
    start: 'തുടക്കം',
    turnLeft: 'ഇടത്തേക്ക് തിരിയുക',
    turnRight: 'വലത്തേക്ക് തിരിയുക',
    goStraight: 'നേരെ നടക്കുക',
    keepGoing: 'മുന്നോട്ട് തുടരുക',
    reached: 'നിങ്ങൾ എത്തി',
  },
};

const blockGuidance: Record<Language, Record<CampusDirection['block'], string[]>> = {
  English: {
    A: ['Start from the main entrance.', 'Turn left into Block A.', 'Walk straight inside the corridor.', 'Look for the room board on the wall.'],
    B: ['Start from the main entrance.', 'Walk straight to the Block A and Block B joining area.', 'For Block B rooms, turn right when the corridor opens.', 'Look for the room board on the wall.'],
    C: ['Start from the main entrance.', 'Turn right into Block B.', 'Walk straight until the next building section starts.', 'Enter Block C and look for the room board on the wall.'],
  },
  Kannada: {
    A: ['ಮುಖ್ಯ ಪ್ರವೇಶ ದ್ವಾರದಿಂದ ಪ್ರಾರಂಭಿಸಿ.', 'ಎಡಕ್ಕೆ ತಿರುಗಿ Block A ಗೆ ಹೋಗಿ.', 'ಕಾರಿಡಾರ್ ಒಳಗೆ ನೇರವಾಗಿ ನಡೆಯಿರಿ.', 'ಗೋಡೆಯ ಮೇಲಿನ ಕೊಠಡಿ ಫಲಕವನ್ನು ನೋಡಿ.'],
    B: ['ಮುಖ್ಯ ಪ್ರವೇಶ ದ್ವಾರದಿಂದ ಪ್ರಾರಂಭಿಸಿ.', 'Block A ಮತ್ತು Block B ಸೇರುವ ಜಾಗದವರೆಗೆ ನೇರವಾಗಿ ನಡೆಯಿರಿ.', 'Block B ಕೊಠಡಿಗಳಿಗೆ, ಕಾರಿಡಾರ್ ತೆರೆದಾಗ ಬಲಕ್ಕೆ ತಿರುಗಿ.', 'ಗೋಡೆಯ ಮೇಲಿನ ಕೊಠಡಿ ಫಲಕವನ್ನು ನೋಡಿ.'],
    C: ['ಮುಖ್ಯ ಪ್ರವೇಶ ದ್ವಾರದಿಂದ ಪ್ರಾರಂಭಿಸಿ.', 'ಬಲಕ್ಕೆ ತಿರುಗಿ Block B ಗೆ ಹೋಗಿ.', 'ಮುಂದಿನ ಕಟ್ಟಡ ಭಾಗ ಕಾಣುವವರೆಗೆ ನೇರವಾಗಿ ನಡೆಯಿರಿ.', 'Block C ಗೆ ಹೋಗಿ, ಗೋಡೆಯ ಮೇಲಿನ ಕೊಠಡಿ ಫಲಕವನ್ನು ನೋಡಿ.'],
  },
  Hindi: {
    A: ['मुख्य प्रवेश द्वार से शुरू करें.', 'बाएं मुड़कर Block A में जाएं.', 'कॉरिडोर के अंदर सीधे चलते रहें.', 'दीवार पर लगे कमरे के बोर्ड को देखें.'],
    B: ['मुख्य प्रवेश द्वार से शुरू करें.', 'Block A और Block B के मिलने वाले स्थान तक सीधे चलें.', 'Block B कमरों के लिए, कॉरिडोर खुलते ही दाएं मुड़ें.', 'दीवार पर लगे कमरे के बोर्ड को देखें.'],
    C: ['मुख्य प्रवेश द्वार से शुरू करें.', 'दाएं मुड़कर Block B में जाएं.', 'अगला भवन भाग शुरू होने तक सीधे चलें.', 'Block C में जाएं और दीवार पर लगे कमरे के बोर्ड को देखें.'],
  },
  Tamil: {
    A: ['முதன்மை நுழைவாயிலில் இருந்து தொடங்குங்கள்.', 'இடப்புறம் திரும்பி Block A-க்கு செல்லுங்கள்.', 'வழிச்சாலையின் உள்ளே நேராக நடக்கவும்.', 'சுவரில் உள்ள அறை பலகையைப் பாருங்கள்.'],
    B: ['முதன்மை நுழைவாயிலில் இருந்து தொடங்குங்கள்.', 'Block A மற்றும் Block B சேரும் இடம் வரை நேராக செல்லுங்கள்.', 'Block B அறைகளுக்கு, வழிச்சாலை திறக்கும் இடத்தில் வலப்புறம் திரும்புங்கள்.', 'சுவரில் உள்ள அறை பலகையைப் பாருங்கள்.'],
    C: ['முதன்மை நுழைவாயிலில் இருந்து தொடங்குங்கள்.', 'வலப்புறம் திரும்பி Block B-க்கு செல்லுங்கள்.', 'அடுத்த கட்டிடம் தொடங்கும் வரை நேராக செல்லுங்கள்.', 'Block C-க்கு சென்று சுவரில் உள்ள அறை பலகையைப் பாருங்கள்.'],
  },
  Telugu: {
    A: ['ప్రధాన ప్రవేశ ద్వారం నుంచి ప్రారంభించండి.', 'ఎడమవైపు తిరిగి Block A లోకి వెళ్లండి.', 'కారిడార్ లోపల నేరుగా నడవండి.', 'గోడపై ఉన్న గది బోర్డును చూడండి.'],
    B: ['ప్రధాన ప్రవేశ ద్వారం నుంచి ప్రారంభించండి.', 'Block A మరియు Block B కలిసే ప్రదేశం వరకు నేరుగా నడవండి.', 'Block B గదుల కోసం, కారిడార్ తెరుచుకున్నప్పుడు కుడివైపు తిరగండి.', 'గోడపై ఉన్న గది బోర్డును చూడండి.'],
    C: ['ప్రధాన ప్రవేశ ద్వారం నుంచి ప్రారంభించండి.', 'కుడివైపు తిరిగి Block B లోకి వెళ్లండి.', 'తర్వాతి భవన భాగం మొదలయ్యే వరకు నేరుగా నడవండి.', 'Block C లోకి వెళ్లి గోడపై ఉన్న గది బోర్డును చూడండి.'],
  },
  Malayalam: {
    A: ['പ്രധാന പ്രവേശനത്തിൽ നിന്ന് തുടങ്ങുക.', 'ഇടത്തേക്ക് തിരിഞ്ഞ് Block A-ലേക്ക് പോകുക.', 'ഇടനാഴിക്കുള്ളിൽ നേരെ നടക്കുക.', 'ഭിത്തിയിലെ മുറി ബോർഡ് നോക്കുക.'],
    B: ['പ്രധാന പ്രവേശനത്തിൽ നിന്ന് തുടങ്ങുക.', 'Block Aയും Block Bയും ചേരുന്നിടം വരെ നേരെ നടക്കുക.', 'Block B മുറികൾക്കായി, ഇടനാഴി തുറക്കുന്നിടത്ത് വലത്തേക്ക് തിരിയുക.', 'ഭിത്തിയിലെ മുറി ബോർഡ് നോക്കുക.'],
    C: ['പ്രധാന പ്രവേശനത്തിൽ നിന്ന് തുടങ്ങുക.', 'വലത്തേക്ക് തിരിഞ്ഞ് Block B-ലേക്ക് പോകുക.', 'അടുത്ത കെട്ടിട ഭാഗം തുടങ്ങുന്നതുവരെ നേരെ നടക്കുക.', 'Block C-ലേക്ക് കയറി ഭിത്തിയിലെ മുറി ബോർഡ് നോക്കുക.'],
  },
};

const arrivalTemplates: Record<Language, string> = {
  English: '{to} is on the {floor} in Block {block}.',
  Kannada: '{to} Block {block} ನ {floor}ದಲ್ಲಿ ಇದೆ.',
  Hindi: '{to}, Block {block} के {floor} पर है.',
  Tamil: '{to} Block {block} இன் {floor}த்தில் உள்ளது.',
  Telugu: '{to} Block {block} లోని {floor}లో ఉంది.',
  Malayalam: '{to} Block {block}-ലെ {floor}ൽ ആണ്.',
};

const _EN = CAMPUS_LANGUAGE_LABELS.English;

export function campusLabels(language: Language): Record<string, string> {
  const base = (CAMPUS_LANGUAGE_LABELS[language] ?? CAMPUS_LANGUAGE_LABELS.English) as Record<string, string>;
  return new Proxy(base, {
    get(target, prop: string) {
      const v = target[prop];
      if (v !== undefined && v !== '') return v as string;
      const fb = (_EN as Record<string, string>)[prop];
      return typeof fb === 'string' ? fb : '';
    },
  }) as Record<string, string>;
}

export function localizedFloorLabel(direction: CampusDirection, labels: Record<string, string>): string {
  const id = direction.floor_id;
  if (id === 'FF') return labels.floorTabFF || direction.floor;
  if (id === 'SF') return labels.floorTabSF || direction.floor;
  if (id === 'GF') return labels.floorTabGF || direction.floor;
  return direction.floor || labels.groundFloor;
}

export function localizedCampusSteps(direction: CampusDirection, language: Language): string[] {
  const labels = campusLabels(language);
  const floorDisplay = localizedFloorLabel(direction, labels);
  if ((direction.floor_id === 'FF' || direction.floor_id === 'SF') && language === 'English') {
    return [
      'Start from the CLARA kiosk.',
      'Follow the highlighted route to the Ground Floor lift.',
      `Take the lift to the ${floorDisplay}.`,
      'Exit the lift and follow the highlighted corridor route.',
      `Arrive at ${direction.to}.`,
    ];
  }
  const arrival = arrivalTemplates[language]
    .replace('{to}', direction.to)
    .replace('{block}', direction.block)
    .replace('{floor}', floorDisplay);
  return [...blockGuidance[language][direction.block], arrival];
}

function speechFriendlyRoomText(value: string): string {
  return value
    .replace(/\([^)]*Floor\)\s*$/i, '')
    .replace(/\b([ABC])-0*(\d+)\/0*(\d+)\b/g, 'Block $1 rooms $2 and $3')
    .replace(/\b([ABC])-0*(\d+)\b/g, 'Block $1 room $2')
    .replace(/\bHoD-Physics\b/g, 'H O D Physics')
    .replace(/\bHoD-Chemistry\b/g, 'H O D Chemistry')
    .replace(/\bQPDS\b/g, 'Q P D S');
}

export function campusSpeechText(direction: CampusDirection, language: Language): string {
  const labels = campusLabels(language);
  const steps = localizedCampusSteps(direction, language).map(speechFriendlyRoomText);
  return speechFriendlyRoomText(`${labels.directions}. ${direction.to}. ${steps.join(' ')}`);
}

export const campusNavigationSpeechText = campusSpeechText;
