import { useParams } from 'react-router-dom';
import { mockClients, mockMetrics } from '@/lib/mockData';
import { KPIGrid } from '@/components/dashboard/KPIGrid';
import { DateRangeFilter } from '@/components/dashboard/DateRangeFilter';

export default function PublicReport() {
  const { token } = useParams<{ token: string }>();

  const client = mockClients.find((c) => c.publicToken === token);
  const metrics = client ? mockMetrics[client.id] : null;

  if (!client || !metrics) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center border-2 border-border bg-card p-8">
          <h1 className="text-2xl font-bold mb-2">Report Not Found</h1>
          <p className="text-muted-foreground">This report link is invalid or has expired.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b-2 border-border bg-card px-6 py-4">
        <h1 className="text-2xl font-bold">{client.name} - Performance Report</h1>
        <p className="text-sm text-muted-foreground">Capital Raising Performance Dashboard</p>
      </header>

      <main className="p-6 space-y-6 max-w-7xl mx-auto">
        <DateRangeFilter showAddClient={false} />

        <section>
          <h2 className="text-lg font-bold mb-2">Key Performance Indicators</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Performance metrics for Dec 7 - Jan 6, 2026
          </p>
          <KPIGrid metrics={metrics} />
        </section>

        <section className="border-2 border-border bg-card p-4">
          <h3 className="font-bold text-lg mb-2">Performance Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="border-2 border-border p-4">
              <p className="text-sm text-muted-foreground">Total Leads Generated</p>
              <p className="text-3xl font-bold font-mono">{metrics.leads}</p>
            </div>
            <div className="border-2 border-border p-4">
              <p className="text-sm text-muted-foreground">Total Commitments</p>
              <p className="text-3xl font-bold font-mono">{metrics.commitments}</p>
              <p className="text-sm text-muted-foreground">
                ${metrics.commitmentDollars.toLocaleString()} committed
              </p>
            </div>
            <div className="border-2 border-border p-4">
              <p className="text-sm text-muted-foreground">Funded Investors</p>
              <p className="text-3xl font-bold font-mono">{metrics.fundedInvestors}</p>
              <p className="text-sm text-muted-foreground">
                ${metrics.fundedDollars.toLocaleString()} funded
              </p>
            </div>
          </div>
        </section>

        <footer className="text-center text-sm text-muted-foreground py-4">
          <p>Powered by Capital Raising Dashboard</p>
          <p>Report generated on {new Date().toLocaleDateString()}</p>
        </footer>
      </main>
    </div>
  );
}
