// Image Generation Model Configuration for LifeSim

export const IMAGE_MODEL_CONFIG = {
  // Primary image generation model - OpenAI DALL-E 3 via portal API
  // Note: openai-gpt-image-1 was returning 500 errors, using dall-e-3 as fallback
  characterGeneration: "openai-dall-e-3",

  // Scene/background generation
  sceneGeneration: "openai-dall-e-3",

  // Quick emotion sprite variants
  emotionSprite: "openai-dall-e-3",
};

// Image generation settings
export const IMAGE_SETTINGS = {
  // Character sprite settings
  character: {
    width: 512,
    height: 512,
    steps: 25,
    guidance: 7.5,
  },

  // Chat image settings (when NPCs send images)
  chatImage: {
    width: 768,
    height: 512,
    steps: 20,
    guidance: 7.0,
  },

  // Emotion sprite variants
  emotionSprite: {
    width: 256,
    height: 256,
    steps: 15,
    guidance: 6.0,
  },
};

// Base style prompts for consistent pixel art aesthetic
export const STYLE_PROMPTS = {
  // Character portrait style
  characterBase: "pixel art character portrait, Stardew Valley style, retro game aesthetic, clean pixel work, warm colors, detailed sprite, game character, 16-bit style",

  // Scene/image style for chat
  sceneBase: "pixel art scene, Stardew Valley style, retro game aesthetic, cozy atmosphere, warm lighting, 16-bit style illustration",

  // Emotion modifiers
  emotions: {
    neutral: "calm expression, relaxed pose",
    happy: "bright smile, joyful expression, cheerful pose",
    sad: "downcast eyes, melancholic expression, slumped shoulders",
    angry: "furrowed brow, intense expression, aggressive pose",
    suspicious: "narrowed eyes, skeptical expression, guarded pose",
    loving: "warm smile, affectionate gaze, gentle expression",
    scared: "wide eyes, fearful expression, defensive pose",
  },
};

// Types of images NPCs can generate
export type NPCImageType =
  | 'selfie'           // NPC sends a picture of themselves
  | 'scene'            // NPC describes/shows a scene
  | 'meme'             // Humorous image
  | 'reaction'         // Reaction image
  | 'memory'           // Image of a shared memory
  | 'evidence';        // Proof of something (dramatic moments)

export interface ImageGenerationRequest {
  type: NPCImageType;
  npcName: string;
  npcAppearance?: string; // Physical description from NPC data
  description: string;    // What the image should show
  emotion?: string;       // For selfies - emotional state
  context?: string;       // Additional context for the scene
  // Sprite URLs for compositing (ensures character consistency)
  npcSpriteUrl?: string;  // NPC's actual sprite for compositing
  playerSpriteUrl?: string; // Player's sprite if included in image
  includePlayer?: boolean; // Whether to include player in the image
}

export interface ImageGenerationResult {
  success: boolean;
  imageUrl?: string;
  error?: string;
  type: NPCImageType;
  usedCompositing?: boolean; // Whether sprite compositing was used
}

// Background-only prompts for compositing workflow
export const BACKGROUND_PROMPTS = {
  office: "pixel art office interior, empty room, desk and chair, warm lighting, Stardew Valley style, no people, cozy workspace",
  home: "pixel art cozy home interior, empty living room, warm lighting, comfortable furniture, Stardew Valley style, no people",
  outdoors: "pixel art outdoor scene, nature background, sunny day, trees and grass, Stardew Valley style, no people, peaceful",
  cafe: "pixel art coffee shop interior, empty cafe, warm lighting, tables and chairs, cozy atmosphere, Stardew Valley style, no people",
  night: "pixel art night scene, starry sky, moonlight, peaceful evening, Stardew Valley style, no people",
  party: "pixel art party scene, festive decorations, colorful lights, empty room ready for celebration, Stardew Valley style, no people",
  beach: "pixel art beach scene, ocean waves, sandy shore, sunny day, Stardew Valley style, no people, relaxing",
  city: "pixel art city street, buildings and shops, daytime, urban scene, Stardew Valley style, no people",
};
