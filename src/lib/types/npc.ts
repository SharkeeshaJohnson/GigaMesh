export type NPCOrigin = 'guaranteed' | 'emergent';

/**
 * NPC character in the game.
 *
 * SIMPLIFIED SYSTEM:
 * - openingScenario: Shown when user first opens 1:1 chat each day
 * - offScreenMemories: Populated by simulations, used to generate new scenarios
 * - scenarioUsed: Reset after simulation so NPCs show new scenarios next day
 *
 * NO memory extraction, NO story seeds, NO complex tracking.
 * Just: scenarios (based on simulation events) + free-flowing chat.
 */
export interface NPC {
  id: string;
  name: string;
  role: string; // e.g., "Wife", "Boss", "Coworker"
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
  offScreenMemories: string[]; // Events from simulations - used to generate opening scenarios
  isActive: boolean; // can player chat with them
  isDead?: boolean; // NPC has died (killed, suicide, etc.)
  deathDay?: number; // Day they died
  deathCause?: string; // How they died
  pixelArtUrl: string; // generated sprite URL
  emotionSprites: Record<string, string>; // emotion -> sprite URL
  assignedModel?: string; // LLM model assigned to this NPC for varied responses

  // Opening scenario system (simple, no story seeds)
  openingScenario: string; // The scenario shown when user first opens 1:1 chat
  scenarioUsed: boolean; // Has the current opening scenario been shown? Reset after simulation.
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

// Starting NPC count
export const GUARANTEED_NPC_COUNT = 10;

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
