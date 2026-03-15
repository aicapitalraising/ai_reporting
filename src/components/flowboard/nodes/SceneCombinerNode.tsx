import { memo, useState, useEffect } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Layers, Loader2, CheckCircle, AlertCircle, Video, Download, Type, Mic, Scissors } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { SceneCombinerData, TransitionType, CaptionStyle } from '@/types/flowboard';
import { cn } from '@/lib/utils';
import { NodeDeleteButton } from './NodeDeleteButton';
import { isGoogleApiUrl, fetchVideoViaProxy } from '@/lib/video-proxy';

const TRANSITION_LABELS: Record<TransitionType, { label: string; icon: string }> = {
  'cut': { label: 'Hard Cut', icon: '✂️' },
  'crossfade': { label: 'Crossfade', icon: '🌓' },
  'wipe-left': { label: 'Wipe Left', icon: '⬅️' },
  'wipe-right': { label: 'Wipe Right', icon: '➡️' },
  'zoom-in': { label: 'Zoom In', icon: '🔍' },
  'zoom-out': { label: 'Zoom Out', icon: '🔎' },
};

const CAPTION_STYLES: { value: CaptionStyle; label: string; desc: string; preview: string }[] = [
  { value: 'none', label: 'No Captions', desc: 'Download without captions', preview: '' },
  { value: 'viral', label: 'Viral Captions', desc: 'Bold, animated word-by-word', preview: 'BOLD CENTERED TEXT' },
  { value: 'basic', label: 'Basic Captions', desc: 'Clean subtitle bar at bottom', preview: 'Clean subtitles at bottom' },
];

