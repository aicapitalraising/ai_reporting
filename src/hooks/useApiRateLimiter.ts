import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export type ServiceType = 'veo3' | 'gemini';

// API key tiers with their rate limits
export type ApiKeyTier = 'free' | 'payg' | 'scale';

export const TIER_CONFIGS: Record<ApiKeyTier, { label: string; perMinute: number; perDay: number; description: string }> = {
  free: { label: 'Free', perMinute: 2, perDay: 50, description: '2 RPM, 50 RPD' },
  payg: { label: 'Pay-as-you-go', perMinute: 10, perDay: 1500, description: '10 RPM, 1,500 RPD' },
  scale: { label: 'Scale', perMinute: 30, perDay: 10000, description: '30 RPM, 10,000 RPD' },
};

export const MAX_KEYS = 5;

export interface ApiKeyConfig {
  key: string;
  label: string;
  tier: ApiKeyTier;
  isValid?: boolean;
  lastTested?: string;
}

interface UsageStats {
  minuteCount: number;
  dailyCount: number;
}

interface KeyWithUsage extends ApiKeyConfig {
  keyIndex: number;
  usage: UsageStats;
}

// LocalStorage keys
const STORAGE_KEYS = {
  veo3: 'api_keys_veo3',
  gemini: 'api_keys_gemini',
};

const DEFAULT_LABELS = ['Key 1', 'Key 2', 'Key 3', 'Key 4', 'Key 5'];

// Get keys from localStorage
export function getStoredKeys(service: ServiceType): ApiKeyConfig[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS[service]);
    if (stored) {
      const parsed = JSON.parse(stored) as ApiKeyConfig[];
      // Migrate old keys without tier
      const migrated = parsed.map((k, i) => ({
        ...k,
        tier: k.tier || ('free' as ApiKeyTier),
        label: k.label || DEFAULT_LABELS[i] || `Key ${i + 1}`,
      }));
      // Pad to MAX_KEYS if needed
      while (migrated.length < MAX_KEYS) {
        migrated.push({ key: '', label: DEFAULT_LABELS[migrated.length] || `Key ${migrated.length + 1}`, tier: 'free' });
      }
      return migrated.slice(0, MAX_KEYS);
    }
  } catch (e) {
    console.error('Failed to parse stored keys:', e);
  }
  return DEFAULT_LABELS.map((label) => ({ key: '', label, tier: 'free' as ApiKeyTier }));
}

// Save keys to localStorage
export function saveStoredKeys(service: ServiceType, keys: ApiKeyConfig[]) {
  localStorage.setItem(STORAGE_KEYS[service], JSON.stringify(keys));
}

// Migrate from old single-key format
function migrateOldKeys() {
  const oldVeo3 = localStorage.getItem('api_key_veo3');
  const oldGemini = localStorage.getItem('api_key_gemini');

  if (oldVeo3 && !localStorage.getItem(STORAGE_KEYS.veo3)) {
    const keys = DEFAULT_LABELS.map((label, i) => ({
      key: i === 0 ? oldVeo3 : '',
      label,
      tier: 'free' as ApiKeyTier,
    }));
    saveStoredKeys('veo3', keys);
    localStorage.removeItem('api_key_veo3');
  }

  if (oldGemini && !localStorage.getItem(STORAGE_KEYS.gemini)) {
    const keys = DEFAULT_LABELS.map((label, i) => ({
      key: i === 0 ? oldGemini : '',
      label,
      tier: 'free' as ApiKeyTier,
    }));
    saveStoredKeys('gemini', keys);
    localStorage.removeItem('api_key_gemini');
  }
}

// Run migration on import
migrateOldKeys();

// Hook to get usage stats for a key
export function useKeyUsage(service: ServiceType, keyIndex: number) {
  return useQuery({
    queryKey: ['api-usage', service, keyIndex],
    queryFn: async (): Promise<UsageStats> => {
      const { data, error } = await supabase.rpc('get_api_usage_counts', {
        p_service: service,
        p_key_index: keyIndex,
      });

      if (error) {
        console.error('Failed to get usage:', error);
        return { minuteCount: 0, dailyCount: 0 };
      }

      if (data && data.length > 0) {
        return {
          minuteCount: Number(data[0].minute_count) || 0,
          dailyCount: Number(data[0].daily_count) || 0,
        };
      }

      return { minuteCount: 0, dailyCount: 0 };
    },
    refetchInterval: 30000,
    staleTime: 10000,
  });
}

// Hook to log API usage
export function useLogApiUsage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      service,
      keyIndex,
      requestType,
      success = true,
      metadata = {},
    }: {
      service: ServiceType;
      keyIndex: number;
      requestType: string;
      success?: boolean;
      metadata?: Record<string, unknown>;
    }) => {
      const { error } = await supabase.from('api_usage').insert({
        service,
        key_index: keyIndex,
        request_type: requestType,
        success,
        metadata: JSON.parse(JSON.stringify(metadata)),
      });

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['api-usage', variables.service, variables.keyIndex],
      });
      queryClient.invalidateQueries({
        queryKey: ['api-usage', variables.service],
      });
    },
  });
}

