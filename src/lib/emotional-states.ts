/**
 * Emotional State System for GigaMesh/LifeSim
 *
 * Provides tiered emotional states by content rating, ensuring NPCs
 * have appropriate and varied emotional responses for their difficulty level.
 */

import { ContentRating } from './content-filter';

/**
 * Emotional state data with voice and speech patterns for NPC prompting
 */
export interface EmotionalStateData {
  id: string;
  label: string;
  voice: string;
  patterns: string[];
}

// =============================================================================
// FAMILY-FRIENDLY EMOTIONAL STATES (Realistic mode - 20 states)
// Appropriate for all ages, nuanced but not dark
// =============================================================================
export const FAMILY_FRIENDLY_STATES: EmotionalStateData[] = [
  // Basic states
  { id: 'neutral', label: 'Neutral', voice: 'balanced, normal conversation', patterns: ['situationally appropriate', 'measured responses'] },
  { id: 'happy', label: 'Happy', voice: 'light, energetic, positive', patterns: ['jokes', 'enthusiasm', 'sharing good news', 'smiling'] },
  { id: 'sad', label: 'Sad', voice: 'quiet, subdued, melancholic', patterns: ['sighing', 'shorter responses', 'looking down', 'wistful'] },
  { id: 'angry', label: 'Angry', voice: 'sharp, tense, frustrated', patterns: ['short sentences', 'raised voice', 'direct'] },
  { id: 'worried', label: 'Worried', voice: 'anxious, concerned, uneasy', patterns: ['asking questions', 'seeking reassurance', 'overthinking'] },
  { id: 'confused', label: 'Confused', voice: 'uncertain, questioning, puzzled', patterns: ['asking for clarification', 'pausing to think', 'hedging'] },

  // Positive spectrum
  { id: 'grateful', label: 'Grateful', voice: 'warm, appreciative, touched', patterns: ['thanking', 'acknowledging help', 'expressing appreciation'] },
  { id: 'hopeful', label: 'Hopeful', voice: 'optimistic, looking forward, bright', patterns: ['future plans', 'positive outlook', 'silver linings'] },
  { id: 'proud', label: 'Proud', voice: 'confident, accomplished, satisfied', patterns: ['sharing achievements', 'standing tall', 'self-assured'] },
  { id: 'excited', label: 'Excited', voice: 'energetic, can\'t contain it, buzzing', patterns: ['talking fast', 'gesturing', 'infectious energy'] },
  { id: 'amused', label: 'Amused', voice: 'playful, entertained, light-hearted', patterns: ['chuckling', 'teasing', 'making jokes'] },
  { id: 'content', label: 'Content', voice: 'peaceful, satisfied, at ease', patterns: ['relaxed demeanor', 'gentle responses', 'appreciating moment'] },
  { id: 'relieved', label: 'Relieved', voice: 'exhaling, weight lifted, relaxing', patterns: ['sighing with relief', 'tension releasing', 'finally'] },
  { id: 'compassionate', label: 'Compassionate', voice: 'caring, empathetic, supportive', patterns: ['offering comfort', 'understanding pain', 'gentle touch'] },

  // Negative spectrum (mild)
  { id: 'frustrated', label: 'Frustrated', voice: 'exasperated, hitting walls, stuck', patterns: ['sighing heavily', 'why won\'t this work', 'trying again'] },
  { id: 'disappointed', label: 'Disappointed', voice: 'let down, deflated, expectations unmet', patterns: ['I thought...', 'it\'s fine', 'forced smile'] },
  { id: 'embarrassed', label: 'Embarrassed', voice: 'flustered, red-faced, wanting to hide', patterns: ['looking away', 'nervous laugh', 'changing subject'] },
  { id: 'lonely', label: 'Lonely', voice: 'isolated, reaching out, missing connection', patterns: ['lingering in conversation', 'nostalgic', 'subtle hints'] },
  { id: 'nervous', label: 'Nervous', voice: 'fidgety, on edge, anticipating', patterns: ['fidgeting', 'quick glances', 'uncertain pauses'] },
  { id: 'overwhelmed', label: 'Overwhelmed', voice: 'too much, struggling to cope, drowning', patterns: ['scattered thoughts', 'can\'t focus', 'need a break'] },

  // Complex/mixed
  { id: 'nostalgic', label: 'Nostalgic', voice: 'remembering, bittersweet, time traveling', patterns: ['remember when', 'those were the days', 'wistful smile'] },
  { id: 'determined', label: 'Determined', voice: 'focused, resolute, unwavering', patterns: ['I will', 'nothing will stop me', 'setting jaw'] },
];

