/**
 * Story Seeds System
 *
 * This module provides the "story seeds" narrative mechanic - concrete facts
 * that exist in the story world that NPCs can reveal during conversations.
 *
 * Story seeds drive meaningful revelations based on narrative pressure.
 */

import { NPC, Identity } from '../types';

/**
 * A concrete fact that exists in the story world.
 * These are the SUBSTANCE that NPCs reveal during conversations.
 */
export interface StorySeed {
  id: string;
  // The actual fact - must be SPECIFIC and CONCRETE
  fact: string;
  // NPCs who know this fact
  knownBy: string[]; // NPC IDs
  // Type of information
  type: 'secret' | 'evidence' | 'relationship' | 'event' | 'betrayal' | 'crime' | 'affair';
  // How explosive is this revelation
  severity: 'minor' | 'moderate' | 'major' | 'explosive';
  // Has this been revealed to the player?
  revealedToPlayer: boolean;
  // Which NPCs has this been revealed to (besides original knowers)
  revealedTo: string[];
  // When should this come out? Lower = earlier
  narrativePriority: number;
}

/**
 * What an NPC must do in the current conversation
 */
export interface RevelationDirective {
  // The NPC this applies to
  npcId: string;
  // What they must reveal (the story seed fact)
  mustReveal: string | null;
  // After how many messages they must reveal it
  revealAfterMessages: number;
  // Their goal in this conversation
  conversationGoal: string;
  // Specific conflict with other NPCs present
  conflicts: { npcName: string; conflict: string }[];
}

/**
 * Scenario categories for matching seed templates to player scenarios
 */
type ScenarioCategory =
  | 'espionage'
  | 'corporate'
  | 'underworld'
  | 'domestic'
  | 'creative'
  | 'healthcare'
  | 'education'
  | 'legal'
  | 'religious'
  | 'small_town'
  | 'family_drama'
  | 'inheritance'
  | 'politics'
  | 'tech'
  | 'military'
  | 'service'
  | 'sports'
  | 'mental_health'
  | 'trades'
  | 'academic'
  | 'generic';

/**
 * Map profession/persona keywords to scenario categories
 */
function detectScenarioCategory(profession: string, personaType?: string): ScenarioCategory {
  const text = `${profession} ${personaType || ''}`.toLowerCase();

  // Healthcare/medical scenarios
  if (text.includes('doctor') || text.includes('nurse') || text.includes('medical') ||
      text.includes('hospital') || text.includes('clinic') || text.includes('healthcare') ||
      text.includes('surgeon') || text.includes('physician') || text.includes('emt') ||
      text.includes('paramedic') || text.includes('pharmacist') || text.includes('caregiver')) {
    return 'healthcare';
  }

  // Education scenarios
  if (text.includes('teacher') || text.includes('professor') || text.includes('student') ||
      text.includes('school') || text.includes('university') || text.includes('college') ||
      text.includes('academic') || text.includes('dean') || text.includes('principal') ||
      text.includes('tutor') || text.includes('instructor')) {
    return 'education';
  }

  // Legal scenarios
  if (text.includes('lawyer') || text.includes('attorney') || text.includes('judge') ||
      text.includes('legal') || text.includes('court') || text.includes('paralegal') ||
      text.includes('prosecutor') || text.includes('defense') || text.includes('law firm') ||
      text.includes('whistleblower')) {
    return 'legal';
  }

  // Religious/spiritual scenarios
  if (text.includes('church') || text.includes('pastor') || text.includes('priest') ||
      text.includes('rabbi') || text.includes('imam') || text.includes('spiritual') ||
      text.includes('ministry') || text.includes('congregation') || text.includes('faith') ||
      text.includes('cult') || text.includes('zealot') || text.includes('religious')) {
    return 'religious';
  }

  // Small town/community scenarios
  if (text.includes('mayor') || text.includes('sheriff') || text.includes('council') ||
      text.includes('small town') || text.includes('community pillar') || text.includes('local') ||
      text.includes('neighborhood') || text.includes('hometown') || text.includes('village')) {
    return 'small_town';
  }

  // Inheritance/wealth scenarios
  if (text.includes('heir') || text.includes('estate') || text.includes('inheritance') ||
      text.includes('will') || text.includes('trust fund') || text.includes('wealthy family') ||
      text.includes('inheritance hunter') || text.includes('reluctant heir')) {
    return 'inheritance';
  }

  // Politics/government scenarios
  if (text.includes('politician') || text.includes('senator') || text.includes('congressman') ||
      text.includes('governor') || text.includes('campaign') || text.includes('lobbyist') ||
      text.includes('political') || text.includes('government') || text.includes('diplomat')) {
    return 'politics';
  }

  // Tech/startup scenarios
  if (text.includes('startup') || text.includes('developer') || text.includes('programmer') ||
      text.includes('software') || text.includes('app') || text.includes('founder') ||
      text.includes('engineer') || text.includes('silicon valley') || text.includes('tech')) {
    return 'tech';
  }

  // Military/security scenarios
  if (text.includes('veteran') || text.includes('soldier') || text.includes('military') ||
      text.includes('army') || text.includes('navy') || text.includes('marines') ||
      text.includes('air force') || text.includes('security') || text.includes('combat')) {
    return 'military';
  }

  // Service industry scenarios
  if (text.includes('retail') || text.includes('restaurant') || text.includes('hotel') ||
      text.includes('hospitality') || text.includes('server') || text.includes('bartender') ||
      text.includes('cashier') || text.includes('waiter') || text.includes('barista')) {
    return 'service';
  }

  // Sports/fitness scenarios
  if (text.includes('athlete') || text.includes('coach') || text.includes('trainer') ||
      text.includes('player') || text.includes('team') || text.includes('sports') ||
      text.includes('fitness') || text.includes('gym') || text.includes('championship')) {
    return 'sports';
  }

  // Mental health/social work scenarios
  if (text.includes('therapist') || text.includes('counselor') || text.includes('social worker') ||
      text.includes('psychologist') || text.includes('psychiatrist') || text.includes('rehab') ||
      text.includes('mental health') || text.includes('addiction')) {
    return 'mental_health';
  }

  // Trades/blue collar scenarios
  if (text.includes('construction') || text.includes('mechanic') || text.includes('electrician') ||
      text.includes('plumber') || text.includes('contractor') || text.includes('foreman') ||
      text.includes('builder') || text.includes('welder') || text.includes('carpenter')) {
    return 'trades';
  }

  // Academic/research scenarios
  if (text.includes('researcher') || text.includes('scientist') || text.includes('lab') ||
      text.includes('study') || text.includes('grant') || text.includes('phd') ||
      text.includes('postdoc') || text.includes('dissertation')) {
    return 'academic';
  }

  // Espionage/spy scenarios
  if (text.includes('spy') || text.includes('cia') || text.includes('agent') ||
      text.includes('operative') || text.includes('intelligence') || text.includes('mi6') ||
      text.includes('black widow') || text.includes('assassin') || text.includes('undercover')) {
    return 'espionage';
  }

  // Underworld/crime scenarios
  if (text.includes('mafia') || text.includes('cartel') || text.includes('gang') ||
      text.includes('crime') || text.includes('dealer') || text.includes('kingpin') ||
      text.includes('underground king') || text.includes('trafficker') || text.includes('mob')) {
    return 'underworld';
  }

  // Corporate/business scenarios
  if (text.includes('ceo') || text.includes('executive') || text.includes('corporate') ||
      text.includes('banker') || text.includes('wall street') || text.includes('business') ||
      text.includes('finance') || text.includes('manager')) {
    return 'corporate';
  }

  // Creative/entertainment scenarios
  if (text.includes('actor') || text.includes('actress') || text.includes('musician') ||
      text.includes('artist') || text.includes('writer') || text.includes('celebrity') ||
      text.includes('influencer') || text.includes('model') || text.includes('director') ||
      text.includes('creative dreamer')) {
    return 'creative';
  }

  // Family drama scenarios (catch-all for family-focused personas)
  if (text.includes('parent') || text.includes('spouse') || text.includes('family') ||
      text.includes('married') || text.includes('divorce') || text.includes('trapped') ||
      text.includes('devoted') || text.includes('guilty parent') || text.includes('sibling')) {
    return 'family_drama';
  }

  return 'generic';
}

/**
 * Templates for generating story seeds based on NPC relationships
 * IMPORTANT: {witness} is the NPC who KNOWS the secret and can reveal it.
 * {subject} is the NPC the secret is ABOUT (they wouldn't willingly reveal this).
 * {player} is the player character - when used, it means the player is the subject.
 * This prevents NPCs from confessing their own secrets immediately.
 */
