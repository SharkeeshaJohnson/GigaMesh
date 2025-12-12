/**
 * Simulation Integration
 *
 * This module handles the integration between the Narrative Engine
 * and the simulation system (time jumps). It generates directives
 * that guide what happens during simulation.
 */

import { Identity, NPC, SimulationResult, SimulationEvent, NPCChange } from '../types';
import {
  NarrativeState,
  SimulationDirective,
  NPCAgenda,
  PendingConsequence,
  StoryBeat,
  StoryArc,
  TimelineEvent,
} from './types';
import {
  addTimelineEvent,
  progressArcPhase,
  completeArc,
  updateRelationship,
  updateGlobalTension,
} from './state';
import { propagateKnowledge } from './knowledge-graph';

// =============================================================================
// SIMULATION DIRECTIVE GENERATION
// =============================================================================

/**
 * Generate a simulation directive for a time jump
 * Note: This simplified version doesn't require identity - use buildSimulationPromptAdditions for full prompts
 */
export function generateSimulationDirective(
  state: NarrativeState,
  jumpDays: number
): SimulationDirective {
  const targetDay = state.currentDay + jumpDays;

  // Get mandatory beats that should trigger
  const mandatoryBeats = getMandatoryBeats(state, targetDay);

  // Get possible beats that could trigger
  const possibleBeats = getPossibleBeats(state, targetDay);

  // Generate basic NPC agendas (without identity-specific context)
  const npcAgendas = generateBasicNPCAgendas(state);

  // Get consequences that should manifest
  const pendingConsequences = getManifestingConsequences(state, targetDay);

  // Generate basic world state guidance
  const worldStateGuidance = generateBasicWorldGuidance(state);

  // Calculate target tension
  const tensionTarget = calculateTensionTarget(state, jumpDays);

  // Identify focus arcs
  const focusArcs = identifyFocusArcs(state);

  return {
    day: targetDay,
    mandatoryBeats,
    possibleBeats,
    npcAgendas,
    pendingConsequences,
    worldStateGuidance,
    tensionTarget,
    focusArcs,
  };
}

/**
 * Generate basic NPC agendas without identity context
 */
function generateBasicNPCAgendas(state: NarrativeState): NPCAgenda[] {
  const agendas: NPCAgenda[] = [];

  for (const npcId of Object.keys(state.npcKnowledge)) {
    // Find arcs this NPC is involved in
    const myArcs = state.activeArcs.filter(arc => arc.participants.includes(npcId));

    const goals: string[] = [];
    const priorities: string[] = [];
    const willDo: string[] = [];
    const wontDo: string[] = [];

    // Generate goals from story arcs
    for (const arc of myArcs) {
      const role = arc.roles[npcId];

      switch (role) {
        case 'antagonist':
          goals.push(`Continue ${arc.title} scheme`);
          willDo.push('Take actions to advance their plan');
          break;
        case 'witness':
          goals.push(`Decide what to do about ${arc.title}`);
          willDo.push('Gather more information');
          break;
        case 'victim':
          goals.push(`Deal with consequences of ${arc.title}`);
          willDo.push('Seek support from others');
          break;
      }
    }

    // Default goals if none generated
    if (goals.length === 0) {
      goals.push('Go about daily routine');
    }

    agendas.push({
      npcId,
      goals,
      priorities,
      willDo,
      wontDo,
      currentFocus: myArcs.length > 0 ? `Involved in ${myArcs[0].title}` : 'Daily activities',
    });
  }

  return agendas;
}

/**
 * Generate basic world state guidance without identity
 */
function generateBasicWorldGuidance(state: NarrativeState): string[] {
  const guidance: string[] = [];

  // Guidance based on active arcs
  for (const arc of state.activeArcs) {
    if (arc.phase === 'rising') {
      guidance.push(`${arc.title}: Tension should build toward climax`);
    } else if (arc.phase === 'climax') {
      guidance.push(`${arc.title}: Major confrontation or revelation expected`);
    }
  }

  // Guidance based on global tension
  if (state.globalTension > 70) {
    guidance.push('High tension environment - conflicts likely to erupt');
  } else if (state.globalTension > 50) {
    guidance.push('Moderate tension - minor conflicts possible');
  }

  return guidance;
}

/**
 * Get beats that MUST happen during this simulation
 */