// Main rate limiter hook
export function useApiRateLimiter(service: ServiceType) {
  const [keys, setKeys] = useState<ApiKeyConfig[]>(() => getStoredKeys(service));
  const queryClient = useQueryClient();

  // Get usage for all 5 keys
  const { data: usage0 } = useKeyUsage(service, 0);
  const { data: usage1 } = useKeyUsage(service, 1);
  const { data: usage2 } = useKeyUsage(service, 2);
  const { data: usage3 } = useKeyUsage(service, 3);
  const { data: usage4 } = useKeyUsage(service, 4);

  const logUsage = useLogApiUsage();

  useEffect(() => {
    const handleStorage = () => {
      setKeys(getStoredKeys(service));
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [service]);

  const allUsages: UsageStats[] = [
    usage0 || { minuteCount: 0, dailyCount: 0 },
    usage1 || { minuteCount: 0, dailyCount: 0 },
    usage2 || { minuteCount: 0, dailyCount: 0 },
    usage3 || { minuteCount: 0, dailyCount: 0 },
    usage4 || { minuteCount: 0, dailyCount: 0 },
  ];

  // Get available key with tier-aware rate limit checking
  const getAvailableKey = useCallback((): {
    key: string;
    keyIndex: number;
  } | {
    rateLimited: true;
    retryAfter: number;
    message: string;
  } => {
    // Try each key in order
    for (let i = 0; i < keys.length; i++) {
      const keyConfig = keys[i];
      const usage = allUsages[i];

      if (!keyConfig.key.trim()) continue;

      const tierLimits = TIER_CONFIGS[keyConfig.tier || 'free'];
      const withinMinuteLimit = usage.minuteCount < tierLimits.perMinute;
      const withinDayLimit = usage.dailyCount < tierLimits.perDay;

      if (withinMinuteLimit && withinDayLimit) {
        return { key: keyConfig.key, keyIndex: i };
      }
    }

    // All keys exhausted
    const activeKeys = keys.filter((k) => k.key.trim());
    const allDailyExhausted = activeKeys.every((k, idx) => {
      const realIndex = keys.indexOf(k);
      const tierLimits = TIER_CONFIGS[k.tier || 'free'];
      return allUsages[realIndex].dailyCount >= tierLimits.perDay;
    });

    if (allDailyExhausted) {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setUTCHours(24, 0, 0, 0);
      const retryAfter = Math.ceil((tomorrow.getTime() - now.getTime()) / 1000);

      return {
        rateLimited: true,
        retryAfter,
        message: `Daily limit reached for all ${activeKeys.length} API key(s). Resets at midnight UTC.`,
      };
    }

    return {
      rateLimited: true,
      retryAfter: 60,
      message: 'Per-minute rate limited on all keys. Please wait ~1 minute.',
    };
  }, [keys, allUsages]);

  const hasAnyKey = keys.some((k) => k.key.trim());

  const getTotalUsage = useCallback(() => {
    const activeKeys = keys.filter((k) => k.key.trim());
    const maxDaily = activeKeys.reduce((sum, k) => sum + TIER_CONFIGS[k.tier || 'free'].perDay, 0);
    const maxMinute = activeKeys.reduce((sum, k) => sum + TIER_CONFIGS[k.tier || 'free'].perMinute, 0);

    return {
      totalMinute: allUsages.reduce((sum, u) => sum + u.minuteCount, 0),
      totalDaily: allUsages.reduce((sum, u) => sum + u.dailyCount, 0),
      maxMinute,
      maxDaily,
      perKey: keys.map((k, i) => ({
        ...k,
        keyIndex: i,
        usage: allUsages[i],
      })),
    };
  }, [keys, allUsages]);

  const updateKeys = useCallback(
    (newKeys: ApiKeyConfig[]) => {
      setKeys(newKeys);
      saveStoredKeys(service, newKeys);
    },
    [service]
  );

  const refreshUsage = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['api-usage', service] });
  }, [queryClient, service]);

  return {
    keys,
    updateKeys,
    getAvailableKey,
    logUsage: logUsage.mutateAsync,
    hasAnyKey,
    getTotalUsage,
    refreshUsage,
    rateLimits: TIER_CONFIGS, // Now returns all tier configs
  };
}

// Helper hook to check if rate limited before making request
export function useRateLimitedRequest(service: ServiceType) {
  const { getAvailableKey, logUsage, hasAnyKey } = useApiRateLimiter(service);

  const executeWithRateLimit = useCallback(
    async <T>(
      requestType: string,
      executor: (apiKey: string, keyIndex: number) => Promise<T>,
      metadata?: Record<string, unknown>
    ): Promise<T> => {
      if (!hasAnyKey) {
        // No localStorage keys — edge function will use server-side env vars
        // Execute with undefined key, keyIndex 0
        return executor('' as any, 0);
      }

      const available = getAvailableKey();

      if ('rateLimited' in available) {
        throw new Error(available.message);
      }

      try {
        const result = await executor(available.key, available.keyIndex);

        await logUsage({
          service,
          keyIndex: available.keyIndex,
          requestType,
          success: true,
          metadata,
        });

        return result;
      } catch (error) {
        await logUsage({
          service,
          keyIndex: available.keyIndex,
          requestType,
          success: false,
          metadata: { ...metadata, error: String(error) },
        });

        throw error;
      }
    },
    [getAvailableKey, hasAnyKey, logUsage, service]
  );

  return { executeWithRateLimit, hasAnyKey };
}
