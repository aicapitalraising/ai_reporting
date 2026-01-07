import { useState } from 'react';
import { Client } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

interface ClientSettingsModalProps {
  client: Client | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ClientSettingsModal({ client, open, onOpenChange }: ClientSettingsModalProps) {
  const [ghlLocationId, setGhlLocationId] = useState(client?.ghlLocationId || '');
  const [ghlApiKey, setGhlApiKey] = useState('');
  const [calendarIds, setCalendarIds] = useState('');
  const [metaAdAccountId, setMetaAdAccountId] = useState(client?.metaAdAccountId || '');
  const [metaAccessToken, setMetaAccessToken] = useState('');
  
  // Alert settings
  const [cplAlert, setCplAlert] = useState(false);
  const [cplThreshold, setCplThreshold] = useState('150');
  const [costPerCallAlert, setCostPerCallAlert] = useState(false);
  const [costPerCallThreshold, setCostPerCallThreshold] = useState('400');
  const [slackWebhook, setSlackWebhook] = useState('');

  const handleSave = () => {
    toast.success('Settings saved successfully');
    onOpenChange(false);
  };

  if (!client) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl border-2 border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Client Settings - {client.name}</DialogTitle>
          <DialogDescription>
            Configure GoHighLevel API integration and KPI thresholds
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="ghl" className="mt-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="ghl">GHL API</TabsTrigger>
            <TabsTrigger value="meta">Meta API</TabsTrigger>
            <TabsTrigger value="thresholds">KPI Thresholds</TabsTrigger>
            <TabsTrigger value="alerts">Alerts</TabsTrigger>
          </TabsList>

          <TabsContent value="ghl" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="ghlLocationId">GHL Location ID</Label>
              <Input
                id="ghlLocationId"
                value={ghlLocationId}
                onChange={(e) => setGhlLocationId(e.target.value)}
                placeholder="ROg8rJAnV4jtuQrvtxXN"
              />
              <p className="text-xs text-muted-foreground">Find this in your GHL account settings</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ghlApiKey">GHL API Key</Label>
              <Input
                id="ghlApiKey"
                type="password"
                value={ghlApiKey}
                onChange={(e) => setGhlApiKey(e.target.value)}
                placeholder="••••••••••••••••"
              />
              <p className="text-xs text-muted-foreground">Create an API key in GHL Settings → API → Private Integration</p>
            </div>

            <div className="border-2 border-border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Calendar Selection</h4>
                  <p className="text-sm text-muted-foreground">Select calendars to track appointments</p>
                </div>
                <Button variant="outline" size="sm">Load Calendars</Button>
              </div>
              <div className="space-y-2">
                <Label htmlFor="calendarIds">Calendar IDs (Manual)</Label>
                <Input
                  id="calendarIds"
                  value={calendarIds}
                  onChange={(e) => setCalendarIds(e.target.value)}
                  placeholder="clpRwqRiL3PCDmmYr61Z, xobiSzA1laF1auAQ7ZqB"
                />
                <p className="text-xs text-muted-foreground">Enter comma-separated calendar IDs or click Load Calendars above.</p>
              </div>
            </div>

            <div className="border-2 border-border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Pipeline Stage Mapping</h4>
                  <p className="text-sm text-muted-foreground">Map GHL pipeline stages to track commitments and funded investors</p>
                </div>
                <Button variant="outline" size="sm">Load Pipelines</Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="meta" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="metaAdAccountId">Meta Ad Account ID</Label>
              <Input
                id="metaAdAccountId"
                value={metaAdAccountId}
                onChange={(e) => setMetaAdAccountId(e.target.value)}
                placeholder="act_123456789"
              />
              <p className="text-xs text-muted-foreground">Find this in Meta Business Suite → Ad Accounts</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="metaAccessToken">Meta Access Token</Label>
              <Input
                id="metaAccessToken"
                type="password"
                value={metaAccessToken}
                onChange={(e) => setMetaAccessToken(e.target.value)}
                placeholder="••••••••••••••••"
              />
              <p className="text-xs text-muted-foreground">Generate a long-lived access token from Meta for Developers</p>
            </div>

            <div className="border-2 border-accent bg-accent/30 p-4">
              <p className="text-sm">
                <strong>Note:</strong> Meta API tokens refresh automatically every 15-30 minutes to ensure data accuracy.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="thresholds" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cplTarget">Target Cost Per Lead</Label>
                <Input id="cplTarget" type="number" placeholder="150" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cpcTarget">Target Cost Per Call</Label>
                <Input id="cpcTarget" type="number" placeholder="400" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="showTarget">Target Show Rate %</Label>
                <Input id="showTarget" type="number" placeholder="35" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cpsTarget">Target Cost Per Show</Label>
                <Input id="cpsTarget" type="number" placeholder="800" />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="alerts" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="slackWebhook">Slack Webhook URL</Label>
              <Input
                id="slackWebhook"
                value={slackWebhook}
                onChange={(e) => setSlackWebhook(e.target.value)}
                placeholder="https://hooks.slack.com/services/..."
              />
              <p className="text-xs text-muted-foreground">Create an incoming webhook in your Slack workspace</p>
            </div>

            <div className="space-y-3 mt-4">
              <h4 className="font-medium">Alert Rules</h4>
              
              <div className="flex items-center justify-between border-2 border-border p-3">
                <div className="flex items-center gap-4">
                  <Switch checked={cplAlert} onCheckedChange={setCplAlert} />
                  <div>
                    <p className="font-medium">Cost Per Lead Alert</p>
                    <p className="text-sm text-muted-foreground">Alert when CPL exceeds threshold</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm">$</span>
                  <Input
                    className="w-20"
                    value={cplThreshold}
                    onChange={(e) => setCplThreshold(e.target.value)}
                    disabled={!cplAlert}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between border-2 border-border p-3">
                <div className="flex items-center gap-4">
                  <Switch checked={costPerCallAlert} onCheckedChange={setCostPerCallAlert} />
                  <div>
                    <p className="font-medium">Cost Per Call Alert</p>
                    <p className="text-sm text-muted-foreground">Alert when Cost/Call exceeds threshold</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm">$</span>
                  <Input
                    className="w-20"
                    value={costPerCallThreshold}
                    onChange={(e) => setCostPerCallThreshold(e.target.value)}
                    disabled={!costPerCallAlert}
                  />
                </div>
              </div>
            </div>

            <Button variant="outline" className="mt-4">Test Slack Connection</Button>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave}>Save Settings</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
