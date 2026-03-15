import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Type, Trash2, Eye } from 'lucide-react';
import type { TextOverlay } from '@/hooks/useVideoEditor';
import { cn } from '@/lib/utils';

interface TextOverlayPanelProps {
  overlays: TextOverlay[];
  totalDuration: number;
  currentTime: number;
  onAdd: (overlay: Omit<TextOverlay, 'id'>) => void;
  onUpdate: (id: string, updates: Partial<TextOverlay>) => void;
  onRemove: (id: string) => void;
  onSeek: (time: number) => void;
}

const ANIMATION_OPTIONS: { value: TextOverlay['animation']; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'fade', label: 'Fade In' },
  { value: 'slide', label: 'Slide Up' },
  { value: 'bounce', label: 'Bounce' },
  { value: 'typewriter', label: 'Typewriter' },
  { value: 'scale', label: 'Scale Pop' },
];

const PRESETS = [
  { label: 'Title', fontSize: 48, fontWeight: '900', fontFamily: 'Inter', color: '#ffffff', animation: 'fade' as const },
  { label: 'Subtitle', fontSize: 28, fontWeight: '500', fontFamily: 'Inter', color: '#cccccc', animation: 'slide' as const },
  { label: 'Lower Third', fontSize: 22, fontWeight: '600', fontFamily: 'Inter', color: '#ffffff', animation: 'slide' as const },
  { label: 'Call to Action', fontSize: 36, fontWeight: '800', fontFamily: 'Montserrat', color: '#FFD700', animation: 'bounce' as const },
];

export function TextOverlayPanel({ overlays, totalDuration, currentTime, onAdd, onUpdate, onRemove, onSeek }: TextOverlayPanelProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleAddPreset = (preset: typeof PRESETS[0]) => {
    onAdd({
      text: preset.label,
      x: 50,
      y: 50,
      fontSize: preset.fontSize,
      fontFamily: preset.fontFamily,
      fontWeight: preset.fontWeight,
      color: preset.color,
      startTime: currentTime,
      endTime: Math.min(currentTime + 3, totalDuration || 3),
      animation: preset.animation,
      opacity: 1,
    });
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Type className="h-4 w-4 text-pink-400" />
        <h4 className="text-sm font-semibold">Text Overlays</h4>
      </div>

      {/* Quick add presets */}
      <div className="grid grid-cols-2 gap-1.5">
        {PRESETS.map(preset => (
          <button
            key={preset.label}
            onClick={() => handleAddPreset(preset)}
            className="p-2 rounded-lg border border-border hover:border-pink-400/40 hover:bg-muted/50 text-left transition-all"
          >
            <span className="text-xs font-medium block">{preset.label}</span>
            <span className="text-[8px] text-muted-foreground">{preset.fontSize}px · {preset.animation}</span>
          </button>
        ))}
      </div>

      <Button
        variant="outline"
        size="sm"
        className="w-full gap-1 text-xs"
        onClick={() => onAdd({
          text: 'New Text',
          x: 50,
          y: 50,
          fontSize: 32,
          fontFamily: 'Inter',
          fontWeight: '700',
          color: '#ffffff',
          startTime: currentTime,
          endTime: Math.min(currentTime + 3, totalDuration || 3),
          animation: 'none',
          opacity: 1,
        })}
      >
        <Plus className="h-3 w-3" /> Add Custom Text
      </Button>

      {/* Overlay list */}
      {overlays.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-border/50">
          <label className="text-xs font-medium text-muted-foreground">Layers ({overlays.length})</label>
          {overlays.map(overlay => {
            const isExpanded = expandedId === overlay.id;
            const isVisible = currentTime >= overlay.startTime && currentTime < overlay.endTime;
            return (
              <div key={overlay.id} className={cn('rounded-lg border transition-all', isExpanded ? 'border-pink-400/40 bg-muted/20' : 'border-border')}>
                {/* Header */}
                <div
                  className="flex items-center gap-2 p-2 cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : overlay.id)}
                >
                  <Eye className={cn('h-3 w-3', isVisible ? 'text-pink-400' : 'text-muted-foreground/40')} />
                  <span className="text-xs font-medium truncate flex-1">{overlay.text}</span>
                  <span className="text-[9px] text-muted-foreground font-mono">
                    {overlay.startTime.toFixed(1)}s
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 shrink-0"
                    onClick={(e) => { e.stopPropagation(); onRemove(overlay.id); }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>

                {/* Expanded editor */}
                {isExpanded && (
                  <div className="px-2 pb-2 space-y-2 border-t border-border/30 pt-2">
                    <Input
                      value={overlay.text}
                      onChange={e => onUpdate(overlay.id, { text: e.target.value })}
                      className="h-7 text-xs"
                      placeholder="Text content"
                    />

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[9px] text-muted-foreground">Start</label>
                        <Input
                          type="number"
                          value={overlay.startTime}
                          onChange={e => onUpdate(overlay.id, { startTime: parseFloat(e.target.value) || 0 })}
                          className="h-6 text-[10px]"
                          step={0.1}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] text-muted-foreground">End</label>
                        <Input
                          type="number"
                          value={overlay.endTime}
                          onChange={e => onUpdate(overlay.id, { endTime: parseFloat(e.target.value) || 0 })}
                          className="h-6 text-[10px]"
                          step={0.1}
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] text-muted-foreground">Font Size: {overlay.fontSize}px</label>
                      <Slider
                        value={[overlay.fontSize]}
                        onValueChange={([v]) => onUpdate(overlay.id, { fontSize: v })}
                        min={12}
                        max={96}
                        step={2}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] text-muted-foreground">Animation</label>
                      <Select value={overlay.animation} onValueChange={(v) => onUpdate(overlay.id, { animation: v as TextOverlay['animation'] })}>
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ANIMATION_OPTIONS.map(a => (
                            <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex gap-2">
                      <div className="space-y-1 flex-1">
                        <label className="text-[9px] text-muted-foreground">Color</label>
                        <input
                          type="color"
                          value={overlay.color}
                          onChange={e => onUpdate(overlay.id, { color: e.target.value })}
                          className="w-full h-6 rounded cursor-pointer"
                        />
                      </div>
                      <div className="space-y-1 flex-1">
                        <label className="text-[9px] text-muted-foreground">Opacity: {Math.round(overlay.opacity * 100)}%</label>
                        <Slider
                          value={[overlay.opacity]}
                          onValueChange={([v]) => onUpdate(overlay.id, { opacity: v })}
                          min={0}
                          max={1}
                          step={0.05}
                        />
                      </div>
                    </div>

                    <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => onSeek(overlay.startTime)}>
                      Jump to Start
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
