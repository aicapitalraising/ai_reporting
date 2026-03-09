import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Play,
  AlertCircle,
  Database,
  Bot,
  Zap,
  Globe,
  Loader2,
  Activity,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface AgentDef {
  id: string;
  name: string;
  description: string;
  syncType?: string;
  canRun?: boolean;
}

interface AgentCategory {
  label: string;
  icon: React.ReactNode;
  agents: AgentDef[];
}

const AGENT_CATEGORIES: AgentCategory[] = [
  {
    label: 'AI Analysis',
    icon: <Bot className="h-4 w-4" />,
    agents: [
      { id: 'ai-agent-full-context', name: 'Full Portfolio AI', description: 'Deep analysis across all client data', canRun: false },
      { id: 'ai-analysis', name: 'AI Analysis', description: 'General AI analysis endpoint', canRun: false },
      { id: 'creative-ai-audit', name: 'Creative AI Audit', description: 'Audits ad creatives with AI feedback', syncType: 'creative-ai-audit', canRun: true },
    ],
  },
  {
    label: 'Sync Agents',
    icon: <RefreshCw className="h-4 w-4" />,
    agents: [
      { id: 'daily-master-sync', name: 'Daily Master Sync', description: 'Full data sync across all integrations', syncType: 'daily-master-sync', canRun: true },
      { id: 'sync-ghl-all-clients', name: 'GHL All Clients', description: 'Sync all GHL client data', syncType: 'ghl', canRun: true },
      { id: 'sync-ghl-contacts', name: 'GHL Contacts', description: 'Sync GoHighLevel contacts', syncType: 'ghl-contacts', canRun: true },
      { id: 'sync-hubspot-all-clients', name: 'HubSpot All Clients', description: 'Sync all HubSpot data', syncType: 'hubspot', canRun: true },
      { id: 'sync-hubspot-contacts', name: 'HubSpot Contacts', description: 'Sync HubSpot contacts', syncType: 'hubspot-contacts', canRun: true },
      { id: 'sync-meta-ads', name: 'Meta Ads Sync', description: 'Sync Meta advertising data', syncType: 'meta-ads', canRun: true },
      { id: 'sync-meta-ads-daily', name: 'Meta Ads Daily', description: 'Daily Meta ads data pull', syncType: 'meta-ads-daily', canRun: true },
      { id: 'sync-calendar-appointments', name: 'Calendar Sync', description: 'Sync calendar appointments', syncType: 'calendar', canRun: true },
      { id: 'sync-outbound-ghl', name: 'Outbound GHL', description: 'Push data back to GHL', syncType: 'outbound-ghl', canRun: true },
    ],
  },
  {
    label: 'Data Processing',
    icon: <Database className="h-4 w-4" />,
    agents: [
      { id: 'recalculate-daily-metrics', name: 'Recalculate Metrics', description: 'Recompute daily performance metrics', syncType: 'recalculate-metrics', canRun: true },
      { id: 'run-reconciliation', name: 'Data Reconciliation', description: 'Reconcile data discrepancies', syncType: 'reconciliation', canRun: true },
      { id: 'daily-accuracy-check', name: 'Accuracy Check', description: 'Verify data accuracy daily', syncType: 'accuracy-check', canRun: true },
      { id: 'batch-import-enrich', name: 'Batch Enrich', description: 'Bulk enrich imported leads', syncType: 'enrich', canRun: true },
      { id: 'enrich-all-funded', name: 'Enrich Funded', description: 'Enrich all funded investor records', syncType: 'enrich-funded', canRun: true },
      { id: 'enrich-lead-retargetiq', name: 'RetargetIQ Enrich', description: 'Enrich leads with RetargetIQ data', syncType: 'retargetiq', canRun: true },
    ],
  },
  {
    label: 'Web & Media',
    icon: <Globe className="h-4 w-4" />,
    agents: [
      { id: 'batch-scrape-branding', name: 'Branding Scraper', description: 'Scrape and extract brand assets', syncType: 'branding', canRun: true },
      { id: 'scrape-brand-info', name: 'Brand Info Scrape', description: 'Pull brand info from websites', syncType: 'brand-info', canRun: true },
      { id: 'scrape-fb-ads', name: 'FB Ads Scraper', description: 'Scrape Facebook ad data', syncType: 'fb-ads', canRun: true },
      { id: 'fetch-page-metadata', name: 'Page Metadata', description: 'Fetch metadata from landing pages', syncType: 'page-metadata', canRun: true },
      { id: 'verify-pixels', name: 'Pixel Verifier', description: 'Verify tracking pixel installation', syncType: 'pixel-verify', canRun: true },
    ],
  },
  {
    label: 'Webhooks & Import',
    icon: <Zap className="h-4 w-4" />,
    agents: [
      { id: 'webhook-ingest', name: 'Webhook Ingest', description: 'Receives and processes webhooks', canRun: false },
      { id: 'meetgeek-webhook', name: 'MeetGeek Webhook', description: 'Processes MeetGeek meeting data', canRun: false },
      { id: 'import-csv-raw', name: 'CSV Import', description: 'Import raw CSV data', canRun: false },
      { id: 'import-funded-csv', name: 'Funded CSV Import', description: 'Import funded investor CSVs', canRun: false },
      { id: 'bulk-investor-import', name: 'Bulk Investor Import', description: 'Bulk import investor records', syncType: 'bulk-import', canRun: true },
    ],
  },
];

