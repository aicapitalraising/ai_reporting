import { useState } from 'react';
import { Edit2, ExternalLink, Trash2, Gauge, Loader2, Radio } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { IPhoneMockup } from './IPhoneMockup';
import { TabletMockup } from './TabletMockup';
import { DesktopMockup } from './DesktopMockup';
import { PageSpeedModal } from './PageSpeedModal';
import { PixelVerificationModal } from './PixelVerificationModal';
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
  const [pixelModalOpen, setPixelModalOpen] = useState(false);

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

  const renderDeviceMockup = () => {
    const title = `${stepNumber}. ${step.name}`;
    
    switch (deviceType) {
      case 'desktop':
        return <DesktopMockup url={step.url} title={title} />;
      case 'tablet':
        return <TabletMockup url={step.url} title={title} />;
      default:
        return <IPhoneMockup url={step.url} title={title} />;
    }
  };

  return (
    <>
      <div className="flex flex-col items-center">
        {/* Full Device Mockup */}
        {renderDeviceMockup()}
        
        {/* Action Buttons Row */}
        <div className="flex items-center gap-1 mt-3">
          {/* Speed Test */}
          <Button
            variant="ghost"
            size="sm"
            onClick={runSpeedTest}
            disabled={speedTestLoading}
            className="h-7 px-2 text-xs"
            title="Speed Test"
          >
            {speedTestLoading ? (
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
            ) : (
              <Gauge className="h-3 w-3 mr-1" />
            )}
            Speed
          </Button>
          
          {/* Pixel Verification */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPixelModalOpen(true)}
            className="h-7 px-2 text-xs"
            title="Verify Pixels"
          >
            <Radio className="h-3 w-3 mr-1" />
            Pixels
          </Button>
          
          {!isPublicView && (
            <>
              {/* Edit Button */}
              <Button variant="ghost" size="sm" onClick={onEdit} className="h-7 w-7 p-0">
                <Edit2 className="h-3 w-3" />
              </Button>
              
              {/* Delete Button */}
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
          
          {/* External Link */}
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

      <PageSpeedModal
        open={speedModalOpen}
        onOpenChange={setSpeedModalOpen}
        results={speedResults}
        url={step.url}
        strategy={deviceType === 'desktop' ? 'desktop' : 'mobile'}
      />

      <PixelVerificationModal
        open={pixelModalOpen}
        onOpenChange={setPixelModalOpen}
        stepUrl={step.url}
        stepName={step.name}
      />
    </>
  );
}
