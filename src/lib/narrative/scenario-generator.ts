/**
 * Scenario Generator
 *
 * Generates opening scenarios for individual NPCs using LLM calls.
 * Each scenario is dynamically generated based on:
 * - NPC's personality
 * - NPC's bullet points (background info)
 * - NPC's offScreenMemories (simulation events)
 * - Current emotional state
 * - Player's name and difficulty mode
 */

import { NPC, Identity, SimulationEvent } from '../types';
import { MODEL_CONFIG } from '../models';
import { stripModelArtifacts, extractTextContent } from '../llm-utils';

/**
 * Message type for LLM calls
 */
interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/**
 * SendMessage function type (passed from component with useChat hook)
 */
type SendMessageFn = (params: {
  messages: ChatMessage[];
  model: string;
}) => Promise<unknown>;

/**
 * Build the prompt for generating an opening scenario
 */
function buildScenarioPrompt(
  npc: NPC,
  identity: Identity,
  context?: string
): string {
  const bullets = npc.bullets || [];
  const personality = npc.personality || 'mysterious';
  const emotionalStates = npc.currentEmotionalState || ['neutral'];
  const offScreenMemories = npc.offScreenMemories || [];

  // Get emotional state as string
  const emotionalState = Array.isArray(emotionalStates)
    ? emotionalStates.join(', ')
    : emotionalStates;

  // Build bullet points section
  const bulletSection = bullets.length > 0
    ? bullets.map((b, i) => `  ${i + 1}. ${b}`).join('\n')
    : '  (No specific background provided)';

  // Build memories section
  const memoriesSection = offScreenMemories.length > 0
    ? offScreenMemories.map(m => `  - ${m}`).join('\n')
    : '  (No recent memories)';

  // Additional context (e.g., recent simulation event)
  const contextSection = context
    ? `\n=== RECENT EVENT ===\n${context}\n`
    : '';

  return `Generate a short opening scenario for an NPC greeting the player in a life simulation game.

=== NPC DETAILS ===
NAME: ${npc.name}
PERSONALITY: ${personality}
CURRENT EMOTIONAL STATE: ${emotionalState}

BACKGROUND (what you know about them):
${bulletSection}

RECENT MEMORIES/EVENTS:
${memoriesSection}
${contextSection}
=== PLAYER ===
NAME: ${identity.name}
DIFFICULTY: ${identity.difficulty} (${identity.difficulty === 'crazy' ? 'anything goes, dark/explicit content allowed' : identity.difficulty === 'dramatic' ? 'dramatic and intense' : 'realistic and grounded'})

=== INSTRUCTIONS ===
Write a brief opening scenario (2-3 sentences) that:
1. Shows the NPC approaching or encountering the player
2. Reflects their personality and current emotional state
3. Hints at something from their background or recent memories WITHOUT being obvious
4. Uses italics for actions (*action*) and quotes for dialogue ("dialogue")
5. Creates intrigue and makes the player want to engage
6. Fits the difficulty tone (${identity.difficulty})

DO NOT:
- Be generic (avoid "Hey there" or "How are you?")
- Mention their background facts directly
- Use the same patterns repeatedly
- Make it too long (keep it punchy)

Return ONLY the scenario text, nothing else. No explanation, no prefix.`;
}

/**
 * Extract scenario from LLM response
 */
function extractScenarioFromResponse(response: unknown): string | null {
  try {
    // Handle various response structures
    const r = response as Record<string, unknown>;
    const paths = [
      (r?.data as Record<string, unknown>)?.data,
      r?.data,
      r,
    ];

    for (const base of paths) {
      if (!base) continue;
      const b = base as Record<string, unknown>;
      const choices = b?.choices as Array<{ message?: { content?: unknown } }>;
      if (choices?.[0]?.message?.content) {
        const extracted = extractTextContent(choices[0].message.content);
        if (extracted) {
          return stripModelArtifacts(extracted).trim();
        }
      }
      // Try direct content paths
      const directContent =
        (b as { message?: { content?: unknown } })?.message?.content ||
        (b as { content?: unknown })?.content ||
        (b as { text?: unknown })?.text;
      if (directContent) {
        const extracted = extractTextContent(directContent);
        if (extracted) {
          return stripModelArtifacts(extracted).trim();
        }
      }
    }
  } catch (e) {
    console.error('[ScenarioGen] Failed to extract scenario from response:', e);
  }
  return null;
}

