/**
 * Narrative State Management
 *
 * This module handles the creation, updating, and persistence of the
 * NarrativeState - the single source of truth for all story elements.
 */

import { Identity, NPC, Difficulty } from '../types';
import {
  NarrativeState,
  StoryArc,
  WorldFact,
  NPCKnowledge,
  Relationship,
  RelationshipMetrics,
  TimelineEvent,
  PlayerAction,
  PendingConsequence,
  GroupConversationState,
} from './types';

// =============================================================================
// STATE CREATION
// =============================================================================

/**
 * Create initial relationship metrics
 */
function createDefaultMetrics(): RelationshipMetrics {
  return {
    trust: 50,
    affection: 50,
    fear: 0,
    respect: 50,
    rivalry: 0,
    dependency: 0,
  };
}

/**
 * Infer initial relationship metrics from NPC data
 */
function inferRelationshipMetrics(npc: NPC, identity: Identity): RelationshipMetrics {
  const metrics = createDefaultMetrics();

  // Adjust based on role
  const role = npc.role.toLowerCase();
  if (role.includes('spouse') || role.includes('partner') || role.includes('wife') || role.includes('husband')) {
    metrics.affection = 70;
    metrics.trust = 65;
    metrics.dependency = 40;
  } else if (role.includes('boss') || role.includes('supervisor') || role.includes('manager')) {
    metrics.respect = 60;
    metrics.fear = 20;
    metrics.dependency = 30;
  } else if (role.includes('friend') || role.includes('best friend')) {
    metrics.affection = 60;
    metrics.trust = 60;
  } else if (role.includes('rival') || role.includes('enemy')) {
    metrics.rivalry = 70;
    metrics.trust = 20;
    metrics.affection = 20;
  } else if (role.includes('parent') || role.includes('mother') || role.includes('father')) {
    metrics.affection = 60;
    metrics.respect = 55;
    metrics.dependency = 25;
  } else if (role.includes('sibling') || role.includes('brother') || role.includes('sister')) {
    metrics.affection = 55;
    metrics.rivalry = 30;
  }

  // Adjust based on emotional state - handle arrays
  const emotionalStates = Array.isArray(npc.currentEmotionalState)
    ? npc.currentEmotionalState
    : [npc.currentEmotionalState];
  const emotion = emotionalStates.join(' ').toLowerCase();
  if (emotion.includes('angry') || emotion.includes('bitter') || emotion.includes('resentful')) {
    metrics.affection -= 15;
    metrics.trust -= 10;
  } else if (emotion.includes('loving') || emotion.includes('happy') || emotion.includes('content')) {
    metrics.affection += 10;
    metrics.trust += 5;
  } else if (emotion.includes('suspicious') || emotion.includes('paranoid')) {
    metrics.trust -= 20;
  } else if (emotion.includes('scared') || emotion.includes('anxious')) {
    metrics.fear += 15;
  }

  // Adjust based on relationship status text
  const status = npc.relationshipStatus.toLowerCase();
  if (status.includes('tense') || status.includes('strained')) {
    metrics.trust -= 15;
    metrics.affection -= 10;
  } else if (status.includes('close') || status.includes('loving') || status.includes('strong')) {
    metrics.trust += 15;
    metrics.affection += 15;
  } else if (status.includes('hostile') || status.includes('cold')) {
    metrics.trust -= 25;
    metrics.affection -= 20;
    metrics.rivalry += 20;
  }

  // Clamp values
  Object.keys(metrics).forEach(key => {
    const k = key as keyof RelationshipMetrics;
    metrics[k] = Math.max(-100, Math.min(100, metrics[k]));
    if (k === 'fear' || k === 'rivalry' || k === 'dependency') {
      metrics[k] = Math.max(0, metrics[k]);
    }
  });

  return metrics;
}

/**
 * Create initial relationships between NPCs and with player
 */
