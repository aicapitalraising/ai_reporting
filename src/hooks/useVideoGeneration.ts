import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useApiRateLimiter } from './useApiRateLimiter';
import type { StoryboardScene } from '@/types/video';

interface GenerationResult {
  status: 'processing' | 'completed' | 'failed';
  operationId?: string;
  videoUrl?: string;
  error?: string;
  progress?: number;
}

export function useVideoGeneration() {
  const [generatingSceneId, setGeneratingSceneId] = useState<string | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const { getAvailableKey, logUsage, hasAnyKey, refreshUsage } = useApiRateLimiter('veo3');

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  const generateScene = useCallback(async (
    scene: StoryboardScene,
    aspectRatio: '16:9' | '9:16',
    onStatusUpdate: (sceneId: string, result: GenerationResult) => void,
    characterImageUrl?: string
  ) => {
    // Try to get a localStorage key; if none, edge function uses server env vars
    const available = getAvailableKey();
    
    let apiKey: string | undefined;
    let keyIndex = 0;
    
    if ('rateLimited' in available) {
      toast.error('Rate limited', { description: available.message });
      onStatusUpdate(scene.id, { status: 'failed', error: available.message });
      return null;
    }
    
    apiKey = available.key || undefined;
    keyIndex = available.keyIndex;

    setGeneratingSceneId(scene.id);
    onStatusUpdate(scene.id, { status: 'processing' });

    try {
      // Build enhanced prompt with eye contact for avatar scenes
      let videoPrompt = scene.prompt;
      if (scene.ingredientType === 'avatar' || scene.avatarId) {
        // Add eye contact instruction for avatar-based scenes
        videoPrompt = `${scene.prompt}. The person in the scene maintains direct eye contact with the camera throughout, engaging naturally with the viewer.`;
      }

      const { data, error } = await supabase.functions.invoke('generate-broll', {
        body: {
          prompt: videoPrompt,
          aspectRatio,
          duration: 8, // Fixed 8 seconds for Veo3
          apiKey,
          keyIndex,
          // Note: characterImageUrl is NOT passed as Veo3 doesn't support referenceImage
          // Character consistency is maintained through the image-to-video workflow
        },
      });

      if (error || data.error) {
        const errorMsg = error?.message || data.error;
        await logUsage({
          service: 'veo3',
          keyIndex,
          requestType: 'scene_generation',
          success: false,
          metadata: { sceneId: scene.id, prompt: scene.prompt, error: errorMsg },
        });
        onStatusUpdate(scene.id, { status: 'failed', error: errorMsg });
        setGeneratingSceneId(null);
        return null;
      }

      await logUsage({
        service: 'veo3',
        keyIndex,
        requestType: 'scene_generation',
        success: true,
        metadata: { sceneId: scene.id, prompt: scene.prompt, operationId: data.operationId },
      });

      refreshUsage();

      if (data.status === 'completed' && data.videoUrl) {
        onStatusUpdate(scene.id, { status: 'completed', videoUrl: data.videoUrl });
        setGeneratingSceneId(null);
        return data.videoUrl;
      }

      if (data.operationId) {
        onStatusUpdate(scene.id, { 
          status: 'processing', 
          operationId: data.operationId 
        });
        
        // Start polling
        startPolling(scene.id, data.operationId, apiKey, onStatusUpdate);
        return data.operationId;
      }

      return null;
      } catch (err) {
        console.error('Scene generation error:', err);
        const errorMsg = err instanceof Error ? err.message : 'Failed to start generation';
        toast.error('Generation failed', { description: errorMsg });
        onStatusUpdate(scene.id, { status: 'failed', error: errorMsg });
        setGeneratingSceneId(null);
        return null;
    }
  }, [getAvailableKey, logUsage, refreshUsage]);

  const startPolling = useCallback((
    sceneId: string,
    operationId: string,
    apiKey: string,
    onStatusUpdate: (sceneId: string, result: GenerationResult) => void
  ) => {
    stopPolling();

    let attempts = 0;
    const maxAttempts = 60; // 5 minutes

    const poll = async () => {
      attempts++;

      if (attempts > maxAttempts) {
        stopPolling();
        setGeneratingSceneId(null);
        onStatusUpdate(sceneId, { status: 'failed', error: 'Generation timed out' });
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke('poll-video-status', {
          body: { operationId, apiKey },
        });

        if (error) {
          console.error('Poll error:', error);
          return;
        }

        console.log(`Poll response for ${sceneId}:`, data);

        if (data.status === 'completed') {
          console.log(`✓ Scene ${sceneId} completed with video URL:`, data.videoUrl?.substring(0, 100));
          stopPolling();
          setGeneratingSceneId(null);
          onStatusUpdate(sceneId, { status: 'completed', videoUrl: data.videoUrl });
          toast.success('Scene generated!');
          return;
        }

        if (data.status === 'failed') {
          console.error(`✗ Scene ${sceneId} failed:`, data.error);
          stopPolling();
          setGeneratingSceneId(null);
          onStatusUpdate(sceneId, { status: 'failed', error: data.error });
          toast.error('Scene generation failed', { description: data.error });
          return;
        }

        // Still processing
        console.log(`⏳ Scene ${sceneId} still processing (attempt ${attempts}/${maxAttempts})`);
        onStatusUpdate(sceneId, {
          status: 'processing',
          operationId,
          progress: data.progress || (attempts / maxAttempts),
        });
      } catch (err) {
        console.error('Poll error:', err);
      }
    };

    pollIntervalRef.current = setInterval(poll, 5000);
    poll(); // Initial poll
  }, [stopPolling]);

  return {
    generateScene,
    generatingSceneId,
    stopPolling,
    hasApiKey: hasAnyKey,
  };
}
