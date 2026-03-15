import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Trash2,
  Download,
  Wand2,
  RefreshCw,
  Calendar as CalendarIcon,
  Filter,
  X,
  Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { Asset, AdStyle } from '@/types';

interface HistoryGridProps {
  assets: Asset[];
  styles?: AdStyle[];
  clientName?: string;
  showClientName?: boolean;
  onDelete?: (ids: string[]) => void;
  isDeleting?: boolean;
}

export function HistoryGrid({
  assets,
  styles = [],
  clientName,
  showClientName = false,
  onDelete,
  isDeleting = false,
}: HistoryGridProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filterStyle, setFilterStyle] = useState<string>('all');
  const [fromDate, setFromDate] = useState<Date | undefined>();
  const [toDate, setToDate] = useState<Date | undefined>();
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(20);

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === filteredAssets.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredAssets.map((a) => a.id)));
    }
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const filteredAssets = assets.filter((asset) => {
    // Filter by style
    if (filterStyle !== 'all') {
      const styleName = (asset.metadata as any)?.styleName;
      if (styleName !== filterStyle) return false;
    }

    // Filter by date range
    const assetDate = new Date(asset.created_at);
    if (fromDate && assetDate < fromDate) return false;
    if (toDate && assetDate > toDate) return false;

    return true;
  });

  const uniqueStyleNames = [...new Set(assets.map((a) => (a.metadata as any)?.styleName).filter(Boolean))];

  const handleDelete = () => {
    if (onDelete && selectedIds.size > 0) {
      onDelete(Array.from(selectedIds));
      setSelectedIds(new Set());
      setDeleteConfirmOpen(false);
    }
  };

  const isVideo = (asset: Asset) => {
    if (asset.type === 'video') return true;
    const url = asset.public_url || '';
    return /\.(mp4|webm|mov|ogg)(\?|$)/i.test(url);
  };

  const handleDownload = (asset: Asset) => {
    if (asset.public_url) {
      window.open(asset.public_url, '_blank');
    }
  };

  return (
    <div className="space-y-4">
      {/* Header with count */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          {clientName ? `${clientName} History` : 'Historical Generated Ads'}
        </h3>
        <Badge variant="secondary">{assets.length} ads</Badge>
      </div>

      {/* Action Bar - shows when items selected */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setDeleteConfirmOpen(true)}
            disabled={isDeleting}
          >
            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Trash2 className="h-4 w-4 mr-1" />}
            Delete
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-1" />
            Download
          </Button>
          <Button variant="outline" size="sm">
            <Wand2 className="h-4 w-4 mr-1" />
            AI Edit
          </Button>
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-1" />
            Convert Aspect Ratio
          </Button>
          <Button variant="ghost" size="sm" onClick={clearSelection}>
            Clear Selection
          </Button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 p-3 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">Filters:</span>
          <Checkbox
            checked={selectedIds.size === filteredAssets.length && filteredAssets.length > 0}
            onCheckedChange={selectAll}
          />
          <span className="text-sm text-muted-foreground">Select All</span>
        </div>

        <Select value={filterStyle} onValueChange={setFilterStyle}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Ad Style" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Styles</SelectItem>
            {uniqueStyleNames.map((name) => (
              <SelectItem key={name} value={name}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="w-[140px] justify-start">
              <CalendarIcon className="h-4 w-4 mr-2" />
              {fromDate ? format(fromDate, 'MM/dd/yyyy') : 'From Date'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={fromDate} onSelect={setFromDate} initialFocus />
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="w-[140px] justify-start">
              <CalendarIcon className="h-4 w-4 mr-2" />
              {toDate ? format(toDate, 'MM/dd/yyyy') : 'To Date'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={toDate} onSelect={setToDate} initialFocus />
          </PopoverContent>
        </Popover>

        {(fromDate || toDate || filterStyle !== 'all') && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setFromDate(undefined);
              setToDate(undefined);
              setFilterStyle('all');
            }}
          >
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Grid */}
      {filteredAssets.length > 0 ? (
        <>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredAssets.slice(0, visibleCount).map((asset) => {
            const styleName = (asset.metadata as any)?.styleName || 'Unknown';
            const aspectRatio = (asset.metadata as any)?.aspectRatio || '1:1';
            const isSelected = selectedIds.has(asset.id);

            return (
              <Card
                key={asset.id}
                className={cn(
                  'relative overflow-hidden cursor-pointer transition-all hover:shadow-md',
                  isSelected && 'ring-2 ring-primary'
                )}
                onClick={() => setSelectedAsset(asset)}
              >
                {/* Selection checkbox */}
                <div
                  className="absolute top-2 right-2 z-10"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSelection(asset.id);
                  }}
                >
                  <Checkbox checked={isSelected} />
                </div>

                {/* Style badge */}
                <Badge className="absolute top-2 left-2 z-10 text-[10px]" variant="secondary">
                  {styleName}
                </Badge>

                {/* Media - image or video */}
                <div className="aspect-square bg-muted">
                  {asset.public_url ? (
                    isVideo(asset) ? (
                      <video
                        src={asset.public_url}
                        muted
                        loop
                        playsInline
                        preload="metadata"
                        className="w-full h-full object-cover"
                        onMouseEnter={(e) => (e.target as HTMLVideoElement).play().catch(() => {})}
                        onMouseLeave={(e) => { const v = e.target as HTMLVideoElement; v.pause(); v.currentTime = 0; }}
                      />
                    ) : (
                      <img
                        src={asset.public_url}
                        alt={asset.name || 'Generated ad'}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    )
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      No preview
                    </div>
                  )}
                </div>

                {/* Footer with date */}
                <CardContent className="p-2 flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(asset.created_at), 'M/d/yyyy')}
                  </span>
                  {showClientName && (
                    <span className="text-xs text-muted-foreground truncate max-w-[80px]">
                      {(asset.metadata as any)?.clientName}
                    </span>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
        {filteredAssets.length > visibleCount && (
          <div className="flex justify-center pt-4">
            <Button variant="outline" onClick={() => setVisibleCount((c) => c + 20)}>
              Load More ({filteredAssets.length - visibleCount} remaining)
            </Button>
          </div>
        )}
        </>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          No generated ads found.
        </div>
      )}

      {/* Lightbox */}
      <Dialog open={!!selectedAsset} onOpenChange={() => setSelectedAsset(null)}>
        <DialogContent className="max-w-4xl">
          {selectedAsset && (
            <div className="space-y-4">
              {selectedAsset.public_url && (
                isVideo(selectedAsset) ? (
                  <video
                    src={selectedAsset.public_url}
                    controls
                    autoPlay
                    muted
                    loop
                    className="w-full rounded-lg"
                  />
                ) : (
                  <img
                    src={selectedAsset.public_url}
                    alt={selectedAsset.name || 'Generated ad'}
                    className="w-full rounded-lg"
                  />
                )
              )}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{(selectedAsset.metadata as any)?.styleName || 'Generated Ad'}</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(selectedAsset.created_at), 'MMMM d, yyyy')}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => handleDownload(selectedAsset)}>
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                  <Button variant="outline">
                    <Wand2 className="h-4 w-4 mr-2" />
                    AI Edit
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} ad(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the selected ads. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
