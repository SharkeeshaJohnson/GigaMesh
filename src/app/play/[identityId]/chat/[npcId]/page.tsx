'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { Identity, NPC, Conversation, Message } from '@/lib/types';
import {
  getFromIndexedDB,
  saveToIndexedDB,
  getConversationsForNPC,
} from '@/lib/indexeddb';
import { useChat, useMemory } from '@/lib/reverbia';
import { MODEL_CONFIG, getModelForNPC } from '@/lib/models';
import {
  getNPCBehaviorGuidelines,
  PROHIBITED_CONTENT_PROMPT,
} from '@/lib/content-filter';
import {
  stripModelArtifacts,
  extractContentFromResponse,
  sanitizeUserInput,
} from '@/lib/llm-utils';
import {
  recordPlayerAction,
  getActiveStorySummary,
  getRelevantFactsForNPC,
} from '@/lib/narrative';

export default function ChatPage() {
  const { authenticated, ready } = usePrivy();
  const router = useRouter();
  const params = useParams();
  const identityId = params.identityId as string;
  const npcId = params.npcId as string;

  const [identity, setIdentity] = useState<Identity | null>(null);
  const [npc, setNpc] = useState<NPC | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streamingMessage, setStreamingMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [conversationId, setConversationId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Track accumulated stream content
  const streamAccumulatorRef = useRef('');

  const { sendMessage, isLoading, stop } = useChat({
    onData: (chunk) => {
      // Accumulate chunks and strip think tags as we go
      streamAccumulatorRef.current += chunk;
      const cleanedSoFar = stripModelArtifacts(streamAccumulatorRef.current);
      setStreamingMessage(cleanedSoFar);
    },
    onFinish: () => {
      // Reset accumulator when done
      streamAccumulatorRef.current = '';
    },
    onError: (error) => {
      console.error('Chat error:', error);
      setStreamingMessage('');
      streamAccumulatorRef.current = '';
    },
  });

  const { searchMemories, extractMemoriesFromMessage } = useMemory();

  useEffect(() => {
    if (ready && !authenticated) {
      router.push('/');
    }
  }, [ready, authenticated, router]);

  useEffect(() => {
    async function loadChat() {
      try {
        const loadedIdentity = await getFromIndexedDB('identities', identityId);
        if (!loadedIdentity) {
          router.push('/play');
          return;
        }
        setIdentity(loadedIdentity);

        const foundNpc = loadedIdentity.npcs.find((n) => n.id === npcId);
        if (!foundNpc) {
          router.push(`/play/${identityId}`);
          return;
        }
        setNpc(foundNpc);

        // Load existing conversations
        const conversations = await getConversationsForNPC(npcId);
        const todayConv = conversations.find((c) => c.day === loadedIdentity.currentDay);

        if (todayConv) {
          setConversationId(todayConv.id);
          setMessages(todayConv.messages);
        } else {
          // New conversation - create ID and potentially show opening scenario
          const newConvId = crypto.randomUUID();
          setConversationId(newConvId);

          // If NPC has an opening scenario that hasn't been used, display it
          if (foundNpc.openingScenario && !foundNpc.scenarioUsed) {
            // Add the opening scenario as the first message
            const scenarioMessage: Message = {
              role: 'assistant',
              content: foundNpc.openingScenario,
              timestamp: new Date(),
            };
            setMessages([scenarioMessage]);

            // Mark scenario as used and update identity
            const updatedNpcs = loadedIdentity.npcs.map((n) =>
              n.id === foundNpc.id ? { ...n, scenarioUsed: true } : n
            );
            const updatedIdentity = { ...loadedIdentity, npcs: updatedNpcs };
            await saveToIndexedDB('identities', updatedIdentity);
            setIdentity(updatedIdentity);

            // Save initial conversation with scenario
            const conversation: Conversation = {
              id: newConvId,
              npcId: foundNpc.id,
              identityId: loadedIdentity.id,
              day: loadedIdentity.currentDay,
              messages: [scenarioMessage],
              createdAt: new Date(),
            };
            await saveToIndexedDB('conversations', conversation);

            console.log(`[1:1 Chat] Displayed opening scenario for ${foundNpc.name}`);
          }
        }
      } catch (error) {
        console.error('Failed to load chat:', error);
        router.push(`/play/${identityId}`);
      } finally {
        setLoading(false);
      }
    }

    if (authenticated && identityId && npcId) {
      loadChat();
    }
  }, [authenticated, identityId, npcId, router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingMessage]);

  const handleSend = async () => {
    if (!input.trim() || !npc || !identity || isLoading) return;

    // SECURITY: Sanitize user input to prevent prompt injection
    const userInput = sanitizeUserInput(input.trim());
    const userMessage: Message = {
      role: 'user',
      content: userInput,
      timestamp: new Date(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    streamAccumulatorRef.current = ''; // Reset accumulator
    setStreamingMessage(''); // Will populate via onData streaming

    // ============================================
    // NARRATIVE ENGINE: Record player action
    // ============================================
    let updatedIdentity = identity;
    if (identity.narrativeState) {
      try {
        const updatedNarrativeState = recordPlayerAction(
          identity.narrativeState,
          userInput,
          npc.id,
          'chat',
          undefined, // no group participants in 1:1 chat
          identity
        );
        updatedIdentity = {
          ...identity,
          narrativeState: updatedNarrativeState,
        };
        // Save updated narrative state
        await saveToIndexedDB('identities', updatedIdentity);
        setIdentity(updatedIdentity);
        console.log('[Narrative] Recorded player action, tension:', updatedNarrativeState.globalTension);
      } catch (narError) {
        console.error('[Narrative] Failed to record action:', narError);
      }
    }

    // Build system prompt for NPC (now with narrative context)
    const systemPrompt = buildNPCSystemPrompt(npc, updatedIdentity);

    // Get model for NPC (uses assigned model or default)
    const model = getModelForNPC(npc);

    // Search for relevant memories
    let relevantMemories: string[] = [];
    try {
      const memories = await searchMemories(`${npc.name} ${npc.role} ${userInput}`);
      relevantMemories = memories?.map((m) => (m as { content?: string }).content || '') || [];
    } catch (error) {
      console.error('Memory search failed:', error);
    }

    // ============================================
    // NARRATIVE ENGINE: Build narrative context
    // ============================================
    let narrativeContext = '';
    if (updatedIdentity.narrativeState) {
      try {
        // Get active story beats that involve this NPC
        const storySummary = getActiveStorySummary(updatedIdentity.narrativeState, npc.id);

        // Get facts this NPC knows
        const npcFacts = getRelevantFactsForNPC(updatedIdentity.narrativeState, npc.id);

        // Get relationship info from narrative state
        const relationship = updatedIdentity.narrativeState.relationships.find(
          r => (r.fromId === npc.id && r.toId === 'player') ||
               (r.fromId === 'player' && r.toId === npc.id)
        );

        if (storySummary || npcFacts.length > 0 || relationship) {
          narrativeContext = '\n\n=== NARRATIVE CONTEXT ===';
          if (storySummary) {
            narrativeContext += `\nACTIVE STORY: ${storySummary}`;
          }
          if (npcFacts.length > 0) {
            narrativeContext += `\nWHAT ${npc.name.toUpperCase()} KNOWS: ${npcFacts.slice(0, 3).join('; ')}`;
          }
          if (relationship) {
            const m = relationship.metrics;
            narrativeContext += `\nRELATIONSHIP METRICS: Trust ${m.trust}, Fear ${m.fear}, Affection ${m.affection}`;
          }
          narrativeContext += `\nGLOBAL TENSION: ${updatedIdentity.narrativeState.globalTension}/100`;
        }
      } catch (narError) {
        console.error('[Narrative] Failed to build context:', narError);
      }
    }

    try {
      // Send message and get response
      const response = await sendMessage({
        messages: [
          {
            role: 'system',
            content: systemPrompt + narrativeContext + (relevantMemories.length > 0
              ? `\n\nRELEVANT MEMORIES FROM PAST INTERACTIONS:\n${relevantMemories.join('\n')}`
              : ''),
          },
          ...messages.map((m) => ({ role: m.role, content: m.content })),
          { role: 'user', content: userInput },
        ],
        model,
      });

      // Extract content from response
      const assistantContent = extractContentFromResponse(response) || 'I could not respond.';
      setStreamingMessage('');

      const assistantMessage: Message = {
        role: 'assistant',
        content: assistantContent,
        timestamp: new Date(),
      };

      const finalMessages = [...updatedMessages, assistantMessage];
      setMessages(finalMessages);

      // Save conversation to IndexedDB
      if (conversationId) {
        const conversation: Conversation = {
          id: conversationId,
          npcId: npc.id,
          identityId: updatedIdentity.id,
          day: updatedIdentity.currentDay,
          messages: finalMessages,
          createdAt: new Date(),
        };
        await saveToIndexedDB('conversations', conversation);
      }

      // Extract and store memories from the conversation
      try {
        const memoryMessages = [
          { role: 'user', content: userInput },
          { role: 'assistant', content: assistantContent },
        ];
        console.log('[Memory] Extracting memories from conversation...');
        const memoryResult = await extractMemoriesFromMessage({
          messages: memoryMessages,
          model: MODEL_CONFIG.memoryExtraction,
        });
        console.log('[Memory] Extraction result:', memoryResult);
      } catch (memError) {
        console.error('[Memory] Extraction failed:', memError);
      }
    } catch (error) {
      console.error('Chat error:', error);
      setStreamingMessage('');
    }
  };

  if (!ready || loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-japandi-brown-400">Loading...</div>
      </main>
    );
  }

  if (!identity || !npc) {
    return null;
  }

  return (
    <main className="h-screen flex flex-col">
      {/* Header */}
      <header className="flex items-center gap-4 p-4 border-b border-japandi-brown-200 bg-japandi-cream">
        <button
          onClick={() => router.push(`/play/${identityId}`)}
          className="text-japandi-brown-500 hover:text-japandi-brown-700"
        >
          ←
        </button>

        <div className="w-12 h-12 bg-japandi-brown-200 rounded pixel-art flex-shrink-0" />

        <div className="flex-1">
          <h1 className="font-serif text-xl text-japandi-brown-800">{npc.name}</h1>
          <p className="text-sm text-japandi-brown-500">
            {npc.role} • <span className="capitalize">{npc.currentEmotionalState}</span>
          </p>
        </div>

        <div className="text-right">
          <div className="text-sm text-japandi-brown-400">Day {identity.currentDay}</div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-japandi-brown-50">
        {messages.length === 0 && !streamingMessage && (
          <div className="text-center text-japandi-brown-400 py-8">
            <p className="mb-2">Start a conversation with {npc.name}</p>
            <p className="text-sm">{npc.role}</p>
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] p-3 rounded-lg ${
                message.role === 'user'
                  ? 'bg-japandi-brown-700 text-japandi-cream'
                  : 'bg-white text-japandi-brown-800 border border-japandi-brown-200'
              }`}
            >
              <div className="whitespace-pre-wrap">
                {message.role === 'assistant'
                  ? formatMessageContent(message.content)
                  : message.content}
              </div>
              <p
                className={`text-xs mt-1 ${
                  message.role === 'user' ? 'text-japandi-brown-300' : 'text-japandi-brown-400'
                }`}
              >
                {new Date(message.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>
        ))}

        {/* Streaming message */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-[80%] p-3 rounded-lg bg-white text-japandi-brown-800 border border-japandi-brown-200">
              {streamingMessage ? (
                <div className="whitespace-pre-wrap">
                  {formatMessageContent(streamingMessage)}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-japandi-purple rounded-full animate-pulse" />
                  <div className="w-2 h-2 bg-japandi-purple rounded-full animate-pulse delay-75" />
                  <div className="w-2 h-2 bg-japandi-purple rounded-full animate-pulse delay-150" />
                </div>
              )}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-japandi-brown-200 bg-japandi-cream">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder={`Say something to ${npc.name}...`}
            disabled={isLoading}
            className="flex-1 px-4 py-3 border border-japandi-brown-200 rounded-lg bg-white text-japandi-brown-800 placeholder-japandi-brown-400 disabled:opacity-50"
          />
          {isLoading ? (
            <button onClick={stop} className="btn-secondary px-6">
              Stop
            </button>
          ) : (
            <button onClick={handleSend} className="btn-primary px-6">
              Send
            </button>
          )}
        </div>
      </div>
    </main>
  );
}

// Helper function to format message content with actions in bold
function formatMessageContent(content: string): React.ReactNode {
  // Split by asterisk patterns and format actions
  const parts = content.split(/(\*[^*]+\*)/g);

  return parts.map((part, index) => {
    if (part.startsWith('*') && part.endsWith('*')) {
      // This is an action - render in italic/bold on its own line
      const actionText = part.slice(1, -1);
      return (
        <span key={index} className="block my-2 italic text-japandi-brown-500 font-medium">
          {actionText}
        </span>
      );
    }
    // Regular text - preserve whitespace
    if (part.trim()) {
      return <span key={index}>{part}</span>;
    }
    return null;
  });
}

// Helper function to build NPC system prompt - WITH CONTENT FILTERING AND STORY SEEDS
function buildNPCSystemPrompt(npc: NPC, identity: Identity): string {
  // Get NPC background from bullets or backstory (shorter)
  const npcBackground = npc.bullets?.length > 0
    ? npc.bullets.join('. ')
    : npc.backstory?.slice(0, 150) || '';

  // Get content-appropriate guidelines based on difficulty
  const npcBehavior = getNPCBehaviorGuidelines(identity.difficulty);

  // Check if NPC has unrevealed story seeds (individual stories for 1:1 chats)
  const unrevealedSeeds = npc.storySeeds?.filter(s => !s.revealedToPlayer) || [];
  const currentSeed = unrevealedSeeds[0]; // Get highest priority unrevealed seed

  // Build story seed section if NPC has something to share
  let storySeedSection = '';
  if (currentSeed) {
    storySeedSection = `

=== YOUR PERSONAL STORY ===
You have something on your mind you might share:
"${currentSeed.fact}"

IMPORTANT: Don't force this. If ${identity.name} seems uninterested, takes the conversation
in a different direction, or clearly wants to talk about something else - just roll with it
and be yourself. Only bring this up if it naturally fits the conversation.
If they're flirting, being romantic, or going off-topic - match their energy instead.`;
  }

  return `${PROHIBITED_CONTENT_PROMPT}

${npcBehavior}

You ARE ${npc.name}. You're ${npc.role} to ${identity.name} (a ${identity.scenario.profession}).
Your vibe: ${npc.personality}. Right now you're feeling: ${npc.currentEmotionalState}.
Your deal with ${identity.name}: ${npc.relationshipStatus}.
What you know: ${npcBackground}
${storySeedSection}

HOW TO RESPOND:
- 1-2 SHORT sentences max. One action in *asterisks* describing what you physically do.
- Sound like a REAL PERSON, not an AI. Use contractions, fragments, interruptions.
- NO flowery language. NO "I appreciate" or "I understand". NO therapy-speak.
- Be specific to YOUR character. React based on YOUR history with ${identity.name}.
- If ${npc.currentEmotionalState} is negative, show it. Be petty, bitter, cold, whatever fits.
- ADAPT to what ${identity.name} wants. If they go off-topic, follow their lead.

BAD (AI-sounding): "I must say, I find myself quite intrigued by your proposal."
GOOD (human): "Wait, you're serious?" *raises eyebrow* "Didn't think you had it in you."

/no_think
Just respond as ${npc.name}. No preamble. No thinking out loud. Dialogue + action only.`;
}
