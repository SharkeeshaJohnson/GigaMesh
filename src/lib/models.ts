import { NPCTier } from './types';

export const MODEL_CONFIG = {
  // === NSFW/Unfiltered Content Generation ===

  // Core NPCs (spouse, boss) - highest quality, unfiltered
  coreNPC: 'grok/grok-4-0709',

  // Secondary NPCs (close family, key coworkers) - unfiltered
  secondaryNPC: 'grok/grok-4-0709',

  // Tertiary NPCs (extended cast, emergent characters) - smaller unfiltered model for cost
  tertiaryNPC: 'fireworks/accounts/sentientfoundation-serverless/models/dobby-mini-unhinged-plus-llama-3-1-8b',

  // Scenario generation - needs creativity + fully unfiltered
  scenarioGeneration: 'grok/grok-4-0709',

  // Simulation events - unfiltered for adult consequences
  simulation: 'grok/grok-4-0709',

  // === Standard Models (no NSFW output needed) ===

  // Memory extraction - accuracy critical, no explicit output
  memoryExtraction: 'openai/gpt-4o',

  // Embeddings - content-agnostic vector math
  embedding: 'openai/text-embedding-3-small',
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
