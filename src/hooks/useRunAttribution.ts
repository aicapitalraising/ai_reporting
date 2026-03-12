import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useRunAttribution() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ clientId, startDate, endDate }: { clientId: string; startDate?: string; endDate?: string }) => {
      const { data, error } = await supabase.functions.invoke('run-attribution', {
        body: { clientId, startDate, endDate },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Attribution failed');
      return data;
    },
    onSuccess: (data, { clientId }) => {
      queryClient.invalidateQueries({ queryKey: ['meta-campaigns', clientId] });
      queryClient.invalidateQueries({ queryKey: ['meta-ad-sets', clientId] });
      queryClient.invalidateQueries({ queryKey: ['meta-ads', clientId] });
      toast.success(`Attribution complete: ${data.campaignsAttributed} campaigns, ${data.unattributed} unattributed`);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Attribution failed');
    },
  });
}
