import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mic, Loader2, Play, Plus } from 'lucide-react';
import { useVoices } from '@/hooks/useVoices';
import { toast } from 'sonner';

interface VoiceoverPanelProps {
  voiceoverBlobUrl: string | null;
  voiceoverVolume: number;
  onSetVoiceoverBlobUrl: (url: string | null) => void;
  onSetVoiceoverVolume: (vol: number) => void;
}

export function VoiceoverPanel({
  voiceoverBlobUrl,
  voiceoverVolume,
  onSetVoiceoverBlobUrl,
  onSetVoiceoverVolume,
}: VoiceoverPanelProps) {
  const { data: voices = [] } = useVoices();
  const [selectedVoiceId, setSelectedVoiceId] = useState('');
  const [script, setScript] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewAudio, setPreviewAudio] = useState<HTMLAudioElement | null>(null);

  const handleGenerate = async () => {
    if (!selectedVoiceId || !script.trim()) {
      toast.error('Please select a voice and enter a script');
      return;
    }

    setIsGenerating(true);
    try {
      const voice = voices.find(v => v.id === selectedVoiceId);
      if (!voice) throw new Error('Voice not found');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/clone-voice`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            text: script,
            voiceId: voice.elevenlabs_voice_id,
            action: 'tts',
          }),
        }
      );

      if (!response.ok) {
        // Try a dedicated TTS endpoint
        const ttsResponse = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/dub-video`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({
              text: script,
              voiceId: voice.elevenlabs_voice_id,
              action: 'tts-only',
            }),
          }
        );

        if (!ttsResponse.ok) throw new Error('TTS generation failed');
        const blob = await ttsResponse.blob();
        const blobUrl = URL.createObjectURL(blob);
        onSetVoiceoverBlobUrl(blobUrl);
        toast.success('Voiceover generated');
        return;
      }

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      onSetVoiceoverBlobUrl(blobUrl);
      toast.success('Voiceover generated');
    } catch (err) {
      console.error('TTS error:', err);
      toast.error('Failed to generate voiceover');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePreview = () => {
    if (!voiceoverBlobUrl) return;
    if (previewAudio) {
      previewAudio.pause();
    }
    const audio = new Audio(voiceoverBlobUrl);
    audio.volume = voiceoverVolume;
    audio.play();
    setPreviewAudio(audio);
  };

  return (
    <div className="p-4 space-y-4">
      {/* Voice selector */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">Voice</label>
        <Select value={selectedVoiceId} onValueChange={setSelectedVoiceId}>
          <SelectTrigger className="text-xs">
            <SelectValue placeholder="Select a voice..." />
          </SelectTrigger>
          <SelectContent>
            {voices.map(v => (
              <SelectItem key={v.id} value={v.id} className="text-xs">
                {v.name} {v.is_stock ? '(Stock)' : '(Cloned)'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Script */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">Script</label>
        <Textarea
          value={script}
          onChange={e => setScript(e.target.value)}
          placeholder="Enter voiceover script..."
          className="min-h-[80px] text-xs resize-none"
        />
      </div>

      {/* Generate */}
      <Button
        variant="secondary"
        size="sm"
        className="w-full gap-2"
        onClick={handleGenerate}
        disabled={isGenerating || !selectedVoiceId || !script.trim()}
      >
        {isGenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Mic className="h-3 w-3" />}
        {isGenerating ? 'Generating...' : 'Generate Voiceover'}
      </Button>

      {/* Preview & Volume */}
      {voiceoverBlobUrl && (
        <div className="space-y-3 border-t border-border pt-3">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={handlePreview}>
              <Play className="h-3 w-3" /> Preview
            </Button>
            <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={() => onSetVoiceoverBlobUrl(null)}>
              Remove
            </Button>
          </div>
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Volume: {Math.round(voiceoverVolume * 100)}%</label>
            <Slider value={[voiceoverVolume]} onValueChange={([v]) => onSetVoiceoverVolume(v)} min={0} max={1} step={0.05} />
          </div>
        </div>
      )}
    </div>
  );
}