interface SeedTemplate {
  template: string;
  witnessKnows: boolean;
  playerIsSubject?: boolean; // True if this seed is about the PLAYER doing something
}

const SEED_TEMPLATES: Record<string, SeedTemplate[]> = {
  // Financial/crime seeds - witness saw subject do something
  crime: [
    { template: '{witness} saw {subject} stealing money from {workplace} - about $500 every week', witnessKnows: true },
    { template: '{witness} caught {subject} breaking into the office safe three weeks ago', witnessKnows: true },
    { template: '{witness} knows that {subject} is being blackmailed by someone outside the group', witnessKnows: true },
    { template: '{witness} has proof that {subject} has been forging signatures on company documents', witnessKnows: true },
    { template: '{witness} found out {subject} has a gambling debt of $50,000 to dangerous people', witnessKnows: true },
  ],

  // Relationship/affair seeds - witness knows about subject's affair
  affair: [
    { template: '{witness} knows {subject} had a secret relationship that ended badly', witnessKnows: true },
    { template: '{witness} caught {subject} seeing someone else\'s ex behind their back', witnessKnows: true },
    { template: '{witness} knows that {subject} has been lying about where they go on Thursday nights', witnessKnows: true },
    { template: '{witness} found explicit messages on {subject}\'s phone', witnessKnows: true },
    { template: '{witness} walked in on {subject} at the company Christmas party doing something they shouldn\'t', witnessKnows: true },
  ],

  // Betrayal seeds - witness knows subject betrayed someone
  betrayal: [
    { template: '{witness} knows {subject} was the one who got someone fired from their last job', witnessKnows: true },
    { template: '{witness} has evidence {subject} has been feeding information about {player} to their rivals', witnessKnows: true },
    { template: '{witness} knows {subject} sabotaged someone\'s promotion last year', witnessKnows: true },
    { template: '{witness} overheard {subject} planning to leave and take the best clients', witnessKnows: true },
    { template: '{witness} knows {subject} lied to protect themselves and let someone else take the blame', witnessKnows: true },
  ],

  // Evidence/knowledge seeds - witness has damning evidence about subject
  evidence: [
    { template: '{witness} has photos that prove {subject} was lying about their alibi', witnessKnows: true },
    { template: '{witness} overheard {subject} on the phone making threats', witnessKnows: true },
    { template: '{witness} found documents hidden in {subject}\'s desk', witnessKnows: true },
    { template: '{witness} knows {subject}\'s real reason for leaving their previous job', witnessKnows: true },
    { template: '{witness} saw {subject} meeting secretly with {player}\'s competitor', witnessKnows: true },
  ],

  // Secret knowledge seeds - witness knows subject's dark secret
  secret: [
    { template: '{witness} discovered that {subject} has a second family in another city', witnessKnows: true },
    { template: '{witness} found out {subject} lied on their resume about their degree', witnessKnows: true },
    { template: '{witness} discovered {subject} is actually related to {player}', witnessKnows: true },
    { template: '{witness} knows {subject} is in witness protection', witnessKnows: true },
    { template: '{witness} found out {subject} has a terminal illness they\'re hiding', witnessKnows: true },
  ],
};

/**
 * ESPIONAGE scenario seeds - for spy/CIA/intelligence scenarios
 * These are about intelligence operations, double agents, leaked info, etc.
 */
const ESPIONAGE_SEEDS: Record<string, SeedTemplate[]> = {
  double_agent: [
    { template: '{witness} has evidence that {player} has been passing classified intel to a foreign handler', witnessKnows: true, playerIsSubject: true },
    { template: '{witness} intercepted communications proving {player} has a second identity', witnessKnows: true, playerIsSubject: true },
    { template: '{witness} knows {subject} is secretly working for a rival agency', witnessKnows: true },
    { template: '{witness} discovered {player} met with a known enemy operative last month', witnessKnows: true, playerIsSubject: true },
    { template: '{witness} has proof {subject} compromised an entire operation to save their own cover', witnessKnows: true },
  ],

  blown_cover: [
    { template: '{witness} knows {player}\'s real identity - they\'re not who they claim to be', witnessKnows: true, playerIsSubject: true },
    { template: '{witness} found {player}\'s fake passport collection hidden in their apartment', witnessKnows: true, playerIsSubject: true },
    { template: '{witness} recognized {player} from a past operation under a different name', witnessKnows: true, playerIsSubject: true },
    { template: '{witness} knows {subject} was the one who leaked the asset list', witnessKnows: true },
    { template: '{witness} discovered {subject} has been filing false mission reports for months', witnessKnows: true },
  ],

  betrayal: [
    { template: '{witness} knows {player} is responsible for the failed extraction that killed three operatives', witnessKnows: true, playerIsSubject: true },
    { template: '{witness} has evidence {player} sold out their handler to save themselves', witnessKnows: true, playerIsSubject: true },
    { template: '{witness} knows {subject} was turned during their last assignment in Moscow', witnessKnows: true },
    { template: '{witness} discovered {player} has been feeding disinformation to headquarters', witnessKnows: true, playerIsSubject: true },
    { template: '{witness} knows {subject} eliminated a fellow agent who discovered their secret', witnessKnows: true },
  ],

  secrets: [
    { template: '{witness} knows the real reason {player} defected - it wasn\'t ideology, it was money', witnessKnows: true, playerIsSubject: true },
    { template: '{witness} discovered {player} has a child no one knows about - a major vulnerability', witnessKnows: true, playerIsSubject: true },
    { template: '{witness} knows {subject} has been skimming from the black budget for years', witnessKnows: true },
    { template: '{witness} found out {player} is being blackmailed by an unknown party', witnessKnows: true, playerIsSubject: true },
    { template: '{witness} knows {subject} has a romantic relationship with an enemy operative', witnessKnows: true },
  ],
};

/**
 * UNDERWORLD scenario seeds - for crime/mafia/gang scenarios
 */
const UNDERWORLD_SEEDS: Record<string, SeedTemplate[]> = {
  betrayal: [
    { template: '{witness} knows {player} is the one who ratted to the feds about the shipment', witnessKnows: true, playerIsSubject: true },
    { template: '{witness} has proof {player} has been skimming money from the boss for months', witnessKnows: true, playerIsSubject: true },
    { template: '{witness} knows {subject} is secretly working with a rival family', witnessKnows: true },
    { template: '{witness} discovered {player} has been meeting with the DA', witnessKnows: true, playerIsSubject: true },
    { template: '{witness} knows {subject} killed someone in the organization without permission', witnessKnows: true },
  ],

  secrets: [
    { template: '{witness} knows {player} is actually an undercover cop', witnessKnows: true, playerIsSubject: true },
    { template: '{witness} found out {player} has a second family the organization doesn\'t know about', witnessKnows: true, playerIsSubject: true },
    { template: '{witness} knows where {subject} buried the bodies from the warehouse job', witnessKnows: true },
    { template: '{witness} discovered {player} has been wearing a wire', witnessKnows: true, playerIsSubject: true },
    { template: '{witness} knows {subject} has a gambling problem that\'s making them desperate', witnessKnows: true },
  ],

  power: [
    { template: '{witness} knows {player} is planning to take over when the boss is gone', witnessKnows: true, playerIsSubject: true },
    { template: '{witness} has evidence {subject} ordered a hit without authorization', witnessKnows: true },
    { template: '{witness} discovered {player} has been making side deals with suppliers', witnessKnows: true, playerIsSubject: true },
    { template: '{witness} knows {subject} is building their own crew in secret', witnessKnows: true },
    { template: '{witness} found out {player} has been lying about the take from jobs', witnessKnows: true, playerIsSubject: true },
  ],
};

/**
 * CORPORATE scenario seeds - for business/executive scenarios
 */
const CORPORATE_SEEDS: Record<string, SeedTemplate[]> = {
  fraud: [
    { template: '{witness} has proof {player} has been cooking the books for the quarterly reports', witnessKnows: true, playerIsSubject: true },
    { template: '{witness} knows {player} committed insider trading based on leaked board information', witnessKnows: true, playerIsSubject: true },
    { template: '{witness} discovered {subject} has been embezzling through fake vendor accounts', witnessKnows: true },
    { template: '{witness} found evidence {player} bribed regulators to overlook violations', witnessKnows: true, playerIsSubject: true },
    { template: '{witness} knows {subject} forged the CEO\'s signature on major contracts', witnessKnows: true },
  ],

  betrayal: [
    { template: '{witness} knows {player} has been feeding trade secrets to a competitor', witnessKnows: true, playerIsSubject: true },
    { template: '{witness} has proof {player} sabotaged the merger to benefit personally', witnessKnows: true, playerIsSubject: true },
    { template: '{witness} discovered {subject} is planning a hostile takeover from within', witnessKnows: true },
    { template: '{witness} knows {player} threw {subject} under the bus to cover their own mistakes', witnessKnows: true, playerIsSubject: true },
    { template: '{witness} found out {subject} has been recording confidential meetings', witnessKnows: true },
  ],

  scandal: [
    { template: '{witness} knows about {player}\'s affair with a subordinate - HR would have a field day', witnessKnows: true, playerIsSubject: true },
    { template: '{witness} has photos of {player} at an event they claimed to be "sick" for', witnessKnows: true, playerIsSubject: true },
    { template: '{witness} discovered {subject} has been harassing employees and paying them off to stay quiet', witnessKnows: true },
    { template: '{witness} knows {player}\'s credentials are completely fabricated', witnessKnows: true, playerIsSubject: true },
    { template: '{witness} found out {subject} has a substance problem that\'s affecting their judgment', witnessKnows: true },
  ],
};

