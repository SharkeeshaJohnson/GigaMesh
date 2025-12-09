import { NPC } from './npc';

export type Gender = 'male' | 'female';
export type Difficulty = 'realistic' | 'dramatic' | 'crazy';

// All available personas for character creation
export type Persona =
  | 'man'
  | 'woman'
  | 'gay-man'
  | 'gay-woman'
  | 'transexual'
  | 'teacher'
  | 'student'
  | 'closeted-gay'
  | 'closeted-bully'
  | 'dominatrix'
  | 'reptile'
  | 'fat-girl'
  | 'fat-boy'
  | 'black-man'
  | 'black-woman'
  | 'doctor';

export const PERSONA_OPTIONS: { value: Persona; label: string; description: string }[] = [
  { value: 'man', label: 'Man', description: 'A regular man navigating life' },
  { value: 'woman', label: 'Woman', description: 'A regular woman navigating life' },
  { value: 'gay-man', label: 'Gay Man', description: 'A gay man with unique relationship dynamics' },
  { value: 'gay-woman', label: 'Gay Woman', description: 'A lesbian woman with unique relationship dynamics' },
  { value: 'transexual', label: 'Transexual', description: 'Navigating identity and transformation' },
  { value: 'teacher', label: 'Teacher', description: 'An educator with students and colleagues' },
  { value: 'student', label: 'Student', description: 'A student navigating academic and social life' },
  { value: 'closeted-gay', label: 'Closeted Gay', description: 'Hiding true identity from family and friends' },
  { value: 'closeted-bully', label: 'Closeted Bully', description: 'A bully hiding their own insecurities' },
  { value: 'dominatrix', label: 'Dominatrix', description: 'A powerful figure in the BDSM scene' },
  { value: 'reptile', label: 'Reptile', description: 'A cold-blooded character with unique instincts' },
  { value: 'fat-girl', label: 'Fat Girl', description: 'Navigating body image and self-acceptance' },
  { value: 'fat-boy', label: 'Fat Boy', description: 'Navigating body image and self-acceptance' },
  { value: 'black-man', label: 'Black Man', description: 'Navigating life with cultural experiences' },
  { value: 'black-woman', label: 'Black Woman', description: 'Navigating life with cultural experiences' },
  { value: 'doctor', label: 'Doctor', description: 'A medical professional with life-and-death decisions' },
];

export interface Meters {
  familyHarmony: number;    // 0-100
  careerStanding: number;   // 0-100
  wealth: number;           // 0-100
  mentalHealth: number;     // 0-100
  reputation: number;       // 0-100
}

export const DEFAULT_METERS: Meters = {
  familyHarmony: 70,
  careerStanding: 50,
  wealth: 50,
  mentalHealth: 70,
  reputation: 60,
};

export interface FamilyStructure {
  maritalStatus: 'single' | 'married' | 'divorced' | 'widowed';
  hasChildren: boolean;
  children?: { name: string; age: number; gender: string }[];
  extendedFamily: string[];
}

export interface Scenario {
  profession: string;
  workplace: string;
  familyStructure: FamilyStructure;
  livingSituation: string;
  backstory: string;
}

export interface Identity {
  id: string;
  slotIndex: number; // 0-3 (4 save slots)
  name: string;
  gender: Gender; // Keep for backwards compatibility
  persona: Persona; // New: the chosen persona/identity type
  difficulty: Difficulty;
  scenario: Scenario;
  currentDay: number;
  meters: Meters;
  npcs: NPC[]; // Starting NPCs (more can spawn through gameplay)
  createdAt: Date;
  lastPlayedAt: Date;
}

// Constants
export const MAX_SAVE_SLOTS = 4;
export const INITIAL_NPC_COUNT = 5;
