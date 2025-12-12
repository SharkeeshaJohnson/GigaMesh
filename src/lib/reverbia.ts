'use client';

import { useChat as useReverbiaChat, useMemory as useReverbiaMemory, useModels as useReverbiaModels, useImageGeneration as useReverbiaImageGeneration } from '@reverbia/sdk/react';
import { useIdentityToken } from '@privy-io/react-auth';
import { MODEL_CONFIG } from './models';
import { IMAGE_MODEL_CONFIG } from './image-models';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://ai-portal-dev.zetachain.com';

export interface ChatConfig {
  onData?: (chunk: string) => void;
  onFinish?: (response: string) => void;
  onError?: (error: Error) => void;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface SendMessageParams {
  messages: ChatMessage[];
  model: string;
}

export function useChat(config?: ChatConfig) {
  const { identityToken } = useIdentityToken();

  const chat = useReverbiaChat({
    getToken: async () => identityToken || null,
    apiUrl: API_URL,
    onData: config?.onData,
    onFinish: config?.onFinish,
    onError: config?.onError,
  } as any);

  // Wrap sendMessage to handle type conversion
  const sendMessage = async (params: SendMessageParams) => {
    // Convert our message format to what the SDK expects
    return chat.sendMessage({
      messages: params.messages as any,
      model: params.model,
    } as any);
  };

  return {
    ...chat,
    sendMessage,
  };
}

export function useMemory() {
  const { identityToken } = useIdentityToken();

  return useReverbiaMemory({
    getToken: async () => identityToken || null,
    apiUrl: API_URL,
    embeddingModel: MODEL_CONFIG.embedding,
  } as any);
}

// Re-export encryption utilities
export { useEncryption, encryptData, decryptData } from '@reverbia/sdk/react';

// Export useModels to discover available models
export function useModels() {
  const { identityToken } = useIdentityToken();

  return useReverbiaModels({
    getToken: async () => identityToken || null,
    apiUrl: API_URL,
  } as any);
}

// Export useImageGeneration for generating images via the SDK
export function useImageGeneration(config?: {
  onFinish?: (response: any) => void;
  onError?: (error: Error) => void;
}) {
  const { identityToken } = useIdentityToken();

  const imageGen = useReverbiaImageGeneration({
    getToken: async () => identityToken || null,
    baseUrl: API_URL,
    onFinish: config?.onFinish,
    onError: config?.onError,
  } as any);

  // Wrap generateImage to use our default model
  // Uses b64_json format to avoid CORS issues with external URLs
  const generateImage = async (args: {
    prompt: string;
    model?: string;
    size?: string;
    quality?: string;
    response_format?: string;
  }) => {
    const requestParams = {
      model: args.model || IMAGE_MODEL_CONFIG.sceneGeneration,
      prompt: args.prompt,
      size: args.size || '512x512',
      quality: args.quality,
      // Use b64_json to avoid CORS issues when loading images for canvas compositing
      response_format: args.response_format || 'b64_json',
    };
    console.log('[reverbia.ts] Calling generateImage with:', {
      model: requestParams.model,
      promptPreview: requestParams.prompt.substring(0, 80) + '...',
      size: requestParams.size,
      response_format: requestParams.response_format,
    });
    const result = await imageGen.generateImage(requestParams);

    // Convert b64_json response to data URL for easier use
    if (result?.data?.images?.[0]?.b64_json) {
      const base64 = result.data.images[0].b64_json;
      result.data.images[0].url = `data:image/png;base64,${base64}`;
    }

    console.log('[reverbia.ts] generateImage response:', {
      hasError: !!result?.error,
      error: result?.error,
      hasData: !!result?.data,
      imageCount: result?.data?.images?.length || 0,
      hasUrl: !!result?.data?.images?.[0]?.url,
    });
    return result;
  };

  return {
    ...imageGen,
    generateImage,
  };
}
