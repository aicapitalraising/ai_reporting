import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface FunnelCampaign {
  id: string;
  client_id: string;
  name: string;
  color: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export function useFunnelCampaigns(clientId?: string) {
  return useQuery({
    queryKey: ['funnel-campaigns', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data, error } = await supabase
        .from('funnel_campaigns')
        .select('*')
        .eq('client_id', clientId)
        .order('sort_order', { ascending: true });
      
      if (error) throw error;
      return data as FunnelCampaign[];
    },
    enabled: !!clientId,
  });
}

export function useCreateFunnelCampaign() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (campaign: { client_id: string; name: string; color?: string; sort_order?: number }) => {
      const { data, error } = await supabase
        .from('funnel_campaigns')
        .insert(campaign)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['funnel-campaigns', variables.client_id] });
      toast.success('Campaign created successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to create campaign: ' + error.message);
    },
  });
}

export function useUpdateFunnelCampaign() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, clientId, updates }: { id: string; clientId: string; updates: Partial<FunnelCampaign> }) => {
      const { data, error } = await supabase
        .from('funnel_campaigns')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return { data, clientId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['funnel-campaigns', result.clientId] });
      toast.success('Campaign updated');
    },
    onError: (error: any) => {
      toast.error('Failed to update campaign: ' + error.message);
    },
  });
}

export function useDeleteFunnelCampaign() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, clientId }: { id: string; clientId: string }) => {
      const { error } = await supabase
        .from('funnel_campaigns')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return { id, clientId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['funnel-campaigns', result.clientId] });
      queryClient.invalidateQueries({ queryKey: ['funnel-steps', result.clientId] });
      toast.success('Campaign deleted');
    },
    onError: (error: any) => {
      toast.error('Failed to delete campaign: ' + error.message);
    },
  });
}

export function useReorderFunnelCampaigns() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ clientId, orderedIds }: { clientId: string; orderedIds: string[] }) => {
      const updates = orderedIds.map((id, index) => 
        supabase
          .from('funnel_campaigns')
          .update({ sort_order: index })
          .eq('id', id)
      );
      await Promise.all(updates);
      return { clientId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['funnel-campaigns', result.clientId] });
    },
    onError: (error: any) => {
      toast.error('Failed to reorder campaigns: ' + error.message);
    },
  });
}