/**
 * CREATIVE scenario seeds - for entertainment/celebrity scenarios
 */
const CREATIVE_SEEDS: Record<string, SeedTemplate[]> = {
  scandal: [
    { template: '{witness} has photos proving {player}\'s "talent" was actually ghostwritten/performed by someone else', witnessKnows: true, playerIsSubject: true },
    { template: '{witness} knows {player} slept their way to their first big break', witnessKnows: true, playerIsSubject: true },
    { template: '{witness} discovered {subject} has been plagiarizing their entire career', witnessKnows: true },
    { template: '{witness} has video of {player} saying things that would end their career if released', witnessKnows: true, playerIsSubject: true },
    { template: '{witness} knows {subject} paid to have a competitor\'s career sabotaged', witnessKnows: true },
  ],

  secrets: [
    { template: '{witness} knows {player}\'s wholesome image is a complete fabrication - they\'re nothing like their persona', witnessKnows: true, playerIsSubject: true },
    { template: '{witness} discovered {player} has a secret addiction they\'ve been hiding from the press', witnessKnows: true, playerIsSubject: true },
    { template: '{witness} knows {subject} is in a fake relationship for publicity', witnessKnows: true },
    { template: '{witness} found out {player} has a hidden child from a past relationship', witnessKnows: true, playerIsSubject: true },
    { template: '{witness} knows {subject} has been blackmailing other celebrities with their secrets', witnessKnows: true },
  ],

  betrayal: [
    { template: '{witness} knows {player} is the anonymous source leaking industry secrets to tabloids', witnessKnows: true, playerIsSubject: true },
    { template: '{witness} has proof {player} stole {subject}\'s original work and took credit', witnessKnows: true, playerIsSubject: true },
    { template: '{witness} discovered {subject} has been sabotaging auditions of rival performers', witnessKnows: true },
    { template: '{witness} knows {player} lied about their background story - it\'s all fabricated for sympathy', witnessKnows: true, playerIsSubject: true },
    { template: '{witness} found out {subject} sold out a friend to advance their own career', witnessKnows: true },
  ],
};

/**
 * HEALTHCARE scenario seeds - for doctors, nurses, medical professionals
 */
const HEALTHCARE_SEEDS: Record<string, SeedTemplate[]> = {
  malpractice: [
    { template: '{witness} saw {subject} falsifying patient records after the death on Floor 3', witnessKnows: true },
    { template: '{witness} knows {subject} was drunk during the surgery that went wrong', witnessKnows: true },
    { template: '{witness} caught {subject} performing procedures without proper credentials', witnessKnows: true },
    { template: '{witness} has proof {player} made the dosage error that killed the patient', witnessKnows: true, playerIsSubject: true },
    { template: '{witness} discovered {subject} has been practicing with a suspended license', witnessKnows: true },
  ],
  addiction: [
    { template: '{witness} knows {subject} has been stealing opioids from the medication cart', witnessKnows: true },
    { template: '{witness} caught {subject} self-medicating from hospital supplies', witnessKnows: true },
    { template: '{witness} discovered {player} has been diverting controlled substances for months', witnessKnows: true, playerIsSubject: true },
    { template: '{witness} found {subject}\'s hidden stash in the break room locker', witnessKnows: true },
    { template: '{witness} knows {subject} has been writing prescriptions for themselves under fake names', witnessKnows: true },
  ],
  corruption: [
    { template: '{witness} discovered {subject} has been billing for treatments never given', witnessKnows: true },
    { template: '{witness} saw {subject} take a bribe from the pharmaceutical rep', witnessKnows: true },
    { template: '{witness} knows {subject} covered up the infection outbreak to protect the hospital', witnessKnows: true },
    { template: '{witness} has evidence {player} has been accepting kickbacks for referrals', witnessKnows: true, playerIsSubject: true },
    { template: '{witness} found out {subject} has been ordering unnecessary procedures for insurance money', witnessKnows: true },
  ],
  patient_secrets: [
    { template: '{witness} knows {subject} has been having an affair with a patient', witnessKnows: true },
    { template: '{witness} caught {subject} sharing confidential patient information', witnessKnows: true },
    { template: '{witness} discovered {player} violated HIPAA by looking up their ex\'s medical records', witnessKnows: true, playerIsSubject: true },
    { template: '{witness} knows {subject} is blackmailing a patient with their diagnosis', witnessKnows: true },
  ],
};

/**
 * EDUCATION scenario seeds - for teachers, professors, students
 */
const EDUCATION_SEEDS: Record<string, SeedTemplate[]> = {
  academic_fraud: [
    { template: '{witness} found proof that {subject} plagiarized their dissertation', witnessKnows: true },
    { template: '{witness} knows {subject} has been changing grades for money', witnessKnows: true },
    { template: '{witness} discovered {subject} fabricated their research data', witnessKnows: true },
    { template: '{witness} has evidence {player} cheated on the exam that got them into the program', witnessKnows: true, playerIsSubject: true },
    { template: '{witness} found out {subject}\'s PhD is from a diploma mill', witnessKnows: true },
  ],
  misconduct: [
    { template: '{witness} caught {subject} having an inappropriate relationship with a student', witnessKnows: true },
    { template: '{witness} knows {player} has been sleeping with their thesis advisor', witnessKnows: true, playerIsSubject: true },
    { template: '{witness} discovered {subject} has been giving preferential grades for personal favors', witnessKnows: true },
    { template: '{witness} has proof {subject} is targeting vulnerable students', witnessKnows: true },
    { template: '{witness} knows {subject} has been retaliating against students who rejected their advances', witnessKnows: true },
  ],
  institutional: [
    { template: '{witness} saw {subject} accept a bribe for admissions recommendations', witnessKnows: true },
    { template: '{witness} knows {subject} is running an essay-writing service for students', witnessKnows: true },
    { template: '{witness} discovered {player} stole {subject}\'s research and published it as their own', witnessKnows: true, playerIsSubject: true },
    { template: '{witness} found evidence {subject} has been stealing from the department fund', witnessKnows: true },
    { template: '{witness} knows {subject} rigged the tenure committee decision', witnessKnows: true },
  ],
};

/**
 * LEGAL scenario seeds - for lawyers, judges, legal professionals
 */
const LEGAL_SEEDS: Record<string, SeedTemplate[]> = {
  ethics: [
    { template: '{witness} has proof {subject} suppressed evidence in the Henderson case', witnessKnows: true },
    { template: '{witness} knows {subject} is billing clients for hours never worked', witnessKnows: true },
    { template: '{witness} caught {subject} coaching a witness to lie under oath', witnessKnows: true },
    { template: '{witness} has evidence {player} tampered with evidence to win the case', witnessKnows: true, playerIsSubject: true },
    { template: '{witness} discovered {subject} has a secret conflict of interest in the merger', witnessKnows: true },
  ],
  corruption: [
    { template: '{witness} discovered {subject} has been taking bribes from the firm\'s biggest client', witnessKnows: true },
    { template: '{witness} saw {subject} meet secretly with the judge before the ruling', witnessKnows: true },
    { template: '{witness} knows {player} betrayed attorney-client privilege for money', witnessKnows: true, playerIsSubject: true },
    { template: '{witness} has proof {subject} destroyed documents during discovery', witnessKnows: true },
    { template: '{witness} found out {subject} has been leaking case information to opposing counsel', witnessKnows: true },
  ],
  secrets: [
    { template: '{witness} knows {subject} had an affair with opposing counsel during the merger', witnessKnows: true },
    { template: '{witness} discovered {subject} was disbarred in another state and is practicing illegally', witnessKnows: true },
    { template: '{witness} has proof {subject} fabricated their law school transcript', witnessKnows: true },
    { template: '{witness} knows {player} paid someone to take the bar exam for them', witnessKnows: true, playerIsSubject: true },
  ],
};

