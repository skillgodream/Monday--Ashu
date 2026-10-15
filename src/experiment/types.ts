export type SlideType =
  | 'WELCOME'
  | 'OBJECTIVES'
  | 'SECTION_INTRO'
  | 'TEACH_STEP'
  | 'DO_DONT'
  | 'IMPORTANT_RULE'
  | 'REAL_WORLD_SCENARIO'
  | 'DECISION'
  | 'KEY_TAKEAWAYS'
  | 'COMPLETION';

export interface GurujiCoaching {
  explanation: string;
  probingQuestion?: string;
  expectedResponse?: string;
  feedback?: string;
  whyItMatters: string;
  nextMove: string;
}

export interface Choice {
  id: string;
  text: string;
  isCorrect: boolean;
  feedback: string;
  why?: string;
}

export interface DecisionOption {
  t: string;
  why: string;
  ok?: number;
}

export interface Slide {
  type: SlideType;
  title: string;
  content?: string;
  tag?: string;
  role?: string;
  cta?: string;
  sec?: string;
  step?: string;
  lead?: string;
  items?: string[];
  fl?: string[]; // Floating checklist items in Section Intro
  ic?: string;   // Icon key
  slash?: boolean | number;
  dos?: string[];
  donts?: string[];
  opts?: DecisionOption[];
  choices?: Choice[];
  why?: string;
  next?: string;
  nb?: string;
  img?: string;
  alt?: string;
  gurujiCoaching?: GurujiCoaching;
  comparison?: { do: string[]; dont: string[] };
  evidenceSource?: string;
}

export interface TeachMePlan {
  lessonId: string;
  title: string;
  slides: Slide[];
}

export type SlidePlan = TeachMePlan & {
  domain?: string;
};
