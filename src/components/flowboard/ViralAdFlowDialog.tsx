import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Loader2, Flame, Sparkles, Monitor, Smartphone, ArrowLeft, Check } from 'lucide-react';
import { useAvatars, useStockAvatars } from '@/hooks/useAvatars';
import { useAvatarLooks } from '@/hooks/useAvatarLooks';
import { supabase } from '@/integrations/supabase/client';
import { getStoredKeys } from '@/hooks/useApiRateLimiter';
import { toast } from 'sonner';
import type { FlowNode, FlowEdge, VideoAspectRatio, VideoModel } from '@/types/flowboard';
import {
  createImageToVideoData,
  createVideoGeneratorData,
  createSceneCombinerData,
} from '@/types/flowboard';

interface AdHook {
  hookText: string;
  durationSeconds: number;
  speakerState: 'problem' | 'solution' | 'authority' | 'contrarian';
  stateExplanation: string;
  suggestedPersona: string;
  suggestedEnvironment: string;
}

const STATE_COLORS: Record<string, string> = {
  problem: 'bg-red-500/20 text-red-400 border-red-500/30',
  solution: 'bg-green-500/20 text-green-400 border-green-500/30',
  authority: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  contrarian: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
};

const VIDEO_MODEL_OPTIONS: { value: VideoModel; label: string }[] = [
  { value: 'veo3', label: 'VEO 3' },
  { value: 'grok', label: 'Grok' },
];

interface ViralAdFlowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId?: string;
  onFlowGenerated: (nodes: FlowNode[], edges: FlowEdge[]) => void;
}

type Step = 'input' | 'hooks' | 'build';

