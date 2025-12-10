import { NPC } from './npc';

export type JumpType = 'day' | 'week';
export type EventSeverity = 'minor' | 'moderate' | 'major' | 'life-changing';
export type ChangeType = 'relationship' | 'status' | 'knowledge' | 'emotional' | 'death';

export interface SimulationEvent {
  id: string;
  title: string;
  description: string;
  involvedNpcs: string[];
  consequenceChain: string;
  severity: EventSeverity;
}

export interface MeterChange {
  meter: string;
  previousValue: number;
  newValue: number;
  reason: string;
}

export interface NPCChange {
  npcId: string;
  changeType: ChangeType;
  description: string;
}

export interface SimulationResult {
  id: string;
  identityId: string;
  fromDay: number;
  toDay: number;
  jumpType: JumpType;
  events: SimulationEvent[];
  meterChanges: MeterChange[];
  npcChanges: NPCChange[];
  newNpcs: NPC[];
}

export interface SpawnTrigger {
  type: 'mention' | 'explicit' | 'action-implied' | 'ai-driven';
  source: string;
  characterType: string;
}
