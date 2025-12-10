# GigaMesh (LifeSim) - Claude Code Instructions

## Core Principles
- Before making a new file, check if there is already a file related to this that would make more sense to just update.
- Always use first principle thinking.
- Don't overcomplicate things more than they have to be.
- The key: Always ask "Why is this necessary?" and "What's the simplest solution?" before writing code.
- If you are unsure about something stop and ask me. DO NOT JUST GUESS.
- Don't break things that already work.
- If you don't fully understand a bug, don't guess. Instead add logs or find other ways to better diagnose the issue.

## SDK & Dependencies
- Regarding SDK updates, please always update to the latest next tag version.
- Primary SDK: `@reverbia/sdk@next` (built on ZetaChain)
- Authentication: `@privy-io/react-auth`

## Configuration
```
PRIVY_APP_ID=cmhwlx82v000xle0cde4rjy5y
API_URL=https://ai-portal-dev.zetachain.com
```

## Tech Stack
- Next.js 14+ (App Router) - Web application (desktop and mobile browsers)
- TypeScript
- Tailwind CSS
- Local-first architecture (IndexedDB for storage via Reverbia SDK)
- No cloud dependencies - all data stored in browser

## Project Overview
- **Name**: LifeSim (codenamed GigaMesh)
- **Tagline**: "Your choices. Your consequences. Your life."
- **Type**: Web application (Next.js)
- **Aesthetic**: Japandi design with procedurally generated animated pixel art
- **Content Rating**: 18+ / Unfiltered / NSFW enabled
- **Save Slots**: 4 per user
- **Starting NPCs**: 10 guaranteed per identity (2 core, 4 secondary, 4 tertiary)
- **Emergent NPCs**: Unlimited (spawn through gameplay, permanent once created)

## Core Concept
Combines elements from:
- **The Sims**: Relationship depth, life simulation, meters
- **Pax Historia**: Action system, consequence chains, simulation events
- **Plague Inc**: Viral spread of consequences, butterfly effects
- **Tamagotchi**: Pixel art aesthetic, persistent characters

## AI Model Configuration
```typescript
const MODEL_CONFIG = {
  // === Fast & Cheap Qwen Models ===

  // Core NPCs (spouse, boss) - qwen3-30b for quality
  coreNPC: "fireworks/accounts/fireworks/models/qwen3-30b-a3b",

  // Secondary NPCs (close family, key coworkers)
  secondaryNPC: "fireworks/accounts/fireworks/models/qwen3-30b-a3b",

  // Tertiary NPCs (extended cast, emergent characters) - smaller/faster
  tertiaryNPC: "fireworks/accounts/fireworks/models/qwen3-8b",

  // Scenario generation - needs creativity
  scenarioGeneration: "fireworks/accounts/fireworks/models/qwen3-30b-a3b",

  // Simulation events
  simulation: "fireworks/accounts/fireworks/models/qwen3-30b-a3b",

  // === Standard Models ===

  // Memory extraction - qwen for consistency
  memoryExtraction: "fireworks/accounts/fireworks/models/qwen3-30b-a3b",

  // Embeddings - content-agnostic vector math
  embedding: "openai/text-embedding-3-small",

  // Fallback fast model
  fallbackFast: "fireworks/accounts/fireworks/models/qwen3-8b",
};
```

## Required Reverbia Hooks
```typescript
import { useChat, useMemory, useEncryption, encryptData, decryptData } from "@reverbia/sdk/react";
import { useIdentityToken, usePrivy } from "@privy-io/react-auth";
```

## Key Data Models
- **Identity**: Player save slot with scenario, meters, NPCs
- **NPC**: Characters with tiers (core/secondary/tertiary), personalities, off-screen memories
- **Conversation**: Chat history with NPCs
- **Action**: Player actions queued for simulation
- **SimulationResult**: Events, meter changes, NPC changes after time jumps

## Implementation Priorities
1. Foundation: Privy auth, Reverbia SDK, IndexedDB, routing, model config
2. Identity System: 4-slot saves, creation flow, scenario generation
3. Pixel Art: Sprite generation, emotion variants, caching
4. Chat System: NPC list, chat UI, tier-based models, memory extraction
5. Actions & Simulation: Actions panel, time jumps, off-screen events
6. Results & Loop: Event cards, meter display, state updates
7. Polish: Animations, tutorial, error handling, performance

## PRD Reference
Full PRD located at: `/Users/alex/Desktop/LifeSim-PRD-ClaudeCode-v1.2.md`
