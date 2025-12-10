/**
 * Group Dynamics
 *
 * This module handles emergent storylines from NPC interactions,
 * group conversation management, and dynamic agenda generation.
 */

import { Identity, NPC } from '../types';
import {
  NarrativeState,
  StoryArc,
  ConversationAgenda,
  GroupConversationState,
  RelationshipMetrics,
} from './types';
import { getRelationship, calculateTension, addStoryArc } from './state';
import { getConflictingFacts, getSharedFacts, selectRevelation } from './knowledge-graph';
import { generateEmergentArc } from './story-generator';

// =============================================================================
// GROUP INITIALIZATION
// =============================================================================

/**
 * Initialize a group conversation with dynamics analysis
 */
export function initializeGroupConversation(
  state: NarrativeState,
  participantIds: string[],
  identity: Identity
): { state: NarrativeState; groupState: GroupConversationState } {
  const groupId = `group-${participantIds.sort().join('-')}`;

  // Analyze existing relationships and conflicts
  const conflicts = analyzeGroupConflicts(state, participantIds, identity);
  const sharedKnowledge = analyzeSharedKnowledge(state, participantIds);
  const potentialAlliances = analyzePotentialAlliances(state, participantIds);

  // Generate agendas for each participant
  const agendas = participantIds.map(npcId =>
    generateConversationAgenda(state, npcId, participantIds, identity, conflicts)
  );

  // Check if this group combination could spawn emergent arcs
  const emergentArcs = checkForEmergentArcs(state, participantIds, identity);

  let newState = state;

  // Add any emergent arcs
  for (const arc of emergentArcs) {
    newState = addStoryArc(newState, arc);
  }

  const groupState: GroupConversationState = {
    participantIds,
    agendas,
    emergentArcs: emergentArcs.map(a => a.id),
    tensionLevel: calculateGroupTension(state, participantIds),
    revealedFacts: [],
    messageCount: 0,
    significantMoments: [],
  };

  // Store in active conversations
  newState = {
    ...newState,
    activeGroupConversations: {
      ...newState.activeGroupConversations,
      [groupId]: groupState,
    },
    lastUpdated: new Date(),
  };

  return { state: newState, groupState };
}

// =============================================================================
// CONFLICT ANALYSIS
// =============================================================================

interface GroupConflict {
  npc1Id: string;
  npc2Id: string;
  type: 'rivalry' | 'distrust' | 'resentment' | 'secret' | 'competition';
  intensity: number; // 0-100
  description: string;
}

/**
 * Analyze conflicts between NPCs in a group
 */
function analyzeGroupConflicts(
  state: NarrativeState,
  participantIds: string[],
  identity: Identity
): GroupConflict[] {
  const conflicts: GroupConflict[] = [];
  const npcById = new Map(identity.npcs.map(n => [n.id, n]));

  for (let i = 0; i < participantIds.length; i++) {
    for (let j = i + 1; j < participantIds.length; j++) {
      const npc1Id = participantIds[i];
      const npc2Id = participantIds[j];
      const npc1 = npcById.get(npc1Id);
      const npc2 = npcById.get(npc2Id);

      if (!npc1 || !npc2) continue;

      const rel1to2 = getRelationship(state, npc1Id, npc2Id);
      const rel2to1 = getRelationship(state, npc2Id, npc1Id);

      if (!rel1to2 || !rel2to1) continue;

      // Check for rivalry
      if (rel1to2.metrics.rivalry > 50 || rel2to1.metrics.rivalry > 50) {
        conflicts.push({
          npc1Id,
          npc2Id,
          type: 'rivalry',
          intensity: Math.max(rel1to2.metrics.rivalry, rel2to1.metrics.rivalry),
          description: `${npc1.name} and ${npc2.name} are competing for something`,
        });
      }

      // Check for distrust
      if (rel1to2.metrics.trust < 30 || rel2to1.metrics.trust < 30) {
        conflicts.push({
          npc1Id,
          npc2Id,
          type: 'distrust',
          intensity: 100 - Math.min(rel1to2.metrics.trust, rel2to1.metrics.trust),
          description: `${npc1.name} and ${npc2.name} don't trust each other`,
        });
      }

      // Check for knowledge-based conflicts
      const conflictingFacts = getConflictingFacts(state, npc1Id, npc2Id, npc1.name, npc2.name);
      if (conflictingFacts.length > 0) {
        conflicts.push({
          npc1Id,
          npc2Id,
          type: 'secret',
          intensity: conflictingFacts.length * 25,
          description: `There are secrets between ${npc1.name} and ${npc2.name}`,
        });
      }

      // Check for resentment (negative affection)
      if (rel1to2.metrics.affection < 30 || rel2to1.metrics.affection < 30) {
        conflicts.push({
          npc1Id,
          npc2Id,
          type: 'resentment',
          intensity: 100 - Math.min(rel1to2.metrics.affection, rel2to1.metrics.affection),
          description: `${npc1.name} and ${npc2.name} have negative feelings`,
        });
      }
    }
  }

  return conflicts;
}

