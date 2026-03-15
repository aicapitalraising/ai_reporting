import { memo, useState, useEffect } from 'react';
import { Handle, Position, NodeProps, useReactFlow } from '@xyflow/react';
import { Zap, Loader2, CheckCircle, AlertCircle, Play, Users, ChevronDown, ChevronRight, ImageIcon, Film, RotateCcw, Download } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { HooksNodeData } from '@/types/flowboard';
import { cn } from '@/lib/utils';
import { NodeDeleteButton } from './NodeDeleteButton';
import { isGoogleApiUrl, fetchVideoViaProxy } from '@/lib/video-proxy';

/** Proxied video player for hooks scenes */
function ProxiedVideo({ url, className }: { url: string; className?: string }) {
  const [playableUrl, setPlayableUrl] = useState<string | null>(null);

  useEffect(() => {
    if (isGoogleApiUrl(url)) {
      fetchVideoViaProxy(url).then(setPlayableUrl).catch(() => setPlayableUrl(null));
    } else {
      setPlayableUrl(url);
    }
  }, [url]);

  if (!playableUrl) {
    return (
      <div className={cn("flex items-center justify-center bg-muted rounded mt-1", className)}>
        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <video src={playableUrl} controls className={cn("rounded mt-1 object-cover", className)} />
      <a href={playableUrl} download target="_blank" rel="noopener noreferrer" className="text-[9px] text-primary hover:underline flex items-center gap-0.5">
        <Download className="h-2.5 w-2.5" /> Download
      </a>
    </div>
  );
}

function HooksNodeComponent({ id, data, selected }: NodeProps) {
  const nodeData = data as HooksNodeData;
  const [expandedTracks, setExpandedTracks] = useState<Set<string>>(new Set());

  const toggleTrack = (avatarId: string) => {
    setExpandedTracks(prev => {
      const next = new Set(prev);
      if (next.has(avatarId)) next.delete(avatarId);
      else next.add(avatarId);
      return next;
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'generating':
        return <Loader2 className="h-3 w-3 animate-spin text-yellow-500" />;
      case 'completed':
        return <CheckCircle className="h-3 w-3 text-green-500" />;
      case 'failed':
        return <AlertCircle className="h-3 w-3 text-destructive" />;
      default:
        return <Play className="h-3 w-3 text-muted-foreground" />;
    }
  };

  const completedTracks = nodeData.tracks?.filter(t => t.overallStatus === 'completed').length || 0;
  const totalTracks = nodeData.avatars?.length || 0;
  const hasTracks = nodeData.tracks && nodeData.tracks.length > 0;

  return (
    <div
      className={cn(
        'bg-card border-2 rounded-xl shadow-lg min-w-[320px] max-w-[420px] transition-all relative group/node',
        selected ? 'border-yellow-500 shadow-yellow-500/20' : 'border-border',
        nodeData.status === 'generating' && 'border-yellow-500/50'
      )}
    >
      <NodeDeleteButton nodeId={id} onDelete={nodeData.onDeleteNode} />
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-yellow-500 !border-2 !border-background"
      />

      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border">
        <div className="p-2 rounded-lg bg-yellow-500/10">
          <Zap className="h-5 w-5 text-yellow-500" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <span className="font-medium text-sm">{nodeData.label}</span>
            {totalTracks > 0 && (
              <Badge variant="secondary" className="text-xs">
                {completedTracks}/{totalTracks}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">A/B avatar hook testing</p>
        </div>
      </div>

      {/* Script Preview */}
      {nodeData.script ? (
        <div className="p-3 border-b border-border">
          <p className="text-xs text-muted-foreground line-clamp-2">{nodeData.script}</p>
        </div>
      ) : (
        <div className="p-3 border-b border-border">
          <p className="text-xs text-muted-foreground italic">No script entered</p>
        </div>
      )}

      {/* Per-Avatar Track Sections — main feature */}
      {hasTracks ? (
        <div className="divide-y divide-border">
          {nodeData.tracks.map((track) => {
            const isExpanded = expandedTracks.has(track.avatarId);
            const completedScenes = track.scenes.filter(s => s.status === 'completed').length;
            const totalScenes = track.scenes.length;

            return (
              <div key={track.avatarId} className="nodrag">
                {/* Track Header */}
                <button
                  onClick={() => toggleTrack(track.avatarId)}
                  className="flex items-center gap-2 w-full p-3 hover:bg-muted/30 transition-colors text-left"
                >
                  <img
                    src={track.avatarImageUrl}
                    alt={track.avatarName}
                    className="w-8 h-8 rounded-full object-cover border-2 border-card flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-medium truncate block">{track.avatarName}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {completedScenes}/{totalScenes} scenes
                    </span>
                  </div>
                  {getStatusIcon(track.overallStatus)}
                  {isExpanded ? (
                    <ChevronDown className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                  ) : (
                    <ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                  )}
                </button>

                {/* Expanded Scenes */}
                {isExpanded && (
                  <div className="px-3 pb-3 space-y-2">
                    {track.scenes.map((scene) => (
                      <div
                        key={scene.id}
                        className={cn(
                          'rounded-lg border p-2 text-xs',
                          scene.status === 'completed' && 'border-green-500/30 bg-green-500/5',
                          scene.status === 'generating' && 'border-yellow-500/30 bg-yellow-500/5 animate-pulse',
                          scene.status === 'failed' && 'border-destructive/30 bg-destructive/5',
                          scene.status === 'idle' && 'border-border bg-muted/20',
                        )}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium">Scene {scene.order + 1}</span>
                          <div className="flex items-center gap-1">
                            {scene.generatedImageUrl && <ImageIcon className="h-3 w-3 text-green-500" />}
                            {scene.generatedVideoUrl && <Film className="h-3 w-3 text-green-500" />}
                            {scene.status === 'failed' && nodeData.onRetryScene && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-5 w-5 p-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  nodeData.onRetryScene!(id, track.avatarId, scene.id);
                                }}
                              >
                                <RotateCcw className="h-3 w-3" />
                              </Button>
                            )}
                            {getStatusIcon(scene.status)}
                          </div>
                        </div>
                        <p className="text-muted-foreground line-clamp-1">{scene.lipSyncLine || scene.action}</p>
                        {scene.generatedImageUrl && (
                          <img
                            src={scene.generatedImageUrl}
                            alt={`Scene ${scene.order + 1}`}
                            className="w-full aspect-video rounded mt-1 object-cover"
                          />
                        )}
                        {scene.generatedVideoUrl && (
                          <ProxiedVideo url={scene.generatedVideoUrl} className="w-full aspect-video" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : nodeData.avatars?.length > 0 ? (
        /* Avatars selected but not yet generated */
        <div className="p-3">
          <div className="flex items-center gap-1 mb-2">
            <Users className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{nodeData.avatars.length} avatar{nodeData.avatars.length > 1 ? 's' : ''} selected</span>
          </div>
          <div className="flex -space-x-2">
            {nodeData.avatars.slice(0, 5).map((avatar) => (
              <img
                key={avatar.avatarId}
                src={avatar.avatarImageUrl}
                alt={avatar.avatarName}
                className="w-8 h-8 rounded-full object-cover border-2 border-card"
              />
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">Click Generate to break script into scenes per avatar</p>
        </div>
      ) : (
        <div className="p-3">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 border border-dashed">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Select avatars in inspector</span>
          </div>
        </div>
      )}

      {/* Error */}
      {nodeData.error && (
        <div className="px-4 pb-3">
          <div className="text-xs text-destructive bg-destructive/10 rounded-md px-2 py-1 truncate">
            {nodeData.error}
          </div>
        </div>
      )}

      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-yellow-500 !border-2 !border-background"
      />
    </div>
  );
}

export const HooksNode = memo(HooksNodeComponent);
