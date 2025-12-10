/**
 * Narrative Engine Type Definitions
 *
 * This file contains all the type definitions for the comprehensive
 * Narrative Engine that drives storylines, tracks actions, and manages
 * the living world state of the game.
 */

import { Difficulty } from '../types/identity';

// =============================================================================
// STORY ARC TYPES
// =============================================================================

/**
 * Story arc phase - progression through a storyline
 */
export type StoryPhase = 'setup' | 'rising' | 'climax' | 'resolution' | 'aftermath';

/**
 * How involved is the player in this story arc
 */
export type PlayerInvolvement = 'central' | 'peripheral' | 'unaware' | 'discovering';

/**
 * Story arc type - determines generation and progression
 */
export type StoryArcType = 'main' | 'subplot' | 'emergent' | 'consequence';

/**
 * Story template categories for procedural generation
 */
export type StoryCategory =
  | 'betrayal'
  | 'conflict'
  | 'mystery'
  | 'romance'
  | 'crisis'
  | 'power'
  | 'secret'
  | 'revenge';

/**
 * A complete story arc that unfolds over time
 */
export interface StoryArc {
  id: string;
  type: StoryArcType;
  category: StoryCategory;
  title: string;
  premise: string;
  participants: string[]; // NPC IDs
  roles: Record<string, StoryRole>; // NPC ID -> their role in this arc
  phase: StoryPhase;
  beats: StoryBeat[];
  tension: number; // 0-100
  playerInvolvement: PlayerInvolvement;
  startDay: number;
  resolvedDay?: number;
  parentArcId?: string; // If this arc spawned from another
  childArcIds: string[]; // Arcs that spawned from this one
  isActive: boolean;
}

/**
 * Roles NPCs can play in a story arc
 */
export type StoryRole =
  | 'protagonist'
  | 'antagonist'
  | 'victim'
  | 'enabler'
  | 'witness'
  | 'manipulator'
  | 'mediator'
  | 'catalyst'
  | 'ally'
  | 'rival';

// =============================================================================
// STORY BEAT TYPES
// =============================================================================

/**
 * Types of story beats
 */
export type StoryBeatType =
  | 'revelation'     // Information is revealed
  | 'confrontation'  // Characters clash
  | 'decision'       // Choice must be made
  | 'consequence'    // Results of previous action
  | 'twist'          // Unexpected development
  | 'alliance'       // Characters team up
  | 'betrayal'       // Trust is broken
  | 'discovery'      // Something is found
  | 'escalation'     // Tension increases
  | 'resolution';    // Conflict is resolved

/**
 * Conditions that can trigger a story beat
 */
export interface TriggerCondition {
  type: 'day' | 'message_count' | 'tension_threshold' | 'player_action' | 'npc_action' | 'manual' | 'random';
  value?: number | string;
  probability?: number; // 0-1, for random triggers
}

/**
 * A specific moment in a story arc
 */
export interface StoryBeat {
  id: string;
  arcId: string;
  type: StoryBeatType;
  title: string;
  content: string;
  participants: string[];
  triggered: boolean;
  triggeredDay?: number;
  triggerCondition: TriggerCondition;
  playerCanTrigger: boolean;
  npcCanTrigger: boolean;
  consequences: string[]; // IDs of beats this can trigger
  prerequisiteBeats: string[]; // Beats that must happen first
  narrativeWeight: number; // 1-10, importance
}

// =============================================================================
// PLAYER ACTION TYPES
// =============================================================================

/**
 * Categories of player actions
 */
export type PlayerActionType =
  | 'conversation'
  | 'accusation'
  | 'revelation'
  | 'violence'
  | 'alliance'
  | 'betrayal'
  | 'investigation'
  | 'decision'
  | 'gift'
  | 'threat'
  | 'confession'
  | 'lie'
  | 'silence'
  | 'support'
  | 'rejection';

/**
 * Impact level of an action
 */
export type ActionImpact = 'trivial' | 'minor' | 'moderate' | 'major' | 'critical';

/**
 * A recorded player action
 */
