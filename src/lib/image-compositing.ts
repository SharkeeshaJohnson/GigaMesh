// Image Compositing Service for LifeSim
// Composites actual character sprites onto generated backgrounds for 100% consistency

export interface CompositeOptions {
  width?: number;
  height?: number;
  spriteScale?: number;
  position?: 'center' | 'bottom-center' | 'left' | 'right' | 'bottom-left' | 'bottom-right';
  addSelfieFrame?: boolean;
  addVignette?: boolean;
  emotion?: string;
}

export interface CompositeRequest {
  backgroundUrl?: string; // Generated or solid background
  backgroundColor?: string; // Fallback solid color
  sprites: Array<{
    url: string;
    position: CompositeOptions['position'];
    scale?: number;
    label?: string; // For "us" type images
  }>;
  options?: CompositeOptions;
}

/**
 * Load an image from URL with CORS support
 */
function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(new Error(`Failed to load image: ${url}`));
    img.src = url;
  });
}

/**
 * Get position coordinates based on position type
 */
function getPositionCoords(
  position: CompositeOptions['position'],
  canvasWidth: number,
  canvasHeight: number,
  spriteWidth: number,
  spriteHeight: number
): { x: number; y: number } {
  switch (position) {
    case 'center':
      return {
        x: (canvasWidth - spriteWidth) / 2,
        y: (canvasHeight - spriteHeight) / 2,
      };
    case 'bottom-center':
      return {
        x: (canvasWidth - spriteWidth) / 2,
        y: canvasHeight - spriteHeight - 20,
      };
    case 'left':
      return {
        x: 30,
        y: canvasHeight - spriteHeight - 20,
      };
    case 'right':
      return {
        x: canvasWidth - spriteWidth - 30,
        y: canvasHeight - spriteHeight - 20,
      };
    case 'bottom-left':
      return {
        x: 20,
        y: canvasHeight - spriteHeight - 10,
      };
    case 'bottom-right':
      return {
        x: canvasWidth - spriteWidth - 20,
        y: canvasHeight - spriteHeight - 10,
      };
    default:
      return {
        x: (canvasWidth - spriteWidth) / 2,
        y: (canvasHeight - spriteHeight) / 2,
      };
  }
}

/**
 * Add a vignette effect to the canvas
 */
