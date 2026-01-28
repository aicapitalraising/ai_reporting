import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CustomGPT {
  id: string;
  name: string;
  description: string | null;
  system_prompt: string;
  icon: string;
  color: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface GPTKnowledgeLink {
  id: string;
  gpt_id: string;
  document_id: string;
  created_at: string;
}

export function useCustomGPTs() {
  return useQuery({
    queryKey: ['custom-gpts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('custom_gpts')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as CustomGPT[];
    },
  });
}

export function useGPTKnowledgeLinks(gptId?: string) {
  return useQuery({
    queryKey: ['gpt-knowledge-links', gptId],
    queryFn: async () => {
      let query = supabase.from('gpt_knowledge_base').select('*');
      if (gptId) {
        query = query.eq('gpt_id', gptId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as GPTKnowledgeLink[];
    },
  });
}

export function useCreateGPT() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (gpt: {
      name: string;
      description?: string;
      system_prompt: string;
      icon?: string;
      color?: string;
    }) => {
      const { data, error } = await supabase
        .from('custom_gpts')
        .insert(gpt)
        .select()
        .single();
      
      if (error) throw error;
      return data as CustomGPT;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-gpts'] });
      toast.success('GPT created');
    },
    onError: (error) => {
      toast.error('Failed to create GPT: ' + error.message);
    },
  });
}

export function useUpdateGPT() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CustomGPT> & { id: string }) => {
      const { data, error } = await supabase
        .from('custom_gpts')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-gpts'] });
      toast.success('GPT updated');
    },
  });
}

export function useDeleteGPT() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('custom_gpts')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-gpts'] });
      toast.success('GPT deleted');
    },
  });
}

export function useLinkKnowledgeToGPT() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ gptId, documentId }: { gptId: string; documentId: string }) => {
      const { data, error } = await supabase
        .from('gpt_knowledge_base')
        .insert({ gpt_id: gptId, document_id: documentId })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, { gptId }) => {
      queryClient.invalidateQueries({ queryKey: ['gpt-knowledge-links', gptId] });
      toast.success('Knowledge linked');
    },
  });
}

export function useUnlinkKnowledgeFromGPT() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ gptId, documentId }: { gptId: string; documentId: string }) => {
      const { error } = await supabase
        .from('gpt_knowledge_base')
        .delete()
        .eq('gpt_id', gptId)
        .eq('document_id', documentId);
      
      if (error) throw error;
    },
    onSuccess: (_, { gptId }) => {
      queryClient.invalidateQueries({ queryKey: ['gpt-knowledge-links', gptId] });
    },
  });
}
