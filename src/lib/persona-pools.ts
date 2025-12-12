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
    {
      id: 'loyal-friend',
      type: 'Loyal Friend',
      traits: ['dependable', 'selfless', 'conflict-avoidant', 'warm'],
      situations: [
        'Always putting others first at their own expense',
        'Caught between two friends in conflict',
        'Discovering a friend has been taking advantage of them',
      ],
      backstoryHints: [
        'Never learned to say no',
        'Lost a close friendship that still haunts them',
        'Secretly wishes someone would put them first for once',
      ],
      npcContextHints: [
        'Friends who rely on them too much',
        'Someone who sees their worth',
        'A toxic friend they cannot let go of',
      ],
    },
    {
      id: 'quiet-achiever',
      type: 'Quiet Achiever',
      traits: ['humble', 'overlooked', 'capable', 'patient'],
      situations: [
        'Finally getting recognition after years of hard work',
        'Someone else taking credit for their efforts',
        'Deciding whether to speak up or stay silent',
      ],
      backstoryHints: [
        'Learned to stay invisible to survive',
        'Has accomplished more than anyone realizes',
        'Afraid that attention will bring scrutiny',
      ],
      npcContextHints: [
        'A boss who finally notices them',
        'A colleague who steals their ideas',
        'Family who underestimates them',
      ],
    },
    {
      id: 'reluctant-leader',
      type: 'Reluctant Leader',
      traits: ['capable', 'uncertain', 'responsible', 'burdened'],
      situations: [
        'Thrust into leadership after someone leaves',
        'Everyone looking to them for answers',
        'Questioning if they are the right person for the job',
      ],
      backstoryHints: [
        'Never wanted to be in charge',
        'Stepped up when no one else would',
        'Fears making a decision that hurts others',
      ],
      npcContextHints: [
        'People depending on their decisions',
        'Someone who resents their position',
        'A mentor figure who believes in them',
      ],
    },
    {
      id: 'eternal-optimist',
      type: 'Eternal Optimist',
      traits: ['hopeful', 'persistent', 'sometimes naive', 'inspiring'],
      situations: [
        'Facing setback after setback but refusing to give up',
        'Others think they are foolish for hoping',
        'A chance that proves their faith was worth it',
      ],
      backstoryHints: [
        'Survived something that should have broken them',
        'Chooses hope because the alternative is too painful',
        'Inspires others even when struggling themselves',
      ],
      npcContextHints: [
        'Cynics who think they are naive',
        'Someone they inspired without knowing',
        'A person who tests their optimism',
      ],
    },
    {
      id: 'protective-sibling',
      type: 'Protective Sibling',
      traits: ['fierce', 'loyal', 'overbearing', 'loving'],
      situations: [
        'Sibling making choices they disagree with',
        'Family secrets affecting their relationship',
        'Having to let their sibling make their own mistakes',
      ],
      backstoryHints: [
        'Took on a parental role too young',
        'Feels responsible for their sibling happiness',
        'Struggling to see their sibling as an adult',
      ],
      npcContextHints: [
        'The sibling they are trying to protect',
        'Parents who enabled the dynamic',
        'Someone dating their sibling',
      ],
    },
    {
      id: 'second-chance-seeker',
      type: 'Second Chance Seeker',
      traits: ['hopeful', 'nervous', 'determined', 'humble'],
      situations: [
        'Starting over after a major life change',
        'Trying to rebuild relationships they damaged',
        'Proving they have changed to skeptics',
      ],
      backstoryHints: [
        'Hit rock bottom and climbed back up',
        'Lost everything and is rebuilding from scratch',
        'Carrying guilt for past mistakes',
      ],
      npcContextHints: [
        'People who remember the old them',
        'Someone willing to give them a chance',
        'A person they wronged seeking closure',
      ],
    },
    {
      id: 'community-pillar',
      type: 'Community Pillar',
      traits: ['respected', 'busy', 'stretched thin', 'generous'],
      situations: [
        'Everyone comes to them for help',
        'Neglecting their own family for the community',
        'A crisis that tests their resources',
      ],
      backstoryHints: [
        'Built their reputation through years of service',
        'Cannot say no to anyone in need',
        'Has never asked for help themselves',
      ],
      npcContextHints: [
        'Family who feels neglected',
        'Community members who depend on them',
        'Someone who sees them as a rival',
      ],
    },
    {
      id: 'late-bloomer',
      type: 'Late Bloomer',
      traits: ['discovering', 'excited', 'insecure', 'determined'],
      situations: [
        'Finding a passion later in life',
        'Surrounded by people younger and more experienced',
        'Proving that it is never too late',
      ],
      backstoryHints: [
        'Spent years doing what was expected',
        'A chance encounter awakened something dormant',
        'Fighting against ageism and doubt',
      ],
      npcContextHints: [
        'Younger peers who underestimate them',
        'Family unsure about their new direction',
        'A mentor who sees their potential',
      ],
    },
    {
      id: 'peacemaker',
      type: 'The Peacemaker',
      traits: ['diplomatic', 'stressed', 'empathetic', 'avoidant'],
      situations: [
        'Caught between feuding family members',
        'Trying to resolve a workplace conflict',
        'Their need to keep peace causing them harm',
      ],
      backstoryHints: [
        'Grew up mediating their parents fights',
        'Terrified of confrontation',
        'Suppressing their own needs to keep harmony',
      ],
      npcContextHints: [
        'Two people who refuse to compromise',
        'Someone who pushes them to take sides',
        'A person who appreciates their efforts',
      ],
    },
    {
      id: 'overachiever',
      type: 'The Overachiever',
      traits: ['driven', 'exhausted', 'perfectionist', 'successful'],
      situations: [
        'Burning out from pushing too hard',
        'Success that feels empty',
        'Learning that good enough is okay',
      ],
      backstoryHints: [
        'Driven by fear of being seen as a failure',
        'Achieved everything but feels nothing',
        'Parents who set impossible standards',
      ],
      npcContextHints: [
        'People intimidated by their success',
        'Someone who sees past the achievements',
        'A rival who pushes them harder',
      ],
    },
    {
      id: 'gentle-soul',
      type: 'Gentle Soul',
      traits: ['kind', 'sensitive', 'easily hurt', 'compassionate'],
      situations: [
        'World feels too harsh for their nature',
        'Being taken advantage of for their kindness',
        'Finding strength they did not know they had',
      ],
      backstoryHints: [
        'Feels things more deeply than others',
        'Has been told they are too sensitive',
        'Kindness has been both blessing and curse',
      ],
      npcContextHints: [
        'People who exploit their kindness',
        'A protector who watches over them',
        'Someone who teaches them boundaries',
      ],
    },
    {
      id: 'survivor',
      type: 'The Survivor',
      traits: ['resilient', 'guarded', 'resourceful', 'wary'],
      situations: [
        'Rebuilding after a difficult experience',
        'Struggling to trust again',
        'Past trauma affecting current relationships',
      ],
      backstoryHints: [
        'Endured more than anyone knows',
        'Built walls to protect themselves',
        'Stronger than they give themselves credit for',
      ],
      npcContextHints: [
        'Someone patient enough to earn their trust',
        'People who do not understand their caution',
        'A person from their difficult past',
      ],
    },
    {
      id: 'supportive-partner',
      type: 'Supportive Partner',
      traits: ['loving', 'patient', 'sometimes forgotten', 'steady'],
      situations: [
        'Partner achieving success while they stay home',
        'Feeling invisible in their own relationship',
        'Rediscovering their own identity',
      ],
      backstoryHints: [
        'Put their dreams aside for their partner',
        'Identity wrapped up in being supportive',
        'Starting to wonder what they want',
      ],
      npcContextHints: [
        'Partner who may not see the imbalance',
        'Friend who encourages their independence',
        'Someone who sees them as their own person',
      ],
    },
    {
      id: 'truth-seeker',
      type: 'Truth Seeker',
      traits: ['curious', 'persistent', 'sometimes obsessive', 'honest'],
      situations: [
        'Uncovering a family secret',
        'Investigating something others want buried',
        'Truth that changes everything they believed',
      ],
      backstoryHints: [
        'Cannot let mysteries go unsolved',
        'Sense that something important was hidden from them',
        'Values truth above comfort',
      ],
      npcContextHints: [
        'People hiding things from them',
        'An ally in their search',
        'Someone protecting a secret',
      ],
    },
    {
      id: 'hometown-hero',
      type: 'Hometown Hero',
      traits: ['admired', 'pressured', 'nostalgic', 'conflicted'],
      situations: [
        'Expected to stay and serve the community',
        'Dreams that require leaving home',
        'Living up to an impossible reputation',
      ],
      backstoryHints: [
        'Success came with expectations',
        'Everyone has a version of them that is not real',
        'Torn between duty and desire',
      ],
      npcContextHints: [
        'Community that claims ownership of them',
        'Someone who knows the real them',
        'A person who resents their success',
      ],
    },
    {
      id: 'curious-explorer',
      type: 'Curious Explorer',
      traits: ['adventurous', 'restless', 'open-minded', 'scattered'],
      situations: [
        'Settling down when they want to roam',
        'Opportunity that requires commitment',
        'Past catching up with their wandering',
      ],
      backstoryHints: [
        'Never stayed anywhere long enough to get hurt',
        'Running toward adventure or away from something',
        'Commitment feels like a cage',
      ],
      npcContextHints: [
        'Someone who wants them to stay',
        'A fellow wanderer who understands',
        'Person they left behind',
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
    {
      id: 'bitter-ex',
      type: 'Bitter Ex',
      traits: ['resentful', 'suspicious', 'hurt', 'seeking closure'],
      situations: [
        'Running into an ex who moved on',
        'Discovering their ex is engaged to someone new',
        'Forced to coexist at work or through mutual friends',
      ],
      backstoryHints: [
        'Never got the closure they needed',
        'Still comparing everyone to their ex',
        'The breakup changed who they are',
      ],
      npcContextHints: [
        'The ex who still affects them',
        'New romantic interests they compare unfairly',
        'Friends tired of hearing about it',
      ],
    },
    {
      id: 'guilty-parent',
      type: 'Guilty Parent',
      traits: ['regretful', 'desperate to connect', 'defensive', 'sad'],
      situations: [
        'Adult child wants nothing to do with them',
        'Trying to make up for years of absence',
        'Realizing the damage they caused',
      ],
      backstoryHints: [
        'Chose career or another relationship over their child',
        'Addiction kept them from being present',
        'Only now understanding what they missed',
      ],
      npcContextHints: [
        'An estranged child',
        'The other parent who raised their child',
        'Grandchildren they barely know',
      ],
    },
    {
      id: 'opportunist',
      type: 'The Opportunist',
      traits: ['calculating', 'charming', 'adaptable', 'untrustworthy'],
      situations: [
        'Playing multiple angles at once',
        'A scheme that is getting out of control',
        'Someone figuring out their game',
      ],
      backstoryHints: [
        'Learned early that the world is transactional',
        'Uses people without feeling bad about it',
        'Always has an exit strategy',
      ],
      npcContextHints: [
        'People being used without knowing',
        'Someone who sees through them',
        'A mark who is smarter than expected',
      ],
    },
    {
      id: 'midlife-crisis',
      type: 'Midlife Crisis',
      traits: ['impulsive', 'desperate', 'searching', 'reckless'],
      situations: [
        'Making drastic changes to feel alive',
        'Embarrassing their family with new behavior',
        'Chasing youth in unhealthy ways',
      ],
      backstoryHints: [
        'Woke up one day and did not recognize their life',
        'Terrified of getting old and having missed out',
        'Acting out in ways that surprise even themselves',
      ],
      npcContextHints: [
        'Spouse watching them spiral',
        'Children embarrassed by their behavior',
        'Enablers who encourage bad choices',
      ],
    },
    {
      id: 'closeted-truth',
      type: 'Living a Lie',
      traits: ['exhausted', 'lonely', 'scared', 'yearning'],
      situations: [
        'Hiding their true self from everyone',
        'Meeting someone who knows the real them',
        'The lie becoming harder to maintain',
      ],
      backstoryHints: [
        'Constructed an entire life around a false identity',
        'Terrified of what they would lose if the truth came out',
        'A moment of authenticity that awakened something',
      ],
      npcContextHints: [
        'People who only know the mask',
        'Someone who accepts them as they are',
        'A person who suspects the truth',
      ],
    },
    {
      id: 'debt-collector',
      type: 'Debt Collector',
      traits: ['patient', 'methodical', 'intimidating', 'persistent'],
      situations: [
        'Someone owes them something they want back',
        'Willing to wait years to get what they are owed',
        'The debtor trying to escape consequences',
      ],
      backstoryHints: [
        'Was wronged in a way that cannot be forgotten',
        'Believes in balance and payment',
        'Has been planning this for a long time',
      ],
      npcContextHints: [
        'The person who owes them',
        'Allies in their pursuit',
        'People caught in the crossfire',
      ],
    },
    {
      id: 'fading-beauty',
      type: 'Fading Beauty',
      traits: ['insecure', 'nostalgic', 'competitive', 'vain'],
      situations: [
        'No longer getting the attention they used to',
        'Younger rivals getting what was once theirs',
        'Redefining their value beyond appearance',
      ],
      backstoryHints: [
        'Identity was built on being attractive',
        'Never developed other aspects of themselves',
        'Watching doors close that used to open easily',
      ],
      npcContextHints: [
        'Younger people who get the attention now',
        'Someone who values them for who they are',
        'People who only knew them in their prime',
      ],
    },
    {
      id: 'enabler',
      type: 'The Enabler',
      traits: ['codependent', 'loyal to a fault', 'in denial', 'tired'],
      situations: [
        'Covering for someone destructive behavior',
        'Their enabling being called out',
        'Choosing between loyalty and what is right',
      ],
      backstoryHints: [
        'Believes they are helping when they are hurting',
        'Cannot separate their identity from the person they enable',
        'Terrified of what happens if they stop',
      ],
      npcContextHints: [
        'The person they enable',
        'Others affected by the behavior',
        'Someone trying to help them see the truth',
      ],
    },
    {
      id: 'professional-rival',
      type: 'Professional Rival',
      traits: ['competitive', 'envious', 'driven', 'obsessive'],
      situations: [
        'Constantly compared to a more successful peer',
        'Opportunity to sabotage or rise above',
        'The rivalry becoming personal',
      ],
      backstoryHints: [
        'Defined themselves in opposition to their rival',
        'Cannot enjoy success unless the rival fails',
        'The rivalry has consumed their life',
      ],
      npcContextHints: [
        'The rival who may not even know the intensity',
        'People caught between them',
        'Someone who sees beyond the competition',
      ],
    },
    {
      id: 'grief-stricken',
      type: 'Grief Stricken',
      traits: ['numb', 'searching', 'irritable', 'lost'],
      situations: [
        'Processing a devastating loss',
        'Others expecting them to move on',
        'Finding meaning after tragedy',
      ],
      backstoryHints: [
        'Lost someone who was their whole world',
        'Going through the motions but not really living',
        'Guilty about moments of happiness',
      ],
      npcContextHints: [
        'People who want them to heal faster',
        'Someone who truly understands loss',
        'Memories everywhere they look',
      ],
    },
    {
      id: 'social-climber',
      type: 'Social Climber',
      traits: ['ambitious', 'superficial', 'strategic', 'insecure'],
      situations: [
        'Using connections to get ahead',
        'Being exposed as not belonging',
        'Choosing between status and authenticity',
      ],
      backstoryHints: [
        'Desperate to escape where they came from',
        'Every relationship is a stepping stone',
        'Terrified of being revealed as a fraud',
      ],
      npcContextHints: [
        'People being used for access',
        'Gatekeepers who see through them',
        'Someone from their past',
      ],
    },
    {
      id: 'whistleblower',
      type: 'The Whistleblower',
      traits: ['principled', 'scared', 'isolated', 'determined'],
      situations: [
        'Discovered something wrong and must decide whether to speak up',
        'Facing retaliation for doing the right thing',
        'Questioning if the cost was worth it',
      ],
      backstoryHints: [
        'Saw something they cannot unsee',
        'Believed in the system until they saw it fail',
        'Lost everything for telling the truth',
      ],
      npcContextHints: [
        'Powerful people who want them silenced',
        'Supporters who believe in their cause',
        'Family affected by their choice',
      ],
    },
    {
      id: 'inheritance-hunter',
      type: 'Inheritance Hunter',
      traits: ['patient', 'attentive', 'calculating', 'resentful'],
      situations: [
        'Waiting for elderly relatives to pass',
        'Competition with other family members',
        'Discovering they might be cut out',
      ],
      backstoryHints: [
        'Feels entitled to what they are waiting for',
        'Has sacrificed years playing the dutiful relative',
        'Others getting what they feel they deserve',
      ],
      npcContextHints: [
        'The wealthy relative',
        'Competing heirs',
        'Lawyers and advisors with influence',
      ],
    },
    {
      id: 'workplace-bully',
      type: 'Workplace Bully',
      traits: ['insecure', 'aggressive', 'territorial', 'threatened'],
      situations: [
        'New person threatening their position',
        'Being called out for their behavior',
        'Facing consequences for how they treat others',
      ],
      backstoryHints: [
        'Bullying masks deep insecurity',
        'Only knows how to maintain power through fear',
        'Terrified of being exposed as incompetent',
      ],
      npcContextHints: [
        'Victims of their behavior',
        'Enablers who look the other way',
        'Someone who finally stands up to them',
      ],
    },
    {
      id: 'romantic-obsessive',
      type: 'Romantic Obsessive',
      traits: ['intense', 'idealistic', 'boundary-blind', 'devoted'],
      situations: [
        'Fixated on someone who does not reciprocate',
        'Love that is becoming concerning',
        'Crossing lines they do not see as lines',
      ],
      backstoryHints: [
        'Cannot distinguish between love and obsession',
        'Builds entire fantasies around people',
        'Has scared others with their intensity',
      ],
      npcContextHints: [
        'Object of their fixation',
        'People trying to intervene',
        'Previous targets of their attention',
      ],
    },
    {
      id: 'returning-veteran',
      type: 'Returning Veteran',
      traits: ['changed', 'disconnected', 'hypervigilant', 'struggling'],
      situations: [
        'Trying to readjust to civilian life',
        'Family who does not understand what they experienced',
        'Past trauma affecting present relationships',
      ],
      backstoryHints: [
        'Came back different and everyone knows it',
        'Cannot talk about what they saw',
        'The person they were before feels like a stranger',
      ],
      npcContextHints: [
        'Family trying to reconnect',
        'Fellow veterans who understand',
        'People who cannot relate to their experience',
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
    {
      id: 'cult-leader',
      type: 'Cult Leader',
      traits: ['charismatic', 'delusional', 'dangerous', 'magnetic'],
      situations: [
        'Building a following of devoted believers',
        'Outside world closing in on their operation',
        'Followers beginning to question the vision',
      ],
      backstoryHints: [
        'Believes their own mythology',
        'Started seeking power and found something darker',
        'Has created a world where they are god',
      ],
      npcContextHints: [
        'True believers who would do anything',
        'Someone trying to rescue a follower',
        'Authorities investigating the group',
      ],
    },
    {
      id: 'revenge-seeker',
      type: 'Revenge Seeker',
      traits: ['patient', 'consumed', 'methodical', 'hollow'],
      situations: [
        'Years of planning coming to fruition',
        'Revenge not bringing the satisfaction expected',
        'Discovering the target is not who they thought',
      ],
      backstoryHints: [
        'Someone destroyed everything they loved',
        'Has become the monster they wanted to destroy',
        'Revenge is all that keeps them alive',
      ],
      npcContextHints: [
        'The target of their revenge',
        'Collateral damage in their crusade',
        'Someone who wants them to let go',
      ],
    },
    {
      id: 'underground-king',
      type: 'Underground King',
      traits: ['ruthless', 'strategic', 'feared', 'lonely'],
      situations: [
        'Maintaining control through violence and fear',
        'Law enforcement getting too close',
        'Rivals making moves against the empire',
      ],
      backstoryHints: [
        'Rose through violence and cunning',
        'Cannot trust anyone completely',
        'The throne is a prison',
      ],
      npcContextHints: [
        'Loyal soldiers with their own ambitions',
        'Law enforcement building a case',
        'Family caught between two worlds',
      ],
    },
    {
      id: 'predator',
      type: 'The Predator',
      traits: ['patient', 'charming', 'calculated', 'empty'],
      situations: [
        'Grooming a new target',
        'Past victims coming forward',
        'Network of enablers being exposed',
      ],
      backstoryHints: [
        'Seeks power through exploitation',
        'Has perfected the art of gaining trust',
        'Protected by position or connections',
      ],
      npcContextHints: [
        'Current and past victims',
        'People who enabled the behavior',
        'Someone finally fighting back',
      ],
    },
    {
      id: 'fallen-angel',
      type: 'Fallen Angel',
      traits: ['once-good', 'corrupted', 'tragic', 'dangerous'],
      situations: [
        'Corruption becoming complete',
        'Glimpses of who they used to be',
        'Someone from their past trying to save them',
      ],
      backstoryHints: [
        'Was once a genuinely good person',
        'Compromise by compromise became this',
        'Part of them knows what they have become',
      ],
      npcContextHints: [
        'People who remember who they were',
        'Those corrupted alongside them',
        'Someone trying to bring back the old them',
      ],
    },
    {
      id: 'chaos-agent',
      type: 'Chaos Agent',
      traits: ['unpredictable', 'anarchic', 'magnetic', 'destructive'],
      situations: [
        'Burning down everything they touch',
        'Attracting followers to their chaos',
        'The destruction finally hitting home',
      ],
      backstoryHints: [
        'Believes destruction is the only truth',
        'Found freedom in abandoning all rules',
        'Wants to watch the world burn',
      ],
      npcContextHints: [
        'People drawn to their energy',
        'Victims of their destruction',
        'Someone who thinks they can tame them',
      ],
    },
    {
      id: 'golden-child',
      type: 'Golden Child',
      traits: ['entitled', 'charming', 'secretly broken', 'reckless'],
      situations: [
        'Privilege no longer protecting them',
        'Scandals threatening the family name',
        'Actually facing consequences for the first time',
      ],
      backstoryHints: [
        'Given everything except boundaries',
        'Believes rules apply to other people',
        'Emptiness behind the perfect facade',
      ],
      npcContextHints: [
        'Family cleaning up their messes',
        'People they have hurt along the way',
        'Someone who sees through the privilege',
      ],
    },
    {
      id: 'trafficker',
      type: 'The Trafficker',
      traits: ['businesslike', 'amoral', 'efficient', 'paranoid'],
      situations: [
        'Moving something valuable and illegal',
        'A shipment gone wrong',
        'Betrayal within the organization',
      ],
      backstoryHints: [
        'Treats human misery as a business',
        'Has compartmentalized all empathy',
        'In too deep to ever get out',
      ],
      npcContextHints: [
        'People being exploited',
        'Competitors in the same trade',
        'Someone trying to bring down the operation',
      ],
    },
    {
      id: 'black-widow',
      type: 'Black Widow',
      traits: ['seductive', 'patient', 'deadly', 'strategic'],
      situations: [
        'Another target in their sights',
        'Pattern being discovered',
        'Actual feelings complicating the plan',
      ],
      backstoryHints: [
        'Uses intimacy as a weapon',
        'Has eliminated multiple partners',
        'Cannot tell if they feel anything anymore',
      ],
      npcContextHints: [
        'Current and former targets',
        'Someone investigating the pattern',
        'A potential victim who is different',
      ],
    },
    {
      id: 'dealer-of-vice',
      type: 'Dealer of Vice',
      traits: ['connected', 'slick', 'corruptive', 'indispensable'],
      situations: [
        'Supplying the needs of powerful people',
        'A client becoming a liability',
        'Competition moving into territory',
      ],
      backstoryHints: [
        'Knows everyone secrets',
        'Makes a living off weakness',
        'Has built an empire on discretion',
      ],
      npcContextHints: [
        'Clients who need what they provide',
        'People destroyed by their services',
        'Law enforcement trying to build a case',
      ],
    },
    {
      id: 'trophy-hunter',
      type: 'Trophy Hunter',
      traits: ['conquesting', 'competitive', 'shallow', 'insatiable'],
      situations: [
        'Pursuing someone as a conquest',
        'Competition with peers over targets',
        'A conquest turning the tables',
      ],
      backstoryHints: [
        'Measures worth in conquests',
        'Discards people after achieving goals',
        'Deep emptiness driving the behavior',
      ],
      npcContextHints: [
        'People treated as trophies',
        'Fellow competitors',
        'Someone who refuses to be conquered',
      ],
    },
    {
      id: 'dirty-cop',
      type: 'Dirty Cop',
      traits: ['corrupted', 'dangerous', 'protected', 'conflicted'],
      situations: [
        'In too deep with criminals',
        'Internal affairs getting close',
        'A case that tests remaining conscience',
      ],
      backstoryHints: [
        'Started small and got sucked in',
        'Justifies everything as survival',
        'Badge makes them untouchable until it does not',
      ],
      npcContextHints: [
        'Criminals they work with',
        'Honest cops who suspect',
        'Victims of their corruption',
      ],
    },
    {
      id: 'sadist',
      type: 'The Sadist',
      traits: ['controlled', 'patient', 'cruel', 'sophisticated'],
      situations: [
        'Found someone who brings out the worst',
        'Escalating behaviors',
        'A victim who fights back',
      ],
      backstoryHints: [
        'Derives pleasure from others pain',
        'Has perfected appearing normal',
        'Always searching for the next thrill',
      ],
      npcContextHints: [
        'Past and current victims',
        'People who enable or ignore',
        'Someone who finally sees the truth',
      ],
    },
    {
      id: 'scorned-spouse',
      type: 'Scorned Spouse',
      traits: ['vengeful', 'strategic', 'wounded', 'dangerous'],
      situations: [
        'Discovered betrayal and planning revenge',
        'Willing to destroy everything',
        'Children caught in the crossfire',
      ],
      backstoryHints: [
        'Gave everything to the relationship',
        'Betrayal shattered their world',
        'Revenge is all they have left',
      ],
      npcContextHints: [
        'The cheating spouse',
        'The other person',
        'Family affected by the fallout',
      ],
    },
    {
      id: 'puppet-master',
      type: 'Puppet Master',
      traits: ['invisible', 'patient', 'brilliant', 'controlling'],
      situations: [
        'Pulling strings from behind the scenes',
        'A puppet becoming aware',
        'Another player entering the game',
      ],
      backstoryHints: [
        'Prefers to control without being seen',
        'Has spent years positioning pieces',
        'Victory means nothing if others know',
      ],
      npcContextHints: [
        'People being manipulated unknowingly',
        'A puppet who is waking up',
        'A rival manipulator',
      ],
    },
    {
      id: 'zealot',
      type: 'The Zealot',
      traits: ['fanatical', 'righteous', 'dangerous', 'devoted'],
      situations: [
        'Willing to do terrible things for the cause',
        'The cause demanding more extreme actions',
        'Questioning the leadership or mission',
      ],
      backstoryHints: [
        'Found meaning in absolute devotion',
        'Believes the ends justify any means',
        'Has given up everything for the cause',
      ],
      npcContextHints: [
        'Fellow believers',
        'Targets of their righteous anger',
        'Someone trying to deprogram them',
      ],
    },
  ],
};

/**
 * NPC archetype pools by content rating
 * Expanded with ~35 archetypes per level for maximum variety
 * Based on character dynamics research and storytelling archetypes
 */
export const NPC_ARCHETYPE_POOLS: Record<ContentRating, NPCArchetype[]> = {
  // ============================================================================
  // FAMILY-FRIENDLY (Realistic) - Workplace, family, and social dynamics
  // ============================================================================
  'family-friendly': [
    // === WORKPLACE ARCHETYPES (12) ===
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
      relationshipTypes: ['Boss', 'Supervisor', 'Department Head'],
      secretHints: [
        'Under pressure from their own superiors',
        'Sees potential in the player but pushes hard',
        'Going through personal problems at home',
      ],
    },
    {
      id: 'supportive-mentor',
      type: 'Supportive Mentor',
      traits: ['encouraging', 'experienced', 'protective', 'wise'],
      relationshipTypes: ['Senior Colleague', 'Mentor', 'Former Boss'],
      secretHints: [
        'Sees themselves in the player',
        'Made mistakes they want to help others avoid',
        'Has connections they rarely mention',
      ],
    },
    {
      id: 'competitive-peer',
      type: 'Competitive Colleague',
      traits: ['ambitious', 'friendly rival', 'insecure', 'talented'],
      relationshipTypes: ['Coworker', 'Peer', 'Team Member'],
      secretHints: [
        'Jealous of what the player has',
        'Actually admires the player secretly',
        'Taking shortcuts nobody knows about',
      ],
    },
    {
      id: 'office-gossip',
      type: 'Office Gossip',
      traits: ['chatty', 'observant', 'friendly', 'indiscreet'],
      relationshipTypes: ['Coworker', 'Receptionist', 'Admin'],
      secretHints: [
        'Knows everyone\'s secrets but plays dumb',
        'Has been overlooked for promotion for years',
        'Actually very lonely outside of work',
      ],
    },
    {
      id: 'eager-newcomer',
      type: 'Eager Newcomer',
      traits: ['enthusiastic', 'naive', 'hardworking', 'impressionable'],
      relationshipTypes: ['New Hire', 'Intern', 'Junior Colleague'],
      secretHints: [
        'Has connections nobody knows about',
        'Not as inexperienced as they pretend',
        'Desperately needs this job to work out',
      ],
    },
    {
      id: 'burnt-out-veteran',
      type: 'Burnt-out Veteran',
      traits: ['cynical', 'experienced', 'helpful when motivated', 'tired'],
      relationshipTypes: ['Senior Colleague', 'Retiring Employee', 'Old Guard'],
      secretHints: [
        'Counting days until retirement',
        'Has seen too many people come and go',
        'Knows where all the skeletons are buried',
      ],
    },
    {
      id: 'client-from-hell',
      type: 'Difficult Client',
      traits: ['demanding', 'wealthy', 'entitled', 'unpredictable'],
      relationshipTypes: ['Client', 'Customer', 'Account'],
      secretHints: [
        'Their business is more important than anyone knows',
        'Has gotten others fired before',
        'Actually respects people who push back',
      ],
    },
    {
      id: 'hr-watchdog',
      type: 'HR Representative',
      traits: ['by-the-book', 'observant', 'neutral', 'thorough'],
      relationshipTypes: ['HR Manager', 'Compliance Officer', 'Administrator'],
      secretHints: [
        'Has a file on everyone',
        'Knows more about office drama than anyone',
        'Has been asked to look the other way before',
      ],
    },
    {
      id: 'tech-wizard',
      type: 'IT Specialist',
      traits: ['introverted', 'brilliant', 'helpful', 'observant'],
      relationshipTypes: ['IT Support', 'Developer', 'Tech Lead'],
      secretHints: [
        'Has access to everyone\'s emails and files',
        'Knows exactly who\'s been looking at what',
        'Underestimated by everyone',
      ],
    },
    {
      id: 'ambitious-climber',
      type: 'Ambitious Climber',
      traits: ['driven', 'charming', 'calculating', 'well-connected'],
      relationshipTypes: ['Coworker', 'Team Lead', 'Rising Star'],
      secretHints: [
        'Will step on anyone to get ahead',
        'Has dirt on key people',
        'Playing a longer game than anyone realizes',
      ],
    },
    {
      id: 'union-rep',
      type: 'Employee Advocate',
      traits: ['principled', 'stubborn', 'protective', 'confrontational'],
      relationshipTypes: ['Union Rep', 'Senior Employee', 'Advocate'],
      secretHints: [
        'Has fought battles others don\'t know about',
        'Knows the company\'s legal vulnerabilities',
        'Has been threatened by management before',
      ],
    },

    // === FAMILY ARCHETYPES (12) ===
    {
      id: 'wise-elder',
      type: 'Wise Elder',
      traits: ['experienced', 'sometimes critical', 'caring', 'traditional'],
      relationshipTypes: ['Parent', 'Grandparent', 'Elder Relative'],
      secretHints: [
        'Made similar mistakes in their youth',
        'Health problems they are hiding',
        'Regrets about their own parenting',
      ],
    },
    {
      id: 'overbearing-parent',
      type: 'Overbearing Parent',
      traits: ['controlling', 'well-meaning', 'anxious', 'critical'],
      relationshipTypes: ['Mother', 'Father', 'Guardian'],
      secretHints: [
        'Their own parents were worse',
        'Terrified of losing their child',
        'Living vicariously through the player',
      ],
    },
    {
      id: 'distant-parent',
      type: 'Distant Parent',
      traits: ['workaholic', 'emotionally unavailable', 'guilty', 'generous with money'],
      relationshipTypes: ['Father', 'Mother', 'Absent Parent'],
      secretHints: [
        'Doesn\'t know how to express love',
        'Regrets the time they missed',
        'Has a whole life the player knows nothing about',
      ],
    },
    {
      id: 'golden-child-sibling',
      type: 'Golden Child Sibling',
      traits: ['successful', 'smug', 'competitive', 'secretly insecure'],
      relationshipTypes: ['Brother', 'Sister', 'Sibling'],
      secretHints: [
        'The pressure of expectations is crushing them',
        'Jealous of the player\'s freedom',
        'Their success isn\'t what it seems',
      ],
    },
    {
      id: 'troubled-relative',
      type: 'Troubled Relative',
      traits: ['struggling', 'needy', 'good-hearted', 'unreliable'],
      relationshipTypes: ['Sibling', 'Cousin', 'Niece/Nephew'],
      secretHints: [
        'Dealing with issues nobody talks about',
        'Feels like the family disappointment',
        'Actually trying harder than anyone knows',
      ],
    },
    {
      id: 'meddling-in-law',
      type: 'Meddling In-Law',
      traits: ['opinionated', 'intrusive', 'traditional', 'well-meaning'],
      relationshipTypes: ['Mother-in-Law', 'Father-in-Law', 'In-Law'],
      secretHints: [
        'Never thought the player was good enough',
        'Protecting their child in their own way',
        'Has marriage problems of their own',
      ],
    },
    {
      id: 'cool-relative',
      type: 'Cool Relative',
      traits: ['fun', 'unconventional', 'supportive', 'irresponsible'],
      relationshipTypes: ['Uncle', 'Aunt', 'Older Cousin'],
      secretHints: [
        'Their lifestyle has consequences they hide',
        'Wishes they had what the player has',
        'Running from something in their past',
      ],
    },
    {
      id: 'struggling-teen',
      type: 'Struggling Teen',
      traits: ['rebellious', 'confused', 'searching', 'vulnerable'],
      relationshipTypes: ['Child', 'Niece/Nephew', 'Godchild'],
      secretHints: [
        'Being bullied or pressured at school',
        'Experimenting with things parents don\'t know',
        'Desperately needs guidance but won\'t ask',
      ],
    },
    {
      id: 'estranged-relative',
      type: 'Estranged Relative',
      traits: ['distant', 'mysterious', 'carrying old wounds', 'unpredictable'],
      relationshipTypes: ['Estranged Parent', 'Long-lost Sibling', 'Distant Relative'],
      secretHints: [
        'Left for reasons nobody talks about',
        'Has built a completely different life',
        'Reaching out now for a specific reason',
      ],
    },
    {
      id: 'family-peacemaker',
      type: 'Family Peacemaker',
      traits: ['diplomatic', 'exhausted', 'self-sacrificing', 'resentful underneath'],
      relationshipTypes: ['Sibling', 'Spouse', 'Parent'],
      secretHints: [
        'Tired of always being the one who fixes things',
        'Has their own problems nobody asks about',
        'Close to their breaking point',
      ],
    },
    {
      id: 'dependent-parent',
      type: 'Dependent Parent',
      traits: ['aging', 'proud', 'stubborn', 'declining'],
      relationshipTypes: ['Elderly Parent', 'Grandparent', 'Aging Relative'],
      secretHints: [
        'Health is worse than they let on',
        'Terrified of losing independence',
        'Has secrets from their past emerging',
      ],
    },
    {
      id: 'prodigal-relative',
      type: 'Prodigal Relative',
      traits: ['returning', 'changed', 'seeking redemption', 'uncertain'],
      relationshipTypes: ['Returning Sibling', 'Wayward Child', 'Reformed Relative'],
      secretHints: [
        'Running from something',
        'Needs money or help they won\'t admit',
        'Has genuinely changed but nobody believes it',
      ],
    },

    // === SOCIAL/COMMUNITY ARCHETYPES (8) ===
    {
      id: 'nosy-neighbor',
      type: 'Nosy Neighbor',
      traits: ['curious', 'helpful', 'gossip-prone', 'well-intentioned'],
      relationshipTypes: ['Neighbor', 'Community Member', 'HOA President'],
      secretHints: [
        'Knows more about everyone than they let on',
        'Actually very lonely',
        'Has been burned by trusting before',
      ],
    },
    {
      id: 'old-school-friend',
      type: 'Old School Friend',
      traits: ['nostalgic', 'familiar', 'changed', 'reconnecting'],
      relationshipTypes: ['High School Friend', 'College Friend', 'Childhood Friend'],
      secretHints: [
        'Their life didn\'t turn out as planned',
        'Remembers things the player has forgotten',
        'Reconnecting for a reason',
      ],
    },
    {
      id: 'new-friend',
      type: 'New Friend',
      traits: ['interesting', 'mysterious', 'engaging', 'has baggage'],
      relationshipTypes: ['New Friend', 'Acquaintance', 'Gym Buddy'],
      secretHints: [
        'Just went through something major',
        'Seeking connection after a loss',
        'Not telling the whole story about their past',
      ],
    },
    {
      id: 'old-rival',
      type: 'Old Rival',
      traits: ['competitive', 'successful', 'smug', 'grudging respect'],
      relationshipTypes: ['Former Classmate', 'Ex-Colleague', 'Competitor'],
      secretHints: [
        'Still measuring themselves against the player',
        'Their success isn\'t what it appears',
        'Actually envies something the player has',
      ],
    },
    {
      id: 'ex-presence',
      type: 'The Ex Who\'s Still Around',
      traits: ['awkward', 'unresolved', 'friendly', 'complicated'],
      relationshipTypes: ['Ex-Partner', 'Former Spouse', 'Ex-Boyfriend/Girlfriend'],
      secretHints: [
        'Still has feelings they hide',
        'Moved on but not completely',
        'Knows secrets about the player\'s past',
      ],
    },
    {
      id: 'community-leader',
      type: 'Community Leader',
      traits: ['respected', 'busy', 'connected', 'politically minded'],
      relationshipTypes: ['Local Official', 'Religious Leader', 'Community Organizer'],
      secretHints: [
        'Has more power than their title suggests',
        'Knows everyone\'s business',
        'Has made compromises to get where they are',
      ],
    },
    {
      id: 'local-business-owner',
      type: 'Local Business Owner',
      traits: ['hardworking', 'community-focused', 'stressed', 'proud'],
      relationshipTypes: ['Shop Owner', 'Restaurant Owner', 'Local Entrepreneur'],
      secretHints: [
        'Business is struggling more than anyone knows',
        'Has seen the neighborhood change',
        'Owes favors to the wrong people',
      ],
    },
    {
      id: 'helpful-professional',
      type: 'Helpful Professional',
      traits: ['competent', 'caring', 'boundaried', 'observant'],
      relationshipTypes: ['Doctor', 'Therapist', 'Lawyer', 'Financial Advisor'],
      secretHints: [
        'Knows things about the player others don\'t',
        'Has seen concerning patterns',
        'Bound by confidentiality but worried',
      ],
    },
  ],

  // ============================================================================
  // MATURE (Dramatic) - Affairs, secrets, manipulation, betrayal
  // ============================================================================
  'mature': [
    // === TEMPTATION/AFFAIR ARCHETYPES (10) ===
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
      id: 'the-ex-who-wants-back',
      type: 'The Ex Who Wants You Back',
      traits: ['persistent', 'nostalgic', 'changed', 'desperate'],
      relationshipTypes: ['Ex-Spouse', 'Ex-Partner', 'Former Lover'],
      secretHints: [
        'Left someone to come back',
        'Realizes what they lost',
        'May not have fully changed',
      ],
    },
    {
      id: 'forbidden-crush',
      type: 'Forbidden Crush',
      traits: ['magnetic', 'off-limits', 'reciprocating', 'conflicted'],
      relationshipTypes: ['Friend\'s Spouse', 'Boss', 'Employee', 'Student'],
      secretHints: [
        'The attraction is mutual',
        'Has thought about crossing the line',
        'Would risk everything for a chance',
      ],
    },
    {
      id: 'flirty-neighbor',
      type: 'Flirty Neighbor',
      traits: ['friendly', 'suggestive', 'convenient', 'lonely'],
      relationshipTypes: ['Neighbor', 'Building Resident', 'Local Regular'],
      secretHints: [
        'In an unhappy relationship',
        'Has noticed more than they let on',
        'Looking for escape from their life',
      ],
    },
    {
      id: 'conference-fling',
      type: 'Conference Connection',
      traits: ['professional', 'exciting', 'temporary', 'intense'],
      relationshipTypes: ['Colleague from Another Office', 'Conference Contact', 'Industry Peer'],
      secretHints: [
        'What happens at the conference...',
        'Looking for something missing at home',
        'More interested than they should be',
      ],
    },
    {
      id: 'online-connection',
      type: 'Online Connection',
      traits: ['mysterious', 'attentive', 'understanding', 'escalating'],
      relationshipTypes: ['Online Friend', 'Gaming Friend', 'Social Media Connection'],
      secretHints: [
        'Not entirely who they claim to be',
        'Has been watching longer than admitted',
        'Ready to take it offline',
      ],
    },
    {
      id: 'friends-ex',
      type: 'Friend\'s Ex',
      traits: ['available', 'complicated', 'attractive', 'brings drama'],
      relationshipTypes: ['Friend\'s Ex-Partner', 'Recent Divorcee', 'Off-Limits Interest'],
      secretHints: [
        'The breakup was messier than anyone knows',
        'Has always been attracted to the player',
        'Would love to make the friend jealous',
      ],
    },
    {
      id: 'wedding-guest',
      type: 'Wedding Guest',
      traits: ['caught up in romance', 'drinking', 'lonely', 'impulsive'],
      relationshipTypes: ['Wedding Guest', 'Family Friend', 'Plus One'],
      secretHints: [
        'Weddings make them feel their own loneliness',
        'Has a reputation for wedding hookups',
        'Looking for their own happy ending',
      ],
    },
    {
      id: 'personal-trainer',
      type: 'Personal Trainer',
      traits: ['fit', 'encouraging', 'physically intimate', 'professional'],
      relationshipTypes: ['Trainer', 'Coach', 'Fitness Instructor'],
      secretHints: [
        'Gets close to clients in ways that blur lines',
        'Has crossed boundaries before',
        'Clients develop feelings they mistake for attraction',
      ],
    },
    {
      id: 'business-trip-companion',
      type: 'Business Trip Companion',
      traits: ['far from home', 'understanding', 'discreet', 'opportunistic'],
      relationshipTypes: ['Travel Colleague', 'Client', 'Business Contact'],
      secretHints: [
        'Has done this before',
        'Knows how to keep secrets',
        'Looking for no-strings connection',
      ],
    },

    // === SUSPICIOUS/BETRAYED PARTNER ARCHETYPES (6) ===
    {
      id: 'suspicious-spouse',
      type: 'Suspicious Spouse',
      traits: ['paranoid', 'hurt', 'controlling', 'desperate'],
      relationshipTypes: ['Spouse', 'Partner', 'Long-term Partner'],
      secretHints: [
        'Has evidence they have not revealed yet',
        'Has their own secrets to hide',
        'Would do anything to save the relationship',
      ],
    },
    {
      id: 'hurt-partner',
      type: 'Hurt Partner',
      traits: ['wounded', 'withdrawn', 'struggling', 'passive-aggressive'],
      relationshipTypes: ['Spouse', 'Partner', 'Long-term Partner'],
      secretHints: [
        'Knows more than they let on',
        'Waiting for the player to confess',
        'Considering their options',
      ],
    },
    {
      id: 'evidence-finder',
      type: 'The One Who Found Evidence',
      traits: ['shocked', 'processing', 'calculating', 'torn'],
      relationshipTypes: ['Spouse', 'Partner', 'Fiance'],
      secretHints: [
        'Hasn\'t decided what to do yet',
        'Documenting everything',
        'Consulting lawyers or friends secretly',
      ],
    },
    {
      id: 'gaslighted-partner',
      type: 'Gaslighted Partner',
      traits: ['confused', 'doubting themselves', 'desperate to believe', 'deteriorating'],
      relationshipTypes: ['Spouse', 'Partner', 'Victim'],
      secretHints: [
        'Starting to trust their instincts',
        'Someone is helping them see the truth',
        'Breaking point approaching',
      ],
    },
    {
      id: 'partner-in-denial',
      type: 'Partner in Denial',
      traits: ['willfully blind', 'overcompensating', 'fragile', 'performative'],
      relationshipTypes: ['Spouse', 'Partner', 'Fiance'],
      secretHints: [
        'Knows deep down but can\'t face it',
        'Invested too much to walk away',
        'Waiting for undeniable proof',
      ],
    },
    {
      id: 'planning-exit-partner',
      type: 'Partner Planning Exit',
      traits: ['calm', 'detached', 'strategic', 'secretly grieving'],
      relationshipTypes: ['Spouse', 'Partner', 'Soon-to-be Ex'],
      secretHints: [
        'Already talking to lawyers',
        'Moving money quietly',
        'Waiting for the right moment',
      ],
    },

    // === MANIPULATOR ARCHETYPES (8) ===
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
      id: 'blackmailer',
      type: 'The Blackmailer',
      traits: ['patient', 'opportunistic', 'greedy', 'calculating'],
      relationshipTypes: ['Former Employee', 'Witness', 'Acquaintance'],
      secretHints: [
        'Has evidence of something damaging',
        'Testing how much they can extract',
        'Has other targets too',
      ],
    },
    {
      id: 'gaslighter',
      type: 'The Gaslighter',
      traits: ['charming', 'manipulative', 'denial expert', 'makes others doubt reality'],
      relationshipTypes: ['Partner', 'Colleague', 'Friend'],
      secretHints: [
        'Has done this to others before',
        'Believes their own lies sometimes',
        'Will never admit fault',
      ],
    },
    {
      id: 'two-faced-friend',
      type: 'Two-Faced Friend',
      traits: ['supportive to face', 'undermining behind back', 'jealous', 'competitive'],
      relationshipTypes: ['Friend', 'Colleague', 'Neighbor'],
      secretHints: [
        'Sabotaging the player\'s relationships',
        'Spreading rumors while playing innocent',
        'Wants what the player has',
      ],
    },
    {
      id: 'corporate-saboteur',
      type: 'Corporate Saboteur',
      traits: ['professional', 'ambitious', 'ruthless', 'well-connected'],
      relationshipTypes: ['Colleague', 'Competitor', 'Industry Contact'],
      secretHints: [
        'Being paid or incentivized to undermine',
        'Has connections to the player\'s enemies',
        'Playing a long game',
      ],
    },
    {
      id: 'charming-liar',
      type: 'Charming Liar',
      traits: ['charismatic', 'believable', 'pathological', 'always has an excuse'],
      relationshipTypes: ['Friend', 'Partner', 'Colleague'],
      secretHints: [
        'Their whole backstory is fabricated',
        'Has left a trail of burned bridges',
        'Believes their own lies',
      ],
    },
    {
      id: 'the-user',
      type: 'The User',
      traits: ['needy', 'grateful', 'always in crisis', 'never reciprocating'],
      relationshipTypes: ['Friend', 'Relative', 'Colleague'],
      secretHints: [
        'Every crisis is manufactured or exaggerated',
        'Has burned through other helpers',
        'Takes advantage of kindness deliberately',
      ],
    },
    {
      id: 'information-broker',
      type: 'Information Broker',
      traits: ['connected', 'neutral', 'transactional', 'dangerous to cross'],
      relationshipTypes: ['Acquaintance', 'Fixer', 'Contact'],
      secretHints: [
        'Knows secrets about everyone',
        'Will sell information to the highest bidder',
        'Has leverage on powerful people',
      ],
    },

    // === PAST CONNECTIONS (6) ===
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
      id: 'bitter-ex',
      type: 'Bitter Ex',
      traits: ['resentful', 'vocal', 'destructive', 'unable to move on'],
      relationshipTypes: ['Ex-Spouse', 'Ex-Partner', 'Former Lover'],
      secretHints: [
        'Still in love underneath the anger',
        'Would rather destroy than let go',
        'Has been telling others damaging things',
      ],
    },
    {
      id: 'childhood-sweetheart',
      type: 'Childhood Sweetheart',
      traits: ['nostalgic', 'idealized', 'unchanged in some ways', 'represents road not taken'],
      relationshipTypes: ['First Love', 'High School Sweetheart', 'Hometown Flame'],
      secretHints: [
        'Never fully got over the player',
        'Life didn\'t turn out as planned',
        'Reconnecting awakens old feelings',
      ],
    },
    {
      id: 'former-best-friend',
      type: 'Former Best Friend',
      traits: ['knowing', 'complicated', 'carrying old wounds', 'potential ally or enemy'],
      relationshipTypes: ['Former Best Friend', 'Estranged Friend', 'Old Confidant'],
      secretHints: [
        'The falling out was never resolved',
        'Knows the player\'s deepest secrets',
        'Has changed in unexpected ways',
      ],
    },
    {
      id: 'old-flames-new-spouse',
      type: 'Old Flame\'s New Spouse',
      traits: ['curious', 'competitive', 'insecure', 'watchful'],
      relationshipTypes: ['Ex\'s Current Partner', 'New Spouse of Former Lover'],
      secretHints: [
        'Sees the player as a threat',
        'Knows their partner isn\'t fully over it',
        'Looking for reasons to be suspicious',
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

    // === POWER DYNAMICS (5) ===
    {
      id: 'boss-with-leverage',
      type: 'Boss with Leverage',
      traits: ['powerful', 'knowing', 'demanding', 'holding something over the player'],
      relationshipTypes: ['Boss', 'Supervisor', 'Board Member'],
      secretHints: [
        'Knows about something the player wants hidden',
        'Using professional power for personal gain',
        'Has destroyed others who didn\'t comply',
      ],
    },
    {
      id: 'wealthy-benefactor',
      type: 'Wealthy Benefactor',
      traits: ['generous', 'strings-attached', 'entitled', 'controlling'],
      relationshipTypes: ['Investor', 'Family Benefactor', 'Wealthy Friend'],
      secretHints: [
        'Expects things in return for generosity',
        'Has bought loyalty before',
        'Money comes with expectations',
      ],
    },
    {
      id: 'influential-connection',
      type: 'Influential Connection',
      traits: ['connected', 'powerful', 'transactional', 'dangerous'],
      relationshipTypes: ['Political Contact', 'Industry Leader', 'Power Broker'],
      secretHints: [
        'Can open doors or close them',
        'Favors always come due',
        'Has ruined others who disappointed them',
      ],
    },
    {
      id: 'person-who-owes-you',
      type: 'Person Who Owes You',
      traits: ['indebted', 'resentful', 'obligated', 'looking for exit'],
      relationshipTypes: ['Former Colleague', 'Friend', 'Family Member'],
      secretHints: [
        'Hates being in debt to the player',
        'Looking for ways to even the score',
        'Might flip if given the chance',
      ],
    },
    {
      id: 'silent-witness',
      type: 'Silent Witness',
      traits: ['observant', 'quiet', 'overlooked', 'knows more than they should'],
      relationshipTypes: ['Assistant', 'Service Worker', 'Neighbor'],
      secretHints: [
        'Has seen things they shouldn\'t have',
        'Could help or harm with what they know',
        'Waiting to see how to use the information',
      ],
    },
  ],

  // ============================================================================
  // UNFILTERED (Crazy) - Based on adult content trends research
  // Obsession, cheating fantasies, exploration, taboo, roleplay
  // ============================================================================
  'unfiltered': [
    // === OBSESSION ARCHETYPES (6) ===
    {
      id: 'obsessed-lover',
      type: 'Obsessed Lover',
      traits: ['possessive', 'intense', 'tracking', 'will not let go'],
      relationshipTypes: ['Lover', 'Affair Partner', 'Ex Who Won\'t Move On'],
      secretHints: [
        'Has been following the player\'s movements',
        'Keeps mementos and records everything',
        'Would rather destroy than lose them',
      ],
    },
    {
      id: 'possessive-ex',
      type: 'Possessive Ex',
      traits: ['jealous', 'stalking', 'unable to accept it\'s over', 'dangerous'],
      relationshipTypes: ['Ex-Partner', 'Ex-Spouse', 'Former Lover'],
      secretHints: [
        'Still considers the player theirs',
        'Sabotaging new relationships',
        'Escalating behavior over time',
      ],
    },
    {
      id: 'secret-admirer-gone-wrong',
      type: 'Secret Admirer Gone Wrong',
      traits: ['hidden', 'fixated', 'building fantasies', 'delusional'],
      relationshipTypes: ['Coworker', 'Neighbor', 'Acquaintance'],
      secretHints: [
        'Has been watching for longer than anyone knows',
        'Built an entire fantasy relationship in their head',
        'Believes the player is sending them signals',
      ],
    },
    {
      id: 'stalker-fan',
      type: 'Stalker Fan',
      traits: ['devoted', 'unhinged', 'knows too much', 'feels entitled'],
      relationshipTypes: ['Fan', 'Follower', 'Online Admirer'],
      secretHints: [
        'Knows the player\'s schedule and routines',
        'Believes they have a special connection',
        'Will not take no for an answer',
      ],
    },
    {
      id: 'jealous-collector',
      type: 'Jealous Collector',
      traits: ['wealthy', 'entitled', 'treats people as possessions', 'competitive'],
      relationshipTypes: ['Wealthy Suitor', 'Patron', 'Benefactor'],
      secretHints: [
        'Has "collected" others before',
        'Doesn\'t handle rejection well',
        'Will buy or destroy what they want',
      ],
    },
    {
      id: 'toxic-lover',
      type: 'Toxic Lover',
      traits: ['intoxicating', 'destructive', 'addictive', 'using sex as control'],
      relationshipTypes: ['Lover', 'Ex', 'Affair', 'Obsession'],
      secretHints: [
        'Uses intimacy as a weapon and reward',
        'Has destroyed others before the player',
        'Will not let go without consequences',
      ],
    },

    // === CHEATING/CUCKOLD FANTASY ARCHETYPES (8) - Based on research trends ===
    {
      id: 'hotwife-hothusband',
      type: 'Hotwife/Hot Husband',
      traits: ['adventurous', 'open', 'confident', 'exploring boundaries'],
      relationshipTypes: ['Spouse', 'Partner', 'Open Marriage Partner'],
      secretHints: [
        'Wants permission to explore outside marriage',
        'Has fantasies about being watched',
        'Testing if partner is open-minded',
      ],
    },
    {
      id: 'willing-cuckold',
      type: 'The Willing Cuckold',
      traits: ['submissive', 'aroused by jealousy', 'devoted', 'complex desires'],
      relationshipTypes: ['Spouse', 'Partner', 'Long-term Partner'],
      secretHints: [
        'Gets aroused by partner being with others',
        'Wants to watch or hear about it',
        'Shame mixed with intense desire',
      ],
    },
    {
      id: 'homewrecker',
      type: 'The Homewrecker',
      traits: ['predatory', 'targeting married people', 'thrilled by forbidden', 'no remorse'],
      relationshipTypes: ['Affair Partner', 'Seducer', 'Other Woman/Man'],
      secretHints: [
        'Specifically targets people in relationships',
        'Gets off on the forbidden nature',
        'Has broken up marriages before',
      ],
    },
    {
      id: 'office-affair',
      type: 'Office Affair',
      traits: ['risky', 'intense', 'hiding in plain sight', 'professional by day'],
      relationshipTypes: ['Coworker', 'Boss', 'Employee', 'Client'],
      secretHints: [
        'The thrill of getting caught adds excitement',
        'Has been noticed by others',
        'Power dynamics make it complicated',
      ],
    },
    {
      id: 'cheating-spouse',
      type: 'Cheating Spouse',
      traits: ['guilty', 'addicted to thrill', 'compartmentalizing', 'risking everything'],
      relationshipTypes: ['Spouse', 'Partner', 'Married Lover'],
      secretHints: [
        'Can\'t stop despite the risks',
        'Living a double life',
        'Close calls only add to excitement',
      ],
    },
    {
      id: 'the-bull',
      type: 'The Bull/Vixen',
      traits: ['dominant', 'confident', 'sexually powerful', 'takes what they want'],
      relationshipTypes: ['Affair Partner', 'Third Party', 'Dominant Lover'],
      secretHints: [
        'Has done this with other couples',
        'Enjoys the power dynamic',
        'Knows exactly what they\'re doing',
      ],
    },
    {
      id: 'swinger-contact',
      type: 'Swinger Contact',
      traits: ['experienced', 'open-minded', 'discreet', 'community connected'],
      relationshipTypes: ['Lifestyle Contact', 'Club Connection', 'Open Couple'],
      secretHints: [
        'Part of a larger community',
        'Has seen and done everything',
        'Knows how to keep secrets',
      ],
    },
    {
      id: 'caught-cheater',
      type: 'The Caught Cheater',
      traits: ['exposed', 'desperate', 'bargaining', 'will do anything'],
      relationshipTypes: ['Spouse', 'Partner', 'Exposed Affair'],
      secretHints: [
        'Evidence is out there',
        'Willing to make deals to keep it quiet',
        'More secrets than just the affair',
      ],
    },

    // === LGBTQ+ EXPLORATION ARCHETYPES (6) - Based on research trends ===
    {
      id: 'bicurious-friend',
      type: 'Bicurious Friend',
      traits: ['questioning', 'attracted', 'nervous', 'wanting to experiment'],
      relationshipTypes: ['Friend', 'Colleague', 'Gym Buddy'],
      secretHints: [
        'Has been having thoughts they can\'t explain',
        'Attracted to the player specifically',
        'Looking for a safe person to explore with',
      ],
    },
    {
      id: 'closeted-colleague',
      type: 'Closeted Colleague',
      traits: ['hiding', 'careful', 'intense when private', 'compartmentalized'],
      relationshipTypes: ['Coworker', 'Professional Contact', 'Business Partner'],
      secretHints: [
        'Living a double life',
        'Can\'t be out due to career/family',
        'Looking for discreet connection',
      ],
    },
    {
      id: 'first-experiment',
      type: 'First Experiment',
      traits: ['curious', 'inexperienced', 'excited', 'vulnerable'],
      relationshipTypes: ['New Connection', 'App Match', 'Interested Party'],
      secretHints: [
        'Never done this before',
        'Might catch feelings',
        'Processing their identity',
      ],
    },
    {
      id: 'openly-fluid',
      type: 'Openly Fluid',
      traits: ['confident', 'experienced', 'non-judgmental', 'guide potential'],
      relationshipTypes: ['Friend', 'Mentor', 'Experienced Partner'],
      secretHints: [
        'Has helped others explore before',
        'Knows the community',
        'Attracted to the curious',
      ],
    },
    {
      id: 'questioning-spouse',
      type: 'Questioning Spouse',
      traits: ['confused', 'suppressed desires', 'married but unfulfilled', 'scared'],
      relationshipTypes: ['Spouse', 'Partner', 'Married Friend'],
      secretHints: [
        'Married the "right" person but wrong gender',
        'Desires they\'ve pushed down for years',
        'Reaching a breaking point',
      ],
    },
    {
      id: 'lgbtq-awakening',
      type: 'LGBTQ+ Awakening',
      traits: ['late bloomer', 'intense feelings', 'life-changing realization', 'passionate'],
      relationshipTypes: ['New Interest', 'Catalyst Person', 'Awakening'],
      secretHints: [
        'Everything suddenly makes sense',
        'Willing to risk everything for authenticity',
        'Intense because it\'s new and true',
      ],
    },

    // === MATURE/MILF/DILF ARCHETYPES (6) - Based on research trends ===
    {
      id: 'experienced-seducer',
      type: 'Experienced Seducer',
      traits: ['confident', 'knows what they want', 'skilled', 'selective'],
      relationshipTypes: ['Older Lover', 'Mentor Figure', 'Sophisticated Interest'],
      secretHints: [
        'Has done this many times before',
        'Knows exactly how to get what they want',
        'Looking for someone worth their time',
      ],
    },
    {
      id: 'cougar-silver-fox',
      type: 'Cougar/Silver Fox',
      traits: ['attractive older', 'confident', 'financially stable', 'seeking youth'],
      relationshipTypes: ['Older Love Interest', 'Wealthy Older', 'Distinguished Admirer'],
      secretHints: [
        'Attracted to younger energy',
        'Can offer things others can\'t',
        'Looking for excitement, not commitment',
      ],
    },
    {
      id: 'sugar-parent',
      type: 'Sugar Parent',
      traits: ['wealthy', 'generous', 'expects arrangement', 'transactional'],
      relationshipTypes: ['Benefactor', 'Wealthy Patron', 'Arrangement Partner'],
      secretHints: [
        'Exchanges money/gifts for companionship or more',
        'Has done this before with others',
        'Clear about expectations',
      ],
    },
    {
      id: 'neighbor-milf-dilf',
      type: 'Attractive Neighbor (MILF/DILF)',
      traits: ['next door', 'unavailable but interested', 'domestic but desires', 'convenient'],
      relationshipTypes: ['Neighbor', 'Parent at School', 'Local Married Person'],
      secretHints: [
        'Marriage is unfulfilling',
        'Has been watching the player',
        'Proximity makes it convenient and dangerous',
      ],
    },
    {
      id: 'friends-hot-parent',
      type: 'Friend\'s Attractive Parent',
      traits: ['forbidden', 'attractive', 'experienced', 'taboo'],
      relationshipTypes: ['Friend\'s Mother', 'Friend\'s Father', 'Parent Figure'],
      secretHints: [
        'The attraction is mutual and obvious',
        'Has thought about it more than appropriate',
        'Ultimate forbidden fantasy',
      ],
    },
    {
      id: 'gilf-experience',
      type: 'GILF Experience',
      traits: ['much older', 'experienced', 'no inhibitions', 'surprising'],
      relationshipTypes: ['Older Admirer', 'Experienced Elder', 'Unexpected Connection'],
      secretHints: [
        'Age has removed all inhibitions',
        'Knows things younger people don\'t',
        'Looking for passion, not games',
      ],
    },

    // === ROLEPLAY PROFESSION ARCHETYPES (6) - Based on research trends ===
    {
      id: 'boss-crosses-lines',
      type: 'Boss Who Crosses Lines',
      traits: ['powerful', 'inappropriate', 'using position', 'entitled'],
      relationshipTypes: ['Boss', 'CEO', 'Executive', 'Manager'],
      secretHints: [
        'Uses power for personal gratification',
        'Has done this before with others',
        'Rewards compliance, punishes rejection',
      ],
    },
    {
      id: 'seductive-employee',
      type: 'Seductive Employee',
      traits: ['ambitious', 'using attraction', 'willing to trade', 'calculating'],
      relationshipTypes: ['Employee', 'Assistant', 'Subordinate'],
      secretHints: [
        'Knows their attractiveness is an asset',
        'Willing to use it to advance',
        'More strategic than they appear',
      ],
    },
    {
      id: 'professor-favorites',
      type: 'Professor with Favorites',
      traits: ['intellectual', 'power dynamic', 'mentorship blur', 'inappropriate'],
      relationshipTypes: ['Professor', 'Teacher', 'Academic Mentor'],
      secretHints: [
        'Has had relationships with students before',
        'Uses grades or opportunities as leverage',
        'Believes it\'s mutual attraction',
      ],
    },
    {
      id: 'personal-driver',
      type: 'Personal Driver',
      traits: ['service role', 'sees everything', 'discreet', 'available'],
      relationshipTypes: ['Driver', 'Chauffeur', 'Personal Staff'],
      secretHints: [
        'Knows all the secrets from backseat conversations',
        'Available at intimate hours',
        'The help has needs too',
      ],
    },
    {
      id: 'service-worker-fantasy',
      type: 'Service Worker Fantasy',
      traits: ['in your home', 'physical work', 'service role', 'unexpected chemistry'],
      relationshipTypes: ['Plumber', 'Pool Cleaner', 'Contractor', 'Delivery Person'],
      secretHints: [
        'Classic fantasy scenario come to life',
        'The alone-in-house situation',
        'Tips aren\'t the only payment',
      ],
    },
    {
      id: 'uniform-fetish',
      type: 'Uniform Figure',
      traits: ['authority figure', 'uniform appeal', 'power dynamic', 'accessible'],
      relationshipTypes: ['Police Officer', 'Firefighter', 'Military', 'Security'],
      secretHints: [
        'The uniform adds to the attraction',
        'Authority and physicality combined',
        'Fantasy meets reality',
      ],
    },

    // === TABOO/FORBIDDEN ARCHETYPES (3) ===
    {
      id: 'step-relationship',
      type: 'Step-Relationship',
      traits: ['not blood but family', 'forbidden', 'living together', 'tension'],
      relationshipTypes: ['Step-Sibling', 'Step-Parent', 'Step-Child (adult)'],
      secretHints: [
        'The family dynamic makes it wrong but exciting',
        'Started as innocent and escalated',
        'Nobody can ever know',
      ],
    },
    {
      id: 'age-gap-fantasy',
      type: 'Significant Age Gap',
      traits: ['experience vs youth', 'power imbalance', 'different worlds', 'intense'],
      relationshipTypes: ['Much Older Partner', 'Much Younger Interest', 'Generational Gap'],
      secretHints: [
        'The age difference is part of the appeal',
        'Society would judge but they don\'t care',
        'Different things to offer each other',
      ],
    },
    {
      id: 'power-imbalance',
      type: 'Power Imbalance Fantasy',
      traits: ['unequal power', 'dependency', 'control dynamics', 'complicated consent'],
      relationshipTypes: ['Authority Figure', 'Dependent', 'Controller/Controlled'],
      secretHints: [
        'Power is part of the attraction',
        'Lines between choice and pressure blur',
        'The dynamic itself is the fantasy',
      ],
    },

    // === ADDITIONAL DANGEROUS/CRIMINAL ARCHETYPES (5) ===
    {
      id: 'blackmailer-extreme',
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
      traits: ['powerful', 'above the law', 'uses position', 'vengeful'],
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
      traits: ['competitive', 'ruthless', 'aggressive', 'dominant'],
      relationshipTypes: ['Competitor', 'Former Partner', 'Enemy'],
      secretHints: [
        'Wants to dominate the player in every way',
        'Will use seduction or destruction',
        'Sees this as a game they must win',
      ],
    },
    {
      id: 'criminal-connection',
      type: 'Criminal Connection',
      traits: ['dangerous', 'useful', 'violent potential', 'transactional'],
      relationshipTypes: ['Dealer', 'Fixer', 'Criminal Associate'],
      secretHints: [
        'Can solve problems others can\'t',
        'Everything has a price',
        'Getting out is harder than getting in',
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
 * Select multiple unique random personas for a given count
 * Ensures no repeating personas until all are used, then cycles with variations
 */
export function selectUniquePersonas(rating: ContentRating, count: number): PersonaTemplate[] {
  const pool = [...PERSONA_POOLS[rating]];
  const selected: PersonaTemplate[] = [];

  // Shuffle the pool
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  // First pass: use each persona once
  for (let i = 0; i < Math.min(count, pool.length); i++) {
    selected.push(pool[i]);
  }

  // If we need more personas than the pool has, cycle through with randomized backstory hints
  while (selected.length < count) {
    // Reshuffle for the next round
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    for (let i = 0; i < pool.length && selected.length < count; i++) {
      // Create a variation with a different backstory hint
      const base = pool[i];
      const hintIndex = Math.floor(Math.random() * base.backstoryHints.length);
      selected.push({
        ...base,
        id: `${base.id}-${selected.length}`,
        backstoryHints: [
          base.backstoryHints[hintIndex],
          ...base.backstoryHints.filter((_, idx) => idx !== hintIndex),
        ],
      });
    }
  }

  return selected;
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

/**
 * Stat modifiers based on persona traits
 * Maps traits to stat influences (positive or negative)
 */
const TRAIT_STAT_MODIFIERS: Record<string, Partial<Record<'family' | 'career' | 'wealth' | 'mental' | 'reputation', number>>> = {
  // Positive career/wealth traits
  'hardworking': { career: 15, wealth: 10 },
  'competitive': { career: 10, mental: -5 },
  'driven': { career: 15, family: -10 },
  'ambitious': { career: 20, wealth: 10, family: -5 },
  'successful': { career: 25, wealth: 20, reputation: 15 },
  'capable': { career: 10, reputation: 5 },
  'strategic': { career: 15, wealth: 10 },
  'efficient': { career: 10, wealth: 5 },
  'resourceful': { career: 5, wealth: 5 },
  'talented': { career: 10, reputation: 10 },

  // Positive family traits
  'nurturing': { family: 20, mental: 5 },
  'protective': { family: 15 },
  'loving': { family: 20, mental: 10 },
  'loyal': { family: 15, reputation: 5 },
  'supportive': { family: 15, mental: 5 },
  'patient': { family: 10, mental: 5 },
  'empathetic': { family: 10, mental: 5 },
  'compassionate': { family: 15, mental: 5 },
  'devoted': { family: 20 },
  'steady': { family: 10, mental: 10 },

  // Positive mental traits
  'optimistic': { mental: 20, family: 5 },
  'hopeful': { mental: 15 },
  'resilient': { mental: 15 },
  'calm': { mental: 15 },
  'balanced': { mental: 20, family: 5 },
  'inspiring': { mental: 10, reputation: 10 },

  // Positive reputation traits
  'respected': { reputation: 20, career: 10 },
  'admired': { reputation: 15 },
  'generous': { reputation: 10, wealth: -5 },
  'honest': { reputation: 15 },
  'charming': { reputation: 10, career: 5 },
  'magnetic': { reputation: 15 },
  'charismatic': { reputation: 20 },

  // Negative/challenging traits
  'perfectionist': { career: 10, mental: -15 },
  'overbearing': { family: -10 },
  'sometimes overbearing': { family: -5 },
  'naive': { wealth: -10, reputation: -5 },
  'impractical': { wealth: -15, career: -5 },
  'sensitive': { mental: -10 },
  'easily hurt': { mental: -15 },
  'selfless': { wealth: -10, family: 10 },
  'tired': { mental: -15 },
  'exhausted': { mental: -20 },
  'conflict-avoidant': { mental: -5, family: 5 },
  'avoidant': { mental: -10 },
  'overlooked': { reputation: -10, career: -5 },
  'uncertain': { mental: -10 },
  'burdened': { mental: -15 },
  'stressed': { mental: -20 },
  'insecure': { mental: -15, reputation: -5 },
  'sometimes forgotten': { reputation: -5, family: -5 },
  'sometimes obsessive': { mental: -10 },
  'pressured': { mental: -15 },
  'conflicted': { mental: -10 },
  'restless': { mental: -10 },
  'scattered': { career: -5, mental: -5 },
  'guarded': { family: -10 },
  'wary': { family: -5, mental: -5 },

  // Negative mental/family traits
  'nostalgic': { mental: -5 },
  'questioning': { mental: -10 },
  'paranoid': { mental: -20, family: -10 },
  'guilty': { mental: -15 },
  'compartmentalized': { mental: -10 },
  'controlled': { mental: -5, family: -5 },
  'bitter': { mental: -15, family: -10 },
  'proud': { reputation: 5, family: -5 },
  'desperate': { mental: -20, wealth: -10 },
  'rebellious': { reputation: -5, family: -10 },
  'torn': { mental: -15 },
  'haunted': { mental: -20 },
  'trying': { mental: -5 },
  'defensive': { mental: -10, family: -5 },
  'vulnerable': { mental: -15 },
  'resentful': { mental: -15, family: -15 },
  'suspicious': { mental: -10, family: -10 },
  'hurt': { mental: -15 },
  'seeking closure': { mental: -10 },
  'regretful': { mental: -15 },
  'desperate to connect': { mental: -10, family: -5 },
  'sad': { mental: -20 },

  // Morally gray/dark traits
  'calculating': { wealth: 10, family: -10 },
  'adaptable': { career: 5 },
  'untrustworthy': { reputation: -20, family: -15 },
  'impulsive': { mental: -10, wealth: -15 },
  'searching': { mental: -10 },
  'reckless': { wealth: -15, mental: -10 },
  'lonely': { family: -20, mental: -15 },
  'yearning': { mental: -10 },
  'codependent': { family: -10, mental: -15 },
  'loyal to a fault': { family: 5, mental: -10 },
  'in denial': { mental: -15 },
  'envious': { mental: -10 },
  'obsessive': { mental: -15 },
  'numb': { mental: -20 },
  'lost': { mental: -20, career: -10 },
  'irritable': { family: -10, mental: -10 },
  'superficial': { reputation: 5, family: -10 },
  'principled': { reputation: 10, career: -5 },
  'scared': { mental: -15 },
  'isolated': { family: -20, mental: -15 },
  'determined': { career: 10, mental: 5 },
  'attentive': { family: 5 },
  'aggressive': { reputation: -10, family: -10 },
  'territorial': { family: -5 },
  'threatened': { mental: -15 },
  'intense': { mental: -5, family: -5 },
  'idealistic': { mental: 5, wealth: -5 },
  'boundary-blind': { family: -15, reputation: -10 },
  'changed': { mental: -15 },
  'disconnected': { family: -20, mental: -15 },
  'hypervigilant': { mental: -20 },
  'struggling': { mental: -15, wealth: -10 },

  // Unfiltered/dark traits
  'selfish': { family: -20, reputation: -10 },
  'seductive': { reputation: 5 },
  'ruthless': { career: 15, family: -20, reputation: -10 },
  'narcissistic': { mental: -5, family: -15 },
  'cold': { family: -20 },
  'morally flexible': { wealth: 10, reputation: -15 },
  'possessive': { family: -15 },
  'unstable': { mental: -25 },
  'dominant': { career: 10, family: -10 },
  'wealthy': { wealth: 30 },
  'controlling': { family: -15 },
  'insatiable': { mental: -15 },
  'delusional': { mental: -20 },
  'dangerous': { reputation: -15 },
  'consumed': { mental: -20 },
  'methodical': { career: 5 },
  'hollow': { mental: -25 },
  'feared': { reputation: -10, career: 10 },
  'empty': { mental: -25 },
  'calculated': { career: 10, family: -10 },
  'once-good': { mental: -10 },
  'corrupted': { reputation: -20, mental: -15 },
  'tragic': { mental: -20 },
  'unpredictable': { mental: -15 },
  'anarchic': { reputation: -15 },
  'destructive': { family: -20, wealth: -15 },
  'entitled': { reputation: -10, family: -5 },
  'secretly broken': { mental: -20 },
  'businesslike': { career: 10, family: -10 },
  'amoral': { reputation: -20 },
  'deadly': { reputation: -15 },
  'slick': { reputation: 5, wealth: 10 },
  'corruptive': { reputation: -15 },
  'indispensable': { career: 15 },
  'conquesting': { reputation: -10 },
  'shallow': { family: -15, mental: -5 },
  'protected': { reputation: -5, wealth: 10 },
  'cruel': { family: -20, reputation: -15 },
  'sophisticated': { wealth: 10, reputation: 5 },
  'vengeful': { mental: -15, family: -10 },
  'wounded': { mental: -15 },
  'invisible': { reputation: -10 },
  'brilliant': { career: 15 },
  'fanatical': { mental: -15 },
  'righteous': { reputation: -5 },
};

/**
 * Difficulty modifiers for base stats
 */
const DIFFICULTY_BASE_STATS: Record<'realistic' | 'dramatic' | 'crazy', {
  base: number;
  variance: number;
  minFloor: number;
  maxCeiling: number;
}> = {
  // Realistic: Higher base stats, less variance - more stable starting point
  realistic: { base: 60, variance: 15, minFloor: 40, maxCeiling: 85 },
  // Dramatic: Medium base stats, higher variance - more drama potential
  dramatic: { base: 50, variance: 20, minFloor: 25, maxCeiling: 80 },
  // Crazy: Lower base stats, highest variance - chaotic starting conditions
  crazy: { base: 40, variance: 30, minFloor: 10, maxCeiling: 90 },
};

/**
 * Generate starting stats based on persona traits and difficulty level
 */
export function generatePersonaStats(
  persona: PersonaTemplate,
  difficulty: 'realistic' | 'dramatic' | 'crazy'
): { familyHarmony: number; careerStanding: number; wealth: number; mentalHealth: number; reputation: number } {
  const config = DIFFICULTY_BASE_STATS[difficulty];

  // Start with base values plus random variance
  const randomVariance = () => Math.floor((Math.random() - 0.5) * 2 * config.variance);

  let family = config.base + randomVariance();
  let career = config.base + randomVariance();
  let wealth = config.base + randomVariance();
  let mental = config.base + randomVariance();
  let reputation = config.base + randomVariance();

  // Apply trait modifiers
  for (const trait of persona.traits) {
    const lowerTrait = trait.toLowerCase();
    const modifier = TRAIT_STAT_MODIFIERS[lowerTrait];
    if (modifier) {
      if (modifier.family) family += modifier.family;
      if (modifier.career) career += modifier.career;
      if (modifier.wealth) wealth += modifier.wealth;
      if (modifier.mental) mental += modifier.mental;
      if (modifier.reputation) reputation += modifier.reputation;
    }
  }

  // Clamp values to valid range
  const clamp = (val: number) => Math.max(config.minFloor, Math.min(config.maxCeiling, val));

  return {
    familyHarmony: clamp(family),
    careerStanding: clamp(career),
    wealth: clamp(wealth),
    mentalHealth: clamp(mental),
    reputation: clamp(reputation),
  };
}
