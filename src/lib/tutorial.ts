/**
 * Tutorial System for LifeSim
 *
 * Guides new users through game features with interactive steps.
 * Tutorial only shows once - completion is persisted in localStorage.
 */

export type TutorialStep =
  | 'welcome'
  | 'npc_list'
  | 'select_npc'
  | 'send_message'
  | 'npc_response'
  | 'emotions'
  | 'group_chat'
  | 'actions'
  | 'simulation'
  | 'complete';

export interface TutorialStepContent {
  id: TutorialStep;
  title: string;
  content: string;
  highlight?: 'npc-list' | 'chat-input' | 'npc-item' | 'emotions' | 'actions-btn' | 'simulate-btn' | 'group-btn';
  action: 'next' | 'click-npc' | 'send-message' | 'wait-response' | 'finish';
  suggestedMessage?: string;
  hint?: string; // Red bold hint text shown below content
}

export const TUTORIAL_STEPS: TutorialStepContent[] = [
  {
    id: 'welcome',
    title: 'Welcome to The Sprouts',
    content: 'This is the reality of the life you chose to play.',
    hint: 'This window is draggable! Just click and drag!',
    action: 'next',
  },
  {
    id: 'npc_list',
    title: 'Meet the People in Your Life',
    content: 'On the left, you\'ll see the characters in your world. Each of them have different personalities and the way they feel about you.',
    highlight: 'npc-list',
    action: 'next',
  },
  {
    id: 'select_npc',
    title: 'Start a Conversation',
    content: 'Click on any character to chat with them privately. Go ahead - click on someone to start talking.',
    highlight: 'npc-item',
    action: 'click-npc',
  },
  {
    id: 'send_message',
    title: 'Say Something',
    content: 'Type a message and press Enter. Try asking them something like:',
    highlight: 'chat-input',
    action: 'send-message',
    suggestedMessage: 'Hey, how are you doing today?',
  },
  {
    id: 'npc_response',
    title: 'They Have Minds of Their Own',
    content: 'Notice how they respond based on their personality and current mood. Every NPC is different - some are friendly, some are suspicious, some have secrets...',
    action: 'wait-response',
  },
  {
    id: 'emotions',
    title: 'Emotions Matter',
    content: 'Each character has emotional states that affect how they act. A jealous NPC behaves differently than a happy one. Watch for emotional cues in their responses.',
    highlight: 'emotions',
    action: 'next',
  },
  {
    id: 'group_chat',
    title: 'Group Conversations',
    content: 'You can create group chats with more than 1 character as well by clicking on + New Conversation',
    highlight: 'group-btn',
    action: 'next',
  },
  {
    id: 'actions',
    title: 'Take Actions',
    content: 'Beyond talking, you can take actions that affect your world. Lie, confess, investigate, seduce - your choices have real consequences.',
    highlight: 'actions-btn',
    action: 'next',
  },
  {
    id: 'simulation',
    title: 'Time Moves Forward',
    content: 'When you\'re ready, advance to the next day. Life goes on while you\'re away - NPCs make their own choices, events unfold, and the world changes.',
    highlight: 'simulate-btn',
    action: 'next',
  },
  {
    id: 'complete',
    title: 'You\'re Ready!',
    content: 'That\'s the basics. Remember: every choice has consequences, and NPCs remember everything. Your story is yours to write. Good luck.',
    action: 'finish',
  },
];

const TUTORIAL_STORAGE_KEY = 'lifesim_tutorial_completed';

/**
 * Check if the user has completed the tutorial
 */
export function hasTutorialCompleted(): boolean {
  if (typeof window === 'undefined') return true; // SSR - assume completed
  return localStorage.getItem(TUTORIAL_STORAGE_KEY) === 'true';
}

/**
 * Mark the tutorial as completed
 */
export function setTutorialCompleted(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TUTORIAL_STORAGE_KEY, 'true');
}

/**
 * Reset tutorial (for testing)
 */
export function resetTutorial(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TUTORIAL_STORAGE_KEY);
}

/**
 * Get the current step content
 */
export function getTutorialStepContent(step: TutorialStep): TutorialStepContent | undefined {
  return TUTORIAL_STEPS.find(s => s.id === step);
}

/**
 * Get the next step after the current one
 */
export function getNextTutorialStep(currentStep: TutorialStep): TutorialStep | null {
  const currentIndex = TUTORIAL_STEPS.findIndex(s => s.id === currentStep);
  if (currentIndex === -1 || currentIndex >= TUTORIAL_STEPS.length - 1) {
    return null;
  }
  return TUTORIAL_STEPS[currentIndex + 1].id;
}

/**
 * Get step index (for progress indicator)
 */
export function getTutorialStepIndex(step: TutorialStep): number {
  return TUTORIAL_STEPS.findIndex(s => s.id === step);
}

/**
 * Get total number of steps
 */
export function getTutorialTotalSteps(): number {
  return TUTORIAL_STEPS.length;
}
