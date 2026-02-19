import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { fetchAllRows } from '@/lib/fetchAllRows';

export interface LiveAd {
  id: string;
  client_id: string;
  campaign_id: string | null;
  ad_library_id: string | null;
  ad_library_url: string | null;
  page_id: string | null;
  page_name: string | null;
  primary_text: string | null;
  headline: string | null;
  description: string | null;
  cta_type: string | null;
  media_type: string | null;
  media_urls: string[];
  thumbnail_url: string | null;
  status: string;
  platforms: string[];
  started_running_on: string | null;
  impressions_bucket: string | null;
  ai_analysis: Record<string, unknown> | null;
  last_analyzed_at: string | null;
  scraped_at: string;
  raw_markdown: string | null;
  created_at: string;
  updated_at: string;
}

export function useLiveAds(clientId: string | undefined) {
  return useQuery({
    queryKey: ['live-ads', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      
      return await fetchAllRows<LiveAd>((sb) =>
        sb.from('client_live_ads')
          .select('*')
          .eq('client_id', clientId)
          .order('scraped_at', { ascending: false })
      );
    },
    enabled: !!clientId,
  });
}

export function useScrapeAds() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ clientId, pageId, adsLibraryUrl }: { 
      clientId: string; 
      pageId?: string; 
      adsLibraryUrl?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('scrape-fb-ads', {
        body: { clientId, pageId, adsLibraryUrl },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Failed to scrape ads');
      
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['live-ads', variables.clientId] });
      toast.success(`Synced ${data.adsCount || 0} ads from Facebook Ads Library`);
    },
    onError: (error) => {
      console.error('Error scraping ads:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to scrape ads');
    },
  });
}

export function useDeleteLiveAd() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ adId, clientId }: { adId: string; clientId: string }) => {
      const { error } = await supabase
        .from('client_live_ads')
        .delete()
        .eq('id', adId);

      if (error) throw error;
      return { adId, clientId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['live-ads', data.clientId] });
      toast.success('Ad removed');
    },
    onError: (error) => {
      console.error('Error deleting ad:', error);
      toast.error('Failed to delete ad');
    },
  });
}

export function useAnalyzeLiveAd() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ad }: { ad: LiveAd }) => {
      // Use the existing creative-ai-audit function for analysis
      const { data, error } = await supabase.functions.invoke('creative-ai-audit', {
        body: {
          action: 'audit',
          creative: {
            title: ad.page_name || 'Live Ad',
            type: ad.media_type || 'image',
            platform: ad.platforms?.[0] || 'facebook',
            headline: ad.headline,
            body_copy: ad.primary_text,
            cta_text: ad.cta_type,
            file_url: ad.thumbnail_url,
          },
        },
      });

      if (error) throw error;
      
      // Store the analysis result
      const { error: updateError } = await supabase
        .from('client_live_ads')
        .update({
          ai_analysis: { audit: data.audit },
          last_analyzed_at: new Date().toISOString(),
        })
        .eq('id', ad.id);

      if (updateError) throw updateError;

      return { ad, analysis: data.audit };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['live-ads', data.ad.client_id] });
      toast.success('AI analysis complete');
    },
    onError: (error) => {
      console.error('Error analyzing ad:', error);
      toast.error('Failed to analyze ad');
    },
  });
}
