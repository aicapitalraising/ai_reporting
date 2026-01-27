import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

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

interface PageSpeedModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  results: PageSpeedResults | null;
  url: string;
  strategy: 'mobile' | 'desktop';
}

export function PageSpeedModal({
  open,
  onOpenChange,
  results,
  url,
  strategy,
}: PageSpeedModalProps) {
  if (!results) return null;

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBg = (score: number) => {
    if (score >= 90) return 'bg-green-600';
    if (score >= 50) return 'bg-yellow-600';
    return 'bg-red-600';
  };

  const getDomain = (urlStr: string) => {
    try {
      return new URL(urlStr).hostname;
    } catch {
      return urlStr;
    }
  };

  const metrics = [
    { label: 'First Contentful Paint', value: results.metrics.firstContentfulPaint, key: 'fcp' },
    { label: 'Speed Index', value: results.metrics.speedIndex, key: 'si' },
    { label: 'Largest Contentful Paint', value: results.metrics.largestContentfulPaint, key: 'lcp' },
    { label: 'Time to Interactive', value: results.metrics.timeToInteractive, key: 'tti' },
    { label: 'Total Blocking Time', value: results.metrics.totalBlockingTime, key: 'tbt' },
    { label: 'Cumulative Layout Shift', value: results.metrics.cumulativeLayoutShift, key: 'cls' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            PageSpeed Results
            <span className="text-xs font-normal text-muted-foreground capitalize">
              ({strategy})
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* URL */}
          <p className="text-sm text-muted-foreground truncate">
            {getDomain(url)}
          </p>

          {/* Performance Score */}
          <div className="flex items-center gap-4">
            <div className="relative w-24 h-24">
              <svg className="w-24 h-24 transform -rotate-90">
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  className="text-muted"
                />
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={`${results.performanceScore * 2.51} 251`}
                  className={getScoreColor(results.performanceScore)}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={cn('text-2xl font-bold', getScoreColor(results.performanceScore))}>
                  {Math.round(results.performanceScore)}
                </span>
              </div>
            </div>
            <div>
              <p className="font-semibold">Performance Score</p>
              <p className="text-sm text-muted-foreground">
                {results.performanceScore >= 90
                  ? 'Good'
                  : results.performanceScore >= 50
                  ? 'Needs Improvement'
                  : 'Poor'}
              </p>
            </div>
          </div>

          {/* Core Web Vitals */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Core Web Vitals</h4>
            <div className="grid grid-cols-2 gap-3">
              {metrics.map((metric) => (
                <div key={metric.key} className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">{metric.label}</p>
                  <p className="font-semibold text-sm">{metric.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'hsl(142, 76%, 36%)' }} />
              <span>Good (90+)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'hsl(45, 93%, 47%)' }} />
              <span>Needs Work (50-89)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'hsl(0, 84%, 60%)' }} />
              <span>Poor (0-49)</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
