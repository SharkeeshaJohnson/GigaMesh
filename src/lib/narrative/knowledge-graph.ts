/**
 * Knowledge Graph
 *
 * This module manages the knowledge graph - tracking what each NPC knows,
 * how information spreads, and what can be revealed in conversations.
 */

import {
  NarrativeState,
  WorldFact,
  NPCKnowledge,
  Suspicion,
  StoryArc,
} from './types';
import { addWorldFact, addFactToNPCKnowledge } from './state';

// =============================================================================
// FACT CREATION
// =============================================================================

/**
 * Create a fact about an NPC's action
 */
export function createNPCActionFact(
  state: NarrativeState,
  npcId: string,
  npcName: string,
  action: string,
  witnesses: string[]
): { state: NarrativeState; factId: string } {
  return addWorldFact(state, {
    content: `${npcName} ${action}`,
    category: 'event',
    importance: 'significant',
    knownBy: [npcId, ...witnesses],
    learnedWhen: Object.fromEntries([[npcId, state.currentDay], ...witnesses.map(w => [w, state.currentDay])]),
    canSpread: true,
    spreadProbability: 0.4,
    relatedFacts: [],
    source: 'npc_action',
    veracity: 'true',
  });
}

/**
 * Create a secret fact known only to specific NPCs
 */
export function createSecretFact(
  state: NarrativeState,
  content: string,
  knownBy: string[],
  importance: WorldFact['importance'] = 'major'
): { state: NarrativeState; factId: string } {
  return addWorldFact(state, {
    content,
    category: 'secret',
    importance,
    knownBy,
    learnedWhen: Object.fromEntries(knownBy.map(id => [id, state.currentDay])),
    canSpread: false,
    spreadProbability: 0,
    relatedFacts: [],
    source: 'story_arc',
    veracity: 'true',
  });
}

/**
 * Create a relationship fact
 */
export function createRelationshipFact(
  state: NarrativeState,
  npc1Name: string,
  npc2Name: string,
  relationship: string,
  knownBy: string[]
): { state: NarrativeState; factId: string } {
  return addWorldFact(state, {
    content: `${npc1Name} and ${npc2Name} ${relationship}`,
    category: 'relationship',
    importance: 'significant',
    knownBy,
    learnedWhen: Object.fromEntries(knownBy.map(id => [id, state.currentDay])),
    canSpread: true,
    spreadProbability: 0.5,
    relatedFacts: [],
    source: 'relationship',
    veracity: 'true',
  });
}

// =============================================================================
// KNOWLEDGE QUERIES
// =============================================================================

/**
 * Get all facts an NPC knows
 */
export function getNPCFacts(state: NarrativeState, npcId: string): WorldFact[] {
  const knowledge = state.npcKnowledge[npcId];
  if (!knowledge) return [];

  return knowledge.facts
    .map(factId => state.worldFacts.find(f => f.id === factId))
    .filter((f): f is WorldFact => f !== undefined);
}

/**
 * Get facts an NPC knows that the player doesn't
 */
export function getNPCSecretFacts(state: NarrativeState, npcId: string): WorldFact[] {
  const npcFacts = getNPCFacts(state, npcId);
  return npcFacts.filter(f => !f.knownBy.includes('player'));
}

/**
 * Get facts an NPC knows about another specific NPC
 */
export function getFactsAbout(
  state: NarrativeState,
  knowerNpcId: string,
  aboutNpcId: string,
  aboutNpcName: string
): WorldFact[] {
  const facts = getNPCFacts(state, knowerNpcId);
  return facts.filter(f =>
    f.content.toLowerCase().includes(aboutNpcName.toLowerCase()) ||
    f.knownBy.includes(aboutNpcId)
  );
}

/**
 * Get shared facts between multiple NPCs
 */