/**
 * Analyze shared knowledge between group members
 */
function analyzeSharedKnowledge(
  state: NarrativeState,
  participantIds: string[]
): { factId: string; knownBy: string[] }[] {
  const sharedFacts = getSharedFacts(state, participantIds);

  return sharedFacts.map(fact => ({
    factId: fact.id,
    knownBy: fact.knownBy.filter(id => participantIds.includes(id)),
  }));
}

/**
 * Identify potential alliances in the group
 */
function analyzePotentialAlliances(
  state: NarrativeState,
  participantIds: string[]
): { npc1Id: string; npc2Id: string; strength: number }[] {
  const alliances: { npc1Id: string; npc2Id: string; strength: number }[] = [];

  for (let i = 0; i < participantIds.length; i++) {
    for (let j = i + 1; j < participantIds.length; j++) {
      const npc1Id = participantIds[i];
      const npc2Id = participantIds[j];

      const rel1to2 = getRelationship(state, npc1Id, npc2Id);
      const rel2to1 = getRelationship(state, npc2Id, npc1Id);

      if (!rel1to2 || !rel2to1) continue;

      // High trust and affection = potential alliance
      const avgTrust = (rel1to2.metrics.trust + rel2to1.metrics.trust) / 2;
      const avgAffection = (rel1to2.metrics.affection + rel2to1.metrics.affection) / 2;

      if (avgTrust > 60 && avgAffection > 50) {
        alliances.push({
          npc1Id,
          npc2Id,
          strength: (avgTrust + avgAffection) / 2,
        });
      }
    }
  }

  return alliances;
}

/**
 * Calculate overall group tension
 */
function calculateGroupTension(state: NarrativeState, participantIds: string[]): number {
  let totalTension = 0;
  let pairCount = 0;

  for (let i = 0; i < participantIds.length; i++) {
    for (let j = i + 1; j < participantIds.length; j++) {
      totalTension += calculateTension(state, participantIds[i], participantIds[j]);
      pairCount++;
    }
  }

  // Add global tension influence
  const pairAvg = pairCount > 0 ? totalTension / pairCount : 0;
  return (pairAvg + state.globalTension) / 2;
}

// =============================================================================
// AGENDA GENERATION
// =============================================================================

/**
 * Generate a conversation agenda for an NPC in a group
 */
function generateConversationAgenda(
  state: NarrativeState,
  npcId: string,
  allParticipantIds: string[],
  identity: Identity,
  conflicts: GroupConflict[]
): ConversationAgenda {
  const npc = identity.npcs.find(n => n.id === npcId);
  if (!npc) {
    return createDefaultAgenda(npcId);
  }

  const otherIds = allParticipantIds.filter(id => id !== npcId);

  // Find conflicts involving this NPC
  const myConflicts = conflicts.filter(c => c.npc1Id === npcId || c.npc2Id === npcId);
  const conflictsWith = myConflicts.map(c => c.npc1Id === npcId ? c.npc2Id : c.npc1Id);

  // Find potential allies
  const potentialAllies = otherIds.filter(otherId => {
    const rel = getRelationship(state, npcId, otherId);
    return rel && rel.metrics.trust > 60 && rel.metrics.affection > 50;
  });

  // Determine strategy based on emotional state and conflicts
  const strategy = determineStrategy(npc, myConflicts, potentialAllies);

  // Generate goals
  const goals = generateGoals(npc, myConflicts, state, identity);

  // Check if this NPC should reveal something
  const revelation = selectRevelation(state, npcId, 0, otherIds);

  return {
    npcId,
    goals,
    mustReveal: revelation?.factId,
    revealAfterMessages: revelation ? Math.floor(Math.random() * 5) + 3 : 999,
    conflictsWith,
    alliedWith: potentialAllies,
    currentStrategy: strategy,
  };
}

