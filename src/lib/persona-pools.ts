/**
 * Persona Pool System for GigaMesh/LifeSim
 *
 * Provides randomized persona templates based on content rating.
 * This decouples visual character sprites from gameplay personas.
 */

import { ContentRating } from './content-filter';

/**
 * A persona template defines the type of character the player will be
 */
export interface PersonaTemplate {
  // Internal identifier
  id: string;
  // Human-readable type
  type: string;
  // Core personality traits
  traits: string[];
  // Example life situations
  situations: string[];
  // Backstory hooks for the LLM
  backstoryHints: string[];
  // What kind of NPCs would surround this persona
  npcContextHints: string[];
}

/**
 * NPC archetype templates per content rating
 */
export interface NPCArchetype {
  id: string;
  type: string;
  traits: string[];
  relationshipTypes: string[];
  secretHints: string[];
}

/**
 * Player persona pools by content rating
 */
export const PERSONA_POOLS: Record<ContentRating, PersonaTemplate[]> = {
  'family-friendly': [
    {
      id: 'ambitious-professional',
      type: 'Ambitious Professional',
      traits: ['hardworking', 'competitive', 'driven', 'perfectionist'],
      situations: [
        'Up for a big promotion at work',
        'Starting a new business venture',
        'Balancing career and family responsibilities',
      ],
      backstoryHints: [
        'Worked their way up from humble beginnings',
        'Has big dreams but faces obstacles at every turn',
        'Struggling to prove themselves to skeptical colleagues',
      ],
      npcContextHints: [
        'Supportive but worried family members',
        'Competitive coworkers',
        'A demanding but fair mentor',
      ],
    },
    {
      id: 'devoted-parent',
      type: 'Devoted Parent',
      traits: ['nurturing', 'protective', 'sometimes overbearing', 'loving'],
      situations: [
        'Kids are growing up and pulling away',
        'Dealing with in-law conflicts',
        'Trying to reconnect with estranged family',
      ],
      backstoryHints: [
        'Put their own dreams on hold for family',
        'Hiding financial worries from their spouse',
        'Still processing their own difficult childhood',
      ],
      npcContextHints: [
        'Teenagers pushing boundaries',
        'Spouse with different parenting style',
        'Meddling but well-meaning relatives',
      ],
    },
    {
      id: 'idealistic-newcomer',
      type: 'Idealistic Newcomer',
      traits: ['optimistic', 'naive', 'eager to please', 'adaptable'],
      situations: [
        'Just moved to a new city for a fresh start',
        'Starting their first real job',
        'Navigating a new social circle',
      ],
      backstoryHints: [
        'Left their hometown to escape expectations',
        'Carrying student debt and big dreams',
        'Has a secret talent nobody knows about yet',
      ],
      npcContextHints: [
        'A helpful neighbor with their own agenda',
        'A cynical coworker who becomes an unlikely friend',
        'Family members who think they made a mistake',
      ],
    },
    {
      id: 'caring-caregiver',
      type: 'Caring Caregiver',
      traits: ['empathetic', 'selfless', 'tired', 'resilient'],
      situations: [
        'Taking care of an aging parent',
        'Supporting a family member through illness',
        'Working in healthcare or social services',
      ],
      backstoryHints: [
        'Neglecting their own needs for others',
        'Feeling guilty about wanting time for themselves',
        'Has a dream they keep putting off',
      ],
      npcContextHints: [
        'Grateful but demanding family members',
        'Understanding friends who worry about them',
        'A potential romantic interest they feel guilty about',
      ],
    },
    {
      id: 'creative-dreamer',
      type: 'Creative Dreamer',
      traits: ['artistic', 'impractical', 'passionate', 'sensitive'],
      situations: [
        'Trying to make it as an artist while working a day job',
        'Facing pressure to choose a more stable path',
        'Getting their first big creative opportunity',
      ],
      backstoryHints: [
        'Family never understood their passion',
        'Had a mentor who believed in them',
        'Afraid of both success and failure',
      ],
      npcContextHints: [
        'Practical partner who worries about bills',
        'Fellow artists who are competitors and friends',
        'A gatekeeping figure in their field',
      ],
    },
  ],

  'mature': [
    {
      id: 'trapped-spouse',
      type: 'Trapped Spouse',
      traits: ['restless', 'conflicted', 'nostalgic', 'questioning'],
      situations: [
        'Marriage has gone stale',
        'Reconnected with an old flame',
        'Questioning life choices after a milestone birthday',
      ],
      backstoryHints: [
        'Married young and wonders what they missed',
        'Keeping up appearances while dying inside',
        'Has been having emotional conversations with someone they should not',
      ],
      npcContextHints: [
        'Oblivious or suspicious spouse',
        'A tempting alternative who makes them feel alive',
        'Children who would be devastated by divorce',
      ],
    },
    {
      id: 'secret-keeper',
      type: 'Secret Keeper',
      traits: ['paranoid', 'guilty', 'compartmentalized', 'controlled'],
      situations: [
        'Past mistake is about to surface',
        'Knows something that could destroy someone',
        'Living a double life',
      ],
      backstoryHints: [
        'Did something unforgivable years ago',
        'Has been lying to everyone they love',
        'Someone from their past just showed up',
      ],
      npcContextHints: [
        'Someone who knows the truth',
        'An investigator or journalist getting close',
        'Family who trusts them completely',
      ],
    },
    {
      id: 'fallen-star',
      type: 'Fallen Star',
      traits: ['bitter', 'proud', 'desperate', 'nostalgic'],
      situations: [
        'Once successful but now struggling',
        'Trying to make a comeback',
        'Dealing with people who remember their glory days',
      ],
      backstoryHints: [
        'Burned bridges on the way up',
        'Lost everything to bad decisions or addiction',
        'Blames others but knows the truth',
      ],
      npcContextHints: [
        'People they wronged on the way up',
        'A loyal supporter who still believes',
        'Rivals who are now more successful',
      ],
    },
    {
      id: 'reluctant-heir',
      type: 'Reluctant Heir',
      traits: ['burdened', 'rebellious', 'guilty', 'torn'],
      situations: [
        'Expected to take over the family business',
        'Dealing with inheritance and sibling rivalry',
        'Family secrets being revealed after a death',
      ],
      backstoryHints: [
        'Never wanted this responsibility',
        'Discovery that the family money has dark origins',
        'Siblings who feel cheated',
      ],
      npcContextHints: [
        'Resentful siblings',
        'Family lawyers with their own agenda',
        'Employees whose livelihoods depend on their decisions',
      ],
    },
    {
      id: 'reformed-troublemaker',
      type: 'Reformed Troublemaker',
      traits: ['haunted', 'trying', 'defensive', 'vulnerable'],
      situations: [
        'Building a new life after past mistakes',
        'Past coming back to haunt them',
        'Trying to make amends',
      ],
      backstoryHints: [
        'Hurt people who trusted them',
        'Spent time dealing with consequences of past actions',
        'Nobody believes they have changed',
      ],
      npcContextHints: [
        'People they hurt who have not forgiven',
        'Someone giving them a second chance',
        'Old associates trying to pull them back',
      ],
    },
  ],

  'unfiltered': [
    {
      id: 'hedonist',
      type: 'Pleasure Seeker',
      traits: ['impulsive', 'seductive', 'selfish', 'charming'],
      situations: [
        'Multiple overlapping relationships',
        'Addiction spiraling out of control',
        'Consequences catching up to reckless behavior',
      ],
      backstoryHints: [
        'Uses sex and substances to fill an inner void',
        'Has left a trail of broken hearts and burned bridges',
        'Running from trauma they refuse to face',
      ],
      npcContextHints: [
        'Current and former lovers who compare notes',
        'An enabler who benefits from their chaos',
        'Someone who sees through their act',
      ],
    },
    {
      id: 'manipulator',
      type: 'Master Manipulator',
      traits: ['calculating', 'charming', 'ruthless', 'narcissistic'],
      situations: [
        'Scheming to take control of something valuable',
        'Playing multiple people against each other',
        'Someone is onto their game',
      ],
      backstoryHints: [
        'Learned manipulation as survival',
        'Views people as tools to be used',
        'Has destroyed lives without remorse',
      ],
      npcContextHints: [
        'Victims who do not know they are being played',
        'A worthy opponent who sees through them',
        'Someone from their past seeking revenge',
      ],
    },
    {
      id: 'dark-professional',
      type: 'Dark Professional',
      traits: ['cold', 'efficient', 'morally flexible', 'controlled'],
      situations: [
        'Job requires doing terrible things',
        'A target or client is making things personal',
        'Being blackmailed or compromised',
      ],
      backstoryHints: [
        'Started with good intentions but crossed lines',
        'Has done things that cannot be undone',
        'The only way out might be worse than staying in',
      ],
      npcContextHints: [
        'Dangerous employers or clients',
        'Someone innocent who got caught up',
        'A rival in the same dark world',
      ],
    },
    {
      id: 'obsessed-lover',
      type: 'Obsessed Lover',
      traits: ['intense', 'possessive', 'passionate', 'unstable'],
      situations: [
        'Relationship is toxic but irresistible',
        'Stalking or being stalked',
        'Willing to do anything for the object of obsession',
      ],
      backstoryHints: [
        'Cannot distinguish love from possession',
        'Has scared off everyone who got too close',
        'One relationship that broke them',
      ],
      npcContextHints: [
        'Object of obsession who may not be innocent',
        'People trying to intervene',
        'Someone equally obsessed with them',
      ],
    },
    {
      id: 'power-broker',
      type: 'Power Broker',
      traits: ['dominant', 'wealthy', 'controlling', 'insatiable'],
      situations: [
        'Building an empire through any means necessary',
        'Sexual and financial power intertwined',
        'Enemies closing in from all sides',
      ],
      backstoryHints: [
        'Came from nothing and will never go back',
        'Uses money and sex to control others',
        'Has skeletons that could bring everything down',
      ],
      npcContextHints: [
        'People on their payroll in various ways',
        'Someone who cannot be bought',
        'Rivals in the same power game',
      ],
    },
  ],
};