export function ViralAdFlowDialog({
  open,
  onOpenChange,
  clientId,
  onFlowGenerated,
}: ViralAdFlowDialogProps) {
  // Step state
  const [step, setStep] = useState<Step>('input');

  // Phase 1: Hook generation inputs
  const [productName, setProductName] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [painPoints, setPainPoints] = useState('');
  const [benefits, setBenefits] = useState('');
  const [usp, setUsp] = useState('');
  const [offerCategory, setOfferCategory] = useState('');
  const [isGeneratingHooks, setIsGeneratingHooks] = useState(false);
  const [hooks, setHooks] = useState<AdHook[]>([]);

  // Phase 2: Flow build inputs
  const [selectedHook, setSelectedHook] = useState<AdHook | null>(null);
  const [selectedAvatarId, setSelectedAvatarId] = useState('');
  const [selectedLookId, setSelectedLookId] = useState('');
  const [aspectRatio, setAspectRatio] = useState<VideoAspectRatio>('9:16');
  const [videoModel, setVideoModel] = useState<VideoModel>('veo3');
  const [icpDetail, setIcpDetail] = useState('');
  const [isBuilding, setIsBuilding] = useState(false);

  // Avatar data
  const { data: clientAvatars = [] } = useAvatars(clientId);
  const { data: stockAvatars = [] } = useStockAvatars();
  const { data: looks = [] } = useAvatarLooks(selectedAvatarId || null);
  const allAvatars = [...stockAvatars, ...clientAvatars.filter(a => !a.is_stock)];
  const selectedAvatar = allAvatars.find(a => a.id === selectedAvatarId);
  const selectedLook = looks.find(l => l.id === selectedLookId);
  const avatarImageUrl = selectedLook?.image_url || selectedAvatar?.image_url;

  const getApiKey = () => {
    const geminiKeys = getStoredKeys('gemini');
    return geminiKeys.find(k => k.key.trim())?.key || undefined;
  };

  // Phase 1: Generate hooks
  const handleGenerateHooks = async () => {
    if (!productName.trim() || !targetAudience.trim()) {
      toast.error('Product name and target audience are required');
      return;
    }
    const apiKey = getApiKey();

    setIsGeneratingHooks(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-ad-hooks', {
        body: { productName, targetAudience, painPoints, benefits, usp, offerCategory, apiKey },
      });
      if (error) throw error;
      if (!data.hooks || !Array.isArray(data.hooks)) throw new Error('Invalid response');
      setHooks(data.hooks);
      setStep('hooks');
      toast.success(`Generated ${data.hooks.length} hooks`);
    } catch (err) {
      console.error('Hook generation error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to generate hooks');
    } finally {
      setIsGeneratingHooks(false);
    }
  };

  // Select a hook and move to build step
  const handleSelectHook = (hook: AdHook) => {
    setSelectedHook(hook);
    setStep('build');
  };

  // Phase 2: Build viral ad flow
  const handleBuildFlow = async () => {
    if (!selectedHook) return;
    const apiKey = getApiKey();

    setIsBuilding(true);
    try {
      const avatarDesc = selectedAvatar
        ? `${selectedAvatar.name}, ${selectedAvatar.gender || 'person'}, ${selectedAvatar.ethnicity || ''}, ${selectedAvatar.style || 'ugc'} style`
        : selectedHook.suggestedPersona;

      const { data: breakdown, error } = await supabase.functions.invoke('generate-viral-ad-breakdown', {
        body: {
          hookText: selectedHook.hookText,
          hookDuration: selectedHook.durationSeconds,
          speakerState: selectedHook.speakerState,
          icpDescription: icpDetail || targetAudience,
          offerContext: `${productName} - ${usp}`,
          avatarDescription: avatarDesc,
          apiKey,
        },
      });
      if (error) throw error;
      if (!breakdown.talkingCharacter || !breakdown.brollClips) throw new Error('Invalid breakdown');

      // Build nodes
      const nodes: FlowNode[] = [];
      const edges: FlowEdge[] = [];
      const xStart = 100;
      const yRow1 = 80;
      const yRow2 = 500;
      const yRow3 = 920;
      const colSpacing = 320;

      // Row 1: Talking Character I2V node
      const talkingId = `i2v-talk-${Date.now()}`;
      const talkingData = createImageToVideoData();
      talkingData.prompt = breakdown.talkingCharacter.prompt;
      talkingData.duration = (selectedHook.durationSeconds as 4 | 6 | 8) || 8;
      talkingData.aspectRatio = aspectRatio;
      talkingData.cameraMotion = 'none';
      talkingData.videoModel = videoModel;
      talkingData.label = 'Talking Character';

      const talkingExtData: Record<string, unknown> = { ...talkingData };
      if (selectedAvatar) {
        talkingExtData.avatarId = selectedAvatar.id;
        talkingExtData.avatarName = selectedAvatar.name;
        talkingExtData.avatarImageUrl = avatarImageUrl;
        talkingExtData.inputImageUrl = avatarImageUrl;
        if (selectedLookId) talkingExtData.selectedLookId = selectedLookId;
      }

      nodes.push({
        id: talkingId,
        type: 'image-to-video',
        position: { x: xStart, y: yRow1 },
        data: talkingExtData,
      } as FlowNode);

      // Row 2: B-Roll video-generator nodes
      const brollClips = breakdown.brollClips as Array<{
        startTime: number;
        endTime: number;
        matchedWords: string;
        prompt: string;
        description: string;
        visualCategory: string;
      }>;

      brollClips.forEach((clip, i) => {
        const brollId = `broll-${Date.now()}-${i}`;
        const brollData = createVideoGeneratorData();
        brollData.prompt = clip.prompt;
        brollData.aspectRatio = aspectRatio;
        brollData.duration = 4; // minimum Veo3 duration for b-roll
        brollData.label = `B-Roll ${i + 1} (${clip.startTime}-${clip.endTime}s)`;

        nodes.push({
          id: brollId,
          type: 'video-generator',
          position: { x: xStart + i * colSpacing, y: yRow2 },
          data: brollData,
        } as FlowNode);
      });

      // Row 3: Scene Combiner
      const combinerId = `combiner-${Date.now()}`;
      const combinerData = createSceneCombinerData();
      combinerData.transitionType = 'cut';
      combinerData.transitionDuration = 0;
      combinerData.label = 'B-Roll Combiner';

      const totalBrollWidth = (brollClips.length - 1) * colSpacing;
      const centerX = xStart + totalBrollWidth / 2;

      nodes.push({
        id: combinerId,
        type: 'scene-combiner',
        position: { x: centerX - 130, y: yRow3 },
        data: combinerData,
      } as FlowNode);

      // Connect all B-roll nodes to combiner
      nodes
        .filter(n => n.type === 'video-generator')
        .forEach(n => {
          edges.push({
            id: `edge-${n.id}-${combinerId}`,
            source: n.id,
            target: combinerId,
          });
        });

      onFlowGenerated(nodes, edges);
      onOpenChange(false);
      toast.success(`Viral ad flow created: 1 talking character + ${brollClips.length} B-roll clips`);

      // Reset
      setStep('input');
      setHooks([]);
      setSelectedHook(null);
    } catch (err) {
      console.error('Build flow error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to build flow');
    } finally {
      setIsBuilding(false);
    }
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setStep('input');
      setHooks([]);
      setSelectedHook(null);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-400" />
            Viral Ad Hook Builder
          </DialogTitle>
          <DialogDescription>
            {step === 'input' && 'Enter your offer details to generate 50 scroll-stopping ad hooks'}
            {step === 'hooks' && 'Select a hook to build into a complete video ad flow'}
            {step === 'build' && 'Configure avatar and settings, then build your viral ad flow'}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-2">
          {/* Step 1: Product Input */}
          {step === 'input' && (
            <div className="space-y-4 pb-4">
              <div className="space-y-2">
                <Label>Product / Service Name *</Label>
                <Input value={productName} onChange={e => setProductName(e.target.value)} placeholder="e.g. Brain Reset Program" />
              </div>
              <div className="space-y-2">
                <Label>Target Audience *</Label>
                <Input value={targetAudience} onChange={e => setTargetAudience(e.target.value)} placeholder="e.g. 35-50 year old professionals" />
              </div>
              <div className="space-y-2">
                <Label>Pain Points</Label>
                <Textarea value={painPoints} onChange={e => setPainPoints(e.target.value)} placeholder="Comma-separated pain points..." className="min-h-[80px]" />
              </div>
              <div className="space-y-2">
                <Label>Key Benefits</Label>
                <Textarea value={benefits} onChange={e => setBenefits(e.target.value)} placeholder="Comma-separated benefits..." className="min-h-[80px]" />
              </div>
              <div className="space-y-2">
                <Label>Unique Selling Proposition</Label>
                <Input value={usp} onChange={e => setUsp(e.target.value)} placeholder="What makes this unique?" />
              </div>
              <div className="space-y-2">
                <Label>Offer Category</Label>
                <Select value={offerCategory} onValueChange={setOfferCategory}>
                  <SelectTrigger><SelectValue placeholder="Select category..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="make-money-online">Make Money Online</SelectItem>
                    <SelectItem value="health-fitness">Health & Fitness</SelectItem>
                    <SelectItem value="business-marketing">Business & Marketing</SelectItem>
                    <SelectItem value="real-estate">Real Estate</SelectItem>
                    <SelectItem value="dating-relationships">Dating & Relationships</SelectItem>
                    <SelectItem value="insurance-financial">Insurance & Financial</SelectItem>
                    <SelectItem value="home-services">Home Services</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleGenerateHooks} disabled={isGeneratingHooks || !productName.trim() || !targetAudience.trim()} className="w-full gap-2" size="lg">
                {isGeneratingHooks ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />Generating 50 Hooks...</>
                ) : (
                  <><Sparkles className="h-4 w-4" />Generate 50 Ad Hooks</>
                )}
              </Button>
            </div>
          )}

          {/* Step 2: Hook Selection */}
          {step === 'hooks' && (
            <div className="space-y-3 pb-4">
              <Button variant="ghost" size="sm" onClick={() => setStep('input')} className="gap-1 mb-2">
                <ArrowLeft className="h-3 w-3" /> Back to Input
              </Button>
              <p className="text-xs text-muted-foreground">{hooks.length} hooks generated — select one to build</p>
              {hooks.map((hook, i) => (
                <button
                  key={i}
                  onClick={() => handleSelectHook(hook)}
                  className={`w-full text-left p-3 rounded-lg border transition-all hover:border-primary/50 hover:bg-accent/50 ${
                    selectedHook?.hookText === hook.hookText ? 'border-primary bg-accent/50' : 'border-border'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-xs text-muted-foreground font-mono mt-0.5">#{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-snug">"{hook.hookText}"</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <Badge variant="outline" className={`text-[10px] ${STATE_COLORS[hook.speakerState] || ''}`}>
                          {hook.speakerState}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">{hook.durationSeconds}s</span>
                        <span className="text-[10px] text-muted-foreground">• {Math.ceil(hook.durationSeconds / 2)} B-roll clips</span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Step 3: Build Configuration */}
          {step === 'build' && selectedHook && (
            <div className="space-y-4 pb-4">
              <Button variant="ghost" size="sm" onClick={() => setStep('hooks')} className="gap-1">
                <ArrowLeft className="h-3 w-3" /> Back to Hooks
              </Button>

              {/* Selected hook */}
              <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                <p className="text-sm font-medium">"{selectedHook.hookText}"</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className={`text-[10px] ${STATE_COLORS[selectedHook.speakerState]}`}>
                    {selectedHook.speakerState}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{selectedHook.durationSeconds}s • {Math.ceil(selectedHook.durationSeconds / 2)} B-roll clips</span>
                </div>
              </div>

              {/* Avatar Selection */}
              <div className="space-y-2">
                <Label>Avatar (Talking Character)</Label>
                <Select value={selectedAvatarId} onValueChange={v => { setSelectedAvatarId(v); setSelectedLookId(''); }}>
                  <SelectTrigger><SelectValue placeholder="Choose avatar..." /></SelectTrigger>
                  <SelectContent>
                    {allAvatars.map(avatar => (
                      <SelectItem key={avatar.id} value={avatar.id}>
                        <div className="flex items-center gap-2">
                          <img src={avatar.image_url} alt={avatar.name} className="w-5 h-5 rounded-full object-cover" />
                          <span>{avatar.name}</span>
                          {avatar.is_stock && <Badge variant="secondary" className="text-[9px]">Stock</Badge>}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Look Selection */}
              {selectedAvatarId && looks.length > 0 && (
                <div className="space-y-2">
                  <Label>Avatar Look</Label>
                  <div className="flex gap-2 flex-wrap">
                    {looks.map(look => (
                      <button
                        key={look.id}
                        onClick={() => setSelectedLookId(look.id === selectedLookId ? '' : look.id)}
                        className={`relative w-14 h-18 rounded-lg overflow-hidden flex-shrink-0 transition-all border-2 ${
                          selectedLookId === look.id ? 'border-primary' : 'border-transparent opacity-60 hover:opacity-100'
                        }`}
                      >
                        <img src={look.image_url} alt="Look" className="w-full h-full object-cover" />
                        {look.angle && (
                          <span className="absolute bottom-0 left-0 right-0 text-[8px] bg-black/60 text-white text-center">{look.angle}</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Aspect Ratio */}
              <div className="space-y-2">
                <Label>Aspect Ratio</Label>
                <div className="flex gap-2">
                  <Button type="button" variant={aspectRatio === '9:16' ? 'default' : 'outline'} className="flex-1 gap-2" onClick={() => setAspectRatio('9:16')}>
                    <Smartphone className="h-4 w-4" /> 9:16
                  </Button>
                  <Button type="button" variant={aspectRatio === '16:9' ? 'default' : 'outline'} className="flex-1 gap-2" onClick={() => setAspectRatio('16:9')}>
                    <Monitor className="h-4 w-4" /> 16:9
                  </Button>
                </div>
              </div>

              {/* Video Model */}
              <div className="space-y-2">
                <Label>Video Model</Label>
                <Select value={videoModel} onValueChange={v => setVideoModel(v as VideoModel)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {VIDEO_MODEL_OPTIONS.map(m => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Optional ICP detail */}
              <div className="space-y-2">
                <Label>ICP Detail (Optional)</Label>
                <Input value={icpDetail} onChange={e => setIcpDetail(e.target.value)} placeholder="Additional character/audience details..." />
              </div>

              {/* Build */}
              <Button onClick={handleBuildFlow} disabled={isBuilding} className="w-full gap-2" size="lg">
                {isBuilding ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />Building Viral Ad Flow...</>
                ) : (
                  <><Flame className="h-4 w-4" />Build Viral Ad Flow</>
                )}
              </Button>

              {/* Flow preview */}
              <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
                <p className="font-medium mb-1">Flow will create:</p>
                <ul className="space-y-0.5">
                  <li className="flex items-center gap-1"><Check className="h-3 w-3 text-green-400" /> 1× Talking Character (I2V, {selectedHook.durationSeconds}s)</li>
                  <li className="flex items-center gap-1"><Check className="h-3 w-3 text-green-400" /> {Math.ceil(selectedHook.durationSeconds / 2)}× B-Roll clips (video-gen, ~2s each)</li>
                  <li className="flex items-center gap-1"><Check className="h-3 w-3 text-green-400" /> 1× Scene Combiner (stitches B-roll)</li>
                </ul>
              </div>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
