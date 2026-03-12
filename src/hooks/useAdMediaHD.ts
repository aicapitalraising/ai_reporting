import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useFetchAdMediaHD() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ clientId, adId }: { clientId: string; adId?: string }) => {
      const { data, error } = await supabase.functions.invoke('fetch-ad-media-hd', {
        body: { clientId, adId },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to fetch HD media');
      return data;
    },
    onSuccess: (data, { clientId }) => {
      queryClient.invalidateQueries({ queryKey: ['meta-ads', clientId] });
      toast.success(`Fetched HD media for ${data.processed} ads`);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to fetch HD media');
    },
  });
}
