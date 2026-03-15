import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Sparkles, Plus, Trash2, Loader2 } from 'lucide-react';
import type { Caption, CaptionStyleType, CaptionPosition } from '@/hooks/useVideoEditor';
import { cn } from '@/lib/utils';
import { CaptionStylePreview } from './CaptionStylePreview';

interface CaptionEditorProps {
  captions: Caption[];
  captionStyle: CaptionStyleType;
  fontSize: number;
  color: string;
  fontFamily: string;
  position: CaptionPosition;
  stroke: boolean;
  background: boolean;
  isGenerating: boolean;
  totalDuration: number;
  onGenerateCaptions: () => void;
  onAddCaption: (startTime: number, endTime: number, text: string) => void;
  onUpdateCaption: (id: string, updates: Partial<Caption>) => void;
  onDeleteCaption: (id: string) => void;
  onSetStyle: (style: CaptionStyleType) => void;
  onSetFontSize: (size: number) => void;
  onSetColor: (color: string) => void;
  onSetFontFamily: (family: string) => void;
  onSetPosition: (pos: CaptionPosition) => void;
  onSetStroke: (v: boolean) => void;
  onSetBackground: (v: boolean) => void;
}

const STYLE_OPTIONS: { value: CaptionStyleType; label: string; desc: string }[] = [
  { value: 'viral-pop', label: '🔥 Viral Pop', desc: 'Word bounce highlight' },
  { value: 'karaoke', label: '🎤 Karaoke', desc: 'Progressive fill' },
  { value: 'boxed', label: '📦 Boxed', desc: 'Word boxes' },
  { value: 'typewriter', label: '⌨️ Typewriter', desc: 'Words appear' },
  { value: 'gradient', label: '🌈 Gradient', desc: 'Color wave' },
  { value: 'minimal', label: '✨ Minimal', desc: 'Clean active word' },
  { value: 'neon', label: '💡 Neon', desc: 'Glow pulse' },
  { value: 'classic', label: '📺 Classic', desc: 'Bottom bar' },
  { value: 'none', label: '🚫 None', desc: 'No captions' },
];

const FONT_OPTIONS = [
  { value: 'Inter', label: 'Inter' },
  { value: 'Montserrat', label: 'Montserrat' },
  { value: 'Bebas Neue', label: 'Bebas Neue' },
  { value: 'Comic Neue', label: 'Comic Neue' },
  { value: 'Arial', label: 'Arial' },
  { value: 'Georgia', label: 'Georgia' },
];

const POSITION_OPTIONS: { value: CaptionPosition; label: string }[] = [
  { value: 'top', label: 'Top' },
  { value: 'center', label: 'Center' },
  { value: 'bottom', label: 'Bottom' },
];

export function CaptionEditor({
  captions,
  captionStyle,
  fontSize,
  color,
  fontFamily,
  position,
  stroke,
  background,
  isGenerating,
  totalDuration,
  onGenerateCaptions,
  onAddCaption,
  onUpdateCaption,
  onDeleteCaption,
  onSetStyle,
  onSetFontSize,
  onSetColor,
  onSetFontFamily,
  onSetPosition,
  onSetStroke,
  onSetBackground,
}: CaptionEditorProps) {
  return (
    <div className="p-4 space-y-4">
      {/* Auto-generate */}
      <Button
        variant="secondary"
        size="sm"
        className="w-full gap-2"
        onClick={onGenerateCaptions}
        disabled={isGenerating}
      >
        {isGenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
        {isGenerating ? 'Generating word-level captions...' : 'AI Auto-Caption (Word-Level)'}
      </Button>

      {/* Style presets with live mini previews */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">Style</label>
        <div className="grid grid-cols-3 gap-1.5">
          {STYLE_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => onSetStyle(opt.value)}
              className={cn(
                'rounded-lg border text-center transition-all overflow-hidden flex flex-col',
                captionStyle === opt.value
                  ? 'border-primary ring-1 ring-primary/30'
                  : 'border-border hover:border-foreground/30'
              )}
            >
              <CaptionStylePreview style={opt.value} width={90} height={32} />
              <div className="px-1 py-1">
                <span className="text-[9px] font-medium block leading-tight">{opt.label}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Controls (hidden when none) */}
      {captionStyle !== 'none' && (
        <div className="space-y-3">
          {/* Font family */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Font</label>
            <Select value={fontFamily} onValueChange={onSetFontFamily}>
              <SelectTrigger className="text-xs h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FONT_OPTIONS.map(f => (
                  <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Position */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Position</label>
            <div className="flex gap-1">
              {POSITION_OPTIONS.map(p => (
                <button
                  key={p.value}
                  onClick={() => onSetPosition(p.value)}
                  className={cn(
                    'flex-1 text-xs py-1 rounded border transition-all',
                    position === p.value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:border-foreground/30'
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Font size */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Size: {fontSize}px</label>
            <Slider value={[fontSize]} onValueChange={([v]) => onSetFontSize(v)} min={16} max={72} step={2} />
          </div>

          {/* Color */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Color</label>
            <input type="color" value={color} onChange={e => onSetColor(e.target.value)} className="w-full h-7 rounded cursor-pointer" />
          </div>

          {/* Toggles */}
          <div className="flex items-center justify-between">
            <label className="text-xs text-muted-foreground">Text Outline</label>
            <Switch checked={stroke} onCheckedChange={onSetStroke} />
          </div>
          <div className="flex items-center justify-between">
            <label className="text-xs text-muted-foreground">Background Box</label>
            <Switch checked={background} onCheckedChange={onSetBackground} />
          </div>
        </div>
      )}

      {/* Caption segments */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-muted-foreground">Segments ({captions.length})</label>
          <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={() => onAddCaption(0, Math.min(3, totalDuration), 'New caption')}>
            <Plus className="h-3 w-3" /> Add
          </Button>
        </div>
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {captions.map(cap => (
            <div key={cap.id} className="flex items-start gap-1.5 p-2 rounded bg-muted/50 text-xs">
              <div className="flex-1 space-y-1">
                <Input
                  value={cap.text}
                  onChange={e => onUpdateCaption(cap.id, { text: e.target.value })}
                  className="h-6 text-xs"
                />
                <div className="flex gap-2 items-center">
                  <Input
                    type="number"
                    value={cap.startTime}
                    onChange={e => onUpdateCaption(cap.id, { startTime: parseFloat(e.target.value) || 0 })}
                    className="h-5 text-[10px] w-16"
                    step={0.1}
                  />
                  <span className="text-muted-foreground">→</span>
                  <Input
                    type="number"
                    value={cap.endTime}
                    onChange={e => onUpdateCaption(cap.id, { endTime: parseFloat(e.target.value) || 0 })}
                    className="h-5 text-[10px] w-16"
                    step={0.1}
                  />
                  {cap.words && (
                    <span className="text-[9px] text-muted-foreground">{cap.words.length}w</span>
                  )}
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0" onClick={() => onDeleteCaption(cap.id)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
