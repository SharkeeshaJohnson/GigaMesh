/**
 * Story Seeds System
 *
 * This module provides the "story seeds" narrative mechanic - concrete facts
 * that exist in the story world that NPCs can reveal during conversations.
 *
 * Story seeds drive meaningful revelations based on narrative pressure.
 */

import { NPC, Identity } from '../types';

/**
 * A concrete fact that exists in the story world.
 * These are the SUBSTANCE that NPCs reveal during conversations.
 */
export interface StorySeed {
  id: string;
  // The actual fact - must be SPECIFIC and CONCRETE
  fact: string;
  // NPCs who know this fact
  knownBy: string[]; // NPC IDs
  // Type of information
  type: 'secret' | 'evidence' | 'relationship' | 'event' | 'betrayal' | 'crime' | 'affair';
  // How explosive is this revelation
  severity: 'minor' | 'moderate' | 'major' | 'explosive';
  // Has this been revealed to the player?
  revealedToPlayer: boolean;
  // Which NPCs has this been revealed to (besides original knowers)
  revealedTo: string[];
  // When should this come out? Lower = earlier
  narrativePriority: number;
}

/**
 * What an NPC must do in the current conversation
 */
export interface RevelationDirective {
  // The NPC this applies to
  npcId: string;
  // What they must reveal (the story seed fact)
  mustReveal: string | null;
  // After how many messages they must reveal it
  revealAfterMessages: number;
  // Their goal in this conversation
  conversationGoal: string;
  // Specific conflict with other NPCs present
  conflicts: { npcName: string; conflict: string }[];
}

/**
 * Scenario categories for matching seed templates to player scenarios
 */
type ScenarioCategory = 'espionage' | 'corporate' | 'underworld' | 'domestic' | 'creative' | 'generic';

/**
 * Map profession/persona keywords to scenario categories
 */
function detectScenarioCategory(profession: string, personaType?: string): ScenarioCategory {
  const text = `${profession} ${personaType || ''}`.toLowerCase();

  // Espionage/spy scenarios
  if (text.includes('spy') || text.includes('cia') || text.includes('agent') ||
      text.includes('operative') || text.includes('intelligence') || text.includes('mi6') ||
      text.includes('black widow') || text.includes('assassin') || text.includes('undercover')) {
    return 'espionage';
  }

  // Underworld/crime scenarios
  if (text.includes('mafia') || text.includes('cartel') || text.includes('gang') ||
      text.includes('crime') || text.includes('dealer') || text.includes('kingpin') ||
      text.includes('underground') || text.includes('trafficker') || text.includes('mob')) {
    return 'underworld';
  }

  // Corporate/business scenarios
  if (text.includes('ceo') || text.includes('executive') || text.includes('corporate') ||
      text.includes('lawyer') || text.includes('banker') || text.includes('wall street') ||
      text.includes('business') || text.includes('startup') || text.includes('finance')) {
    return 'corporate';
  }

  // Creative/entertainment scenarios
  if (text.includes('actor') || text.includes('actress') || text.includes('musician') ||
      text.includes('artist') || text.includes('writer') || text.includes('celebrity') ||
      text.includes('influencer') || text.includes('model') || text.includes('director')) {
    return 'creative';
  }

  // Domestic/family scenarios
  if (text.includes('parent') || text.includes('spouse') || text.includes('family') ||
      text.includes('homemaker') || text.includes('caregiver') || text.includes('teacher')) {
    return 'domestic';
  }

  return 'generic';
}

/**
 * Templates for generating story seeds based on NPC relationships
 * IMPORTANT: {witness} is the NPC who KNOWS the secret and can reveal it.
 * {subject} is the NPC the secret is ABOUT (they wouldn't willingly reveal this).
 * {player} is the player character - when used, it means the player is the subject.
 * This prevents NPCs from confessing their own secrets immediately.
 */
interface SeedTemplate {
  template: string;
  witnessKnows: boolean;
  playerIsSubject?: boolean; // True if this seed is about the PLAYER doing something
}

