import { useState } from 'react';
import { Plus, RefreshCw, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useClientPipelines, useSyncPipeline } from '@/hooks/usePipelines';
import { PipelineBoard } from './PipelineBoard';
import { AddPipelineModal } from './AddPipelineModal';
import { Skeleton } from '@/components/ui/skeleton';

interface PipelineTabProps {
  clientId: string;
  isPublicView?: boolean;
}

export function PipelineTab({ clientId, isPublicView = false }: PipelineTabProps) {
  const [selectedPipelineId, setSelectedPipelineId] = useState<string | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  
  const { data: pipelines = [], isLoading } = useClientPipelines(clientId);
  const syncPipeline = useSyncPipeline();

  // Auto-select first pipeline if none selected
  const activePipelineId = selectedPipelineId || pipelines[0]?.id;
  const activePipeline = pipelines.find(p => p.id === activePipelineId);

  const handleSync = () => {
    if (activePipeline) {
      syncPipeline.mutate({ 
        clientId, 
        pipelineId: activePipeline.ghl_pipeline_id 
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  if (pipelines.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-border rounded-lg">
        <Layers className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Pipelines Connected</h3>
        <p className="text-muted-foreground text-center mb-4 max-w-md">
          Connect a GoHighLevel pipeline to view and track your opportunities here.
        </p>
        {!isPublicView && (
          <Button onClick={() => setAddModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Pipeline
          </Button>
        )}
        <AddPipelineModal
          clientId={clientId}
          open={addModalOpen}
          onOpenChange={setAddModalOpen}
          existingPipelineIds={[]}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          {pipelines.length > 1 ? (
            <Select value={activePipelineId || ''} onValueChange={setSelectedPipelineId}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select Pipeline" />
              </SelectTrigger>
              <SelectContent>
                {pipelines.map(pipeline => (
                  <SelectItem key={pipeline.id} value={pipeline.id}>
                    {pipeline.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <h2 className="text-lg font-semibold">{activePipeline?.name}</h2>
          )}
          
          {activePipeline?.last_synced_at && (
            <span className="text-xs text-muted-foreground">
              Last synced: {new Date(activePipeline.last_synced_at).toLocaleString()}
            </span>
          )}
        </div>

        {!isPublicView && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSync}
              disabled={syncPipeline.isPending || !activePipeline}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${syncPipeline.isPending ? 'animate-spin' : ''}`} />
              Sync
            </Button>

            {pipelines.length < 2 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAddModalOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Pipeline
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Pipeline Board */}
      {activePipelineId && (
        <PipelineBoard 
          pipelineId={activePipelineId} 
          clientId={clientId}
          isPublicView={isPublicView}
        />
      )}

      <AddPipelineModal
        clientId={clientId}
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
        existingPipelineIds={pipelines.map(p => p.ghl_pipeline_id)}
      />
    </div>
  );
}
