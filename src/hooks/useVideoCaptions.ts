import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Caption, CaptionStyleType, CaptionPosition, CaptionWord } from './useVideoEditor';
import { toast } from 'sonner';

export function useVideoCaptions() {
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [captionStyle, setCaptionStyle] = useState<CaptionStyleType>('none');
  const [fontSize, setFontSize] = useState(32);
  const [color, setColor] = useState('#ffffff');
  const [fontFamily, setFontFamily] = useState('Inter');
  const [position, setPosition] = useState<CaptionPosition>('bottom');
  const [stroke, setStroke] = useState(true);
  const [background, setBackground] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const generateCaptions = useCallback(async (blobUrl: string) => {
    setIsGenerating(true);
    try {
      const response = await fetch(blobUrl);
      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const videoBase64 = btoa(binary);

      const { data, error } = await supabase.functions.invoke('transcribe-video', {
        body: { videoBase64, mimeType: blob.type || 'video/mp4' },
      });

      if (error) throw error;
      if (data?.captions) {
        const newCaptions: Caption[] = data.captions.map((c: any) => ({
          id: crypto.randomUUID(),
          text: c.text,
          startTime: c.startTime,
          endTime: c.endTime,
          words: c.words?.map((w: any) => ({
            word: w.word,
            startTime: w.startTime,
            endTime: w.endTime,
          })) as CaptionWord[] | undefined,
        }));
        setCaptions(newCaptions);
        setCaptionStyle('viral-pop');
        toast.success(`Generated ${newCaptions.length} caption segments with word-level timing`);
      }
    } catch (err) {
      console.error('Caption generation failed:', err);
      toast.error('Failed to generate captions');
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const addCaption = useCallback((startTime: number, endTime: number, text: string = '') => {
    setCaptions(prev => [
      ...prev,
      { id: crypto.randomUUID(), text, startTime, endTime },
    ]);
  }, []);

  const updateCaption = useCallback((id: string, updates: Partial<Caption>) => {
    setCaptions(prev =>
      prev.map(c => (c.id === id ? { ...c, ...updates } : c))
    );
  }, []);

  const deleteCaption = useCallback((id: string) => {
    setCaptions(prev => prev.filter(c => c.id !== id));
  }, []);

  const getCaptionAtTime = useCallback((time: number): Caption | null => {
    return captions.find(c => time >= c.startTime && time < c.endTime) || null;
  }, [captions]);

  return {
    captions,
    setCaptions,
    captionStyle,
    setCaptionStyle,
    fontSize,
    setFontSize,
    color,
    setColor,
    fontFamily,
    setFontFamily,
    position,
    setPosition,
    stroke,
    setStroke,
    background,
    setBackground,
    isGenerating,
    generateCaptions,
    addCaption,
    updateCaption,
    deleteCaption,
    getCaptionAtTime,
  };
}