function getMandatoryBeats(state: NarrativeState, targetDay: number): StoryBeat[] {
  const mandatory: StoryBeat[] = [];

  for (const arc of state.activeArcs) {
    for (const beat of arc.beats) {
      if (beat.triggered) continue;

      // Check prerequisites
      const prereqsMet = beat.prerequisiteBeats.every(prereqId =>
        arc.beats.find(b => b.id === prereqId)?.triggered
      );
      if (!prereqsMet) continue;

      // Check trigger conditions
      if (beat.triggerCondition.type === 'day') {
        const triggerDay = arc.startDay + (beat.triggerCondition.value as number || 0);
        if (targetDay >= triggerDay) {
          mandatory.push(beat);
        }
      } else if (beat.triggerCondition.type === 'tension_threshold') {
        const threshold = beat.triggerCondition.value as number || 50;
        if (arc.tension >= threshold) {
          mandatory.push(beat);
        }
      }
    }
  }

  // Sort by narrative weight (most important first)
  return mandatory.sort((a, b) => b.narrativeWeight - a.narrativeWeight);
}

/**
 * Get beats that COULD happen during this simulation
 */
function getPossibleBeats(state: NarrativeState, targetDay: number): StoryBeat[] {
  const possible: StoryBeat[] = [];

  for (const arc of state.activeArcs) {
    for (const beat of arc.beats) {
      if (beat.triggered) continue;
      if (!beat.npcCanTrigger) continue; // Only NPC-triggerable beats

      // Check prerequisites
      const prereqsMet = beat.prerequisiteBeats.every(prereqId =>
        arc.beats.find(b => b.id === prereqId)?.triggered
      );
      if (!prereqsMet) continue;

      // Random triggers
      if (beat.triggerCondition.type === 'random') {
        const prob = beat.triggerCondition.probability || 0.3;
        if (Math.random() < prob) {
          possible.push(beat);
        }
      }
    }
  }

  return possible;
}

/**
 * Generate off-screen agendas for NPCs
 */
function generateNPCAgendas(
  state: NarrativeState,
  identity: Identity,
  jumpDays: number
): NPCAgenda[] {
  const agendas: NPCAgenda[] = [];

  for (const npc of identity.npcs.filter(n => !n.isDead && n.isActive)) {
    // Find arcs this NPC is involved in
    const myArcs = state.activeArcs.filter(arc => arc.participants.includes(npc.id));

    const goals: string[] = [];
    const priorities: string[] = [];
    const willDo: string[] = [];
    const wontDo: string[] = [];

    // Generate goals from story arcs
    for (const arc of myArcs) {
      const role = arc.roles[npc.id];

      switch (role) {
        case 'antagonist':
          goals.push(`Continue ${arc.title} scheme`);
          willDo.push('Take actions to advance their plan');
          willDo.push('Cover their tracks');
          break;
        case 'witness':
          goals.push(`Decide what to do about ${arc.title}`);
          willDo.push('Gather more information');
          willDo.push('Consider who to trust');
          break;
        case 'victim':
          goals.push(`Deal with consequences of ${arc.title}`);
          willDo.push('Seek support from others');
          break;
        case 'enabler':
          goals.push(`Support the ${arc.title} scheme`);
          willDo.push('Assist the antagonist');
          willDo.push('Keep secrets');
          break;
        case 'manipulator':
          goals.push(`Use ${arc.title} for personal gain`);
          willDo.push('Play both sides');
          break;
      }
    }

    // Generate goals from emotional state - handle arrays
    const emotionalStates = Array.isArray(npc.currentEmotionalState)
      ? npc.currentEmotionalState
      : [npc.currentEmotionalState];
    const emotion = emotionalStates.join(' ').toLowerCase();
    if (emotion.includes('angry') || emotion.includes('bitter')) {
      goals.push('Seek confrontation or vindication');
      willDo.push('Pick fights or make accusations');
    } else if (emotion.includes('scared') || emotion.includes('anxious')) {
      goals.push('Seek safety and reassurance');
      willDo.push('Avoid dangerous situations');
      wontDo.push('Take unnecessary risks');
    } else if (emotion.includes('guilty')) {
      goals.push('Deal with guilt - confess or rationalize');
      willDo.push('Act erratically or make mistakes');
    }

    // Generate goals from relationships
    const playerRel = state.relationships.find(
      r => r.fromId === npc.id && r.toId === 'player'
    );
    if (playerRel) {
      if (playerRel.metrics.trust < 30) {
        priorities.push('Be cautious around the player');
      }
      if (playerRel.metrics.fear > 50) {
        priorities.push('Avoid the player or seek protection');
      }
      if (playerRel.metrics.affection > 70) {
        priorities.push('Support and protect the player');
      }
    }

    // Default goals if none generated
    if (goals.length === 0) {
      goals.push('Go about daily routine');
      goals.push('Maintain relationships');
    }

    // Current focus based on tier
    let currentFocus = 'Daily activities';
    if (npc.tier === 'core') {
      currentFocus = myArcs.length > 0 ? `Focused on ${myArcs[0].title}` : 'Managing important matters';
    } else if (npc.tier === 'secondary') {
      currentFocus = 'Balancing work and personal life';
    }

    agendas.push({
      npcId: npc.id,
      goals,
      priorities,
      willDo,
      wontDo,
      currentFocus,
    });
  }

  return agendas;
}