/**
 * Create a default agenda for unknown NPC
 */
function createDefaultAgenda(npcId: string): ConversationAgenda {
  return {
    npcId,
    goals: ['Observe and gather information'],
    revealAfterMessages: 999,
    conflictsWith: [],
    alliedWith: [],
    currentStrategy: 'neutral',
  };
}

/**
 * Determine conversation strategy
 */
function determineStrategy(
  npc: NPC,
  conflicts: GroupConflict[],
  allies: string[]
): ConversationAgenda['currentStrategy'] {
  const emotion = npc.currentEmotionalState.toLowerCase();

  // Emotional state drives strategy
  if (emotion.includes('angry') || emotion.includes('furious')) {
    return 'aggressive';
  }
  if (emotion.includes('scared') || emotion.includes('anxious')) {
    return 'defensive';
  }
  if (emotion.includes('suspicious') || emotion.includes('calculating')) {
    return 'manipulative';
  }
  if (emotion.includes('loving') || emotion.includes('supportive')) {
    return 'supportive';
  }

  // Situation drives strategy
  if (conflicts.length > 2) {
    return 'defensive';
  }
  if (allies.length > 1) {
    return 'aggressive'; // Confidence from allies
  }

  return 'neutral';
}

/**
 * Generate goals for an NPC in conversation
 */
function generateGoals(
  npc: NPC,
  conflicts: GroupConflict[],
  state: NarrativeState,
  identity: Identity
): string[] {
  const goals: string[] = [];

  // Base goal from emotional state
  const emotion = npc.currentEmotionalState.toLowerCase();

  if (emotion.includes('angry')) {
    goals.push('Confront someone about what\'s making you angry');
  } else if (emotion.includes('suspicious')) {
    goals.push('Figure out what others are hiding');
  } else if (emotion.includes('scared')) {
    goals.push('Seek protection or allies');
  } else if (emotion.includes('sad') || emotion.includes('grieving')) {
    goals.push('Seek comfort or express your pain');
  } else if (emotion.includes('guilty')) {
    goals.push('Consider confessing or deflecting blame');
  }

  // Goals from conflicts
  for (const conflict of conflicts.slice(0, 2)) {
    const otherId = conflict.npc1Id === npc.id ? conflict.npc2Id : conflict.npc1Id;
    const other = identity.npcs.find(n => n.id === otherId);
    if (other) {
      switch (conflict.type) {
        case 'rivalry':
          goals.push(`Assert dominance over ${other.name}`);
          break;
        case 'distrust':
          goals.push(`Watch ${other.name} for signs of betrayal`);
          break;
        case 'secret':
          goals.push(`Probe ${other.name} about what they know`);
          break;
        case 'resentment':
          goals.push(`Make ${other.name} feel your displeasure`);
          break;
      }
    }
  }

  // Goals from active story arcs
  const myArcs = state.activeArcs.filter(arc => arc.participants.includes(npc.id));
  for (const arc of myArcs.slice(0, 1)) {
    const role = arc.roles[npc.id];
    if (role === 'antagonist') {
      goals.push('Advance your scheme without raising suspicion');
    } else if (role === 'witness') {
      goals.push('Decide whether to reveal what you know');
    } else if (role === 'victim') {
      goals.push('Understand what\'s been happening to you');
    }
  }

  // Default goal if none generated
  if (goals.length === 0) {
    goals.push('Engage in the conversation and gather information');
  }

  return goals;
}

// =============================================================================
// EMERGENT ARC DETECTION
// =============================================================================

