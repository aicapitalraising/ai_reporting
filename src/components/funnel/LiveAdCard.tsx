import { useState } from 'react';
import { ExternalLink, Trash2, Sparkles, Globe, MoreVertical, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LiveAd, useDeleteLiveAd, useAnalyzeLiveAd } from '@/hooks/useLiveAds';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';

interface LiveAdCardProps {
  ad: LiveAd;
  isPublicView?: boolean;
}

export function LiveAdCard({ ad, isPublicView = false }: LiveAdCardProps) {
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const deleteAd = useDeleteLiveAd();
  const analyzeAd = useAnalyzeLiveAd();

  const handleDelete = () => {
    if (confirm('Remove this ad from your library?')) {
      deleteAd.mutate({ adId: ad.id, clientId: ad.client_id });
    }
  };

  const handleAnalyze = () => {
    analyzeAd.mutate({ ad });
  };

  const openInLibrary = () => {
    if (ad.ad_library_url) {
      window.open(ad.ad_library_url, '_blank');
    }
  };

  const platformColors: Record<string, string> = {
    facebook: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    instagram: 'bg-pink-500/10 text-pink-600 border-pink-500/20',
    messenger: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
    'audience network': 'bg-gray-500/10 text-gray-600 border-gray-500/20',
  };

  return (
    <>
      <Card className="overflow-hidden border-2 border-border hover:border-primary/50 transition-colors">
        {/* Browser Chrome Header */}
        <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 border-b border-border">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-destructive/70" />
            <div className="w-2.5 h-2.5 rounded-full bg-chart-4" />
            <div className="w-2.5 h-2.5 rounded-full bg-chart-2" />
          </div>
          <div className="flex-1 mx-2">
            <div className="flex items-center gap-1.5 bg-background rounded px-2 py-0.5 text-xs text-muted-foreground">
              <Globe className="h-3 w-3" />
              <span className="truncate">facebook.com/ads/library</span>
            </div>
          </div>
          {!isPublicView && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <MoreVertical className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={openInLibrary}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View in Ads Library
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleAnalyze} disabled={analyzeAd.isPending}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Analyze with AI
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remove
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <CardContent className="p-0">
          {/* Ad Preview */}
          <div className="relative aspect-square bg-muted">
            {ad.thumbnail_url ? (
              <img
                src={ad.thumbnail_url}
                alt={ad.headline || 'Ad preview'}
                className="w-full h-full object-cover"
              />
            ) : ad.media_urls && ad.media_urls.length > 0 ? (
              <img
                src={ad.media_urls[0]}
                alt={ad.headline || 'Ad preview'}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                <Globe className="h-12 w-12 opacity-20" />
              </div>
            )}
            
            {/* Media type badge */}
            {ad.media_type && ad.media_type !== 'image' && (
              <Badge 
                variant="secondary" 
                className="absolute top-2 left-2 text-xs capitalize"
              >
                {ad.media_type}
              </Badge>
            )}

            {/* Analyzing overlay */}
            {analyzeAd.isPending && (
              <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span className="text-sm">Analyzing...</span>
                </div>
              </div>
            )}
          </div>

          {/* Ad Content */}
          <div className="p-3 space-y-2">
            {/* Page Name */}
            {ad.page_name && (
              <p className="text-sm font-medium truncate">{ad.page_name}</p>
            )}

            {/* Primary Text */}
            {ad.primary_text && (
              <p className="text-xs text-muted-foreground line-clamp-2">
                {ad.primary_text}
              </p>
            )}

            {/* Headline */}
            {ad.headline && (
              <p className="text-sm font-semibold line-clamp-1">{ad.headline}</p>
            )}

            {/* CTA */}
            {ad.cta_type && (
              <Button size="sm" variant="secondary" className="w-full text-xs h-7">
                {ad.cta_type}
              </Button>
            )}

            {/* Platforms */}
            {ad.platforms && ad.platforms.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {ad.platforms.map((platform) => (
                  <Badge
                    key={platform}
                    variant="outline"
                    className={cn('text-[10px] capitalize', platformColors[platform.toLowerCase()])}
                  >
                    {platform}
                  </Badge>
                ))}
              </div>
            )}

            {/* AI Analysis indicator */}
            {ad.ai_analysis && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs h-7 text-primary"
                onClick={() => setAnalysisOpen(true)}
              >
                <Sparkles className="h-3 w-3 mr-1" />
                View AI Analysis
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Analysis Modal */}
      <Dialog open={analysisOpen} onOpenChange={setAnalysisOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Analysis - {ad.page_name || 'Live Ad'}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="prose prose-sm dark:prose-invert max-w-none">
              {ad.ai_analysis?.audit ? (
                <ReactMarkdown>{String(ad.ai_analysis.audit)}</ReactMarkdown>
              ) : (
                <p className="text-muted-foreground">No analysis available</p>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