const SEED_TEMPLATES: Record<string, SeedTemplate[]> = {
  // Financial/crime seeds - witness saw subject do something
  crime: [
    { template: '{witness} saw {subject} stealing money from {workplace} - about $500 every week', witnessKnows: true },
    { template: '{witness} caught {subject} breaking into the office safe three weeks ago', witnessKnows: true },
    { template: '{witness} knows that {subject} is being blackmailed by someone outside the group', witnessKnows: true },
    { template: '{witness} has proof that {subject} has been forging signatures on company documents', witnessKnows: true },
    { template: '{witness} found out {subject} has a gambling debt of $50,000 to dangerous people', witnessKnows: true },
  ],

  // Relationship/affair seeds - witness knows about subject's affair
  affair: [
    { template: '{witness} knows {subject} had a secret relationship that ended badly', witnessKnows: true },
    { template: '{witness} caught {subject} seeing someone else\'s ex behind their back', witnessKnows: true },
    { template: '{witness} knows that {subject} has been lying about where they go on Thursday nights', witnessKnows: true },
    { template: '{witness} found explicit messages on {subject}\'s phone', witnessKnows: true },
    { template: '{witness} walked in on {subject} at the company Christmas party doing something they shouldn\'t', witnessKnows: true },
  ],

  // Betrayal seeds - witness knows subject betrayed someone
  betrayal: [
    { template: '{witness} knows {subject} was the one who got someone fired from their last job', witnessKnows: true },
    { template: '{witness} has evidence {subject} has been feeding information about {player} to their rivals', witnessKnows: true },
    { template: '{witness} knows {subject} sabotaged someone\'s promotion last year', witnessKnows: true },
    { template: '{witness} overheard {subject} planning to leave and take the best clients', witnessKnows: true },
    { template: '{witness} knows {subject} lied to protect themselves and let someone else take the blame', witnessKnows: true },
  ],

  // Evidence/knowledge seeds - witness has damning evidence about subject
  evidence: [
    { template: '{witness} has photos that prove {subject} was lying about their alibi', witnessKnows: true },
    { template: '{witness} overheard {subject} on the phone making threats', witnessKnows: true },
    { template: '{witness} found documents hidden in {subject}\'s desk', witnessKnows: true },
    { template: '{witness} knows {subject}\'s real reason for leaving their previous job', witnessKnows: true },
    { template: '{witness} saw {subject} meeting secretly with {player}\'s competitor', witnessKnows: true },
  ],

  // Secret knowledge seeds - witness knows subject's dark secret
  secret: [
    { template: '{witness} discovered that {subject} has a second family in another city', witnessKnows: true },
    { template: '{witness} found out {subject} lied on their resume about their degree', witnessKnows: true },
    { template: '{witness} discovered {subject} is actually related to {player}', witnessKnows: true },
    { template: '{witness} knows {subject} is in witness protection', witnessKnows: true },
    { template: '{witness} found out {subject} has a terminal illness they\'re hiding', witnessKnows: true },
  ],
};

/**
 * ESPIONAGE scenario seeds - for spy/CIA/intelligence scenarios
 * These are about intelligence operations, double agents, leaked info, etc.
 */
