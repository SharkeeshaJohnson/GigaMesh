/**
 * Action Tracker
 *
 * This module handles tracking and processing player actions,
 * determining consequences, and updating the narrative state.
 */

import { Identity, NPC } from '../types';
import {
  NarrativeState,
  PlayerAction,
  PlayerActionType,
  ActionImpact,
  TimelineEvent,
  PendingConsequence,
  WorldFact,
  StoryBeat,
  RelationshipMetrics,
} from './types';
import {
  addPlayerAction,
  addTimelineEvent,
  addPendingConsequence,
  updateRelationship,
  addWorldFact,
  addFactToNPCKnowledge,
  updateGlobalTension,
} from './state';

// =============================================================================
// ACTION CLASSIFICATION
// =============================================================================

/**
 * Classify the type of action from message content
 */
export function classifyAction(
  messageContent: string,
  targetNpcId?: string
): PlayerActionType {
  const content = messageContent.toLowerCase();

  // Violence detection
  if (content.includes('kill') || content.includes('attack') || content.includes('hit') ||
      content.includes('punch') || content.includes('stab') || content.includes('murder') ||
      content.includes('shoot') || content.includes('strangle')) {
    return 'violence';
  }

  // Accusation detection
  if (content.includes('accuse') || content.includes('you did') || content.includes('you stole') ||
      content.includes('you lied') || content.includes('i know you') || content.includes('you\'re hiding')) {
    return 'accusation';
  }

  // Threat detection
  if (content.includes('i\'ll tell') || content.includes('or else') || content.includes('i\'ll expose') ||
      content.includes('threatening') || content.includes('i\'ll make you')) {
    return 'threat';
  }

  // Confession detection
  if (content.includes('i admit') || content.includes('i confess') || content.includes('i did it') ||
      content.includes('it was me') || content.includes('i\'m sorry i') || content.includes('i have to tell you')) {
    return 'confession';
  }

  // Lie detection
  if (content.includes('i didn\'t') || content.includes('i wasn\'t') || content.includes('that\'s not true') ||
      (content.includes('trust me') && content.includes('i'))) {
    return 'lie';
  }

  // Support detection
  if (content.includes('i\'m here for you') || content.includes('i support') || content.includes('i believe you') ||
      content.includes('i\'ll help') || content.includes('we\'ll get through')) {
    return 'support';
  }

  // Rejection detection
  if (content.includes('leave me alone') || content.includes('get out') || content.includes('i don\'t want') ||
      content.includes('we\'re done') || content.includes('stay away')) {
    return 'rejection';
  }

  // Revelation detection
  if (content.includes('i need to tell you') || content.includes('you should know') ||
      content.includes('the truth is') || content.includes('i found out')) {
    return 'revelation';
  }

  // Alliance detection
  if (content.includes('let\'s work together') || content.includes('we should') ||
      content.includes('on my side') || content.includes('i\'m with you')) {
    return 'alliance';
  }

  // Investigation detection
  if (content.includes('what happened') || content.includes('tell me about') ||
      content.includes('where were you') || content.includes('who was')) {
    return 'investigation';
  }

  // Default to conversation
  return 'conversation';
}

/**
 * Determine the impact level of an action
 */
export function determineImpact(
  actionType: PlayerActionType,
  context: string
): ActionImpact {
  const impactMap: Record<PlayerActionType, ActionImpact> = {
    violence: 'critical',
    betrayal: 'critical',
    confession: 'major',
    revelation: 'major',
    accusation: 'moderate',
    threat: 'moderate',
    alliance: 'moderate',
    rejection: 'moderate',
    decision: 'moderate',
    lie: 'minor',
    support: 'minor',
    investigation: 'minor',
    gift: 'minor',
    silence: 'trivial',
    conversation: 'trivial',
  };

  return impactMap[actionType] || 'trivial';
}

/**
 * Determine who witnessed an action
 */
