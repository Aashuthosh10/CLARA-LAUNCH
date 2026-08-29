import { Capability, PipelineStage, TechLayer, EcosystemRole, Creator, QuerySimulation } from '../types';
import aashuthoshImage from '../assets/images/creators/a-n-aashuthosh.png';
import dhanushImage from '../assets/images/creators/dhanush-s-babu.png';
import naveenImage from '../assets/images/creators/m-naveen-kumar.png';
import chinmayiImage from '../assets/images/creators/chinmayi-shastry-l.png';
import adithyaImage from '../assets/images/creators/adithya-nc.png';

export const CAPABILITIES: Capability[] = [
  {
    id: 'conversations',
    title: 'Intelligent Conversations',
    shortDesc: 'Natural-language interaction powered by advanced contextual AI.',
    fullDesc: 'CLARA understands complex multi-turn queries, disambiguates visitor intents, and converses with empathy, institutional professionalism, and high accuracy.',
    category: 'Intelligence',
    icon: 'MessageSquareText',
    angle: 0,
    metric: 'Contextual Multi-turn Memory',
    features: ['Intent disambiguation', 'Multi-turn dialog memory', 'Tone & etiquette calibration', 'Instant fallback routing'],
    sampleInteraction: {
      user: 'Hi, I need to submit my research paper for the AI symposium, but I cannot find Dr. Vance’s office.',
      clara: 'Dr. Sarah Vance is located in Tech Complex Block 4, Room 412. She is currently holding office hours until 4:30 PM. Would you like me to reserve a 10-minute queue slot or notify her student assistant?',
      actionTag: 'Resolved in 2.1s'
    }
  },
  {
    id: 'knowledge',
    title: 'Institutional Knowledge',
    shortDesc: 'Retrieves verified campus-specific information through real-time RAG.',
    fullDesc: 'Indexes campus syllabi, administrative bylaws, department directories, lab timetables, and campus maps. Never hallucinates private information.',
    category: 'Intelligence',
    icon: 'Database',
    angle: 45,
    metric: 'Vector Grounded Retrieval',
    features: ['Semantic vector embeddings', 'Department-specific knowledge siloing', 'Dynamic document ingestion', 'Strict source attribution'],
    sampleInteraction: {
      user: 'What is the attendance requirement for writing the semester final exams?',
      clara: 'According to Academic Regulation 2025 (Section 4.2), undergraduate students must maintain a minimum 75% aggregate attendance per course to be eligible for end-term examinations.',
      actionTag: 'Source: Academic Policy 2025 §4.2'
    }
  },
  {
    id: 'appointments',
    title: 'Smart Appointments',
    shortDesc: 'Discovers staff schedules and coordinates calendar slot reservations.',
    fullDesc: 'Seamlessly reads faculty office hours, detects conflict-free time slots, issues digital visitor passes, and sends automated calendar confirmations.',
    category: 'Institutional',
    icon: 'CalendarCheck',
    angle: 90,
    metric: 'Automated Calendar Sync',
    features: ['Faculty calendar integration', 'Conflict resolution engine', 'Visitor pass generation', 'SMS & email notification dispatch'],
    sampleInteraction: {
      user: 'Can I book a 15-minute slot with Prof. Sharma this Thursday afternoon?',
      clara: 'Prof. Sharma is free between 2:15 PM and 3:00 PM on Thursday. I have prepared a slot for 2:30 PM. Shall I confirm this and generate your visitor pass QR code?',
      actionTag: 'Calendar Confirmed'
    }
  },
  {
    id: 'staff',
    title: 'Staff Management',
    shortDesc: 'Centralized interaction, office-hours status, and faculty presence dispatch.',
    fullDesc: 'Empowers department chairs and administrative staff to broadcast status updates, designate proxy advisors, and manage visitor queues in real-time.',
    category: 'Institutional',
    icon: 'Users',
    angle: 135,
    metric: 'Real-Time Presence Tracking',
    features: ['Live office availability toggles', 'Queue priority delegation', 'Department-wide notices', 'Visitor analytics logging'],
    sampleInteraction: {
      user: 'Is Dean Robinson accepting walk-in signatures today for foreign transcripts?',
      clara: 'Dean Robinson is currently in an Academic Council meeting until 3:00 PM. Associate Dean Miller is authorized for transcript verification at Counter 3 right now.',
      actionTag: 'Live Roster Dispatch'
    }
  },
  {
    id: 'realtime',
    title: 'Real-Time Communication',
    shortDesc: 'Instant alert feeds and event broadcasting powered by WebSockets.',
    fullDesc: 'Bi-directional WebSocket infrastructure allows immediate notifications to staff when a visitor checks in at reception or when a class venue is relocated.',
    category: 'Interaction',
    icon: 'Zap',
    angle: 180,
    metric: '< 45ms WebSocket Ping',
    features: ['Push event synchronization', 'Desk kiosk pinging', 'Staff mobile push alerts', 'Emergency broadcast capability'],
    sampleInteraction: {
      user: 'A guest lecturer from Stanford has arrived at the North Entrance.',
      clara: 'Guest recognized: Dr. Paul Thorne. Alert pushed to Reception Desk 1 and Dept Coordinator mobile app immediately.',
      actionTag: 'Socket Event Emitted'
    }
  },
  {
    id: 'video',
    title: 'Video Interaction',
    shortDesc: 'Elevates conversational chats into live WebRTC video reception kiosks.',
    fullDesc: 'When visitors require visual verification or face-to-face assistance, CLARA escalates the interaction to a live receptionist or designated staff via WebRTC.',
    category: 'Voice & Video',
    icon: 'Video',
    angle: 225,
    metric: 'Direct WebRTC Escalation',
    features: ['Ultra-low latency streaming', 'One-touch kiosk escalation', 'Virtual desk attendant mode', 'Screen document sharing'],
    sampleInteraction: {
      user: 'I need visual help verifying my physical international passport document.',
      clara: 'Connecting you securely to Central Admissions Live Desk via HD Video Kiosk stream...',
      actionTag: 'WebRTC P2P Connected'
    }
  },
  {
    id: 'voice',
    title: 'Voice Interaction',
    shortDesc: 'Natural speech-to-text and expressive neural text-to-speech engine.',
    fullDesc: 'Enables frictionless hands-free kiosk interaction with low-latency streaming transcription and pleasant institutional voice synthesis.',
    category: 'Voice & Video',
    icon: 'Mic',
    angle: 270,
    metric: 'Streaming Neural Speech',
    features: ['Noise-resistant microphone capture', 'Streaming phoneme synthesis', 'Interruptible speech pipeline', 'Hands-free accessibility'],
    sampleInteraction: {
      user: '[Spoken]: "CLARA, where is the convocation auditorium?"',
      clara: '[Synthesized Voice]: "The main auditorium is directly across the central fountain lawn on your right, Building 2."',
      actionTag: 'Audio Stream Active'
    }
  },
  {
    id: 'multilingual',
    title: 'Multilingual Support',
    shortDesc: 'Ensures inclusive institutional access across global and regional languages.',
    fullDesc: 'Seamlessly recognizes visitor language preferences (English, Spanish, Hindi, French, German, Mandarin, and regional dialects) without manual switches.',
    category: 'Interaction',
    icon: 'Languages',
    angle: 315,
    metric: 'Multi-Dialect Recognition',
    features: ['Instant language detection', 'Context-aware translation', 'Dialect-adapted vocal synthesis', 'Accessible typography'],
    sampleInteraction: {
      user: '¿Dónde puedo encontrar el departamento de admisiones internacionales?',
      clara: 'El Departamento de Admisiones Internacionales está en el Edificio Administrativo, Piso 2, Oficina 204.',
      actionTag: 'Language Auto-Switched'
    }
  }
];

