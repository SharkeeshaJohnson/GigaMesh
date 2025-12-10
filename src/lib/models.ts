import { NPCTier } from './types';

export const MODEL_CONFIG = {
  // === Qwen3 (use /no_think to disable thinking) ===

  // Core NPCs (spouse, boss)
  coreNPC: 'fireworks/accounts/fireworks/models/qwen3-30b-a3b',

  // Secondary NPCs (close family, key coworkers)
  secondaryNPC: 'fireworks/accounts/fireworks/models/qwen3-30b-a3b',

  // Tertiary NPCs (extended cast, emergent characters)
  tertiaryNPC: 'fireworks/accounts/fireworks/models/qwen3-8b',

  // Scenario generation
  scenarioGeneration: 'fireworks/accounts/fireworks/models/qwen3-30b-a3b',

  // Simulation events
  simulation: 'fireworks/accounts/fireworks/models/qwen3-30b-a3b',

  // === Standard Models ===

  // Memory extraction
  memoryExtraction: 'fireworks/accounts/fireworks/models/qwen3-8b',

  // Embeddings - content-agnostic vector math
  embedding: 'openai/text-embedding-3-small',

  // Fallback fast model
  fallbackFast: 'fireworks/accounts/fireworks/models/qwen3-8b',
} as const;

export type ModelConfigKey = keyof typeof MODEL_CONFIG;

/**
 * Pool of diverse models to assign to NPCs for varied response styles.
 * Each model has different "personality" in how it writes, creating natural variety.
 * Models are filtered by useModels() availability at runtime.
 */
export const NPC_MODEL_POOL = [
  // Qwen models - good at roleplay, tend to be dramatic
  'fireworks/accounts/fireworks/models/qwen3-30b-a3b',
  'fireworks/accounts/fireworks/models/qwen3-8b',

  // Llama models - more grounded, realistic
  'fireworks/accounts/fireworks/models/llama-v3p1-70b-instruct',
  'fireworks/accounts/fireworks/models/llama-v3p1-8b-instruct',
  'fireworks/accounts/fireworks/models/llama-v3p3-70b-instruct',

  // Mistral models - concise, direct style
  'fireworks/accounts/fireworks/models/mistral-7b-instruct-v3',
  'fireworks/accounts/fireworks/models/mixtral-8x7b-instruct',
  'fireworks/accounts/fireworks/models/mixtral-8x22b-instruct',

  // DeepSeek - analytical, methodical
  'fireworks/accounts/fireworks/models/deepseek-v3',

  // Gemma - Google's model, different flavor
  'fireworks/accounts/fireworks/models/gemma2-9b-it',
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

  // Filter our pool to only available models
  const filtered = NPC_MODEL_POOL.filter(model => availableIds.has(model));

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
