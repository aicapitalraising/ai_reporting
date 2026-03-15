import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import type { VideoClip, TransitionType } from '@/hooks/useVideoEditor';
import { cn } from '@/lib/utils';

interface TransitionsPanelProps {
  clip: VideoClip | null;
  clips: VideoClip[];
  onSetTransition: (clipId: string, transition: TransitionType, duration?: number) => void;
}

const TRANSITIONS: { value: TransitionType; label: string; icon: string; desc: string }[] = [
  { value: 'none', label: 'None', icon: '⊘', desc: 'Hard cut' },
  { value: 'crossfade', label: 'Crossfade', icon: '✦', desc: 'Blend between clips' },
  { value: 'dissolve', label: 'Dissolve', icon: '◐', desc: 'Soft dissolve' },
  { value: 'wipe-left', label: 'Wipe Left', icon: '◁', desc: 'Wipe from right to left' },
  { value: 'wipe-right', label: 'Wipe Right', icon: '▷', desc: 'Wipe from left to right' },
  { value: 'wipe-up', label: 'Wipe Up', icon: '△', desc: 'Wipe from bottom to top' },
  { value: 'zoom-in', label: 'Zoom In', icon: '⊕', desc: 'Zoom into next clip' },
  { value: 'zoom-out', label: 'Zoom Out', icon: '⊖', desc: 'Zoom out to next clip' },
  { value: 'slide-left', label: 'Slide Left', icon: '⇐', desc: 'Push slide left' },
  { value: 'slide-right', label: 'Slide Right', icon: '⇒', desc: 'Push slide right' },
];

const TRANSITION_COLORS: Record<TransitionType, string> = {
  none: 'text-muted-foreground',
  crossfade: 'text-purple-400',
  dissolve: 'text-indigo-400',
  'wipe-left': 'text-cyan-400',
  'wipe-right': 'text-cyan-400',
  'wipe-up': 'text-cyan-400',
  'zoom-in': 'text-amber-400',
  'zoom-out': 'text-amber-400',
  'slide-left': 'text-emerald-400',
  'slide-right': 'text-emerald-400',
};

export function TransitionsPanel({ clip, clips, onSetTransition }: TransitionsPanelProps) {
  if (!clip) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        Select a clip to add a transition.
      </div>
    );
  }

  const clipIndex = clips.findIndex(c => c.id === clip.id);
  const isFirstClip = clipIndex === 0;

  if (isFirstClip) {
    return (
      <div className="p-4 text-center space-y-2">
        <p className="text-sm text-muted-foreground">Transitions apply between clips.</p>
        <p className="text-xs text-muted-foreground">Select a clip that is not the first clip to add an incoming transition.</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div>
        <h4 className="text-sm font-semibold">Incoming Transition</h4>
        <p className="text-[10px] text-muted-foreground">
          Clip {clip.order + 1} — transition from Clip {clipIndex}
        </p>
      </div>

      {/* Transition grid */}
      <div className="grid grid-cols-2 gap-1.5">
        {TRANSITIONS.map(t => (
          <button
            key={t.value}
            onClick={() => onSetTransition(clip.id, t.value)}
            className={cn(
              'p-2.5 rounded-lg border text-left transition-all',
              clip.transition === t.value
                ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
                : 'border-border hover:border-primary/40 hover:bg-muted/50'
            )}
          >
            <div className="flex items-center gap-2">
              <span className={cn('text-base', TRANSITION_COLORS[t.value])}>{t.icon}</span>
              <div>
                <span className="text-xs font-medium block">{t.label}</span>
                <span className="text-[8px] text-muted-foreground">{t.desc}</span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Duration control */}
      {clip.transition !== 'none' && (
        <div className="space-y-2 pt-2 border-t border-border/50">
          <div className="flex items-center justify-between">
            <label className="text-xs text-muted-foreground">Duration</label>
            <span className="text-xs font-mono">{clip.transitionDuration.toFixed(1)}s</span>
          </div>
          <Slider
            value={[clip.transitionDuration]}
            onValueChange={([v]) => onSetTransition(clip.id, clip.transition, v)}
            min={0.1}
            max={2}
            step={0.1}
          />
        </div>
      )}

      {/* Apply to all */}
      {clip.transition !== 'none' && clips.length > 2 && (
        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs"
          onClick={() => {
            clips.forEach((c, i) => {
              if (i > 0) onSetTransition(c.id, clip.transition, clip.transitionDuration);
            });
          }}
        >
          Apply to All Cuts
        </Button>
      )}
    </div>
  );
}
