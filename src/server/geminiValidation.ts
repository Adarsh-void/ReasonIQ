/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI } from '@google/genai';

export interface KeyValidationResult {
  isValid: boolean;
  message: string;
  code?: 'INVALID_KEY' | 'QUOTA_EXCEEDED' | 'RATE_LIMITED' | 'NETWORK_TIMEOUT' | 'UNKNOWN_ERROR';
}

/**
 * Validates a user-supplied Gemini API key using a minimal, lightweight test request.
 * Does not make expensive queries. Times out safely after 7 seconds.
 */
export async function validateGeminiKey(apiKey: string): Promise<KeyValidationResult> {
  const trimmed = apiKey ? apiKey.trim() : '';

  if (!trimmed) {
    return {
      isValid: false,
      message: 'Gemini API key cannot be empty.',
      code: 'INVALID_KEY',
    };
  }

  // Basic format sanity check
  if (trimmed.length < 20 || !/^AIza[0-9A-Za-z-_]{35,}$/.test(trimmed)) {
    // Note: Google AI Studio keys typically start with AIzaSy...
    // We allow standard keys but warn if completely malformed
    if (trimmed.length < 20) {
      return {
        isValid: false,
        message: 'The provided key appears too short to be a valid Google Gemini API key.',
        code: 'INVALID_KEY',
      };
    }
  }

  try {
    const testAi = new GoogleGenAI({
      apiKey: trimmed,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build-auth-check',
        },
      },
    });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('REQUEST_TIMEOUT')), 7000)
    );

    const testPromise = testAi.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: 'Ping',
      config: {
        maxOutputTokens: 2,
      },
    });

    await Promise.race([testPromise, timeoutPromise]);

    return {
      isValid: true,
      message: 'Gemini API key verified successfully.',
    };
  } catch (error: any) {
    const errorMsg = String(error?.message || '').toLowerCase();
    const errorStatus = error?.status;

    if (errorMsg.includes('request_timeout')) {
      return {
        isValid: false,
        message: 'Verification request timed out. Please check your internet connection and try again.',
        code: 'NETWORK_TIMEOUT',
      };
    }

    if (
      errorMsg.includes('api_key_invalid') ||
      errorMsg.includes('invalid api key') ||
      errorMsg.includes('api key not found') ||
      errorStatus === 400 ||
      errorStatus === 401
    ) {
      return {
        isValid: false,
        message: 'Invalid Gemini API key. Please check your key from https://aistudio.google.com/apikey and try again.',
        code: 'INVALID_KEY',
      };
    }

    if (
      errorMsg.includes('quota') ||
      errorMsg.includes('resource_exhausted') ||
      errorStatus === 429
    ) {
      return {
        isValid: false,
        message: 'API quota or rate limit exceeded on this key. Please check your Google AI Studio plan/quota.',
        code: 'QUOTA_EXCEEDED',
      };
    }

    if (errorMsg.includes('permission_denied') || errorStatus === 403) {
      return {
        isValid: false,
        message: 'Permission denied. Ensure your API key has access to Gemini Flash models.',
        code: 'INVALID_KEY',
      };
    }

    return {
      isValid: false,
      message: 'Could not verify Gemini API key with Google servers. Please verify the key and try again.',
      code: 'UNKNOWN_ERROR',
    };
  }
}
