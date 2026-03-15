import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Search, Settings2, ArrowRight, Images, Check } from 'lucide-react';
import { useAdStyles, useDeleteAdStyle } from '@/hooks/useAdStyles';
import { StyleCard } from '../StyleCard';
import { StyleManager } from '../StyleManager';
import type { StaticBatchConfig } from '@/types';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface StyleSelectionProps {
  config: StaticBatchConfig;
  toggleStyle: (styleId: string) => void;
  updateConfig: (updates: Partial<StaticBatchConfig>) => void;
  onNext: () => void;
  clientId?: string;
}

type FilterType = 'all' | 'selected' | 'with-reference';

export function StyleSelection({ config, toggleStyle, updateConfig, onNext, clientId }: StyleSelectionProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [managerOpen, setManagerOpen] = useState(false);
  const [deleteStyleId, setDeleteStyleId] = useState<string | null>(null);

  const { data: styles = [], isLoading } = useAdStyles(clientId);
  const deleteMutation = useDeleteAdStyle();

  const filteredStyles = styles.filter((style) => {
    const matchesSearch = style.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      style.description.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    switch (filter) {
      case 'selected':
        return config.selectedStyles.includes(style.id);
      case 'with-reference':
        return !!style.example_image_url;
      default:
        return true;
    }
  });

  // Gather all reference images from selected styles
  const selectedStyleRefs = useMemo(() => {
    return config.selectedStyles.flatMap((styleId) => {
      const style = styles.find((s) => s.id === styleId);
      if (!style) return [];
      const images: { url: string; styleName: string; styleId: string }[] = [];
      if (style.example_image_url) {
        images.push({ url: style.example_image_url, styleName: style.name, styleId: style.id });
      }
      (style.reference_images || []).forEach((url) => {
        images.push({ url, styleName: style.name, styleId: style.id });
      });
      return images;
    });
  }, [config.selectedStyles, styles]);

  const selectedAdImageUrls = config.adImageUrls || [];

  // Recalculate per-style variation counts based on selected reference images
  const updateStyleVariationsFromRefs = (updatedUrls: string[]) => {
    const styleVariations = { ...(config.styleVariations || {}) };
    for (const styleId of config.selectedStyles) {
      const style = styles.find((s) => s.id === styleId);
      if (!style) continue;
      const styleRefUrls: string[] = [];
      if (style.example_image_url) styleRefUrls.push(style.example_image_url);
      (style.reference_images || []).forEach((u) => styleRefUrls.push(u));
      const selectedCount = styleRefUrls.filter((u) => updatedUrls.includes(u)).length;
      if (selectedCount > 0) {
        styleVariations[styleId] = selectedCount;
      } else {
        delete styleVariations[styleId];
      }
    }
    updateConfig({ adImageUrls: updatedUrls, styleVariations });
  };

  const toggleAdImage = (url: string) => {
    const updated = selectedAdImageUrls.includes(url)
      ? selectedAdImageUrls.filter((u) => u !== url)
      : [...selectedAdImageUrls, url];
    updateStyleVariationsFromRefs(updated);
  };

  const selectAllRefImages = () => {
    const allUrls = selectedStyleRefs.map((r) => r.url);
    updateStyleVariationsFromRefs(allUrls);
  };

  const deselectAllRefImages = () => {
    updateStyleVariationsFromRefs([]);
  };

  const handleDelete = async () => {
    if (!deleteStyleId) return;
    await deleteMutation.mutateAsync(deleteStyleId);
    setDeleteStyleId(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Select Ad Styles</h2>
          <p className="text-sm text-muted-foreground">
            Choose styles for your ad batch. Add reference images to improve results.
          </p>
        </div>
        <Badge variant="secondary" className="text-sm">
          {config.selectedStyles.length} selected
        </Badge>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search styles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v as FilterType)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Styles</SelectItem>
            <SelectItem value="selected">Selected</SelectItem>
            <SelectItem value="with-reference">With Reference</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={() => setManagerOpen(true)}>
          <Settings2 className="h-4 w-4 mr-2" />
          Manage
        </Button>
      </div>

      {/* Style Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredStyles.map((style) => (
          <StyleCard
            key={style.id}
            style={style}
            isSelected={config.selectedStyles.includes(style.id)}
            onToggle={() => toggleStyle(style.id)}
            onDelete={!style.is_default ? () => setDeleteStyleId(style.id) : undefined}
            clientId={clientId}
          />
        ))}
      </div>

      {filteredStyles.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No styles found matching your criteria.
        </div>
      )}

      {/* Reference Images from Selected Styles */}
      {config.selectedStyles.length > 0 && selectedStyleRefs.length > 0 && (
        <div className="space-y-3 border border-border rounded-lg p-4 bg-card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Images className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">Ad Images — Use as Reference</h3>
              <Badge variant="outline" className="text-xs">
                {selectedAdImageUrls.length} / {selectedStyleRefs.length}
              </Badge>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={selectAllRefImages} className="text-xs h-7">
                Select All
              </Button>
              {selectedAdImageUrls.length > 0 && (
                <Button variant="ghost" size="sm" onClick={deselectAllRefImages} className="text-xs h-7 text-muted-foreground">
                  Clear
                </Button>
              )}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Pick reference images from your selected styles. The AI will recreate ads based on these templates with your offer &amp; brand colors.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {selectedStyleRefs.map((ref, idx) => {
              const isSelected = selectedAdImageUrls.includes(ref.url);
              return (
                <button
                  key={`${ref.url}-${idx}`}
                  onClick={() => toggleAdImage(ref.url)}
                  className={cn(
                    'relative group rounded-md overflow-hidden border-2 transition-all aspect-square',
                    isSelected
                      ? 'border-primary ring-1 ring-primary/30'
                      : 'border-transparent hover:border-muted-foreground/30'
                  )}
                >
                  <img
                    src={ref.url}
                    alt={`${ref.styleName} ref ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                  {isSelected && (
                    <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                      <div className="bg-primary text-primary-foreground rounded-full p-1">
                        <Check className="h-3 w-3" />
                      </div>
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1 py-0.5">
                    <p className="text-[9px] text-white truncate">{ref.styleName}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Next Button */}
      <div className="flex justify-end pt-4">
        <Button 
          onClick={onNext} 
          disabled={config.selectedStyles.length === 0}
          size="lg"
        >
          Continue
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>

      {/* Style Manager Modal */}
      <StyleManager 
        open={managerOpen} 
        onOpenChange={setManagerOpen} 
        clientId={clientId} 
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteStyleId} onOpenChange={() => setDeleteStyleId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Custom Style?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this custom style. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
