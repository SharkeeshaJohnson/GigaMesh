import { NPCTier } from './types';

export const MODEL_CONFIG = {
  // === 30B+ Models Only for NPCs (smaller models produce repetitive output) ===

  // Core NPCs (spouse, boss) - using Qwen 30B (Llama causes 500 errors)
  coreNPC: 'fireworks/accounts/fireworks/models/qwen3-30b-a3b',

  // Secondary NPCs (close family, key coworkers)
  secondaryNPC: 'fireworks/accounts/fireworks/models/qwen3-30b-a3b',

  // Tertiary NPCs (extended cast, emergent characters) - still needs quality
  tertiaryNPC: 'fireworks/accounts/fireworks/models/qwen3-30b-a3b',

  // Scenario generation
  scenarioGeneration: 'fireworks/accounts/fireworks/models/qwen3-30b-a3b',

  // Simulation events
  simulation: 'fireworks/accounts/fireworks/models/qwen3-30b-a3b',

  // === Standard Models (non-roleplay tasks can use smaller models) ===

  // Memory extraction (structured output, smaller model OK)
  memoryExtraction: 'fireworks/accounts/fireworks/models/qwen3-30b-a3b',

  // Embeddings - content-agnostic vector math
  embedding: 'openai/text-embedding-3-small',

  // Fallback fast model - for non-roleplay tasks only
  fallbackFast: 'fireworks/accounts/fireworks/models/qwen3-30b-a3b',
} as const;

export type ModelConfigKey = keyof typeof MODEL_CONFIG;

/**
 * Pool of diverse models to assign to NPCs for varied response styles.
 * Each model has different "personality" in how it writes, creating natural variety.
 * Models are filtered by useModels() availability at runtime.
 *
 * ORDER MATTERS: NPCs are assigned models in order (NPC 0 gets model 0, etc.)
 * So we interleave different model families to maximize variety in conversations.
 *
 * BANNED MODELS (output garbage/code or repetitive):
 * - mixtral-8x22b-instruct (outputs C code)
 * - mixtral-8x7b-instruct (unreliable for roleplay)
 * - mistral-7b-instruct-v3 (too small, goes off-rails)
 * - qwen3-8b (too small, produces repetitive outputs, ignores instructions)
 * - llama-v3p1-8b-instruct (too small for complex roleplay)
 *
 * ONLY USE 30B+ MODELS for NPCs - smaller models produce repetitive/low-quality outputs
 */
export const NPC_MODEL_POOL = [
  // Diverse models for varied NPC personalities
  // Testing multiple models - if one causes 500 errors, it will be filtered out by availability check
  'fireworks/accounts/fireworks/models/qwen3-30b-a3b',            // NPC 0: Qwen 30B - dramatic, creative
  'fireworks/accounts/fireworks/models/qwen2p5-72b-instruct',     // NPC 1: Qwen 2.5 72B - analytical, detailed
  'fireworks/accounts/fireworks/models/llama-v3p1-70b-instruct',  // NPC 2: Llama 3.1 70B - grounded, stable
  'fireworks/accounts/fireworks/models/deepseek-v3',              // NPC 3: DeepSeek V3 - reasoning focused
  'fireworks/accounts/fireworks/models/qwen2-72b-instruct',       // NPC 4: Qwen 2 72B - different style
  // Cycles back for NPC 5+
];

/**
 * Filter model pool to only include models that are available.
 * Called with the result of useModels() hook.
 */
export function filterAvailableModels(availableModels: { id?: string; name?: string }[]): string[] {
  if (!availableModels || availableModels.length === 0) {
    // Fallback to Qwen if no models list available
    return [MODEL_CONFIG.coreNPC, MODEL_CONFIG.secondaryNPC, MODEL_CONFIG.tertiaryNPC];
  }

  const availableIds = new Set(availableModels.map(m => m.id || m.name || '').filter(Boolean));

  // Log all available models from API for debugging
  console.log('[Models] All API models:', Array.from(availableIds).map(m => m.split('/').pop()));

  // Filter our pool to only available models
  const filtered = NPC_MODEL_POOL.filter(model => availableIds.has(model));

  // Log which of our preferred models are available
  console.log('[Models] Our pool models available:', filtered.map(m => m.split('/').pop()));

  // If none of our preferred models are available, use whatever is available
  if (filtered.length === 0) {
    // Get first few available models (prefer larger ones)
    const chatModels = availableModels
      .filter(m => {
        const id = (m.id || m.name || '').toLowerCase();
        // Skip embedding models and very small models
        return !id.includes('embed') && !id.includes('whisper');
      })
      .slice(0, 5)
      .map(m => m.id || m.name || '');

    return chatModels.length > 0 ? chatModels : [MODEL_CONFIG.fallbackFast];
  }

  return filtered;
}

/**
 * Assign models to NPCs to ensure variety.
 * Each NPC gets a different model where possible.
 */
export function assignModelsToNPCs(
  npcs: { id: string; tier: NPCTier; assignedModel?: string }[],
  availableModels: string[]
): Map<string, string> {
  const assignments = new Map<string, string>();

  if (availableModels.length === 0) {
    // Fallback - use tier-based assignment
    for (const npc of npcs) {
      assignments.set(npc.id, getModelForNPCTier(npc.tier));
    }
    return assignments;
  }

  // Shuffle models for random assignment
  const shuffled = [...availableModels].sort(() => Math.random() - 0.5);

  // Assign models round-robin to ensure maximum variety
  npcs.forEach((npc, index) => {
    // If NPC already has an assigned model and it's available, keep it
    if (npc.assignedModel && availableModels.includes(npc.assignedModel)) {
      assignments.set(npc.id, npc.assignedModel);
    } else {
      // Assign from shuffled pool, cycling through
      const modelIndex = index % shuffled.length;
      assignments.set(npc.id, shuffled[modelIndex]);
    }
  });

  return assignments;
}

// Helper to get model based on NPC tier (legacy fallback)
export function getModelForNPCTier(tier: NPCTier): string {
  switch (tier) {
    case 'core':
      return MODEL_CONFIG.coreNPC;
    case 'secondary':
      return MODEL_CONFIG.secondaryNPC;
    case 'tertiary':
      return MODEL_CONFIG.tertiaryNPC;
    default:
      return MODEL_CONFIG.tertiaryNPC;
  }
}

/**
 * Get model for a specific NPC, using assigned model if available.
 */
export function getModelForNPC(npc: { tier: NPCTier; assignedModel?: string }): string {
  if (npc.assignedModel) {
    return npc.assignedModel;
  }
  return getModelForNPCTier(npc.tier);
}
