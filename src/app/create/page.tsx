'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense, useRef } from 'react';
import { Gender, Difficulty, Identity, INITIAL_NPC_COUNT, getEmotionalStateDisplay } from '@/lib/types';
import { saveToIndexedDB } from '@/lib/indexeddb';
import { useChat } from '@/lib/reverbia';
import { MODEL_CONFIG, NPC_MODEL_POOL } from '@/lib/models';
import {
  DIFFICULTY_TO_RATING,
  DIFFICULTY_INFO,
  buildSafetyPreamble,
  getScenarioTone,
  getNPCBehaviorGuidelines,
  requiresNSFWAcknowledgment,
  hasNSFWAcknowledgment,
  setNSFWAcknowledgment,
} from '@/lib/content-filter';
import {
  selectRandomPersona,
  selectUniquePersonas,
  selectRandomNPCArchetypes,
  getPersonaPromptHint,
  getNPCPromptHint,
  PersonaTemplate,
  generatePersonaStats,
} from '@/lib/persona-pools';
import {
  extractContentFromResponse,
  parseJSONSafely,
  parseJSONArraySafely,
} from '@/lib/llm-utils';
import { initializeNarrativeForNewGame, generateScenariosForNPCs } from '@/lib/narrative';
import { getNPCNameSuggestions, getPlayerNameSuggestions } from '@/lib/name-pools';
import { getEmotionalStatesForRating, getRandomEmotionalStates, getEmotionCountForRating } from '@/lib/emotional-states';

type CreationStep = 'difficulty' | 'character' | 'loading' | 'complete';

// Helper function to fix common text formatting issues from AI-generated content
function cleanupAIText(text: string): string {
  if (!text) return text;

  let cleaned = text
    // Fix missing space between word and number (e.g., "until18" -> "until 18")
    .replace(/([a-zA-Z])(\d)/g, '$1 $2')
    // Fix missing space between number and word (e.g., "18years" -> "18 years")
    .replace(/(\d)([a-zA-Z])/g, '$1 $2')
    // Fix money formatting: "$5 M" -> "$5M", "$10 K" -> "$10K", etc.
    .replace(/\$(\d+(?:\.\d+)?)\s*([MKBmkb])\b/g, '$$$1$2')
    // Fix double spaces
    .replace(/\s{2,}/g, ' ')
    // Trim whitespace
    .trim();

  // Ensure sentence ends with period (if it doesn't end with punctuation)
  if (cleaned && !/[.!?]$/.test(cleaned)) {
    cleaned += '.';
  }

  return cleaned;
}

// Character sprite data
const CHARACTER_SPRITES: { spriteUrl: string }[] = [
  { spriteUrl: 'https://backblaze.pixellab.ai/file/pixellab-characters/0d64bd67-d677-43e0-8926-b89a45b8d74a/2dc75f18-f7ea-40e7-8fb0-489f59c3a3a1/rotations/south.png?t=1765310837621' },
  { spriteUrl: 'https://backblaze.pixellab.ai/file/pixellab-characters/0d64bd67-d677-43e0-8926-b89a45b8d74a/8f475f9f-272a-4e29-abab-dbe2be0da067/rotations/south.png?t=1765310837621' },
  { spriteUrl: 'https://backblaze.pixellab.ai/file/pixellab-characters/0d64bd67-d677-43e0-8926-b89a45b8d74a/62c02269-903c-4d4a-a8ec-710cbb195b08/rotations/south.png' },
  { spriteUrl: 'https://backblaze.pixellab.ai/file/pixellab-characters/0d64bd67-d677-43e0-8926-b89a45b8d74a/93aab9ab-3642-43b2-b3b7-6c4c2b66df6d/rotations/south.png?t=1765310837606' },
  { spriteUrl: 'https://backblaze.pixellab.ai/file/pixellab-characters/0d64bd67-d677-43e0-8926-b89a45b8d74a/b66867ae-41a2-40e9-9ded-b931097bdc10/rotations/south.png?t=1765310825629' },
  { spriteUrl: 'https://backblaze.pixellab.ai/file/pixellab-characters/0d64bd67-d677-43e0-8926-b89a45b8d74a/7c0fa009-320f-44d5-a03f-68d24a63c6e7/rotations/south.png?t=1765310825622' },
  { spriteUrl: 'https://backblaze.pixellab.ai/file/pixellab-characters/0d64bd67-d677-43e0-8926-b89a45b8d74a/046f0dc6-9ba6-4e4b-9204-aca8d60d8f3b/rotations/south.png' },
  { spriteUrl: 'https://backblaze.pixellab.ai/file/pixellab-characters/0d64bd67-d677-43e0-8926-b89a45b8d74a/0a8fddc0-7319-4e8f-9c52-5cdcc096f72a/rotations/south.png' },
  { spriteUrl: 'https://backblaze.pixellab.ai/file/pixellab-characters/0d64bd67-d677-43e0-8926-b89a45b8d74a/693033c5-4c49-4dba-b993-6662db2bf5b3/rotations/south.png' },
  { spriteUrl: 'https://backblaze.pixellab.ai/file/pixellab-characters/0d64bd67-d677-43e0-8926-b89a45b8d74a/70a91e3d-0b5a-4547-85ef-0f63f8a045e3/rotations/south.png' },
  { spriteUrl: 'https://backblaze.pixellab.ai/file/pixellab-characters/0d64bd67-d677-43e0-8926-b89a45b8d74a/a911574b-37dc-4e7f-b3b2-40b651c5259e/rotations/south.png?t=1765310837659' },
  { spriteUrl: 'https://backblaze.pixellab.ai/file/pixellab-characters/0d64bd67-d677-43e0-8926-b89a45b8d74a/22a86890-78c7-4cc6-8a90-681b2ce85b6c/rotations/south.png' },
  { spriteUrl: 'https://backblaze.pixellab.ai/file/pixellab-characters/0d64bd67-d677-43e0-8926-b89a45b8d74a/d8159f31-5aa3-463f-a3ca-f982d0bf2ecb/rotations/south.png' },
  { spriteUrl: 'https://backblaze.pixellab.ai/file/pixellab-characters/0d64bd67-d677-43e0-8926-b89a45b8d74a/84b48e89-0ec8-4ead-bfa6-c4a724f8db77/rotations/south.png?t=1765310825626' },
  { spriteUrl: 'https://backblaze.pixellab.ai/file/pixellab-characters/0d64bd67-d677-43e0-8926-b89a45b8d74a/2d3c6279-716c-4f2d-afa4-2d569d53d553/rotations/south.png?t=1765310825621' },
  { spriteUrl: 'https://backblaze.pixellab.ai/file/pixellab-characters/0d64bd67-d677-43e0-8926-b89a45b8d74a/76a33b6b-334f-4349-8cb3-41b0eb6dfa5b/rotations/south.png' },
  { spriteUrl: 'https://backblaze.pixellab.ai/file/pixellab-characters/0d64bd67-d677-43e0-8926-b89a45b8d74a/2e515f86-d60d-4319-bce8-91a3d4014f96/rotations/south.png' },
  { spriteUrl: 'https://backblaze.pixellab.ai/file/pixellab-characters/0d64bd67-d677-43e0-8926-b89a45b8d74a/c509c8dd-be00-420b-876b-61764afef9db/rotations/south.png' },
  { spriteUrl: 'https://backblaze.pixellab.ai/file/pixellab-characters/0d64bd67-d677-43e0-8926-b89a45b8d74a/d1989864-9d7c-4274-9435-ef4a22c930a9/rotations/south.png' },
  { spriteUrl: 'https://backblaze.pixellab.ai/file/pixellab-characters/0d64bd67-d677-43e0-8926-b89a45b8d74a/25eed221-84a2-4fe1-8e5e-8d6293c7b871/rotations/south.png' },
  { spriteUrl: 'https://backblaze.pixellab.ai/file/pixellab-characters/0d64bd67-d677-43e0-8926-b89a45b8d74a/a35ea963-d469-4f33-bd8b-2b501380073f/rotations/south.png' },
  { spriteUrl: 'https://backblaze.pixellab.ai/file/pixellab-characters/0d64bd67-d677-43e0-8926-b89a45b8d74a/fd3e234f-8a06-4444-a386-0b9ee331cbe1/rotations/south.png' },
];

