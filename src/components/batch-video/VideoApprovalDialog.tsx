import { useState, useRef, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Play, Pause, Download, Volume2, VolumeX, Maximize2,
  Loader2, Check, RefreshCw, Settings2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { fetchVideoAsBlob } from '@/lib/video-proxy';
import type { BatchVideoScene } from '@/types/batch-video';

interface VideoApprovalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scene: BatchVideoScene;
  aspectRatio: string;
  onApprove: (sceneId: string) => void;
  onRegenerate: (sceneId: string) => void;
  onEditRetry: (sceneId: string) => void;
}

export function VideoApprovalDialog({
  open, onOpenChange, scene, aspectRatio,
  onApprove, onRegenerate, onEditRetry,
}: VideoApprovalDialogProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [proxyUrl, setProxyUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const videoUrl = scene.videoUrl || '';
  const needsProxy = videoUrl.includes('generativelanguage.googleapis.com');

  useEffect(() => {
    if (open && videoUrl) {
      setIsPlaying(false);
      setIsLoading(true);
      setError(null);
      if (needsProxy) {
        fetchVideoAsBlob(videoUrl)
          .then(blob => { setProxyUrl(URL.createObjectURL(blob)); setIsLoading(false); })
          .catch(() => { setError('Failed to load video'); setIsLoading(false); });
      } else {
        setProxyUrl(videoUrl);
        setIsLoading(false);
      }
    }
    return () => {
      if (proxyUrl?.startsWith('blob:')) URL.revokeObjectURL(proxyUrl);
    };
  }, [open, videoUrl]);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const blob = await fetchVideoAsBlob(videoUrl);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `scene-${scene.order}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Downloaded');
    } catch {
      toast.error('Download failed');
    } finally {
      setIsDownloading(false);
    }
  };

  const aspectClass = aspectRatio === '9:16' ? 'aspect-[9/16] max-h-[65vh]' : 'aspect-video max-h-[65vh]';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg">Review Scene {scene.order}</DialogTitle>
            <Badge variant="outline">{aspectRatio}</Badge>
          </div>
          <DialogDescription className="sr-only">Review generated video before saving</DialogDescription>
        </DialogHeader>

        <div className="p-4 space-y-4">
          {/* Video Player */}
          <div className="flex justify-center bg-black rounded-lg overflow-hidden">
            <div className={cn('relative w-full', aspectClass)}>
              {isLoading ? (
                <div className="w-full h-full flex items-center justify-center min-h-[200px]">
                  <Loader2 className="h-8 w-8 animate-spin text-white" />
                </div>
              ) : error ? (
                <div className="w-full h-full flex items-center justify-center min-h-[200px] text-white text-sm">{error}</div>
              ) : proxyUrl ? (
                <>
                  <video
                    ref={videoRef}
                    src={proxyUrl}
                    className="w-full h-full object-contain"
                    loop playsInline
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onLoadedData={() => setIsLoading(false)}
                  />
                  <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:text-white hover:bg-white/20"
                          onClick={() => { videoRef.current?.[isPlaying ? 'pause' : 'play'](); }}>
                          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:text-white hover:bg-white/20"
                          onClick={() => { if (videoRef.current) videoRef.current.muted = !isMuted; setIsMuted(!isMuted); }}>
                          {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                        </Button>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:text-white hover:bg-white/20"
                        onClick={() => videoRef.current?.requestFullscreen?.()}>
                        <Maximize2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          </div>

          {/* Scene Info */}
          <div className="text-xs text-muted-foreground">
            <p className="line-clamp-2">{scene.segment.sceneDescription || scene.segment.imagePrompt}</p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2 border-t gap-2 flex-wrap">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleDownload} disabled={isDownloading} className="gap-1.5">
                {isDownloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                Download
              </Button>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => onEditRetry(scene.id)} className="gap-1.5">
                <Settings2 className="h-3.5 w-3.5" />
                Edit & Retry
              </Button>
              <Button variant="outline" size="sm" onClick={() => onRegenerate(scene.id)} className="gap-1.5">
                <RefreshCw className="h-3.5 w-3.5" />
                Regenerate
              </Button>
              <Button size="sm" onClick={() => onApprove(scene.id)} className="gap-1.5">
                <Check className="h-3.5 w-3.5" />
                Approve & Save
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