/**
 * RELIGIOUS scenario seeds - for religious leaders, cult scenarios
 */
const RELIGIOUS_SEEDS: Record<string, SeedTemplate[]> = {
  hypocrisy: [
    { template: '{witness} caught {subject} living a double life - drinking and gambling in the city', witnessKnows: true },
    { template: '{witness} knows {subject} has been having an affair with a married congregant', witnessKnows: true },
    { template: '{witness} discovered {player}\'s "calling" story is completely fabricated', witnessKnows: true, playerIsSubject: true },
    { template: '{witness} has photos of {subject} at places that contradict everything they preach', witnessKnows: true },
    { template: '{witness} knows {subject} is secretly an atheist who sees the congregation as marks', witnessKnows: true },
  ],
  financial: [
    { template: '{witness} knows {subject} has been embezzling from the collection plate', witnessKnows: true },
    { template: '{witness} discovered {subject} uses donations for personal luxury items', witnessKnows: true },
    { template: '{witness} has proof {player} has been pressuring vulnerable members for money', witnessKnows: true, playerIsSubject: true },
    { template: '{witness} found the hidden accounts where {subject} has been funneling church funds', witnessKnows: true },
  ],
  abuse_of_power: [
    { template: '{witness} discovered {subject} has been using spiritual authority to manipulate vulnerable members', witnessKnows: true },
    { template: '{witness} saw {subject} threatening a member who wanted to leave', witnessKnows: true },
    { template: '{witness} knows {subject} has been isolating vulnerable members from their families', witnessKnows: true },
    { template: '{witness} has evidence {player} has been covering up abuse within the congregation', witnessKnows: true, playerIsSubject: true },
    { template: '{witness} discovered {subject} has a criminal past they concealed from the congregation', witnessKnows: true },
  ],
};

/**
 * SMALL_TOWN scenario seeds - for community-focused scenarios
 */
const SMALL_TOWN_SEEDS: Record<string, SeedTemplate[]> = {
  local_scandal: [
    { template: '{witness} knows {subject} has been having an affair with the mayor\'s spouse', witnessKnows: true },
    { template: '{witness} caught {subject} bribing the town council for the zoning approval', witnessKnows: true },
    { template: '{witness} discovered {player} is the anonymous source sending those threatening letters', witnessKnows: true, playerIsSubject: true },
    { template: '{witness} knows {subject} rigged the last town election', witnessKnows: true },
    { template: '{witness} has proof {subject} has been blackmailing the sheriff', witnessKnows: true },
  ],
  family_secrets: [
    { template: '{witness} discovered {subject}\'s family made their money from something shameful', witnessKnows: true },
    { template: '{witness} knows {player} is the real father of {subject}\'s oldest child', witnessKnows: true, playerIsSubject: true },
    { template: '{witness} found the letters proving {subject}\'s grandfather was a war criminal', witnessKnows: true },
    { template: '{witness} knows the real reason the Miller family left town 20 years ago', witnessKnows: true },
  ],
  dark_history: [
    { template: '{witness} knows what really happened at the lake 20 years ago - and {subject} was involved', witnessKnows: true },
    { template: '{witness} discovered {subject} has been lying about their military service for decades', witnessKnows: true },
    { template: '{witness} found out {subject} drove the car that night - not their dead brother', witnessKnows: true },
    { template: '{witness} knows the real reason {player} left town all those years ago', witnessKnows: true, playerIsSubject: true },
    { template: '{witness} discovered {player} was involved in the incident everyone blamed on someone else', witnessKnows: true, playerIsSubject: true },
  ],
  business_rivalry: [
    { template: '{witness} found proof that {subject} sabotaged their competitor\'s business', witnessKnows: true },
    { template: '{witness} knows {subject} started the fire at the old warehouse for insurance money', witnessKnows: true },
    { template: '{witness} discovered {player} has been spreading false rumors to destroy {subject}\'s reputation', witnessKnows: true, playerIsSubject: true },
    { template: '{witness} has evidence {subject} poisoned the well at the neighboring farm', witnessKnows: true },
  ],
};

/**
 * FAMILY_DRAMA scenario seeds - for domestic/family-focused scenarios
 */
const FAMILY_DRAMA_SEEDS: Record<string, SeedTemplate[]> = {
  parentage: [
    { template: '{witness} knows {subject} is not actually {player}\'s biological parent', witnessKnows: true },
    { template: '{witness} discovered {subject} has been lying about who the real father is', witnessKnows: true },
    { template: '{witness} found the adoption papers that prove {player} was switched at birth', witnessKnows: true, playerIsSubject: true },
    { template: '{witness} knows {subject} had a child they gave up for adoption before getting married', witnessKnows: true },
    { template: '{witness} has proof {subject} and {player} are actually related by blood', witnessKnows: true },
  ],
  affairs: [
    { template: '{witness} caught {subject} meeting with their ex at the hotel downtown', witnessKnows: true },
    { template: '{witness} knows {player} is having an emotional affair with their coworker', witnessKnows: true, playerIsSubject: true },
    { template: '{witness} discovered {subject} has been planning to divorce {player} for months', witnessKnows: true },
    { template: '{witness} found {subject}\'s secret second phone for their affair', witnessKnows: true },
    { template: '{witness} knows {subject} is only staying for the money', witnessKnows: true },
  ],
  hidden_truths: [
    { template: '{witness} knows {subject} has been drinking again despite promising to stay sober', witnessKnows: true },
    { template: '{witness} found the letters proving {subject} knew about the abuse and did nothing', witnessKnows: true },
    { template: '{witness} discovered {subject} has been hiding money from the family in a secret account', witnessKnows: true },
    { template: '{witness} knows {subject} is not really sick - they\'ve been faking it for attention', witnessKnows: true },
    { template: '{witness} has proof {player} stole from Dad\'s medical fund', witnessKnows: true, playerIsSubject: true },
  ],
  past_trauma: [
    { template: '{witness} knows what really happened to {subject} during those missing years', witnessKnows: true },
    { template: '{witness} discovered {player} was the one who told Mom\'s secret to the whole family', witnessKnows: true, playerIsSubject: true },
    { template: '{witness} found out {subject} has been sending money to a secret family member', witnessKnows: true },
    { template: '{witness} knows {subject} was responsible for what happened to their sibling', witnessKnows: true },
  ],
};

/**
 * INHERITANCE scenario seeds - for wealthy family/heir scenarios
 */
const INHERITANCE_SEEDS: Record<string, SeedTemplate[]> = {
  will_manipulation: [
    { template: '{witness} has proof {subject} manipulated the will while the patriarch was medicated', witnessKnows: true },
    { template: '{witness} found documents showing {subject} forged signatures on the trust amendment', witnessKnows: true },
    { template: '{witness} knows {subject} has been slowly poisoning their elderly spouse', witnessKnows: true },
    { template: '{witness} has evidence {player} influenced the dying patriarch to change the will', witnessKnows: true, playerIsSubject: true },
    { template: '{witness} discovered {subject} destroyed the original will that favored someone else', witnessKnows: true },
  ],
  hidden_assets: [
    { template: '{witness} knows {subject} has been hiding offshore accounts from the estate', witnessKnows: true },
    { template: '{witness} discovered {player} has been hiding assets from the other heirs', witnessKnows: true, playerIsSubject: true },
    { template: '{witness} found proof {subject} secretly sold the family heirlooms and replaced them with fakes', witnessKnows: true },
    { template: '{witness} has evidence {subject} has been embezzling from the family business for years', witnessKnows: true },
  ],
  family_claims: [
    { template: '{witness} discovered there\'s another heir nobody knows about - {subject} paid to keep them quiet', witnessKnows: true },
    { template: '{witness} knows {player} knew about the illegitimate sibling and has been paying them off', witnessKnows: true, playerIsSubject: true },
    { template: '{witness} found proof {subject} is not actually related to the family by blood', witnessKnows: true },
    { template: '{witness} discovered {subject} has been secretly meeting with the disinherited cousin', witnessKnows: true },
  ],
  dirty_money: [
    { template: '{witness} discovered the family fortune came from {subject}\'s grandfather\'s war crimes', witnessKnows: true },
    { template: '{witness} knows the business that made the family rich was built on fraud and exploitation', witnessKnows: true },
    { template: '{witness} found evidence {player} has been laundering money through the family foundation', witnessKnows: true, playerIsSubject: true },
  ],
};

/**
 * POLITICS scenario seeds - for political/government scenarios
 */
