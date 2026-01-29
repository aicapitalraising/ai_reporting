import { useMemo } from 'react';
import { usePipelineStages, usePipelineOpportunities, PipelineOpportunity } from '@/hooks/usePipelines';
import { PipelineStageColumn } from './PipelineStageColumn';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

interface PipelineBoardProps {
  pipelineId: string;
  clientId: string;
  isPublicView?: boolean;
}

export function PipelineBoard({ pipelineId, clientId, isPublicView }: PipelineBoardProps) {
  const { data: stages = [], isLoading: stagesLoading } = usePipelineStages(pipelineId);
  const { data: opportunities = [], isLoading: oppsLoading } = usePipelineOpportunities(pipelineId);

  // Group opportunities by stage
  const opportunitiesByStage = useMemo(() => {
    const grouped: Record<string, PipelineOpportunity[]> = {};
    stages.forEach(stage => {
      grouped[stage.id] = [];
    });
    opportunities.forEach(opp => {
      if (grouped[opp.stage_id]) {
        grouped[opp.stage_id].push(opp);
      }
    });
    return grouped;
  }, [stages, opportunities]);

  // Calculate stage totals
  const stageTotals = useMemo(() => {
    const totals: Record<string, { count: number; value: number }> = {};
    stages.forEach(stage => {
      const stageOpps = opportunitiesByStage[stage.id] || [];
      totals[stage.id] = {
        count: stageOpps.length,
        value: stageOpps.reduce((sum, opp) => sum + (opp.monetary_value || 0), 0),
      };
    });
    return totals;
  }, [stages, opportunitiesByStage]);

  if (stagesLoading || oppsLoading) {
    return (
      <div className="grid grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (stages.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No stages found. Try syncing the pipeline.
      </div>
    );
  }

  return (
    <ScrollArea className="w-full">
      <div className="flex gap-4 pb-4" style={{ minWidth: stages.length * 240 }}>
        {stages.map(stage => (
          <PipelineStageColumn
            key={stage.id}
            stage={stage}
            opportunities={opportunitiesByStage[stage.id] || []}
            totals={stageTotals[stage.id]}
            clientId={clientId}
            isPublicView={isPublicView}
          />
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