const ESPIONAGE_SEEDS: Record<string, SeedTemplate[]> = {
  double_agent: [
    { template: '{witness} has evidence that {player} has been passing classified intel to a foreign handler', witnessKnows: true, playerIsSubject: true },
    { template: '{witness} intercepted communications proving {player} has a second identity', witnessKnows: true, playerIsSubject: true },
    { template: '{witness} knows {subject} is secretly working for a rival agency', witnessKnows: true },
    { template: '{witness} discovered {player} met with a known enemy operative last month', witnessKnows: true, playerIsSubject: true },
    { template: '{witness} has proof {subject} compromised an entire operation to save their own cover', witnessKnows: true },
  ],

  blown_cover: [
    { template: '{witness} knows {player}\'s real identity - they\'re not who they claim to be', witnessKnows: true, playerIsSubject: true },
    { template: '{witness} found {player}\'s fake passport collection hidden in their apartment', witnessKnows: true, playerIsSubject: true },
    { template: '{witness} recognized {player} from a past operation under a different name', witnessKnows: true, playerIsSubject: true },
    { template: '{witness} knows {subject} was the one who leaked the asset list', witnessKnows: true },
    { template: '{witness} discovered {subject} has been filing false mission reports for months', witnessKnows: true },
  ],

  betrayal: [
    { template: '{witness} knows {player} is responsible for the failed extraction that killed three operatives', witnessKnows: true, playerIsSubject: true },
    { template: '{witness} has evidence {player} sold out their handler to save themselves', witnessKnows: true, playerIsSubject: true },
    { template: '{witness} knows {subject} was turned during their last assignment in Moscow', witnessKnows: true },
    { template: '{witness} discovered {player} has been feeding disinformation to headquarters', witnessKnows: true, playerIsSubject: true },
    { template: '{witness} knows {subject} eliminated a fellow agent who discovered their secret', witnessKnows: true },
  ],

  secrets: [
    { template: '{witness} knows the real reason {player} defected - it wasn\'t ideology, it was money', witnessKnows: true, playerIsSubject: true },
    { template: '{witness} discovered {player} has a child no one knows about - a major vulnerability', witnessKnows: true, playerIsSubject: true },
    { template: '{witness} knows {subject} has been skimming from the black budget for years', witnessKnows: true },
    { template: '{witness} found out {player} is being blackmailed by an unknown party', witnessKnows: true, playerIsSubject: true },
    { template: '{witness} knows {subject} has a romantic relationship with an enemy operative', witnessKnows: true },
  ],
};

/**
 * UNDERWORLD scenario seeds - for crime/mafia/gang scenarios
 */
const UNDERWORLD_SEEDS: Record<string, SeedTemplate[]> = {
  betrayal: [
    { template: '{witness} knows {player} is the one who ratted to the feds about the shipment', witnessKnows: true, playerIsSubject: true },
    { template: '{witness} has proof {player} has been skimming money from the boss for months', witnessKnows: true, playerIsSubject: true },
    { template: '{witness} knows {subject} is secretly working with a rival family', witnessKnows: true },
    { template: '{witness} discovered {player} has been meeting with the DA', witnessKnows: true, playerIsSubject: true },
    { template: '{witness} knows {subject} killed someone in the organization without permission', witnessKnows: true },
  ],

  secrets: [
    { template: '{witness} knows {player} is actually an undercover cop', witnessKnows: true, playerIsSubject: true },
    { template: '{witness} found out {player} has a second family the organization doesn\'t know about', witnessKnows: true, playerIsSubject: true },
    { template: '{witness} knows where {subject} buried the bodies from the warehouse job', witnessKnows: true },
    { template: '{witness} discovered {player} has been wearing a wire', witnessKnows: true, playerIsSubject: true },
    { template: '{witness} knows {subject} has a gambling problem that\'s making them desperate', witnessKnows: true },
  ],

  power: [
    { template: '{witness} knows {player} is planning to take over when the boss is gone', witnessKnows: true, playerIsSubject: true },
    { template: '{witness} has evidence {subject} ordered a hit without authorization', witnessKnows: true },
    { template: '{witness} discovered {player} has been making side deals with suppliers', witnessKnows: true, playerIsSubject: true },
    { template: '{witness} knows {subject} is building their own crew in secret', witnessKnows: true },
    { template: '{witness} found out {player} has been lying about the take from jobs', witnessKnows: true, playerIsSubject: true },
  ],
};

/**
 * CORPORATE scenario seeds - for business/executive scenarios
 */
