import { useState } from 'react';
import { Edit2, ExternalLink, Trash2, Gauge, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { PageSpeedModal } from './PageSpeedModal';
import { supabase } from '@/integrations/supabase/client';
import type { FunnelStep } from '@/hooks/useFunnelSteps';
import type { DeviceType } from './DeviceSwitcher';

interface FunnelStepCardProps {
  step: FunnelStep;
  stepNumber: number;
  deviceType: DeviceType;
  isPublicView: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

interface PageSpeedResults {
  performanceScore: number;
  metrics: {
    firstContentfulPaint: string;
    speedIndex: string;
    largestContentfulPaint: string;
    timeToInteractive: string;
    totalBlockingTime: string;
    cumulativeLayoutShift: string;
  };
}

export function FunnelStepCard({
  step,
  stepNumber,
  deviceType,
  isPublicView,
  onEdit,
  onDelete,
}: FunnelStepCardProps) {
  const [speedTestLoading, setSpeedTestLoading] = useState(false);
  const [speedResults, setSpeedResults] = useState<PageSpeedResults | null>(null);
  const [speedModalOpen, setSpeedModalOpen] = useState(false);

  const getDomain = (url: string) => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return url;
    }
  };

  const runSpeedTest = async () => {
    setSpeedTestLoading(true);
    try {
      const strategy = deviceType === 'desktop' ? 'desktop' : 'mobile';
      const { data, error } = await supabase.functions.invoke('pagespeed-test', {
        body: { url: step.url, strategy }
      });
      
      if (error) throw error;
      setSpeedResults(data);
      setSpeedModalOpen(true);
    } catch (err: any) {
      console.error('PageSpeed test failed:', err);
    } finally {
      setSpeedTestLoading(false);
    }
  };

  // Determine card width based on device type for thumbnails
  const getCardWidth = () => {
    switch (deviceType) {
      case 'desktop':
        return 'w-72';
      case 'tablet':
        return 'w-56';
      default:
        return 'w-48';
    }
  };

  const getThumbnailHeight = () => {
    switch (deviceType) {
      case 'desktop':
        return 'h-40';
      case 'tablet':
        return 'h-48';
      default:
        return 'h-56';
    }
  };

  return (
    <>
      <Card className={`${getCardWidth()} flex-shrink-0 hover:shadow-md transition-shadow`}>
        <CardContent className="p-3">
          {/* Step Header */}
          <div className="flex items-center gap-2 mb-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
              {stepNumber}
            </span>
            <span className="font-medium text-sm truncate flex-1">{step.name}</span>
          </div>
          
          {/* Thumbnail Preview */}
          <div className={`bg-muted rounded-lg overflow-hidden ${getThumbnailHeight()} mb-2 relative`}>
            <iframe
              src={step.url}
              title={step.name}
              className="w-full h-full border-0 pointer-events-none"
              style={{
                transform: 'scale(0.25)',
                transformOrigin: 'top left',
                width: '400%',
                height: '400%',
              }}
              sandbox="allow-same-origin allow-scripts"
            />
          </div>
          
          {/* URL Display */}
          <p className="text-xs text-muted-foreground truncate mb-2">
            {getDomain(step.url)}
          </p>
          
          {/* Action Buttons */}
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={runSpeedTest}
              disabled={speedTestLoading}
              className="h-7 px-2 text-xs"
            >
              {speedTestLoading ? (
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
              ) : (
                <Gauge className="h-3 w-3 mr-1" />
              )}
              Speed
            </Button>
            
            <div className="flex items-center gap-1">
              {!isPublicView && (
                <>
                  <Button variant="ghost" size="sm" onClick={onEdit} className="h-7 w-7 p-0">
                    <Edit2 className="h-3 w-3" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Step?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will remove "{step.name}" from the funnel. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={onDelete}>Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              )}
              <a
                href={step.url}
                target="_blank"
                rel="noopener noreferrer"
                className="h-7 w-7 inline-flex items-center justify-center hover:bg-accent rounded"
              >
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </CardContent>
      </Card>

      <PageSpeedModal
        open={speedModalOpen}
        onOpenChange={setSpeedModalOpen}
        results={speedResults}
        url={step.url}
        strategy={deviceType === 'desktop' ? 'desktop' : 'mobile'}
      />
    </>
  );
}
