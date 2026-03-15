import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ScrapedAd {
  id: string;
  company: string;
  headline: string;
  description: string | null;
  image_url: string | null;
  video_url: string | null;
  ad_format: string;
  platform: string;
  status: string;
  category: string | null;
  tags: string[];
  start_date: string | null;
  saves: number;
  views: number;
  source_url: string | null;
  scraped_at: string;
  monitoring_target_id: string | null;
  reach: number;
  ad_count: number;
  iterated: boolean;
  selected: boolean;
}

export interface MonitoringTarget {
  id: string;
  type: 'keyword' | 'domain';
  value: string;
  created_at: string;
  last_scraped_at: string | null;
}

// Fetch all scraped ads
export function useScrapedAds() {
  return useQuery({
    queryKey: ['scraped-ads'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scraped_ads')
        .select('*')
        .order('scraped_at', { ascending: false });
      if (error) throw error;
      return data as ScrapedAd[];
    },
  });
}

// Fetch monitoring targets
export function useMonitoringTargets() {
  return useQuery({
    queryKey: ['monitoring-targets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('monitoring_targets')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as MonitoringTarget[];
    },
  });
}

// Start tracking: create target + scrape
export function useStartTracking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ type, value }: { type: 'keyword' | 'domain'; value: string }) => {
      const { data: target, error: targetError } = await supabase
        .from('monitoring_targets')
        .insert({ type, value })
        .select()
        .single();
      if (targetError) throw targetError;

      const { data: scrapeResult, error: scrapeError } = await supabase.functions.invoke('scrape-ads', {
        body: { keyword: value, targetId: target.id },
      });

      if (scrapeError) throw scrapeError;

      if (!scrapeResult?.success) {
        throw new Error(scrapeResult?.error || 'Scraping failed');
      }

      // Pre-filter ads: remove those with no image or junk image URLs
      const ads = (scrapeResult.ads || []).filter((ad: any) => {
        if (!ad.image_url) return false;
        const url = ad.image_url.toLowerCase();
        // Reject placeholder/logo/junk patterns
        if (/favicon|icon|logo|avatar|profile|placeholder|blank|spacer|pixel|tracking|1x1|\.svg|\.ico|base64|data:image|gravatar|widget|spinner|loading/i.test(url)) return false;
        if (url.length < 30) return false;
        return true;
      });

      if (ads.length > 0) {
        const { error: insertError } = await supabase.from('scraped_ads').insert(ads);
        if (insertError) throw insertError;
      }

      await supabase
        .from('monitoring_targets')
        .update({ last_scraped_at: new Date().toISOString() })
        .eq('id', target.id);

      return { target, adsCount: ads.length };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scraped-ads'] });
      queryClient.invalidateQueries({ queryKey: ['monitoring-targets'] });
    },
  });
}

// Delete monitoring target
export function useDeleteMonitoringTarget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('monitoring_targets').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monitoring-targets'] });
      queryClient.invalidateQueries({ queryKey: ['scraped-ads'] });
    },
  });
}

// Delete a scraped ad
export function useDeleteScrapedAd() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('scraped_ads').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scraped-ads'] });
    },
  });
}

// Bulk delete scraped ads
export function useBulkDeleteScrapedAds() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from('scraped_ads').delete().in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scraped-ads'] });
    },
  });
}

// Assign ad to client(s)
export function useAssignAdToClients() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ adId, clientIds, notes }: { adId: string; clientIds: string[]; notes?: string }) => {
      const rows = clientIds.map(clientId => ({
        ad_id: adId,
        client_id: clientId,
        notes: notes || null,
      }));
      const { error } = await supabase.from('client_ad_assignments').insert(rows);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-ad-assignments'] });
    },
  });
}

// Get ads assigned to a client
export function useClientAssignedAds(clientId: string | undefined) {
  return useQuery({
    queryKey: ['client-ad-assignments', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data, error } = await supabase
        .from('client_ad_assignments')
        .select('*, scraped_ads(*)')
        .eq('client_id', clientId)
        .order('assigned_at', { ascending: false });
      if (error) throw error;
      return data as ({ id: string; client_id: string; ad_id: string; assigned_at: string; notes: string | null; scraped_ads: ScrapedAd })[];
    },
    enabled: !!clientId,
  });
}

// Remove assignment
export function useRemoveAdAssignment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (assignmentId: string) => {
      const { error } = await supabase.from('client_ad_assignments').delete().eq('id', assignmentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-ad-assignments'] });
    },
  });
}
