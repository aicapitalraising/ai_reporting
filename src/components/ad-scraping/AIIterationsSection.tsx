import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Wand2, Plus, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export function AIIterationsSection() {
  const [open, setOpen] = useState(true);

  const { data: iterations = [] } = useQuery({
    queryKey: ['ad-iterations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ad_iterations')
        .select('*, scraped_ads(*), assets(*)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <div className="flex items-center justify-between cursor-pointer group">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Wand2 className="h-4 w-4 text-primary" />
              Crush AI-Generated Iterations
            </h2>
            <p className="text-sm text-muted-foreground">Iterations generated for your brand</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">{iterations.length} iterations</Badge>
            <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', open && 'rotate-180')} />
          </div>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-4 space-y-4">
        {iterations.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {iterations.map((iter: any) => (
              <div key={iter.id} className="rounded-lg border border-border/50 bg-card p-3 hover:border-primary/30 transition-all">
                <div className="aspect-[4/3] bg-muted/30 rounded-md mb-2 flex items-center justify-center">
                  {iter.assets?.public_url ? (
                    <img src={iter.assets.public_url} alt="Iteration" className="w-full h-full object-cover rounded-md" />
                  ) : (
                    <Sparkles className="h-8 w-8 text-muted-foreground/30" />
                  )}
                </div>
                <Badge variant="secondary" className="text-[10px] mb-1">{iter.iteration_type}</Badge>
                {iter.scraped_ads && (
                  <p className="text-xs text-muted-foreground mt-1">Based on: {iter.scraped_ads.company}</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 text-muted-foreground rounded-lg border border-dashed border-border">
            <Wand2 className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm font-medium">No iterations yet</p>
            <p className="text-xs mt-1">Select competitor ads and generate AI-powered iterations</p>
            <Button size="sm" className="mt-3 gap-1">
              <Plus className="h-3 w-3" /> Generate Iterations
            </Button>
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