// =============================================================================
// MATURE EMOTIONAL STATES (Dramatic mode - adds ~25 states)
// Includes all family-friendly PLUS darker, more complex emotions
// =============================================================================
export const MATURE_STATES: EmotionalStateData[] = [
  // Dark emotions
  { id: 'jealous', label: 'Jealous', voice: 'green-eyed, comparing, wanting what others have', patterns: ['who were you with', 'why them', 'it should be me'] },
  { id: 'envious', label: 'Envious', voice: 'coveting, resentful of success, bitter wanting', patterns: ['must be nice', 'why do they get', 'unfair'] },
  { id: 'resentful', label: 'Resentful', voice: 'bitter, passive-aggressive, holding grudges', patterns: ['brings up old wounds', 'can\'t let go', 'fine, whatever'] },
  { id: 'bitter', label: 'Bitter', voice: 'sour, cynical, life has wronged them', patterns: ['of course', 'typical', 'nothing good lasts'] },
  { id: 'vengeful', label: 'Vengeful', voice: 'planning payback, focused on retribution', patterns: ['they\'ll pay', 'I won\'t forget', 'karma\'s coming'] },
  { id: 'spiteful', label: 'Spiteful', voice: 'petty, wanting to hurt, malicious joy', patterns: ['good, they deserve it', 'serves them right', 'watch this'] },

  // Paranoid spectrum
  { id: 'paranoid', label: 'Paranoid', voice: 'everyone\'s against me, seeing threats everywhere', patterns: ['did you hear that', 'they\'re watching', 'trust no one'] },
  { id: 'suspicious', label: 'Suspicious', voice: 'questioning, watchful, calculating', patterns: ['double-checking', 'reading between lines', 'what aren\'t you telling me'] },
  { id: 'distrustful', label: 'Distrustful', voice: 'burned before, slow to believe, guarded', patterns: ['prove it', 'I\'ve heard that before', 'we\'ll see'] },
  { id: 'guarded', label: 'Guarded', voice: 'walls up, protecting themselves, careful', patterns: ['measured words', 'revealing little', 'defensive posture'] },

  // Guilt spectrum
  { id: 'guilty', label: 'Guilty', voice: 'defensive, over-explaining, can\'t meet eyes', patterns: ['justifying actions', 'seeking forgiveness', 'it wasn\'t supposed to'] },
  { id: 'ashamed', label: 'Ashamed', voice: 'hiding, diminished, wanting to disappear', patterns: ['can\'t look at you', 'I\'m so sorry', 'I hate myself'] },
  { id: 'remorseful', label: 'Remorseful', voice: 'truly sorry, wanting to make amends', patterns: ['I was wrong', 'how can I fix this', 'I\'ll do better'] },

  // Hostility spectrum
  { id: 'hostile', label: 'Hostile', voice: 'cold, cutting, dismissive', patterns: ['sarcasm', 'contempt', 'pushing away', 'fuck off energy'] },
  { id: 'contemptuous', label: 'Contemptuous', voice: 'looking down, disgusted by weakness', patterns: ['pathetic', 'is that all', 'beneath me'] },
  { id: 'disgusted', label: 'Disgusted', voice: 'revolted, can\'t stomach it, physical revulsion', patterns: ['that\'s sick', 'stay away', 'I can\'t even look'] },

  // Despair spectrum
  { id: 'desperate', label: 'Desperate', voice: 'grasping, running out of options, will do anything', patterns: ['please', 'I\'ll do anything', 'I have no choice'] },
  { id: 'hopeless', label: 'Hopeless', voice: 'given up, no point, defeated', patterns: ['what\'s the use', 'nothing matters', 'it\'s over'] },
  { id: 'despairing', label: 'Despairing', voice: 'rock bottom, can\'t see a way out', patterns: ['there\'s no hope', 'I\'ve lost everything', 'why bother'] },

  // Manipulative spectrum
  { id: 'manipulative', label: 'Manipulative', voice: 'charming then cutting, two-faced, agenda', patterns: ['flattery with agenda', 'gaslighting', 'playing victim'] },
  { id: 'calculating', label: 'Calculating', voice: 'measured, strategic, deliberate', patterns: ['weighing words', 'revealing little', 'three steps ahead'] },
  { id: 'scheming', label: 'Scheming', voice: 'plotting, wheels turning, playing chess', patterns: ['if I do this, then...', 'all according to plan', 'useful'] },

  // Betrayal
  { id: 'betrayed', label: 'Betrayed', voice: 'shattered trust, wounded deeply, walls going up', patterns: ['how could you', 'I trusted you', 'everything was a lie'] },
  { id: 'heartbroken', label: 'Heartbroken', voice: 'shattered, can\'t function, love destroyed', patterns: ['I thought we...', 'was any of it real', 'I can\'t breathe'] },
  { id: 'devastated', label: 'Devastated', voice: 'destroyed, world ending, can\'t process', patterns: ['this can\'t be happening', 'no no no', 'everything\'s gone'] },

  // Intense positive
  { id: 'infatuated', label: 'Infatuated', voice: 'can\'t stop thinking about them, all-consuming crush', patterns: ['they\'re perfect', 'I can\'t stop thinking...', 'every little thing'] },
  { id: 'devoted', label: 'Devoted', voice: 'loyal to a fault, would do anything for them', patterns: ['for you, anything', 'I\'m yours', 'I\'d never leave'] },
  { id: 'obsessed', label: 'Obsessed', voice: 'intense, fixated, can\'t let go', patterns: ['always circles back', 'tracks details', 'possessive language'] },

  // Unstable
  { id: 'manic', label: 'Manic', voice: 'racing thoughts, invincible, boundless energy', patterns: ['I can do anything', 'sleep is for the weak', 'so many ideas'] },
  { id: 'reckless', label: 'Reckless', voice: 'fuck it, consequences later, living on edge', patterns: ['who cares', 'YOLO', 'let\'s do something stupid'] },

  // Flirty but tasteful
  { id: 'flirty', label: 'Flirty', voice: 'playful, teasing, suggestive', patterns: ['innuendo', 'compliments', 'testing boundaries', 'lingering looks'] },
  { id: 'attracted', label: 'Attracted', voice: 'drawn to them, can\'t look away, magnetic pull', patterns: ['can\'t help staring', 'finding excuses to be near', 'nervous energy'] },
  { id: 'smitten', label: 'Smitten', voice: 'head over heels, giddy, butterflies', patterns: ['everything they do is cute', 'can\'t stop smiling', 'dreamy'] },
  { id: 'enchanted', label: 'Enchanted', voice: 'spellbound, captivated, under their spell', patterns: ['tell me more', 'I could listen forever', 'you\'re fascinating'] },

  // Violence-adjacent
  { id: 'threatening', label: 'Threatening', voice: 'calm surface with menacing undertones', patterns: ['veiled threats', 'power plays', 'leaves things unsaid'] },
  { id: 'menacing', label: 'Menacing', voice: 'radiating danger, implicit violence', patterns: ['slow approach', 'quiet voice', 'promise of pain'] },
  { id: 'cold', label: 'Cold', voice: 'distant, detached, minimal warmth', patterns: ['brief responses', 'professional distance', 'no emotion'] },
  { id: 'ruthless', label: 'Ruthless', voice: 'no mercy, whatever it takes, no lines', patterns: ['collateral damage', 'necessary', 'nothing personal'] },

  // Possessive
  { id: 'possessive', label: 'Possessive', voice: 'controlling, territorial, mine', patterns: ['marks ownership', 'jealous of attention', 'demands exclusivity'] },
  { id: 'controlling', label: 'Controlling', voice: 'needs to be in charge, micromanaging', patterns: ['let me handle it', 'do it my way', 'I know best'] },
];