/**
 * Fallback scenarios when LLM call fails
 * These are still personalized using NPC name and emotional state
 */
function getFallbackScenario(npc: NPC): string {
  const emotionalStates = npc.currentEmotionalState || ['neutral'];
  const primaryEmotion = Array.isArray(emotionalStates) ? emotionalStates[0] : emotionalStates;

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

  const fallbacks = [
    `*${npc.name} approaches you ${emotionDesc}.* "We need to talk. Alone."`,
    `*${npc.name} catches your attention ${emotionDesc}.* "I've been meaning to find you."`,
    `*You notice ${npc.name} watching you. They approach ${emotionDesc}.* "Do you have a moment?"`,
    `*${npc.name} appears ${emotionDesc}.* "I need to tell you something."`,
    `*${npc.name} corners you ${emotionDesc}.* "Before you say anything, just listen."`,
  ];

  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}

/**
 * Generate an opening scenario for an NPC on Day 1
 * Uses LLM to create a personalized opening based on NPC's full context
 * @param model - Optional model to use (defaults to NPC's assignedModel or scenarioGeneration config)
 */
export async function generateDay1Scenario(
  npc: NPC,
  identity: Identity,
  sendMessage?: SendMessageFn,
  model?: string
): Promise<string> {
  // If no sendMessage provided, return fallback
  if (!sendMessage) {
    console.log(`[ScenarioGen] No sendMessage for ${npc.name}, using fallback`);
    return getFallbackScenario(npc);
  }

  // Use provided model, NPC's assigned model, or default config
  const modelToUse = model || npc.assignedModel || MODEL_CONFIG.scenarioGeneration;

  try {
    const prompt = buildScenarioPrompt(npc, identity);

    console.log(`[ScenarioGen] Generating Day 1 scenario for ${npc.name} with model ${modelToUse}...`);

    const response = await sendMessage({
      messages: [
        {
          role: 'system',
          content: 'You are a creative writer for a life simulation game. Write immersive, character-driven opening scenarios. Keep them short and intriguing.',
        },
        { role: 'user', content: prompt },
      ],
      model: modelToUse,
    });

    const scenario = extractScenarioFromResponse(response);

    if (scenario && scenario.length > 10) {
      console.log(`[ScenarioGen] Generated scenario for ${npc.name}: ${scenario.substring(0, 50)}...`);
      return scenario;
    }

    console.log(`[ScenarioGen] Empty/short response for ${npc.name}, using fallback`);
    return getFallbackScenario(npc);
  } catch (error) {
    console.error(`[ScenarioGen] LLM error for ${npc.name}:`, error);
    return getFallbackScenario(npc);
  }
}

/**
 * Generate a scenario based on a simulation event
 * Used when simulation completes to update NPC opening scenarios
 * @param model - Optional model to use (defaults to NPC's assignedModel or scenarioGeneration config)
 */
export async function generateEventBasedScenario(
  npc: NPC,
  event: SimulationEvent,
  identity: Identity,
  sendMessage?: SendMessageFn,
  model?: string
): Promise<string> {
  // Build event context
  const eventContext = `
EVENT TITLE: ${event.title}
EVENT DESCRIPTION: ${event.description}
SEVERITY: ${event.severity}
INVOLVED: ${event.involvedNpcs?.join(', ') || 'Unknown'}

This NPC ${event.involvedNpcs?.some(n =>
  n.toLowerCase().includes(npc.name.split(' ')[0].toLowerCase())
) ? 'was directly involved in' : 'knows about'} this event.`;

  // If no sendMessage provided, use simple fallback
  if (!sendMessage) {
    console.log(`[ScenarioGen] No sendMessage for event scenario ${npc.name}, using fallback`);
    return getEventFallbackScenario(npc, event);
  }

  // Use provided model, NPC's assigned model, or default config
  const modelToUse = model || npc.assignedModel || MODEL_CONFIG.scenarioGeneration;

  try {
    const prompt = buildScenarioPrompt(npc, identity, eventContext);

    console.log(`[ScenarioGen] Generating event-based scenario for ${npc.name} with model ${modelToUse}...`);

    const response = await sendMessage({
      messages: [
        {
          role: 'system',
          content: 'You are a creative writer for a life simulation game. Write immersive opening scenarios that reflect recent dramatic events. The NPC should be affected by what happened.',
        },
        { role: 'user', content: prompt },
      ],
      model: modelToUse,
    });

    const scenario = extractScenarioFromResponse(response);

    if (scenario && scenario.length > 10) {
      console.log(`[ScenarioGen] Generated event scenario for ${npc.name}: ${scenario.substring(0, 50)}...`);
      return scenario;
    }

    return getEventFallbackScenario(npc, event);
  } catch (error) {
    console.error(`[ScenarioGen] LLM error for event scenario ${npc.name}:`, error);
    return getEventFallbackScenario(npc, event);
  }
}