export function determineWitnesses(
  state: NarrativeState,
  targetNpcId: string | undefined,
  source: 'chat' | 'group_chat',
  groupParticipants?: string[]
): string[] {
  const witnesses: string[] = [];

  if (source === 'group_chat' && groupParticipants) {
    // Everyone in the group chat witnessed it
    witnesses.push(...groupParticipants);
  } else if (targetNpcId) {
    // The target witnessed it
    witnesses.push(targetNpcId);

    // Small chance someone else was nearby (for dramatic effect)
    if (Math.random() < 0.2) {
      // Find an NPC not involved
      const otherNpcs = Object.keys(state.npcKnowledge)
        .filter(id => id !== targetNpcId);
      if (otherNpcs.length > 0) {
        witnesses.push(otherNpcs[Math.floor(Math.random() * otherNpcs.length)]);
      }
    }
  }

  return witnesses;
}

// =============================================================================
// ACTION RECORDING
// =============================================================================

/**
 * Record a player action and process its effects
 */
export function recordPlayerAction(
  state: NarrativeState,
  content: string,
  targetNpcId: string | undefined,
  source: 'chat' | 'group_chat' | 'action_menu' | 'simulation_choice',
  groupParticipants?: string[],
  identity?: Identity
): NarrativeState {
  // Classify the action
  const actionType = classifyAction(content, targetNpcId);
  const impact = determineImpact(actionType, content);
  const witnesses = determineWitnesses(state, targetNpcId, source as 'chat' | 'group_chat', groupParticipants);

  // Create the action record
  const action: Omit<PlayerAction, 'id'> = {
    type: actionType,
    day: state.currentDay,
    timestamp: new Date(),
    source,
    target: targetNpcId,
    secondaryTargets: groupParticipants?.filter(id => id !== targetNpcId),
    content,
    context: `Day ${state.currentDay} interaction`,
    witnesses,
    impact,
    consequencesTriggered: [],
    emotionalTone: inferEmotionalTone(content),
  };

  // Add the action to state
  let newState = addPlayerAction(state, action);

  // Process immediate effects based on action type
  newState = processActionEffects(newState, action, identity);

  // Check for story beat triggers
  newState = checkBeatTriggers(newState, action);

  // Update global tension
  const tensionChange = calculateTensionChange(actionType, impact);
  if (tensionChange !== 0) {
    newState = updateGlobalTension(newState, tensionChange);
  }

  return newState;
}

/**
 * Infer emotional tone from message content
 */
function inferEmotionalTone(content: string): string {
  const lowerContent = content.toLowerCase();

  if (lowerContent.includes('love') || lowerContent.includes('care') || lowerContent.includes('miss')) {
    return 'loving';
  }
  if (lowerContent.includes('hate') || lowerContent.includes('angry') || lowerContent.includes('furious')) {
    return 'angry';
  }
  if (lowerContent.includes('sorry') || lowerContent.includes('apologize') || lowerContent.includes('forgive')) {
    return 'apologetic';
  }
  if (lowerContent.includes('scared') || lowerContent.includes('afraid') || lowerContent.includes('worried')) {
    return 'fearful';
  }
  if (lowerContent.includes('trust') || lowerContent.includes('believe') || lowerContent.includes('honest')) {
    return 'trusting';
  }
  if (lowerContent.includes('suspicious') || lowerContent.includes('don\'t trust')) {
    return 'suspicious';
  }

  return 'neutral';
}

// =============================================================================
// EFFECT PROCESSING
// =============================================================================

/**
 * Process the immediate effects of an action
 */
