import { useEffect, useRef } from 'react';
import { ScrapedAd } from '@/hooks/useAdScraping';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Globe, Trash2, Check, Play, Brain, Star } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { getEmbedInfo, getPlatformLabel } from '@/lib/video-embed';

interface AdCardProps {
  ad: ScrapedAd;
  onAssign?: (ad: ScrapedAd) => void;
  onDelete?: (ad: ScrapedAd) => void;
  onRemove?: () => void;
  onAnalyze?: (ad: ScrapedAd) => void;
  selectable?: boolean;
  selected?: boolean;
  onSelectChange?: (checked: boolean) => void;
  isSwiped?: boolean;
  onToggleSwipe?: (ad: ScrapedAd) => void;
}

export function AdCard({ ad, onAssign, onDelete, onRemove, onAnalyze, selectable, selected, onSelectChange, isSwiped, onToggleSwipe }: AdCardProps) {
  const startedDaysAgo = ad.start_date
    ? formatDistanceToNow(new Date(ad.start_date), { addSuffix: false })
    : null;

  const embedInfo = getEmbedInfo(ad.source_url);
  const isVideoAd = ad.ad_format === 'Video';
  const hasEmbed = isVideoAd && !!embedInfo.embedUrl;

  return (
    <div className={`group rounded-lg border overflow-hidden transition-all duration-200 ${selected ? 'border-primary ring-1 ring-primary/30' : 'border-border bg-card'}`}>
      {/* Top metrics bar */}
      <div className="flex items-center justify-between px-3 py-2 text-xs">
        <div className="flex items-center gap-1.5">
          {selectable && (
            <Checkbox
              checked={selected}
              onCheckedChange={(v) => onSelectChange?.(!!v)}
              className="h-4 w-4 mr-1"
            />
          )}
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />
            <span className="font-semibold text-emerald-600">{ad.status === 'Active' ? 'ACTIVE' : ad.status === 'Paused' ? 'PAUSED' : 'ENDED'}</span>
          </span>
          {isVideoAd && (
            <Badge variant="outline" className="text-[9px] h-4 px-1.5 ml-1">Video</Badge>
          )}
        </div>
        <div className="flex items-center gap-3 text-muted-foreground text-[11px]">
          {startedDaysAgo && <span>Started {startedDaysAgo} ago</span>}
          <span className="font-semibold text-foreground">{(ad.reach || 0).toLocaleString()}</span>
          <span className="text-muted-foreground text-[10px]">REACH</span>
          <span className="font-semibold text-foreground">{ad.ad_count || 1}</span>
          <span className="text-muted-foreground text-[10px]">ADS</span>
        </div>
      </div>

      {/* Company header */}
      <div className="flex items-center gap-2.5 px-3 pb-2">
        <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-xs font-bold shrink-0 text-muted-foreground">
          {ad.company.split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{ad.company}</p>
          <p className="text-[11px] text-muted-foreground flex items-center gap-1">
            Sponsored · <Globe className="h-3 w-3" />
          </p>
        </div>
        <div className="flex items-center gap-1">
          {/* Save to Swipe File */}
          {onToggleSwipe && (
            <Button
              size="icon"
              variant="ghost"
              className={`h-7 w-7 ${isSwiped ? 'text-yellow-500' : 'text-muted-foreground hover:text-yellow-500'}`}
              onClick={() => onToggleSwipe(ad)}
              title={isSwiped ? 'Remove from Swipe File' : 'Save to Swipe File'}
            >
              <Star className={`h-3.5 w-3.5 ${isSwiped ? 'fill-yellow-500' : ''}`} />
            </Button>
          )}
          {/* Analyze button for video ads */}
          {isVideoAd && onAnalyze && (
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-muted-foreground hover:text-primary"
              onClick={() => onAnalyze(ad)}
              title="Analyze Script"
            >
              <Brain className="h-3.5 w-3.5" />
            </Button>
          )}
          {onDelete && (
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
              onClick={() => onDelete(ad)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Description text */}
      {ad.description && (
        <p className="px-3 pb-2 text-xs text-foreground leading-relaxed line-clamp-4">
          {ad.description}
        </p>
      )}

      {/* Creative image / video embed area */}
      <div className="relative w-full bg-muted/30">
        {selected && (
          <div className="absolute top-2 right-2 z-10 h-6 w-6 rounded-full bg-emerald-500 flex items-center justify-center shadow-md">
            <Check className="h-3.5 w-3.5 text-white" />
          </div>
        )}

        {/* Show YouTube thumbnail with play overlay for video ads */}
        {hasEmbed && embedInfo.thumbnailUrl ? (
          <div
            className="relative cursor-pointer"
            onClick={() => onAnalyze?.(ad)}
          >
            <img
              src={embedInfo.thumbnailUrl}
              alt={ad.headline}
              className="w-full object-cover aspect-video"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent flex items-center justify-center">
              <div className="w-14 h-14 rounded-full bg-black/60 flex items-center justify-center backdrop-blur-sm transition-transform hover:scale-110">
                <Play className="h-6 w-6 text-white ml-0.5" />
              </div>
            </div>
            <Badge className="absolute top-2 left-2 text-[9px] bg-black/60 border-none text-white">
              {getPlatformLabel(embedInfo.type)}
            </Badge>
          </div>
        ) : ad.image_url ? (
          <img
            src={ad.image_url}
            alt={ad.headline}
            className="w-full object-contain max-h-[400px]"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
              (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
              if (onDelete) {
                console.log('Auto-deleting ad with broken image:', ad.id);
                onDelete(ad);
              }
            }}
            onLoad={(e) => {
              const img = e.target as HTMLImageElement;
              const w = img.naturalWidth;
              const h = img.naturalHeight;
              if (w < 200 || h < 200) {
                img.style.display = 'none';
                img.nextElementSibling?.classList.remove('hidden');
                onDelete?.(ad);
                return;
              }
              const ratio = w / h;
              const validRatios = [
                { name: '1:1', value: 1, tolerance: 0.25 },
                { name: '9:16', value: 9 / 16, tolerance: 0.15 },
                { name: '16:9', value: 16 / 9, tolerance: 0.3 },
                { name: '4:5', value: 4 / 5, tolerance: 0.15 },
              ];
              const isValidRatio = validRatios.some((r) => Math.abs(ratio - r.value) <= r.tolerance);
              if (!isValidRatio) {
                img.style.display = 'none';
                img.nextElementSibling?.classList.remove('hidden');
                onDelete?.(ad);
              }
            }}
          />
        ) : null}
        <div className={`flex flex-col items-center justify-center py-16 text-muted-foreground ${ad.image_url || (hasEmbed && embedInfo.thumbnailUrl) ? 'hidden' : ''}`}>
          <div className="text-4xl mb-1 opacity-30">{isVideoAd ? '🎬' : '📷'}</div>
          <p className="text-xs opacity-50">{ad.ad_format} Ad</p>
        </div>
      </div>

      {/* Platform + CTA row */}
      <div className="flex items-center justify-between px-3 py-2 border-t border-border/50">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider truncate">
            {ad.source_url ? new URL(ad.source_url).hostname.replace('www.', '').toUpperCase() : ad.platform.toUpperCase() + '.COM'}
          </p>
          <p className="text-sm font-semibold truncate mt-0.5">{ad.headline || `${ad.company} Ad`}</p>
        </div>
        <Button size="sm" variant="outline" className="h-7 text-xs px-3 shrink-0 ml-2 rounded">
          Learn More
        </Button>
      </div>
    </div>
  );
}
