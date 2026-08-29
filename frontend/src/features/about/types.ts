export interface Capability {
  id: string;
  title: string;
  shortDesc: string;
  fullDesc: string;
  category: 'Intelligence' | 'Interaction' | 'Institutional' | 'Voice & Video';
  icon: string;
  angle: number; // For orbital placement
  metric: string;
  features: string[];
  sampleInteraction: {
    user: string;
    clara: string;
    actionTag?: string;
  };
}

export interface PipelineStage {
  id: string;
  stepNumber: number;
  name: string;
  subtitle: string;
  description: string;
  detail: string;
  icon: string;
  techTerm: string;
  packetStatus: string;
}

export interface TechLayer {
  id: string;
  tier: string;
  name: string;
  tech: string;
  role: string;
  whyChosen: string;
  interconnections: string[];
  latencyBand: string;
  icon: string;
}

export interface EcosystemRole {
  id: string;
  roleName: string;
  tagline: string;
  description: string;
  icon: string;
  claraRole: string;
  userJourney: {
    start: string;
    claraAction: string;
    outcome: string;
  };
  sampleQuery: string;
  connectedEntities: string[];
}

export interface Creator {
  name: string;
  role: string;
  affiliation: string;
  bio: string;
  specialization: string[];
  quote: string;
  githubUrl?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  avatarSeed: string;
}

export interface QuerySimulation {
  id: string;
  query: string;
  category: string;
  retrievedContext: {
    source: string;
    relevanceScore: number;
    snippet: string;
  }[];
  reasoningNotes: string;
  answer: string;
  actionRequired?: string;
}
