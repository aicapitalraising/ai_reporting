import { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Play,
  Pause,
  Download,
  Volume2,
  VolumeX,
  Maximize2,
  Loader2,
  ExternalLink,
  Eye,
  Heart,
  MessageCircle,
  Share2,
} from 'lucide-react';
import { toast } from 'sonner';
import { fetchVideoAsBlob } from '@/lib/video-proxy';
import type { ViralVideo } from '@/hooks/useViralVideos';

function formatCount(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

interface ViralVideoPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  video: ViralVideo | null;
}

export function ViralVideoPreviewDialog({ open, onOpenChange, video }: ViralVideoPreviewDialogProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    if (open && videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
    if (!open) setIsPlaying(false);
  }, [open]);

  if (!video) return null;

  const handlePlayPause = () => {
    if (!videoRef.current) return;
    if (isPlaying) videoRef.current.pause();
    else videoRef.current.play();
  };

  const handleFullscreen = () => {
    videoRef.current?.requestFullscreen?.();
  };

  const handleDownload = async () => {
    const url = video.video_url || video.source_url;
    if (!url) return;
    setIsDownloading(true);
    try {
      const blob = await fetchVideoAsBlob(url);
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `viral-${video.id}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
      toast.success('Video downloaded');
    } catch {
      window.open(url, '_blank');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base truncate pr-4">{video.title}</DialogTitle>
            <div className="flex items-center gap-2 shrink-0">
              <Badge variant="outline" className="text-xs">{video.platform}</Badge>
              <Badge variant="secondary" className="text-xs gap-1">
                <Eye className="h-3 w-3" /> {formatCount(video.views)}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <div className="px-4 pb-4 space-y-3">
          {/* Video Player */}
          <div className="relative bg-black rounded-lg overflow-hidden">
            {video.video_url ? (
              <video
                ref={videoRef}
                src={video.video_url}
                poster={video.thumbnail_url || undefined}
                className="w-full max-h-[70vh] object-contain"
                loop
                muted={isMuted}
                playsInline
                autoPlay
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
              />
            ) : video.thumbnail_url ? (
              <img src={video.thumbnail_url} alt={video.title} className="w-full max-h-[70vh] object-contain" />
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                <Play className="h-12 w-12 opacity-30" />
              </div>
            )}

            {/* Controls overlay */}
            {video.video_url && (
              <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-white hover:text-white hover:bg-white/20" onClick={handlePlayPause}>
                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Button>
                  <Button
                    size="icon" variant="ghost" className="h-8 w-8 text-white hover:text-white hover:bg-white/20"
                    onClick={() => { if (videoRef.current) videoRef.current.muted = !isMuted; setIsMuted(!isMuted); }}
                  >
                    {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  </Button>
                </div>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-white hover:text-white hover:bg-white/20" onClick={handleFullscreen}>
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Creator + metrics */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                {(video.creator_name || 'U')[0].toUpperCase()}
              </div>
              <div>
                <p className="font-medium">{video.creator_name || 'Unknown'}</p>
                {video.creator_handle && <p className="text-xs text-muted-foreground">{video.creator_handle}</p>}
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Heart className="h-3 w-3" /> {formatCount(video.likes || 0)}</span>
              <span className="flex items-center gap-1"><MessageCircle className="h-3 w-3" /> {formatCount(video.comments || 0)}</span>
              <span className="flex items-center gap-1"><Share2 className="h-3 w-3" /> {formatCount(video.shares || 0)}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
            <div className="flex-1" />
            <Button variant="outline" className="gap-1.5" onClick={handleDownload} disabled={isDownloading}>
              {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Download
            </Button>
            {video.source_url && (
              <Button variant="outline" className="gap-1.5" asChild>
                <a href={video.source_url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" /> Open Original
                </a>
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