export const PIPELINE_STAGES: PipelineStage[] = [
  {
    id: 'input',
    stepNumber: 1,
    name: 'Voice / Text Input',
    subtitle: 'Multimodal User Ingestion',
    description: 'Captures raw acoustic phonemes or typed visitor text through high-fidelity kiosk microphones or digital web touchpoints.',
    detail: 'Performs instant noise filtration, silence detection, and converts audio streams into clean text tokens in under 120ms.',
    icon: 'Mic',
    techTerm: 'Whisper / Neural STT Engine',
    packetStatus: 'Tokenized Query Stream'
  },
  {
    id: 'intent',
    stepNumber: 2,
    name: 'Intent & Entity Extraction',
    subtitle: 'Semantic Disambiguation',
    description: 'Extracts critical institutional entities (faculty names, course codes, hall numbers, dates) and classifies the core intent.',
    detail: 'Differentiates between knowledge queries ("where is the lab?"), transactional actions ("book slot with Dr. Rao"), and escalation needs.',
    icon: 'Cpu',
    techTerm: 'Intent Classifier & NER',
    packetStatus: 'Entity Matrix Formed'
  },
  {
    id: 'retrieval',
    stepNumber: 3,
    name: 'Knowledge Retrieval (RAG)',
    subtitle: 'Vector Space Nearest-Neighbor Search',
    description: 'Queries the institutional vector embeddings repository to retrieve verified excerpts from syllabi, directories, and handbooks.',
    detail: 'Performs hybrid dense-sparse retrieval across campus documents with semantic similarity thresholding (cosine similarity > 0.82).',
    icon: 'Search',
    techTerm: 'Dense Vector Cosine Similarity',
    packetStatus: 'Relevant Context Fetched'
  },
  {
    id: 'context',
    stepNumber: 4,
    name: 'Context & State Assembly',
    subtitle: 'Temporal & Institutional Grounding',
    description: 'Merges live real-time variables (current time, faculty office status, room availability, student authorization) with retrieved docs.',
    detail: 'Constructs an unalterable system prompt bounding the LLM strictly to verified facts with explicit anti-hallucination guardrails.',
    icon: 'Layers',
    techTerm: 'Dynamic Prompt Augmentation',
    packetStatus: 'Grounding Payload Built'
  },
  {
    id: 'reasoning',
    stepNumber: 5,
    name: 'AI Reasoning & Formulation',
    subtitle: 'Grounded Language Generation',
    description: 'The core neural engine synthesizes a concise, professional, and empathetic answer anchored purely in the verified facts.',
    detail: 'Generates citations, produces execution triggers (e.g. initiating calendar booking, sending push notification), and structures output.',
    icon: 'Sparkles',
    techTerm: 'Fine-tuned LLM Reasoning',
    packetStatus: 'Synthesized Response Ready'
  },
  {
    id: 'output',
    stepNumber: 6,
    name: 'Multimodal Dispatch',
    subtitle: 'Speech Synthesis & Screen UI Action',
    description: 'Delivers the grounded response to the visitor via expressive neural speech, interactive screen cards, and routing action buttons.',
    detail: 'Emits WebSocket events to update visitor kiosks, displays interactive campus navigation maps, and dispatches SMS visitor tokens.',
    icon: 'Volume2',
    techTerm: 'Neural TTS & WebSocket Event Bus',
    packetStatus: 'Delivered to Visitor'
  }
];