function createInitialRelationships(identity: Identity): Relationship[] {
  const relationships: Relationship[] = [];
  const npcs = identity.npcs.filter(n => !n.isDead);

  // Player -> NPC relationships
  for (const npc of npcs) {
    relationships.push({
      fromId: 'player',
      toId: npc.id,
      metrics: inferRelationshipMetrics(npc, identity),
      status: npc.relationshipStatus,
      history: [],
      secrets: [],
      currentDynamic: `${identity.name} and ${npc.name} have a ${npc.relationshipStatus} relationship`,
    });

    // NPC -> Player relationships (slightly different perspective)
    const npcMetrics = inferRelationshipMetrics(npc, identity);
    // NPCs might have different feelings than player realizes
    npcMetrics.trust += (Math.random() - 0.5) * 20;
    npcMetrics.affection += (Math.random() - 0.5) * 15;

    relationships.push({
      fromId: npc.id,
      toId: 'player',
      metrics: npcMetrics,
      status: npc.relationshipStatus,
      history: [],
      secrets: [],
      currentDynamic: `${npc.name} views ${identity.name} as their ${npc.role.toLowerCase()}`,
    });
  }

  // NPC -> NPC relationships
  for (let i = 0; i < npcs.length; i++) {
    for (let j = i + 1; j < npcs.length; j++) {
      const npc1 = npcs[i];
      const npc2 = npcs[j];

      // Infer relationship based on roles
      const metrics1to2 = createDefaultMetrics();
      const metrics2to1 = createDefaultMetrics();

      // Add some variance
      const variance = () => (Math.random() - 0.5) * 30;
      metrics1to2.trust += variance();
      metrics1to2.affection += variance();
      metrics2to1.trust += variance();
      metrics2to1.affection += variance();

      // Core NPCs might have stronger feelings
      if (npc1.tier === 'core' && npc2.tier === 'core') {
        // Core NPCs have more intense relationships
        metrics1to2.rivalry += Math.random() * 30;
        metrics2to1.rivalry += Math.random() * 30;
      }

      relationships.push({
        fromId: npc1.id,
        toId: npc2.id,
        metrics: metrics1to2,
        status: 'acquaintances through ' + identity.name,
        history: [],
        secrets: [],
        currentDynamic: `${npc1.name} knows ${npc2.name} through ${identity.name}`,
      });

      relationships.push({
        fromId: npc2.id,
        toId: npc1.id,
        metrics: metrics2to1,
        status: 'acquaintances through ' + identity.name,
        history: [],
        secrets: [],
        currentDynamic: `${npc2.name} knows ${npc1.name} through ${identity.name}`,
      });
    }
  }

  return relationships;
}

/**
 * Create initial NPC knowledge states
 */
function createInitialKnowledge(identity: Identity): Record<string, NPCKnowledge> {
  const knowledge: Record<string, NPCKnowledge> = {};

  for (const npc of identity.npcs.filter(n => !n.isDead)) {
    knowledge[npc.id] = {
      npcId: npc.id,
      facts: [],
      suspicions: [],
      secrets: [],
      recentLearned: [],
    };
  }

  return knowledge;
}

/**
 * Create a fresh NarrativeState for a new identity
 */
export function createNarrativeState(identity: Identity): NarrativeState {
  return {
    identityId: identity.id,
    difficulty: identity.difficulty,
    currentDay: identity.currentDay,

    // Story management - starts empty, populated by story generator
    activeArcs: [],
    completedArcs: [],
    arcQueue: [],

    // Knowledge management
    worldFacts: [],
    npcKnowledge: createInitialKnowledge(identity),

    // Relationship management
    relationships: createInitialRelationships(identity),

    // Timeline
    timeline: [],

    // Player tracking
    playerActions: [],
    playerReputation: {
      trustworthy: 50,
      dangerous: 0,
      generous: 50,
      manipulative: 0,
      reliable: 50,
    },

    // Pending items
    pendingConsequences: [],
    scheduledBeats: [],

    // Group conversations
    activeGroupConversations: {},

    // World state
    globalTension: getDifficultyBaseTension(identity.difficulty),
    currentThemes: [],

    // Meta
    lastUpdated: new Date(),
    version: 1,
  };
}

/**
 * Get base tension level for difficulty
 */
function getDifficultyBaseTension(difficulty: Difficulty): number {
  switch (difficulty) {
    case 'realistic': return 20;
    case 'dramatic': return 40;
    case 'crazy': return 60;
    default: return 30;
  }
}

// =============================================================================
// STATE UPDATES
// =============================================================================

/**
 * Add a timeline event
 */
export function addTimelineEvent(
  state: NarrativeState,
  event: Omit<TimelineEvent, 'id'>
): NarrativeState {
  const newEvent: TimelineEvent = {
    ...event,
    id: crypto.randomUUID(),
  };

  return {
    ...state,
    timeline: [...state.timeline, newEvent],
    lastUpdated: new Date(),
  };
}

/**
 * Add a player action
 */