const CORPORATE_SEEDS: Record<string, SeedTemplate[]> = {
  fraud: [
    { template: '{witness} has proof {player} has been cooking the books for the quarterly reports', witnessKnows: true, playerIsSubject: true },
    { template: '{witness} knows {player} committed insider trading based on leaked board information', witnessKnows: true, playerIsSubject: true },
    { template: '{witness} discovered {subject} has been embezzling through fake vendor accounts', witnessKnows: true },
    { template: '{witness} found evidence {player} bribed regulators to overlook violations', witnessKnows: true, playerIsSubject: true },
    { template: '{witness} knows {subject} forged the CEO\'s signature on major contracts', witnessKnows: true },
  ],

  betrayal: [
    { template: '{witness} knows {player} has been feeding trade secrets to a competitor', witnessKnows: true, playerIsSubject: true },
    { template: '{witness} has proof {player} sabotaged the merger to benefit personally', witnessKnows: true, playerIsSubject: true },
    { template: '{witness} discovered {subject} is planning a hostile takeover from within', witnessKnows: true },
    { template: '{witness} knows {player} threw {subject} under the bus to cover their own mistakes', witnessKnows: true, playerIsSubject: true },
    { template: '{witness} found out {subject} has been recording confidential meetings', witnessKnows: true },
  ],

  scandal: [
    { template: '{witness} knows about {player}\'s affair with a subordinate - HR would have a field day', witnessKnows: true, playerIsSubject: true },
    { template: '{witness} has photos of {player} at an event they claimed to be "sick" for', witnessKnows: true, playerIsSubject: true },
    { template: '{witness} discovered {subject} has been harassing employees and paying them off to stay quiet', witnessKnows: true },
    { template: '{witness} knows {player}\'s credentials are completely fabricated', witnessKnows: true, playerIsSubject: true },
    { template: '{witness} found out {subject} has a substance problem that\'s affecting their judgment', witnessKnows: true },
  ],
};

/**
 * CREATIVE scenario seeds - for entertainment/celebrity scenarios
 */
const CREATIVE_SEEDS: Record<string, SeedTemplate[]> = {
  scandal: [
    { template: '{witness} has photos proving {player}\'s "talent" was actually ghostwritten/performed by someone else', witnessKnows: true, playerIsSubject: true },
    { template: '{witness} knows {player} slept their way to their first big break', witnessKnows: true, playerIsSubject: true },
    { template: '{witness} discovered {subject} has been plagiarizing their entire career', witnessKnows: true },
    { template: '{witness} has video of {player} saying things that would end their career if released', witnessKnows: true, playerIsSubject: true },
    { template: '{witness} knows {subject} paid to have a competitor\'s career sabotaged', witnessKnows: true },
  ],

  secrets: [
    { template: '{witness} knows {player}\'s wholesome image is a complete fabrication - they\'re nothing like their persona', witnessKnows: true, playerIsSubject: true },
    { template: '{witness} discovered {player} has a secret addiction they\'ve been hiding from the press', witnessKnows: true, playerIsSubject: true },
    { template: '{witness} knows {subject} is in a fake relationship for publicity', witnessKnows: true },
    { template: '{witness} found out {player} has a hidden child from a past relationship', witnessKnows: true, playerIsSubject: true },
    { template: '{witness} knows {subject} has been blackmailing other celebrities with their secrets', witnessKnows: true },
  ],

  betrayal: [
    { template: '{witness} knows {player} is the anonymous source leaking industry secrets to tabloids', witnessKnows: true, playerIsSubject: true },
    { template: '{witness} has proof {player} stole {subject}\'s original work and took credit', witnessKnows: true, playerIsSubject: true },
    { template: '{witness} discovered {subject} has been sabotaging auditions of rival performers', witnessKnows: true },
    { template: '{witness} knows {player} lied about their background story - it\'s all fabricated for sympathy', witnessKnows: true, playerIsSubject: true },
    { template: '{witness} found out {subject} sold out a friend to advance their own career', witnessKnows: true },
  ],
};

/**
 * Get scenario-specific templates or fall back to generic
 */
function getSeedTemplatesForScenario(category: ScenarioCategory): Record<string, SeedTemplate[]> {
  switch (category) {
    case 'espionage':
      return ESPIONAGE_SEEDS;
    case 'underworld':
      return UNDERWORLD_SEEDS;
    case 'corporate':
      return CORPORATE_SEEDS;
    case 'creative':
      return CREATIVE_SEEDS;
    default:
      return SEED_TEMPLATES;
  }
}

