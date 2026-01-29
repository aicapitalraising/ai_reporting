import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DetectedEvent {
  platform: 'meta' | 'google' | 'linkedin' | 'tiktok';
  event: string;
  type: 'standard' | 'custom';
  conversionId?: string;
}

export interface PixelResult {
  platform: 'meta' | 'google' | 'linkedin' | 'tiktok';
  name: string;
  detected: boolean;
  pixelId?: string;
  events?: string[];
  confidence: 'high' | 'medium' | 'low';
}

export interface VerificationResult {
  success: boolean;
  pixels: PixelResult[];
  allEvents: DetectedEvent[];
  scannedAt: string;
  error?: string;
}

export interface PixelVerification {
  id: string;
  step_id: string | null;
  client_id: string;
  scanned_at: string;
  results: VerificationResult | Record<string, unknown>;
  status: string;
  events_detected: string[];
  missing_expected: string[];
  created_at: string;
}

// Fetch verification history for a step
export function usePixelVerificationHistory(stepId: string | undefined) {
  return useQuery({
    queryKey: ['pixel-verifications', stepId],
    queryFn: async () => {
      if (!stepId) return [];
      
      const { data, error } = await supabase
        .from('pixel_verifications')
        .select('*')
        .eq('step_id', stepId)
        .order('scanned_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return (data || []).map(d => ({
        ...d,
        status: d.status as 'pass' | 'warning' | 'fail',
        results: d.results as unknown as VerificationResult,
      })) as PixelVerification[];
    },
    enabled: !!stepId,
  });
}

// Fetch latest verification for a step
export function useLatestPixelVerification(stepId: string | undefined) {
  return useQuery({
    queryKey: ['pixel-verification-latest', stepId],
    queryFn: async () => {
      if (!stepId) return null;
      
      const { data, error } = await supabase
        .from('pixel_verifications')
        .select('*')
        .eq('step_id', stepId)
        .order('scanned_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      if (!data) return null;
      return {
        ...data,
        status: data.status as 'pass' | 'warning' | 'fail',
        results: data.results as unknown as VerificationResult,
      } as PixelVerification;
    },
    enabled: !!stepId,
  });
}

// Fetch verification status for all steps in a client
export function useClientPixelVerifications(clientId: string | undefined) {
  return useQuery({
    queryKey: ['client-pixel-verifications', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      
      // Get the latest verification for each step
      const { data, error } = await supabase
        .from('pixel_verifications')
        .select('*')
        .eq('client_id', clientId)
        .order('scanned_at', { ascending: false });
      
      if (error) throw error;
      
      const mapped = (data || []).map(d => ({
        ...d,
        status: d.status as 'pass' | 'warning' | 'fail',
        results: d.results as unknown as VerificationResult,
      })) as PixelVerification[];
      
      // Group by step_id and get latest for each
      const latestByStep = new Map<string, PixelVerification>();
      for (const v of mapped) {
        if (v.step_id && !latestByStep.has(v.step_id)) {
          latestByStep.set(v.step_id, v);
        }
      }
      
      return Array.from(latestByStep.values());
    },
    enabled: !!clientId,
  });
}

// Run verification for a single step
export function useRunPixelVerification() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      url, 
      stepId, 
      clientId,
      persistResults = true 
    }: { 
      url: string; 
      stepId?: string; 
      clientId?: string;
      persistResults?: boolean;
    }) => {
      const { data, error } = await supabase.functions.invoke('verify-pixels', {
        body: { url, stepId, clientId, persistResults }
      });
      
      if (error) throw error;
      return data as VerificationResult;
    },
    onSuccess: (_, variables) => {
      if (variables.stepId) {
        queryClient.invalidateQueries({ queryKey: ['pixel-verifications', variables.stepId] });
        queryClient.invalidateQueries({ queryKey: ['pixel-verification-latest', variables.stepId] });
      }
      if (variables.clientId) {
        queryClient.invalidateQueries({ queryKey: ['client-pixel-verifications', variables.clientId] });
      }
    },
  });
}

// Get verification status badge info
export function getVerificationStatusInfo(status: string | null | undefined) {
  switch (status) {
    case 'pass':
      return { color: 'text-green-600', bgColor: 'bg-green-100', label: 'Pass' };
    case 'warning':
      return { color: 'text-yellow-600', bgColor: 'bg-yellow-100', label: 'Warning' };
    case 'fail':
      return { color: 'text-red-600', bgColor: 'bg-red-100', label: 'Fail' };
    default:
      return { color: 'text-muted-foreground', bgColor: 'bg-muted', label: 'Not Scanned' };
  }
}
