/**
 * Narrative Engine - Main Entry Point
 *
 * This module exports all narrative engine functionality for use
 * throughout the application. The narrative engine is the central
 * brain that manages storylines, tracks actions, and creates
 * emergent gameplay.
 */

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type {
  // Story types
  StoryArc,
  StoryBeat,
  StoryTemplate,
  BeatTemplate,
  StoryPhase,
  StoryBeatType,
  StoryCategory,
  StoryRole,
  StoryArcType,
  PlayerInvolvement,
  TriggerCondition,

  // Action types
  PlayerAction,
  PlayerActionType,
  ActionImpact,

  // Knowledge types
  WorldFact,
  NPCKnowledge,
  Suspicion,

  // Relationship types
  Relationship,
  RelationshipMetrics,
  RelationshipEvent,

  // Timeline types
  TimelineEvent,
  TimelineEventType,
  EventSource,

  // Group types
  ConversationAgenda,
  GroupConversationState,

  // Simulation types
  SimulationDirective,
  NPCAgenda,
  PendingConsequence,

  // State types
  NarrativeState,

  // Generation types
  ArcGenerationParams,
  GeneratedArc,
} from './types';

// =============================================================================
// SCENARIO GENERATOR - Opening scenarios for 1:1 chats
// =============================================================================

export {
  generateDay1Scenario,
  generateEventBasedScenario,
  generateRandomScenario,
  severityScore,
} from './scenario-generator';

// =============================================================================
// STATE MANAGEMENT
// =============================================================================

export {
  // State creation
  createNarrativeState,

  // State updates
  addTimelineEvent,
  addPlayerAction,
  addWorldFact,
  addFactToNPCKnowledge,
  updateRelationship,
  addStoryArc,
  progressArcPhase,
  completeArc,
  addPendingConsequence,
  updateGlobalTension,
  advanceDay,

  // State queries
  getRelationship,
  getKnownFacts,
  getRevealableFacts,
  getArcsForNPC,
  getPendingBeats,
  getEventsForDay,
  getRecentEvents,
  calculateTension,

  // Serialization
  serializeNarrativeState,
  deserializeNarrativeState,
} from './state';

// =============================================================================
// STORY GENERATION
// =============================================================================

export {
  // Templates
  STORY_TEMPLATES,

  // Generation functions
  generateStoryArc,
  generateInitialArcs,
  generateEmergentArc,
} from './story-generator';

// =============================================================================
// ACTION TRACKING
// =============================================================================

export {
  // Classification
  classifyAction,
  determineImpact,
  determineWitnesses,

  // Recording
  recordPlayerAction,
} from './action-tracker';

// =============================================================================
// KNOWLEDGE GRAPH
// =============================================================================

export {
  // Fact creation
  createNPCActionFact,
  createSecretFact,
  createRelationshipFact,

  // Queries
  getNPCFacts,
  getNPCSecretFacts,
  getFactsAbout,
  getSharedFacts,
  getConflictingFacts,

  // Propagation
  propagateKnowledge,
  revealFactToPlayer,

  // Suspicions
  addSuspicion,
  updateSuspicion,
  confirmSuspicion,

  // Story integration
  generateArcFacts,

  // Revelations
  selectRevelation,
  getGroupChatRevelations,
} from './knowledge-graph';

// =============================================================================
// GROUP DYNAMICS
// =============================================================================

export {
  // Initialization
  initializeGroupConversation,

  // Updates
  updateGroupConversation,
  endGroupConversation,

  // Queries
  getNPCAgenda,

  // Prompt building
  buildGroupDynamicsPrompt,
} from './group-dynamics';

// =============================================================================
// SIMULATION INTEGRATION
// =============================================================================

export {
  // Directive generation
  generateSimulationDirective,

  // Post-processing
  processSimulationResults,

  // Prompt building
  buildSimulationPromptAdditions,
} from './simulation';

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

import { Identity } from '../types';
import { NarrativeState } from './types';
import { createNarrativeState } from './state';
import { generateInitialArcs } from './story-generator';
import { generateArcFacts } from './knowledge-graph';

/**
 * Initialize a complete narrative state for a new game
 * This is the main entry point for creating narrative content
 */
