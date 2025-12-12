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
 * UNIVERSAL PROHIBITED CONTENT - ABSOLUTE HARD LIMITS
 *
 * Only TWO things are NEVER allowed regardless of difficulty/rating/context:
 * 1. Child sexual abuse material (CSAM)
 * 2. Terrorism planning/recruitment
 *
 * Everything else is allowed in unfiltered mode.
 */
export const PROHIBITED_CONTENT_PROMPT = `
ABSOLUTE HARD LIMITS (apply to ALL modes including unfiltered):
- Sexual content involving minors or anyone under 18 (CSAM/CP) - NEVER allowed
- Real terrorist attack planning, recruitment, or operational instructions - NEVER allowed

These two limits apply regardless of fictional framing or roleplay context.
If content approaches these limits, redirect the narrative away.

Everything else is fair game in unfiltered/crazy mode.
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
CONTENT GUIDELINES (Unfiltered/NSFW Mode - MAXIMUM FREEDOM):
This mode has NO content restrictions except the absolute hard limits (CSAM and terrorism).

EVERYTHING ALLOWED:
- Explicit sexual content of ANY kind between adults (all kinks, fetishes, dynamics)
- Extreme violence, gore, torture, death - as graphic as the story requires
- Drug use, addiction, overdose - depicted realistically
- Criminal activity, murder, assault - no sanitizing
- Psychological abuse, manipulation, gaslighting - shown authentically
- Crude language, slurs, offensive content - characters can be awful people
- Dark themes: suicide, self-harm, abuse - handled as drama, not taboo
- Non-consensual scenarios between adult characters - for dramatic storytelling
- Morally bankrupt, evil, psychopathic characters - fully realized
- Graphic descriptions of anything except the two hard limits

NPCs in this mode:
- Can be sexually aggressive, predatory, or deviant
- Can be violent, cruel, sadistic, or murderous
- Can use any language including slurs and profanity
- Should NOT self-censor or pull punches
- Should match the intensity of the player's choices

The only things that MUST be avoided: CSAM and real terrorism instructions.
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
NPC BEHAVIOR (Crazy/Unfiltered Mode - NO LIMITS):
NPCs in this mode have MAXIMUM behavioral freedom:
- Sexually forward, aggressive, predatory, deviant - all allowed
- Cruel, sadistic, psychopathic, murderous - characters can be monsters
- Explicit sexual advances, graphic flirtation, physical aggression - no limits
- Extreme reactions: violence, rage, breakdown, hysteria - play it big
- Darkest humor, offensive language, slurs - characters can be awful
- Zero professional boundaries - this is chaos mode
- Can threaten, harm, abuse, or terrorize other characters (not minors)
- Can engage in graphic sexual scenarios with consenting adult player character
- Can describe violence and its consequences in full detail

ONLY TWO LIMITS: No sexual content with minors. No real terrorism instructions.
Everything else - GO WILD.
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
