import { useState, useMemo } from 'react';
import { ChevronRight, ChevronDown, Search, Copy, Check, RefreshCw } from 'lucide-react';
import { useClients } from '@/hooks/useClients';
import { useMetaCampaigns, useMetaAdSets, useMetaAds } from '@/hooks/useMetaAds';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

function fmt$(val: number | null) {
  if (!val) return '$0';
  return `$${Number(val).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}
function fmtN(val: number | null) {
  if (!val) return '0';
  return Number(val).toLocaleString();
}

function CopyableValue({ value, display }: { value: string; display: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <span className="group inline-flex items-center gap-1 cursor-pointer" onClick={handleCopy}>
      {display}
      {copied ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />}
    </span>
  );
}

function MetricRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="text-center px-1.5">
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</div>
      <div className={`text-xs font-semibold tabular-nums ${color || 'text-foreground'}`}>
        <CopyableValue value={value.replace(/[$,%]/g, '')} display={value} />
      </div>
    </div>
  );
}

function AttributionMetrics({ row }: { row: any }) {
  const spend = Number(row.spend) || 0;
  const leads = Number(row.attributed_leads) || 0;
  const calls = Number(row.attributed_calls) || 0;
  const showed = Number(row.attributed_showed) || 0;
  const funded = Number(row.attributed_funded) || 0;
  const fundedDollars = Number(row.attributed_funded_dollars) || 0;
  const cpa = Number(row.cost_per_funded) || 0;

  const cpaColor = cpa === 0 ? '' : cpa < 500 ? 'text-green-400' : cpa < 1000 ? 'text-yellow-400' : 'text-red-400';

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <MetricRow label="Spend" value={fmt$(spend)} />
      <MetricRow label="Leads" value={fmtN(leads)} />
      <MetricRow label="Calls" value={fmtN(calls)} />
      <MetricRow label="Showed" value={fmtN(showed)} />
      <MetricRow label="Funded" value={fmtN(funded)} color={funded > 0 ? 'text-green-400' : ''} />
      <MetricRow label="Funded $" value={fmt$(fundedDollars)} color={fundedDollars > 0 ? 'text-green-400' : ''} />
      <MetricRow label="CPA" value={fmt$(cpa)} color={cpaColor} />
    </div>
  );
}

function AdRow({ ad }: { ad: any }) {
  return (
    <div className="py-1.5 px-3 pl-12 flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors rounded-sm">
      <span className="text-xs text-muted-foreground truncate max-w-[200px]">{ad.name}</span>
      <AttributionMetrics row={ad} />
    </div>
  );
}

function AdSetRow({ adSet, ads }: { adSet: any; ads: any[] }) {
  const [open, setOpen] = useState(false);
  const matchingAds = ads.filter(a => a.ad_set_id === adSet.id && Number(a.spend) > 0);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="w-full">
        <div className="py-2 px-3 pl-8 flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors rounded-sm cursor-pointer">
          <div className="flex items-center gap-2 min-w-0">
            {matchingAds.length > 0 ? (
              open ? <ChevronDown className="h-3 w-3 text-muted-foreground flex-shrink-0" /> : <ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
            ) : <div className="w-3" />}
            <span className="text-sm truncate max-w-[220px]">{adSet.name}</span>
            {matchingAds.length > 0 && <Badge variant="outline" className="text-[10px] px-1.5 py-0">{matchingAds.length}</Badge>}
          </div>
          <AttributionMetrics row={adSet} />
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        {matchingAds.map(ad => <AdRow key={ad.id} ad={ad} />)}
      </CollapsibleContent>
    </Collapsible>
  );
}

function CampaignRow({ campaign, adSets, ads }: { campaign: any; adSets: any[]; ads: any[] }) {
  const [open, setOpen] = useState(false);
  const matchingAdSets = adSets.filter(as => as.campaign_id === campaign.id && Number(as.spend) > 0);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="w-full">
        <div className="py-2.5 px-3 flex items-center justify-between gap-3 hover:bg-muted/50 transition-colors rounded-md cursor-pointer border-b border-border/50">
          <div className="flex items-center gap-2 min-w-0">
            {matchingAdSets.length > 0 ? (
              open ? <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            ) : <div className="w-4" />}
            <span className="text-sm font-medium truncate max-w-[240px]">{campaign.name}</span>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">{matchingAdSets.length} sets</Badge>
          </div>
          <AttributionMetrics row={campaign} />
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        {matchingAdSets.map(as => <AdSetRow key={as.id} adSet={as} ads={ads} />)}
      </CollapsibleContent>
    </Collapsible>
  );
}

export default function MetaAdsOverlay() {
  const { data: clients = [] } = useClients();
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [search, setSearch] = useState('');

  const clientId = selectedClientId || clients[0]?.id;

  const { data: campaigns = [], isLoading: cLoading } = useMetaCampaigns(clientId);
  const { data: adSets = [] } = useMetaAdSets(clientId);
  const { data: ads = [] } = useMetaAds(clientId);

  // Auto-refresh every 60s
  const { data: _refreshCampaigns } = useMetaCampaigns(clientId);

  const searchLower = search.toLowerCase();
  const filteredCampaigns = useMemo(() => {
    const active = campaigns.filter((c: any) => Number(c.spend) > 0);
    if (!searchLower) return active;
    return active.filter((c: any) => {
      if (c.name.toLowerCase().includes(searchLower)) return true;
      const campAdSets = adSets.filter((as: any) => as.campaign_id === c.id);
      if (campAdSets.some((as: any) => as.name.toLowerCase().includes(searchLower))) return true;
      const campAds = ads.filter((a: any) => campAdSets.some((as: any) => as.id === a.ad_set_id));
      return campAds.some((a: any) => a.name.toLowerCase().includes(searchLower));
    });
  }, [campaigns, adSets, ads, searchLower]);

  const totalSpend = campaigns.reduce((s: number, c: any) => s + (Number(c.spend) || 0), 0);
  const totalLeads = campaigns.reduce((s: number, c: any) => s + (Number(c.attributed_leads) || 0), 0);
  const totalFunded = campaigns.reduce((s: number, c: any) => s + (Number(c.attributed_funded) || 0), 0);
  const totalFundedDollars = campaigns.reduce((s: number, c: any) => s + (Number(c.attributed_funded_dollars) || 0), 0);

  return (
    <div className="min-h-screen bg-background text-foreground p-3 max-w-[900px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h1 className="text-sm font-bold tracking-tight">Meta Ads Attribution</h1>
          <Badge variant="secondary" className="text-[10px]">Hyros Alt</Badge>
        </div>
        <RefreshCw className="h-3.5 w-3.5 text-muted-foreground animate-spin" style={{ animationDuration: '60s' }} />
      </div>

      {/* Client selector + search */}
      <div className="flex gap-2 mb-3">
        <Select value={clientId || ''} onValueChange={setSelectedClientId}>
          <SelectTrigger className="h-8 text-xs w-[180px]">
            <SelectValue placeholder="Select client" />
          </SelectTrigger>
          <SelectContent>
            {clients.map((c: any) => (
              <SelectItem key={c.id} value={c.id} className="text-xs">{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search campaigns, ad sets, ads..."
            className="h-8 pl-7 text-xs"
          />
        </div>
      </div>

      {/* Summary bar */}
      <div className="flex items-center gap-4 mb-3 px-3 py-2 rounded-lg bg-muted/50 border border-border/50">
        <div className="text-center">
          <div className="text-[10px] text-muted-foreground">Total Spend</div>
          <div className="text-sm font-bold">{fmt$(totalSpend)}</div>
        </div>
        <div className="text-center">
          <div className="text-[10px] text-muted-foreground">Leads</div>
          <div className="text-sm font-bold">{fmtN(totalLeads)}</div>
        </div>
        <div className="text-center">
          <div className="text-[10px] text-muted-foreground">Funded</div>
          <div className="text-sm font-bold text-primary">{fmtN(totalFunded)}</div>
        </div>
        <div className="text-center">
          <div className="text-[10px] text-muted-foreground">Funded $</div>
          <div className="text-sm font-bold text-primary">{fmt$(totalFundedDollars)}</div>
        </div>
        <div className="text-center">
          <div className="text-[10px] text-muted-foreground">CPA</div>
          <div className="text-sm font-bold">{totalFunded > 0 ? fmt$(totalSpend / totalFunded) : '-'}</div>
        </div>
      </div>

      {/* Campaign tree */}
      {cLoading ? (
        <div className="text-center py-8 text-muted-foreground text-sm">Loading...</div>
      ) : filteredCampaigns.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">No campaigns with spend found. Sync Meta Ads first.</div>
      ) : (
        <div className="space-y-0.5">
          {filteredCampaigns.map((c: any) => (
            <CampaignRow key={c.id} campaign={c} adSets={adSets} ads={ads} />
          ))}
        </div>
      )}
    </div>
  );
}
