'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense, useRef } from 'react';
import {
  Identity,
  JumpType,
  SimulationResult,
  NPC,
  SimulationEvent,
} from '@/lib/types';
import {
  getFromIndexedDB,
  saveToIndexedDB,
  deleteFromIndexedDB,
  getConversationsForDay,
  getConversationsForIdentity,
  clearConversationsForIdentity,
  getQueuedActions,
} from '@/lib/indexeddb';
import { Conversation } from '@/lib/types/conversation';
import { useChat, useMemory, useImageGeneration } from '@/lib/reverbia';
import { MODEL_CONFIG } from '@/lib/models';
import { STYLE_PROMPTS } from '@/lib/image-models';
import {
  buildSafetyPreamble,
  getScenarioTone,
} from '@/lib/content-filter';
import {
  stripModelArtifacts,
  extractTextContent,
  parseJSONSafely,
} from '@/lib/llm-utils';
import {
  generateSimulationDirective,
  buildSimulationPromptAdditions,
  processSimulationResults,
  advanceDay,
  getNarrativeSummary,
  generateEventBasedScenario,
  generateRandomScenario,
  severityScore,
} from '@/lib/narrative';
import { compositeImage } from '@/lib/image-compositing';

// Event image cache type
interface EventImageCache {
  [eventIndex: number]: {
    imageUrl?: string;
    isGenerating: boolean;
    error?: string;
  };
}

// Character summary for the day
interface CharacterSummary {
  name: string;
  spriteUrl?: string;
  isPlayer: boolean;
  events: string[];
  meterChanges: { meter: string; change: number }[];
}

