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
  bullets: string[]; // 2 short bullet points about the NPC
  // Emotional state can be single or multiple (e.g., "happy" or ["happy", "horny"])
  // Multiple emotions allow for complex, layered NPC moods
  currentEmotionalState: string | string[];
  relationshipStatus: string; // with player
  offScreenMemories: string[]; // events player doesn't know
  isActive: boolean; // can player chat with them
  isDead?: boolean; // NPC has died (killed, suicide, etc.)
  deathDay?: number; // Day they died
  deathCause?: string; // How they died
  pixelArtUrl: string; // generated sprite URL
  emotionSprites: Record<string, string>; // emotion -> sprite URL
  assignedModel?: string; // LLM model assigned to this NPC for varied responses
}

/**
 * Helper to normalize emotional state to array format
 */
export function normalizeEmotionalState(state: string | string[]): string[] {
  if (Array.isArray(state)) return state;
  return [state];
}

/**
 * Helper to get display string for emotional state(s)
 */
export function getEmotionalStateDisplay(state: string | string[]): string {
  const states = normalizeEmotionalState(state);
  return states.map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(', ');
}

// Starting NPC Distribution (10 guaranteed)
export const GUARANTEED_NPC_DISTRIBUTION = {
  core: 2,      // Uses gpt-4o
  secondary: 4, // Uses gpt-4o-mini
  tertiary: 4,  // Uses gpt-3.5-turbo
};

// Legacy emotion types - kept for backwards compatibility
// For full emotional state system, see: src/lib/emotional-states.ts
export type EmotionType =
  | 'neutral'
  | 'happy'
  | 'sad'
  | 'angry'
  | 'suspicious'
  | 'loving'
  | 'scared'
  // Extended basic emotions (family-friendly)
  | 'worried' | 'confused' | 'grateful' | 'hopeful' | 'proud' | 'excited'
  | 'amused' | 'content' | 'relieved' | 'compassionate' | 'frustrated'
  | 'disappointed' | 'embarrassed' | 'lonely' | 'nervous' | 'overwhelmed'
  | 'nostalgic' | 'determined'
  // Mature emotions (dramatic mode)
  | 'jealous' | 'envious' | 'resentful' | 'bitter' | 'vengeful' | 'spiteful'
  | 'paranoid' | 'distrustful' | 'guarded' | 'guilty' | 'ashamed' | 'remorseful'
  | 'hostile' | 'contemptuous' | 'disgusted' | 'desperate' | 'hopeless'
  | 'despairing' | 'manipulative' | 'calculating' | 'scheming' | 'betrayed'
  | 'heartbroken' | 'devastated' | 'infatuated' | 'devoted' | 'obsessed'
  | 'manic' | 'reckless' | 'flirty' | 'attracted' | 'smitten' | 'enchanted'
  | 'threatening' | 'menacing' | 'cold' | 'ruthless' | 'possessive' | 'controlling'
  // Unfiltered emotions (crazy mode - 18+)
  | 'horny' | 'lustful' | 'aroused' | 'insatiable' | 'cock-hungry' | 'pussy-hungry'
  | 'cum-drunk' | 'edged' | 'slutty' | 'breeding' | 'in-heat'
  | 'submissive' | 'dominant' | 'sadistic' | 'masochistic' | 'bratty'
  | 'broken-in' | 'degraded' | 'worshipful'
  | 'cheating' | 'sneaky' | 'guilt-horny' | 'forbidden' | 'corrupted' | 'depraved' | 'addicted'
  | 'homicidal' | 'suicidal' | 'psychotic' | 'feral' | 'broken' | 'hollow' | 'murderous' | 'bloodthirsty'
  | 'cuckolded' | 'hotwife' | 'voyeuristic' | 'exhibitionist' | 'predatory' | 'used' | 'owned'
  | 'BBC-hungry' | 'latina-fire' | 'cougar-mode' | 'daddy-mode' | 'step-fantasy';

// Basic emotion types for sprite generation (visual representation)
export const EMOTION_TYPES: EmotionType[] = [
  'neutral',
  'happy',
  'sad',
  'angry',
  'suspicious',
  'loving',
  'scared',
];
