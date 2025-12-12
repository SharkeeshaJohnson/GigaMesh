/**
 * LLM Utilities for GigaMesh/LifeSim
 *
 * Shared utilities for processing LLM responses, stripping artifacts,
 * and sanitizing inputs to prevent prompt injection.
 */

/**
 * Strip model artifacts from LLM output
 * Removes thinking tags, special tokens, and other non-content
 */
export function stripModelArtifacts(content: string): string {
  if (!content) return '';

  let clean = content;

  // First pass: Remove complete <|im_start|>...<think>...</think> patterns (Qwen)
  // This handles patterns like: <|im_start|>assistant<think></think>
  clean = clean.replace(/<\|im_start\|>\s*\w*\s*<think>[\s\S]*?<\/think>/gi, '').trim();

  // Second pass: Remove <|im_start|>...<|im_end|> blocks
  clean = clean.replace(/<\|im_start\|>[\s\S]*?<\|im_end\|>/gi, '').trim();

  // Remove <think>...</think> blocks (Qwen models)
  clean = clean.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

  // Handle unclosed think tags - hide content until think is closed
  const thinkStart = clean.indexOf('<think>');
  if (thinkStart !== -1) {
    clean = clean.slice(0, thinkStart).trim();
  }

  // Remove standalone Qwen/model special tokens like <|im_start|>assistant, <|im_end|>, etc.
  clean = clean.replace(/<\|im_start\|>\s*\w*/gi, '').trim();
  clean = clean.replace(/<\|im_end\|>/gi, '').trim();
  clean = clean.replace(/<\|.*?\|>/g, '').trim(); // Generic special token removal

  // Remove DeepSeek placeholder tokens (uses special Unicode characters)
  // Pattern: <｜placeholder▁text｜> or similar with fullwidth characters
  clean = clean.replace(/<[｜\|][^>]*[｜\|]>/g, '').trim();

  // Remove DeepSeek tool/unlock instructions that leak through
  // These are internal API artifacts that shouldn't appear in responses
  clean = clean.replace(/You must unlock.*?tool[s]? first.*?After you unlock them,?\s*I'll respond.*?\./gi, '').trim();
  clean = clean.replace(/Please call the `__\w+__` tool.*?\./gi, '').trim();
  clean = clean.replace(/__\w+__/g, '').trim(); // Remove any __function_name__ patterns

  // Remove DeepSeek/other model artifacts
  clean = clean.replace(/^assistant\s*:\s*/i, '').trim(); // Remove "assistant:" prefix
  clean = clean.replace(/^[\s\n]*role\s*:\s*assistant[\s\n]*/i, '').trim(); // Remove role: assistant
  clean = clean.replace(/^[\s\n]*content\s*:\s*/i, '').trim(); // Remove content: prefix

  // If after all cleaning we just have the NPC name repeated, clear it
  // This catches cases like "Santiago\nSantiago" with no actual content
  const lines = clean.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length <= 2 && lines.every(l => l.length < 30 && !l.includes(' '))) {
    // Likely just repeated names with no content - return empty to trigger retry
    clean = '';
  }

  return clean;
}

/**
 * Extract text content from various LLM response formats
 * Handles string, array, and object formats from different providers
 */
export function extractTextContent(messageContent: unknown): string {
  if (typeof messageContent === 'string') {
    return messageContent;
  }

  if (Array.isArray(messageContent)) {
    // First try 'text' type content
    let content = messageContent
      .filter((item: { type?: string }) => item.type === 'text')
      .map((item: { text?: string }) => item.text || '')
      .join('');

    // If text is empty, try 'thinking' content as fallback (Qwen quirk)
    if (!content.trim()) {
      const thinkingContent = messageContent
        .filter((item: { type?: string }) => item.type === 'thinking')
        .map((item: { thinking?: string }) => item.thinking || '')
        .join('');
      if (thinkingContent) {
        content = thinkingContent;
      }
    }
    return content;
  }

  return '';
}