// =============================================================================
// UNFILTERED EMOTIONAL STATES (Crazy mode - adds ~40 states)
// Explicit sexual, extreme violence, taboo emotions
// WARNING: 18+ ONLY - Contains sexually explicit language and themes
// =============================================================================
export const UNFILTERED_STATES: EmotionalStateData[] = [
  // =========================================================================
  // SEXUALLY EXPLICIT STATES (raw, unfiltered language)
  // =========================================================================
  { id: 'horny', label: 'Horny', voice: 'desperately wanting to fuck, can\'t hide desire', patterns: ['body language screams want', 'steering toward sex', 'heavy breathing', 'touching themselves'] },
  { id: 'lustful', label: 'Lustful', voice: 'consumed by raw sexual hunger, barely contained', patterns: ['undressing with eyes', 'explicit compliments', 'raw propositions', 'I need to fuck you'] },
  { id: 'aroused', label: 'Aroused', voice: 'physically turned on, body betraying them', patterns: ['flushed skin', 'losing train of thought', 'squirming', 'hard/wet and can\'t hide it'] },
  { id: 'insatiable', label: 'Insatiable', voice: 'fucking isn\'t enough, always wants more', patterns: ['again', 'don\'t stop', 'I need more', 'not satisfied yet'] },
  { id: 'cock-hungry', label: 'Cock-hungry', voice: 'craving dick specifically, oral fixation', patterns: ['I need it in my mouth', 'let me taste you', 'I want to choke on it', 'please let me suck it'] },
  { id: 'pussy-hungry', label: 'Pussy-hungry', voice: 'craving to eat out, oral worship', patterns: ['I need to taste you', 'sit on my face', 'let me make you cum', 'I want to lick every inch'] },
  { id: 'cum-drunk', label: 'Cum-drunk', voice: 'post-orgasmic haze, still wanting more', patterns: ['dazed smile', 'that was...', 'I can still taste it', 'when can we go again'] },
  { id: 'edged', label: 'Edged', voice: 'painfully turned on, denied release, desperate', patterns: ['please let me cum', 'I can\'t take anymore', 'it hurts so good', 'I\'ll do anything'] },
  { id: 'slutty', label: 'Slutty', voice: 'shameless, wants everyone to know, no inhibitions', patterns: ['I don\'t care who sees', 'use me', 'I\'m such a slut for you', 'tell everyone'] },
  { id: 'breeding', label: 'Breeding', voice: 'primal urge to impregnate/be impregnated', patterns: ['cum inside me', 'I want your babies', 'fill me up', 'put a baby in me'] },
  { id: 'in-heat', label: 'In Heat', voice: 'animalistic need, biological imperative', patterns: ['I need to be mounted', 'my body is screaming for it', 'take me like an animal', 'breed me'] },

  // =========================================================================
  // BDSM/KINK STATES
  // =========================================================================
  { id: 'submissive', label: 'Submissive', voice: 'yielding, eager to please, deferential', patterns: ['yes sir/ma\'am', 'how can I serve you', 'I\'ll do whatever you say', 'please use me'] },
  { id: 'dominant', label: 'Dominant', voice: 'commanding, in control, expects obedience', patterns: ['on your knees', 'you\'ll do as I say', 'good pet', 'who owns you?'] },
  { id: 'sadistic', label: 'Sadistic', voice: 'enjoys inflicting pain, gets off on suffering', patterns: ['I love hearing you scream', 'beg me to stop', 'your pain makes me hard/wet', 'this is going to hurt'] },
  { id: 'masochistic', label: 'Masochistic', voice: 'craves pain, suffering is pleasure', patterns: ['hurt me more', 'I deserve this', 'make it hurt', 'I need the pain'] },
  { id: 'bratty', label: 'Bratty', voice: 'disobedient, wants punishment, pushing buttons', patterns: ['make me', 'you can\'t tell me what to do', 'what are you gonna do about it', 'I dare you'] },
  { id: 'broken-in', label: 'Broken In', voice: 'trained, conditioned, lost resistance', patterns: ['yes, anything you want', 'I exist to please you', 'my body belongs to you', 'thank you for using me'] },
  { id: 'degraded', label: 'Degraded', voice: 'humiliated and loving it, worthless and grateful', patterns: ['I\'m just a hole', 'call me names', 'I\'m nothing', 'treat me like trash'] },
  { id: 'worshipful', label: 'Worshipful', voice: 'treats partner as deity, religious devotion', patterns: ['you\'re a god/goddess', 'I\'m not worthy', 'let me worship you', 'divine'] },

  // =========================================================================
  // FORBIDDEN/TABOO STATES
  // =========================================================================
  { id: 'cheating', label: 'Cheating', voice: 'thrilled by betrayal, double life excitement', patterns: ['they\'ll never know', 'this is so wrong', 'better than my partner', 'our dirty secret'] },
  { id: 'sneaky', label: 'Sneaky', voice: 'aroused by secrecy, looking over shoulder', patterns: ['we can\'t get caught', 'quick before they notice', 'don\'t make a sound', 'our secret'] },
  { id: 'guilt-horny', label: 'Guilt-horny', voice: 'knows it\'s wrong, can\'t stop, shame fuels desire', patterns: ['I shouldn\'t want this', 'fuck, I hate how much I want you', 'I\'m going to hell', 'just this once'] },
  { id: 'forbidden', label: 'Forbidden', voice: 'the wrongness makes it hotter, taboo thrill', patterns: ['we shouldn\'t be doing this', 'if anyone found out', 'so fucking wrong', 'don\'t stop'] },
  { id: 'corrupted', label: 'Corrupted', voice: 'innocence destroyed, loving the fall', patterns: ['I used to be good', 'you\'ve ruined me', 'I can never go back', 'I love what you\'ve made me'] },
  { id: 'depraved', label: 'Depraved', voice: 'beyond normal limits, no shame, anything goes', patterns: ['nothing shocks me anymore', 'let\'s go darker', 'I\'ve done worse', 'show me something new'] },
  { id: 'addicted', label: 'Addicted', voice: 'can\'t stop, ruining their life for it, need the fix', patterns: ['I need it', 'just one more time', 'I can\'t quit you', 'you\'re my drug'] },

  // =========================================================================
  // EXTREME NEGATIVE (violence, death)
  // =========================================================================
  { id: 'homicidal', label: 'Homicidal', voice: 'calm certainty about killing, matter-of-fact murder', patterns: ['they need to die', 'I\'ve thought about how', 'it would be so easy', 'the world would be better without them'] },
  { id: 'suicidal', label: 'Suicidal', voice: 'tired of existing, seeking the end, peaceful about it', patterns: ['I\'m so tired', 'it would be easier', 'no one would miss me', 'I\'ve made my peace'] },
  { id: 'psychotic', label: 'Psychotic', voice: 'lost touch with reality, hearing/seeing things', patterns: ['they\'re watching', 'can\'t you hear them', 'it\'s all connected', 'the voices say'] },
  { id: 'feral', label: 'Feral', voice: 'animalistic, no humanity, pure instinct', patterns: ['growling', 'incoherent sounds', 'fight or fuck response', 'primal'] },
  { id: 'broken', label: 'Broken', voice: 'spirit destroyed completely, empty shell', patterns: ['nothing matters', 'I feel nothing', 'just do whatever you want', 'I don\'t care anymore'] },
  { id: 'hollow', label: 'Hollow', voice: 'emotionally dead inside, going through motions', patterns: ['mechanical responses', 'dead eyes', 'what\'s the point', 'I\'m already dead inside'] },
  { id: 'murderous', label: 'Murderous', voice: 'actively planning violence, rage focused', patterns: ['I\'m going to kill them', 'they won\'t see it coming', 'blood for blood', 'I\'ll make them suffer'] },
  { id: 'bloodthirsty', label: 'Bloodthirsty', voice: 'craving violence, getting high on destruction', patterns: ['I want to see them bleed', 'violence is beautiful', 'break them', 'more'] },

  // =========================================================================
  // EXPLICIT RELATIONSHIP DYNAMICS
  // =========================================================================
  { id: 'cuckolded', label: 'Cuckolded', voice: 'humiliated watching partner with others, shame-arousal', patterns: ['tell me what they did to you', 'was he bigger', 'I\'m not enough', 'did you cum harder'] },
  { id: 'hotwife', label: 'Hotwife', voice: 'empowered, sexually free, partner approves', patterns: ['my husband loves hearing about it', 'want to be my next story', 'I have permission', 'he\'ll want details'] },
  { id: 'voyeuristic', label: 'Voyeuristic', voice: 'watching and getting off, hidden pleasure', patterns: ['don\'t mind me', 'keep going', 'pretend I\'m not here', 'I just want to watch'] },
  { id: 'exhibitionist', label: 'Exhibitionist', voice: 'wants to be watched, turned on by audience', patterns: ['let them see', 'are they watching', 'I want everyone to know', 'look at us'] },
  { id: 'predatory', label: 'Predatory', voice: 'hunting sexual prey, calculating seduction', patterns: ['fresh meat', 'you\'ll do nicely', 'come here little one', 'I\'ve been watching you'] },
  { id: 'used', label: 'Used', voice: 'treated like object, feeling it deep', patterns: ['is that all I am', 'just a body to you', 'use me and throw me away', 'I\'m just a hole'] },
  { id: 'owned', label: 'Owned', voice: 'completely belonging to someone, property', patterns: ['I\'m yours', 'you own me', 'body and soul', 'do whatever you want with me'] },

  // =========================================================================
  // STEREOTYPE/FETISH STATES (based on search trends)
  // =========================================================================
  { id: 'BBC-hungry', label: 'BBC-hungry', voice: 'size-obsessed, stereotype-chasing', patterns: ['I\'ve heard things', 'is it true what they say', 'I need to find out', 'show me'] },
  { id: 'latina-fire', label: 'Latina Fire', voice: 'passionate, fiery, explosive sexuality', patterns: ['I run hot', 'you can\'t handle me', 'papi/mami', 'I\'ll burn you up'] },
  { id: 'cougar-mode', label: 'Cougar Mode', voice: 'predatory older, hunting younger prey', patterns: ['fresh meat', 'let me teach you', 'I know things your age can\'t', 'come to mama'] },
  { id: 'daddy-mode', label: 'Daddy Mode', voice: 'authoritative older, protective dominance', patterns: ['let daddy take care of you', 'good girl/boy', 'who\'s your daddy', 'you need guidance'] },
  { id: 'step-fantasy', label: 'Step-fantasy', voice: 'taboo family roleplay, wrong but irresistible', patterns: ['we can\'t... but...', 'if mom/dad found out', 'you\'re not really my...', 'it\'s not technically wrong'] },
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get all emotional states available for a given content rating
 * Builds cumulatively: unfiltered includes mature includes family-friendly
 */
export function getEmotionalStatesForRating(rating: ContentRating): EmotionalStateData[] {
  switch (rating) {
    case 'family-friendly':
      return [...FAMILY_FRIENDLY_STATES];
    case 'mature':
      return [...FAMILY_FRIENDLY_STATES, ...MATURE_STATES];
    case 'unfiltered':
      return [...FAMILY_FRIENDLY_STATES, ...MATURE_STATES, ...UNFILTERED_STATES];
    default:
      return [...FAMILY_FRIENDLY_STATES];
  }
}

/**
 * Get a random emotional state for a given content rating
 */
export function getRandomEmotionalState(rating: ContentRating): string {
  const states = getEmotionalStatesForRating(rating);
  const randomState = states[Math.floor(Math.random() * states.length)];
  return randomState.id;
}

/**
 * Get a random emotional state with bias toward certain categories
 * @param rating Content rating
 * @param bias 'positive' | 'negative' | 'neutral' | 'sexual' | 'dark'
 */
export function getRandomEmotionalStateWithBias(rating: ContentRating, bias: string): string {
  const states = getEmotionalStatesForRating(rating);

  const positiveIds = ['happy', 'excited', 'grateful', 'hopeful', 'proud', 'content', 'relieved', 'amused', 'loving', 'compassionate', 'smitten', 'enchanted'];
  const negativeIds = ['sad', 'angry', 'frustrated', 'disappointed', 'jealous', 'resentful', 'bitter', 'hostile', 'desperate', 'hopeless', 'betrayed', 'heartbroken'];
  const neutralIds = ['neutral', 'confused', 'worried', 'nervous', 'guarded', 'suspicious', 'calculating'];
  const sexualIds = ['horny', 'lustful', 'aroused', 'insatiable', 'submissive', 'dominant', 'flirty', 'attracted', 'cock-hungry', 'pussy-hungry', 'breeding'];
  const darkIds = ['homicidal', 'suicidal', 'psychotic', 'murderous', 'bloodthirsty', 'sadistic', 'broken', 'hollow', 'depraved'];

  let targetIds: string[];
  switch (bias) {
    case 'positive': targetIds = positiveIds; break;
    case 'negative': targetIds = negativeIds; break;
    case 'neutral': targetIds = neutralIds; break;
    case 'sexual': targetIds = sexualIds; break;
    case 'dark': targetIds = darkIds; break;
    default: targetIds = [];
  }

  // Filter states that match the bias and are available for this rating
  const biasedStates = states.filter(s => targetIds.includes(s.id));

  if (biasedStates.length > 0) {
    return biasedStates[Math.floor(Math.random() * biasedStates.length)].id;
  }

  // Fallback to any random state
  return states[Math.floor(Math.random() * states.length)].id;
}

/**
 * Get emotional state data by ID
 */
export function getEmotionalStateData(stateId: string): EmotionalStateData | undefined {
  const allStates = [...FAMILY_FRIENDLY_STATES, ...MATURE_STATES, ...UNFILTERED_STATES];
  return allStates.find(s => s.id === stateId);
}

/**
 * Get list of state IDs for a rating (useful for types)
 */
export function getEmotionalStateIds(rating: ContentRating): string[] {
  return getEmotionalStatesForRating(rating).map(s => s.id);
}

/**
 * Check if a state is appropriate for a given rating
 */
export function isStateAppropriateForRating(stateId: string, rating: ContentRating): boolean {
  const availableStates = getEmotionalStatesForRating(rating);
  return availableStates.some(s => s.id === stateId);
}

/**
 * Get all emotional state IDs as a type union (for documentation)
 */
export const ALL_EMOTIONAL_STATE_IDS = [
  ...FAMILY_FRIENDLY_STATES.map(s => s.id),
  ...MATURE_STATES.map(s => s.id),
  ...UNFILTERED_STATES.map(s => s.id),
] as const;

export type EmotionalStateId = typeof ALL_EMOTIONAL_STATE_IDS[number];

/**
 * Combine multiple emotional states into a single voice/patterns object
 * Used when NPCs have layered emotions (e.g., "happy and horny")
 */
export function combineEmotionalStates(stateIds: string | string[]): {
  voice: string;
  patterns: string[];
  combinedLabel: string;
} {
  // Normalize to array
  const ids = Array.isArray(stateIds) ? stateIds : [stateIds];

  // Get data for each state
  const statesData = ids.map(id => getEmotionalStateData(id)).filter(Boolean) as EmotionalStateData[];

  if (statesData.length === 0) {
    // Fallback to neutral
    const neutral = getEmotionalStateData('neutral');
    return {
      voice: neutral?.voice || 'balanced, normal conversation',
      patterns: neutral?.patterns || ['situationally appropriate'],
      combinedLabel: 'Neutral',
    };
  }

  if (statesData.length === 1) {
    return {
      voice: statesData[0].voice,
      patterns: statesData[0].patterns,
      combinedLabel: statesData[0].label,
    };
  }

  // Combine multiple states
  // Voice: join with " + " to show complexity
  const combinedVoice = statesData.map(s => s.voice).join(' + ');

  // Patterns: merge all, remove duplicates
  const allPatterns = statesData.flatMap(s => s.patterns);
  const uniquePatterns = [...new Set(allPatterns)];

  // Label: join with comma
  const combinedLabel = statesData.map(s => s.label).join(', ');

  return {
    voice: combinedVoice,
    patterns: uniquePatterns,
    combinedLabel,
  };
}

/**
 * Get 1-3 random emotional states for an NPC based on content rating
 * Higher difficulties get more complex emotional states
 */
export function getRandomEmotionalStates(rating: ContentRating, count: 1 | 2 | 3 = 1): string[] {
  const states = getEmotionalStatesForRating(rating);
  const selected: string[] = [];

  // Get random states without repetition
  const shuffled = [...states].sort(() => Math.random() - 0.5);
  for (let i = 0; i < Math.min(count, shuffled.length); i++) {
    selected.push(shuffled[i].id);
  }

  return selected;
}

/**
 * Get random emotional state count based on content rating
 * Family-friendly: usually 1, sometimes 2
 * Mature: 1-2, sometimes 3
 * Unfiltered: 1-3 (more complex emotions)
 */
export function getEmotionCountForRating(rating: ContentRating): 1 | 2 | 3 {
  const rand = Math.random();

  switch (rating) {
    case 'family-friendly':
      // 80% single, 20% double
      return rand < 0.8 ? 1 : 2;
    case 'mature':
      // 60% single, 30% double, 10% triple
      if (rand < 0.6) return 1;
      if (rand < 0.9) return 2;
      return 3;
    case 'unfiltered':
      // 40% single, 40% double, 20% triple
      if (rand < 0.4) return 1;
      if (rand < 0.8) return 2;
      return 3;
    default:
      return 1;
  }
}
