import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { History, Loader2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { HistoryGrid } from './HistoryGrid';
import type { Asset } from '@/types';
import { toast } from 'sonner';

export function GlobalHistorySheet() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: assets = [], isLoading } = useQuery({
    queryKey: ['global-history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assets')
        .select('*')
        .eq('type', 'image')
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;
      return data as Asset[];
    },
    enabled: open,
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
      queryClient.invalidateQueries({ queryKey: ['global-history'] });
      toast.success('Assets deleted');
    },
    onError: () => {
      toast.error('Failed to delete assets');
    },
  });

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" className="w-full justify-start gap-3 px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground">
          <History className="h-4 w-4" />
          History
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[90vw] sm:w-[600px] lg:w-[900px] sm:max-w-none">
        <SheetHeader>
          <SheetTitle>All Generated Ads</SheetTitle>
        </SheetHeader>
        <div className="mt-6 h-[calc(100vh-100px)] overflow-y-auto pr-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <HistoryGrid
              assets={assets}
              showClientName
              onDelete={(ids) => deleteMutation.mutate(ids)}
              isDeleting={deleteMutation.isPending}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