/**
 * Generate story seeds for a new identity
 * Creates concrete facts that will drive narrative
 *
 * Key principle: The WITNESS knows the secret and can reveal it.
 * The SUBJECT is who the secret is about - they won't confess unprompted.
 * For scenario-aware generation, uses profession-specific templates.
 */
export function generateStorySeeds(
  identity: Identity,
  seedCount: number = 8
): StorySeed[] {
  const seeds: StorySeed[] = [];
  const npcs = identity.npcs.filter(n => !n.isDead && n.isActive);

  if (npcs.length < 2) return seeds;

  // Detect scenario category for appropriate seed selection
  const scenarioCategory = detectScenarioCategory(
    identity.scenario.profession || '',
    identity.generatedPersona?.type || ''
  );

  // Get scenario-specific templates (or generic fallback)
  const scenarioTemplates = getSeedTemplatesForScenario(scenarioCategory);
  const types = Object.keys(scenarioTemplates);

  // Also keep some generic templates for variety (30% chance)
  const genericTypes = Object.keys(SEED_TEMPLATES);

  const usedPairs = new Set<string>();

  for (let i = 0; i < seedCount && i < 15; i++) {
    // 70% chance to use scenario-specific, 30% chance generic (for variety)
    const useScenario = scenarioCategory !== 'generic' && Math.random() < 0.7;
    const templates = useScenario ? scenarioTemplates : SEED_TEMPLATES;
    const availableTypes = useScenario ? types : genericTypes;

    // Pick a random seed type
    const type = availableTypes[Math.floor(Math.random() * availableTypes.length)];
    const templateOptions = templates[type];
    if (!templateOptions || templateOptions.length === 0) continue;

    const templateObj = templateOptions[Math.floor(Math.random() * templateOptions.length)];

    // Pick NPCs for this seed
    // witness = the NPC who KNOWS the secret (they will reveal it)
    const witness = npcs[Math.floor(Math.random() * npcs.length)];

    // Determine subject - if playerIsSubject, the player is the subject
    // Otherwise, pick another NPC
    let subjectName: string;
    let subjectId: string | null = null; // null means player is subject

    if (templateObj.playerIsSubject) {
      // This seed is about the PLAYER
      subjectName = identity.name;
      subjectId = null; // Player, not an NPC
    } else {
      // This seed is about another NPC
      let subject = npcs[Math.floor(Math.random() * npcs.length)];

      // Ensure different NPCs for witness and subject
      let attempts = 0;
      while (subject.id === witness.id && attempts < 10) {
        subject = npcs[Math.floor(Math.random() * npcs.length)];
        attempts++;
      }
      if (subject.id === witness.id) continue;

      subjectName = subject.name;
      subjectId = subject.id;
    }

    // Avoid duplicate pairs for the same type
    const pairKey = `${type}-${witness.id}-${subjectId || 'player'}`;
    if (usedPairs.has(pairKey)) continue;
    usedPairs.add(pairKey);

    // Generate the fact with clear name attribution
    const fact = templateObj.template
      .replace(/{witness}/g, witness.name)
      .replace(/{subject}/g, subjectName)
      .replace(/{player}/g, identity.name)
      .replace(/{workplace}/g, identity.scenario.workplace || 'the office');

    // The WITNESS knows this secret (not the subject!)
    // This is crucial - the witness can reveal it, the subject wouldn't
    const knownBy = [witness.id];

    // Sometimes a third party also witnessed it (30% chance)
    if (Math.random() > 0.7) {
      const thirdParty = npcs.find(n => n.id !== witness.id && n.id !== subjectId);
      if (thirdParty) knownBy.push(thirdParty.id);
    }

    // Determine severity based on type - scenario-specific types are generally more severe
    const severityMap: Record<string, StorySeed['severity']> = {
      crime: 'major',
      affair: 'moderate',
      betrayal: 'major',
      evidence: 'moderate',
      secret: Math.random() > 0.5 ? 'explosive' : 'major',
      // Espionage seeds
      double_agent: 'explosive',
      blown_cover: 'explosive',
      // Underworld seeds
      power: 'major',
      // Corporate seeds
      fraud: 'explosive',
      scandal: 'major',
      // Creative seeds - scandal and secrets already defined above
    };

    seeds.push({
      id: crypto.randomUUID(),
      fact,
      knownBy,
      type: (type === 'double_agent' || type === 'blown_cover' ? 'betrayal' :
             type === 'fraud' || type === 'power' ? 'crime' :
             type === 'scandal' ? 'affair' :
             type === 'secrets' ? 'secret' :
             type) as StorySeed['type'],
      severity: severityMap[type] || 'moderate',
      revealedToPlayer: false,
      revealedTo: [],
      narrativePriority: i + 1, // Earlier seeds have higher priority
    });
  }

  return seeds;
}

