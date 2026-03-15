import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { HistoryGrid } from './HistoryGrid';
import { Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import type { Asset } from '@/types';
import { toast } from 'sonner';

interface ClientHistorySectionProps {
  clientId: string;
  clientName: string;
}

export function ClientHistorySection({ clientId, clientName }: ClientHistorySectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const queryClient = useQueryClient();

  const { data: assets = [], isLoading } = useQuery({
    queryKey: ['client-history', clientId],
    queryFn: async () => {
      // Get all projects for this client
      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select('id')
        .eq('client_id', clientId);

      if (projectsError) throw projectsError;
      if (!projects || projects.length === 0) return [];

      const projectIds = projects.map((p) => p.id);

      // Get all image assets for these projects
      const { data, error } = await supabase
        .from('assets')
        .select('*')
        .in('project_id', projectIds)
        .eq('type', 'image')
        .order('created_at', { ascending: false })
        .limit(50);

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
      queryClient.invalidateQueries({ queryKey: ['client-history', clientId] });
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
    return null; // Don't show section if no history
  }

  return (
    <div className="space-y-4">
      <Button
        variant="ghost"
        className="w-full justify-between p-0 h-auto hover:bg-transparent"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h2 className="text-xl font-semibold">Generation History</h2>
        {isExpanded ? (
          <ChevronUp className="h-5 w-5 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-5 w-5 text-muted-foreground" />
        )}
      </Button>

      {isExpanded && (
        <HistoryGrid
          assets={assets}
          clientName={clientName}
          onDelete={(ids) => deleteMutation.mutate(ids)}
          isDeleting={deleteMutation.isPending}
        />
      )}
    </div>
  );
}
