import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle,
  ChevronDown,
  Clock,
  Eye,
  Search,
  ArrowDownToLine,
  Zap,
} from 'lucide-react';
import { useSyncHealth, SyncHealthItem, QuickCheckItem } from '@/hooks/useSyncHealth';
import { useSyncClient } from '@/hooks/useSyncClient';
import { useMasterSync } from '@/hooks/useMasterSync';
import { 
  useDataDiscrepancies, 
  useAllDiscrepancies,
  useAcknowledgeDiscrepancy,
  useResolveDiscrepancy,
  DataDiscrepancy,
} from '@/hooks/useDataDiscrepancies';
import { DiscrepancyReviewModal } from '@/components/drilldown/DiscrepancyReviewModal';
import { format } from 'date-fns';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface DataAuditSectionProps {
  clientId: string;
}

function getStatusIcon(status: 'healthy' | 'stale' | 'critical') {
  switch (status) {
    case 'healthy':
      return <CheckCircle2 className="h-4 w-4 text-chart-2" />;
    case 'stale':
      return <AlertTriangle className="h-4 w-4 text-chart-4" />;
    case 'critical':
      return <XCircle className="h-4 w-4 text-destructive" />;
  }
}

function getStatusBadgeVariant(status: 'healthy' | 'stale' | 'critical') {
  switch (status) {
    case 'healthy':
      return 'success';
    case 'stale':
      return 'secondary';
    case 'critical':
      return 'destructive';
  }
}

function formatAbsoluteTimestamp(timestamp: string | null): string {
  if (!timestamp) return 'Never';
  try {
    return format(new Date(timestamp), 'MMM d, h:mm a');
  } catch {
    return 'Unknown';
  }
}