const POLITICS_SEEDS: Record<string, SeedTemplate[]> = {
  corruption: [
    { template: '{witness} has recordings of {subject} accepting bribes from the contractor', witnessKnows: true },
    { template: '{witness} discovered {subject} buried the environmental report to protect donors', witnessKnows: true },
    { template: '{witness} found proof {subject} used campaign funds for personal expenses', witnessKnows: true },
    { template: '{witness} has proof {player} sold their vote on the infrastructure bill', witnessKnows: true, playerIsSubject: true },
    { template: '{witness} knows {subject} has been taking payments from a foreign lobbyist', witnessKnows: true },
  ],
  scandal: [
    { template: '{witness} knows {subject} has been having an affair with their chief of staff', witnessKnows: true },
    { template: '{witness} has evidence {subject} destroyed the harassment complaints against them', witnessKnows: true },
    { template: '{witness} discovered {player} used their position to get the investigation dropped', witnessKnows: true, playerIsSubject: true },
    { template: '{witness} has photos that could end {subject}\'s career if released', witnessKnows: true },
  ],
  conspiracy: [
    { template: '{witness} caught {subject} leaking classified information to foreign interests', witnessKnows: true },
    { template: '{witness} knows {subject} was involved in the vote rigging last election', witnessKnows: true },
    { template: '{witness} discovered {subject} has been meeting secretly with the opposition', witnessKnows: true },
    { template: '{witness} has proof {player} has been coordinating with hostile foreign actors', witnessKnows: true, playerIsSubject: true },
  ],
};

/**
 * TECH scenario seeds - for startup/tech industry scenarios
 */
const TECH_SEEDS: Record<string, SeedTemplate[]> = {
  fraud: [
    { template: '{witness} knows {subject} has been inflating user numbers to deceive investors', witnessKnows: true },
    { template: '{witness} discovered {subject}\'s "AI" is actually powered by underpaid workers overseas', witnessKnows: true },
    { template: '{witness} has evidence {player} has been backdating stock options illegally', witnessKnows: true, playerIsSubject: true },
    { template: '{witness} found proof {subject} created fake customer testimonials and case studies', witnessKnows: true },
    { template: '{witness} knows the product demo was completely faked for investors', witnessKnows: true },
  ],
  theft: [
    { template: '{witness} discovered {subject} stole the core algorithm from their previous employer', witnessKnows: true },
    { template: '{witness} has evidence {player} stole the startup idea from {subject}', witnessKnows: true, playerIsSubject: true },
    { template: '{witness} knows {subject} has been selling proprietary code to competitors', witnessKnows: true },
    { template: '{witness} found proof {subject} copied the entire codebase from an open source project and claimed it as original', witnessKnows: true },
  ],
  toxic_culture: [
    { template: '{witness} has proof {subject} has been harassing employees and HR covered it up', witnessKnows: true },
    { template: '{witness} knows {subject} has been discriminating against candidates based on age', witnessKnows: true },
    { template: '{witness} discovered {subject} has been exploiting visa workers by threatening deportation', witnessKnows: true },
    { template: '{witness} has recordings of {player} making discriminatory comments in leadership meetings', witnessKnows: true, playerIsSubject: true },
  ],
  privacy: [
    { template: '{witness} caught {subject} selling user data to advertisers without disclosure', witnessKnows: true },
    { template: '{witness} discovered {player} has been mining user data for a personal side project', witnessKnows: true, playerIsSubject: true },
    { template: '{witness} knows {subject} built a backdoor into the product for surveillance', witnessKnows: true },
    { template: '{witness} found evidence {subject} has been secretly negotiating to sell all user data', witnessKnows: true },
  ],
};

/**
 * MILITARY scenario seeds - for veteran/military scenarios
 */
const MILITARY_SEEDS: Record<string, SeedTemplate[]> = {
  war_crimes: [
    { template: '{witness} knows what really happened in that village - {subject} gave the order', witnessKnows: true },
    { template: '{witness} discovered {subject} killed a civilian and the unit covered it up', witnessKnows: true },
    { template: '{witness} has evidence {player} was responsible for the friendly fire incident', witnessKnows: true, playerIsSubject: true },
    { template: '{witness} knows {subject} executed prisoners and blamed it on enemy fire', witnessKnows: true },
  ],
  stolen_valor: [
    { template: '{witness} has proof {subject} never actually served in combat despite their medals', witnessKnows: true },
    { template: '{witness} knows {player}\'s war hero story is completely fabricated', witnessKnows: true, playerIsSubject: true },
    { template: '{witness} discovered {subject} bought their medals online - they were never deployed', witnessKnows: true },
    { template: '{witness} found out {subject} claimed someone else\'s service record as their own', witnessKnows: true },
  ],
  betrayal: [
    { template: '{witness} knows {subject} left their unit behind to save themselves', witnessKnows: true },
    { template: '{witness} has evidence {player} leaked the operation details that got soldiers killed', witnessKnows: true, playerIsSubject: true },
    { template: '{witness} discovered {subject} has been selling military equipment on the black market', witnessKnows: true },
    { template: '{witness} knows {subject} lied on their background check about their dishonorable discharge', witnessKnows: true },
  ],
  secrets: [
    { template: '{witness} knows what {player} really did to get that medal', witnessKnows: true, playerIsSubject: true },
    { template: '{witness} discovered {subject} has been meeting with former enemies - they\'ve been compromised', witnessKnows: true },
    { template: '{witness} knows {subject} has been threatening other veterans who might talk', witnessKnows: true },
    { template: '{witness} found out {subject}\'s PTSD claim is fraudulent - they never saw combat', witnessKnows: true },
  ],
};

/**
 * SERVICE industry scenario seeds - for retail/hospitality scenarios
 */
const SERVICE_SEEDS: Record<string, SeedTemplate[]> = {
  theft: [
    { template: '{witness} knows {subject} has been skimming from the registers for months', witnessKnows: true },
    { template: '{witness} has video of {player} stealing from the safe', witnessKnows: true, playerIsSubject: true },
    { template: '{witness} caught {subject} running a side business using company resources', witnessKnows: true },
    { template: '{witness} discovered {player} reported the fake robbery and kept the insurance money', witnessKnows: true, playerIsSubject: true },
  ],
  workplace: [
    { template: '{witness} knows {subject} has been sexually harassing new employees', witnessKnows: true },
    { template: '{witness} caught {subject} selling drugs to coworkers during shifts', witnessKnows: true },
    { template: '{witness} discovered {subject} has been blackmailing a regular customer', witnessKnows: true },
    { template: '{witness} knows {player} has been giving away free product to their friends', witnessKnows: true, playerIsSubject: true },
  ],
  safety: [
    { template: '{witness} caught {subject} spitting in customers\' food', witnessKnows: true },
    { template: '{witness} discovered {subject} has been changing health inspection dates on documents', witnessKnows: true },
    { template: '{witness} knows {subject} served food way past the safety date and made people sick', witnessKnows: true },
    { template: '{witness} found proof {subject} has been lying about allergen ingredients', witnessKnows: true },
  ],
};

/**
 * SPORTS scenario seeds - for athlete/coach scenarios
 */
const SPORTS_SEEDS: Record<string, SeedTemplate[]> = {
  doping: [
    { template: '{witness} has proof {subject} has been using performance enhancing drugs', witnessKnows: true },
    { template: '{witness} has evidence {player} took the banned substance before the qualifying event', witnessKnows: true, playerIsSubject: true },
    { template: '{witness} discovered {subject} paid off the doctor to hide their positive test', witnessKnows: true },
    { template: '{witness} knows {subject} has been supplying PEDs to younger athletes', witnessKnows: true },
  ],
  abuse: [
    { template: '{witness} caught {subject} physically abusing younger athletes during training', witnessKnows: true },
    { template: '{witness} knows {subject} slept with a minor athlete and the team covered it up', witnessKnows: true },
    { template: '{witness} discovered {subject} has been psychologically tormenting players', witnessKnows: true },
    { template: '{witness} has recordings of {subject} making threats against athletes who complained', witnessKnows: true },
  ],
  fixing: [
    { template: '{witness} knows {subject} has been fixing games for bookmakers', witnessKnows: true },
    { template: '{witness} has evidence {player} threw the match for money', witnessKnows: true, playerIsSubject: true },
    { template: '{witness} found proof {subject} bribed officials before the championship', witnessKnows: true },
    { template: '{witness} discovered {subject} has been leaking game plans to rival teams', witnessKnows: true },
  ],
  injury: [
    { template: '{witness} discovered {subject} paid off the doctor to hide their career-ending injury', witnessKnows: true },
    { template: '{witness} knows {subject} intentionally injured a teammate to take their spot', witnessKnows: true },
    { template: '{witness} has proof {player} lied about their injury to collect insurance', witnessKnows: true, playerIsSubject: true },
    { template: '{witness} found evidence {subject} has been playing through a concussion the team is hiding', witnessKnows: true },
  ],
};

