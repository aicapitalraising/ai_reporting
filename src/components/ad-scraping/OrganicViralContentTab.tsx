import { useState, useMemo, useEffect, useRef } from 'react';
import { useClients } from '@/hooks/useClients';
import { useSwipeFileIds, useAddToSwipeFile, useRemoveFromSwipeFile } from '@/hooks/useSwipeFile';
import {
  useViralVideos,
  useViralTrackingTargets,
  useStartViralTracking,
  useDeleteViralTrackingTarget,
  useDeleteViralVideo,
  type ViralVideo,
} from '@/hooks/useViralVideos';
import { VideoIntelligenceDialog, type VideoIntelligenceItem } from './VideoIntelligenceDialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  Hash,
  Plus,
  X,
  Play,
  Eye,
  TrendingUp,
  Search,
  Brain,
  UserPlus,
  Video,
  Loader2,
  RefreshCw,
  Trash2,
  Clock,
  ExternalLink,
  Star,
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { getEmbedInfo, getPlatformLabel } from '@/lib/video-embed';
import { supabase } from '@/integrations/supabase/client';

const PLATFORMS = ['TikTok', 'Instagram Reels', 'YouTube Shorts'] as const;
const PLATFORM_MAP: Record<string, string> = {
  'TikTok': 'TikTok',
  'Instagram Reels': 'Instagram',
  'YouTube Shorts': 'YouTube',
};
const VIEW_THRESHOLDS = [
  { label: '500K+', value: 500_000 },
  { label: '1M+', value: 1_000_000 },
  { label: '5M+', value: 5_000_000 },
  { label: '10M+', value: 10_000_000 },
] as const;
const TIME_RANGES = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
  { label: 'All time', days: 0 },
] as const;

