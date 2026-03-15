import { useInstagramScrapeJobs } from '@/hooks/useInstagramScraper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, CheckCircle2, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const statusConfig: Record<string, { icon: React.ReactNode; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { icon: <Clock className="h-3 w-3" />, variant: 'outline' },
  running: { icon: <Loader2 className="h-3 w-3 animate-spin" />, variant: 'default' },
  succeeded: { icon: <CheckCircle2 className="h-3 w-3" />, variant: 'secondary' },
  failed: { icon: <XCircle className="h-3 w-3" />, variant: 'destructive' },
  timed_out: { icon: <AlertTriangle className="h-3 w-3" />, variant: 'destructive' },
};

export function ScrapeJobHistory() {
  const { data: jobs = [], isLoading } = useInstagramScrapeJobs();

  if (isLoading) return null;
  if (jobs.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">Job History</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No scrape jobs yet. Run your first scrape above.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Job History</CardTitle></CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Status</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Results</TableHead>
              <TableHead>Cost</TableHead>
              <TableHead>Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {jobs.map((job) => {
              const params = job.input_params as any;
              const config = statusConfig[job.status || 'pending'];
              return (
                <TableRow key={job.id}>
                  <TableCell>
                    <Badge variant={config.variant} className="gap-1">
                      {config.icon}
                      {job.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {params?.scrapeType || 'unknown'}
                    <span className="text-muted-foreground ml-1">
                      ({(params?.targets || []).length} targets)
                    </span>
                  </TableCell>
                  <TableCell>{job.results_count || 0}</TableCell>
                  <TableCell>${Number(job.cost_usd || 0).toFixed(4)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(job.created_at!), { addSuffix: true })}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