function useRecentSyncLogs() {
  return useQuery({
    queryKey: ['sync-logs-recent'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sync_logs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
    refetchInterval: 30_000,
  });
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'completed':
    case 'success':
      return <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />;
    case 'error':
    case 'failed':
      return <XCircle className="h-3.5 w-3.5 text-destructive" />;
    case 'running':
    case 'in_progress':
      return <Loader2 className="h-3.5 w-3.5 text-blue-500 animate-spin" />;
    default:
      return <Clock className="h-3.5 w-3.5 text-muted-foreground" />;
  }
}

function getStatusBadgeVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'completed':
    case 'success':
      return 'default';
    case 'error':
    case 'failed':
      return 'destructive';
    default:
      return 'secondary';
  }
}

interface AgentCardProps {
  agent: AgentDef;
  lastLog?: { status: string; started_at: string; completed_at: string | null; error_message: string | null; records_synced: number | null } | null;
  onRun: (agentId: string) => void;
  isRunning: boolean;
}

function AgentCard({ agent, lastLog, onRun, isRunning }: AgentCardProps) {
  const statusLabel = lastLog?.status ?? 'never run';
  const isError = lastLog?.status === 'error' || lastLog?.status === 'failed';

  return (
    <div className="flex items-start justify-between p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          {lastLog ? getStatusIcon(lastLog.status) : <Clock className="h-3.5 w-3.5 text-muted-foreground" />}
          <span className="font-medium text-sm truncate">{agent.name}</span>
        </div>
        <p className="text-xs text-muted-foreground mb-1">{agent.description}</p>
        {lastLog ? (
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={getStatusBadgeVariant(lastLog.status)} className="text-[10px] px-1.5 py-0">
              {lastLog.status}
            </Badge>
            <span className="text-[10px] text-muted-foreground">
              {formatDistanceToNow(new Date(lastLog.started_at), { addSuffix: true })}
            </span>
            {lastLog.records_synced != null && (
              <span className="text-[10px] text-muted-foreground">
                {lastLog.records_synced} records
              </span>
            )}
          </div>
        ) : (
          <span className="text-[10px] text-muted-foreground italic">No runs recorded</span>
        )}
        {isError && lastLog?.error_message && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1 mt-1 cursor-help">
                  <AlertCircle className="h-3 w-3 text-destructive" />
                  <span className="text-[10px] text-destructive truncate max-w-[200px]">
                    {lastLog.error_message}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs text-xs">
                {lastLog.error_message}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      {agent.canRun && (
        <Button
          size="sm"
          variant="outline"
          className="h-7 w-7 p-0 shrink-0"
          disabled={isRunning}
          onClick={() => onRun(agent.id)}
        >
          {isRunning ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Play className="h-3.5 w-3.5" />
          )}
        </Button>
      )}
    </div>
  );
}

