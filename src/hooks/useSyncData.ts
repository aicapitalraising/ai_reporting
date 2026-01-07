import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useSyncClientData() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (clientId?: string) => {
      const { data, error } = await supabase.functions.invoke('sync-client-data', {
        body: clientId ? { client_id: clientId } : {},
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['daily-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['all-daily-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['funded-investors'] });
      
      if (data.synced_clients > 0) {
        toast.success(`Synced ${data.synced_clients} client(s) successfully`);
      }
    },
    onError: (error: Error) => {
      toast.error(`Sync failed: ${error.message}`);
    },
  });
}