/**
 * MENTAL_HEALTH scenario seeds - for therapist/counselor scenarios
 */
const MENTAL_HEALTH_SEEDS: Record<string, SeedTemplate[]> = {
  ethics: [
    { template: '{witness} knows {subject} has been having inappropriate relationships with clients', witnessKnows: true },
    { template: '{witness} has recordings of {player} crossing ethical boundaries with a client', witnessKnows: true, playerIsSubject: true },
    { template: '{witness} discovered {subject} has been manipulating vulnerable patients financially', witnessKnows: true },
    { template: '{witness} knows {subject} has been using client sessions to fulfill their own emotional needs', witnessKnows: true },
  ],
  fraud: [
    { template: '{witness} discovered {subject} has been billing insurance for sessions that never happened', witnessKnows: true },
    { template: '{witness} has proof {subject}\'s credentials are completely fabricated', witnessKnows: true },
    { template: '{witness} knows {player} has been practicing without a valid license', witnessKnows: true, playerIsSubject: true },
    { template: '{witness} found evidence {subject} has been double-billing patients and insurance', witnessKnows: true },
  ],
  confidentiality: [
    { template: '{witness} caught {subject} sharing confidential patient information', witnessKnows: true },
    { template: '{witness} knows {player} has been using patient information for personal gain', witnessKnows: true, playerIsSubject: true },
    { template: '{witness} discovered {subject} has been gossiping about clients to other staff', witnessKnows: true },
    { template: '{witness} found out {subject} is writing a book using real patient stories without consent', witnessKnows: true },
  ],
  institutional: [
    { template: '{witness} knows {subject} has been overmedicating patients to keep them compliant', witnessKnows: true },
    { template: '{witness} discovered {subject} runs a conversion therapy practice on the side', witnessKnows: true },
    { template: '{witness} has proof {subject} knew about the abuse at the facility and said nothing', witnessKnows: true },
    { template: '{witness} knows {subject} has been detaining patients against their will for insurance payments', witnessKnows: true },
  ],
};

/**
 * TRADES scenario seeds - for construction/blue collar scenarios
 */
const TRADES_SEEDS: Record<string, SeedTemplate[]> = {
  safety: [
    { template: '{witness} knows {subject} covered up the accident that killed a worker', witnessKnows: true },
    { template: '{witness} has proof {player} knew about the safety violations before the accident', witnessKnows: true, playerIsSubject: true },
    { template: '{witness} discovered {subject} signed off on inspection reports without actually inspecting', witnessKnows: true },
    { template: '{witness} found evidence {subject} is responsible for the equipment failures', witnessKnows: true },
  ],
  theft: [
    { template: '{witness} knows {subject} has been stealing materials from job sites', witnessKnows: true },
    { template: '{witness} discovered {player} has been inflating invoices and splitting the difference', witnessKnows: true, playerIsSubject: true },
    { template: '{witness} caught {subject} using unlicensed workers and pocketing the wage difference', witnessKnows: true },
    { template: '{witness} has proof {subject} has been taking kickbacks from suppliers', witnessKnows: true },
  ],
  credentials: [
    { template: '{witness} knows {subject}\'s certifications are fake - they never passed the tests', witnessKnows: true },
    { template: '{witness} discovered {subject} has been working without proper licensing', witnessKnows: true },
    { template: '{witness} found out {subject} paid someone to take their certification exam', witnessKnows: true },
    { template: '{witness} has proof {player} lied about their years of experience', witnessKnows: true, playerIsSubject: true },
  ],
  corruption: [
    { template: '{witness} knows {subject} has been shaking down contractors for protection money', witnessKnows: true },
    { template: '{witness} discovered {subject} sabotaged the competitor\'s equipment', witnessKnows: true },
    { template: '{witness} found evidence {subject} is in bed with the building inspector', witnessKnows: true },
    { template: '{witness} has proof {subject} cut corners on the foundation that\'s now cracking', witnessKnows: true },
  ],
};

/**
 * ACADEMIC scenario seeds - for researcher/professor scenarios
 */
const ACADEMIC_SEEDS: Record<string, SeedTemplate[]> = {
  research_fraud: [
    { template: '{witness} has proof {subject} fabricated the data in their landmark study', witnessKnows: true },
    { template: '{witness} has evidence {player}\'s breakthrough paper contains fabricated results', witnessKnows: true, playerIsSubject: true },
    { template: '{witness} discovered {subject} has been p-hacking to get statistically significant results', witnessKnows: true },
    { template: '{witness} knows {subject} destroyed evidence when the research fraud investigation started', witnessKnows: true },
  ],
  plagiarism: [
    { template: '{witness} discovered {subject} has been putting their name on students\' research', witnessKnows: true },
    { template: '{witness} caught {subject} reviewing papers and stealing ideas before publication', witnessKnows: true },
    { template: '{witness} knows {player} stole the research from a graduate student who left', witnessKnows: true, playerIsSubject: true },
    { template: '{witness} found proof {subject} copied an obscure foreign paper and claimed it as original work', witnessKnows: true },
  ],
  grant_fraud: [
    { template: '{witness} knows {subject} used grant money to renovate their vacation home', witnessKnows: true },
    { template: '{witness} discovered {player} has been double-dipping grants across institutions', witnessKnows: true, playerIsSubject: true },
    { template: '{witness} found evidence {subject} has been billing personal travel as research expenses', witnessKnows: true },
    { template: '{witness} has proof {subject} invented collaborators to justify larger grant requests', witnessKnows: true },
  ],
  misconduct: [
    { template: '{witness} found evidence {subject} threatened students to keep them from reporting', witnessKnows: true },
    { template: '{witness} discovered {subject} has been running a paper mill on the side', witnessKnows: true },
    { template: '{witness} knows {subject} gave preferential grades for personal favors', witnessKnows: true },
    { template: '{witness} has proof {subject} sabotaged a colleague\'s tenure review out of jealousy', witnessKnows: true },
  ],
};

/**
 * UNIVERSAL relationship seeds - work across any scenario
 */
const UNIVERSAL_RELATIONSHIP_SEEDS: Record<string, SeedTemplate[]> = {
  affairs: [
    { template: '{witness} knows {subject} has been cheating on their partner with someone at {workplace}', witnessKnows: true },
    { template: '{witness} discovered {subject} has a secret second phone for their affair', witnessKnows: true },
    { template: '{witness} caught {subject} meeting their ex behind everyone\'s back', witnessKnows: true },
    { template: '{witness} knows {subject} is planning to leave but waiting for the right moment', witnessKnows: true },
    { template: '{witness} found out {player} has been lying about where they go on Thursday nights', witnessKnows: true, playerIsSubject: true },
  ],
  hidden_lives: [
    { template: '{witness} knows {subject} spent time in prison - they\'ve been hiding it from everyone', witnessKnows: true },
    { template: '{witness} discovered {subject}\'s real name - they\'ve been living under an alias', witnessKnows: true },
    { template: '{witness} found out {subject} was responsible for someone\'s death years ago', witnessKnows: true },
    { template: '{witness} knows {subject} abandoned a family in another city', witnessKnows: true },
    { template: '{witness} discovered {player} used to work in an industry they now publicly condemn', witnessKnows: true, playerIsSubject: true },
  ],
  addiction: [
    { template: '{witness} knows {subject} has relapsed and has been hiding it', witnessKnows: true },
    { template: '{witness} discovered {subject} has been self-medicating with prescription drugs', witnessKnows: true },
    { template: '{witness} caught {subject} having a breakdown they\'ve been hiding from everyone', witnessKnows: true },
    { template: '{witness} knows {subject} is in massive debt from their gambling problem', witnessKnows: true },
    { template: '{witness} found {player}\'s hidden stash - they\'re using again', witnessKnows: true, playerIsSubject: true },
  ],
  financial: [
    { template: '{witness} knows {subject} is about to declare bankruptcy but hasn\'t told anyone', witnessKnows: true },
    { template: '{witness} discovered {subject} has been living way beyond their means - the lifestyle is fake', witnessKnows: true },
    { template: '{witness} found out {subject} has been stealing from the shared account', witnessKnows: true },
    { template: '{witness} knows {subject}\'s investment opportunity is actually a Ponzi scheme', witnessKnows: true },
    { template: '{witness} caught {player} forging {subject}\'s signature on financial documents', witnessKnows: true, playerIsSubject: true },
  ],
};

/**
 * Get scenario-specific templates or fall back to generic
 */
