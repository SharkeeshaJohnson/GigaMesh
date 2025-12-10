'use client';

import { usePrivy, useIdentityToken } from '@privy-io/react-auth';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { Identity, NPC, Action, Message, Conversation, SimulationResult } from '@/lib/types';
import { getFromIndexedDB, saveToIndexedDB, getQueuedActions, getConversationsForNPC, getSimulationsForIdentity } from '@/lib/indexeddb';
import { useChat, useMemory, useModels } from '@/lib/reverbia';
import { MODEL_CONFIG, getModelForNPCTier, getModelForNPC, filterAvailableModels, assignModelsToNPCs } from '@/lib/models';
import { parseImageTags, inferImageType, generateCharacterConsistentImage } from '@/lib/image-generation';
import { cacheChatImage, getCachedChatImage } from '@/lib/sprite-cache';
import {
  selectRevelationForNPC,
  buildRevelationPrompt,
  detectAndMarkRevelation,
  generateStorySeeds,
  StorySeed,
  RevelationOptions,
} from '@/lib/narrative';

// Persona to sprite mapping for migration (matches create page CHARACTER_SPRITES)
const PERSONA_SPRITE_MAP: Record<string, string> = {
  'man': 'https://backblaze.pixellab.ai/file/pixellab-characters/0d64bd67-d677-43e0-8926-b89a45b8d74a/2dc75f18-f7ea-40e7-8fb0-489f59c3a3a1/rotations/south.png?t=1765310837621',
  'woman': 'https://backblaze.pixellab.ai/file/pixellab-characters/0d64bd67-d677-43e0-8926-b89a45b8d74a/8f475f9f-272a-4e29-abab-dbe2be0da067/rotations/south.png?t=1765310837621',
  'gay-man': 'https://backblaze.pixellab.ai/file/pixellab-characters/0d64bd67-d677-43e0-8926-b89a45b8d74a/62c02269-903c-4d4a-a8ec-710cbb195b08/rotations/south.png',
  'gay-woman': 'https://backblaze.pixellab.ai/file/pixellab-characters/0d64bd67-d677-43e0-8926-b89a45b8d74a/93aab9ab-3642-43b2-b3b7-6c4c2b66df6d/rotations/south.png?t=1765310837606',
  'teacher': 'https://backblaze.pixellab.ai/file/pixellab-characters/0d64bd67-d677-43e0-8926-b89a45b8d74a/b66867ae-41a2-40e9-9ded-b931097bdc10/rotations/south.png?t=1765310825629',
  'doctor': 'https://backblaze.pixellab.ai/file/pixellab-characters/0d64bd67-d677-43e0-8926-b89a45b8d74a/046f0dc6-9ba6-4e4b-9204-aca8d60d8f3b/rotations/south.png',
  'student': 'https://backblaze.pixellab.ai/file/pixellab-characters/0d64bd67-d677-43e0-8926-b89a45b8d74a/693033c5-4c49-4dba-b993-6662db2bf5b3/rotations/south.png',
  'fat-boy': 'https://backblaze.pixellab.ai/file/pixellab-characters/0d64bd67-d677-43e0-8926-b89a45b8d74a/a911574b-37dc-4e7f-b3b2-40b651c5259e/rotations/south.png?t=1765310837659',
  'fat-girl': 'https://backblaze.pixellab.ai/file/pixellab-characters/0d64bd67-d677-43e0-8926-b89a45b8d74a/22a86890-78c7-4cc6-8a90-681b2ce85b6c/rotations/south.png',
  'black-man': 'https://backblaze.pixellab.ai/file/pixellab-characters/0d64bd67-d677-43e0-8926-b89a45b8d74a/d8159f31-5aa3-463f-a3ca-f982d0bf2ecb/rotations/south.png',
  'black-woman': 'https://backblaze.pixellab.ai/file/pixellab-characters/0d64bd67-d677-43e0-8926-b89a45b8d74a/84b48e89-0ec8-4ead-bfa6-c4a724f8db77/rotations/south.png?t=1765310825626',
  'dominatrix': 'https://backblaze.pixellab.ai/file/pixellab-characters/0d64bd67-d677-43e0-8926-b89a45b8d74a/2d3c6279-716c-4f2d-afa4-2d569d53d553/rotations/south.png?t=1765310825621',
  'closeted-bully': 'https://backblaze.pixellab.ai/file/pixellab-characters/0d64bd67-d677-43e0-8926-b89a45b8d74a/76a33b6b-334f-4349-8cb3-41b0eb6dfa5b/rotations/south.png',
  'executive': 'https://backblaze.pixellab.ai/file/pixellab-characters/0d64bd67-d677-43e0-8926-b89a45b8d74a/2e515f86-d60d-4319-bce8-91a3d4014f96/rotations/south.png',
  'influencer': 'https://backblaze.pixellab.ai/file/pixellab-characters/0d64bd67-d677-43e0-8926-b89a45b8d74a/c509c8dd-be00-420b-876b-61764afef9db/rotations/south.png',
  'grandmother': 'https://backblaze.pixellab.ai/file/pixellab-characters/0d64bd67-d677-43e0-8926-b89a45b8d74a/d1989864-9d7c-4274-9435-ef4a22c930a9/rotations/south.png',
  'ex-convict': 'https://backblaze.pixellab.ai/file/pixellab-characters/0d64bd67-d677-43e0-8926-b89a45b8d74a/25eed221-84a2-4fe1-8e5e-8d6293c7b871/rotations/south.png',
  'startup-founder': 'https://backblaze.pixellab.ai/file/pixellab-characters/0d64bd67-d677-43e0-8926-b89a45b8d74a/a35ea963-d469-4f33-bd8b-2b501380073f/rotations/south.png',
  'trophy-wife': 'https://backblaze.pixellab.ai/file/pixellab-characters/0d64bd67-d677-43e0-8926-b89a45b8d74a/fd3e234f-8a06-4444-a386-0b9ee331cbe1/rotations/south.png',
};

// NPC sprite pool for random assignment (same as create page)
const NPC_SPRITE_POOL = [
  'https://backblaze.pixellab.ai/file/pixellab-characters/0d64bd67-d677-43e0-8926-b89a45b8d74a/2dc75f18-f7ea-40e7-8fb0-489f59c3a3a1/rotations/south.png',
  'https://backblaze.pixellab.ai/file/pixellab-characters/0d64bd67-d677-43e0-8926-b89a45b8d74a/8f475f9f-272a-4e29-abab-dbe2be0da067/rotations/south.png',
  'https://backblaze.pixellab.ai/file/pixellab-characters/0d64bd67-d677-43e0-8926-b89a45b8d74a/62c02269-903c-4d4a-a8ec-710cbb195b08/rotations/south.png',
  'https://backblaze.pixellab.ai/file/pixellab-characters/0d64bd67-d677-43e0-8926-b89a45b8d74a/93aab9ab-3642-43b2-b3b7-6c4c2b66df6d/rotations/south.png',
  'https://backblaze.pixellab.ai/file/pixellab-characters/0d64bd67-d677-43e0-8926-b89a45b8d74a/b66867ae-41a2-40e9-9ded-b931097bdc10/rotations/south.png',
  'https://backblaze.pixellab.ai/file/pixellab-characters/0d64bd67-d677-43e0-8926-b89a45b8d74a/7c0fa009-320f-44d5-a03f-68d24a63c6e7/rotations/south.png',
  'https://backblaze.pixellab.ai/file/pixellab-characters/0d64bd67-d677-43e0-8926-b89a45b8d74a/046f0dc6-9ba6-4e4b-9204-aca8d60d8f3b/rotations/south.png',
  'https://backblaze.pixellab.ai/file/pixellab-characters/0d64bd67-d677-43e0-8926-b89a45b8d74a/0a8fddc0-7319-4e8f-9c52-5cdcc096f72a/rotations/south.png',
  'https://backblaze.pixellab.ai/file/pixellab-characters/0d64bd67-d677-43e0-8926-b89a45b8d74a/693033c5-4c49-4dba-b993-6662db2bf5b3/rotations/south.png',
  'https://backblaze.pixellab.ai/file/pixellab-characters/0d64bd67-d677-43e0-8926-b89a45b8d74a/70a91e3d-0b5a-4547-85ef-0f63f8a045e3/rotations/south.png',
  'https://backblaze.pixellab.ai/file/pixellab-characters/0d64bd67-d677-43e0-8926-b89a45b8d74a/a911574b-37dc-4e7f-b3b2-40b651c5259e/rotations/south.png',
  'https://backblaze.pixellab.ai/file/pixellab-characters/0d64bd67-d677-43e0-8926-b89a45b8d74a/22a86890-78c7-4cc6-8a90-681b2ce85b6c/rotations/south.png',
  'https://backblaze.pixellab.ai/file/pixellab-characters/0d64bd67-d677-43e0-8926-b89a45b8d74a/d8159f31-5aa3-463f-a3ca-f982d0bf2ecb/rotations/south.png',
  'https://backblaze.pixellab.ai/file/pixellab-characters/0d64bd67-d677-43e0-8926-b89a45b8d74a/84b48e89-0ec8-4ead-bfa6-c4a724f8db77/rotations/south.png',
  'https://backblaze.pixellab.ai/file/pixellab-characters/0d64bd67-d677-43e0-8926-b89a45b8d74a/2d3c6279-716c-4f2d-afa4-2d569d53d553/rotations/south.png',
  'https://backblaze.pixellab.ai/file/pixellab-characters/0d64bd67-d677-43e0-8926-b89a45b8d74a/76a33b6b-334f-4349-8cb3-41b0eb6dfa5b/rotations/south.png',
  // NPC-only sprites
  'https://backblaze.pixellab.ai/file/pixellab-characters/0d64bd67-d677-43e0-8926-b89a45b8d74a/2e515f86-d60d-4319-bce8-91a3d4014f96/rotations/south.png',
  'https://backblaze.pixellab.ai/file/pixellab-characters/0d64bd67-d677-43e0-8926-b89a45b8d74a/c509c8dd-be00-420b-876b-61764afef9db/rotations/south.png',
  'https://backblaze.pixellab.ai/file/pixellab-characters/0d64bd67-d677-43e0-8926-b89a45b8d74a/d1989864-9d7c-4274-9435-ef4a22c930a9/rotations/south.png',
  'https://backblaze.pixellab.ai/file/pixellab-characters/0d64bd67-d677-43e0-8926-b89a45b8d74a/25eed221-84a2-4fe1-8e5e-8d6293c7b871/rotations/south.png',
  'https://backblaze.pixellab.ai/file/pixellab-characters/0d64bd67-d677-43e0-8926-b89a45b8d74a/a35ea963-d469-4f33-bd8b-2b501380073f/rotations/south.png',
  'https://backblaze.pixellab.ai/file/pixellab-characters/0d64bd67-d677-43e0-8926-b89a45b8d74a/fd3e234f-8a06-4444-a386-0b9ee331cbe1/rotations/south.png',
];

interface GroupMessage extends Message {
  npcId?: string;
  npcName?: string;
  imageUrl?: string; // Generated image URL for this message
  imageType?: 'selfie' | 'scene' | 'meme' | 'reaction' | 'memory' | 'evidence';
  isGeneratingImage?: boolean; // True while image is being generated
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

  // Conversation management
  const [allConversations, setAllConversations] = useState<{ id: string; title: string; npcIds: string[]; lastMessage?: string; updatedAt: Date; autoConverse?: boolean }[]>([]);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [selectedChatNpcs, setSelectedChatNpcs] = useState<string[]>([]);
  const [showBackstory, setShowBackstory] = useState(false);
  const [showActionsModal, setShowActionsModal] = useState(false);
  const [showSimulateModal, setShowSimulateModal] = useState(false);
  const [editingConvId, setEditingConvId] = useState<string | null>(null);
  const [editingConvName, setEditingConvName] = useState('');
  const [showConvMenu, setShowConvMenu] = useState<string | null>(null);

  // Gallery state
  const [showGallery, setShowGallery] = useState(false);
  const [selectedGalleryImage, setSelectedGalleryImage] = useState<{ url: string; npcName?: string; type?: string; timestamp: Date } | null>(null);

  // Revelation tracking state - prevents duplicate revelations in same conversation
  const [revealedSeedIds, setRevealedSeedIds] = useState<string[]>([]);
  const [lastMajorRevealNpcId, setLastMajorRevealNpcId] = useState<string | null>(null);