/**
 * Get consequences that should manifest during this time period
 */
function getManifestingConsequences(
  state: NarrativeState,
  targetDay: number
): PendingConsequence[] {
  return state.pendingConsequences.filter(c => c.manifestDay <= targetDay);
}

/**
 * Generate guidance for world state during simulation
 */
function generateWorldGuidance(state: NarrativeState, identity: Identity): string[] {
  const guidance: string[] = [];

  // Guidance based on meters
  if (identity.meters.familyHarmony < 30) {
    guidance.push('Family tensions should escalate');
  }
  if (identity.meters.careerStanding < 30) {
    guidance.push('Work problems should compound');
  }
  if (identity.meters.mentalHealth < 30) {
    guidance.push('Mental health struggles should manifest');
  }
  if (identity.meters.wealth < 30) {
    guidance.push('Financial pressures should increase');
  }
  if (identity.meters.reputation < 30) {
    guidance.push('Social standing should deteriorate');
  }

  // Guidance based on active arcs
  for (const arc of state.activeArcs) {
    if (arc.phase === 'rising') {
      guidance.push(`${arc.title}: Tension should build toward climax`);
    } else if (arc.phase === 'climax') {
      guidance.push(`${arc.title}: Major confrontation or revelation expected`);
    }
  }

  // Guidance based on global tension
  if (state.globalTension > 70) {
    guidance.push('High tension environment - conflicts likely to erupt');
  } else if (state.globalTension > 50) {
    guidance.push('Moderate tension - minor conflicts possible');
  }

  // Guidance based on difficulty
  switch (identity.difficulty) {
    case 'crazy':
      guidance.push('Extreme events are acceptable');
      guidance.push('Multiple crises can occur simultaneously');
      break;
    case 'dramatic':
      guidance.push('Dramatic revelations and confrontations encouraged');
      break;
    case 'realistic':
      guidance.push('Keep events grounded and believable');
      break;
  }

  return guidance;
}

/**
 * Calculate target tension after simulation
 */
function calculateTensionTarget(state: NarrativeState, jumpDays: number): number {
  let target = state.globalTension;

  // Tension naturally increases over time
  target += jumpDays * 2;

  // Adjust based on active arc phases
  for (const arc of state.activeArcs) {
    if (arc.phase === 'rising') {
      target += 5;
    } else if (arc.phase === 'climax') {
      target += 10;
    } else if (arc.phase === 'resolution') {
      target -= 10;
    }
  }

  // Cap tension
  return Math.max(10, Math.min(95, target));
}

/**
 * Identify which arcs should be the focus of simulation
 */
function identifyFocusArcs(state: NarrativeState): string[] {
  // Prioritize arcs in climax or late rising phase
  const prioritized = state.activeArcs
    .filter(arc => arc.phase === 'climax' || (arc.phase === 'rising' && arc.tension > 60))
    .map(arc => arc.id);

  // Add main arcs
  const mainArcs = state.activeArcs
    .filter(arc => arc.type === 'main' && !prioritized.includes(arc.id))
    .map(arc => arc.id);

  return [...prioritized, ...mainArcs].slice(0, 3);
}

// =============================================================================
// POST-SIMULATION PROCESSING
// =============================================================================

/**
 * Process simulation results and update narrative state
 * Accepts the full SimulationResult from the simulation page
 */
