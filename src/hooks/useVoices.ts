import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category: string; // "cloned", "premade", "generated", "professional"
  description: string | null;
  preview_url: string | null;
  labels: Record<string, string>;
}
export interface Voice {
  id: string;
  name: string;
  elevenlabs_voice_id: string;
  sample_url: string | null;
  client_id: string | null;
  is_stock: boolean;
  description: string | null;
  gender: string | null;
  preview_url: string | null;
  created_at: string;
}

export function useVoices(clientId?: string | null) {
  return useQuery({
    queryKey: ['voices', clientId],
    queryFn: async () => {
      let query = supabase
        .from('voices')
        .select('*')
        .order('created_at', { ascending: false });

      if (clientId) {
        query = query.or(`is_stock.eq.true,client_id.eq.${clientId},client_id.is.null`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Voice[];
    },
  });
}

export function useCloneVoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      audioFile,
      name,
      description,
      clientId,
      gender,
    }: {
      audioFile: File;
      name: string;
      description?: string;
      clientId?: string;
      gender?: string;
    }) => {
      // 1. Upload audio to storage
      const fileExt = audioFile.name.split('.').pop();
      const filePath = `samples/${Date.now()}-${name.replace(/\s+/g, '-')}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('voice-samples')
        .upload(filePath, audioFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl: sampleUrl } } = supabase.storage
        .from('voice-samples')
        .getPublicUrl(filePath);

      // 2. Clone via edge function
      const formData = new FormData();
      formData.append('audio', audioFile);
      formData.append('name', name);
      if (description) formData.append('description', description);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/clone-voice`,
        {
          method: 'POST',
          headers: {
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to clone voice');
      }

      const result = await response.json();

      // 3. Save to voices table
      const { data, error } = await supabase
        .from('voices')
        .insert({
          name,
          elevenlabs_voice_id: result.voice_id,
          sample_url: sampleUrl,
          client_id: clientId || null,
          is_stock: !clientId,
          description: description || null,
          gender: gender || null,
          preview_url: result.preview_url || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Voice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['voices'] });
    },
  });
}

export function useDeleteVoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('voices')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['voices'] });
    },
  });
}

// Fetch all voices from ElevenLabs account
export function useElevenLabsVoices() {
  return useQuery({
    queryKey: ['elevenlabs-voices'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('list-elevenlabs-voices');
      if (error) throw error;
      return (data.voices || []) as ElevenLabsVoice[];
    },
    staleTime: 60000, // Cache for 1 minute
    enabled: false, // Only fetch on demand
  });
}

// Import an ElevenLabs voice into the local voices table
export function useImportElevenLabsVoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      voice,
      clientId,
    }: {
      voice: ElevenLabsVoice;
      clientId?: string;
    }) => {
      // Check if already imported
      const { data: existing } = await supabase
        .from('voices')
        .select('id')
        .eq('elevenlabs_voice_id', voice.voice_id)
        .maybeSingle();

      if (existing) {
        throw new Error(`Voice "${voice.name}" is already imported`);
      }

      const gender = voice.labels?.gender || null;

      const { data, error } = await supabase
        .from('voices')
        .insert({
          name: voice.name,
          elevenlabs_voice_id: voice.voice_id,
          client_id: clientId || null,
          is_stock: false,
          description: voice.description || `Imported from ElevenLabs (${voice.category})`,
          gender,
          preview_url: voice.preview_url || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Voice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['voices'] });
    },
  });
}
