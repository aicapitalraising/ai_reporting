import { useState, useRef } from 'react';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { Loader2, Sparkles, Users, CheckCircle, XCircle, Smartphone, Upload, X, ImagePlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useAvatarGeneration,
  ETHNICITY_OPTIONS,
  BACKGROUND_PRESETS,
  STYLE_OPTIONS,
  CAMERA_DEVICE_OPTIONS,
  ASPECT_RATIO_OPTIONS,
} from '@/hooks/useAvatarGeneration';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface BatchGenerateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isStock?: boolean;
  clientId?: string;
}

export function BatchGenerateDialog({ open, onOpenChange, isStock = false, clientId }: BatchGenerateDialogProps) {
  const [selectedGenders, setSelectedGenders] = useState<string[]>(['male', 'female']);
  const [selectedAges, setSelectedAges] = useState<string[]>(['18-25', '26-35', '36-45']);
  const [selectedEthnicities, setSelectedEthnicities] = useState<string[]>(ETHNICITY_OPTIONS.map(e => e.id));
  const [selectedStyles, setSelectedStyles] = useState<string[]>(['ugc', 'lifestyle']);
  const [selectedBackgrounds, setSelectedBackgrounds] = useState<string[]>(['podcast', 'car', 'mirror-selfie', 'couch']);
  const [count, setCount] = useState(5);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<{ success: boolean; name?: string }[]>([]);

  // Reference images
  const [referenceImages, setReferenceImages] = useState<{ file: File; preview: string; uploadedUrl?: string }[]>([]);
  const [isUploadingRefs, setIsUploadingRefs] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // New Nano Banana Pro controls with defaults
  const [cameraDevice, setCameraDevice] = useState<'iphone' | 'samsung'>('iphone');
  const [aspectRatio, setAspectRatio] = useState<'9:16' | '6:19'>('9:16');
  const [realism, setRealism] = useState(0.7);
  const [wideAngle, setWideAngle] = useState(0.5);

  const { generateAvatar, hasApiKey } = useAvatarGeneration();
  const queryClient = useQueryClient();

  const toggleSelection = (value: string, selected: string[], setSelected: (v: string[]) => void) => {
    if (selected.includes(value)) {
      setSelected(selected.filter(v => v !== value));
    } else {
      setSelected([...selected, value]);
    }
  };

  const generateRandomConfig = () => {
    const gender = selectedGenders[Math.floor(Math.random() * selectedGenders.length)];
    const ageRange = selectedAges[Math.floor(Math.random() * selectedAges.length)];
    const ethnicity = selectedEthnicities[Math.floor(Math.random() * selectedEthnicities.length)];
    const style = selectedStyles[Math.floor(Math.random() * selectedStyles.length)];
    const background = selectedBackgrounds[Math.floor(Math.random() * selectedBackgrounds.length)];
    return { gender, ageRange, ethnicity, style, background };
  };

  const handleRefImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newImages = files.map(file => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    setReferenceImages(prev => [...prev, ...newImages]);

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeRefImage = (idx: number) => {
    setReferenceImages(prev => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[idx].preview);
      updated.splice(idx, 1);
      return updated;
    });
  };

  const uploadReferenceImages = async (): Promise<string[]> => {
    setIsUploadingRefs(true);
    const urls: string[] = [];

    for (const img of referenceImages) {
      if (img.uploadedUrl) {
        urls.push(img.uploadedUrl);
        continue;
      }
      const ext = img.file.name.split('.').pop() || 'jpg';
      const path = `reference-images/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from('avatars').upload(path, img.file);
      if (error) {
        console.error('Upload error:', error);
        continue;
      }
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
      urls.push(urlData.publicUrl);
      img.uploadedUrl = urlData.publicUrl;
    }

    setIsUploadingRefs(false);
    return urls;
  };

  const handleBatchGenerate = async () => {
    if (selectedGenders.length === 0 || selectedAges.length === 0 || selectedEthnicities.length === 0) {
      toast.error('Please select at least one option for each category');
      return;
    }

    setIsGenerating(true);
    setProgress(0);
    setResults([]);

    // Upload reference images first if any
    let refUrls: string[] = [];
    if (referenceImages.length > 0) {
      refUrls = await uploadReferenceImages();
    }

    const newResults: { success: boolean; name?: string }[] = [];

    for (let i = 0; i < count; i++) {
      const config = generateRandomConfig();
      // Cycle through reference images if multiple
      const referenceImageUrl = refUrls.length > 0 ? refUrls[i % refUrls.length] : undefined;
      
      try {
        const result = await generateAvatar({
          gender: config.gender,
          ageRange: config.ageRange,
          ethnicity: config.ethnicity,
          style: config.style,
          background: config.background,
          isStock,
          clientId,
          referenceImageUrl,
          // Include Nano Banana Pro settings
          cameraDevice,
          aspectRatio,
          realism,
          wideAngle,
        });

        if (result.success && result.imageUrl) {
          // Auto-generate name
          const ethnicityName = ETHNICITY_OPTIONS.find(e => e.id === config.ethnicity)?.name?.split('/')[0] || '';
          const genderName = config.gender.charAt(0).toUpperCase() + config.gender.slice(1);
          const avatarName = `${genderName} ${ethnicityName} ${i + 1}`;

          // Save to database
          await supabase.from('avatars').insert({
            client_id: isStock ? null : (clientId || null),
            name: avatarName,
            gender: config.gender,
            age_range: config.ageRange,
            ethnicity: config.ethnicity,
            style: config.style,
            image_url: result.imageUrl,
            is_stock: isStock,
            looks_count: 1,
          });

          newResults.push({ success: true, name: avatarName });
        } else {
          newResults.push({ success: false });
        }
      } catch (error) {
        console.error('Batch generation error:', error);
        newResults.push({ success: false });
      }

      setResults([...newResults]);
      setProgress(((i + 1) / count) * 100);
    }

    setIsGenerating(false);
    queryClient.invalidateQueries({ queryKey: ['avatars'] });
    
    const successCount = newResults.filter(r => r.success).length;
    toast.success(`Generated ${successCount} of ${count} avatars`);
  };

  const handleClose = () => {
    if (!isGenerating) {
      setResults([]);
      setProgress(0);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Batch Generate Avatars
          </DialogTitle>
          <DialogDescription>
            Generate multiple diverse avatars at once using Nano Banana Pro
          </DialogDescription>
        </DialogHeader>

        {isGenerating ? (
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between text-sm">
              <span>Generating {Math.round(progress / 100 * count)} of {count} avatars...</span>
              <span className="font-medium">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
            
            <ScrollArea className="h-48 border rounded-lg p-3">
              <div className="space-y-2">
                {results.map((result, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm">
                    {result.success ? (
                      <CheckCircle className="h-4 w-4 text-primary" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive" />
                    )}
                    <span>{result.name || `Avatar ${idx + 1}`}</span>
                    <span className={cn(
                      'text-xs',
                      result.success ? 'text-primary' : 'text-destructive'
                    )}>
                      {result.success ? 'Success' : 'Failed'}
                    </span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        ) : (
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-6 py-2">
              {/* Reference Images */}
              <div>
                <Label className="text-sm font-medium mb-3 block flex items-center gap-2">
                  <ImagePlus className="h-4 w-4" />
                  Reference Images
                  <span className="text-xs font-normal text-muted-foreground">(optional)</span>
                </Label>
                <p className="text-xs text-muted-foreground mb-3">
                  Upload photos to use as visual references. Generated avatars will be inspired by these images.
                </p>
                <div className="flex flex-wrap gap-3">
                  {referenceImages.map((img, idx) => (
                    <div key={idx} className="relative group w-20 h-20 rounded-lg overflow-hidden border border-border">
                      <img src={img.preview} alt={`Reference ${idx + 1}`} className="w-full h-full object-cover" />
                      <button
                        onClick={() => removeRefImage(idx)}
                        className="absolute top-0.5 right-0.5 bg-background/80 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-20 h-20 rounded-lg border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 flex flex-col items-center justify-center gap-1 transition-colors text-muted-foreground hover:text-primary"
                  >
                    <Upload className="h-4 w-4" />
                    <span className="text-[10px]">Upload</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleRefImageUpload}
                  />
                </div>
              </div>

              {/* Count Selection */}
              <div>
                <Label className="text-sm font-medium mb-3 block">Number of Avatars</Label>
                <div className="flex flex-wrap gap-2">
                  {[3, 5, 10, 15, 20].map((n) => (
                    <button
                      key={n}
                      onClick={() => setCount(n)}
                      className={cn(
                        'px-4 py-2 rounded-full text-sm font-medium transition-all border',
                        count === n
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-muted hover:bg-muted/80 border-transparent'
                      )}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {/* Nano Banana Pro Settings */}
              <div className="p-4 bg-muted/50 rounded-lg space-y-4">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Nano Banana Pro Settings
                </Label>

                {/* Camera Device */}
                <div>
                  <Label className="text-xs mb-2 block flex items-center gap-2">
                    <Smartphone className="h-3.5 w-3.5" />
                    Camera Device
                  </Label>
                  <div className="flex gap-2">
                    {CAMERA_DEVICE_OPTIONS.map((cam) => (
                      <button
                        key={cam.id}
                        onClick={() => setCameraDevice(cam.id as 'iphone' | 'samsung')}
                        className={cn(
                          'flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all border',
                          cameraDevice === cam.id
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-background hover:bg-muted border-transparent'
                        )}
                      >
                        {cam.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Aspect Ratio */}
                <div>
                  <Label className="text-xs mb-2 block">Size</Label>
                  <div className="flex gap-2">
                    {ASPECT_RATIO_OPTIONS.map((ar) => (
                      <button
                        key={ar.id}
                        onClick={() => setAspectRatio(ar.id as '9:16' | '6:19')}
                        className={cn(
                          'flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all border',
                          aspectRatio === ar.id
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-background hover:bg-muted border-transparent'
                        )}
                      >
                        {ar.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Realism Slider */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-xs">Realism</Label>
                    <span className="text-xs text-muted-foreground">{Math.round(realism * 100)}%</span>
                  </div>
                  <Slider
                    value={[realism]}
                    onValueChange={(v) => setRealism(v[0])}
                    min={0}
                    max={1}
                    step={0.05}
                    className="w-full"
                  />
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-muted-foreground">Polished</span>
                    <span className="text-xs text-muted-foreground">Raw</span>
                  </div>
                </div>

                {/* Wide Angle Slider */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-xs">Focal Length</Label>
                    <span className="text-xs text-muted-foreground">{wideAngle < 0.5 ? '85mm' : wideAngle < 1 ? '35mm' : '24mm'}</span>
                  </div>
                  <Slider
                    value={[wideAngle]}
                    onValueChange={(v) => setWideAngle(v[0])}
                    min={0}
                    max={1.5}
                    step={0.1}
                    className="w-full"
                  />
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-muted-foreground">Portrait</span>
                    <span className="text-xs text-muted-foreground">Wide</span>
                  </div>
                </div>
              </div>

              {/* Gender Selection */}
              <div>
                <Label className="text-sm font-medium mb-3 block">Genders</Label>
                <div className="flex flex-wrap gap-2">
                  {['male', 'female', 'non-binary'].map((g) => (
                    <button
                      key={g}
                      onClick={() => toggleSelection(g, selectedGenders, setSelectedGenders)}
                      className={cn(
                        'px-3 py-1.5 rounded-full text-sm font-medium transition-all border',
                        selectedGenders.includes(g)
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-muted hover:bg-muted/80 border-transparent'
                      )}
                    >
                      {g.charAt(0).toUpperCase() + g.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Age Ranges */}
              <div>
                <Label className="text-sm font-medium mb-3 block">Age Ranges</Label>
                <div className="flex flex-wrap gap-2">
                  {['18-25', '26-35', '36-45', '46-55', '55+'].map((age) => (
                    <button
                      key={age}
                      onClick={() => toggleSelection(age, selectedAges, setSelectedAges)}
                      className={cn(
                        'px-3 py-1.5 rounded-full text-sm font-medium transition-all border',
                        selectedAges.includes(age)
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-muted hover:bg-muted/80 border-transparent'
                      )}
                    >
                      {age}
                    </button>
                  ))}
                </div>
              </div>

              {/* Ethnicities */}
              <div>
                <Label className="text-sm font-medium mb-3 block">Ethnicities</Label>
                <div className="flex flex-wrap gap-2">
                  {ETHNICITY_OPTIONS.map((eth) => (
                    <button
                      key={eth.id}
                      onClick={() => toggleSelection(eth.id, selectedEthnicities, setSelectedEthnicities)}
                      className={cn(
                        'px-3 py-1.5 rounded-full text-sm font-medium transition-all border',
                        selectedEthnicities.includes(eth.id)
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-muted hover:bg-muted/80 border-transparent'
                      )}
                    >
                      {eth.name.split('/')[0]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Styles */}
              <div>
                <Label className="text-sm font-medium mb-3 block">Styles</Label>
                <div className="flex flex-wrap gap-2">
                  {STYLE_OPTIONS.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => toggleSelection(s.id, selectedStyles, setSelectedStyles)}
                      className={cn(
                        'px-3 py-1.5 rounded-full text-sm font-medium transition-all border',
                        selectedStyles.includes(s.id)
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-muted hover:bg-muted/80 border-transparent'
                      )}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Backgrounds */}
              <div>
                <Label className="text-sm font-medium mb-3 block">Backgrounds</Label>
                <div className="flex flex-wrap gap-2">
                  {BACKGROUND_PRESETS.map((bg) => (
                    <button
                      key={bg.id}
                      onClick={() => toggleSelection(bg.id, selectedBackgrounds, setSelectedBackgrounds)}
                      className={cn(
                        'px-3 py-1.5 rounded-full text-sm font-medium transition-all border',
                        selectedBackgrounds.includes(bg.id)
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-muted hover:bg-muted/80 border-transparent'
                      )}
                    >
                      {bg.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </ScrollArea>
        )}

        <DialogFooter className="pt-4 border-t">
          <Button variant="outline" onClick={handleClose} disabled={isGenerating}>
            {isGenerating ? 'Generating...' : 'Cancel'}
          </Button>
          {!isGenerating && hasApiKey && (
            <Button onClick={handleBatchGenerate} className="gap-2">
              <Sparkles className="h-4 w-4" />
              Generate {count} Avatars
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
