/**
 * Story Generator
 *
 * This module handles the procedural generation of infinite unique storylines.
 * It combines templates, NPC role assignment, and LLM creativity to create
 * stories that are unique every playthrough.
 */

import { Identity, NPC, Difficulty } from '../types';
import {
  StoryArc,
  StoryBeat,
  StoryTemplate,
  BeatTemplate,
  StoryCategory,
  StoryRole,
  StoryPhase,
  StoryBeatType,
  WorldFact,
  ArcGenerationParams,
  GeneratedArc,
  TriggerCondition,
  NarrativeState,
} from './types';

// =============================================================================
// STORY TEMPLATES
// =============================================================================

/**
 * Templates for generating stories - these combine with NPC roles for infinite variety
 */
export const STORY_TEMPLATES: StoryTemplate[] = [
  // BETRAYAL STORIES
  {
    id: 'embezzlement',
    category: 'betrayal',
    name: 'The Embezzlement',
    premise: '{antagonist} has been stealing money from {workplace}, and {witness} discovered evidence',
    requiredRoles: ['antagonist', 'witness'],
    optionalRoles: ['enabler', 'victim'],
    beatTemplates: [
      { phase: 'setup', type: 'discovery', template: '{witness} finds discrepancies in the financial records', triggerType: 'day', requiredRoles: ['witness'], narrativeWeight: 5 },
      { phase: 'rising', type: 'confrontation', template: '{witness} confronts {antagonist} about the missing money', triggerType: 'message_count', requiredRoles: ['witness', 'antagonist'], narrativeWeight: 7 },
      { phase: 'rising', type: 'revelation', template: 'Evidence emerges showing {antagonist} has been skimming for months', triggerType: 'tension_threshold', requiredRoles: ['antagonist'], narrativeWeight: 6 },
      { phase: 'climax', type: 'decision', template: '{witness} must decide whether to report {antagonist} or demand a cut', triggerType: 'manual', requiredRoles: ['witness'], narrativeWeight: 9 },
      { phase: 'resolution', type: 'consequence', template: 'The truth about the embezzlement becomes public knowledge', triggerType: 'day', requiredRoles: [], narrativeWeight: 8 },
    ],
    minTension: 40,
    maxTension: 85,
    typicalDuration: 7,
    difficultyMin: 'realistic',
    tags: ['money', 'crime', 'trust'],
  },
  {
    id: 'secret_affair',
    category: 'betrayal',
    name: 'The Secret Affair',
    premise: '{antagonist} has been having an affair, and {witness} knows about it',
    requiredRoles: ['antagonist', 'witness', 'victim'],
    optionalRoles: ['enabler'],
    beatTemplates: [
      { phase: 'setup', type: 'discovery', template: '{witness} accidentally discovers {antagonist}\'s affair', triggerType: 'day', requiredRoles: ['witness'], narrativeWeight: 6 },
      { phase: 'rising', type: 'escalation', template: '{witness} drops hints about what they know', triggerType: 'message_count', requiredRoles: ['witness'], narrativeWeight: 5 },
      { phase: 'rising', type: 'confrontation', template: '{antagonist} realizes {witness} knows their secret', triggerType: 'tension_threshold', requiredRoles: ['antagonist', 'witness'], narrativeWeight: 7 },
      { phase: 'climax', type: 'revelation', template: '{victim} learns the truth about the affair', triggerType: 'manual', requiredRoles: ['victim'], narrativeWeight: 10 },
      { phase: 'resolution', type: 'consequence', template: 'The fallout from the revealed affair reshapes relationships', triggerType: 'day', requiredRoles: [], narrativeWeight: 8 },
    ],
    minTension: 50,
    maxTension: 95,
    typicalDuration: 10,
    difficultyMin: 'dramatic',
    tags: ['romance', 'betrayal', 'secrets'],
  },

  // CONFLICT STORIES
  {
    id: 'power_struggle',
    category: 'conflict',
    name: 'The Power Struggle',
    premise: '{antagonist} and {rival} are competing for control, with {catalyst} caught in the middle',
    requiredRoles: ['antagonist', 'rival'],
    optionalRoles: ['catalyst', 'ally'],
    beatTemplates: [
      { phase: 'setup', type: 'escalation', template: 'Tension builds between {antagonist} and {rival} over influence', triggerType: 'day', requiredRoles: ['antagonist', 'rival'], narrativeWeight: 4 },
      { phase: 'rising', type: 'alliance', template: '{antagonist} tries to recruit allies against {rival}', triggerType: 'message_count', requiredRoles: ['antagonist'], narrativeWeight: 6 },
      { phase: 'rising', type: 'betrayal', template: 'Someone switches sides unexpectedly', triggerType: 'tension_threshold', requiredRoles: [], narrativeWeight: 7 },
      { phase: 'climax', type: 'confrontation', template: '{antagonist} and {rival} have a decisive confrontation', triggerType: 'manual', requiredRoles: ['antagonist', 'rival'], narrativeWeight: 9 },
      { phase: 'resolution', type: 'consequence', template: 'A new power structure emerges from the conflict', triggerType: 'day', requiredRoles: [], narrativeWeight: 8 },
    ],
    minTension: 45,
    maxTension: 90,
    typicalDuration: 14,
    difficultyMin: 'dramatic',
    tags: ['power', 'rivalry', 'politics'],
  },
  {
    id: 'inheritance_dispute',
    category: 'conflict',
    name: 'The Inheritance',
    premise: 'A death in the family has left {antagonist} and {rival} fighting over the inheritance',
    requiredRoles: ['antagonist', 'rival'],
    optionalRoles: ['mediator', 'manipulator'],
    beatTemplates: [
      { phase: 'setup', type: 'revelation', template: 'The will is read, revealing unexpected terms', triggerType: 'day', requiredRoles: [], narrativeWeight: 6 },
      { phase: 'rising', type: 'escalation', template: '{antagonist} and {rival} begin disputing the inheritance', triggerType: 'day', requiredRoles: ['antagonist', 'rival'], narrativeWeight: 5 },
      { phase: 'rising', type: 'discovery', template: 'Hidden documents suggest the will may have been tampered with', triggerType: 'message_count', requiredRoles: [], narrativeWeight: 7 },
      { phase: 'climax', type: 'revelation', template: 'The true wishes of the deceased come to light', triggerType: 'manual', requiredRoles: [], narrativeWeight: 9 },
      { phase: 'resolution', type: 'consequence', template: 'The inheritance is finally settled, but relationships are changed', triggerType: 'day', requiredRoles: [], narrativeWeight: 8 },
    ],
    minTension: 50,
    maxTension: 85,
    typicalDuration: 12,
    difficultyMin: 'realistic',
    tags: ['family', 'money', 'death'],
  },

  // MYSTERY STORIES
  {
    id: 'hidden_past',
    category: 'mystery',
    name: 'The Hidden Past',
    premise: '{antagonist} has a secret past that {witness} is close to uncovering',
    requiredRoles: ['antagonist', 'witness'],
    optionalRoles: ['catalyst', 'ally'],
    beatTemplates: [
      { phase: 'setup', type: 'discovery', template: '{witness} finds an old photograph or document that raises questions', triggerType: 'day', requiredRoles: ['witness'], narrativeWeight: 5 },
      { phase: 'rising', type: 'escalation', template: '{witness} begins asking questions that make {antagonist} nervous', triggerType: 'message_count', requiredRoles: ['witness', 'antagonist'], narrativeWeight: 6 },
      { phase: 'rising', type: 'revelation', template: 'A piece of the puzzle falls into place', triggerType: 'tension_threshold', requiredRoles: [], narrativeWeight: 7 },
      { phase: 'climax', type: 'revelation', template: 'The full truth about {antagonist}\'s past is revealed', triggerType: 'manual', requiredRoles: ['antagonist'], narrativeWeight: 10 },
      { phase: 'resolution', type: 'consequence', template: 'Everyone must come to terms with what they\'ve learned', triggerType: 'day', requiredRoles: [], narrativeWeight: 8 },
    ],
    minTension: 35,
    maxTension: 80,
    typicalDuration: 10,
    difficultyMin: 'realistic',
    tags: ['secrets', 'identity', 'past'],
  },
  {
    id: 'blackmail',
    category: 'mystery',
    name: 'The Blackmailer',
    premise: '{antagonist} is being blackmailed by {manipulator} over a dark secret',
    requiredRoles: ['antagonist', 'manipulator'],
    optionalRoles: ['witness', 'victim'],
    beatTemplates: [
      { phase: 'setup', type: 'escalation', template: '{antagonist} starts acting strangely, clearly under pressure', triggerType: 'day', requiredRoles: ['antagonist'], narrativeWeight: 5 },
      { phase: 'rising', type: 'discovery', template: 'Evidence of the blackmail scheme surfaces', triggerType: 'message_count', requiredRoles: [], narrativeWeight: 6 },
      { phase: 'rising', type: 'revelation', template: 'The nature of {antagonist}\'s secret begins to emerge', triggerType: 'tension_threshold', requiredRoles: ['antagonist'], narrativeWeight: 7 },
      { phase: 'climax', type: 'confrontation', template: '{antagonist} confronts {manipulator} about the blackmail', triggerType: 'manual', requiredRoles: ['antagonist', 'manipulator'], narrativeWeight: 9 },
      { phase: 'resolution', type: 'consequence', template: 'The blackmail situation reaches its conclusion', triggerType: 'day', requiredRoles: [], narrativeWeight: 8 },
    ],
    minTension: 55,
    maxTension: 95,
    typicalDuration: 8,
    difficultyMin: 'dramatic',
    tags: ['secrets', 'crime', 'pressure'],
  },

  // CRISIS STORIES
  {
    id: 'health_crisis',
    category: 'crisis',
    name: 'The Diagnosis',
    premise: '{victim} has received devastating health news that they\'re keeping secret',
    requiredRoles: ['victim'],
    optionalRoles: ['ally', 'witness'],
    beatTemplates: [
      { phase: 'setup', type: 'revelation', template: '{victim} receives life-changing medical news', triggerType: 'day', requiredRoles: ['victim'], narrativeWeight: 8 },
      { phase: 'rising', type: 'escalation', template: '{victim} struggles to keep their condition hidden', triggerType: 'day', requiredRoles: ['victim'], narrativeWeight: 6 },
      { phase: 'rising', type: 'discovery', template: 'Someone notices something is wrong with {victim}', triggerType: 'message_count', requiredRoles: ['victim'], narrativeWeight: 7 },
      { phase: 'climax', type: 'revelation', template: '{victim} reveals their condition to others', triggerType: 'manual', requiredRoles: ['victim'], narrativeWeight: 10 },
      { phase: 'resolution', type: 'consequence', template: 'The group rallies around or fractures over the news', triggerType: 'day', requiredRoles: [], narrativeWeight: 8 },
    ],
    minTension: 40,
    maxTension: 80,
    typicalDuration: 14,
    difficultyMin: 'realistic',
    tags: ['health', 'secrets', 'support'],
  },
  {
    id: 'financial_ruin',
    category: 'crisis',
    name: 'The Collapse',
    premise: '{victim} is facing financial ruin and desperately hiding it',
    requiredRoles: ['victim'],
    optionalRoles: ['manipulator', 'ally', 'enabler'],
    beatTemplates: [
      { phase: 'setup', type: 'escalation', template: '{victim} begins making desperate financial decisions', triggerType: 'day', requiredRoles: ['victim'], narrativeWeight: 5 },
      { phase: 'rising', type: 'discovery', template: 'Signs of {victim}\'s financial trouble become visible', triggerType: 'day', requiredRoles: ['victim'], narrativeWeight: 6 },
      { phase: 'rising', type: 'revelation', template: 'The true extent of the financial crisis is revealed', triggerType: 'tension_threshold', requiredRoles: ['victim'], narrativeWeight: 8 },
      { phase: 'climax', type: 'decision', template: '{victim} must make a critical choice about their future', triggerType: 'manual', requiredRoles: ['victim'], narrativeWeight: 9 },
      { phase: 'resolution', type: 'consequence', template: 'The aftermath of the financial crisis reshapes lives', triggerType: 'day', requiredRoles: [], narrativeWeight: 7 },
    ],
    minTension: 45,
    maxTension: 85,
    typicalDuration: 10,
    difficultyMin: 'realistic',
    tags: ['money', 'desperation', 'secrets'],
  },

  // REVENGE STORIES
  {
    id: 'old_grudge',
    category: 'revenge',
    name: 'The Old Grudge',
    premise: '{antagonist} has been waiting for the right moment to get revenge on {victim}',
    requiredRoles: ['antagonist', 'victim'],
    optionalRoles: ['witness', 'ally'],
    beatTemplates: [
      { phase: 'setup', type: 'revelation', template: 'Old history between {antagonist} and {victim} comes to light', triggerType: 'day', requiredRoles: ['antagonist', 'victim'], narrativeWeight: 6 },
      { phase: 'rising', type: 'escalation', template: '{antagonist} begins their campaign against {victim}', triggerType: 'day', requiredRoles: ['antagonist'], narrativeWeight: 7 },
      { phase: 'rising', type: 'discovery', template: 'The reason for {antagonist}\'s vendetta is revealed', triggerType: 'message_count', requiredRoles: ['antagonist'], narrativeWeight: 8 },
      { phase: 'climax', type: 'confrontation', template: '{antagonist} and {victim} have their final confrontation', triggerType: 'manual', requiredRoles: ['antagonist', 'victim'], narrativeWeight: 10 },
      { phase: 'resolution', type: 'consequence', template: 'The vendetta reaches its conclusion', triggerType: 'day', requiredRoles: [], narrativeWeight: 8 },
    ],
    minTension: 50,
    maxTension: 95,
    typicalDuration: 12,
    difficultyMin: 'dramatic',
    tags: ['revenge', 'past', 'conflict'],
  },

  // SECRET STORIES
  {
    id: 'double_life',
    category: 'secret',
    name: 'The Double Life',
    premise: '{antagonist} has been living a double life that is about to unravel',
    requiredRoles: ['antagonist'],
    optionalRoles: ['witness', 'victim', 'enabler'],
    beatTemplates: [
      { phase: 'setup', type: 'escalation', template: 'Cracks begin to show in {antagonist}\'s carefully maintained facade', triggerType: 'day', requiredRoles: ['antagonist'], narrativeWeight: 5 },
      { phase: 'rising', type: 'discovery', template: 'Someone stumbles upon evidence of {antagonist}\'s other life', triggerType: 'message_count', requiredRoles: ['antagonist'], narrativeWeight: 7 },
      { phase: 'rising', type: 'escalation', template: '{antagonist} struggles to keep their two worlds separate', triggerType: 'tension_threshold', requiredRoles: ['antagonist'], narrativeWeight: 7 },
      { phase: 'climax', type: 'revelation', template: '{antagonist}\'s double life is fully exposed', triggerType: 'manual', requiredRoles: ['antagonist'], narrativeWeight: 10 },
      { phase: 'resolution', type: 'consequence', template: '{antagonist} must face the consequences of their deception', triggerType: 'day', requiredRoles: ['antagonist'], narrativeWeight: 8 },
    ],
    minTension: 50,
    maxTension: 90,
    typicalDuration: 14,
    difficultyMin: 'dramatic',
    tags: ['secrets', 'deception', 'identity'],
  },

  // CRAZY MODE EXTREME STORIES
  {
    id: 'murder_cover_up',
    category: 'secret',
    name: 'The Cover Up',
    premise: '{antagonist} accidentally killed someone and {enabler} helped cover it up',
    requiredRoles: ['antagonist', 'enabler'],
    optionalRoles: ['witness', 'victim'],
    beatTemplates: [
      { phase: 'setup', type: 'escalation', template: 'Guilt weighs heavily on {antagonist} and {enabler}', triggerType: 'day', requiredRoles: ['antagonist', 'enabler'], narrativeWeight: 6 },
      { phase: 'rising', type: 'discovery', template: 'Evidence of foul play begins to surface', triggerType: 'day', requiredRoles: [], narrativeWeight: 8 },
      { phase: 'rising', type: 'escalation', template: '{enabler} threatens to confess, terrifying {antagonist}', triggerType: 'message_count', requiredRoles: ['antagonist', 'enabler'], narrativeWeight: 8 },
      { phase: 'climax', type: 'revelation', template: 'The truth about the death comes out', triggerType: 'manual', requiredRoles: [], narrativeWeight: 10 },
      { phase: 'resolution', type: 'consequence', template: 'Justice or escape - the aftermath unfolds', triggerType: 'day', requiredRoles: [], narrativeWeight: 9 },
    ],
    minTension: 70,
    maxTension: 100,
    typicalDuration: 10,
    difficultyMin: 'crazy',
    tags: ['crime', 'death', 'guilt', 'extreme'],
  },
];

