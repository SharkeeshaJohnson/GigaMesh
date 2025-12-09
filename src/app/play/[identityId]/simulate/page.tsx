'use client';

import { usePrivy, useIdentityToken } from '@privy-io/react-auth';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense, useRef } from 'react';
import {
  Identity,
  JumpType,
  SimulationResult,
  SimulationEvent,
  MeterChange,
  NPC,
} from '@/lib/types';
import {
  getFromIndexedDB,
  saveToIndexedDB,
  deleteFromIndexedDB,
  getConversationsForDay,
  getQueuedActions,
} from '@/lib/indexeddb';
import { useChat, useMemory } from '@/lib/reverbia';
import { MODEL_CONFIG } from '@/lib/models';

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
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [currentEventIndex, setCurrentEventIndex] = useState(0);
  const hasRunRef = useRef(false);

  const { sendMessage } = useChat({
    onError: (error) => {
      console.error('Simulation error:', error);
      setLoadingMessage('Error running simulation. Please try again.');
    },
  });

  const { extractMemoriesFromMessage } = useMemory();

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
        const updatedIdentity = applySimulationResults(loadedIdentity, simulationResult);
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

        setPhase('results');
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

    // Build simulation prompt
    const prompt = buildSimulationPrompt(identity, conversations, actions, jumpDays);

    // Run simulation via AI
    const response = await sendMessage({
      messages: [
        {
          role: 'system',
          content: 'You are a life simulation game master. Generate realistic, dramatic events based on player actions and NPC relationships. Always return valid JSON as specified. Be creative and consider consequences of actions.',
        },
        { role: 'user', content: prompt },
      ],
      model: MODEL_CONFIG.simulation,
    });

    setLoadingMessage('Processing results...');

    // Parse results - extract content from SDK response
    console.log('[Simulation] Raw response:', response);
    console.log('[Simulation] Response data:', (response as any)?.data);

    let content = '';

    // Helper to extract text from content (handles both string and array formats)
    const extractTextContent = (messageContent: any): string => {
      if (typeof messageContent === 'string') {
        return messageContent;
      }
      if (Array.isArray(messageContent)) {
        return messageContent
          .filter((item: any) => item.type === 'text')
          .map((item: any) => item.text)
          .join('');
      }
      return '';
    };

    // Try multiple paths to find the content
    const paths = [
      (response as any)?.data?.data?.choices?.[0]?.message?.content,
      (response as any)?.data?.choices?.[0]?.message?.content,
      (response as any)?.choices?.[0]?.message?.content,
      (response as any)?.message?.content,
      (response as any)?.content,
      (response as any)?.text,
    ];

    for (const path of paths) {
      if (path) {
        console.log('[Simulation] Trying path, found:', typeof path, Array.isArray(path) ? 'array' : '');
        const extracted = extractTextContent(path);
        if (extracted) {
          content = extracted;
          break;
        }
      }
    }

    console.log('[Simulation] Extracted content length:', content.length);
    console.log('[Simulation] Extracted content preview:', content.substring(0, 200));

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

    // Add new NPCs
    updated.npcs = [...updated.npcs, ...result.newNpcs];

    updated.lastPlayedAt = new Date();

    return updated;
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
      <main className="min-h-screen flex items-center justify-center bg-[var(--pixel-bg-dark)]">
        <div className="pixel-text text-[var(--pixel-text-dim)]">
          <span className="pixel-loading">Loading</span>
        </div>
      </main>
    );
  }

  // Loading phase
  if (phase === 'loading') {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-[var(--pixel-bg-dark)] relative">
        {/* Scanline overlay */}
        <div className="pixel-scanline" />

        {/* Background grid */}
        <div className="absolute inset-0 opacity-5">
          <div
            className="w-full h-full"
            style={{
              backgroundImage: `
                linear-gradient(var(--pixel-border) 1px, transparent 1px),
                linear-gradient(90deg, var(--pixel-border) 1px, transparent 1px)
              `,
              backgroundSize: '24px 24px',
            }}
          />
        </div>

        <div className="max-w-md text-center relative z-10">
          {/* ASCII loading animation */}
          <div className="pixel-frame mb-8 p-6">
            <pre className="pixel-label text-[var(--pixel-gold)] text-center text-xs leading-tight animate-pulse">
{`  ╔══════════════════╗
  ║   SIMULATING...  ║
  ╠══════════════════╣
  ║  [||||||||     ] ║
  ╚══════════════════╝`}
            </pre>
          </div>

          <h1 className="pixel-title text-[var(--pixel-parchment)] mb-2">
            {loadingMessage.toUpperCase()}
          </h1>
          <p className="pixel-text text-[var(--pixel-text-dim)]">
            Simulating {jumpType === 'day' ? '1 day' : '1 week'}...
          </p>
        </div>
      </main>
    );
  }

  // Results phase
  if (!result) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[var(--pixel-bg-dark)]">
        <div className="pixel-text text-[var(--pixel-text-dim)]">No results available</div>
      </main>
    );
  }

  const currentEvent = result.events[currentEventIndex];

  return (
    <main className="min-h-screen flex flex-col p-8 bg-[var(--pixel-bg-dark)] relative">
      {/* Scanline overlay */}
      <div className="pixel-scanline" />

      {/* Background grid */}
      <div className="absolute inset-0 opacity-5">
        <div
          className="w-full h-full"
          style={{
            backgroundImage: `
              linear-gradient(var(--pixel-border) 1px, transparent 1px),
              linear-gradient(90deg, var(--pixel-border) 1px, transparent 1px)
            `,
            backgroundSize: '24px 24px',
          }}
        />
      </div>

      <div className="max-w-3xl mx-auto w-full relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="pixel-frame inline-block p-4 mb-4">
            <pre className="pixel-label text-[var(--pixel-gold)] text-xs leading-tight">
{`╔══════════════════════╗
║   TIME HAS PASSED    ║
╚══════════════════════╝`}
            </pre>
          </div>
          <h1 className="pixel-title text-[var(--pixel-gold)] mb-2">
            DAY {result.fromDay} &gt; DAY {result.toDay}
          </h1>
          <p className="pixel-text text-[var(--pixel-text-dim)]">
            {result.events.length} event{result.events.length !== 1 ? 's' : ''} occurred
          </p>
        </div>

        {/* Event Carousel */}
        {result.events.length > 0 ? (
          <div className="pixel-frame mb-6">
            <div className="flex justify-between items-center mb-4">
              <span className="pixel-label text-[var(--pixel-text-dim)]">
                EVENT {currentEventIndex + 1}/{result.events.length}
              </span>
              <span
                className={`pixel-label text-xs ${
                  currentEvent.severity === 'minor'
                    ? 'text-[var(--pixel-text-dim)]'
                    : currentEvent.severity === 'moderate'
                      ? 'text-[var(--pixel-gold)]'
                      : currentEvent.severity === 'major'
                        ? 'text-[var(--pixel-purple)]'
                        : 'text-[var(--pixel-red)]'
                }`}
              >
                [{currentEvent.severity.toUpperCase()}]
              </span>
            </div>

            <h2 className="pixel-title text-lg text-[var(--pixel-parchment)] mb-3">
              {currentEvent.title.toUpperCase()}
            </h2>
            <p className="pixel-text text-[var(--pixel-text)] mb-4">{currentEvent.description}</p>

            {currentEvent.involvedNpcs && currentEvent.involvedNpcs.length > 0 && (
              <p className="pixel-text-small text-[var(--pixel-text-dim)] mb-2">
                &gt; Involved: {currentEvent.involvedNpcs.join(', ')}
              </p>
            )}

            {currentEvent.consequenceChain && (
              <div className="pixel-frame-inset p-3 mt-4">
                <span className="pixel-label text-[var(--pixel-gold)]">CAUSE:</span>
                <p className="pixel-text-small text-[var(--pixel-text-dim)] mt-1">{currentEvent.consequenceChain}</p>
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between mt-6">
              <button
                onClick={handlePrevEvent}
                disabled={currentEventIndex === 0}
                className="pixel-btn disabled:opacity-30"
              >
                &lt; PREV
              </button>
              <button
                onClick={handleNextEvent}
                disabled={currentEventIndex === result.events.length - 1}
                className="pixel-btn disabled:opacity-30"
              >
                NEXT &gt;
              </button>
            </div>
          </div>
        ) : (
          <div className="pixel-frame mb-6 text-center py-8">
            <p className="pixel-text text-[var(--pixel-text-dim)]">Nothing significant happened during this time.</p>
          </div>
        )}

        {/* Meter Changes */}
        {result.meterChanges.length > 0 && (
          <div className="pixel-frame mb-6">
            <div className="pixel-label text-[var(--pixel-gold)] mb-4">STAT CHANGES</div>
            <div className="space-y-3">
              {result.meterChanges.map((change, index) => {
                const diff = change.newValue - change.previousValue;
                const isPositive = diff > 0;
                const isNegative = diff < 0;

                return (
                  <div key={index} className="flex items-center justify-between pixel-frame-inset p-2">
                    <span className="pixel-label text-[var(--pixel-text-dim)] uppercase">
                      {change.meter.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="pixel-text-small text-[var(--pixel-text-dim)]">{change.previousValue}</span>
                      <span className="pixel-label text-[var(--pixel-text-dim)]">&gt;</span>
                      <span
                        className={`pixel-text-small ${
                          isPositive
                            ? 'text-[var(--pixel-green)]'
                            : isNegative
                              ? 'text-[var(--pixel-red)]'
                              : 'text-[var(--pixel-text)]'
                        }`}
                      >
                        {change.newValue}
                      </span>
                      <span
                        className={`pixel-label text-xs ${
                          isPositive
                            ? 'text-[var(--pixel-green)]'
                            : isNegative
                              ? 'text-[var(--pixel-red)]'
                              : 'text-[var(--pixel-text-dim)]'
                        }`}
                      >
                        ({isPositive ? '+' : ''}{diff})
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Continue Button */}
        <div className="text-center">
          <button onClick={handleContinue} className="pixel-btn pixel-btn-primary px-10 py-4">
            CONTINUE TO DAY {result.toDay}
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
        <main className="min-h-screen flex items-center justify-center bg-[var(--pixel-bg-dark)]">
          <div className="pixel-text text-[var(--pixel-text-dim)]">
            <span className="pixel-loading">Loading</span>
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
  const coreNPCs = identity.npcs.filter((n) => n.tier === 'core');
  const conversationSummary = conversations
    .map((c) => `Conversation with NPC ${c.npcId}: ${c.messages.length} messages`)
    .join('\n');
  const actionSummary = actions.map((a) => a.content).join('\n');

  return `Simulate ${jumpDays} day(s) for this life simulation game.

PLAYER: ${identity.name}
PROFESSION: ${identity.scenario.profession}
CURRENT DAY: ${identity.currentDay}
DIFFICULTY: ${identity.difficulty}

CURRENT METERS:
- Family Harmony: ${identity.meters.familyHarmony}
- Career Standing: ${identity.meters.careerStanding}
- Wealth: ${identity.meters.wealth}
- Mental Health: ${identity.meters.mentalHealth}
- Reputation: ${identity.meters.reputation}

CORE NPCS (generate off-screen events for these):
${coreNPCs.map((n) => `- ${n.name} (${n.role}): ${n.personality}. Current state: ${n.currentEmotionalState}`).join('\n')}

TODAY'S CONVERSATIONS:
${conversationSummary || 'No conversations today.'}

QUEUED ACTIONS:
${actionSummary || 'No actions queued.'}

${identity.difficulty === 'dramatic' ? 'Include dramatic events, secrets revealed, tensions. Adult themes allowed.' : ''}
${identity.difficulty === 'crazy' ? 'Include extreme, chaotic events. Maximum drama. Fully unfiltered.' : ''}

Generate realistic consequences based on conversations and actions. Core NPCs should have off-screen events that the player will discover later.

Return ONLY valid JSON in this format:
{
  "events": [
    {
      "title": "string",
      "description": "string",
      "involvedNpcs": ["npc names"],
      "consequenceChain": "cause → effect chain",
      "severity": "minor" | "moderate" | "major" | "life-changing"
    }
  ],
  "meterChanges": [
    {
      "meter": "familyHarmony" | "careerStanding" | "wealth" | "mentalHealth" | "reputation",
      "previousValue": number,
      "newValue": number,
      "reason": "string"
    }
  ],
  "npcChanges": [
    {
      "npcId": "string (use NPC name for now)",
      "changeType": "relationship" | "status" | "knowledge" | "emotional",
      "description": "string"
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
