export type ActionStatus = 'queued' | 'executed';

export interface Action {
  id: string;
  identityId: string;
  day: number;
  content: string;
  scheduledTime?: string; // optional, e.g., "3pm"
  status: ActionStatus;
  createdAt: Date;
}