/**
 * NPC archetype pools by content rating
 */
export const NPC_ARCHETYPE_POOLS: Record<ContentRating, NPCArchetype[]> = {
  'family-friendly': [
    {
      id: 'supportive-partner',
      type: 'Supportive Partner',
      traits: ['loving', 'patient', 'sometimes worried', 'loyal'],
      relationshipTypes: ['Spouse', 'Partner', 'Fiance'],
      secretHints: [
        'Hiding their own career disappointments',
        'Worried about money but not saying',
        'Has a dream they gave up for the family',
      ],
    },
    {
      id: 'demanding-boss',
      type: 'Demanding Boss',
      traits: ['strict', 'fair', 'high expectations', 'mentoring'],
      relationshipTypes: ['Boss', 'Supervisor', 'Business Partner'],
      secretHints: [
        'Under pressure from their own superiors',
        'Sees potential in the player but pushes hard',
        'Going through personal problems at home',
      ],
    },
    {
      id: 'competitive-peer',
      type: 'Competitive Colleague',
      traits: ['ambitious', 'friendly rival', 'insecure', 'talented'],
      relationshipTypes: ['Coworker', 'Classmate', 'Neighbor'],
      secretHints: [
        'Jealous of what the player has',
        'Actually admires the player secretly',
        'Taking shortcuts nobody knows about',
      ],
    },
    {
      id: 'wise-elder',
      type: 'Wise Elder',
      traits: ['experienced', 'sometimes critical', 'caring', 'traditional'],
      relationshipTypes: ['Parent', 'Grandparent', 'Mentor'],
      secretHints: [
        'Made similar mistakes in their youth',
        'Health problems they are hiding',
        'Regrets about their own parenting',
      ],
    },
    {
      id: 'troubled-relative',
      type: 'Troubled Relative',
      traits: ['struggling', 'needy', 'good-hearted', 'unreliable'],
      relationshipTypes: ['Sibling', 'Cousin', 'In-law'],
      secretHints: [
        'Dealing with issues nobody talks about',
        'Feels like the family disappointment',
        'Actually trying harder than anyone knows',
      ],
    },
  ],

  'mature': [
    {
      id: 'tempting-alternative',
      type: 'Tempting Alternative',
      traits: ['attractive', 'understanding', 'available', 'complicated'],
      relationshipTypes: ['Coworker', 'Old Friend', 'New Acquaintance'],
      secretHints: [
        'Has their own agenda for pursuing the player',
        'Not as innocent as they seem',
        'Actually in a complicated situation themselves',
      ],
    },
    {
      id: 'suspicious-spouse',
      type: 'Suspicious Spouse',
      traits: ['paranoid', 'hurt', 'controlling', 'desperate'],
      relationshipTypes: ['Spouse', 'Partner', 'Ex'],
      secretHints: [
        'Has evidence they have not revealed yet',
        'Has their own secrets to hide',
        'Would do anything to save the relationship',
      ],
    },
    {
      id: 'dangerous-ally',
      type: 'Dangerous Ally',
      traits: ['useful', 'morally gray', 'knows too much', 'unpredictable'],
      relationshipTypes: ['Business Partner', 'Friend', 'Fixer'],
      secretHints: [
        'Has helped cover up something serious',
        'Will flip if it benefits them',
        'Knows where bodies are buried (figuratively)',
      ],
    },
    {
      id: 'ghost-from-past',
      type: 'Ghost from the Past',
      traits: ['knowing', 'bitter', 'transformed', 'dangerous'],
      relationshipTypes: ['Ex-lover', 'Former Friend', 'Old Rival'],
      secretHints: [
        'Came back for a reason',
        'Knows things nobody else knows',
        'Has their own revenge agenda',
      ],
    },
    {
      id: 'scheming-family',
      type: 'Scheming Family Member',
      traits: ['resentful', 'entitled', 'manipulative', 'desperate'],
      relationshipTypes: ['Sibling', 'Cousin', 'In-law', 'Step-parent'],
      secretHints: [
        'Believes they were cheated out of something',
        'Has been planning something for years',
        'Will use any leverage they can find',
      ],
    },
  ],

  'unfiltered': [
    {
      id: 'toxic-lover',
      type: 'Toxic Lover',
      traits: ['intoxicating', 'destructive', 'possessive', 'addictive'],
      relationshipTypes: ['Lover', 'Ex', 'Affair', 'Obsession'],
      secretHints: [
        'Uses sex as a weapon and reward',
        'Has destroyed others before the player',
        'Will not let go without consequences',
      ],
    },
    {
      id: 'blackmailer',
      type: 'Blackmailer',
      traits: ['patient', 'cruel', 'thorough', 'enjoying control'],
      relationshipTypes: ['Former Employee', 'Witness', 'Investigator'],
      secretHints: [
        'Has evidence of something terrible',
        'Demands are escalating',
        'May have victims other than the player',
      ],
    },
    {
      id: 'corrupt-authority',
      type: 'Corrupt Authority',
      traits: ['powerful', 'above the law', 'perverted', 'vengeful'],
      relationshipTypes: ['Boss', 'Official', 'Investor', 'Client'],
      secretHints: [
        'Uses position for personal gratification',
        'Has destroyed others who crossed them',
        'Has powerful protectors',
      ],
    },
    {
      id: 'willing-victim',
      type: 'Willing Victim',
      traits: ['submissive', 'enabling', 'desperate', 'devoted'],
      relationshipTypes: ['Employee', 'Admirer', 'Subordinate'],
      secretHints: [
        'Would do anything for the player',
        'Enabling bad behavior',
        'May be more calculating than they appear',
      ],
    },
    {
      id: 'rival-predator',
      type: 'Rival Predator',
      traits: ['competitive', 'ruthless', 'sexually aggressive', 'dominant'],
      relationshipTypes: ['Competitor', 'Former Partner', 'Enemy'],
      secretHints: [
        'Wants to dominate the player in every way',
        'Will use seduction or destruction',
        'Sees this as a game they must win',
      ],
    },
  ],
};

