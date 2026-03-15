import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Video, Check, Loader2, AlertCircle, Download, Scissors } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import type { VideoGeneratorNode as VideoGeneratorNodeType, VideoAspectRatio, VideoDuration } from '@/types/flowboard';
import { cn } from '@/lib/utils';
import { NodeDeleteButton } from './NodeDeleteButton';

type VideoGeneratorNodeProps = NodeProps<VideoGeneratorNodeType>;

export const VideoGeneratorNode = memo(({ id, data, selected }: VideoGeneratorNodeProps) => {
  const navigate = useNavigate();
  const isCompleted = data.status === 'completed';
  const isGenerating = data.status === 'generating';
  const isFailed = data.status === 'failed';

  return (
    <div 
      className={cn(
        "w-72 rounded-xl border bg-card shadow-lg transition-all relative group/node",
        selected ? "ring-2 ring-primary border-primary" : "border-border",
        isCompleted && "border-emerald-500/50"
      )}
    >
      <NodeDeleteButton nodeId={id} onDelete={data.onDeleteNode} />
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-primary !border-2 !border-background"
      />

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30 rounded-t-xl">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-secondary text-secondary-foreground">
            <Video className="h-4 w-4" />
          </div>
          <span className="font-medium text-sm text-foreground">Veo 3 Fast</span>
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
        {/* Prompt */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <span className="text-primary">●</span> Prompt *
          </label>
          <Textarea
            value={data.prompt}
            placeholder="Describe the video to generate..."
            className="min-h-[60px] text-xs resize-none nodrag"
            readOnly
          />
        </div>

        {/* Aspect Ratio */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Aspect Ratio</label>
          <Select value={data.aspectRatio} disabled>
            <SelectTrigger className="h-8 text-xs nodrag">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(['16:9', '9:16'] as VideoAspectRatio[]).map((ratio) => (
                <SelectItem key={ratio} value={ratio}>{ratio}</SelectItem>
              ))}
            </SelectContent>
          </Select>
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

        {/* Credits indicator */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="text-primary">🔵</span>
          <span>5 credits/{data.duration}s clip</span>
        </div>

        {/* Input image preview if connected */}
        {data.inputImageUrl && (
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Input Image</label>
            <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
              <img 
                src={data.inputImageUrl} 
                alt="Input" 
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        )}

        {/* Generated Preview */}
        {data.generatedVideoUrl && (
          <div className="space-y-2">
            <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
              <video 
                src={data.generatedVideoUrl} 
                controls
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1 text-xs nodrag" asChild>
                <a href={data.generatedVideoUrl} download target="_blank" rel="noopener noreferrer">
                  <Download className="h-3 w-3 mr-1" />
                  Download
                </a>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs nodrag"
                onClick={() => navigate(`/video-editor?src=${encodeURIComponent(data.generatedVideoUrl!)}&ar=${data.aspectRatio}`)}
              >
                <Scissors className="h-3 w-3 mr-1" />
                Editor
              </Button>
            </div>
          </div>
        )}

        {/* Error display */}
        {data.error && (
          <div className="text-xs text-destructive bg-destructive/10 rounded-lg p-2">
            {data.error}
          </div>
        )}
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-primary !border-2 !border-background"
      />
    </div>
  );
});

VideoGeneratorNode.displayName = 'VideoGeneratorNode';
