/**
 * Scenario Generator
 *
 * Generates opening scenarios for individual NPCs.
 * Simplified approach - scenarios are based on NPC's actual backstory and personality.
 */

import { NPC, Identity, SimulationEvent } from '../types';

/**
 * Generate an opening scenario for an NPC on Day 1
 * Uses the NPC's actual backstory to create a personalized opening
 */
export function generateDay1Scenario(
  npc: NPC,
  identity: Identity
): string {
  const bullets = npc.bullets || [];
  const personality = npc.personality || '';
  const role = npc.role || '';
  const emotionalStates = npc.currentEmotionalState || ['neutral'];

  // Get the NPC's hidden secret/motivation from bullet 2
  const publicInfo = bullets[0] || '';
  const hiddenInfo = bullets[1] || '';

  // Determine emotional undertone from current state
  const primaryEmotion = emotionalStates[0] || 'neutral';

  // Build a scenario that hints at their personality/situation without being generic
  const emotionDescriptors: Record<string, string> = {
    neutral: 'with a measured expression',
    happy: 'with a warm smile',
    sad: 'looking somewhat down',
    angry: 'with barely contained frustration',
    anxious: 'fidgeting nervously',
    jealous: 'with an intense, searching look',
    lustful: 'with a knowing smile',
    horny: 'letting their eyes linger on you',
    seductive: 'moving closer than necessary',
    manipulative: 'with a calculated charm',
    scheming: 'with a glint in their eye',
    suspicious: 'watching you carefully',
    paranoid: 'glancing around nervously',
    guilty: 'avoiding your eyes',
    desperate: 'with urgent energy',
    hopeful: 'with cautious optimism',
    curious: 'studying you with interest',
    determined: 'with unwavering focus',
    conflicted: 'seeming torn about something',
    vulnerable: 'unusually open',
  };

  const emotionDesc = emotionDescriptors[primaryEmotion] || 'with an unreadable expression';

  // Create scenario based on their role/relationship type
  const roleLower = role.toLowerCase();

  // Detect relationship category
  let relationshipType = 'acquaintance';
  if (roleLower.includes('wife') || roleLower.includes('husband') || roleLower.includes('spouse') || roleLower.includes('partner')) {
    relationshipType = 'romantic';
  } else if (roleLower.includes('boss') || roleLower.includes('manager') || roleLower.includes('supervisor')) {
    relationshipType = 'superior';
  } else if (roleLower.includes('coworker') || roleLower.includes('colleague')) {
    relationshipType = 'colleague';
  } else if (roleLower.includes('friend') || roleLower.includes('bestie') || roleLower.includes('buddy')) {
    relationshipType = 'friend';
  } else if (roleLower.includes('mother') || roleLower.includes('father') || roleLower.includes('parent') || roleLower.includes('mom') || roleLower.includes('dad')) {
    relationshipType = 'parent';
  } else if (roleLower.includes('sibling') || roleLower.includes('sister') || roleLower.includes('brother')) {
    relationshipType = 'sibling';
  } else if (roleLower.includes('neighbor')) {
    relationshipType = 'neighbor';
  } else if (roleLower.includes('rival') || roleLower.includes('enemy') || roleLower.includes('predator')) {
    relationshipType = 'rival';
  } else if (roleLower.includes('seducer') || roleLower.includes('seductress') || roleLower.includes('lover') || roleLower.includes('affair') || roleLower.includes('mistress')) {
    relationshipType = 'romantic_tension';
  }

  // Opening scenarios by relationship type with more variety
  const openings: Record<string, string[]> = {
    romantic: [
      `*${npc.name} is waiting for you ${emotionDesc}.* "There you are. We need to talk."`,
      `*You find ${npc.name} in the bedroom, ${emotionDesc}.* "Sit down. I've been thinking about us."`,
      `*${npc.name} looks up as you enter, ${emotionDesc}.* "I wasn't sure you'd come home tonight."`,
    ],
    romantic_tension: [
      `*${npc.name} corners you somewhere private, ${emotionDesc}.* "Finally, I have you alone."`,
      `*${npc.name} appears beside you, ${emotionDesc}.* "I've been watching you. Waiting for the right moment."`,
      `*${npc.name} blocks your path, ${emotionDesc}.* "Don't pretend you haven't noticed me looking at you."`,
    ],
    superior: [
      `*${npc.name} calls you into their office, ${emotionDesc}.* "Close the door. This is between us."`,
      `*${npc.name} intercepts you in the hallway, ${emotionDesc}.* "My office. Now. We need to discuss something."`,
      `*${npc.name} is waiting at your desk when you arrive, ${emotionDesc}.* "We need to have a conversation."`,
    ],
    colleague: [
      `*${npc.name} pulls you aside near the break room, ${emotionDesc}.* "Hey, can we talk? Not here though."`,
      `*${npc.name} catches you in the elevator, ${emotionDesc}.* "Perfect timing. I need to tell you something."`,
      `*${npc.name} slides into the seat next to you, ${emotionDesc}.* "You're not going to believe what I found out."`,
    ],
    friend: [
      `*${npc.name} shows up unannounced, ${emotionDesc}.* "Sorry for just showing up. I needed to see you."`,
      `*You meet ${npc.name} at your usual spot. They look at you ${emotionDesc}.* "Thanks for coming. I didn't know who else to call."`,
      `*${npc.name} grabs your arm, ${emotionDesc}.* "I need to tell you something. Promise you won't freak out."`,
    ],
    parent: [
      `*${npc.name} is waiting in the kitchen, ${emotionDesc}.* "Sit down. We're going to have a real conversation."`,
      `*${npc.name} catches you at the door, ${emotionDesc}.* "Not so fast. We need to talk about something."`,
      `*${npc.name} looks at you ${emotionDesc}.* "I've been waiting to have this conversation with you."`,
    ],
    sibling: [
      `*${npc.name} barges in without knocking, ${emotionDesc}.* "We need to talk. Now."`,
      `*${npc.name} pulls you into an empty room, ${emotionDesc}.* "I found something out. About the family."`,
      `*${npc.name} texts you to meet somewhere private. When you arrive, they look at you ${emotionDesc}.* "Thanks for coming."`,
    ],
    neighbor: [
      `*${npc.name} flags you down outside, ${emotionDesc}.* "Hey, got a second? Something happened."`,
      `*There's a knock at your door. It's ${npc.name}, ${emotionDesc}.* "Sorry to bother you, but I thought you should know..."`,
      `*${npc.name} catches you in the hallway, ${emotionDesc}.* "Can we talk? Privately?"`,
    ],
    rival: [
      `*${npc.name} approaches you, ${emotionDesc}.* "Well, well. Didn't expect to see you here."`,
      `*${npc.name} blocks your path, ${emotionDesc}.* "We have unfinished business, you and I."`,
      `*${npc.name} finds you alone, ${emotionDesc}.* "I think it's time we had a little chat."`,
    ],
    acquaintance: [
      `*${npc.name} approaches you, ${emotionDesc}.* "I've been meaning to talk to you about something."`,
      `*${npc.name} catches your attention, ${emotionDesc}.* "Do you have a moment? It's important."`,
      `*You notice ${npc.name} watching you. They approach ${emotionDesc}.* "Can we talk somewhere private?"`,
    ],
  };

  const scenarios = openings[relationshipType] || openings.acquaintance;
  return scenarios[Math.floor(Math.random() * scenarios.length)];
}