export const TECH_LAYERS: TechLayer[] = [
  {
    id: 'experience',
    tier: 'Tier 1: Front-of-House',
    name: 'Experience Layer',
    tech: 'React 19 / TypeScript / Motion / Tailwind',
    role: 'Provides an ultra-responsive, kiosk-ready interface with fluid 60fps animations, intuitive accessibility, and zero visual latency.',
    whyChosen: 'Ensures tactile responsiveness on physical kiosk touchscreens and mobile devices with zero lag and strong type safety.',
    interconnections: ['Connects to Real-Time Layer via persistent WebSockets', 'Receives audio streams from Voice Layer'],
    latencyBand: '< 16ms render loop',
    icon: 'Monitor'
  },
  {
    id: 'realtime',
    tier: 'Tier 2: Live Transport',
    name: 'Real-Time Interaction',
    tech: 'WebSockets / Socket.io / Event Bus',
    role: 'Maintains persistent duplex pipes between reception kiosks, mobile staff portals, and central administration dashboards.',
    whyChosen: 'Enables instant visitor check-in pings, live queue updates, and sub-50ms push notifications without polling.',
    interconnections: ['Syncs kiosk state with Express Application Layer', 'Triggers WebRTC session signaling'],
    latencyBand: '< 45ms socket turnaround',
    icon: 'Radio'
  },
  {
    id: 'application',
    tier: 'Tier 3: Core Orchestrator',
    name: 'Application Gateway',
    tech: 'Node.js / Express / REST APIs',
    role: 'Handles authentication, role-based access control, appointment booking pipelines, rate limiting, and administrative APIs.',
    whyChosen: 'Lightweight asynchronous I/O with high concurrency, perfect for scaling across hundreds of institutional endpoints.',
    interconnections: ['Orchestrates Intelligence & RAG services', 'Coordinates MongoDB persistence'],
    latencyBand: '< 30ms API dispatch',
    icon: 'Server'
  },
  {
    id: 'intelligence',
    tier: 'Tier 4: Cognitive Core',
    name: 'Intelligence & RAG Engine',
    tech: 'LLM Orchestration / Semantic RAG / Embeddings',
    role: 'Performs natural language parsing, entity identification, contextual grounding, and multi-turn dialog reasoning.',
    whyChosen: 'Combines the flexibility of conversational LLMs with strict factual grounding via private institutional vector search.',
    interconnections: ['Queries Vector Knowledge Store', 'Passes generated tokens to Voice Layer'],
    latencyBand: '~400ms first token',
    icon: 'Brain'
  },
  {
    id: 'knowledge',
    tier: 'Tier 5: Institutional Truth',
    name: 'Knowledge Base',
    tech: 'Vector Database / Semantic Embeddings / Document Graph',
    role: 'Stores chunked and embedded representations of official campus handbooks, faculty directories, syllabi, and administrative rules.',
    whyChosen: 'Ensures responses are mathematically anchored to real institutional documents, completely preventing hallucinations.',
    interconnections: ['Continuously ingested from campus portals', 'Polled by RAG pipeline during every query'],
    latencyBand: '< 80ms cosine search',
    icon: 'FolderGit2'
  },
  {
    id: 'data',
    tier: 'Tier 6: Data Persistence',
    name: 'Data & State Store',
    tech: 'MongoDB / Mongoose / Redis Cache',
    role: 'Houses staff profiles, visitor logs, appointment schedules, authentication tokens, and department hierarchies.',
    whyChosen: 'Flexible document model that maps naturally to dynamic institutional structures (courses, semesters, faculty rosters).',
    interconnections: ['Read & written by Express Application Layer', 'Indexed for fast transactional lookup'],
    latencyBand: '< 15ms query execution',
    icon: 'HardDrive'
  },
  {
    id: 'communication',
    tier: 'Tier 7: Direct Human Escalation',
    name: 'Communication & Video',
    tech: 'WebRTC / P2P Video Mesh / STUN/TURN',
    role: 'Powers seamless one-touch escalation from the AI kiosk directly into an encrypted live video call with a human receptionist or faculty.',
    whyChosen: 'Provides native in-browser peer-to-peer audio/video streaming without requiring external proprietary plugins or software.',
    interconnections: ['Signaled over WebSocket Layer', 'Embedded directly into React Kiosk View'],
    latencyBand: '< 100ms P2P glass-to-glass',
    icon: 'Video'
  },
  {
    id: 'voice',
    tier: 'Tier 8: Acoustic Pipeline',
    name: 'Voice Engine',
    tech: 'Neural STT / Low-latency TTS / Audio Synthesizer',
    role: 'Transcribes visitor speech in real-time and synthesizes warm, natural institutional voice responses.',
    whyChosen: 'Allows fully hands-free, natural conversational engagement for visitors, visually impaired guests, and fast walk-in inquiries.',
    interconnections: ['Receives microphone stream from browser', 'Feeds transcribed text tokens into Intelligence Layer'],
    latencyBand: '~180ms stream transcription',
    icon: 'Mic2'
  }
];

