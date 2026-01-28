import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface GPTFile {
  id: string;
  gpt_id: string;
  name: string;
  file_type: string;
  file_url: string | null;
  website_url: string | null;
  content: string | null;
  character_count: number;
  estimated_tokens: number;
  created_at: string;
}

export const TOKEN_LIMIT = 100000;

export const estimateTokens = (text: string): number => {
  return Math.ceil(text.length / 4);
};

export const getCapacityPercent = (usedTokens: number): number => {
  return Math.min(100, (usedTokens / TOKEN_LIMIT) * 100);
};

export const getCapacityColor = (percent: number): string => {
  if (percent < 50) return 'bg-green-500';
  if (percent < 80) return 'bg-amber-500';
  return 'bg-destructive';
};

export function useGPTFiles(gptId?: string) {
  return useQuery({
    queryKey: ['gpt-files', gptId],
    queryFn: async () => {
      let query = supabase.from('gpt_files').select('*');
      if (gptId) {
        query = query.eq('gpt_id', gptId);
      }
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      return data as GPTFile[];
    },
    enabled: !!gptId,
  });
}

export function useCreateGPTFile() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (file: {
      gpt_id: string;
      name: string;
      file_type: string;
      file_url?: string;
      website_url?: string;
      content?: string;
    }) => {
      const characterCount = file.content?.length || 0;
      const estimatedTokens = estimateTokens(file.content || '');
      
      const { data, error } = await supabase
        .from('gpt_files')
        .insert({
          ...file,
          character_count: characterCount,
          estimated_tokens: estimatedTokens,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data as GPTFile;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['gpt-files', variables.gpt_id] });
      toast.success('File added to GPT');
    },
    onError: (error) => {
      toast.error('Failed to add file: ' + error.message);
    },
  });
}

export function useDeleteGPTFile() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, gptId }: { id: string; gptId: string }) => {
      const { error } = await supabase
        .from('gpt_files')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return gptId;
    },
    onSuccess: (gptId) => {
      queryClient.invalidateQueries({ queryKey: ['gpt-files', gptId] });
      toast.success('File removed');
    },
  });
}

export function useGPTFilesTotalTokens(gptId?: string) {
  const { data: files = [] } = useGPTFiles(gptId);
  return files.reduce((sum, file) => sum + (file.estimated_tokens || 0), 0);
}
