import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface VideoProject {
  id: string;
  name: string;
  clips_data: any[];
  caption_data: any[];
  aspect_ratio: string;
  caption_settings: Record<string, any>;
  text_overlays: any[];
  voiceover_url: string | null;
  client_id: string | null;
  created_at: string;
  updated_at: string;
}

export function useVideoProjects() {
  const [projects, setProjects] = useState<VideoProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProjects = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('video_projects')
      .select('*')
      .order('updated_at', { ascending: false });
    if (error) {
      console.error('Failed to fetch video projects:', error);
      toast.error('Failed to load projects');
    } else {
      setProjects((data as any[]) || []);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  const createProject = useCallback(async (name = 'Untitled Project', aspectRatio = '16:9') => {
    const { data, error } = await supabase
      .from('video_projects')
      .insert({ name, aspect_ratio: aspectRatio } as any)
      .select()
      .single();
    if (error) {
      toast.error('Failed to create project');
      return null;
    }
    setProjects(prev => [data as any, ...prev]);
    return data as VideoProject;
  }, []);

  const createProjectFromUrls = useCallback(async (name: string, videoUrls: string[], aspectRatio = '16:9') => {
    const clipsData = videoUrls.map((url, i) => ({
      sourceUrl: url,
      blobUrl: '', // Will be fetched on load
      order: i,
      trimStart: 0,
      trimEnd: 0, // Will be set after loading
      duration: 0,
      speed: 1,
      volume: 1,
      transition: 'none' as const,
      transitionDuration: 0.5,
      label: `Clip ${i + 1}`,
      locked: false,
    }));
    const { data, error } = await supabase
      .from('video_projects')
      .insert({ name, aspect_ratio: aspectRatio, clips_data: clipsData } as any)
      .select()
      .single();
    if (error) {
      toast.error('Failed to create project');
      return null;
    }
    setProjects(prev => [data as any, ...prev]);
    return data as VideoProject;
  }, []);

  const deleteProject = useCallback(async (id: string) => {
    const { error } = await supabase.from('video_projects').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete project');
      return;
    }
    setProjects(prev => prev.filter(p => p.id !== id));
    toast.success('Project deleted');
  }, []);

  const duplicateProject = useCallback(async (project: VideoProject) => {
    const { data, error } = await supabase
      .from('video_projects')
      .insert({
        name: `${project.name} (Copy)`,
        clips_data: project.clips_data,
        caption_data: project.caption_data,
        aspect_ratio: project.aspect_ratio,
        caption_settings: project.caption_settings,
        text_overlays: project.text_overlays,
        voiceover_url: project.voiceover_url,
        client_id: project.client_id,
      } as any)
      .select()
      .single();
    if (error) {
      toast.error('Failed to duplicate project');
      return;
    }
    setProjects(prev => [data as any, ...prev]);
    toast.success('Project duplicated');
  }, []);

  const renameProject = useCallback(async (id: string, name: string) => {
    const { error } = await supabase.from('video_projects').update({ name } as any).eq('id', id);
    if (error) {
      toast.error('Failed to rename');
      return;
    }
    setProjects(prev => prev.map(p => p.id === id ? { ...p, name } : p));
  }, []);

  const saveProjectState = useCallback(async (id: string, state: Partial<VideoProject>) => {
    const { error } = await supabase
      .from('video_projects')
      .update(state as any)
      .eq('id', id);
    return !error;
  }, []);

  const loadProject = useCallback(async (id: string): Promise<VideoProject | null> => {
    const { data, error } = await supabase
      .from('video_projects')
      .select('*')
      .eq('id', id)
      .single();
    if (error) {
      toast.error('Failed to load project');
      return null;
    }
    return data as any;
  }, []);

  return {
    projects,
    isLoading,
    createProject,
    createProjectFromUrls,
    deleteProject,
    duplicateProject,
    renameProject,
    saveProjectState,
    loadProject,
    refetch: fetchProjects,
  };
}