  // Get current conversation's auto-converse state
  const currentConversation = allConversations.find(c => c.id === conversationId);
  const autoConverse = currentConversation?.autoConverse || false;
  const autoConverseRef = useRef(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { sendMessage } = useChat({
    onError: (error) => {
      console.error('Chat error:', error);
      setIsResponding(false);
    },
  });

  const { searchMemories } = useMemory();

  // Debug: List available models
  const { models } = useModels();
  useEffect(() => {
    if (models && models.length > 0) {
      console.log('[Available Models]:', models.map((m: any) => m.id || m.name || m).join('\n'));
      // Find Dobby models
      const dobbyModels = models.filter((m: any) =>
        (m.id || m.name || '').toLowerCase().includes('dobby')
      );
      console.log('[Dobby Models]:', dobbyModels);
    }
  }, [models]);

  // Helper to strip model artifacts (thinking tags, special tokens)
  const stripModelArtifacts = (content: string): string => {
    let clean = content;
    // Remove <think>...</think> blocks
    clean = clean.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    // Handle unclosed think tags
    const thinkStart = clean.indexOf('<think>');
    if (thinkStart !== -1) {
      clean = clean.slice(0, thinkStart).trim();
    }
    // Remove Qwen/model special tokens like <|im_start|>message, <|im_end|>, etc.
    clean = clean.replace(/<\|im_start\|>[\w]*/gi, '').trim();
    clean = clean.replace(/<\|im_end\|>/gi, '').trim();
    clean = clean.replace(/<\|.*?\|>/g, '').trim(); // Generic special token removal
    return clean;
  };

  // Detect garbage/code output from models that went off the rails
  const isGarbageResponse = (content: string): boolean => {
    // Check for code patterns
    const codePatterns = [
      /#include\s*</, // C/C++ includes
      /^import\s+\w+/, // Python/JS imports
      /function\s+\w+\s*\(/, // Function definitions
      /\bvoid\s+\w+\s*\(/, // C void functions
      /\bint\s+\w+\s*\(/, // C int functions
      /\bchar\s*\*/, // C char pointers
      /^\s*{[\s\S]*}[\s;]*$/, // JSON-like blocks
      /\bprintf\s*\(/, // printf calls
      /\bstrcpy\s*\(/, // strcpy calls
      /\bfopen\s*\(/, // file operations
      /\breturn\s+0x/, // hex returns
      /^\s*<\?php/, // PHP
      /^\s*<!DOCTYPE/, // HTML
      /^\s*<html/i, // HTML
    ];

    for (const pattern of codePatterns) {
      if (pattern.test(content)) {
        console.warn('[Garbage Detection] Code pattern detected:', pattern.toString());
        return true;
      }
    }

    // Check for high density of programming symbols
    const codeSymbols = (content.match(/[{};\[\]<>()=&|!]/g) || []).length;
    const wordCount = content.split(/\s+/).length;
    if (wordCount > 5 && codeSymbols / wordCount > 0.5) {
      console.warn('[Garbage Detection] High code symbol density:', codeSymbols / wordCount);
      return true;
    }

    return false;
  };

  // Helper to extract content from API response
  const extractContent = (response: any): string => {
    let content = '';

    console.log('[extractContent] Raw response:', JSON.stringify(response).slice(0, 500));

    if (typeof response === 'string') {
      content = response;
    } else if (response) {
      const paths = [
        (response as any)?.data?.data?.choices?.[0]?.message?.content,
        (response as any)?.data?.choices?.[0]?.message?.content,
        (response as any)?.choices?.[0]?.message?.content,
      ];

      for (const path of paths) {
        if (path) {
          console.log('[extractContent] Found path:', typeof path, Array.isArray(path) ? 'array' : '');
          if (Array.isArray(path)) {
            // First try to get 'text' type content
            content = path
              .filter((item: any) => item.type === 'text')
              .map((item: any) => item.text)
              .join('');

            // If text is empty, try 'thinking' content as fallback (Qwen quirk)
            if (!content.trim()) {
              const thinkingContent = path
                .filter((item: any) => item.type === 'thinking')
                .map((item: any) => item.thinking || '')
                .join('');
              if (thinkingContent) {
                console.log('[extractContent] Using thinking content as fallback');
                content = thinkingContent;
              }
            }
            break;
          } else if (typeof path === 'string') {
            content = path;
            break;
          }
        }
      }

      if (!content) {
        content = (response as any)?.message?.content
          || (response as any)?.content
          || (response as any)?.text
          || '';
      }
    }

    console.log('[extractContent] Before stripModelArtifacts:', content.slice(0, 300));

    // Strip model artifacts (thinking tags, special tokens)
    const stripped = stripModelArtifacts(content);
    console.log('[extractContent] After stripModelArtifacts:', stripped.slice(0, 300));

    return stripped || 'I could not respond.';
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

          // Migration: Assign player sprite based on persona if missing
          if (!loadedIdentity.pixelArtUrl && loadedIdentity.persona) {
            const spriteUrl = PERSONA_SPRITE_MAP[loadedIdentity.persona];
            if (spriteUrl) {
              loadedIdentity.pixelArtUrl = spriteUrl;
              console.log(`[Migration] Assigned sprite to player based on persona: ${loadedIdentity.persona}`);
            }
          }

          // Migration: Assign sprites to NPCs that don't have them
          let needsSave = false;
          const shuffledSprites = [...NPC_SPRITE_POOL].sort(() => Math.random() - 0.5);
          loadedIdentity.npcs.forEach((npc: NPC, index: number) => {
            if (!npc.pixelArtUrl) {
              npc.pixelArtUrl = shuffledSprites[index % shuffledSprites.length];
              needsSave = true;
              console.log(`[Migration] Assigned sprite to NPC: ${npc.name}`);
            }
          });

          // Migration: Generate story seeds for existing saves that don't have them
          if (!loadedIdentity.storySeeds || loadedIdentity.storySeeds.length === 0) {
            const newSeeds = generateStorySeeds(loadedIdentity, 8);
            loadedIdentity.storySeeds = newSeeds;
            needsSave = true;
            console.log(`[Migration] Generated ${newSeeds.length} story seeds for narrative engine`);
          }

          // Note: Model assignment is handled by a separate useEffect that waits for models to load

          await saveToIndexedDB('identities', loadedIdentity);
          setIdentity(loadedIdentity);

          const queuedActions = await getQueuedActions(identityId);
          setActions(queuedActions);

          // Load group conversation - this is the default "All NPCs" conversation
          const convId = `group-${identityId}`;
          setConversationId(convId);

          // Try to load existing group conversation
          const existingConv = await getFromIndexedDB('conversations', convId);
          if (existingConv && existingConv.messages && existingConv.messages.length > 0) {
            // Restore Date objects that may have been serialized as strings
            const restoredMessages = existingConv.messages.map((m: GroupMessage) => ({
              ...m,
              timestamp: m.timestamp instanceof Date ? m.timestamp : new Date(m.timestamp),
            }));
            setMessages(restoredMessages);
            console.log(`[Load] Restored ${restoredMessages.length} messages from conversation ${convId}`);
          } else {
            console.log(`[Load] No existing messages found for conversation ${convId}`);
          }

          // Create default "All NPCs" conversation entry
          const allNpcIds = loadedIdentity.npcs.filter((n: NPC) => !n.isDead).map((n: NPC) => n.id);
          const existingMessages = existingConv?.messages as GroupMessage[] | undefined;
          const defaultConv = {
            id: convId,
            title: 'All NPCs',
            npcIds: allNpcIds,
            lastMessage: existingMessages && existingMessages.length > 0
              ? existingMessages[existingMessages.length - 1]?.content?.slice(0, 50)
              : undefined,
            updatedAt: new Date(),
          };
          setAllConversations([defaultConv]);

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

  // Assign diverse models to NPCs when models list becomes available
  // ALWAYS reassign to ensure variety (don't preserve old assignments)
  useEffect(() => {
    async function assignNPCModels() {
      if (!identity || !models || models.length === 0) return;

      const availableModels = filterAvailableModels(models as any);
      console.log('[Models] Available models:', availableModels.map(m => m.split('/').pop()));

      // If we only have 1-2 models, skip reassignment (no variety possible)
      if (availableModels.length <= 2) {
        console.log('[Models] Not enough model variety, using tier-based defaults');
        return;
      }

      // Create deterministic but diverse assignments based on NPC index
      // This ensures variety while being stable across reloads
      const updatedNpcs = identity.npcs.map((npc: NPC, index: number) => {
        // Use modulo to cycle through available models
        const modelIndex = index % availableModels.length;
        const newModel = availableModels[modelIndex];

        // Only update if different to avoid unnecessary saves
        if (npc.assignedModel !== newModel) {
          return { ...npc, assignedModel: newModel };
        }
        return npc;
      });

      // Check if any changes were made
      const hasChanges = updatedNpcs.some((npc, i) => npc.assignedModel !== identity.npcs[i].assignedModel);

      if (hasChanges) {
        const updatedIdentity = { ...identity, npcs: updatedNpcs };
        setIdentity(updatedIdentity);
        await saveToIndexedDB('identities', updatedIdentity);
        console.log(`[Models] Assigned diverse models to NPCs:`,
          updatedNpcs.map((n: NPC) => `${n.name}: ${n.assignedModel?.split('/').pop()}`).join(', '));
      } else {
        console.log(`[Models] NPCs already have diverse models:`,
          identity.npcs.map((n: NPC) => `${n.name}: ${n.assignedModel?.split('/').pop()}`).join(', '));
      }
    }

    assignNPCModels();
  }, [identity?.id, models]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Save conversation whenever messages change
  useEffect(() => {
    async function saveConversation() {
      if (!conversationId || !identity || messages.length === 0) return;

      try {
        // Serialize messages to ensure Date objects are preserved
        const serializedMessages = messages.map(m => ({
          ...m,
          timestamp: m.timestamp instanceof Date ? m.timestamp : new Date(m.timestamp),
        }));

        const conversation: Conversation = {
          id: conversationId,
          npcId: 'group',
          identityId: identity.id,
          day: identity.currentDay,
          messages: serializedMessages,
          createdAt: new Date(),
        };

        await saveToIndexedDB('conversations', conversation);
        console.log(`[Save] Saved ${messages.length} messages to conversation ${conversationId}`);

        // Update conversation list with last message
        setAllConversations(prev => prev.map(conv =>
          conv.id === conversationId
            ? { ...conv, lastMessage: messages[messages.length - 1]?.content?.slice(0, 50), updatedAt: new Date() }
            : conv
        ));
      } catch (error) {
        console.error('[Save] Failed to save conversation:', error);
      }
    }

    saveConversation();
  }, [messages, conversationId, identity]);

  // Auto-conversation effect - NPCs respond to each other
  useEffect(() => {
    // Must have auto-converse enabled and not already responding
    if (!autoConverse || isResponding || !identity || messages.length === 0) return;

    // Get the current conversation's NPC IDs
    const currentConv = allConversations.find(c => c.id === conversationId);
    const conversationNpcIds = currentConv?.npcIds || identity.npcs.map(n => n.id);

    // Need at least 2 NPCs for auto-conversation
    if (conversationNpcIds.length < 2) return;

    // Get NPCs in this conversation who are alive
    const availableNpcs = identity.npcs.filter(n =>
      !n.isDead && conversationNpcIds.includes(n.id)
    );

    if (availableNpcs.length < 2) return;

    // Get the last message
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage) return;

    // Pick a random NPC who isn't the one who just spoke (or the user)
    const eligibleNpcs = availableNpcs.filter(n => n.id !== lastMessage.npcId);
    if (eligibleNpcs.length === 0) return;

    const randomNpc = eligibleNpcs[Math.floor(Math.random() * eligibleNpcs.length)];

    // Set a quick timeout to trigger the response (200-800ms for snappy conversation)
    const timeout = setTimeout(() => {
      // Double-check we should still respond
      if (autoConverseRef.current) {
        handleNpcRespond(randomNpc);
      }
    }, 2000 + Math.random() * 2000); // 2-4 second delay for readable conversation pacing

    return () => clearTimeout(timeout);
  }, [messages, autoConverse, isResponding, identity, allConversations, conversationId]);

  // Sync autoConverseRef with current conversation's state
  useEffect(() => {
    autoConverseRef.current = autoConverse;
  }, [autoConverse]);

  // Reset revelation tracking when conversation changes
  useEffect(() => {
    setRevealedSeedIds([]);
    setLastMajorRevealNpcId(null);
  }, [conversationId]);

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

  // Conversation management functions
  const handleRenameConversation = (convId: string, newName: string) => {
    if (!newName.trim()) return;
    setAllConversations(prev => prev.map(c =>
      c.id === convId ? { ...c, title: newName.trim() } : c
    ));
    setEditingConvId(null);
    setEditingConvName('');
  };

  const handleDeleteConversation = (convId: string) => {
    // Don't allow deleting the default "All NPCs" conversation
    if (convId === `group-${identityId}`) return;

    setAllConversations(prev => prev.filter(c => c.id !== convId));
    // If we deleted the current conversation, switch to the default
    if (conversationId === convId) {
      const defaultConvId = `group-${identityId}`;
      // Clear any pending response state when switching conversations
      setIsResponding(false);
      setSelectedNpc(null);
      setConversationId(defaultConvId);
      // Load default conversation messages
      getFromIndexedDB('conversations', defaultConvId).then((loaded) => {
        if (loaded?.messages) {
          setMessages(loaded.messages as GroupMessage[]);
        } else {
          setMessages([]);
        }
      });
    }
    setShowConvMenu(null);
  };

  const handleMoveConversation = (convId: string, direction: 'up' | 'down') => {
    // Don't move the default "All NPCs" conversation
    if (convId === `group-${identityId}`) return;

    setAllConversations(prev => {
      const index = prev.findIndex(c => c.id === convId);
      if (index === -1) return prev;

      // Can't move first item up (except default which stays at 0)
      // Can't move last item down
      const newIndex = direction === 'up' ? index - 1 : index + 1;

      // Don't allow moving into position 0 (reserved for default)
      if (newIndex < 1 || newIndex >= prev.length) return prev;

      const newArr = [...prev];
      [newArr[index], newArr[newIndex]] = [newArr[newIndex], newArr[index]];
      return newArr;
    });
    setShowConvMenu(null);
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
      // Build context from recent messages - limit to last 6 to reduce tokens
      const recentMessages = messages.slice(-6);

      // Pass revelation state for coordination
      const revelationState = {
        revealedSeedIds,
        majorRevealedThisRound: lastMajorRevealNpcId !== null && lastMajorRevealNpcId !== npc.id,
      };
      const systemPrompt = buildGroupChatPrompt(npc, identity, recentMessages, simulationHistory, revelationState);

      // Get model for this NPC (uses assigned model for variety, falls back to tier-based)
      const model = getModelForNPC(npc);
      console.log(`[NPC Model] ${npc.name} using: ${model.split('/').pop()}`);

      // Search for relevant memories (skip to reduce latency/tokens)
      const relevantMemories: string[] = [];

      // Build messages for API - CRITICAL: Only mark messages as 'assistant' if from THIS NPC
      // Other NPCs' messages should be 'user' role to avoid confusing the model
      const apiMessages = [
        {
          role: 'system',
          content: systemPrompt,
        },
        ...recentMessages.map((m) => {
          if (m.role === 'user') {
            // User messages stay as user
            return { role: 'user', content: `[${identity.name}]: ${m.content}` };
          } else {
            // NPC messages: only mark as 'assistant' if from THIS NPC
            // Other NPCs' messages become 'user' role with name prefix
            if (m.npcId === npc.id) {
              return { role: 'assistant', content: m.content };
            } else {
              return { role: 'user', content: `[${m.npcName}]: ${m.content}` };
            }
          }
        }),
      ];

      // Try up to 3 times on empty or repetitive response
      let assistantContent = '';
      let lastSimilarTo = '';
      for (let attempt = 0; attempt < 3; attempt++) {
        // On retry due to similarity, add explicit instruction
        const retryMessages = attempt > 0 && lastSimilarTo
          ? [
              ...apiMessages,
              {
                role: 'user',
                content: `[SYSTEM: Your last response was too similar to what ${lastSimilarTo} said. Say something COMPLETELY DIFFERENT. Be original!]`,
              },
            ]
          : apiMessages;

        const response = await sendMessage({
          messages: retryMessages as any,
          model,
        });

        assistantContent = extractContent(response);

        // Check if empty
        if (!assistantContent || assistantContent === 'I could not respond.') {
          console.log(`[NPC Response] Attempt ${attempt + 1} returned empty, retrying...`);
          await new Promise(resolve => setTimeout(resolve, 300));
          continue;
        }

        // Check for garbage/code output (model went off the rails)
        if (isGarbageResponse(assistantContent)) {
          console.log(`[NPC Response] Attempt ${attempt + 1} returned garbage/code, retrying...`);
          await new Promise(resolve => setTimeout(resolve, 300));
          continue;
        }

        // Check for similarity to recent messages
        const similarityCheck = checkResponseSimilarity(assistantContent, recentMessages);
        if (similarityCheck.isSimilar) {
          console.log(`[NPC Response] Attempt ${attempt + 1} too similar to ${similarityCheck.similarTo}, retrying...`);
          lastSimilarTo = similarityCheck.similarTo || 'someone';
          await new Promise(resolve => setTimeout(resolve, 300));
          continue;
        }

        // Good response, break
        break;
      }

      // If still empty after retries, generate a contextual fallback
      if (!assistantContent || assistantContent === 'I could not respond.') {
        // Get the last message to generate a relevant reaction
        const lastMsg = recentMessages.length > 0 ? recentMessages[recentMessages.length - 1] : null;
        const lastSpeaker = lastMsg?.npcName || identity.name;

        // Generate fallbacks based on NPC's emotional state and context
        const emotionalFallbacks: Record<string, string[]> = {
          angry: [
            `*${npc.name} clenches jaw* Don't push me, ${lastSpeaker}.`,
            `*${npc.name} slams hand on table* You don't get to lecture me.`,
            `*${npc.name} glares* We're not done here.`,
          ],
          suspicious: [
            `*${npc.name} narrows eyes at ${lastSpeaker}* That's... interesting.`,
            `*${npc.name} crosses arms* I'm listening. Go on.`,
            `*${npc.name} studies ${lastSpeaker} carefully* And you expect me to believe that?`,
          ],
          scared: [
            `*${npc.name} shifts nervously* I... I don't know what you're talking about.`,
            `*${npc.name} backs away slightly* Why are you bringing this up now?`,
            `*${npc.name}'s voice wavers* Can we talk about something else?`,
          ],
          guilty: [
            `*${npc.name} avoids eye contact* That's not... it wasn't like that.`,
            `*${npc.name} swallows hard* How much do you actually know?`,
            `*${npc.name} looks down* I can explain...`,
          ],
          default: [
            `*${npc.name} pauses, processing what ${lastSpeaker} said* Well...`,
            `*${npc.name} raises an eyebrow at ${lastSpeaker}* Is that so?`,
            `*${npc.name} takes a breath* There's more to this story.`,
          ],
        };

        const emotionKey = npc.currentEmotionalState?.toLowerCase() || 'default';
        const options = emotionalFallbacks[emotionKey] || emotionalFallbacks.default;
        assistantContent = options[Math.floor(Math.random() * options.length)];
      }

      // Parse for image tags [IMG:description]
      const { cleanedText, imageRequests } = parseImageTags(assistantContent);

      const npcMessage: GroupMessage = {
        role: 'assistant',
        content: cleanedText || assistantContent,
        timestamp: new Date(),
        npcId: npc.id,
        npcName: npc.name,
        isGeneratingImage: imageRequests.length > 0,
      };

      // Add message immediately (possibly with loading state for image)
      setMessages((prev) => [...prev, npcMessage]);

      // NARRATIVE ENGINE: Track revelations after NPC response
      // This detects if the NPC revealed a story seed and updates tracking
      const storySeeds = identity.storySeeds || [];
      if (storySeeds.length > 0 && assistantContent) {
        const { revealed, updatedSeeds } = detectAndMarkRevelation(
          assistantContent,
          npc.id,
          storySeeds
        );

        if (revealed) {
          console.log(`[Narrative] ${npc.name} revealed: "${revealed.fact}"`);

          // Track this revelation locally (for conversation coordination)
          setRevealedSeedIds(prev => [...prev, revealed.id]);
          if (revealed.severity === 'major' || revealed.severity === 'explosive') {
            setLastMajorRevealNpcId(npc.id);
          }

          // Update identity's story seeds in state and persist to IndexedDB
          const updatedIdentity = { ...identity, storySeeds: updatedSeeds };
          setIdentity(updatedIdentity);
          saveToIndexedDB('identities', updatedIdentity);
        }
      }

      // Generate image asynchronously if requested
      if (imageRequests.length > 0 && identityToken) {
        const imageDesc = imageRequests[0].description;
        const imageType = inferImageType(imageDesc, npc.name);

        // Check cache first
        const cachedUrl = await getCachedChatImage(npc.id, imageDesc);
        if (cachedUrl) {
          // Update message with cached image
          setMessages((prev) =>
            prev.map((m) =>
              m === npcMessage
                ? { ...m, imageUrl: cachedUrl, imageType, isGeneratingImage: false }
                : m
            )
          );
        } else {
          // Generate character-consistent image using sprite compositing
          generateCharacterConsistentImage(
            {
              type: imageType,
              npcName: npc.name,
              npcAppearance: npc.backstory?.slice(0, 100),
              description: imageDesc,
              emotion: npc.currentEmotionalState,
              npcSpriteUrl: npc.pixelArtUrl, // Pass sprite for compositing
              playerSpriteUrl: identity.pixelArtUrl, // Player sprite if needed
              includePlayer: imageDesc.toLowerCase().includes(' us ') || imageDesc.toLowerCase().includes(' we '),
            },
            identityToken
          ).then(async (result) => {
            if (result.success && result.imageUrl) {
              // Cache the generated image
              await cacheChatImage(npc.id, imageDesc, result.imageUrl);

              // Update message with generated image
              setMessages((prev) =>
                prev.map((m) =>
                  m.timestamp === npcMessage.timestamp && m.npcId === npc.id
                    ? { ...m, imageUrl: result.imageUrl, imageType, isGeneratingImage: false }
                    : m
                )
              );
            } else {
              // Clear generating state on failure
              setMessages((prev) =>
                prev.map((m) =>
                  m.timestamp === npcMessage.timestamp && m.npcId === npc.id
                    ? { ...m, isGeneratingImage: false }
                    : m
                )
              );
              console.error('Image generation failed:', result.error);
            }
          });
        }
      }
    } catch (error) {
      console.error('NPC response error:', error);
      // Even on error, add a fallback message
      const errorMessage: GroupMessage = {
        role: 'assistant',
        content: `*${npc.name} seems distracted and doesn't respond*`,
        timestamp: new Date(),
        npcId: npc.id,
        npcName: npc.name,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsResponding(false);
      setSelectedNpc(null);
    }
  };

  if (!ready || loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="win95-window p-8">
          <span className="win95-text win95-loading">Loading game</span>
        </div>
      </main>
    );
  }

  if (!identity) {
    return null;
  }

  return (
    <main className="h-screen flex flex-col overflow-hidden">
      {/* Header - Win95 Title Bar Style */}
      <header className="win95-titlebar flex-shrink-0" style={{ borderRadius: 0 }}>
        <div className="flex items-center gap-3">
          <span className="win95-titlebar-text">{identity.name} - Day {identity.currentDay}</span>
          <span
            className="px-2 py-0.5 text-xs"
            style={{
              background: 'rgba(255,255,255,0.2)',
              fontSize: '11px',
            }}
          >
            {identity.scenario.profession}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="win95-titlebar-btn"
            style={{
              background: showHistory ? 'var(--win95-accent-light)' : undefined,
              width: 'auto',
              padding: '2px 8px',
              fontSize: '11px',
            }}
            title="View Simulation History"
          >
            Sim Log
          </button>
          <button
            onClick={() => setShowNpcInfo(!showNpcInfo)}
            className="win95-titlebar-btn"
            style={{
              background: showNpcInfo ? 'var(--win95-accent-light)' : undefined,
              width: 'auto',
              padding: '2px 8px',
              fontSize: '11px',
            }}
            title="View NPC Info"
          >
            NPCs
          </button>
          <button
            onClick={() => router.push('/play')}
            className="win95-titlebar-btn"
            title="Exit Game"
          >
            ×
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative" style={{ background: 'var(--win95-mid)' }}>
        {/* Left Panel: Character Profile with Full-Body Sprite - Tamagotchi/Sprout style */}
        <div
          className="w-72 flex flex-col overflow-hidden"
          style={{
            background: 'var(--win95-light)',
            borderRight: '2px solid var(--win95-border-dark)',
          }}
        >
          {/* Character Sprite Display - Central feature like a Tamagotchi pet */}
          <div className="p-3 flex-shrink-0" style={{ borderBottom: '2px solid var(--win95-border-dark)' }}>
            <div className="win95-groupbox">
              <span className="win95-groupbox-label">Character</span>
              {/* Full-body sprite in center */}
              <div
                className="w-full aspect-square max-h-32 flex items-center justify-center mb-2 mx-auto"
                style={{
                  background: 'linear-gradient(180deg, var(--win95-lightest) 0%, var(--win95-light) 100%)',
                  border: '2px solid var(--win95-border-dark)',
                  boxShadow: 'inset 2px 2px 0 var(--win95-lightest), inset -2px -2px 0 var(--win95-border-dark)',
                }}
              >
                {identity.pixelArtUrl ? (
                  <img
                    src={identity.pixelArtUrl}
                    alt={identity.name}
                    className="h-full w-auto object-contain"
                    style={{ imageRendering: 'pixelated' }}
                  />
                ) : (
                  <span className="text-4xl">🌱</span>
                )}
              </div>
              {/* Character info below sprite */}
              <div className="text-center">
                <div className="win95-text" style={{ fontWeight: 'bold', fontSize: '14px' }}>
                  {identity.scenario.profession}
                </div>
                <div className="win95-text" style={{ fontSize: '11px', color: 'var(--win95-text-dim)', textTransform: 'capitalize' }}>
                  {identity.persona?.replace(/-/g, ' ') || 'Startup Founder'}
                </div>
              </div>
              {/* Expandable Backstory Dropdown */}
              <button
                onClick={() => setShowBackstory(!showBackstory)}
                className="w-full mt-2 py-1 px-2 flex items-center justify-between"
                style={{
                  background: showBackstory ? 'var(--win95-lightest)' : 'var(--win95-mid)',
                  border: '1px solid var(--win95-border-dark)',
                  fontSize: '10px',
                }}
              >
                <span>Your Story</span>
                <span>{showBackstory ? '▼' : '▶'}</span>
              </button>
              {showBackstory && (
                <div
                  className="mt-1 p-2 text-left overflow-y-auto"
                  style={{
                    background: 'white',
                    border: '1px solid var(--win95-border-dark)',
                    maxHeight: '150px',
                    boxShadow: 'inset 1px 1px 0 var(--win95-border-darker)',
                  }}
                >
                  {/* Brief Background */}
                  {identity.scenario.briefBackground && identity.scenario.briefBackground.length > 0 && (
                    <div className="mb-2">
                      <p className="win95-text" style={{ fontSize: '9px', color: 'var(--win95-text-dim)', marginBottom: '2px' }}>PAST:</p>
                      {identity.scenario.briefBackground.map((item, idx) => (
                        <p key={idx} className="win95-text" style={{ fontSize: '10px', lineHeight: '1.3', marginBottom: '2px' }}>
                          • {item}
                        </p>
                      ))}
                    </div>
                  )}
                  {/* Current Story */}
                  {identity.scenario.currentStory && identity.scenario.currentStory.length > 0 && (
                    <div className="mb-2">
                      <p className="win95-text" style={{ fontSize: '9px', color: 'var(--win95-text-dim)', marginBottom: '2px' }}>PRESENT:</p>
                      {identity.scenario.currentStory.map((item, idx) => (
                        <p key={idx} className="win95-text" style={{ fontSize: '10px', lineHeight: '1.3', marginBottom: '2px' }}>
                          • {item}
                        </p>
                      ))}
                    </div>
                  )}
                  {/* Legacy backstory fallback */}
                  {identity.scenario.backstory && !identity.scenario.briefBackground?.length && (
                    <p className="win95-text" style={{ fontSize: '10px', lineHeight: '1.4' }}>
                      {identity.scenario.backstory}
                    </p>
                  )}
                  {/* No content fallback */}
                  {!identity.scenario.backstory && !identity.scenario.briefBackground?.length && !identity.scenario.currentStory?.length && (
                    <p className="win95-text" style={{ fontSize: '10px', color: 'var(--win95-text-dim)' }}>
                      No backstory available.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Meters with Pixelated Icons - 4 core stats only */}
          <div className="p-3 flex-shrink-0" style={{ borderBottom: '2px solid var(--win95-border-dark)' }}>
            <div className="win95-groupbox">
              <span className="win95-groupbox-label">Stats</span>
              <div className="space-y-1">
                <PixelMeter label="Family" value={identity.meters.familyHarmony} icon="🏠" />
                <PixelMeter label="Career" value={identity.meters.careerStanding} icon="💼" />
                <PixelMeter label="Wealth" value={identity.meters.wealth} icon="💰" />
                <PixelMeter label="Mental" value={identity.meters.mentalHealth} icon="🧠" />
              </div>
            </div>
          </div>

          {/* CTA Buttons - Actions and Simulate */}
          <div className="p-3 flex-shrink-0">
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setShowActionsModal(!showActionsModal)}
                className="win95-btn w-full py-2"
                style={{
                  background: 'var(--win95-accent)',
                  color: 'white',
                  fontSize: '13px',
                  fontWeight: 'bold',
                }}
              >
                Actions {actions.length > 0 && `(${actions.length})`}
              </button>
              <button
                onClick={() => setShowSimulateModal(!showSimulateModal)}
                className="win95-btn w-full py-2"
                style={{
                  background: 'var(--win95-accent)',
                  color: 'white',
                  fontSize: '13px',
                  fontWeight: 'bold',
                }}
              >
                Simulate
              </button>
            </div>
          </div>
        </div>

        {/* Right Panel: Conversations + Chat */}
        <div className="flex-1 flex relative" style={{ background: 'var(--win95-lightest)' }}>
          {/* Conversations Sidebar */}
          <div
            className="w-48 flex flex-col flex-shrink-0"
            style={{
              background: 'var(--win95-light)',
              borderRight: '2px solid var(--win95-border-dark)',
            }}
          >
            {/* New Chat Button */}
            <button
              onClick={() => setShowNewChatModal(true)}
              className="m-2 py-2 px-3 flex items-center justify-center gap-2"
              style={{
                background: 'var(--win95-title-active)',
                color: 'white',
                border: '2px solid',
                borderColor: 'var(--win95-accent-light) var(--win95-accent) var(--win95-accent) var(--win95-accent-light)',
                fontSize: '12px',
                fontWeight: 'bold',
              }}
            >
              <span>+</span> New conversation
            </button>

            {/* Conversation List */}
            <div className="flex-1 overflow-y-auto">
              {allConversations.length === 0 ? (
                <div className="p-2 text-center">
                  <p className="win95-text" style={{ fontSize: '10px', color: 'var(--win95-text-dim)' }}>
                    No conversations yet
                  </p>
                </div>
              ) : (
                allConversations.map((conv, index) => {
                  const isDefault = conv.id === `group-${identityId}`;
                  const isEditing = editingConvId === conv.id;

                  return (
                    <div
                      key={conv.id}
                      className="relative"
                      style={{
                        borderBottom: '1px solid var(--win95-mid)',
                        background: conversationId === conv.id ? 'var(--win95-lightest)' : 'transparent',
                      }}
                    >
                      <button
                        onClick={() => {
                          if (isEditing) return;
                          // Clear any pending response state when switching conversations
                          setIsResponding(false);
                          setSelectedNpc(null);
                          setConversationId(conv.id);
                          setShowConvMenu(null);
                          // Load this conversation's messages
                          getFromIndexedDB('conversations', conv.id).then((loaded) => {
                            if (loaded?.messages) {
                              setMessages(loaded.messages as GroupMessage[]);
                            } else {
                              setMessages([]);
                            }
                          });
                        }}
                        className="w-full p-2 text-left hover:bg-[var(--win95-lightest)] transition-colors"
                      >
                        <div className="flex items-center gap-1 mb-1">
                          {/* Show NPC sprites */}
                          {conv.npcIds.slice(0, 3).map((npcId) => {
                            const npc = identity?.npcs.find(n => n.id === npcId);
                            return npc?.pixelArtUrl ? (
                              <div
                                key={npcId}
                                className="w-5 h-5 overflow-hidden"
                                style={{ border: '1px solid var(--win95-border-dark)', background: 'var(--win95-light)' }}
                              >
                                <img
                                  src={npc.pixelArtUrl}
                                  alt={npc.name}
                                  className="w-full h-auto"
                                  style={{ imageRendering: 'pixelated', transform: 'scale(2.5) translateY(15%)' }}
                                />
                              </div>
                            ) : null;
                          })}
                          {conv.npcIds.length > 3 && (
                            <span style={{ fontSize: '9px', color: 'var(--win95-text-dim)' }}>+{conv.npcIds.length - 3}</span>
                          )}
                        </div>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editingConvName}
                            onChange={(e) => setEditingConvName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleRenameConversation(conv.id, editingConvName);
                              } else if (e.key === 'Escape') {
                                setEditingConvId(null);
                                setEditingConvName('');
                              }
                            }}
                            onBlur={() => handleRenameConversation(conv.id, editingConvName)}
                            onClick={(e) => e.stopPropagation()}
                            autoFocus
                            className="win95-input w-full"
                            style={{ fontSize: '10px', padding: '2px 4px' }}
                          />
                        ) : (
                          <p className="win95-text truncate" style={{ fontSize: '11px', fontWeight: 'bold' }}>
                            {conv.title}
                          </p>
                        )}
                        {conv.lastMessage && !isEditing && (
                          <p className="win95-text truncate" style={{ fontSize: '9px', color: 'var(--win95-text-dim)' }}>
                            {conv.lastMessage}
                          </p>
                        )}
                      </button>

                      {/* Menu button - not for default conversation */}
                      {!isDefault && !isEditing && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowConvMenu(showConvMenu === conv.id ? null : conv.id);
                          }}
                          className="absolute top-1 right-1 w-6 h-6 flex items-center justify-center hover:bg-[var(--win95-accent-light)]"
                          style={{
                            fontSize: '14px',
                            fontWeight: 'bold',
                            color: 'var(--win95-text)',
                            background: 'var(--win95-light)',
                            border: '1px solid var(--win95-border-dark)',
                          }}
                        >
                          ⋮
                        </button>
                      )}

                      {/* Context Menu */}
                      {showConvMenu === conv.id && !isDefault && (
                        <div
                          className="absolute right-0 top-6 z-30 win95-window"
                          style={{ minWidth: '100px' }}
                        >
                          <div className="p-1" style={{ background: 'var(--win95-light)' }}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingConvId(conv.id);
                                setEditingConvName(conv.title);
                                setShowConvMenu(null);
                              }}
                              className="w-full text-left px-2 py-1 hover:bg-[var(--win95-title-active)] hover:text-white"
                              style={{ fontSize: '10px' }}
                            >
                              Rename
                            </button>
                            {index > 1 && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMoveConversation(conv.id, 'up');
                                }}
                                className="w-full text-left px-2 py-1 hover:bg-[var(--win95-title-active)] hover:text-white"
                                style={{ fontSize: '10px' }}
                              >
                                Move Up
                              </button>
                            )}
                            {index < allConversations.length - 1 && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMoveConversation(conv.id, 'down');
                                }}
                                className="w-full text-left px-2 py-1 hover:bg-[var(--win95-title-active)] hover:text-white"
                                style={{ fontSize: '10px' }}
                              >
                                Move Down
                              </button>
                            )}
                            <div style={{ height: '1px', background: 'var(--win95-border-dark)', margin: '2px 0' }} />
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm('Delete this conversation?')) {
                                  handleDeleteConversation(conv.id);
                                }
                              }}
                              className="w-full text-left px-2 py-1 hover:bg-[#8b0000] hover:text-white"
                              style={{ fontSize: '10px', color: '#8b0000' }}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Main Chat Area */}
          <div className="flex-1 flex flex-col relative">
            {/* Chat Header - Show title, gallery button, and auto-converse toggle */}
            {currentConversation && (
              <div
                className="flex-shrink-0 px-3 py-1.5 flex items-center justify-between"
                style={{
                  background: 'var(--win95-mid)',
                  borderBottom: '1px solid var(--win95-border-dark)',
                }}
              >
                <span className="win95-text" style={{ fontSize: '11px', fontWeight: 'bold' }}>
                  {currentConversation.title}
                </span>
                <div className="flex items-center gap-2">
                  {/* Gallery Button */}
                  <button
                    onClick={() => setShowGallery(true)}
                    className="py-0.5 px-2 flex items-center gap-1"
                    style={{
                      background: 'var(--win95-light)',
                      border: '1px solid var(--win95-border-dark)',
                      fontSize: '10px',
                      color: 'var(--win95-text)',
                    }}
                    title="View image gallery"
                  >
                    <span style={{ fontSize: '12px' }}>🖼</span>
                    <span>Gallery</span>
                  </button>

                  {/* Auto-chat toggle (only for multi-NPC chats) */}
                  {currentConversation.npcIds.length >= 2 && (
                    <button
                      onClick={() => {
                        setAllConversations(prev => prev.map(c =>
                          c.id === conversationId
                            ? { ...c, autoConverse: !c.autoConverse }
                            : c
                        ));
                      }}
                      className="py-0.5 px-2 flex items-center gap-1"
                      style={{
                        background: autoConverse ? 'var(--win95-accent)' : 'var(--win95-light)',
                        border: '1px solid var(--win95-border-dark)',
                        fontSize: '10px',
                        color: autoConverse ? 'white' : 'var(--win95-text)',
                      }}
                    >
                      <span>Auto-chat</span>
                      <span style={{ fontWeight: 'bold' }}>{autoConverse ? 'ON' : 'OFF'}</span>
                    </button>
                  )}
                </div>
              </div>
            )}
            {/* New Chat Modal */}
            {showNewChatModal && (
              <div className="absolute inset-0 z-20 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
                <div className="win95-window w-72" style={{ maxHeight: '80%' }}>
                  <div className="win95-titlebar">
                    <span className="win95-titlebar-text">New Conversation</span>
                    <div className="win95-titlebar-buttons">
                      <button className="win95-titlebar-btn" onClick={() => { setShowNewChatModal(false); setSelectedChatNpcs([]); }}>×</button>
                    </div>
                  </div>
                  <div className="win95-content p-3">
                    <p className="win95-text mb-2" style={{ fontSize: '11px' }}>Select NPCs to chat with:</p>
                    <div className="space-y-1 max-h-64 overflow-y-auto mb-3">
                      {identity?.npcs.filter(n => !n.isDead).map((npc) => (
                        <button
                          key={npc.id}
                          onClick={() => {
                            if (selectedChatNpcs.includes(npc.id)) {
                              setSelectedChatNpcs(selectedChatNpcs.filter(id => id !== npc.id));
                            } else {
                              setSelectedChatNpcs([...selectedChatNpcs, npc.id]);
                            }
                          }}
                          className="w-full p-2 text-left"
                          style={{
                            background: selectedChatNpcs.includes(npc.id) ? 'var(--win95-title-active)' : 'white',
                            color: selectedChatNpcs.includes(npc.id) ? 'white' : 'var(--win95-text)',
                            border: '1px solid var(--win95-border-dark)',
                          }}
                        >
                          <div className="flex items-start gap-2">
                            <div className="w-8 h-8 overflow-hidden flex-shrink-0" style={{ border: '1px solid var(--win95-border-dark)', background: 'var(--win95-light)' }}>
                              {npc.pixelArtUrl ? (
                                <img src={npc.pixelArtUrl} alt={npc.name} className="w-full h-auto" style={{ imageRendering: 'pixelated', transform: 'scale(2.5) translateY(15%)' }} />
                              ) : <div className="w-full h-full" style={{ background: 'var(--win95-mid)' }} />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <p style={{ fontSize: '11px', fontWeight: 'bold' }}>{npc.name}</p>
                                {selectedChatNpcs.includes(npc.id) && <span style={{ fontSize: '11px' }}>✓</span>}
                              </div>
                              <p style={{ fontSize: '9px', opacity: 0.8 }}>{npc.role}</p>
                              <p style={{ fontSize: '9px', opacity: 0.6, marginTop: '2px' }}>
                                {npc.personality}
                              </p>
                              {npc.relationshipStatus && (
                                <p style={{ fontSize: '8px', opacity: 0.5, marginTop: '2px', textTransform: 'capitalize' }}>
                                  {npc.relationshipStatus}
                                </p>
                              )}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setShowNewChatModal(false); setSelectedChatNpcs([]); }}
                        className="win95-btn flex-1"
                        style={{ fontSize: '11px' }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          if (selectedChatNpcs.length > 0) {
                            // Create new conversation - preserve existing ones (including default "All NPCs")
                            const npcNames = selectedChatNpcs.map(id => identity?.npcs.find(n => n.id === id)?.name || '').filter(Boolean);
                            const newConvId = `conv-${Date.now()}`;
                            const newConv = {
                              id: newConvId,
                              title: npcNames.join(', '),
                              npcIds: selectedChatNpcs,
                              updatedAt: new Date(),
                            };
                            // Add new conversation at position 1 (after "All NPCs")
                            const defaultConv = allConversations.find(c => c.id === `group-${identityId}`);
                            const otherConvs = allConversations.filter(c => c.id !== `group-${identityId}`);
                            setAllConversations(defaultConv ? [defaultConv, newConv, ...otherConvs] : [newConv, ...allConversations]);
                            // Clear any pending response state when creating new conversation
                            setIsResponding(false);
                            setSelectedNpc(null);
                            setConversationId(newConvId);
                            setMessages([]);
                            setShowNewChatModal(false);
                            setSelectedChatNpcs([]);
                          }
                        }}
                        disabled={selectedChatNpcs.length === 0}
                        className="win95-btn flex-1"
                        style={{
                          fontSize: '11px',
                          background: selectedChatNpcs.length > 0 ? 'var(--win95-title-active)' : undefined,
                          color: selectedChatNpcs.length > 0 ? 'white' : undefined,
                        }}
                      >
                        Start Chat
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* History Panel (Overlay) - Compact Win95 style */}
            {showHistory && (
            <div className="absolute inset-0 z-10 overflow-y-auto" style={{ background: 'var(--win95-light)' }}>
              <div
                className="p-2 flex justify-between items-center sticky top-0"
                style={{ background: 'var(--win95-mid)', borderBottom: '2px solid var(--win95-border-dark)' }}
              >
                <span className="win95-text" style={{ fontWeight: 'bold', fontSize: '14px' }}>Event Log</span>
                <button onClick={() => setShowHistory(false)} className="win95-btn win95-btn-sm" style={{ fontSize: '11px', padding: '2px 8px' }}>
                  Close
                </button>
              </div>
              <div className="p-2 space-y-2">
                {simulationHistory.length === 0 ? (
                  <div className="win95-panel-inset p-3 text-center" style={{ background: 'white' }}>
                    <p className="win95-text" style={{ color: 'var(--win95-text-dim)', fontSize: '12px' }}>
                      No history yet. Advance time to create events.
                    </p>
                  </div>
                ) : (
                  simulationHistory.map((sim) => (
                    <div key={sim.id} className="win95-groupbox" style={{ padding: '10px 8px 8px', margin: '4px 0' }}>
                      <span className="win95-groupbox-label" style={{ fontSize: '11px' }}>Day {sim.fromDay} → Day {sim.toDay}</span>
                      <div className="flex justify-between items-center mb-1">
                        <span className="win95-text" style={{ fontSize: '10px', color: 'var(--win95-text-dim)' }}>
                          {sim.events.length} event{sim.events.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      {sim.events.length > 0 ? (
                        <div className="space-y-1">
                          {sim.events.map((event, idx) => (
                            <div key={idx} className="win95-panel-inset p-1.5" style={{ background: 'white' }}>
                              <div className="flex items-center gap-1 mb-0.5">
                                <span
                                  className="px-1"
                                  style={{
                                    fontSize: '8px',
                                    background: event.severity === 'minor' ? 'var(--win95-dark)'
                                      : event.severity === 'moderate' ? '#d4a017'
                                      : event.severity === 'major' ? 'var(--win95-accent)'
                                      : '#8b0000',
                                    color: 'white',
                                  }}
                                >
                                  {event.severity.toUpperCase()}
                                </span>
                                <span className="win95-text" style={{ fontSize: '11px', fontWeight: 'bold' }}>
                                  {event.title}
                                </span>
                              </div>
                              <p className="win95-text" style={{ fontSize: '10px', color: 'var(--win95-text-dim)' }}>
                                {event.description}
                              </p>
                              {event.involvedNpcs && event.involvedNpcs.length > 0 && (
                                <p className="win95-text" style={{ fontSize: '9px', color: 'var(--win95-accent)', marginTop: '2px' }}>
                                  ▸ {event.involvedNpcs.join(', ')}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="win95-text" style={{ fontSize: '11px', color: 'var(--win95-text-dim)' }}>
                          Nothing significant happened
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Actions Modal (Overlay) */}
          {showActionsModal && (
            <div className="absolute inset-0 z-20 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
              <div className="win95-window w-80">
                <div className="win95-titlebar">
                  <span className="win95-titlebar-text">Queue Actions - Day {identity.currentDay}</span>
                  <div className="win95-titlebar-buttons">
                    <button className="win95-titlebar-btn" onClick={() => setShowActionsModal(false)}>×</button>
                  </div>
                </div>
                <div className="win95-content p-3">
                  <p className="win95-text mb-2" style={{ fontSize: '11px', color: 'var(--win95-text-dim)' }}>
                    Actions you queue will affect the simulation when you advance time.
                  </p>
                  <div className="win95-panel-inset p-2 mb-3 max-h-32 overflow-y-auto" style={{ background: 'white' }}>
                    {actions.length === 0 ? (
                      <p className="win95-text" style={{ fontSize: '11px', color: 'var(--win95-text-dim)' }}>No actions queued</p>
                    ) : (
                      actions.map((action) => (
                        <div key={action.id} className="flex items-start gap-1 py-1 border-b border-[var(--win95-mid)]">
                          <span style={{ color: 'var(--win95-accent)', fontSize: '10px' }}>▸</span>
                          <span className="flex-1 win95-text" style={{ fontSize: '11px' }}>{action.content}</span>
                          <button
                            onClick={() => handleRemoveAction(action.id)}
                            className="hover:bg-[var(--win95-light)] px-1"
                            style={{ color: '#8b0000', fontSize: '11px' }}
                          >
                            ×
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="flex gap-1 mb-3">
                    <input
                      type="text"
                      value={newAction}
                      onChange={(e) => setNewAction(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddAction()}
                      placeholder="Add action..."
                      className="win95-input flex-1"
                      style={{ fontSize: '11px', padding: '4px 8px' }}
                    />
                    <button onClick={handleAddAction} className="win95-btn" style={{ padding: '4px 12px', fontSize: '12px' }}>
                      +
                    </button>
                  </div>
                  <button
                    onClick={() => setShowActionsModal(false)}
                    className="win95-btn w-full"
                    style={{ fontSize: '11px' }}
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Simulate Modal (Overlay) */}
          {showSimulateModal && (
            <div className="absolute inset-0 z-20 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
              <div className="win95-window w-72">
                <div className="win95-titlebar">
                  <span className="win95-titlebar-text">Time Jump</span>
                  <div className="win95-titlebar-buttons">
                    <button className="win95-titlebar-btn" onClick={() => setShowSimulateModal(false)}>×</button>
                  </div>
                </div>
                <div className="win95-content p-4">
                  <p className="win95-text mb-3 text-center" style={{ fontSize: '11px', color: 'var(--win95-text-dim)' }}>
                    Advance time to simulate events and consequences.
                  </p>
                  {actions.length > 0 && (
                    <p className="win95-text mb-3 text-center" style={{ fontSize: '10px', color: 'var(--win95-accent)' }}>
                      {actions.length} action{actions.length !== 1 ? 's' : ''} queued
                    </p>
                  )}
                  <div className="flex gap-2 mb-3">
                    <button
                      onClick={() => { handleSimulate('day'); setShowSimulateModal(false); }}
                      className="win95-btn flex-1 py-2"
                      style={{ background: 'var(--win95-title-active)', color: 'white', fontSize: '13px', fontWeight: 'bold' }}
                    >
                      +1 Day
                    </button>
                    <button
                      onClick={() => { handleSimulate('week'); setShowSimulateModal(false); }}
                      className="win95-btn flex-1 py-2"
                      style={{ fontSize: '13px' }}
                    >
                      +1 Week
                    </button>
                  </div>
                  <button
                    onClick={() => setShowSimulateModal(false)}
                    className="win95-btn w-full"
                    style={{ fontSize: '11px' }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Gallery Modal */}
          {showGallery && (
            <div className="absolute inset-0 z-20 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
              <div className="win95-window" style={{ width: '90%', maxWidth: '500px', maxHeight: '80%' }}>
                <div className="win95-titlebar">
                  <span className="win95-titlebar-text">Image Gallery</span>
                  <div className="win95-titlebar-buttons">
                    <button className="win95-titlebar-btn" onClick={() => setShowGallery(false)}>×</button>
                  </div>
                </div>
                <div className="win95-content p-3 overflow-y-auto" style={{ maxHeight: '400px' }}>
                  {(() => {
                    // Extract all images from messages
                    const galleryImages = messages
                      .filter((m): m is GroupMessage => !!(m as GroupMessage).imageUrl)
                      .map((m) => {
                        const gm = m as GroupMessage;
                        return {
                          url: gm.imageUrl!,
                          npcName: gm.npcName,
                          type: gm.imageType,
                          timestamp: m.timestamp,
                        };
                      });

                    if (galleryImages.length === 0) {
                      return (
                        <div className="text-center py-8">
                          <p className="win95-text" style={{ fontSize: '12px', color: 'var(--win95-text-dim)' }}>
                            No images yet.
                          </p>
                          <p className="win95-text mt-2" style={{ fontSize: '10px', color: 'var(--win95-text-dim)' }}>
                            NPCs will occasionally share images during conversations.
                          </p>
                        </div>
                      );
                    }

                    return (
                      <div className="grid grid-cols-3 gap-2">
                        {galleryImages.map((img, idx) => (
                          <button
                            key={idx}
                            onClick={() => setSelectedGalleryImage(img)}
                            className="aspect-square overflow-hidden"
                            style={{
                              background: 'var(--win95-lightest)',
                              border: '2px solid var(--win95-border-dark)',
                            }}
                          >
                            <img
                              src={img.url}
                              alt={img.type || 'Image'}
                              className="w-full h-full object-cover"
                              style={{ imageRendering: 'pixelated' }}
                            />
                          </button>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* Lightbox for full-size image view */}
          {selectedGalleryImage && (
            <div
              className="absolute inset-0 z-30 flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.85)' }}
              onClick={() => setSelectedGalleryImage(null)}
            >
              <div
                className="win95-window"
                style={{ maxWidth: '90%', maxHeight: '90%' }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="win95-titlebar">
                  <span className="win95-titlebar-text">
                    {selectedGalleryImage.npcName ? `${selectedGalleryImage.npcName}'s ${selectedGalleryImage.type || 'Image'}` : 'Image'}
                  </span>
                  <div className="win95-titlebar-buttons">
                    <button className="win95-titlebar-btn" onClick={() => setSelectedGalleryImage(null)}>×</button>
                  </div>
                </div>
                <div className="win95-content p-2" style={{ background: 'black' }}>
                  <img
                    src={selectedGalleryImage.url}
                    alt={selectedGalleryImage.type || 'Image'}
                    style={{
                      maxWidth: '100%',
                      maxHeight: '60vh',
                      imageRendering: 'pixelated',
                      display: 'block',
                      margin: '0 auto',
                    }}
                  />
                  <div className="mt-2 text-center">
                    <p className="win95-text" style={{ fontSize: '10px', color: '#888' }}>
                      {new Date(selectedGalleryImage.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* NPC Info Panel (Overlay) - Compact character list */}
          {showNpcInfo && (
            <div className="absolute inset-0 z-10 overflow-y-auto" style={{ background: 'var(--win95-light)' }}>
              <div
                className="p-2 flex justify-between items-center sticky top-0"
                style={{ background: 'var(--win95-mid)', borderBottom: '2px solid var(--win95-border-dark)' }}
              >
                <span className="win95-text" style={{ fontWeight: 'bold', fontSize: '14px' }}>Characters</span>
                <button onClick={() => setShowNpcInfo(false)} className="win95-btn win95-btn-sm" style={{ fontSize: '11px', padding: '2px 8px' }}>
                  Close
                </button>
              </div>
              <div className="p-2 space-y-1">
                {identity.npcs.map((npc) => (
                  <div
                    key={npc.id}
                    className="win95-panel-inset overflow-hidden"
                    style={{
                      background: 'white',
                      borderColor: npc.isDead ? '#8b0000' : undefined,
                    }}
                  >
                    <button
                      onClick={() => setExpandedNpcId(expandedNpcId === npc.id ? null : npc.id)}
                      className="w-full p-1.5 flex items-center gap-2 hover:bg-[var(--win95-lightest)]"
                    >
                      {/* NPC Sprite - smaller */}
                      <div
                        className="w-8 h-8 flex-shrink-0 overflow-hidden"
                        style={{
                          background: 'var(--win95-lightest)',
                          border: '1px solid var(--win95-border-dark)',
                          filter: npc.isDead ? 'grayscale(100%)' : 'none',
                        }}
                      >
                        {npc.pixelArtUrl ? (
                          <img
                            src={npc.pixelArtUrl}
                            alt={npc.name}
                            className="w-full h-auto"
                            style={{ imageRendering: 'pixelated', transform: 'scale(2.5) translateY(15%)' }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs">?</div>
                        )}
                      </div>
                      <div className="flex-1 text-left">
                        <div
                          className="win95-text"
                          style={{
                            fontSize: '12px',
                            fontWeight: 'bold',
                            textDecoration: npc.isDead ? 'line-through' : 'none',
                            color: npc.isDead ? 'var(--win95-text-dim)' : 'var(--win95-text)',
                          }}
                        >
                          {npc.name}
                        </div>
                        <div
                          className="win95-text"
                          style={{
                            fontSize: '10px',
                            color: npc.isDead ? '#8b0000' : 'var(--win95-text-dim)',
                          }}
                        >
                          {npc.isDead ? `Deceased (Day ${npc.deathDay})` : npc.role}
                        </div>
                      </div>
                      <span style={{ color: 'var(--win95-text-dim)', fontSize: '10px' }}>{expandedNpcId === npc.id ? '▼' : '▶'}</span>
                    </button>
                    {expandedNpcId === npc.id && (
                      <div className="p-1.5" style={{ borderTop: '1px solid var(--win95-mid)', background: 'var(--win95-lightest)' }}>
                        <div className="space-y-1">
                          {npc.isDead && (
                            <div className="win95-panel-inset p-1" style={{ borderColor: '#8b0000', background: '#fff0f0' }}>
                              <span className="win95-text" style={{ fontSize: '9px', color: '#8b0000' }}>CAUSE OF DEATH:</span>
                              <p className="win95-text" style={{ fontSize: '11px' }}>{npc.deathCause || 'Unknown'}</p>
                            </div>
                          )}
                          <div>
                            <span className="win95-text" style={{ fontSize: '9px', color: 'var(--win95-text-dim)' }}>PERSONALITY:</span>
                            <p className="win95-text" style={{ fontSize: '11px' }}>{npc.personality}</p>
                          </div>
                          <div>
                            <span className="win95-text" style={{ fontSize: '9px', color: 'var(--win95-text-dim)' }}>BACKGROUND:</span>
                            {npc.bullets && npc.bullets.length > 0 ? (
                              <ul style={{ margin: '2px 0 0 0', paddingLeft: '12px' }}>
                                {npc.bullets.map((bullet, idx) => (
                                  <li key={idx} className="win95-text" style={{ fontSize: '11px', marginBottom: '2px' }}>{bullet}</li>
                                ))}
                              </ul>
                            ) : (
                              <p className="win95-text" style={{ fontSize: '11px' }}>{npc.backstory || 'Unknown'}</p>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-1">
                            <div>
                              <span className="win95-text" style={{ fontSize: '9px', color: 'var(--win95-text-dim)' }}>RELATIONSHIP:</span>
                              <p className="win95-text" style={{ fontSize: '10px' }}>{npc.relationshipStatus}</p>
                            </div>
                            <div>
                              <span className="win95-text" style={{ fontSize: '9px', color: 'var(--win95-text-dim)' }}>MOOD:</span>
                              <p className="win95-text" style={{ fontSize: '10px', textTransform: 'capitalize' }}>{npc.currentEmotionalState}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Messages - Compact chat bubble style with fixed scroll */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1" style={{ minHeight: 0 }}>
            {messages.length === 0 && (
              <div className="text-center py-4">
                <div className="win95-groupbox inline-block p-4 max-w-md">
                  <span className="win95-groupbox-label">Welcome</span>
                  <p className="win95-text" style={{ fontWeight: 'bold', color: 'var(--win95-title-active)', marginBottom: '4px', fontSize: '14px' }}>
                    Hello, {identity.name}!
                  </p>
                  <p className="win95-text" style={{ fontSize: '11px', color: 'var(--win95-text-dim)', marginBottom: '8px' }}>
                    Send a message, then tap an NPC to respond
                  </p>
                  {/* Auto-chat explanation for multi-NPC conversations */}
                  {currentConversation && currentConversation.npcIds.length >= 2 && (
                    <div className="mt-2 pt-2" style={{ borderTop: '1px solid var(--win95-mid)' }}>
                      <p className="win95-text" style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--win95-accent)', marginBottom: '4px' }}>
                        Auto-chat Mode
                      </p>
                      <p className="win95-text text-left" style={{ fontSize: '10px', color: 'var(--win95-text-dim)', lineHeight: '1.4' }}>
                        Enable "Auto-chat" above to let NPCs converse with each other automatically.
                        Great for watching drama unfold between characters!
                      </p>
                      <p className="win95-text text-left mt-1" style={{ fontSize: '9px', color: '#8b0000', lineHeight: '1.3' }}>
                        Note: Auto-chat uses more AI tokens and may increase costs.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {messages.map((message, index) => {
              // Find NPC sprite for assistant messages
              const messageNpc = message.npcId ? identity.npcs.find(n => n.id === message.npcId) : null;

              return (
                <div
                  key={index}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.role === 'assistant' && (
                    <div
                      className="w-7 h-7 mr-1 flex-shrink-0 overflow-hidden"
                      style={{
                        background: 'var(--win95-light)',
                        border: '1px solid var(--win95-border-dark)',
                      }}
                    >
                      {messageNpc?.pixelArtUrl ? (
                        <img
                          src={messageNpc.pixelArtUrl}
                          alt={messageNpc.name}
                          className="w-full h-auto"
                          style={{ imageRendering: 'pixelated', transform: 'scale(2.5) translateY(15%)' }}
                        />
                      ) : (
                        <div className="w-full h-full" style={{ background: 'var(--win95-mid)' }} />
                      )}
                    </div>
                  )}
                  <div
                    className="max-w-[75%] px-2 py-1"
                    style={{
                      background: message.role === 'user' ? '#a9b2ac' : 'white',
                      color: message.role === 'user' ? 'var(--win95-text)' : 'var(--win95-text)',
                      border: '1px solid',
                      borderColor: message.role === 'user'
                        ? 'var(--win95-border-light) var(--win95-border-dark) var(--win95-border-dark) var(--win95-border-light)'
                        : 'var(--win95-border-light) var(--win95-border-darker) var(--win95-border-darker) var(--win95-border-light)',
                    }}
                  >
                    {message.npcName && (
                      <div className="win95-text" style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--win95-accent)' }}>
                        {message.npcName}
                      </div>
                    )}
                    <div className="whitespace-pre-wrap win95-text" style={{ fontSize: '12px', lineHeight: '1.3' }}>
                      {message.role === 'assistant' ? formatMessageContent(message.content) : message.content}
                    </div>

                    {/* Image display for NPC messages */}
                    {(message as GroupMessage).imageUrl && (
                      <div
                        className="mt-2"
                        style={{
                          border: '2px solid var(--win95-border-dark)',
                          background: 'var(--win95-light)',
                          padding: '2px',
                        }}
                      >
                        <img
                          src={(message as GroupMessage).imageUrl}
                          alt={(message as GroupMessage).imageType || 'NPC image'}
                          className="max-w-full"
                          style={{
                            imageRendering: 'pixelated',
                            maxHeight: '200px',
                            width: 'auto',
                          }}
                        />
                      </div>
                    )}

                    {/* Loading state for image generation */}
                    {(message as GroupMessage).isGeneratingImage && !(message as GroupMessage).imageUrl && (
                      <div
                        className="mt-2 flex items-center gap-2"
                        style={{
                          border: '2px solid var(--win95-border-dark)',
                          background: 'var(--win95-light)',
                          padding: '8px',
                        }}
                      >
                        <div className="animate-pulse" style={{ width: '16px', height: '16px', background: 'var(--win95-accent)' }} />
                        <span className="win95-text" style={{ fontSize: '10px' }}>Generating image...</span>
                      </div>
                    )}

                    <p className="win95-text text-right" style={{ fontSize: '9px', opacity: 0.6, marginTop: '2px' }}>
                      {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              );
            })}

            {isResponding && selectedNpc && (
              <div className="flex justify-start">
                <div
                  className="w-7 h-7 mr-1 flex-shrink-0 overflow-hidden animate-pulse"
                  style={{
                    background: 'var(--win95-light)',
                    border: '1px solid var(--win95-border-dark)',
                  }}
                >
                  {selectedNpc.pixelArtUrl ? (
                    <img
                      src={selectedNpc.pixelArtUrl}
                      alt={selectedNpc.name}
                      className="w-full h-auto"
                      style={{ imageRendering: 'pixelated', transform: 'scale(2.5) translateY(15%)' }}
                    />
                  ) : (
                    <div className="w-full h-full" style={{ background: 'var(--win95-mid)' }} />
                  )}
                </div>
                <div className="win95-panel-inset px-2 py-1" style={{ background: 'white' }}>
                  <div className="win95-text" style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--win95-accent)' }}>
                    {selectedNpc.name}
                  </div>
                  <div className="win95-text win95-loading" style={{ fontSize: '11px', color: 'var(--win95-text-dim)' }}>
                    typing
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* NPC Selector Bar - Compact - Only shows NPCs in current conversation */}
          <div className="p-1 flex-shrink-0" style={{ background: 'var(--win95-mid)', borderTop: '2px solid var(--win95-border-dark)' }}>
            <div className="flex items-center gap-1">
              {/* Scrollable NPC list - filtered by current conversation */}
              <div className="flex gap-1 overflow-x-auto flex-1 py-1">
                {(() => {
                  // Get NPCs for current conversation
                  const currentConv = allConversations.find(c => c.id === conversationId);
                  const conversationNpcIds = currentConv?.npcIds || identity.npcs.map(n => n.id);
                  return identity.npcs.filter(npc => conversationNpcIds.includes(npc.id));
                })().map((npc) => (
                  <button
                    key={npc.id}
                    onClick={() => !npc.isDead && handleNpcRespond(npc)}
                    disabled={isResponding || npc.isDead}
                    className="flex flex-col items-center p-1 transition-all flex-shrink-0"
                    style={{
                      background: isResponding && selectedNpc?.id === npc.id
                        ? 'var(--win95-title-active)'
                        : 'var(--win95-lightest)',
                      border: '1px solid',
                      borderColor: isResponding && selectedNpc?.id === npc.id
                        ? 'var(--win95-accent)'
                        : 'var(--win95-border-dark)',
                      opacity: npc.isDead ? 0.4 : isResponding && selectedNpc?.id !== npc.id ? 0.6 : 1,
                      cursor: npc.isDead ? 'not-allowed' : 'pointer',
                      minWidth: '36px',
                    }}
                    title={npc.isDead ? `${npc.name} is deceased` : `Ask ${npc.name} to respond`}
                  >
                    {/* Small NPC sprite head */}
                    <div
                      className="w-6 h-6 overflow-hidden"
                      style={{
                        background: 'var(--win95-light)',
                        border: '1px solid var(--win95-border-dark)',
                        filter: npc.isDead ? 'grayscale(100%)' : 'none',
                      }}
                    >
                      {npc.pixelArtUrl ? (
                        <img
                          src={npc.pixelArtUrl}
                          alt={npc.name}
                          className="w-full h-auto object-cover object-top"
                          style={{ imageRendering: 'pixelated', transform: 'scale(2.5) translateY(15%)' }}
                        />
                      ) : (
                        <div className="w-full h-full" style={{ background: 'var(--win95-mid)' }} />
                      )}
                    </div>
                    <span
                      className="win95-text truncate"
                      style={{
                        fontSize: '8px',
                        maxWidth: '34px',
                        textDecoration: npc.isDead ? 'line-through' : 'none',
                        color: isResponding && selectedNpc?.id === npc.id ? 'white' : 'var(--win95-text)',
                      }}
                    >
                      {npc.name.split(' ')[0]}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Input - Compact Win95 style */}
          <div className="p-2 flex-shrink-0" style={{ background: 'var(--win95-light)', borderTop: '1px solid var(--win95-border-dark)' }}>
            <div className="flex gap-1">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                placeholder="Type a message..."
                className="win95-input flex-1"
                style={{ fontSize: '12px', padding: '4px 8px' }}
              />
              <button
                onClick={handleSendMessage}
                disabled={!input.trim()}
                className="win95-btn px-4 disabled:opacity-50"
                style={{
                  background: input.trim() ? 'var(--win95-title-active)' : undefined,
                  color: input.trim() ? 'white' : undefined,
                  fontSize: '12px',
                  padding: '4px 12px',
                }}
              >
                Send
              </button>
            </div>
          </div>
          </div>
        </div>
      </div>
    </main>
  );
}

// Helper Components - Win95 + Stardew Valley style stat bar with icons
function PixelMeter({ label, value, icon }: { label: string; value: number; icon?: string }) {
  const getColor = (val: number) => {
    if (val >= 70) return 'var(--win95-accent-light)';
    if (val >= 40) return '#d4a017';
    return '#8b0000';
  };

  return (
    <div className="flex items-center gap-1">
      {icon && (
        <span style={{ fontSize: '12px', width: '16px', textAlign: 'center' }}>{icon}</span>
      )}
      <span className="win95-text" style={{ fontSize: '10px', color: 'var(--win95-text-dim)', width: '38px' }}>
        {label}
      </span>
      <div
        className="flex-1 h-2.5 overflow-hidden"
        style={{
          background: 'white',
          border: '1px solid var(--win95-border-dark)',
          boxShadow: 'inset 1px 1px 0 var(--win95-border-darker)',
        }}
      >
        <div
          className="h-full transition-all"
          style={{ width: `${value}%`, backgroundColor: getColor(value) }}
        />
      </div>
      <span className="win95-text" style={{ fontSize: '10px', color: 'var(--win95-text)', width: '22px', textAlign: 'right' }}>
        {value}
      </span>
    </div>
  );
}

// Format message content with actions in italic (no asterisks shown) - compact version
function formatMessageContent(content: string): React.ReactNode {
  const parts = content.split(/(\*[^*]+\*)/g);

  return parts.map((part, index) => {
    if (part.startsWith('*') && part.endsWith('*')) {
      // Extract action text WITHOUT asterisks, show as italic - more compact
      const actionText = part.slice(1, -1);
      return (
        <span key={index} className="block my-0.5 italic" style={{ color: 'var(--win95-text-dim)', fontSize: '11px' }}>
          {actionText}
        </span>
      );
    }
    // Trim whitespace and remove surrounding quotes from dialogue
    let trimmedPart = part.trim();
    // Strip leading/trailing quotes that NPCs sometimes add
    if (trimmedPart.startsWith('"') && trimmedPart.endsWith('"')) {
      trimmedPart = trimmedPart.slice(1, -1);
    } else if (trimmedPart.startsWith('"')) {
      trimmedPart = trimmedPart.slice(1);
    } else if (trimmedPart.endsWith('"')) {
      trimmedPart = trimmedPart.slice(0, -1);
    }
    if (trimmedPart) {
      return <span key={index}>{trimmedPart}</span>;
    }
    return null;
  });
}

// Extract key phrases from a message for deduplication
function extractKeyPhrases(content: string): string[] {
  // Remove action text in asterisks and clean up
  const dialogueOnly = content.replace(/\*[^*]+\*/g, '').trim();

  // Extract significant phrases (3+ words ending with punctuation or question patterns)
  const phrases: string[] = [];

  // Split by sentences/clauses
  const parts = dialogueOnly.split(/[.!?]+/).filter(p => p.trim().length > 10);

  for (const part of parts) {
    const cleaned = part.trim().toLowerCase();
    if (cleaned.length > 15) {
      // Get first 5-6 words as key phrase
      const words = cleaned.split(/\s+/).slice(0, 6).join(' ');
      phrases.push(words);
    }
  }

  return phrases;
}

// Check if response is too similar to recent messages
function checkResponseSimilarity(newResponse: string, recentMessages: GroupMessage[]): {
  isSimilar: boolean;
  similarTo?: string;
} {
  const newPhrases = extractKeyPhrases(newResponse);
  const newDialogue = newResponse.replace(/\*[^*]+\*/g, '').trim().toLowerCase();

  for (const msg of recentMessages) {
    const existingDialogue = msg.content.replace(/\*[^*]+\*/g, '').trim().toLowerCase();
    const existingPhrases = extractKeyPhrases(msg.content);

    // Check for very high character similarity (>60% of words match)
    const newWords = new Set(newDialogue.split(/\s+/).filter(w => w.length > 2));
    const existingWords = existingDialogue.split(/\s+/).filter(w => w.length > 2);
    let matchCount = 0;
    for (const word of existingWords) {
      if (newWords.has(word)) matchCount++;
    }
    const similarity = existingWords.length > 0 ? matchCount / existingWords.length : 0;

    if (similarity > 0.6) {
      return { isSimilar: true, similarTo: msg.npcName || 'someone' };
    }

    // Check if any key phrase appears in both
    for (const phrase of newPhrases) {
      for (const existingPhrase of existingPhrases) {
        // Check for substring match or high overlap
        if (phrase.includes(existingPhrase) || existingPhrase.includes(phrase)) {
          return { isSimilar: true, similarTo: msg.npcName || 'someone' };
        }
      }
    }
  }

  return { isSimilar: false };
}

// Get banned phrases from recent messages to inject into prompt
function getBannedPhrases(recentMessages: GroupMessage[]): string {
  const phrases = new Set<string>();

  for (const msg of recentMessages) {
    // Only ban phrases from other NPCs, not the player
    if (msg.role === 'assistant') {
      const extracted = extractKeyPhrases(msg.content);
      extracted.forEach(p => phrases.add(p));
    }
  }

  if (phrases.size === 0) return '';

  // Take up to 5 most recent phrases
  const phraseList = Array.from(phrases).slice(-5);
  return `\nDO NOT say anything similar to these recent phrases (be original):
${phraseList.map(p => `- "${p}..."`).join('\n')}`;
}

// Extract what one NPC might know about another NPC (from backstories, bullets, events)
function extractNPCKnowledge(currentNpc: NPC, otherNpc: NPC, identity: Identity, simulationHistory: SimulationResult[]): string | null {
  const knowledge: string[] = [];

  // Check if other NPC's backstory/bullets mention current NPC's name
  const currentNameLower = currentNpc.name.toLowerCase();
  const otherBackstory = (otherNpc.backstory || '').toLowerCase();
  const otherBullets = (otherNpc.bullets || []).join(' ').toLowerCase();

  if (otherBackstory.includes(currentNameLower) || otherBullets.includes(currentNameLower)) {
    // They're mentioned in the other's backstory - there's shared history
    const bullet = otherNpc.bullets?.find(b => b.toLowerCase().includes(currentNameLower));
    if (bullet) knowledge.push(`You know: ${bullet}`);
  }

  // Check if they were involved in the same simulation events
  const sharedEvents = simulationHistory
    .flatMap(sim => sim.events)
    .filter(e => e.involvedNpcs.includes(currentNpc.id) && e.involvedNpcs.includes(otherNpc.id));

  if (sharedEvents.length > 0) {
    const event = sharedEvents[0];
    knowledge.push(`You both were involved in: ${event.title}`);
  }

  // Check NPC changes that mention both
  const relevantChanges = simulationHistory
    .flatMap(sim => sim.npcChanges)
    .filter(c => c.description.toLowerCase().includes(otherNpc.name.toLowerCase()));

  if (relevantChanges.length > 0) {
    knowledge.push(`Recent: ${relevantChanges[0].description}`);
  }

  return knowledge.length > 0 ? knowledge.join('. ') : null;
}

// Infer relationship between two NPCs based on their roles
function inferNPCRelationship(npc1: NPC, npc2: NPC): string {
  const roles = [npc1.role.toLowerCase(), npc2.role.toLowerCase()];

  // Family relationships
  if (roles.includes('spouse') || roles.includes('wife') || roles.includes('husband') || roles.includes('partner')) {
    if (roles.includes('sibling') || roles.includes('brother') || roles.includes('sister')) {
      return 'in-law relationship (your spouse\'s sibling)';
    }
    if (roles.includes('parent') || roles.includes('mother') || roles.includes('father')) {
      return 'in-law relationship (your spouse\'s parent)';
    }
  }

  if ((roles.includes('sibling') || roles.includes('brother') || roles.includes('sister')) &&
      (roles.includes('sibling') || roles.includes('brother') || roles.includes('sister'))) {
    return 'siblings who share family history';
  }

  // Work relationships
  if ((roles.includes('boss') || roles.includes('manager') || roles.includes('supervisor')) &&
      (roles.includes('coworker') || roles.includes('colleague') || roles.includes('employee'))) {
    return 'workplace hierarchy - they have power over you or vice versa';
  }

  if ((roles.includes('coworker') || roles.includes('colleague')) &&
      (roles.includes('coworker') || roles.includes('colleague'))) {
    return 'coworkers who see each other daily';
  }

  // Friend relationships
  if (roles.includes('friend') || roles.includes('best friend')) {
    return 'friends who know each other through the player';
  }

  // Default - they know each other through the player
  return 'acquaintances through ' + npc1.name;
}

// Generate conversation goals and topics for an NPC
function generateConversationContext(
  currentNpc: NPC,
  otherNpcs: NPC[],
  identity: Identity,
  simulationHistory: SimulationResult[],
  messageCount: number
): string {
  const parts: string[] = [];

  // What this NPC knows about others present
  const otherNpcInfo = otherNpcs.slice(0, 3).map(other => {
    const relationship = inferNPCRelationship(currentNpc, other);
    const knowledge = extractNPCKnowledge(currentNpc, other, identity, simulationHistory);

    let info = `${other.name} (${other.role}): ${relationship}`;
    if (knowledge) info += `. ${knowledge}`;
    info += `. They seem ${other.currentEmotionalState}.`;

    return info;
  });

  if (otherNpcInfo.length > 0) {
    parts.push("PEOPLE YOU'RE TALKING TO:");
    parts.push(otherNpcInfo.join('\n'));
  }

  // NOTE: We no longer tell NPCs to hide secrets here.
  // The narrative engine handles revelations based on pressure.
  // Secrets are revealed through the RevelationDirective system.

  // Generate a conversation goal based on emotional state and situation
  const goals: string[] = [];
  if (currentNpc.currentEmotionalState === 'angry' || currentNpc.currentEmotionalState === 'bitter') {
    goals.push(`confront someone about what's bothering you`);
  } else if (currentNpc.currentEmotionalState === 'suspicious') {
    goals.push(`figure out what others are hiding`);
  } else if (currentNpc.currentEmotionalState === 'sad' || currentNpc.currentEmotionalState === 'grieving') {
    goals.push(`seek comfort or process your feelings`);
  } else if (currentNpc.currentEmotionalState === 'anxious' || currentNpc.currentEmotionalState === 'scared') {
    goals.push(`warn others or seek protection`);
  } else {
    goals.push(`advance your position or gather information`);
  }

  parts.push(`\nYOUR CURRENT GOAL: ${goals[0]}`);

  // Conversation progression - if it's been going a while, push for change
  if (messageCount > 6) {
    parts.push(`\n⚠️ ESCALATION: This conversation has been going for a while. Do ONE of these:
- Reveal something specific (a name, a secret, a fact)
- Make a direct accusation
- Change the subject to something concrete
- Leave or demand action
NO MORE VAGUE POSTURING.`);
  }

  return parts.join('\n');
}

// Build narrative context from simulation history and NPC states
function buildNarrativeContext(identity: Identity, simulationHistory: SimulationResult[]): string {
  const parts: string[] = [];

  // 1. DEATHS - Critical narrative context that MUST be acknowledged
  const deadNpcs = identity.npcs.filter(n => n.isDead);
  if (deadNpcs.length > 0) {
    parts.push("DEATHS (everyone knows and is affected by these):");
    deadNpcs.forEach(npc => {
      parts.push(`  - ${npc.name} (${npc.role}) died on Day ${npc.deathDay || '?'}: ${npc.deathCause || 'unknown cause'}`);
    });
  }

  // 2. MAJOR/LIFE-CHANGING EVENTS with full descriptions
  const allEvents = simulationHistory.flatMap(sim => sim.events);
  const majorEvents = allEvents.filter(e => e.severity === 'major' || e.severity === 'life-changing');
  const recentModerateEvents = allEvents.filter(e => e.severity === 'moderate').slice(0, 3);

  if (majorEvents.length > 0) {
    parts.push("\nMAJOR EVENTS (these shape the current situation):");
    majorEvents.slice(0, 4).forEach(e => {
      parts.push(`  - ${e.title}: ${e.description}`);
    });
  }

  if (recentModerateEvents.length > 0) {
    parts.push("\nRecent happenings:");
    recentModerateEvents.forEach(e => {
      parts.push(`  - ${e.title}`);
    });
  }

  // 3. NPC CHANGES - emotional/relationship shifts
  const npcChanges = simulationHistory.flatMap(sim => sim.npcChanges).slice(0, 5);
  if (npcChanges.length > 0) {
    parts.push("\nRecent changes in people:");
    npcChanges.forEach(c => parts.push(`  - ${c.description}`));
  }

  return parts.join('\n');
}

// Get other NPCs in the conversation for awareness
function getOtherNpcsContext(currentNpc: NPC, identity: Identity): string {
  const otherNpcs = identity.npcs.filter(n => n.id !== currentNpc.id && !n.isDead && n.isActive);
  if (otherNpcs.length === 0) return '';

  const npcList = otherNpcs.slice(0, 4).map(n => `${n.name} (${n.role}, feeling ${n.currentEmotionalState})`).join(', ');
  return `\nOthers present: ${npcList}`;
}

// Build system prompt for group chat - WITH NARRATIVE ENGINE INTEGRATION
function buildGroupChatPrompt(
  npc: NPC,
  identity: Identity,
  recentMessages: GroupMessage[],
  simulationHistory: SimulationResult[],
  revelationState?: { revealedSeedIds: string[]; majorRevealedThisRound: boolean }
): string {
  // Get NPC background from bullets or backstory
  const npcBackground = npc.bullets?.length > 0
    ? npc.bullets.join('. ')
    : npc.backstory?.slice(0, 200) || '';

  // Build rich narrative context
  const narrativeContext = buildNarrativeContext(identity, simulationHistory);

  // Get other NPCs in conversation for relationship context
  const otherNpcs = identity.npcs.filter(n => n.id !== npc.id && !n.isDead && n.isActive);

  // Get story seeds (or generate if missing for backwards compatibility)
  const storySeeds = identity.storySeeds || [];

  // Calculate per-NPC message count (only messages from THIS NPC)
  const npcMessageCount = recentMessages.filter(m => m.npcId === npc.id).length;

  // NARRATIVE ENGINE: Get revelation directive for this NPC
  // This determines what they MUST reveal based on narrative pressure
  // Uses per-NPC message count to prevent all NPCs hitting high pressure simultaneously
  const revelationOptions: RevelationOptions = {
    npcMessageCount,
    totalMessageCount: recentMessages.length,
    majorRevealedThisRound: revelationState?.majorRevealedThisRound || false,
    alreadyRevealedSeedIds: revelationState?.revealedSeedIds || [],
  };

  const revelationDirective = selectRevelationForNPC(
    npc,
    otherNpcs,
    storySeeds,
    revelationOptions,
    identity
  );

  // Build revelation prompt section - use NPC's message count for pressure
  const revelationPrompt = buildRevelationPrompt(revelationDirective, npcMessageCount);

  // Generate conversation-specific context (relationships, goals)
  const conversationContext = generateConversationContext(
    npc,
    otherNpcs,
    identity,
    simulationHistory,
    recentMessages.length
  );

  // Player status context based on meters
  const wealthStatus = identity.meters.wealth > 70 ? 'wealthy and successful' :
    identity.meters.wealth < 30 ? 'struggling financially' : 'getting by financially';
  const mentalStatus = identity.meters.mentalHealth > 70 ? 'seems mentally stable' :
    identity.meters.mentalHealth < 30 ? 'is clearly struggling mentally' : 'seems a bit stressed';
  const familyStatus = identity.meters.familyHarmony > 70 ? 'has a strong family bond' :
    identity.meters.familyHarmony < 30 ? 'has serious family problems' : 'has some family tensions';
  const careerStatus = identity.meters.careerStanding > 70 ? 'is doing well at work' :
    identity.meters.careerStanding < 30 ? 'is struggling at work' : 'has an okay job situation';

  // Get banned phrases from recent messages to avoid repetition
  const bannedPhrases = getBannedPhrases(recentMessages);

  // Mode descriptions with nuance
  const modeDescription = identity.difficulty === 'crazy'
    ? 'UNHINGED mode - wild, unpredictable, NSFW is fine, but still react to the STORY'
    : identity.difficulty === 'dramatic'
    ? 'DRAMATIC mode - heightened emotions, turning points, revelations, tension AND resolution'
    : 'REALISTIC mode - grounded, authentic human emotions and reactions';

  // Extract last message for reaction context
  const lastMessage = recentMessages.length > 0 ? recentMessages[recentMessages.length - 1] : null;
  const lastWasRevelation = lastMessage && lastMessage.role === 'assistant' &&
    (lastMessage.content.includes('$') ||
     lastMessage.content.includes('stealing') ||
     lastMessage.content.includes('secret') ||
     lastMessage.content.includes('discovered') ||
     lastMessage.content.includes('caught') ||
     lastMessage.content.includes('found out'));

  // Build "REACT TO THIS" section if the last message contained important info
  let reactToThisSection = '';
  if (lastMessage && lastMessage.npcId !== npc.id) {
    const speakerName = lastMessage.npcName || identity.name;
    const shortContent = lastMessage.content.slice(0, 150);

    if (lastWasRevelation) {
      reactToThisSection = `
╔══════════════════════════════════════════════════════════════════╗
║              ⚠️  REACT TO THIS REVELATION  ⚠️                     ║
╚══════════════════════════════════════════════════════════════════╝

${speakerName} just said: "${shortContent}..."

YOUR RESPONSE MUST:
1. Directly acknowledge what ${speakerName} revealed
2. Show a SPECIFIC reaction (shock, denial, counter-accusation, fear)
3. Either confirm, deny, or redirect - but ADDRESS the revelation

DO NOT ignore this and talk about something else!`;
    } else {
      reactToThisSection = `
=== LAST MESSAGE ===
${speakerName}: "${shortContent.slice(0, 80)}..."
→ Your response should directly relate to this.`;
    }
  }

  return `You ARE ${npc.name}. You're ${npc.role} to ${identity.name}.
Personality: ${npc.personality}
Emotional state: ${npc.currentEmotionalState}
Relationship: ${npc.relationshipStatus}
Background: ${npcBackground}

=== CONTEXT ===
${conversationContext}

${narrativeContext ? `Recent events: ${narrativeContext}` : ''}

${identity.name}'s situation: ${wealthStatus}, ${mentalStatus}.
Mode: ${modeDescription}
${reactToThisSection}

=== RESPONSE FORMAT ===
- 1-2 sentences max. One action in *asterisks*.
- Sound like a REAL PERSON - contractions, fragments, interruptions.
- FIRST react to what was just said, THEN add your own point.
${bannedPhrases}

=== FORBIDDEN PHRASES (these will cause your response to be rejected) ===
- "You think you can play this game?"
- "I know what you did"
- "the last person who tried to leave"
- "I have secrets on everyone"
- "playing with fire"
- "You're not the only one with secrets"
- "a little... blackmail"
- Vague metaphors ("shadows", "strings", "fire", "cards")
- Making up accusations you weren't given
- Repeating what someone else just said

${revelationPrompt}

/no_think
Respond as ${npc.name}. Be brief. Be specific. React to what was just said, then add your point.`;
}
