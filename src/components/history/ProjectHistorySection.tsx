import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { HistoryGrid } from './HistoryGrid';
import { Loader2, ChevronDown, ChevronUp, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import type { Asset } from '@/types';
import { toast } from 'sonner';

interface ProjectHistorySectionProps {
  projectId: string;
  projectName: string;
}

export function ProjectHistorySection({ projectId, projectName }: ProjectHistorySectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const queryClient = useQueryClient();

  const { data: assets = [], isLoading } = useQuery({
    queryKey: ['project-history', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assets')
        .select('*')
        .eq('project_id', projectId)
        .in('type', ['image', 'video'])
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as Asset[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from('assets')
        .delete()
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-history', projectId] });
      toast.success('Assets deleted');
    },
    onError: () => {
      toast.error('Failed to delete assets');
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (assets.length === 0) {
    return (
      <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
        <History className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
        <h3 className="text-lg font-medium mb-1">No Generated Assets Yet</h3>
        <p className="text-sm text-muted-foreground">
          Generated ads and videos will appear here after you run a batch.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Button
        variant="ghost"
        className="w-full justify-between p-0 h-auto hover:bg-transparent"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h2 className="text-xl font-semibold">Project History</h2>
        {isExpanded ? (
          <ChevronUp className="h-5 w-5 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-5 w-5 text-muted-foreground" />
        )}
      </Button>

      {isExpanded && (
        <HistoryGrid
          assets={assets}
          clientName={projectName}
          onDelete={(ids) => deleteMutation.mutate(ids)}
          isDeleting={deleteMutation.isPending}
        />
      )}
    </div>
  );
}
