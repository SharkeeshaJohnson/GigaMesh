// Sprite Cache for LifeSim
// Caches generated images in IndexedDB for persistence

import { EmotionType } from './types/npc';

// PixelLab user ID (constant for this project)
const PIXELLAB_USER_ID = '0d64bd67-d677-43e0-8926-b89a45b8d74a';

/**
 * Characters with breathing-idle animations available
 * Maps character ID to whether they have complete south-facing breathing animation
 */
const CHARACTERS_WITH_BREATHING_ANIMATION: Set<string> = new Set([
  // Characters confirmed to have breathing-idle animations
  '84b48e89-0ec8-4ead-bfa6-c4a724f8db77', // black-woman (8 directions)
  'a911574b-37dc-4e7f-b3b2-40b651c5259e', // fat-boy (7 animations)
  '2d3c6279-716c-4f2d-afa4-2d569d53d553', // dominatrix (5 animations)
  '93aab9ab-3642-43b2-b3b7-6c4c2b66df6d', // gay-woman (2 animations)
  '2dc75f18-f7ea-40e7-8fb0-489f59c3a3a1', // man (2 animations)
  '046f0dc6-9ba6-4e4b-9204-aca8d60d8f3b', // doctor-male (4 animations)
  '0a8fddc0-7319-4e8f-9c52-5cdcc096f72a', // doctor-female (4 animations)
  '693033c5-4c49-4dba-b993-6662db2bf5b3', // student-male (4 animations)
  '70a91e3d-0b5a-4547-85ef-0f63f8a045e3', // student-female (2 animations)
  'b66867ae-41a2-40e9-9ded-b931097bdc10', // teacher-male (4 animations)
  '7c0fa009-320f-44d5-a03f-68d24a63c6e7', // teacher-female (4 animations)
  // Newly queued (processing)
  '8f475f9f-272a-4e29-abab-dbe2be0da067', // woman
  '76a33b6b-334f-4349-8cb3-41b0eb6dfa5b', // closeted-bully
  'd8159f31-5aa3-463f-a3ca-f982d0bf2ecb', // black-man
  '62c02269-903c-4d4a-a8ec-710cbb195b08', // gay-man
  '22a86890-78c7-4cc6-8a90-681b2ce85b6c', // fat-girl
  'fd3e234f-8a06-4444-a386-0b9ee331cbe1', // glamorous-woman
  'a35ea963-d469-4f33-bd8b-2b501380073f', // hipster-guy
  '25eed221-84a2-4fe1-8e5e-8d6293c7b871', // tough-guy
  'd1989864-9d7c-4274-9435-ef4a22c930a9', // elder-woman
  'c509c8dd-be00-420b-876b-61764afef9db', // red-hair-girl
  '2e515f86-d60d-4319-bce8-91a3d4014f96', // businessman
]);

/**
 * Extract character ID from a PixelLab sprite URL
 */
export function extractCharacterIdFromUrl(spriteUrl: string): string | null {
  if (!spriteUrl) return null;

  // URL format: https://backblaze.pixellab.ai/file/pixellab-characters/{userId}/{characterId}/rotations/south.png
  // Also handles URLs with query params like ?t=123456
  const match = spriteUrl.match(/pixellab-characters\/[^/]+\/([a-f0-9-]{36})\//);
  if (match) {
    console.log(`[SpriteCache] Extracted character ID: ${match[1]} from URL`);
  }
  return match ? match[1] : null;
}

/**
 * Check if a character has breathing animation available
 */
export function hasBreathingAnimation(spriteUrl: string): boolean {
  const characterId = extractCharacterIdFromUrl(spriteUrl);
  return characterId ? CHARACTERS_WITH_BREATHING_ANIMATION.has(characterId) : false;
}

/**
 * Get the breathing animation frame URLs for a sprite
 * Returns null if no animation is available
 * PixelLab stores animations as individual PNG frames, not GIFs
 */
export function getBreathingAnimationFrames(spriteUrl: string, direction: string = 'south', frameCount: number = 4): string[] | null {
  const characterId = extractCharacterIdFromUrl(spriteUrl);

  if (!characterId) {
    console.log(`[SpriteCache] Could not extract character ID from: ${spriteUrl}`);
    return null;
  }

  if (!CHARACTERS_WITH_BREATHING_ANIMATION.has(characterId)) {
    console.log(`[SpriteCache] Character ${characterId} does not have breathing animation in registry`);
    return null;
  }

  // Construct frame URLs
  // Format: https://backblaze.pixellab.ai/file/pixellab-characters/{userId}/{characterId}/animations/breathing-idle/{direction}/frame_00X.png
  const frames: string[] = [];
  for (let i = 0; i < frameCount; i++) {
    const frameNum = i.toString().padStart(3, '0');
    frames.push(`https://backblaze.pixellab.ai/file/pixellab-characters/${PIXELLAB_USER_ID}/${characterId}/animations/breathing-idle/${direction}/frame_${frameNum}.png`);
  }

  console.log(`[SpriteCache] Returning ${frameCount} breathing animation frames for character ${characterId}`);
  return frames;
}

/**
 * @deprecated Use getBreathingAnimationFrames instead - PixelLab doesn't serve GIFs directly
 * This function is kept for backwards compatibility but returns null
 */
export function getBreathingAnimationUrl(spriteUrl: string, direction: string = 'south'): string | null {
  // PixelLab stores animations as PNG frames, not GIFs
  // Return null to fall back to static sprite
  return null;
}

/**
 * Add a character ID to the set of characters with breathing animations
 * (Called when we know a new animation has been created)
 */
export function registerBreathingAnimation(characterId: string): void {
  CHARACTERS_WITH_BREATHING_ANIMATION.add(characterId);
}

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
