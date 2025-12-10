// Sprite Cache for LifeSim
// Caches generated images in IndexedDB for persistence

import { EmotionType } from './types/npc';

const DB_NAME = 'lifesim-sprite-cache';
const DB_VERSION = 1;
const STORE_NAME = 'sprites';

interface CachedSprite {
  key: string;           // Unique identifier (npcId + emotion, or chatImageHash)
  imageUrl: string;      // URL or base64 data
  createdAt: number;     // Timestamp
  type: 'character' | 'emotion' | 'chat';
  npcId?: string;
  emotion?: EmotionType;
  description?: string;  // Original prompt for chat images
}

let dbPromise: Promise<IDBDatabase> | null = null;

/**
 * Initialize the IndexedDB database for sprite caching
 */
function initDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('Failed to open sprite cache DB:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'key' });
        store.createIndex('type', 'type', { unique: false });
        store.createIndex('npcId', 'npcId', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
  });

  return dbPromise;
}

/**
 * Generate a cache key for an NPC's emotion sprite
 */
export function getEmotionSpriteKey(npcId: string, emotion: EmotionType): string {
  return `emotion:${npcId}:${emotion}`;
}

/**
 * Generate a cache key for a chat image based on description hash
 */
export function getChatImageKey(npcId: string, description: string): string {
  // Simple hash function for description
  let hash = 0;
  for (let i = 0; i < description.length; i++) {
    const char = description.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return `chat:${npcId}:${Math.abs(hash).toString(16)}`;
}

/**
 * Get a cached sprite by key
 */
export async function getCachedSprite(key: string): Promise<CachedSprite | null> {
  try {
    const db = await initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);

      request.onerror = () => {
        console.error('Failed to get cached sprite:', request.error);
        resolve(null);
      };

      request.onsuccess = () => {
        resolve(request.result || null);
      };
    });
  } catch (error) {
    console.error('Error accessing sprite cache:', error);
    return null;
  }
}

/**
 * Cache a sprite
 */
export async function cacheSprite(sprite: CachedSprite): Promise<boolean> {
  try {
    const db = await initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(sprite);

      request.onerror = () => {
        console.error('Failed to cache sprite:', request.error);
        resolve(false);
      };

      request.onsuccess = () => {
        resolve(true);
      };
    });
  } catch (error) {
    console.error('Error caching sprite:', error);
    return false;
  }
}

/**
 * Get all cached emotion sprites for an NPC
 */
export async function getNPCEmotionSprites(npcId: string): Promise<Record<string, string>> {
  try {
    const db = await initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('npcId');
      const request = index.getAll(npcId);

      request.onerror = () => {
        console.error('Failed to get NPC sprites:', request.error);
        resolve({});
      };

      request.onsuccess = () => {
        const sprites: Record<string, string> = {};
        for (const sprite of request.result || []) {
          if (sprite.type === 'emotion' && sprite.emotion) {
            sprites[sprite.emotion] = sprite.imageUrl;
          }
        }
        resolve(sprites);
      };
    });
  } catch (error) {
    console.error('Error getting NPC sprites:', error);
    return {};
  }
}

/**
 * Cache an NPC's emotion sprite
 */
export async function cacheEmotionSprite(
  npcId: string,
  emotion: EmotionType,
  imageUrl: string
): Promise<boolean> {
  const key = getEmotionSpriteKey(npcId, emotion);
  return cacheSprite({
    key,
    imageUrl,
    createdAt: Date.now(),
    type: 'emotion',
    npcId,
    emotion,
  });
}

/**
 * Cache a chat-generated image
 */
export async function cacheChatImage(
  npcId: string,
  description: string,
  imageUrl: string
): Promise<boolean> {
  const key = getChatImageKey(npcId, description);
  return cacheSprite({
    key,
    imageUrl,
    createdAt: Date.now(),
    type: 'chat',
    npcId,
    description,
  });
}

/**
 * Check if a chat image is already cached
 */
export async function getCachedChatImage(
  npcId: string,
  description: string
): Promise<string | null> {
  const key = getChatImageKey(npcId, description);
  const cached = await getCachedSprite(key);
  return cached?.imageUrl || null;
}

/**
 * Clear old cached sprites (older than specified days)
 */
export async function clearOldSprites(maxAgeDays: number = 30): Promise<number> {
  try {
    const db = await initDB();
    const cutoffTime = Date.now() - (maxAgeDays * 24 * 60 * 60 * 1000);

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('createdAt');
      const range = IDBKeyRange.upperBound(cutoffTime);
      const request = index.openCursor(range);

      let deletedCount = 0;

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          // Don't delete character base sprites, only chat images
          if (cursor.value.type === 'chat') {
            cursor.delete();
            deletedCount++;
          }
          cursor.continue();
        } else {
          resolve(deletedCount);
        }
      };

      request.onerror = () => {
        console.error('Failed to clear old sprites:', request.error);
        resolve(0);
      };
    });
  } catch (error) {
    console.error('Error clearing old sprites:', error);
    return 0;
  }
}

/**
 * Clear all cached sprites for a specific NPC
 */
export async function clearNPCSprites(npcId: string): Promise<boolean> {
  try {
    const db = await initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('npcId');
      const request = index.openCursor(IDBKeyRange.only(npcId));

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve(true);
        }
      };

      request.onerror = () => {
        console.error('Failed to clear NPC sprites:', request.error);
        resolve(false);
      };
    });
  } catch (error) {
    console.error('Error clearing NPC sprites:', error);
    return false;
  }
}
