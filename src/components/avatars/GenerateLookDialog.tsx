import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Sparkles, CheckCircle, XCircle, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useAvatarGeneration,
  LOOK_TYPES,
  REALISM_LEVELS,
  STYLE_PRESETS,
  BACKGROUND_PRESETS,
} from '@/hooks/useAvatarGeneration';
import { useCreateAvatarLook } from '@/hooks/useAvatarLooks';
import { toast } from 'sonner';
import type { Avatar } from '@/types';

interface GenerateLookDialogProps {
  avatar: Avatar | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Look Pack presets
const LOOK_PACK = [
  { label: 'Professional Headshot', style_preset: 'professional_headshot' as const, look_type: 'different_outfit' as const, description: 'Business attire, studio backdrop' },
  { label: 'Lifestyle Shot', style_preset: 'lifestyle' as const, look_type: 'different_setting' as const, description: 'Casual setting, natural light' },
  { label: 'Social Media Optimized', style_preset: 'social_media' as const, look_type: 'different_expression' as const, description: 'Bright, engaging, platform-ready' },
  { label: 'Action / Motion', style_preset: 'lifestyle' as const, look_type: 'different_angle' as const, description: 'Dynamic pose, movement' },
  { label: 'Custom', style_preset: undefined, look_type: undefined, description: 'Your own specification' },
];

export function GenerateLookDialog({ avatar, open, onOpenChange }: GenerateLookDialogProps) {
  const [mode, setMode] = useState<'single' | 'pack'>('single');
  
  // Single look state
  const [lookType, setLookType] = useState<string>('different_outfit');
  const [lookDescription, setLookDescription] = useState('');
  const [numVariations, setNumVariations] = useState(1);
  const [realismLevel, setRealismLevel] = useState<string>('ultra-realistic');
  const [stylePreset, setStylePreset] = useState<string>('');

  // Pack state
  const [packCustomDescription, setPackCustomDescription] = useState('');

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<{ label: string; success: boolean; imageUrl?: string }[]>([]);

  const { generateAvatar, hasApiKey } = useAvatarGeneration();
  const createLook = useCreateAvatarLook();

  const handleGenerateSingle = async () => {
    if (!avatar) return;
    setIsGenerating(true);
    setProgress(0);
    setResults([]);

    const newResults: typeof results = [];
    const total = numVariations;

    for (let i = 0; i < total; i++) {
      const result = await generateAvatar({
        gender: avatar.gender || 'female',
        ageRange: avatar.age_range || '26-35',
        ethnicity: avatar.ethnicity || 'caucasian',
        style: (avatar.style as any) || 'professional',
        background: 'studio',
        isStock: avatar.is_stock || false,
        clientId: avatar.client_id || undefined,
        referenceImageUrl: avatar.image_url,
        realism_level: realismLevel as any,
        style_preset: stylePreset as any || undefined,
        look_type: lookType as any,
        look_description: lookDescription || undefined,
        avatar_description: avatar.description || undefined,
      });

      if (result.success && result.imageUrl) {
        await createLook.mutateAsync({
          avatar_id: avatar.id,
          image_url: result.imageUrl,
          metadata: { look_type: lookType, realism_level: realismLevel, style_preset: stylePreset, prompt_description: lookDescription } as any,
        });
        newResults.push({ label: `Variation ${i + 1}`, success: true, imageUrl: result.imageUrl });
      } else {
        newResults.push({ label: `Variation ${i + 1}`, success: false });
      }

      setResults([...newResults]);
      setProgress(((i + 1) / total) * 100);
    }

    setIsGenerating(false);
    const successCount = newResults.filter(r => r.success).length;
    toast.success(`Generated ${successCount} of ${total} look${total > 1 ? 's' : ''}`);
  };

  const handleGeneratePack = async () => {
    if (!avatar) return;
    setIsGenerating(true);
    setProgress(0);
    setResults([]);

    const newResults: typeof results = [];
    const packItems = LOOK_PACK;

    for (let i = 0; i < packItems.length; i++) {
      const item = packItems[i];
      const isCustom = item.label === 'Custom';

      const result = await generateAvatar({
        gender: avatar.gender || 'female',
        ageRange: avatar.age_range || '26-35',
        ethnicity: avatar.ethnicity || 'caucasian',
        style: (avatar.style as any) || 'professional',
        background: 'studio',
        isStock: avatar.is_stock || false,
        clientId: avatar.client_id || undefined,
        referenceImageUrl: avatar.image_url,
        realism_level: 'ultra-realistic',
        style_preset: isCustom ? undefined : item.style_preset,
        look_type: isCustom ? 'different_outfit' : item.look_type,
        look_description: isCustom ? packCustomDescription : item.description,
        avatar_description: avatar.description || undefined,
      });

      if (result.success && result.imageUrl) {
        await createLook.mutateAsync({
          avatar_id: avatar.id,
          image_url: result.imageUrl,
          metadata: { look_pack: true, pack_type: item.label, style_preset: item.style_preset } as any,
        });
        newResults.push({ label: item.label, success: true, imageUrl: result.imageUrl });
      } else {
        newResults.push({ label: item.label, success: false });
      }

      setResults([...newResults]);
      setProgress(((i + 1) / packItems.length) * 100);
    }

    setIsGenerating(false);
    const successCount = newResults.filter(r => r.success).length;
    toast.success(`Generated ${successCount} of 5 looks in the pack`);
  };

  const handleClose = () => {
    if (!isGenerating) {
      setResults([]);
      setProgress(0);
      onOpenChange(false);
    }
  };

  if (!avatar) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Generate New Looks — {avatar.name}
          </DialogTitle>
          <DialogDescription>
            Create consistent look variations while preserving identity
          </DialogDescription>
        </DialogHeader>

        {isGenerating ? (
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between text-sm">
              <span>Generating {results.length} of {mode === 'pack' ? 5 : numVariations}...</span>
              <span className="font-medium">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
            <ScrollArea className="h-60 border rounded-lg p-3">
              <div className="space-y-3">
                {results.map((r, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    {r.success ? <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" /> : <XCircle className="h-4 w-4 text-destructive flex-shrink-0" />}
                    {r.imageUrl && (
                      <img src={r.imageUrl} alt={r.label} className="w-12 h-12 rounded-lg object-cover" />
                    )}
                    <div>
                      <span className="text-sm font-medium">{r.label}</span>
                      <span className={cn('text-xs ml-2', r.success ? 'text-primary' : 'text-destructive')}>
                        {r.success ? '✓' : 'Failed'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        ) : (
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-5 py-2">
              {/* Reference Image */}
              <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
                <img
                  src={avatar.image_url}
                  alt={avatar.name}
                  className="w-16 h-20 rounded-lg object-cover border"
                />
                <div>
                  <p className="text-sm font-medium">Reference: {avatar.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Identity will be preserved across all generated looks
                  </p>
                </div>
              </div>

              {/* Mode Toggle */}
              <div className="flex gap-2">
                <Button
                  variant={mode === 'single' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setMode('single')}
                  className="flex-1 gap-2"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Custom Look
                </Button>
                <Button
                  variant={mode === 'pack' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setMode('pack')}
                  className="flex-1 gap-2"
                >
                  <Package className="h-3.5 w-3.5" />
                  Look Pack (5)
                </Button>
              </div>

              {mode === 'single' ? (
                <>
                  {/* Look Type */}
                  <div className="space-y-2">
                    <Label className="text-sm">Look Type</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {LOOK_TYPES.map((lt) => (
                        <button
                          key={lt.id}
                          onClick={() => setLookType(lt.id)}
                          className={cn(
                            'p-3 rounded-lg border text-left transition-all',
                            lookType === lt.id
                              ? 'border-primary bg-primary/10'
                              : 'border-border hover:border-foreground/30'
                          )}
                        >
                          <span className="text-lg mr-2">{lt.icon}</span>
                          <span className="text-sm font-medium">{lt.name}</span>
                          <p className="text-xs text-muted-foreground mt-0.5">{lt.description}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Realism Level */}
                  <div className="space-y-2">
                    <Label className="text-sm">Realism Level</Label>
                    <div className="flex gap-2">
                      {REALISM_LEVELS.map((rl) => (
                        <button
                          key={rl.id}
                          onClick={() => setRealismLevel(rl.id)}
                          className={cn(
                            'flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all border',
                            realismLevel === rl.id
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-muted hover:bg-muted/80 border-transparent'
                          )}
                        >
                          {rl.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Style Preset */}
                  <div className="space-y-2">
                    <Label className="text-sm">Style Preset (optional)</Label>
                    <Select value={stylePreset} onValueChange={setStylePreset}>
                      <SelectTrigger>
                        <SelectValue placeholder="None — use default" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {STYLE_PRESETS.map((sp) => (
                          <SelectItem key={sp.id} value={sp.id}>
                            {sp.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <Label className="text-sm">Custom Specification (optional)</Label>
                    <Textarea
                      value={lookDescription}
                      onChange={(e) => setLookDescription(e.target.value)}
                      placeholder="e.g., Navy blazer with white shirt, or Beach at sunset..."
                      rows={2}
                    />
                  </div>

                  {/* Variations Slider */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Number of Variations</Label>
                      <Badge variant="outline">{numVariations}</Badge>
                    </div>
                    <Slider
                      value={[numVariations]}
                      onValueChange={(v) => setNumVariations(v[0])}
                      min={1}
                      max={5}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>1</span>
                      <span>5</span>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Look Pack Preview */}
                  <div className="space-y-2">
                    <Label className="text-sm">Look Pack Contents (5 looks)</Label>
                    <div className="space-y-2">
                      {LOOK_PACK.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-3 p-2.5 rounded-lg border bg-muted/30">
                          <Badge variant="outline" className="text-xs shrink-0 w-6 h-6 p-0 flex items-center justify-center">
                            {idx + 1}
                          </Badge>
                          <div>
                            <p className="text-sm font-medium">{item.label}</p>
                            <p className="text-xs text-muted-foreground">{item.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Custom look description for pack */}
                  <div className="space-y-2">
                    <Label className="text-sm">Custom Look Description (for #5)</Label>
                    <Textarea
                      value={packCustomDescription}
                      onChange={(e) => setPackCustomDescription(e.target.value)}
                      placeholder="Describe the 5th custom look..."
                      rows={2}
                    />
                  </div>
                </>
              )}
            </div>
          </ScrollArea>
        )}

        {!isGenerating && hasApiKey && (
          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>Cancel</Button>
            <Button
              onClick={mode === 'single' ? handleGenerateSingle : handleGeneratePack}
              className="gap-2"
            >
              <Sparkles className="h-4 w-4" />
              {mode === 'pack' ? 'Generate Look Pack (5)' : `Generate ${numVariations} Look${numVariations > 1 ? 's' : ''}`}
            </Button>
          </DialogFooter>
        )}

        {isGenerating && (
          <DialogFooter>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Please wait...
            </div>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
