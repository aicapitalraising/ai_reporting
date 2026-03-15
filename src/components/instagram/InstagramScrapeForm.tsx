import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, Hash, Link, Play } from 'lucide-react';
import { useRunInstagramScrape } from '@/hooks/useInstagramScraper';

export function InstagramScrapeForm() {
  const [scrapeType, setScrapeType] = useState<'profile' | 'hashtag' | 'url'>('profile');
  const [targets, setTargets] = useState('');
  const [resultsLimit, setResultsLimit] = useState(50);
  const runScrape = useRunInstagramScrape();

  const targetList = targets
    .split('\n')
    .map(t => t.trim())
    .filter(Boolean);

  const estimatedCost = (targetList.length * resultsLimit * 0.002).toFixed(2);

  const handleRun = () => {
    if (targetList.length === 0) return;
    const idempotencyKey = `${scrapeType}-${targetList.sort().join(',')}-${resultsLimit}-${Date.now()}`;
    runScrape.mutate({
      scrapeType,
      targets: targetList,
      resultsLimit,
      idempotencyKey,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">New Scrape</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={scrapeType} onValueChange={(v) => setScrapeType(v as any)}>
          <TabsList className="w-full">
            <TabsTrigger value="profile" className="flex-1 gap-1">
              <Search className="h-3 w-3" /> Profile
            </TabsTrigger>
            <TabsTrigger value="hashtag" className="flex-1 gap-1">
              <Hash className="h-3 w-3" /> Hashtag
            </TabsTrigger>
            <TabsTrigger value="url" className="flex-1 gap-1">
              <Link className="h-3 w-3" /> URL
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="space-y-2">
          <Label>
            {scrapeType === 'profile' ? 'Usernames (one per line)' :
             scrapeType === 'hashtag' ? 'Hashtags (one per line)' :
             'URLs (one per line)'}
          </Label>
          <Textarea
            value={targets}
            onChange={(e) => setTargets(e.target.value)}
            placeholder={
              scrapeType === 'profile' ? '@nike\n@adidas\n@gymshark' :
              scrapeType === 'hashtag' ? '#fitness\n#skincare\n#recipe' :
              'https://www.instagram.com/p/ABC123/'
            }
            rows={4}
          />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{targetList.length} / 20 targets</span>
            {targetList.length > 20 && (
              <Badge variant="destructive" className="text-[10px]">Max 20</Badge>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Results Limit</Label>
          <Input
            type="number"
            min={1}
            max={200}
            value={resultsLimit}
            onChange={(e) => setResultsLimit(Math.min(200, Number(e.target.value)))}
          />
        </div>

        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 text-sm">
          <span className="text-muted-foreground">Est. cost</span>
          <Badge variant="outline">~${estimatedCost}</Badge>
        </div>

        <Button
          onClick={handleRun}
          disabled={runScrape.isPending || targetList.length === 0 || targetList.length > 20}
          className="w-full"
        >
          {runScrape.isPending ? (
            <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Running...</>
          ) : (
            <><Play className="h-4 w-4 mr-2" /> Run Scrape</>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