export function DataAuditSection({ clientId }: DataAuditSectionProps) {
  const queryClient = useQueryClient();
  const [showResolved, setShowResolved] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedDiscrepancy, setSelectedDiscrepancy] = useState<DataDiscrepancy | null>(null);
  
  const { data: syncHealth, isLoading: syncLoading, refetch: refetchSync } = useSyncHealth(clientId);
  const { data: activeDiscrepancies = [], isLoading: discrepancyLoading } = useDataDiscrepancies(clientId);
  const { data: allDiscrepancies = [] } = useAllDiscrepancies(showResolved);
  const acknowledgeDiscrepancy = useAcknowledgeDiscrepancy();
  const resolveDiscrepancy = useResolveDiscrepancy();
  
  const { progress, syncLeads, syncCalls } = useSyncClient(clientId);
  const { progress: masterProgress, runMasterSync } = useMasterSync(clientId);
  
  const clientDiscrepancies = showResolved 
    ? allDiscrepancies.filter(d => d.client_id === clientId)
    : activeDiscrepancies;
  
  const handleRefresh = () => {
    refetchSync();
    queryClient.invalidateQueries({ queryKey: ['data-discrepancies', clientId] });
    toast.success('Refreshed audit data');
  };
  
  const openReviewModal = (discrepancy: DataDiscrepancy) => {
    setSelectedDiscrepancy(discrepancy);
    setReviewModalOpen(true);
  };
  
  const handleAcknowledge = async (id: string) => {
    try {
      await acknowledgeDiscrepancy.mutateAsync(id);
      toast.success('Discrepancy acknowledged');
    } catch (error) {
      toast.error('Failed to acknowledge discrepancy');
    }
  };
  
  const handleResolve = async (id: string, notes?: string) => {
    try {
      await resolveDiscrepancy.mutateAsync({ id, notes });
      toast.success('Discrepancy resolved');
    } catch (error) {
      toast.error('Failed to resolve discrepancy');
    }
  };

  const handleSyncByType = async (recordType: 'leads' | 'calls' | 'funded') => {
    if (recordType === 'leads') {
      await syncLeads();
    } else if (recordType === 'calls') {
      await syncCalls();
    } else {
      // Funded uses same sync as leads
      await syncLeads();
    }
  };

  const isSyncing = progress.isLoading || masterProgress.isLoading;
  const isLoading = syncLoading || discrepancyLoading;

  return (
    <Card className="border-2 border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Search className="h-5 w-5" />
            Audit & Troubleshoot
          </CardTitle>
          <div className="flex gap-2">
            <Button 
              variant="default" 
              size="sm" 
              onClick={runMasterSync}
              disabled={isSyncing}
              className="gap-2"
            >
              <Zap className={`h-4 w-4 ${masterProgress.isLoading ? 'animate-pulse' : ''}`} />
              Full Historical Sync
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Sync Progress Banner */}
        {(progress.isLoading || masterProgress.isLoading) && (
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <RefreshCw className="h-4 w-4 animate-spin text-primary" />
              <span className="font-medium">
                {masterProgress.isLoading 
                  ? masterProgress.message || 'Running comprehensive sync...'
                  : progress.message
                }
              </span>
            </div>
            <Progress value={undefined} className="h-2" />
          </div>
        )}

        {/* Sync Health Summary */}
        <div>
          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Sync Health Summary
          </h4>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-b bg-muted/50">
                  <TableHead className="py-2">Record Type</TableHead>
                  <TableHead className="py-2">Status</TableHead>
                  <TableHead className="py-2 text-right">Records</TableHead>
                  <TableHead className="py-2">Last Sync</TableHead>
                  <TableHead className="py-2 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {syncHealth?.items.map((item: SyncHealthItem) => (
                  <TableRow key={item.recordType}>
                    <TableCell className="font-medium py-2">{item.label}</TableCell>
                    <TableCell className="py-2">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(item.status)}
                        <Badge 
                          variant={getStatusBadgeVariant(item.status) as any}
                          className="text-xs capitalize"
                        >
                          {item.status}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono py-2">
                      {item.count.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm py-2">
                      {formatAbsoluteTimestamp(item.lastSynced)}
                    </TableCell>
                    <TableCell className="text-right py-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSyncByType(item.recordType)}
                        disabled={isSyncing}
                      >
                        <ArrowDownToLine className="h-3 w-3 mr-1" />
                        Sync
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Active Discrepancies */}
        <Collapsible defaultOpen={clientDiscrepancies.length > 0}>
          <div className="flex items-center justify-between">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="p-0 h-auto hover:bg-transparent">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Active Discrepancies ({clientDiscrepancies.filter(d => d.status !== 'resolved').length})
                  <ChevronDown className="h-4 w-4" />
                </h4>
              </Button>
            </CollapsibleTrigger>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowResolved(!showResolved)}
              className="text-xs"
            >
              {showResolved ? 'Hide' : 'Show'} Resolved History
            </Button>
          </div>
          <CollapsibleContent className="mt-3">
            {clientDiscrepancies.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground text-sm border rounded-lg bg-muted/30">
                <CheckCircle2 className="h-5 w-5 mx-auto mb-2 text-chart-2" />
                No active data discrepancies detected
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b bg-muted/50">
                      <TableHead className="py-2">Type</TableHead>
                      <TableHead className="py-2">Severity</TableHead>
                      <TableHead className="py-2">Date Range</TableHead>
                      <TableHead className="py-2 text-right">Gap</TableHead>
                      <TableHead className="py-2">Status</TableHead>
                      <TableHead className="py-2 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clientDiscrepancies.map((discrepancy) => (
                      <TableRow key={discrepancy.id}>
                        <TableCell className="font-medium py-2 capitalize">
                          {discrepancy.discrepancy_type.replace('_', ' ')}
                        </TableCell>
                        <TableCell className="py-2">
                          <Badge 
                            variant={
                              discrepancy.severity === 'critical' ? 'destructive' : 
                              discrepancy.severity === 'warning' ? 'secondary' : 'outline'
                            }
                            className="text-xs capitalize"
                          >
                            {discrepancy.severity}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm py-2">
                          {new Date(discrepancy.date_range_start).toLocaleDateString()} - {new Date(discrepancy.date_range_end).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right font-mono py-2">
                          {discrepancy.difference}
                        </TableCell>
                        <TableCell className="py-2 capitalize">{discrepancy.status}</TableCell>
                        <TableCell className="text-right py-2">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openReviewModal(discrepancy)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {discrepancy.status === 'open' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleAcknowledge(discrepancy.id)}
                                disabled={acknowledgeDiscrepancy.isPending}
                              >
                                Acknowledge
                              </Button>
                            )}
                            {discrepancy.status !== 'resolved' && (
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => handleResolve(discrepancy.id)}
                                disabled={resolveDiscrepancy.isPending}
                              >
                                Resolve
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>

        {/* Quick Checks */}
        <div>
          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Quick Checks
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {syncHealth?.quickChecks.map((check: QuickCheckItem) => (
              <div 
                key={check.id}
                className={`flex items-center justify-between p-3 border rounded-lg ${
                  check.count > 0 ? 'bg-destructive/5 border-destructive/20' : 'bg-muted/30'
                }`}
              >
                <span className="text-sm">{check.label}</span>
                <div className="flex items-center gap-2">
                  <Badge 
                    variant={check.count > 0 ? 'destructive' : 'secondary'}
                    className="font-mono"
                  >
                    {check.count}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
      
      {/* Discrepancy Review Modal */}
      {selectedDiscrepancy && (
        <DiscrepancyReviewModal
          open={reviewModalOpen}
          onOpenChange={setReviewModalOpen}
          discrepancy={selectedDiscrepancy}
        />
      )}
    </Card>
  );
}