export function processSimulationResults(
  state: NarrativeState,
  result: SimulationResult,
  identity: Identity
): NarrativeState {
  let newState = state;

  // Process each event
  for (const event of result.events) {
    newState = processSimulationEvent(newState, event);
  }

  // Process NPC changes
  for (const change of result.npcChanges) {
    newState = processNPCChange(newState, change);
  }

  // Check for arc phase progressions
  newState = checkArcProgressions(newState);

  // Propagate knowledge
  newState = propagateKnowledge(newState);

  // Remove manifested consequences
  newState = {
    ...newState,
    pendingConsequences: newState.pendingConsequences.filter(
      c => c.manifestDay > result.toDay
    ),
  };

  // Update global tension toward target
  const tensionDiff = calculateTensionTarget(state, result.toDay - result.fromDay) - state.globalTension;
  newState = updateGlobalTension(newState, Math.round(tensionDiff * 0.5));

  return newState;
}

// SimulationEvent and NPCChange types are imported from '../types'

/**
 * Process a single simulation event
 */
function processSimulationEvent(
  state: NarrativeState,
  event: SimulationEvent
): NarrativeState {
  // Add to timeline
  const timelineEvent: Omit<TimelineEvent, 'id'> = {
    day: state.currentDay,
    timestamp: new Date(),
    type: 'simulation_event',
    source: 'simulation',
    title: event.title,
    description: event.description,
    participants: event.involvedNpcs || [],
    impact: {
      metersAffected: [],
      relationshipsAffected: [],
      storiesAffected: [],
      factsCreated: [],
      factsRevealed: [],
    },
    linkedEvents: [],
    visibility: 'public',
  };

  let newState = addTimelineEvent(state, timelineEvent);

  // Check if event triggers any story beats
  for (const arc of newState.activeArcs) {
    for (const beat of arc.beats) {
      if (beat.triggered) continue;

      // Check if event content matches beat
      const eventText = `${event.title} ${event.description}`.toLowerCase();
      const beatText = beat.content.toLowerCase();

      // Simple keyword matching
      const beatWords = beatText.split(' ').filter(w => w.length > 4);
      const matchCount = beatWords.filter(w => eventText.includes(w)).length;

      if (matchCount >= 3) {
        // Consider beat triggered
        const activeArcs = newState.activeArcs.map(a => {
          if (a.id !== arc.id) return a;
          return {
            ...a,
            beats: a.beats.map(b => {
              if (b.id !== beat.id) return b;
              return { ...b, triggered: true, triggeredDay: state.currentDay };
            }),
          };
        });
        newState = { ...newState, activeArcs };
      }
    }
  }

  return newState;
}

/**
 * Process an NPC change from simulation
 */
function processNPCChange(state: NarrativeState, change: NPCChange): NarrativeState {
  let newState = state;

  switch (change.changeType) {
    case 'relationship':
      // Update relationship status in state
      newState = updateRelationship(newState, change.npcId, 'player', {
        trust: change.description.includes('closer') ? 10 : change.description.includes('distant') ? -10 : 0,
        affection: change.description.includes('loving') ? 10 : change.description.includes('cold') ? -10 : 0,
      }, change.description);
      break;

    case 'death':
      // Remove NPC from active participants in arcs
      const activeArcs = newState.activeArcs.map(arc => {
        if (!arc.participants.includes(change.npcId)) return arc;
        return {
          ...arc,
          participants: arc.participants.filter(p => p !== change.npcId),
        };
      });
      newState = { ...newState, activeArcs };

      // Add death to timeline
      newState = addTimelineEvent(newState, {
        day: state.currentDay,
        timestamp: new Date(),
        type: 'death',
        source: 'simulation',
        title: `Death`,
        description: change.description,
        participants: [change.npcId],
        impact: {
          metersAffected: [],
          relationshipsAffected: [],
          storiesAffected: [],
          factsCreated: [],
          factsRevealed: [],
        },
        linkedEvents: [],
        visibility: 'public',
      });
      break;

    case 'knowledge':
      // NPC learned something new - this would need the actual fact
      // For now, just note it in timeline
      newState = addTimelineEvent(newState, {
        day: state.currentDay,
        timestamp: new Date(),
        type: 'revelation',
        source: 'simulation',
        title: `Knowledge gained`,
        description: change.description,
        participants: [change.npcId],
        impact: {
          metersAffected: [],
          relationshipsAffected: [],
          storiesAffected: [],
          factsCreated: [],
          factsRevealed: [],
        },
        linkedEvents: [],
        visibility: 'private',
      });
      break;
  }

  return newState;
}

