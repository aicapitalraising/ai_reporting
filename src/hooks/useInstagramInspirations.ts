import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useInstagramInspirations() {
  return useQuery({
    queryKey: ['instagram-inspirations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('instagram_creatives')
        .select('*')
        .eq('is_inspiration_source', true)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });
}