function SimulatePageContent() {
  const { authenticated, ready } = usePrivy();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const identityId = params.identityId as string;
  const jumpType = (searchParams.get('type') as JumpType) || 'day';

  const [identity, setIdentity] = useState<Identity | null>(null);
  const [phase, setPhase] = useState<'loading' | 'results'>('loading');
  const [loadingMessage, setLoadingMessage] = useState('Simulating...');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [currentEventIndex, setCurrentEventIndex] = useState(0);
  const [eventImages, setEventImages] = useState<EventImageCache>({});
  const [characterSummaries, setCharacterSummaries] = useState<CharacterSummary[]>([]);
  const hasRunRef = useRef(false);
  const imageGenerationRef = useRef(false);

  const { sendMessage } = useChat({
    onError: (error) => {
      console.error('Simulation error:', error);
      setLoadingMessage('Error running simulation. Please try again.');
    },
  });

  const { extractMemoriesFromMessage } = useMemory();

  const { generateImage } = useImageGeneration({
    onError: (error) => {
      console.error('[Simulation] Image generation error:', error);
    },
  });

  // Clear actions for the completed day
  const clearCompletedActions = async (identityId: string) => {
    try {
      const actions = await getQueuedActions(identityId);
      // Delete each action from IndexedDB
      for (const action of actions) {
        await deleteFromIndexedDB('actions', action.id);
      }
      console.log(`[Simulation] Cleared ${actions.length} actions`);
    } catch (error) {
      console.error('[Simulation] Failed to clear actions:', error);
    }
  };

  // Update NPC opening scenarios based on simulation events
  // NPCs involved in events get scenarios referencing those events
  // NPCs not involved get random new scenarios
  // Now uses LLM to generate unique, personalized scenarios
  const updateNPCOpeningScenarios = async (
    currentIdentity: Identity,
    simulationResult: SimulationResult
  ): Promise<Identity> => {
    setLoadingMessage('Generating NPC scenarios...');

    const updatedNpcs: typeof currentIdentity.npcs = [];

    for (const npc of currentIdentity.npcs) {
      if (npc.isDead) {
        updatedNpcs.push(npc); // Skip dead NPCs
        continue;
      }

      // Find events involving this NPC by checking if their name appears
      const npcFirstName = npc.name.split(' ')[0].toLowerCase();
      const relevantEvents = simulationResult.events.filter((event) => {
        const eventText = `${event.title} ${event.description}`.toLowerCase();
        return eventText.includes(npcFirstName) ||
               event.involvedNpcs.some(name => name.toLowerCase().includes(npcFirstName));
      });

      let newScenario: string;

      if (relevantEvents.length > 0) {
        // Generate scenario based on most severe event involving this NPC
        const primaryEvent = relevantEvents.sort(
          (a, b) => severityScore(b.severity) - severityScore(a.severity)
        )[0];
        // Use LLM to generate personalized scenario
        newScenario = await generateEventBasedScenario(npc, primaryEvent, currentIdentity, sendMessage);
        console.log(`[Simulation] ${npc.name} gets event-based scenario from: ${primaryEvent.title}`);
      } else {
        // Generate random new scenario using LLM
        newScenario = await generateRandomScenario(npc, currentIdentity, sendMessage);
        console.log(`[Simulation] ${npc.name} gets random scenario (no events involved them)`);
      }

      updatedNpcs.push({
        ...npc,
        openingScenario: newScenario,
        scenarioUsed: false, // Mark as new, ready to display in 1:1 chat
      });
    }

    return { ...currentIdentity, npcs: updatedNpcs };
  };

  useEffect(() => {
    if (ready && !authenticated) {
      router.push('/');
    }
  }, [ready, authenticated, router]);

  useEffect(() => {
    async function runSimulation() {
      // Prevent double execution
      if (hasRunRef.current) {
        console.log('[Simulation] Already running, skipping...');
        return;
      }
      hasRunRef.current = true;

      try {
        const loadedIdentity = await getFromIndexedDB('identities', identityId);
        if (!loadedIdentity) {
          router.push('/play');
          return;
        }
        setIdentity(loadedIdentity);

        // Run simulation
        const simulationResult = await performSimulation(loadedIdentity, jumpType);
        setResult(simulationResult);

        // Apply simulation results to identity
        let updatedIdentity = applySimulationResults(loadedIdentity, simulationResult);

        // Update NPC opening scenarios based on simulation events
        // This gives each NPC a fresh scenario for their 1:1 chat referencing what happened
        // Now uses LLM for personalized scenarios based on NPC personality/memories
        updatedIdentity = await updateNPCOpeningScenarios(updatedIdentity, simulationResult);
        console.log('[Simulation] Updated NPC opening scenarios for all NPCs');

        await saveToIndexedDB('identities', updatedIdentity);
        setIdentity(updatedIdentity);

        // Save simulation result
        await saveToIndexedDB('simulations', simulationResult);

        // Clear the actions that were processed in this simulation
        await clearCompletedActions(loadedIdentity.id);

        // Store simulation events as memories
        if (simulationResult.events.length > 0) {
          try {
            const eventSummaries = simulationResult.events.map(e =>
              `Day ${simulationResult.fromDay}: ${e.title} - ${e.description}`
            ).join('\n');

            console.log('[Memory] Storing simulation events as memories...');
            await extractMemoriesFromMessage({
              messages: [
                { role: 'system', content: 'These are events that happened in the game simulation:' },
                { role: 'assistant', content: eventSummaries },
              ],
              model: MODEL_CONFIG.memoryExtraction,
            });
            console.log('[Memory] Simulation memories stored');
          } catch (memError) {
            console.error('[Memory] Failed to store simulation memories:', memError);
          }
        }

        // Extract memories from conversations and clear them for fresh start
        try {
          const allConversations = await getConversationsForIdentity(loadedIdentity.id);
          if (allConversations.length > 0) {
            console.log(`[Memory] Processing ${allConversations.length} conversations before clearing...`);

            // Extract key memories from each conversation and store in NPC's offScreenMemories
            for (const conv of allConversations) {
              const npc = updatedIdentity.npcs.find(n => n.id === conv.npcId);
              if (!npc) continue;

              // Only process conversations with meaningful content (more than 2 messages)
              if (conv.messages.length <= 2) continue;

              // Build a summary of the conversation
              const playerMessages = conv.messages
                .filter(m => m.role === 'user')
                .map(m => m.content)
                .slice(-3); // Last 3 player messages

              const npcMessages = conv.messages
                .filter(m => m.role === 'assistant')
                .map(m => m.content.substring(0, 200)) // Truncate long messages
                .slice(-3); // Last 3 NPC messages

              if (playerMessages.length > 0 || npcMessages.length > 0) {
                // Create a concise memory summary
                const memorySummary = `Day ${loadedIdentity.currentDay} conversation: Discussed topics with the player. Key points: ${
                  npcMessages[npcMessages.length - 1]?.substring(0, 100) || 'general conversation'
                }...`;

                // Add to NPC memories if not already present (avoid duplicates)
                if (!npc.offScreenMemories.some(m => m.startsWith(`Day ${loadedIdentity.currentDay} conversation`))) {
                  npc.offScreenMemories.push(memorySummary);
                  console.log(`[Memory] Added conversation memory for ${npc.name}`);
                }
              }
            }

            // Save the updated identity with new memories
            await saveToIndexedDB('identities', updatedIdentity);

            // Clear all conversations for a fresh start next day
            const clearedCount = await clearConversationsForIdentity(loadedIdentity.id);
            console.log(`[Memory] Cleared ${clearedCount} conversations. NPCs will remember via offScreenMemories.`);
          }
        } catch (convError) {
          console.error('[Memory] Failed to process/clear conversations:', convError);
        }

        // Build character summaries
        const summaries = buildCharacterSummaries(updatedIdentity, simulationResult);
        setCharacterSummaries(summaries);

        setPhase('results');

        // Start generating event images in the background (after showing results)
        generateEventImages(simulationResult, updatedIdentity);
      } catch (error) {
        console.error('Simulation failed:', error);
        setLoadingMessage('Simulation failed. Please try again.');
        hasRunRef.current = false; // Allow retry on error
      }
    }

    if (authenticated && identityId) {
      runSimulation();
    }
  }, [authenticated, identityId, jumpType, router]);

  const performSimulation = async (
    identity: Identity,
    jumpType: JumpType
  ): Promise<SimulationResult> => {
    const jumpDays = jumpType === 'day' ? 1 : 7;

    setLoadingMessage('Gathering context...');

    // Get today's conversations and actions
    const conversations = await getConversationsForDay(identity.id, identity.currentDay);
    const actions = await getQueuedActions(identity.id);

    setLoadingMessage('Running simulation...');

    // ============================================
    // NARRATIVE ENGINE: Generate simulation directive
    // ============================================
    let narrativeAdditions = '';
    if (identity.narrativeState) {
      try {
        // Generate directive based on narrative state
        const directive = generateSimulationDirective(identity.narrativeState, jumpDays);
        console.log('[Narrative] Simulation directive:', directive);

        // Build prompt additions from narrative engine
        narrativeAdditions = buildSimulationPromptAdditions(directive, identity);

        // Log narrative summary for debugging
        const summary = getNarrativeSummary(identity.narrativeState);
        console.log('[Narrative] State summary:', summary);
      } catch (narError) {
        console.error('[Narrative] Failed to generate directive:', narError);
      }
    }

    // Build simulation prompt (with narrative additions)
    const prompt = buildSimulationPrompt(identity, conversations, actions, jumpDays) + narrativeAdditions;

    // Run simulation via AI
    const response = await sendMessage({
      messages: [
        {
          role: 'system',
          content: 'You are a life simulation game master. Generate realistic, dramatic events based on player actions and NPC relationships. Always return valid JSON as specified. Be creative and consider consequences of actions. Pay special attention to any NARRATIVE DIRECTIVES provided - these guide story progression.',
        },
        { role: 'user', content: prompt },
      ],
      model: MODEL_CONFIG.simulation,
    });

    setLoadingMessage('Processing results...');

    // Parse results - extract content from SDK response using shared utilities
    let content = '';

    // Try multiple paths to find the content
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
          content = extracted;
          break;
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
          content = extracted;
          break;
        }
      }
    }

    // Strip model artifacts before parsing
    content = stripModelArtifacts(content);

    const parsed = parseSimulationResponse(content);
    console.log('[Simulation] Parsed result:', parsed);

    const simulationResult: SimulationResult = {
      id: crypto.randomUUID(),
      identityId: identity.id,
      fromDay: identity.currentDay,
      toDay: identity.currentDay + jumpDays,
      jumpType,
      events: parsed.events || [],
      meterChanges: parsed.meterChanges || [],
      npcChanges: parsed.npcChanges || [],
      newNpcs: [], // Will be populated later if needed
    };

    return simulationResult;
  };

  const applySimulationResults = (
    identity: Identity,
    result: SimulationResult
  ): Identity => {
    const updated = { ...identity };

    // Update day
    updated.currentDay = result.toDay;

    // ============================================
    // NARRATIVE ENGINE: Process simulation results
    // ============================================
    if (updated.narrativeState) {
      try {
        // Advance the narrative day
        let narrativeState = advanceDay(updated.narrativeState, result.toDay);

        // Process simulation results through narrative engine
        narrativeState = processSimulationResults(narrativeState, result, identity);

        updated.narrativeState = narrativeState;

        console.log('[Narrative] Updated after simulation:',
          `Day ${narrativeState.currentDay}`,
          `Tension: ${narrativeState.globalTension}`,
          `Active arcs: ${narrativeState.activeArcs.length}`
        );
      } catch (narError) {
        console.error('[Narrative] Failed to process results:', narError);
      }
    }

    // Apply meter changes
    for (const change of result.meterChanges) {
      const meterKey = change.meter as keyof typeof updated.meters;
      if (meterKey in updated.meters) {
        updated.meters[meterKey] = Math.max(0, Math.min(100, change.newValue));
      }
    }

    // Apply NPC changes
    for (const change of result.npcChanges) {
      const npc = updated.npcs.find((n) => n.id === change.npcId || n.name.toLowerCase() === change.npcId?.toLowerCase());
      if (npc) {
        if (change.changeType === 'emotional') {
          npc.currentEmotionalState = change.description;
        } else if (change.changeType === 'relationship') {
          npc.relationshipStatus = change.description;
        } else if (change.changeType === 'knowledge') {
          npc.offScreenMemories.push(change.description);
        } else if (change.changeType === 'death') {
          // NPC has died
          npc.isDead = true;
          npc.deathDay = result.toDay;
          npc.deathCause = change.description;
          npc.isActive = false;
        }
      }
    }

    // Check events for death keywords and mark NPCs as dead
    const deathKeywords = ['killed', 'murdered', 'assassinated', 'died', 'dead', 'suicide', 'overdose', 'fatal', 'death', 'murder'];
    for (const event of result.events) {
      const eventText = `${event.title} ${event.description}`.toLowerCase();
      if (deathKeywords.some(keyword => eventText.includes(keyword))) {
        // Check if any NPC is mentioned
        for (const npc of updated.npcs) {
          if (npc.isDead) continue;

          const npcFullName = npc.name.toLowerCase();
          const npcFirstName = npc.name.split(' ')[0].toLowerCase();

          // Check if NPC is mentioned by full name or first name
          const npcMentioned = eventText.includes(npcFullName) || eventText.includes(npcFirstName);

          // Check if NPC is in the involvedNpcs array (match by first name or full name)
          const npcInvolved = event.involvedNpcs?.some(n => {
            const involvedLower = n.toLowerCase();
            return involvedLower === npcFullName ||
                   involvedLower === npcFirstName ||
                   npcFullName.includes(involvedLower) ||
                   involvedLower.includes(npcFirstName);
          });

          if (npcMentioned || npcInvolved) {
            // Check if they were killed (not just mentioned in a death context)
            const killedPatterns = [
              `killed ${npcFirstName}`,
              `killed ${npcFullName}`,
              `kills ${npcFirstName}`,
              `kills ${npcFullName}`,
              `${npcFirstName} was killed`,
              `${npcFullName} was killed`,
              `${npcFirstName} died`,
              `${npcFullName} died`,
              `${npcFirstName} is dead`,
              `${npcFullName} is dead`,
              `murdered ${npcFirstName}`,
              `murdered ${npcFullName}`,
              `murders ${npcFirstName}`,
              `murders ${npcFullName}`,
              `murder of ${npcFirstName}`,
              `murder of ${npcFullName}`,
              `${npcFirstName} committed suicide`,
              `${npcFullName} committed suicide`,
              `${npcFirstName}'s death`,
              `${npcFullName}'s death`,
              `assassinated ${npcFirstName}`,
              `assassinated ${npcFullName}`,
            ];

            const isDeathEvent = killedPatterns.some(pattern => eventText.includes(pattern)) ||
                (npcInvolved && deathKeywords.some(k => eventText.includes(k)));

            if (isDeathEvent) {
              npc.isDead = true;
              npc.deathDay = result.toDay;
              npc.deathCause = event.description;
              npc.isActive = false;
              console.log(`[Simulation] ${npc.name} has died: ${event.title}`);
            }
          }
        }
      }
    }

    // ============================================
    // CRITICAL: Store events in involved NPCs' memories
    // This allows NPCs to reference past events in conversations
    // ============================================
    for (const event of result.events) {
      // Create a memory string for this event
      const eventMemory = `Day ${result.fromDay} EVENT: ${event.title} - ${event.description}`;

      // Add to all involved NPCs' memories
      for (const involvedName of (event.involvedNpcs || [])) {
        // Find NPC by matching name (case-insensitive, partial match)
        const npc = updated.npcs.find(n => {
          const npcLower = n.name.toLowerCase();
          const involvedLower = involvedName.toLowerCase();
          return npcLower === involvedLower ||
                 npcLower.includes(involvedLower) ||
                 involvedLower.includes(npcLower.split(' ')[0]);
        });

        if (npc && !npc.isDead) {
          // Avoid duplicate memories
          if (!npc.offScreenMemories.some(m => m.includes(event.title))) {
            npc.offScreenMemories.push(eventMemory);
            console.log(`[Simulation] Added event memory to ${npc.name}: ${event.title}`);
          }
        }
      }

      // Also add to player character's identity (for player reference)
      if (!updated.simulationHistory) {
        updated.simulationHistory = [];
      }
      updated.simulationHistory.push({
        day: result.fromDay,
        title: event.title,
        description: event.description,
        involvedNpcs: event.involvedNpcs || [],
      });
    }

    // Keep only last 20 simulation events in history
    if (updated.simulationHistory && updated.simulationHistory.length > 20) {
      updated.simulationHistory = updated.simulationHistory.slice(-20);
    }

    // Keep NPC offScreenMemories manageable (last 15)
    for (const npc of updated.npcs) {
      if (npc.offScreenMemories.length > 15) {
        npc.offScreenMemories = npc.offScreenMemories.slice(-15);
      }
    }

    // Add new NPCs
    updated.npcs = [...updated.npcs, ...result.newNpcs];

    updated.lastPlayedAt = new Date();

    return updated;
  };

  // Infer mood/emotion from event description for gradient backgrounds
  const inferMoodFromEvent = (description: string, severity: string): string => {
    const lowerDesc = description.toLowerCase();

    // Check for emotional keywords
    if (lowerDesc.includes('happy') || lowerDesc.includes('celebrate') || lowerDesc.includes('joy') || lowerDesc.includes('success') || lowerDesc.includes('promotion')) {
      return 'happy';
    }
    if (lowerDesc.includes('love') || lowerDesc.includes('romantic') || lowerDesc.includes('kiss') || lowerDesc.includes('together')) {
      return 'loving';
    }
    if (lowerDesc.includes('sad') || lowerDesc.includes('cry') || lowerDesc.includes('loss') || lowerDesc.includes('grief') || lowerDesc.includes('funeral')) {
      return 'sad';
    }
    if (lowerDesc.includes('angry') || lowerDesc.includes('fight') || lowerDesc.includes('argument') || lowerDesc.includes('furious') || lowerDesc.includes('rage')) {
      return 'angry';
    }
    if (lowerDesc.includes('scared') || lowerDesc.includes('fear') || lowerDesc.includes('terror') || lowerDesc.includes('panic') || lowerDesc.includes('dead') || lowerDesc.includes('kill')) {
      return 'scared';
    }
    if (lowerDesc.includes('suspicious') || lowerDesc.includes('secret') || lowerDesc.includes('affair') || lowerDesc.includes('cheat') || lowerDesc.includes('betray')) {
      return 'suspicious';
    }

    // Fall back to severity-based mood
    if (severity === 'life-changing' || severity === 'major') {
      return 'scared';
    }
    if (severity === 'moderate') {
      return 'suspicious';
    }

    return 'neutral';
  };

  // Extract location/setting from event description
  const extractLocationFromEvent = (description: string, title: string): string => {
    const text = `${title} ${description}`.toLowerCase();

    // Location keyword mapping
    const locationMap: Record<string, string> = {
      // Work locations
      'office': 'corporate office interior, desks and computers, fluorescent lighting',
      'workplace': 'modern workplace interior, professional environment',
      'meeting': 'conference room, long table, office chairs, presentation screen',
      'boardroom': 'executive boardroom, large wooden table, leather chairs',
      'cubicle': 'office cubicle area, partitioned workspaces',

      // Home locations
      'home': 'cozy home interior, living room, warm lighting, comfortable furniture',
      'house': 'residential home interior, family living space',
      'apartment': 'modern apartment interior, urban living space',
      'bedroom': 'bedroom interior, bed, nightstand, soft lighting',
      'kitchen': 'home kitchen, countertops, appliances, warm atmosphere',
      'living room': 'living room, sofa, coffee table, TV, family space',

      // Public locations
      'restaurant': 'restaurant interior, dining tables, ambient lighting',
      'cafe': 'cozy coffee shop, cafe tables, warm lighting, coffee atmosphere',
      'bar': 'dimly lit bar interior, counter, bottles, moody atmosphere',
      'club': 'nightclub interior, dance floor, colorful lights',
      'hospital': 'hospital room, medical equipment, sterile white walls',
      'court': 'courtroom interior, judge bench, wooden furniture, formal',
      'police': 'police station interior, desks, holding area',
      'church': 'church interior, pews, altar, stained glass, sacred',
      'school': 'classroom interior, desks, chalkboard, educational',

      // Outdoor locations
      'street': 'city street scene, buildings, sidewalk, urban environment',
      'park': 'public park, trees, benches, green grass, peaceful',
      'beach': 'beach scene, sand, ocean waves, sunny sky',
      'garden': 'garden setting, flowers, plants, natural beauty',
      'parking': 'parking lot, cars, concrete, outdoor',
      'alley': 'dark alley, brick walls, urban, mysterious',

      // Dramatic locations
      'funeral': 'funeral setting, somber atmosphere, flowers, dark colors',
      'wedding': 'wedding venue, decorations, flowers, celebration',
      'party': 'party scene, decorations, festive atmosphere, celebration',
    };

    // Find matching location
    for (const [keyword, setting] of Object.entries(locationMap)) {
      if (text.includes(keyword)) {
        return setting;
      }
    }

    // Infer from context clues
    if (text.includes('work') || text.includes('boss') || text.includes('colleague') || text.includes('fired') || text.includes('promotion')) {
      return 'corporate office interior, professional workplace';
    }
    if (text.includes('family') || text.includes('spouse') || text.includes('dinner') || text.includes('breakfast')) {
      return 'cozy home interior, family living space';
    }
    if (text.includes('night') || text.includes('evening') || text.includes('dark')) {
      return 'nighttime scene, dark atmosphere, moonlight';
    }
    if (text.includes('morning') || text.includes('sunrise') || text.includes('dawn')) {
      return 'morning scene, soft sunrise lighting, new day';
    }

    // Default to generic indoor scene
    return 'interior scene, ambient lighting, atmospheric';
  };

  // Build a BACKGROUND-ONLY prompt for AI generation (no characters)
  const buildBackgroundPrompt = (event: SimulationEvent, ident: Identity): string => {
    const mood = inferMoodFromEvent(event.description, event.severity);
    const emotionMod = STYLE_PROMPTS.emotions[mood as keyof typeof STYLE_PROMPTS.emotions] || STYLE_PROMPTS.emotions.neutral;
    const location = extractLocationFromEvent(event.description, event.title);

    // Build prompt that explicitly excludes characters
    return `${STYLE_PROMPTS.sceneBase}, ${location}, ${emotionMod} atmosphere, empty scene, no people, no characters, background only, atmospheric, dramatic lighting`;
  };

  // Collect sprites for involved characters
  const collectEventSprites = (event: SimulationEvent, ident: Identity): Array<{ url: string; position: 'left' | 'right' | 'center' | 'bottom-center'; name: string }> => {
    const involvedNpcs = event.involvedNpcs || [];
    const sprites: Array<{ url: string; position: 'left' | 'right' | 'center' | 'bottom-center'; name: string }> = [];

    // Check if player is involved
    const playerInvolved = involvedNpcs.some(name =>
      name.toLowerCase() === ident.name.toLowerCase() ||
      event.description.toLowerCase().includes(ident.name.toLowerCase())
    );

    if (playerInvolved && ident.pixelArtUrl) {
      sprites.push({ url: ident.pixelArtUrl, position: 'left', name: ident.name });
    }

    // Find NPC sprites
    for (const npcName of involvedNpcs) {
      if (npcName.toLowerCase() === ident.name.toLowerCase()) continue;

      const npc = ident.npcs.find(n =>
        n.name.toLowerCase() === npcName.toLowerCase() ||
        n.name.split(' ')[0].toLowerCase() === npcName.toLowerCase()
      );

      if (npc?.pixelArtUrl) {
        // Position based on how many sprites we have
        let position: 'left' | 'right' | 'center' | 'bottom-center';
        if (sprites.length === 0) {
          position = 'left';
        } else if (sprites.length === 1) {
          position = 'right';
        } else {
          position = 'center';
        }
        sprites.push({ url: npc.pixelArtUrl, position, name: npc.name });
        if (sprites.length >= 2) break; // Max 2 characters per scene
      }
    }

    // If only one character, center them
    if (sprites.length === 1) {
      sprites[0].position = 'bottom-center';
    }

    return sprites;
  };

  // Generate images for simulation events: AI background + sprite compositing
  const generateEventImages = async (simResult: SimulationResult, ident: Identity) => {
    if (imageGenerationRef.current) return;
    imageGenerationRef.current = true;

    for (let i = 0; i < simResult.events.length; i++) {
      const event = simResult.events[i];

      // Mark as generating
      setEventImages(prev => ({
        ...prev,
        [i]: { isGenerating: true }
      }));

      try {
        // Collect sprites for involved characters
        const sprites = collectEventSprites(event, ident);
        const mood = inferMoodFromEvent(event.description, event.severity);

        console.log(`[EventImage] Event ${i}: "${event.title}" - ${sprites.length} characters, mood: ${mood}`);

        // Generate AI background
        const backgroundPrompt = buildBackgroundPrompt(event, ident);
        console.log(`[EventImage] Background prompt:`, backgroundPrompt.substring(0, 100) + '...');

        const bgResult = await generateImage({
          prompt: backgroundPrompt,
          size: '1024x1024',
        });

        let backgroundUrl: string | undefined;

        if (bgResult.error) {
          console.warn(`[EventImage] Background generation failed for event ${i}:`, bgResult.error);
          // Will use gradient fallback in compositing
        } else if (bgResult.data?.images?.[0]?.url) {
          backgroundUrl = bgResult.data.images[0].url;
          console.log(`[EventImage] Background generated for event ${i}`);
        }

        // Now composite sprites onto the background
        if (sprites.length > 0) {
          const composited = await compositeImage({
            backgroundUrl, // May be undefined, compositeImage handles this with gradient
            sprites: sprites.map((s) => ({
              url: s.url,
              position: s.position,
              scale: 5 // Scale up pixel sprites for visibility
            })),
            options: {
              width: 768,
              height: 512,
              emotion: mood,
              addVignette: true
            }
          });

          console.log(`[EventImage] Composited ${sprites.length} sprite(s) for event ${i}: ${sprites.map(s => s.name).join(', ')}`);
          setEventImages(prev => ({
            ...prev,
            [i]: { imageUrl: composited, isGenerating: false }
          }));
        } else if (backgroundUrl) {
          // No sprites but we have a background - just use the background
          console.log(`[EventImage] Using background only for event ${i} (no character sprites)`);
          setEventImages(prev => ({
            ...prev,
            [i]: { imageUrl: backgroundUrl, isGenerating: false }
          }));
        } else {
          // No background and no sprites - create gradient scene
          const emptyScene = await compositeImage({
            sprites: [],
            options: {
              width: 768,
              height: 512,
              emotion: mood,
              addVignette: true
            }
          });
          setEventImages(prev => ({
            ...prev,
            [i]: { imageUrl: emptyScene, isGenerating: false }
          }));
        }
      } catch (error) {
        console.error(`[EventImage] Failed to generate image for event ${i}:`, error);
        // Fallback to gradient + sprites
        await fallbackToGradient(i, event, ident);
      }
    }
  };

  // Fallback to gradient background with sprites if AI generation fails completely
  const fallbackToGradient = async (eventIndex: number, event: SimulationEvent, ident: Identity) => {
    try {
      const sprites = collectEventSprites(event, ident);
      const mood = inferMoodFromEvent(event.description, event.severity);

      const composited = await compositeImage({
        sprites: sprites.map((s) => ({
          url: s.url,
          position: s.position,
          scale: 5
        })),
        options: {
          width: 768,
          height: 512,
          emotion: mood,
          addVignette: true
        }
      });

      setEventImages(prev => ({
        ...prev,
        [eventIndex]: { imageUrl: composited, isGenerating: false }
      }));
    } catch (fallbackError) {
      console.error(`[EventImage] Fallback failed for event ${eventIndex}:`, fallbackError);
      setEventImages(prev => ({
        ...prev,
        [eventIndex]: { isGenerating: false, error: 'Generation failed' }
      }));
    }
  };

  // Build character summaries from simulation results
  const buildCharacterSummaries = (ident: Identity, simResult: SimulationResult): CharacterSummary[] => {
    const summaries: Map<string, CharacterSummary> = new Map();

    // Track player
    summaries.set(ident.name, {
      name: ident.name,
      spriteUrl: ident.pixelArtUrl,
      isPlayer: true,
      events: [],
      meterChanges: simResult.meterChanges.map(m => ({
        meter: m.meter,
        change: m.newValue - m.previousValue
      }))
    });

    // Track NPCs involved in events
    for (const event of simResult.events) {
      const involved = event.involvedNpcs || [];

      for (const npcName of involved) {
        // Check if it's the player
        if (npcName.toLowerCase() === ident.name.toLowerCase()) {
          const playerSummary = summaries.get(ident.name)!;
          playerSummary.events.push(event.title);
          continue;
        }

        // Find NPC
        const npc = ident.npcs.find(n =>
          n.name.toLowerCase() === npcName.toLowerCase() ||
          n.name.split(' ')[0].toLowerCase() === npcName.toLowerCase()
        );

        if (npc) {
          if (!summaries.has(npc.name)) {
            summaries.set(npc.name, {
              name: npc.name,
              spriteUrl: npc.pixelArtUrl,
              isPlayer: false,
              events: [],
              meterChanges: []
            });
          }
          summaries.get(npc.name)!.events.push(event.title);
        }
      }
    }

    // Add NPC changes
    for (const change of simResult.npcChanges) {
      const npc = ident.npcs.find(n =>
        n.id === change.npcId ||
        n.name.toLowerCase() === change.npcId?.toLowerCase()
      );

      if (npc && summaries.has(npc.name)) {
        const summary = summaries.get(npc.name)!;
        if (!summary.events.includes(change.description)) {
          summary.events.push(`${change.changeType}: ${change.description}`);
        }
      }
    }

    // Convert to array, player first
    const result = Array.from(summaries.values());
    return result.sort((a, b) => {
      if (a.isPlayer) return -1;
      if (b.isPlayer) return 1;
      return b.events.length - a.events.length;
    });
  };

  const handleContinue = () => {
    router.push(`/play/${identityId}`);
  };

  const handleNextEvent = () => {
    if (result && currentEventIndex < result.events.length - 1) {
      setCurrentEventIndex(currentEventIndex + 1);
    }
  };

  const handlePrevEvent = () => {
    if (currentEventIndex > 0) {
      setCurrentEventIndex(currentEventIndex - 1);
    }
  };

  if (!ready || !identity) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: 'var(--win95-bg)' }}>
        <div className="win95-text" style={{ color: 'var(--win95-text-dim)' }}>
          Loading...
        </div>
      </main>
    );
  }

  // Loading phase - Windows 95 styled
  if (phase === 'loading') {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-8" style={{ background: 'var(--win95-bg)', fontFamily: 'Consolas, monospace' }}>
        <div className="win95-window" style={{ width: '400px', maxWidth: '90vw' }}>
          {/* Title bar - centered */}
          <div
            className="text-center py-2 px-4"
            style={{
              background: 'linear-gradient(90deg, var(--win95-title-active) 0%, var(--win95-accent-light) 100%)',
              color: 'white',
              fontFamily: 'Consolas, monospace',
              fontWeight: 'bold',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <span className="pixel-icon pixel-icon-hourglass" style={{ filter: 'brightness(0) invert(1)' }} />
            SIMULATION
          </div>

          {/* Content */}
          <div className="p-6 text-center">
            {/* Hourglass icon */}
            <div className="mb-4 flex justify-center">
              <span
                className="pixel-icon pixel-icon-hourglass pixel-icon-hourglass-animated"
                style={{ transform: 'scale(3)', transformOrigin: 'center' }}
              />
            </div>

            <h2 className="win95-text font-bold text-lg mb-4" style={{ color: 'var(--win95-text)' }}>
              {loadingMessage}
            </h2>

            {/* Progress bar */}
            <div className="win95-progress mb-4">
              <div
                className="win95-progress-fill"
                style={{
                  width: '60%',
                  animation: 'progressPulse 1.5s ease-in-out infinite'
                }}
              />
            </div>

            <p className="win95-text" style={{ color: 'var(--win95-text-dim)', fontSize: '12px' }}>
              Simulating {jumpType === 'day' ? '1 day' : '1 week'}...
            </p>

            {/* Animated dots */}
            <div className="mt-4 win95-text" style={{ color: 'var(--win95-accent)', fontSize: '11px' }}>
              Please wait while fate unfolds
              <span className="animate-pulse">...</span>
            </div>
          </div>
        </div>

        <style jsx>{`
          @keyframes progressPulse {
            0%, 100% { width: 30%; }
            50% { width: 80%; }
          }
        `}</style>
      </main>
    );
  }

  // Results phase - no result yet
  if (!result) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: 'var(--win95-bg)' }}>
        <div className="win95-text" style={{ color: 'var(--win95-text-dim)' }}>No results available</div>
      </main>
    );
  }

  const currentEvent = result.events[currentEventIndex];
  const currentEventImage = eventImages[currentEventIndex];

  // Severity to color mapping
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'minor': return 'var(--win95-text-dim)';
      case 'moderate': return 'var(--win95-warning)';
      case 'major': return 'var(--win95-accent)';
      case 'life-changing': return 'var(--win95-danger)';
      default: return 'var(--win95-text)';
    }
  };

  return (
    <main className="h-screen p-4 md:p-8 flex items-center justify-center" style={{ background: 'var(--win95-bg)', fontFamily: 'Consolas, monospace' }}>
      {/* Main Window - Full height with scrollable content */}
      <div
        className="win95-window flex flex-col"
        style={{
          width: '100%',
          maxWidth: '800px',
          height: 'calc(100vh - 64px)',
          maxHeight: '900px'
        }}
      >
        {/* Title bar - centered */}
        <div
          className="flex-shrink-0 text-center py-2 px-4"
          style={{
            background: 'linear-gradient(90deg, var(--win95-title-active) 0%, var(--win95-accent-light) 100%)',
            color: 'white',
            fontFamily: 'Consolas, monospace',
            fontWeight: 'bold',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          <span className="pixel-icon pixel-icon-clock" style={{ filter: 'brightness(0) invert(1)' }} />
          TIME HAS PASSED
        </div>

        {/* Header */}
        <div className="flex-shrink-0 p-4 text-center" style={{ borderBottom: '2px solid var(--win95-border-dark)' }}>
          <h1 style={{ color: 'var(--win95-accent)', fontFamily: 'Consolas, monospace', fontWeight: 'bold', fontSize: '20px', marginBottom: '4px' }}>
            DAY {result.fromDay} → DAY {result.toDay}
          </h1>
          <p style={{ color: 'var(--win95-text-dim)', fontFamily: 'Consolas, monospace', fontSize: '12px' }}>
            {result.events.length} event{result.events.length !== 1 ? 's' : ''} occurred
          </p>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto" style={{ background: 'var(--win95-surface)' }}>
          {/* SECTION 1: Events with Images */}
          {result.events.length > 0 ? (
            <div className="p-4" style={{ borderBottom: '2px solid var(--win95-border-dark)' }}>
              {/* Event Header */}
              <div className="flex justify-between items-center mb-3">
                <span style={{ color: 'var(--win95-text)', fontFamily: 'Consolas, monospace', fontSize: '12px', fontWeight: 'bold' }}>
                  📜 EVENT {currentEventIndex + 1}/{result.events.length}
                </span>
                <span
                  style={{
                    color: getSeverityColor(currentEvent.severity),
                    fontFamily: 'Consolas, monospace',
                    fontSize: '10px',
                    fontWeight: 'bold',
                    border: `1px solid ${getSeverityColor(currentEvent.severity)}`,
                    padding: '2px 8px'
                  }}
                >
                  {currentEvent.severity.toUpperCase()}
                </span>
              </div>

              {/* Event Image */}
              <div
                className="mb-3 flex items-center justify-center"
                style={{
                  background: 'var(--win95-darkest)',
                  border: '2px solid var(--win95-border-dark)',
                  minHeight: '180px',
                }}
              >
                {currentEventImage?.isGenerating ? (
                  <div className="text-center">
                    <div className="text-3xl mb-2 animate-pulse">🎨</div>
                    <p style={{ color: 'var(--win95-lightest)', fontFamily: 'Consolas, monospace', fontSize: '11px' }}>
                      Generating scene...
                    </p>
                  </div>
                ) : currentEventImage?.imageUrl ? (
                  <img
                    src={currentEventImage.imageUrl}
                    alt={currentEvent.title}
                    className="max-w-full max-h-[250px] object-contain"
                    style={{ imageRendering: 'pixelated' }}
                  />
                ) : (
                  <div className="text-center p-4">
                    <div className="text-4xl mb-2">📰</div>
                    <p style={{ color: 'var(--win95-lightest)', fontFamily: 'Consolas, monospace', fontSize: '11px' }}>
                      {currentEventImage?.error || 'Image pending...'}
                    </p>
                  </div>
                )}
              </div>

              {/* Event Title & Description */}
              <div className="win95-inset p-3 mb-3">
                <h2 style={{ color: 'var(--win95-text)', fontFamily: 'Consolas, monospace', fontSize: '13px', fontWeight: 'bold', marginBottom: '8px' }}>
                  {currentEvent.title.toUpperCase()}
                </h2>
                <p style={{ color: 'var(--win95-text)', fontFamily: 'Consolas, monospace', fontSize: '11px', lineHeight: '1.5' }}>
                  {currentEvent.description}
                </p>

                {currentEvent.involvedNpcs && currentEvent.involvedNpcs.length > 0 && (
                  <p style={{ color: 'var(--win95-text-dim)', fontFamily: 'Consolas, monospace', fontSize: '10px', marginTop: '8px' }}>
                    👥 Involved: {currentEvent.involvedNpcs.join(', ')}
                  </p>
                )}
              </div>

              {/* Event Navigation - Smaller buttons */}
              <div className="flex justify-between">
                <button
                  onClick={handlePrevEvent}
                  disabled={currentEventIndex === 0}
                  className="win95-btn"
                  style={{
                    opacity: currentEventIndex === 0 ? 0.5 : 1,
                    fontSize: '10px',
                    padding: '4px 12px',
                    fontFamily: 'Consolas, monospace'
                  }}
                >
                  ◀ Prev
                </button>
                <button
                  onClick={handleNextEvent}
                  disabled={currentEventIndex === result.events.length - 1}
                  className="win95-btn"
                  style={{
                    opacity: currentEventIndex === result.events.length - 1 ? 0.5 : 1,
                    fontSize: '10px',
                    padding: '4px 12px',
                    fontFamily: 'Consolas, monospace'
                  }}
                >
                  Next ▶
                </button>
              </div>
            </div>
          ) : (
            <div className="p-6 text-center" style={{ borderBottom: '2px solid var(--win95-border-dark)' }}>
              <p style={{ color: 'var(--win95-text-dim)', fontFamily: 'Consolas, monospace' }}>
                Nothing significant happened during this time.
              </p>
            </div>
          )}

          {/* SECTION 2: Character Summaries - Sentences, no event titles */}
          {characterSummaries.length > 0 && (
            <div className="p-4" style={{ borderBottom: '2px solid var(--win95-border-dark)' }}>
              <h3 style={{ color: 'var(--win95-text)', fontFamily: 'Consolas, monospace', fontSize: '12px', fontWeight: 'bold', marginBottom: '12px' }}>
                📋 CHARACTER SUMMARIES
              </h3>

              <div className="space-y-2">
                {characterSummaries.map((summary, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-2"
                    style={{
                      background: 'var(--win95-light)',
                      border: '1px solid var(--win95-border-dark)',
                    }}
                  >
                    {/* Character Sprite */}
                    <div
                      className="flex-shrink-0"
                      style={{
                        width: '40px',
                        height: '40px',
                        background: 'var(--win95-mid)',
                        border: '1px solid var(--win95-border-dark)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {summary.spriteUrl ? (
                        <img
                          src={summary.spriteUrl}
                          alt={summary.name}
                          style={{ width: '100%', height: '100%', imageRendering: 'pixelated', objectFit: 'contain' }}
                        />
                      ) : (
                        <span style={{ fontSize: '20px' }}>{summary.isPlayer ? '👤' : '🧑'}</span>
                      )}
                    </div>

                    {/* Character Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span style={{ color: 'var(--win95-text)', fontFamily: 'Consolas, monospace', fontSize: '11px', fontWeight: 'bold' }}>
                          {summary.name}
                        </span>
                        {summary.isPlayer && (
                          <span
                            style={{
                              background: 'var(--win95-accent)',
                              color: 'white',
                              fontFamily: 'Consolas, monospace',
                              fontSize: '8px',
                              fontWeight: 'bold',
                              padding: '1px 4px'
                            }}
                          >
                            YOU
                          </span>
                        )}
                      </div>

                      {/* Summary as sentence - filter out event titles, show descriptions */}
                      {summary.events.length > 0 && (
                        <p style={{ color: 'var(--win95-text-dim)', fontFamily: 'Consolas, monospace', fontSize: '10px', marginTop: '4px', lineHeight: '1.4' }}>
                          {summary.events
                            .filter(e => e.includes(':')) // Only show items with descriptions (changeType: description format)
                            .map(e => e.split(':').slice(1).join(':').trim()) // Get everything after the colon
                            .filter(e => e.length > 0)
                            .slice(0, 2)
                            .join('. ')}
                          {summary.events.filter(e => !e.includes(':')).length > 0 && summary.events.filter(e => e.includes(':')).length === 0 &&
                            `Involved in ${summary.events.length} event${summary.events.length > 1 ? 's' : ''} today.`
                          }
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECTION 3: Stat Changes (Player only) */}
          {result.meterChanges.length > 0 && (
            <div className="p-4">
              <h3 style={{ color: 'var(--win95-text)', fontFamily: 'Consolas, monospace', fontSize: '12px', fontWeight: 'bold', marginBottom: '12px' }}>
                📊 YOUR STAT CHANGES
              </h3>

              <div className="space-y-2">
                {result.meterChanges.map((change, index) => {
                  const diff = change.newValue - change.previousValue;
                  const isPositive = diff > 0;
                  const isNegative = diff < 0;

                  return (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2"
                      style={{ background: 'var(--win95-light)', border: '1px solid var(--win95-border-dark)' }}
                    >
                      <span style={{ color: 'var(--win95-text)', fontFamily: 'Consolas, monospace', fontSize: '10px', textTransform: 'uppercase' }}>
                        {change.meter.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                      <div className="flex items-center gap-2">
                        <span style={{ color: 'var(--win95-text-dim)', fontFamily: 'Consolas, monospace', fontSize: '10px' }}>
                          {change.previousValue}
                        </span>
                        <span style={{ color: 'var(--win95-text-dim)', fontFamily: 'Consolas, monospace' }}>→</span>
                        <span
                          style={{
                            color: isPositive ? 'var(--win95-success)' : isNegative ? 'var(--win95-danger)' : 'var(--win95-text)',
                            fontFamily: 'Consolas, monospace',
                            fontSize: '10px',
                            fontWeight: 'bold'
                          }}
                        >
                          {change.newValue}
                        </span>
                        <span
                          style={{
                            background: isPositive ? 'var(--win95-success)' : isNegative ? 'var(--win95-danger)' : 'var(--win95-mid)',
                            color: 'white',
                            fontFamily: 'Consolas, monospace',
                            fontSize: '9px',
                            fontWeight: 'bold',
                            padding: '2px 6px'
                          }}
                        >
                          {isPositive ? '+' : ''}{diff}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Fixed CTA Button at Bottom */}
        <div
          className="flex-shrink-0 p-4 text-center"
          style={{
            borderTop: '2px solid var(--win95-border-dark)',
            background: 'var(--win95-mid)'
          }}
        >
          <button
            onClick={handleContinue}
            className="win95-btn win95-btn-primary"
            style={{
              padding: '8px 32px',
              fontFamily: 'Consolas, monospace',
              fontSize: '12px',
              fontWeight: 'bold'
            }}
          >
            CONTINUE TO DAY {result.toDay} →
          </button>
        </div>
      </div>
    </main>
  );
}

export default function SimulatePage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center" style={{ background: 'var(--win95-bg)' }}>
          <div className="win95-text" style={{ color: 'var(--win95-text-dim)' }}>
            Loading...
          </div>
        </main>
      }
    >
      <SimulatePageContent />
    </Suspense>
  );
}

// Helper functions
function buildSimulationPrompt(
  identity: Identity,
  conversations: any[],
  actions: any[],
  jumpDays: number
): string {
  // Build player background from structured data
  const playerBackground = identity.scenario.briefBackground?.length > 0
    ? identity.scenario.briefBackground.map(b => `• ${b}`).join('\n')
    : identity.scenario.backstory;

  const playerStory = identity.scenario.currentStory?.length > 0
    ? identity.scenario.currentStory.map(b => `• ${b}`).join('\n')
    : '';

  // Build NPC details with their bullets
  const npcDetails = identity.npcs.map((n) => {
    const npcBackground = n.bullets?.length > 0
      ? n.bullets.map(b => `  • ${b}`).join('\n')
      : `  • ${n.backstory}`;
    return `- ${n.name} (${n.role})
  Personality: ${n.personality}
  Current mood: ${n.currentEmotionalState}
  Relationship: ${n.relationshipStatus}
${npcBackground}
  ${n.offScreenMemories.length > 0 ? `Secrets: ${n.offScreenMemories.join('; ')}` : ''}`;
  }).join('\n\n');

  const conversationSummary = conversations
    .map((c) => {
      const npc = identity.npcs.find(n => n.id === c.npcId);
      return `Conversation with ${npc?.name || 'Unknown'}: ${c.messages.length} messages`;
    })
    .join('\n');
  const actionSummary = actions.map((a) => a.content).join('\n');

  // Player persona context
  const playerPersonaType = identity.generatedPersona?.type || 'Unknown';
  const playerPersonaTraits = identity.generatedPersona?.traits?.join(', ') || '';
  const playerPersonaSituation = identity.generatedPersona?.situation || '';

  return `Simulate ${jumpDays} day(s) for this life simulation game.

=== THE PLAYER ===
NAME: ${identity.name}
PERSONA: ${playerPersonaType}
TRAITS: ${playerPersonaTraits || 'complex personality'}
${playerPersonaSituation ? `CORE STRUGGLE: ${playerPersonaSituation}` : ''}
PROFESSION: ${identity.scenario.profession}
WORKPLACE: ${identity.scenario.workplace}
BACKGROUND:
${playerBackground}
${playerStory ? `CURRENT SITUATION:\n${playerStory}` : ''}

=== CURRENT DAY: ${identity.currentDay} ===

=== METERS ===
- Family Harmony: ${identity.meters.familyHarmony}/100
- Career Standing: ${identity.meters.careerStanding}/100
- Wealth: ${identity.meters.wealth}/100
- Mental Health: ${identity.meters.mentalHealth}/100
- Reputation: ${identity.meters.reputation}/100

=== ALL NPCS ===
${npcDetails}

=== TODAY'S ACTIVITY ===
CONVERSATIONS:
${conversationSummary || 'No conversations today.'}

QUEUED ACTIONS:
${actionSummary || 'No actions queued.'}

=== DIFFICULTY: ${identity.difficulty.toUpperCase()} ===
${getScenarioTone(identity.difficulty)}

=== CONTENT GUIDELINES ===
${buildSafetyPreamble(identity.difficulty)}

=== INSTRUCTIONS ===
CRITICAL: You MUST process ALL queued actions. Each action the player queued MUST have consequences.
If the player killed/attacked an NPC, that NPC MUST be marked as dead/injured in npcChanges.

Generate events based on:
1. FIRST: Direct consequences of each queued action (if player killed someone, show it!)
2. The player's background and current situation
3. Each NPC's personality, background, and secrets
4. Today's conversations
5. Existing relationship dynamics

For violent actions (kill, attack, hurt):
- Create an event describing what happened
- Add npcChanges with changeType "death" for killed NPCs
- Update relevant meters (mentalHealth down, reputation down if caught, etc.)

NPCs should also have off-screen events based on THEIR backgrounds and motivations.
Events should feel connected to established character traits.

Return ONLY valid JSON:
{
  "events": [
    {
      "title": "Short punchy title",
      "description": "What happened (2-3 sentences max)",
      "involvedNpcs": ["npc names"],
      "consequenceChain": "cause → effect",
      "severity": "minor" | "moderate" | "major" | "life-changing"
    }
  ],
  "meterChanges": [
    {
      "meter": "familyHarmony" | "careerStanding" | "wealth" | "mentalHealth" | "reputation",
      "previousValue": number,
      "newValue": number,
      "reason": "Brief reason"
    }
  ],
  "npcChanges": [
    {
      "npcId": "NPC name",
      "changeType": "relationship" | "status" | "knowledge" | "emotional" | "death",
      "description": "What changed"
    }
  ]
}`;
}

function parseSimulationResponse(content: string): any {
  console.log('[Simulation] Parsing content length:', content.length);

  try {
    // First try direct parse
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (e) {
        console.log('[Simulation] Direct parse failed, trying recovery...');
      }
    }

    // Try to extract and fix truncated JSON
    const result: any = { events: [], meterChanges: [], npcChanges: [] };

    // Extract complete JSON objects by matching balanced braces
    const extractObjects = (text: string): any[] => {
      const objects: any[] = [];
      let depth = 0;
      let start = -1;

      for (let i = 0; i < text.length; i++) {
        if (text[i] === '{') {
          if (depth === 0) start = i;
          depth++;
        } else if (text[i] === '}') {
          depth--;
          if (depth === 0 && start !== -1) {
            const objStr = text.substring(start, i + 1);
            try {
              objects.push(JSON.parse(objStr));
            } catch (e) {
              // Try to fix common issues
              const fixed = objStr
                .replace(/,\s*}/g, '}')
                .replace(/,\s*]/g, ']');
              try {
                objects.push(JSON.parse(fixed));
              } catch (e2) {
                console.log('[Simulation] Could not parse object');
              }
            }
            start = -1;
          }
        }
      }
      return objects;
    };

    // Find events section
    const eventsStart = content.indexOf('"events"');
    if (eventsStart !== -1) {
      const eventsArrayStart = content.indexOf('[', eventsStart);
      if (eventsArrayStart !== -1) {
        // Find where meterChanges starts (or end of content)
        const meterStart = content.indexOf('"meterChanges"', eventsArrayStart);
        const eventsSection = meterStart !== -1
          ? content.substring(eventsArrayStart, meterStart)
          : content.substring(eventsArrayStart);
        result.events = extractObjects(eventsSection);
      }
    }

    // Find meterChanges section
    const meterChangesStart = content.indexOf('"meterChanges"');
    if (meterChangesStart !== -1) {
      const meterArrayStart = content.indexOf('[', meterChangesStart);
      if (meterArrayStart !== -1) {
        const npcStart = content.indexOf('"npcChanges"', meterArrayStart);
        const meterSection = npcStart !== -1
          ? content.substring(meterArrayStart, npcStart)
          : content.substring(meterArrayStart);
        result.meterChanges = extractObjects(meterSection);
      }
    }

    // Find npcChanges section
    const npcChangesStart = content.indexOf('"npcChanges"');
    if (npcChangesStart !== -1) {
      const npcArrayStart = content.indexOf('[', npcChangesStart);
      if (npcArrayStart !== -1) {
        const npcSection = content.substring(npcArrayStart);
        result.npcChanges = extractObjects(npcSection);
      }
    }

    console.log('[Simulation] Recovered result:', result);
    console.log('[Simulation] Events found:', result.events.length);
    return result;
  } catch (error) {
    console.error('Failed to parse simulation JSON:', error);
    return { events: [], meterChanges: [], npcChanges: [] };
  }
}
