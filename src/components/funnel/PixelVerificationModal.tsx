import { useState } from 'react';
import { Loader2, CheckCircle2, XCircle, AlertCircle, ExternalLink, RefreshCw } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

interface PixelVerificationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stepUrl: string;
  stepName: string;
}

interface PixelResult {
  platform: 'meta' | 'google' | 'linkedin' | 'tiktok';
  name: string;
  detected: boolean;
  pixelId?: string;
  events?: string[];
  confidence: 'high' | 'medium' | 'low';
}

interface VerificationResult {
  success: boolean;
  pixels: PixelResult[];
  scannedAt: string;
  error?: string;
}

const PLATFORM_ICONS: Record<string, { color: string; bgColor: string }> = {
  meta: { color: 'text-blue-600', bgColor: 'bg-blue-100' },
  google: { color: 'text-green-600', bgColor: 'bg-green-100' },
  linkedin: { color: 'text-blue-700', bgColor: 'bg-blue-50' },
  tiktok: { color: 'text-pink-600', bgColor: 'bg-pink-100' },
};

export function PixelVerificationModal({
  open,
  onOpenChange,
  stepUrl,
  stepName,
}: PixelVerificationModalProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);

  const runVerification = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('verify-pixels', {
        body: { url: stepUrl }
      });
      
      if (error) throw error;
      setResult(data);
    } catch (err: any) {
      console.error('Pixel verification failed:', err);
      setResult({
        success: false,
        pixels: [],
        scannedAt: new Date().toISOString(),
        error: err.message || 'Failed to verify pixels'
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (detected: boolean, confidence: string) => {
    if (!detected) {
      return <XCircle className="h-5 w-5 text-destructive" />;
    }
    if (confidence === 'high') {
      return <CheckCircle2 className="h-5 w-5 text-primary" />;
    }
    return <AlertCircle className="h-5 w-5 text-primary/70" />;
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Pixel Verification
          </DialogTitle>
          <DialogDescription>
            Check if tracking pixels are properly installed on "{stepName}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
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
          {!result && !loading && (
            <Button onClick={runVerification} className="w-full">
              Scan for Tracking Pixels
            </Button>
          )}

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
                                  className="text-xs"
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

              {/* Rescan Button */}
              <Button
                variant="outline"
                onClick={runVerification}
                className="w-full"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Scan Again
              </Button>

              {/* Note */}
              <p className="text-xs text-muted-foreground text-center">
                Note: Pixel detection scans the page HTML for known tracking scripts.
                Some pixels may only fire on specific events (e.g., form submissions).
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