/**
 * Extract content from SDK response object
 * Tries multiple paths to find the content
 */
export function extractContentFromResponse(response: unknown): string {
  if (typeof response === 'string') return response;
  if (!response) return '';

  const r = response as Record<string, unknown>;

  // Try multiple paths to find the content
  const paths = [
    (r?.data as Record<string, unknown>)?.data,
    r?.data,
    r,
  ];

  for (const base of paths) {
    if (!base) continue;

    const b = base as Record<string, unknown>;
    const choices = b?.choices as Array<{ message?: { content?: unknown } }>;
    if (choices?.[0]?.message?.content) {
      const extracted = extractTextContent(choices[0].message.content);
      if (extracted) return stripModelArtifacts(extracted);
    }

    // Try direct content paths
    const directContent =
      (b as { message?: { content?: unknown } })?.message?.content ||
      (b as { content?: unknown })?.content ||
      (b as { text?: unknown })?.text;

    if (directContent) {
      const extracted = extractTextContent(directContent);
      if (extracted) return stripModelArtifacts(extracted);
    }
  }

  return '';
}

/**
 * SECURITY: Sanitize user input before including in LLM prompts
 *
 * This helps prevent prompt injection attacks by:
 * 1. Escaping potential control sequences
 * 2. Limiting length
 * 3. Removing patterns that look like system prompts
 */
