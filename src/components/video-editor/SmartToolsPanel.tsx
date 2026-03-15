import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, VolumeX, Sparkles, MessageSquareOff, Film } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { VideoClip, Caption } from '@/hooks/useVideoEditor';

interface SmartToolsPanelProps {
  clips: VideoClip[];
  captions: Caption[];
  onRemoveSilence: (segments: { startTime: number; endTime: number }[]) => void;
  onSeek: (time: number) => void;
}

interface SilenceResult {
  silentSegments: { startTime: number; endTime: number }[];
  totalSilenceDuration: number;
}

interface HighlightResult {
  highlights: { startTime: number; endTime: number; reason: string; score: number }[];
}

interface FillerResult {
  fillerWords: { word: string; startTime: number; endTime: number }[];
  totalFillers: number;
  fillerPercentage: number;
}

interface BrollResult {
  suggestions: { keyword: string; startTime: number; endTime: number; reason: string }[];
}

type AnalysisState = 'idle' | 'loading' | 'done';

export function SmartToolsPanel({ clips, captions, onRemoveSilence, onSeek }: SmartToolsPanelProps) {
  const [silenceState, setSilenceState] = useState<AnalysisState>('idle');
  const [silenceResult, setSilenceResult] = useState<SilenceResult | null>(null);

  const [highlightState, setHighlightState] = useState<AnalysisState>('idle');
  const [highlightResult, setHighlightResult] = useState<HighlightResult | null>(null);

  const [fillerState, setFillerState] = useState<AnalysisState>('idle');
  const [fillerResult, setFillerResult] = useState<FillerResult | null>(null);

  const [brollState, setBrollState] = useState<AnalysisState>('idle');
  const [brollResult, setBrollResult] = useState<BrollResult | null>(null);

  const getVideoBase64 = async (): Promise<{ videoBase64: string; mimeType: string } | null> => {
    if (clips.length === 0) {
      toast.error('No video clips loaded');
      return null;
    }
    try {
      const resp = await fetch(clips[0].blobUrl);
      const blob = await resp.blob();
      const ab = await blob.arrayBuffer();
      const bytes = new Uint8Array(ab);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      return { videoBase64: btoa(binary), mimeType: blob.type || 'video/mp4' };
    } catch {
      toast.error('Failed to read video');
      return null;
    }
  };

  const analyzeSilence = async () => {
    setSilenceState('loading');
    const video = await getVideoBase64();
    if (!video) { setSilenceState('idle'); return; }
    
    const { data, error } = await supabase.functions.invoke('analyze-video-content', {
      body: { ...video, analysisType: 'silence' },
    });
    if (error) { toast.error('Silence analysis failed'); setSilenceState('idle'); return; }
    setSilenceResult(data);
    setSilenceState('done');
    toast.success(`Found ${data.silentSegments?.length || 0} silent segments (${data.totalSilenceDuration?.toFixed(1)}s)`);
  };

  const analyzeHighlights = async () => {
    setHighlightState('loading');
    const video = await getVideoBase64();
    if (!video) { setHighlightState('idle'); return; }
    
    const { data, error } = await supabase.functions.invoke('analyze-video-content', {
      body: { ...video, analysisType: 'highlights' },
    });
    if (error) { toast.error('Highlight detection failed'); setHighlightState('idle'); return; }
    setHighlightResult(data);
    setHighlightState('done');
    toast.success(`Found ${data.highlights?.length || 0} highlights`);
  };

  const analyzeFillers = async () => {
    setFillerState('loading');
    const transcript = captions.map(c => c.text).join(' ');
    const video = await getVideoBase64();
    if (!video) { setFillerState('idle'); return; }
    
    const { data, error } = await supabase.functions.invoke('analyze-video-content', {
      body: { ...video, analysisType: 'fillerWords', transcript },
    });
    if (error) { toast.error('Filler detection failed'); setFillerState('idle'); return; }
    setFillerResult(data);
    setFillerState('done');
    toast.success(`Found ${data.totalFillers || 0} filler words`);
  };

  const analyzeBroll = async () => {
    setBrollState('loading');
    const transcript = captions.map(c => c.text).join(' ');
    const video = await getVideoBase64();
    if (!video) { setBrollState('idle'); return; }
    
    const { data, error } = await supabase.functions.invoke('analyze-video-content', {
      body: { ...video, analysisType: 'brollSuggestions', transcript },
    });
    if (error) { toast.error('B-roll analysis failed'); setBrollState('idle'); return; }
    setBrollResult(data);
    setBrollState('done');
    toast.success(`${data.suggestions?.length || 0} B-roll suggestions`);
  };

  return (
    <div className="p-4 space-y-4">
      <p className="text-xs text-muted-foreground">AI-powered video analysis tools</p>

      {/* Silence Remover */}
      <div className="space-y-2 p-3 rounded-lg border border-border">
        <div className="flex items-center gap-2">
          <VolumeX className="h-4 w-4 text-orange-400" />
          <span className="text-sm font-medium">Silence Remover</span>
        </div>
        <p className="text-[10px] text-muted-foreground">Detect and remove silent gaps &gt; 0.5s</p>
        {silenceState === 'idle' && (
          <Button size="sm" variant="secondary" className="w-full text-xs" onClick={analyzeSilence}>
            Detect Silence
          </Button>
        )}
        {silenceState === 'loading' && (
          <Button size="sm" variant="secondary" className="w-full text-xs" disabled>
            <Loader2 className="h-3 w-3 animate-spin mr-1" /> Analyzing...
          </Button>
        )}
        {silenceState === 'done' && silenceResult && (
          <div className="space-y-1.5">
            <p className="text-[10px]">{silenceResult.silentSegments.length} gaps ({silenceResult.totalSilenceDuration?.toFixed(1)}s)</p>
            {silenceResult.silentSegments.length > 0 && (
              <Button
                size="sm"
                variant="destructive"
                className="w-full text-xs"
                onClick={() => {
                  onRemoveSilence(silenceResult.silentSegments);
                  toast.success('Silent segments removed');
                  setSilenceState('idle');
                  setSilenceResult(null);
                }}
              >
                Remove All Silence
              </Button>
            )}
          </div>
        )}
      </div>

      {/* AI Highlights */}
      <div className="space-y-2 p-3 rounded-lg border border-border">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-yellow-400" />
          <span className="text-sm font-medium">AI Highlights</span>
        </div>
        <p className="text-[10px] text-muted-foreground">Find the most engaging moments for short-form clips</p>
        {highlightState === 'idle' && (
          <Button size="sm" variant="secondary" className="w-full text-xs" onClick={analyzeHighlights}>
            Find Highlights
          </Button>
        )}
        {highlightState === 'loading' && (
          <Button size="sm" variant="secondary" className="w-full text-xs" disabled>
            <Loader2 className="h-3 w-3 animate-spin mr-1" /> Analyzing...
          </Button>
        )}
        {highlightState === 'done' && highlightResult && (
          <div className="space-y-1">
            {highlightResult.highlights?.map((h, i) => (
              <button
                key={i}
                onClick={() => onSeek(h.startTime)}
                className="w-full text-left p-1.5 rounded bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className="flex justify-between text-[10px]">
                  <span className="font-medium">{h.startTime.toFixed(1)}s – {h.endTime.toFixed(1)}s</span>
                  <span className="text-yellow-400">⭐ {h.score}/10</span>
                </div>
                <p className="text-[9px] text-muted-foreground">{h.reason}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Filler Word Removal */}
      <div className="space-y-2 p-3 rounded-lg border border-border">
        <div className="flex items-center gap-2">
          <MessageSquareOff className="h-4 w-4 text-red-400" />
          <span className="text-sm font-medium">Filler Words</span>
        </div>
        <p className="text-[10px] text-muted-foreground">Detect "um", "uh", "like", "you know"</p>
        {fillerState === 'idle' && (
          <Button size="sm" variant="secondary" className="w-full text-xs" onClick={analyzeFillers}>
            Detect Fillers
          </Button>
        )}
        {fillerState === 'loading' && (
          <Button size="sm" variant="secondary" className="w-full text-xs" disabled>
            <Loader2 className="h-3 w-3 animate-spin mr-1" /> Analyzing...
          </Button>
        )}
        {fillerState === 'done' && fillerResult && (
          <div className="space-y-1.5">
            <p className="text-[10px]">{fillerResult.totalFillers} fillers ({fillerResult.fillerPercentage?.toFixed(1)}% of speech)</p>
            <div className="max-h-24 overflow-y-auto space-y-0.5">
              {fillerResult.fillerWords?.slice(0, 10).map((f, i) => (
                <button
                  key={i}
                  onClick={() => onSeek(f.startTime)}
                  className="w-full text-left text-[10px] p-1 rounded hover:bg-muted/50 transition-colors"
                >
                  <span className="text-red-400">"{f.word}"</span> at {f.startTime.toFixed(1)}s
                </button>
              ))}
            </div>
            {fillerResult.fillerWords?.length > 0 && (
              <Button
                size="sm"
                variant="destructive"
                className="w-full text-xs"
                onClick={() => {
                  const segments = fillerResult.fillerWords.map(f => ({ startTime: f.startTime, endTime: f.endTime }));
                  onRemoveSilence(segments);
                  toast.success('Filler segments removed');
                  setFillerState('idle');
                  setFillerResult(null);
                }}
              >
                Remove All Fillers
              </Button>
            )}
          </div>
        )}
      </div>

      {/* B-Roll Suggestions */}
      <div className="space-y-2 p-3 rounded-lg border border-border">
        <div className="flex items-center gap-2">
          <Film className="h-4 w-4 text-blue-400" />
          <span className="text-sm font-medium">B-Roll Ideas</span>
        </div>
        <p className="text-[10px] text-muted-foreground">AI-suggested overlay footage based on content</p>
        {brollState === 'idle' && (
          <Button size="sm" variant="secondary" className="w-full text-xs" onClick={analyzeBroll}>
            Get Suggestions
          </Button>
        )}
        {brollState === 'loading' && (
          <Button size="sm" variant="secondary" className="w-full text-xs" disabled>
            <Loader2 className="h-3 w-3 animate-spin mr-1" /> Analyzing...
          </Button>
        )}
        {brollState === 'done' && brollResult && (
          <div className="space-y-1">
            {brollResult.suggestions?.map((s, i) => (
              <button
                key={i}
                onClick={() => onSeek(s.startTime)}
                className="w-full text-left p-1.5 rounded bg-muted/50 hover:bg-muted transition-colors"
              >
                <p className="text-[10px] font-medium text-blue-400">🔍 "{s.keyword}"</p>
                <p className="text-[9px] text-muted-foreground">{s.startTime.toFixed(1)}s – {s.endTime.toFixed(1)}s: {s.reason}</p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
