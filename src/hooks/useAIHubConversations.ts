import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AIHubConversation {
  id: string;
  gpt_id: string | null;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface AIHubMessage {
  id: string;
  conversation_id: string;
  role: string;
  content: string;
  created_at: string;
}

export function useAIHubConversations(gptId?: string) {
  return useQuery({
    queryKey: ['ai-hub-conversations', gptId],
    queryFn: async () => {
      let query = supabase
        .from('ai_hub_conversations')
        .select('*')
        .order('updated_at', { ascending: false });
      
      if (gptId) {
        query = query.eq('gpt_id', gptId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as AIHubConversation[];
    },
  });
}

export function useAIHubMessages(conversationId?: string) {
  return useQuery({
    queryKey: ['ai-hub-messages', conversationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_hub_messages')
        .select('*')
        .eq('conversation_id', conversationId!)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data as AIHubMessage[];
    },
    enabled: !!conversationId,
  });
}

export function useCreateAIHubConversation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ gptId, title }: { gptId?: string; title?: string }) => {
      const { data, error } = await supabase
        .from('ai_hub_conversations')
        .insert({
          gpt_id: gptId || null,
          title: title || 'New Conversation',
        })
        .select()
        .single();
      
      if (error) throw error;
      return data as AIHubConversation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-hub-conversations'] });
    },
  });
}

export function useUpdateAIHubConversation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) => {
      const { data, error } = await supabase
        .from('ai_hub_conversations')
        .update({ title, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-hub-conversations'] });
    },
  });
}

export function useDeleteAIHubConversation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('ai_hub_conversations')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-hub-conversations'] });
      toast.success('Conversation deleted');
    },
  });
}

export function useAddAIHubMessage() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ conversationId, role, content }: { 
      conversationId: string; 
      role: string; 
      content: string 
    }) => {
      const { data, error } = await supabase
        .from('ai_hub_messages')
        .insert({
          conversation_id: conversationId,
          role,
          content,
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Update conversation timestamp
      await supabase
        .from('ai_hub_conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId);
      
      return data as AIHubMessage;
    },
    onSuccess: (_, { conversationId }) => {
      queryClient.invalidateQueries({ queryKey: ['ai-hub-messages', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['ai-hub-conversations'] });
    },
  });
}