function getSeedTemplatesForScenario(category: ScenarioCategory): Record<string, SeedTemplate[]> {
  switch (category) {
    case 'espionage':
      return ESPIONAGE_SEEDS;
    case 'underworld':
      return UNDERWORLD_SEEDS;
    case 'corporate':
      return CORPORATE_SEEDS;
    case 'creative':
      return CREATIVE_SEEDS;
    case 'healthcare':
      return HEALTHCARE_SEEDS;
    case 'education':
      return EDUCATION_SEEDS;
    case 'legal':
      return LEGAL_SEEDS;
    case 'religious':
      return RELIGIOUS_SEEDS;
    case 'small_town':
      return SMALL_TOWN_SEEDS;
    case 'family_drama':
      return FAMILY_DRAMA_SEEDS;
    case 'inheritance':
      return INHERITANCE_SEEDS;
    case 'politics':
      return POLITICS_SEEDS;
    case 'tech':
      return TECH_SEEDS;
    case 'military':
      return MILITARY_SEEDS;
    case 'service':
      return SERVICE_SEEDS;
    case 'sports':
      return SPORTS_SEEDS;
    case 'mental_health':
      return MENTAL_HEALTH_SEEDS;
    case 'trades':
      return TRADES_SEEDS;
    case 'academic':
      return ACADEMIC_SEEDS;
    default:
      // For generic/domestic, combine generic seeds with universal relationship seeds
      return { ...SEED_TEMPLATES, ...UNIVERSAL_RELATIONSHIP_SEEDS };
  }
}

/**
 * Generate story seeds for a new identity
 * Creates concrete facts that will drive narrative
 *
 * Key principle: The WITNESS knows the secret and can reveal it.
 * The SUBJECT is who the secret is about - they won't confess unprompted.
 * For scenario-aware generation, uses profession-specific templates.
 */
export function generateStorySeeds(
  identity: Identity,
  seedCount: number = 8
): StorySeed[] {
  const seeds: StorySeed[] = [];
  const npcs = identity.npcs.filter(n => !n.isDead && n.isActive);

  if (npcs.length < 2) return seeds;

  // Detect scenario category for appropriate seed selection
  const scenarioCategory = detectScenarioCategory(
    identity.scenario.profession || '',
    identity.generatedPersona?.type || ''
  );

  // Get scenario-specific templates (or generic fallback)
  const scenarioTemplates = getSeedTemplatesForScenario(scenarioCategory);
  const types = Object.keys(scenarioTemplates);

  // Also keep some generic templates for variety (30% chance)
  const genericTypes = Object.keys(SEED_TEMPLATES);

  const usedPairs = new Set<string>();

  for (let i = 0; i < seedCount && i < 15; i++) {
    // 70% chance to use scenario-specific, 30% chance generic (for variety)
    const useScenario = scenarioCategory !== 'generic' && Math.random() < 0.7;
    const templates = useScenario ? scenarioTemplates : SEED_TEMPLATES;
    const availableTypes = useScenario ? types : genericTypes;

    // Pick a random seed type
    const type = availableTypes[Math.floor(Math.random() * availableTypes.length)];
    const templateOptions = templates[type];
    if (!templateOptions || templateOptions.length === 0) continue;

    const templateObj = templateOptions[Math.floor(Math.random() * templateOptions.length)];

    // Pick NPCs for this seed
    // witness = the NPC who KNOWS the secret (they will reveal it)
    const witness = npcs[Math.floor(Math.random() * npcs.length)];

    // Determine subject - if playerIsSubject, the player is the subject
    // Otherwise, pick another NPC
    let subjectName: string;
    let subjectId: string | null = null; // null means player is subject

    if (templateObj.playerIsSubject) {
      // This seed is about the PLAYER
      subjectName = identity.name;
      subjectId = null; // Player, not an NPC
    } else {
      // This seed is about another NPC
      let subject = npcs[Math.floor(Math.random() * npcs.length)];

      // Ensure different NPCs for witness and subject
      let attempts = 0;
      while (subject.id === witness.id && attempts < 10) {
        subject = npcs[Math.floor(Math.random() * npcs.length)];
        attempts++;
      }
      if (subject.id === witness.id) continue;

      subjectName = subject.name;
      subjectId = subject.id;
    }

    // Avoid duplicate pairs for the same type
    const pairKey = `${type}-${witness.id}-${subjectId || 'player'}`;
    if (usedPairs.has(pairKey)) continue;
    usedPairs.add(pairKey);

    // Generate the fact with clear name attribution
    const fact = templateObj.template
      .replace(/{witness}/g, witness.name)
      .replace(/{subject}/g, subjectName)
      .replace(/{player}/g, identity.name)
      .replace(/{workplace}/g, identity.scenario.workplace || 'the office');

    // The WITNESS knows this secret (not the subject!)
    // This is crucial - the witness can reveal it, the subject wouldn't
    const knownBy = [witness.id];

    // Sometimes a third party also witnessed it (30% chance)
    if (Math.random() > 0.7) {
      const thirdParty = npcs.find(n => n.id !== witness.id && n.id !== subjectId);
      if (thirdParty) knownBy.push(thirdParty.id);
    }

    // Determine severity based on type - scenario-specific types are generally more severe
    const severityMap: Record<string, StorySeed['severity']> = {
      crime: 'major',
      affair: 'moderate',
      betrayal: 'major',
      evidence: 'moderate',
      secret: Math.random() > 0.5 ? 'explosive' : 'major',
      // Espionage seeds
      double_agent: 'explosive',
      blown_cover: 'explosive',
      // Underworld seeds
      power: 'major',
      // Corporate seeds
      fraud: 'explosive',
      scandal: 'major',
      // Creative seeds - scandal and secrets already defined above
    };

    seeds.push({
      id: crypto.randomUUID(),
      fact,
      knownBy,
      type: (type === 'double_agent' || type === 'blown_cover' ? 'betrayal' :
             type === 'fraud' || type === 'power' ? 'crime' :
             type === 'scandal' ? 'affair' :
             type === 'secrets' ? 'secret' :
             type) as StorySeed['type'],
      severity: severityMap[type] || 'moderate',
      revealedToPlayer: false,
      revealedTo: [],
      narrativePriority: i + 1, // Earlier seeds have higher priority
    });
  }

  return seeds;
}

/**
 * Options for revelation selection
 */
export interface RevelationOptions {
  /** Number of messages THIS NPC has sent (not total messages) */
  npcMessageCount: number;
  /** Total messages in conversation (for context) */
  totalMessageCount: number;
  /** Has another NPC already revealed something major this conversation round? */
  majorRevealedThisRound: boolean;
  /** IDs of seeds already revealed in this conversation (any NPC) */
  alreadyRevealedSeedIds: string[];
}

/**
 * Select what an NPC should reveal in this conversation based on pressure
 *
 * Key change: Uses per-NPC message count, not total messages.
 * This prevents ALL NPCs from hitting "high pressure" simultaneously.
 */
export function selectRevelationForNPC(
  npc: NPC,
  allNpcs: NPC[],
  storySeeds: StorySeed[],
  messageCountOrOptions: number | RevelationOptions,
  identity: Identity
): RevelationDirective {
  // Support both old signature (just messageCount) and new options object
  const options: RevelationOptions = typeof messageCountOrOptions === 'number'
    ? {
        npcMessageCount: messageCountOrOptions, // Fallback: use total as NPC count
        totalMessageCount: messageCountOrOptions,
        majorRevealedThisRound: false,
        alreadyRevealedSeedIds: [],
      }
    : messageCountOrOptions;

  const { npcMessageCount, totalMessageCount, majorRevealedThisRound, alreadyRevealedSeedIds } = options;

  // Find seeds this NPC knows about that haven't been revealed
  const knownSeeds = storySeeds.filter(
    seed => seed.knownBy.includes(npc.id) &&
            !seed.revealedToPlayer &&
            !alreadyRevealedSeedIds.includes(seed.id)
  );

  // Sort by priority (lower = reveal sooner)
  knownSeeds.sort((a, b) => a.narrativePriority - b.narrativePriority);

  // Determine revelation based on THIS NPC's message count (not total)
  let mustReveal: string | null = null;
  let revealAfterMessages = 999;

  // If another NPC already revealed something major this round, this NPC only hints
  if (majorRevealedThisRound && knownSeeds.length > 0) {
    // Don't reveal, just hint
    mustReveal = knownSeeds[0].fact;
    revealAfterMessages = 3; // Will hint, not fully reveal
  } else if (npcMessageCount >= 4 && knownSeeds.length > 0) {
    // HIGH PRESSURE: This NPC has spoken 4+ times - time to reveal
    const majorSeed = knownSeeds.find(s => s.severity === 'explosive' || s.severity === 'major')
      || knownSeeds[0];
    if (majorSeed) {
      mustReveal = majorSeed.fact;
      revealAfterMessages = 0; // Reveal immediately
    }
  } else if (npcMessageCount >= 2 && knownSeeds.length > 0) {
    // MEDIUM PRESSURE: This NPC has spoken 2-3 times - building tension
    mustReveal = knownSeeds[0].fact;
    revealAfterMessages = 2;
  } else if (npcMessageCount >= 1 && totalMessageCount >= 4 && knownSeeds.length > 0) {
    // LOW PRESSURE: Conversation is heating up, start hinting
    mustReveal = knownSeeds[0].fact;
    revealAfterMessages = 3;
  }

  // Generate conversation goal based on emotional state
  const conversationGoal = generateConversationGoal(npc, allNpcs, identity);

  // Generate specific conflicts with other NPCs present
  const conflicts = generateNPCConflicts(npc, allNpcs, storySeeds, identity);

  return {
    npcId: npc.id,
    mustReveal,
    revealAfterMessages,
    conversationGoal,
    conflicts,
  };
}

