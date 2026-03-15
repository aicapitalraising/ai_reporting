import { useState, useMemo } from 'react';
import {
  useViralVideos,
  useViralTrackingTargets,
  useStartViralTracking,
  useDeleteViralTrackingTarget,
  useDeleteViralVideo,
  type ViralVideo,
} from '@/hooks/useViralVideos';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Hash,
  User,
  Plus,
  Loader2,
  X,
  Flame,
  Search,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { ViralVideoCard } from './ViralVideoCard';
import { ViralVideoPreviewDialog } from './ViralVideoPreviewDialog';
import { VideoIntelligenceDialog, type VideoIntelligenceItem } from './VideoIntelligenceDialog';

const VIDEOS_PER_PAGE = 12;

export function ViralVideosSection() {
  const [newHashtag, setNewHashtag] = useState('');
  const [newProfile, setNewProfile] = useState('');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [previewVideo, setPreviewVideo] = useState<ViralVideo | null>(null);
  const [analyzeVideo, setAnalyzeVideo] = useState<VideoIntelligenceItem | null>(null);

  const { data: videos = [], isLoading: videosLoading } = useViralVideos();
  const { data: targets = [] } = useViralTrackingTargets();
  const startTracking = useStartViralTracking();
  const deleteTarget = useDeleteViralTrackingTarget();
  const deleteVideo = useDeleteViralVideo();

  const hashtagTargets = targets.filter((t) => t.type === 'hashtag');
  const profileTargets = targets.filter((t) => t.type === 'profile');

  const categories = useMemo(() => {
    const cats = new Set(videos.map((v) => v.category).filter(Boolean));
    return Array.from(cats).sort();
  }, [videos]);

  const filteredVideos = useMemo(() => {
    let result = videos.filter((v) => {
      if (platformFilter !== 'all' && v.platform !== platformFilter) return false;
      if (categoryFilter !== 'all' && v.category !== categoryFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          v.title.toLowerCase().includes(q) ||
          v.creator_name?.toLowerCase().includes(q) ||
          v.creator_handle?.toLowerCase().includes(q) ||
          (v.hashtags || []).some((h) => h.toLowerCase().includes(q))
        );
      }
      return true;
    });
    return result;
  }, [videos, platformFilter, categoryFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filteredVideos.length / VIDEOS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedVideos = filteredVideos.slice((safePage - 1) * VIDEOS_PER_PAGE, safePage * VIDEOS_PER_PAGE);

  const handleTrack = async (type: 'hashtag' | 'profile', value: string, clear: () => void) => {
    const v = value.trim().replace(/^[#@]/, '');
    if (!v) {
      toast.error(`Enter a ${type}`);
      return;
    }
    try {
      const result = await startTracking.mutateAsync({ type, value: v });
      toast.success(`Found ${result.videosCount} viral videos for "${v}"`);
      clear();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to scrape viral videos');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-500" />
            Viral Videos Tracker
          </h2>
          <p className="text-sm text-muted-foreground">
            Track viral content across TikTok, Instagram, Facebook & LinkedIn — 1M+ views to recreate as ads
          </p>
        </div>
        <Badge variant="outline" className="text-xs">
          {filteredVideos.length} video{filteredVideos.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      {/* Tracking Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Track by Hashtag */}
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Hash className="h-4 w-4 text-primary" />
            Track by Hashtag
          </h3>
          <div className="flex gap-2">
            <Input
              placeholder="e.g. realestateinvesting"
              value={newHashtag}
              onChange={(e) => setNewHashtag(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleTrack('hashtag', newHashtag, () => setNewHashtag(''))}
              className="flex-1"
            />
            <Button
              size="sm"
              onClick={() => handleTrack('hashtag', newHashtag, () => setNewHashtag(''))}
              disabled={startTracking.isPending}
            >
              {startTracking.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
              <span className="ml-1">Add</span>
            </Button>
          </div>
          {hashtagTargets.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {hashtagTargets.map((t) => (
                <Badge key={t.id} variant="secondary" className="gap-1 pr-1 text-xs">
                  #{t.value}
                  <button
                    onClick={() => deleteTarget.mutate(t.id)}
                    className="ml-0.5 rounded-full p-0.5 hover:bg-destructive/20 transition-colors"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Track by Profile */}
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            Track by Profile
          </h3>
          <div className="flex gap-2">
            <Input
              placeholder="e.g. garyvee"
              value={newProfile}
              onChange={(e) => setNewProfile(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleTrack('profile', newProfile, () => setNewProfile(''))}
              className="flex-1"
            />
            <Button
              size="sm"
              onClick={() => handleTrack('profile', newProfile, () => setNewProfile(''))}
              disabled={startTracking.isPending}
            >
              {startTracking.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
              <span className="ml-1">Add</span>
            </Button>
          </div>
          {profileTargets.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {profileTargets.map((t) => (
                <Badge key={t.id} variant="secondary" className="gap-1 pr-1 text-xs">
                  @{t.value}
                  <button
                    onClick={() => deleteTarget.mutate(t.id)}
                    className="ml-0.5 rounded-full p-0.5 hover:bg-destructive/20 transition-colors"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Scanning indicator */}
      {startTracking.isPending && (
        <div className="flex items-center gap-2 rounded-lg border border-orange-500/30 bg-orange-500/5 px-4 py-3 text-sm text-orange-600">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="font-medium">Scanning platforms...</span>
          <span className="text-muted-foreground">Searching for viral content across social media</span>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search videos, creators, hashtags…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            className="pl-9 h-9"
          />
        </div>
        <Select value={platformFilter} onValueChange={(v) => { setPlatformFilter(v); setCurrentPage(1); }}>
          <SelectTrigger className="w-[130px] h-9">
            <SelectValue placeholder="All Platforms" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Platforms</SelectItem>
            <SelectItem value="TikTok">TikTok</SelectItem>
            <SelectItem value="Instagram">Instagram</SelectItem>
            <SelectItem value="Facebook">Facebook</SelectItem>
            <SelectItem value="LinkedIn">LinkedIn</SelectItem>
          </SelectContent>
        </Select>
        {categories.length > 0 && (
          <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setCurrentPage(1); }}>
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c} value={c!}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Video Cards */}
      {videosLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : paginatedVideos.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {paginatedVideos.map((video) => (
            <ViralVideoCard
              key={video.id}
              video={video}
              onDelete={(id) => deleteVideo.mutate(id)}
              onPreviewFullscreen={setPreviewVideo}
              onAnalyze={(v) => setAnalyzeVideo(v as VideoIntelligenceItem)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 text-muted-foreground">
          <Flame className="h-8 w-8 mx-auto mb-3 opacity-50" />
          <p className="text-lg font-medium">
            {videos.length === 0 ? 'No viral videos tracked yet' : 'No videos match your filters'}
          </p>
          <p className="text-sm mt-1">
            {videos.length === 0
              ? 'Enter a hashtag or profile above to start tracking viral content'
              : 'Try adjusting your search or filters'}
          </p>
        </div>
      )}

      {/* Pagination */}
      {filteredVideos.length > VIDEOS_PER_PAGE && (
        <div className="flex items-center justify-between pt-2 border-t border-border/30">
          <span className="text-xs text-muted-foreground">
            Showing {(safePage - 1) * VIDEOS_PER_PAGE + 1}-{Math.min(safePage * VIDEOS_PER_PAGE, filteredVideos.length)} of {filteredVideos.length}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-7 text-xs" disabled={safePage <= 1} onClick={() => setCurrentPage(safePage - 1)}>
              <ChevronLeft className="h-3 w-3 mr-1" /> Previous
            </Button>
            <span className="text-xs text-muted-foreground">Page {safePage} of {totalPages}</span>
            <Button variant="outline" size="sm" className="h-7 text-xs" disabled={safePage >= totalPages} onClick={() => setCurrentPage(safePage + 1)}>
              Next <ChevronRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Fullscreen Preview Dialog */}
      <ViralVideoPreviewDialog
        open={!!previewVideo}
        onOpenChange={(open) => !open && setPreviewVideo(null)}
        video={previewVideo}
      />

      {/* Video Intelligence Dialog */}
      <VideoIntelligenceDialog
        open={!!analyzeVideo}
        onOpenChange={(open) => !open && setAnalyzeVideo(null)}
        item={analyzeVideo}
      />
    </div>
  );
}
