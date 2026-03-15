import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Scissors, Trash2 } from 'lucide-react';
import type { VideoClip } from '@/hooks/useVideoEditor';

interface ClipTrimmerProps {
  clip: VideoClip | null;
  onSetTrimPoints: (clipId: string, trimStart: number, trimEnd: number) => void;
  onSplitAtPlayhead: () => void;
  onRemoveClip: (clipId: string) => void;
}

export function ClipTrimmer({ clip, onSetTrimPoints, onSplitAtPlayhead, onRemoveClip }: ClipTrimmerProps) {
  if (!clip) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        Select a clip on the timeline to trim it.
      </div>
    );
  }

  const formatTime = (t: number) => `${t.toFixed(1)}s`;

  return (
    <div className="p-4 space-y-4">
      <div>
        <h4 className="text-sm font-medium mb-1">Clip {clip.order + 1}</h4>
        <p className="text-xs text-muted-foreground">
          Duration: {formatTime(clip.trimEnd - clip.trimStart)} / {formatTime(clip.duration)}
        </p>
      </div>

      {/* In point */}
      <div className="space-y-2">
        <label className="text-xs text-muted-foreground">In Point: {formatTime(clip.trimStart)}</label>
        <Slider
          value={[clip.trimStart]}
          onValueChange={([v]) => onSetTrimPoints(clip.id, v, clip.trimEnd)}
          min={0}
          max={clip.trimEnd - 0.1}
          step={0.1}
        />
      </div>

      {/* Out point */}
      <div className="space-y-2">
        <label className="text-xs text-muted-foreground">Out Point: {formatTime(clip.trimEnd)}</label>
        <Slider
          value={[clip.trimEnd]}
          onValueChange={([v]) => onSetTrimPoints(clip.id, clip.trimStart, v)}
          min={clip.trimStart + 0.1}
          max={clip.duration}
          step={0.1}
        />
      </div>

      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={onSplitAtPlayhead}>
          <Scissors className="h-3 w-3" />
          Split at Playhead
        </Button>
        <Button variant="destructive" size="sm" className="gap-1" onClick={() => onRemoveClip(clip.id)}>
          <Trash2 className="h-3 w-3" />
          Delete
        </Button>
      </div>
    </div>
  );
}