export function getSharedFacts(state: NarrativeState, npcIds: string[]): WorldFact[] {
  if (npcIds.length === 0) return [];

  // Start with first NPC's facts
  const firstNpcFacts = new Set(state.npcKnowledge[npcIds[0]]?.facts || []);

  // Intersect with other NPCs' facts
  for (let i = 1; i < npcIds.length; i++) {
    const npcFacts = new Set(state.npcKnowledge[npcIds[i]]?.facts || []);
    for (const factId of firstNpcFacts) {
      if (!npcFacts.has(factId)) {
        firstNpcFacts.delete(factId);
      }
    }
  }

  // Return the actual facts
  return Array.from(firstNpcFacts)
    .map(factId => state.worldFacts.find(f => f.id === factId))
    .filter((f): f is WorldFact => f !== undefined);
}

/**
 * Get facts that could cause conflict between NPCs
 */
export function getConflictingFacts(
  state: NarrativeState,
  npc1Id: string,
  npc2Id: string,
  npc1Name: string,
  npc2Name: string
): WorldFact[] {
  const npc1Facts = getNPCFacts(state, npc1Id);
  const npc2Facts = getNPCFacts(state, npc2Id);

  const conflicting: WorldFact[] = [];

  // Facts one knows about the other that could cause problems
  for (const fact of npc1Facts) {
    if (fact.content.toLowerCase().includes(npc2Name.toLowerCase()) &&
        (fact.category === 'secret' || fact.importance === 'major' || fact.importance === 'critical')) {
      conflicting.push(fact);
    }
  }

  for (const fact of npc2Facts) {
    if (fact.content.toLowerCase().includes(npc1Name.toLowerCase()) &&
        (fact.category === 'secret' || fact.importance === 'major' || fact.importance === 'critical') &&
        !conflicting.includes(fact)) {
      conflicting.push(fact);
    }
  }

  return conflicting;
}

// =============================================================================
// KNOWLEDGE PROPAGATION
// =============================================================================

/**
 * Spread knowledge between NPCs based on relationships and circumstances
 */
export function propagateKnowledge(state: NarrativeState): NarrativeState {
  let newState = state;

  // Get facts that can spread
  const spreadableFacts = state.worldFacts.filter(f => f.canSpread && f.spreadProbability > 0);

  for (const fact of spreadableFacts) {
    // For each NPC who knows the fact
    for (const knowerNpcId of fact.knownBy) {
      if (knowerNpcId === 'player') continue; // Player doesn't auto-spread

      // Check if they spread it to other NPCs
      for (const targetNpcId of Object.keys(state.npcKnowledge)) {
        if (targetNpcId === knowerNpcId) continue;
        if (fact.knownBy.includes(targetNpcId)) continue; // Already knows

        // Check relationship - more likely to share with trusted NPCs
        const relationship = state.relationships.find(
          r => r.fromId === knowerNpcId && r.toId === targetNpcId
        );

        if (!relationship) continue;

        // Calculate spread chance
        let spreadChance = fact.spreadProbability;

        // Modify by relationship
        if (relationship.metrics.trust > 60) {
          spreadChance *= 1.5;
        } else if (relationship.metrics.trust < 30) {
          spreadChance *= 0.5;
        }

        if (relationship.metrics.affection > 60) {
          spreadChance *= 1.3;
        }

        // Secrets are harder to spread
        if (fact.category === 'secret') {
          spreadChance *= 0.3;
        }

        // Roll for spread
        if (Math.random() < spreadChance) {
          // Add fact to target's knowledge
          const knowledge = newState.npcKnowledge[targetNpcId];
          if (knowledge && !knowledge.facts.includes(fact.id)) {
            newState = addFactToNPCKnowledge(newState, targetNpcId, fact.id);

            // Update the fact's knownBy
            const updatedFacts = newState.worldFacts.map(f => {
              if (f.id === fact.id) {
                return {
                  ...f,
                  knownBy: [...f.knownBy, targetNpcId],
                  learnedWhen: { ...f.learnedWhen, [targetNpcId]: state.currentDay },
                };
              }
              return f;
            });

            newState = {
              ...newState,
              worldFacts: updatedFacts,
            };
          }
        }
      }
    }
  }

  return newState;
}

/**
 * Reveal a fact to the player
 */
