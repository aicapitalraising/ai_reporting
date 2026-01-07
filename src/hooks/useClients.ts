import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Client {
  id: string;
  name: string;
  status: string;
  ghl_location_id: string | null;
  ghl_api_key: string | null;
  meta_ad_account_id: string | null;
  meta_access_token: string | null;
  public_token: string | null;
  created_at: string;
  updated_at: string;
}

export function useClients() {
  return useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as Client[];
    },
  });
}

export function useClient(clientId: string | undefined) {
  return useQuery({
    queryKey: ['client', clientId],
    queryFn: async () => {
      if (!clientId) return null;
      
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .maybeSingle();
      
      if (error) throw error;
      return data as Client | null;
    },
    enabled: !!clientId,
  });
}

export function useClientByToken(token: string | undefined) {
  return useQuery({
    queryKey: ['client-by-token', token],
    queryFn: async () => {
      if (!token) return null;
      
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('public_token', token)
        .maybeSingle();
      
      if (error) throw error;
      return data as Client | null;
    },
    enabled: !!token,
  });
}
