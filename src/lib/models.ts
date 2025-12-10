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

// Helper to get model based on NPC tier
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