function SceneCombinerNodeComponent({ id, data, selected }: NodeProps) {
  const navigate = useNavigate();
  const nodeData = data as SceneCombinerData;

  // Proxy Google API video URLs for playback
  const [playableVideoUrl, setPlayableVideoUrl] = useState<string | null>(null);
  const [playableInputUrls, setPlayableInputUrls] = useState<(string | null)[]>([]);
  const [scrollPos, setScrollPos] = useState(0);

  useEffect(() => {
    if (!nodeData.outputVideoUrl) { setPlayableVideoUrl(null); return; }
    // Blob URLs don't need proxying
    if (nodeData.outputVideoUrl.startsWith('blob:')) {
      setPlayableVideoUrl(nodeData.outputVideoUrl);
      return;
    }
    if (isGoogleApiUrl(nodeData.outputVideoUrl)) {
      fetchVideoViaProxy(nodeData.outputVideoUrl).then(setPlayableVideoUrl).catch(() => setPlayableVideoUrl(null));
    } else {
      setPlayableVideoUrl(nodeData.outputVideoUrl);
    }
  }, [nodeData.outputVideoUrl]);

  // Proxy input video URLs
  useEffect(() => {
    if (!nodeData.inputVideos || nodeData.inputVideos.length === 0) {
      setPlayableInputUrls([]);
      return;
    }
    Promise.all(
      nodeData.inputVideos.map(async (url) => {
        if (url.startsWith('blob:')) return url;
        if (isGoogleApiUrl(url)) {
          return await fetchVideoViaProxy(url).catch(() => null);
        }
        return url;
      })
    ).then(setPlayableInputUrls);
  }, [nodeData.inputVideos]);
  
  const getStatusIcon = () => {
    switch (nodeData.status) {
      case 'generating':
        return <Loader2 className="h-4 w-4 animate-spin text-cyan-500" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      default:
        return null;
    }
  };

  // Detect aspect ratio from input videos (9:16 or 16:9)
  const aspectRatio = nodeData.aspectRatio || '16:9';
  const aspectClass = aspectRatio === '9:16' ? 'aspect-[9/16]' : 'aspect-video';

  const transitionInfo = TRANSITION_LABELS[nodeData.transitionType] || TRANSITION_LABELS['cut'];
  const currentCaption = nodeData.captionStyle || 'none';

  return (
    <div
      className={cn(
        'bg-card border-2 rounded-xl shadow-lg min-w-[280px] max-w-[320px] transition-all relative group/node',
        selected ? 'border-cyan-500 shadow-cyan-500/20' : 'border-border',
        nodeData.status === 'generating' && 'border-cyan-500/50 animate-pulse'
      )}
    >
      <NodeDeleteButton nodeId={id} onDelete={nodeData.onDeleteNode} />
      {/* Multiple Input Handles */}
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <Handle
          key={i}
          type="target"
          position={Position.Top}
          id={`input-${i}`}
          style={{ left: `${15 + i * 14}%` }}
          className="!w-3 !h-3 !bg-cyan-500 !border-2 !border-background"
        />
      ))}

      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border">
        <div className="p-2 rounded-lg bg-cyan-500/10">
          <Layers className="h-5 w-5 text-cyan-500" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <span className="font-medium text-sm">{nodeData.label}</span>
            {getStatusIcon()}
          </div>
          <p className="text-xs text-muted-foreground">Combine video clips</p>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Input Videos Count */}
        <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
          <span className="text-xs text-muted-foreground">Input clips</span>
          <Badge variant="secondary" className="text-xs">
            {nodeData.inputVideos?.length || 0} videos
          </Badge>
        </div>

        {/* Input Clips Carousel */}
        {playableInputUrls.length > 0 && (
          <div className="space-y-2">
            <span className="text-xs font-medium text-muted-foreground block">Scenes</span>
            <div className="relative group/carousel">
              <div 
                className="flex gap-2 overflow-x-auto pb-2 scroll-smooth snap-x snap-mandatory"
                style={{ scrollBehavior: 'smooth' }}
              >
                {playableInputUrls.map((url, idx) => (
                  url && (
                    <div key={idx} className="flex-shrink-0 snap-start">
                      <div className={cn(aspectRatio === '9:16' ? 'aspect-[9/16] w-10' : 'aspect-video w-16', 'rounded-lg overflow-hidden bg-muted border border-border/50')}>
                        <video 
                          src={url} 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                  )
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Transition Type */}
        <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
          <span className="text-xs text-muted-foreground">Transition</span>
          <div className="flex items-center gap-1.5">
            <span>{transitionInfo.icon}</span>
            <span className="text-xs font-medium">{transitionInfo.label}</span>
          </div>
        </div>

        {/* Output Preview */}
        {playableVideoUrl ? (
          <div className="space-y-3">
            <div className={`relative ${aspectClass} rounded-lg overflow-hidden bg-muted`}>
              <video 
                src={playableVideoUrl} 
                className="w-full h-full object-cover"
                controls
              />
              <div className="absolute top-2 left-2">
                <Badge className="bg-green-500 text-white text-xs">
                  Combined
                </Badge>
              </div>

              {/* Caption preview overlay */}
              {currentCaption === 'viral' && (
                <div className="absolute bottom-8 left-0 right-0 flex justify-center pointer-events-none">
                  <span className="text-white font-black text-lg uppercase tracking-wider px-3 py-1"
                    style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8), -1px -1px 2px rgba(0,0,0,0.5)' }}>
                    VIRAL CAPTIONS
                  </span>
                </div>
              )}
              {currentCaption === 'basic' && (
                <div className="absolute bottom-2 left-2 right-2 pointer-events-none">
                  <div className="bg-black/70 rounded px-2 py-1 text-center">
                    <span className="text-white text-[10px]">Basic captions will appear here</span>
                  </div>
                </div>
              )}
            </div>

            {/* Caption Style Selection */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <Type className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-medium">Caption Style</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {CAPTION_STYLES.map((style) => (
                  <button
                    key={style.value}
                    className={cn(
                      'p-2 rounded-lg border text-center transition-all nodrag',
                      currentCaption === style.value
                        ? 'border-primary bg-primary/10 ring-1 ring-primary'
                        : 'border-border hover:border-foreground/30'
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      // This triggers a node data update via the inspector
                    }}
                  >
                    <span className="text-[10px] font-medium block">{style.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Download + Editor Buttons */}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1 text-xs nodrag" asChild>
                <a href={playableVideoUrl} download="combined-video.mp4" target="_blank" rel="noopener noreferrer">
                  <Download className="h-3 w-3 mr-1" />
                  Download {currentCaption !== 'none' ? 'with Captions' : 'Video'}
                </a>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs nodrag"
                onClick={() => {
                  // Send all input clips to editor for multi-track editing
                  const clipUrls = (nodeData.inputVideos || []).filter(Boolean);
                  if (clipUrls.length > 0) {
                    const encoded = encodeURIComponent(JSON.stringify(clipUrls));
                    navigate(`/video-editor?clips=${encoded}&ar=${aspectRatio}&name=${encodeURIComponent(nodeData.label || 'Flowboard Export')}`);
                  } else {
                    navigate(`/video-editor?src=${encodeURIComponent(playableVideoUrl!)}&ar=${aspectRatio}`);
                  }
                }}
              >
                <Scissors className="h-3 w-3 mr-1" />
                Editor
              </Button>
            </div>

            {/* Voice Dubbing Status */}
            {nodeData.selectedVoiceName && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                <Mic className="h-3.5 w-3.5 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] text-muted-foreground block">Voice</span>
                  <span className="text-xs font-medium truncate block">{nodeData.selectedVoiceName}</span>
                </div>
                {nodeData.dubbingStatus === 'processing' && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                )}
                {nodeData.dubbingStatus === 'completed' && (
                  <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                )}
                {nodeData.dubbingStatus === 'failed' && (
                  <AlertCircle className="h-3.5 w-3.5 text-destructive" />
                )}
              </div>
            )}

            {/* Dubbed Video Download */}
            {nodeData.dubbedVideoUrl && (
              <div className="flex gap-2">
                <Button variant="default" size="sm" className="flex-1 text-xs nodrag gap-1.5" asChild>
                  <a href={nodeData.dubbedVideoUrl} download="dubbed-video.mp4" target="_blank" rel="noopener noreferrer">
                    <Mic className="h-3 w-3" />
                    Download Dubbed
                  </a>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs nodrag"
                  onClick={() => navigate(`/video-editor?src=${encodeURIComponent(nodeData.dubbedVideoUrl!)}&ar=${aspectRatio}`)}
                >
                  <Scissors className="h-3 w-3 mr-1" />
                  Editor
                </Button>
              </div>
            )}
          </div>
        ) : nodeData.outputVideoUrl && nodeData.status === 'completed' ? (
          <div className="flex items-center justify-center p-4 rounded-lg bg-muted/50">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mr-2" />
            <span className="text-xs text-muted-foreground">Loading preview...</span>
          </div>
        ) : (
          <div className="flex items-center justify-center p-4 rounded-lg bg-muted/50 border border-dashed">
            <div className="text-center">
              <Video className="h-6 w-6 mx-auto text-muted-foreground mb-1" />
              <span className="text-xs text-muted-foreground">
                Connect video clips to combine
              </span>
            </div>
          </div>
        )}
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
        className="!w-3 !h-3 !bg-cyan-500 !border-2 !border-background"
      />
    </div>
  );
}

export const SceneCombinerNode = memo(SceneCombinerNodeComponent);