// =============================================================================
// STORY GENERATION
// =============================================================================

/**
 * Select appropriate templates for difficulty
 */
function getTemplatesForDifficulty(difficulty: Difficulty): StoryTemplate[] {
  const difficultyOrder: Difficulty[] = ['realistic', 'dramatic', 'crazy'];
  const difficultyIndex = difficultyOrder.indexOf(difficulty);

  return STORY_TEMPLATES.filter(template => {
    const templateIndex = difficultyOrder.indexOf(template.difficultyMin);
    return templateIndex <= difficultyIndex;
  });
}

/**
 * Assign NPCs to roles in a story
 */
function assignRoles(
  template: StoryTemplate,
  npcs: NPC[],
  existingArcs: StoryArc[]
): Record<string, StoryRole> | null {
  const roles: Record<string, StoryRole> = {};
  const availableNpcs = [...npcs].filter(n => !n.isDead && n.isActive);

  // Shuffle for randomness
  availableNpcs.sort(() => Math.random() - 0.5);

  // Try to avoid NPCs who are already heavily involved in other arcs
  const npcArcCounts = new Map<string, number>();
  for (const arc of existingArcs) {
    for (const participantId of arc.participants) {
      npcArcCounts.set(participantId, (npcArcCounts.get(participantId) || 0) + 1);
    }
  }

  // Sort by involvement (less involved first)
  availableNpcs.sort((a, b) => {
    const aCount = npcArcCounts.get(a.id) || 0;
    const bCount = npcArcCounts.get(b.id) || 0;
    return aCount - bCount;
  });

  // Assign required roles
  let npcIndex = 0;
  for (const role of template.requiredRoles) {
    if (npcIndex >= availableNpcs.length) {
      return null; // Not enough NPCs
    }
    roles[availableNpcs[npcIndex].id] = role;
    npcIndex++;
  }

  // Assign optional roles if NPCs available
  for (const role of template.optionalRoles) {
    if (npcIndex >= availableNpcs.length) break;
    if (Math.random() > 0.5) { // 50% chance to include optional roles
      roles[availableNpcs[npcIndex].id] = role;
      npcIndex++;
    }
  }

  return roles;
}

