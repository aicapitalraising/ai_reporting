import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Asset, AssetType, AssetStatus } from '@/types';

// Fetch all assets (optionally filtered)
export function useAssets(options?: {
  projectId?: string;
  clientId?: string;
  type?: AssetType;
  status?: AssetStatus;
}) {
  return useQuery({
    queryKey: ['assets', options],
    queryFn: async () => {
      let query = supabase
        .from('assets')
        .select('*')
        .order('created_at', { ascending: false });

      if (options?.projectId) {
        query = query.eq('project_id', options.projectId);
      }
      if (options?.clientId) {
        query = query.eq('client_id', options.clientId);
      }
      if (options?.type) {
        query = query.eq('type', options.type);
      }
      if (options?.status) {
        query = query.eq('status', options.status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Asset[];
    },
    staleTime: 300000, // 5 min — generated assets don't change
  });
}

// Fetch B-roll assets specifically
export function useBrollAssets(clientId?: string) {
  return useAssets({ type: 'broll', clientId });
}

// Fetch image assets
export function useImageAssets(clientId?: string) {
  return useAssets({ type: 'image', clientId });
}

// Fetch video assets
export function useVideoAssets(clientId?: string) {
  return useAssets({ type: 'video', clientId });
}

// Create a new asset
export function useCreateAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (asset: {
      project_id?: string; // Optional for standalone assets
      client_id?: string;
      type: AssetType;
      name?: string;
      storage_path?: string;
      public_url?: string;
      metadata?: Record<string, unknown>;
      status?: AssetStatus;
    }) => {
      const insertData = {
        project_id: asset.project_id || null,
        client_id: asset.client_id || null,
        type: asset.type,
        name: asset.name,
        storage_path: asset.storage_path,
        public_url: asset.public_url,
        metadata: asset.metadata ? JSON.parse(JSON.stringify(asset.metadata)) : {},
        status: asset.status || 'pending',
      };

      const { data, error } = await supabase
        .from('assets')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return data as Asset;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
    },
  });
}

// Update an asset
export function useUpdateAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Partial<Asset> & { id: string }) => {
      // Clean up metadata for JSON compatibility
      const cleanUpdates = {
        ...updates,
        metadata: updates.metadata ? JSON.parse(JSON.stringify(updates.metadata)) : undefined,
      };

      const { data, error } = await supabase
        .from('assets')
        .update(cleanUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Asset;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
    },
  });
}

// Delete an asset (also removes from storage)
export function useDeleteAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (asset: { id: string; storage_path?: string }) => {
      // First delete from storage if there's a path
      if (asset.storage_path) {
        const { error: storageError } = await supabase.storage
          .from('assets')
          .remove([asset.storage_path]);

        if (storageError) {
          console.error('Failed to delete from storage:', storageError);
          // Continue with database deletion even if storage fails
        }
      }

      // Then delete from database
      const { error } = await supabase.from('assets').delete().eq('id', asset.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
    },
  });
}

// Upload a file to Supabase storage and create an asset record
export function useUploadAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      file,
      projectId,
      clientId,
      type,
      name,
      metadata,
    }: {
      file: File | Blob;
      projectId?: string; // Optional for standalone assets
      clientId?: string;
      type: AssetType;
      name?: string;
      metadata?: Record<string, unknown>;
    }) => {
      // Generate storage path
      const timestamp = Date.now();
      const extension = file instanceof File ? file.name.split('.').pop() : 'mp4';
      const storagePath = `${type}/${clientId || 'stock'}/${timestamp}.${extension}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('assets')
        .upload(storagePath, file, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('assets')
        .getPublicUrl(storagePath);

      // Create asset record
      const insertData = {
        project_id: projectId || null,
        client_id: clientId || null,
        type,
        name: name || `${type}-${timestamp}`,
        storage_path: storagePath,
        public_url: urlData.publicUrl,
        metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : {},
        status: 'completed' as const,
      };

      const { data, error } = await supabase
        .from('assets')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return data as Asset;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
    },
  });
}

// Save an asset from URL (downloads and re-uploads to Supabase)
export function useSaveAssetFromUrl() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      url,
      projectId,
      clientId,
      type,
      name,
      metadata,
    }: {
      url: string;
      projectId?: string; // Optional for standalone assets
      clientId?: string;
      type: AssetType;
      name?: string;
      metadata?: Record<string, unknown>;
    }) => {
      // Download the file
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to download file');
      
      const blob = await response.blob();
      const contentType = response.headers.get('content-type') || 'video/mp4';
      
      // Determine extension from content type
      let extension = 'mp4';
      if (contentType.includes('image')) {
        extension = contentType.includes('png') ? 'png' : 'jpg';
      } else if (contentType.includes('webm')) {
        extension = 'webm';
      }

      // Generate storage path
      const timestamp = Date.now();
      const storagePath = `${type}/${clientId || 'stock'}/${timestamp}.${extension}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('assets')
        .upload(storagePath, blob, {
          contentType,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('assets')
        .getPublicUrl(storagePath);

      // Create asset record
      const insertData = {
        project_id: projectId || null,
        client_id: clientId || null,
        type,
        name: name || `${type}-${timestamp}`,
        storage_path: storagePath,
        public_url: urlData.publicUrl,
        metadata: JSON.parse(JSON.stringify({
          ...metadata,
          originalUrl: url,
        })),
        status: 'completed' as const,
      };

      const { data, error } = await supabase
        .from('assets')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return data as Asset;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
    },
  });
}
