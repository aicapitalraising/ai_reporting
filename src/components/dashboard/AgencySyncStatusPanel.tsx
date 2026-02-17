import { useState } from 'react';
import { Client } from '@/hooks/useClients';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { RefreshCw, CheckCircle, XCircle, Clock, AlertCircle, Activity } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface ClientSyncInfo {
  id: string;
  name: string;
  status: string;
  // Meta
  metaAdAccountId: string | null;
  metaAccessToken: string | null;
  metaLastSync: string | null;
  metaSyncEnabled: boolean;
  // GHL
  ghlLocationId: string | null;
  ghlApiKey: string | null;
  ghlSyncStatus: string | null;
  ghlSyncError: string | null;
  lastGhlSyncAt: string | null;
  // GHL granular
  ghlLastContactsSync: string | null;
  ghlLastCallsSync: string | null;
  // HubSpot
  hubspotPortalId: string | null;
  hubspotSyncStatus: string | null;
  hubspotSyncError: string | null;
  lastHubspotSyncAt: string | null;
  hubspotLastContactsSync: string | null;
  hubspotLastDealsSync: string | null;
  // Pipeline
  fundedPipelineId: string | null;
  fundedStageIds: string[] | null;
  committedStageIds: string[] | null;
  trackedCalendarIds: string[] | null;
}

interface AgencySyncStatusPanelProps {
  clients: Client[];
  clientFullSettings: Record<string, any>;
}

type SyncStatus = 'healthy' | 'stale' | 'error' | 'not_configured';

function getSyncStatusFromDate(lastSync: string | null, hasCredentials: boolean): SyncStatus {
  if (!hasCredentials) return 'not_configured';
  if (!lastSync) return 'not_configured';
  const hours = (Date.now() - new Date(lastSync).getTime()) / (1000 * 60 * 60);
  if (hours <= 6) return 'healthy';
  if (hours <= 24) return 'stale';
  return 'error';
}

function StatusIcon({ status }: { status: SyncStatus }) {
  switch (status) {
    case 'healthy':
      return <CheckCircle className="h-4 w-4 text-chart-2" />;
    case 'stale':
      return <Clock className="h-4 w-4 text-chart-4" />;
    case 'error':
      return <XCircle className="h-4 w-4 text-destructive" />;
    case 'not_configured':
      return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
  }
}

function TimeAgo({ date, fallback = 'Never' }: { date: string | null; fallback?: string }) {
  if (!date) return <span className="text-muted-foreground text-xs">{fallback}</span>;
  return (
    <span className="text-xs">
      {formatDistanceToNow(new Date(date), { addSuffix: true })}
    </span>
  );
}