/**
 * Options for revelation selection
 */
export interface RevelationOptions {
  /** Number of messages THIS NPC has sent (not total messages) */
  npcMessageCount: number;
  /** Total messages in conversation (for context) */
  totalMessageCount: number;
  /** Has another NPC already revealed something major this conversation round? */
  majorRevealedThisRound: boolean;
  /** IDs of seeds already revealed in this conversation (any NPC) */
  alreadyRevealedSeedIds: string[];
}

/**
 * Select what an NPC should reveal in this conversation based on pressure
 *
 * Key change: Uses per-NPC message count, not total messages.
 * This prevents ALL NPCs from hitting "high pressure" simultaneously.
 */
export function selectRevelationForNPC(
  npc: NPC,
  allNpcs: NPC[],
  storySeeds: StorySeed[],
  messageCountOrOptions: number | RevelationOptions,
  identity: Identity
): RevelationDirective {
  // Support both old signature (just messageCount) and new options object
  const options: RevelationOptions = typeof messageCountOrOptions === 'number'
    ? {
        npcMessageCount: messageCountOrOptions, // Fallback: use total as NPC count
        totalMessageCount: messageCountOrOptions,
        majorRevealedThisRound: false,
        alreadyRevealedSeedIds: [],
      }
    : messageCountOrOptions;

  const { npcMessageCount, totalMessageCount, majorRevealedThisRound, alreadyRevealedSeedIds } = options;

  // Find seeds this NPC knows about that haven't been revealed
  const knownSeeds = storySeeds.filter(
    seed => seed.knownBy.includes(npc.id) &&
            !seed.revealedToPlayer &&
            !alreadyRevealedSeedIds.includes(seed.id)
  );

  // Sort by priority (lower = reveal sooner)
  knownSeeds.sort((a, b) => a.narrativePriority - b.narrativePriority);

  // Determine revelation based on THIS NPC's message count (not total)
  let mustReveal: string | null = null;
  let revealAfterMessages = 999;

  // If another NPC already revealed something major this round, this NPC only hints
  if (majorRevealedThisRound && knownSeeds.length > 0) {
    // Don't reveal, just hint
    mustReveal = knownSeeds[0].fact;
    revealAfterMessages = 3; // Will hint, not fully reveal
  } else if (npcMessageCount >= 4 && knownSeeds.length > 0) {
    // HIGH PRESSURE: This NPC has spoken 4+ times - time to reveal
    const majorSeed = knownSeeds.find(s => s.severity === 'explosive' || s.severity === 'major')
      || knownSeeds[0];
    if (majorSeed) {
      mustReveal = majorSeed.fact;
      revealAfterMessages = 0; // Reveal immediately
    }
  } else if (npcMessageCount >= 2 && knownSeeds.length > 0) {
    // MEDIUM PRESSURE: This NPC has spoken 2-3 times - building tension
    mustReveal = knownSeeds[0].fact;
    revealAfterMessages = 2;
  } else if (npcMessageCount >= 1 && totalMessageCount >= 4 && knownSeeds.length > 0) {
    // LOW PRESSURE: Conversation is heating up, start hinting
    mustReveal = knownSeeds[0].fact;
    revealAfterMessages = 3;
  }

  // Generate conversation goal based on emotional state
  const conversationGoal = generateConversationGoal(npc, allNpcs, identity);

  // Generate specific conflicts with other NPCs present
  const conflicts = generateNPCConflicts(npc, allNpcs, storySeeds, identity);

  return {
    npcId: npc.id,
    mustReveal,
    revealAfterMessages,
    conversationGoal,
    conflicts,
  };
}