function addVignette(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const gradient = ctx.createRadialGradient(
    width / 2, height / 2, 0,
    width / 2, height / 2, Math.max(width, height) * 0.7
  );
  gradient.addColorStop(0, 'rgba(0,0,0,0)');
  gradient.addColorStop(0.7, 'rgba(0,0,0,0)');
  gradient.addColorStop(1, 'rgba(0,0,0,0.4)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

/**
 * Add a selfie-style frame effect
 */
function addSelfieFrame(ctx: CanvasRenderingContext2D, width: number, height: number) {
  // Rounded corner overlay effect
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.roundRect(10, 10, width - 20, height - 20, 20);
  ctx.stroke();

  // Camera indicator dot
  ctx.fillStyle = '#e74c3c';
  ctx.beginPath();
  ctx.arc(width - 30, 30, 6, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Generate a gradient background based on mood/context
 */
function generateGradientBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  mood?: string
): void {
  let colors: [string, string];

  switch (mood?.toLowerCase()) {
    case 'happy':
    case 'loving':
      colors = ['#ffecd2', '#fcb69f'];
      break;
    case 'sad':
      colors = ['#667eea', '#764ba2'];
      break;
    case 'angry':
      colors = ['#f5af19', '#f12711'];
      break;
    case 'scared':
      colors = ['#2c3e50', '#4a5568'];
      break;
    case 'suspicious':
      colors = ['#1a1a2e', '#16213e'];
      break;
    default:
      // Neutral warm gradient
      colors = ['#a8edea', '#fed6e3'];
  }

  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, colors[0]);
  gradient.addColorStop(1, colors[1]);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

/**
 * Composite sprites onto a background
 * This ensures 100% character consistency by using actual sprites
 */
export async function compositeImage(request: CompositeRequest): Promise<string> {
  const width = request.options?.width || 512;
  const height = request.options?.height || 512;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  // Disable image smoothing for pixel art
  ctx.imageSmoothingEnabled = false;

  // Draw background
  if (request.backgroundUrl) {
    try {
      const bg = await loadImage(request.backgroundUrl);
      ctx.drawImage(bg, 0, 0, width, height);
    } catch (error) {
      console.warn('Failed to load background, using gradient:', error);
      generateGradientBackground(ctx, width, height, request.options?.emotion);
    }
  } else if (request.backgroundColor) {
    ctx.fillStyle = request.backgroundColor;
    ctx.fillRect(0, 0, width, height);
  } else {
    // Default gradient based on emotion
    generateGradientBackground(ctx, width, height, request.options?.emotion);
  }

  // Draw each sprite
  for (const sprite of request.sprites) {
    try {
      const img = await loadImage(sprite.url);
      const scale = sprite.scale || request.options?.spriteScale || 4;
      const spriteWidth = img.width * scale;
      const spriteHeight = img.height * scale;

      const pos = getPositionCoords(
        sprite.position || 'bottom-center',
        width,
        height,
        spriteWidth,
        spriteHeight
      );

      ctx.drawImage(img, pos.x, pos.y, spriteWidth, spriteHeight);
    } catch (error) {
      console.error('Failed to load sprite:', sprite.url, error);
    }
  }

  // Apply effects
  if (request.options?.addVignette) {
    addVignette(ctx, width, height);
  }

  if (request.options?.addSelfieFrame) {
    addSelfieFrame(ctx, width, height);
  }

  return canvas.toDataURL('image/png');
}

/**
 * Create a selfie image with NPC sprite
 * Quick generation without API call for simple selfies
 */
export async function createSelfie(
  spriteUrl: string,
  emotion?: string
): Promise<string> {
  return compositeImage({
    sprites: [{
      url: spriteUrl,
      position: 'center',
      scale: 6, // Large for selfie
    }],
    options: {
      width: 400,
      height: 400,
      emotion,
      addSelfieFrame: true,
      addVignette: true,
    },
  });
}

/**
 * Create a reaction image with NPC sprite
 */
export async function createReaction(
  spriteUrl: string,
  emotion?: string
): Promise<string> {
  return compositeImage({
    sprites: [{
      url: spriteUrl,
      position: 'center',
      scale: 5,
    }],
    options: {
      width: 300,
      height: 300,
      emotion,
      addVignette: false,
    },
  });
}

/**
 * Create a scene with character(s) composited onto a generated background
 */
export async function createSceneWithCharacter(
  backgroundUrl: string,
  spriteUrl: string,
  position: CompositeOptions['position'] = 'bottom-center'
): Promise<string> {
  return compositeImage({
    backgroundUrl,
    sprites: [{
      url: spriteUrl,
      position,
      scale: 4,
    }],
    options: {
      width: 512,
      height: 384,
      addVignette: true,
    },
  });
}

/**
 * Create a group scene with multiple characters
 */
export async function createGroupScene(
  backgroundUrl: string,
  sprites: Array<{ url: string; position: CompositeOptions['position'] }>
): Promise<string> {
  return compositeImage({
    backgroundUrl,
    sprites: sprites.map(s => ({
      ...s,
      scale: 3, // Smaller for group shots
    })),
    options: {
      width: 512,
      height: 384,
      addVignette: true,
    },
  });
}

/**
 * Create a "memory" style image with warm filter
 */
export async function createMemoryImage(
  backgroundUrl: string,
  sprites: Array<{ url: string; position: CompositeOptions['position'] }>
): Promise<string> {
  const baseImage = await compositeImage({
    backgroundUrl,
    sprites: sprites.map(s => ({
      ...s,
      scale: 3,
    })),
    options: {
      width: 512,
      height: 384,
      addVignette: true,
    },
  });

  // Add sepia/warm filter for memory effect
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 384;
  const ctx = canvas.getContext('2d');

  if (!ctx) return baseImage;

  const img = await loadImage(baseImage);
  ctx.drawImage(img, 0, 0);

  // Apply warm overlay for "memory" feeling
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = 'rgba(255, 200, 150, 0.2)';
  ctx.fillRect(0, 0, 512, 384);

  return canvas.toDataURL('image/png');
}

/**
 * Determine if an image type needs character compositing
 */
export function needsCharacterCompositing(imageType: string): boolean {
  const typesNeedingCharacter = ['selfie', 'reaction', 'memory', 'evidence', 'meme'];
  return typesNeedingCharacter.includes(imageType);
}

/**
 * Determine if an image type needs background generation
 */
export function needsBackgroundGeneration(imageType: string): boolean {
  const typesNeedingBackground = ['scene', 'memory', 'evidence'];
  return typesNeedingBackground.includes(imageType);
}
