import { memo, useState, useEffect } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Film, Check, Loader2, AlertCircle, Download, User, Scissors } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import type { ImageToVideoNode as ImageToVideoNodeType, VideoDuration, CameraMotion } from '@/types/flowboard';
import { cn } from '@/lib/utils';
import { NodeDeleteButton } from './NodeDeleteButton';
import { isGoogleApiUrl, fetchVideoViaProxy } from '@/lib/video-proxy';

type ImageToVideoNodeProps = NodeProps<ImageToVideoNodeType>;

const CAMERA_MOTIONS: { value: CameraMotion; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'pan-left', label: 'Pan Left' },
  { value: 'pan-right', label: 'Pan Right' },
  { value: 'zoom-in', label: 'Zoom In' },
  { value: 'zoom-out', label: 'Zoom Out' },
  { value: 'orbit', label: 'Orbit' },
];

export const ImageToVideoNode = memo(({ id, data, selected }: ImageToVideoNodeProps) => {
  const navigate = useNavigate();
  const isCompleted = data.status === 'completed';
  const isGenerating = data.status === 'generating';
  const isFailed = data.status === 'failed';
  const avatarName = (data as any).avatarName;
  const avatarImageUrl = (data as any).avatarImageUrl;
  const aspectRatio = data.aspectRatio || '9:16';
  const isVertical = aspectRatio === '9:16';

  // Display the input image - either from upstream connection or selected avatar
  const displayImageUrl = data.inputImageUrl || avatarImageUrl;

  // Proxy Google API video URLs for playback
  const [playableVideoUrl, setPlayableVideoUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!data.generatedVideoUrl) { setPlayableVideoUrl(null); return; }
    if (isGoogleApiUrl(data.generatedVideoUrl)) {
      fetchVideoViaProxy(data.generatedVideoUrl).then(setPlayableVideoUrl).catch(() => setPlayableVideoUrl(null));
    } else {
      setPlayableVideoUrl(data.generatedVideoUrl);
    }
  }, [data.generatedVideoUrl]);

  return (
    <div 
      className={cn(
        "w-72 rounded-xl border bg-card shadow-lg transition-all relative group/node",
        selected ? "ring-2 ring-primary border-primary" : "border-border",
        isCompleted && "border-emerald-500/50"
      )}
    >
      <NodeDeleteButton nodeId={id} onDelete={data.onDeleteNode} />
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-primary !border-2 !border-background"
      />

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30 rounded-t-xl">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-secondary text-secondary-foreground">
            <Film className="h-4 w-4" />
          </div>
          <div>
            <span className="font-medium text-sm text-foreground block">Image to Video</span>
            {avatarName && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <User className="h-2.5 w-2.5" /> {avatarName}
              </span>
            )}
          </div>
        </div>
        {isCompleted && (
          <div className="p-1 rounded-full bg-emerald-500/20">
            <Check className="h-3.5 w-3.5 text-emerald-400" />
          </div>
        )}
        {isGenerating && (
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
        )}
        {isFailed && (
          <AlertCircle className="h-4 w-4 text-destructive" />
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Input image preview */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <span className="text-primary">●</span> Input Image *
          </label>
          {displayImageUrl ? (
            <div className={cn(
              "relative rounded-lg overflow-hidden bg-muted",
              isVertical ? "aspect-[9/16]" : "aspect-video"
            )}>
              <img 
                src={displayImageUrl} 
                alt="Input" 
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className={cn(
              "rounded-lg border-2 border-dashed border-border flex items-center justify-center text-xs text-muted-foreground",
              isVertical ? "aspect-[9/16]" : "aspect-video"
            )}>
              Connect image node or select avatar
            </div>
          )}
        </div>

        {/* Prompt */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Motion Prompt</label>
          <Textarea
            value={data.prompt}
            placeholder="Describe the motion..."
            className="min-h-[40px] text-xs resize-none nodrag"
            readOnly
          />
        </div>

        {/* Duration */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Duration</label>
          <Select value={String(data.duration)} disabled>
            <SelectTrigger className="h-8 text-xs nodrag">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {([4, 6, 8] as VideoDuration[]).map((dur) => (
                <SelectItem key={dur} value={String(dur)}>{dur} seconds</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Camera Motion */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Camera Motion</label>
          <Select value={data.cameraMotion} disabled>
            <SelectTrigger className="h-8 text-xs nodrag">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CAMERA_MOTIONS.map((motion) => (
                <SelectItem key={motion.value} value={motion.value}>{motion.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Credits indicator */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="text-primary">🔵</span>
          <span>5 credits/{data.duration}s clip</span>
        </div>

        {/* Aspect Ratio Badge */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="font-medium">Aspect:</span>
          <span className="bg-muted px-1.5 py-0.5 rounded text-[10px] font-mono">{aspectRatio}</span>
        </div>

        {/* Generated Preview */}
        {playableVideoUrl && (
          <div className="space-y-2">
            <div className={cn(
              "relative rounded-lg overflow-hidden bg-black",
              isVertical ? "aspect-[9/16]" : "aspect-video"
            )}>
              <video 
                src={playableVideoUrl} 
                controls
                className="w-full h-full object-contain"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1 text-xs nodrag" asChild>
                <a href={playableVideoUrl} download target="_blank" rel="noopener noreferrer">
                  <Download className="h-3 w-3 mr-1" />
                  Download
                </a>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs nodrag"
                onClick={() => navigate(`/video-editor?src=${encodeURIComponent(playableVideoUrl!)}&ar=${data.aspectRatio}`)}
              >
                <Scissors className="h-3 w-3 mr-1" />
                Editor
              </Button>
            </div>
          </div>
        )}

        {/* Loading indicator when video URL exists but proxy hasn't resolved yet */}
        {data.generatedVideoUrl && !playableVideoUrl && isCompleted && (
          <div className="flex items-center justify-center p-4 rounded-lg bg-muted/50">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mr-2" />
            <span className="text-xs text-muted-foreground">Loading preview...</span>
          </div>
        )}

        {/* Error display */}
        {data.error && (
          <div className="text-xs text-destructive bg-destructive/10 rounded-lg p-2">
            {data.error}
          </div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-primary !border-2 !border-background"
      />
    </div>
  );
});

ImageToVideoNode.displayName = 'ImageToVideoNode';
