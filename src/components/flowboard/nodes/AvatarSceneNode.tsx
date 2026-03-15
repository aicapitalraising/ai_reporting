import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { User, Loader2, CheckCircle, AlertCircle, Play } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { AvatarSceneData } from '@/types/flowboard';
import { ANGLE_PRESETS } from '@/hooks/useAvatarGeneration';
import { cn } from '@/lib/utils';
import { NodeDeleteButton } from './NodeDeleteButton';

function AvatarSceneNodeComponent({ id, data, selected }: NodeProps) {
  const nodeData = data as AvatarSceneData;
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'generating':
        return <Loader2 className="h-3 w-3 animate-spin text-primary" />;
      case 'completed':
        return <CheckCircle className="h-3 w-3 text-green-500" />;
      case 'failed':
        return <AlertCircle className="h-3 w-3 text-destructive" />;
      default:
        return <Play className="h-3 w-3 text-muted-foreground" />;
    }
  };

  const completedScenes = nodeData.scenes?.filter(s => s.status === 'completed').length || 0;
  const totalScenes = nodeData.scenes?.length || 4;

  return (
    <div
      className={cn(
        'bg-card border-2 rounded-xl shadow-lg min-w-[280px] transition-all relative group/node',
        selected ? 'border-pink-500 shadow-pink-500/20' : 'border-border',
        nodeData.status === 'generating' && 'border-pink-500/50 animate-pulse'
      )}
    >
      <NodeDeleteButton nodeId={id} onDelete={nodeData.onDeleteNode} />
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-pink-500 !border-2 !border-background"
      />

      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border">
        <div className="p-2 rounded-lg bg-pink-500/10">
          <User className="h-5 w-5 text-pink-500" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <span className="font-medium text-sm">{nodeData.label}</span>
            <Badge variant="secondary" className="text-xs">
              {completedScenes}/{totalScenes}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">Multi-angle video scenes</p>
        </div>
      </div>

      {/* Avatar Preview */}
      {nodeData.avatarImageUrl ? (
        <div className="p-3 border-b border-border">
          <div className="flex items-center gap-3">
            <img 
              src={nodeData.avatarImageUrl} 
              alt={nodeData.avatarName || 'Avatar'} 
              className="w-12 h-12 rounded-lg object-cover"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{nodeData.avatarName || 'Selected Avatar'}</p>
              <p className="text-xs text-muted-foreground">Identity locked</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-3 border-b border-border">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-dashed">
            <User className="h-6 w-6 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Connect avatar image</span>
          </div>
        </div>
      )}

      {/* Scene Grid */}
      <div className="p-3">
        <div className="grid grid-cols-2 gap-2">
          {nodeData.scenes?.map((scene) => {
            const angleConfig = ANGLE_PRESETS.find(a => a.type === scene.angle);
            return (
              <div 
                key={scene.id}
                className={cn(
                  'p-2 rounded-lg border text-xs transition-all',
                  scene.status === 'completed' 
                    ? 'bg-green-500/10 border-green-500/30'
                    : scene.status === 'generating'
                    ? 'bg-pink-500/10 border-pink-500/30 animate-pulse'
                    : scene.status === 'failed'
                    ? 'bg-destructive/10 border-destructive/30'
                    : 'bg-muted/50 border-border'
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium flex items-center gap-1">
                    <span>{angleConfig?.icon}</span>
                    {angleConfig?.label || scene.angle}
                  </span>
                  {getStatusIcon(scene.status)}
                </div>
                {scene.generatedImageUrl && (
                  <img 
                    src={scene.generatedImageUrl} 
                    alt={scene.angle} 
                    className="w-full aspect-video rounded object-cover mt-1"
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Error Display */}
      {nodeData.error && (
        <div className="px-4 pb-3">
          <div className="text-xs text-destructive bg-destructive/10 rounded-md px-2 py-1 truncate">
            {nodeData.error}
          </div>
        </div>
      )}

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-pink-500 !border-2 !border-background"
      />
    </div>
  );
}

export const AvatarSceneNode = memo(AvatarSceneNodeComponent);