/**
 * Check if any arcs should progress to next phase
 */
function checkArcProgressions(state: NarrativeState): NarrativeState {
  let newState = state;

  for (const arc of newState.activeArcs) {
    // Count triggered beats per phase
    const beatsByPhase: Record<string, { total: number; triggered: number }> = {
      setup: { total: 0, triggered: 0 },
      rising: { total: 0, triggered: 0 },
      climax: { total: 0, triggered: 0 },
      resolution: { total: 0, triggered: 0 },
    };

    for (const beat of arc.beats) {
      const phase = beat.title.split(' - ')[1]?.toLowerCase() || 'setup';
      if (beatsByPhase[phase]) {
        beatsByPhase[phase].total++;
        if (beat.triggered) {
          beatsByPhase[phase].triggered++;
        }
      }
    }

    // Check if current phase is complete
    const currentPhaseStats = beatsByPhase[arc.phase];
    if (currentPhaseStats && currentPhaseStats.total > 0) {
      const completionRate = currentPhaseStats.triggered / currentPhaseStats.total;

      if (completionRate >= 0.7) {
        // Progress to next phase
        newState = progressArcPhase(newState, arc.id);
      }
    }

    // Check if arc should complete
    if (arc.phase === 'aftermath' || arc.phase === 'resolution') {
      const totalBeats = arc.beats.length;
      const triggeredBeats = arc.beats.filter(b => b.triggered).length;

      if (triggeredBeats / totalBeats >= 0.8) {
        newState = completeArc(newState, arc.id);
      }
    }
  }

  return newState;
}

// =============================================================================
// SIMULATION PROMPT BUILDING
// =============================================================================

/**
 * Build prompt additions for simulation based on narrative state
 */
export function buildSimulationPromptAdditions(
  directive: SimulationDirective,
  identity: Identity
): string {
  const parts: string[] = [];

  // Mandatory story beats
  if (directive.mandatoryBeats.length > 0) {
    parts.push(`=== MANDATORY STORY EVENTS ===`);
    parts.push(`These events MUST occur during this simulation:`);
    for (const beat of directive.mandatoryBeats.slice(0, 3)) {
      parts.push(`- ${beat.content}`);
    }
  }

  // Possible story beats
  if (directive.possibleBeats.length > 0) {
    parts.push(`\n=== POSSIBLE STORY EVENTS ===`);
    parts.push(`Consider including these if appropriate:`);
    for (const beat of directive.possibleBeats.slice(0, 2)) {
      parts.push(`- ${beat.content}`);
    }
  }

  // NPC agendas
  if (directive.npcAgendas.length > 0) {
    parts.push(`\n=== NPC OFF-SCREEN ACTIVITIES ===`);
    for (const agenda of directive.npcAgendas.slice(0, 5)) {
      const npc = identity.npcs.find(n => n.id === agenda.npcId);
      if (npc) {
        parts.push(`${npc.name}: ${agenda.currentFocus}`);
        if (agenda.goals.length > 0) {
          parts.push(`  Goals: ${agenda.goals.slice(0, 2).join(', ')}`);
        }
      }
    }
  }

  // Pending consequences
  if (directive.pendingConsequences.length > 0) {
    parts.push(`\n=== CONSEQUENCES TO MANIFEST ===`);
    for (const consequence of directive.pendingConsequences) {
      parts.push(`- ${consequence.description} (${consequence.severity})`);
    }
  }

  // World guidance
  if (directive.worldStateGuidance.length > 0) {
    parts.push(`\n=== WORLD STATE GUIDANCE ===`);
    for (const guidance of directive.worldStateGuidance) {
      parts.push(`- ${guidance}`);
    }
  }

  // Tension guidance
  parts.push(`\n=== TENSION TARGET ===`);
  parts.push(`Current: ${Math.round(directive.tensionTarget - 10)}, Target: ${directive.tensionTarget}`);
  if (directive.tensionTarget > 70) {
    parts.push(`HIGH TENSION - Events should be dramatic and consequential`);
  }

  return parts.join('\n');
}