export function AgentsDashboard() {
  const { data: syncLogs = [], isLoading, refetch } = useRecentSyncLogs();
  const [runningAgents, setRunningAgents] = useState<Set<string>>(new Set());
  const [runResults, setRunResults] = useState<Record<string, { ok: boolean; message: string }>>({});

  // Build a lookup: syncType -> latest log
  const latestByType = syncLogs.reduce<Record<string, typeof syncLogs[0]>>((acc, log) => {
    if (!acc[log.sync_type] || new Date(log.started_at) > new Date(acc[log.sync_type].started_at)) {
      acc[log.sync_type] = log;
    }
    return acc;
  }, {});

  // Overall stats
  const totalRuns = syncLogs.length;
  const successRuns = syncLogs.filter(l => l.status === 'completed' || l.status === 'success').length;
  const errorRuns = syncLogs.filter(l => l.status === 'error' || l.status === 'failed').length;
  const runningNow = syncLogs.filter(l => l.status === 'running' || l.status === 'in_progress').length;

  const handleRun = async (agentId: string) => {
    setRunningAgents(prev => new Set(prev).add(agentId));
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${agentId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({}),
        }
      );
      const ok = res.ok;
      let message = ok ? 'Started successfully' : `Failed (${res.status})`;
      try {
        const body = await res.json();
        if (body?.message) message = body.message;
      } catch {}
      setRunResults(prev => ({ ...prev, [agentId]: { ok, message } }));
      if (ok) setTimeout(() => refetch(), 2000);
    } catch (err) {
      setRunResults(prev => ({ ...prev, [agentId]: { ok: false, message: 'Network error' } }));
    } finally {
      setRunningAgents(prev => {
        const next = new Set(prev);
        next.delete(agentId);
        return next;
      });
    }
  };

  const recentLogs = syncLogs.slice(0, 20);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">AI Agents Dashboard</h3>
          <p className="text-sm text-muted-foreground">
            Monitor and manage your automated agents and sync jobs
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
          <RefreshCw className={cn('h-4 w-4 mr-2', isLoading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Total Runs</p>
              <p className="text-lg font-bold">{totalRuns}</p>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <div>
              <p className="text-xs text-muted-foreground">Succeeded</p>
              <p className="text-lg font-bold text-green-600">{successRuns}</p>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4 text-destructive" />
            <div>
              <p className="text-xs text-muted-foreground">Errors</p>
              <p className="text-lg font-bold text-destructive">{errorRuns}</p>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <Loader2 className={cn('h-4 w-4 text-blue-500', runningNow > 0 && 'animate-spin')} />
            <div>
              <p className="text-xs text-muted-foreground">Running</p>
              <p className="text-lg font-bold text-blue-600">{runningNow}</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Agent Categories */}
        <div className="lg:col-span-2 space-y-4">
          {AGENT_CATEGORIES.map((category) => (
            <Card key={category.label}>
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm flex items-center gap-2">
                  {category.icon}
                  {category.label}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-2">
                {category.agents.map((agent) => {
                  const lastLog = agent.syncType ? latestByType[agent.syncType] ?? null : null;
                  const result = runResults[agent.id];
                  return (
                    <div key={agent.id}>
                      <AgentCard
                        agent={agent}
                        lastLog={lastLog}
                        onRun={handleRun}
                        isRunning={runningAgents.has(agent.id)}
                      />
                      {result && (
                        <p className={cn(
                          'text-[10px] px-3 mt-0.5',
                          result.ok ? 'text-green-600' : 'text-destructive'
                        )}>
                          {result.message}
                        </p>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent Activity */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              <ScrollArea className="h-[500px]">
                <div className="px-4 pb-4 space-y-2">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : recentLogs.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No sync activity recorded yet
                    </p>
                  ) : (
                    recentLogs.map((log) => (
                      <div key={log.id} className="space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            {getStatusIcon(log.status)}
                            <span className="text-xs font-medium truncate">{log.sync_type}</span>
                          </div>
                          <Badge
                            variant={getStatusBadgeVariant(log.status)}
                            className="text-[9px] px-1 py-0 shrink-0"
                          >
                            {log.status}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground pl-5">
                          <span>{format(new Date(log.started_at), 'MMM d, h:mm a')}</span>
                          {log.records_synced != null && (
                            <span>{log.records_synced} records</span>
                          )}
                        </div>
                        {log.error_message && (
                          <p className="text-[10px] text-destructive pl-5 truncate">
                            {log.error_message}
                          </p>
                        )}
                        <Separator className="mt-2" />
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
