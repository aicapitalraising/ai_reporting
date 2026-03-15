import { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Play, Square } from 'lucide-react';
import { toast } from 'sonner';
import type { Avatar } from '@/types';

interface AvatarSpeakingPreviewProps {
  avatar: Avatar | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AvatarSpeakingPreview({ avatar, open, onOpenChange }: AvatarSpeakingPreviewProps) {
  const [text, setText] = useState("Hi there! I'm excited to show you what we've been working on.");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handlePreview = async () => {
    if (!avatar?.elevenlabs_voice_id || !text.trim()) return;

    setIsGenerating(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/dub-video`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            text: text.slice(0, 500),
            voiceId: avatar.elevenlabs_voice_id,
            ttsOnly: true,
          }),
        }
      );

      if (!response.ok) throw new Error('TTS generation failed');

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      if (audioRef.current) {
        audioRef.current.pause();
        URL.revokeObjectURL(audioRef.current.src);
      }

      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      
      audio.onended = () => setIsPlaying(false);
      audio.onerror = () => {
        setIsPlaying(false);
        toast.error('Failed to play audio');
      };

      await audio.play();
      setIsPlaying(true);
    } catch (error) {
      console.error('TTS error:', error);
      toast.error('Failed to generate voice preview. Make sure the ElevenLabs API key is configured.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  };

  if (!avatar) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => {
      if (!o) handleStop();
      onOpenChange(o);
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Preview {avatar.name} Speaking</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Avatar image with speaking animation */}
          <div className="relative mx-auto w-48 h-48 rounded-full overflow-hidden border-4 border-background shadow-lg">
            <img
              src={avatar.image_url}
              alt={avatar.name}
              className="w-full h-full object-cover"
            />
            {(isPlaying || isGenerating) && (
              <div className="absolute inset-0 border-4 border-primary rounded-full animate-pulse" />
            )}
          </div>

          {/* Text input */}
          <div>
            <Label className="text-sm">What should {avatar.name} say?</Label>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Enter a line for the avatar to speak..."
              rows={3}
              className="mt-1"
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground mt-1">{text.length}/500 characters</p>
          </div>

          {/* Controls */}
          <div className="flex gap-2">
            {isPlaying ? (
              <Button onClick={handleStop} variant="outline" className="flex-1">
                <Square className="h-4 w-4 mr-2" />
                Stop
              </Button>
            ) : (
              <Button
                onClick={handlePreview}
                disabled={isGenerating || !text.trim() || !avatar.elevenlabs_voice_id}
                className="flex-1"
              >
                {isGenerating ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating...</>
                ) : (
                  <><Play className="h-4 w-4 mr-2" />Preview</>
                )}
              </Button>
            )}
          </div>

          {!avatar.elevenlabs_voice_id && (
            <p className="text-xs text-muted-foreground text-center">
              This avatar doesn't have a voice assigned. Assign a voice in the avatar detail dialog first.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
