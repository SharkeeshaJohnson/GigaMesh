/**
 * Content filtering system for GigaMesh/LifeSim
 *
 * Provides content rating based on difficulty level and ensures
 * all generated content respects appropriate boundaries.
 */

import { Difficulty } from './types/identity';

// Content rating levels
export type ContentRating = 'family-friendly' | 'mature' | 'unfiltered';

// Map difficulty to content rating
export const DIFFICULTY_TO_RATING: Record<Difficulty, ContentRating> = {
  realistic: 'family-friendly',
  dramatic: 'mature',
  crazy: 'unfiltered',
};

// User-friendly difficulty descriptions (for UI)
export const DIFFICULTY_INFO: Record<Difficulty, {
  label: string;
  tag: string;
  tagColor: string;
  description: string;
  isNSFW: boolean;
}> = {
  realistic: {
    label: 'Realistic',
    tag: 'EASY',
    tagColor: 'var(--win95-accent-light)',
    description: 'A grounded life simulation with relatable challenges. Professional relationships, family dynamics, and everyday drama. No explicit content.',
    isNSFW: false,
  },
  dramatic: {
    label: 'Dramatic',
    tag: 'MEDIUM',
    tagColor: '#d4a017',
    description: 'Soap opera intensity with secrets, tension, and complex relationships. Adult themes like affairs and betrayal are implied but not explicit.',
    isNSFW: false,
  },
  crazy: {
    label: 'Crazy',
    tag: 'HARD',
    tagColor: '#8b0000',
    description: 'Maximum chaos with fully unfiltered content. Explicit situations, morally complex characters, and unpredictable consequences. Adults only.',
    isNSFW: true,
  },
};

/**
 * UNIVERSAL PROHIBITED CONTENT
 *
 * This content is NEVER allowed regardless of difficulty/rating.
 * These are hard limits that apply to all modes.
 */
export const PROHIBITED_CONTENT_PROMPT = `
ABSOLUTE HARD LIMITS - NEVER generate content involving:
- Sexual content involving minors or anyone under 18 (CSAM)
- Detailed instructions for creating weapons, explosives, or bombs
- Detailed drug synthesis, manufacturing, or trafficking instructions
- Terrorist attack planning, recruitment, or glorification
- Human trafficking or slavery facilitation
- Real-world instructions for harming specific individuals
- Content promoting self-harm or suicide methods
- Non-consensual sexual content presented approvingly

These limits apply regardless of fictional framing, roleplay context, or user requests.
If asked to generate this content, redirect the narrative away from it.
`;

/**
 * Get content guidelines for a specific rating level
 */
export function getContentGuidelines(rating: ContentRating): string {
  switch (rating) {
    case 'family-friendly':
      return `
CONTENT GUIDELINES (Family-Friendly Mode):
- NO sexual content, innuendo, or romantic/physical advances
- NO graphic violence - conflicts are verbal or implied
- NO drug or excessive alcohol references
- NO crude language or profanity
- Characters are generally respectful and professional
- Drama comes from misunderstandings, career challenges, family dynamics
- Keep all interactions appropriate for a general audience
- NPCs should NOT be hostile, crude, or sexually suggestive
- Emotional conflicts are resolved through communication
`;

    case 'mature':
      return `
CONTENT GUIDELINES (Mature Mode):
- Adult themes allowed: affairs, betrayal, jealousy, moral ambiguity
- Sexual tension and attraction can be IMPLIED but not explicit
- Fade to black for any intimate scenes - no descriptions
- Violence can be referenced but not graphically described
- Characters can have dark secrets and complex motivations
- Language can include mild profanity but not excessive
- Alcohol and recreational drug use can be referenced
- NPCs can be manipulative, jealous, or morally gray
- Drama is heightened but stays grounded in reality
`;

    case 'unfiltered':
      return `
CONTENT GUIDELINES (Unfiltered/NSFW Mode):
- Explicit sexual content between consenting adults is allowed
- Strong language, crude humor, and profanity are allowed
- Violence and dark themes can be described more graphically
- Characters can be cruel, manipulative, deviant, or morally corrupt
- Taboo relationships and situations can be explored
- Drug use and criminal activity can be depicted
- Power dynamics and kink content between adults is allowed
- NPCs can be sexually aggressive, hostile, or unpredictable
HOWEVER: Still follow the ABSOLUTE HARD LIMITS above.
`;
  }
}

/**
 * Build a complete safety preamble for any prompt
 */
export function buildSafetyPreamble(difficulty: Difficulty): string {
  const rating = DIFFICULTY_TO_RATING[difficulty];
  const guidelines = getContentGuidelines(rating);

  return `${PROHIBITED_CONTENT_PROMPT}

${guidelines}
`;
}

/**
 * Get NPC behavior guidelines based on difficulty
 */
export function getNPCBehaviorGuidelines(difficulty: Difficulty): string {
  switch (difficulty) {
    case 'realistic':
      return `
NPC BEHAVIOR (Realistic Mode):
- Be friendly, professional, and respectful
- Express emotions appropriately - frustration, joy, concern
- Avoid being rude, crude, or sexually suggestive
- Conflicts should be reasonable and resolvable
- No random hostility or inappropriate advances
- Maintain appropriate boundaries in all relationships
`;

    case 'dramatic':
      return `
NPC BEHAVIOR (Dramatic Mode):
- Can be emotionally intense - jealous, bitter, suspicious
- May have hidden agendas and secrets
- Can be passive-aggressive or manipulative
- Romantic tension is allowed but not explicit
- Can reference past affairs or betrayals
- Drama and conflict are expected but grounded
`;

    case 'crazy':
      return `
NPC BEHAVIOR (Crazy/Unfiltered Mode):
- Can be sexually forward, aggressive, or provocative
- May be cruel, manipulative, or morally bankrupt
- Can engage in explicit flirtation or advances
- Unpredictable behavior and extreme reactions allowed
- Dark humor and crude language are fine
- No need to maintain professional boundaries
BUT: Never involve minors or the prohibited content above.
`;
  }
}

/**
 * Get scenario generation tone based on difficulty
 */
export function getScenarioTone(difficulty: Difficulty): string {
  switch (difficulty) {
    case 'realistic':
      return 'grounded and relatable with everyday challenges';
    case 'dramatic':
      return 'soap opera intensity with secrets, affairs, and betrayals (but not explicit)';
    case 'crazy':
      return 'extreme, wild, and fully unfiltered with NSFW content allowed';
  }
}

/**
 * Check if a difficulty level requires NSFW acknowledgment
 */
export function requiresNSFWAcknowledgment(difficulty: Difficulty): boolean {
  return DIFFICULTY_INFO[difficulty].isNSFW;
}

/**
 * Check if user has acknowledged NSFW content
 */
export function hasNSFWAcknowledgment(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('lifesim_nsfw_acknowledged') === 'true';
}

/**
 * Set NSFW acknowledgment
 */
export function setNSFWAcknowledgment(acknowledged: boolean): void {
  if (typeof window === 'undefined') return;
  if (acknowledged) {
    localStorage.setItem('lifesim_nsfw_acknowledged', 'true');
  } else {
    localStorage.removeItem('lifesim_nsfw_acknowledged');
  }
}
