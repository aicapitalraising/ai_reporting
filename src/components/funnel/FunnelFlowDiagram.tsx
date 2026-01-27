import { ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { FunnelStep } from '@/hooks/useFunnelSteps';

interface FunnelFlowDiagramProps {
  steps: FunnelStep[];
  onStepClick?: (step: FunnelStep) => void;
}

export function FunnelFlowDiagram({ steps, onStepClick }: FunnelFlowDiagramProps) {
  if (steps.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        No funnel steps to display
      </div>
    );
  }

  // Extract domain for display
  const getDomain = (url: string) => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return url;
    }
  };

  return (
    <div className="w-full overflow-x-auto pb-4">
      <div className="flex items-center gap-2 min-w-max px-4">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center">
            {/* Step Card */}
            <Card 
              className="w-64 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => onStepClick?.(step)}
            >
              <CardContent className="p-4">
                {/* Step Header */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                    {index + 1}
                  </span>
                  <span className="font-medium truncate">{step.name}</span>
                </div>
                
                {/* Thumbnail Preview */}
                <div className="bg-muted rounded-lg overflow-hidden h-32 mb-2">
                  <iframe
                    src={step.url}
                    title={step.name}
                    className="w-full h-full border-0 pointer-events-none"
                    style={{
                      transform: 'scale(0.2)',
                      transformOrigin: 'top left',
                      width: '500%',
                      height: '500%',
                    }}
                    sandbox="allow-same-origin allow-scripts"
                  />
                </div>
                
                {/* URL */}
                <p className="text-xs text-muted-foreground truncate">
                  {getDomain(step.url)}
                </p>
              </CardContent>
            </Card>
            
            {/* Arrow between steps */}
            {index < steps.length - 1 && (
              <div className="flex items-center px-3">
                <div className="w-8 h-0.5 bg-border" />
                <ArrowRight className="h-5 w-5 text-muted-foreground -ml-1" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
