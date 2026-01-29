import { useState } from 'react';
import { Loader2, CheckCircle2, XCircle, AlertCircle, ExternalLink, RefreshCw, History, Settings, Zap } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  useRunPixelVerification, 
  usePixelVerificationHistory,
  useLatestPixelVerification,
  VerificationResult,
  DetectedEvent,
  getVerificationStatusInfo 
} from '@/hooks/usePixelVerification';
import { ExpectedEventsConfig } from './ExpectedEventsConfig';
import { formatDistanceToNow } from 'date-fns';

interface PixelVerificationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stepUrl: string;
  stepName: string;
  stepId?: string;
  clientId?: string;
  isPublicView?: boolean;
}

const PLATFORM_COLORS: Record<string, { badge: string; text: string }> = {
  meta: { badge: 'bg-blue-100 text-blue-700', text: 'text-blue-600' },
  google: { badge: 'bg-green-100 text-green-700', text: 'text-green-600' },
  linkedin: { badge: 'bg-sky-100 text-sky-700', text: 'text-sky-600' },
  tiktok: { badge: 'bg-pink-100 text-pink-700', text: 'text-pink-600' },
};

export function PixelVerificationModal({
  open,
  onOpenChange,
  stepUrl,
  stepName,
  stepId,
  clientId,
  isPublicView = false,
}: PixelVerificationModalProps) {
  const [activeTab, setActiveTab] = useState('results');
  const [result, setResult] = useState<VerificationResult | null>(null);
  
  const runVerification = useRunPixelVerification();
  const { data: history = [] } = usePixelVerificationHistory(stepId);
  const { data: latestVerification } = useLatestPixelVerification(stepId);
  
  const loading = runVerification.isPending;
  
  const handleRunVerification = async () => {
    setResult(null);
    
    const data = await runVerification.mutateAsync({
      url: stepUrl,
      stepId,
      clientId,
      persistResults: !!stepId && !!clientId,
    });
    
    setResult(data);
  };

  const getStatusIcon = (detected: boolean, confidence: string) => {
    if (!detected) {
      return <XCircle className="h-5 w-5 text-destructive" />;
    }
    if (confidence === 'high') {
      return <CheckCircle2 className="h-5 w-5 text-green-600" />;
    }
    return <AlertCircle className="h-5 w-5 text-yellow-600" />;
  };

  const getConfidenceBadge = (confidence: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'outline'> = {
      high: 'default',
      medium: 'secondary',
      low: 'outline',
    };
    return (
      <Badge variant={variants[confidence] || 'outline'} className="text-xs">
        {confidence} confidence
      </Badge>
    );
  };
  
  const groupEventsByPlatform = (events: DetectedEvent[]) => {
    return events.reduce((acc, event) => {
      if (!acc[event.platform]) {
        acc[event.platform] = [];
      }
      acc[event.platform].push(event);
      return acc;
    }, {} as Record<string, DetectedEvent[]>);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Pixel Verification
          </DialogTitle>
          <DialogDescription>
            Check tracking pixels and conversion events on "{stepName}"
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="results">Results</TabsTrigger>
            <TabsTrigger value="events">Events</TabsTrigger>
            <TabsTrigger value="expected" className="flex items-center gap-1">
              <Settings className="h-3 w-3" />
              Expected
            </TabsTrigger>
          </TabsList>
          
          <ScrollArea className="flex-1 mt-4">
            {/* Results Tab */}
            <TabsContent value="results" className="mt-0 space-y-4">
              {/* URL Display */}
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <span className="text-xs text-muted-foreground truncate flex-1">
                  {stepUrl}
                </span>
                <a
                  href={stepUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>

              {/* Scan Button */}
              <Button 
                onClick={handleRunVerification} 
                className="w-full"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Scanning...
                  </>
                ) : result ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Scan Again
                  </>
                ) : (
                  'Scan for Tracking Pixels'
                )}
              </Button>

              {/* Loading State */}
              {loading && (
                <div className="flex flex-col items-center py-8 gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">
                    Scanning page for tracking pixels...
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Checking Meta, Google, LinkedIn, TikTok
                  </p>
                </div>
              )}

              {/* Results */}
              {result && !loading && (
                <div className="space-y-4">
                  {result.error ? (
                    <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                      <p className="text-sm text-destructive">{result.error}</p>
                    </div>
                  ) : (
                    <>
                      {/* Summary */}
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          {result.pixels.filter(p => p.detected).length} of {result.pixels.length} pixels detected
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Scanned: {new Date(result.scannedAt).toLocaleTimeString()}
                        </span>
                      </div>

                      {/* Pixel List */}
                      <div className="space-y-3">
                        {result.pixels.map((pixel) => (
                          <div
                            key={pixel.platform}
                            className={`flex items-start gap-3 p-3 rounded-lg border ${
                              pixel.detected ? 'bg-card' : 'bg-muted/50'
                            }`}
                          >
                            {getStatusIcon(pixel.detected, pixel.confidence)}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">{pixel.name}</span>
                                {pixel.detected && getConfidenceBadge(pixel.confidence)}
                              </div>
                              
                              {pixel.detected && pixel.pixelId && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  ID: {pixel.pixelId}
                                </p>
                              )}
                              
                              {pixel.detected && pixel.events && pixel.events.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {pixel.events.map((event) => (
                                    <Badge
                                      key={event}
                                      variant="outline"
                                      className={`text-xs ${PLATFORM_COLORS[pixel.platform]?.badge || ''}`}
                                    >
                                      {event}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                              
                              {!pixel.detected && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Not detected on this page
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {/* Note */}
                  <p className="text-xs text-muted-foreground text-center">
                    Note: Pixel detection scans the page HTML for known tracking scripts.
                    Some pixels may only fire on specific events (e.g., form submissions).
                  </p>
                </div>
              )}
              
              {/* History Preview */}
              {history.length > 0 && !result && !loading && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <History className="h-4 w-4" />
                    Recent Scans
                  </div>
                  <div className="space-y-2">
                    {history.slice(0, 3).map((h) => {
                      const statusInfo = getVerificationStatusInfo(h.status);
                      return (
                        <div 
                          key={h.id}
                          className="flex items-center justify-between p-2 bg-muted/50 rounded text-sm"
                        >
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${statusInfo.bgColor} ${statusInfo.color}`}
                            >
                              {statusInfo.label}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {h.events_detected?.length || 0} events
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(h.scanned_at), { addSuffix: true })}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Events Tab */}
            <TabsContent value="events" className="mt-0 space-y-4">
              {result?.allEvents && result.allEvents.length > 0 ? (
                <>
                  <div className="text-sm text-muted-foreground">
                    All conversion events detected on this page:
                  </div>
                  
                  {Object.entries(groupEventsByPlatform(result.allEvents)).map(([platform, events]) => (
                    <div key={platform} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          platform === 'meta' ? 'bg-blue-500' :
                          platform === 'google' ? 'bg-green-500' :
                          platform === 'linkedin' ? 'bg-sky-500' :
                          'bg-pink-500'
                        }`} />
                        <span className="text-sm font-medium capitalize">{platform}</span>
                        <Badge variant="secondary" className="text-xs">
                          {events.length} events
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-2 ml-4">
                        {events.map((event, idx) => (
                          <Badge
                            key={`${event.event}-${idx}`}
                            variant="outline"
                            className={`${PLATFORM_COLORS[platform]?.badge || ''}`}
                          >
                            {event.event}
                            {event.type === 'custom' && (
                              <span className="ml-1 text-[10px] opacity-70">(custom)</span>
                            )}
                            {event.conversionId && (
                              <span className="ml-1 text-[10px] opacity-70">
                                ({event.conversionId})
                              </span>
                            )}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  {result ? (
                    'No conversion events detected. Run a scan to detect events.'
                  ) : (
                    'Run a scan to detect all conversion events on this page.'
                  )}
                </div>
              )}
            </TabsContent>

            {/* Expected Events Tab */}
            <TabsContent value="expected" className="mt-0">
              {stepId ? (
                <ExpectedEventsConfig stepId={stepId} isPublicView={isPublicView} />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Expected events configuration is not available for this step.
                </div>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
