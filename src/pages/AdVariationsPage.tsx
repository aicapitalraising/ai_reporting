import { useState, useCallback } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Upload, 
  Sparkles, 
  Loader2, 
  ImagePlus,
  Wand2,
  X,
  RefreshCw,
  Check,
  Palette,
  Library,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAssets, useDeleteAsset, useCreateAsset, useUpdateAsset } from '@/hooks/useAssets';
import { useAdStyles } from '@/hooks/useAdStyles';
import { AssetGrid } from '@/components/assets/AssetGrid';
import { supabase } from '@/integrations/supabase/client';
import { useGeminiKey } from '@/hooks/useGeminiKey';
import { cn } from '@/lib/utils';
import type { Asset, AdStyle } from '@/types';
import { useQuery } from '@tanstack/react-query';

// A/B Test variation types
const VARIATION_TYPES = [
  { 
    id: 'color-scheme', name: 'Color Scheme', description: 'Different color palettes and tones',
    prompts: [
      'Change the color palette to warmer tones with oranges and reds',
      'Apply a cool blue and teal color scheme',
      'Convert to high contrast black and white with accent color',
      'Use vibrant neon colors for a bold modern look',
      'Apply soft pastel colors for a gentle aesthetic',
    ]
  },
  { 
    id: 'text-layout', name: 'Text & Layout', description: 'Move text, change fonts, adjust hierarchy',
    prompts: [
      'Move the headline to the bottom of the image',
      'Center all text elements with larger font',
      'Place text on the left side with right-aligned image',
      'Add a bold banner across the top with the headline',
      'Use a minimalist layout with smaller subtle text',
    ]
  },
  { 
    id: 'cta-button', name: 'CTA Button', description: 'Different call-to-action styles',
    prompts: [
      'Add a bright red "Shop Now" button',
      'Replace CTA with a green "Get Started" pill button',
      'Add an arrow-style CTA pointing right',
      'Use a outlined/ghost style button instead',
      'Add urgency with "Limited Time" above the CTA',
    ]
  },
  { 
    id: 'background', name: 'Background', description: 'Modify background elements',
    prompts: [
      'Add a subtle gradient overlay to the background',
      'Blur the background more to focus on product',
      'Add geometric shapes in the background',
      'Change to a solid color background',
      'Add lifestyle context elements to the background',
    ]
  },
  { 
    id: 'product-focus', name: 'Product Focus', description: 'Emphasize product differently',
    prompts: [
      'Add a subtle glow/highlight around the product',
      'Zoom in slightly on the main product',
      'Add a shadow to make product pop',
      'Show product from a slightly different angle',
      'Add lifestyle elements around the product',
    ]
  },
  { 
    id: 'mood-tone', name: 'Mood & Tone', description: 'Change emotional feel',
    prompts: [
      'Make the overall mood more energetic and exciting',
      'Apply a calm, relaxing atmosphere',
      'Add urgency with bolder, more dramatic styling',
      'Create a premium, luxurious feel',
      'Make it feel more playful and fun',
    ]
  },
];

const STANDALONE_PROJECT_ID = '00000000-0000-0000-0000-000000000000';

type SourceMode = 'upload' | 'ad-styles' | 'reference-library';

interface GeneratingVariation {
  id: string;
  prompt: string;
  variationType: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  imageUrl?: string;
  error?: string;
}

