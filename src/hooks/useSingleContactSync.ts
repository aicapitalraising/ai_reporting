import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SyncResult {
  success: boolean;
  contact?: {
    id: string;
    name: string;
    ghl_synced_at: string;
  };
  error?: string;
}

export function useSingleContactSync() {
  const queryClient = useQueryClient();
  const [syncingIds, setSyncingIds] = useState<Set<string>>(new Set());

  const syncContact = async (
    clientId: string, 
    externalId: string, 
    recordType: 'lead' | 'call'
  ): Promise<SyncResult> => {
    // Add to syncing set
    setSyncingIds(prev => new Set(prev).add(externalId));
    
    try {
      const { data, error } = await supabase.functions.invoke('sync-ghl-contacts', {
        body: { 
          client_id: clientId, 
          contactId: externalId, 
          mode: 'single' 
        }
      });
      
      if (error) {
        throw new Error(error.message || 'Failed to sync contact');
      }
      
      if (!data?.success) {
        throw new Error(data?.error || 'Sync failed');
      }
      
      // Invalidate queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ['leads', clientId] });
      queryClient.invalidateQueries({ queryKey: ['calls', clientId] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['calls'] });
      
      toast.success('Contact synced from GHL');
      return { success: true, contact: data.contact };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`Sync failed: ${errorMessage}`);
      return { success: false, error: errorMessage };
    } finally {
      // Remove from syncing set
      setSyncingIds(prev => {
        const next = new Set(prev);
        next.delete(externalId);
        return next;
      });
    }
  };

  const isSyncing = (id: string) => syncingIds.has(id);

  return { syncContact, syncingIds, isSyncing };
}
