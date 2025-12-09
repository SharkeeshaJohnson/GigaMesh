'use client';

import { usePrivy, useIdentityToken } from '@privy-io/react-auth';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { Identity, NPC, Conversation, Message } from '@/lib/types';
import {
  getFromIndexedDB,
  saveToIndexedDB,
  getConversationsForNPC,
} from '@/lib/indexeddb';
import { useChat, useMemory } from '@/lib/reverbia';
import { MODEL_CONFIG, getModelForNPCTier } from '@/lib/models';

export default function ChatPage() {
  const { authenticated, ready } = usePrivy();
  const { identityToken } = useIdentityToken();
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

  const { sendMessage, isLoading, stop } = useChat({
    onError: (error) => {
      console.error('Chat error:', error);
      setStreamingMessage('');
    },
  });

  // Helper to extract content from API response
  const extractContent = (response: any): string => {
    if (typeof response === 'string') return response;
    if (!response) return '';

    const messageContent = (response as any)?.data?.choices?.[0]?.message?.content;

    if (Array.isArray(messageContent)) {
      return messageContent
        .filter((item: any) => item.type === 'text')
        .map((item: any) => item.text)
        .join('');
    } else if (typeof messageContent === 'string') {
      return messageContent;
    }

    return (response as any)?.choices?.[0]?.message?.content
      || (response as any)?.message?.content
      || (response as any)?.content
      || (response as any)?.text
      || 'I could not respond.';
  };

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
          setConversationId(crypto.randomUUID());
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

    const userInput = input.trim();
    const userMessage: Message = {
      role: 'user',
      content: userInput,
      timestamp: new Date(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setStreamingMessage('...');

    // Build system prompt for NPC
    const systemPrompt = buildNPCSystemPrompt(npc, identity, messages);

    // Get model based on NPC tier
    const model = getModelForNPCTier(npc.tier);

    // Search for relevant memories
    let relevantMemories: string[] = [];
    try {
      const memories = await searchMemories(`${npc.name} ${npc.role} ${userInput}`);
      relevantMemories = memories?.map((m: any) => m.content) || [];
    } catch (error) {
      console.error('Memory search failed:', error);
    }

    try {
      // Send message and get response
      const response = await sendMessage({
        messages: [
          {
            role: 'system',
            content: systemPrompt + (relevantMemories.length > 0
              ? `\n\nRELEVANT MEMORIES FROM PAST INTERACTIONS:\n${relevantMemories.join('\n')}`
              : ''),
          },
          ...messages.map((m) => ({ role: m.role, content: m.content })),
          { role: 'user', content: userInput },
        ],
        model,
      });

      // Extract content from response
      const assistantContent = extractContent(response);
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
          identityId: identity.id,
          day: identity.currentDay,
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
          <div className="text-xs text-japandi-brown-300 capitalize">{npc.tier}</div>
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
        {streamingMessage && (
          <div className="flex justify-start">
            <div className="max-w-[80%] p-3 rounded-lg bg-white text-japandi-brown-800 border border-japandi-brown-200">
              <div className="whitespace-pre-wrap">
                {formatMessageContent(streamingMessage)}
              </div>
              <div className="flex items-center gap-1 mt-2">
                <div className="w-2 h-2 bg-japandi-purple rounded-full animate-pulse" />
                <span className="text-xs text-japandi-brown-400">typing...</span>
              </div>
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

// Helper function to build NPC system prompt
function buildNPCSystemPrompt(npc: NPC, identity: Identity, recentMessages: Message[]): string {
  return `You are ${npc.name}, ${npc.role} to the player named ${identity.name}.

PERSONALITY: ${npc.personality}
BACKSTORY: ${npc.backstory}
CURRENT EMOTIONAL STATE: ${npc.currentEmotionalState}
RELATIONSHIP WITH PLAYER: ${npc.relationshipStatus}

DIFFICULTY MODE: ${identity.difficulty}
${identity.difficulty === 'dramatic' ? 'Be dramatic, emotional, create tension. Adult content allowed.' : ''}
${identity.difficulty === 'crazy' ? 'Be unpredictable, extreme, fully unfiltered. NSFW allowed.' : ''}

THINGS YOU KNOW (that the player may not know you know):
${npc.offScreenMemories.length > 0 ? npc.offScreenMemories.join('\n') : 'Nothing secret yet.'}

CURRENT GAME STATE:
Day: ${identity.currentDay}
Player's profession: ${identity.scenario.profession}

Respond as ${npc.name}. Stay in character. Your responses should:
1. Reflect your personality and emotional state
2. Reference past conversations when relevant
3. React to information you've learned (even off-screen)
4. Create potential for drama and consequences

FORMATTING RULES:
- Put actions/physical descriptions in *asterisks* on their OWN LINE before or after dialogue
- Never mix actions and dialogue on the same line
- Example format:
  *I cross my arms and glare at you*

  What do you think you're doing?

  *I step closer, my voice dropping to a whisper*

  Don't lie to me.

If the player does something that affects you emotionally, show it.
If you know something the player thinks you don't know, you can hint at it or confront them.

Keep responses conversational and natural. Don't be too verbose unless the situation calls for it.`;
}
