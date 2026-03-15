import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Download,
  Play,
  Trash2,
  Wand2,
  Image as ImageIcon,
  Film,
  Clock,
} from 'lucide-react';
import type { Asset } from '@/types';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { isGoogleApiUrl, fetchVideoViaProxy } from '@/lib/video-proxy';

interface AssetCardProps {
  asset: Asset;
  onClick?: () => void;
  onDownload?: () => void;
  onDelete?: () => void;
  onAIEdit?: () => void;
  compact?: boolean;
}

export function AssetCard({
  asset,
  onClick,
  onDownload,
  onDelete,
  onAIEdit,
  compact = false,
}: AssetCardProps) {
  const isVideo = asset.type === 'video' || asset.type === 'broll';
  const metadata = asset.metadata as Record<string, unknown> || {};
  const [proxiedUrl, setProxiedUrl] = useState<string | null>(null);

  // Proxy Google API URLs for video preview
  useEffect(() => {
    if (isVideo && asset.public_url && isGoogleApiUrl(asset.public_url)) {
      fetchVideoViaProxy(asset.public_url).then(setProxiedUrl).catch(() => {});
    }
    return () => {
      if (proxiedUrl) URL.revokeObjectURL(proxiedUrl);
    };
  }, [asset.public_url]);

  const videoSrc = proxiedUrl || (isVideo && asset.public_url && !isGoogleApiUrl(asset.public_url) ? asset.public_url : undefined);

  const handleAction = (e: React.MouseEvent, action?: () => void) => {
    e.stopPropagation();
    action?.();
  };

  return (
    <Card
      className={cn(
        'overflow-hidden transition-all group cursor-pointer hover:border-primary/50',
        asset.status === 'generating' && 'animate-pulse'
      )}
      onClick={onClick}
    >
      {/* Thumbnail */}
      <div
        className={cn(
          'relative bg-muted flex items-center justify-center',
          compact ? 'aspect-video' : 'aspect-square'
        )}
      >
        {asset.public_url && asset.status === 'completed' ? (
          isVideo ? (
            <>
              {videoSrc ? (
                <video
                  src={videoSrc}
                  className="w-full h-full object-cover"
                  muted
                  preload="metadata"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
                <Play className="h-10 w-10 text-white drop-shadow-lg group-hover:scale-110 transition-transform" />
              </div>
            </>
          ) : (
            <img
              src={asset.public_url}
              alt={asset.name || 'Asset'}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          )
        ) : (
          <div className="text-muted-foreground">
            {isVideo ? (
              <Film className="h-10 w-10" />
            ) : (
              <ImageIcon className="h-10 w-10" />
            )}
          </div>
        )}

        {/* Status overlay for generating */}
        {asset.status === 'generating' && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80">
            <div className="text-center">
              <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <span className="text-sm text-muted-foreground">Generating...</span>
            </div>
          </div>
        )}

        {/* Quick actions on hover */}
        {asset.status === 'completed' && (
          <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {onDownload && (
              <Button
                size="icon"
                variant="secondary"
                className="h-8 w-8"
                onClick={(e) => handleAction(e, onDownload)}
              >
                <Download className="h-4 w-4" />
              </Button>
            )}
            {onAIEdit && (
              <Button
                size="icon"
                variant="secondary"
                className="h-8 w-8"
                onClick={(e) => handleAction(e, onAIEdit)}
              >
                <Wand2 className="h-4 w-4" />
              </Button>
            )}
            {onDelete && (
              <Button
                size="icon"
                variant="destructive"
                className="h-8 w-8"
                onClick={(e) => handleAction(e, onDelete)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Info */}
      {!compact && (
        <CardContent className="p-3 space-y-2">
          <p className="text-sm font-medium truncate">
            {asset.name || `${asset.type}-${asset.id.slice(0, 8)}`}
          </p>
          
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="outline" className="text-xs capitalize">
              {asset.type}
            </Badge>
            {metadata.aspectRatio && (
              <Badge variant="secondary" className="text-xs">
                {String(metadata.aspectRatio)}
              </Badge>
            )}
            {metadata.duration && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {String(metadata.duration)}s
              </span>
            )}
          </div>

          {metadata.prompt && (
            <p className="text-xs text-muted-foreground line-clamp-2">
              {String(metadata.prompt)}
            </p>
          )}
        </CardContent>
      )}
    </Card>
  );
}
