import { useState } from 'react';
import { useInstagramCreatives, useToggleInspiration } from '@/hooks/useInstagramScraper';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Search, Heart, MessageCircle, Eye, Star, StarOff, ExternalLink, Play } from 'lucide-react';
import { InstagramCreativeDetail } from './InstagramCreativeDetail';

export function InstagramMediaGrid() {
  const [search, setSearch] = useState('');
  const [postType, setPostType] = useState('all');
  const [selectedCreative, setSelectedCreative] = useState<any | null>(null);

  const { data: creatives = [], isLoading } = useInstagramCreatives({
    search: search || undefined,
    postType: postType !== 'all' ? postType : undefined,
  });
  const toggleInspiration = useToggleInspiration();

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search captions, usernames..."
            className="pl-9"
          />
        </div>
        <Select value={postType} onValueChange={setPostType}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Post type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="Image">Image</SelectItem>
            <SelectItem value="Video">Video</SelectItem>
            <SelectItem value="Reel">Reel</SelectItem>
            <SelectItem value="Sidecar">Carousel</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Badge variant="outline">{creatives.length} creatives</Badge>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading creatives...</div>
      ) : creatives.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No creatives found. Run a scrape to get started.
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {creatives.map((creative) => (
            <Card
              key={creative.id}
              className="group cursor-pointer overflow-hidden hover:ring-2 hover:ring-primary/50 transition-all"
              onClick={() => setSelectedCreative(creative)}
            >
              <div className="relative aspect-square bg-muted">
                {creative.media_url || creative.thumbnail_url ? (
                  <img
                    src={creative.thumbnail_url || creative.media_url || ''}
                    alt={creative.caption?.slice(0, 50) || 'Instagram post'}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                    No image
                  </div>
                )}
                {(creative.post_type === 'Video' || creative.post_type === 'Reel') && (
                  <div className="absolute top-2 right-2">
                    <Badge variant="secondary" className="text-[10px] gap-0.5">
                      <Play className="h-2.5 w-2.5" /> {creative.post_type}
                    </Badge>
                  </div>
                )}
                {creative.is_inspiration_source && (
                  <div className="absolute top-2 left-2">
                    <Badge className="text-[10px] gap-0.5 bg-yellow-500 text-yellow-950">
                      <Star className="h-2.5 w-2.5" /> Inspiration
                    </Badge>
                  </div>
                )}
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 text-white">
                  <span className="flex items-center gap-1 text-sm"><Heart className="h-4 w-4" /> {(creative.likes_count || 0).toLocaleString()}</span>
                  <span className="flex items-center gap-1 text-sm"><MessageCircle className="h-4 w-4" /> {(creative.comments_count || 0).toLocaleString()}</span>
                  {(creative.views_count || 0) > 0 && (
                    <span className="flex items-center gap-1 text-sm"><Eye className="h-4 w-4" /> {(creative.views_count || 0).toLocaleString()}</span>
                  )}
                </div>
              </div>
              <CardContent className="p-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground truncate">
                    @{creative.owner_username || 'unknown'}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleInspiration.mutate({ id: creative.id, value: !creative.is_inspiration_source });
                    }}
                  >
                    {creative.is_inspiration_source ? (
                      <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
                    ) : (
                      <StarOff className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selectedCreative && (
        <InstagramCreativeDetail
          creative={selectedCreative}
          open={!!selectedCreative}
          onClose={() => setSelectedCreative(null)}
        />
      )}
    </div>
  );
}
