import { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Loader2,
  Sparkles,
  Image as ImageIcon,
  Volume2,
  Shirt,
  Trees,
  Wand2,
  Check,
  X,
  Upload,
  Camera,
  Trash2,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { Avatar, AvatarStyle, GeneratedAngle } from '@/types';
import { useAvatarGeneration } from '@/hooks/useAvatarGeneration';
import { useAvatarLooks, useCreateAvatarLook, useDeleteAvatarLook, useSetPrimaryLook } from '@/hooks/useAvatarLooks';
import { AnglesTab } from './AnglesTab';
import { VoiceTab } from './VoiceTab';
import { LooksTab } from './LooksTab';

// AI Model info
const AI_MODEL_DISPLAY = 'Nano Banana Pro';

// ElevenLabs voices
const ELEVENLABS_VOICES = [
  { id: '', name: 'No Voice' },
  { id: 'CwhRBWXzGAHq8TQ4Fs17', name: 'Roger (Male)' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah (Female)' },
  { id: 'FGY2WhTYpPnrIDTdsKH5', name: 'Laura (Female)' },
  { id: 'IKne3meq5aSn9XLyUdCD', name: 'Charlie (Male)' },
  { id: 'JBFqnCBsd6RMkjVDRZzb', name: 'George (Male)' },
  { id: 'N2lVS1w4EtoT3dr4eOWO', name: 'Callum (Male)' },
  { id: 'SAz9YHcvj6GT2YYXdXww', name: 'River (Non-binary)' },
  { id: 'TX3LPaxmHKxFdv7VOQHJ', name: 'Liam (Male)' },
  { id: 'Xb7hH8MSUJpSbSDYk0k2', name: 'Alice (Female)' },
  { id: 'XrExE9yKIg1WjnnlVkGX', name: 'Matilda (Female)' },
  { id: 'bIHbv24MWmeRgasZH58o', name: 'Will (Male)' },
  { id: 'cgSgspJ2msm6clMCkdW9', name: 'Jessica (Female)' },
  { id: 'cjVigY5qzO86Huf0OWal', name: 'Eric (Male)' },
  { id: 'iP95p4xoKVk53GoZ742B', name: 'Chris (Male)' },
  { id: 'nPczCjzI2devNBz1zQrb', name: 'Brian (Male)' },
  { id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel (Male)' },
  { id: 'pFZP5JQG7iQjIQuC4Bku', name: 'Lily (Female)' },
  { id: 'pqHfZKP75CvOlQylNhV4', name: 'Bill (Male)' },
];

// Preset backgrounds for generation
const BACKGROUND_PRESETS = [
  { id: 'office', name: 'Modern Office', prompt: 'professional modern office with natural lighting, blurred bokeh background' },
  { id: 'outdoor', name: 'Outdoor Nature', prompt: 'natural outdoor setting, soft sunlight, green foliage bokeh' },
  { id: 'studio', name: 'Studio Neutral', prompt: 'clean neutral studio backdrop, soft professional lighting' },
  { id: 'urban', name: 'Urban Street', prompt: 'urban city street background, shallow depth of field, golden hour' },
  { id: 'home', name: 'Cozy Home', prompt: 'warm cozy home interior, natural window light, lifestyle setting' },
  { id: 'cafe', name: 'Coffee Shop', prompt: 'trendy coffee shop interior, warm ambient lighting, bokeh' },
];

// Preset outfits for generation
const OUTFIT_PRESETS = [
  { id: 'business', name: 'Business Formal', prompt: 'wearing professional business attire, blazer and dress shirt' },
  { id: 'casual', name: 'Smart Casual', prompt: 'wearing smart casual clothing, relaxed yet polished' },
  { id: 'athletic', name: 'Athletic Wear', prompt: 'wearing modern athletic apparel, sporty and active' },
  { id: 'creative', name: 'Creative Professional', prompt: 'wearing creative professional attire, artistic yet polished' },
  { id: 'tech', name: 'Tech Startup', prompt: 'wearing tech startup casual, hoodie or modern casual wear' },
  { id: 'luxury', name: 'Luxury Fashion', prompt: 'wearing high-end luxury fashion, designer clothing' },
];

interface AvatarDetailDialogProps {
  avatar: Avatar | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: { id: string; name: string }[];
}

export function AvatarDetailDialog({
  avatar,
  open,
  onOpenChange,
  clients,
}: AvatarDetailDialogProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { generateAvatar, isGenerating: isAiGenerating, hasApiKey } = useAvatarGeneration();

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [voiceId, setVoiceId] = useState('');
  const [style, setStyle] = useState<AvatarStyle>('professional');
  const [clientId, setClientId] = useState<string>('');

  // Persistent looks
  const { data: dbLooks = [], isLoading: isLoadingLooks } = useAvatarLooks(avatar?.id);
  const createLook = useCreateAvatarLook();
  const deleteLookMutation = useDeleteAvatarLook();
  const setPrimaryMutation = useSetPrimaryLook();

  // Selected look for preview
  const [selectedLookIndex, setSelectedLookIndex] = useState(0);

  // Generation state
  const [selectedBackground, setSelectedBackground] = useState<string>('');
  const [selectedOutfit, setSelectedOutfit] = useState<string>('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Build looks list: primary avatar image + db looks
  const looks = avatar ? [
    // The avatar's primary image is always first
    { id: 'primary', image_url: avatar.image_url, is_primary: true, angle: null as string | null, avatar_id: avatar.id },
    ...dbLooks.filter(l => l.image_url !== avatar.image_url), // avoid dupe if primary is also in looks table
  ] : [];

  // Initialize form when avatar changes
  useEffect(() => {
    if (avatar && open) {
      setName(avatar.name);
      setDescription(avatar.description || '');
      setVoiceId(avatar.elevenlabs_voice_id || '');
      setStyle((avatar.style as AvatarStyle) || 'professional');
      setClientId(avatar.client_id || '');
      setSelectedLookIndex(0);
    }
  }, [avatar, open]);

  // Update avatar mutation
  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!avatar) return;
      
      const { error } = await supabase
        .from('avatars')
        .update({
          name,
          description: description || null,
          elevenlabs_voice_id: voiceId || null,
          style,
          client_id: clientId || null,
          is_stock: !clientId,
          looks_count: looks.length,
        })
        .eq('id', avatar.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['avatars'] });
      toast.success('Avatar updated');
      onOpenChange(false);
    },
    onError: () => {
      toast.error('Failed to update avatar');
    },
  });

  // Handle file upload for new look
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !avatar) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const folder = avatar.is_stock ? 'stock-avatars' : `client-avatars/${avatar.client_id || 'unassigned'}`;
      const filePath = `${folder}/${avatar.id}-look-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Save to database
      await createLook.mutateAsync({
        avatar_id: avatar.id,
        image_url: publicUrl,
      });

      toast.success('New look uploaded');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload image');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Generate new look with AI
  const handleGenerate = async () => {
    if (!avatar) return;

    const backgroundPreset = BACKGROUND_PRESETS.find(b => b.id === selectedBackground);
    const outfitPreset = OUTFIT_PRESETS.find(o => o.id === selectedOutfit);

    if (!backgroundPreset && !outfitPreset && !customPrompt) {
      toast.error('Please select a background, outfit, or enter a custom prompt');
      return;
    }

    // API keys are managed server-side

    const combinedPrompt = [
      'CRITICAL: Generate the EXACT SAME PERSON as shown in the reference image.',
      'Maintain IDENTICAL facial features, bone structure, nose shape, eye shape, lip shape, skin tone, and complete identity.',
      'This person MUST be recognizable as the same individual - no variation in facial features.',
      outfitPreset?.prompt,
      customPrompt,
      'This is the same person with optional styling changes applied.',
    ].filter(Boolean).join('. ');

    const result = await generateAvatar({
      gender: avatar.gender || 'female',
      ageRange: avatar.age_range || '26-35',
      ethnicity: avatar.ethnicity || 'caucasian',
      style: (avatar.style as 'professional' | 'casual' | 'ugc') || 'professional',
      background: selectedBackground || 'studio',
      backgroundPrompt: backgroundPreset?.prompt,
      customPrompt: combinedPrompt,
      isStock: avatar.is_stock || false,
      clientId: avatar.client_id || undefined,
      referenceImageUrl: avatar.image_url, // Use base avatar image for identity consistency
    });

    if (result.success && result.imageUrl) {
      // Save to database
      await createLook.mutateAsync({
        avatar_id: avatar.id,
        image_url: result.imageUrl,
        background: selectedBackground || undefined,
        outfit: selectedOutfit || undefined,
      });

      setSelectedBackground('');
      setSelectedOutfit('');
      setCustomPrompt('');
    }
  };

  // Set look as primary
  const handleSetPrimary = (index: number) => {
    const look = looks[index];
    if (!look || !avatar || look.id === 'primary') return;
    
    setPrimaryMutation.mutate({
      lookId: look.id,
      avatarId: avatar.id,
      imageUrl: look.image_url,
    });
  };

  // Delete a look
  const handleDeleteLook = (index: number) => {
    const look = looks[index];
    if (!look || !avatar) return;
    
    if (look.id === 'primary') {
      toast.error('Cannot delete the primary look');
      return;
    }

    if (looks.length <= 1) {
      toast.error('Cannot delete the only look');
      return;
    }

    deleteLookMutation.mutate(
      { id: look.id, avatarId: avatar.id, imageUrl: look.image_url },
      {
        onSuccess: () => {
          toast.success('Look deleted');
          if (selectedLookIndex >= looks.length - 1) {
            setSelectedLookIndex(Math.max(0, looks.length - 2));
          }
        },
      }
    );
  };

  const clientName = clients.find((c) => c.id === avatar?.client_id)?.name;
  const selectedLook = looks[selectedLookIndex];

  // Handle angle generation result - save to DB
  const handleAngleGenerated = async (angle: GeneratedAngle) => {
    if (angle.status === 'completed' && angle.imageUrl && avatar) {
      await createLook.mutateAsync({
        avatar_id: avatar.id,
        image_url: angle.imageUrl,
        angle: angle.angle,
      });
    }
  };

  if (!avatar) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 gap-0 overflow-hidden">
        <div className="flex h-[80vh]">
          {/* Left Panel - Main Preview */}
          <div className="w-1/2 bg-muted/50 relative flex flex-col">
            {/* Main Image */}
            <div className="flex-1 relative">
              <img
                src={selectedLook?.image_url || avatar.image_url}
                alt={avatar.name}
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              
              {/* Model Badge */}
              <div className="absolute top-4 left-4 flex items-center gap-2">
                <Badge variant="secondary" className="bg-primary/90 text-primary-foreground gap-1.5">
                  <Sparkles className="h-3 w-3" />
                  {AI_MODEL_DISPLAY}
                </Badge>
              </div>

              {/* Bottom Info */}
              <div className="absolute bottom-4 left-4 right-4">
                <h2 className="text-white text-2xl font-bold">{name || avatar.name}</h2>
                <p className="text-white/70 text-sm mt-1">
                  {looks.length} look{looks.length !== 1 ? 's' : ''} • {clientName || 'Stock Avatar'}
                </p>
              </div>
            </div>

            {/* Looks Carousel */}
            <div className="p-4 bg-background/95 border-t flex flex-col min-h-0">
              <div className="flex items-center gap-2 mb-2 flex-shrink-0">
                <span className="text-sm font-medium">Looks</span>
                <Badge variant="outline" className="text-xs">{looks.length}</Badge>
                {isLoadingLooks && <Loader2 className="h-3 w-3 animate-spin" />}
              </div>
              <ScrollArea className="w-full flex-1">
                <div className="flex gap-2 pr-4">
                  {looks.map((look, index) => (
                    <div key={look.id} className="relative group flex-shrink-0">
                      <button
                        onClick={() => setSelectedLookIndex(index)}
                        className={cn(
                          'relative w-16 h-20 rounded-lg overflow-hidden transition-all',
                          selectedLookIndex === index
                            ? 'ring-2 ring-primary ring-offset-2'
                            : 'opacity-60 hover:opacity-100'
                        )}
                      >
                        <img
                          src={look.image_url}
                          alt={`Look ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        {look.is_primary && (
                          <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                            <Check className="h-2.5 w-2.5 text-primary-foreground" />
                          </div>
                        )}
                        {look.angle && (
                          <span className="absolute bottom-0 left-0 right-0 text-[8px] bg-black/60 text-white text-center py-0.5">
                            {look.angle}
                          </span>
                        )}
                      </button>
                      {/* Action buttons on hover (not for current primary) */}
                      {look.id !== 'primary' && !look.is_primary && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleSetPrimary(index); }}
                          title="Set as default look"
                          className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground text-[8px] font-medium opacity-0 group-hover:opacity-100 transition-opacity z-10 whitespace-nowrap"
                        >
                          Set Default
                        </button>
                      )}
                      {look.id !== 'primary' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteLook(index); }}
                          className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  ))}
                  
                  {/* Add Look Button */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="w-16 h-20 rounded-lg border-2 border-dashed flex flex-col items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground/50 transition-colors flex-shrink-0"
                  >
                    {isUploading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        <Upload className="h-5 w-5" />
                        <span className="text-[10px] mt-1">Upload</span>
                      </>
                    )}
                  </button>
                </div>
              </ScrollArea>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>
          </div>

          {/* Right Panel - Controls */}
          <div className="w-1/2 flex flex-col min-h-0">
            <DialogHeader className="p-6 pb-4 border-b">
              <DialogTitle>Edit Avatar</DialogTitle>
            </DialogHeader>

            <Tabs defaultValue="generate" className="flex-1 flex flex-col min-h-0">
              <TabsList className="mx-6 mt-4 grid w-auto grid-cols-5 flex-shrink-0">
                <TabsTrigger value="generate" className="gap-1.5 text-xs">
                  <Wand2 className="h-3.5 w-3.5" />
                  Generate
                </TabsTrigger>
                <TabsTrigger value="looks" className="gap-1.5 text-xs">
                  <ImageIcon className="h-3.5 w-3.5" />
                  Looks
                </TabsTrigger>
                <TabsTrigger value="angles" className="gap-1.5 text-xs">
                  <Camera className="h-3.5 w-3.5" />
                  Angles
                </TabsTrigger>
                <TabsTrigger value="voice" className="gap-1.5 text-xs">
                  <Volume2 className="h-3.5 w-3.5" />
                  Voice
                </TabsTrigger>
                <TabsTrigger value="details" className="gap-1.5 text-xs">
                  <Shirt className="h-3.5 w-3.5" />
                  Details
                </TabsTrigger>
              </TabsList>

              <ScrollArea className="flex-1">
                <TabsContent value="generate" className="p-6 space-y-6 m-0">
                  {/* Background Selection */}
                  <div className="space-y-3">
                    <Label className="flex items-center gap-2">
                      <Trees className="h-4 w-4" />
                      Background
                    </Label>
                    <div className="grid grid-cols-3 gap-2">
                      {BACKGROUND_PRESETS.map((bg) => (
                        <button
                          key={bg.id}
                          onClick={() => setSelectedBackground(
                            selectedBackground === bg.id ? '' : bg.id
                          )}
                          className={cn(
                            'p-3 rounded-lg border text-left transition-all',
                            selectedBackground === bg.id
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-border hover:border-foreground/30'
                          )}
                        >
                          <span className="text-sm font-medium">{bg.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Outfit Selection */}
                  <div className="space-y-3">
                    <Label className="flex items-center gap-2">
                      <Shirt className="h-4 w-4" />
                      Outfit
                    </Label>
                    <div className="grid grid-cols-3 gap-2">
                      {OUTFIT_PRESETS.map((outfit) => (
                        <button
                          key={outfit.id}
                          onClick={() => setSelectedOutfit(
                            selectedOutfit === outfit.id ? '' : outfit.id
                          )}
                          className={cn(
                            'p-3 rounded-lg border text-left transition-all',
                            selectedOutfit === outfit.id
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-border hover:border-foreground/30'
                          )}
                        >
                          <span className="text-sm font-medium">{outfit.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom Prompt */}
                  <div className="space-y-3">
                    <Label>Custom Enhancement (Optional)</Label>
                    <Textarea
                      value={customPrompt}
                      onChange={(e) => setCustomPrompt(e.target.value)}
                      placeholder="Add custom details like lighting, pose, or specific styling..."
                      rows={2}
                    />
                  </div>

                  {/* Generate Button */}
                  <Button
                    onClick={handleGenerate}
                    disabled={isAiGenerating || (!selectedBackground && !selectedOutfit && !customPrompt)}
                    className="w-full gap-2"
                    size="lg"
                  >
                    {isAiGenerating ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Generating with {AI_MODEL_DISPLAY}...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Generate New Look
                      </>
                    )}
                  </Button>


                  {/* Model Info */}
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span>
                      Powered by <strong className="text-foreground">{AI_MODEL_DISPLAY}</strong> for hyper-realistic generation
                    </span>
                  </div>

                  {/* Current Look Actions */}
                  {selectedLook && selectedLook.id !== 'primary' && (
                    <div className="flex gap-2 pt-4 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSetPrimary(selectedLookIndex)}
                        className="flex-1 gap-2"
                        disabled={setPrimaryMutation.isPending}
                      >
                        <Check className="h-4 w-4" />
                        Set as Primary
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteLook(selectedLookIndex)}
                        className="gap-2 text-destructive hover:text-destructive"
                        disabled={deleteLookMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="looks" className="p-6 m-0">
                  <LooksTab
                    avatar={avatar}
                    looks={looks}
                    isLoading={isLoadingLooks}
                    onSetPrimary={handleSetPrimary}
                    onDelete={handleDeleteLook}
                    onUpload={() => fileInputRef.current?.click()}
                    isUploading={isUploading}
                    isPrimaryPending={setPrimaryMutation.isPending}
                    isDeletePending={deleteLookMutation.isPending}
                  />
                </TabsContent>

                <TabsContent value="angles" className="p-6 m-0">
                  <AnglesTab avatar={avatar} onAngleGenerated={handleAngleGenerated} />
                </TabsContent>

                <TabsContent value="voice" className="p-6 m-0">
                  <VoiceTab
                    currentVoiceId={voiceId}
                    onVoiceChange={setVoiceId}
                    clientId={avatar.client_id}
                  />
                </TabsContent>

                <TabsContent value="details" className="p-6 space-y-4 m-0">
                  {/* Name */}
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Avatar name"
                    />
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Brief description for prompting context..."
                      rows={2}
                    />
                  </div>

                  {/* Voice - moved to Voice tab */}
                  {voiceId && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 text-sm">
                      <Volume2 className="h-4 w-4 text-primary" />
                      <span>Voice assigned — manage in <strong>Voice</strong> tab</span>
                    </div>
                  )}

                  {/* Style */}
                  <div className="space-y-2">
                    <Label>Style</Label>
                    <Select value={style} onValueChange={(v) => setStyle(v as AvatarStyle)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="professional">Professional</SelectItem>
                        <SelectItem value="casual">Casual</SelectItem>
                        <SelectItem value="ugc">UGC Creator</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Client Assignment */}
                  <div className="space-y-2">
                    <Label>Assigned Client</Label>
                    <Select value={clientId || 'stock'} onValueChange={(v) => setClientId(v === 'stock' ? '' : v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select client..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="stock">Stock (All Clients)</SelectItem>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </TabsContent>
              </ScrollArea>

              {/* Footer */}
              <div className="p-6 border-t flex justify-end gap-2 flex-shrink-0">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => updateMutation.mutate()}
                  disabled={!name || updateMutation.isPending}
                >
                  {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Save Changes
                </Button>
              </div>
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
