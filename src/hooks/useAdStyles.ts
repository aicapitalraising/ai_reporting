import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { AdStyle } from '@/types';

// Fetch all styles (global defaults + client-specific)
export function useAdStyles(clientId?: string) {
  return useQuery({
    queryKey: ['ad-styles', clientId],
    queryFn: async () => {
      let query = supabase
        .from('ad_styles')
        .select('*')
        .order('display_order', { ascending: true });

      // Get global defaults (client_id is null) OR client-specific styles
      if (clientId) {
        query = query.or(`client_id.is.null,client_id.eq.${clientId}`);
      } else {
        query = query.is('client_id', null);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as AdStyle[];
    },
  });
}

// Create a new custom style
export function useCreateAdStyle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (style: Omit<AdStyle, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('ad_styles')
        .insert(style)
        .select()
        .single();
      if (error) throw error;
      return data as AdStyle;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ad-styles', variables.client_id] });
      queryClient.invalidateQueries({ queryKey: ['ad-styles', undefined] });
    },
  });
}

// Update an existing style
export function useUpdateAdStyle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<AdStyle> & { id: string }) => {
      const { data, error } = await supabase
        .from('ad_styles')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as AdStyle;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ad-styles'] });
    },
  });
}

// Delete a custom style
export function useDeleteAdStyle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('ad_styles')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ad-styles'] });
    },
  });
}

// Upload reference image for a style
export function useUploadStyleReference() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ styleId, file, clientId }: { styleId: string; file: File; clientId?: string }) => {
      const fileExt = file.name.split('.').pop();
      const filePath = `references/${clientId || 'global'}/${styleId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('assets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('assets')
        .getPublicUrl(filePath);

      // Update the style with the new reference image URL
      const { error: updateError } = await supabase
        .from('ad_styles')
        .update({ example_image_url: publicUrl })
        .eq('id', styleId);

      if (updateError) throw updateError;

      return publicUrl;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ad-styles'] });
    },
  });
}

// Remove reference image from a style
export function useRemoveStyleReference() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (styleId: string) => {
      const { error } = await supabase
        .from('ad_styles')
        .update({ example_image_url: null })
        .eq('id', styleId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ad-styles'] });
    },
  });
}
