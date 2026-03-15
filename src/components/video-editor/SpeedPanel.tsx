import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Gauge, RotateCcw } from 'lucide-react';
import type { VideoClip } from '@/hooks/useVideoEditor';
import { cn } from '@/lib/utils';

interface SpeedPanelProps {
  clip: VideoClip | null;
  onSetSpeed: (clipId: string, speed: number) => void;
  onSetVolume: (clipId: string, volume: number) => void;
}

const SPEED_PRESETS = [
  { label: '0.25x', value: 0.25, desc: 'Ultra Slow' },
  { label: '0.5x', value: 0.5, desc: 'Slow Motion' },
  { label: '0.75x', value: 0.75, desc: 'Slightly Slow' },
  { label: '1x', value: 1, desc: 'Normal' },
  { label: '1.25x', value: 1.25, desc: 'Slightly Fast' },
  { label: '1.5x', value: 1.5, desc: 'Fast' },
  { label: '2x', value: 2, desc: 'Double' },
  { label: '3x', value: 3, desc: 'Triple' },
  { label: '4x', value: 4, desc: 'Max' },
];

export function SpeedPanel({ clip, onSetSpeed, onSetVolume }: SpeedPanelProps) {
  if (!clip) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        Select a clip to adjust speed.
      </div>
    );
  }

  const originalDuration = clip.trimEnd - clip.trimStart;
  const effectiveDuration = originalDuration / clip.speed;

  return (
    <div className="p-4 space-y-5">
      <div className="flex items-center gap-2">
        <Gauge className="h-4 w-4 text-amber-400" />
        <h4 className="text-sm font-semibold">Speed & Volume</h4>
      </div>

      {/* Clip info */}
      <div className="text-[10px] text-muted-foreground space-y-0.5">
        <p>Clip {clip.order + 1} — {clip.label || 'Untitled'}</p>
        <p>Original: {originalDuration.toFixed(1)}s → Effective: {effectiveDuration.toFixed(1)}s</p>
      </div>

      {/* Speed slider */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs text-muted-foreground">Speed</label>
          <div className="flex items-center gap-2">
            <span className="text-sm font-mono font-semibold text-amber-400">{clip.speed.toFixed(2)}x</span>
            {clip.speed !== 1 && (
              <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => onSetSpeed(clip.id, 1)}>
                <RotateCcw className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
        <Slider
          value={[clip.speed]}
          onValueChange={([v]) => onSetSpeed(clip.id, v)}
          min={0.25}
          max={4}
          step={0.05}
          className="[&_[role=slider]]:bg-amber-400"
        />
      </div>

      {/* Preset buttons */}
      <div className="grid grid-cols-3 gap-1.5">
        {SPEED_PRESETS.map(preset => (
          <button
            key={preset.value}
            onClick={() => onSetSpeed(clip.id, preset.value)}
            className={cn(
              'p-2 rounded-lg border text-center transition-all',
              Math.abs(clip.speed - preset.value) < 0.01
                ? 'border-amber-400 bg-amber-400/10 ring-1 ring-amber-400/30'
                : 'border-border hover:border-amber-400/40 hover:bg-muted/50'
            )}
          >
            <span className="text-xs font-bold block">{preset.label}</span>
            <span className="text-[8px] text-muted-foreground">{preset.desc}</span>
          </button>
        ))}
      </div>

      {/* Volume control */}
      <div className="space-y-2 pt-2 border-t border-border/50">
        <div className="flex items-center justify-between">
          <label className="text-xs text-muted-foreground">Clip Volume</label>
          <span className="text-xs font-mono">{Math.round(clip.volume * 100)}%</span>
        </div>
        <Slider
          value={[clip.volume]}
          onValueChange={([v]) => onSetVolume(clip.id, v)}
          min={0}
          max={2}
          step={0.05}
        />
        <p className="text-[9px] text-muted-foreground">Values above 100% amplify the audio</p>
      </div>

      {/* Duration preview */}
      <div className="bg-muted/30 rounded-lg p-3 space-y-1">
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Duration Impact</p>
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-400/60 rounded-full transition-all"
                style={{ width: `${Math.min((1 / clip.speed) * 100, 100)}%` }}
              />
            </div>
          </div>
          <span className="text-xs font-mono text-muted-foreground">{effectiveDuration.toFixed(1)}s</span>
        </div>
      </div>
    </div>
  );
}