export const ECOSYSTEM_ROLES: EcosystemRole[] = [
  {
    id: 'student',
    roleName: 'Student',
    tagline: 'Instant answers to academic, venue, and faculty queries.',
    description: 'Students eliminate bureaucratic waiting by getting instant clarity on exam schedules, lab rooms, faculty office hours, and project submissions.',
    icon: 'GraduationCap',
    claraRole: '24/7 Academic & Campus Guide',
    userJourney: {
      start: 'Where is the Robotics Workshop venue and is Prof. Miller available?',
      claraAction: 'CLARA verifies timetable: Robotics Workshop relocated to Maker Lab 2. Prof. Miller is currently grading projects in Room 304.',
      outcome: 'Zero time wasted wandering hallways; student gets directions and instant reservation.'
    },
    sampleQuery: 'Can I get the revised schedule for Digital Signal Processing midterm?',
    connectedEntities: ['Faculty', 'Departments', 'Notices']
  },
  {
    id: 'faculty',
    roleName: 'Faculty',
    tagline: 'Protected focus time and organized office-hour appointments.',
    description: 'Professors are shielded from repetitive basic inquiries and unscheduled walk-in interruptions while maintaining clear student accessibility.',
    icon: 'BookOpenCheck',
    claraRole: 'Intelligent Executive Assistant',
    userJourney: {
      start: 'Student seeks urgent project sign-off during busy research hours.',
      claraAction: 'CLARA answers routine syllabus questions automatically, then books the remaining time slot during designated afternoon office hours.',
      outcome: 'Professor receives a neatly queued calendar invite with student background notes pre-filled.'
    },
    sampleQuery: 'Set my status to "In Lab Session - Available at 3:30 PM"',
    connectedEntities: ['Student', 'Administration', 'Departments']
  },
  {
    id: 'visitor',
    roleName: 'Visitor & Parent',
    tagline: 'Welcoming, frictionless reception and direct human connection.',
    description: 'External guests, prospective parents, and visiting dignitaries receive immediate dignified reception, directions, and digital visitor credentials.',
    icon: 'UserCheck',
    claraRole: 'Institutional Front-Desk Diplomat',
    userJourney: {
      start: 'Visitor arrives for campus admissions tour without prior appointment.',
      claraAction: 'CLARA verifies admissions desk availability, issues temporary QR access pass, and connects them with an Admissions Counselor.',
      outcome: 'Warm first impression with zero waiting in empty lobbies.'
    },
    sampleQuery: 'I am here for the MBA admissions interview. Where is Conference Room A?',
    connectedEntities: ['Reception', 'Staff', 'Departments']
  },
  {
    id: 'administration',
    roleName: 'Administration & Dean',
    tagline: 'Institution-wide broadcast and visitor analytics oversight.',
    description: 'Deans and administrative officers gain centralized visibility over campus traffic, visitor trends, departmental response times, and notice broadcasts.',
    icon: 'Building2',
    claraRole: 'Operational Intelligence Platform',
    userJourney: {
      start: 'Urgent weather advisory requires shifting evening classes online.',
      claraAction: 'Administrator publishes single update; CLARA immediately informs every inquiry across all campus kiosks and web portals simultaneously.',
      outcome: 'Zero confusion, instant institutional alignment.'
    },
    sampleQuery: 'Broadcast emergency maintenance closure for North Parking Lot',
    connectedEntities: ['All Campus Roles', 'Reception', 'Staff']
  },
  {
    id: 'reception',
    roleName: 'Front Desk Staff',
    tagline: 'Empowered, unburdened receptionist workflow.',
    description: 'Human receptionists transition from repeating basic directions 200 times a day to handling complex VIP hospitality and high-priority cases.',
    icon: 'Headphones',
    claraRole: 'Frontline Digital Co-pilot',
    userJourney: {
      start: 'Morning rush of 60 simultaneous visitors entering the campus gate.',
      claraAction: 'CLARA autonomously triages 85% of standard navigation & routine inquiries, escalating only high-priority guests to human staff.',
      outcome: 'Human receptionists remain calm, attentive, and effective.'
    },
    sampleQuery: 'Escalate VIP delegates to Live Receptionist Video Desk',
    connectedEntities: ['Visitor', 'Faculty', 'Administration']
  }
];

