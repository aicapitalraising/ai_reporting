import { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
  Scissors,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { getStoredKeys } from '@/hooks/useApiRateLimiter';
import { fetchVideoAsBlob } from '@/lib/video-proxy';

interface SimpleVideoPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  videoUrl: string;
  title?: string;
  aspectRatio?: '16:9' | '9:16';
}

export function SimpleVideoPreviewDialog({
  open,
  onOpenChange,
  videoUrl,
  title = 'Video Preview',
  aspectRatio = '16:9',
}: SimpleVideoPreviewDialogProps) {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [proxyUrl, setProxyUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Check if this is a Google API URL that needs proxy
  const needsProxy = videoUrl?.includes('generativelanguage.googleapis.com');

  useEffect(() => {
    if (open && videoUrl) {
      setIsPlaying(false);
      setIsLoading(true);
      setError(null);
      
      if (needsProxy) {
        // Fetch video through proxy
        fetchProxiedVideo();
      } else {
        // Direct URL, no proxy needed
        setProxyUrl(videoUrl);
        setIsLoading(false);
      }
    }
    
    return () => {
      // Cleanup blob URL on close
      if (proxyUrl && proxyUrl.startsWith('blob:')) {
        URL.revokeObjectURL(proxyUrl);
      }
    };
  }, [open, videoUrl]);

  const fetchProxiedVideo = async () => {
    try {
      const blob = await fetchVideoAsBlob(videoUrl);
      const blobUrl = URL.createObjectURL(blob);
      setProxyUrl(blobUrl);
      setIsLoading(false);
    } catch (err) {
      console.error('Failed to load video:', err);
      setError('Failed to load video');
      setIsLoading(false);
    }
  };

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleMuteToggle = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleFullscreen = () => {
    if (videoRef.current?.requestFullscreen) {
      videoRef.current.requestFullscreen();
    }
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    
    try {
      let blob: Blob;
      
      blob = await fetchVideoAsBlob(videoUrl);

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `video-${Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Video downloaded');
    } catch (err) {
      console.error('Download error:', err);
      toast.error('Failed to download video');
    } finally {
      setIsDownloading(false);
    }
  };

  const aspectClass = aspectRatio === '9:16' ? 'aspect-[9/16] max-h-[70vh]' : 'aspect-video max-h-[70vh]';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 gap-0 overflow-hidden" aria-describedby="video-preview-description">
        <DialogHeader className="p-4 pb-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg">{title}</DialogTitle>
            <span className="inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold">
              {aspectRatio}
            </span>
          </div>
          <DialogDescription id="video-preview-description" className="sr-only">
            Video preview dialog with playback controls and download option
          </DialogDescription>
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
                <div className="w-full h-full flex items-center justify-center min-h-[200px] text-white">
                  <p>{error}</p>
                </div>
              ) : proxyUrl ? (
                <>
                  <video
                    ref={videoRef}
                    src={proxyUrl}
                    className="w-full h-full object-contain"
                    loop
                    playsInline
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onLoadedData={() => setIsLoading(false)}
                    onError={() => setError('Failed to play video')}
                  />

                  {/* Video Controls Overlay */}
                  <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-white hover:text-white hover:bg-white/20"
                          onClick={handlePlayPause}
                        >
                          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-white hover:text-white hover:bg-white/20"
                          onClick={handleMuteToggle}
                        >
                          {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                        </Button>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-white hover:text-white hover:bg-white/20"
                        onClick={handleFullscreen}
                      >
                        <Maximize2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-2 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                onClick={handleDownload} 
                disabled={isDownloading || isLoading}
                className="gap-2"
              >
                {isDownloading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                {isDownloading ? 'Downloading...' : 'Download'}
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate(`/video-editor?src=${encodeURIComponent(videoUrl)}&ar=${aspectRatio}`)}
                className="gap-2"
              >
                <Scissors className="h-4 w-4" />
                Send to Editor
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
