import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface MasterSyncProgress {
  isLoading: boolean;
  phase: string | null;
  message: string | null;
}

export interface MasterSyncSummary {
  contacts_created: number;
  contacts_updated: number;
  calls_created: number;
  calls_updated: number;
  reconnect_calls: number;
  funded_investors_created: number;
  opportunities_synced: number;
  orphaned_calls_linked: number;
  discrepancies_cleared: number;
  errors: string[];
}

export interface MasterSyncResult {
  success: boolean;
  summary?: MasterSyncSummary;
  error?: string;
}

export function useMasterSync(clientId: string | undefined) {
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState<MasterSyncProgress>({
    isLoading: false,
    phase: null,
    message: null,
  });

  const invalidateAllQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['leads'] });
    queryClient.invalidateQueries({ queryKey: ['calls'] });
    queryClient.invalidateQueries({ queryKey: ['funded-investors'] });
    queryClient.invalidateQueries({ queryKey: ['sync-health', clientId] });
    queryClient.invalidateQueries({ queryKey: ['gap-leads'] });
    queryClient.invalidateQueries({ queryKey: ['data-discrepancies'] });
    queryClient.invalidateQueries({ queryKey: ['pipeline-opportunities'] });
    queryClient.invalidateQueries({ queryKey: ['client-pipelines'] });
  }, [queryClient, clientId]);

  const runMasterSync = useCallback(async (): Promise<MasterSyncResult> => {
    if (!clientId) return { success: false, error: 'No client ID' };

    setProgress({ 
      isLoading: true, 
      phase: 'Starting', 
      message: 'Initializing comprehensive GHL sync...' 
    });
    
    try {
      const { data, error } = await supabase.functions.invoke('sync-ghl-contacts', {
        body: { 
          client_id: clientId,
          mode: 'master_sync'
        }
      });

      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || 'Master sync failed');

      const summary = data.summary as MasterSyncSummary;
      
      invalidateAllQueries();
      
      // Build success message
      const parts: string[] = [];
      if (summary.contacts_created > 0) parts.push(`${summary.contacts_created} contacts created`);
      if (summary.contacts_updated > 0) parts.push(`${summary.contacts_updated} updated`);
      if (summary.calls_created > 0) parts.push(`${summary.calls_created} calls synced`);
      if (summary.funded_investors_created > 0) parts.push(`${summary.funded_investors_created} funded investors`);
      if (summary.opportunities_synced > 0) parts.push(`${summary.opportunities_synced} opportunities`);
      if (summary.orphaned_calls_linked > 0) parts.push(`${summary.orphaned_calls_linked} orphaned calls linked`);
      
      const successMsg = parts.length > 0 
        ? `Master sync complete: ${parts.join(', ')}`
        : 'Master sync complete - no new data';
      
      toast.success(successMsg);
      
      if (summary.errors.length > 0) {
        toast.warning(`${summary.errors.length} errors during sync`);
      }
      
      return { success: true, summary };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`Master sync failed: ${errorMessage}`);
      return { success: false, error: errorMessage };
    } finally {
      setProgress({ isLoading: false, phase: null, message: null });
    }
  }, [clientId, invalidateAllQueries]);

  return {
    progress,
    runMasterSync,
  };
}