export const QUERY_SIMULATIONS: QuerySimulation[] = [
  {
    id: 'sim1',
    query: 'Who is the faculty coordinator for Data Science and how can I meet them?',
    category: 'Faculty & Department Inquiry',
    retrievedContext: [
      {
        source: 'Faculty Directory 2025-2026 / CS & Data Science Dept',
        relevanceScore: 0.94,
        snippet: 'Dr. Anand Ramanathan — Associate Professor & Coordinator for B.Tech Data Science. Office: Alan Turing Block, Room 314. Office Hours: Tue/Thu 2:00 PM – 4:30 PM.'
      },
      {
        source: 'Academic Calendar / Current Week Schedule',
        relevanceScore: 0.88,
        snippet: 'Week 8: Regular academic schedule active. No departmental leave recorded for Dr. Anand Ramanathan.'
      }
    ],
    reasoningNotes: 'Extracted faculty entity "Dr. Anand Ramanathan" and office location "Turing Block 314". Evaluated office hours against current time. Generated direct appointment booking offer.',
    answer: 'Dr. Anand Ramanathan is the Faculty Coordinator for Data Science. His office is located in Alan Turing Block, Room 314. His open office hours are today from 2:00 PM to 4:30 PM. Would you like me to reserve a 15-minute consultation slot for you?',
    actionRequired: 'Reserve Office Hour Slot'
  },
  {
    id: 'sim2',
    query: 'Where is Examination Hall B and what items are restricted inside?',
    category: 'Campus Navigation & Policy',
    retrievedContext: [
      {
        source: 'Campus Master Map / Building 3 Floor Plan',
        relevanceScore: 0.96,
        snippet: 'Examination Hall B is situated on the Second Floor of the Science & Technology Wing, adjacent to Central Library staircase.'
      },
      {
        source: 'Institutional Examination Guidelines 2025 / §12 Rules of Conduct',
        relevanceScore: 0.91,
        snippet: 'Restricted items: Programmable smartwatches, smartphones, digital storage devices, unauthorized notes. Permitted: Hall ticket, standard college ID, approved non-programmable calculators.'
      }
    ],
    reasoningNotes: 'Identified dual intent: spatial navigation + regulatory policy. Merged building navigation instructions with official §12 examination code of conduct.',
    answer: 'Examination Hall B is on the 2nd Floor of the Science & Technology Wing (take the main stairs beside the Central Library). In accordance with institutional exam guidelines, smartwatches, smartphones, and programmable gadgets are strictly prohibited. Please ensure you have your Physical Hall Ticket and College ID.',
    actionRequired: 'View Floor Plan Map'
  },
  {
    id: 'sim3',
    query: 'I need to submit my merit scholarship verification before 5 PM.',
    category: 'Administrative Services',
    retrievedContext: [
      {
        source: 'Student Welfare Office / Scholarship Desk circular',
        relevanceScore: 0.93,
        snippet: 'Scholarship physical document verification takes place at Student Welfare Wing, Window 4, Main Admin Block. Submissions close daily at 4:30 PM.'
      }
    ],
    reasoningNotes: 'Noted strict deadline sensitivity (4:30 PM close vs user asking about 5 PM). Flagged critical time discrepancy to save student from missing submission cutoff.',
    answer: 'Please note: The Scholarship Verification Counter (Student Welfare Wing, Window 4 in the Main Admin Block) closes at 4:30 PM today, not 5:00 PM. I recommend proceeding directly there with your original marksheets and income certificate.',
    actionRequired: 'Generate Queue Token'
  }
];

