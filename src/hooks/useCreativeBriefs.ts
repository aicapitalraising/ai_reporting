import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CreativeBrief {
  id: string;
  client_id: string;
  title: string;
  objective: string;
  target_audience: {
    demographics: string;
    psychographics: string;
    pain_points: string[];
    desires: string[];
  };
  messaging_angles: {
    angle: string;
    hook: string;
    rationale: string;
  }[];
  creative_direction: string;
  platform: string;
  ad_format: string;
  source_campaigns: string[];
  performance_snapshot: {
    spend: number;
    leads: number;
    funded: number;
    cpl: number;
    cpf: number;
  } | null;
  generation_reason: string;
  rejection_reason: string | null;
  status: 'pending' | 'in_production' | 'completed' | 'rejected';
  generated_by: string;
  approved_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdScript {
  id: string;
  client_id: string;
  brief_id: string | null;
  title: string;
  headline: string;
  headlines: string[];
  body_copy: string;
  body_variants: string[];
  cta: string;
  hook: string;
  script_body: string | null;
  platform: string;
  ad_format: string;
  angle: string;
  rejection_reason: string | null;
  status: 'draft' | 'approved' | 'in_production' | 'completed' | 'rejected';
  generated_by: string;
  linked_meta_ad_id: string | null;
  performance_metrics: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export function useCreativeBriefs(clientId?: string) {
  return useQuery({
    queryKey: ['creative_briefs', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('creative_briefs' as any)
        .select('*')
        .eq('client_id', clientId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as CreativeBrief[];
    },
    enabled: !!clientId,
  });
}

export function useAdScripts(briefId?: string) {
  return useQuery({
    queryKey: ['ad_scripts', briefId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ad_scripts' as any)
        .select('*')
        .eq('brief_id', briefId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as AdScript[];
    },
    enabled: !!briefId,
  });
}

export function useAdScriptsByClient(clientId?: string) {
  return useQuery({
    queryKey: ['ad_scripts_client', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ad_scripts' as any)
        .select('*')
        .eq('client_id', clientId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as AdScript[];
    },
    enabled: !!clientId,
  });
}

export function useGenerateBrief() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ clientId, reason }: { clientId: string; reason?: string }) => {
      const { data, error } = await supabase.functions.invoke('generate-brief', {
        body: {
          action: 'generate_brief',
          clientId,
          platform: 'meta',
          reason: reason || 'scaling',
        },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Brief generation failed');
      return data.brief as CreativeBrief;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['creative_briefs', variables.clientId] });
      toast.success('Creative brief generated');
    },
    onError: (error: Error) => {
      toast.error('Failed to generate brief: ' + error.message);
    },
  });
}

export function useGenerateScripts() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ clientId, briefId }: { clientId: string; briefId: string }) => {
      const { data, error } = await supabase.functions.invoke('generate-brief', {
        body: {
          action: 'generate_scripts',
          clientId,
          briefId,
        },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Script generation failed');
      return data.scripts as AdScript[];
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ad_scripts', variables.briefId] });
      queryClient.invalidateQueries({ queryKey: ['ad_scripts_client', variables.clientId] });
      queryClient.invalidateQueries({ queryKey: ['creative_briefs', variables.clientId] });
      toast.success('Ad scripts generated');
    },
    onError: (error: Error) => {
      toast.error('Failed to generate scripts: ' + error.message);
    },
  });
}

export function useUpdateBriefStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ briefId, status, clientId, rejectionReason }: { briefId: string; status: string; clientId: string; rejectionReason?: string }) => {
      const update: Record<string, unknown> = { status };
      if (rejectionReason) update.rejection_reason = rejectionReason;
      const { data, error } = await supabase
        .from('creative_briefs' as any)
        .update(update)
        .eq('id', briefId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['creative_briefs', variables.clientId] });
      toast.success(`Brief marked as ${variables.status}`);
    },
    onError: (error: Error) => {
      toast.error('Failed to update status: ' + error.message);
    },
  });
}

export function useUpdateScriptStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ scriptId, status, clientId, rejectionReason }: { scriptId: string; status: string; clientId: string; rejectionReason?: string }) => {
      const update: Record<string, unknown> = { status };
      if (rejectionReason) update.rejection_reason = rejectionReason;
      const { data, error } = await supabase
        .from('ad_scripts' as any)
        .update(update)
        .eq('id', scriptId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      // Invalidate all ad_scripts queries (both by brief and by client)
      queryClient.invalidateQueries({ queryKey: ['ad_scripts'] });
      queryClient.invalidateQueries({ queryKey: ['ad_scripts_client', variables.clientId] });
      // Also refresh briefs since brief status may depend on script states
      queryClient.invalidateQueries({ queryKey: ['creative_briefs', variables.clientId] });
      toast.success(`Script marked as ${variables.status}`);
    },
    onError: (error: Error) => {
      toast.error('Failed to update status: ' + error.message);
    },
  });
}