function processActionEffects(
  state: NarrativeState,
  action: Omit<PlayerAction, 'id'>,
  identity?: Identity
): NarrativeState {
  let newState = state;

  switch (action.type) {
    case 'violence':
      newState = processViolence(newState, action, identity);
      break;
    case 'accusation':
      newState = processAccusation(newState, action);
      break;
    case 'confession':
      newState = processConfession(newState, action);
      break;
    case 'revelation':
      newState = processRevelation(newState, action);
      break;
    case 'threat':
      newState = processThreat(newState, action);
      break;
    case 'alliance':
      newState = processAlliance(newState, action);
      break;
    case 'betrayal':
      newState = processBetrayal(newState, action);
      break;
    case 'support':
      newState = processSupport(newState, action);
      break;
    case 'rejection':
      newState = processRejection(newState, action);
      break;
  }

  // Add timeline event for significant actions
  if (action.impact !== 'trivial') {
    newState = addTimelineEvent(newState, {
      day: action.day,
      timestamp: action.timestamp,
      type: 'player_action',
      source: action.source as 'chat' | 'group_chat' | 'simulation' | 'system',
      title: `Player ${action.type}`,
      description: action.content,
      participants: [action.target, ...(action.secondaryTargets || [])].filter((p): p is string => p !== undefined),
      impact: {
        metersAffected: [],
        relationshipsAffected: [],
        storiesAffected: [],
        factsCreated: [],
        factsRevealed: [],
      },
      linkedEvents: [],
      visibility: action.type === 'violence' ? 'private' : 'public',
    });
  }

  return newState;
}

/**
 * Process violence action
 */
function processViolence(
  state: NarrativeState,
  action: Omit<PlayerAction, 'id'>,
  identity?: Identity
): NarrativeState {
  let newState = state;

  if (!action.target) return newState;

  // Massive negative relationship impact
  newState = updateRelationship(newState, action.target, 'player', {
    trust: -50,
    affection: -40,
    fear: 60,
    respect: -30,
  }, `Player attacked ${action.target}`);

  // Create fact about the violence
  const factResult = addWorldFact(newState, {
    content: `The player attacked someone`,
    category: 'event',
    importance: 'critical',
    knownBy: action.witnesses,
    learnedWhen: Object.fromEntries(action.witnesses.map(w => [w, state.currentDay])),
    canSpread: true,
    spreadProbability: 0.8,
    relatedFacts: [],
    source: 'player_action',
    veracity: 'true',
  });
  newState = factResult.state;

  // Add knowledge to witnesses
  for (const witnessId of action.witnesses) {
    newState = addFactToNPCKnowledge(newState, witnessId, factResult.factId);
  }

  // Add pending consequence - others will react
  newState = addPendingConsequence(newState, {
    sourceActionId: 'violence-' + Date.now(),
    description: 'NPCs react to the violence',
    targetNpcs: action.witnesses,
    manifestDay: state.currentDay + 1,
    severity: 'critical',
    type: 'immediate',
  });

  // Witnesses lose trust in player
  for (const witnessId of action.witnesses) {
    if (witnessId !== action.target) {
      newState = updateRelationship(newState, witnessId, 'player', {
        trust: -30,
        fear: 40,
      }, 'Witnessed player violence');
    }
  }

  return newState;
}

/**
 * Process accusation action
 */
function processAccusation(
  state: NarrativeState,
  action: Omit<PlayerAction, 'id'>
): NarrativeState {
  let newState = state;

  if (!action.target) return newState;

  // Relationship impact depends on whether accusation is true
  // For now, assume it damages the relationship
  newState = updateRelationship(newState, action.target, 'player', {
    trust: -15,
    affection: -10,
  }, `Player accused them`);

  // The target becomes more guarded
  newState = updateRelationship(newState, 'player', action.target, {
    trust: -10,
  }, 'Was accused by player');

  return newState;
}

/**
 * Process confession action
 */