export function revealFactToPlayer(state: NarrativeState, factId: string): NarrativeState {
  const updatedFacts = state.worldFacts.map(f => {
    if (f.id === factId && !f.knownBy.includes('player')) {
      return {
        ...f,
        knownBy: [...f.knownBy, 'player'],
        learnedWhen: { ...f.learnedWhen, player: state.currentDay },
      };
    }
    return f;
  });

  return {
    ...state,
    worldFacts: updatedFacts,
    lastUpdated: new Date(),
  };
}

// =============================================================================
// SUSPICION SYSTEM
// =============================================================================

/**
 * Add a suspicion to an NPC
 */
export function addSuspicion(
  state: NarrativeState,
  npcId: string,
  about: string,
  content: string,
  confidence: number,
  evidence: string[] = []
): NarrativeState {
  const knowledge = state.npcKnowledge[npcId];
  if (!knowledge) return state;

  const suspicion: Suspicion = {
    id: crypto.randomUUID(),
    about,
    content,
    confidence: Math.max(0, Math.min(100, confidence)),
    evidence,
    dayFormed: state.currentDay,
  };

  const updatedKnowledge: NPCKnowledge = {
    ...knowledge,
    suspicions: [...knowledge.suspicions, suspicion],
  };

  return {
    ...state,
    npcKnowledge: {
      ...state.npcKnowledge,
      [npcId]: updatedKnowledge,
    },
    lastUpdated: new Date(),
  };
}

/**
 * Update suspicion confidence based on new evidence
 */
export function updateSuspicion(
  state: NarrativeState,
  npcId: string,
  suspicionId: string,
  confidenceChange: number,
  newEvidence?: string
): NarrativeState {
  const knowledge = state.npcKnowledge[npcId];
  if (!knowledge) return state;

  const updatedSuspicions = knowledge.suspicions.map(s => {
    if (s.id === suspicionId) {
      return {
        ...s,
        confidence: Math.max(0, Math.min(100, s.confidence + confidenceChange)),
        evidence: newEvidence ? [...s.evidence, newEvidence] : s.evidence,
      };
    }
    return s;
  });

  const updatedKnowledge: NPCKnowledge = {
    ...knowledge,
    suspicions: updatedSuspicions,
  };

  return {
    ...state,
    npcKnowledge: {
      ...state.npcKnowledge,
      [npcId]: updatedKnowledge,
    },
    lastUpdated: new Date(),
  };
}

/**
 * Convert a suspicion to confirmed knowledge when confidence is high enough
 */
export function confirmSuspicion(
  state: NarrativeState,
  npcId: string,
  suspicionId: string
): NarrativeState {
  const knowledge = state.npcKnowledge[npcId];
  if (!knowledge) return state;

  const suspicion = knowledge.suspicions.find(s => s.id === suspicionId);
  if (!suspicion || suspicion.confidence < 80) return state;

  // Create a fact from the suspicion
  const { state: newState, factId } = addWorldFact(state, {
    content: suspicion.content,
    category: 'secret',
    importance: 'major',
    knownBy: [npcId],
    learnedWhen: { [npcId]: state.currentDay },
    canSpread: false,
    spreadProbability: 0,
    relatedFacts: suspicion.evidence,
    source: 'confirmed_suspicion',
    veracity: 'partially_true',
  });

  // Add to NPC's facts and remove suspicion
  let updatedState = addFactToNPCKnowledge(newState, npcId, factId);

  const updatedKnowledge = updatedState.npcKnowledge[npcId];
  if (updatedKnowledge) {
    updatedState = {
      ...updatedState,
      npcKnowledge: {
        ...updatedState.npcKnowledge,
        [npcId]: {
          ...updatedKnowledge,
          suspicions: updatedKnowledge.suspicions.filter(s => s.id !== suspicionId),
        },
      },
    };
  }

  return updatedState;
}

// =============================================================================
// STORY ARC INTEGRATION
// =============================================================================

/**
 * Generate facts for a story arc
 */
