import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Trophy, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

const TEMPLATE_CATEGORIES = ['All Categories', 'Product', 'Comparison', 'Testimonial', 'Promo', 'Educational', 'UGC', 'Lifestyle'];

export function WinningTemplatesSection() {
  const [open, setOpen] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All Categories');

  const { data: templates = [] } = useQuery({
    queryKey: ['ad-templates'],
    queryFn: async () => {
      const { data, error } = await supabase.from('ad_templates').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filtered = selectedCategory === 'All Categories'
    ? templates
    : templates.filter((t: any) => t.category === selectedCategory);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <div className="flex items-center justify-between cursor-pointer group">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-400" />
              Winning Ads Templates
            </h2>
            <p className="text-sm text-muted-foreground">Proven templates to start from</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">{templates.length} templates</Badge>
            <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', open && 'rotate-180')} />
          </div>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-4 space-y-4">
        <div className="flex flex-wrap gap-1.5">
          {TEMPLATE_CATEGORIES.map((cat) => (
            <Badge
              key={cat}
              variant={selectedCategory === cat ? 'default' : 'outline'}
              className="cursor-pointer text-xs"
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </Badge>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {filtered.map((t: any) => (
            <div key={t.id} className="rounded-lg border border-border/50 bg-card p-3 hover:border-primary/30 transition-all">
              <div className="aspect-[4/3] bg-muted/30 rounded-md mb-2 flex items-center justify-center">
                {t.preview_image ? (
                  <img src={t.preview_image} alt={t.name} className="w-full h-full object-cover rounded-md" />
                ) : (
                  <Sparkles className="h-8 w-8 text-muted-foreground/30" />
                )}
              </div>
              <Badge variant="secondary" className="text-[10px] mb-1">{t.category}</Badge>
              <p className="text-sm font-medium">{t.name}</p>
              <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{t.description}</p>
              <Button size="sm" variant="outline" className="w-full mt-2 h-7 text-xs">
                Use Template
              </Button>
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