/**
 * Generate a specific conversation goal for an NPC
 */
function generateConversationGoal(npc: NPC, otherNpcs: NPC[], identity: Identity): string {
  const goals: string[] = [];

  // Base goal on emotional state
  switch (npc.currentEmotionalState) {
    case 'angry':
    case 'furious':
      goals.push(`Confront someone about what's making you angry. NAME the specific thing.`);
      break;
    case 'suspicious':
      goals.push(`Get someone to slip up and reveal what they're hiding. Ask pointed questions.`);
      break;
    case 'guilty':
      goals.push(`You're close to confessing something. The pressure is getting to you.`);
      break;
    case 'scared':
    case 'anxious':
      goals.push(`Warn others about what you've seen or heard. Be specific about the danger.`);
      break;
    case 'bitter':
    case 'resentful':
      goals.push(`Make a cutting remark about someone's past actions. Bring up old wounds.`);
      break;
    case 'sad':
    case 'grieving':
      goals.push(`Share what's really bothering you. Open up about the actual problem.`);
      break;
    default:
      goals.push(`Push someone to reveal what they know. Don't let them deflect.`);
  }

  // Add relationship-based goal
  if (otherNpcs.length > 0) {
    const target = otherNpcs[Math.floor(Math.random() * otherNpcs.length)];
    if (npc.relationshipStatus.toLowerCase().includes('tense') ||
        npc.relationshipStatus.toLowerCase().includes('hostile')) {
      goals.push(`You have unfinished business with ${target.name}. Address it directly.`);
    }
  }

  return goals.join(' ');
}

/**
 * Generate specific conflicts between NPCs
 */
function generateNPCConflicts(
  npc: NPC,
  otherNpcs: NPC[],
  storySeeds: StorySeed[],
  identity: Identity
): { npcName: string; conflict: string }[] {
  const conflicts: { npcName: string; conflict: string }[] = [];

  for (const other of otherNpcs.slice(0, 3)) {
    // Check if there's a story seed connecting them
    const connectingSeed = storySeeds.find(seed =>
      (seed.knownBy.includes(npc.id) && seed.fact.includes(other.name)) ||
      (seed.knownBy.includes(other.id) && seed.fact.includes(npc.name))
    );

    if (connectingSeed) {
      if (connectingSeed.knownBy.includes(npc.id)) {
        conflicts.push({
          npcName: other.name,
          conflict: `You know something damaging about ${other.name}. Use it as leverage.`,
        });
      } else {
        conflicts.push({
          npcName: other.name,
          conflict: `${other.name} knows something about you. Find out what and neutralize them.`,
        });
      }
    } else {
      // Generate generic conflict based on roles
      if (npc.tier === 'core' && other.tier === 'core') {
        conflicts.push({
          npcName: other.name,
          conflict: `You and ${other.name} are competing for ${identity.name}'s attention/loyalty.`,
        });
      }
    }
  }

  return conflicts;
}

/**
 * Build the revelation directive prompt section
 * This is placed at the END of the system prompt for maximum weight.
 */
