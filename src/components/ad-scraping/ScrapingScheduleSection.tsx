import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useClients } from '@/hooks/useClients';
import { useViralTrackingTargets } from '@/hooks/useViralVideos';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Clock, Calendar, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';

export function ScrapingScheduleSection() {
  const queryClient = useQueryClient();
  const { data: clients = [] } = useClients();
  const { data: viralTargets = [] } = useViralTrackingTargets();

  const { data: schedule, isLoading } = useQuery({
    queryKey: ['scraping-schedule'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scraping_schedule')
        .select('*')
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const [enabled, setEnabled] = useState(false);
  const [scrapeTime, setScrapeTime] = useState('06:00');
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [selectedHashtags, setSelectedHashtags] = useState<string[]>([]);

  useEffect(() => {
    if (schedule) {
      setEnabled(schedule.enabled);
      setScrapeTime(schedule.scrape_time || '06:00');
      setSelectedClientIds((schedule.client_ids as string[]) || []);
      setSelectedHashtags((schedule.viral_hashtags as string[]) || []);
    }
  }, [schedule]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        enabled,
        scrape_time: scrapeTime,
        client_ids: selectedClientIds,
        viral_hashtags: selectedHashtags,
        updated_at: new Date().toISOString(),
      };
      if (schedule?.id) {
        const { error } = await supabase.from('scraping_schedule').update(payload).eq('id', schedule.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('scraping_schedule').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scraping-schedule'] });
      toast.success('Scraping schedule saved');
    },
    onError: (err: any) => toast.error(err.message || 'Failed to save'),
  });

  const toggleClient = (id: string) => {
    setSelectedClientIds(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  };

  const toggleHashtag = (value: string) => {
    setSelectedHashtags(prev => prev.includes(value) ? prev.filter(h => h !== value) : [...prev, value]);
  };

  if (isLoading) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Scraping Schedule
            </CardTitle>
            <CardDescription>Configure automated daily scraping for competitor ads and viral content</CardDescription>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label className="flex items-center gap-2"><Clock className="h-4 w-4" /> Scrape Time (daily)</Label>
          <Input type="time" value={scrapeTime} onChange={e => setScrapeTime(e.target.value)} className="w-[150px]" disabled={!enabled} />
        </div>

        {clients.length > 0 && (
          <div className="space-y-2">
            <Label>Clients to scrape competitor URLs</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {clients.map(c => (
                <label key={c.id} className="flex items-center gap-2 p-2 rounded border cursor-pointer hover:bg-muted/50">
                  <Checkbox checked={selectedClientIds.includes(c.id)} onCheckedChange={() => toggleClient(c.id)} disabled={!enabled} />
                  <span className="text-sm">{c.name}</span>
                  {c.product_url && <Badge variant="outline" className="text-[9px] ml-auto">Has URL</Badge>}
                </label>
              ))}
            </div>
          </div>
        )}

        {viralTargets.length > 0 && (
          <div className="space-y-2">
            <Label>Viral hashtags to track</Label>
            <div className="flex flex-wrap gap-2">
              {viralTargets.filter(t => t.type === 'hashtag').map(t => (
                <Badge
                  key={t.id}
                  variant={selectedHashtags.includes(t.value) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => enabled && toggleHashtag(t.value)}
                >
                  {t.value}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {schedule?.last_run_at && (
          <p className="text-xs text-muted-foreground">
            Last auto-scrape: {new Date(schedule.last_run_at).toLocaleString()}
          </p>
        )}

        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Save Schedule
        </Button>
      </CardContent>
    </Card>
  );
}
