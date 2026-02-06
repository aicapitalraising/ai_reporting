import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface HubSpotPipeline {
  id: string;
  label: string;
  stages: { id: string; label: string }[];
}

interface SyncResult {
  success: boolean;
  error?: string;
  summary?: {
    contacts?: number;
    deals?: number;
    meetings?: number;
    fundedFromDeals?: number;
    committedFromDeals?: number;
  };
}

interface PipelinesResult {
  pipelines?: HubSpotPipeline[];
  error?: string;
}

export function useHubSpotSync() {
  const [isLoading, setIsLoading] = useState(false);

  const testConnection = async (
    clientId: string,
    portalId: string,
    accessToken: string
  ): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-hubspot-contacts', {
        body: {
          client_id: clientId,
          mode: 'test',
          hubspot_portal_id: portalId,
          hubspot_access_token: accessToken,
        },
      });

      if (error) throw error;
      return { success: data?.success ?? false, error: data?.error };
    } catch (error: any) {
      console.error('HubSpot connection test failed:', error);
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  const syncNow = async (clientId: string): Promise<SyncResult> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-hubspot-contacts', {
        body: {
          client_id: clientId,
          mode: 'sync',
        },
      });

      if (error) throw error;
      return {
        success: data?.success ?? false,
        summary: data?.summary,
        error: data?.error,
      };
    } catch (error: any) {
      console.error('HubSpot sync failed:', error);
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPipelines = async (clientId: string): Promise<PipelinesResult> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-hubspot-contacts', {
        body: {
          client_id: clientId,
          mode: 'fetch_pipelines',
        },
      });

      if (error) throw error;
      return { pipelines: data?.pipelines || [] };
    } catch (error: any) {
      console.error('Failed to fetch HubSpot pipelines:', error);
      return { error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    testConnection,
    syncNow,
    fetchPipelines,
    isLoading,
  };
}