export function addPlayerAction(
  state: NarrativeState,
  action: Omit<PlayerAction, 'id'>
): NarrativeState {
  const newAction: PlayerAction = {
    ...action,
    id: crypto.randomUUID(),
  };

  return {
    ...state,
    playerActions: [...state.playerActions, newAction],
    lastUpdated: new Date(),
  };
}

/**
 * Add a world fact
 */
export function addWorldFact(
  state: NarrativeState,
  fact: Omit<WorldFact, 'id'>
): { state: NarrativeState; factId: string } {
  const factId = crypto.randomUUID();
  const newFact: WorldFact = {
    ...fact,
    id: factId,
  };

  return {
    state: {
      ...state,
      worldFacts: [...state.worldFacts, newFact],
      lastUpdated: new Date(),
    },
    factId,
  };
}

/**
 * Update NPC knowledge with a new fact
 */
export function addFactToNPCKnowledge(
  state: NarrativeState,
  npcId: string,
  factId: string,
  isSecret: boolean = false
): NarrativeState {
  const knowledge = state.npcKnowledge[npcId];
  if (!knowledge) return state;

  const updatedKnowledge: NPCKnowledge = {
    ...knowledge,
    facts: [...knowledge.facts, factId],
    recentLearned: [
      ...knowledge.recentLearned,
      { factId, day: state.currentDay },
    ],
    secrets: isSecret ? [...knowledge.secrets, factId] : knowledge.secrets,
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
 * Update relationship between two entities
 */
export function updateRelationship(
  state: NarrativeState,
  fromId: string,
  toId: string,
  changes: Partial<RelationshipMetrics>,
  eventDescription?: string
): NarrativeState {
  const relationships = state.relationships.map(rel => {
    if (rel.fromId === fromId && rel.toId === toId) {
      const newMetrics = { ...rel.metrics };

      // Apply changes
      Object.entries(changes).forEach(([key, value]) => {
        const k = key as keyof RelationshipMetrics;
        if (value !== undefined) {
          newMetrics[k] = Math.max(-100, Math.min(100, newMetrics[k] + value));
          if (k === 'fear' || k === 'rivalry' || k === 'dependency') {
            newMetrics[k] = Math.max(0, newMetrics[k]);
          }
        }
      });

      // Add to history if significant
      const history = [...rel.history];
      if (eventDescription) {
        const netChange = Object.values(changes).reduce((sum, v) => sum + Math.abs(v || 0), 0);
        history.push({
          day: state.currentDay,
          type: netChange > 0 ? 'positive' : netChange < 0 ? 'negative' : 'neutral',
          description: eventDescription,
          impactOnMetrics: changes,
        });
      }

      return {
        ...rel,
        metrics: newMetrics,
        history,
      };
    }
    return rel;
  });

  return {
    ...state,
    relationships,
    lastUpdated: new Date(),
  };
}

/**
 * Add or update a story arc
 */
export function addStoryArc(state: NarrativeState, arc: StoryArc): NarrativeState {
  return {
    ...state,
    activeArcs: [...state.activeArcs, arc],
    lastUpdated: new Date(),
  };
}

/**
 * Progress a story arc to the next phase
 */
export function progressArcPhase(state: NarrativeState, arcId: string): NarrativeState {
  const phaseOrder: Record<string, string> = {
    setup: 'rising',
    rising: 'climax',
    climax: 'resolution',
    resolution: 'aftermath',
  };

  const activeArcs = state.activeArcs.map(arc => {
    if (arc.id === arcId) {
      const nextPhase = phaseOrder[arc.phase];
      if (nextPhase) {
        return {
          ...arc,
          phase: nextPhase as typeof arc.phase,
        };
      }
    }
    return arc;
  });

  return {
    ...state,
    activeArcs,
    lastUpdated: new Date(),
  };
}

/**
 * Complete a story arc
 */
export function completeArc(state: NarrativeState, arcId: string): NarrativeState {
  const arc = state.activeArcs.find(a => a.id === arcId);
  if (!arc) return state;

  const completedArc: StoryArc = {
    ...arc,
    isActive: false,
    resolvedDay: state.currentDay,
  };

  return {
    ...state,
    activeArcs: state.activeArcs.filter(a => a.id !== arcId),
    completedArcs: [...state.completedArcs, completedArc],
    lastUpdated: new Date(),
  };
}

/**
 * Add a pending consequence
 */
export function addPendingConsequence(
  state: NarrativeState,
  consequence: Omit<PendingConsequence, 'id'>
): NarrativeState {
  const newConsequence: PendingConsequence = {
    ...consequence,
    id: crypto.randomUUID(),
  };

  return {
    ...state,
    pendingConsequences: [...state.pendingConsequences, newConsequence],
    lastUpdated: new Date(),
  };
}

/**
 * Update global tension
 */
export function updateGlobalTension(state: NarrativeState, change: number): NarrativeState {
  return {
    ...state,
    globalTension: Math.max(0, Math.min(100, state.globalTension + change)),
    lastUpdated: new Date(),
  };
}

/**
 * Advance to next day
 */
export function advanceDay(state: NarrativeState, newDay: number): NarrativeState {
  return {
    ...state,
    currentDay: newDay,
    lastUpdated: new Date(),
  };
}

// =============================================================================
// STATE QUERIES
// =============================================================================

/**
 * Get relationship between two entities
 */
export function getRelationship(
  state: NarrativeState,
  fromId: string,
  toId: string
): Relationship | undefined {
  return state.relationships.find(r => r.fromId === fromId && r.toId === toId);
}

/**
 * Get all facts known by an NPC
 */
export function getKnownFacts(state: NarrativeState, npcId: string): WorldFact[] {
  const knowledge = state.npcKnowledge[npcId];
  if (!knowledge) return [];

  return knowledge.facts
    .map(factId => state.worldFacts.find(f => f.id === factId))
    .filter((f): f is WorldFact => f !== undefined);
}

/**
 * Get facts that an NPC could reveal (knows but hasn't told player)
 */
export function getRevealableFacts(state: NarrativeState, npcId: string): WorldFact[] {
  const knowledge = state.npcKnowledge[npcId];
  if (!knowledge) return [];

  return knowledge.facts
    .map(factId => state.worldFacts.find(f => f.id === factId))
    .filter((f): f is WorldFact => f !== undefined && !f.knownBy.includes('player'));
}

/**
 * Get active arcs involving an NPC
 */
export function getArcsForNPC(state: NarrativeState, npcId: string): StoryArc[] {
  return state.activeArcs.filter(arc => arc.participants.includes(npcId));
}

/**
 * Get pending beats that could trigger
 */
export function getPendingBeats(state: NarrativeState): { arc: StoryArc; beat: import('./types').StoryBeat }[] {
  const pending: { arc: StoryArc; beat: import('./types').StoryBeat }[] = [];

  for (const arc of state.activeArcs) {
    for (const beat of arc.beats) {
      if (!beat.triggered) {
        // Check prerequisites
        const prereqsMet = beat.prerequisiteBeats.every(prereqId =>
          arc.beats.find(b => b.id === prereqId)?.triggered
        );

        if (prereqsMet) {
          pending.push({ arc, beat });
        }
      }
    }
  }

  return pending;
}

/**
 * Get timeline events for a specific day
 */
export function getEventsForDay(state: NarrativeState, day: number): TimelineEvent[] {
  return state.timeline.filter(e => e.day === day);
}

/**
 * Get recent events (last N days)
 */
export function getRecentEvents(state: NarrativeState, days: number = 3): TimelineEvent[] {
  const cutoff = state.currentDay - days;
  return state.timeline.filter(e => e.day >= cutoff);
}

/**
 * Calculate overall tension between two NPCs
 */
export function calculateTension(state: NarrativeState, npc1Id: string, npc2Id: string): number {
  const rel1 = getRelationship(state, npc1Id, npc2Id);
  const rel2 = getRelationship(state, npc2Id, npc1Id);

  if (!rel1 || !rel2) return 50;

  // Low trust + high rivalry = high tension
  const avgTrust = (rel1.metrics.trust + rel2.metrics.trust) / 2;
  const avgRivalry = (rel1.metrics.rivalry + rel2.metrics.rivalry) / 2;
  const avgFear = (rel1.metrics.fear + rel2.metrics.fear) / 2;

  const tension = (100 - avgTrust) * 0.4 + avgRivalry * 0.4 + avgFear * 0.2;

  return Math.max(0, Math.min(100, tension));
}

// =============================================================================
// SERIALIZATION
// =============================================================================

/**
 * Serialize state for storage
 */
export function serializeNarrativeState(state: NarrativeState): string {
  return JSON.stringify(state, (key, value) => {
    if (value instanceof Date) {
      return { __type: 'Date', value: value.toISOString() };
    }
    return value;
  });
}

/**
 * Deserialize state from storage
 */
export function deserializeNarrativeState(json: string): NarrativeState {
  return JSON.parse(json, (key, value) => {
    if (value && typeof value === 'object' && value.__type === 'Date') {
      return new Date(value.value);
    }
    return value;
  });
}
