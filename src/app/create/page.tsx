'use client';

import { usePrivy, useIdentityToken } from '@privy-io/react-auth';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { Gender, Difficulty, Identity, DEFAULT_METERS, INITIAL_NPC_COUNT, Persona, PERSONA_OPTIONS } from '@/lib/types';
import { saveToIndexedDB } from '@/lib/indexeddb';
import { useChat } from '@/lib/reverbia';
import { MODEL_CONFIG } from '@/lib/models';

type CreationStep = 'persona' | 'difficulty' | 'loading' | 'complete';

function CreatePageContent() {
  const { authenticated, ready } = usePrivy();
  const { identityToken } = useIdentityToken();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [step, setStep] = useState<CreationStep>('persona');
  const [slotIndex, setSlotIndex] = useState<number>(0);
  const [persona, setPersona] = useState<Persona | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [loadingMessage, setLoadingMessage] = useState('Generating your life...');
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [loadingStep, setLoadingStep] = useState(0);

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

  const handlePersonaSelect = (selectedPersona: Persona) => {
    setPersona(selectedPersona);
    setStep('difficulty');
  };

  const handleDifficultySelect = async (selectedDifficulty: Difficulty) => {
    setDifficulty(selectedDifficulty);
    setStep('loading');

    // Generate scenario
    await generateScenario(persona!, selectedDifficulty);
  };

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
      || '';
  };

  const generateScenario = async (selectedPersona: Persona, difficulty: Difficulty) => {
    setLoadingStep(0);

    // Derive gender from persona for backwards compatibility
    const derivedGender: Gender = ['woman', 'gay-woman', 'fat-girl', 'black-woman', 'dominatrix'].includes(selectedPersona) ? 'female' : 'male';

    try {
      // STEP 1: Generate base scenario (no NPCs)
      setLoadingMessage('Creating your scenario...');
      console.log('Step 1: Generating base scenario...');

      const scenarioPrompt = buildScenarioPrompt(selectedPersona, difficulty);
      const scenarioResponse = await sendMessage({
        messages: [{ role: 'user', content: scenarioPrompt }],
        model: MODEL_CONFIG.scenarioGeneration, // Grok for unfiltered scenario
      });

      const scenarioContent = extractContent(scenarioResponse);
      console.log('Scenario response:', scenarioContent);

      const scenarioData = parseJSON(scenarioContent);
      if (!scenarioData || !scenarioData.playerName) {
        throw new Error('Failed to parse scenario');
      }

      setLoadingStep(1);

      // STEP 2: Generate 5 NPCs (2 core, 3 secondary) in one call
      setLoadingMessage('Designing characters...');
      console.log('Step 2: Generating NPCs...');

      const npcsPrompt = buildNPCsPrompt(scenarioData, selectedPersona, difficulty, 5);
      const npcsResponse = await sendMessage({
        messages: [{ role: 'user', content: npcsPrompt }],
        model: MODEL_CONFIG.scenarioGeneration, // Grok for unfiltered NPCs
      });

      const npcsContent = extractContent(npcsResponse);
      console.log('NPCs response:', npcsContent);

      const allNpcs = parseNPCsResponse(npcsContent);
      console.log(`Parsed ${allNpcs.length} NPCs`);

      setLoadingStep(2);
      setLoadingMessage('Building relationships...');

      // Small delay for UX
      await new Promise(resolve => setTimeout(resolve, 500));

      setLoadingStep(3);
      setLoadingMessage('Finalizing your world...');

      // Create the identity
      const newIdentity: Identity = {
        id: crypto.randomUUID(),
        slotIndex,
        name: scenarioData.playerName,
        gender: derivedGender,
        persona: selectedPersona,
        difficulty,
        scenario: {
          profession: scenarioData.profession || 'Unknown',
          workplace: scenarioData.workplace || 'Unknown',
          familyStructure: scenarioData.familyStructure || {
            maritalStatus: 'single',
            hasChildren: false,
            children: [],
            extendedFamily: [],
          },
          livingSituation: scenarioData.livingSituation || 'Apartment',
          backstory: scenarioData.backstory || 'A mysterious past...',
        },
        currentDay: 1,
        meters: DEFAULT_METERS,
        npcs: allNpcs.map((npc: any) => ({
          id: crypto.randomUUID(),
          name: npc.name || 'Unknown',
          role: npc.role || 'Acquaintance',
          tier: npc.tier || 'tertiary',
          origin: 'guaranteed' as const,
          spawnedDay: 1,
          personality: npc.personality || 'Reserved',
          backstory: npc.backstory || 'Unknown past',
          currentEmotionalState: npc.emotion || npc.currentEmotionalState || 'neutral',
          relationshipStatus: npc.relationship || npc.relationshipStatus || 'Neutral',
          offScreenMemories: [],
          isActive: true,
          pixelArtUrl: '',
          emotionSprites: {},
        })),
        createdAt: new Date(),
        lastPlayedAt: new Date(),
      };

      // Save to IndexedDB
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
      <main className="min-h-screen flex items-center justify-center bg-[var(--pixel-bg-dark)]">
        <div className="pixel-text text-[var(--pixel-text-dim)]">
          <span className="pixel-loading">Loading</span>
        </div>
      </main>
    );
  }

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

      <div className="max-w-2xl w-full text-center relative z-10">
        {/* Back button */}
        {step !== 'loading' && step !== 'complete' && (
          <button
            onClick={() => {
              if (step === 'difficulty') {
                setStep('persona');
                setPersona(null);
              } else {
                router.push('/play');
              }
            }}
            className="absolute top-0 left-0 pixel-btn text-xs"
          >
            &lt; BACK
          </button>
        )}

        {/* Persona Selection */}
        {step === 'persona' && (
          <>
            <h1 className="pixel-title text-[var(--pixel-gold)] mb-2">CREATE CHARACTER</h1>
            <p className="pixel-text text-[var(--pixel-text-dim)] mb-8">Choose your identity</p>

            <div className="pixel-frame mb-6">
              <label className="block text-left pixel-label text-[var(--pixel-text-dim)] mb-3">
                SELECT PERSONA
              </label>
              <select
                value={persona || ''}
                onChange={(e) => setPersona(e.target.value as Persona)}
                className="w-full px-4 py-3 bg-[var(--pixel-bg-dark)] border-4 border-[var(--pixel-border)] text-[var(--pixel-text)] pixel-text focus:outline-none focus:border-[var(--pixel-gold)]"
                style={{ imageRendering: 'pixelated' }}
              >
                <option value="" disabled>Choose your identity...</option>
                {PERSONA_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              {persona && (
                <div className="pixel-frame-inset mt-4 p-3">
                  <p className="pixel-text-small text-[var(--pixel-text)]">
                    {PERSONA_OPTIONS.find(p => p.value === persona)?.description}
                  </p>
                </div>
              )}
            </div>

            <button
              onClick={() => persona && handlePersonaSelect(persona)}
              disabled={!persona}
              className="pixel-btn pixel-btn-primary w-full py-4 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              CONTINUE
            </button>
          </>
        )}

        {/* Difficulty Selection */}
        {step === 'difficulty' && (
          <>
            <h1 className="pixel-title text-[var(--pixel-gold)] mb-2">SELECT DIFFICULTY</h1>
            <p className="pixel-text text-[var(--pixel-text-dim)] mb-8">How intense should your story be?</p>

            <div className="space-y-4">
              <button
                onClick={() => handleDifficultySelect('realistic')}
                className="pixel-frame w-full text-left hover:border-[var(--pixel-green)] transition-colors"
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="pixel-label text-[var(--pixel-green)]">[EASY]</span>
                  <span className="pixel-title text-lg text-[var(--pixel-parchment)]">REALISTIC</span>
                </div>
                <p className="pixel-text-small text-[var(--pixel-text-dim)]">
                  Slow-burn drama with grounded consequences. Professional boundaries, realistic
                  reactions, and believable story progression.
                </p>
              </button>

              <button
                onClick={() => handleDifficultySelect('dramatic')}
                className="pixel-frame w-full text-left hover:border-[var(--pixel-gold)] transition-colors"
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="pixel-label text-[var(--pixel-gold)]">[MEDIUM]</span>
                  <span className="pixel-title text-lg text-[var(--pixel-parchment)]">DRAMATIC</span>
                </div>
                <p className="pixel-text-small text-[var(--pixel-text-dim)]">
                  Soap opera intensity with secrets, affairs, and tension. Adult content allowed.
                  Characters have hidden agendas and dramatic backstories.
                </p>
              </button>

              <button
                onClick={() => handleDifficultySelect('crazy')}
                className="pixel-frame w-full text-left hover:border-[var(--pixel-red)] transition-colors"
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="pixel-label text-[var(--pixel-red)]">[HARD]</span>
                  <span className="pixel-title text-lg text-[var(--pixel-parchment)]">CRAZY</span>
                </div>
                <p className="pixel-text-small text-[var(--pixel-text-dim)]">
                  Maximum chaos, fully unfiltered. Extreme situations, unpredictable characters, and
                  wild consequences. NSFW enabled.
                </p>
              </button>
            </div>
          </>
        )}

        {/* Loading */}
        {step === 'loading' && (
          <div className="max-w-md mx-auto">
            {/* ASCII art loading indicator */}
            <div className="pixel-frame mb-8 p-6">
              <pre className="pixel-label text-[var(--pixel-gold)] text-center text-xs leading-tight">
{`    ╔════════════════╗
    ║  GENERATING... ║
    ╚════════════════╝`}
              </pre>
            </div>

            {/* Main Message */}
            <h1 className="pixel-title text-[var(--pixel-parchment)] mb-2">
              CREATING YOUR LIFE
            </h1>
            <p className="pixel-text text-[var(--pixel-text-dim)] mb-8">
              {loadingSteps[loadingStep].label}...
            </p>

            {/* Progress Steps */}
            <div className="space-y-2 text-left">
              {loadingSteps.map((s, index) => (
                <div
                  key={index}
                  className={`flex items-center gap-3 p-3 transition-all duration-500 ${
                    index === loadingStep
                      ? 'pixel-frame-inset bg-[var(--pixel-surface)]'
                      : index < loadingStep
                        ? 'opacity-60'
                        : 'opacity-30'
                  }`}
                >
                  <span className={`pixel-label ${
                    index === loadingStep ? 'text-[var(--pixel-gold)]' :
                    index < loadingStep ? 'text-[var(--pixel-green)]' : 'text-[var(--pixel-text-dim)]'
                  }`}>
                    {index < loadingStep ? '[OK]' : index === loadingStep ? '[..]' : '[  ]'}
                  </span>
                  <span className={`pixel-text-small ${
                    index === loadingStep
                      ? 'text-[var(--pixel-text)]'
                      : 'text-[var(--pixel-text-dim)]'
                  }`}>
                    {s.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Flavor Text */}
            <p className="mt-8 pixel-text-small text-[var(--pixel-text-dim)]">
              Generating {INITIAL_NPC_COUNT} unique characters...
            </p>
          </div>
        )}

        {/* Complete */}
        {step === 'complete' && identity && (
          <>
            <div className="pixel-frame mb-6 p-4">
              <pre className="pixel-label text-[var(--pixel-green)] text-center text-xs leading-tight">
{`  ╔═══════════════════╗
  ║  CHARACTER READY  ║
  ╚═══════════════════╝`}
              </pre>
            </div>

            <h1 className="pixel-title text-[var(--pixel-gold)] mb-2">
              {identity.name.toUpperCase()}
            </h1>
            <p className="pixel-text text-[var(--pixel-text-dim)] mb-8">{identity.scenario.profession}</p>

            <div className="pixel-frame text-left mb-8">
              <div className="pixel-label text-[var(--pixel-gold)] mb-3">BACKSTORY</div>
              <p className="pixel-text-small text-[var(--pixel-text)] mb-6">{identity.scenario.backstory}</p>

              <div className="pixel-frame-inset p-4">
                <div className="pixel-label text-[var(--pixel-text-dim)] mb-3">YOUR CAST</div>
                <div className="flex flex-wrap gap-2">
                  {identity.npcs.slice(0, 6).map((npc) => (
                    <span
                      key={npc.id}
                      className="pixel-tag"
                    >
                      {npc.name} ({npc.role})
                    </span>
                  ))}
                  {identity.npcs.length > 6 && (
                    <span className="pixel-tag opacity-60">
                      +{identity.npcs.length - 6} more
                    </span>
                  )}
                </div>
              </div>
            </div>

            <button onClick={handleEnterGame} className="pixel-btn pixel-btn-primary px-10 py-4">
              ENTER YOUR LIFE
            </button>
          </>
        )}
      </div>
    </main>
  );
}

export default function CreatePage() {
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
      <CreatePageContent />
    </Suspense>
  );
}

// Helper functions

// Helper to get persona description for prompts
function getPersonaContext(persona: string): string {
  const contexts: Record<string, string> = {
    'man': 'a regular man',
    'woman': 'a regular woman',
    'gay-man': 'a gay man navigating same-sex relationships and potentially facing social challenges',
    'gay-woman': 'a lesbian woman navigating same-sex relationships and potentially facing social challenges',
    'transexual': 'a transgender person navigating identity, transition, and social acceptance',
    'teacher': 'a teacher with professional responsibilities, students, and school politics',
    'student': 'a student dealing with academic pressure, social dynamics, and coming-of-age challenges',
    'closeted-gay': 'someone hiding their true sexuality from family, friends, or coworkers while living a double life',
    'closeted-bully': 'someone who bullies others to hide their own deep insecurities and secrets',
    'dominatrix': 'a dominatrix or BDSM professional with power dynamics in both personal and professional life',
    'reptile': 'someone with a cold, calculating personality who operates on instinct and self-preservation',
    'fat-girl': 'a plus-size woman navigating body image issues, self-acceptance, and society\'s judgments',
    'fat-boy': 'a plus-size man navigating body image issues, self-acceptance, and society\'s judgments',
    'black-man': 'a Black man with unique cultural experiences and navigating racial dynamics in society',
    'black-woman': 'a Black woman with unique cultural experiences and navigating racial and gender dynamics',
    'doctor': 'a medical professional facing life-and-death decisions, ethical dilemmas, and high-pressure situations',
  };
  return contexts[persona] || 'a person';
}

// Prompt for base scenario (no NPCs)
function buildScenarioPrompt(persona: string, difficulty: string): string {
  const modeDesc = difficulty === 'crazy' ? 'Extreme/wild, fully NSFW, taboo content allowed' :
    difficulty === 'dramatic' ? 'Dramatic with dark secrets, adult themes, affairs, betrayals' : 'Grounded realistic with mild drama';

  const personaContext = getPersonaContext(persona);

  return `Generate a ${modeDesc} life scenario for ${personaContext}.

PERSONA TYPE: ${persona.replace(/-/g, ' ').toUpperCase()}
This persona should HEAVILY influence the character's profession, relationships, backstory, and the types of drama they encounter. The scenario should authentically represent this identity.

IMPORTANT: The backstory MUST be 4-6 detailed sentences describing their past, current situation, hidden secrets, and potential drama. Include specific events, relationships gone wrong, and unresolved tensions that are RELEVANT to their persona.

Output ONLY valid JSON in this exact format:
{
  "playerName": "First name only",
  "profession": "Specific job title appropriate for the persona",
  "workplace": "Specific workplace name",
  "familyStructure": {
    "maritalStatus": "single|married|divorced|widowed",
    "hasChildren": true or false,
    "children": [{"name": "Name", "age": 18, "gender": "male|female"}],
    "extendedFamily": ["Relation: Brief description"]
  },
  "livingSituation": "Where and how they live",
  "backstory": "DETAILED 4-6 sentence backstory with specific events, secrets, past traumas, and current tensions that create drama potential. MUST relate to the ${persona.replace(/-/g, ' ')} identity."
}`;
}

// Prompt for NPCs batch
function buildNPCsPrompt(scenario: any, persona: string, difficulty: string, count: number): string {
  const modeDesc = difficulty === 'crazy' ? 'Extreme/unfiltered, NSFW OK' :
    difficulty === 'dramatic' ? 'Dramatic, adult themes OK' : 'Realistic';

  const personaContext = getPersonaContext(persona);

  return `${scenario.playerName} is ${personaContext}. Profession: ${scenario.profession}. ${scenario.backstory}

PERSONA: ${persona.replace(/-/g, ' ').toUpperCase()} - NPCs should have relationships and dynamics relevant to this identity.

Create exactly ${count} NPCs: 2 "core" (spouse/partner/boss type), 3 "secondary" (family/friends/rivals). Mode: ${modeDesc}.
NPCs should create drama opportunities specific to the player's ${persona.replace(/-/g, ' ')} identity.
KEEP VALUES SHORT. Output ONLY JSON array:

[{"name":"","role":"","tier":"core|secondary","personality":"","backstory":"","emotion":"","relationship":""}]`;
}

function parseScenarioResponse(content: string): any {
  try {
    // Try to extract JSON from the response
    let jsonStr = content;

    // Find the start of JSON
    const jsonStart = content.indexOf('{');
    if (jsonStart !== -1) {
      jsonStr = content.slice(jsonStart);
    }

    // Try to parse as-is first
    try {
      return JSON.parse(jsonStr);
    } catch {
      // If truncated, try to fix it by closing open brackets
      console.log('JSON parse failed, attempting to fix truncated JSON...');

      // Find the last complete object in npcs array if we have partial data
      // Look for the last complete NPC object
      const npcsMatch = jsonStr.match(/"npcs"\s*:\s*\[/);
      if (npcsMatch) {
        const npcsStart = jsonStr.indexOf(npcsMatch[0]) + npcsMatch[0].length;
        const beforeNpcs = jsonStr.slice(0, npcsStart);

        // Find all complete NPC objects (ending with })
        const npcsSection = jsonStr.slice(npcsStart);
        const completeNpcs: string[] = [];
        let depth = 0;
        let currentNpc = '';
        let inStr = false;
        let escape = false;

        for (const char of npcsSection) {
          if (escape) {
            escape = false;
            currentNpc += char;
            continue;
          }
          if (char === '\\') {
            escape = true;
            currentNpc += char;
            continue;
          }
          if (char === '"') {
            inStr = !inStr;
          }
          if (!inStr) {
            if (char === '{') depth++;
            if (char === '}') {
              depth--;
              if (depth === 0 && currentNpc.trim()) {
                completeNpcs.push(currentNpc + '}');
                currentNpc = '';
                continue;
              }
            }
          }
          if (depth > 0) {
            currentNpc += char;
          }
        }

        // Rebuild JSON with only complete NPCs
        if (completeNpcs.length > 0) {
          jsonStr = beforeNpcs + completeNpcs.join(',') + ']}';
          console.log(`Recovered ${completeNpcs.length} complete NPCs`);
          try {
            return JSON.parse(jsonStr);
          } catch (e) {
            console.log('Recovery attempt failed, trying basic fix...');
          }
        }
      }

      // Basic fix: count and close brackets
      let openBraces = 0;
      let openBrackets = 0;
      let inString = false;
      let escapeNext = false;

      for (const char of jsonStr) {
        if (escapeNext) {
          escapeNext = false;
          continue;
        }
        if (char === '\\') {
          escapeNext = true;
          continue;
        }
        if (char === '"') {
          inString = !inString;
          continue;
        }
        if (!inString) {
          if (char === '{') openBraces++;
          if (char === '}') openBraces--;
          if (char === '[') openBrackets++;
          if (char === ']') openBrackets--;
        }
      }

      // If we're in a string, close it
      if (inString) {
        jsonStr += '"';
      }

      // Close any open brackets/braces
      jsonStr += ']'.repeat(Math.max(0, openBrackets));
      jsonStr += '}'.repeat(Math.max(0, openBraces));

      console.log('Attempting to parse fixed JSON...');
      return JSON.parse(jsonStr);
    }
  } catch (error) {
    console.error('Failed to parse scenario JSON:', error);
    return null;
  }
}

// JSON parser for scenario (object) with truncation recovery
function parseJSON(content: string): any {
  try {
    const jsonStart = content.indexOf('{');
    if (jsonStart === -1) return null;

    let jsonStr = content.slice(jsonStart);

    // Try direct parse first
    try {
      const jsonEnd = jsonStr.lastIndexOf('}');
      if (jsonEnd !== -1) {
        return JSON.parse(jsonStr.slice(0, jsonEnd + 1));
      }
    } catch {
      // Continue to recovery
    }

    // Try to fix truncated JSON by closing open brackets/braces
    console.log('Scenario JSON truncated, attempting recovery...');

    // Find where it was truncated (likely mid-string in backstory)
    // Truncate at the last complete property
    let lastCompleteProperty = -1;
    const propertyEndings = [
      jsonStr.lastIndexOf('",'),
      jsonStr.lastIndexOf('"],'),
      jsonStr.lastIndexOf('"},'),
      jsonStr.lastIndexOf('},'),
    ];

    for (const pos of propertyEndings) {
      if (pos > lastCompleteProperty) {
        lastCompleteProperty = pos;
      }
    }

    if (lastCompleteProperty > 0) {
      // Cut at the last complete property and close the object
      let fixedJson = jsonStr.slice(0, lastCompleteProperty + 1);

      // If it ends with a comma, remove it
      fixedJson = fixedJson.replace(/,\s*$/, '');

      // Count unclosed brackets and braces
      let openBraces = 0;
      let openBrackets = 0;
      let inString = false;
      let escape = false;

      for (const char of fixedJson) {
        if (escape) {
          escape = false;
          continue;
        }
        if (char === '\\') {
          escape = true;
          continue;
        }
        if (char === '"') {
          inString = !inString;
          continue;
        }
        if (!inString) {
          if (char === '{') openBraces++;
          else if (char === '}') openBraces--;
          else if (char === '[') openBrackets++;
          else if (char === ']') openBrackets--;
        }
      }

      // Close any unclosed brackets/braces
      fixedJson += ']'.repeat(Math.max(0, openBrackets));
      fixedJson += '}'.repeat(Math.max(0, openBraces));

      console.log('Attempting to parse recovered scenario JSON...');
      try {
        return JSON.parse(fixedJson);
      } catch (e) {
        console.error('Recovery parse failed:', e);
      }
    }

    // Last resort: try to extract key fields manually
    console.log('Attempting manual field extraction...');
    const scenario: any = {};

    const extractField = (name: string): string | null => {
      const regex = new RegExp(`"${name}"\\s*:\\s*"([^"]*)"`, 'i');
      const match = jsonStr.match(regex);
      return match ? match[1] : null;
    };

    // Extract backstory specially - it might be truncated mid-sentence
    const extractBackstory = (): string => {
      const backstoryMatch = jsonStr.match(/"backstory"\s*:\s*"([^"]*)(")?/);
      if (backstoryMatch) {
        let backstory = backstoryMatch[1];
        // If truncated (no closing quote found), add ellipsis
        if (!backstoryMatch[2]) {
          backstory = backstory + '...';
        }
        // Make sure it's a reasonable length
        if (backstory.length > 20) {
          return backstory;
        }
      }
      return 'A complex life filled with secrets, hidden desires, and unresolved tensions from the past. Relationships have been strained, and difficult choices lie ahead.';
    };

    scenario.playerName = extractField('playerName') || 'Unknown';
    scenario.profession = extractField('profession') || 'Professional';
    scenario.workplace = extractField('workplace') || 'Office';
    scenario.livingSituation = extractField('livingSituation') || 'Apartment';
    scenario.backstory = extractBackstory();

    // Try to extract family structure with nested objects
    const familyStart = jsonStr.indexOf('"familyStructure"');
    if (familyStart !== -1) {
      const familyObjStart = jsonStr.indexOf('{', familyStart);
      if (familyObjStart !== -1) {
        // Find matching closing brace
        let depth = 0;
        let familyObjEnd = -1;
        for (let i = familyObjStart; i < jsonStr.length; i++) {
          if (jsonStr[i] === '{') depth++;
          else if (jsonStr[i] === '}') {
            depth--;
            if (depth === 0) {
              familyObjEnd = i;
              break;
            }
          }
        }
        if (familyObjEnd !== -1) {
          try {
            scenario.familyStructure = JSON.parse(jsonStr.slice(familyObjStart, familyObjEnd + 1));
          } catch {
            scenario.familyStructure = {
              maritalStatus: extractField('maritalStatus') || 'single',
              hasChildren: jsonStr.includes('"hasChildren": true') || jsonStr.includes('"hasChildren":true'),
              children: [],
              extendedFamily: [],
            };
          }
        }
      }
    }

    if (!scenario.familyStructure) {
      scenario.familyStructure = {
        maritalStatus: 'single',
        hasChildren: false,
        children: [],
        extendedFamily: [],
      };
    }

    return scenario;
  } catch (error) {
    console.error('Failed to parse JSON:', error);
    return null;
  }
}

// Parse NPCs array response, handling truncation
function parseNPCsResponse(content: string): any[] {
  try {
    // Find array start
    const arrayStart = content.indexOf('[');
    if (arrayStart === -1) return [];

    let jsonStr = content.slice(arrayStart);

    // Try direct parse first
    try {
      const parsed = JSON.parse(jsonStr);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      // Extract complete objects from truncated array
      console.log('NPCs array truncated, extracting complete objects...');

      const completeNpcs: any[] = [];
      let depth = 0;
      let currentObj = '';
      let inStr = false;
      let escape = false;

      for (let i = 1; i < jsonStr.length; i++) { // Start after '['
        const char = jsonStr[i];

        if (escape) {
          escape = false;
          currentObj += char;
          continue;
        }
        if (char === '\\') {
          escape = true;
          currentObj += char;
          continue;
        }
        if (char === '"') {
          inStr = !inStr;
          currentObj += char;
          continue;
        }

        if (!inStr) {
          if (char === '{') {
            depth++;
            currentObj += char;
          } else if (char === '}') {
            depth--;
            currentObj += char;
            if (depth === 0 && currentObj.trim()) {
              try {
                completeNpcs.push(JSON.parse(currentObj));
              } catch {
                console.log('Failed to parse NPC object');
              }
              currentObj = '';
            }
          } else if (depth > 0) {
            currentObj += char;
          }
        } else {
          currentObj += char;
        }
      }

      console.log(`Extracted ${completeNpcs.length} complete NPCs from truncated response`);
      return completeNpcs;
    }
  } catch (error) {
    console.error('Failed to parse NPCs:', error);
    return [];
  }
}
