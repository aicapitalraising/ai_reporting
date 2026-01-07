import { useState } from 'react';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DateRangeFilter } from '@/components/dashboard/DateRangeFilter';
import { KPIGrid } from '@/components/dashboard/KPIGrid';
import { ClientTable } from '@/components/dashboard/ClientTable';
import { ClientSettingsModal } from '@/components/settings/ClientSettingsModal';
import { mockClients, mockMetrics, getAggregatedMetrics } from '@/lib/mockData';
import { Client } from '@/lib/types';
import { toast } from 'sonner';

const Index = () => {
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const aggregatedMetrics = getAggregatedMetrics();

  const handleOpenSettings = (client: Client) => {
    setSelectedClient(client);
    setSettingsOpen(true);
  };

  const handleExportCSV = () => {
    toast.success('Exporting CSV...');
  };

  const handleAddClient = () => {
    toast.info('Add client functionality coming soon');
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader
        title="Capital Raising Dashboard"
        subtitle="Client Advertising Performance"
      />

      <main className="p-6 space-y-6">
        <DateRangeFilter
          onExportCSV={handleExportCSV}
          onAddClient={handleAddClient}
        />

        <section>
          <h2 className="text-lg font-bold mb-2">Key Performance Indicators</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Agency-wide performance metrics with trend comparison for Dec 7 - Jan 6, 2026
          </p>
          <KPIGrid metrics={aggregatedMetrics} />
        </section>

        <section>
          <h2 className="text-lg font-bold mb-2">Client Summary</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Aggregated performance metrics by client for Dec 7 - Jan 6, 2026
          </p>
          <ClientTable
            clients={mockClients}
            metrics={mockMetrics}
            onOpenSettings={handleOpenSettings}
          />
        </section>
      </main>

      <ClientSettingsModal
        client={selectedClient}
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
      />
    </div>
  );
};

export default Index;