export interface ProjectGuide {
  name: string;
  role: string;
  department: string;
  institution: string;
  description: string;
  quote: string;
  avatarSeed: string;
}

export interface CreatorMember {
  id: string;
  name: string;
  role: string;
  specialization: string[];
  bio: string;
  avatarSeed: string;
  image: string;
  github?: string;
  linkedin?: string;
  email?: string;
}

export const CREATORS_FIVE: CreatorMember[] = [
  {
    id: 'c1',
    name: 'A N AASHUTHOSH',
    role: 'AI Systems & NLP Engineer',
    specialization: ['Natural Language Processing', 'Intent Extraction', 'Multimodal Dialogue', 'Vector Indexing'],
    bio: 'Researched and built the semantic understanding engine, designing intent classification pipelines and contextual disambiguation models for natural student-institution conversations.',
    avatarSeed: 'aashuthosh',
    image: aashuthoshImage,
    github: 'https://github.com',
    linkedin: 'https://linkedin.com',
    email: 'mailto:aashuthosh@clara-ai.edu',
  },
  {
    id: 'c2',
    name: 'ADITHYA N C',
    role: 'Full-Stack & Systems Interface',
    specialization: ['Interactive Web Systems', 'Component Architecture', 'Client State Machines', 'Responsive UX'],
    bio: 'Crafted the front-end kiosk and web client interface architecture, implementing smooth spatial rendering, real-time UI components, and accessible interaction models.',
    avatarSeed: 'adithya',
    image: adithyaImage,
    github: 'https://github.com',
    linkedin: 'https://linkedin.com',
    email: 'mailto:adithya@clara-ai.edu',
  },
  {
    id: 'c3',
    name: 'CHINMAYI SHASTRY L',
    role: 'Knowledge RAG & Data Systems',
    specialization: ['Retrieval-Augmented Generation', 'Document Ingestion', 'Knowledge Graphs', 'Database Schemas'],
    bio: 'Engineered the zero-hallucination institutional RAG framework, structuring institutional bylaws, faculty rosters, and campus timetables into low-latency semantic embeddings.',
    avatarSeed: 'chinmayi',
    image: chinmayiImage,
    github: 'https://github.com',
    linkedin: 'https://linkedin.com',
    email: 'mailto:chinmayi@clara-ai.edu',
  },
  {
    id: 'c4',
    name: 'DHANUSH S BABU',
    role: 'Real-Time Infrastructure & Voice',
    specialization: ['WebSocket Protocols', 'WebRTC Kiosk Streaming', 'Speech-to-Text Pipeline', 'Audio Latency Tuning'],
    bio: 'Architected the streaming bi-directional WebSocket and WebRTC layer, powering live receptionist video escalation and high-speed streaming neural voice synthesis.',
    avatarSeed: 'dhanush',
    image: dhanushImage,
    github: 'https://github.com',
    linkedin: 'https://linkedin.com',
    email: 'mailto:dhanush@clara-ai.edu',
  },
  {
    id: 'c5',
    name: 'M NAVEEN KUMAR',
    role: 'Lead Architect & Core AI Engineer',
    specialization: ['Full-Stack AI Architecture', 'Multi-Agent Orchestration', 'Institutional Integration', 'System Performance'],
    bio: 'Led the overarching system design, cognitive architecture, and end-to-end integration connecting campus infrastructure, appointment management, and conversational intelligence.',
    avatarSeed: 'naveen',
    image: naveenImage,
    github: 'https://github.com',
    linkedin: 'https://linkedin.com',
    email: 'mailto:naveen@clara-ai.edu',
  },
];

