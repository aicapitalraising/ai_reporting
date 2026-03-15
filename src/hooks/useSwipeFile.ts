import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SwipeFileItem {
  id: string;
  ad_id: string | null;
  viral_video_id: string | null;
  tags: string[];
  notes: string | null;
  client_id: string | null;
  created_at: string;
  // Joined data
  scraped_ads?: any;
  viral_videos?: any;
}

export function useSwipeFile() {
  return useQuery({
    queryKey: ['swipe-file'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('swipe_file')
        .select('*, scraped_ads(*), viral_videos(*)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as SwipeFileItem[];
    },
  });
}

export function useAddToSwipeFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ ad_id, viral_video_id, tags, notes, client_id }: {
      ad_id?: string;
      viral_video_id?: string;
      tags?: string[];
      notes?: string;
      client_id?: string;
    }) => {
      const { error } = await supabase.from('swipe_file').insert({
        ad_id: ad_id || null,
        viral_video_id: viral_video_id || null,
        tags: tags || [],
        notes: notes || null,
        client_id: client_id || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['swipe-file'] });
    },
  });
}

export function useUpdateSwipeItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, tags, notes, client_id }: {
      id: string;
      tags?: string[];
      notes?: string;
      client_id?: string | null;
    }) => {
      const updates: any = {};
      if (tags !== undefined) updates.tags = tags;
      if (notes !== undefined) updates.notes = notes;
      if (client_id !== undefined) updates.client_id = client_id;
      const { error } = await supabase.from('swipe_file').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['swipe-file'] });
    },
  });
}

export function useRemoveFromSwipeFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('swipe_file').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['swipe-file'] });
    },
  });
}

// Check if an ad or viral video is already in swipe file
export function useSwipeFileIds() {
  const { data: items = [] } = useSwipeFile();
  const adIds = new Set(items.filter(i => i.ad_id).map(i => i.ad_id!));
  const videoIds = new Set(items.filter(i => i.viral_video_id).map(i => i.viral_video_id!));
  return { adIds, videoIds, items };
}