function useCustomAds() {
  return useQuery({
    queryKey: ['custom-ads-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('custom_ads')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export default function AdVariationsPage() {
  const [sourceMode, setSourceMode] = useState<SourceMode>('upload');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [adContext, setAdContext] = useState('');
  const [variationCount, setVariationCount] = useState(5);
  const [offerImages, setOfferImages] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['color-scheme', 'text-layout', 'cta-button']);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingVariations, setGeneratingVariations] = useState<GeneratingVariation[]>([]);

  // Ad Styles source
  const [selectedStyleIds, setSelectedStyleIds] = useState<string[]>([]);
  const { data: adStyles = [], isLoading: loadingStyles } = useAdStyles();

  // Reference Library source
  const [selectedRefIds, setSelectedRefIds] = useState<string[]>([]);
  const { data: customAds = [], isLoading: loadingRefs } = useCustomAds();

  const { getApiKey } = useGeminiKey();
  const { data: adAssets = [], isLoading: isLoadingAssets, refetch: refetchAssets } = useAssets({ type: 'ad_variation' });
  const deleteAssetMutation = useDeleteAsset();
  const createAssetMutation = useCreateAsset();

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) { toast.error('Please upload an image file'); return; }
      const reader = new FileReader();
      reader.onload = (event) => { setUploadedImage(event.target?.result as string); setUploadedFile(file); };
      reader.readAsDataURL(file);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => { setUploadedImage(event.target?.result as string); setUploadedFile(file); };
      reader.readAsDataURL(file);
    }
  }, []);

  const toggleType = (typeId: string) => {
    setSelectedTypes(prev => prev.includes(typeId) ? prev.filter(t => t !== typeId) : [...prev, typeId]);
  };

  const toggleStyleId = (id: string) => {
    setSelectedStyleIds(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  };

  const toggleRefId = (id: string) => {
    setSelectedRefIds(prev => prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]);
  };

  // Gather all reference image URLs based on source mode
  const getSourceImages = (): string[] => {
    if (sourceMode === 'upload') {
      return uploadedImage ? [uploadedImage] : [];
    }
    if (sourceMode === 'ad-styles') {
      const images: string[] = [];
      for (const styleId of selectedStyleIds) {
        const style = adStyles.find(s => s.id === styleId);
        if (style) {
          if (style.example_image_url) images.push(style.example_image_url);
          if (style.reference_images?.length) images.push(...style.reference_images);
        }
      }
      return images;
    }
    if (sourceMode === 'reference-library') {
      return selectedRefIds.map(id => {
        const ref = customAds.find(a => a.id === id);
        return ref?.file_url;
      }).filter(Boolean) as string[];
    }
    return [];
  };

  const getSourceContext = (): string => {
    if (sourceMode === 'ad-styles') {
      const names = selectedStyleIds.map(id => adStyles.find(s => s.id === id)?.name).filter(Boolean);
      return `Recreate in the style of: ${names.join(', ')}. ${adContext}`;
    }
    return adContext;
  };

  const canGenerate = () => {
    if (selectedTypes.length === 0) return false;
    if (sourceMode === 'upload') return !!uploadedImage;
    if (sourceMode === 'ad-styles') return selectedStyleIds.length > 0;
    if (sourceMode === 'reference-library') return selectedRefIds.length > 0;
    return false;
  };

  const generateSingleVariation = async (
    referenceImages: string[],
    prompt: string,
    variationType: string,
    index: number
  ): Promise<{ success: boolean; imageUrl?: string; error?: string }> => {
    const apiKey = getApiKey() || undefined;
    try {
      const { data, error } = await supabase.functions.invoke('generate-ad-variation', {
        body: {
          imageBase64: null,
          mimeType: 'image/png',
          prompt,
          adContext: getSourceContext(),
          apiKey,
          referenceImages,
          offerImages: offerImages.length > 0 ? offerImages.map(img => img.split(',')[1]) : undefined,
        },
      });

      if (error || data?.error) return { success: false, error: error?.message || data?.error };
      if (!data?.imageBase64) return { success: false, error: 'No image generated' };

      const imageBytes = Uint8Array.from(atob(data.imageBase64), c => c.charCodeAt(0));
      const timestamp = Date.now();
      const variationPath = `ad_variations/${variationType}/${timestamp}-${index}.png`;

      const { error: uploadError } = await supabase.storage
        .from('assets')
        .upload(variationPath, imageBytes, { contentType: data.mimeType || 'image/png', upsert: false });

      if (uploadError) return { success: false, error: 'Upload failed' };

      const { data: urlData } = supabase.storage.from('assets').getPublicUrl(variationPath);
      return { success: true, imageUrl: urlData.publicUrl };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  };

  const generateFromUpload = async (
    prompt: string,
    variationType: string,
    index: number
  ): Promise<{ success: boolean; imageUrl?: string; error?: string }> => {
    if (!uploadedImage) return { success: false, error: 'No image' };
    const apiKey = getApiKey() || undefined;

    try {
      const base64Data = uploadedImage.split(',')[1];
      const mimeType = uploadedFile?.type || 'image/png';

      const { data, error } = await supabase.functions.invoke('generate-ad-variation', {
        body: { imageBase64: base64Data, mimeType, prompt, adContext, apiKey, offerImages: offerImages.length > 0 ? offerImages.map(img => img.split(',')[1]) : undefined },
      });

      if (error || data?.error) return { success: false, error: error?.message || data?.error };
      if (!data?.imageBase64) return { success: false, error: 'No image generated' };

      const imageBytes = Uint8Array.from(atob(data.imageBase64), c => c.charCodeAt(0));
      const variationPath = `ad_variations/${variationType}/${Date.now()}-${index}.png`;

      const { error: uploadError } = await supabase.storage
        .from('assets')
        .upload(variationPath, imageBytes, { contentType: data.mimeType || 'image/png', upsert: false });

      if (uploadError) return { success: false, error: 'Upload failed' };

      const { data: urlData } = supabase.storage.from('assets').getPublicUrl(variationPath);
      return { success: true, imageUrl: urlData.publicUrl };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  };

  const handleGenerate = async () => {
    if (!canGenerate()) { toast.error('Please select a source and variation types'); return; }

    setIsGenerating(true);

    // Build variation prompts
    const allPrompts: { prompt: string; variationType: string }[] = [];
    for (const typeId of selectedTypes) {
      const variationType = VARIATION_TYPES.find(t => t.id === typeId);
      if (variationType) {
        const promptsPerType = Math.ceil(variationCount / selectedTypes.length);
        variationType.prompts.slice(0, promptsPerType).forEach(prompt => {
          allPrompts.push({ prompt, variationType: typeId });
        });
      }
    }
    const selectedPrompts = allPrompts.slice(0, variationCount);

    const initialVariations: GeneratingVariation[] = selectedPrompts.map((p, i) => ({
      id: `var-${i}`, prompt: p.prompt, variationType: p.variationType, status: 'pending',
    }));
    setGeneratingVariations(initialVariations);

    const sourceImages = getSourceImages();

    for (let i = 0; i < selectedPrompts.length; i++) {
      const { prompt, variationType } = selectedPrompts[i];

      setGeneratingVariations(prev => prev.map((v, idx) => idx === i ? { ...v, status: 'generating' } : v));

      let result: { success: boolean; imageUrl?: string; error?: string };

      if (sourceMode === 'upload') {
        result = await generateFromUpload(prompt, variationType, i);
      } else {
        // For ad-styles and reference-library, pass reference images to the generation
        const styleContext = sourceMode === 'ad-styles'
          ? selectedStyleIds.map(id => adStyles.find(s => s.id === id)).filter(Boolean).map(s => `Style: ${s!.name} - ${s!.description}`).join('. ')
          : '';
        const fullPrompt = styleContext ? `${styleContext}. ${prompt}` : prompt;
        result = await generateSingleVariation(sourceImages, fullPrompt, variationType, i);
      }

      if (result.success && result.imageUrl) {
        await createAssetMutation.mutateAsync({
          project_id: STANDALONE_PROJECT_ID,
          type: 'ad_variation',
          name: `${VARIATION_TYPES.find(t => t.id === variationType)?.name} - Variation ${i + 1}`,
          status: 'completed',
          public_url: result.imageUrl,
          metadata: {
            variationType,
            prompt: selectedPrompts[i].prompt,
            sourceMode,
            context: adContext,
          },
        });
        setGeneratingVariations(prev => prev.map((v, idx) => idx === i ? { ...v, status: 'completed', imageUrl: result.imageUrl } : v));
      } else {
        setGeneratingVariations(prev => prev.map((v, idx) => idx === i ? { ...v, status: 'failed', error: result.error } : v));
      }
    }

    toast.success(`Generated ${selectedPrompts.length} ad variations!`);
    refetchAssets();
    setIsGenerating(false);
  };

  const handleDelete = async (asset: Asset) => {
    await deleteAssetMutation.mutateAsync({ id: asset.id, storage_path: asset.storage_path || undefined });
    toast.success('Variation deleted');
  };

  const handleAIEdit = async (asset: Asset, editPrompt: string) => {
    toast.info('AI editing coming soon!');
  };

  const clearUpload = () => { setUploadedImage(null); setUploadedFile(null); setGeneratingVariations([]); };
  const completedCount = generatingVariations.filter(v => v.status === 'completed').length;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Wand2 className="h-6 w-6 text-primary" />
            Ad Variations Generator
          </h1>
          <p className="text-muted-foreground">
            Upload an ad, pick from styles, or choose references to generate variations for A/B testing
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Source Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Source</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Tabs value={sourceMode} onValueChange={(v) => setSourceMode(v as SourceMode)}>
                <TabsList className="w-full">
                  <TabsTrigger value="upload" className="flex-1 gap-1.5">
                    <Upload className="h-3.5 w-3.5" />
                    Upload
                  </TabsTrigger>
                  <TabsTrigger value="ad-styles" className="flex-1 gap-1.5">
                    <Palette className="h-3.5 w-3.5" />
                    Ad Styles
                  </TabsTrigger>
                  <TabsTrigger value="reference-library" className="flex-1 gap-1.5">
                    <Library className="h-3.5 w-3.5" />
                    References
                  </TabsTrigger>
                </TabsList>

                {/* Upload Tab */}
                <TabsContent value="upload" className="mt-4">
                  {!uploadedImage ? (
                    <div
                      onDrop={handleDrop}
                      onDragOver={(e) => e.preventDefault()}
                      className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
                    >
                      <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" id="ad-upload" />
                      <label htmlFor="ad-upload" className="cursor-pointer">
                        <ImagePlus className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-sm font-medium">Drop your ad image here</p>
                        <p className="text-xs text-muted-foreground mt-1">or click to browse</p>
                      </label>
                    </div>
                  ) : (
                    <div className="relative">
                      <img src={uploadedImage} alt="Uploaded ad" className="w-full rounded-lg border border-border" />
                      <Button variant="destructive" size="icon" className="absolute top-2 right-2" onClick={clearUpload}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </TabsContent>

                {/* Ad Styles Tab */}
                <TabsContent value="ad-styles" className="mt-4">
                  {loadingStyles ? (
                    <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">Select styles to use as references</p>
                        <Badge variant="secondary">{selectedStyleIds.length} selected</Badge>
                      </div>
                      <ScrollArea className="h-[360px]">
                        <div className="grid grid-cols-2 gap-2 pr-3">
                          {adStyles.map((style) => {
                            const isSelected = selectedStyleIds.includes(style.id);
                            const refCount = (style.reference_images?.length || 0) + (style.example_image_url ? 1 : 0);
                            return (
                              <button
                                key={style.id}
                                onClick={() => toggleStyleId(style.id)}
                                className={cn(
                                  'relative rounded-lg border p-2 text-left transition-all hover:border-primary/50',
                                  isSelected ? 'border-primary bg-primary/5 ring-1 ring-primary/30' : 'border-border'
                                )}
                              >
                                {isSelected && (
                                  <CheckCircle2 className="absolute top-1.5 right-1.5 h-4 w-4 text-primary" />
                                )}
                                {style.example_image_url ? (
                                  <img src={style.example_image_url} alt={style.name} className="w-full h-20 object-cover rounded mb-1.5" />
                                ) : (
                                  <div className="w-full h-20 bg-muted rounded flex items-center justify-center mb-1.5">
                                    <Palette className="h-5 w-5 text-muted-foreground" />
                                  </div>
                                )}
                                <p className="text-xs font-medium truncate">{style.name}</p>
                                <p className="text-[10px] text-muted-foreground">{refCount} ref image{refCount !== 1 ? 's' : ''}</p>
                              </button>
                            );
                          })}
                        </div>
                      </ScrollArea>
                    </div>
                  )}
                </TabsContent>

                {/* Reference Library Tab */}
                <TabsContent value="reference-library" className="mt-4">
                  {loadingRefs ? (
                    <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                  ) : customAds.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Library className="h-8 w-8 mx-auto mb-2" />
                      <p className="text-sm">No reference ads in your library yet.</p>
                      <p className="text-xs mt-1">Upload references from a client's dashboard.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">Select references to regenerate from</p>
                        <Badge variant="secondary">{selectedRefIds.length} selected</Badge>
                      </div>
                      <ScrollArea className="h-[360px]">
                        <div className="grid grid-cols-3 gap-2 pr-3">
                          {customAds.map((ref) => {
                            const isSelected = selectedRefIds.includes(ref.id);
                            return (
                              <button
                                key={ref.id}
                                onClick={() => toggleRefId(ref.id)}
                                className={cn(
                                  'relative rounded-lg border overflow-hidden transition-all hover:border-primary/50',
                                  isSelected ? 'border-primary ring-1 ring-primary/30' : 'border-border'
                                )}
                              >
                                {isSelected && (
                                  <CheckCircle2 className="absolute top-1 right-1 h-4 w-4 text-primary z-10 drop-shadow" />
                                )}
                                <img src={ref.file_url} alt={ref.name} className="w-full aspect-square object-cover" />
                                <p className="text-[10px] px-1 py-0.5 truncate">{ref.name}</p>
                              </button>
                            );
                          })}
                        </div>
                      </ScrollArea>
                    </div>
                  )}
                </TabsContent>
              </Tabs>

              {/* Context field - always shown */}
              <div className="space-y-2 pt-2 border-t">
                <Label htmlFor="context">Ad Context (Optional)</Label>
                <Textarea
                  id="context"
                  placeholder="Describe your product, target audience, or key message..."
                  value={adContext}
                  onChange={(e) => setAdContext(e.target.value)}
                  rows={2}
                />
              </div>

              {/* Offer Images */}
              <div className="space-y-2 pt-2 border-t">
                <Label>Offer / Product Images (Optional)</Label>
                <p className="text-xs text-muted-foreground">Upload product or offer images so the AI can feature them in the creatives</p>
                <div className="flex flex-wrap gap-2">
                  {offerImages.map((img, idx) => (
                    <div key={idx} className="relative w-20 h-20 rounded-lg border border-border overflow-hidden group">
                      <img src={img} alt={`Offer ${idx + 1}`} className="w-full h-full object-cover" />
                      <button
                        onClick={() => setOfferImages(prev => prev.filter((_, i) => i !== idx))}
                        className="absolute top-0.5 right-0.5 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  <label className="w-20 h-20 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors">
                    <ImagePlus className="h-5 w-5 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground mt-0.5">Add</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        files.forEach(file => {
                          if (file.type.startsWith('image/')) {
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                              setOfferImages(prev => [...prev, ev.target?.result as string]);
                            };
                            reader.readAsDataURL(file);
                          }
                        });
                        e.target.value = '';
                      }}
                    />
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Variation Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Variation Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Number of Variations</Label>
                  <Badge variant="secondary">{variationCount}</Badge>
                </div>
                <Slider
                  value={[variationCount]}
                  onValueChange={([v]) => setVariationCount(v)}
                  min={3}
                  max={10}
                  step={1}
                  disabled={isGenerating}
                />
              </div>

              <div className="space-y-3">
                <Label>What to Test</Label>
                <div className="grid grid-cols-2 gap-2">
                  {VARIATION_TYPES.map((type) => (
                    <label
                      key={type.id}
                      className={cn(
                        'flex items-start gap-2 p-3 border rounded-lg cursor-pointer transition-colors',
                        selectedTypes.includes(type.id)
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      )}
                    >
                      <Checkbox
                        checked={selectedTypes.includes(type.id)}
                        onCheckedChange={() => toggleType(type.id)}
                        disabled={isGenerating}
                      />
                      <div className="min-w-0">
                        <p className="font-medium text-sm leading-tight">{type.name}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">{type.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t">
                <Button 
                  onClick={handleGenerate}
                  disabled={!canGenerate() || isGenerating}
                  className="w-full"
                  size="lg"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating {completedCount}/{variationCount}...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate {variationCount} Variations
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Live Generation Progress */}
        {generatingVariations.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <RefreshCw className={cn("h-4 w-4", isGenerating && "animate-spin")} />
                  Generating Variations
                </span>
                <Badge variant="secondary">{completedCount}/{generatingVariations.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {generatingVariations.map((variation, index) => {
                  const variationType = VARIATION_TYPES.find(t => t.id === variation.variationType);
                  return (
                    <div
                      key={variation.id}
                      className={cn(
                        'aspect-square rounded-lg border overflow-hidden relative',
                        variation.status === 'generating' && 'ring-2 ring-primary',
                        variation.status === 'failed' && 'border-destructive'
                      )}
                    >
                      {variation.imageUrl ? (
                        <img src={variation.imageUrl} alt={`Variation ${index + 1}`} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-muted flex flex-col items-center justify-center p-2">
                          {variation.status === 'generating' ? (
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                          ) : variation.status === 'pending' ? (
                            <span className="text-xs text-muted-foreground">Pending</span>
                          ) : (
                            <X className="h-6 w-6 text-destructive" />
                          )}
                        </div>
                      )}
                      <div className="absolute bottom-1 left-1 right-1">
                        <Badge variant={variation.status === 'completed' ? 'secondary' : 'outline'} className="text-xs w-full justify-center truncate">
                          {variation.status === 'completed' && <Check className="h-3 w-3 mr-1" />}
                          {variationType?.name || variation.variationType}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Saved Variations */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span>Saved Variations</span>
              <Badge variant="secondary">{adAssets.length} saved</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AssetGrid
              assets={adAssets}
              isLoading={isLoadingAssets}
              onDelete={handleDelete}
              onAIEdit={handleAIEdit}
              emptyTitle="No variations yet"
              emptyDescription="Upload an ad and generate variations for A/B testing"
              emptyIcon={<Wand2 className="h-8 w-8 text-muted-foreground" />}
            />
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