function processConfession(
  state: NarrativeState,
  action: Omit<PlayerAction, 'id'>
): NarrativeState {
  let newState = state;

  // Confessions can improve trust if the target values honesty
  if (action.target) {
    newState = updateRelationship(newState, action.target, 'player', {
      trust: 10,
      respect: 5,
    }, 'Player confessed something');
  }

  // Create fact about the confession
  const factResult = addWorldFact(newState, {
    content: `The player confessed: ${action.content.slice(0, 100)}`,
    category: 'event',
    importance: 'significant',
    knownBy: action.witnesses,
    learnedWhen: Object.fromEntries(action.witnesses.map(w => [w, state.currentDay])),
    canSpread: true,
    spreadProbability: 0.5,
    relatedFacts: [],
    source: 'player_action',
    veracity: 'true',
  });
  newState = factResult.state;

  return newState;
}

/**
 * Process revelation action
 */
function processRevelation(
  state: NarrativeState,
  action: Omit<PlayerAction, 'id'>
): NarrativeState {
  let newState = state;

  // Revelations spread knowledge
  const factResult = addWorldFact(newState, {
    content: `Player revealed: ${action.content.slice(0, 100)}`,
    category: 'event',
    importance: 'significant',
    knownBy: ['player', ...action.witnesses],
    learnedWhen: Object.fromEntries([['player', state.currentDay], ...action.witnesses.map(w => [w, state.currentDay])]),
    canSpread: true,
    spreadProbability: 0.6,
    relatedFacts: [],
    source: 'player_action',
    veracity: 'unknown',
  });
  newState = factResult.state;

  // Add knowledge to witnesses
  for (const witnessId of action.witnesses) {
    newState = addFactToNPCKnowledge(newState, witnessId, factResult.factId);
  }

  return newState;
}

/**
 * Process threat action
 */
function processThreat(
  state: NarrativeState,
  action: Omit<PlayerAction, 'id'>
): NarrativeState {
  let newState = state;

  if (!action.target) return newState;

  // Threats increase fear but decrease trust and affection
  newState = updateRelationship(newState, action.target, 'player', {
    trust: -20,
    affection: -15,
    fear: 30,
  }, 'Player threatened them');

  // Add pending consequence - threatened person may act
  newState = addPendingConsequence(newState, {
    sourceActionId: 'threat-' + Date.now(),
    description: `${action.target} reacts to being threatened`,
    targetNpcs: [action.target],
    manifestDay: state.currentDay + Math.floor(Math.random() * 3) + 1,
    severity: 'moderate',
    type: 'delayed',
  });

  return newState;
}

/**
 * Process alliance action
 */
function processAlliance(
  state: NarrativeState,
  action: Omit<PlayerAction, 'id'>
): NarrativeState {
  let newState = state;

  if (!action.target) return newState;

  // Alliances strengthen relationships
  newState = updateRelationship(newState, action.target, 'player', {
    trust: 15,
    affection: 10,
  }, 'Formed alliance with player');

  newState = updateRelationship(newState, 'player', action.target, {
    trust: 15,
    affection: 10,
  }, 'Formed alliance');

  return newState;
}

/**
 * Process betrayal action
 */
function processBetrayal(
  state: NarrativeState,
  action: Omit<PlayerAction, 'id'>
): NarrativeState {
  let newState = state;

  if (!action.target) return newState;

  // Betrayals devastate relationships
  newState = updateRelationship(newState, action.target, 'player', {
    trust: -60,
    affection: -40,
    rivalry: 30,
  }, 'Player betrayed them');

  // Create major fact
  const factResult = addWorldFact(newState, {
    content: `The player betrayed ${action.target}`,
    category: 'event',
    importance: 'major',
    knownBy: action.witnesses,
    learnedWhen: Object.fromEntries(action.witnesses.map(w => [w, state.currentDay])),
    canSpread: true,
    spreadProbability: 0.9,
    relatedFacts: [],
    source: 'player_action',
    veracity: 'true',
  });
  newState = factResult.state;

  return newState;
}

/**
 * Process support action
 */
function processSupport(
  state: NarrativeState,
  action: Omit<PlayerAction, 'id'>
): NarrativeState {
  let newState = state;

  if (!action.target) return newState;

  // Support improves relationships
  newState = updateRelationship(newState, action.target, 'player', {
    trust: 10,
    affection: 15,
    dependency: 5,
  }, 'Player supported them');

  return newState;
}