/**
 * Generate a specific conversation goal for an NPC
 */
function generateConversationGoal(npc: NPC, otherNpcs: NPC[], identity: Identity): string {
  const goals: string[] = [];

  // Base goal on emotional state
  switch (npc.currentEmotionalState) {
    case 'angry':
    case 'furious':
      goals.push(`Confront someone about what's making you angry. NAME the specific thing.`);
      break;
    case 'suspicious':
      goals.push(`Get someone to slip up and reveal what they're hiding. Ask pointed questions.`);
      break;
    case 'guilty':
      goals.push(`You're close to confessing something. The pressure is getting to you.`);
      break;
    case 'scared':
    case 'anxious':
      goals.push(`Warn others about what you've seen or heard. Be specific about the danger.`);
      break;
    case 'bitter':
    case 'resentful':
      goals.push(`Make a cutting remark about someone's past actions. Bring up old wounds.`);
      break;
    case 'sad':
    case 'grieving':
      goals.push(`Share what's really bothering you. Open up about the actual problem.`);
      break;
    default:
      goals.push(`Push someone to reveal what they know. Don't let them deflect.`);
  }

  // Add relationship-based goal
  if (otherNpcs.length > 0) {
    const target = otherNpcs[Math.floor(Math.random() * otherNpcs.length)];
    if (npc.relationshipStatus.toLowerCase().includes('tense') ||
        npc.relationshipStatus.toLowerCase().includes('hostile')) {
      goals.push(`You have unfinished business with ${target.name}. Address it directly.`);
    }
  }

  return goals.join(' ');
}

/**
 * Generate specific conflicts between NPCs
 */
function generateNPCConflicts(
  npc: NPC,
  otherNpcs: NPC[],
  storySeeds: StorySeed[],
  identity: Identity
): { npcName: string; conflict: string }[] {
  const conflicts: { npcName: string; conflict: string }[] = [];

  for (const other of otherNpcs.slice(0, 3)) {
    // Check if there's a story seed connecting them
    const connectingSeed = storySeeds.find(seed =>
      (seed.knownBy.includes(npc.id) && seed.fact.includes(other.name)) ||
      (seed.knownBy.includes(other.id) && seed.fact.includes(npc.name))
    );

    if (connectingSeed) {
      if (connectingSeed.knownBy.includes(npc.id)) {
        conflicts.push({
          npcName: other.name,
          conflict: `You know something damaging about ${other.name}. Use it as leverage.`,
        });
      } else {
        conflicts.push({
          npcName: other.name,
          conflict: `${other.name} knows something about you. Find out what and neutralize them.`,
        });
      }
    } else {
      // Generate generic conflict based on roles
      if (npc.tier === 'core' && other.tier === 'core') {
        conflicts.push({
          npcName: other.name,
          conflict: `You and ${other.name} are competing for ${identity.name}'s attention/loyalty.`,
        });
      }
    }
  }

  return conflicts;
}

/**
 * Build the revelation directive prompt section
 * This is placed at the END of the system prompt for maximum weight.
 */
export function buildRevelationPrompt(directive: RevelationDirective, messageCount: number): string {
  const parts: string[] = [];

  // Add the must-reveal directive if applicable
  if (directive.mustReveal) {
    if (messageCount >= directive.revealAfterMessages) {
      // CRITICAL: This is the most important part - force the exact revelation
      parts.push(`
╔══════════════════════════════════════════════════════════════════╗
║                    MANDATORY REVELATION                          ║
╚══════════════════════════════════════════════════════════════════╝

Your response MUST include this EXACT information (paraphrase allowed):
>>> ${directive.mustReveal} <<<

HOW TO REVEAL IT:
- USE THE NAME of who you're accusing: "I know what [NAME] did" - NOT just "you"
- Be specific: "I saw [NAME] at the office that night"
- Or confront directly with their name: "[NAME], don't lie to me"
- Or let it slip: "Wait... you didn't know about what [NAME] did?"

DO NOT:
- Say vague things like "I know what you did" without a name
- Make up different accusations
- Talk about things NOT in the revelation above
- Be vague or use metaphors
- Assume OTHER NPCs committed the crime - stick to what's in the revelation

Your message will FAIL if it doesn't contain the key details from the revelation above.`);
    } else {
      parts.push(`
=== INFORMATION YOU KNOW ===
You have discovered: "${directive.mustReveal}"

You're not ready to reveal this yet. For now:
- Drop hints that make them nervous
- Ask pointed questions
- React to what THEY say, don't dump information
- Build tension for ${directive.revealAfterMessages - messageCount} more exchanges`);
    }
  } else {
    // No revelation directive - focus on reacting to the conversation
    parts.push(`
=== CONVERSATION MODE ===
React to what others are saying. Ask questions. Show emotion.
DO NOT make up accusations or reveal secrets you don't have.
If someone accuses you, respond naturally - deny, deflect, or be honest.`);
  }

  // Add conversation goal
  parts.push(`
=== YOUR GOAL ===
${directive.conversationGoal}`);

  // Add specific conflicts (only if relevant)
  if (directive.conflicts.length > 0) {
    parts.push(`
=== TENSIONS ===`);
    for (const conflict of directive.conflicts) {
      parts.push(`• ${conflict.npcName}: ${conflict.conflict}`);
    }
  }

  return parts.join('\n');
}

/**
 * Mark a story seed as revealed
 */
export function markSeedRevealed(
  seeds: StorySeed[],
  seedId: string,
  revealedTo: string
): StorySeed[] {
  return seeds.map(seed => {
    if (seed.id === seedId) {
      return {
        ...seed,
        revealedToPlayer: revealedTo === 'player' || seed.revealedToPlayer,
        revealedTo: [...seed.revealedTo, revealedTo],
      };
    }
    return seed;
  });
}

/**
 * Check if a message contains a revelation and mark it
 */
export function detectAndMarkRevelation(
  message: string,
  npcId: string,
  seeds: StorySeed[]
): { revealed: StorySeed | null; updatedSeeds: StorySeed[] } {
  // Look for seeds this NPC knows that might have been revealed
  const npcSeeds = seeds.filter(s => s.knownBy.includes(npcId) && !s.revealedToPlayer);

  for (const seed of npcSeeds) {
    // Check if key parts of the fact appear in the message
    const factWords = seed.fact.toLowerCase().split(' ').filter(w => w.length > 4);
    const messageWords = message.toLowerCase();

    const matchCount = factWords.filter(w => messageWords.includes(w)).length;
    const matchRatio = matchCount / factWords.length;

    // If enough key words match, consider it revealed
    if (matchRatio > 0.3) {
      return {
        revealed: seed,
        updatedSeeds: markSeedRevealed(seeds, seed.id, 'player'),
      };
    }
  }

  return { revealed: null, updatedSeeds: seeds };
}

/**
 * Generate inter-NPC relationship dynamics for richer interactions
 */
export function generateNPCDynamics(npcs: NPC[]): Map<string, Map<string, string>> {
  const dynamics = new Map<string, Map<string, string>>();

  const dynamicTypes = [
    'rivals for the same thing',
    'former allies now distrustful',
    'one owes the other a favor',
    'shared a secret that binds them',
    'one betrayed the other in the past',
    'competing for someone\'s affection',
    'one knows something the other desperately needs',
    'have history nobody else knows about',
  ];

  for (const npc1 of npcs) {
    const npc1Dynamics = new Map<string, string>();

    for (const npc2 of npcs) {
      if (npc1.id === npc2.id) continue;

      // Assign a random dynamic
      const dynamic = dynamicTypes[Math.floor(Math.random() * dynamicTypes.length)];
      npc1Dynamics.set(npc2.id, dynamic);
    }

    dynamics.set(npc1.id, npc1Dynamics);
  }

  return dynamics;
}
