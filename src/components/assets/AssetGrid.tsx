import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Film, Image as ImageIcon, Search, Grid, List, Loader2 } from 'lucide-react';
import type { Asset, AssetType } from '@/types';
import { AssetCard } from './AssetCard';
import { AssetActionsDialog } from './AssetActionsDialog';
import { cn } from '@/lib/utils';

interface AssetGridProps {
  assets: Asset[];
  isLoading?: boolean;
  onDelete: (asset: Asset) => Promise<void>;
  onAIEdit?: (asset: Asset, prompt: string) => Promise<void>;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: React.ReactNode;
}

export function AssetGrid({
  assets,
  isLoading,
  onDelete,
  onAIEdit,
  emptyTitle = 'No assets yet',
  emptyDescription = 'Generated assets will appear here',
  emptyIcon,
}: AssetGridProps) {
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<AssetType | 'all'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [visibleCount, setVisibleCount] = useState(24);

  // Filter assets
  const filteredAssets = assets.filter((asset) => {
    // Search filter
    const matchesSearch =
      !searchQuery ||
      asset.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (asset.metadata as Record<string, unknown>)?.prompt
        ?.toString()
        .toLowerCase()
        .includes(searchQuery.toLowerCase());

    // Type filter
    const matchesType = typeFilter === 'all' || asset.type === typeFilter;

    return matchesSearch && matchesType;
  });

  // Group counts
  const counts = {
    all: assets.length,
    video: assets.filter((a) => a.type === 'video').length,
    broll: assets.filter((a) => a.type === 'broll').length,
    image: assets.filter((a) => a.type === 'image').length,
  };

  const handleDownload = async (asset: Asset) => {
    if (!asset.public_url) return;

    try {
      const isVideo = asset.type === 'video' || asset.type === 'broll';
      let url: string;
      
      if (isVideo && asset.public_url.includes('generativelanguage.googleapis.com')) {
        const { fetchVideoViaProxy } = await import('@/lib/video-proxy');
        url = await fetchVideoViaProxy(asset.public_url);
      } else {
        const response = await fetch(asset.public_url);
        const blob = await response.blob();
        url = URL.createObjectURL(blob);
      }

      const a = document.createElement('a');
      a.href = url;
      const extension = isVideo ? 'mp4' : 'png';
      a.download = `${asset.name || asset.id}.${extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search assets..."
            className="pl-9"
          />
        </div>

        {/* Type Filter */}
        <Select
          value={typeFilter}
          onValueChange={(v) => setTypeFilter(v as AssetType | 'all')}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All ({counts.all})</SelectItem>
            <SelectItem value="broll">B-Roll ({counts.broll})</SelectItem>
            <SelectItem value="video">Video ({counts.video})</SelectItem>
            <SelectItem value="image">Image ({counts.image})</SelectItem>
          </SelectContent>
        </Select>

        {/* View Toggle */}
        <div className="flex border rounded-lg">
          <Button
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-9 w-9 rounded-r-none"
            onClick={() => setViewMode('grid')}
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-9 w-9 rounded-l-none"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>

        {/* Count Badge */}
        <Badge variant="secondary">{filteredAssets.length} assets</Badge>
      </div>

      {/* Asset Grid/List */}
      {filteredAssets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            {emptyIcon || <Film className="h-8 w-8 text-muted-foreground" />}
          </div>
          <h3 className="font-semibold">{emptyTitle}</h3>
          <p className="text-muted-foreground text-sm max-w-xs">{emptyDescription}</p>
        </div>
      ) : (
        <ScrollArea className="h-[600px]">
          <div
            className={cn(
              'gap-4 pr-4',
              viewMode === 'grid'
                ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
                : 'flex flex-col'
            )}
          >
            {filteredAssets.slice(0, visibleCount).map((asset) => (
              <AssetCard
                key={asset.id}
                asset={asset}
                compact={viewMode === 'list'}
                onClick={() => setSelectedAsset(asset)}
                onDownload={() => handleDownload(asset)}
                onDelete={() => onDelete(asset)}
                onAIEdit={onAIEdit ? () => setSelectedAsset(asset) : undefined}
              />
            ))}
          </div>
          {filteredAssets.length > visibleCount && (
            <div className="flex justify-center py-4">
              <Button variant="outline" onClick={() => setVisibleCount((c) => c + 24)}>
                Load More ({filteredAssets.length - visibleCount} remaining)
              </Button>
            </div>
          )}
        </ScrollArea>
      )}

      {/* Asset Details Dialog */}
      <AssetActionsDialog
        asset={selectedAsset}
        open={!!selectedAsset}
        onOpenChange={(open) => !open && setSelectedAsset(null)}
        onDelete={onDelete}
        onAIEdit={onAIEdit}
      />
    </div>
  );
}
