export interface Client {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'inactive';
  ghlLocationId?: string;
  metaAdAccountId?: string;
  webhookCount?: number;
  publicToken?: string;
  createdAt: string;
  updatedAt: string;
}

export interface KPIMetric {
  label: string;
  value: string | number;
  change: number;
  changeLabel: string;
  clickable?: boolean;
  onClick?: () => void;
}

export interface ClientMetrics {
  clientId: string;
  dateRange: { start: string; end: string };
  totalAdSpend: number;
  ctr: number;
  leads: number;
  spamBadLeads: number;
  costPerLead: number;
  calls: number;
  costPerCall: number;
  showedCalls: number;
  showedPercent: number;
  costPerShow: number;
  commitments: number;
  commitmentDollars: number;
  fundedInvestors: number;
  fundedDollars: number;
  costPerInvestor: number;
  costOfCapital: number;
}

export interface AlertConfig {
  id: string;
  clientId: string;
  metric: string;
  threshold: number;
  operator: 'above' | 'below';
  slackWebhookUrl: string;
  enabled: boolean;
}

export interface APISettings {
  ghlLocationId: string;
  ghlApiKey: string;
  calendarIds: string[];
  pipelineStages: Record<string, string>;
  metaAdAccountId: string;
  metaAccessToken: string;
}

export interface DailyMetric {
  date: string;
  adSpend: number;
  leads: number;
  calls: number;
  showed: number;
  commitments: number;
}
