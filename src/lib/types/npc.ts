export type NPCTier = 'core' | 'secondary' | 'tertiary';
export type NPCOrigin = 'guaranteed' | 'emergent';

export interface NPC {
  id: string;
  name: string;
  role: string; // e.g., "Wife", "Boss", "Coworker"
  tier: NPCTier;
  origin: NPCOrigin; // How they entered the story
  spawnedDay: number; // Day they were introduced
  spawnTrigger?: string; // What caused them to appear (if emergent)
  personality: string;
  backstory: string;
  currentEmotionalState: string;
  relationshipStatus: string; // with player
  offScreenMemories: string[]; // events player doesn't know
  isActive: boolean; // can player chat with them
  isDead?: boolean; // NPC has died (killed, suicide, etc.)
  deathDay?: number; // Day they died
  deathCause?: string; // How they died
  pixelArtUrl: string; // generated sprite URL
  emotionSprites: Record<string, string>; // emotion -> sprite URL
}

// Starting NPC Distribution (10 guaranteed)
export const GUARANTEED_NPC_DISTRIBUTION = {
  core: 2,      // Uses gpt-4o
  secondary: 4, // Uses gpt-4o-mini
  tertiary: 4,  // Uses gpt-3.5-turbo
};

export type EmotionType =
  | 'neutral'
  | 'happy'
  | 'sad'
  | 'angry'
  | 'suspicious'
  | 'loving'
  | 'scared';

export const EMOTION_TYPES: EmotionType[] = [
  'neutral',
  'happy',
  'sad',
  'angry',
  'suspicious',
  'loving',
  'scared',
];