/**
 * Select a random persona template based on content rating
 */
export function selectRandomPersona(rating: ContentRating): PersonaTemplate {
  const pool = PERSONA_POOLS[rating];
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Select random NPC archetypes based on content rating
 */
export function selectRandomNPCArchetypes(
  rating: ContentRating,
  count: number
): NPCArchetype[] {
  const pool = [...NPC_ARCHETYPE_POOLS[rating]];
  const selected: NPCArchetype[] = [];

  // Shuffle the pool
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  // Select up to count archetypes
  for (let i = 0; i < Math.min(count, pool.length); i++) {
    selected.push(pool[i]);
  }

  // If we need more than the pool size, repeat with variations
  while (selected.length < count) {
    const base = pool[Math.floor(Math.random() * pool.length)];
    selected.push({ ...base, id: `${base.id}-${selected.length}` });
  }

  return selected;
}

/**
 * Generate a prompt hint for LLM persona generation
 */
export function getPersonaPromptHint(persona: PersonaTemplate): string {
  return `
PLAYER PERSONA: ${persona.type}
Key traits: ${persona.traits.join(', ')}
Possible situation: ${persona.situations[Math.floor(Math.random() * persona.situations.length)]}
Background hook: ${persona.backstoryHints[Math.floor(Math.random() * persona.backstoryHints.length)]}
`;
}

/**
 * Generate a prompt hint for NPC generation
 */
export function getNPCPromptHint(archetype: NPCArchetype, tier: 'core' | 'secondary' | 'tertiary'): string {
  const role = archetype.relationshipTypes[Math.floor(Math.random() * archetype.relationshipTypes.length)];
  const secret = archetype.secretHints[Math.floor(Math.random() * archetype.secretHints.length)];

  return `
NPC TYPE: ${archetype.type} (${tier})
Role: ${role}
Traits: ${archetype.traits.join(', ')}
Secret: ${secret}
`;
}
