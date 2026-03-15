import { useState, useCallback, useEffect } from 'react';
import { getStoredKeys, saveStoredKeys, type ApiKeyConfig } from './useApiRateLimiter';

/**
 * Simple hook for Gemini API key access WITHOUT rate limiting.
 * Use this for image and text generation which don't need rate limits.
 * For video (Veo 3), use useApiRateLimiter instead.
 */
export function useGeminiKey() {
  const [keys, setKeys] = useState<ApiKeyConfig[]>(() => getStoredKeys('gemini'));

  // Update keys when they change in storage
  useEffect(() => {
    const handleStorage = () => {
      setKeys(getStoredKeys('gemini'));
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Get first available API key
  const getApiKey = useCallback((): string | null => {
    const available = keys.find((k) => k.key.trim());
    return available?.key || null;
  }, [keys]);

  // Check if any key is configured
  const hasApiKey = keys.some((k) => k.key.trim());

  // Save keys
  const updateKeys = useCallback((newKeys: ApiKeyConfig[]) => {
    setKeys(newKeys);
    saveStoredKeys('gemini', newKeys);
  }, []);

  return {
    getApiKey,
    hasApiKey,
    keys,
    updateKeys,
  };
}
