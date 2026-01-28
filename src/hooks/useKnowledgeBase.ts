import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface KnowledgeDocument {
  id: string;
  name: string;
  document_type: string;
  file_url: string | null;
  website_url: string | null;
  content: string | null;
  extracted_text: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export function useKnowledgeDocuments() {
  return useQuery({
    queryKey: ['knowledge-documents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('knowledge_base_documents')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as KnowledgeDocument[];
    },
  });
}

export function useCreateDocument() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (doc: {
      name: string;
      document_type: string;
      file_url?: string;
      website_url?: string;
      content?: string;
      extracted_text?: string;
    }) => {
      // Calculate token estimates
      const textContent = doc.content || doc.extracted_text || '';
      const characterCount = textContent.length;
      const estimatedTokens = Math.ceil(characterCount / 4);

      const { data, error } = await supabase
        .from('knowledge_base_documents')
        .insert({
          ...doc,
          character_count: characterCount,
          estimated_tokens: estimatedTokens,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-documents'] });
      toast.success('Document added to knowledge base');
    },
    onError: (error) => {
      toast.error('Failed to add document: ' + error.message);
    },
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('knowledge_base_documents')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-documents'] });
      toast.success('Document removed');
    },
  });
}
