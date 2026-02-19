import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { fetchAllRows } from '@/lib/fetchAllRows';

export interface SpamBlacklistEntry {
  id: string;
  type: string;
  value: string;
  reason: string | null;
  ip_address: string | null;
  created_at: string;
}

export function useSpamBlacklist() {
  return useQuery({
    queryKey: ['spam-blacklist'],
    queryFn: async () => {
      return await fetchAllRows<SpamBlacklistEntry>((sb) =>
        sb.from('spam_blacklist')
          .select('*')
          .order('created_at', { ascending: false })
      );
    },
  });
}

export function useAddToBlacklist() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ type, value, reason, ip_address }: { 
      type: string; 
      value: string; 
      reason?: string;
      ip_address?: string;
    }) => {
      const { data, error } = await supabase
        .from('spam_blacklist')
        .insert({ type, value: value.toLowerCase(), reason, ip_address })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spam-blacklist'] });
      toast.success('Added to blacklist');
    },
    onError: (error: any) => {
      if (error.message?.includes('duplicate')) {
        toast.error('This entry already exists in the blacklist');
      } else {
        toast.error('Failed to add to blacklist');
      }
    },
  });
}

export function useRemoveFromBlacklist() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('spam_blacklist')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spam-blacklist'] });
      toast.success('Removed from blacklist');
    },
    onError: () => {
      toast.error('Failed to remove from blacklist');
    },
  });
}

// Get all spam leads across clients
export function useSpamLeads() {
  return useQuery({
    queryKey: ['spam-leads'],
    queryFn: async () => {
      return await fetchAllRows((sb) =>
        sb.from('leads')
          .select('id, name, email, phone, client_id, created_at, custom_fields')
          .eq('is_spam', true)
          .order('created_at', { ascending: false })
      );
    },
  });
}
