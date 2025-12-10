// Image Generation Service for LifeSim
// Uses FLUX API through the AI Portal + Canvas compositing for character consistency

import {
  IMAGE_MODEL_CONFIG,
  IMAGE_SETTINGS,
  STYLE_PROMPTS,
  BACKGROUND_PROMPTS,
  ImageGenerationRequest,
  ImageGenerationResult,
  NPCImageType
} from './image-models';
import {
  createSelfie,
  createReaction,
  createSceneWithCharacter,
  createMemoryImage,
  needsCharacterCompositing,
  needsBackgroundGeneration,
  compositeImage,
  CompositeOptions
} from './image-compositing';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://ai-portal-dev.zetachain.com';

interface FluxResponse {
  images?: Array<{
    url?: string;
    b64_json?: string;
  }>;
  data?: Array<{
    url?: string;
    b64_json?: string;
  }>;
  error?: string;
}

/**
 * Generate an image using FLUX API
 */
export async function generateImage(
  prompt: string,
  settings: typeof IMAGE_SETTINGS.character = IMAGE_SETTINGS.chatImage,
  accessToken: string
): Promise<{ success: boolean; imageUrl?: string; error?: string }> {
  try {
    const response = await fetch(`${API_URL}/v1/images/generations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        model: IMAGE_MODEL_CONFIG.characterGeneration,
        prompt: prompt,
        n: 1,
        size: `${settings.width}x${settings.height}`,
        response_format: 'url',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Image generation failed:', errorText);
      return { success: false, error: `API error: ${response.status}` };
    }

    const data: FluxResponse = await response.json();

    // Handle different response formats
    const imageData = data.images?.[0] || data.data?.[0];
    const imageUrl = imageData?.url || imageData?.b64_json;

    if (!imageUrl) {
      return { success: false, error: 'No image URL in response' };
    }

    return { success: true, imageUrl };
  } catch (error) {
    console.error('Image generation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Build a prompt for NPC image generation based on the request type
 */
export function buildImagePrompt(request: ImageGenerationRequest): string {
  const { type, npcName, npcAppearance, description, emotion, context } = request;

  let baseStyle = STYLE_PROMPTS.sceneBase;
  let specificPrompt = '';

  switch (type) {
    case 'selfie':
      baseStyle = STYLE_PROMPTS.characterBase;
      const emotionMod = emotion && STYLE_PROMPTS.emotions[emotion as keyof typeof STYLE_PROMPTS.emotions]
        ? STYLE_PROMPTS.emotions[emotion as keyof typeof STYLE_PROMPTS.emotions]
        : STYLE_PROMPTS.emotions.neutral;
      specificPrompt = `${npcAppearance || npcName}, ${emotionMod}, selfie angle, looking at camera, ${description}`;
      break;

    case 'scene':
      specificPrompt = `${description}, ${context || ''}, atmospheric scene`;
      break;

    case 'meme':
      specificPrompt = `funny pixel art meme, ${description}, humorous, expressive`;
      break;

    case 'reaction':
      baseStyle = STYLE_PROMPTS.characterBase;
      specificPrompt = `${npcAppearance || npcName}, reaction shot, ${description}, expressive face`;
      break;

    case 'memory':
      specificPrompt = `nostalgic scene, ${description}, ${context || ''}, warm memory feeling`;
      break;

    case 'evidence':
      specificPrompt = `dramatic pixel art, ${description}, ${context || ''}, important moment captured`;
      break;

    default:
      specificPrompt = description;
  }

  return `${baseStyle}, ${specificPrompt}`;
}

/**
 * Generate an NPC image based on a structured request
 */
export async function generateNPCImage(
  request: ImageGenerationRequest,
  accessToken: string
): Promise<ImageGenerationResult> {
  const prompt = buildImagePrompt(request);

  // Use appropriate settings based on type
  const settings = request.type === 'selfie' || request.type === 'reaction'
    ? IMAGE_SETTINGS.character
    : IMAGE_SETTINGS.chatImage;

  const result = await generateImage(prompt, settings, accessToken);

  return {
    ...result,
    type: request.type,
  };
}

/**
 * Parse [IMG:description] tags from NPC responses
 * Returns the description and cleaned text
 */
export function parseImageTags(text: string): {
  cleanedText: string;
  imageRequests: Array<{ description: string; position: number }>;
} {
  const imageRegex = /\[IMG:([^\]]+)\]/g;
  const imageRequests: Array<{ description: string; position: number }> = [];
  let match;

  while ((match = imageRegex.exec(text)) !== null) {
    imageRequests.push({
      description: match[1].trim(),
      position: match.index,
    });
  }

  const cleanedText = text.replace(imageRegex, '').trim();

  return { cleanedText, imageRequests };
}

/**
 * Determine the type of image from the description
 */
export function inferImageType(description: string, npcName: string): NPCImageType {
  const lowerDesc = description.toLowerCase();

  if (lowerDesc.includes('selfie') || lowerDesc.includes('picture of me') || lowerDesc.includes('photo of myself')) {
    return 'selfie';
  }
  if (lowerDesc.includes('meme') || lowerDesc.includes('funny') || lowerDesc.includes('joke')) {
    return 'meme';
  }
  if (lowerDesc.includes('remember') || lowerDesc.includes('memory') || lowerDesc.includes('that time')) {
    return 'memory';
  }
  if (lowerDesc.includes('proof') || lowerDesc.includes('evidence') || lowerDesc.includes('screenshot') || lowerDesc.includes('caught')) {
    return 'evidence';
  }
  if (lowerDesc.includes('reaction') || lowerDesc.includes('face when') || lowerDesc.includes('my face')) {
    return 'reaction';
  }

  return 'scene';
}

/**
 * Check if NPC should send an image based on context
 * This is used in the system prompt to guide NPC behavior
 */
export function getImageGuidance(): string {
  return `
You can send images by including [IMG:description] tags in your response.
Use images sparingly and only when they would add significant value:

- SELFIE: Send a selfie when sharing emotions, proving you're somewhere, or for intimacy
  Example: [IMG:selfie looking tired at the office late at night]

- SCENE: Share a scene when describing a location or situation
  Example: [IMG:the beautiful sunset from the beach]

- MEME: Use humor when appropriate to lighten mood or be sarcastic
  Example: [IMG:meme of someone pretending everything is fine while surrounded by chaos]

- MEMORY: Reference shared memories with visual callbacks
  Example: [IMG:that coffee shop where we first met, empty table by the window]

- EVIDENCE: For dramatic reveals or proof
  Example: [IMG:screenshot of suspicious text messages]

- REACTION: Express strong emotions visually
  Example: [IMG:my shocked face reaction]

Only include ONE image per message maximum. Don't use images in every message.
Images work best for:
- Emotional emphasis
- Humor and sarcasm
- Dramatic story moments
- Proving or showing something specific
- Intimate or personal connections
`;
}

/**
 * Infer a background type from the image description
 */
function inferBackgroundType(description: string): keyof typeof BACKGROUND_PROMPTS | null {
  const lowerDesc = description.toLowerCase();

  if (lowerDesc.includes('office') || lowerDesc.includes('work') || lowerDesc.includes('desk')) {
    return 'office';
  }
  if (lowerDesc.includes('home') || lowerDesc.includes('living room') || lowerDesc.includes('house') || lowerDesc.includes('apartment')) {
    return 'home';
  }
  if (lowerDesc.includes('cafe') || lowerDesc.includes('coffee') || lowerDesc.includes('restaurant')) {
    return 'cafe';
  }
  if (lowerDesc.includes('beach') || lowerDesc.includes('ocean') || lowerDesc.includes('shore')) {
    return 'beach';
  }
  if (lowerDesc.includes('night') || lowerDesc.includes('evening') || lowerDesc.includes('moon') || lowerDesc.includes('star')) {
    return 'night';
  }
  if (lowerDesc.includes('party') || lowerDesc.includes('celebration') || lowerDesc.includes('birthday')) {
    return 'party';
  }
  if (lowerDesc.includes('city') || lowerDesc.includes('street') || lowerDesc.includes('downtown')) {
    return 'city';
  }
  if (lowerDesc.includes('outside') || lowerDesc.includes('outdoor') || lowerDesc.includes('park') || lowerDesc.includes('nature')) {
    return 'outdoors';
  }

  return null;
}

/**
 * Build a background-only prompt (no characters) for compositing workflow
 */
export function buildBackgroundPrompt(description: string): string {
  const bgType = inferBackgroundType(description);

  if (bgType && BACKGROUND_PROMPTS[bgType]) {
    return BACKGROUND_PROMPTS[bgType];
  }

  // Generic background based on description
  return `${STYLE_PROMPTS.sceneBase}, ${description}, empty scene, no people, atmospheric`;
}

/**
 * Generate a character-consistent image using sprite compositing
 * This ensures NPCs and players look exactly like their sprites
 */
export async function generateCharacterConsistentImage(
  request: ImageGenerationRequest,
  accessToken: string
): Promise<ImageGenerationResult> {
  const { type, npcSpriteUrl, playerSpriteUrl, includePlayer, emotion, description } = request;

  try {
    // FAST PATH: Selfies and reactions don't need API calls
    // Just composite the sprite on a gradient background
    if (type === 'selfie' && npcSpriteUrl) {
      const imageUrl = await createSelfie(npcSpriteUrl, emotion);
      return {
        success: true,
        imageUrl,
        type,
        usedCompositing: true,
      };
    }

    if (type === 'reaction' && npcSpriteUrl) {
      const imageUrl = await createReaction(npcSpriteUrl, emotion);
      return {
        success: true,
        imageUrl,
        type,
        usedCompositing: true,
      };
    }

    // SCENE PATH: Pure scenes without characters
    if (type === 'scene' && !includePlayer) {
      // Just generate the scene directly - no compositing needed
      const prompt = buildBackgroundPrompt(description);
      const result = await generateImage(prompt, IMAGE_SETTINGS.chatImage, accessToken);
      return {
        ...result,
        type,
        usedCompositing: false,
      };
    }

    // COMPOSITING PATH: Scenes/memories/evidence with character(s)
    if ((type === 'memory' || type === 'evidence' || type === 'scene') && npcSpriteUrl) {
      // Step 1: Generate background
      const backgroundPrompt = buildBackgroundPrompt(description);
      const bgResult = await generateImage(backgroundPrompt, IMAGE_SETTINGS.chatImage, accessToken);

      if (!bgResult.success || !bgResult.imageUrl) {
        // Fallback: Use gradient background
        console.warn('Background generation failed, using gradient');
      }

      // Step 2: Composite character(s) onto background
      const sprites: Array<{ url: string; position: 'left' | 'right' | 'center' | 'bottom-center' }> = [];

      if (includePlayer && playerSpriteUrl) {
        // Both player and NPC
        sprites.push({ url: playerSpriteUrl, position: 'left' });
        sprites.push({ url: npcSpriteUrl, position: 'right' });
      } else {
        // Just NPC
        sprites.push({ url: npcSpriteUrl, position: 'bottom-center' });
      }

      let imageUrl: string;
      if (type === 'memory') {
        imageUrl = await createMemoryImage(bgResult.imageUrl || '', sprites);
      } else {
        imageUrl = await createSceneWithCharacter(
          bgResult.imageUrl || '',
          sprites[0].url,
          sprites[0].position
        );
      }

      return {
        success: true,
        imageUrl,
        type,
        usedCompositing: true,
      };
    }

    // MEME PATH: For now, just generate with FLUX (could add meme templates later)
    if (type === 'meme') {
      const prompt = buildImagePrompt(request);
      const result = await generateImage(prompt, IMAGE_SETTINGS.chatImage, accessToken);

      // If we have a sprite, try to composite it
      if (result.success && result.imageUrl && npcSpriteUrl) {
        try {
          const composited = await compositeImage({
            backgroundUrl: result.imageUrl,
            sprites: [{ url: npcSpriteUrl, position: 'center', scale: 3 }],
            options: { width: 512, height: 384 },
          });
          return {
            success: true,
            imageUrl: composited,
            type,
            usedCompositing: true,
          };
        } catch {
          // Fall back to non-composited
          return { ...result, type, usedCompositing: false };
        }
      }

      return { ...result, type, usedCompositing: false };
    }

    // FALLBACK: Use original generation without compositing
    return generateNPCImage(request, accessToken);

  } catch (error) {
    console.error('Character-consistent image generation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      type,
    };
  }
}
