import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Image, Check, Loader2, AlertCircle, Download } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import type { ImageGeneratorNode as ImageGeneratorNodeType, NODE_CREDITS, ImageAspectRatio, OutputFormat } from '@/types/flowboard';
import { cn } from '@/lib/utils';
import { NodeDeleteButton } from './NodeDeleteButton';

type ImageGeneratorNodeProps = NodeProps<ImageGeneratorNodeType>;

export const ImageGeneratorNode = memo(({ id, data, selected }: ImageGeneratorNodeProps) => {
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
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30 rounded-t-xl">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/20 text-primary">
            <Image className="h-4 w-4" />
          </div>
          <span className="font-medium text-sm text-foreground">Gemini Image</span>
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
            placeholder="Describe the image to generate..."
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
              {(['1:1', '4:5', '9:16', '16:9'] as ImageAspectRatio[]).map((ratio) => (
                <SelectItem key={ratio} value={ratio}>{ratio}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Output Format */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Output Format</label>
          <Select value={data.outputFormat} disabled>
            <SelectTrigger className="h-8 text-xs nodrag">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(['png', 'jpg'] as OutputFormat[]).map((format) => (
                <SelectItem key={format} value={format}>{format.toUpperCase()}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Credits & Variations indicator */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="text-primary">🔵</span>
            <span>0.28 credits/output</span>
          </span>
          {(data.variationCount || 1) > 1 && (
            <span className="font-medium text-primary">{data.variationCount}x</span>
          )}
        </div>

        {/* Generated Previews */}
        {data.generatedVariations && data.generatedVariations.length > 1 ? (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-1.5">
              {data.generatedVariations.slice(0, 4).map((url, i) => (
                <div key={i} className="relative aspect-square rounded-md overflow-hidden bg-muted">
                  <img src={url} alt={`Var ${i + 1}`} className="w-full h-full object-cover" />
                  <span className="absolute bottom-0.5 left-0.5 text-[8px] bg-background/80 px-1 rounded">{i + 1}</span>
                </div>
              ))}
            </div>
            {data.generatedVariations.length > 4 && (
              <p className="text-[10px] text-muted-foreground text-center">+{data.generatedVariations.length - 4} more in inspector</p>
            )}
          </div>
        ) : data.generatedImageUrl ? (
          <div className="space-y-2">
            <div className="relative aspect-square rounded-lg overflow-hidden bg-muted">
              <img 
                src={data.generatedImageUrl} 
                alt="Generated" 
                className="w-full h-full object-cover"
              />
            </div>
            <Button variant="outline" size="sm" className="w-full text-xs nodrag" asChild>
              <a href={data.generatedImageUrl} download target="_blank" rel="noopener noreferrer">
                <Download className="h-3 w-3 mr-1" />
                Download
              </a>
            </Button>
          </div>
        ) : null}

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

ImageGeneratorNode.displayName = 'ImageGeneratorNode';
