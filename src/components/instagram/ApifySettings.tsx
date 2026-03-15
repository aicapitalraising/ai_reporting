import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Eye, EyeOff, Check, Loader2, AlertCircle, Instagram } from 'lucide-react';
import { toast } from 'sonner';
import { useApifySettings, useSaveApifySettings, useTestApifyConnection } from '@/hooks/useInstagramScraper';

export function ApifySettings() {
  const { data: settings, isLoading } = useApifySettings();
  const saveSettings = useSaveApifySettings();
  const testConnection = useTestApifyConnection();

  const [token, setToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [actorId, setActorId] = useState('apify/instagram-scraper');
  const [spendLimit, setSpendLimit] = useState(50);
  const [isActive, setIsActive] = useState(true);
  const [hasExistingToken, setHasExistingToken] = useState(false);

  useEffect(() => {
    if (settings) {
      setActorId(settings.actor_id || 'apify/instagram-scraper');
      setSpendLimit((settings.monthly_spend_limit_cents || 5000) / 100);
      setIsActive(settings.is_active ?? true);
      // We don't load the token - it's never sent to client in plaintext
      // If settings exist, assume token may be configured
      setHasExistingToken(!!settings.id);
    }
  }, [settings]);

  const handleSave = async () => {
    const payload: Record<string, unknown> = {
      actor_id: actorId,
      monthly_spend_limit_cents: Math.round(spendLimit * 100),
      is_active: isActive,
    };
    if (token.trim()) {
      payload.apify_token = token.trim();
    }
    try {
      await saveSettings.mutateAsync(payload as any);
      toast.success('Apify settings saved');
      if (token.trim()) {
        setToken('');
        setHasExistingToken(true);
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleTest = async () => {
    try {
      const result = await testConnection.mutateAsync();
      if (result.success) {
        toast.success(`Connected! User: ${result.username} (${result.plan} plan)`);
      } else {
        toast.error(result.error || 'Connection failed');
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const currentSpend = (settings?.current_month_spend_cents || 0) / 100;
  const spendPercent = spendLimit > 0 ? Math.min((currentSpend / spendLimit) * 100, 100) : 0;

  if (isLoading) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Instagram className="h-5 w-5" />
          Instagram Scraper (Apify)
        </CardTitle>
        <CardDescription>
          Configure Apify integration to scrape Instagram profiles, hashtags, and posts
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Token */}
        <div className="space-y-2">
          <Label>Apify API Token</Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                type={showToken ? 'text' : 'password'}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder={hasExistingToken ? '••••••••••• (token saved)' : 'Enter your Apify API token...'}
                className="pr-10 font-mono text-sm"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <Button
              variant="outline"
              onClick={handleTest}
              disabled={testConnection.isPending}
            >
              {testConnection.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Test
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Get your token at{' '}
            <a href="https://console.apify.com/account/integrations" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              console.apify.com/account/integrations
            </a>
          </p>
        </div>

        {/* Actor ID */}
        <div className="space-y-2">
          <Label>Actor ID</Label>
          <Input
            value={actorId}
            onChange={(e) => setActorId(e.target.value)}
            placeholder="apify/instagram-scraper"
          />
        </div>

        {/* Spend Limit */}
        <div className="space-y-2">
          <Label>Monthly Spend Limit ($)</Label>
          <Input
            type="number"
            min={1}
            max={1000}
            value={spendLimit}
            onChange={(e) => setSpendLimit(Number(e.target.value))}
          />
        </div>

        {/* Spend Progress */}
        <div className="space-y-2 p-3 rounded-lg border">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Current Month Spend</span>
            <span className={spendPercent >= 90 ? 'text-destructive' : spendPercent >= 70 ? 'text-yellow-500' : 'text-primary'}>
              ${currentSpend.toFixed(2)} / ${spendLimit.toFixed(2)}
            </span>
          </div>
          <Progress value={spendPercent} className="h-2" />
        </div>

        {/* Active Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <Label>Enable Scraping</Label>
            <p className="text-xs text-muted-foreground">Toggle to enable/disable all scraping</p>
          </div>
          <Switch checked={isActive} onCheckedChange={setIsActive} />
        </div>

        <Button onClick={handleSave} disabled={saveSettings.isPending} className="w-full">
          {saveSettings.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Save Settings
        </Button>

        {!hasExistingToken && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            No token configured yet. Add your Apify API token to start scraping.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