export function generateArcFacts(
  state: NarrativeState,
  arc: StoryArc,
  npcNames: Record<string, string>
): NarrativeState {
  let newState = state;

  // Create facts based on arc type
  const roleToNpcId: Record<string, string> = {};
  for (const [npcId, role] of Object.entries(arc.roles)) {
    roleToNpcId[role] = npcId;
  }

  // The antagonist always knows something
  const antagonistId = roleToNpcId['antagonist'];
  if (antagonistId) {
    const { state: s1, factId: f1 } = createSecretFact(
      newState,
      `${npcNames[antagonistId]} is involved in ${arc.title}`,
      [antagonistId],
      'critical'
    );
    newState = addFactToNPCKnowledge(s1, antagonistId, f1);
  }

  // Witnesses know partial truths
  const witnessId = roleToNpcId['witness'];
  if (witnessId && antagonistId) {
    const { state: s2, factId: f2 } = createSecretFact(
      newState,
      `${npcNames[witnessId]} has seen something suspicious involving ${npcNames[antagonistId]}`,
      [witnessId],
      'major'
    );
    newState = addFactToNPCKnowledge(s2, witnessId, f2);
  }

  // Enablers know the full truth
  const enablerId = roleToNpcId['enabler'];
  if (enablerId && antagonistId) {
    const { state: s3, factId: f3 } = createSecretFact(
      newState,
      `${npcNames[enablerId]} is helping ${npcNames[antagonistId]} with their scheme`,
      [enablerId, antagonistId],
      'critical'
    );
    newState = addFactToNPCKnowledge(s3, enablerId, f3);
    newState = addFactToNPCKnowledge(newState, antagonistId, f3);
  }

  return newState;
}

// =============================================================================
// REVELATION SELECTION
// =============================================================================

/**
 * Select what an NPC should reveal based on narrative pressure
 */
export function selectRevelation(
  state: NarrativeState,
  npcId: string,
  messageCount: number,
  otherNpcIds: string[]
): { factId: string; content: string } | null {
  // Get facts this NPC knows but player doesn't
  const secretFacts = getNPCSecretFacts(state, npcId);

  if (secretFacts.length === 0) return null;

  // Sort by importance and relevance
  const sortedFacts = secretFacts.sort((a, b) => {
    // Prioritize by importance
    const importanceOrder = { critical: 5, major: 4, significant: 3, minor: 2, trivial: 1 };
    const aImportance = importanceOrder[a.importance] || 0;
    const bImportance = importanceOrder[b.importance] || 0;

    // Also consider if fact involves other NPCs in conversation
    const aRelevance = otherNpcIds.some(id =>
      a.knownBy.includes(id) || state.npcKnowledge[id]?.facts.includes(a.id)
    ) ? 2 : 0;
    const bRelevance = otherNpcIds.some(id =>
      b.knownBy.includes(id) || state.npcKnowledge[id]?.facts.includes(b.id)
    ) ? 2 : 0;

    return (bImportance + bRelevance) - (aImportance + aRelevance);
  });

  // Determine revelation threshold based on message count
  let revealThreshold = 0.1; // Base 10% chance
  if (messageCount >= 3) revealThreshold = 0.3;
  if (messageCount >= 5) revealThreshold = 0.5;
  if (messageCount >= 8) revealThreshold = 0.8;
  if (messageCount >= 10) revealThreshold = 1.0; // Must reveal something

  // Apply global tension
  revealThreshold += state.globalTension / 200; // Up to +50%

  // Roll for revelation
  if (Math.random() < revealThreshold && sortedFacts.length > 0) {
    const fact = sortedFacts[0];
    return { factId: fact.id, content: fact.content };
  }

  return null;
}

/**
 * Get revelation directive for group chat
 */
export function getGroupChatRevelations(
  state: NarrativeState,
  participantIds: string[],
  messageCount: number
): Map<string, { factId: string; content: string } | null> {
  const revelations = new Map<string, { factId: string; content: string } | null>();

  for (const npcId of participantIds) {
    const otherNpcs = participantIds.filter(id => id !== npcId);
    const revelation = selectRevelation(state, npcId, messageCount, otherNpcs);
    revelations.set(npcId, revelation);
  }

  return revelations;
}
