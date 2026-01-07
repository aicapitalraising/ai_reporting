import { Client, ClientMetrics, DailyMetric } from './types';

export const mockClients: Client[] = [
  {
    id: '180001',
    name: 'Paradyme',
    status: 'active',
    ghlLocationId: 'ROg8rJAnV4jtuQrvtxXN',
    webhookCount: 6,
    publicToken: 'prd-abc123',
    createdAt: '2025-11-01',
    updatedAt: '2026-01-06',
  },
  {
    id: '180002',
    name: 'Blue Capital',
    status: 'active',
    ghlLocationId: 'BLU3CAP1TAL2025',
    publicToken: 'blu-def456',
    createdAt: '2025-10-15',
    updatedAt: '2026-01-06',
  },
  {
    id: '180003',
    name: 'LSCRE',
    status: 'active',
    ghlLocationId: 'LSC-RE-2025',
    publicToken: 'lsc-ghi789',
    createdAt: '2025-12-01',
    updatedAt: '2026-01-06',
  },
  {
    id: '180004',
    name: 'Apex Ventures',
    status: 'paused',
    ghlLocationId: 'APEX-VNT-2025',
    publicToken: 'apx-jkl012',
    createdAt: '2025-09-20',
    updatedAt: '2026-01-05',
  },
];

export const mockMetrics: Record<string, ClientMetrics> = {
  '180001': {
    clientId: '180001',
    dateRange: { start: '2025-12-07', end: '2026-01-06' },
    totalAdSpend: 12500,
    ctr: 2.45,
    leads: 104,
    spamBadLeads: 8,
    costPerLead: 120.19,
    calls: 42,
    costPerCall: 297.62,
    showedCalls: 15,
    showedPercent: 35.71,
    costPerShow: 833.33,
    commitments: 5,
    commitmentDollars: 250000,
    fundedInvestors: 2,
    fundedDollars: 100000,
    costPerInvestor: 6250,
    costOfCapital: 12.5,
  },
  '180002': {
    clientId: '180002',
    dateRange: { start: '2025-12-07', end: '2026-01-06' },
    totalAdSpend: 8750,
    ctr: 1.89,
    leads: 67,
    spamBadLeads: 5,
    costPerLead: 130.60,
    calls: 28,
    costPerCall: 312.50,
    showedCalls: 12,
    showedPercent: 42.86,
    costPerShow: 729.17,
    commitments: 3,
    commitmentDollars: 175000,
    fundedInvestors: 1,
    fundedDollars: 50000,
    costPerInvestor: 8750,
    costOfCapital: 17.5,
  },
  '180003': {
    clientId: '180003',
    dateRange: { start: '2025-12-07', end: '2026-01-06' },
    totalAdSpend: 15000,
    ctr: 3.12,
    leads: 156,
    spamBadLeads: 12,
    costPerLead: 96.15,
    calls: 58,
    costPerCall: 258.62,
    showedCalls: 24,
    showedPercent: 41.38,
    costPerShow: 625.00,
    commitments: 8,
    commitmentDollars: 420000,
    fundedInvestors: 4,
    fundedDollars: 200000,
    costPerInvestor: 3750,
    costOfCapital: 7.5,
  },
  '180004': {
    clientId: '180004',
    dateRange: { start: '2025-12-07', end: '2026-01-06' },
    totalAdSpend: 0,
    ctr: 0,
    leads: 0,
    spamBadLeads: 0,
    costPerLead: 0,
    calls: 0,
    costPerCall: 0,
    showedCalls: 0,
    showedPercent: 0,
    costPerShow: 0,
    commitments: 0,
    commitmentDollars: 0,
    fundedInvestors: 0,
    fundedDollars: 0,
    costPerInvestor: 0,
    costOfCapital: 0,
  },
};

export const mockDailyData: DailyMetric[] = [
  { date: '2026-01-01', adSpend: 450, leads: 8, calls: 3, showed: 1, commitments: 0 },
  { date: '2026-01-02', adSpend: 520, leads: 12, calls: 5, showed: 2, commitments: 1 },
  { date: '2026-01-03', adSpend: 480, leads: 10, calls: 4, showed: 2, commitments: 0 },
  { date: '2026-01-04', adSpend: 390, leads: 6, calls: 2, showed: 1, commitments: 0 },
  { date: '2026-01-05', adSpend: 560, leads: 15, calls: 6, showed: 3, commitments: 1 },
  { date: '2026-01-06', adSpend: 510, leads: 11, calls: 4, showed: 2, commitments: 1 },
];

export function getAggregatedMetrics(): ClientMetrics {
  const clients = Object.values(mockMetrics);
  const aggregated: ClientMetrics = {
    clientId: 'all',
    dateRange: { start: '2025-12-07', end: '2026-01-06' },
    totalAdSpend: clients.reduce((sum, c) => sum + c.totalAdSpend, 0),
    ctr: clients.reduce((sum, c) => sum + c.ctr, 0) / clients.filter(c => c.ctr > 0).length || 0,
    leads: clients.reduce((sum, c) => sum + c.leads, 0),
    spamBadLeads: clients.reduce((sum, c) => sum + c.spamBadLeads, 0),
    costPerLead: 0,
    calls: clients.reduce((sum, c) => sum + c.calls, 0),
    costPerCall: 0,
    showedCalls: clients.reduce((sum, c) => sum + c.showedCalls, 0),
    showedPercent: 0,
    costPerShow: 0,
    commitments: clients.reduce((sum, c) => sum + c.commitments, 0),
    commitmentDollars: clients.reduce((sum, c) => sum + c.commitmentDollars, 0),
    fundedInvestors: clients.reduce((sum, c) => sum + c.fundedInvestors, 0),
    fundedDollars: clients.reduce((sum, c) => sum + c.fundedDollars, 0),
    costPerInvestor: 0,
    costOfCapital: 0,
  };

  // Calculate derived metrics
  if (aggregated.leads > 0) {
    aggregated.costPerLead = aggregated.totalAdSpend / aggregated.leads;
  }
  if (aggregated.calls > 0) {
    aggregated.costPerCall = aggregated.totalAdSpend / aggregated.calls;
    aggregated.showedPercent = (aggregated.showedCalls / aggregated.calls) * 100;
  }
  if (aggregated.showedCalls > 0) {
    aggregated.costPerShow = aggregated.totalAdSpend / aggregated.showedCalls;
  }
  if (aggregated.fundedInvestors > 0) {
    aggregated.costPerInvestor = aggregated.totalAdSpend / aggregated.fundedInvestors;
  }
  if (aggregated.fundedDollars > 0) {
    aggregated.costOfCapital = (aggregated.totalAdSpend / aggregated.fundedDollars) * 100;
  }

  return aggregated;
}