/**
 * Process rejection action
 */
function processRejection(
  state: NarrativeState,
  action: Omit<PlayerAction, 'id'>
): NarrativeState {
  let newState = state;

  if (!action.target) return newState;

  // Rejection damages relationships
  newState = updateRelationship(newState, action.target, 'player', {
    trust: -10,
    affection: -20,
  }, 'Player rejected them');

  return newState;
}

// =============================================================================
// STORY BEAT TRIGGERS
// =============================================================================

/**
 * Check if any story beats should be triggered by this action
 */
function checkBeatTriggers(
  state: NarrativeState,
  action: Omit<PlayerAction, 'id'>
): NarrativeState {
  let newState = state;

  for (const arc of newState.activeArcs) {
    for (const beat of arc.beats) {
      if (beat.triggered) continue;
      if (!beat.playerCanTrigger) continue;

      // Check if prerequisites are met
      const prereqsMet = beat.prerequisiteBeats.every(prereqId =>
        arc.beats.find(b => b.id === prereqId)?.triggered
      );
      if (!prereqsMet) continue;

      // Check trigger condition
      if (beat.triggerCondition.type === 'player_action') {
        // Check if action type matches what beat is looking for
        const actionMatches = doesActionTriggerBeat(action, beat);
        if (actionMatches) {
          // Trigger the beat
          newState = triggerBeat(newState, arc.id, beat.id);
        }
      }
    }
  }

  return newState;
}

/**
 * Check if an action triggers a specific beat
 */
function doesActionTriggerBeat(
  action: Omit<PlayerAction, 'id'>,
  beat: StoryBeat
): boolean {
  // Beat content might mention action types
  const beatContent = beat.content.toLowerCase();

  // Check for matches based on action type
  switch (action.type) {
    case 'accusation':
      return beatContent.includes('confront') || beatContent.includes('accuse') || beat.type === 'confrontation';
    case 'revelation':
      return beatContent.includes('reveal') || beat.type === 'revelation';
    case 'violence':
      return beatContent.includes('attack') || beatContent.includes('violence');
    case 'threat':
      return beatContent.includes('threat') || beatContent.includes('intimidate');
    case 'confession':
      return beatContent.includes('confess') || beatContent.includes('admit');
    default:
      return false;
  }
}

/**
 * Trigger a story beat
 */
function triggerBeat(
  state: NarrativeState,
  arcId: string,
  beatId: string
): NarrativeState {
  const activeArcs = state.activeArcs.map(arc => {
    if (arc.id !== arcId) return arc;

    const beats = arc.beats.map(beat => {
      if (beat.id !== beatId) return beat;
      return {
        ...beat,
        triggered: true,
        triggeredDay: state.currentDay,
      };
    });

    return { ...arc, beats };
  });

  return {
    ...state,
    activeArcs,
    lastUpdated: new Date(),
  };
}

// =============================================================================
// TENSION CALCULATION
// =============================================================================

/**
 * Calculate how much an action changes global tension
 */
function calculateTensionChange(
  actionType: PlayerActionType,
  impact: ActionImpact
): number {
  const baseChanges: Record<PlayerActionType, number> = {
    violence: 20,
    betrayal: 15,
    accusation: 8,
    threat: 10,
    confession: -5,
    revelation: 5,
    alliance: -3,
    rejection: 3,
    support: -2,
    lie: 2,
    investigation: 1,
    decision: 0,
    gift: -2,
    silence: 0,
    conversation: 0,
  };

  const impactMultipliers: Record<ActionImpact, number> = {
    trivial: 0.5,
    minor: 0.75,
    moderate: 1,
    major: 1.5,
    critical: 2,
  };

  return Math.round(baseChanges[actionType] * impactMultipliers[impact]);
}
