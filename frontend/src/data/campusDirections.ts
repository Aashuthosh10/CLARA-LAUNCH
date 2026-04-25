import type { Language } from '../context/LanguageContext';

export type CampusDirection = {
  from: string;
  to: string;
  block: 'A' | 'B' | 'C';
  floor: string;
  steps: string[];
  estimated_steps: number;
  estimated_time_seconds: number;
};

export const CAMPUS_DIRECTIONS: CampusDirection[] = [
  { from: 'Main Entrance (inner vertex of the building, between Block A and Block B)', to: 'A-001 - CAED Lab', block: 'A', floor: 'Ground Floor', steps: ['Enter through the main entrance at the inner vertex of the building', 'Walk straight ahead into Block A wing (the vertical south-running wing on your left)', 'Continue south along the Block A corridor', 'A-001 (CAED Lab) is the first major lab on your right side as you enter Block A'], estimated_steps: 33, estimated_time_seconds: 42 },
  { from: 'Main Entrance (inner vertex of the building, between Block A and Block B)', to: 'A-002 - Classroom / Lab', block: 'A', floor: 'Ground Floor', steps: ['Enter the main entrance', 'Turn left into Block A wing', 'Walk south along the corridor', 'Pass A-001 CAED Lab', 'A-002 is the next room on your right'], estimated_steps: 37, estimated_time_seconds: 37 },
  { from: 'Main Entrance (inner vertex of the building, between Block A and Block B)', to: 'A-003 - Classroom', block: 'A', floor: 'Ground Floor', steps: ['Enter the main entrance', 'Turn left into Block A wing', 'Walk south along the corridor', 'Pass A-001 and A-002', 'A-003 is the next classroom on your right'], estimated_steps: 33, estimated_time_seconds: 71 },
  { from: 'Main Entrance (inner vertex of the building, between Block A and Block B)', to: 'A-004 - Boys Washroom', block: 'A', floor: 'Ground Floor', steps: ['Enter the main entrance', 'Turn left into Block A', 'Walk south, passing CAED Lab and classrooms A-001 to A-003', 'A-004 Boys Washroom is on the right near the mid-section of Block A'], estimated_steps: 38, estimated_time_seconds: 32 },
  { from: 'Main Entrance (inner vertex of the building, between Block A and Block B)', to: 'A-005 - Staircase / Utility', block: 'A', floor: 'Ground Floor', steps: ['Enter the main entrance', 'Turn left into Block A', 'Walk south past A-004', 'A-005 is the staircase / utility area just past the boys washroom on your right'], estimated_steps: 34, estimated_time_seconds: 36 },
  { from: 'Main Entrance (inner vertex of the building, between Block A and Block B)', to: 'A-006 - Utility Room', block: 'A', floor: 'Ground Floor', steps: ['Enter the main entrance', 'Turn left and walk south through Block A', 'Continue past the washroom area', 'A-006 is a utility room on the left side of the Block A south section'], estimated_steps: 44, estimated_time_seconds: 26 },
  { from: 'Main Entrance (inner vertex of the building, between Block A and Block B)', to: 'A-007 - Physics Dark Room', block: 'A', floor: 'Ground Floor', steps: ['Enter the main entrance', 'Turn left into Block A wing', 'Walk south along Block A corridor past CAED Lab and washrooms', 'Continue to the lower section of Block A', 'A-007 Physics Dark Room is at the far south end of Block A on your left'], estimated_steps: 47, estimated_time_seconds: 56 },
  { from: 'Main Entrance (inner vertex of the building, between Block A and Block B)', to: 'A-008 - Dept of Physics', block: 'A', floor: 'Ground Floor', steps: ['Enter the main entrance', 'Turn left into Block A', 'Walk all the way south through Block A past labs and washrooms', 'A-008 Department of Physics is in the large lower section of Block A on the left'], estimated_steps: 58, estimated_time_seconds: 38 },
  { from: 'Main Entrance (inner vertex of the building, between Block A and Block B)', to: 'A-009 - Dept of Chemistry', block: 'A', floor: 'Ground Floor', steps: ['Enter the main entrance', 'Turn left into Block A', 'Walk south past the Department of Physics section', 'A-009 Department of Chemistry is in the lower portion of Block A, south of Physics'], estimated_steps: 22, estimated_time_seconds: 36 },
  { from: 'Main Entrance (inner vertex of the building, between Block A and Block B)', to: 'A-010 - Research Centre CSE', block: 'A', floor: 'Ground Floor', steps: ['Enter the main entrance', 'Turn left into Block A', 'Walk south through Block A corridor to the lower section', 'A-010 Research Centre CSE is near the end of Block A on the right side'], estimated_steps: 21, estimated_time_seconds: 38 },
  { from: 'Main Entrance (inner vertex of the building, between Block A and Block B)', to: 'A-011 - NCC Room', block: 'A', floor: 'Ground Floor', steps: ['Enter the main entrance', 'Turn left into Block A', 'Walk south to the lower section', 'A-011 NCC Room is adjacent to A-010 on the right side of Block A'], estimated_steps: 30, estimated_time_seconds: 26 },
  { from: 'Main Entrance (inner vertex of the building, between Block A and Block B)', to: 'A-012 - Store Room', block: 'A', floor: 'Ground Floor', steps: ['Enter the main entrance', 'Turn left into Block A', 'Walk south past A-010 and A-011', 'A-012 Store Room is at the lower section of Block A, right side'], estimated_steps: 31, estimated_time_seconds: 48 },
  { from: 'Main Entrance (inner vertex of the building, between Block A and Block B)', to: 'HoD-Physics - HoD Physics Room', block: 'A', floor: 'Ground Floor', steps: ['Enter the main entrance', 'Turn left into Block A', 'Walk south to the Physics department area (A-008)', 'HoD Physics Room is the smaller office within the Physics section on the left'], estimated_steps: 34, estimated_time_seconds: 20 },
  { from: 'Main Entrance (inner vertex of the building, between Block A and Block B)', to: 'HoD-Chemistry - HoD Chemistry Room', block: 'A', floor: 'Ground Floor', steps: ['Enter the main entrance', 'Turn left into Block A', 'Walk south past the Physics area to the Chemistry section', 'HoD Chemistry Room is the office within the Chemistry department area'], estimated_steps: 26, estimated_time_seconds: 51 },
  { from: 'Main Entrance (inner vertex of the building, between Block A and Block B)', to: 'B-015 - Lift', block: 'B', floor: 'Ground Floor', steps: ['Enter the main entrance', 'Walk straight ahead — you are at the Block A-B junction', 'The Lift (B-015) is immediately visible near the staircase at the junction of Block A and Block B'], estimated_steps: 40, estimated_time_seconds: 61 },
  { from: 'Main Entrance (inner vertex of the building, between Block A and Block B)', to: 'B-012 - Classroom', block: 'B', floor: 'Ground Floor', steps: ['Enter the main entrance', 'Walk straight — the junction area between Block A and Block B is ahead', 'B-012 Classroom is located at the A-B junction, just to the right of the lift area'], estimated_steps: 49, estimated_time_seconds: 21 },
  { from: 'Main Entrance (inner vertex of the building, between Block A and Block B)', to: 'B-013 - Girls Common Room', block: 'B', floor: 'Ground Floor', steps: ['Enter the main entrance', 'Walk straight toward the Block A-B junction area', 'B-013 Girls Common Room is located at the junction, near the lift and staircase area'], estimated_steps: 36, estimated_time_seconds: 31 },
  { from: 'Main Entrance (inner vertex of the building, between Block A and Block B)', to: 'B-014 - Generator Room', block: 'B', floor: 'Ground Floor', steps: ['Enter the main entrance', 'Walk straight toward the Block A-B junction area', 'B-014 Generator Room is at the junction area, towards the south side'], estimated_steps: 28, estimated_time_seconds: 73 },
  { from: 'Main Entrance (inner vertex of the building, between Block A and Block B)', to: 'B-001 - Entrepreneur & Incubation Cell', block: 'B', floor: 'Ground Floor', steps: ['Enter the main entrance (inner vertex)', 'The inner vertex faces the junction between Block A and Block B', 'Turn right slightly into the Block B corridor (the horizontal wing running east-west)', 'Walk west along the 2.45m wide corridor', 'B-001 Entrepreneur and Incubation Cell is on the left side of Block B, towards the western end of the corridor'], estimated_steps: 35, estimated_time_seconds: 79 },
  { from: 'Main Entrance (inner vertex of the building, between Block A and Block B)', to: 'B-002 - Training & Placement Centre', block: 'B', floor: 'Ground Floor', steps: ['Enter the main entrance', 'Turn slightly right into Block B corridor going west', 'Walk west along the corridor past B-001', 'B-002/003 Training and Placement Centre is in the upper-left area of Block B'], estimated_steps: 35, estimated_time_seconds: 38 },
  { from: 'Main Entrance (inner vertex of the building, between Block A and Block B)', to: 'B-003 - Training & Placement Centre (ext)', block: 'B', floor: 'Ground Floor', steps: ['Enter the main entrance', 'Turn right into Block B horizontal corridor', 'Walk west; B-003 is the extension of the Training and Placement Centre, adjacent to B-002'], estimated_steps: 45, estimated_time_seconds: 32 },
  { from: 'Main Entrance (inner vertex of the building, between Block A and Block B)', to: 'B-004 - Principal Chamber', block: 'B', floor: 'Ground Floor', steps: ['Enter the main entrance', 'Turn right and walk east-north along Block B corridor', 'Continue northeast along the main corridor toward the top of Block B', 'B-004 Principal Chamber is in the upper area of Block B, accessible via the 2.45m wide corridor'], estimated_steps: 52, estimated_time_seconds: 62 },
  { from: 'Main Entrance (inner vertex of the building, between Block A and Block B)', to: 'B-005 - Board Room', block: 'B', floor: 'Ground Floor', steps: ['Enter the main entrance', 'Turn right and walk east along the Block B corridor (2.45m wide)', 'Continue to the upper section of Block B', 'B-005 Board Room is adjacent to B-004 Principal Chamber in the top area of Block B'], estimated_steps: 58, estimated_time_seconds: 61 },
  { from: 'Main Entrance (inner vertex of the building, between Block A and Block B)', to: 'B-006 - Director Room', block: 'B', floor: 'Ground Floor', steps: ['Enter the main entrance', 'Walk east along the top corridor of Block B', 'B-006 Director Room is near the top of Block B, adjacent to B-005 Board Room'], estimated_steps: 37, estimated_time_seconds: 41 },
  { from: 'Main Entrance (inner vertex of the building, between Block A and Block B)', to: 'B-007 - Dining Room', block: 'B', floor: 'Ground Floor', steps: ['Enter the main entrance', 'Walk east along the top corridor of Block B', 'B-007 Dining Room is near the top of Block B, north of B-006'], estimated_steps: 52, estimated_time_seconds: 30 },
  { from: 'Main Entrance (inner vertex of the building, between Block A and Block B)', to: 'B-008 - Gymnasium & Fitness', block: 'B', floor: 'Ground Floor', steps: ['Enter the main entrance', 'Walk east along the Block B top corridor', 'Continue past the administrative rooms', 'B-008 Gymnasium and Fitness is to the right at the top of Block B, facing east'], estimated_steps: 44, estimated_time_seconds: 72 },
  { from: 'Main Entrance (inner vertex of the building, between Block A and Block B)', to: 'B-009 - Administrative (corridor room)', block: 'B', floor: 'Ground Floor', steps: ['Enter the main entrance', 'Walk east along the Block B corridor', 'B-009 is the room on the south side of the 2.45m wide corridor, in the mid-section of Block B'], estimated_steps: 26, estimated_time_seconds: 71 },
  { from: 'Main Entrance (inner vertex of the building, between Block A and Block B)', to: 'B-010 - Admin Office Cluster', block: 'B', floor: 'Ground Floor', steps: ['Enter the main entrance', 'Walk east along Block B corridor', 'B-010 Admin Office cluster is in the central-east part of Block B'], estimated_steps: 39, estimated_time_seconds: 56 },
  { from: 'Main Entrance (inner vertex of the building, between Block A and Block B)', to: 'B-011 - Block B-C junction room', block: 'B', floor: 'Ground Floor', steps: ['Enter the main entrance', 'Walk east through Block B corridor all the way to the east end', 'B-011 is the room at the far east end of Block B, at the junction with Block C'], estimated_steps: 29, estimated_time_seconds: 29 },
  { from: 'Main Entrance (inner vertex of the building, between Block A and Block B)', to: 'B-019 - Medical Room', block: 'B', floor: 'Ground Floor', steps: ['Enter the main entrance', 'Walk east along Block B corridor', 'B-019 Medical Room is on the south side of Block B in the mid section'], estimated_steps: 52, estimated_time_seconds: 72 },
  { from: 'Main Entrance (inner vertex of the building, between Block A and Block B)', to: 'QPDS - QPDS Room', block: 'B', floor: 'Ground Floor', steps: ['Enter the main entrance', 'Walk east along the top corridor of Block B', 'QPDS Room is near the top of Block B next to the Pantry'], estimated_steps: 55, estimated_time_seconds: 22 },
  { from: 'Main Entrance (inner vertex of the building, between Block A and Block B)', to: 'PANTRY - Pantry', block: 'B', floor: 'Ground Floor', steps: ['Enter the main entrance', 'Walk east along the top corridor of Block B', 'The Pantry is adjacent to QPDS room, in the north section of Block B'], estimated_steps: 31, estimated_time_seconds: 35 },
  { from: 'Main Entrance (inner vertex of the building, between Block A and Block B)', to: 'C-001 - Dept of ISE Lab 1', block: 'C', floor: 'Ground Floor', steps: ['Enter the main entrance', 'Walk east through the Block B corridor', 'Continue east past Block B, crossing into Block C', 'Walk through the 2.45m wide Block C corridor', 'C-001 ISE Lab 1 is in the upper-left section of Block C'], estimated_steps: 27, estimated_time_seconds: 60 },
  { from: 'Main Entrance (inner vertex of the building, between Block A and Block B)', to: 'C-002 - Dept of ISE Lab 2', block: 'C', floor: 'Ground Floor', steps: ['Enter the main entrance', 'Walk east through Block B, then enter Block C', 'Walk east along the Block C top corridor', 'C-002 ISE Lab 2 is to the right of C-001, in the upper section of Block C'], estimated_steps: 21, estimated_time_seconds: 59 },
  { from: 'Main Entrance (inner vertex of the building, between Block A and Block B)', to: 'C-003 - Library Information Center', block: 'C', floor: 'Ground Floor', steps: ['Enter the main entrance', 'Walk east through Block B corridor', 'Enter Block C and continue east along the top corridor', 'C-003 Library Information Center is at the far top-right (north-east) of Block C'], estimated_steps: 30, estimated_time_seconds: 79 },
  { from: 'Main Entrance (inner vertex of the building, between Block A and Block B)', to: 'C-004 - SMT / Material Testing Lab', block: 'C', floor: 'Ground Floor', steps: ['Enter the main entrance', 'Walk east through Block B and into Block C', 'Walk to the far east end of Block C', 'C-004 SMT / Material Testing Lab is at the far right end of Block C, lower section'], estimated_steps: 38, estimated_time_seconds: 58 },
  { from: 'Main Entrance (inner vertex of the building, between Block A and Block B)', to: 'C-005 - Survey Lab', block: 'C', floor: 'Ground Floor', steps: ['Enter the main entrance', 'Walk east through Block B into Block C', 'Go to the lower section of Block C via the 2.42m wide corridor', 'C-005 Survey Lab is adjacent to C-004, second from the right in the lower Block C row'], estimated_steps: 51, estimated_time_seconds: 27 },
  { from: 'Main Entrance (inner vertex of the building, between Block A and Block B)', to: 'C-006 - Geology Lab', block: 'C', floor: 'Ground Floor', steps: ['Enter the main entrance', 'Walk east through Block B into Block C', 'Use the lower corridor in Block C', 'C-006 Geology Lab is in the lower section of Block C, third from the right'], estimated_steps: 51, estimated_time_seconds: 64 },
  { from: 'Main Entrance (inner vertex of the building, between Block A and Block B)', to: 'C-007 - Block B-C corridor room', block: 'C', floor: 'Ground Floor', steps: ['Enter the main entrance', 'Walk east through Block B', 'At the B-C junction, C-007 is the first room on the left (south) side as you enter Block C from Block B'], estimated_steps: 33, estimated_time_seconds: 38 },
  { from: 'Main Entrance (inner vertex of the building, between Block A and Block B)', to: 'C-008 - Sick Room', block: 'C', floor: 'Ground Floor', steps: ['Enter the main entrance', 'Walk east through Block B corridor', 'Enter Block C; walk to the mid section', 'C-008 Sick Room is on the south side of Block C in the area below the admin office'], estimated_steps: 20, estimated_time_seconds: 50 },
  { from: 'Main Entrance (inner vertex of the building, between Block A and Block B)', to: 'C-009 - Wash Room', block: 'C', floor: 'Ground Floor', steps: ['Enter the main entrance', 'Walk east into Block C', 'C-009 Washroom is adjacent to C-008 Sick Room on the south side of Block C'], estimated_steps: 43, estimated_time_seconds: 75 },
  { from: 'Main Entrance (inner vertex of the building, between Block A and Block B)', to: 'C-010 - Girls Wash Room', block: 'C', floor: 'Ground Floor', steps: ['Enter the main entrance', 'Walk east through Block B into Block C', 'C-010 Girls Washroom is in the upper-left area of Block C, near the Administrative Office'], estimated_steps: 57, estimated_time_seconds: 34 },
  { from: 'Main Entrance (inner vertex of the building, between Block A and Block B)', to: 'C-011 - Girls Room', block: 'C', floor: 'Ground Floor', steps: ['Enter the main entrance', 'Walk east through Block B into Block C', 'C-011 Girls Room is adjacent to C-010, in the upper-left corner of Block C'], estimated_steps: 36, estimated_time_seconds: 25 },
  { from: 'Main Entrance (inner vertex of the building, between Block A and Block B)', to: 'Admin - Administrative Office', block: 'C', floor: 'Ground Floor', steps: ['Enter the main entrance', 'Walk east through the Block B corridor', 'Enter Block C; walk to the centre of Block C', 'The Administrative Office is in the central upper part of Block C, clearly labelled'], estimated_steps: 58, estimated_time_seconds: 36 },
  { from: 'Main Entrance (inner vertex of the building, between Block A and Block B)', to: 'SEMINAR - Swamy Vivekananda Seminar Hall', block: 'C', floor: 'Ground Floor', steps: ['Enter the main entrance', 'Walk east through Block B corridor', 'Enter Block C and continue to the lower section', 'The Swamy Vivekananda Main Seminar Hall is the large central room in the lower portion of Block C', 'It is directly accessible from the 2.42m wide corridor'], estimated_steps: 52, estimated_time_seconds: 53 },
];

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

export function campusLabels(language: Language) {
  return CAMPUS_LANGUAGE_LABELS[language] ?? CAMPUS_LANGUAGE_LABELS.English;
}

export function localizedCampusSteps(direction: CampusDirection, language: Language): string[] {
  const labels = campusLabels(language);
  const arrival = arrivalTemplates[language]
    .replace('{to}', direction.to)
    .replace('{block}', direction.block)
    .replace('{floor}', labels.groundFloor);
  return [...blockGuidance[language][direction.block], arrival];
}

function speechFriendlyRoomText(value: string): string {
  return value
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