export function AgencySyncStatusPanel({ clients, clientFullSettings }: AgencySyncStatusPanelProps) {
  const [syncingMeta, setSyncingMeta] = useState<Set<string>>(new Set());
  const [syncingGhl, setSyncingGhl] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();

  const clientSyncData: ClientSyncInfo[] = clients
    .filter(c => c.status === 'active' || c.status === 'onboarding')
    .map(c => {
      const settings = clientFullSettings[c.id] || {};
      return {
        id: c.id,
        name: c.name,
        status: c.status,
        metaAdAccountId: (c as any).meta_ad_account_id || null,
        metaAccessToken: (c as any).meta_access_token || null,
        metaLastSync: settings.meta_ads_last_sync || null,
        metaSyncEnabled: settings.meta_ads_sync_enabled || false,
        ghlLocationId: c.ghl_location_id,
        ghlApiKey: c.ghl_api_key,
        ghlSyncStatus: c.ghl_sync_status,
        ghlSyncError: c.ghl_sync_error,
        lastGhlSyncAt: c.last_ghl_sync_at,
        ghlLastContactsSync: settings.ghl_last_contacts_sync || null,
        ghlLastCallsSync: settings.ghl_last_calls_sync || null,
        hubspotPortalId: c.hubspot_portal_id,
        hubspotSyncStatus: c.hubspot_sync_status,
        hubspotSyncError: c.hubspot_sync_error,
        lastHubspotSyncAt: c.last_hubspot_sync_at,
        hubspotLastContactsSync: settings.hubspot_last_contacts_sync || null,
        hubspotLastDealsSync: settings.hubspot_last_deals_sync || null,
        fundedPipelineId: settings.funded_pipeline_id || null,
        fundedStageIds: settings.funded_stage_ids || null,
        committedStageIds: settings.committed_stage_ids || null,
        trackedCalendarIds: settings.tracked_calendar_ids || null,
      };
    });

  const handleMetaSync = async (clientId: string) => {
    setSyncingMeta(prev => new Set(prev).add(clientId));
    try {
      const { error } = await supabase.functions.invoke('sync-meta-ads', {
        body: { client_id: clientId },
      });
      if (error) throw error;
      toast.success('Meta Ads sync triggered');
      queryClient.invalidateQueries({ queryKey: ['all-client-settings'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    } catch (err) {
      toast.error(`Meta sync failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setSyncingMeta(prev => {
        const next = new Set(prev);
        next.delete(clientId);
        return next;
      });
    }
  };

  const handleGhlSync = async (clientId: string) => {
    setSyncingGhl(prev => new Set(prev).add(clientId));
    try {
      const { error } = await supabase.functions.invoke('sync-ghl-contacts', {
        body: { client_id: clientId, mode: 'master_sync' },
      });
      if (error) throw error;
      toast.success('GHL master sync triggered (runs in background)');
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    } catch (err) {
      toast.error(`GHL sync failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setSyncingGhl(prev => {
        const next = new Set(prev);
        next.delete(clientId);
        return next;
      });
    }
  };

  const getGhlStatus = (c: ClientSyncInfo): SyncStatus => {
    if (c.hubspotPortalId) {
      return getSyncStatusFromDate(c.lastHubspotSyncAt, !!c.hubspotPortalId);
    }
    if (c.ghlSyncStatus === 'error') return 'error';
    return getSyncStatusFromDate(c.lastGhlSyncAt, !!(c.ghlLocationId && c.ghlApiKey));
  };

  const getMetaStatus = (c: ClientSyncInfo): SyncStatus => {
    return getSyncStatusFromDate(c.metaLastSync, !!(c.metaAdAccountId || c.metaAccessToken));
  };

  if (clientSyncData.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">API Sync Status</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <TooltipProvider delayDuration={200}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[160px]">Client</TableHead>
                  <TableHead className="text-center">Meta Ads</TableHead>
                  <TableHead className="text-center">CRM (Leads)</TableHead>
                  <TableHead className="text-center">Calendars</TableHead>
                  <TableHead className="text-center">Pipeline</TableHead>
                  <TableHead className="text-center w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientSyncData.map((c) => {
                  const metaStatus = getMetaStatus(c);
                  const crmSource = c.hubspotPortalId ? 'hubspot' : 'ghl';
                  const crmStatus = getGhlStatus(c);
                  const contactsSync = crmSource === 'hubspot' ? c.hubspotLastContactsSync : c.ghlLastContactsSync;
                  const calendarStatus = c.trackedCalendarIds && c.trackedCalendarIds.length > 0
                    ? getSyncStatusFromDate(c.ghlLastCallsSync, true)
                    : 'not_configured' as SyncStatus;
                  const pipelineStatus = c.fundedPipelineId
                    ? getSyncStatusFromDate(c.lastGhlSyncAt || c.lastHubspotSyncAt, true)
                    : 'not_configured' as SyncStatus;

                  return (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium text-sm py-2">
                        <div className="flex items-center gap-2">
                          <Badge variant={c.status === 'active' ? 'default' : 'secondary'} className="text-[10px] px-1.5 py-0">
                            {c.status}
                          </Badge>
                          <span className="truncate max-w-[120px]">{c.name}</span>
                        </div>
                      </TableCell>

                      {/* Meta Ads */}
                      <TableCell className="text-center py-2">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex flex-col items-center gap-0.5">
                              <StatusIcon status={metaStatus} />
                              <TimeAgo date={c.metaLastSync} />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            {metaStatus === 'not_configured'
                              ? 'Meta Ad Account not configured'
                              : `Last synced: ${c.metaLastSync ? new Date(c.metaLastSync).toLocaleString() : 'Never'}`}
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>

                      {/* CRM Leads */}
                      <TableCell className="text-center py-2">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex flex-col items-center gap-0.5">
                              <div className="flex items-center gap-1">
                                <StatusIcon status={crmStatus} />
                                <span className="text-[10px] text-muted-foreground uppercase">{crmSource}</span>
                              </div>
                              <TimeAgo date={contactsSync} />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            {crmStatus === 'not_configured'
                              ? `${crmSource.toUpperCase()} not configured`
                              : crmStatus === 'error'
                              ? `Error: ${c.ghlSyncError || c.hubspotSyncError || 'Unknown'}`
                              : `Last contacts sync: ${contactsSync ? new Date(contactsSync).toLocaleString() : 'Never'}`}
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>

                      {/* Calendars */}
                      <TableCell className="text-center py-2">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex flex-col items-center gap-0.5">
                              <StatusIcon status={calendarStatus} />
                              {calendarStatus !== 'not_configured' ? (
                                <TimeAgo date={c.ghlLastCallsSync} />
                              ) : (
                                <span className="text-[10px] text-muted-foreground">No calendars</span>
                              )}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            {calendarStatus === 'not_configured'
                              ? 'No tracked calendars configured'
                              : `${c.trackedCalendarIds?.length || 0} calendars tracked. Last sync: ${c.ghlLastCallsSync ? new Date(c.ghlLastCallsSync).toLocaleString() : 'Never'}`}
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>

                      {/* Pipeline */}
                      <TableCell className="text-center py-2">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex flex-col items-center gap-0.5">
                              <StatusIcon status={pipelineStatus} />
                              {pipelineStatus !== 'not_configured' ? (
                                <div className="flex gap-1">
                                  {(c.committedStageIds?.length || 0) > 0 && (
                                    <Badge variant="outline" className="text-[9px] px-1 py-0">C:{c.committedStageIds?.length}</Badge>
                                  )}
                                  {(c.fundedStageIds?.length || 0) > 0 && (
                                    <Badge variant="outline" className="text-[9px] px-1 py-0">F:{c.fundedStageIds?.length}</Badge>
                                  )}
                                </div>
                              ) : (
                                <span className="text-[10px] text-muted-foreground">No pipeline</span>
                              )}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            {pipelineStatus === 'not_configured'
                              ? 'No funded pipeline configured'
                              : `Funded stages: ${c.fundedStageIds?.length || 0}, Committed stages: ${c.committedStageIds?.length || 0}`}
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-center py-2">
                        <div className="flex items-center justify-center gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                disabled={metaStatus === 'not_configured' || syncingMeta.has(c.id)}
                                onClick={() => handleMetaSync(c.id)}
                              >
                                <RefreshCw className={`h-3.5 w-3.5 ${syncingMeta.has(c.id) ? 'animate-spin' : ''}`} />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Sync Meta Ads</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                disabled={crmStatus === 'not_configured' || syncingGhl.has(c.id)}
                                onClick={() => handleGhlSync(c.id)}
                              >
                                <RefreshCw className={`h-3.5 w-3.5 ${syncingGhl.has(c.id) ? 'animate-spin' : ''}`} />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Sync CRM (Master Sync)</TooltipContent>
                          </Tooltip>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TooltipProvider>
        </div>
      </CardContent>
    </Card>
  );
}