export const PROJECT_GUIDE: ProjectGuide = {
  name: 'DR. NAGASHREE N',
  role: 'Project Guide / Academic Mentor',
  department: 'Department of Computer Science & Engineering',
  institution: 'School of Computing & Artificial Intelligence',
  description:
    'Provided foundational academic guidance, architectural review, and institutional insight throughout the research, design, and deployment of the CLARA conversational intelligence platform.',
  quote:
    'True institutional AI doesn’t replace humanity—it elevates hospitality, connects communities, and makes complex organizations effortlessly accessible to everyone.',
  avatarSeed: 'nagashree',
};

export const CREATORS: Creator[] = [
  {
    name: 'Naveen Kumar M',
    role: 'Lead Architect & AI Systems Engineer',
    affiliation: 'Artificial Intelligence & Software Engineering',
    bio: 'Pioneering human-centered conversational architectures, multimodal RAG pipelines, and intelligent institutional automation systems.',
    specialization: ['Full-Stack AI Architecture', 'RAG & Vector Pipelines', 'Real-time WebSocket Infrastructure', 'Interaction Design'],
    quote: 'Technology in institutions should never be a wall of confusing portals. It should be a welcoming conversation that listens, understands, and connects people to the right human at the right moment.',
    githubUrl: 'https://github.com',
    linkedinUrl: 'https://linkedin.com',
    portfolioUrl: 'https://clara-ai.dev',
    avatarSeed: 'naveen'
  },
  {
    name: 'CLARA Core Engineering Team',
    role: 'AI Research & Institutional Systems Group',
    affiliation: 'Machine Learning & Cognitive Interface Lab',
    bio: 'A passionate collective of engineers, researchers, and interface designers dedicated to building responsive, privacy-preserving AI reception infrastructure for modern educational campuses.',
    specialization: ['Retrieval-Augmented Generation (RAG)', 'WebRTC Kiosk Streaming', 'Speech-to-Text Phoneme Optimization', 'Campus Knowledge Graph Integration'],
    quote: 'We engineered CLARA from first principles: verified institutional truth, sub-second latency, and frictionless human connection.',
    githubUrl: 'https://github.com',
    linkedinUrl: 'https://linkedin.com',
    avatarSeed: 'clara-core'
  }
];

