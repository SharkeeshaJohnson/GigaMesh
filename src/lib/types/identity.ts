import { NPC } from './npc';
import type { StorySeed, NarrativeState } from '../narrative';

export type Gender = 'male' | 'female';
export type Difficulty = 'realistic' | 'dramatic' | 'crazy';

/**
 * Persona type - now simplified since visual sprites are decoupled from gameplay.
 * The persona ID is from the persona-pools.ts system.
 */
export type PersonaId = string;

/**
 * @deprecated - Legacy persona type for backwards compatibility with old saves.
 * New saves use PersonaId from persona-pools.ts instead.
 */
export type LegacyPersona =
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
  | 'doctor'
  | 'executive'
  | 'influencer'
  | 'grandmother'
  | 'ex-convict'
  | 'startup-founder'
  | 'trophy-wife';

// Keep Persona as union for backwards compatibility
export type Persona = LegacyPersona | PersonaId;

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
  backstory: string; // Legacy field
  briefBackground: string[]; // 2 bullet points about past
  currentStory: string[]; // 2 bullet points about present
}

/**
 * Generated persona details - created by LLM based on persona template
 */
export interface GeneratedPersona {
  templateId: string; // Reference to PersonaTemplate.id from persona-pools.ts
  type: string; // Human-readable type (e.g., "Ambitious Professional")
  traits: string[]; // Actual traits for this character
  situation: string; // Current life situation
}

export interface Identity {
  id: string;
  slotIndex: number; // 0-3 (4 save slots)
  name: string;
  gender: Gender; // Keep for backwards compatibility
  persona: Persona; // Legacy field - kept for old saves
  generatedPersona?: GeneratedPersona; // New: detailed persona from pool system
  difficulty: Difficulty;
  scenario: Scenario;
  currentDay: number;
  meters: Meters;
  npcs: NPC[]; // Starting NPCs (more can spawn through gameplay)
  storySeeds?: StorySeed[]; // Legacy: simple story seeds (deprecated, use narrativeState)
  narrativeState?: NarrativeState; // Full narrative engine state
  pixelArtUrl?: string; // Player character sprite URL
  spriteIndex?: number; // Index of selected sprite (visual only, not gameplay)
  createdAt: Date;
  lastPlayedAt: Date;
}

// Constants
export const MAX_SAVE_SLOTS = 4;
export const INITIAL_NPC_COUNT = 5;
