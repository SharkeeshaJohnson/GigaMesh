export interface EmotionalImpact {
  type: 'positive' | 'negative' | 'neutral';
  intensity: number; // 0-1
  affectedMeters: string[];
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  emotionalImpact?: EmotionalImpact;
}

export interface Conversation {
  id: string;
  identityId: string;
  npcId: string;
  day: number;
  messages: Message[];
  createdAt: Date;
}
