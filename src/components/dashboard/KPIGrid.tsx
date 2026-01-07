import { ClientMetrics } from '@/lib/types';
import { KPICard } from './KPICard';

interface KPIGridProps {
  metrics: ClientMetrics;
  onMetricClick?: (metric: string) => void;
}

export function KPIGrid({ metrics, onMetricClick }: KPIGridProps) {
  const kpis = [
    { key: 'totalAdSpend', label: 'Total Ad Spend', value: metrics.totalAdSpend, format: 'currency' as const, change: 0 },
    { key: 'ctr', label: 'CTR', value: metrics.ctr, format: 'percent' as const, change: 0 },
    { key: 'leads', label: 'Leads', value: metrics.leads, format: 'number' as const, change: 0, clickable: true },
    { key: 'spamBadLeads', label: 'Spam/Bad Leads', value: metrics.spamBadLeads, format: 'number' as const, change: 0 },
    { key: 'costPerLead', label: 'Cost Per Lead', value: metrics.costPerLead, format: 'currency' as const, change: 0 },
    { key: 'calls', label: 'Calls', value: metrics.calls, format: 'number' as const, change: 0, clickable: true },
    { key: 'costPerCall', label: 'Cost Per Call', value: metrics.costPerCall, format: 'currency' as const, change: 0 },
    { key: 'showedCalls', label: 'Showed Calls', value: metrics.showedCalls, format: 'number' as const, change: 0, clickable: true },
    { key: 'showedPercent', label: 'Showed %', value: metrics.showedPercent, format: 'percent' as const, change: 0 },
    { key: 'costPerShow', label: 'Cost Per Show', value: metrics.costPerShow, format: 'currency' as const, change: 0 },
    { key: 'commitments', label: 'Commitments', value: metrics.commitments, format: 'number' as const, change: 0, clickable: true },
    { key: 'commitmentDollars', label: 'Commitment $', value: metrics.commitmentDollars, format: 'currency' as const, change: 0 },
    { key: 'fundedInvestors', label: 'Funded Investors', value: metrics.fundedInvestors, format: 'number' as const, change: 0, clickable: true },
    { key: 'fundedDollars', label: 'Funded $', value: metrics.fundedDollars, format: 'currency' as const, change: 0 },
    { key: 'costPerInvestor', label: 'Cost / Investor', value: metrics.costPerInvestor, format: 'currency' as const, change: 0 },
    { key: 'costOfCapital', label: 'Cost of Capital', value: metrics.costOfCapital, format: 'percent' as const, change: 0 },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {kpis.map((kpi) => (
        <KPICard
          key={kpi.key}
          label={kpi.label}
          value={kpi.value}
          change={kpi.change}
          format={kpi.format}
          clickable={kpi.clickable}
          onClick={kpi.clickable ? () => onMetricClick?.(kpi.key) : undefined}
        />
      ))}
    </div>
  );
}
