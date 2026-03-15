import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AssetGridSkeleton } from '@/components/ui/LoadingSkeletons';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  Trash2, Download, Loader2, Calendar as CalendarIcon, X,
  Filter, Columns, RefreshCw, Clock,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Asset } from '@/types';

export default function HistoryPage() {
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filterType, setFilterType] = useState('all');
  const [filterClient, setFilterClient] = useState('all');
  const [fromDate, setFromDate] = useState<Date | undefined>();
  const [toDate, setToDate] = useState<Date | undefined>();
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [visibleCount, setVisibleCount] = useState(40);

  const { data: assets = [], isLoading } = useQuery({
    queryKey: ['history-all-assets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assets')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000);
      if (error) throw error;
      return data as Asset[];
    },
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['history-clients'],
    queryFn: async () => {
      const { data } = await supabase.from('clients').select('id, name');
      return data || [];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from('assets').delete().in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['history-all-assets'] });
      setSelectedIds(new Set());
      setDeleteConfirmOpen(false);
      toast.success('Assets deleted');
    },
    onError: () => toast.error('Failed to delete'),
  });

  const filteredAssets = assets.filter(a => {
    if (filterType !== 'all' && a.type !== filterType) return false;
    if (filterClient !== 'all' && a.client_id !== filterClient) return false;
    if (fromDate && new Date(a.created_at) < fromDate) return false;
    if (toDate && new Date(a.created_at) > toDate) return false;
    return true;
  });

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === filteredAssets.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filteredAssets.map(a => a.id)));
  };

  const isVideo = (asset: Asset) => asset.type === 'video' || /\.(mp4|webm|mov)(\?|$)/i.test(asset.public_url || '');

  const compareAssets = compareMode ? assets.filter(a => selectedIds.has(a.id)) : [];

  const getClientName = (clientId: string | null) => {
    if (!clientId) return 'Unassigned';
    return clients.find(c => c.id === clientId)?.name || 'Unknown';
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">History</h1>
            <p className="text-muted-foreground">Timeline of all generated assets</p>
          </div>
          <Badge variant="secondary">{filteredAssets.length} assets</Badge>
        </div>

        {/* Action Bar */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg flex-wrap">
            <span className="text-sm font-medium">{selectedIds.size} selected</span>
            <Button variant="destructive" size="sm" onClick={() => setDeleteConfirmOpen(true)} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Trash2 className="h-4 w-4 mr-1" />}
              Delete
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCompareMode(!compareMode)}>
              <Columns className="h-4 w-4 mr-1" />
              Compare ({selectedIds.size})
            </Button>
            <Button variant="ghost" size="sm" onClick={() => { setSelectedIds(new Set()); setCompareMode(false); }}>
              Clear
            </Button>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 p-3 bg-muted/50 rounded-lg">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Checkbox
            checked={selectedIds.size === filteredAssets.length && filteredAssets.length > 0}
            onCheckedChange={selectAll}
          />
          <span className="text-sm text-muted-foreground">All</span>

          <Select value={filterClient} onValueChange={setFilterClient}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Client" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Clients</SelectItem>
              {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="image">Static Ads</SelectItem>
              <SelectItem value="video">Videos</SelectItem>
              <SelectItem value="avatar">Avatars</SelectItem>
            </SelectContent>
          </Select>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="w-[130px] justify-start">
                <CalendarIcon className="h-4 w-4 mr-2" />
                {fromDate ? format(fromDate, 'MM/dd/yy') : 'From'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={fromDate} onSelect={setFromDate} />
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="w-[130px] justify-start">
                <CalendarIcon className="h-4 w-4 mr-2" />
                {toDate ? format(toDate, 'MM/dd/yy') : 'To'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={toDate} onSelect={setToDate} />
            </PopoverContent>
          </Popover>

          {(fromDate || toDate || filterType !== 'all' || filterClient !== 'all') && (
            <Button variant="ghost" size="sm" onClick={() => { setFromDate(undefined); setToDate(undefined); setFilterType('all'); setFilterClient('all'); }}>
              <X className="h-4 w-4 mr-1" /> Clear
            </Button>
          )}
        </div>

        {/* Compare View */}
        {compareMode && compareAssets.length >= 2 && (
          <Card>
            <CardContent className="p-4">
              <h3 className="font-medium mb-3">Compare ({compareAssets.length} assets)</h3>
              <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${Math.min(compareAssets.length, 4)}, 1fr)` }}>
                {compareAssets.slice(0, 4).map(asset => (
                  <div key={asset.id} className="space-y-2">
                    <div className="aspect-square bg-muted rounded-lg overflow-hidden">
                      {asset.public_url && (
                        isVideo(asset) ? (
                          <video src={asset.public_url} controls muted className="w-full h-full object-cover" />
                        ) : (
                          <img src={asset.public_url} alt="" className="w-full h-full object-cover" />
                        )
                      )}
                    </div>
                    <div className="text-xs space-y-1">
                      <p className="font-medium truncate">{asset.name || 'Asset'}</p>
                      <p className="text-muted-foreground">{getClientName(asset.client_id)}</p>
                      <p className="text-muted-foreground">{format(new Date(asset.created_at), 'MMM d, yyyy')}</p>
                      <Badge variant="secondary" className="text-[10px]">{asset.type}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Timeline Grid */}
        {isLoading ? (
          <AssetGridSkeleton count={10} />
        ) : filteredAssets.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredAssets.slice(0, visibleCount).map(asset => {
                const isSelected = selectedIds.has(asset.id);
                const meta = asset.metadata as any;
                return (
                  <Card
                    key={asset.id}
                    className={cn(
                      'relative overflow-hidden cursor-pointer transition-all hover:shadow-md',
                      isSelected && 'ring-2 ring-primary'
                    )}
                    onClick={() => setSelectedAsset(asset)}
                  >
                    <div className="absolute top-2 right-2 z-10" onClick={e => { e.stopPropagation(); toggleSelection(asset.id); }}>
                      <Checkbox checked={isSelected} />
                    </div>
                    <Badge className="absolute top-2 left-2 z-10 text-[10px]" variant="secondary">
                      {asset.type}
                    </Badge>
                    <div className="aspect-square bg-muted">
                      {asset.public_url ? (
                        isVideo(asset) ? (
                          <video
                            src={asset.public_url}
                            muted loop playsInline preload="metadata"
                            className="w-full h-full object-cover"
                            onMouseEnter={e => (e.target as HTMLVideoElement).play().catch(() => {})}
                            onMouseLeave={e => { const v = e.target as HTMLVideoElement; v.pause(); v.currentTime = 0; }}
                          />
                        ) : (
                          <img src={asset.public_url} alt={asset.name || ''} className="w-full h-full object-cover" loading="lazy" />
                        )
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">No preview</div>
                      )}
                    </div>
                    <CardContent className="p-2 space-y-0.5">
                      <p className="text-xs font-medium truncate">{asset.name || meta?.styleName || 'Asset'}</p>
                      <p className="text-[10px] text-muted-foreground">{getClientName(asset.client_id)}</p>
                      <p className="text-[10px] text-muted-foreground">{format(new Date(asset.created_at), 'MMM d, yyyy')}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            {filteredAssets.length > visibleCount && (
              <div className="flex justify-center">
                <Button variant="outline" onClick={() => setVisibleCount(c => c + 40)}>
                  Load More ({filteredAssets.length - visibleCount} remaining)
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-muted p-5 mb-4"><Clock className="h-10 w-10 text-muted-foreground" /></div>
            <h3 className="text-lg font-semibold">No assets found</h3>
            <p className="text-sm text-muted-foreground">Generate your first ad to see it here.</p>
          </div>
        )}

        {/* Lightbox */}
        <Dialog open={!!selectedAsset} onOpenChange={() => setSelectedAsset(null)}>
          <DialogContent className="max-w-4xl">
            {selectedAsset && (
              <div className="space-y-4">
                {selectedAsset.public_url && (
                  isVideo(selectedAsset) ? (
                    <video src={selectedAsset.public_url} controls autoPlay muted loop className="w-full rounded-lg" />
                  ) : (
                    <img src={selectedAsset.public_url} alt="" className="w-full rounded-lg" />
                  )
                )}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{selectedAsset.name || 'Generated Asset'}</p>
                    <p className="text-sm text-muted-foreground">
                      {getClientName(selectedAsset.client_id)} • {format(new Date(selectedAsset.created_at), 'MMMM d, yyyy')}
                    </p>
                    {(selectedAsset.metadata as any)?.styleName && (
                      <Badge variant="outline" className="mt-1 text-xs">Style: {(selectedAsset.metadata as any).styleName}</Badge>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => selectedAsset.public_url && window.open(selectedAsset.public_url, '_blank')}>
                      <Download className="h-4 w-4 mr-1" /> Download
                    </Button>
                    <Button variant="outline" size="sm">
                      <RefreshCw className="h-4 w-4 mr-1" /> Re-generate
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Confirm */}
        <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {selectedIds.size} asset(s)?</AlertDialogTitle>
              <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => deleteMutation.mutate(Array.from(selectedIds))} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
}