function formatCount(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

export function OrganicViralContentTab() {
  const navigate = useNavigate();
  const { data: clients } = useClients();
  const { data: allVideos = [], isLoading: videosLoading } = useViralVideos();
  const { data: targets = [] } = useViralTrackingTargets();
  const startTracking = useStartViralTracking();
  const deleteTarget = useDeleteViralTrackingTarget();
  const deleteVideo = useDeleteViralVideo();

  // Swipe file
  const { videoIds: swipedVideoIds, items: swipeItems } = useSwipeFileIds();
  const addToSwipe = useAddToSwipeFile();
  const removeFromSwipe = useRemoveFromSwipeFile();

  const handleToggleSwipeVideo = (video: ViralVideo) => {
    if (swipedVideoIds.has(video.id)) {
      const item = swipeItems.find(i => i.viral_video_id === video.id);
      if (item) removeFromSwipe.mutate(item.id, { onSuccess: () => toast.success('Removed from Swipe File') });
    } else {
      addToSwipe.mutate({ viral_video_id: video.id }, { onSuccess: () => toast.success('Saved to Swipe File') });
    }
  };

  const [hashtags, setHashtags] = useState<string[]>([]);
  const [newHashtag, setNewHashtag] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['TikTok']);
  const [viewThreshold, setViewThreshold] = useState(1_000_000);
  const [timeRangeDays, setTimeRangeDays] = useState(30);
  const [analyzeItem, setAnalyzeItem] = useState<VideoIntelligenceItem | null>(null);
  const [isRescraping, setIsRescraping] = useState(false);
  const autoRescrapeTriggered = useRef(false);

  // Auto-rescrape if any target hasn't been scraped in 24h
  useEffect(() => {
    if (autoRescrapeTriggered.current || targets.length === 0 || isRescraping) return;
    const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
    const needsRescrape = targets.some(t =>
      !t.last_scraped_at || new Date(t.last_scraped_at).getTime() < twentyFourHoursAgo
    );
    if (needsRescrape) {
      autoRescrapeTriggered.current = true;
      supabase.functions.invoke('rescrape-viral').then(({ data }) => {
        if (data?.newVideos > 0) {
          toast.success(`Auto-rescrape found ${data.newVideos} new videos`);
        }
      }).catch(() => {});
    }
  }, [targets, isRescraping]);

  const addHashtag = () => {
    const tag = newHashtag.trim().replace(/^#/, '');
    if (!tag) return;
    if (hashtags.includes(tag)) { toast.error('Already added'); return; }
    setHashtags((prev) => [...prev, tag]);
    setNewHashtag('');
  };

  const togglePlatform = (p: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  };

  const handleSearch = async () => {
    if (!hashtags.length) { toast.error('Add at least one hashtag'); return; }
    const mappedPlatforms = selectedPlatforms.map(p => PLATFORM_MAP[p] || p);

    for (const tag of hashtags) {
      try {
        const result = await startTracking.mutateAsync({
          type: 'hashtag',
          value: tag,
          platforms: mappedPlatforms,
          minViews: viewThreshold,
        });
        toast.success(`Found ${result.videosCount} videos for #${tag}`);
      } catch (err: any) {
        toast.error(`Failed to search #${tag}: ${err?.message || 'Unknown error'}`);
      }
    }
    setHashtags([]);
  };

  // Rescrape all existing tracking targets
  const handleRescrapeAll = async () => {
    if (!targets.length) { toast.info('No tracking targets to rescrape'); return; }
    setIsRescraping(true);
    let totalNew = 0;

    for (const target of targets) {
      try {
        const body: Record<string, any> = {
          targetId: target.id,
          platforms: target.platforms,
          minViews: target.min_views,
        };
        if (target.type === 'hashtag') body.hashtag = target.value;
        else body.profile = target.value;

        const { data, error } = await supabase.functions.invoke('scrape-viral-videos', { body });
        if (error) throw error;
        if (!data?.success) continue;

        const videos = data.videos || [];
        if (videos.length > 0) {
          // Upsert — skip duplicates by title similarity
          const { error: insertError } = await supabase.from('viral_videos').insert(videos);
          if (!insertError) totalNew += videos.length;
        }

        await supabase.from('viral_tracking_targets')
          .update({ last_scraped_at: new Date().toISOString() })
          .eq('id', target.id);
      } catch (e) {
        console.error(`Rescrape failed for ${target.value}:`, e);
      }
    }
    setIsRescraping(false);
    toast.success(`Rescrape complete — ${totalNew} new videos found`);
  };

  // Filter videos by view threshold and time range
  const filteredVideos = useMemo(() => {
    return allVideos.filter((v) => {
      if (v.views < viewThreshold) return false;
      if (timeRangeDays > 0) {
        const scraped = new Date(v.scraped_at);
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - timeRangeDays);
        if (scraped < cutoff) return false;
      }
      return true;
    });
  }, [allVideos, viewThreshold, timeRangeDays]);

  const lastScrapedAt = targets.length > 0
    ? targets.filter(t => t.last_scraped_at).sort((a, b) =>
        new Date(b.last_scraped_at!).getTime() - new Date(a.last_scraped_at!).getTime()
      )[0]?.last_scraped_at
    : null;

  return (
    <div className="space-y-6">
      {/* Search config */}
      <Card className="p-4 space-y-4 bg-card/50 backdrop-blur border-border">
        {/* Hashtags */}
        <div className="space-y-2">
          <label className="text-xs font-semibold">Hashtags</label>
          <div className="flex gap-2">
            <Input
              placeholder="e.g. realestate"
              value={newHashtag}
              onChange={(e) => setNewHashtag(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addHashtag()}
              className="flex-1 h-9"
            />
            <Button size="sm" className="h-9" onClick={addHashtag}>
              <Plus className="h-3 w-3 mr-1" /> Add
            </Button>
          </div>
          {hashtags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {hashtags.map((tag) => (
                <Badge key={tag} variant="secondary" className="gap-1 pr-1 text-xs">
                  #{tag}
                  <button
                    onClick={() => setHashtags((prev) => prev.filter((t) => t !== tag))}
                    className="ml-0.5 rounded-full p-0.5 hover:bg-destructive/20"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
          {/* Existing tracking targets */}
          {targets.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              <span className="text-[10px] text-muted-foreground self-center mr-1">Tracked:</span>
              {targets.map((t) => (
                <Badge key={t.id} variant="outline" className="gap-1 pr-1 text-[10px]">
                  {t.type === 'hashtag' ? '#' : '@'}{t.value}
                  {t.last_scraped_at && (
                    <span className="text-muted-foreground ml-1">
                      {formatDistanceToNow(new Date(t.last_scraped_at), { addSuffix: true })}
                    </span>
                  )}
                  <button
                    onClick={() => deleteTarget.mutate(t.id)}
                    className="ml-0.5 rounded-full p-0.5 hover:bg-destructive/20"
                  >
                    <X className="h-2 w-2" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Platform selectors */}
        <div className="space-y-2">
          <label className="text-xs font-semibold">Platforms</label>
          <div className="flex gap-2">
            {PLATFORMS.map((p) => (
              <button
                key={p}
                onClick={() => togglePlatform(p)}
                className={cn(
                  'px-3 py-1.5 rounded-md text-xs font-medium border transition-all',
                  selectedPlatforms.includes(p)
                    ? 'border-primary bg-primary/10 text-foreground'
                    : 'border-border text-muted-foreground hover:border-muted-foreground'
                )}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Threshold + time range + search */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1">
            <label className="text-[10px] font-medium text-muted-foreground">Min Views</label>
            <div className="flex gap-1">
              {VIEW_THRESHOLDS.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setViewThreshold(t.value)}
                  className={cn(
                    'px-2 py-1 rounded text-[10px] font-medium border transition-all',
                    viewThreshold === t.value
                      ? 'border-primary bg-primary/10 text-foreground'
                      : 'border-border text-muted-foreground'
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-medium text-muted-foreground">Time Range</label>
            <Select
              value={String(timeRangeDays)}
              onValueChange={(v) => setTimeRangeDays(Number(v))}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIME_RANGES.map((r) => (
                  <SelectItem key={r.days} value={String(r.days)}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end gap-2">
            <Button
              size="sm"
              className="flex-1 h-8 text-xs"
              onClick={handleSearch}
              disabled={startTracking.isPending}
            >
              {startTracking.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
              ) : (
                <Search className="h-3 w-3 mr-1" />
              )}
              Search Viral Content
            </Button>
            {targets.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={handleRescrapeAll}
                disabled={isRescraping}
                title="Rescrape all tracked hashtags"
              >
                {isRescraping ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <RefreshCw className="h-3 w-3" />
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Last scraped info */}
        {lastScrapedAt && (
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <Clock className="h-3 w-3" />
            Last scraped {formatDistanceToNow(new Date(lastScrapedAt), { addSuffix: true })}
            <span className="text-primary/60">• Auto-rescrape daily</span>
          </div>
        )}
      </Card>

      {/* Loading state */}
      {(startTracking.isPending || videosLoading) && (
        <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-primary">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="font-medium">
            {startTracking.isPending ? 'Searching viral content...' : 'Loading videos...'}
          </span>
        </div>
      )}

      {/* Results */}
      {filteredVideos.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">
              {filteredVideos.length} Viral Video{filteredVideos.length !== 1 ? 's' : ''} Found
            </h3>
            <Badge variant="outline" className="text-[10px]">
              {formatCount(viewThreshold)}+ views
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredVideos.map((video) => (
              <ViralVideoResultCard
                key={video.id}
                video={video}
                clients={clients || []}
                onAnalyze={(v) => setAnalyzeItem({
                  id: v.id,
                  title: v.title,
                  description: v.description,
                  platform: v.platform,
                  source_url: v.source_url,
                  video_url: v.video_url,
                  thumbnail_url: v.thumbnail_url,
                  creator_name: v.creator_name,
                  creator_handle: v.creator_handle,
                  views: v.views,
                  likes: v.likes,
                  comments: v.comments,
                  shares: v.shares,
                  hashtags: v.hashtags,
                })}
                onDelete={(v) => deleteVideo.mutate(v.id)}
                isSwiped={swipedVideoIds.has(video.id)}
                onToggleSwipe={() => handleToggleSwipeVideo(video)}
              />
            ))}
          </div>
        </div>
      )}

      {filteredVideos.length === 0 && !startTracking.isPending && !videosLoading && (
        <div className="text-center py-16 text-muted-foreground">
          <Hash className="h-8 w-8 mx-auto mb-3 opacity-50" />
          <p className="text-lg font-medium">
            {allVideos.length > 0 ? 'No videos match current filters' : 'Search Organic Viral Content'}
          </p>
          <p className="text-sm mt-1">
            {allVideos.length > 0
              ? 'Try lowering the view threshold or expanding the time range'
              : 'Add hashtags and select platforms to discover trending videos'}
          </p>
        </div>
      )}

      {/* Video Intelligence Dialog */}
      <VideoIntelligenceDialog
        open={!!analyzeItem}
        onOpenChange={(open) => !open && setAnalyzeItem(null)}
        item={analyzeItem}
      />
    </div>
  );
}

// ─── Individual video card ───

interface ViralVideoResultCardProps {
  video: ViralVideo;
  clients: { id: string; name: string }[];
  onAnalyze: (v: ViralVideo) => void;
  onDelete: (v: ViralVideo) => void;
  isSwiped?: boolean;
  onToggleSwipe?: () => void;
}

function ViralVideoResultCard({ video, clients, onAnalyze, onDelete, isSwiped, onToggleSwipe }: ViralVideoResultCardProps) {
  const navigate = useNavigate();
  const embedInfo = getEmbedInfo(video.source_url);
  const thumbnail = video.thumbnail_url || embedInfo.thumbnailUrl;
  const engagementRate = video.views > 0
    ? (((video.likes || 0) + (video.comments || 0) + (video.shares || 0)) / video.views * 100).toFixed(1)
    : '0';

  const timeAgo = video.scraped_at
    ? formatDistanceToNow(new Date(video.scraped_at), { addSuffix: true })
    : null;

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden group">
      {/* Thumbnail / Video preview */}
      <div
        className="relative aspect-[9/16] max-h-[240px] bg-muted/30 cursor-pointer overflow-hidden"
        onClick={() => onAnalyze(video)}
      >
        {thumbnail ? (
          <>
            <img
              src={thumbnail}
              alt={video.title}
              className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="w-12 h-12 rounded-full bg-black/60 flex items-center justify-center backdrop-blur-sm">
                <Play className="h-5 w-5 text-white ml-0.5" />
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            <div className="flex items-center justify-center h-full">
              <Play className="h-10 w-10 text-muted-foreground/40" />
            </div>
          </>
        )}

        {/* Overlaid badges */}
        <Badge className="absolute top-2 right-2 text-[10px] bg-black/60 border-none text-white">
          <Eye className="h-2.5 w-2.5 mr-1" />
          {formatCount(video.views)}
        </Badge>
        <Badge className="absolute top-2 left-2 text-[10px] bg-black/60 border-none text-white">
          {video.platform}
        </Badge>
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
          <span className="text-[10px] text-white/80 truncate">
            {video.creator_handle || video.creator_name || 'Unknown'}
          </span>
          {Number(engagementRate) > 0 && (
            <Badge variant="outline" className="text-[10px] border-emerald-500/50 text-emerald-400 bg-black/40">
              <TrendingUp className="h-2.5 w-2.5 mr-1" />
              {engagementRate}%
            </Badge>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-3 space-y-2">
        <p className="text-xs font-medium line-clamp-2">{video.title}</p>

        {/* Time + metrics row */}
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          {timeAgo && (
            <span className="flex items-center gap-0.5">
              <Clock className="h-2.5 w-2.5" /> {timeAgo}
            </span>
          )}
          {video.likes > 0 && <span>{formatCount(video.likes)} likes</span>}
          {video.shares > 0 && <span>{formatCount(video.shares)} shares</span>}
        </div>

        {/* Hashtags */}
        {video.hashtags && video.hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {video.hashtags.slice(0, 4).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-[9px] px-1 py-0">
                {tag.startsWith('#') ? tag : `#${tag}`}
              </Badge>
            ))}
            {video.hashtags.length > 4 && (
              <Badge variant="secondary" className="text-[9px] px-1 py-0">
                +{video.hashtags.length - 4}
              </Badge>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-1.5">
          {onToggleSwipe && (
            <Button
              variant="ghost"
              size="sm"
              className={`h-6 text-[10px] px-1.5 ${isSwiped ? 'text-yellow-500' : 'text-muted-foreground hover:text-yellow-500'}`}
              onClick={onToggleSwipe}
            >
              <Star className={`h-2.5 w-2.5 ${isSwiped ? 'fill-yellow-500' : ''}`} />
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="h-6 text-[10px] px-2"
            onClick={() => onAnalyze(video)}
          >
            <Brain className="h-2.5 w-2.5 mr-1" />
            Analyze Script
          </Button>
          {clients.length > 0 && (
            <Select onValueChange={(clientId) => toast.success(`Adapted for ${clients.find(c => c.id === clientId)?.name}`)}>
              <SelectTrigger className="h-6 w-auto text-[10px] px-2 border-border">
                <UserPlus className="h-2.5 w-2.5 mr-1" />
                Adapt for Client
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id} className="text-xs">{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button
            variant="outline"
            size="sm"
            className="h-6 text-[10px] px-2"
            onClick={() => navigate('/batch-video')}
          >
            <Video className="h-2.5 w-2.5 mr-1" />
            Recreate
          </Button>
          {video.source_url && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-[10px] px-1.5"
              asChild
            >
              <a href={video.source_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-2.5 w-2.5" />
              </a>
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-[10px] px-1.5 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
            onClick={() => onDelete(video)}
          >
            <Trash2 className="h-2.5 w-2.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
