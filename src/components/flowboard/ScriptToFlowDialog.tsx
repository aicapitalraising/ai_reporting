import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, Wand2, Monitor, Smartphone } from 'lucide-react';
import { useAvatars, useStockAvatars } from '@/hooks/useAvatars';
import { useAvatarLooks } from '@/hooks/useAvatarLooks';
import { supabase } from '@/integrations/supabase/client';
import { getStoredKeys } from '@/hooks/useApiRateLimiter';
import { toast } from 'sonner';
import type { FlowNode, FlowEdge, VideoAspectRatio, VideoModel } from '@/types/flowboard';
import {
  createImageToVideoData,
  createSceneCombinerData,
} from '@/types/flowboard';

const VIDEO_MODEL_OPTIONS: { value: VideoModel; label: string }[] = [
  { value: 'veo3', label: 'VEO 3' },
  { value: 'grok', label: 'Grok' },
];

interface ScriptToFlowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId?: string;
  onFlowGenerated: (nodes: FlowNode[], edges: FlowEdge[]) => void;
}

export function ScriptToFlowDialog({
  open,
  onOpenChange,
  clientId,
  onFlowGenerated,
}: ScriptToFlowDialogProps) {
  const [script, setScript] = useState('');
  const [selectedAvatarId, setSelectedAvatarId] = useState('');
  const [selectedLookId, setSelectedLookId] = useState('');
  const [aspectRatio, setAspectRatio] = useState<VideoAspectRatio>('16:9');
  const [videoModel, setVideoModel] = useState<VideoModel>('veo3');
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: clientAvatars = [] } = useAvatars(clientId);
  const { data: stockAvatars = [] } = useStockAvatars();
  const { data: looks = [] } = useAvatarLooks(selectedAvatarId || null);

  const allAvatars = [
    ...stockAvatars,
    ...clientAvatars.filter(a => !a.is_stock),
  ];

  const selectedAvatar = allAvatars.find(a => a.id === selectedAvatarId);
  const selectedLook = looks.find(l => l.id === selectedLookId);
  const avatarImageUrl = selectedLook?.image_url || selectedAvatar?.image_url;

  const handleBuildFlow = async () => {
    if (!script.trim() || script.trim().length < 20) {
      toast.error('Please enter a longer script');
      return;
    }

    const geminiKeys = getStoredKeys('gemini');
    const apiKey = geminiKeys.find(k => k.key.trim())?.key || undefined;

    setIsGenerating(true);

    try {
      // 1. Break down script into scenes
      const { data: result, error } = await supabase.functions.invoke('breakdown-script', {
        body: {
          script,
          characterDescription: selectedAvatar
            ? `${selectedAvatar.name}, ${selectedAvatar.gender || 'person'}, ${selectedAvatar.ethnicity || ''}, ${selectedAvatar.style || 'ugc'} style`
            : undefined,
          apiKey,
        },
      });

      if (error) throw error;
      if (!result.scenes || result.scenes.length === 0) throw new Error('No scenes generated');

      const scenes = result.scenes as Array<{
        sceneEnvironment: string;
        action: string;
        lipSyncLine: string;
        cameraAngle: string;
        duration?: number;
      }>;

      // 2. Build flow nodes — I2V nodes left-to-right with avatar pre-selected
      const nodes: FlowNode[] = [];
      const edges: FlowEdge[] = [];
      const xStart = 100;
      const yStart = 100;
      const colSpacing = 320;

      scenes.forEach((scene, i) => {
        const i2vNodeId = `i2v-${Date.now()}-${i}`;

        // Build motion prompt: Lip Sync: "line" / motion / natural actions
        const lipPart = scene.lipSyncLine ? `Lip Sync: "${scene.lipSyncLine}"` : '';
        const motionPart = scene.action || 'Natural movement';
        const promptParts = [lipPart, motionPart, 'natural actions'].filter(Boolean);
        const motionPrompt = promptParts.join(' / ');

        const i2vData = createImageToVideoData();
        i2vData.prompt = motionPrompt;
        i2vData.duration = (scene.duration as 4 | 6 | 8) || 8;
        i2vData.aspectRatio = aspectRatio;
        i2vData.cameraMotion = 'none';
        i2vData.videoModel = videoModel;

        // Pre-select avatar and look on every I2V node
        const extData: Record<string, unknown> = { ...i2vData };
        if (selectedAvatar) {
          extData.avatarId = selectedAvatar.id;
          extData.avatarName = selectedAvatar.name;
          extData.avatarImageUrl = avatarImageUrl;
          extData.inputImageUrl = avatarImageUrl;
          if (selectedLookId) {
            extData.selectedLookId = selectedLookId;
          }
        }

        nodes.push({
          id: i2vNodeId,
          type: 'image-to-video',
          position: { x: xStart + i * colSpacing, y: yStart },
          data: extData,
        } as FlowNode);
      });

      // Scene Combiner below all I2V nodes (centered)
      if (scenes.length > 1) {
        const combinerId = `combiner-${Date.now()}`;
        const combinerData = createSceneCombinerData();
        combinerData.transitionType = 'cut';
        combinerData.transitionDuration = 0;

        const totalWidth = (scenes.length - 1) * colSpacing;
        const centerX = xStart + totalWidth / 2;

        nodes.push({
          id: combinerId,
          type: 'scene-combiner',
          position: { x: centerX - 130, y: yStart + 550 },
          data: combinerData,
        } as FlowNode);

        // Connect all I2V nodes to combiner
        nodes
          .filter(n => n.type === 'image-to-video')
          .forEach(n => {
            edges.push({
              id: `edge-${n.id}-${combinerId}`,
              source: n.id,
              target: combinerId,
            });
          });
      }

      onFlowGenerated(nodes, edges);
      onOpenChange(false);
      toast.success(`Flow generated with ${scenes.length} scenes`);
      
      // Reset
      setScript('');
    } catch (err) {
      console.error('Script-to-flow error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to generate flow');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-primary" />
            Script to Flow
          </DialogTitle>
          <DialogDescription>
            Paste a script and select an avatar to auto-generate a complete video production flow
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Script Input */}
          <div className="space-y-2">
            <Label>Script *</Label>
            <Textarea
              value={script}
              onChange={(e) => setScript(e.target.value)}
              placeholder="Paste your full script here..."
              className="min-h-[150px]"
            />
            {script.trim().length > 0 && (
              <p className="text-xs text-muted-foreground">
                {script.trim().split(/\s+/).length} words
              </p>
            )}
          </div>

          {/* Avatar Selection */}
          <div className="space-y-2">
            <Label>Avatar (Optional)</Label>
            <Select value={selectedAvatarId} onValueChange={(v) => { setSelectedAvatarId(v); setSelectedLookId(''); }}>
              <SelectTrigger>
                <SelectValue placeholder="Choose an avatar..." />
              </SelectTrigger>
              <SelectContent>
                {allAvatars.map((avatar) => (
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
              <ScrollArea className="w-full">
                <div className="flex gap-2">
                  {looks.map((look) => (
                    <button
                      key={look.id}
                      onClick={() => setSelectedLookId(look.id === selectedLookId ? '' : look.id)}
                      className={`relative w-14 h-18 rounded-lg overflow-hidden flex-shrink-0 transition-all border-2 ${
                        selectedLookId === look.id ? 'border-primary' : 'border-transparent opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={look.image_url} alt="Look" className="w-full h-full object-cover" />
                      {look.angle && (
                        <span className="absolute bottom-0 left-0 right-0 text-[8px] bg-black/60 text-white text-center">
                          {look.angle}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Aspect Ratio */}
          <div className="space-y-2">
            <Label>Aspect Ratio</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={aspectRatio === '16:9' ? 'default' : 'outline'}
                className="flex-1 gap-2"
                onClick={() => setAspectRatio('16:9')}
              >
                <Monitor className="h-4 w-4" />
                16:9
              </Button>
              <Button
                type="button"
                variant={aspectRatio === '9:16' ? 'default' : 'outline'}
                className="flex-1 gap-2"
                onClick={() => setAspectRatio('9:16')}
              >
                <Smartphone className="h-4 w-4" />
                9:16
              </Button>
            </div>
          </div>

          {/* Video Model */}
          <div className="space-y-2">
            <Label>Video Model</Label>
            <Select value={videoModel} onValueChange={(v) => setVideoModel(v as VideoModel)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VIDEO_MODEL_OPTIONS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Build Button */}
          <Button
            onClick={handleBuildFlow}
            disabled={isGenerating || script.trim().length < 20}
            className="w-full gap-2"
            size="lg"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Building Flow...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Build Flow from Script
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
