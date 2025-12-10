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
 * Templates for generating story seeds based on NPC relationships
 * IMPORTANT: {witness} is the NPC who KNOWS the secret and can reveal it.
 * {subject} is the NPC the secret is ABOUT (they wouldn't willingly reveal this).
 * This prevents NPCs from confessing their own secrets immediately.
 */
const SEED_TEMPLATES: Record<string, { template: string; witnessKnows: boolean }[]> = {
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
 * Generate story seeds for a new identity
 * Creates concrete facts that will drive narrative
 *
 * Key principle: The WITNESS knows the secret and can reveal it.
 * The SUBJECT is who the secret is about - they won't confess unprompted.
 */
export function generateStorySeeds(
  identity: Identity,
  seedCount: number = 8
): StorySeed[] {
  const seeds: StorySeed[] = [];
  const npcs = identity.npcs.filter(n => !n.isDead && n.isActive);

  if (npcs.length < 2) return seeds;

  const types = Object.keys(SEED_TEMPLATES) as (keyof typeof SEED_TEMPLATES)[];
  const usedPairs = new Set<string>();

  for (let i = 0; i < seedCount && i < 15; i++) {
    // Pick a random seed type
    const type = types[Math.floor(Math.random() * types.length)];
    const templateOptions = SEED_TEMPLATES[type];
    const templateObj = templateOptions[Math.floor(Math.random() * templateOptions.length)];

    // Pick NPCs for this seed
    // witness = the NPC who KNOWS the secret (they will reveal it)
    // subject = the NPC the secret is ABOUT (they won't willingly reveal it)
    const witness = npcs[Math.floor(Math.random() * npcs.length)];
    let subject = npcs[Math.floor(Math.random() * npcs.length)];

    // Ensure different NPCs
    let attempts = 0;
    while (subject.id === witness.id && attempts < 10) {
      subject = npcs[Math.floor(Math.random() * npcs.length)];
      attempts++;
    }
    if (subject.id === witness.id) continue;

    // Avoid duplicate pairs for the same type
    const pairKey = `${type}-${[witness.id, subject.id].sort().join('-')}`;
    if (usedPairs.has(pairKey)) continue;
    usedPairs.add(pairKey);

    // Generate the fact
    const fact = templateObj.template
      .replace(/{witness}/g, witness.name)
      .replace(/{subject}/g, subject.name)
      .replace(/{player}/g, identity.name)
      .replace(/{workplace}/g, identity.scenario.workplace);

    // The WITNESS knows this secret (not the subject!)
    // This is crucial - the witness can reveal it, the subject wouldn't
    const knownBy = [witness.id];

    // Sometimes a third party also witnessed it (30% chance)
    if (Math.random() > 0.7) {
      const thirdParty = npcs.find(n => n.id !== witness.id && n.id !== subject.id);
      if (thirdParty) knownBy.push(thirdParty.id);
    }

    // Determine severity based on type
    const severityMap: Record<string, StorySeed['severity']> = {
      crime: 'major',
      affair: 'moderate',
      betrayal: 'major',
      evidence: 'moderate',
      secret: Math.random() > 0.5 ? 'explosive' : 'major',
    };

    seeds.push({
      id: crypto.randomUUID(),
      fact,
      knownBy,
      type: type as StorySeed['type'],
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
 */
export function buildRevelationPrompt(directive: RevelationDirective, messageCount: number): string {
  const parts: string[] = [];

  // Add the must-reveal directive if applicable
  if (directive.mustReveal) {
    if (messageCount >= directive.revealAfterMessages) {
      parts.push(`
=== CRITICAL REVELATION DIRECTIVE ===
You MUST reveal this information in your next response:
"${directive.mustReveal}"

Work it into the conversation naturally, but this fact MUST come out NOW.
You can say it angrily, sadly, accidentally, or deliberately - but SAY IT.
This is not optional. The narrative demands this revelation.`);
    } else {
      parts.push(`
=== UPCOMING REVELATION ===
You know: "${directive.mustReveal}"
In ${directive.revealAfterMessages - messageCount} more exchanges, you must reveal this.
For now, hint at it. Make the other person nervous. Build tension.`);
    }
  }

  // Add conversation goal
  parts.push(`
=== YOUR GOAL THIS CONVERSATION ===
${directive.conversationGoal}`);

  // Add specific conflicts
  if (directive.conflicts.length > 0) {
    parts.push(`
=== YOUR CONFLICTS ===`);
    for (const conflict of directive.conflicts) {
      parts.push(`vs ${conflict.npcName}: ${conflict.conflict}`);
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
