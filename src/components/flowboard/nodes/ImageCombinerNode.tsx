import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Layers, Check, Loader2, AlertCircle } from 'lucide-react';
import type { ImageCombinerNode as ImageCombinerNodeType } from '@/types/flowboard';
import { cn } from '@/lib/utils';
import { NodeDeleteButton } from './NodeDeleteButton';

type ImageCombinerNodeProps = NodeProps<ImageCombinerNodeType>;

const COMBINE_MODE_LABELS: Record<string, string> = {
  'blend': 'Blend',
  'replace-background': 'Replace BG',
  'side-by-side': 'Side by Side',
  'overlay': 'Overlay',
};

export const ImageCombinerNode = memo(({ id, data, selected }: ImageCombinerNodeProps) => {
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
      {/* Input Handles */}
      <Handle
        type="target"
        position={Position.Left}
        id="primary"
        style={{ top: '35%' }}
        className="!w-3 !h-3 !bg-pink-400 !border-2 !border-background"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="secondary"
        style={{ top: '65%' }}
        className="!w-3 !h-3 !bg-blue-400 !border-2 !border-background"
      />

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30 rounded-t-xl">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
            <Layers className="h-4 w-4" />
          </div>
          <span className="font-medium text-sm text-foreground">Image Combiner</span>
        </div>
        {isCompleted && (
          <div className="p-1 rounded-full bg-emerald-500/20">
            <Check className="h-3.5 w-3.5 text-emerald-400" />
          </div>
        )}
        {isGenerating && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
        {isFailed && <AlertCircle className="h-4 w-4 text-destructive" />}
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Input previews */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <span className="text-[10px] text-pink-400 font-medium">Primary</span>
            {data.primaryImageUrl ? (
              <div className="aspect-square rounded-md overflow-hidden bg-muted">
                <img src={data.primaryImageUrl} alt="Primary" className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="aspect-square rounded-md bg-muted flex items-center justify-center text-[10px] text-muted-foreground">
                No image
              </div>
            )}
          </div>
          <div className="space-y-1">
            <span className="text-[10px] text-blue-400 font-medium">Secondary</span>
            {data.secondaryImageUrl ? (
              <div className="aspect-square rounded-md overflow-hidden bg-muted">
                <img src={data.secondaryImageUrl} alt="Secondary" className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="aspect-square rounded-md bg-muted flex items-center justify-center text-[10px] text-muted-foreground">
                No image
              </div>
            )}
          </div>
        </div>

        {/* Mode badge */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{COMBINE_MODE_LABELS[data.combineMode] || data.combineMode}</span>
          <span className="flex items-center gap-1.5">
            <span className="text-primary">🔵</span>
            <span>0.28 credits</span>
          </span>
        </div>

        {/* Output */}
        {data.outputImageUrl && (
          <div className="relative aspect-square rounded-lg overflow-hidden bg-muted">
            <img src={data.outputImageUrl} alt="Combined" className="w-full h-full object-cover" />
          </div>
        )}

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

ImageCombinerNode.displayName = 'ImageCombinerNode';
