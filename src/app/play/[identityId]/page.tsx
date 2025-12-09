'use client';

import { usePrivy, useIdentityToken } from '@privy-io/react-auth';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { Identity, NPC, Action, Message, Conversation, SimulationResult } from '@/lib/types';
import { getFromIndexedDB, saveToIndexedDB, getQueuedActions, getConversationsForNPC, getSimulationsForIdentity } from '@/lib/indexeddb';
import { useChat, useMemory } from '@/lib/reverbia';
import { MODEL_CONFIG, getModelForNPCTier } from '@/lib/models';

interface GroupMessage extends Message {
  npcId?: string;
  npcName?: string;
}

export default function GamePage() {
  const { authenticated, ready } = usePrivy();
  const { identityToken } = useIdentityToken();
  const router = useRouter();
  const params = useParams();
  const identityId = params.identityId as string;

  const [identity, setIdentity] = useState<Identity | null>(null);
  const [actions, setActions] = useState<Action[]>([]);
  const [newAction, setNewAction] = useState('');
  const [loading, setLoading] = useState(true);

  // Group chat state
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [input, setInput] = useState('');
  const [selectedNpc, setSelectedNpc] = useState<NPC | null>(null);
  const [showNpcInfo, setShowNpcInfo] = useState(false);
  const [expandedNpcId, setExpandedNpcId] = useState<string | null>(null);
  const [isResponding, setIsResponding] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [simulationHistory, setSimulationHistory] = useState<SimulationResult[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { sendMessage } = useChat({
    onError: (error) => {
      console.error('Chat error:', error);
      setIsResponding(false);
    },
  });

  const { searchMemories } = useMemory();

  // Helper to extract content from API response
  const extractContent = (response: any): string => {
    if (typeof response === 'string') return response;
    if (!response) return '';

    const paths = [
      (response as any)?.data?.data?.choices?.[0]?.message?.content,
      (response as any)?.data?.choices?.[0]?.message?.content,
      (response as any)?.choices?.[0]?.message?.content,
    ];

    for (const path of paths) {
      if (path) {
        if (Array.isArray(path)) {
          return path
            .filter((item: any) => item.type === 'text')
            .map((item: any) => item.text)
            .join('');
        } else if (typeof path === 'string') {
          return path;
        }
      }
    }

    return (response as any)?.message?.content
      || (response as any)?.content
      || (response as any)?.text
      || 'I could not respond.';
  };

  useEffect(() => {
    if (ready && !authenticated) {
      router.push('/');
    }
  }, [ready, authenticated, router]);

  useEffect(() => {
    async function loadGame() {
      try {
        const loadedIdentity = await getFromIndexedDB('identities', identityId);
        if (loadedIdentity) {
          loadedIdentity.lastPlayedAt = new Date();
          await saveToIndexedDB('identities', loadedIdentity);
          setIdentity(loadedIdentity);

          const queuedActions = await getQueuedActions(identityId);
          setActions(queuedActions);

          // Load group conversation
          const convId = `group-${identityId}-day-${loadedIdentity.currentDay}`;
          setConversationId(convId);

          // Try to load existing group conversation
          const existingConv = await getFromIndexedDB('conversations', convId);
          if (existingConv && existingConv.messages) {
            setMessages(existingConv.messages);
          }

          // Load simulation history
          const simulations = await getSimulationsForIdentity(identityId);
          // Sort by day, most recent first
          simulations.sort((a, b) => b.toDay - a.toDay);
          setSimulationHistory(simulations);
        } else {
          router.push('/play');
        }
      } catch (error) {
        console.error('Failed to load game:', error);
        router.push('/play');
      } finally {
        setLoading(false);
      }
    }

    if (authenticated && identityId) {
      loadGame();
    }
  }, [authenticated, identityId, router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Save conversation whenever messages change
  useEffect(() => {
    if (conversationId && identity && messages.length > 0) {
      const conversation: Conversation = {
        id: conversationId,
        npcId: 'group',
        identityId: identity.id,
        day: identity.currentDay,
        messages: messages,
        createdAt: new Date(),
      };
      saveToIndexedDB('conversations', conversation);
    }
  }, [messages, conversationId, identity]);

  const handleAddAction = async () => {
    if (!newAction.trim() || !identity) return;

    const action: Action = {
      id: crypto.randomUUID(),
      identityId: identity.id,
      day: identity.currentDay,
      content: newAction.trim(),
      status: 'queued',
      createdAt: new Date(),
    };

    await saveToIndexedDB('actions', action);
    setActions([...actions, action]);
    setNewAction('');
  };

  const handleRemoveAction = async (actionId: string) => {
    setActions(actions.filter((a) => a.id !== actionId));
  };

  const handleSimulate = (type: 'day' | 'week') => {
    router.push(`/play/${identityId}/simulate?type=${type}`);
  };

  // Send user message
  const handleSendMessage = () => {
    if (!input.trim() || !identity) return;

    const userMessage: GroupMessage = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
  };

  // Request NPC to respond (tap on NPC avatar)
  const handleNpcRespond = async (npc: NPC) => {
    if (!identity || isResponding) return;

    setIsResponding(true);
    setSelectedNpc(npc);

    try {
      // Build context from recent messages
      const recentMessages = messages.slice(-10);
      const systemPrompt = buildGroupChatPrompt(npc, identity, recentMessages, simulationHistory);

      // Get model based on NPC tier
      const model = getModelForNPCTier(npc.tier);

      // Search for relevant memories
      let relevantMemories: string[] = [];
      try {
        const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
        if (lastUserMsg) {
          const memories = await searchMemories(`${npc.name} ${npc.role} ${lastUserMsg.content}`);
          relevantMemories = memories?.map((m: any) => m.content) || [];
        }
      } catch (error) {
        console.error('Memory search failed:', error);
      }

      // Build messages for API
      const apiMessages = [
        {
          role: 'system',
          content: systemPrompt + (relevantMemories.length > 0
            ? `\n\nRELEVANT MEMORIES FROM PAST INTERACTIONS:\n${relevantMemories.join('\n')}`
            : ''),
        },
        ...recentMessages.map((m) => ({
          role: m.role === 'user' ? 'user' : 'assistant',
          content: m.npcName ? `[${m.npcName}]: ${m.content}` : m.content,
        })),
      ];

      const response = await sendMessage({
        messages: apiMessages as any,
        model,
      });

      const assistantContent = extractContent(response);

      const npcMessage: GroupMessage = {
        role: 'assistant',
        content: assistantContent,
        timestamp: new Date(),
        npcId: npc.id,
        npcName: npc.name,
      };

      setMessages((prev) => [...prev, npcMessage]);
    } catch (error) {
      console.error('NPC response error:', error);
    } finally {
      setIsResponding(false);
      setSelectedNpc(null);
    }
  };

  if (!ready || loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[var(--pixel-bg-dark)]">
        <div className="pixel-text text-[var(--pixel-text-dim)]">
          <span className="pixel-loading">Loading</span>
        </div>
      </main>
    );
  }

  if (!identity) {
    return null;
  }

  return (
    <main className="min-h-screen flex flex-col bg-[var(--pixel-bg-dark)]">
      {/* Scanline overlay */}
      <div className="pixel-scanline" />

      {/* Header */}
      <header className="flex justify-between items-center p-3 border-b-4 border-[var(--pixel-border)] bg-[var(--pixel-bg-mid)] relative z-20">
        <div>
          <h1 className="pixel-title text-lg text-[var(--pixel-gold)]">{identity.name.toUpperCase()}</h1>
          <p className="pixel-label text-[var(--pixel-text-dim)]">DAY {identity.currentDay}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={`pixel-btn text-xs ${showHistory ? 'bg-[var(--pixel-gold)] text-[var(--pixel-bg-dark)]' : ''}`}
            title="View History"
          >
            LOG
          </button>
          <button
            onClick={() => setShowNpcInfo(!showNpcInfo)}
            className={`pixel-btn text-xs ${showNpcInfo ? 'bg-[var(--pixel-gold)] text-[var(--pixel-bg-dark)]' : ''}`}
            title="View NPC Info"
          >
            NPC
          </button>
          <button onClick={() => router.push('/play')} className="pixel-btn text-xs">
            EXIT
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Panel: Character Profile */}
        <div className="w-80 border-r-4 border-[var(--pixel-border)] bg-[var(--pixel-bg-mid)] flex flex-col overflow-hidden">
          {/* Character Profile */}
          <div className="p-4 border-b-4 border-[var(--pixel-border)]">
            <div className="pixel-frame-inset p-3 mb-3">
              <div className="pixel-label text-[var(--pixel-text-dim)] mb-1">CLASS</div>
              <div className="pixel-text text-[var(--pixel-text)]">
                {identity.scenario.profession}
              </div>
              <div className="pixel-text-small text-[var(--pixel-text-dim)] capitalize mt-1">
                {identity.persona?.replace(/-/g, ' ') || identity.gender}
              </div>
            </div>

            {/* Scrollable backstory */}
            <div className="max-h-20 overflow-y-auto pixel-text-small text-[var(--pixel-text-dim)] mb-4 pr-2 scrollbar-thin">
              {identity.scenario.backstory}
            </div>

            {/* Meters */}
            <div className="space-y-2">
              <PixelMeter label="FAM" value={identity.meters.familyHarmony} />
              <PixelMeter label="JOB" value={identity.meters.careerStanding} />
              <PixelMeter label="$$$" value={identity.meters.wealth} />
              <PixelMeter label="MND" value={identity.meters.mentalHealth} />
              <PixelMeter label="REP" value={identity.meters.reputation} />
            </div>
          </div>

          {/* Actions Panel */}
          <div className="p-4 border-b-4 border-[var(--pixel-border)] flex-shrink-0">
            <div className="pixel-label text-[var(--pixel-gold)] mb-2">
              ACTIONS - DAY {identity.currentDay}
            </div>
            <div className="space-y-1 mb-2 max-h-20 overflow-y-auto">
              {actions.map((action) => (
                <div key={action.id} className="flex items-start gap-1 pixel-text-small">
                  <span className="text-[var(--pixel-gold)]">&gt;</span>
                  <span className="flex-1 text-[var(--pixel-text)]">{action.content}</span>
                  <button
                    onClick={() => handleRemoveAction(action.id)}
                    className="text-[var(--pixel-red)] hover:text-[var(--pixel-text)]"
                  >
                    X
                  </button>
                </div>
              ))}
              {actions.length === 0 && (
                <p className="pixel-text-small text-[var(--pixel-text-dim)]">No actions queued</p>
              )}
            </div>
            <div className="flex gap-1">
              <input
                type="text"
                value={newAction}
                onChange={(e) => setNewAction(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddAction()}
                placeholder="Add action..."
                className="flex-1 px-2 py-1 bg-[var(--pixel-bg-dark)] border-2 border-[var(--pixel-border)] text-[var(--pixel-text)] pixel-text-small focus:outline-none focus:border-[var(--pixel-gold)]"
              />
              <button onClick={handleAddAction} className="pixel-btn text-xs px-3">
                +
              </button>
            </div>
          </div>

          {/* Time Jump */}
          <div className="p-4 flex-shrink-0">
            <div className="pixel-label text-[var(--pixel-gold)] mb-2">TIME JUMP</div>
            <div className="flex gap-2">
              <button onClick={() => handleSimulate('day')} className="pixel-btn pixel-btn-primary flex-1 py-2">
                +1 DAY
              </button>
              <button onClick={() => handleSimulate('week')} className="pixel-btn flex-1 py-2">
                +1 WEEK
              </button>
            </div>
          </div>
        </div>

        {/* Right Panel: Group Chat */}
        <div className="flex-1 flex flex-col bg-[var(--pixel-bg-dark)] relative">
          {/* History Panel (Overlay) */}
          {showHistory && (
            <div className="absolute inset-0 bg-[var(--pixel-bg-dark)] z-10 overflow-y-auto">
              <div className="p-4 border-b-4 border-[var(--pixel-border)] flex justify-between items-center sticky top-0 bg-[var(--pixel-bg-mid)]">
                <h2 className="pixel-title text-[var(--pixel-gold)]">EVENT LOG</h2>
                <button
                  onClick={() => setShowHistory(false)}
                  className="pixel-btn text-xs"
                >
                  CLOSE
                </button>
              </div>
              <div className="p-4 space-y-4">
                {simulationHistory.length === 0 ? (
                  <p className="pixel-text text-[var(--pixel-text-dim)] text-center py-8">No history yet. Advance time to create events.</p>
                ) : (
                  simulationHistory.map((sim) => (
                    <div key={sim.id} className="pixel-frame">
                      <div className="flex justify-between items-center mb-3">
                        <span className="pixel-label text-[var(--pixel-gold)]">
                          DAY {sim.fromDay} &gt; DAY {sim.toDay}
                        </span>
                        <span className="pixel-text-small text-[var(--pixel-text-dim)]">
                          {sim.events.length} event{sim.events.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      {sim.events.length > 0 ? (
                        <div className="space-y-2">
                          {sim.events.map((event, idx) => (
                            <div key={idx} className="pixel-frame-inset p-2">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`pixel-label text-xs ${
                                  event.severity === 'minor' ? 'text-[var(--pixel-text-dim)]' :
                                  event.severity === 'moderate' ? 'text-[var(--pixel-gold)]' :
                                  event.severity === 'major' ? 'text-[var(--pixel-purple)]' :
                                  'text-[var(--pixel-red)]'
                                }`}>
                                  [{event.severity.toUpperCase()}]
                                </span>
                                <span className="pixel-text-small text-[var(--pixel-parchment)]">{event.title}</span>
                              </div>
                              <p className="pixel-text-small text-[var(--pixel-text-dim)]">{event.description}</p>
                              {event.involvedNpcs && event.involvedNpcs.length > 0 && (
                                <p className="pixel-text-small text-[var(--pixel-text-dim)] mt-1">
                                  &gt; {event.involvedNpcs.join(', ')}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="pixel-text-small text-[var(--pixel-text-dim)]">Nothing significant happened</p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* NPC Info Panel (Overlay) */}
          {showNpcInfo && (
            <div className="absolute inset-0 bg-[var(--pixel-bg-dark)] z-10 overflow-y-auto">
              <div className="p-4 border-b-4 border-[var(--pixel-border)] flex justify-between items-center sticky top-0 bg-[var(--pixel-bg-mid)]">
                <h2 className="pixel-title text-[var(--pixel-gold)]">CHARACTERS</h2>
                <button
                  onClick={() => setShowNpcInfo(false)}
                  className="pixel-btn text-xs"
                >
                  CLOSE
                </button>
              </div>
              <div className="p-4 space-y-2">
                {identity.npcs.map((npc) => (
                  <div key={npc.id} className={`pixel-frame overflow-hidden ${npc.isDead ? 'border-[var(--pixel-red)]' : ''}`}>
                    <button
                      onClick={() => setExpandedNpcId(expandedNpcId === npc.id ? null : npc.id)}
                      className="w-full p-3 flex items-center gap-3 hover:bg-[var(--pixel-surface)]"
                    >
                      <div className="relative w-10 h-10 flex-shrink-0">
                        <div className={`pixel-avatar w-10 h-10 ${npc.isDead ? 'dead' : ''}`} />
                      </div>
                      <div className="flex-1 text-left">
                        <div className={`pixel-text-small ${npc.isDead ? 'text-[var(--pixel-text-dim)] line-through' : 'text-[var(--pixel-parchment)]'}`}>
                          {npc.name}
                        </div>
                        <div className={`pixel-label text-xs ${npc.isDead ? 'text-[var(--pixel-red)]' : 'text-[var(--pixel-text-dim)]'}`}>
                          {npc.isDead ? `DECEASED (DAY ${npc.deathDay})` : npc.role}
                        </div>
                      </div>
                      <span className="pixel-label text-[var(--pixel-text-dim)]">{expandedNpcId === npc.id ? 'v' : '>'}</span>
                    </button>
                    {expandedNpcId === npc.id && (
                      <div className="px-3 pb-3 pt-0 border-t-2 border-[var(--pixel-border)]">
                        <div className="space-y-2 mt-2">
                          {npc.isDead && (
                            <div className="pixel-frame-inset p-2 border-[var(--pixel-red)]">
                              <span className="pixel-label text-[var(--pixel-red)]">CAUSE OF DEATH:</span>
                              <p className="pixel-text-small text-[var(--pixel-text)]">{npc.deathCause || 'Unknown'}</p>
                            </div>
                          )}
                          <div>
                            <span className="pixel-label text-[var(--pixel-text-dim)]">PERSONALITY:</span>
                            <p className="pixel-text-small text-[var(--pixel-text)]">{npc.personality}</p>
                          </div>
                          <div>
                            <span className="pixel-label text-[var(--pixel-text-dim)]">BACKGROUND:</span>
                            <p className="pixel-text-small text-[var(--pixel-text)]">{npc.backstory}</p>
                          </div>
                          <div>
                            <span className="pixel-label text-[var(--pixel-text-dim)]">RELATIONSHIP:</span>
                            <p className="pixel-text-small text-[var(--pixel-text)]">{npc.relationshipStatus}</p>
                          </div>
                          <div>
                            <span className="pixel-label text-[var(--pixel-text-dim)]">MOOD:</span>
                            <p className="pixel-text-small text-[var(--pixel-text)] capitalize">{npc.currentEmotionalState}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="text-center py-8">
                <div className="pixel-frame inline-block p-6">
                  <p className="pixel-text text-[var(--pixel-gold)] mb-2">WELCOME, {identity.name.toUpperCase()}</p>
                  <p className="pixel-text-small text-[var(--pixel-text-dim)]">Send a message, then tap an NPC to respond</p>
                </div>
              </div>
            )}

            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.role === 'assistant' && (
                  <div className="pixel-avatar w-8 h-8 mr-2 flex-shrink-0" />
                )}
                <div
                  className={`max-w-[70%] p-3 ${
                    message.role === 'user'
                      ? 'pixel-frame bg-[var(--pixel-surface)]'
                      : 'pixel-frame-inset'
                  }`}
                >
                  {message.npcName && (
                    <div className="pixel-label text-[var(--pixel-gold)] mb-1">
                      {message.npcName.toUpperCase()}
                    </div>
                  )}
                  <div className="whitespace-pre-wrap pixel-text-small text-[var(--pixel-text)]">
                    {message.role === 'assistant' ? formatMessageContent(message.content) : message.content}
                  </div>
                  <p className="pixel-text-small text-[var(--pixel-text-dim)] mt-1 text-right">
                    {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}

            {isResponding && selectedNpc && (
              <div className="flex justify-start">
                <div className="pixel-avatar w-8 h-8 mr-2 flex-shrink-0 animate-pulse" />
                <div className="pixel-frame-inset p-3">
                  <div className="pixel-label text-[var(--pixel-gold)] mb-1">{selectedNpc.name.toUpperCase()}</div>
                  <div className="pixel-text-small text-[var(--pixel-text-dim)]">
                    <span className="pixel-loading">typing</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* NPC Selector Bar */}
          <div className="border-t-4 border-[var(--pixel-border)] bg-[var(--pixel-bg-mid)] p-2">
            <div className="pixel-text-small text-[var(--pixel-text-dim)] mb-2 text-center">
              TAP CHARACTER TO RESPOND
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 justify-center">
              {identity.npcs.map((npc) => (
                <button
                  key={npc.id}
                  onClick={() => !npc.isDead && handleNpcRespond(npc)}
                  disabled={isResponding || npc.isDead}
                  className={`flex flex-col items-center p-2 transition-all min-w-[60px] ${
                    npc.isDead
                      ? 'opacity-40 cursor-not-allowed'
                      : isResponding && selectedNpc?.id === npc.id
                        ? 'pixel-frame bg-[var(--pixel-gold)]'
                        : 'pixel-frame hover:border-[var(--pixel-gold)]'
                  } ${isResponding && !npc.isDead && selectedNpc?.id !== npc.id ? 'opacity-50' : ''}`}
                  title={npc.isDead ? `${npc.name} is deceased` : `Ask ${npc.name} to respond`}
                >
                  <div className={`pixel-avatar w-8 h-8 mb-1 ${npc.isDead ? 'dead' : ''}`} />
                  <span className={`pixel-label text-xs truncate max-w-[50px] ${
                    npc.isDead ? 'text-[var(--pixel-text-dim)] line-through' :
                    isResponding && selectedNpc?.id === npc.id ? 'text-[var(--pixel-bg-dark)]' : 'text-[var(--pixel-text)]'
                  }`}>
                    {npc.name.split(' ')[0].toUpperCase()}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Input */}
          <div className="p-3 border-t-4 border-[var(--pixel-border)] bg-[var(--pixel-bg-mid)]">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                placeholder="Type a message..."
                className="flex-1 px-4 py-2 bg-[var(--pixel-bg-dark)] border-4 border-[var(--pixel-border)] text-[var(--pixel-text)] pixel-text focus:outline-none focus:border-[var(--pixel-gold)]"
              />
              <button
                onClick={handleSendMessage}
                disabled={!input.trim()}
                className="pixel-btn pixel-btn-primary px-6 disabled:opacity-50"
              >
                SEND
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

// Helper Components
function PixelMeter({ label, value }: { label: string; value: number }) {
  const getColor = (val: number) => {
    if (val >= 70) return 'var(--pixel-green)';
    if (val >= 40) return 'var(--pixel-gold)';
    return 'var(--pixel-red)';
  };

  return (
    <div className="flex items-center gap-2">
      <span className="pixel-label text-[var(--pixel-text-dim)] w-8">{label}</span>
      <div className="flex-1 h-3 bg-[var(--pixel-bg-dark)] border-2 border-[var(--pixel-border)] overflow-hidden">
        <div
          className="h-full transition-all"
          style={{ width: `${value}%`, backgroundColor: getColor(value) }}
        />
      </div>
      <span className="pixel-label text-[var(--pixel-text-dim)] w-8 text-right">{value}</span>
    </div>
  );
}

// Format message content with actions in italic
function formatMessageContent(content: string): React.ReactNode {
  const parts = content.split(/(\*[^*]+\*)/g);

  return parts.map((part, index) => {
    if (part.startsWith('*') && part.endsWith('*')) {
      const actionText = part.slice(1, -1);
      return (
        <span key={index} className="block my-2 text-[var(--pixel-text-dim)]">
          *{actionText}*
        </span>
      );
    }
    if (part.trim()) {
      return <span key={index}>{part}</span>;
    }
    return null;
  });
}

// Build system prompt for group chat
function buildGroupChatPrompt(
  npc: NPC,
  identity: Identity,
  recentMessages: GroupMessage[],
  simulationHistory: SimulationResult[]
): string {
  // Get other NPCs who have spoken recently
  const otherSpeakers = [...new Set(recentMessages
    .filter(m => m.npcId && m.npcId !== npc.id)
    .map(m => m.npcName)
  )];

  // Build simulation history context - all events from all simulations
  const historyContext = simulationHistory.length > 0
    ? simulationHistory
        .sort((a, b) => a.fromDay - b.fromDay) // Sort by day ascending
        .map(sim => {
          const events = sim.events
            .map(e => {
              const involvedStr = e.involvedNpcs?.length
                ? ` (Involved: ${e.involvedNpcs.join(', ')})`
                : '';
              return `  - ${e.title}: ${e.description}${involvedStr}`;
            })
            .join('\n');
          return `Day ${sim.fromDay}-${sim.toDay}:\n${events || '  No significant events'}`;
        })
        .join('\n\n')
    : '';

  // Get events specifically involving this NPC
  const npcSpecificEvents = simulationHistory.flatMap(sim =>
    sim.events.filter(e =>
      e.involvedNpcs?.some(name => name.toLowerCase() === npc.name.toLowerCase()) ||
      e.description.toLowerCase().includes(npc.name.toLowerCase())
    ).map(e => `Day ${sim.fromDay}: ${e.title} - ${e.description}`)
  );

  // Get info about deceased NPCs
  const deadNpcs = identity.npcs.filter(n => n.isDead);
  const deadNpcInfo = deadNpcs.length > 0
    ? deadNpcs.map(n => `${n.name} died on Day ${n.deathDay}: ${n.deathCause}`).join('\n')
    : '';

  return `You are ${npc.name}, ${npc.role} to ${identity.name}.

PERSONALITY: ${npc.personality}
BACKSTORY: ${npc.backstory}
CURRENT EMOTIONAL STATE: ${npc.currentEmotionalState}
RELATIONSHIP WITH ${identity.name.toUpperCase()}: ${npc.relationshipStatus}
${npc.offScreenMemories?.length ? `\nTHINGS YOU KNOW (that ${identity.name} may not know):\n${npc.offScreenMemories.map(m => `- ${m}`).join('\n')}` : ''}

DIFFICULTY MODE: ${identity.difficulty}
${identity.difficulty === 'dramatic' ? 'Be dramatic, emotional, create tension. Adult content allowed.' : ''}
${identity.difficulty === 'crazy' ? 'Be unpredictable, extreme, fully unfiltered. NSFW allowed.' : ''}

CURRENT DAY: ${identity.currentDay}

${historyContext ? `IMPORTANT - PAST EVENTS IN THIS WORLD (you remember ALL of these):\n${historyContext}` : ''}

${npcSpecificEvents.length > 0 ? `\nEVENTS THAT DIRECTLY INVOLVED YOU:\n${npcSpecificEvents.map(e => `- ${e}`).join('\n')}` : ''}

${deadNpcInfo ? `\nDECEASED CHARACTERS:\n${deadNpcInfo}` : ''}

This is a GROUP CONVERSATION. You may respond to:
- ${identity.name} (the player)
${otherSpeakers.length > 0 ? `- Other people in the conversation: ${otherSpeakers.join(', ')}` : ''}

You can address the player directly, respond to what another character said, or make observations about the group dynamic.
You should reference past events when relevant - you remember everything that has happened.

FORMATTING RULES:
- Put actions/physical descriptions in *asterisks* on their OWN LINE
- Example:
  *I roll my eyes*

  Really? That's what you're going with?

Stay in character. Be natural and reactive to the conversation flow.`;
}
