import { useState } from 'react';
import { RefreshCw, Plus, ExternalLink, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LiveAdCard } from './LiveAdCard';
import { ScrapeAdsModal } from './ScrapeAdsModal';
import { useLiveAds, useAnalyzeLiveAd } from '@/hooks/useLiveAds';
import { useClientSettings } from '@/hooks/useClientSettings';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

interface LiveAdsSectionProps {
  clientId: string;
  isPublicView?: boolean;
}

export function LiveAdsSection({ clientId, isPublicView = false }: LiveAdsSectionProps) {
  const [scrapeModalOpen, setScrapeModalOpen] = useState(false);
  const [analyzingAll, setAnalyzingAll] = useState(false);
  const { data: ads = [], isLoading, refetch } = useLiveAds(clientId);
  const { data: clientSettings } = useClientSettings(clientId);
  const analyzeMutation = useAnalyzeLiveAd();

  const lastScrapedAt = ads.length > 0 
    ? new Date(Math.max(...ads.map(ad => new Date(ad.scraped_at).getTime())))
    : null;

  // Get the ads library URL from client settings or construct from first ad
  const adsLibraryUrl = clientSettings?.ads_library_url || 
    (ads[0]?.page_id ? `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&view_all_page_id=${ads[0].page_id}` : null);

  const handleOpenAllInLibrary = () => {
    if (adsLibraryUrl) {
      window.open(adsLibraryUrl, '_blank');
    } else {
      toast.error('No Ads Library URL configured');
    }
  };

  const handleAnalyzeAll = async () => {
    if (ads.length === 0) return;
    
    setAnalyzingAll(true);
    const unanalyzedAds = ads.filter(ad => !ad.ai_analysis || Object.keys(ad.ai_analysis).length === 0);
    
    if (unanalyzedAds.length === 0) {
      toast.info('All ads have already been analyzed');
      setAnalyzingAll(false);
      return;
    }

    toast.info(`Analyzing ${unanalyzedAds.length} ads...`);
    
    for (const ad of unanalyzedAds) {
      try {
        await analyzeMutation.mutateAsync({ ad });
      } catch (error) {
        console.error('Error analyzing ad:', error);
      }
    }
    
    setAnalyzingAll(false);
    toast.success(`Finished analyzing ${unanalyzedAds.length} ads`);
  };

  const analyzedCount = ads.filter(ad => ad.ai_analysis && Object.keys(ad.ai_analysis).length > 0).length;

  return (
    <>
      <Card className="border-2 border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              <CardTitle className="text-lg font-bold">Live Ads</CardTitle>
              <Badge variant="outline" className="text-xs">
                {ads.length} {ads.length === 1 ? 'ad' : 'ads'}
              </Badge>
              {analyzedCount > 0 && (
                <Badge variant="secondary" className="text-xs gap-1">
                  <Sparkles className="h-3 w-3" />
                  {analyzedCount} analyzed
                </Badge>
              )}
              {lastScrapedAt && (
                <span className="text-xs text-muted-foreground">
                  Last synced {formatDistanceToNow(lastScrapedAt, { addSuffix: true })}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {ads.length > 0 && adsLibraryUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOpenAllInLibrary}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open All in Library
                </Button>
              )}
              {!isPublicView && ads.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAnalyzeAll}
                  disabled={analyzingAll}
                >
                  {analyzingAll ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-2" />
                  )}
                  Analyze All
                </Button>
              )}
              {!isPublicView && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => refetch()}
                    disabled={isLoading}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                  <Button size="sm" onClick={() => setScrapeModalOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Sync from Ads Library
                  </Button>
                </>
              )}
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Active ads from Facebook Ads Library for creative inspiration and AI analysis
          </p>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : ads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ExternalLink className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
              <p className="text-muted-foreground mb-2">No live ads synced yet</p>
              <p className="text-sm text-muted-foreground mb-4">
                Sync ads from Facebook Ads Library to preview and analyze them
              </p>
              {!isPublicView && (
                <Button onClick={() => setScrapeModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Sync Your First Ads
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {ads.map((ad) => (
                <LiveAdCard key={ad.id} ad={ad} isPublicView={isPublicView} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ScrapeAdsModal
        clientId={clientId}
        open={scrapeModalOpen}
        onOpenChange={setScrapeModalOpen}
      />
    </>
  );
}