/**
 * Generate story beats from templates
 */
function generateBeats(
  template: StoryTemplate,
  roles: Record<string, StoryRole>,
  npcs: NPC[],
  arcId: string,
  identity: Identity
): StoryBeat[] {
  const beats: StoryBeat[] = [];
  const npcById = new Map(npcs.map(n => [n.id, n]));

  // Create a reverse mapping: role -> npc name
  const roleToName: Record<string, string> = {};
  for (const [npcId, role] of Object.entries(roles)) {
    const npc = npcById.get(npcId);
    if (npc) {
      roleToName[role] = npc.name;
    }
  }

  // Add player and workplace
  roleToName['player'] = identity.name;
  roleToName['workplace'] = identity.scenario.workplace;

  for (const beatTemplate of template.beatTemplates) {
    // Substitute role names into template
    let content = beatTemplate.template;
    for (const [role, name] of Object.entries(roleToName)) {
      content = content.replace(new RegExp(`\\{${role}\\}`, 'g'), name);
    }

    // Get participants for this beat
    const participants: string[] = [];
    for (const role of beatTemplate.requiredRoles) {
      const npcId = Object.entries(roles).find(([, r]) => r === role)?.[0];
      if (npcId) participants.push(npcId);
    }

    const triggerCondition: TriggerCondition = {
      type: beatTemplate.triggerType,
      value: beatTemplate.triggerType === 'day' ? 1 :
        beatTemplate.triggerType === 'message_count' ? 5 :
          beatTemplate.triggerType === 'tension_threshold' ? 60 : undefined,
      probability: beatTemplate.triggerType === 'random' ? 0.3 : undefined,
    };

    beats.push({
      id: crypto.randomUUID(),
      arcId,
      type: beatTemplate.type,
      title: `${template.name} - ${beatTemplate.phase}`,
      content,
      participants,
      triggered: false,
      triggerCondition,
      playerCanTrigger: true,
      npcCanTrigger: beatTemplate.phase !== 'climax', // Climax usually needs player involvement
      consequences: [],
      prerequisiteBeats: [],
      narrativeWeight: beatTemplate.narrativeWeight,
    });
  }

  // Set up prerequisite chains (each beat requires previous phase beats)
  const phaseOrder: StoryPhase[] = ['setup', 'rising', 'climax', 'resolution', 'aftermath'];
  for (let i = 0; i < beats.length; i++) {
    const beat = beats[i];
    const beatPhaseIndex = phaseOrder.indexOf(template.beatTemplates[i].phase);

    // Find beats from previous phases
    for (let j = 0; j < i; j++) {
      const prevBeatPhaseIndex = phaseOrder.indexOf(template.beatTemplates[j].phase);
      if (prevBeatPhaseIndex < beatPhaseIndex) {
        beat.prerequisiteBeats.push(beats[j].id);
      }
    }
  }

  return beats;
}

