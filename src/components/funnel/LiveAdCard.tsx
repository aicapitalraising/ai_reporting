import { useState } from 'react';
import { MoreHorizontal, ExternalLink, Sparkles, Trash2, Loader2, Globe, Image as ImageIcon, Video, Layers, Play } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { LiveAd, useDeleteLiveAd, useAnalyzeLiveAd } from '@/hooks/useLiveAds';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';

interface LiveAdCardProps {
  ad: LiveAd;
  isPublicView?: boolean;
}

// Helper to get the best available image (prioritize larger images)
function getBestImageUrl(ad: LiveAd): string | null {
  if (ad.media_urls && ad.media_urls.length > 0) {
    // Find the first URL that looks like a larger image
    const largeImage = ad.media_urls.find(url => 
      /600|720|1080|1200|scontent/i.test(url)
    );
    if (largeImage) return largeImage;
    return ad.media_urls[0];
  }
  return ad.thumbnail_url;
}

// Get initials from page name
function getInitials(name: string | null): string {
  if (!name) return 'AD';
  const words = name.split(/\s+/).filter(w => w.length > 0);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

// Platform badge component with icons
function PlatformBadge({ platform }: { platform: string }) {
  const label = platform.toLowerCase();
  const displayName = label === 'facebook' ? 'Facebook' 
    : label === 'instagram' ? 'Instagram' 
    : label === 'messenger' ? 'Messenger'
    : platform;
    
  return (
    <Badge variant="outline" className="text-xs px-2 py-0.5 capitalize gap-1.5 bg-background/60">
      {label === 'facebook' && <span className="text-primary font-bold">f</span>}
      {label === 'instagram' && <span className="text-primary font-bold">IG</span>}
      {label === 'messenger' && <span className="text-primary font-bold">M</span>}
      {!['facebook', 'instagram', 'messenger'].includes(label) && <Globe className="h-3 w-3" />}
      {displayName}
    </Badge>
  );
}

// Media type icon
function MediaTypeIcon({ type }: { type: string | null }) {
  const iconClass = "h-3.5 w-3.5";
  switch (type?.toLowerCase()) {
    case 'video':
      return <Video className={iconClass} />;
    case 'carousel':
      return <Layers className={iconClass} />;
    default:
      return <ImageIcon className={iconClass} />;
  }
}

export function LiveAdCard({ ad, isPublicView = false }: LiveAdCardProps) {
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const [showFullText, setShowFullText] = useState(false);
  const deleteMutation = useDeleteLiveAd();
  const analyzeMutation = useAnalyzeLiveAd();

  const bestImage = getBestImageUrl(ad);
  const pageName = ad.page_name || 'Facebook Ad';
  const initials = getInitials(ad.page_name);
  const hasAnalysis = ad.ai_analysis && Object.keys(ad.ai_analysis).length > 0;
  const isVideo = ad.media_type?.toLowerCase() === 'video';

  // Truncate primary text if too long
  const maxTextLength = 200;
  const primaryText = ad.primary_text || '';
  const shouldTruncate = primaryText.length > maxTextLength && !showFullText;
  const displayText = shouldTruncate ? primaryText.slice(0, maxTextLength) + '...' : primaryText;

  const handleAnalyze = () => {
    analyzeMutation.mutate({ ad });
  };

  const handleDelete = () => {
    deleteMutation.mutate({ adId: ad.id, clientId: ad.client_id });
  };

  const openAdsLibrary = () => {
    if (ad.ad_library_url) {
      window.open(ad.ad_library_url, '_blank');
    }
  };

  return (
    <>
      <Card className="group overflow-hidden border border-border hover:border-primary/40 hover:shadow-lg transition-all duration-200 bg-card max-w-md">
        {/* Header - Facebook Style */}
        <div className="p-3 flex items-start justify-between">
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <Avatar className="h-10 w-10 shrink-0 ring-2 ring-primary/10">
              <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 text-primary text-sm font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm text-foreground truncate leading-tight">
                {pageName}
              </p>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <span>Sponsored</span>
                <span>·</span>
                <Globe className="h-3 w-3" />
              </p>
            </div>
          </div>
          
          {!isPublicView && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={openAdsLibrary}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View in Ads Library
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleAnalyze} disabled={analyzeMutation.isPending}>
                  {analyzeMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-2" />
                  )}
                  AI Analysis
                </DropdownMenuItem>
                {hasAnalysis && (
                  <DropdownMenuItem onClick={() => setAnalysisOpen(true)}>
                    <Sparkles className="h-4 w-4 mr-2 text-primary" />
                    View Analysis
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={handleDelete} 
                  className="text-destructive"
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remove
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Primary Text (Ad Copy) - with emoji support */}
        {primaryText && (
          <div className="px-3 pb-3">
            <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
              {displayText}
            </p>
            {shouldTruncate && (
              <button 
                onClick={() => setShowFullText(true)}
                className="text-xs text-primary hover:underline mt-1"
              >
                See more
              </button>
            )}
            {showFullText && primaryText.length > maxTextLength && (
              <button 
                onClick={() => setShowFullText(false)}
                className="text-xs text-muted-foreground hover:underline mt-1 ml-2"
              >
                See less
              </button>
            )}
          </div>
        )}

        {/* Creative Image/Video */}
        <div 
          className="relative bg-muted aspect-square cursor-pointer overflow-hidden"
          onClick={openAdsLibrary}
        >
          {bestImage ? (
            <img
              src={bestImage}
              alt={`${pageName} ad creative`}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              onError={(e) => {
                if (ad.thumbnail_url && e.currentTarget.src !== ad.thumbnail_url) {
                  e.currentTarget.src = ad.thumbnail_url;
                }
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
              <ImageIcon className="h-16 w-16 text-muted-foreground/30" />
            </div>
          )}
          
          {/* Video play overlay */}
          {isVideo && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-foreground/50 rounded-full p-4 backdrop-blur-sm">
                <Play className="h-8 w-8 text-background fill-background" />
              </div>
            </div>
          )}
          
          {/* Media type badge */}
          {ad.media_type && ad.media_type !== 'image' && (
            <Badge 
              variant="secondary" 
              className="absolute top-2 left-2 text-xs gap-1 bg-background/90 backdrop-blur-sm shadow-sm"
            >
              <MediaTypeIcon type={ad.media_type} />
              {ad.media_type}
            </Badge>
          )}

          {/* Analysis indicator */}
          {hasAnalysis && (
            <Badge 
              variant="default" 
              className="absolute top-2 right-2 text-xs gap-1 shadow-sm cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                setAnalysisOpen(true);
              }}
            >
              <Sparkles className="h-3 w-3" />
              Analyzed
            </Badge>
          )}

          {/* Hover overlay */}
          <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/5 transition-colors pointer-events-none" />
        </div>

        {/* Headline & CTA Section */}
        {(ad.headline || ad.cta_type) && (
          <div className="px-3 py-3 border-t border-border bg-muted/30">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                {ad.headline && (
                  <p className="font-semibold text-sm text-foreground line-clamp-2">
                    {ad.headline}
                  </p>
                )}
                {ad.description && (
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                    {ad.description}
                  </p>
                )}
              </div>
              {ad.cta_type && (
                <Button 
                  variant="secondary" 
                  size="sm" 
                  className="shrink-0 text-xs h-8 px-4 font-semibold"
                  onClick={openAdsLibrary}
                >
                  {ad.cta_type.replace(/_/g, ' ')}
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Metadata Footer */}
        <CardContent className="p-3 border-t border-border">
          {/* Start date */}
          {ad.started_running_on && (
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs text-muted-foreground">
                Started running on {format(new Date(ad.started_running_on), 'MMMM d, yyyy')}
              </span>
            </div>
          )}
          
          {/* Platforms */}
          {ad.platforms && ad.platforms.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap mb-3">
              {ad.platforms.map((platform, index) => (
                <PlatformBadge key={index} platform={platform} />
              ))}
            </div>
          )}

          {/* View in Ads Library button */}
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs gap-1.5 h-9"
            onClick={openAdsLibrary}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            View in Ads Library
          </Button>
        </CardContent>
      </Card>

      {/* AI Analysis Dialog */}
      <Dialog open={analysisOpen} onOpenChange={setAnalysisOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Analysis: {pageName}
            </DialogTitle>
          </DialogHeader>
          <div className="prose prose-sm dark:prose-invert max-w-none">
            {ad.ai_analysis?.audit ? (
              <ReactMarkdown>{String(ad.ai_analysis.audit)}</ReactMarkdown>
            ) : (
              <p className="text-muted-foreground">No analysis available yet.</p>
            )}
          </div>
          {ad.last_analyzed_at && (
            <p className="text-xs text-muted-foreground mt-4 pt-4 border-t">
              Analyzed {format(new Date(ad.last_analyzed_at), 'MMM d, yyyy h:mm a')}
            </p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
