import { useState, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Eye,
  Heart,
  MessageCircle,
  Share2,
  ExternalLink,
  Trash2,
  TrendingUp,
  Play,
  Pause,
  Download,
  Volume2,
  VolumeX,
  Maximize2,
  Loader2,
  Brain,
  Star,
} from 'lucide-react';
import { toast } from 'sonner';
import { getEmbedInfo, getPlatformLabel } from '@/lib/video-embed';
import { fetchVideoAsBlob } from '@/lib/video-proxy';
import { cn } from '@/lib/utils';
import type { ViralVideo } from '@/hooks/useViralVideos';

const PLATFORM_COLORS: Record<string, string> = {
  TikTok: 'bg-pink-500/10 text-pink-600 border-pink-500/20',
  Instagram: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  Facebook: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  LinkedIn: 'bg-sky-500/10 text-sky-600 border-sky-500/20',
};

function formatCount(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

interface ViralVideoCardProps {
  video: ViralVideo;
  onDelete: (id: string) => void;
  onPreviewFullscreen: (video: ViralVideo) => void;
  onAnalyze?: (video: ViralVideo) => void;
  isSwiped?: boolean;
  onToggleSwipe?: (video: ViralVideo) => void;
}

export function ViralVideoCard({ video, onDelete, onPreviewFullscreen, onAnalyze, isSwiped, onToggleSwipe }: ViralVideoCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [showEmbed, setShowEmbed] = useState(false);

  const embedInfo = getEmbedInfo(video.source_url);
  const hasDirectVideo = !!video.video_url && !videoError;
  const hasEmbed = !!embedInfo.embedUrl;
  const thumbnail = video.thumbnail_url || embedInfo.thumbnailUrl;

  const handlePlayPause = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play().catch(() => setVideoError(true));
    }
  };

  const handleDownload = async () => {
    const url = video.video_url || video.source_url;
    if (!url) {
      toast.error('No video URL available');
      return;
    }
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
      toast.info('Opened video in new tab');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="group rounded-lg border border-border bg-card overflow-hidden transition-all duration-200 hover:border-primary/30">
      {/* Platform badge + views */}
      <div className="flex items-center justify-between px-3 py-2 text-xs">
        <Badge variant="outline" className={`text-[10px] ${PLATFORM_COLORS[video.platform] || ''}`}>
          {video.platform}
        </Badge>
        <div className="flex items-center gap-1 font-semibold">
          <Eye className="h-3 w-3 text-muted-foreground" />
          <span className={video.views >= 1_000_000 ? 'text-orange-500' : 'text-foreground'}>
            {formatCount(video.views)}
          </span>
          {video.views >= 1_000_000 && <TrendingUp className="h-3 w-3 text-orange-500" />}
        </div>
      </div>

      {/* Video / Thumbnail / Embed area */}
      <div className="relative w-full bg-muted/30 overflow-hidden" style={{ minHeight: '180px' }}>
        {/* Embedded player (YouTube/TikTok) */}
        {showEmbed && hasEmbed ? (
          <iframe
            src={embedInfo.embedUrl!}
            className={cn(
              'w-full border-0',
              embedInfo.type === 'tiktok' ? 'h-[320px]' : 'aspect-video'
            )}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={video.title}
          />
        ) : hasDirectVideo ? (
          <>
            <video
              ref={videoRef}
              src={video.video_url!}
              poster={thumbnail || undefined}
              className="w-full h-full object-cover aspect-[9/16] max-h-[320px]"
              loop
              muted={isMuted}
              playsInline
              preload="metadata"
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onError={() => setVideoError(true)}
            />
            <div className="absolute inset-0 flex items-center justify-center cursor-pointer" onClick={handlePlayPause}>
              {!isPlaying && (
                <div className="w-12 h-12 rounded-full bg-black/60 flex items-center justify-center backdrop-blur-sm">
                  <Play className="h-5 w-5 text-white ml-0.5" />
                </div>
              )}
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="flex items-center gap-1">
                <Button size="icon" variant="ghost" className="h-7 w-7 text-white hover:text-white hover:bg-white/20" onClick={(e) => { e.stopPropagation(); handlePlayPause(); }}>
                  {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-white hover:text-white hover:bg-white/20" onClick={(e) => { e.stopPropagation(); if (videoRef.current) videoRef.current.muted = !isMuted; setIsMuted(!isMuted); }}>
                  {isMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                </Button>
              </div>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-white hover:text-white hover:bg-white/20" onClick={(e) => { e.stopPropagation(); onPreviewFullscreen(video); }}>
                <Maximize2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </>
        ) : thumbnail ? (
          <div
            className="relative cursor-pointer"
            onClick={() => hasEmbed ? setShowEmbed(true) : onPreviewFullscreen(video)}
          >
            <img src={thumbnail} alt={video.title} className="w-full object-cover aspect-video max-h-[220px]" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent flex items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-black/60 flex items-center justify-center backdrop-blur-sm transition-transform hover:scale-110">
                <Play className="h-5 w-5 text-white ml-0.5" />
              </div>
            </div>
            {hasEmbed && (
              <Badge className="absolute top-2 left-2 text-[9px] bg-black/60 border-none text-white">
                {getPlatformLabel(embedInfo.type)}
              </Badge>
            )}
          </div>
        ) : (
          <div
            className="flex flex-col items-center justify-center h-[180px] text-muted-foreground cursor-pointer"
            onClick={() => hasEmbed ? setShowEmbed(true) : onPreviewFullscreen(video)}
          >
            <div className="text-3xl mb-1 opacity-30">🎬</div>
            <p className="text-xs opacity-50">
              {hasEmbed ? `Click to load ${embedInfo.type} player` : 'Video'}
            </p>
          </div>
        )}
      </div>

      {/* Creator info */}
      <div className="flex items-center gap-2.5 px-3 py-2">
        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold shrink-0 text-muted-foreground">
          {(video.creator_name || 'U').split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{video.creator_name || 'Unknown'}</p>
          {video.creator_handle && (
            <p className="text-[11px] text-muted-foreground truncate">{video.creator_handle}</p>
          )}
        </div>
      </div>

      {/* Title */}
      <p className="px-3 pb-2 text-xs text-foreground leading-relaxed line-clamp-2">{video.title}</p>

      {/* Engagement metrics */}
      <div className="flex items-center gap-4 px-3 py-2 border-t border-border/50 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1"><Heart className="h-3 w-3" /> {formatCount(video.likes || 0)}</span>
        <span className="flex items-center gap-1"><MessageCircle className="h-3 w-3" /> {formatCount(video.comments || 0)}</span>
        <span className="flex items-center gap-1"><Share2 className="h-3 w-3" /> {formatCount(video.shares || 0)}</span>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-1.5 px-3 py-2 border-t border-border/50">
        {onToggleSwipe && (
          <Button size="icon" variant="ghost" className={`h-7 w-7 ${isSwiped ? 'text-yellow-500' : 'text-muted-foreground hover:text-yellow-500'}`} onClick={() => onToggleSwipe(video)} title={isSwiped ? 'Remove from Swipe File' : 'Save to Swipe File'}>
            <Star className={`h-3.5 w-3.5 ${isSwiped ? 'fill-yellow-500' : ''}`} />
          </Button>
        )}
        <Button size="sm" variant="outline" className="h-7 text-xs flex-1 gap-1" onClick={() => onAnalyze ? onAnalyze(video) : onPreviewFullscreen(video)}>
          <Brain className="h-3 w-3" /> Analyze
        </Button>
        <Button size="sm" variant="outline" className="h-7 text-xs flex-1 gap-1" onClick={handleDownload} disabled={isDownloading}>
          {isDownloading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
          Download
        </Button>
        {video.source_url && (
          <Button size="icon" variant="ghost" className="h-7 w-7" asChild>
            <a href={video.source_url} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3.5 w-3.5" /></a>
          </Button>
        )}
        <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => onDelete(video.id)}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Hashtags */}
      {video.hashtags && video.hashtags.length > 0 && (
        <div className="px-3 pb-2 flex flex-wrap gap-1">
          {video.hashtags.slice(0, 5).map((tag) => (
            <span key={tag} className="text-[10px] text-primary/70">{tag}</span>
          ))}
          {video.hashtags.length > 5 && (
            <span className="text-[10px] text-muted-foreground">+{video.hashtags.length - 5}</span>
          )}
        </div>
      )}
    </div>
  );
}