/**
 * Check if this group combination could spawn new story arcs
 */
function checkForEmergentArcs(
  state: NarrativeState,
  participantIds: string[],
  identity: Identity
): StoryArc[] {
  const emergentArcs: StoryArc[] = [];

  // Only spawn emergent arcs if conditions are right
  if (state.activeArcs.length >= 5) {
    return []; // Too many arcs already
  }

  // Check if these NPCs have enough tension to spawn a conflict
  const groupTension = calculateGroupTension(state, participantIds);

  if (groupTension > 60 && Math.random() < 0.3) {
    // High tension = chance of emergent conflict
    const result = generateEmergentArc(participantIds, state, identity);
    if (result) {
      emergentArcs.push(result.arc);
    }
  }

  // Check if two NPCs with secrets about each other are present
  for (let i = 0; i < participantIds.length; i++) {
    for (let j = i + 1; j < participantIds.length; j++) {
      const npc1 = identity.npcs.find(n => n.id === participantIds[i]);
      const npc2 = identity.npcs.find(n => n.id === participantIds[j]);

      if (!npc1 || !npc2) continue;

      const conflictingFacts = getConflictingFacts(state, participantIds[i], participantIds[j], npc1.name, npc2.name);

      if (conflictingFacts.length >= 2 && Math.random() < 0.2) {
        // Multiple secrets = chance of exposure arc
        const result = generateEmergentArc([participantIds[i], participantIds[j]], state, identity);
        if (result) {
          result.arc.type = 'emergent';
          emergentArcs.push(result.arc);
        }
      }
    }
  }

  return emergentArcs;
}

// =============================================================================
// CONVERSATION UPDATES
// =============================================================================

/**
 * Update group conversation state after a message
 */
export function updateGroupConversation(
  state: NarrativeState,
  groupId: string,
  speakerNpcId: string,
  messageContent: string
): NarrativeState {
  const groupState = state.activeGroupConversations[groupId];
  if (!groupState) return state;

  // Increment message count
  const newMessageCount = groupState.messageCount + 1;

  // Check for revelations in message content
  const revealedFacts = [...groupState.revealedFacts];

  // Check if any NPC's must-reveal threshold was hit
  const updatedAgendas = groupState.agendas.map(agenda => {
    if (agenda.npcId === speakerNpcId && agenda.mustReveal) {
      if (newMessageCount >= agenda.revealAfterMessages) {
        // Check if the fact content appears in the message
        const fact = state.worldFacts.find(f => f.id === agenda.mustReveal);
        if (fact) {
          const contentWords = fact.content.toLowerCase().split(' ');
          const messageWords = messageContent.toLowerCase();

          // If key words from the fact appear, mark as revealed
          const matchedWords = contentWords.filter(w => w.length > 4 && messageWords.includes(w));
          if (matchedWords.length >= 2) {
            revealedFacts.push(agenda.mustReveal);
            return { ...agenda, mustReveal: undefined };
          }
        }
      }
    }
    return agenda;
  });

  // Update tension based on message content
  let tensionDelta = 0;
  const lowerContent = messageContent.toLowerCase();

  if (lowerContent.includes('accuse') || lowerContent.includes('liar') || lowerContent.includes('betrayed')) {
    tensionDelta += 5;
  }
  if (lowerContent.includes('trust') || lowerContent.includes('together') || lowerContent.includes('help')) {
    tensionDelta -= 3;
  }
  if (lowerContent.includes('kill') || lowerContent.includes('destroy') || lowerContent.includes('revenge')) {
    tensionDelta += 10;
  }

  const updatedGroupState: GroupConversationState = {
    ...groupState,
    messageCount: newMessageCount,
    agendas: updatedAgendas,
    revealedFacts,
    tensionLevel: Math.max(0, Math.min(100, groupState.tensionLevel + tensionDelta)),
  };

  return {
    ...state,
    activeGroupConversations: {
      ...state.activeGroupConversations,
      [groupId]: updatedGroupState,
    },
    lastUpdated: new Date(),
  };
}

/**
 * Get the current agenda for an NPC in a group conversation
 */
