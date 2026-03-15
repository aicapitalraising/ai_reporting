import { useState, useRef, useCallback } from 'react';
import { ImagePlus, X, Replace } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface KeyframeUploaderProps {
  startFrame: string | null;
  endFrame: string | null;
  onStartFrameChange: (url: string | null) => void;
  onEndFrameChange: (url: string | null) => void;
  disabled?: boolean;
}

function FrameDropZone({
  label,
  imageUrl,
  onImageChange,
  disabled,
}: {
  label: string;
  imageUrl: string | null;
  onImageChange: (url: string | null) => void;
  disabled?: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [urlMode, setUrlMode] = useState(false);
  const [pasteUrl, setPasteUrl] = useState('');

  const handleFileSelect = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error('Image must be under 10MB'); return; }
    setIsUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'png';
      const path = `broll-keyframes/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from('assets').upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from('assets').getPublicUrl(path);
      onImageChange(data.publicUrl);
      toast.success(`${label} uploaded`);
    } catch (err: any) {
      console.error('Upload error:', err);
      toast.error('Upload failed', { description: err.message });
    } finally { setIsUploading(false); }
  }, [label, onImageChange]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const handlePasteUrl = () => {
    if (pasteUrl.trim()) { onImageChange(pasteUrl.trim()); setPasteUrl(''); setUrlMode(false); }
  };

  if (imageUrl) {
    return (
      <div className="relative group rounded-lg overflow-hidden border border-border bg-muted/30">
        <img src={imageUrl} alt={label} className="w-full aspect-video object-cover" />
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <Button size="sm" variant="secondary" onClick={() => fileInputRef.current?.click()} disabled={disabled}>
            <Replace className="h-3 w-3 mr-1" /> Replace
          </Button>
          <Button size="sm" variant="destructive" onClick={() => onImageChange(null)} disabled={disabled}>
            <X className="h-3 w-3" />
          </Button>
        </div>
        <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1">
          <span className="text-xs text-white font-medium">{label}</span>
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])} />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div
        className={cn(
          'relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/20 aspect-video cursor-pointer transition-colors hover:border-primary/50 hover:bg-muted/40',
          isUploading && 'opacity-50 pointer-events-none'
        )}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => fileInputRef.current?.click()}
      >
        {isUploading ? (
          <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
        ) : (
          <>
            <ImagePlus className="h-8 w-8 text-muted-foreground mb-2" />
            <span className="text-xs font-medium text-muted-foreground">{label}</span>
            <span className="text-[10px] text-muted-foreground/60 mt-1">Drop image or click to upload</span>
          </>
        )}
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])} />
      </div>
      {urlMode ? (
        <div className="flex gap-1">
          <Input value={pasteUrl} onChange={(e) => setPasteUrl(e.target.value)} placeholder="https://..." className="h-7 text-xs" onKeyDown={(e) => e.key === 'Enter' && handlePasteUrl()} />
          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={handlePasteUrl}>OK</Button>
          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setUrlMode(false)}><X className="h-3 w-3" /></Button>
        </div>
      ) : (
        <button onClick={(e) => { e.stopPropagation(); setUrlMode(true); }} className="text-[10px] text-muted-foreground hover:text-foreground transition-colors">
          Or paste image URL
        </button>
      )}
    </div>
  );
}

export const TRANSITION_PRESETS = [
  // Camera Movements
  { label: '🔍 Zoom In', prompt: 'Slow cinematic zoom in, camera pushes forward smoothly revealing more detail' },
  { label: '🔭 Zoom Out', prompt: 'Gradual zoom out revealing a wider scene, camera pulls back smoothly' },
  { label: '👈 Pan Left', prompt: 'Smooth horizontal camera pan from right to left, steady tracking movement' },
  { label: '👉 Pan Right', prompt: 'Smooth horizontal camera pan from left to right, steady tracking movement' },
  { label: '⬆️ Tilt Up', prompt: 'Camera tilts upward slowly, revealing the scene from bottom to top' },
  { label: '⬇️ Tilt Down', prompt: 'Camera tilts downward slowly, revealing the scene from top to bottom' },
  // Dolly & Jib
  { label: '🎬 Dolly In', prompt: 'Cinematic dolly push toward subject, camera moves forward smoothly creating depth and intimacy' },
  { label: '🎬 Dolly Out', prompt: 'Cinematic dolly pull away from subject, camera retreats revealing wider environment' },
  { label: '🏗️ Jib Up', prompt: 'Camera rises upward on a jib arm, revealing scene from low angle to elevated perspective' },
  { label: '🏗️ Jib Down', prompt: 'Camera descends downward on a jib arm, from high angle swooping down to subject level' },
  // Orbit & Aerial
  { label: '🌀 Orbit Around', prompt: 'Camera orbits around the subject in a smooth 180-degree circular motion, cinematic 3D rotation effect' },
  { label: '🚁 Drone Shot', prompt: 'Aerial drone perspective, camera floats overhead with smooth cinematic movement across the landscape' },
  // Transitions
  { label: '🔄 Morph', prompt: 'Smooth morphing transformation, elements gradually shift and blend into the new composition' },
  { label: '💫 Dissolve', prompt: 'Dreamy cross-dissolve transition, first scene fades as second scene emerges through it' },
  { label: '🌊 Flow', prompt: 'Fluid flowing motion, elements move like liquid transitioning organically between scenes' },
  { label: '⚡ Whip Pan', prompt: 'Fast whip pan with motion blur connecting both frames in a dynamic energetic transition' },
  { label: '🔁 360 Roll', prompt: 'Full 360-degree barrel roll transition, dynamic spinning motion connecting both frames with energy' },
] as const;

export function KeyframeUploader({
  startFrame,
  endFrame,
  onStartFrameChange,
  onEndFrameChange,
  disabled,
}: KeyframeUploaderProps) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-3">
        <FrameDropZone label="Start Frame" imageUrl={startFrame} onImageChange={onStartFrameChange} disabled={disabled} />
        <FrameDropZone label="End Frame" imageUrl={endFrame} onImageChange={onEndFrameChange} disabled={disabled} />
      </div>
      <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground">
        <span>→</span>
        <span>AI will generate a smooth transition between frames</span>
        <span>→</span>
      </div>
    </div>
  );
}