/**
 * Generate a scenario based on a simulation event
 * Used when simulation completes to update NPC opening scenarios
 */
export function generateEventBasedScenario(
  npc: NPC,
  event: SimulationEvent,
  identity: Identity
): string {
  const npcFirstName = npc.name.split(' ')[0];
  const eventLower = event.description.toLowerCase();
  const wasDirectlyInvolved = eventLower.includes(npc.name.toLowerCase()) ||
                               eventLower.includes(npcFirstName.toLowerCase());

  // Emotional reactions based on severity
  const reactions: Record<string, string[]> = {
    minor: [
      `*${npc.name} seems distracted.* "Hey. Did you hear about what happened?"`,
      `*${npc.name} looks up as you approach.* "Things have been weird, haven't they?"`,
    ],
    moderate: [
      `*${npc.name} looks troubled when they see you.* "We should talk about yesterday."`,
      `*${npc.name} pulls you aside.* "I need to tell you something about what happened."`,
    ],
    major: [
      `*${npc.name} grabs your arm the moment they see you.* "Did you hear? Everything's different now."`,
      `*${npc.name} looks shaken.* "I can't believe what happened. We need to talk."`,
    ],
    'life-changing': [
      `*${npc.name}'s composure is barely held together.* "Everything's falling apart."`,
      `*${npc.name} is pacing when you find them.* "You need to know the truth."`,
    ],
  };

  let scenario: string;

  if (wasDirectlyInvolved) {
    const personalReactions = [
      `*${npc.name} avoids your eyes.* "You probably heard what happened with me..."`,
      `*${npc.name} takes a deep breath.* "Before you say anything, let me explain."`,
      `*${npc.name} looks exhausted.* "I know you must have questions."`,
    ];
    scenario = personalReactions[Math.floor(Math.random() * personalReactions.length)];
  } else {
    const severityReactions = reactions[event.severity] || reactions.moderate;
    scenario = severityReactions[Math.floor(Math.random() * severityReactions.length)];
  }

  return scenario;
}

/**
 * Generate a random new scenario for an NPC (when no simulation event involves them)
 */
export function generateRandomScenario(
  npc: NPC,
  identity: Identity
): string {
  const scenarios = [
    `*${npc.name} catches your attention.* "Perfect timing. I was thinking about you."`,
    `*You run into ${npc.name}.* "Oh! I've been meaning to talk to you."`,
    `*${npc.name} waves you over.* "Got a minute? Something's on my mind."`,
    `*${npc.name} looks up as you approach.* "Hey you. We should catch up."`,
    `*${npc.name} seems relieved to see you.* "Finally! I wanted to ask you something."`,
  ];

  return scenarios[Math.floor(Math.random() * scenarios.length)];
}

/**
 * Helper to get severity score for sorting
 */
export function severityScore(severity: string): number {
  const scores: Record<string, number> = {
    'minor': 1,
    'moderate': 2,
    'major': 3,
    'life-changing': 4,
    'explosive': 4,
  };
  return scores[severity] || 2;
}
