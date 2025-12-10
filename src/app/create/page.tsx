'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { Gender, Difficulty, Identity, DEFAULT_METERS, INITIAL_NPC_COUNT } from '@/lib/types';
import { saveToIndexedDB } from '@/lib/indexeddb';
import { useChat } from '@/lib/reverbia';
import { MODEL_CONFIG } from '@/lib/models';
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
  selectRandomNPCArchetypes,
  getPersonaPromptHint,
  getNPCPromptHint,
  PersonaTemplate,
} from '@/lib/persona-pools';
import {
  extractContentFromResponse,
  parseJSONSafely,
  parseJSONArraySafely,
} from '@/lib/llm-utils';
import { generateStorySeeds, initializeNarrativeForNewGame } from '@/lib/narrative';

type CreationStep = 'difficulty' | 'character' | 'loading' | 'complete';

// Character sprite data - purely visual, no gameplay implications
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

// Helper to get random NPC sprite URLs (excluding player's selected character)
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

  // Step flow: difficulty -> character -> loading -> complete
  const [step, setStep] = useState<CreationStep>('difficulty');
  const [slotIndex, setSlotIndex] = useState<number>(0);
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [selectedCharacterIndex, setSelectedCharacterIndex] = useState<number | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('Generating your life...');
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [loadingStep, setLoadingStep] = useState(0);
  const [carouselIndex, setCarouselIndex] = useState(0);

  // NSFW warning modal
  const [showNSFWWarning, setShowNSFWWarning] = useState(false);
  const [pendingDifficulty, setPendingDifficulty] = useState<Difficulty | null>(null);

  // Randomly assigned persona (generated after difficulty + character selection)
  const [assignedPersona, setAssignedPersona] = useState<PersonaTemplate | null>(null);

  // 4x3 grid pagination (showing more characters now that labels are removed)
  const CHARS_PER_PAGE = 12;
  const totalPages = Math.ceil(CHARACTER_SPRITES.length / CHARS_PER_PAGE);
  const currentPageChars = CHARACTER_SPRITES.slice(
    pageIndex * CHARS_PER_PAGE,
    (pageIndex + 1) * CHARS_PER_PAGE
  );

  const loadingSteps = [
    { label: 'GENERATING SCENARIO', icon: '>' },
    { label: 'CREATING CHARACTERS', icon: '>' },
    { label: 'BUILDING RELATIONS', icon: '>' },
    { label: 'FINALIZING WORLD', icon: '>' },
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

  const { sendMessage, isLoading } = useChat({
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

  // Handle difficulty selection with NSFW check
  const handleDifficultyClick = (selectedDifficulty: Difficulty) => {
    if (requiresNSFWAcknowledgment(selectedDifficulty) && !hasNSFWAcknowledgment()) {
      setPendingDifficulty(selectedDifficulty);
      setShowNSFWWarning(true);
    } else {
      setDifficulty(selectedDifficulty);
      setStep('character');
    }
  };

  const handleNSFWAccept = () => {
    setNSFWAcknowledgment(true);
    setShowNSFWWarning(false);
    if (pendingDifficulty) {
      setDifficulty(pendingDifficulty);
      setPendingDifficulty(null);
      setStep('character');
    }
  };

  const handleNSFWDecline = () => {
    setShowNSFWWarning(false);
    setPendingDifficulty(null);
  };

  const handleCharacterSelect = (charIndex: number) => {
    const globalIndex = pageIndex * CHARS_PER_PAGE + charIndex;
    setSelectedCharacterIndex(globalIndex);

    // Randomly assign a persona based on difficulty
    if (difficulty) {
      const rating = DIFFICULTY_TO_RATING[difficulty];
      const persona = selectRandomPersona(rating);
      setAssignedPersona(persona);
    }
  };

  const handleCharacterConfirm = async () => {
    if (selectedCharacterIndex !== null && difficulty && assignedPersona) {
      setStep('loading');
      await generateScenario(difficulty, assignedPersona);
    }
  };

  const handlePagePrev = () => {
    setPageIndex((prev) => Math.max(0, prev - 1));
  };

  const handlePageNext = () => {
    setPageIndex((prev) => Math.min(totalPages - 1, prev + 1));
  };

  const generateScenario = async (selectedDifficulty: Difficulty, persona: PersonaTemplate) => {
    setLoadingStep(0);

    try {
      // STEP 1: Generate base scenario
      setLoadingMessage('Creating your scenario...');
      console.log('Step 1: Generating base scenario...');

      const scenarioPrompt = buildScenarioPrompt(selectedDifficulty, persona);
      const scenarioResponse = await sendMessage({
        messages: [{ role: 'user', content: scenarioPrompt }],
        model: MODEL_CONFIG.scenarioGeneration,
      });

      const scenarioContent = extractContentFromResponse(scenarioResponse);
      console.log('Scenario response:', scenarioContent);

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
      console.log('Parsed scenario data:', JSON.stringify(scenarioData, null, 2));

      if (!scenarioData || !scenarioData.playerName) {
        throw new Error('Failed to parse scenario');
      }

      setLoadingStep(1);

      // STEP 2: Generate NPCs
      setLoadingMessage('Designing characters...');
      console.log('Step 2: Generating NPCs...');

      const npcsPrompt = buildNPCsPrompt(scenarioData, selectedDifficulty, persona, 5);
      const npcsResponse = await sendMessage({
        messages: [{ role: 'user', content: npcsPrompt }],
        model: MODEL_CONFIG.scenarioGeneration,
      });

      const npcsContent = extractContentFromResponse(npcsResponse);
      console.log('NPCs response:', npcsContent);

      const allNpcs = parseJSONArraySafely<{
        name: string;
        role: string;
        tier: string;
        personality: string;
        emotion?: string;
        currentEmotionalState?: string;
        relationship?: string;
        relationshipStatus?: string;
        backstory?: string;
        bullets?: string[];
      }>(npcsContent);
      console.log(`Parsed ${allNpcs.length} NPCs`);

      setLoadingStep(2);
      setLoadingMessage('Building relationships...');

      await new Promise(resolve => setTimeout(resolve, 500));

      setLoadingStep(3);
      setLoadingMessage('Finalizing your world...');

      // Get random sprite URLs for NPCs
      const npcSpriteUrls = getRandomNPCSprites(allNpcs.length, selectedCharacterIndex);

      // Determine gender from scenario (LLM will specify)
      const derivedGender: Gender = scenarioData.gender === 'female' ? 'female' : 'male';

      // Create the identity
      const newIdentity: Identity = {
        id: crypto.randomUUID(),
        slotIndex,
        name: scenarioData.playerName,
        gender: derivedGender,
        persona: persona.id, // Use the persona template ID
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
        meters: DEFAULT_METERS,
        npcs: allNpcs.map((npc: any, index: number) => ({
          id: crypto.randomUUID(),
          name: npc.name || 'Unknown',
          role: npc.role || 'Acquaintance',
          tier: npc.tier || 'tertiary',
          origin: 'guaranteed' as const,
          spawnedDay: 1,
          personality: npc.personality || 'Reserved',
          backstory: npc.backstory || 'Unknown past',
          bullets: npc.bullets || ['A mysterious figure in your life.', 'Hiding something from you.'],
          currentEmotionalState: npc.emotion || npc.currentEmotionalState || 'neutral',
          relationshipStatus: npc.relationship || npc.relationshipStatus || 'Neutral',
          offScreenMemories: [],
          isActive: true,
          pixelArtUrl: npcSpriteUrls[index] || '',
          emotionSprites: {},
        })),
        createdAt: new Date(),
        lastPlayedAt: new Date(),
      };

      // Initialize the full Narrative Engine state
      // This creates story arcs, world facts, relationships, and more
      const narrativeState = initializeNarrativeForNewGame(newIdentity);
      newIdentity.narrativeState = narrativeState;

      // Also generate legacy story seeds for backwards compatibility
      const storySeeds = generateStorySeeds(newIdentity, 8);
      newIdentity.storySeeds = storySeeds;

      console.log(`[Narrative] Initialized narrative engine with ${narrativeState.activeArcs.length} story arcs`);
      console.log(`[Narrative] World facts: ${narrativeState.worldFacts.length}`);
      console.log(`[Narrative] Story themes: ${narrativeState.currentThemes.join(', ')}`);

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
      <main className="min-h-screen flex items-center justify-center">
        <div className="win95-window p-8">
          <span className="win95-text win95-loading">Loading</span>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4">
      {/* NSFW Warning Modal */}
      {showNSFWWarning && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="win95-window w-full max-w-md">
            <div className="win95-titlebar">
              <span className="win95-titlebar-text">Content Warning</span>
              <div className="win95-titlebar-buttons">
                <button className="win95-titlebar-btn" onClick={handleNSFWDecline}>x</button>
              </div>
            </div>
            <div className="win95-content p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="text-4xl">&#9888;</div>
                <div>
                  <h2 className="win95-text font-bold text-lg mb-1">Adult Content Warning</h2>
                  <p className="win95-text text-sm" style={{ color: 'var(--win95-text-dim)' }}>
                    &quot;Crazy&quot; mode contains mature content
                  </p>
                </div>
              </div>

              <div className="win95-panel-inset p-3 mb-4" style={{ background: 'white' }}>
                <p className="win95-text text-sm mb-2">This mode includes:</p>
                <ul className="win95-text text-sm space-y-1" style={{ color: 'var(--win95-text-dim)' }}>
                  <li>&#8226; Explicit sexual content</li>
                  <li>&#8226; Strong language and profanity</li>
                  <li>&#8226; Dark themes and moral ambiguity</li>
                  <li>&#8226; Graphic violence references</li>
                </ul>
              </div>

              <p className="win95-text text-sm mb-4" style={{ color: '#8b0000', fontWeight: 'bold' }}>
                You must be 18 years or older to continue.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={handleNSFWAccept}
                  className="win95-btn flex-1 py-2"
                  style={{ background: '#8b0000', color: 'white' }}
                >
                  I am 18+ - Continue
                </button>
                <button
                  onClick={handleNSFWDecline}
                  className="win95-btn flex-1 py-2"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Window */}
      <div className="win95-window w-full max-w-2xl">
        {/* Title Bar */}
        <div className="win95-titlebar">
          <span className="win95-titlebar-text">
            {step === 'difficulty' && 'Sprouts - Select Mode'}
            {step === 'character' && 'Sprouts - Choose Avatar'}
            {step === 'loading' && 'Sprouts - Creating World...'}
            {step === 'complete' && 'Sprouts - Ready!'}
          </span>
          <div className="win95-titlebar-buttons">
            <button className="win95-titlebar-btn">_</button>
            <button className="win95-titlebar-btn">&#9633;</button>
            <button
              className="win95-titlebar-btn"
              onClick={() => router.push('/play')}
              disabled={step === 'loading'}
            >
              x
            </button>
          </div>
        </div>

        {/* Toolbar with Back Button */}
        {step !== 'loading' && step !== 'complete' && step !== 'difficulty' && (
          <div className="win95-toolbar">
            <button
              onClick={() => {
                if (step === 'character') {
                  setStep('difficulty');
                  setDifficulty(null);
                  setSelectedCharacterIndex(null);
                  setAssignedPersona(null);
                }
              }}
              className="win95-btn win95-btn-sm"
            >
              &#8592; Back
            </button>
          </div>
        )}

        {/* Content Area */}
        <div className="win95-content" style={{ minHeight: '500px' }}>

          {/* Step 1: Difficulty Selection (FIRST) */}
          {step === 'difficulty' && (
            <div className="text-center">
              <div className="win95-groupbox mb-6">
                <span className="win95-groupbox-label">Choose Your Experience</span>
                <p className="win95-text" style={{ color: 'var(--win95-text-dim)' }}>
                  This determines the tone and content of your story
                </p>
              </div>

              <div className="space-y-3">
                {(['realistic', 'dramatic', 'crazy'] as Difficulty[]).map((diff) => {
                  const info = DIFFICULTY_INFO[diff];
                  return (
                    <button
                      key={diff}
                      onClick={() => handleDifficultyClick(diff)}
                      className="win95-panel-inset w-full text-left p-4 hover:bg-[var(--win95-lightest)] transition-colors"
                      style={{ background: 'white' }}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <span
                          className="win95-text px-2 py-1"
                          style={{
                            background: info.tagColor,
                            color: 'white',
                            fontSize: '12px',
                          }}
                        >
                          {info.tag}
                        </span>
                        <span className="win95-text" style={{ fontWeight: 'bold', fontSize: '16px' }}>
                          {info.label}
                        </span>
                        {info.isNSFW && (
                          <span
                            className="win95-text px-2 py-1"
                            style={{
                              background: '#333',
                              color: 'white',
                              fontSize: '10px',
                            }}
                          >
                            18+
                          </span>
                        )}
                      </div>
                      <p className="win95-text" style={{ fontSize: '13px', color: 'var(--win95-text-dim)' }}>
                        {info.description}
                      </p>
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => router.push('/play')}
                className="win95-btn mt-6"
              >
                &#8592; Back to Menu
              </button>
            </div>
          )}

          {/* Step 2: Character Selection (sprites only, no labels) */}
          {step === 'character' && (
            <div className="text-center">
              <div className="win95-groupbox mb-4">
                <span className="win95-groupbox-label">Choose Your Avatar</span>
                <p className="win95-text" style={{ color: 'var(--win95-text-dim)' }}>
                  Pick a character - your story will be randomly generated
                </p>
              </div>

              {/* Character Grid with Navigation */}
              <div className="flex items-center gap-2 mb-4">
                {/* Left Arrow */}
                <button
                  onClick={handlePagePrev}
                  disabled={pageIndex === 0}
                  className="win95-btn px-2 py-4 disabled:opacity-30"
                  aria-label="Previous characters"
                >
                  &#9664;
                </button>

                {/* 4x3 Grid - Just sprites, no labels */}
                <div className="grid grid-cols-4 gap-2 flex-1">
                  {currentPageChars.map((char, idx) => {
                    const globalIdx = pageIndex * CHARS_PER_PAGE + idx;
                    const isSelected = selectedCharacterIndex === globalIdx;
                    return (
                      <button
                        key={globalIdx}
                        onClick={() => handleCharacterSelect(idx)}
                        className="win95-panel-inset p-2 transition-all aspect-square"
                        style={{
                          background: isSelected ? 'var(--win95-title-active)' : 'white',
                          outline: isSelected ? '2px dotted white' : 'none',
                          outlineOffset: '-4px',
                        }}
                      >
                        <div
                          className="w-full h-full flex items-center justify-center rounded"
                          style={{
                            background: 'linear-gradient(180deg, var(--win95-lightest) 0%, var(--win95-light) 100%)',
                            border: '1px solid var(--win95-border-dark)',
                          }}
                        >
                          <img
                            src={char.spriteUrl}
                            alt="Character"
                            className="w-12 h-12 object-contain"
                            style={{ imageRendering: 'pixelated' }}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Right Arrow */}
                <button
                  onClick={handlePageNext}
                  disabled={pageIndex === totalPages - 1}
                  className="win95-btn px-2 py-4 disabled:opacity-30"
                  aria-label="Next characters"
                >
                  &#9654;
                </button>
              </div>

              {/* Page Indicator */}
              <div className="flex justify-center gap-2 mb-4">
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setPageIndex(i)}
                    className="w-3 h-3 transition-all"
                    style={{
                      background: i === pageIndex ? 'var(--win95-title-active)' : 'var(--win95-dark)',
                      border: '1px solid var(--win95-border-dark)',
                    }}
                    aria-label={`Page ${i + 1}`}
                  />
                ))}
              </div>

              {/* Show randomly assigned persona preview */}
              {selectedCharacterIndex !== null && assignedPersona && (
                <div className="win95-groupbox mb-4">
                  <span className="win95-groupbox-label">Your Story Type</span>
                  <div className="text-left">
                    <p className="win95-text font-bold" style={{ color: 'var(--win95-title-active)' }}>
                      {assignedPersona.type}
                    </p>
                    <p className="win95-text text-sm" style={{ color: 'var(--win95-text-dim)' }}>
                      Traits: {assignedPersona.traits.join(', ')}
                    </p>
                    <p className="win95-text text-sm mt-1">
                      {assignedPersona.backstoryHints[Math.floor(Math.random() * assignedPersona.backstoryHints.length)]}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      // Re-randomize persona
                      if (difficulty) {
                        const rating = DIFFICULTY_TO_RATING[difficulty];
                        const newPersona = selectRandomPersona(rating);
                        setAssignedPersona(newPersona);
                      }
                    }}
                    className="win95-btn win95-btn-sm mt-2"
                  >
                    &#8635; Randomize Story
                  </button>
                </div>
              )}

              <button
                onClick={handleCharacterConfirm}
                disabled={selectedCharacterIndex === null || !assignedPersona}
                className="win95-btn win95-btn-lg w-full"
                style={{
                  background: selectedCharacterIndex !== null ? 'var(--win95-title-active)' : undefined,
                  color: selectedCharacterIndex !== null ? 'white' : undefined,
                }}
              >
                Start Your Life &#8594;
              </button>
            </div>
          )}

          {/* Loading */}
          {step === 'loading' && (
            <div className="max-w-md mx-auto text-center">
              <div className="win95-groupbox mb-6">
                <span className="win95-groupbox-label">Please Wait</span>
                <div className="flex justify-center mb-4">
                  <div
                    className="w-16 h-16 flex items-center justify-center text-3xl"
                    style={{
                      background: 'linear-gradient(180deg, var(--win95-lightest) 0%, var(--win95-light) 100%)',
                      border: '2px solid var(--win95-border-dark)',
                      animation: 'pulse 1s infinite',
                    }}
                  >
                    &#127793;
                  </div>
                </div>
                <p className="win95-text" style={{ fontSize: '16px', fontWeight: 'bold' }}>
                  Creating Your Life...
                </p>
              </div>

              {/* Progress Bar */}
              <div className="win95-panel-inset p-1 mb-4">
                <div
                  className="h-4 transition-all duration-500"
                  style={{
                    width: `${((loadingStep + 1) / loadingSteps.length) * 100}%`,
                    background: 'var(--win95-title-active)',
                  }}
                />
              </div>

              {/* Progress Steps */}
              <div className="win95-panel-inset p-3 mb-4" style={{ background: 'white' }}>
                {loadingSteps.map((s, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 py-2 text-left"
                    style={{
                      borderBottom: index < loadingSteps.length - 1 ? '1px solid var(--win95-mid)' : 'none',
                    }}
                  >
                    <span
                      className="w-5 h-5 flex items-center justify-center text-xs"
                      style={{
                        background: index < loadingStep
                          ? 'var(--win95-accent-light)'
                          : index === loadingStep
                            ? 'var(--win95-title-active)'
                            : 'var(--win95-mid)',
                        color: index <= loadingStep ? 'white' : 'var(--win95-text-dim)',
                        border: '1px solid var(--win95-border-dark)',
                      }}
                    >
                      {index < loadingStep ? '&#10003;' : index === loadingStep ? '...' : ''}
                    </span>
                    <span
                      className="win95-text"
                      style={{
                        fontSize: '13px',
                        color: index === loadingStep ? 'var(--win95-text)' : 'var(--win95-text-dim)',
                        fontWeight: index === loadingStep ? 'bold' : 'normal',
                      }}
                    >
                      {s.label}
                    </span>
                  </div>
                ))}
              </div>

              <p className="win95-text" style={{ fontSize: '12px', color: 'var(--win95-text-dim)' }}>
                Generating {INITIAL_NPC_COUNT} unique characters...
              </p>
            </div>
          )}

          {/* Complete */}
          {step === 'complete' && identity && (
            <div className="text-center">
              <div className="win95-groupbox mb-4">
                <span className="win95-groupbox-label">Ready!</span>
                <p className="win95-text" style={{ color: 'var(--win95-accent)' }}>
                  Your world has been created
                </p>
              </div>

              {/* Carousel Navigation */}
              <div className="flex items-center justify-between mb-3">
                <button
                  onClick={() => setCarouselIndex(Math.max(0, carouselIndex - 1))}
                  disabled={carouselIndex === 0}
                  className="win95-btn px-4 py-2 disabled:opacity-30"
                >
                  &#9664; Prev
                </button>
                <span
                  className="win95-text px-3 py-1"
                  style={{
                    background: 'var(--win95-title-active)',
                    color: 'white',
                    fontSize: '12px',
                  }}
                >
                  {carouselIndex === 0 ? 'YOU' : `NPC ${carouselIndex}/${identity.npcs.length}`}
                </span>
                <button
                  onClick={() => setCarouselIndex(Math.min(identity.npcs.length, carouselIndex + 1))}
                  disabled={carouselIndex === identity.npcs.length}
                  className="win95-btn px-4 py-2 disabled:opacity-30"
                >
                  Next &#9654;
                </button>
              </div>

              {/* Player Card */}
              {carouselIndex === 0 && (
                <div className="win95-panel-inset text-left mb-4 p-4" style={{ background: 'white' }}>
                  <div className="flex gap-4 mb-4 pb-4" style={{ borderBottom: '2px solid var(--win95-mid)' }}>
                    <div
                      className="w-20 h-20 flex items-center justify-center flex-shrink-0"
                      style={{
                        background: 'linear-gradient(180deg, var(--win95-lightest) 0%, var(--win95-light) 100%)',
                        border: '2px solid var(--win95-border-dark)',
                      }}
                    >
                      {selectedCharacterIndex !== null && CHARACTER_SPRITES[selectedCharacterIndex] ? (
                        <img
                          src={CHARACTER_SPRITES[selectedCharacterIndex].spriteUrl}
                          alt="You"
                          className="w-16 h-16 object-contain"
                          style={{ imageRendering: 'pixelated' }}
                        />
                      ) : (
                        <span style={{ color: 'var(--win95-text-dim)' }}>?</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="win95-text" style={{ fontSize: '11px', color: 'var(--win95-text-dim)' }}>YOUR NAME:</p>
                      <h1 className="win95-text" style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--win95-title-active)' }}>
                        {identity.name}
                      </h1>
                      <p className="win95-text" style={{ fontSize: '13px' }}>{identity.scenario.profession}</p>
                      {identity.generatedPersona && (
                        <p className="win95-text" style={{ fontSize: '11px', color: 'var(--win95-accent)' }}>
                          {identity.generatedPersona.type}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mb-3">
                    <h3 className="win95-text" style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--win95-accent)', marginBottom: '4px' }}>
                      Background:
                    </h3>
                    <ul className="space-y-1">
                      {identity.scenario.briefBackground?.map((bullet, idx) => (
                        <li key={idx} className="flex gap-2">
                          <span style={{ color: 'var(--win95-accent)' }}>&#8226;</span>
                          <span className="win95-text" style={{ fontSize: '12px' }}>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h3 className="win95-text" style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--win95-accent)', marginBottom: '4px' }}>
                      Current Situation:
                    </h3>
                    <ul className="space-y-1">
                      {identity.scenario.currentStory?.map((bullet, idx) => (
                        <li key={idx} className="flex gap-2">
                          <span style={{ color: 'var(--win95-accent)' }}>&#8226;</span>
                          <span className="win95-text" style={{ fontSize: '12px' }}>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* NPC Cards */}
              {carouselIndex > 0 && identity.npcs[carouselIndex - 1] && (() => {
                const npc = identity.npcs[carouselIndex - 1];
                return (
                  <div className="win95-panel-inset text-left mb-4 p-4" style={{ background: 'white' }}>
                    <div className="flex gap-4 mb-4 pb-4" style={{ borderBottom: '2px solid var(--win95-mid)' }}>
                      <div
                        className="w-20 h-20 flex items-center justify-center flex-shrink-0"
                        style={{
                          background: 'linear-gradient(180deg, var(--win95-lightest) 0%, var(--win95-light) 100%)',
                          border: '2px solid var(--win95-border-dark)',
                        }}
                      >
                        {npc.pixelArtUrl ? (
                          <img
                            src={npc.pixelArtUrl}
                            alt={npc.name}
                            className="w-16 h-16 object-contain"
                            style={{ imageRendering: 'pixelated' }}
                          />
                        ) : (
                          <span style={{ color: 'var(--win95-text-dim)' }}>?</span>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="win95-text" style={{ fontSize: '11px', color: 'var(--win95-text-dim)' }}>
                          {npc.role.toUpperCase()}:
                        </p>
                        <h1 className="win95-text" style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--win95-title-active)' }}>
                          {npc.name}
                        </h1>
                        <div className="flex gap-3 mt-1">
                          <span
                            className="win95-text px-2"
                            style={{
                              fontSize: '11px',
                              background: npc.tier === 'core' ? 'var(--win95-accent)' : 'var(--win95-dark)',
                              color: 'white',
                            }}
                          >
                            {npc.tier === 'core' ? '&#9733; Core' : '&#9675; Secondary'}
                          </span>
                          <span className="win95-text" style={{ fontSize: '12px' }}>
                            {npc.personality}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mb-3">
                      <h3 className="win95-text" style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--win95-accent)', marginBottom: '4px' }}>
                        About {npc.name}:
                      </h3>
                      <ul className="space-y-1">
                        {npc.bullets?.map((bullet, idx) => (
                          <li key={idx} className="flex gap-2">
                            <span style={{ color: 'var(--win95-accent)' }}>&#8226;</span>
                            <span className="win95-text" style={{ fontSize: '12px' }}>{bullet}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="win95-panel-inset p-2">
                        <h4 className="win95-text" style={{ fontSize: '10px', color: 'var(--win95-text-dim)' }}>Relationship:</h4>
                        <p className="win95-text" style={{ fontSize: '12px' }}>{npc.relationshipStatus}</p>
                      </div>
                      <div className="win95-panel-inset p-2">
                        <h4 className="win95-text" style={{ fontSize: '10px', color: 'var(--win95-text-dim)' }}>Mood:</h4>
                        <p className="win95-text" style={{ fontSize: '12px', textTransform: 'capitalize' }}>{npc.currentEmotionalState}</p>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Page Dots */}
              <div className="flex justify-center gap-2 mb-4">
                {[0, ...identity.npcs.map((_, i) => i + 1)].map((idx) => (
                  <button
                    key={idx}
                    onClick={() => setCarouselIndex(idx)}
                    className="w-3 h-3 transition-all"
                    style={{
                      background: idx === carouselIndex ? 'var(--win95-title-active)' : 'var(--win95-dark)',
                      border: '1px solid var(--win95-border-dark)',
                      width: idx === carouselIndex ? '16px' : '12px',
                    }}
                    aria-label={idx === 0 ? 'You' : `NPC ${idx}`}
                  />
                ))}
              </div>

              <button
                onClick={handleEnterGame}
                className="win95-btn win95-btn-lg px-10"
                style={{
                  background: 'var(--win95-title-active)',
                  color: 'white',
                }}
              >
                Enter Your Life &#8594;
              </button>
            </div>
          )}
        </div>

        {/* Status Bar */}
        <div className="win95-statusbar">
          <div className="win95-statusbar-section">
            {step === 'difficulty' && 'Step 1 of 2: Choose Mode'}
            {step === 'character' && 'Step 2 of 2: Select Avatar'}
            {step === 'loading' && 'Creating your world...'}
            {step === 'complete' && 'Ready to begin!'}
          </div>
          <div className="win95-statusbar-section" style={{ flex: '0 0 auto', width: '100px' }}>
            Slot {slotIndex + 1}
          </div>
        </div>
      </div>
    </main>
  );
}

export default function CreatePage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center">
          <div className="win95-window p-8">
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
// PROMPT BUILDING FUNCTIONS - Now with content filtering
// ============================================================================

function buildScenarioPrompt(difficulty: Difficulty, persona: PersonaTemplate): string {
  const safetyPreamble = buildSafetyPreamble(difficulty);
  const tone = getScenarioTone(difficulty);
  const personaHint = getPersonaPromptHint(persona);

  return `${safetyPreamble}

Generate a ${tone} life scenario for this character type:
${personaHint}

You MUST return valid JSON with these EXACT fields:

{
  "playerName": "First name only",
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

  const archetypeHints = archetypes.map((arch, i) =>
    getNPCPromptHint(arch, i < 2 ? 'core' : 'secondary')
  ).join('\n');

  return `${safetyPreamble}

${npcBehavior}

Player: ${scenario.playerName} (${persona.type})
Profession: ${scenario.profession}
Background: ${scenario.briefBackground?.join(' ') || ''}

Create exactly ${count} NPCs: 2 "core" (closest relationships), ${count - 2} "secondary" (important but less central).

Use these archetypes as inspiration:
${archetypeHints}

Output a JSON array with EXACTLY this format:
[
  {"name":"Alex","role":"Spouse","tier":"core","personality":"supportive but worried","emotion":"concerned","relationship":"loving","bullets":["First specific bullet about them","Second bullet with their secret or hidden motivation"]},
  {"name":"Sam","role":"Boss","tier":"core","personality":"demanding but fair","emotion":"stressed","relationship":"professional","bullets":["First specific bullet","Second bullet"]}
]

BULLET REQUIREMENTS:
- First bullet: WHO they are (job, background, relationship to player)
- Second bullet: Their SECRET or hidden motivation (be specific!)
- 15-25 words each
- NO vague phrases like "mysterious" or "hiding something"

IMPORTANT: Output ONLY the JSON array. No explanation, no markdown. Just raw JSON starting with [ and ending with ].`;
}

