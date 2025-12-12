export const MODEL_CONFIG = {
  // === Using Grok 2 as default (reliable, unfiltered) ===
  // Format: provider/model-name

  // Default NPC model - fallback if no assigned model
  npc: 'grok/grok-2-1212',

  // Scenario generation
  scenarioGeneration: 'grok/grok-2-1212',

  // Simulation events
  simulation: 'grok/grok-2-1212',

  // === Standard Models ===

  // Memory extraction (structured output)
  memoryExtraction: 'grok/grok-2-1212',

  // Embeddings - content-agnostic vector math
  embedding: 'openai/text-embedding-3-small',

  // Fallback fast model
  fallbackFast: 'grok/grok-2-1212',
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
 * - qwen3-8b (too small, produces repetitive outputs)
 * - Models with 'embed', 'rerank', 'vision', 'vl', 'image', 'audio', 'veo', 'flux' in name
 *
 * Model IDs match the Portals API short names (not full Fireworks paths)
 */
export const NPC_MODEL_POOL = [
  // Diverse models for varied NPC personalities - using full provider/model format
  // Each NPC gets a different model for unique "voice" in scenarios
  'grok/grok-2-1212',                                           // NPC 0: Grok 2 - edgy, unfiltered
  'fireworks/accounts/fireworks/models/deepseek-v3-0324',       // NPC 1: DeepSeek V3 - reasoning focused
  'fireworks/accounts/fireworks/models/qwen3-30b-a3b',          // NPC 2: Qwen 30B - creative, expressive
  // Note: Only 3 NPCs now, so we only need 3 diverse models
];

/**
 * Filter model pool to only include models that are available.
 * Called with the result of useModels() hook.
 *
 * Portals API uses provider/model format (e.g., grok/grok-2-1212)
 * We need to find our pool models in the API list and return the API format.
 */
export function filterAvailableModels(availableModels: { id?: string; name?: string }[]): string[] {
  if (!availableModels || availableModels.length === 0) {
    // Fallback to Qwen if no models list available
    return [MODEL_CONFIG.npc];
  }

  // Get all available model IDs
  const availableIds = availableModels.map(m => m.id || m.name || '').filter(Boolean);

  // Log first 20 available models to see format
  console.log('[Models] Sample API models:', availableIds.slice(0, 20));

  // Match pool short names to API model IDs
  const filtered: string[] = [];

  for (const poolModel of NPC_MODEL_POOL) {
    const poolModelLower = poolModel.toLowerCase();

    // Find matching API model
    const matchedApiModel = availableIds.find(apiId => {
      const apiIdLower = apiId.toLowerCase();
      // Extract just the model name from API ID (last part after /)
      const apiModelName = apiIdLower.split('/').pop() || apiIdLower;

      // Match if: exact match, or model name matches our pool model
      return apiIdLower === poolModelLower ||
             apiModelName === poolModelLower ||
             apiIdLower.endsWith('/' + poolModelLower);
    });

    if (matchedApiModel) {
      console.log(`[Models] Matched ${poolModel} -> ${matchedApiModel}`);
      filtered.push(matchedApiModel);
    } else {
      console.log(`[Models] No match for ${poolModel}`);
    }
  }

  // Log which of our preferred models are available
  console.log('[Models] Pool models matched:', filtered);

  // If none of our preferred models are available, pick diverse chat models from API
  if (filtered.length === 0) {
    console.log('[Models] No pool models found, selecting from API...');

    // Skip non-chat models
    const skipPatterns = ['embed', 'whisper', 'rerank', 'vision', 'vl-', '-vl', 'image', 'audio', 'veo', 'flux', 'imagen'];

    const chatModels = availableModels
      .filter(m => {
        const id = (m.id || m.name || '').toLowerCase();
        return !skipPatterns.some(pattern => id.includes(pattern));
      })
      .map(m => m.id || m.name || '')
      .filter(Boolean)
      .slice(0, 10); // Get first 10 available chat models

    console.log('[Models] Fallback chat models:', chatModels);
    return chatModels.length > 0 ? chatModels : [MODEL_CONFIG.fallbackFast];
  }

  return filtered;
}

/**
 * Helper to check if a model ID matches (handles short name vs full path)
 */
function modelMatches(modelA: string, modelB: string): boolean {
  const a = modelA.toLowerCase();
  const b = modelB.toLowerCase();
  return a === b || a.endsWith('/' + b) || b.endsWith('/' + a) || a.endsWith(b) || b.endsWith(a);
}

/**
 * Assign models to NPCs to ensure variety.
 * Each NPC gets a different model where possible.
 */
export function assignModelsToNPCs(
  npcs: { id: string; assignedModel?: string }[],
  availableModels: string[]
): Map<string, string> {
  const assignments = new Map<string, string>();

  if (availableModels.length === 0) {
    // Fallback - use default NPC model
    for (const npc of npcs) {
      assignments.set(npc.id, MODEL_CONFIG.npc);
    }
    return assignments;
  }

  // Don't shuffle - assign in order for deterministic variety
  // NPC 0 gets model 0, NPC 1 gets model 1, etc.
  npcs.forEach((npc, index) => {
    // Check if NPC's saved model matches any available model
    const existingMatch = npc.assignedModel
      ? availableModels.find(m => modelMatches(m, npc.assignedModel!))
      : null;

    if (existingMatch) {
      // Keep existing model (use the full API path)
      assignments.set(npc.id, existingMatch);
    } else {
      // Assign from pool in order, cycling through
      const modelIndex = index % availableModels.length;
      assignments.set(npc.id, availableModels[modelIndex]);
    }
  });

  return assignments;
}

/**
 * Get model for a specific NPC, using assigned model if available.
 */
export function getModelForNPC(npc: { assignedModel?: string }): string {
  if (npc.assignedModel) {
    return npc.assignedModel;
  }
  return MODEL_CONFIG.npc;
}