export function getNPCAgenda(
  state: NarrativeState,
  groupId: string,
  npcId: string
): ConversationAgenda | null {
  const groupState = state.activeGroupConversations[groupId];
  if (!groupState) return null;

  return groupState.agendas.find(a => a.npcId === npcId) || null;
}

/**
 * Build prompt additions for group dynamics
 */
export function buildGroupDynamicsPrompt(
  state: NarrativeState,
  groupId: string,
  npcId: string,
  identity: Identity
): string {
  const groupState = state.activeGroupConversations[groupId];
  if (!groupState) return '';

  const agenda = groupState.agendas.find(a => a.npcId === npcId);
  if (!agenda) return '';

  const npc = identity.npcs.find(n => n.id === npcId);
  if (!npc) return '';

  const parts: string[] = [];

  // Goals section
  if (agenda.goals.length > 0) {
    parts.push(`=== YOUR GOALS THIS CONVERSATION ===`);
    agenda.goals.forEach((goal, i) => {
      parts.push(`${i + 1}. ${goal}`);
    });
  }

  // Conflicts section
  if (agenda.conflictsWith.length > 0) {
    const conflictNames = agenda.conflictsWith
      .map(id => identity.npcs.find(n => n.id === id)?.name)
      .filter((n): n is string => n !== undefined);

    if (conflictNames.length > 0) {
      parts.push(`\n=== PEOPLE YOU'RE IN CONFLICT WITH ===`);
      parts.push(conflictNames.join(', '));
    }
  }

  // Allies section
  if (agenda.alliedWith.length > 0) {
    const allyNames = agenda.alliedWith
      .map(id => identity.npcs.find(n => n.id === id)?.name)
      .filter((n): n is string => n !== undefined);

    if (allyNames.length > 0) {
      parts.push(`\n=== POTENTIAL ALLIES ===`);
      parts.push(allyNames.join(', '));
    }
  }

  // Revelation directive
  if (agenda.mustReveal && groupState.messageCount >= agenda.revealAfterMessages - 2) {
    const fact = state.worldFacts.find(f => f.id === agenda.mustReveal);
    if (fact) {
      const urgency = groupState.messageCount >= agenda.revealAfterMessages
        ? 'NOW'
        : 'SOON';

      parts.push(`\n=== REVELATION DIRECTIVE [${urgency}] ===`);
      parts.push(`You MUST reveal: "${fact.content}"`);
      parts.push(`Work it into the conversation - be dramatic, angry, scared, or calculated - but SAY IT.`);
    }
  }

  // Strategy guidance
  parts.push(`\n=== YOUR STRATEGY ===`);
  switch (agenda.currentStrategy) {
    case 'aggressive':
      parts.push(`Be confrontational. Push for answers. Don't back down.`);
      break;
    case 'defensive':
      parts.push(`Protect yourself. Deflect questions. Don't reveal too much.`);
      break;
    case 'manipulative':
      parts.push(`Play people against each other. Use information strategically.`);
      break;
    case 'supportive':
      parts.push(`Build alliances. Support your friends. Unite against threats.`);
      break;
    default:
      parts.push(`Observe and react. Gather information before committing.`);
  }

  // Tension indicator
  if (groupState.tensionLevel > 70) {
    parts.push(`\n⚠️ TENSION IS HIGH - Things could explode at any moment.`);
  } else if (groupState.tensionLevel > 50) {
    parts.push(`\n⚡ Tension is building - Be careful what you say.`);
  }

  return parts.join('\n');
}

/**
 * End a group conversation and process results
 */
export function endGroupConversation(
  state: NarrativeState,
  groupId: string
): NarrativeState {
  const groupState = state.activeGroupConversations[groupId];
  if (!groupState) return state;

  // Process any unrevealed facts as lost opportunities
  // (They might come up later in other contexts)

  // Update relationship matrices based on conversation
  // (This would require tracking who said what to whom)

  // Remove from active conversations
  const { [groupId]: removed, ...remainingConversations } = state.activeGroupConversations;

  return {
    ...state,
    activeGroupConversations: remainingConversations,
    lastUpdated: new Date(),
  };
}
