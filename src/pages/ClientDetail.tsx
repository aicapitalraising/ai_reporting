import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DateRangeFilter } from '@/components/dashboard/DateRangeFilter';
import { KPIGrid } from '@/components/dashboard/KPIGrid';
import { ClientSettingsModal } from '@/components/settings/ClientSettingsModal';
import { mockClients, mockMetrics, mockDailyData } from '@/lib/mockData';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export default function ClientDetail() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const client = mockClients.find((c) => c.id === clientId);
  const metrics = clientId ? mockMetrics[clientId] : null;

  if (!client || !metrics) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Client not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b-2 border-border bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setSettingsOpen(true)}>
            <Settings className="h-5 w-5" />
          </Button>
        </div>
        <div className="mt-4">
          <h1 className="text-2xl font-bold">{client.name}</h1>
          <p className="text-sm text-muted-foreground">Detailed performance metrics</p>
        </div>
      </header>

      <main className="p-6 space-y-6">
        <DateRangeFilter showAddClient={false} />

        <section>
          <h2 className="text-lg font-bold mb-2">Key Performance Indicators</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Performance metrics with trend comparison for Dec 7 - Jan 6, 2026
          </p>
          <KPIGrid metrics={metrics} />
        </section>

        <section className="border-2 border-border bg-card p-4">
          <h3 className="font-bold text-lg mb-1">View Detailed Records</h3>
          <p className="text-sm text-muted-foreground mb-4">Click to view individual records for each metric category</p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="border-2 border-border p-4 cursor-pointer hover:bg-muted/50 transition-colors">
              <p className="text-2xl font-bold font-mono">{metrics.leads}</p>
              <p className="text-sm text-muted-foreground">Leads</p>
            </div>
            <div className="border-2 border-border p-4 cursor-pointer hover:bg-muted/50 transition-colors">
              <p className="text-2xl font-bold font-mono">{metrics.calls}</p>
              <p className="text-sm text-muted-foreground">Calls</p>
            </div>
            <div className="border-2 border-border p-4 cursor-pointer hover:bg-muted/50 transition-colors">
              <p className="text-2xl font-bold font-mono">View</p>
              <p className="text-sm text-muted-foreground">Showed Calls</p>
            </div>
            <div className="border-2 border-border p-4 cursor-pointer hover:bg-muted/50 transition-colors">
              <p className="text-2xl font-bold font-mono">{metrics.fundedInvestors}</p>
              <p className="text-sm text-muted-foreground">Funded Investors</p>
            </div>
            <div className="border-2 border-border p-4 cursor-pointer hover:bg-muted/50 transition-colors">
              <p className="text-2xl font-bold font-mono">Manage</p>
              <p className="text-sm text-muted-foreground">Data & Amounts</p>
            </div>
          </div>
        </section>

        <section className="border-2 border-border bg-card p-4">
          <h3 className="font-bold text-lg mb-1">Daily Performance Data</h3>
          <p className="text-sm text-muted-foreground mb-4">Detailed metrics by date for Dec 7 - Jan 6, 2026</p>
          {mockDailyData.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="border-b-2">
                  <TableHead className="font-bold">Date</TableHead>
                  <TableHead className="font-bold text-right">Ad Spend</TableHead>
                  <TableHead className="font-bold text-right">Leads</TableHead>
                  <TableHead className="font-bold text-right">Calls</TableHead>
                  <TableHead className="font-bold text-right">Showed</TableHead>
                  <TableHead className="font-bold text-right">Commitments</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockDailyData.map((day) => (
                  <TableRow key={day.date} className="border-b">
                    <TableCell className="font-medium">{day.date}</TableCell>
                    <TableCell className="text-right font-mono">${day.adSpend.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-mono">{day.leads}</TableCell>
                    <TableCell className="text-right font-mono">{day.calls}</TableCell>
                    <TableCell className="text-right font-mono">{day.showed}</TableCell>
                    <TableCell className="text-right font-mono">{day.commitments}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No data available for the selected date range</p>
              <p className="text-sm">Try adjusting your date filters</p>
            </div>
          )}
        </section>

        <section className="border-2 border-border bg-card p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-lg">Creative Approval</h3>
              <p className="text-sm text-muted-foreground">Upload and manage creative assets for {client.name}</p>
            </div>
            <Button>Upload Creative</Button>
          </div>
          <div className="grid grid-cols-4 gap-3 mb-4">
            <div className="bg-chart-4/20 p-4 text-center">
              <p className="text-2xl font-bold text-chart-4">0</p>
              <p className="text-sm">Pending</p>
            </div>
            <div className="bg-chart-2/20 p-4 text-center">
              <p className="text-2xl font-bold text-chart-2">0</p>
              <p className="text-sm">Approved</p>
            </div>
            <div className="bg-chart-1/20 p-4 text-center">
              <p className="text-2xl font-bold text-chart-1">0</p>
              <p className="text-sm">Revisions</p>
            </div>
            <div className="bg-destructive/20 p-4 text-center">
              <p className="text-2xl font-bold text-destructive">0</p>
              <p className="text-sm">Rejected</p>
            </div>
          </div>
          <div className="flex gap-2 mb-4">
            <Badge variant="outline">All (0)</Badge>
            <Badge variant="outline">Pending</Badge>
            <Badge variant="outline">Approved</Badge>
            <Badge variant="outline">Revisions</Badge>
            <Badge variant="outline">Rejected</Badge>
          </div>
          <div className="text-center py-8 text-muted-foreground border-2 border-dashed border-border">
            <p>No creatives uploaded yet</p>
            <p className="text-sm">Upload your first creative to get started</p>
          </div>
        </section>
      </main>

      <ClientSettingsModal
        client={client}
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
      />
    </div>
  );
}
