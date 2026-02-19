import { useState, useMemo, useEffect, useRef } from 'react';
import { RefreshCw, Loader2, BarChart3, Play, Image as ImageIcon, Calendar, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SortableTableHeader, SortConfig } from '@/components/dashboard/SortableTableHeader';
import { useMetaCampaigns, useMetaAdSets, useMetaAds, useSyncMetaAds } from '@/hooks/useMetaAds';
import { useClientSettings } from '@/hooks/useClientSettings';
import { useDateFilter } from '@/contexts/DateFilterContext';
import { formatDistanceToNow } from 'date-fns';

interface AdsManagerTabProps {
  clientId: string;
}

function StatusDot({ status }: { status: string | null }) {
  const s = (status || '').toUpperCase();
  const color = s === 'ACTIVE' ? 'bg-green-500' : s === 'PAUSED' ? 'bg-yellow-500' : 'bg-muted-foreground/40';
  return <span className={`inline-block w-2.5 h-2.5 rounded-full ${color}`} />;
}

function fmt$(val: number | null) {
  if (!val) return '$0';
  return `$${Number(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function fmtN(val: number | bigint | null) {
  if (!val) return '0';
  return Number(val).toLocaleString();
}
function fmtPct(val: number | null) {
  if (!val) return '0%';
  return `${Number(val).toFixed(2)}%`;
}

function sortData<T>(data: T[], sort: SortConfig): T[] {
  if (!sort.direction) return data;
  return [...data].sort((a: any, b: any) => {
    const aVal = a[sort.column] ?? 0;
    const bVal = b[sort.column] ?? 0;
    if (typeof aVal === 'string') return sort.direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    return sort.direction === 'asc' ? Number(aVal) - Number(bVal) : Number(bVal) - Number(aVal);
  });
}

function useSort(defaultCol = 'spend') {
  const [sortConfig, setSortConfig] = useState<SortConfig>({ column: defaultCol, direction: 'desc' });
  const onSort = (column: string) => {
    setSortConfig(prev => ({
      column,
      direction: prev.column === column ? (prev.direction === 'desc' ? 'asc' : prev.direction === 'asc' ? null : 'desc') : 'desc',
    }));
  };
  return { sortConfig, onSort };
}

// Shared metric columns used across all three tables
const METRIC_HEADERS = [
  { column: 'spend', label: 'Spend' },
  { column: 'impressions', label: 'Impr' },
  { column: 'cpm', label: 'CPM' },
  { column: 'clicks', label: 'Clicks' },
  { column: 'ctr', label: 'CTR' },
  { column: 'cpc', label: 'CPC' },
  { column: 'attributed_leads', label: 'Leads' },
  { column: 'cost_per_lead', label: 'CPL' },
  { column: 'attributed_calls', label: 'Calls' },
  { column: 'attributed_showed', label: 'Showed' },
  { column: 'attributed_funded', label: 'Funded' },
  { column: 'attributed_funded_dollars', label: 'Funded $' },
  { column: 'cost_per_funded', label: 'CPA' },
];

function MetricCells({ row }: { row: any }) {
  return (
    <>
      <TableCell className="text-right tabular-nums font-medium">{fmt$(row.spend)}</TableCell>
      <TableCell className="text-right tabular-nums">{fmtN(row.impressions)}</TableCell>
      <TableCell className="text-right tabular-nums">{fmt$(row.cpm)}</TableCell>
      <TableCell className="text-right tabular-nums">{fmtN(row.clicks)}</TableCell>
      <TableCell className="text-right tabular-nums">{fmtPct(row.ctr)}</TableCell>
      <TableCell className="text-right tabular-nums">{fmt$(row.cpc)}</TableCell>
      <TableCell className="text-right tabular-nums">{fmtN(row.attributed_leads)}</TableCell>
      <TableCell className="text-right tabular-nums">{fmt$(row.cost_per_lead)}</TableCell>
      <TableCell className="text-right tabular-nums">{fmtN(row.attributed_calls)}</TableCell>
      <TableCell className="text-right tabular-nums">{fmtN(row.attributed_showed)}</TableCell>
      <TableCell className="text-right tabular-nums">{fmtN(row.attributed_funded)}</TableCell>
      <TableCell className="text-right tabular-nums">{fmt$(row.attributed_funded_dollars)}</TableCell>
      <TableCell className="text-right tabular-nums">{fmt$(row.cost_per_funded)}</TableCell>
    </>
  );
}

export function AdsManagerTab({ clientId }: AdsManagerTabProps) {
  const [activeTab, setActiveTab] = useState('campaigns');
  const [filterCampaignId, setFilterCampaignId] = useState<string | null>(null);
  const [filterAdSetId, setFilterAdSetId] = useState<string | null>(null);
  const lastSyncedRange = useRef<string | null>(null);

  const { data: campaigns = [], isLoading: cLoading } = useMetaCampaigns(clientId);
  const { data: allAdSets = [], isLoading: asLoading } = useMetaAdSets(clientId);
  const { data: allAds = [], isLoading: adLoading } = useMetaAds(clientId);
  const { data: settings } = useClientSettings(clientId);
  const { startDate, endDate } = useDateFilter();
  const syncMutation = useSyncMetaAds();

  const currentRangeKey = `${startDate}_${endDate}`;

  // Auto-sync when date range changes (only if client has Meta credentials)
  useEffect(() => {
    const hasCredentials = (settings as any)?.meta_ads_sync_enabled || 
      ((settings as any) && (settings as any).meta_ads_last_sync);
    
    if (!hasCredentials) return;
    if (syncMutation.isPending) return;
    if (lastSyncedRange.current === currentRangeKey) return;
    
    // Mark as synced for this range immediately to prevent duplicate calls
    lastSyncedRange.current = currentRangeKey;
    syncMutation.mutate({ clientId, startDate, endDate });
  }, [currentRangeKey, clientId, settings]);

  const lastSync = (settings as any)?.meta_ads_last_sync
    ? formatDistanceToNow(new Date((settings as any).meta_ads_last_sync), { addSuffix: true })
    : null;

  const activeCampaigns = useMemo(() => campaigns.filter((c: any) => c.spend && Number(c.spend) > 0), [campaigns]);
  const adSets = useMemo(() => {
    const filtered = filterCampaignId ? allAdSets.filter((a: any) => a.campaign_id === filterCampaignId) : allAdSets;
    return filtered.filter((a: any) => a.spend && Number(a.spend) > 0);
  }, [allAdSets, filterCampaignId]);
  const ads = useMemo(() => {
    const filtered = filterAdSetId ? allAds.filter((a: any) => a.ad_set_id === filterAdSetId) : allAds;
    return filtered.filter((a: any) => a.spend && Number(a.spend) > 0);
  }, [allAds, filterAdSetId]);

  const filterCampaignName = filterCampaignId ? campaigns.find((c: any) => c.id === filterCampaignId)?.name : null;
  const filterAdSetName = filterAdSetId ? allAdSets.find((a: any) => a.id === filterAdSetId)?.name : null;

  const handleSync = () => {
    lastSyncedRange.current = currentRangeKey;
    syncMutation.mutate({ clientId, startDate, endDate });
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold tracking-tight">Ads Manager</h2>
          <Badge variant="outline" className="text-xs font-medium">{activeCampaigns.length} campaigns</Badge>
          {syncMutation.isPending ? (
            <span className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Loader2 className="h-3 w-3 animate-spin" />
              Syncing for {startDate} → {endDate}...
            </span>
          ) : lastSync ? (
            <span className="text-xs text-muted-foreground">Synced {lastSync}</span>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs gap-1.5">
            <Calendar className="h-3 w-3" />
            {startDate} → {endDate}
          </Badge>
          <Button size="sm" onClick={handleSync} disabled={syncMutation.isPending}>
            {syncMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Sync Meta Ads
          </Button>
        </div>
      </div>

      {/* Filter badges */}
      {(filterCampaignName || filterAdSetName) && (
        <div className="flex items-center gap-2 flex-wrap">
          {filterCampaignName && (
            <Badge variant="secondary" className="cursor-pointer hover:bg-destructive/10 transition-colors" onClick={() => { setFilterCampaignId(null); setFilterAdSetId(null); setActiveTab('campaigns'); }}>
              Campaign: {filterCampaignName} ✕
            </Badge>
          )}
          {filterAdSetName && (
            <Badge variant="secondary" className="cursor-pointer hover:bg-destructive/10 transition-colors" onClick={() => { setFilterAdSetId(null); setActiveTab('adsets'); }}>
              Ad Set: {filterAdSetName} ✕
            </Badge>
          )}
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="adsets">Ad Sets {filterCampaignName ? `(${adSets.length})` : ''}</TabsTrigger>
          <TabsTrigger value="ads">Ads {filterAdSetName ? `(${ads.length})` : ''}</TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns">
          <CampaignsTable data={activeCampaigns} isLoading={cLoading} onSelect={(id) => { setFilterCampaignId(id); setFilterAdSetId(null); setActiveTab('adsets'); }} />
        </TabsContent>
        <TabsContent value="adsets">
          <AdSetsTable data={adSets} isLoading={asLoading} onSelect={(id) => { setFilterAdSetId(id); setActiveTab('ads'); }} />
        </TabsContent>
        <TabsContent value="ads">
          <AdsTable data={ads} isLoading={adLoading} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CampaignsTable({ data, isLoading, onSelect }: { data: any[]; isLoading: boolean; onSelect: (id: string) => void }) {
  const { sortConfig, onSort } = useSort();
  const sorted = useMemo(() => sortData(data, sortConfig), [data, sortConfig]);

  if (isLoading) return <LoadingState />;
  if (data.length === 0) return <EmptyState />;

  return (
    <div className="rounded-lg border bg-card overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="font-bold text-sm min-w-[320px] sticky left-0 bg-card z-10">Campaign</TableHead>
            <SortableTableHeader column="status" label="Status" sortConfig={sortConfig} onSort={onSort} />
            {METRIC_HEADERS.map(h => (
              <SortableTableHeader key={h.column} column={h.column} label={h.label} sortConfig={sortConfig} onSort={onSort} />
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((c: any) => (
            <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => onSelect(c.id)}>
              <TableCell className="font-medium sticky left-0 bg-card z-10">
                <span className="whitespace-normal break-words leading-snug">{c.name}</span>
              </TableCell>
              <TableCell className="text-center"><StatusDot status={c.status} /></TableCell>
              <MetricCells row={c} />
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function AdSetsTable({ data, isLoading, onSelect }: { data: any[]; isLoading: boolean; onSelect: (id: string) => void }) {
  const { sortConfig, onSort } = useSort();
  const sorted = useMemo(() => sortData(data, sortConfig), [data, sortConfig]);

  if (isLoading) return <LoadingState />;
  if (data.length === 0) return <EmptyState />;

  return (
    <div className="rounded-lg border bg-card overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="font-bold text-sm min-w-[320px] sticky left-0 bg-card z-10">Ad Set</TableHead>
            <SortableTableHeader column="effective_status" label="Status" sortConfig={sortConfig} onSort={onSort} />
            {METRIC_HEADERS.map(h => (
              <SortableTableHeader key={h.column} column={h.column} label={h.label} sortConfig={sortConfig} onSort={onSort} />
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((a: any) => (
            <TableRow key={a.id} className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => onSelect(a.id)}>
              <TableCell className="font-medium sticky left-0 bg-card z-10">
                <span className="whitespace-normal break-words leading-snug">{a.name}</span>
              </TableCell>
              <TableCell className="text-center"><StatusDot status={a.effective_status || a.status} /></TableCell>
              <MetricCells row={a} />
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function AdsTable({ data, isLoading }: { data: any[]; isLoading: boolean }) {
  const { sortConfig, onSort } = useSort();
  const sorted = useMemo(() => sortData(data, sortConfig), [data, sortConfig]);
  const [previewAd, setPreviewAd] = useState<any | null>(null);

  if (isLoading) return <LoadingState />;
  if (data.length === 0) return <EmptyState />;

  const getCreativeUrl = (ad: any) => ad.image_url || ad.thumbnail_url || null;

  return (
    <>
      <div className="rounded-lg border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="font-bold text-sm min-w-[340px] sticky left-0 bg-card z-10">Ad Creative</TableHead>
              <SortableTableHeader column="effective_status" label="Status" sortConfig={sortConfig} onSort={onSort} />
              {METRIC_HEADERS.map(h => (
                <SortableTableHeader key={h.column} column={h.column} label={h.label} sortConfig={sortConfig} onSort={onSort} />
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((a: any) => {
              const creativeUrl = getCreativeUrl(a);
              const isVideo = a.media_type === 'video';
              return (
                <TableRow key={a.id} className="hover:bg-muted/50 transition-colors">
                  <TableCell className="font-medium sticky left-0 bg-card z-10">
                    <div className="flex items-center gap-3">
                      {creativeUrl ? (
                        <div
                          className="relative w-12 h-12 rounded-md overflow-hidden flex-shrink-0 cursor-pointer border border-border hover:opacity-80 transition-opacity"
                          onClick={() => setPreviewAd(a)}
                        >
                          <img src={creativeUrl} alt="" className="w-full h-full object-cover" />
                          {isVideo && (
                            <div className="absolute inset-0 flex items-center justify-center bg-background/40">
                              <Play className="h-4 w-4 text-foreground" fill="currentColor" />
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                          <ImageIcon className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <span className="whitespace-normal break-words leading-snug text-sm">{a.name}</span>
                        {isVideo && <span className="text-xs text-muted-foreground block mt-0.5">Video</span>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center"><StatusDot status={a.effective_status || a.status} /></TableCell>
                  <MetricCells row={a} />
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Creative Preview Modal */}
      <Dialog open={!!previewAd} onOpenChange={() => setPreviewAd(null)}>
        <DialogContent className="max-w-lg">
          <DialogTitle className="text-sm font-semibold">{previewAd?.name}</DialogTitle>
          {previewAd && (
            <div className="space-y-3">
              {getCreativeUrl(previewAd) && (
                <div className="rounded-lg overflow-hidden border border-border bg-muted">
                  <img
                    src={getCreativeUrl(previewAd)}
                    alt={previewAd.name}
                    className="w-full h-auto max-h-[400px] object-contain"
                  />
                </div>
              )}
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div className="p-2 rounded-md bg-muted">
                  <div className="text-muted-foreground">Spend</div>
                  <div className="font-semibold">{fmt$(previewAd.spend)}</div>
                </div>
                <div className="p-2 rounded-md bg-muted">
                  <div className="text-muted-foreground">Clicks</div>
                  <div className="font-semibold">{fmtN(previewAd.clicks)}</div>
                </div>
                <div className="p-2 rounded-md bg-muted">
                  <div className="text-muted-foreground">CTR</div>
                  <div className="font-semibold">{fmtPct(previewAd.ctr)}</div>
                </div>
                <div className="p-2 rounded-md bg-muted">
                  <div className="text-muted-foreground">CPM</div>
                  <div className="font-semibold">{fmt$(previewAd.cpm)}</div>
                </div>
              </div>
              {previewAd.media_type === 'video' && (
                <p className="text-xs text-muted-foreground text-center">Video creative — showing thumbnail preview</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <BarChart3 className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
      <p className="text-muted-foreground">No data synced yet. Click 'Sync Meta Ads' to pull data.</p>
    </div>
  );
}