export interface PlayerAction {
  id: string;
  type: PlayerActionType;
  day: number;
  timestamp: Date;
  source: 'chat' | 'group_chat' | 'action_menu' | 'simulation_choice';
  target?: string; // NPC ID if applicable
  secondaryTargets?: string[]; // Other NPCs involved
  content: string;
  context: string; // What led to this action
  witnesses: string[]; // NPCs who know about this
  impact: ActionImpact;
  consequencesTriggered: string[]; // Story beat IDs
  emotionalTone: string; // angry, loving, threatening, etc.
}

// =============================================================================
// KNOWLEDGE GRAPH TYPES
// =============================================================================

/**
 * A fact in the world
 */
export interface WorldFact {
  id: string;
  content: string;
  category: 'secret' | 'event' | 'relationship' | 'history' | 'rumor' | 'evidence';
  importance: 'trivial' | 'minor' | 'significant' | 'major' | 'critical';
  knownBy: string[]; // NPC IDs + 'player' if player knows
  learnedWhen: Record<string, number>; // ID -> Day learned
  canSpread: boolean;
  spreadProbability: number; // 0-1
  relatedFacts: string[]; // Other fact IDs
  source: string; // Where this fact originated
  veracity: 'true' | 'false' | 'partially_true' | 'unknown';
  expiresDay?: number; // Some facts become irrelevant
}

/**
 * What an NPC knows
 */
export interface NPCKnowledge {
  npcId: string;
  facts: string[]; // Fact IDs
  suspicions: Suspicion[];
  secrets: string[]; // Facts they're keeping secret
  recentLearned: { factId: string; day: number }[];
}

/**
 * An NPC's suspicion about something
 */
export interface Suspicion {
  id: string;
  about: string; // NPC ID or 'player'
  content: string;
  confidence: number; // 0-100
  evidence: string[]; // Fact IDs supporting this
  dayFormed: number;
}

// =============================================================================
// RELATIONSHIP TYPES
// =============================================================================

/**
 * Relationship metrics between two entities
 */
export interface RelationshipMetrics {
  trust: number;      // -100 to 100
  affection: number;  // -100 to 100
  fear: number;       // 0 to 100
  respect: number;    // -100 to 100
  rivalry: number;    // 0 to 100
  dependency: number; // 0 to 100
}

/**
 * A relationship between two characters
 */
export interface Relationship {
  fromId: string;
  toId: string;
  metrics: RelationshipMetrics;
  status: string; // "loving spouse", "bitter rival", etc.
  history: RelationshipEvent[];
  secrets: string[]; // Things fromId knows about toId
  currentDynamic: string; // Brief description of current state
}

/**
 * A significant event in a relationship
 */
export interface RelationshipEvent {
  day: number;
  type: 'positive' | 'negative' | 'neutral' | 'complex';
  description: string;
  impactOnMetrics: Partial<RelationshipMetrics>;
}

// =============================================================================
// TIMELINE TYPES
// =============================================================================

/**
 * Types of timeline events
 */
export type TimelineEventType =
  | 'player_action'
  | 'npc_action'
  | 'simulation_event'
  | 'story_beat'
  | 'revelation'
  | 'world_change'
  | 'relationship_change'
  | 'death'
  | 'arrival'; // New NPC appears

/**
 * Source of the event
 */
export type EventSource = 'chat' | 'group_chat' | 'simulation' | 'system' | 'story_arc';

/**
 * A recorded event in the timeline
 */
export interface TimelineEvent {
  id: string;
  day: number;
  timestamp: Date;
  type: TimelineEventType;
  source: EventSource;
  title: string;
  description: string;
  participants: string[];
  impact: {
    metersAffected: { meter: string; change: number }[];
    relationshipsAffected: { from: string; to: string; change: Partial<RelationshipMetrics> }[];
    storiesAffected: string[]; // Arc IDs
    factsCreated: string[]; // New fact IDs
    factsRevealed: { factId: string; revealedTo: string[] }[];
  };
  linkedEvents: string[]; // Cause-effect chains
  visibility: 'public' | 'private' | 'secret';
}

// =============================================================================
// GROUP DYNAMICS TYPES
// =============================================================================

/**
 * Agenda for an NPC in a group conversation
 */