export function buildRevelationPrompt(directive: RevelationDirective, messageCount: number): string {
  const parts: string[] = [];

  // Add the must-reveal directive if applicable
  if (directive.mustReveal) {
    if (messageCount >= directive.revealAfterMessages) {
      // CRITICAL: This is the most important part - force the exact revelation
      parts.push(`
╔══════════════════════════════════════════════════════════════════╗
║                    MANDATORY REVELATION                          ║
╚══════════════════════════════════════════════════════════════════╝

Your response MUST include this EXACT information (paraphrase allowed):
>>> ${directive.mustReveal} <<<

HOW TO REVEAL IT:
- USE THE NAME of who you're accusing: "I know what [NAME] did" - NOT just "you"
- Be specific: "I saw [NAME] at the office that night"
- Or confront directly with their name: "[NAME], don't lie to me"
- Or let it slip: "Wait... you didn't know about what [NAME] did?"

DO NOT:
- Say vague things like "I know what you did" without a name
- Make up different accusations
- Talk about things NOT in the revelation above
- Be vague or use metaphors
- Assume OTHER NPCs committed the crime - stick to what's in the revelation

Your message will FAIL if it doesn't contain the key details from the revelation above.`);
    } else {
      parts.push(`
=== INFORMATION YOU KNOW ===
You have discovered: "${directive.mustReveal}"

You're not ready to reveal this yet. For now:
- Drop hints that make them nervous
- Ask pointed questions
- React to what THEY say, don't dump information
- Build tension for ${directive.revealAfterMessages - messageCount} more exchanges`);
    }
  } else {
    // No revelation directive - focus on reacting to the conversation
    parts.push(`
=== CONVERSATION MODE ===
React to what others are saying. Ask questions. Show emotion.
DO NOT make up accusations or reveal secrets you don't have.
If someone accuses you, respond naturally - deny, deflect, or be honest.`);
  }

  // Add conversation goal
  parts.push(`
=== YOUR GOAL ===
${directive.conversationGoal}`);

  // Add specific conflicts (only if relevant)
  if (directive.conflicts.length > 0) {
    parts.push(`
=== TENSIONS ===`);
    for (const conflict of directive.conflicts) {
      parts.push(`• ${conflict.npcName}: ${conflict.conflict}`);
    }
  }

  return parts.join('\n');
}

/**
 * Mark a story seed as revealed
 */
export function markSeedRevealed(
  seeds: StorySeed[],
  seedId: string,
  revealedTo: string
): StorySeed[] {
  return seeds.map(seed => {
    if (seed.id === seedId) {
      return {
        ...seed,
        revealedToPlayer: revealedTo === 'player' || seed.revealedToPlayer,
        revealedTo: [...seed.revealedTo, revealedTo],
      };
    }
    return seed;
  });
}

/**
 * Check if a message contains a revelation and mark it
 */
export function detectAndMarkRevelation(
  message: string,
  npcId: string,
  seeds: StorySeed[]
): { revealed: StorySeed | null; updatedSeeds: StorySeed[] } {
  // Look for seeds this NPC knows that might have been revealed
  const npcSeeds = seeds.filter(s => s.knownBy.includes(npcId) && !s.revealedToPlayer);

  for (const seed of npcSeeds) {
    // Check if key parts of the fact appear in the message
    const factWords = seed.fact.toLowerCase().split(' ').filter(w => w.length > 4);
    const messageWords = message.toLowerCase();

    const matchCount = factWords.filter(w => messageWords.includes(w)).length;
    const matchRatio = matchCount / factWords.length;

    // If enough key words match, consider it revealed
    if (matchRatio > 0.3) {
      return {
        revealed: seed,
        updatedSeeds: markSeedRevealed(seeds, seed.id, 'player'),
      };
    }
  }

  return { revealed: null, updatedSeeds: seeds };
}

/**
 * Generate inter-NPC relationship dynamics for richer interactions
 */
export function generateNPCDynamics(npcs: NPC[]): Map<string, Map<string, string>> {
  const dynamics = new Map<string, Map<string, string>>();

  const dynamicTypes = [
    'rivals for the same thing',
    'former allies now distrustful',
    'one owes the other a favor',
    'shared a secret that binds them',
    'one betrayed the other in the past',
    'competing for someone\'s affection',
    'one knows something the other desperately needs',
    'have history nobody else knows about',
  ];

  for (const npc1 of npcs) {
    const npc1Dynamics = new Map<string, string>();

    for (const npc2 of npcs) {
      if (npc1.id === npc2.id) continue;

      // Assign a random dynamic
      const dynamic = dynamicTypes[Math.floor(Math.random() * dynamicTypes.length)];
      npc1Dynamics.set(npc2.id, dynamic);
    }

    dynamics.set(npc1.id, npc1Dynamics);
  }

  return dynamics;
}