export function sanitizeUserInput(input: string, maxLength: number = 2000): string {
  if (!input) return '';

  let sanitized = input;

  // Truncate to max length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.slice(0, maxLength) + '...';
  }

  // Remove patterns that could be used for prompt injection
  // These are common jailbreak patterns
  const dangerousPatterns = [
    // System/role override attempts
    /\[system\]/gi,
    /\[assistant\]/gi,
    /\[user\]/gi,
    /<system>/gi,
    /<\/system>/gi,
    /<assistant>/gi,
    /<\/assistant>/gi,
    // Instruction override attempts
    /ignore (all )?(previous|above|prior) instructions/gi,
    /disregard (all )?(previous|above|prior) instructions/gi,
    /forget (all )?(previous|above|prior) instructions/gi,
    /new instructions:/gi,
    /override:/gi,
    // Role play escape attempts
    /you are now/gi,
    /from now on/gi,
    /pretend (you('re| are)|to be)/gi,
    /act as if/gi,
    // Separator injection
    /---+\s*(system|assistant|user)/gi,
    /===+\s*(system|assistant|user)/gi,
  ];

  for (const pattern of dangerousPatterns) {
    sanitized = sanitized.replace(pattern, '[filtered]');
  }

  // Escape markdown-like formatting that could affect prompt parsing
  // (but preserve normal use - only escape if it looks like an injection)
  sanitized = sanitized.replace(/```(system|assistant|user)/gi, '[code]$1');

  return sanitized.trim();
}

/**
 * SECURITY: Escape HTML entities to prevent XSS
 */
export function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Parse JSON from LLM response with recovery for truncated/malformed JSON
 */
export function parseJSONSafely<T = unknown>(content: string): T | null {
  try {
    // Remove thinking tags first
    let cleanContent = content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

    const thinkStart = cleanContent.indexOf('<think>');
    if (thinkStart !== -1) {
      cleanContent = cleanContent.slice(0, thinkStart);
    }

    // Remove markdown code blocks (```json ... ``` or ``` ... ```)
    cleanContent = cleanContent.replace(/```(?:json)?\s*([\s\S]*?)```/gi, '$1').trim();

    // Log for debugging
    console.log('[parseJSONSafely] Cleaned content preview:', cleanContent.substring(0, 200));

    // Try to find JSON object
    const jsonStart = cleanContent.indexOf('{');
    if (jsonStart === -1) {
      console.log('[parseJSONSafely] No JSON object found in content');
      return null;
    }

    let jsonStr = cleanContent.slice(jsonStart);

    // Try direct parse first
    try {
      const jsonEnd = jsonStr.lastIndexOf('}');
      if (jsonEnd !== -1) {
        return JSON.parse(jsonStr.slice(0, jsonEnd + 1)) as T;
      }
    } catch {
      // Continue to recovery
    }

    // Attempt to recover truncated JSON
    let lastCompleteProperty = -1;
    const propertyEndings = [
      jsonStr.lastIndexOf('",'),
      jsonStr.lastIndexOf('"],'),
      jsonStr.lastIndexOf('"},'),
      jsonStr.lastIndexOf('},'),
    ];

    for (const pos of propertyEndings) {
      if (pos > lastCompleteProperty) {
        lastCompleteProperty = pos;
      }
    }

    if (lastCompleteProperty > 0) {
      let fixedJson = jsonStr.slice(0, lastCompleteProperty + 1);
      fixedJson = fixedJson.replace(/,\s*$/, '');

      // Count unclosed brackets and braces
      let openBraces = 0;
      let openBrackets = 0;
      let inString = false;
      let escape = false;

      for (const char of fixedJson) {
        if (escape) { escape = false; continue; }
        if (char === '\\') { escape = true; continue; }
        if (char === '"') { inString = !inString; continue; }
        if (!inString) {
          if (char === '{') openBraces++;
          else if (char === '}') openBraces--;
          else if (char === '[') openBrackets++;
          else if (char === ']') openBrackets--;
        }
      }

      fixedJson += ']'.repeat(Math.max(0, openBrackets));
      fixedJson += '}'.repeat(Math.max(0, openBraces));

      try {
        return JSON.parse(fixedJson) as T;
      } catch {
        // Recovery failed
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Parse JSON array from LLM response with recovery
 */
export function parseJSONArraySafely<T = unknown>(content: string): T[] {
  try {
    let cleanContent = content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

    const thinkStart = cleanContent.indexOf('<think>');
    if (thinkStart !== -1) {
      cleanContent = cleanContent.slice(0, thinkStart);
    }

    // Remove markdown code blocks (```json ... ``` or ``` ... ```)
    cleanContent = cleanContent.replace(/```(?:json)?\s*([\s\S]*?)```/gi, '$1').trim();

    // Log for debugging
    console.log('[parseJSONArraySafely] Cleaned content preview:', cleanContent.substring(0, 200));

    const arrayStart = cleanContent.indexOf('[');
    if (arrayStart === -1) {
      console.log('[parseJSONArraySafely] No JSON array found in content');
      return [];
    }

    let jsonStr = cleanContent.slice(arrayStart);

    // Fix common malformed JSON patterns
    jsonStr = jsonStr.replace(/\],\s*"name"/g, ']},{"name"');
    jsonStr = jsonStr.replace(/\],\s*\[\s*"name"/g, ']},{"name"');
    jsonStr = jsonStr.replace(/"\],\s*\["/g, '"]},{"');

    try {
      const parsed = JSON.parse(jsonStr);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      // Extract complete objects manually
      const completeObjects: T[] = [];
      let depth = 0;
      let currentObj = '';
      let inStr = false;
      let escape = false;

      for (let i = 1; i < jsonStr.length; i++) {
        const char = jsonStr[i];

        if (escape) { escape = false; currentObj += char; continue; }
        if (char === '\\') { escape = true; currentObj += char; continue; }
        if (char === '"') { inStr = !inStr; currentObj += char; continue; }

        if (!inStr) {
          if (char === '{') { depth++; currentObj += char; }
          else if (char === '}') {
            depth--;
            currentObj += char;
            if (depth === 0 && currentObj.trim()) {
              try {
                completeObjects.push(JSON.parse(currentObj) as T);
              } catch { /* skip malformed */ }
              currentObj = '';
            }
          } else if (depth > 0) {
            currentObj += char;
          }
        } else {
          currentObj += char;
        }
      }

      return completeObjects;
    }
  } catch {
    return [];
  }
}