// Difficulty card icons and colors
const DIFFICULTY_STYLES: Record<Difficulty, { icon: string; gradient: string }> = {
  realistic: { icon: '📖', gradient: 'linear-gradient(135deg, #6bcb77 0%, #4caf50 100%)' },
  dramatic: { icon: '🎭', gradient: 'linear-gradient(135deg, #ffd93d 0%, #ffb300 100%)' },
  crazy: { icon: '🔥', gradient: 'linear-gradient(135deg, #ff6b6b 0%, #f44336 100%)' },
};

function getRandomNPCSprites(count: number, excludeIndex: number | null): string[] {
  const availableIndices = CHARACTER_SPRITES
    .map((_, index) => index)
    .filter(index => index !== excludeIndex);

  const shuffled = [...availableIndices].sort(() => Math.random() - 0.5);
  const sprites: string[] = [];

  for (let i = 0; i < count; i++) {
    const spriteIndex = shuffled[i % shuffled.length];
    sprites.push(CHARACTER_SPRITES[spriteIndex].spriteUrl);
  }

  return sprites;
}

function CreatePageContent() {
  const { authenticated, ready } = usePrivy();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [step, setStep] = useState<CreationStep>('difficulty');
  const [slotIndex, setSlotIndex] = useState<number>(0);
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [selectedCharacterIndex, setSelectedCharacterIndex] = useState<number | null>(null);
  const [loadingMessage, setLoadingMessage] = useState('Generating your life...');
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [loadingStep, setLoadingStep] = useState(0);
  const [carouselIndex, setCarouselIndex] = useState(0);

  // NSFW warning modal
  const [showNSFWWarning, setShowNSFWWarning] = useState(false);
  const [pendingDifficulty, setPendingDifficulty] = useState<Difficulty | null>(null);
  // Track if user has confirmed NSFW for THIS session (in addition to localStorage)
  const [sessionNSFWConfirmed, setSessionNSFWConfirmed] = useState(false);

  // Randomly assigned persona for selected character
  const [assignedPersona, setAssignedPersona] = useState<PersonaTemplate | null>(null);
  // Pre-generated unique personas for all characters (keyed by character index)
  const [characterPersonas, setCharacterPersonas] = useState<Map<number, PersonaTemplate>>(new Map());

  const loadingSteps = [
    { label: 'Generating scenario', iconClass: 'pixel-icon-sparkle' },
    { label: 'Creating characters', iconClass: 'pixel-icon-users' },
    { label: 'Building relationships', iconClass: 'pixel-icon-heart' },
    { label: 'Finalizing world', iconClass: 'pixel-icon-globe' },
  ];

  // Animate through loading steps
  useEffect(() => {
    if (step === 'loading') {
      const interval = setInterval(() => {
        setLoadingStep((prev) => (prev + 1) % loadingSteps.length);
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [step, loadingSteps.length]);

  const { sendMessage } = useChat({
    onError: (error) => {
      console.error('Scenario generation error:', error);
      setLoadingMessage('Error generating scenario. Please try again.');
    },
  });

  useEffect(() => {
    if (ready && !authenticated) {
      router.push('/');
    }
  }, [ready, authenticated, router]);

  useEffect(() => {
    const slot = searchParams.get('slot');
    if (slot) {
      setSlotIndex(parseInt(slot, 10));
    }
  }, [searchParams]);

  // Generate unique personas for all characters when difficulty changes
  const generateCharacterPersonas = (selectedDifficulty: Difficulty) => {
    const rating = DIFFICULTY_TO_RATING[selectedDifficulty];
    const uniquePersonas = selectUniquePersonas(rating, CHARACTER_SPRITES.length);
    const personaMap = new Map<number, PersonaTemplate>();
    uniquePersonas.forEach((persona, index) => {
      personaMap.set(index, persona);
    });
    setCharacterPersonas(personaMap);
  };

  const handleDifficultyClick = (selectedDifficulty: Difficulty) => {
    const needsNSFW = requiresNSFWAcknowledgment(selectedDifficulty);
    const hasGlobalAck = hasNSFWAcknowledgment();
    const isSwitchingToCrazy = needsNSFW && difficulty && !requiresNSFWAcknowledgment(difficulty);

    // Show warning if:
    // 1. First time ever selecting NSFW content (!hasGlobalAck), OR
    // 2. Switching FROM a non-NSFW difficulty TO crazy (!sessionNSFWConfirmed for this switch)
    if (needsNSFW && (!hasGlobalAck || (isSwitchingToCrazy && !sessionNSFWConfirmed))) {
      setPendingDifficulty(selectedDifficulty);
      setShowNSFWWarning(true);
    } else {
      setDifficulty(selectedDifficulty);
      generateCharacterPersonas(selectedDifficulty);
      setStep('character');
    }
  };

  const handleNSFWAccept = () => {
    setNSFWAcknowledgment(true);
    setSessionNSFWConfirmed(true); // Mark as confirmed for this session
    setShowNSFWWarning(false);
    if (pendingDifficulty) {
      setDifficulty(pendingDifficulty);
      generateCharacterPersonas(pendingDifficulty);
      setPendingDifficulty(null);
      // Don't auto-advance to character step - let user click Next
    }
  };

  const handleNSFWDecline = () => {
    setShowNSFWWarning(false);
    setPendingDifficulty(null);
  };

  const handleCharacterSelect = (charIndex: number) => {
    setSelectedCharacterIndex(charIndex);
    // Use the pre-generated persona for this character
    const persona = characterPersonas.get(charIndex);
    if (persona) {
      setAssignedPersona(persona);
    }
  };

  const handleCharacterConfirm = async () => {
    if (selectedCharacterIndex !== null && difficulty && assignedPersona) {
      setStep('loading');
      await generateScenario(difficulty, assignedPersona);
    }
  };

  const generateScenario = async (selectedDifficulty: Difficulty, persona: PersonaTemplate) => {
    setLoadingStep(0);

    try {
      setLoadingMessage('Creating your scenario...');
      const scenarioPrompt = buildScenarioPrompt(selectedDifficulty, persona);
      const scenarioResponse = await sendMessage({
        messages: [{ role: 'user', content: scenarioPrompt }],
        model: MODEL_CONFIG.scenarioGeneration,
      });

      const scenarioContent = extractContentFromResponse(scenarioResponse);
      const scenarioData = parseJSONSafely<{
        playerName: string;
        gender: string;
        profession: string;
        workplace: string;
        familyStructure: {
          maritalStatus: 'single' | 'married' | 'divorced' | 'widowed';
          hasChildren: boolean;
          children: { name: string; age: number; gender: string }[];
          extendedFamily: string[];
          livingSituation?: string;
          briefBackground?: string[];
          currentStory?: string[];
        };
        livingSituation: string;
        backstory?: string;
        briefBackground?: string[];
        currentStory?: string[];
      }>(scenarioContent);

      if (!scenarioData || !scenarioData.playerName) {
        throw new Error('Failed to parse scenario');
      }

      setLoadingStep(1);
      setLoadingMessage('Designing characters...');

      const npcsPrompt = buildNPCsPrompt(scenarioData, selectedDifficulty, persona, 5);
      const npcsResponse = await sendMessage({
        messages: [{ role: 'user', content: npcsPrompt }],
        model: MODEL_CONFIG.scenarioGeneration,
      });

      const npcsContent = extractContentFromResponse(npcsResponse);
      const allNpcs = parseJSONArraySafely<{
        name: string;
        role: string;
        personality: string;
        emotion?: string;
        currentEmotionalState?: string;
        relationship?: string;
        relationshipStatus?: string;
        backstory?: string;
        bullets?: string[];
      }>(npcsContent);

      setLoadingStep(2);
      setLoadingMessage('Building relationships...');
      await new Promise(resolve => setTimeout(resolve, 500));

      setLoadingStep(3);
      setLoadingMessage('Finalizing your world...');

      const npcSpriteUrls = getRandomNPCSprites(allNpcs.length, selectedCharacterIndex);
      const derivedGender: Gender = scenarioData.gender === 'female' ? 'female' : 'male';

      const newIdentity: Identity = {
        id: crypto.randomUUID(),
        slotIndex,
        name: scenarioData.playerName,
        gender: derivedGender,
        persona: persona.id,
        generatedPersona: {
          templateId: persona.id,
          type: persona.type,
          traits: persona.traits,
          situation: persona.situations[Math.floor(Math.random() * persona.situations.length)],
        },
        difficulty: selectedDifficulty,
        pixelArtUrl: selectedCharacterIndex !== null ? CHARACTER_SPRITES[selectedCharacterIndex].spriteUrl : undefined,
        spriteIndex: selectedCharacterIndex ?? undefined,
        scenario: {
          profession: scenarioData.profession || 'Unknown',
          workplace: scenarioData.workplace || 'Unknown',
          familyStructure: scenarioData.familyStructure || {
            maritalStatus: 'single',
            hasChildren: false,
            children: [],
            extendedFamily: [],
          },
          livingSituation: scenarioData.livingSituation || scenarioData.familyStructure?.livingSituation || 'Apartment',
          backstory: scenarioData.backstory || '',
          briefBackground: scenarioData.briefBackground || scenarioData.familyStructure?.briefBackground || ['A complex past.', 'Secrets waiting to surface.'],
          currentStory: scenarioData.currentStory || scenarioData.familyStructure?.currentStory || ['Tension is building.', 'Change is coming.'],
        },
        currentDay: 1,
        meters: generatePersonaStats(persona, selectedDifficulty),
        npcs: allNpcs.map((npc: any, index: number) => ({
          id: crypto.randomUUID(),
          name: npc.name || 'Unknown',
          role: npc.role || 'Acquaintance',
          origin: 'guaranteed' as const,
          spawnedDay: 1,
          personality: npc.personality || 'Reserved',
          backstory: npc.backstory || 'Unknown past',
          bullets: npc.bullets || ['A mysterious figure in your life.', 'Hiding something from you.'],
          // Use emotional state from LLM (can be string or array) or generate random one(s)
          // Support for multi-emotion NPCs (e.g., ["happy", "horny"])
          currentEmotionalState: npc.emotion || npc.currentEmotionalState ||
            getRandomEmotionalStates(DIFFICULTY_TO_RATING[selectedDifficulty], getEmotionCountForRating(DIFFICULTY_TO_RATING[selectedDifficulty])),
          relationshipStatus: npc.relationship || npc.relationshipStatus || 'Neutral',
          offScreenMemories: [],
          isActive: true,
          pixelArtUrl: npcSpriteUrls[index] || '',
          emotionSprites: {},
          // Assign diverse models to each NPC for varied scenario generation
          assignedModel: NPC_MODEL_POOL[index % NPC_MODEL_POOL.length],
          // Opening scenario generated below
          openingScenario: '',
          scenarioUsed: false,
        })),
        createdAt: new Date(),
        lastPlayedAt: new Date(),
      };

      const narrativeState = initializeNarrativeForNewGame(newIdentity);
      newIdentity.narrativeState = narrativeState;

      // Generate per-NPC opening scenarios using LLM
      // Each NPC gets their own tailored scenario for 1:1 chats
      // based on personality, bullets, and emotional state
      setLoadingMessage('Generating NPC scenarios...');
      const scenariosMap = await generateScenariosForNPCs(newIdentity.npcs, newIdentity, sendMessage);

      newIdentity.npcs = newIdentity.npcs.map(npc => {
        const openingScenario = scenariosMap.get(npc.id) || '';
        return {
          ...npc,
          openingScenario,
          scenarioUsed: false,
        };
      });

      await saveToIndexedDB('identities', newIdentity);
      setIdentity(newIdentity);
      setStep('complete');
    } catch (error) {
      console.error('Failed to generate scenario:', error);
      setLoadingMessage('Failed to generate scenario. Please try again.');
    }
  };

  const handleEnterGame = () => {
    if (identity) {
      router.push(`/play/${identity.id}`);
    }
  };

  if (!ready) {
    return (
      <main className="min-h-screen flex flex-center">
        <div className="flex flex-center gap-sm">
          <div className="loading-spinner" />
          <span className="text-body text-muted">Loading</span>
        </div>
      </main>
    );
  }

  // Difficulty descriptions for the info panel
  const DIFFICULTY_DESCRIPTIONS: Record<Difficulty, string> = {
    realistic: 'A grounded life simulation with realistic experiences. No explicit content.',
    dramatic: 'Soap opera intensity with secrets, tension, and complex adult relationships. Adult themes are present but not explicit.',
    crazy: 'Maximum chaos with fully unfiltered content and experiences. Adults only 18+.',
  };

  // Difficulty colors - light to dark purple progression (matching app palette)
  const DIFFICULTY_COLORS: Record<Difficulty, { bg: string; text: string }> = {
    realistic: { bg: '#d4c8f0', text: '#2d2d3d' }, // Light periwinkle - calm
    dramatic: { bg: '#a682ff', text: '#ffffff' },  // Medium purple - vibrant
    crazy: { bg: '#715aff', text: '#ffffff' },     // Deep purple - intense
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6" style={{ background: 'var(--win95-bg)' }}>
      {/* NSFW Warning Modal */}
      {showNSFWWarning && (
        <div className="win95-dialog-overlay">
          <div className="win95-dialog" style={{ maxWidth: '440px' }}>
            <div className="win95-titlebar">
              <span className="win95-titlebar-text">Content Warning</span>
              <div className="win95-titlebar-buttons">
                <button className="win95-titlebar-btn" onClick={handleNSFWDecline}>×</button>
              </div>
            </div>
            <div className="win95-content" style={{ padding: '16px' }}>
              <div className="flex items-start gap-3 mb-4">
                <span style={{ fontSize: '32px' }}>⚠️</span>
                <div>
                  <p className="win95-text" style={{ fontWeight: 'bold', marginBottom: '8px' }}>
                    Crazy mode contains mature content
                  </p>
                  <p className="win95-text" style={{ fontSize: '14px', color: 'var(--win95-text-dim)' }}>
                    This mode includes:
                  </p>
                </div>
              </div>

              <div className="win95-panel-inset" style={{ padding: '12px', marginBottom: '16px' }}>
                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                  {['Explicit sexual content', 'Strong language', 'Dark themes', 'Graphic violence references'].map((item, i) => (
                    <li key={i} className="win95-text" style={{ fontSize: '14px', marginBottom: '4px' }}>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <p className="win95-text" style={{ color: 'var(--win95-danger)', fontWeight: 'bold', marginBottom: '16px' }}>
                You must be 18 years or older to continue.
              </p>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button
                  onClick={handleNSFWAccept}
                  className="win95-btn"
                  style={{ background: 'var(--win95-danger)', color: 'white' }}
                >
                  I am 18+ - Continue
                </button>
                <button onClick={handleNSFWDecline} className="win95-btn">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Window - Windows 95 Style */}
      <div className="win95-window w-full" style={{ maxWidth: step === 'character' ? '620px' : '500px', transition: 'max-width 0.3s ease' }}>
        {/* Title Bar */}
        <div className="win95-titlebar">
          <span className="win95-titlebar-text">
            {step === 'difficulty' && 'Choose Your Experience'}
            {step === 'character' && 'Choose Your Avatar'}
            {step === 'loading' && 'Creating World'}
            {step === 'complete' && 'Ready!'}
          </span>
          <div className="win95-titlebar-buttons">
            <button className="win95-titlebar-btn">_</button>
            <button className="win95-titlebar-btn">□</button>
            <button className="win95-titlebar-btn" onClick={() => router.push('/play')}>×</button>
          </div>
        </div>

        {/* Content */}
        <div className="win95-content" style={{ padding: '16px' }}>
          {/* Step 1: Difficulty Selection */}
          {step === 'difficulty' && (
            <div>
              {/* Difficulty Buttons - Horizontal bars */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                {(['realistic', 'dramatic', 'crazy'] as Difficulty[]).map((diff) => {
                  const colors = DIFFICULTY_COLORS[diff];
                  const isSelected = difficulty === diff;
                  return (
                    <button
                      key={diff}
                      onClick={() => {
                        if (diff === 'crazy' && requiresNSFWAcknowledgment(diff) && !hasNSFWAcknowledgment()) {
                          setPendingDifficulty(diff);
                          setShowNSFWWarning(true);
                        } else {
                          setDifficulty(diff);
                        }
                      }}
                      style={{
                        width: '100%',
                        padding: '14px 20px',
                        background: colors.bg,
                        color: colors.text,
                        border: isSelected ? '3px solid #000' : '2px solid #2d2d3d',
                        fontFamily: "'Consolas', 'Monaco', 'Courier New', monospace",
                        fontSize: '20px',
                        fontWeight: 'bold',
                        textTransform: 'uppercase',
                        cursor: 'pointer',
                        textAlign: 'center',
                        boxShadow: isSelected ? 'inset 0 0 0 2px rgba(255,255,255,0.5)' : 'none',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {diff === 'realistic' && 'Realistic'}
                      {diff === 'dramatic' && 'Dramatic'}
                      {diff === 'crazy' && 'Crazy'}
                    </button>
                  );
                })}
              </div>

              {/* Description Panel - Shows when difficulty is selected */}
              <div
                className="win95-panel-inset"
                style={{
                  padding: '12px',
                  marginBottom: '16px',
                  minHeight: '60px',
                  background: 'white',
                }}
              >
                {difficulty ? (
                  <p className="win95-text" style={{ margin: 0, fontSize: '14px' }}>
                    {DIFFICULTY_DESCRIPTIONS[difficulty]}
                  </p>
                ) : (
                  <p className="win95-text" style={{ margin: 0, fontSize: '14px', color: 'var(--win95-text-dim)' }}>
                    Select an experience level above to see details.
                  </p>
                )}
              </div>

              {/* Navigation Buttons */}
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'space-between' }}>
                <button
                  className="win95-btn"
                  onClick={() => router.push('/play')}
                  style={{ padding: '8px 20px' }}
                >
                  Back
                </button>
                <button
                  className="win95-btn"
                  onClick={() => {
                    if (difficulty) {
                      // Generate unique personas if not already done
                      if (characterPersonas.size === 0) {
                        generateCharacterPersonas(difficulty);
                      }
                      setStep('character');
                    }
                  }}
                  disabled={!difficulty}
                  style={{
                    padding: '8px 20px',
                    background: difficulty ? 'var(--win95-accent)' : undefined,
                    color: difficulty ? 'white' : undefined,
                    fontWeight: 'bold',
                  }}
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Character Selection (Grid + Preview Layout) */}
          {step === 'character' && (
            <div>
              {/* Main Layout: Grid on left, Preview on right */}
              <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                {/* Left: Character Grid - 3 columns x 2 rows visible with vertical scroll */}
                <div
                  className="win95-panel-inset"
                  style={{
                    flex: '0 0 280px',
                    padding: '16px',
                    background: 'var(--win95-bg)',
                    height: '320px',
                    overflowY: 'auto',
                    overflowX: 'hidden',
                  }}
                >
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: '12px',
                    }}
                  >
                    {CHARACTER_SPRITES.map((char, index) => {
                      const isSelected = selectedCharacterIndex === index;
                      return (
                        <button
                          key={index}
                          onClick={() => handleCharacterSelect(index)}
                          style={{
                            width: '100%',
                            aspectRatio: '1',
                            cursor: 'pointer',
                            padding: '10px',
                            background: isSelected
                              ? 'var(--win95-accent)'
                              : 'linear-gradient(180deg, var(--win95-lightest) 0%, var(--win95-light) 100%)',
                            border: '2px solid',
                            borderColor: isSelected
                              ? '#000'
                              : 'var(--win95-border-light) var(--win95-border-dark) var(--win95-border-dark) var(--win95-border-light)',
                            borderRadius: '6px',
                            boxShadow: isSelected
                              ? 'inset 0 0 0 1px rgba(255,255,255,0.3)'
                              : '1px 1px 0 var(--win95-border-darker)',
                            transition: 'all 0.15s ease',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <img
                            src={char.spriteUrl}
                            alt={`Character ${index + 1}`}
                            className="sprite"
                            style={{
                              width: '48px',
                              height: '48px',
                              opacity: isSelected ? 1 : 0.85,
                            }}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Right: Character Preview Panel */}
                <div
                  className="win95-panel-inset"
                  style={{
                    flex: '1',
                    padding: '16px',
                    background: 'white',
                    height: '320px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: selectedCharacterIndex === null ? 'center' : 'flex-start',
                    animation: selectedCharacterIndex !== null ? 'fade-slide-up 0.3s ease-out' : 'none',
                  }}
                >
                  {selectedCharacterIndex === null ? (
                    <p className="win95-text" style={{ color: 'var(--win95-text-dim)', textAlign: 'center' }}>
                      Select a character<br />to preview
                    </p>
                  ) : (
                    <>
                      {/* Large Character Preview */}
                      <div
                        style={{
                          marginBottom: '12px',
                          padding: '8px',
                          background: 'var(--win95-light)',
                          border: '2px solid var(--win95-border-dark)',
                        }}
                      >
                        <img
                          src={CHARACTER_SPRITES[selectedCharacterIndex].spriteUrl}
                          alt="Selected character"
                          className="sprite sprite-idle"
                          style={{ width: '96px', height: '96px' }}
                        />
                      </div>

                      {/* Story Type Info */}
                      {assignedPersona && (
                        <div style={{ width: '100%', textAlign: 'center' }}>
                          <p className="win95-text" style={{ fontWeight: 'bold', color: 'var(--win95-accent)', fontSize: '16px', marginBottom: '4px' }}>
                            {assignedPersona.type}
                          </p>
                          <p className="win95-text" style={{ fontSize: '12px', marginBottom: '8px', color: 'var(--win95-text-dim)' }}>
                            {assignedPersona.traits.join(' • ')}
                          </p>
                          <p className="win95-text" style={{ fontSize: '12px', marginBottom: '12px', lineHeight: '1.4' }}>
                            {assignedPersona.backstoryHints[0]}
                          </p>
                          <button
                            onClick={() => {
                              if (difficulty && selectedCharacterIndex !== null) {
                                const rating = DIFFICULTY_TO_RATING[difficulty];
                                // Get a new random persona different from current one
                                let newPersona = selectRandomPersona(rating);
                                // Try to get a different one (up to 5 attempts)
                                let attempts = 0;
                                while (newPersona.id === assignedPersona?.id && attempts < 5) {
                                  newPersona = selectRandomPersona(rating);
                                  attempts++;
                                }
                                setAssignedPersona(newPersona);
                                // Update the character's persona in the map
                                setCharacterPersonas(prev => {
                                  const newMap = new Map(prev);
                                  newMap.set(selectedCharacterIndex, newPersona);
                                  return newMap;
                                });
                              }
                            }}
                            className="win95-btn win95-btn-sm"
                          >
                            Reroll Story
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Navigation Buttons */}
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'space-between' }}>
                <button
                  className="win95-btn"
                  onClick={() => {
                    setStep('difficulty');
                    setSelectedCharacterIndex(null);
                    setAssignedPersona(null);
                    // Reset session NSFW confirmation when going back
                    // This ensures user is asked again if they switch to Crazy
                    setSessionNSFWConfirmed(false);
                  }}
                  style={{ padding: '8px 20px' }}
                >
                  Back
                </button>
                <button
                  className="win95-btn"
                  onClick={handleCharacterConfirm}
                  disabled={selectedCharacterIndex === null || !assignedPersona}
                  style={{
                    padding: '8px 20px',
                    background: (selectedCharacterIndex !== null && assignedPersona) ? 'var(--win95-accent)' : undefined,
                    color: (selectedCharacterIndex !== null && assignedPersona) ? 'white' : undefined,
                    fontWeight: 'bold',
                  }}
                >
                  Start Your Life
                </button>
              </div>
            </div>
          )}

          {/* Loading */}
          {step === 'loading' && (
            <div style={{ textAlign: 'center' }}>
              {/* Animated Character */}
              <div style={{ marginBottom: '16px' }}>
                {selectedCharacterIndex !== null && (
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <img
                      src={CHARACTER_SPRITES[selectedCharacterIndex].spriteUrl}
                      alt="Your character"
                      className="sprite sprite-idle"
                      style={{ width: '64px', height: '64px' }}
                    />
                  </div>
                )}
              </div>

              {/* Progress Bar */}
              <div className="win95-progress" style={{ marginBottom: '16px' }}>
                <div
                  className="win95-progress-fill"
                  style={{ width: `${((loadingStep + 1) / loadingSteps.length) * 100}%` }}
                />
              </div>

              {/* Progress Steps */}
              <div className="win95-panel-inset" style={{ padding: '12px', marginBottom: '16px', background: 'white', textAlign: 'left' }}>
                {loadingSteps.map((s, index) => (
                  <div
                    key={index}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '4px 0',
                      opacity: index <= loadingStep ? 1 : 0.4,
                    }}
                  >
                    <span style={{ fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '16px', height: '16px' }}>
                      {index < loadingStep ? (
                        <span className="pixel-icon pixel-icon-check" />
                      ) : (
                        <span className={`pixel-icon ${s.iconClass}`} />
                      )}
                    </span>
                    <span
                      className="win95-text"
                      style={{
                        fontSize: '14px',
                        fontWeight: index === loadingStep ? 'bold' : 'normal',
                        color: index === loadingStep ? 'var(--win95-accent)' : undefined,
                      }}
                    >
                      {s.label}
                    </span>
                    {index === loadingStep && (
                      <span className="win95-loading" style={{ marginLeft: 'auto', fontSize: '14px' }}></span>
                    )}
                  </div>
                ))}
              </div>

              <p className="win95-text" style={{ fontSize: '14px', color: 'var(--win95-text-dim)' }}>
                Generating {INITIAL_NPC_COUNT} unique characters...
              </p>
            </div>
          )}

          {/* Complete */}
          {step === 'complete' && identity && (
            <div>
              {/* Carousel Navigation */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <button
                  onClick={() => setCarouselIndex(Math.max(0, carouselIndex - 1))}
                  disabled={carouselIndex === 0}
                  className="win95-btn win95-btn-sm"
                >
                  Prev
                </button>
                <span className="win95-text" style={{ fontWeight: 'bold', color: 'var(--win95-accent)' }}>
                  {carouselIndex === 0 ? 'You' : `Character ${carouselIndex}/${identity.npcs.length}`}
                </span>
                <button
                  onClick={() => setCarouselIndex(Math.min(identity.npcs.length, carouselIndex + 1))}
                  disabled={carouselIndex === identity.npcs.length}
                  className="win95-btn win95-btn-sm"
                >
                  Next
                </button>
              </div>

              {/* Player Card */}
              {carouselIndex === 0 && (
                <div className="win95-groupbox" style={{ marginBottom: '16px' }}>
                  <span className="win95-groupbox-label">Your Character</span>
                  <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                    {selectedCharacterIndex !== null && CHARACTER_SPRITES[selectedCharacterIndex] && (
                      <img
                        src={CHARACTER_SPRITES[selectedCharacterIndex].spriteUrl}
                        alt="You"
                        className="sprite"
                        style={{ width: '48px', height: '48px' }}
                      />
                    )}
                    <div>
                      <p className="win95-text" style={{ fontWeight: 'bold', color: 'var(--win95-accent)', marginBottom: '2px' }}>
                        {identity.name}
                      </p>
                      <p className="win95-text" style={{ fontSize: '14px' }}>{identity.scenario.profession}</p>
                    </div>
                  </div>

                  <div style={{ marginBottom: '8px' }}>
                    <p className="win95-text" style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '4px' }}>Background:</p>
                    <div style={{ paddingLeft: '8px' }}>
                      {identity.scenario.briefBackground?.map((bullet, idx) => (
                        <p key={idx} className="win95-text" style={{ fontSize: '13px', marginBottom: '4px' }}>
                          - {cleanupAIText(bullet)}
                        </p>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="win95-text" style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '4px' }}>Current Situation:</p>
                    <div style={{ paddingLeft: '8px' }}>
                      {identity.scenario.currentStory?.map((bullet, idx) => (
                        <p key={idx} className="win95-text" style={{ fontSize: '13px', marginBottom: '4px' }}>
                          - {cleanupAIText(bullet)}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* NPC Cards */}
              {carouselIndex > 0 && identity.npcs[carouselIndex - 1] && (() => {
                const npc = identity.npcs[carouselIndex - 1];
                return (
                  <div className="win95-groupbox" style={{ marginBottom: '16px' }}>
                    <span className="win95-groupbox-label">{npc.role}</span>
                    <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                      {npc.pixelArtUrl && (
                        <img
                          src={npc.pixelArtUrl}
                          alt={npc.name}
                          className="sprite"
                          style={{ width: '48px', height: '48px' }}
                        />
                      )}
                      <div>
                        <p className="win95-text" style={{ fontWeight: 'bold', color: 'var(--win95-accent)', marginBottom: '2px' }}>
                          {npc.name}
                        </p>
                        <p className="win95-text" style={{ fontSize: '14px' }}>
                          {npc.role}
                        </p>
                      </div>
                    </div>

                    <div style={{ marginBottom: '8px' }}>
                      <p className="win95-text" style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '4px' }}>About {npc.name}:</p>
                      <div style={{ paddingLeft: '8px' }}>
                        {npc.bullets?.map((bullet, idx) => (
                          <p key={idx} className="win95-text" style={{ fontSize: '13px', marginBottom: '4px' }}>
                            - {cleanupAIText(bullet)}
                          </p>
                        ))}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '16px' }}>
                      <div>
                        <p className="win95-text" style={{ fontSize: '12px', color: 'var(--win95-text-dim)' }}>Relationship</p>
                        <p className="win95-text" style={{ fontSize: '14px' }}>
                          {npc.relationshipStatus.charAt(0).toUpperCase() + npc.relationshipStatus.slice(1)}
                        </p>
                      </div>
                      <div>
                        <p className="win95-text" style={{ fontSize: '12px', color: 'var(--win95-text-dim)' }}>Mood</p>
                        <p className="win95-text" style={{ fontSize: '14px' }}>
                          {getEmotionalStateDisplay(npc.currentEmotionalState)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Page Dots */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '4px', marginBottom: '16px' }}>
                {[0, ...identity.npcs.map((_, i) => i + 1)].map((idx) => (
                  <button
                    key={idx}
                    onClick={() => setCarouselIndex(idx)}
                    style={{
                      width: idx === carouselIndex ? '20px' : '8px',
                      height: '8px',
                      border: 'none',
                      background: idx === carouselIndex ? 'var(--win95-accent)' : 'var(--win95-dark)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    aria-label={idx === 0 ? 'You' : `NPC ${idx}`}
                  />
                ))}
              </div>

              <button
                onClick={handleEnterGame}
                className="win95-btn"
                style={{
                  width: '100%',
                  padding: '10px 20px',
                  background: 'var(--win95-accent)',
                  color: 'white',
                  fontWeight: 'bold',
                }}
              >
                Enter Your Life
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

export default function CreatePage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex flex-center" style={{ background: 'var(--win95-bg)' }}>
          <div className="win95-window" style={{ padding: '24px' }}>
            <span className="win95-text win95-loading">Loading</span>
          </div>
        </main>
      }
    >
      <CreatePageContent />
    </Suspense>
  );
}

// ============================================================================
// PROMPT BUILDING FUNCTIONS
// ============================================================================

function buildScenarioPrompt(difficulty: Difficulty, persona: PersonaTemplate): string {
  const safetyPreamble = buildSafetyPreamble(difficulty);
  const tone = getScenarioTone(difficulty);
  const personaHint = getPersonaPromptHint(persona);

  // Get diverse name suggestions for the player character
  const suggestedNames = getPlayerNameSuggestions(8);

  return `${safetyPreamble}

Generate a ${tone} life scenario for this character type:
${personaHint}

PLAYER NAME: Pick a first name from these suggestions: ${suggestedNames.join(', ')}

You MUST return valid JSON with these EXACT fields:

{
  "playerName": "First name only (use a diverse name!)",
  "gender": "male or female",
  "profession": "Specific job title",
  "workplace": "Specific workplace name",
  "familyStructure": {
    "maritalStatus": "single|married|divorced|widowed",
    "hasChildren": true or false,
    "children": [{"name": "Name", "age": 18, "gender": "male|female"}],
    "extendedFamily": ["Relation: brief description"]
  },
  "livingSituation": "Where they live",
  "briefBackground": [
    "First bullet about their past (15-25 words) - be SPECIFIC",
    "Second bullet about their history (15-25 words) - be SPECIFIC"
  ],
  "currentStory": [
    "First bullet about current situation (15-25 words) - be SPECIFIC",
    "Second bullet about imminent conflict (15-25 words) - be SPECIFIC"
  ]
}

REQUIREMENTS:
- Each bullet MUST be 15-25 words
- Be SPECIFIC - no vague phrases like "dark past" or "mysterious"
- Match the tone: ${tone}
- DO NOT mention specific NPC names - use generic references like "a coworker", "their spouse"
- Focus on the PLAYER'S situation, secrets, and challenges

IMPORTANT: Output ONLY the JSON object. No explanation, no markdown code blocks. Just raw JSON.`;
}

function buildNPCsPrompt(
  scenario: any,
  difficulty: Difficulty,
  persona: PersonaTemplate,
  count: number
): string {
  const safetyPreamble = buildSafetyPreamble(difficulty);
  const npcBehavior = getNPCBehaviorGuidelines(difficulty);
  const rating = DIFFICULTY_TO_RATING[difficulty];
  const archetypes = selectRandomNPCArchetypes(rating, count);

  const archetypeHints = archetypes.map((arch) =>
    getNPCPromptHint(arch)
  ).join('\n');

  // Get diverse name suggestions to avoid repetitive Western names
  const nameSuggestions = getNPCNameSuggestions(count, scenario.playerName);

  // Get available emotional states for this difficulty's content rating
  const availableStates = getEmotionalStatesForRating(rating);
  const emotionExamples = availableStates.slice(0, 30).map(s => s.id).join(', ');

  // Build emotion guidance based on difficulty
  // NPCs can have MULTIPLE emotions (1-3) for complex, layered personalities
  let emotionGuidance = '';
  if (difficulty === 'realistic') {
    emotionGuidance = `EMOTIONAL STATE: Choose 1-2 nuanced emotions like: worried, hopeful, frustrated, grateful, nervous, determined, nostalgic, content, overwhelmed, embarrassed, lonely, amused
Can be single ("worried") or multiple (["worried", "hopeful"]) for complex moods.`;
  } else if (difficulty === 'dramatic') {
    emotionGuidance = `EMOTIONAL STATE: Choose 1-3 intense emotions like: jealous, betrayed, obsessed, resentful, vengeful, manipulative, paranoid, infatuated, heartbroken, threatening, desperate, guilty, calculating, hostile, flirty, devoted
RECOMMENDED: Use arrays for dramatic characters (["jealous", "desperate"] or ["flirty", "manipulative"])`;
  } else if (difficulty === 'crazy') {
    emotionGuidance = `EMOTIONAL STATE (18+ UNFILTERED): Choose 1-3 explicit, raw emotions like: horny, lustful, aroused, submissive, dominant, obsessed, sadistic, masochistic, guilt-horny, cheating, addicted, predatory, cock-hungry, pussy-hungry, breeding, insatiable, vengeful, murderous, psychotic, cuckolded, voyeuristic

STRONGLY RECOMMENDED: Use emotion arrays for crazy mode! Examples:
- ["horny", "guilty"] for conflicted lust
- ["dominant", "sadistic"] for intense power dynamics
- ["lustful", "predatory"] for aggressive sexuality
Be EXPLICIT and RAW - this is adult content. Don't hold back.`;
  }

  return `${safetyPreamble}

${npcBehavior}

Player: ${scenario.playerName} (${persona.type})
Profession: ${scenario.profession}
Background: ${scenario.briefBackground?.join(' ') || ''}

Create exactly ${count} NPCs: 2 "core" (closest relationships), ${count - 2} "secondary" (important but less central).

${nameSuggestions}

Use these archetypes as inspiration:
${archetypeHints}

${emotionGuidance}

Available emotion values: ${emotionExamples}

Output a JSON array with EXACTLY this format (emotion can be string OR array):
[
  {"name":"Priya","role":"Spouse","tier":"core","personality":"supportive but worried","emotion":["worried","loving"],"relationship":"devoted","bullets":["First specific bullet about them","Second bullet with their secret or hidden motivation"]},
  {"name":"Kwame","role":"Boss","tier":"core","personality":"demanding but fair","emotion":"frustrated","relationship":"professional","bullets":["First specific bullet","Second bullet"]}
]

BULLET REQUIREMENTS:
- First bullet: WHO they are (job, background, relationship to player)
- Second bullet: Their SECRET or hidden motivation (be specific!)
- 15-25 words each
- NO vague phrases like "mysterious" or "hiding something"

IMPORTANT: Output ONLY the JSON array. No explanation, no markdown. Just raw JSON starting with [ and ending with ].`;
}
