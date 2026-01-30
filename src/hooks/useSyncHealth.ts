import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SyncHealthItem {
  recordType: 'leads' | 'calls' | 'funded';
  label: string;
  count: number;
  lastSynced: string | null;
  status: 'healthy' | 'stale' | 'critical';
}

export interface QuickCheckItem {
  id: string;
  label: string;
  count: number;
  type: 'calls_missing_lead' | 'funded_missing_lead';
}

export interface SyncHealthData {
  items: SyncHealthItem[];
  quickChecks: QuickCheckItem[];
}

function getSyncStatus(lastSynced: string | null): 'healthy' | 'stale' | 'critical' {
  if (!lastSynced) return 'critical';
  
  const now = new Date();
  const syncedAt = new Date(lastSynced);
  const hoursDiff = (now.getTime() - syncedAt.getTime()) / (1000 * 60 * 60);
  
  if (hoursDiff <= 1) return 'healthy';
  if (hoursDiff <= 24) return 'stale';
  return 'critical';
}

export function useSyncHealth(clientId: string | undefined) {
  return useQuery({
    queryKey: ['sync-health', clientId],
    queryFn: async (): Promise<SyncHealthData> => {
      if (!clientId) {
        return { items: [], quickChecks: [] };
      }

      // Fetch sync health data in parallel
      const [
        leadsResult,
        callsResult,
        fundedResult,
        callsMissingLeadResult,
        fundedMissingLeadResult,
      ] = await Promise.all([
        // Leads count and last sync
        supabase
          .from('leads')
          .select('ghl_synced_at', { count: 'exact' })
          .eq('client_id', clientId)
          .order('ghl_synced_at', { ascending: false, nullsFirst: false })
          .limit(1),
        
        // Calls count and last sync
        supabase
          .from('calls')
          .select('ghl_synced_at', { count: 'exact' })
          .eq('client_id', clientId)
          .order('ghl_synced_at', { ascending: false, nullsFirst: false })
          .limit(1),
        
        // Funded investors count
        supabase
          .from('funded_investors')
          .select('created_at', { count: 'exact' })
          .eq('client_id', clientId)
          .order('created_at', { ascending: false })
          .limit(1),
        
        // Quick check: Calls missing lead link
        supabase
          .from('calls')
          .select('id', { count: 'exact', head: true })
          .eq('client_id', clientId)
          .is('lead_id', null),
        
        // Quick check: Funded without lead
        supabase
          .from('funded_investors')
          .select('id', { count: 'exact', head: true })
          .eq('client_id', clientId)
          .is('lead_id', null),
      ]);

      const leadsLastSync = leadsResult.data?.[0]?.ghl_synced_at || null;
      const callsLastSync = callsResult.data?.[0]?.ghl_synced_at || null;
      const fundedLastSync = fundedResult.data?.[0]?.created_at || null;

      const items: SyncHealthItem[] = [
        {
          recordType: 'leads',
          label: 'Leads',
          count: leadsResult.count || 0,
          lastSynced: leadsLastSync,
          status: getSyncStatus(leadsLastSync),
        },
        {
          recordType: 'calls',
          label: 'Calls',
          count: callsResult.count || 0,
          lastSynced: callsLastSync,
          status: getSyncStatus(callsLastSync),
        },
        {
          recordType: 'funded',
          label: 'Funded',
          count: fundedResult.count || 0,
          lastSynced: fundedLastSync,
          status: getSyncStatus(fundedLastSync),
        },
      ];

      const quickChecks: QuickCheckItem[] = [
        {
          id: 'calls_missing_lead',
          label: 'Calls missing lead link',
          count: callsMissingLeadResult.count || 0,
          type: 'calls_missing_lead',
        },
        {
          id: 'funded_missing_lead',
          label: 'Funded without lead',
          count: fundedMissingLeadResult.count || 0,
          type: 'funded_missing_lead',
        },
      ];

      return { items, quickChecks };
    },
    enabled: !!clientId,
    staleTime: 30000, // 30 seconds
  });
}
