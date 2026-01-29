import { PipelineStage, PipelineOpportunity } from '@/hooks/usePipelines';
import { OpportunityCard } from './OpportunityCard';
import { ScrollArea } from '@/components/ui/scroll-area';

// Helper to format currency
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

interface PipelineStageColumnProps {
  stage: PipelineStage;
  opportunities: PipelineOpportunity[];
  totals: { count: number; value: number };
  clientId: string;
  isPublicView?: boolean;
}

export function PipelineStageColumn({ 
  stage, 
  opportunities, 
  totals,
  clientId,
  isPublicView 
}: PipelineStageColumnProps) {
  return (
    <div className="flex flex-col w-[240px] min-w-[240px] bg-muted/30 rounded-lg border border-border">
      {/* Stage Header */}
      <div className="p-3 border-b border-border bg-card rounded-t-lg">
        <h3 className="font-semibold text-sm truncate" title={stage.name}>
          {stage.name}
        </h3>
        <div className="flex items-center justify-between mt-1 text-xs text-muted-foreground">
          <span>{totals.count} {totals.count === 1 ? 'opp' : 'opps'}</span>
          <span className="font-medium text-foreground">
            {formatCurrency(totals.value)}
          </span>
        </div>
      </div>

      {/* Opportunities */}
      <ScrollArea className="flex-1 max-h-[500px]">
        <div className="p-2 space-y-2">
          {opportunities.length === 0 ? (
            <div className="text-center py-4 text-xs text-muted-foreground">
              No opportunities
            </div>
          ) : (
            opportunities.map(opp => (
              <OpportunityCard 
                key={opp.id} 
                opportunity={opp}
                clientId={clientId}
                isPublicView={isPublicView}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