/**
 * Generate initial world facts for a story arc
 */
function generateArcFacts(
  template: StoryTemplate,
  roles: Record<string, StoryRole>,
  npcs: NPC[],
  identity: Identity
): WorldFact[] {
  const facts: WorldFact[] = [];
  const npcById = new Map(npcs.map(n => [n.id, n]));

  // Create a reverse mapping: role -> npc
  const roleToNpc: Record<string, NPC> = {};
  for (const [npcId, role] of Object.entries(roles)) {
    const npc = npcById.get(npcId);
    if (npc) {
      roleToNpc[role] = npc;
    }
  }

  // Generate facts based on template category
  switch (template.category) {
    case 'betrayal':
      if (roleToNpc['antagonist']) {
        facts.push({
          id: crypto.randomUUID(),
          content: `${roleToNpc['antagonist'].name} has been secretly betraying trust`,
          category: 'secret',
          importance: 'major',
          knownBy: [Object.keys(roles).find(id => roles[id] === 'antagonist')!],
          learnedWhen: {},
          canSpread: true,
          spreadProbability: 0.2,
          relatedFacts: [],
          source: 'story_generation',
          veracity: 'true',
        });
      }
      break;

    case 'mystery':
      if (roleToNpc['antagonist']) {
        facts.push({
          id: crypto.randomUUID(),
          content: `${roleToNpc['antagonist'].name} is hiding something significant about their past`,
          category: 'secret',
          importance: 'major',
          knownBy: [Object.keys(roles).find(id => roles[id] === 'antagonist')!],
          learnedWhen: {},
          canSpread: false,
          spreadProbability: 0,
          relatedFacts: [],
          source: 'story_generation',
          veracity: 'true',
        });
      }
      break;

    case 'conflict':
      const antagonistId = Object.keys(roles).find(id => roles[id] === 'antagonist');
      const rivalId = Object.keys(roles).find(id => roles[id] === 'rival');
      if (antagonistId && rivalId && roleToNpc['antagonist'] && roleToNpc['rival']) {
        facts.push({
          id: crypto.randomUUID(),
          content: `${roleToNpc['antagonist'].name} and ${roleToNpc['rival'].name} are competing for power/influence`,
          category: 'relationship',
          importance: 'significant',
          knownBy: [antagonistId, rivalId],
          learnedWhen: { [antagonistId]: 1, [rivalId]: 1 },
          canSpread: true,
          spreadProbability: 0.4,
          relatedFacts: [],
          source: 'story_generation',
          veracity: 'true',
        });
      }
      break;
  }

  return facts;
}

