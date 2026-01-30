import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Pipeline {
  id: string;
  client_id: string;
  ghl_pipeline_id: string;
  name: string;
  sort_order: number;
  last_synced_at: string | null;
  created_at: string;
}

export interface PipelineStage {
  id: string;
  pipeline_id: string;
  ghl_stage_id: string;
  name: string;
  sort_order: number;
  created_at: string;
}

export interface PipelineOpportunity {
  id: string;
  pipeline_id: string;
  stage_id: string;
  ghl_opportunity_id: string;
  ghl_contact_id: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  monetary_value: number;
  source: string | null;
  status: string;
  last_stage_change_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface GHLPipeline {
  id: string;
  name: string;
  stages: Array<{
    id: string;
    name: string;
    position: number;
  }>;
}

// Fetch client pipelines
export function useClientPipelines(clientId: string | undefined) {
  return useQuery({
    queryKey: ['client-pipelines', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      
      const { data, error } = await supabase
        .from('client_pipelines')
        .select('*')
        .eq('client_id', clientId)
        .order('sort_order');

      if (error) throw error;
      return data as Pipeline[];
    },
    enabled: !!clientId,
  });
}

// Fetch pipeline stages
export function usePipelineStages(pipelineId: string | undefined) {
  return useQuery({
    queryKey: ['pipeline-stages', pipelineId],
    queryFn: async () => {
      if (!pipelineId) return [];
      
      const { data, error } = await supabase
        .from('pipeline_stages')
        .select('*')
        .eq('pipeline_id', pipelineId)
        .order('sort_order');

      if (error) throw error;
      return data as PipelineStage[];
    },
    enabled: !!pipelineId,
  });
}

// Fetch pipeline opportunities
export function usePipelineOpportunities(pipelineId: string | undefined) {
  return useQuery({
    queryKey: ['pipeline-opportunities', pipelineId],
    queryFn: async () => {
      if (!pipelineId) return [];
      
      const { data, error } = await supabase
        .from('pipeline_opportunities')
        .select('*')
        .eq('pipeline_id', pipelineId)
        .order('monetary_value', { ascending: false });

      if (error) throw error;
      return data as PipelineOpportunity[];
    },
    enabled: !!pipelineId,
  });
}

// Fetch ALL opportunities for a client (across all pipelines) with stage names
export function useClientOpportunities(clientId: string | undefined) {
  return useQuery({
    queryKey: ['client-opportunities', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      
      // First get all pipelines for this client
      const { data: pipelines, error: pipelineError } = await supabase
        .from('client_pipelines')
        .select('id, name')
        .eq('client_id', clientId);
      
      if (pipelineError) throw pipelineError;
      if (!pipelines || pipelines.length === 0) return [];
      
      const pipelineIds = pipelines.map(p => p.id);
      const pipelineNameMap: Record<string, string> = {};
      pipelines.forEach(p => { pipelineNameMap[p.id] = p.name; });
      
      // Get all stages for these pipelines
      const { data: stages, error: stageError } = await supabase
        .from('pipeline_stages')
        .select('id, pipeline_id, name, sort_order')
        .in('pipeline_id', pipelineIds);
      
      if (stageError) throw stageError;
      
      const stageNameMap: Record<string, string> = {};
      stages?.forEach(s => { stageNameMap[s.id] = s.name; });
      
      // Get all opportunities
      const { data: opportunities, error: oppError } = await supabase
        .from('pipeline_opportunities')
        .select('*')
        .in('pipeline_id', pipelineIds)
        .order('updated_at', { ascending: false });
      
      if (oppError) throw oppError;
      
      // Enrich with stage and pipeline names
      return (opportunities || []).map(opp => ({
        ...opp,
        stage_name: stageNameMap[opp.stage_id] || 'Unknown',
        pipeline_name: pipelineNameMap[opp.pipeline_id] || 'Unknown',
      }));
    },
    enabled: !!clientId,
  });
}

export interface EnrichedOpportunity extends PipelineOpportunity {
  stage_name: string;
  pipeline_name: string;
}

// Fetch available GHL pipelines
export function useAvailableGHLPipelines(clientId: string | undefined) {
  return useQuery({
    queryKey: ['available-ghl-pipelines', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      
      const { data, error } = await supabase.functions.invoke('sync-ghl-pipelines', {
        body: { client_id: clientId, mode: 'list' },
      });

      if (error) throw error;
      return (data?.pipelines || []) as GHLPipeline[];
    },
    enabled: !!clientId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

// Sync a pipeline from GHL (with contacts and timeline)
export function useSyncPipeline() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ clientId, pipelineId }: { clientId: string; pipelineId: string }) => {
      const { data, error } = await supabase.functions.invoke('sync-ghl-pipelines', {
        body: { client_id: clientId, mode: 'sync', pipeline_id: pipelineId, sync_contacts: true },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      const parts = [`${data.opportunities_count} opportunities`];
      if (data.leads_created > 0) parts.push(`${data.leads_created} leads created`);
      if (data.leads_updated > 0) parts.push(`${data.leads_updated} leads updated`);
      if (data.timeline_events > 0) parts.push(`${data.timeline_events} timeline events`);
      
      toast.success(`Pipeline synced: ${parts.join(', ')}`);
      queryClient.invalidateQueries({ queryKey: ['client-pipelines', variables.clientId] });
      queryClient.invalidateQueries({ queryKey: ['pipeline-stages'] });
      queryClient.invalidateQueries({ queryKey: ['pipeline-opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['leads', variables.clientId] });
      queryClient.invalidateQueries({ queryKey: ['contact-timeline'] });
    },
    onError: (error: Error) => {
      const errorMsg = error.message || 'Unknown error';
      if (errorMsg.includes('401') || errorMsg.includes('expired') || errorMsg.includes('Invalid JWT')) {
        toast.error('GHL credentials expired. Please update your API key in Client Settings → Integrations.');
      } else {
        toast.error(`Failed to sync pipeline: ${errorMsg}`);
      }
    },
  });
}

// Remove a pipeline
export function useRemovePipeline() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ clientId, pipelineId }: { clientId: string; pipelineId: string }) => {
      const { data, error } = await supabase.functions.invoke('sync-ghl-pipelines', {
        body: { client_id: clientId, mode: 'remove', pipeline_id: pipelineId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      toast.success('Pipeline removed');
      queryClient.invalidateQueries({ queryKey: ['client-pipelines', variables.clientId] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to remove pipeline: ${error.message}`);
    },
  });
}
