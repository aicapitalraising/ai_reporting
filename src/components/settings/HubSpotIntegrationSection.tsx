import { useState, useEffect } from 'react';
import { Client } from '@/hooks/useClients';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, RefreshCw, CheckCircle, XCircle, Plug, Eye, EyeOff } from 'lucide-react';
import { useHubSpotSync } from '@/hooks/useHubSpotSync';

interface HubSpotIntegrationSectionProps {
  client: Client;
  settings: any;
}

interface HubSpotPipeline {
  id: string;
  label: string;
  stages: { id: string; label: string }[];
}

export function HubSpotIntegrationSection({ client, settings }: HubSpotIntegrationSectionProps) {
  const queryClient = useQueryClient();
  const { testConnection, syncNow, fetchPipelines, isLoading } = useHubSpotSync();

  // Credentials state
  const [hubspotPortalId, setHubspotPortalId] = useState('');
  const [hubspotAccessToken, setHubspotAccessToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [hubspotSyncEnabled, setHubspotSyncEnabled] = useState(false);

  // Pipeline/stage mapping state
  const [pipelines, setPipelines] = useState<HubSpotPipeline[]>([]);
  const [loadingPipelines, setLoadingPipelines] = useState(false);
  const [fundedPipelineId, setFundedPipelineId] = useState('');
  const [fundedStageIds, setFundedStageIds] = useState<string[]>([]);
  const [committedStageIds, setCommittedStageIds] = useState<string[]>([]);

  // Meeting types state
  const [bookedMeetingTypes, setBookedMeetingTypes] = useState<string[]>([]);
  const [reconnectMeetingTypes, setReconnectMeetingTypes] = useState<string[]>([]);

  // Connection status
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'error'>('unknown');
  const [syncing, setSyncing] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);

  // Load existing settings
  useEffect(() => {
    if (client) {
      const clientAny = client as any;
      setHubspotPortalId(clientAny.hubspot_portal_id || '');
      setHubspotAccessToken(clientAny.hubspot_access_token || '');
      if (clientAny.hubspot_portal_id && clientAny.hubspot_access_token) {
        setConnectionStatus(clientAny.hubspot_sync_status === 'error' ? 'error' : 'connected');
      }
    }
    if (settings) {
      setHubspotSyncEnabled(settings.hubspot_sync_enabled || false);
      setFundedPipelineId(settings.hubspot_funded_pipeline_id || '');
      setFundedStageIds(settings.hubspot_funded_stage_ids || []);
      setCommittedStageIds(settings.hubspot_committed_stage_ids || []);
      setBookedMeetingTypes(settings.hubspot_booked_meeting_types || []);
      setReconnectMeetingTypes(settings.hubspot_reconnect_meeting_types || []);
    }
  }, [client, settings]);

  // Load pipelines when credentials are available
  useEffect(() => {
    if (hubspotPortalId && hubspotAccessToken && connectionStatus === 'connected') {
      handleLoadPipelines();
    }
  }, [connectionStatus]);

  const handleTestConnection = async () => {
    if (!hubspotPortalId || !hubspotAccessToken) {
      toast.error('Please enter both Portal ID and Access Token');
      return;
    }
    setTestingConnection(true);
    try {
      const result = await testConnection(client.id, hubspotPortalId, hubspotAccessToken);
      if (result.success) {
        setConnectionStatus('connected');
        toast.success('HubSpot connection successful!');
        // Save credentials
        await saveCredentials();
        // Load pipelines
        handleLoadPipelines();
      } else {
        setConnectionStatus('error');
        toast.error(result.error || 'Connection failed');
      }
    } catch (error) {
      console.error('HubSpot connection test failed:', error);
      setConnectionStatus('error');
      toast.error('Connection failed - please check your credentials');
    } finally {
      setTestingConnection(false);
    }
  };

  const saveCredentials = async () => {
    await supabase
      .from('clients')
      .update({
        hubspot_portal_id: hubspotPortalId || null,
        hubspot_access_token: hubspotAccessToken || null,
        hubspot_sync_status: 'healthy',
      })
      .eq('id', client.id);
    queryClient.invalidateQueries({ queryKey: ['clients'] });
  };

  const handleLoadPipelines = async () => {
    if (!client.id) return;
    setLoadingPipelines(true);
    try {
      const result = await fetchPipelines(client.id);
      if (result.pipelines) {
        setPipelines(result.pipelines);
      }
    } catch (error) {
      console.error('Failed to load pipelines:', error);
    } finally {
      setLoadingPipelines(false);
    }
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    try {
      const result = await syncNow(client.id);
      if (result.success) {
        const summary = result.summary || {};
        toast.success(`Synced ${summary.contacts || 0} contacts, ${summary.deals || 0} deals, ${summary.meetings || 0} meetings`);
        queryClient.invalidateQueries({ queryKey: ['leads', client.id] });
        queryClient.invalidateQueries({ queryKey: ['calls', client.id] });
        queryClient.invalidateQueries({ queryKey: ['funded-investors', client.id] });
      } else {
        toast.error(result.error || 'Sync failed');
      }
    } catch (error) {
      console.error('HubSpot sync failed:', error);
      toast.error('Sync failed - please try again');
    } finally {
      setSyncing(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      await supabase
        .from('client_settings')
        .upsert({
          client_id: client.id,
          hubspot_sync_enabled: hubspotSyncEnabled,
          hubspot_funded_pipeline_id: fundedPipelineId || null,
          hubspot_funded_stage_ids: fundedStageIds,
          hubspot_committed_stage_ids: committedStageIds,
          hubspot_booked_meeting_types: bookedMeetingTypes,
          hubspot_reconnect_meeting_types: reconnectMeetingTypes,
        }, { onConflict: 'client_id' });
      
      queryClient.invalidateQueries({ queryKey: ['client-settings', client.id] });
      toast.success('HubSpot settings saved');
    } catch (error) {
      console.error('Failed to save HubSpot settings:', error);
      toast.error('Failed to save settings');
    }
  };

  const selectedPipeline = pipelines.find(p => p.id === fundedPipelineId);
  const availableStages = selectedPipeline?.stages || [];

  const toggleStageSelection = (stageId: string, type: 'funded' | 'committed') => {
    if (type === 'funded') {
      setFundedStageIds(prev => 
        prev.includes(stageId) ? prev.filter(id => id !== stageId) : [...prev, stageId]
      );
    } else {
      setCommittedStageIds(prev => 
        prev.includes(stageId) ? prev.filter(id => id !== stageId) : [...prev, stageId]
      );
    }
  };

  // Common meeting types
  const commonMeetingTypes = [
    'Discovery Call',
    'Sales Call',
    'Demo',
    'Consultation',
    'Follow-up Meeting',
    'Check-in',
    'Onboarding',
    'Strategy Session',
  ];

  return (
    <div className="space-y-6">
      {/* Connection Section */}
      <div className="border-2 border-border p-4 space-y-4">
        <div>
          <h4 className="font-medium mb-1 flex items-center gap-2">
            <Plug className="h-4 w-4" />
            HubSpot Integration
          </h4>
          <p className="text-sm text-muted-foreground mb-3">
            Connect your HubSpot account to sync contacts, deals, and meetings
          </p>
        </div>

        <div className="flex items-center gap-4 mb-4">
          <Switch
            checked={hubspotSyncEnabled}
            onCheckedChange={setHubspotSyncEnabled}
          />
          <span className="text-sm font-medium">Enable HubSpot Sync</span>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="hubspotPortalId">Portal ID</Label>
            <Input
              id="hubspotPortalId"
              value={hubspotPortalId}
              onChange={(e) => setHubspotPortalId(e.target.value)}
              placeholder="12345678"
            />
            <p className="text-xs text-muted-foreground">
              Found in HubSpot → Settings → Account Defaults
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="hubspotAccessToken">Private App Access Token</Label>
            <div className="relative">
              <Input
                id="hubspotAccessToken"
                type={showToken ? 'text' : 'password'}
                value={hubspotAccessToken}
                onChange={(e) => setHubspotAccessToken(e.target.value)}
                placeholder="pat-na1-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                onClick={() => setShowToken(!showToken)}
              >
                {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Generate in HubSpot → Settings → Integrations → Private Apps
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <span className="text-sm font-medium">Status:</span>
          {connectionStatus === 'connected' && (
            <span className="flex items-center gap-1 text-sm text-chart-2">
              <CheckCircle className="h-4 w-4" />
              Connected
            </span>
          )}
          {connectionStatus === 'error' && (
            <span className="flex items-center gap-1 text-sm text-destructive">
              <XCircle className="h-4 w-4" />
              Connection Failed
            </span>
          )}
          {connectionStatus === 'unknown' && (
            <span className="text-sm text-muted-foreground">Not Configured</span>
          )}
        </div>

        {/* Last Sync Status */}
        {settings?.hubspot_last_contacts_sync && (
          <div className="p-3 border-2 border-border bg-muted/30 space-y-1">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Last Contacts Sync:</span>
              <span className="font-medium">
                {new Date(settings.hubspot_last_contacts_sync).toLocaleString()}
              </span>
            </div>
            {settings?.hubspot_last_deals_sync && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Last Deals Sync:</span>
                <span className="font-medium">
                  {new Date(settings.hubspot_last_deals_sync).toLocaleString()}
                </span>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleTestConnection}
            disabled={testingConnection || !hubspotPortalId || !hubspotAccessToken}
          >
            {testingConnection ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Testing...
              </>
            ) : (
              'Test Connection'
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleSyncNow}
            disabled={syncing || connectionStatus !== 'connected'}
          >
            {syncing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Sync Now
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Deal Stage Mapping */}
      {connectionStatus === 'connected' && (
        <div className="border-2 border-border p-4 space-y-4">
          <div>
            <h4 className="font-medium mb-1">Deal Stage Mapping</h4>
            <p className="text-sm text-muted-foreground mb-3">
              Map HubSpot deal stages to funded and committed investors
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Pipeline</Label>
              <Select value={fundedPipelineId} onValueChange={setFundedPipelineId}>
                <SelectTrigger>
                  <SelectValue placeholder={loadingPipelines ? "Loading..." : "Select a pipeline"} />
                </SelectTrigger>
                <SelectContent>
                  {pipelines.map(pipeline => (
                    <SelectItem key={pipeline.id} value={pipeline.id}>
                      {pipeline.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleLoadPipelines}
                disabled={loadingPipelines}
              >
                {loadingPipelines ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                <span className="ml-2">Refresh Pipelines</span>
              </Button>
            </div>

            {availableStages.length > 0 && (
              <>
                <div className="space-y-2">
                  <Label>Funded Stages (select multiple)</Label>
                  <div className="border-2 border-border rounded p-3 space-y-2 max-h-40 overflow-y-auto">
                    {availableStages.map(stage => (
                      <div key={stage.id} className="flex items-center gap-2">
                        <Checkbox
                          id={`funded-${stage.id}`}
                          checked={fundedStageIds.includes(stage.id)}
                          onCheckedChange={() => toggleStageSelection(stage.id, 'funded')}
                        />
                        <label htmlFor={`funded-${stage.id}`} className="text-sm cursor-pointer">
                          {stage.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Committed Stages (select multiple)</Label>
                  <div className="border-2 border-border rounded p-3 space-y-2 max-h-40 overflow-y-auto">
                    {availableStages.map(stage => (
                      <div key={stage.id} className="flex items-center gap-2">
                        <Checkbox
                          id={`committed-${stage.id}`}
                          checked={committedStageIds.includes(stage.id)}
                          onCheckedChange={() => toggleStageSelection(stage.id, 'committed')}
                        />
                        <label htmlFor={`committed-${stage.id}`} className="text-sm cursor-pointer">
                          {stage.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Meeting Tracking */}
      {connectionStatus === 'connected' && (
        <div className="border-2 border-border p-4 space-y-4">
          <div>
            <h4 className="font-medium mb-1">Meeting Tracking</h4>
            <p className="text-sm text-muted-foreground mb-3">
              Select meeting types to track as calls
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Booked Call Meeting Types</Label>
              <div className="border-2 border-border rounded p-3 space-y-2 max-h-40 overflow-y-auto">
                {commonMeetingTypes.map(type => (
                  <div key={type} className="flex items-center gap-2">
                    <Checkbox
                      id={`booked-${type}`}
                      checked={bookedMeetingTypes.includes(type)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setBookedMeetingTypes(prev => [...prev, type]);
                        } else {
                          setBookedMeetingTypes(prev => prev.filter(t => t !== type));
                        }
                      }}
                    />
                    <label htmlFor={`booked-${type}`} className="text-sm cursor-pointer">
                      {type}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Reconnect Meeting Types</Label>
              <div className="border-2 border-border rounded p-3 space-y-2 max-h-40 overflow-y-auto">
                {commonMeetingTypes.map(type => (
                  <div key={type} className="flex items-center gap-2">
                    <Checkbox
                      id={`reconnect-${type}`}
                      checked={reconnectMeetingTypes.includes(type)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setReconnectMeetingTypes(prev => [...prev, type]);
                        } else {
                          setReconnectMeetingTypes(prev => prev.filter(t => t !== type));
                        }
                      }}
                    />
                    <label htmlFor={`reconnect-${type}`} className="text-sm cursor-pointer">
                      {type}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Save Button */}
      {connectionStatus === 'connected' && (
        <div className="flex justify-end">
          <Button onClick={handleSaveSettings}>
            Save HubSpot Settings
          </Button>
        </div>
      )}
    </div>
  );
}