/**
 * Generate a complete story arc
 */
export function generateStoryArc(
  params: ArcGenerationParams,
  identity: Identity
): GeneratedArc | null {
  // Get appropriate templates
  const templates = getTemplatesForDifficulty(params.difficulty);

  // Filter by category if specified
  let filteredTemplates = params.category
    ? templates.filter(t => t.category === params.category)
    : templates;

  // Avoid duplicate templates from existing arcs
  const existingTemplateIds = new Set(params.existingArcs.map(a => a.id.split('-')[0]));
  filteredTemplates = filteredTemplates.filter(t => !existingTemplateIds.has(t.id));

  if (filteredTemplates.length === 0) {
    filteredTemplates = templates; // Fallback to all templates
  }

  // Select random template
  const template = filteredTemplates[Math.floor(Math.random() * filteredTemplates.length)];

  // Get available NPCs
  const availableNpcs = params.involvedNpcs
    ? identity.npcs.filter(n => params.involvedNpcs!.includes(n.id))
    : identity.npcs.filter(n => !n.isDead && n.isActive);

  // Assign roles
  const roles = assignRoles(template, availableNpcs, params.existingArcs);
  if (!roles) {
    return null; // Couldn't assign roles
  }

  const arcId = `${template.id}-${crypto.randomUUID().slice(0, 8)}`;

  // Generate beats
  const beats = generateBeats(template, roles, availableNpcs, arcId, identity);

  // Generate initial facts
  const initialFacts = generateArcFacts(template, roles, availableNpcs, identity);

  // Calculate initial tension based on difficulty
  const tensionRange = template.maxTension - template.minTension;
  const baseTension = template.minTension + (params.globalTension / 100) * tensionRange * 0.5;

  // Create the arc
  const arc: StoryArc = {
    id: arcId,
    type: params.existingArcs.length === 0 ? 'main' : 'subplot',
    category: template.category,
    title: template.name,
    premise: template.premise,
    participants: Object.keys(roles),
    roles,
    phase: 'setup',
    beats,
    tension: baseTension,
    playerInvolvement: params.playerInvolvement,
    startDay: params.currentDay,
    childArcIds: [],
    isActive: true,
  };

  // Determine which NPCs know which facts
  const npcKnowledgeUpdates: { npcId: string; factIds: string[] }[] = [];
  for (const fact of initialFacts) {
    for (const npcId of fact.knownBy) {
      const existing = npcKnowledgeUpdates.find(u => u.npcId === npcId);
      if (existing) {
        existing.factIds.push(fact.id);
      } else {
        npcKnowledgeUpdates.push({ npcId, factIds: [fact.id] });
      }
    }
  }

  return {
    arc,
    initialFacts,
    npcKnowledgeUpdates,
  };
}

