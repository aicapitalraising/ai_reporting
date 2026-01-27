import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AgencyPod {
  id: string;
  name: string;
  description: string | null;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface ClientPodAssignment {
  id: string;
  client_id: string;
  pod_id: string;
  is_lead: boolean;
  created_at: string;
  pod?: AgencyPod;
}

// Fetch all pods
export function useAgencyPods() {
  return useQuery({
    queryKey: ['agency-pods'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agency_pods')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as AgencyPod[];
    },
  });
}

// Create pod
export function useCreatePod() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (pod: { name: string; description?: string; color?: string }) => {
      const { data, error } = await supabase
        .from('agency_pods')
        .insert(pod)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agency-pods'] });
      toast.success('Pod created successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to create pod: ' + error.message);
    },
  });
}

// Update pod
export function useUpdatePod() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<AgencyPod> & { id: string }) => {
      const { data, error } = await supabase
        .from('agency_pods')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agency-pods'] });
      toast.success('Pod updated successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to update pod: ' + error.message);
    },
  });
}

// Delete pod
export function useDeletePod() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (podId: string) => {
      const { error } = await supabase
        .from('agency_pods')
        .delete()
        .eq('id', podId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agency-pods'] });
      queryClient.invalidateQueries({ queryKey: ['agency-members'] });
      toast.success('Pod deleted successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to delete pod: ' + error.message);
    },
  });
}

// Fetch pods assigned to a client
export function useClientPodAssignments(clientId?: string) {
  return useQuery({
    queryKey: ['client-pod-assignments', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_pod_assignments')
        .select('*, pod:agency_pods(*)')
        .eq('client_id', clientId!);
      
      if (error) throw error;
      return data as ClientPodAssignment[];
    },
    enabled: !!clientId,
  });
}

// Assign pod to client
export function useAssignPodToClient() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ clientId, podId, isLead = false }: { clientId: string; podId: string; isLead?: boolean }) => {
      const { data, error } = await supabase
        .from('client_pod_assignments')
        .insert({
          client_id: clientId,
          pod_id: podId,
          is_lead: isLead,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, { clientId }) => {
      queryClient.invalidateQueries({ queryKey: ['client-pod-assignments', clientId] });
    },
    onError: (error: Error) => {
      toast.error('Failed to assign pod: ' + error.message);
    },
  });
}

// Remove pod from client
export function useRemovePodFromClient() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ clientId, podId }: { clientId: string; podId: string }) => {
      const { error } = await supabase
        .from('client_pod_assignments')
        .delete()
        .eq('client_id', clientId)
        .eq('pod_id', podId);
      
      if (error) throw error;
    },
    onSuccess: (_, { clientId }) => {
      queryClient.invalidateQueries({ queryKey: ['client-pod-assignments', clientId] });
    },
    onError: (error: Error) => {
      toast.error('Failed to remove pod: ' + error.message);
    },
  });
}

// Update pod assignment (for setting lead)
export function useUpdatePodAssignment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ clientId, podId, isLead }: { clientId: string; podId: string; isLead: boolean }) => {
      // First, if setting as lead, unset all other leads for this client
      if (isLead) {
        await supabase
          .from('client_pod_assignments')
          .update({ is_lead: false })
          .eq('client_id', clientId);
      }
      
      const { data, error } = await supabase
        .from('client_pod_assignments')
        .update({ is_lead: isLead })
        .eq('client_id', clientId)
        .eq('pod_id', podId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, { clientId }) => {
      queryClient.invalidateQueries({ queryKey: ['client-pod-assignments', clientId] });
    },
    onError: (error: Error) => {
      toast.error('Failed to update assignment: ' + error.message);
    },
  });
}

// Update member's pod assignment
export function useUpdateMemberPod() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ memberId, podId }: { memberId: string; podId: string | null }) => {
      const { data, error } = await supabase
        .from('agency_members')
        .update({ pod_id: podId })
        .eq('id', memberId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agency-members'] });
      queryClient.invalidateQueries({ queryKey: ['agency-pods'] });
    },
    onError: (error: Error) => {
      toast.error('Failed to update member: ' + error.message);
    },
  });
}
