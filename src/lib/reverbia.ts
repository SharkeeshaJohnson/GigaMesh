'use client';

import { useChat as useReverbiaChat, useMemory as useReverbiaMemory } from '@reverbia/sdk/react';
import { useIdentityToken } from '@privy-io/react-auth';
import { MODEL_CONFIG } from './models';

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
