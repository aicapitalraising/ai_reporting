import { useState, useMemo } from 'react';
import { RefreshCw, Loader2, BarChart3, Play, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SortableTableHeader, SortConfig } from '@/components/dashboard/SortableTableHeader';
import { useMetaCampaigns, useMetaAdSets, useMetaAds, useSyncMetaAds } from '@/hooks/useMetaAds';
import { useClientSettings } from '@/hooks/useClientSettings';
import { formatDistanceToNow } from 'date-fns';

interface AdsManagerTabProps {
  clientId: string;
}

function StatusDot({ status }: { status: string | null }) {
  const s = (status || '').toUpperCase();
  const color = s === 'ACTIVE' ? 'bg-green-500' : s === 'PAUSED' ? 'bg-yellow-500' : 'bg-muted-foreground/40';
  return <span className={`inline-block w-2 h-2 rounded-full ${color}`} />;
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

export function AdsManagerTab({ clientId }: AdsManagerTabProps) {
  const [activeTab, setActiveTab] = useState('campaigns');
  const [filterCampaignId, setFilterCampaignId] = useState<string | null>(null);
  const [filterAdSetId, setFilterAdSetId] = useState<string | null>(null);

  const { data: campaigns = [], isLoading: cLoading } = useMetaCampaigns(clientId);
  const { data: allAdSets = [], isLoading: asLoading } = useMetaAdSets(clientId);
  const { data: allAds = [], isLoading: adLoading } = useMetaAds(clientId);
  const { data: settings } = useClientSettings(clientId);
  const syncMutation = useSyncMetaAds();

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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold">Ads Manager</h2>
          <Badge variant="outline" className="text-xs">{activeCampaigns.length} campaigns</Badge>
          {lastSync && <span className="text-xs text-muted-foreground">Synced {lastSync}</span>}
        </div>
        <Button size="sm" onClick={() => syncMutation.mutate(clientId)} disabled={syncMutation.isPending}>
          {syncMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Sync Meta Ads
        </Button>
      </div>

      {/* Filter badges */}
      {(filterCampaignName || filterAdSetName) && (
        <div className="flex items-center gap-2 flex-wrap">
          {filterCampaignName && (
            <Badge variant="secondary" className="cursor-pointer" onClick={() => { setFilterCampaignId(null); setFilterAdSetId(null); setActiveTab('campaigns'); }}>
              Campaign: {filterCampaignName} ✕
            </Badge>
          )}
          {filterAdSetName && (
            <Badge variant="secondary" className="cursor-pointer" onClick={() => { setFilterAdSetId(null); setActiveTab('adsets'); }}>
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
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="font-bold text-sm min-w-[200px]">Campaign</TableHead>
            <SortableTableHeader column="status" label="Status" sortConfig={sortConfig} onSort={onSort} />
            <SortableTableHeader column="spend" label="Spend" sortConfig={sortConfig} onSort={onSort} />
            <SortableTableHeader column="impressions" label="Impr" sortConfig={sortConfig} onSort={onSort} />
            <SortableTableHeader column="cpm" label="CPM" sortConfig={sortConfig} onSort={onSort} />
            <SortableTableHeader column="clicks" label="Clicks" sortConfig={sortConfig} onSort={onSort} />
            <SortableTableHeader column="ctr" label="CTR" sortConfig={sortConfig} onSort={onSort} />
            <SortableTableHeader column="cpc" label="CPC" sortConfig={sortConfig} onSort={onSort} />
            <SortableTableHeader column="attributed_leads" label="Leads" sortConfig={sortConfig} onSort={onSort} />
            <SortableTableHeader column="cost_per_lead" label="CPL" sortConfig={sortConfig} onSort={onSort} />
            <SortableTableHeader column="attributed_calls" label="Calls" sortConfig={sortConfig} onSort={onSort} />
            <SortableTableHeader column="attributed_showed" label="Showed" sortConfig={sortConfig} onSort={onSort} />
            <SortableTableHeader column="attributed_funded" label="Funded" sortConfig={sortConfig} onSort={onSort} />
            <SortableTableHeader column="attributed_funded_dollars" label="Funded $" sortConfig={sortConfig} onSort={onSort} />
            <SortableTableHeader column="cost_per_funded" label="CPA" sortConfig={sortConfig} onSort={onSort} />
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((c: any) => (
            <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50" onClick={() => onSelect(c.id)}>
              <TableCell className="font-medium max-w-[250px] truncate">{c.name}</TableCell>
              <TableCell className="text-right"><StatusDot status={c.status} /></TableCell>
              <TableCell className="text-right">{fmt$(c.spend)}</TableCell>
              <TableCell className="text-right">{fmtN(c.impressions)}</TableCell>
              <TableCell className="text-right">{fmt$(c.cpm)}</TableCell>
              <TableCell className="text-right">{fmtN(c.clicks)}</TableCell>
              <TableCell className="text-right">{fmtPct(c.ctr)}</TableCell>
              <TableCell className="text-right">{fmt$(c.cpc)}</TableCell>
              <TableCell className="text-right">{fmtN(c.attributed_leads)}</TableCell>
              <TableCell className="text-right">{fmt$(c.cost_per_lead)}</TableCell>
              <TableCell className="text-right">{fmtN(c.attributed_calls)}</TableCell>
              <TableCell className="text-right">{fmtN(c.attributed_showed)}</TableCell>
              <TableCell className="text-right">{fmtN(c.attributed_funded)}</TableCell>
              <TableCell className="text-right">{fmt$(c.attributed_funded_dollars)}</TableCell>
              <TableCell className="text-right">{fmt$(c.cost_per_funded)}</TableCell>
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
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="font-bold text-sm min-w-[200px]">Ad Set</TableHead>
            <SortableTableHeader column="effective_status" label="Status" sortConfig={sortConfig} onSort={onSort} />
            <SortableTableHeader column="spend" label="Spend" sortConfig={sortConfig} onSort={onSort} />
            <SortableTableHeader column="impressions" label="Impr" sortConfig={sortConfig} onSort={onSort} />
            <SortableTableHeader column="cpm" label="CPM" sortConfig={sortConfig} onSort={onSort} />
            <SortableTableHeader column="clicks" label="Clicks" sortConfig={sortConfig} onSort={onSort} />
            <SortableTableHeader column="ctr" label="CTR" sortConfig={sortConfig} onSort={onSort} />
            <SortableTableHeader column="cpc" label="CPC" sortConfig={sortConfig} onSort={onSort} />
            <SortableTableHeader column="attributed_leads" label="Leads" sortConfig={sortConfig} onSort={onSort} />
            <SortableTableHeader column="cost_per_lead" label="CPL" sortConfig={sortConfig} onSort={onSort} />
            <SortableTableHeader column="attributed_calls" label="Calls" sortConfig={sortConfig} onSort={onSort} />
            <SortableTableHeader column="attributed_showed" label="Showed" sortConfig={sortConfig} onSort={onSort} />
            <SortableTableHeader column="attributed_funded" label="Funded" sortConfig={sortConfig} onSort={onSort} />
            <SortableTableHeader column="attributed_funded_dollars" label="Funded $" sortConfig={sortConfig} onSort={onSort} />
            <SortableTableHeader column="cost_per_funded" label="CPA" sortConfig={sortConfig} onSort={onSort} />
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((a: any) => (
            <TableRow key={a.id} className="cursor-pointer hover:bg-muted/50" onClick={() => onSelect(a.id)}>
              <TableCell className="font-medium max-w-[250px] truncate">{a.name}</TableCell>
              <TableCell className="text-right"><StatusDot status={a.effective_status || a.status} /></TableCell>
              <TableCell className="text-right">{fmt$(a.spend)}</TableCell>
              <TableCell className="text-right">{fmtN(a.impressions)}</TableCell>
              <TableCell className="text-right">{fmt$(a.cpm)}</TableCell>
              <TableCell className="text-right">{fmtN(a.clicks)}</TableCell>
              <TableCell className="text-right">{fmtPct(a.ctr)}</TableCell>
              <TableCell className="text-right">{fmt$(a.cpc)}</TableCell>
              <TableCell className="text-right">{fmtN(a.attributed_leads)}</TableCell>
              <TableCell className="text-right">{fmt$(a.cost_per_lead)}</TableCell>
              <TableCell className="text-right">{fmtN(a.attributed_calls)}</TableCell>
              <TableCell className="text-right">{fmtN(a.attributed_showed)}</TableCell>
              <TableCell className="text-right">{fmtN(a.attributed_funded)}</TableCell>
              <TableCell className="text-right">{fmt$(a.attributed_funded_dollars)}</TableCell>
              <TableCell className="text-right">{fmt$(a.cost_per_funded)}</TableCell>
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
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-bold text-sm min-w-[280px]">Ad Creative</TableHead>
              <SortableTableHeader column="effective_status" label="Status" sortConfig={sortConfig} onSort={onSort} />
              <SortableTableHeader column="spend" label="Spend" sortConfig={sortConfig} onSort={onSort} />
              <SortableTableHeader column="impressions" label="Impr" sortConfig={sortConfig} onSort={onSort} />
              <SortableTableHeader column="cpm" label="CPM" sortConfig={sortConfig} onSort={onSort} />
              <SortableTableHeader column="clicks" label="Clicks" sortConfig={sortConfig} onSort={onSort} />
              <SortableTableHeader column="ctr" label="CTR" sortConfig={sortConfig} onSort={onSort} />
              <SortableTableHeader column="cpc" label="CPC" sortConfig={sortConfig} onSort={onSort} />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((a: any) => {
              const creativeUrl = getCreativeUrl(a);
              const isVideo = a.media_type === 'video';
              return (
                <TableRow key={a.id}>
                  <TableCell className="font-medium max-w-[320px]">
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
                        <span className="truncate block text-sm">{a.name}</span>
                        {isVideo && <span className="text-xs text-muted-foreground">Video</span>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right"><StatusDot status={a.effective_status || a.status} /></TableCell>
                  <TableCell className="text-right">{fmt$(a.spend)}</TableCell>
                  <TableCell className="text-right">{fmtN(a.impressions)}</TableCell>
                  <TableCell className="text-right">{fmt$(a.cpm)}</TableCell>
                  <TableCell className="text-right">{fmtN(a.clicks)}</TableCell>
                  <TableCell className="text-right">{fmtPct(a.ctr)}</TableCell>
                  <TableCell className="text-right">{fmt$(a.cpc)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Creative Preview Modal */}
      <Dialog open={!!previewAd} onOpenChange={() => setPreviewAd(null)}>
        <DialogContent className="max-w-lg">
          <DialogTitle className="text-sm font-semibold truncate">{previewAd?.name}</DialogTitle>
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
