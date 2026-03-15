import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ViralVideo {
  id: string;
  title: string;
  description: string | null;
  platform: string;
  video_url: string | null;
  thumbnail_url: string | null;
  source_url: string | null;
  creator_name: string | null;
  creator_handle: string | null;
  views: number;
  likes: number;
  shares: number;
  comments: number;
  hashtags: string[];
  tracking_hashtag: string | null;
  tracking_profile: string | null;
  category: string | null;
  scraped_at: string;
  published_at: string | null;
  created_at: string;
}

export interface ViralTrackingTarget {
  id: string;
  type: string;
  value: string;
  platforms: string[];
  min_views: number;
  last_scraped_at: string | null;
  created_at: string;
}

export function useViralVideos() {
  return useQuery({
    queryKey: ['viral-videos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('viral_videos')
        .select('*')
        .order('views', { ascending: false });
      if (error) throw error;
      return data as ViralVideo[];
    },
  });
}

export function useViralTrackingTargets() {
  return useQuery({
    queryKey: ['viral-tracking-targets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('viral_tracking_targets')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as ViralTrackingTarget[];
    },
  });
}

export function useStartViralTracking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      type,
      value,
      platforms,
      minViews,
    }: {
      type: 'hashtag' | 'profile';
      value: string;
      platforms?: string[];
      minViews?: number;
    }) => {
      // Create tracking target
      const { data: target, error: targetError } = await supabase
        .from('viral_tracking_targets')
        .insert({
          type,
          value,
          platforms: platforms || ['TikTok', 'Instagram', 'Facebook', 'LinkedIn'],
          min_views: minViews || 1000000,
        })
        .select()
        .single();
      if (targetError) throw targetError;

      // Scrape viral videos
      const body: Record<string, any> = { targetId: target.id, platforms: target.platforms, minViews: target.min_views };
      if (type === 'hashtag') body.hashtag = value;
      else body.profile = value;

      const { data: scrapeResult, error: scrapeError } = await supabase.functions.invoke('scrape-viral-videos', { body });
      if (scrapeError) throw scrapeError;
      if (!scrapeResult?.success) throw new Error(scrapeResult?.error || 'Scraping failed');

      const videos = scrapeResult.videos || [];
      if (videos.length > 0) {
        const { error: insertError } = await supabase.from('viral_videos').insert(videos);
        if (insertError) throw insertError;
      }

      await supabase
        .from('viral_tracking_targets')
        .update({ last_scraped_at: new Date().toISOString() })
        .eq('id', target.id);

      return { target, videosCount: videos.length };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['viral-videos'] });
      queryClient.invalidateQueries({ queryKey: ['viral-tracking-targets'] });
    },
  });
}

export function useDeleteViralTrackingTarget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('viral_tracking_targets').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['viral-tracking-targets'] });
      queryClient.invalidateQueries({ queryKey: ['viral-videos'] });
    },
  });
}

export function useDeleteViralVideo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('viral_videos').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['viral-videos'] });
    },
  });
}