/**
 * Generate initial story arcs for a new game
 */
export function generateInitialArcs(identity: Identity): GeneratedArc[] {
  const arcs: GeneratedArc[] = [];

  // Determine how many arcs based on difficulty
  const arcCounts: Record<Difficulty, number> = {
    realistic: 2,
    dramatic: 3,
    crazy: 5,
  };

  const targetCount = arcCounts[identity.difficulty];

  // Generate main arc first
  const mainArc = generateStoryArc({
    playerInvolvement: 'central',
    difficulty: identity.difficulty,
    existingArcs: [],
    currentDay: 1,
    globalTension: identity.difficulty === 'crazy' ? 60 : identity.difficulty === 'dramatic' ? 40 : 20,
  }, identity);

  if (mainArc) {
    arcs.push(mainArc);
  }

  // Generate subplots
  const categories: StoryCategory[] = ['betrayal', 'conflict', 'mystery', 'crisis', 'secret', 'revenge'];
  const usedCategories = new Set<string>();

  if (mainArc) {
    usedCategories.add(mainArc.arc.category);
  }

  while (arcs.length < targetCount) {
    // Pick a category we haven't used
    const availableCategories = categories.filter(c => !usedCategories.has(c));
    const category = availableCategories.length > 0
      ? availableCategories[Math.floor(Math.random() * availableCategories.length)]
      : categories[Math.floor(Math.random() * categories.length)];

    const subplot = generateStoryArc({
      category,
      playerInvolvement: Math.random() > 0.5 ? 'peripheral' : 'discovering',
      difficulty: identity.difficulty,
      existingArcs: arcs.map(a => a.arc),
      currentDay: 1,
      globalTension: identity.difficulty === 'crazy' ? 60 : identity.difficulty === 'dramatic' ? 40 : 20,
    }, identity);

    if (subplot) {
      arcs.push(subplot);
      usedCategories.add(category);
    } else {
      break; // Can't generate more arcs
    }
  }

  return arcs;
}

/**
 * Generate an emergent arc from NPC interactions
 */
export function generateEmergentArc(
  triggerNpcs: string[],
  state: NarrativeState,
  identity: Identity
): GeneratedArc | null {
  // Look for template that fits these NPCs
  const templates = getTemplatesForDifficulty(state.difficulty);

  // Prefer templates with exactly the right number of required roles
  const suitableTemplates = templates.filter(t =>
    t.requiredRoles.length <= triggerNpcs.length
  );

  if (suitableTemplates.length === 0) return null;

  const template = suitableTemplates[Math.floor(Math.random() * suitableTemplates.length)];

  return generateStoryArc({
    involvedNpcs: triggerNpcs,
    playerInvolvement: 'discovering',
    difficulty: state.difficulty,
    existingArcs: state.activeArcs,
    currentDay: state.currentDay,
    globalTension: state.globalTension,
  }, identity);
}