export function initializeNarrativeForNewGame(identity: Identity): NarrativeState {
  // Create base state
  let state = createNarrativeState(identity);

  // Generate initial story arcs
  const generatedArcs = generateInitialArcs(identity);

  // Add arcs to state and generate associated facts
  const npcNames: Record<string, string> = {};
  for (const npc of identity.npcs) {
    npcNames[npc.id] = npc.name;
  }

  for (const generated of generatedArcs) {
    // Add arc
    state = {
      ...state,
      activeArcs: [...state.activeArcs, generated.arc],
    };

    // Add facts
    for (const fact of generated.initialFacts) {
      state = {
        ...state,
        worldFacts: [...state.worldFacts, fact],
      };
    }

    // Update NPC knowledge
    for (const update of generated.npcKnowledgeUpdates) {
      const knowledge = state.npcKnowledge[update.npcId];
      if (knowledge) {
        state = {
          ...state,
          npcKnowledge: {
            ...state.npcKnowledge,
            [update.npcId]: {
              ...knowledge,
              facts: [...knowledge.facts, ...update.factIds],
            },
          },
        };
      }
    }

    // Generate arc-specific facts
    state = generateArcFacts(state, generated.arc, npcNames);
  }

  // Set initial themes based on arcs
  const themes = generatedArcs.map(g => g.arc.category);
  state = {
    ...state,
    currentThemes: [...new Set(themes)],
    lastUpdated: new Date(),
  };

  console.log(`[Narrative] Initialized with ${state.activeArcs.length} story arcs`);
  console.log(`[Narrative] Created ${state.worldFacts.length} world facts`);
  console.log(`[Narrative] Themes: ${state.currentThemes.join(', ')}`);

  return state;
}

/**
 * Get a summary of the current narrative state for debugging/display
 */
export function getNarrativeSummary(state: NarrativeState): {
  activeArcs: number;
  completedArcs: number;
  worldFacts: number;
  playerActions: number;
  timelineEvents: number;
  globalTension: number;
  currentThemes: string[];
} {
  return {
    activeArcs: state.activeArcs.length,
    completedArcs: state.completedArcs.length,
    worldFacts: state.worldFacts.length,
    playerActions: state.playerActions.length,
    timelineEvents: state.timeline.length,
    globalTension: state.globalTension,
    currentThemes: state.currentThemes,
  };
}

/**
 * Get a summary of active story arcs involving a specific NPC
 * Used to provide narrative context in chat prompts
 */
export function getActiveStorySummary(state: NarrativeState, npcId: string): string | null {
  const relevantArcs = state.activeArcs.filter(arc =>
    arc.participants.includes(npcId) && arc.isActive
  );

  if (relevantArcs.length === 0) return null;

  // Get the most active arc
  const mainArc = relevantArcs[0];
  const triggeredBeats = mainArc.beats.filter(b => b.triggered);
  const nextBeat = mainArc.beats.find(b => !b.triggered);

  let summary = `Story: "${mainArc.title}" (${mainArc.phase} phase)`;
  if (triggeredBeats.length > 0) {
    summary += ` - Recent: ${triggeredBeats[triggeredBeats.length - 1]?.content || 'unknown'}`;
  }
  if (nextBeat) {
    summary += ` - Building toward: ${nextBeat.content}`;
  }

  return summary;
}

/**
 * Get facts that a specific NPC knows about
 * Used to inform NPC behavior in conversations
 */
export function getRelevantFactsForNPC(state: NarrativeState, npcId: string): string[] {
  const knowledge = state.npcKnowledge[npcId];
  if (!knowledge) return [];

  // Get fact IDs this NPC knows
  const factIds = knowledge.facts;

  // Look up the actual facts
  const facts = state.worldFacts
    .filter(f => factIds.includes(f.id))
    .sort((a, b) => {
      // Prioritize by importance
      const importanceOrder = { critical: 0, major: 1, significant: 2, minor: 3, trivial: 4 };
      return (importanceOrder[a.importance] || 4) - (importanceOrder[b.importance] || 4);
    })
    .slice(0, 5) // Top 5 most important facts
    .map(f => f.content);

  return facts;
}

/**
 * Check if narrative state needs migration/upgrade
 */
export function needsNarrativeMigration(state: NarrativeState | undefined): boolean {
  if (!state) return true;
  if (!state.version) return true;
  if (state.version < 1) return true;
  return false;
}