export interface ConversationAgenda {
  npcId: string;
  goals: string[];
  mustReveal?: string; // Fact ID to reveal
  revealAfterMessages: number;
  conflictsWith: string[]; // NPC IDs
  alliedWith: string[]; // NPC IDs
  currentStrategy: 'aggressive' | 'defensive' | 'manipulative' | 'supportive' | 'neutral';
}

/**
 * Group conversation state
 */
export interface GroupConversationState {
  participantIds: string[];
  agendas: ConversationAgenda[];
  emergentArcs: string[]; // Arc IDs that emerged from this group
  tensionLevel: number;
  revealedFacts: string[];
  messageCount: number;
  significantMoments: string[]; // Timeline event IDs
}

// =============================================================================
// SIMULATION DIRECTIVE TYPES
// =============================================================================

/**
 * NPC agenda for off-screen activities
 */
export interface NPCAgenda {
  npcId: string;
  goals: string[];
  priorities: string[];
  willDo: string[]; // Actions they'll take
  wontDo: string[]; // Lines they won't cross
  currentFocus: string;
}

/**
 * A pending consequence that should manifest
 */
export interface PendingConsequence {
  id: string;
  sourceActionId: string;
  description: string;
  targetNpcs: string[];
  manifestDay: number; // When this should happen
  severity: ActionImpact;
  type: 'immediate' | 'delayed' | 'gradual';
}

/**
 * Directive for simulation
 */
export interface SimulationDirective {
  day: number;
  mandatoryBeats: StoryBeat[];
  possibleBeats: StoryBeat[];
  npcAgendas: NPCAgenda[];
  pendingConsequences: PendingConsequence[];
  worldStateGuidance: string[];
  tensionTarget: number;
  focusArcs: string[]; // Arc IDs to prioritize
}

// =============================================================================
// NARRATIVE STATE (MASTER STATE)
// =============================================================================

/**
 * The complete narrative state - single source of truth
 */
export interface NarrativeState {
  // Core identification
  identityId: string;
  difficulty: Difficulty;
  currentDay: number;

  // Story management
  activeArcs: StoryArc[];
  completedArcs: StoryArc[];
  arcQueue: StoryArc[]; // Arcs waiting to start

  // Knowledge management
  worldFacts: WorldFact[];
  npcKnowledge: Record<string, NPCKnowledge>;

  // Relationship management
  relationships: Relationship[];

  // Timeline
  timeline: TimelineEvent[];

  // Player tracking
  playerActions: PlayerAction[];
  playerReputation: Record<string, number>; // Aspect -> value

  // Pending items
  pendingConsequences: PendingConsequence[];
  scheduledBeats: { beatId: string; day: number }[];

  // Group conversations
  activeGroupConversations: Record<string, GroupConversationState>;

  // World state
  globalTension: number;
  currentThemes: string[];

  // Meta
  lastUpdated: Date;
  version: number;
}

// =============================================================================
// STORY TEMPLATES
// =============================================================================

/**
 * A template for generating story arcs
 */
export interface StoryTemplate {
  id: string;
  category: StoryCategory;
  name: string;
  premise: string;
  requiredRoles: StoryRole[];
  optionalRoles: StoryRole[];
  beatTemplates: BeatTemplate[];
  minTension: number;
  maxTension: number;
  typicalDuration: number; // In days
  difficultyMin: Difficulty;
  tags: string[];
}

/**
 * Template for generating story beats
 */
export interface BeatTemplate {
  phase: StoryPhase;
  type: StoryBeatType;
  template: string; // Template string with {role} placeholders
  triggerType: TriggerCondition['type'];
  requiredRoles: StoryRole[];
  narrativeWeight: number;
}

// =============================================================================
// GENERATION PARAMETERS
// =============================================================================

/**
 * Parameters for generating a new story arc
 */
export interface ArcGenerationParams {
  category?: StoryCategory;
  involvedNpcs?: string[];
  playerInvolvement: PlayerInvolvement;
  difficulty: Difficulty;
  existingArcs: StoryArc[];
  currentDay: number;
  globalTension: number;
}

/**
 * Result of arc generation
 */
export interface GeneratedArc {
  arc: StoryArc;
  initialFacts: WorldFact[];
  npcKnowledgeUpdates: { npcId: string; factIds: string[] }[];
}
