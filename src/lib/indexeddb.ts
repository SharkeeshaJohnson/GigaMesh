import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Identity } from './types/identity';
import { Conversation } from './types/conversation';
import { Action } from './types/action';
import { SimulationResult } from './types/simulation';

interface LifeSimDB extends DBSchema {
  identities: {
    key: string;
    value: Identity;
    indexes: { 'by-slot': number };
  };
  conversations: {
    key: string;
    value: Conversation;
    indexes: {
      'by-identity': string;
      'by-identity-day': [string, number];
      'by-npc': string;
    };
  };
  actions: {
    key: string;
    value: Action;
    indexes: {
      'by-identity': string;
      'by-identity-day': [string, number];
      'by-status': string;
    };
  };
  simulations: {
    key: string;
    value: SimulationResult;
    indexes: { 'by-identity': string };
  };
}

const DB_NAME = 'lifesim';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<LifeSimDB>> | null = null;

export async function getDB(): Promise<IDBPDatabase<LifeSimDB>> {
  if (!dbPromise) {
    dbPromise = openDB<LifeSimDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Identities store
        if (!db.objectStoreNames.contains('identities')) {
          const identityStore = db.createObjectStore('identities', { keyPath: 'id' });
          identityStore.createIndex('by-slot', 'slotIndex');
        }

        // Conversations store
        if (!db.objectStoreNames.contains('conversations')) {
          const convStore = db.createObjectStore('conversations', { keyPath: 'id' });
          convStore.createIndex('by-identity', 'identityId');
          convStore.createIndex('by-identity-day', ['identityId', 'day']);
          convStore.createIndex('by-npc', 'npcId');
        }

        // Actions store
        if (!db.objectStoreNames.contains('actions')) {
          const actionStore = db.createObjectStore('actions', { keyPath: 'id' });
          actionStore.createIndex('by-identity', 'identityId');
          actionStore.createIndex('by-identity-day', ['identityId', 'day']);
          actionStore.createIndex('by-status', 'status');
        }

        // Simulations store
        if (!db.objectStoreNames.contains('simulations')) {
          const simStore = db.createObjectStore('simulations', { keyPath: 'id' });
          simStore.createIndex('by-identity', 'identityId');
        }
      },
    });
  }
  return dbPromise;
}

type StoreNames = 'identities' | 'conversations' | 'actions' | 'simulations';

// Generic CRUD operations
export async function saveToIndexedDB<T extends StoreNames>(
  storeName: T,
  data: LifeSimDB[T]['value']
): Promise<string> {
  const db = await getDB();
  return db.put(storeName, data);
}

export async function getFromIndexedDB<T extends StoreNames>(
  storeName: T,
  key: string
): Promise<LifeSimDB[T]['value'] | undefined> {
  const db = await getDB();
  return db.get(storeName, key);
}

export async function deleteFromIndexedDB<T extends StoreNames>(
  storeName: T,
  key: string
): Promise<void> {
  const db = await getDB();
  return db.delete(storeName, key);
}

export async function getAllFromIndexedDB<T extends StoreNames>(
  storeName: T
): Promise<LifeSimDB[T]['value'][]> {
  const db = await getDB();
  return db.getAll(storeName);
}

// Identity-specific operations
export async function getIdentityBySlot(slotIndex: number): Promise<Identity | undefined> {
  const db = await getDB();
  return db.getFromIndex('identities', 'by-slot', slotIndex);
}

export async function getAllIdentities(): Promise<Identity[]> {
  return getAllFromIndexedDB('identities');
}

// Conversation-specific operations
export async function getConversationsForIdentity(identityId: string): Promise<Conversation[]> {
  const db = await getDB();
  return db.getAllFromIndex('conversations', 'by-identity', identityId);
}

export async function getConversationsForDay(
  identityId: string,
  day: number
): Promise<Conversation[]> {
  const db = await getDB();
  return db.getAllFromIndex('conversations', 'by-identity-day', [identityId, day]);
}

export async function getConversationsForNPC(npcId: string): Promise<Conversation[]> {
  const db = await getDB();
  return db.getAllFromIndex('conversations', 'by-npc', npcId);
}

// Action-specific operations
export async function getActionsForIdentity(identityId: string): Promise<Action[]> {
  const db = await getDB();
  return db.getAllFromIndex('actions', 'by-identity', identityId);
}

export async function getQueuedActions(identityId: string): Promise<Action[]> {
  const actions = await getActionsForIdentity(identityId);
  return actions.filter((a) => a.status === 'queued');
}

export async function getActionsForDay(identityId: string, day: number): Promise<Action[]> {
  const db = await getDB();
  return db.getAllFromIndex('actions', 'by-identity-day', [identityId, day]);
}

// Clear all conversations for an identity
export async function clearConversationsForIdentity(identityId: string): Promise<number> {
  const db = await getDB();
  const conversations = await db.getAllFromIndex('conversations', 'by-identity', identityId);

  for (const conv of conversations) {
    await db.delete('conversations', conv.id);
  }

  console.log(`[IndexedDB] Cleared ${conversations.length} conversations for identity ${identityId}`);
  return conversations.length;
}

// Simulation-specific operations
export async function getSimulationsForIdentity(identityId: string): Promise<SimulationResult[]> {
  const db = await getDB();
  return db.getAllFromIndex('simulations', 'by-identity', identityId);
}
