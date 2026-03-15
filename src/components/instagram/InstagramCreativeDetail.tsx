import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Heart, MessageCircle, Eye, ExternalLink, Star, Calendar } from 'lucide-react';
import { useToggleInspiration } from '@/hooks/useInstagramScraper';
import { format } from 'date-fns';

interface Props {
  creative: any;
  open: boolean;
  onClose: () => void;
}

export function InstagramCreativeDetail({ creative, open, onClose }: Props) {
  const toggleInspiration = useToggleInspiration();

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>@{creative.owner_username || 'unknown'}</span>
            <Badge variant="outline">{creative.post_type}</Badge>
            {creative.is_ad && <Badge variant="destructive">Sponsored</Badge>}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Media */}
          {creative.video_url ? (
            <video
              src={creative.video_url}
              controls
              className="w-full rounded-lg max-h-[400px] object-contain bg-black"
              poster={creative.thumbnail_url || undefined}
            />
          ) : creative.media_url ? (
            <img
              src={creative.media_url}
              alt="Post"
              className="w-full rounded-lg max-h-[400px] object-contain bg-muted"
            />
          ) : null}

          {/* Metrics */}
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 text-sm">
              <Heart className="h-4 w-4 text-red-500" /> {(creative.likes_count || 0).toLocaleString()}
            </span>
            <span className="flex items-center gap-1 text-sm">
              <MessageCircle className="h-4 w-4" /> {(creative.comments_count || 0).toLocaleString()}
            </span>
            {(creative.views_count || 0) > 0 && (
              <span className="flex items-center gap-1 text-sm">
                <Eye className="h-4 w-4" /> {(creative.views_count || 0).toLocaleString()}
              </span>
            )}
            {creative.posted_at && (
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" /> {format(new Date(creative.posted_at), 'MMM d, yyyy')}
              </span>
            )}
          </div>

          {/* Caption */}
          {creative.caption && (
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-sm whitespace-pre-wrap">{creative.caption}</p>
            </div>
          )}

          {/* Hashtags */}
          {creative.hashtags?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {creative.hashtags.map((h: string, i: number) => (
                <Badge key={i} variant="secondary" className="text-xs">#{h}</Badge>
              ))}
            </div>
          )}

          {/* Location */}
          {creative.location_name && (
            <p className="text-sm text-muted-foreground">📍 {creative.location_name}</p>
          )}

          {/* Inspiration toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg border">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-yellow-500" />
              <Label>Use as Inspiration Source</Label>
            </div>
            <Switch
              checked={creative.is_inspiration_source}
              onCheckedChange={(v) => toggleInspiration.mutate({ id: creative.id, value: v })}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            {creative.permalink && (
              <Button variant="outline" asChild>
                <a href={creative.permalink} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" /> Open on Instagram
                </a>
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