/**
 * Fallback for event-based scenarios
 */
function getEventFallbackScenario(npc: NPC, event: SimulationEvent): string {
  const npcFirstName = npc.name.split(' ')[0];
  const eventLower = event.description.toLowerCase();
  const wasDirectlyInvolved = eventLower.includes(npc.name.toLowerCase()) ||
                               eventLower.includes(npcFirstName.toLowerCase());

  if (wasDirectlyInvolved) {
    const personalReactions = [
      `*${npc.name} avoids your eyes.* "You probably heard what happened with me..."`,
      `*${npc.name} takes a deep breath.* "Before you say anything, let me explain."`,
      `*${npc.name} looks exhausted.* "I know you must have questions."`,
    ];
    return personalReactions[Math.floor(Math.random() * personalReactions.length)];
  }

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

  const severityReactions = reactions[event.severity] || reactions.moderate;
  return severityReactions[Math.floor(Math.random() * severityReactions.length)];
}

/**
 * Generate a random new scenario for an NPC (when no simulation event involves them)
 * @param model - Optional model to use (defaults to NPC's assignedModel or scenarioGeneration config)
 */
export async function generateRandomScenario(
  npc: NPC,
  identity: Identity,
  sendMessage?: SendMessageFn,
  model?: string
): Promise<string> {
  // If no sendMessage, use simple fallback
  if (!sendMessage) {
    console.log(`[ScenarioGen] No sendMessage for random scenario ${npc.name}, using fallback`);
    return getRandomFallbackScenario(npc);
  }

  // Use provided model, NPC's assigned model, or default config
  const modelToUse = model || npc.assignedModel || MODEL_CONFIG.scenarioGeneration;

  try {
    // Add context about it being a "new day" scenario
    const dayContext = `
This is a new day. The NPC has had time to think and may have new concerns,
observations, or things they want to discuss. Generate something that feels
like a natural continuation of their life, not necessarily related to any specific event.`;

    const prompt = buildScenarioPrompt(npc, identity, dayContext);

    console.log(`[ScenarioGen] Generating random scenario for ${npc.name} with model ${modelToUse}...`);

    const response = await sendMessage({
      messages: [
        {
          role: 'system',
          content: 'You are a creative writer for a life simulation game. Write varied, interesting opening scenarios for a new day. Make each one feel fresh and unique to the character.',
        },
        { role: 'user', content: prompt },
      ],
      model: modelToUse,
    });

    const scenario = extractScenarioFromResponse(response);

    if (scenario && scenario.length > 10) {
      console.log(`[ScenarioGen] Generated random scenario for ${npc.name}: ${scenario.substring(0, 50)}...`);
      return scenario;
    }

    return getRandomFallbackScenario(npc);
  } catch (error) {
    console.error(`[ScenarioGen] LLM error for random scenario ${npc.name}:`, error);
    return getRandomFallbackScenario(npc);
  }
}

/**
 * Fallback for random scenarios
 */
function getRandomFallbackScenario(npc: NPC): string {
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

/**
 * Batch generate scenarios for multiple NPCs (more efficient)
 * Used during identity creation
 */
export async function generateScenariosForNPCs(
  npcs: NPC[],
  identity: Identity,
  sendMessage?: SendMessageFn
): Promise<Map<string, string>> {
  const scenarios = new Map<string, string>();

  // Generate scenarios sequentially to avoid rate limiting
  for (const npc of npcs) {
    if (npc.isDead) {
      scenarios.set(npc.id, '');
      continue;
    }

    const scenario = await generateDay1Scenario(npc, identity, sendMessage);
    scenarios.set(npc.id, scenario);

    // Small delay between requests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return scenarios;
}
