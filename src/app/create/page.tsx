'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense, useRef } from 'react';
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
  const carouselRef = useRef<HTMLDivElement>(null);

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

  // Randomly assigned persona
  const [assignedPersona, setAssignedPersona] = useState<PersonaTemplate | null>(null);

  const loadingSteps = [
    { label: 'Generating scenario', icon: '✨' },
    { label: 'Creating characters', icon: '👥' },
    { label: 'Building relationships', icon: '💫' },
    { label: 'Finalizing world', icon: '🌟' },
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

  // Auto-scroll carousel to selected character
  useEffect(() => {
    if (carouselRef.current && selectedCharacterIndex !== null) {
      const itemWidth = 140; // avatar width + gap
      const scrollPos = selectedCharacterIndex * itemWidth - carouselRef.current.offsetWidth / 2 + itemWidth / 2;
      carouselRef.current.scrollTo({ left: scrollPos, behavior: 'smooth' });
    }
  }, [selectedCharacterIndex]);

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
    setSelectedCharacterIndex(charIndex);
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
        tier: string;
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

      const narrativeState = initializeNarrativeForNewGame(newIdentity);
      newIdentity.narrativeState = narrativeState;
      const storySeeds = generateStorySeeds(newIdentity, 8);
      newIdentity.storySeeds = storySeeds;

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

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6">
      {/* NSFW Warning Modal */}
      {showNSFWWarning && (
        <div className="dialog-overlay">
          <div className="dialog" style={{ maxWidth: '440px' }}>
            <div className="flex items-center gap-4 mb-6">
              <div
                className="text-4xl w-16 h-16 flex flex-center rounded-xl"
                style={{ background: 'var(--color-danger-bg)' }}
              >
                ⚠️
              </div>
              <div>
                <h2 className="text-h2 mb-1">Content Warning</h2>
                <p className="text-small">Crazy mode contains mature content</p>
              </div>
            </div>

            <div className="card-flat p-4 mb-6">
              <p className="text-body mb-3">This mode includes:</p>
              <ul className="space-y-2">
                {['Explicit sexual content', 'Strong language', 'Dark themes', 'Graphic violence references'].map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-small">
                    <span style={{ color: 'var(--color-danger)' }}>•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <p className="text-body mb-6" style={{ color: 'var(--color-danger)', fontWeight: 'bold' }}>
              You must be 18 years or older to continue.
            </p>

            <div className="flex gap-3">
              <button onClick={handleNSFWAccept} className="btn btn-danger flex-1">
                I am 18+ - Continue
              </button>
              <button onClick={handleNSFWDecline} className="btn btn-secondary flex-1">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Card */}
      <div className="game-frame w-full" style={{ maxWidth: '700px' }}>
        <div className="game-frame-inner">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-h1 mb-1">
                {step === 'difficulty' && 'Choose Your Experience'}
                {step === 'character' && 'Choose Your Avatar'}
                {step === 'loading' && 'Creating World'}
                {step === 'complete' && 'Ready!'}
              </h1>
              <p className="text-small">
                {step === 'difficulty' && 'This determines the tone of your story'}
                {step === 'character' && 'Pick a character to represent you'}
                {step === 'loading' && loadingMessage}
                {step === 'complete' && 'Your world has been created'}
              </p>
            </div>
            {step !== 'loading' && (
              <button
                onClick={() => {
                  if (step === 'character') {
                    setStep('difficulty');
                    setDifficulty(null);
                    setSelectedCharacterIndex(null);
                    setAssignedPersona(null);
                  } else if (step === 'difficulty' || step === 'complete') {
                    router.push('/play');
                  }
                }}
                className="btn btn-ghost btn-sm"
              >
                {step === 'character' ? '← Back' : '✕'}
              </button>
            )}
          </div>

          {/* Step 1: Difficulty Selection */}
          {step === 'difficulty' && (
            <div className="animate-fade-slide-up">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                {(['realistic', 'dramatic', 'crazy'] as Difficulty[]).map((diff, index) => {
                  const info = DIFFICULTY_INFO[diff];
                  const styles = DIFFICULTY_STYLES[diff];
                  return (
                    <button
                      key={diff}
                      onClick={() => handleDifficultyClick(diff)}
                      className="difficulty-card animate-fade-slide-up"
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      <div className="difficulty-icon">{styles.icon}</div>
                      <div className="difficulty-title">{info.label}</div>
                      <div className="difficulty-desc">{info.description}</div>
                      {info.isNSFW && (
                        <span className="badge badge-danger mt-3">18+</span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="text-center">
                <button onClick={() => router.push('/play')} className="btn btn-ghost">
                  ← Back to Menu
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Character Selection (Horizontal Carousel) */}
          {step === 'character' && (
            <div className="animate-fade-slide-up">
              {/* Horizontal Character Carousel */}
              <div className="mb-8">
                <div
                  ref={carouselRef}
                  className="character-carousel px-8"
                  style={{ paddingTop: '32px', paddingBottom: '32px' }}
                >
                  {CHARACTER_SPRITES.map((char, index) => {
                    const isSelected = selectedCharacterIndex === index;
                    return (
                      <div
                        key={index}
                        className={`character-carousel-item ${isSelected ? 'selected' : ''}`}
                        onClick={() => handleCharacterSelect(index)}
                        style={{ cursor: 'pointer' }}
                      >
                        <div
                          className={`avatar avatar-xl ${isSelected ? 'avatar-selected animate-glow' : ''}`}
                          style={{
                            width: '120px',
                            height: '120px',
                            background: isSelected
                              ? 'linear-gradient(135deg, rgba(166, 130, 255, 0.2) 0%, rgba(88, 135, 255, 0.15) 100%)'
                              : 'linear-gradient(135deg, var(--color-surface-elevated) 0%, var(--color-surface) 100%)',
                          }}
                        >
                          <img
                            src={char.spriteUrl}
                            alt={`Character ${index + 1}`}
                            className={`sprite ${isSelected ? 'sprite-idle' : ''}`}
                            style={{ width: '80px', height: '80px' }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Selection indicator */}
                <div className="text-center">
                  <p className="text-small">
                    {selectedCharacterIndex !== null
                      ? `Character ${selectedCharacterIndex + 1} selected`
                      : 'Scroll to browse • Click to select'}
                  </p>
                </div>
              </div>

              {/* Story Type Preview */}
              {selectedCharacterIndex !== null && assignedPersona && (
                <div className="card-flat p-5 mb-6 animate-scale-in">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-caption mb-1">Your Story Type</p>
                      <h3 className="text-h3" style={{ color: 'var(--color-primary)' }}>
                        {assignedPersona.type}
                      </h3>
                    </div>
                    <button
                      onClick={() => {
                        if (difficulty) {
                          const rating = DIFFICULTY_TO_RATING[difficulty];
                          const newPersona = selectRandomPersona(rating);
                          setAssignedPersona(newPersona);
                        }
                      }}
                      className="btn btn-ghost btn-sm"
                    >
                      🎲 Reroll
                    </button>
                  </div>
                  <p className="text-small mb-2">
                    Traits: {assignedPersona.traits.join(', ')}
                  </p>
                  <p className="text-body" style={{ color: 'var(--color-text-secondary)' }}>
                    {assignedPersona.backstoryHints[Math.floor(Math.random() * assignedPersona.backstoryHints.length)]}
                  </p>
                </div>
              )}

              {/* Confirm Button */}
              <button
                onClick={handleCharacterConfirm}
                disabled={selectedCharacterIndex === null || !assignedPersona}
                className="btn btn-primary btn-lg w-full"
              >
                Start Your Life →
              </button>
            </div>
          )}

          {/* Loading */}
          {step === 'loading' && (
            <div className="max-w-md mx-auto text-center animate-fade-in">
              {/* Animated Character */}
              <div className="mb-8">
                {selectedCharacterIndex !== null && (
                  <div
                    className="avatar avatar-xl sprite-idle mx-auto"
                    style={{
                      width: '120px',
                      height: '120px',
                      background: 'linear-gradient(135deg, rgba(166, 130, 255, 0.15) 0%, rgba(88, 135, 255, 0.1) 100%)',
                    }}
                  >
                    <img
                      src={CHARACTER_SPRITES[selectedCharacterIndex].spriteUrl}
                      alt="Your character"
                      className="sprite"
                      style={{ width: '80px', height: '80px' }}
                    />
                  </div>
                )}
              </div>

              {/* Progress Bar */}
              <div className="progress mb-6" style={{ height: '8px' }}>
                <div
                  className="progress-fill"
                  style={{ width: `${((loadingStep + 1) / loadingSteps.length) * 100}%` }}
                />
              </div>

              {/* Progress Steps */}
              <div className="space-y-3 mb-6">
                {loadingSteps.map((s, index) => (
                  <div
                    key={index}
                    className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                      index === loadingStep ? 'card-flat' : ''
                    }`}
                    style={{
                      opacity: index <= loadingStep ? 1 : 0.4,
                    }}
                  >
                    <span className="text-xl">
                      {index < loadingStep ? '✓' : s.icon}
                    </span>
                    <span
                      className={`text-body ${index === loadingStep ? 'font-bold' : ''}`}
                      style={{
                        color: index === loadingStep ? 'var(--color-primary)' : undefined,
                      }}
                    >
                      {s.label}
                    </span>
                    {index === loadingStep && (
                      <div className="loading-spinner ml-auto" style={{ width: '16px', height: '16px' }} />
                    )}
                  </div>
                ))}
              </div>

              <p className="text-small">
                Generating {INITIAL_NPC_COUNT} unique characters...
              </p>
            </div>
          )}

          {/* Complete */}
          {step === 'complete' && identity && (
            <div className="animate-fade-slide-up">
              {/* Carousel Navigation */}
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => setCarouselIndex(Math.max(0, carouselIndex - 1))}
                  disabled={carouselIndex === 0}
                  className="btn btn-ghost btn-sm"
                >
                  ← Prev
                </button>
                <span className="badge badge-primary">
                  {carouselIndex === 0 ? 'You' : `Character ${carouselIndex}/${identity.npcs.length}`}
                </span>
                <button
                  onClick={() => setCarouselIndex(Math.min(identity.npcs.length, carouselIndex + 1))}
                  disabled={carouselIndex === identity.npcs.length}
                  className="btn btn-ghost btn-sm"
                >
                  Next →
                </button>
              </div>

              {/* Player Card */}
              {carouselIndex === 0 && (
                <div className="card mb-6">
                  <div className="flex gap-4 mb-4 pb-4" style={{ borderBottom: '1px solid var(--color-surface)' }}>
                    <div className="avatar avatar-lg sprite-idle">
                      {selectedCharacterIndex !== null && CHARACTER_SPRITES[selectedCharacterIndex] && (
                        <img
                          src={CHARACTER_SPRITES[selectedCharacterIndex].spriteUrl}
                          alt="You"
                          className="sprite"
                          style={{ width: '64px', height: '64px' }}
                        />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-caption">Your Name</p>
                      <h2 className="text-h2" style={{ color: 'var(--color-primary)' }}>
                        {identity.name}
                      </h2>
                      <p className="text-body">{identity.scenario.profession}</p>
                      {identity.generatedPersona && (
                        <span className="badge badge-primary mt-2">{identity.generatedPersona.type}</span>
                      )}
                    </div>
                  </div>

                  <div className="mb-4">
                    <h3 className="text-caption mb-2">Background</h3>
                    <ul className="space-y-2">
                      {identity.scenario.briefBackground?.map((bullet, idx) => (
                        <li key={idx} className="flex gap-2 text-body">
                          <span style={{ color: 'var(--color-primary)' }}>•</span>
                          {bullet}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-caption mb-2">Current Situation</h3>
                    <ul className="space-y-2">
                      {identity.scenario.currentStory?.map((bullet, idx) => (
                        <li key={idx} className="flex gap-2 text-body">
                          <span style={{ color: 'var(--color-primary)' }}>•</span>
                          {bullet}
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
                  <div className="card mb-6">
                    <div className="flex gap-4 mb-4 pb-4" style={{ borderBottom: '1px solid var(--color-surface)' }}>
                      <div className="avatar avatar-lg">
                        {npc.pixelArtUrl && (
                          <img
                            src={npc.pixelArtUrl}
                            alt={npc.name}
                            className="sprite"
                            style={{ width: '64px', height: '64px' }}
                          />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-caption">{npc.role}</p>
                        <h2 className="text-h2" style={{ color: 'var(--color-primary)' }}>
                          {npc.name}
                        </h2>
                        <div className="flex gap-2 mt-2">
                          <span className={`badge ${npc.tier === 'core' ? 'badge-primary' : 'badge-secondary'}`}>
                            {npc.tier === 'core' ? '★ Core' : '○ Secondary'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mb-4">
                      <h3 className="text-caption mb-2">About {npc.name}</h3>
                      <ul className="space-y-2">
                        {npc.bullets?.map((bullet, idx) => (
                          <li key={idx} className="flex gap-2 text-body">
                            <span style={{ color: 'var(--color-primary)' }}>•</span>
                            {bullet}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="card-flat p-3">
                        <p className="text-caption">Relationship</p>
                        <p className="text-body">{npc.relationshipStatus}</p>
                      </div>
                      <div className="card-flat p-3">
                        <p className="text-caption">Mood</p>
                        <p className="text-body" style={{ textTransform: 'capitalize' }}>
                          {npc.currentEmotionalState}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Page Dots */}
              <div className="flex justify-center gap-2 mb-6">
                {[0, ...identity.npcs.map((_, i) => i + 1)].map((idx) => (
                  <button
                    key={idx}
                    onClick={() => setCarouselIndex(idx)}
                    className="transition-all"
                    style={{
                      width: idx === carouselIndex ? '24px' : '8px',
                      height: '8px',
                      borderRadius: '4px',
                      background: idx === carouselIndex ? 'var(--color-primary)' : 'var(--color-surface)',
                    }}
                    aria-label={idx === 0 ? 'You' : `NPC ${idx}`}
                  />
                ))}
              </div>

              <button onClick={handleEnterGame} className="btn btn-primary btn-lg w-full">
                Enter Your Life →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Step indicator */}
      <div className="mt-6 flex items-center gap-3">
        <div
          className="h-2 rounded-full transition-all"
          style={{
            width: step === 'difficulty' || step === 'character' ? '48px' : '24px',
            background: 'var(--color-primary)',
          }}
        />
        <div
          className="h-2 rounded-full transition-all"
          style={{
            width: step === 'loading' || step === 'complete' ? '48px' : '24px',
            background: step === 'loading' || step === 'complete' ? 'var(--color-primary)' : 'var(--color-surface)',
          }}
        />
      </div>
    </main>
  );
}

export default function CreatePage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex flex-center">
          <div className="flex flex-center gap-sm">
            <div className="loading-spinner" />
            <span className="text-body text-muted">Loading</span>
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
